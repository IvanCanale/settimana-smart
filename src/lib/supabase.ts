// lib/supabase.ts
// Funzioni di utilità per il database - il client viene passato come parametro
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Recipe, WeeklyPlanRecord, SubscriptionTier } from "@/types";
import { rowToRecipe } from "@/lib/recipeSchema";

export type UserData = {
  preferences: Record<string, unknown>;
  pantry: unknown[];
  seed: number;
  manualOverrides: Record<string, unknown>;
  learning: Record<string, unknown>;
};

export async function loadUserData(client: SupabaseClient, userId: string): Promise<Partial<UserData>> {
  const { currentWeekISO } = await import("@/lib/weekUtils");
  const currentWeek = currentWeekISO();
  const [prefRes, pantryRes, planRes] = await Promise.all([
    client.from("preferences").select("data").eq("user_id", userId).single(),
    client.from("pantry").select("items").eq("user_id", userId).single(),
    client.from("weekly_plan")
      .select("seed, manual_overrides, learning")
      .eq("user_id", userId)
      .or(`week_iso.eq.${currentWeek},week_iso.is.null`)
      .order("week_iso", { ascending: false })
      .limit(1)
      .single(),
  ]);
  // PGRST116 = no rows returned — normale per utenti nuovi, non è un errore
  const NO_ROWS = "PGRST116";
  if (prefRes.error && prefRes.error.code !== NO_ROWS) throw prefRes.error;
  if (pantryRes.error && pantryRes.error.code !== NO_ROWS) throw pantryRes.error;
  if (planRes.error && planRes.error.code !== NO_ROWS) throw planRes.error;
  return {
    preferences: prefRes.data?.data ?? {},
    pantry: pantryRes.data?.items ?? [],
    seed: planRes.data?.seed ?? 1,
    manualOverrides: planRes.data?.manual_overrides ?? {},
    learning: planRes.data?.learning ?? {},
  };
}

export async function savePreferences(client: SupabaseClient, userId: string, data: Record<string, unknown>) {
  return client.from("preferences").upsert({ user_id: userId, data }, { onConflict: "user_id" });
}

export async function savePantry(client: SupabaseClient, userId: string, items: unknown[]) {
  return client.from("pantry").upsert({ user_id: userId, items }, { onConflict: "user_id" });
}

export async function saveWeeklyPlan(client: SupabaseClient, userId: string, data: {
  week_iso: string;
  status: "draft" | "active" | "archived";
  seed: number;
  manualOverrides: Record<string, unknown>;
  learning: Record<string, unknown>;
  feedback_note?: string;
  checked_items?: string[];
}) {
  return client.from("weekly_plan").upsert({
    user_id: userId,
    week_iso: data.week_iso,
    status: data.status,
    seed: data.seed,
    manual_overrides: data.manualOverrides,
    learning: data.learning,
    feedback_note: data.feedback_note ?? "",
    checked_items: data.checked_items ?? [],
  }, { onConflict: "user_id, week_iso" });
}

export async function loadWeeklyPlans(
  client: SupabaseClient,
  userId: string
): Promise<WeeklyPlanRecord[]> {
  const { data, error } = await client
    .from("weekly_plan")
    .select("week_iso, status, seed, manual_overrides, learning, feedback_note, checked_items")
    .eq("user_id", userId)
    .order("week_iso", { ascending: false })
    .limit(4);
  if (error) throw error;
  return (data ?? []).map(row => ({
    week_iso: row.week_iso || "",
    status: row.status || "active",
    seed: row.seed ?? 1,
    manual_overrides: row.manual_overrides ?? {},
    learning: row.learning ?? {},
    feedback_note: row.feedback_note ?? "",
    checked_items: row.checked_items ?? [],
  })) as WeeklyPlanRecord[];
}

export async function migrateFromLocalStorage(client: SupabaseClient, userId: string) {
  if (typeof window === "undefined") return;
  const ops: Promise<unknown>[] = [];
  const pref     = localStorage.getItem("ss_preferences_v1");
  const pantry   = localStorage.getItem("ss_pantry_v1");
  const seed     = localStorage.getItem("ss_seed_v1");
  const overrides= localStorage.getItem("ss_manual_overrides_v1");
  const learning = localStorage.getItem("ss_learning_v1");
  if (pref)    { try { ops.push(savePreferences(client, userId, JSON.parse(pref))); } catch {} }
  if (pantry)  { try { ops.push(savePantry(client, userId, JSON.parse(pantry))); } catch {} }
  if (seed || overrides || learning) {
    const { currentWeekISO } = await import("@/lib/weekUtils");
    ops.push(saveWeeklyPlan(client, userId, {
      week_iso: currentWeekISO(),
      status: "active",
      seed: seed ? Number(seed) : 1,
      manualOverrides: overrides ? JSON.parse(overrides) : {},
      learning: learning ? JSON.parse(learning) : {},
    }));
  }
  await Promise.all(ops);
}

export async function saveRigeneraLog(
  client: SupabaseClient,
  userId: string,
  weekIso: string,
  log: { day: string; timestamp: string }[]
) {
  return client
    .from("weekly_plan")
    .update({ rigenera_log: log })
    .eq("user_id", userId)
    .eq("week_iso", weekIso);
}

export async function loadRigeneraLog(
  client: SupabaseClient,
  userId: string,
  weekIso: string
): Promise<{ day: string; timestamp: string }[]> {
  const { data } = await client
    .from("weekly_plan")
    .select("rigenera_log")
    .eq("user_id", userId)
    .eq("week_iso", weekIso)
    .single();
  return Array.isArray(data?.rigenera_log) ? data.rigenera_log : [];
}

// ── Recipe catalog (shared, public read) ─────────────────────────────────────

export async function fetchRecipes(
  client: SupabaseClient,
  tier: SubscriptionTier = "pro", // default "pro" for backward compatibility
): Promise<Recipe[]> {
  let query = client
    .from("recipes")
    .select("id, title, diet, tags, time, difficulty, servings, ingredients, steps")
    .order("created_at", { ascending: false });

  if (tier === "base") {
    // Piano Base: 200 seed recipes, no AI-generated recipes
    // MUST be enforced at query level, not client-side (prevents bypass)
    query = query.neq("added_by", "ai").limit(200);
  }
  // "pro" and "free" (trial): all recipes, no limit

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(rowToRecipe);
}

// ── Notifications (shared catalog update feed) ────────────────────────────────

export type AppNotification = {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  created_at: string;
  read: boolean;
};

export async function fetchNotifications(client: SupabaseClient): Promise<AppNotification[]> {
  const { data, error } = await client
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw error;
  return (data ?? []) as AppNotification[];
}

export async function markNotificationRead(client: SupabaseClient, notificationId: string) {
  return client.from("notifications").update({ read: true }).eq("id", notificationId);
}

// ── GDPR data export ──────────────────────────────────────────────────────────

export type UserExportData = {
  exported_at: string;       // ISO timestamp of export
  preferences: Record<string, unknown> | null;
  weekly_plans: WeeklyPlanRecord[];
  push_subscriptions: Array<Record<string, unknown>>;
};

export async function exportUserData(
  client: SupabaseClient,
  userId: string
): Promise<UserExportData> {
  const [prefRes, plansRes, subsRes] = await Promise.all([
    client
      .from("preferences")
      .select("data, updated_at")
      .eq("user_id", userId)
      .single(),
    client
      .from("weekly_plan")
      .select("week_iso, status, seed, manual_overrides, learning, feedback_note, checked_items, created_at")
      .eq("user_id", userId)
      .order("week_iso", { ascending: false }),
    client
      .from("push_subscriptions")
      .select("endpoint, created_at")
      .eq("user_id", userId),
  ]);

  const weekly_plans: WeeklyPlanRecord[] = (plansRes.data ?? []).map((row) => ({
    week_iso: row.week_iso || "",
    status: row.status || "active",
    seed: row.seed ?? 1,
    manual_overrides: row.manual_overrides ?? {},
    learning: row.learning ?? {},
    feedback_note: row.feedback_note ?? "",
    checked_items: row.checked_items ?? [],
  })) as WeeklyPlanRecord[];

  return {
    exported_at: new Date().toISOString(),
    preferences: prefRes.data?.data ?? null,
    weekly_plans,
    push_subscriptions: (subsRes.data ?? []) as Array<Record<string, unknown>>,
  };
}

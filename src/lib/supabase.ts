// lib/supabase.ts
// Funzioni di utilità per il database - il client viene passato come parametro
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Recipe } from "@/types";
import { rowToRecipe } from "@/lib/recipeSchema";

export type UserData = {
  preferences: Record<string, unknown>;
  pantry: unknown[];
  seed: number;
  manualOverrides: Record<string, unknown>;
  learning: Record<string, unknown>;
};

export async function loadUserData(client: SupabaseClient, userId: string): Promise<Partial<UserData>> {
  const [prefRes, pantryRes, planRes] = await Promise.all([
    client.from("preferences").select("data").eq("user_id", userId).single(),
    client.from("pantry").select("items").eq("user_id", userId).single(),
    client.from("weekly_plan").select("seed, manual_overrides, learning").eq("user_id", userId).single(),
  ]);
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
  seed: number; manualOverrides: Record<string, unknown>; learning: Record<string, unknown>;
}) {
  return client.from("weekly_plan").upsert({
    user_id: userId,
    seed: data.seed,
    manual_overrides: data.manualOverrides,
    learning: data.learning,
  }, { onConflict: "user_id" });
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
    ops.push(saveWeeklyPlan(client, userId, {
      seed: seed ? Number(seed) : 1,
      manualOverrides: overrides ? JSON.parse(overrides) : {},
      learning: learning ? JSON.parse(learning) : {},
    }));
  }
  await Promise.all(ops);
}

// ── Recipe catalog (shared, public read) ─────────────────────────────────────

export async function fetchRecipes(client: SupabaseClient): Promise<Recipe[]> {
  const { data, error } = await client
    .from("recipes")
    .select("id, title, diet, tags, time, difficulty, servings, ingredients, steps")
    .order("created_at", { ascending: false });
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

// lib/supabase.ts
"use client"
import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!_client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
    _client = createClient(url, key);
  }
  return _client;
}

// Alias per comodità
export const supabase = {
  get auth() { return getSupabase().auth; },
  from: (table: string) => getSupabase().from(table),
};

export type UserData = {
  preferences: Record<string, unknown>;
  pantry: unknown[];
  seed: number;
  manualOverrides: Record<string, unknown>;
  learning: Record<string, unknown>;
};

export async function loadUserData(userId: string): Promise<Partial<UserData>> {
  const db = getSupabase();
  const [prefRes, pantryRes, planRes] = await Promise.all([
    db.from("preferences").select("data").eq("user_id", userId).single(),
    db.from("pantry").select("items").eq("user_id", userId).single(),
    db.from("weekly_plan").select("seed, manual_overrides, learning").eq("user_id", userId).single(),
  ]);
  return {
    preferences: prefRes.data?.data ?? {},
    pantry: pantryRes.data?.items ?? [],
    seed: planRes.data?.seed ?? 1,
    manualOverrides: planRes.data?.manual_overrides ?? {},
    learning: planRes.data?.learning ?? {},
  };
}

export async function savePreferences(userId: string, data: Record<string, unknown>) {
  return getSupabase().from("preferences").upsert({ user_id: userId, data }, { onConflict: "user_id" });
}

export async function savePantry(userId: string, items: unknown[]) {
  return getSupabase().from("pantry").upsert({ user_id: userId, items }, { onConflict: "user_id" });
}

export async function saveWeeklyPlan(userId: string, data: {
  seed: number; manualOverrides: Record<string, unknown>; learning: Record<string, unknown>;
}) {
  return getSupabase().from("weekly_plan").upsert({
    user_id: userId, seed: data.seed,
    manual_overrides: data.manualOverrides, learning: data.learning,
  }, { onConflict: "user_id" });
}

export async function signInWithGoogle() {
  return getSupabase().auth.signInWithOAuth({
    provider: "google", options: { redirectTo: typeof window !== "undefined" ? window.location.origin : "" }
  });
}

export async function signInWithApple() {
  return getSupabase().auth.signInWithOAuth({
    provider: "apple", options: { redirectTo: typeof window !== "undefined" ? window.location.origin : "" }
  });
}

export async function signOut() {
  return getSupabase().auth.signOut();
}

export async function migrateFromLocalStorage(userId: string) {
  if (typeof window === "undefined") return;
  const ops = [];
  const pref = localStorage.getItem("ss_preferences_v1");
  const pantry = localStorage.getItem("ss_pantry_v1");
  const seed = localStorage.getItem("ss_seed_v1");
  const overrides = localStorage.getItem("ss_manual_overrides_v1");
  const learning = localStorage.getItem("ss_learning_v1");
  if (pref) { try { ops.push(savePreferences(userId, JSON.parse(pref))); } catch {} }
  if (pantry) { try { ops.push(savePantry(userId, JSON.parse(pantry))); } catch {} }
  if (seed || overrides || learning) {
    ops.push(saveWeeklyPlan(userId, {
      seed: seed ? Number(seed) : 1,
      manualOverrides: overrides ? JSON.parse(overrides) : {},
      learning: learning ? JSON.parse(learning) : {},
    }));
  }
  await Promise.all(ops);
}

"use client";
import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient, User, Session } from "@supabase/supabase-js";

export type { User, Session };

export function createSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

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
    user_id: userId, seed: data.seed,
    manual_overrides: data.manualOverrides, learning: data.learning,
  }, { onConflict: "user_id" });
}

export async function migrateFromLocalStorage(client: SupabaseClient, userId: string) {
  const ops = [];
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

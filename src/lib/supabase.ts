// lib/supabase.ts
// Installa prima: npm install @supabase/supabase-js

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────
export type UserData = {
  preferences: Record<string, unknown>
  pantry: unknown[]
  seed: number
  manualOverrides: Record<string, unknown>
  learning: Record<string, unknown>
}

// ─────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────
export async function signInWithGoogle() {
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/` }
  })
}

export async function signInWithApple() {
  return supabase.auth.signInWithOAuth({
    provider: 'apple',
    options: { redirectTo: `${window.location.origin}/` }
  })
}

export async function signInWithEmail(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password })
}

export async function signUpWithEmail(email: string, password: string) {
  return supabase.auth.signUp({ email, password })
}

export async function signOut() {
  return supabase.auth.signOut()
}

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

// ─────────────────────────────────────────────
// SYNC DATI UTENTE
// ─────────────────────────────────────────────

/** Carica tutti i dati dell'utente dal cloud */
export async function loadUserData(userId: string): Promise<Partial<UserData>> {
  const [prefRes, pantryRes, planRes] = await Promise.all([
    supabase.from('preferences').select('data').eq('user_id', userId).single(),
    supabase.from('pantry').select('items').eq('user_id', userId).single(),
    supabase.from('weekly_plan').select('seed, manual_overrides, learning').eq('user_id', userId).single(),
  ])

  return {
    preferences: prefRes.data?.data ?? {},
    pantry: pantryRes.data?.items ?? [],
    seed: planRes.data?.seed ?? 1,
    manualOverrides: planRes.data?.manual_overrides ?? {},
    learning: planRes.data?.learning ?? {},
  }
}

/** Salva le preferenze nel cloud */
export async function savePreferences(userId: string, data: Record<string, unknown>) {
  return supabase.from('preferences').upsert(
    { user_id: userId, data },
    { onConflict: 'user_id' }
  )
}

/** Salva la dispensa nel cloud */
export async function savePantry(userId: string, items: unknown[]) {
  return supabase.from('pantry').upsert(
    { user_id: userId, items },
    { onConflict: 'user_id' }
  )
}

/** Salva il piano (seed + overrides + learning) nel cloud */
export async function saveWeeklyPlan(userId: string, data: {
  seed: number
  manualOverrides: Record<string, unknown>
  learning: Record<string, unknown>
}) {
  return supabase.from('weekly_plan').upsert(
    {
      user_id: userId,
      seed: data.seed,
      manual_overrides: data.manualOverrides,
      learning: data.learning,
    },
    { onConflict: 'user_id' }
  )
}

/** Migra i dati da localStorage al cloud (primo login) */
export async function migrateFromLocalStorage(userId: string) {
  const prefRaw = localStorage.getItem('ss_preferences_v1')
  const pantryRaw = localStorage.getItem('ss_pantry_v1')
  const seedRaw = localStorage.getItem('ss_seed_v1')
  const overridesRaw = localStorage.getItem('ss_manual_overrides_v1')
  const learningRaw = localStorage.getItem('ss_learning_v1')

  const ops = []

  if (prefRaw) {
    try {
      ops.push(savePreferences(userId, JSON.parse(prefRaw)))
    } catch {}
  }
  if (pantryRaw) {
    try {
      ops.push(savePantry(userId, JSON.parse(pantryRaw)))
    } catch {}
  }
  if (seedRaw || overridesRaw || learningRaw) {
    ops.push(saveWeeklyPlan(userId, {
      seed: seedRaw ? Number(seedRaw) : 1,
      manualOverrides: overridesRaw ? JSON.parse(overridesRaw) : {},
      learning: learningRaw ? JSON.parse(learningRaw) : {},
    }))
  }

  await Promise.all(ops)
}

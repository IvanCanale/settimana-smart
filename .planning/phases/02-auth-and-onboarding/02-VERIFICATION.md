---
phase: 02-auth-and-onboarding
verified: 2026-03-21T00:00:00Z
status: human_needed
score: 11/11 must-haves verified
re_verification: false
human_verification:
  - test: "Complete new-user onboarding in incognito — step through all 5 steps, select allergens, skip registration, verify plan generates without those allergen ingredients"
    expected: "User cannot advance from allergie step without selecting an option; plan generated after skip does not contain meals with selected allergens"
    why_human: "End-to-end allergen exclusion effectiveness requires visual inspection of generated plan ingredients and UI gate behaviour"
  - test: "Open profile drawer after onboarding, change diet to 'vegana', close drawer — verify plan regenerates with only vegana-compatible recipes"
    expected: "Preferences change in drawer immediately propagate to plan engine; next plan generation excludes non-vegana recipes"
    why_human: "Reactivity of preference changes to plan output requires runtime observation"
  - test: "Open profile drawer as anonymous user — verify 'Accedi / Registrati' button appears. Register an account, close modal — verify email appears in drawer with 'Esci' button"
    expected: "Auth section flips from CTA to email+logout display on successful auth"
    why_human: "Requires a live Supabase environment with valid credentials configured; session state toggle is runtime-only"
  - test: "Log in, close app, reopen in same browser — verify user is still logged in"
    expected: "Supabase session persists across browser restarts via its default storage mechanism"
    why_human: "Cross-session persistence requires runtime browser test; cannot verify from static code inspection"
---

# Phase 2: Auth and Onboarding Verification Report

**Phase Goal:** Users have a real identity in the system and have completed a guided profile setup that includes allergen selection before accessing the app
**Verified:** 2026-03-21
**Status:** human_needed (all automated checks passed; 4 items require runtime verification)
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | A new user sees a 5-step onboarding flow: persone, dieta, allergie, tempo, registrazione | VERIFIED | `OnboardingFlow.tsx` `steps` array has exactly 5 entries; progress dots render `steps.map(...)` |
| 2 | The allergen step shows 10 chips and a "Nessuna allergia" exclusive toggle | VERIFIED | `ALLERGEN_OPTIONS` in `types/index.ts` has 10 entries (line 83-86); allergie step renders `ALLERGEN_OPTIONS.map(...)` chips + separate "Nessuna allergia" button |
| 3 | The user cannot advance past allergen step without selecting at least one option | VERIFIED | Continua button: `disabled={selectedAllergens.length === 0}` with `opacity: 0.5, cursor: not-allowed` (OnboardingFlow.tsx line 170-182) |
| 4 | Selected allergens are stored in Preferences.exclusions[] | VERIFIED | On Continua: `setPreferences(p => ({ ...p, exclusions: selectedAllergens }))` (line 165-166); `usePlanEngine` merges `preferences.exclusions` into `computedPrefs.exclusions` (line 18-22) |
| 5 | The registration step is optional — user can skip and use the app anonymously | VERIFIED | Step 4 has "Continua senza account →" button that calls `onComplete()` directly (OnboardingFlow.tsx line 238-244) |
| 6 | Completing onboarding generates an initial plan reflecting household size and diet | VERIFIED | `onComplete` callback increments `seed` via `setSeed((p) => p + 1)` triggering `usePlanEngine` recalculation (page.tsx line 145) |
| 7 | A profile icon in AppHeader opens a drawer with all editable preferences | VERIFIED | AppHeader renders 👤 button with `onClick={onProfileOpen}`; page.tsx passes `onProfileOpen={() => setShowProfile(true)}`; ProfileDrawer renders 5 sections |
| 8 | Anonymous user sees "Accedi / Registrati" button; logged-in user sees email + "Esci" | VERIFIED | ProfileDrawer auth section: `{user === null ? ... "Accedi / Registrati" : ... user.email ... "Esci"}` (lines 362-388) |
| 9 | Logout works from the profile drawer | VERIFIED | `sbClient?.auth.signOut()` wired to "Esci" button onClick (ProfileDrawer.tsx line 381) |
| 10 | User can register with email/password and remain logged in across sessions | VERIFIED (code) | `AuthModalInline` calls `client.auth.signInWithPassword` / `client.auth.signUp`; `AuthProvider` calls `client.auth.getSession()` on mount to restore session — runtime test still required |
| 11 | User can edit allergens, diet, household size after onboarding | VERIFIED | ProfileDrawer exposes all 5 preference sections (persone, dieta, allergie, tempo, budget); each section calls `setPreferences(...)` immediately; state is shared from page.tsx |

**Score:** 11/11 truths verified (4 require runtime human confirmation)

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/types/index.ts` | ALLERGEN_OPTIONS constant | VERIFIED | Lines 83-86: 10-entry `as const` tuple present |
| `src/components/OnboardingFlow.tsx` | 5-step onboarding with allergen + registration steps | VERIFIED | 276 lines; 5 steps in array; sbClient prop; AuthModalInline imported and used; selectedAllergens state; toggleAllergen function |
| `src/app/page.tsx` | Onboarding gate, sbClient wiring, migrateFromLocalStorage effect | VERIFIED | Gate at line 136; sbClient passed to OnboardingFlow (line 152); migration useEffect (lines 128-134); ProfileDrawer rendered (lines 178-183) |
| `src/components/ProfileDrawer.tsx` | Preference editing drawer with auth section | VERIFIED | 404 lines; all 5 preference sections; auth section with login CTA / email+logout |
| `src/components/AppHeader.tsx` | Profile icon trigger for drawer | VERIFIED | `onProfileOpen` in props interface (line 15); 👤 button with `onClick={onProfileOpen}` (line 49) |
| `src/hooks/usePlanEngine.ts` | exclusions[] merged into computedPrefs | VERIFIED | Lines 18-22: spreads both `exclusionsText` (split by comma) and `exclusions[]` into `computedPrefs.exclusions` |
| `src/hooks/useLocalStorage.ts` | Array-safe spread merge | VERIFIED | Line 11: `Array.isArray(fallback)` guard returns parsed array directly without spread-merging |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `OnboardingFlow.tsx` | `Preferences.exclusions` | `setPreferences` in allergen step | VERIFIED | `setPreferences(p => ({ ...p, exclusions: selectedAllergens }))` line 165 |
| `OnboardingFlow.tsx` | `AuthModalInline` | import + render in step 4 | VERIFIED | Imported line 6; rendered in step 4 at line 224 |
| `ProfileDrawer.tsx` | `Preferences` state | `setPreferences` prop | VERIFIED | Each section calls `setPreferences(p => ({ ...p, field: value }))` |
| `ProfileDrawer.tsx` | `AuthModalInline` | embedded auth modal | VERIFIED | Imported line 6; rendered at line 394 when `showAuthModal` is true |
| `AppHeader.tsx` | `ProfileDrawer.tsx` | profile icon → `onProfileOpen` | VERIFIED | `onProfileOpen` fires `setShowProfile(true)` in page.tsx; ProfileDrawer receives `isOpen={showProfile}` |
| `Preferences.exclusions[]` | `usePlanEngine` recipe filter | `computedPrefs.exclusions` merge | VERIFIED | usePlanEngine lines 18-22 merge both text and array exclusions; recipe filter at lines 50-52 applies them |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| AUTH-01 | 02-01-PLAN.md | L'utente può registrarsi con email e password | VERIFIED | `AuthModalInline` implements `signUp` with email+password; accessible from onboarding step 4 and ProfileDrawer |
| AUTH-02 | 02-02-PLAN.md | L'utente può fare login e rimanere loggato tra sessioni | VERIFIED (code) | `AuthProvider` calls `getSession()` on mount; Supabase JS SDK defaults to `localStorage` session persistence. Runtime test needed. |
| AUTH-03 | 02-02-PLAN.md | L'utente può fare logout da qualsiasi schermata | VERIFIED | ProfileDrawer "Esci" button calls `sbClient?.auth.signOut()`; ProfileDrawer accessible from AppHeader on every screen |
| ONBOARD-01 | 02-01-PLAN.md | Alla prima apertura l'utente completa un onboarding guidato step-by-step prima di accedere all'app | VERIFIED | page.tsx gate: `if (isMounted && !onboardingDone) return <OnboardingFlow .../>` — blocks app access until `ss_onboarding_done` is set |
| ONBOARD-02 | 02-01-PLAN.md | L'utente seleziona intolleranze/allergie (safety-critical) | VERIFIED | Step 2 Continua is disabled until `selectedAllergens.length > 0`; selection writes to `Preferences.exclusions[]` |
| ONBOARD-03 | 02-01-PLAN.md | L'utente indica le proprie preferenze alimentari | VERIFIED | Steps 1 (dieta) and 2 (allergie) capture food preferences; ProfileDrawer allows post-onboarding editing |
| ONBOARD-04 | 02-01-PLAN.md | L'utente indica il numero di persone in casa | VERIFIED | Step 0 (persone): +/- counter and quick-select 1-6 buttons; writes to `preferences.people` |
| ONBOARD-05 | 02-02-PLAN.md | L'utente può modificare il profilo dopo l'onboarding | VERIFIED | ProfileDrawer allows editing all preference fields (persone, dieta, allergie, tempo, budget) post-onboarding |

**All 8 requirement IDs assigned to Phase 2 are accounted for. No orphaned requirements.**

---

## Anti-Patterns Found

None. Scanned `OnboardingFlow.tsx`, `ProfileDrawer.tsx`, `AppHeader.tsx`, `page.tsx`, `usePlanEngine.ts`, `useLocalStorage.ts` for TODO/FIXME/PLACEHOLDER, empty handlers, stub returns. The `return null` in `ProfileDrawer.tsx` line 20 is a legitimate early-exit guard when the drawer is closed, not a stub.

---

## Human Verification Required

### 1. Allergen gate and end-to-end exclusion

**Test:** Open app in incognito. Complete 5-step onboarding. On allergie step, attempt to click Continua without selecting anything. Then select "latticini" and "glutine". Complete onboarding. Inspect the generated week plan — verify no meals contain pasta, pane, latte, formaggio, burro ingredients.
**Expected:** Continua button is visually disabled until a chip is selected. Generated plan excludes meals matching the selected allergen keywords.
**Why human:** The allergen→ingredient keyword map effectiveness requires inspecting generated recipe ingredients at runtime. Cannot statically verify the 150-recipe library output.

### 2. Profile drawer preference reactivity

**Test:** Open profile drawer after onboarding. Change diet from current value to "vegana". Close the drawer. Observe whether the plan regenerates and excludes non-vegana recipes.
**Expected:** Preference change propagates immediately via shared `setPreferences` state; `usePlanEngine` re-executes; new plan contains only vegana-compatible recipes.
**Why human:** Reactivity of state→plan pipeline requires observing runtime render cycle.

### 3. Auth section state flip

**Test:** Open profile drawer as anonymous user (no Supabase credentials configured or not logged in). Verify "Accedi / Registrati" button appears. If Supabase is configured, click it, create an account, close the inline modal. Verify drawer auth section now shows email and "Esci" button.
**Expected:** Auth section renders conditionally based on `user === null`; after login the email display appears.
**Why human:** Requires live Supabase environment; `user` state is populated by `onAuthStateChange` callback at runtime.

### 4. Session persistence across browser restart

**Test:** Log in. Close the browser. Reopen the app. Verify the user is still logged in without re-entering credentials.
**Expected:** Supabase SDK stores session in `localStorage` by default; `AuthProvider` restores it via `getSession()` on mount.
**Why human:** Cross-session state requires runtime browser test with a real Supabase project.

---

## Gaps Summary

No automated gaps found. All 11 truths are supported by substantive, wired code. The 4 human-verification items are runtime/UX checks that cannot be confirmed programmatically, not gaps in implementation.

**TypeScript:** `npx tsc --noEmit` exits 0 — no compile errors.

**Commits confirmed present:** `6bf8d89`, `f1767c8`, `82fb24c`, `934cd35`, `32d5b32`, `c7b04d4`, `32d5e0b`, `edccb30`, `5a7dd12`, `770d130`

---

_Verified: 2026-03-21_
_Verifier: Claude (gsd-verifier)_

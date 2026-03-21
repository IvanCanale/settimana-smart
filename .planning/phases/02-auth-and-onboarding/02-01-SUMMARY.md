---
phase: 02-auth-and-onboarding
plan: 01
subsystem: ui
tags: [onboarding, allergens, auth, supabase, react, typescript]

# Dependency graph
requires:
  - phase: 01-foundation-hardening
    provides: OnboardingFlow component (3-step), AuthModalInline, AuthProvider, Preferences type with exclusions[]
provides:
  - 5-step onboarding flow (persone, dieta, allergie, tempo, registrazione)
  - ALLERGEN_OPTIONS constant (10 EU allergens) in src/types/index.ts
  - Allergen chip multi-select with exclusive "Nessuna allergia" toggle
  - Safety-critical allergen step: not skippable, stores to Preferences.exclusions[]
  - Optional registration step: account creation or anonymous skip
  - Automatic localStorage-to-cloud migration on first login/signup
affects: [02-02-profile-drawer, phase-03-recipe-engine, phase-04-ai]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Exclusive toggle chip pattern (nessuna allergia deselects all others)
    - Dynamic import for Supabase to avoid loading it for anonymous users
    - useEffect migration hook pattern (trigger: user + sbClient + onboardingDone)

key-files:
  created: []
  modified:
    - src/types/index.ts
    - src/components/OnboardingFlow.tsx
    - src/app/page.tsx

key-decisions:
  - "OnboardingFlow sbClient prop added directly (not via useAuth hook) — keeps component self-contained and testable"
  - "AuthModalInline closing during onboarding calls onComplete directly — registration and skip share the same completion path"
  - "Dynamic import of supabase.ts in migration useEffect — avoids bundling Supabase for anonymous users on initial load"
  - "Allergen step Continua disabled (opacity 0.5, cursor not-allowed) when selectedAllergens.length === 0 — enforces safety-critical selection"

patterns-established:
  - "Chip toggle with exclusive option: nessuna toggle clears all others; selecting any specific allergen removes nessuna"
  - "pointerEvents: none on dimmed chips when noneSelected — prevents accidental deselection of nessuna via chip click"

requirements-completed: [AUTH-01, ONBOARD-01, ONBOARD-02, ONBOARD-03, ONBOARD-04]

# Metrics
duration: 3min
completed: 2026-03-21
---

# Phase 02 Plan 01: Auth and Onboarding Summary

**5-step onboarding with safety-critical allergen chip selection (10 EU allergens + Nessuna allergia exclusive toggle) and optional Supabase registration step**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-21T09:55:04Z
- **Completed:** 2026-03-21T09:57:26Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Extended OnboardingFlow from 3 steps to 5 (persone, dieta, allergie, tempo, registrazione) with allergen step as step 2 and registration as step 5
- Allergen step is not skippable — Continua button disabled until at least one chip or "Nessuna allergia" is selected; selected allergens stored to Preferences.exclusions[]
- Registration step offers account creation via AuthModalInline or anonymous skip via onComplete(); both paths converge cleanly
- page.tsx wired with sbClient prop and a migration useEffect that calls migrateFromLocalStorage when user authenticates during or after onboarding

## Task Commits

Each task was committed atomically:

1. **Task 1: Add allergen constant and extend OnboardingFlow to 5 steps** - `6bf8d89` (feat)
2. **Task 2: Wire extended onboarding into page.tsx orchestrator** - `f1767c8` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `src/types/index.ts` - Added ALLERGEN_OPTIONS const (10 EU allergens, as const tuple)
- `src/components/OnboardingFlow.tsx` - Rewritten from 3 to 5 steps; added allergen chips, Nessuna allergia exclusive toggle, registration step with AuthModalInline; new sbClient prop
- `src/app/page.tsx` - Pass sbClient to OnboardingFlow; add migrateFromLocalStorage useEffect on user/sbClient/onboardingDone

## Decisions Made

- `sbClient` passed as prop to OnboardingFlow rather than consumed via `useAuth()` inside — keeps the component portable and the prop interface explicit
- Closing AuthModalInline during onboarding calls `onComplete()` directly — registration and anonymous-skip share the same completion path, simplifying logic
- Dynamic import of `supabase.ts` in the migration effect avoids pulling Supabase into the initial JS bundle for anonymous users
- `pointerEvents: "none"` on allergen chips when `noneSelected` is true prevents a chip click from un-toggling nessuna indirectly

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None — TypeScript compiled clean after both tasks, `npm run build` passed with zero errors.

## User Setup Required

None — no external service configuration required. Supabase credentials remain optional; anonymous flow works without them.

## Next Phase Readiness

- 5-step onboarding complete and building clean
- ALLERGEN_OPTIONS in types — available for allergen validation in Phase 3 recipe engine
- Preferences.exclusions[] populated from onboarding — plan engine already reads this field
- Next plan (02-02): Profile drawer in AppHeader for post-onboarding allergen/diet/account editing

## Self-Check: PASSED

- src/types/index.ts: FOUND
- src/components/OnboardingFlow.tsx: FOUND
- src/app/page.tsx: FOUND
- 02-01-SUMMARY.md: FOUND
- Commit 6bf8d89: FOUND
- Commit f1767c8: FOUND

---
*Phase: 02-auth-and-onboarding*
*Completed: 2026-03-21*

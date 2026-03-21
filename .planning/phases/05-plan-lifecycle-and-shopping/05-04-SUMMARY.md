---
phase: 05-plan-lifecycle-and-shopping
plan: 04
subsystem: ui
tags: [react, weektab, recipe-pool, allergen-safety, leftover-badge]

requires:
  - phase: 05-01
    provides: week lifecycle and plan confirmation flow
  - phase: 04-04
    provides: live Supabase recipe pool via usePlanEngine recipes state

provides:
  - Avanzi badge rendered on leftover meal cards in week view
  - regenerateSingleMeal uses live Supabase-fetched recipe pool (recipes prop) instead of static RECIPE_LIBRARY
  - recipeContainsAllergen enforced in regenerateSingleMeal candidate filter
  - recipes exposed from usePlanEngine and threaded through page.tsx to WeekTab

affects:
  - WeekTab meal rendering
  - Single-meal swap allergen safety

tech-stack:
  added: []
  patterns:
    - recipes prop flows from usePlanEngine -> page.tsx -> WeekTab for live pool access
    - recipeContainsAllergen used as the allergen gate (not manual string includes) in swap logic

key-files:
  created: []
  modified:
    - src/hooks/usePlanEngine.ts
    - src/app/page.tsx
    - src/components/WeekTab.tsx
    - src/lib/planEngine.test.ts

key-decisions:
  - "recipes prop threads from usePlanEngine return value through page.tsx to WeekTab — no context/store, explicit data flow"
  - "recipeContainsAllergen replaces manual exclusions.some check in regenerateSingleMeal — uses the same deterministic EU allergen map as buildPlan"
  - "Avanzi badge applied in both mealsPerDay rendering paths (dinner-only and lunch+dinner grid)"

patterns-established:
  - "WeekTab receives recipes prop for swap pool — all meal generation uses live pool, not static fallback"

requirements-completed:
  - PLAN-05
  - PLAN-06

duration: 15min
completed: 2026-03-21
---

# Phase 05 Plan 04: Leftover Badge and Live Recipe Swap Summary

**Avanzi badge on leftover meal cards and regenerateSingleMeal fixed to use live Supabase recipe pool with recipeContainsAllergen allergen safety**

## Performance

- **Duration:** 15 min
- **Started:** 2026-03-21T21:35:00Z
- **Completed:** 2026-03-21T21:41:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Exposed `recipes` array from `usePlanEngine` return value and threaded it from `page.tsx` to `WeekTab` as a prop
- Replaced `RECIPE_LIBRARY` static import in `WeekTab` with the live `recipes` prop — meal swap candidates now include AI-generated Supabase recipes
- Switched allergen filtering in `regenerateSingleMeal` from a manual `.includes()` string check to `recipeContainsAllergen`, matching the deterministic allergen map used by `buildPlan`
- Added `Avanzi` badge in both rendering paths (dinner-only and lunch+dinner grid) for meals tagged `"avanzi"`
- Added 3 allergen filtering unit tests to `planEngine.test.ts` — all 137 tests pass

## Task Commits

1. **Task 1: Expose recipes from usePlanEngine and thread to WeekTab** - `ea95eec` (feat)
2. **Task 2: Add leftover badge and fix regenerateSingleMeal** - `5c66255` (feat)

## Files Created/Modified

- `src/hooks/usePlanEngine.ts` - Added `recipes` to return object
- `src/app/page.tsx` - Destructured `recipes` from usePlanEngine; passed to WeekTab
- `src/components/WeekTab.tsx` - Added `recipes` prop, replaced RECIPE_LIBRARY, added allergen safety, added Avanzi badges in both rendering paths
- `src/lib/planEngine.test.ts` - Added `allergen filtering for single-meal swap` describe block with 3 tests

## Decisions Made

- `recipes` prop threads from usePlanEngine return through page.tsx to WeekTab — maintains explicit prop-based data flow consistent with project conventions (no context/store)
- `recipeContainsAllergen` replaces the manual `exclusions.some((ex) => rec.ingredients.some((i) => normalize(i.name).includes(ex)))` check — unified allergen logic, same map as buildPlan safety gate
- Avanzi badge applied in both rendering paths to ensure consistent leftover labeling regardless of `mealsPerDay` preference

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - pre-existing TypeScript errors in NuoveRicettePage.tsx, useNotifications.ts, and test fixtures (wishlistedRecipeIds missing) were out of scope and untouched.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- WeekTab now uses live recipe pool for meal swaps — PLAN-05 and PLAN-06 requirements fulfilled
- All tests green (137 passing), TypeScript clean for plan-scope files
- Ready for Phase 05 plan 05 if applicable, or Phase 06

---
*Phase: 05-plan-lifecycle-and-shopping*
*Completed: 2026-03-21*

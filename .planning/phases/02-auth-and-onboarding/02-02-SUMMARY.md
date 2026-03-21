---
phase: 02-auth-and-onboarding
plan: 02
subsystem: ui
tags: [react, typescript, supabase, auth, allergens, preferences, drawer]

# Dependency graph
requires:
  - phase: 02-auth-and-onboarding
    provides: 5-step onboarding, ALLERGEN_OPTIONS, Preferences.exclusions[], AuthModalInline, AuthProvider/useAuth hook
provides:
  - ProfileDrawer component with all 5 preference sections (persone, dieta, allergie, tempo, budget)
  - Auth section in drawer (Accedi/Registrati for anonymous, email+Esci for authenticated)
  - Profile icon in AppHeader opening the drawer from any screen
  - Post-onboarding preference editing (allergens, diet, household size, time, budget)
  - Logout from any screen via ProfileDrawer
affects: [phase-03-engine-hardening, phase-04-ai]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - ProfileDrawer as fixed overlay with right-slide panel (zIndex 200, backdrop blur)
    - Auth section pattern: anonymous → login CTA, authenticated → email + signOut
    - Preference widgets reused from OnboardingFlow (same chip/counter/grid/slider patterns)

key-files:
  created:
    - src/components/ProfileDrawer.tsx
  modified:
    - src/components/AppHeader.tsx
    - src/app/page.tsx
    - src/hooks/usePlanEngine.ts
    - src/hooks/useLocalStorage.ts

key-decisions:
  - "Auth UI removed from AppHeader entirely — now lives exclusively in ProfileDrawer to avoid duplication"
  - "ProfileDrawer uses useAuth() hook internally (not sbClient prop) — cleaner than threading sbClient through AppHeader"
  - "exclusions[] and exclusionsText merged in usePlanEngine — allergen chips were being ignored by the plan engine"
  - "useLocalStorage spread merge restricted to plain objects — arrays converted to objects bug fixed with Array.isArray guard"
  - "Allergen-to-ingredient map added to usePlanEngine — EU allergen names map to actual ingredient keywords for recipe exclusion"

patterns-established:
  - "Drawer pattern: fixed overlay backdrop + right-anchored panel with overflowY scroll, zIndex 200"
  - "Preference section header: fontSize 13, fontWeight 700, uppercase, letterSpacing 0.05em, var(--sepia-light)"

requirements-completed: [AUTH-02, AUTH-03, ONBOARD-05]

# Metrics
duration: ~60min
completed: 2026-03-21
---

# Phase 02 Plan 02: ProfileDrawer with Auth and Preference Editing Summary

**ProfileDrawer accessible from AppHeader profile icon — full preference editing (persone, dieta, allergie, tempo, budget) plus auth management (login CTA for anonymous, email+logout for authenticated) with 6 bug fixes applied during verification to make allergen exclusions actually work end-to-end**

## Performance

- **Duration:** ~60 min (including human verification and bug fix cycle)
- **Started:** 2026-03-21
- **Completed:** 2026-03-21
- **Tasks:** 3 (2 auto + 1 human-verify APPROVED)
- **Files modified:** 5

## Accomplishments

- ProfileDrawer component built with 5 preference sections matching OnboardingFlow widget styles (chips, counter, grid, time buttons, slider) and auth section
- AppHeader simplified — auth buttons removed, replaced by single profile icon (👤) that opens the drawer
- 6 bug fixes during human verification made allergen exclusions functional end-to-end: plan engine now reads exclusions[], useLocalStorage preserves arrays, allergen keyword map covers all EU allergens

## Task Commits

1. **Task 1: Create ProfileDrawer component** - `82fb24c` (feat)
2. **Task 2: Wire ProfileDrawer into AppHeader and page.tsx** - `934cd35` (feat)
3. **Task 3: Human verification APPROVED** - (no code commit — verified in browser)

**Bug fixes during verification (committed separately):**
- `32d5b32` fix: merge exclusions[] and exclusionsText in usePlanEngine
- `c7b04d4` fix: exclude recipes by category when allergen matches
- `32d5e0b` fix: useLocalStorage preserves arrays
- `edccb30` fix: add allergen→ingredient map for EU allergens
- `5a7dd12` fix: expand glutine keywords
- `770d130` fix: complete allergen→ingredient map from full recipe database audit

## Files Created/Modified

- `src/components/ProfileDrawer.tsx` - Profile editing drawer: 5 preference sections + auth section (created)
- `src/components/AppHeader.tsx` - Added onProfileOpen prop and profile icon button; removed auth buttons
- `src/app/page.tsx` - Added showProfile state, ProfileDrawer render, onProfileOpen wiring
- `src/hooks/usePlanEngine.ts` - Merged exclusions[] with exclusionsText; added allergen→ingredient keyword map; category-based recipe exclusion
- `src/hooks/useLocalStorage.ts` - Fixed spread merge to preserve arrays via Array.isArray guard

## Decisions Made

- Auth UI removed entirely from AppHeader — avoids duplication now that ProfileDrawer handles login/logout. AppHeader shows only plan stats and profile icon.
- ProfileDrawer calls `useAuth()` internally rather than receiving sbClient as a prop — keeps the prop interface clean (only preferences/state).
- usePlanEngine previously only read `exclusionsText` (free-text field) and ignored `exclusions[]` (allergen chip selections) — merged both to fix safety-critical gap.
- Allergen→ingredient map is deterministic lookup: "glutine" expands to pasta/pane/crackers/etc keywords; "latticini" to latte/formaggio/burro/etc. This is the same deterministic-allergen-layer approach planned for Phase 3.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] exclusions[] ignored by plan engine — allergen chips had no effect on generated plan**
- **Found during:** Task 3 (human verification)
- **Issue:** usePlanEngine read only `exclusionsText` (raw text field) and never checked `exclusions[]` (chip selections from onboarding/drawer). Allergen chips were stored correctly but never applied to recipe filtering.
- **Fix:** Merged exclusions[] into the recipe-filter logic alongside exclusionsText. Added allergen→ingredient keyword map (10 EU allergens → ingredient keywords). Added category-based exclusion (pesce allergen → excludes fish category recipes).
- **Files modified:** src/hooks/usePlanEngine.ts
- **Verification:** Plan generated after selecting glutine+latticini does not contain pasta/pane/latte/formaggio recipes.
- **Committed in:** 32d5b32, c7b04d4, edccb30, 5a7dd12, 770d130

**2. [Rule 1 - Bug] useLocalStorage spread merge destroyed arrays**
- **Found during:** Task 3 (human verification)
- **Issue:** The spread merge in useLocalStorage converted `exclusions: ["glutine", "latticini"]` to `{ 0: "glutine", 1: "latticini" }` (plain object) on the next read, breaking downstream array operations.
- **Fix:** Added `Array.isArray` guard — arrays are assigned directly, not spread-merged.
- **Files modified:** src/hooks/useLocalStorage.ts
- **Verification:** Allergen array survives page reload and remains a proper array.
- **Committed in:** 32d5e0b

---

**Total deviations:** 2 auto-fixed (both Rule 1 - Bug)
**Impact on plan:** Both fixes were necessary for safety-critical allergen exclusions to function. No scope creep — all fixes directly in service of the plan's stated goal (allergen selections affecting the generated plan).

## Issues Encountered

The allergen exclusion pipeline had three separate breaks that were only visible end-to-end during human verification:
1. exclusions[] not read by engine (usePlanEngine bug)
2. exclusions[] corrupted on reload (useLocalStorage bug)
3. No keyword mapping from allergen names to actual ingredient strings (missing feature turned bug)

All three were fixed atomically during the verification cycle and are now working.

## User Setup Required

None — no external service configuration required. Supabase credentials remain optional; anonymous flow works without them.

## Next Phase Readiness

- ProfileDrawer complete and working — allergen/diet/preferences editable post-onboarding
- Allergen exclusion pipeline functional end-to-end: chips → exclusions[] → keyword map → recipe filter
- Keyword map in usePlanEngine is a direct precursor to Phase 3's formal allergen validation layer
- Phase 3 (Engine Hardening and Cloud Sync) can proceed — auth and onboarding phase is complete

## Self-Check: PASSED

- src/components/ProfileDrawer.tsx: FOUND
- src/components/AppHeader.tsx: FOUND
- src/app/page.tsx: FOUND
- src/hooks/usePlanEngine.ts: FOUND
- src/hooks/useLocalStorage.ts: FOUND
- Commit 82fb24c: FOUND
- Commit 934cd35: FOUND
- Commit 32d5b32: FOUND

---
*Phase: 02-auth-and-onboarding*
*Completed: 2026-03-21*

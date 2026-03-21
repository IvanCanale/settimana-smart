---
phase: 04-ai-recipe-generation
plan: 02
subsystem: hooks
tags: [react, supabase, localStorage, vitest, testing-library, typescript]

# Dependency graph
requires:
  - phase: 04-ai-recipe-generation
    plan: 01
    provides: fetchRecipes() from supabase.ts, rowToRecipe() mapper

provides:
  - usePlanEngine async recipe fetch with 24h localStorage cache
  - Graceful fallback to RECIPE_LIBRARY when Supabase unreachable
  - buildPlan() accepts optional recipesOverride parameter
  - AppHeader shows live recipe count from Supabase (or fallback)
  - Integration tests for cache hit, cache miss, fallback, no-client, recipeCount, loading state, expired cache

affects:
  - src/hooks/usePlanEngine.ts (async fetch, cache, loading state)
  - src/lib/planEngine.ts (optional recipesOverride param)
  - src/components/AppHeader.tsx (live recipeCount prop)
  - src/app/page.tsx (recipeCount passed through)

# Tech tracking
tech-stack:
  added:
    - "@testing-library/react (hook testing in jsdom environment)"
    - "jsdom (browser environment for Vitest hook tests)"
  patterns:
    - "useState(RECIPE_LIBRARY) as initial value — never undefined, always a valid fallback"
    - "useEffect for async fetch — never await in useMemo (Pitfall 3 from RESEARCH.md)"
    - "localStorage cache TTL 24h with ss_recipes_cache_v1 key"
    - "buildPlan recipesOverride param — backward-compatible, existing callers unchanged"
    - "Per-file Vitest environment via // @vitest-environment jsdom comment"

key-files:
  created:
    - src/hooks/usePlanEngine.test.ts
  modified:
    - src/hooks/usePlanEngine.ts
    - src/lib/planEngine.ts
    - src/components/AppHeader.tsx
    - src/app/page.tsx

key-decisions:
  - "buildPlan recipesOverride is optional — backward-compatible with existing callers (no migration needed)"
  - "useState(RECIPE_LIBRARY) as initial state — eliminates flash of empty state before fetch"
  - "localStorage mock via Object.defineProperty(window, localStorage) — more reliable than vi.spyOn(Storage.prototype) in jsdom"
  - "Per-file jsdom env (// @vitest-environment jsdom) — node env preserved for planEngine tests (no DOM needed)"
  - "Install @testing-library/react + jsdom as devDependencies — required for renderHook on React hook"

requirements-completed: [RECIPES-01, RECIPES-04]

# Metrics
duration: 5min
completed: 2026-03-21
---

# Phase 04 Plan 02: Supabase Recipe Integration Summary

**usePlanEngine wired to fetch recipes from Supabase with 24h localStorage cache and RECIPE_LIBRARY fallback — AppHeader shows live count — buildPlan accepts optional recipesOverride**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-21T16:01:33Z
- **Completed:** 2026-03-21T16:06:59Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments

- usePlanEngine now fetches recipes from Supabase via fetchRecipes() on mount (when sbClient available)
- 24h localStorage cache (key: ss_recipes_cache_v1) avoids redundant fetches — cache hit uses stored data immediately
- Graceful fallback: initial state is RECIPE_LIBRARY, only replaced when Supabase returns data
- buildPlan() now accepts optional `recipesOverride?: Recipe[]` — passes fetched recipes into the plan engine
- AppHeader subtitle shows live recipeCount instead of static RECIPE_LIBRARY.length
- RECIPE_LIBRARY import removed from AppHeader.tsx
- 7 new integration tests covering all async behaviors: cache hit, cache miss+fetch, Supabase failure, no sbClient, recipeCount, loading state, expired cache
- Full test suite: 89 tests green (82 existing + 7 new)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add async recipe fetch to usePlanEngine with cache and fallback** - `1f049ef` (feat)
2. **Task 2: Update AppHeader and page.tsx for live recipe count and loading state** - `2368cfb` (feat)
3. **Task 3: Integration tests for usePlanEngine async fetch, cache, and fallback** - `185507f` (feat)

## Files Created/Modified

- `src/hooks/usePlanEngine.ts` - Added fetchRecipes import, recipes/recipesLoading state, useEffect with cache+fetch logic, passes recipes to buildPlan, returns recipesLoading and recipeCount
- `src/lib/planEngine.ts` - Added optional `recipesOverride?: Recipe[]` param to buildPlan(), uses `recipesOverride ?? RECIPE_LIBRARY` as pool
- `src/components/AppHeader.tsx` - Removed RECIPE_LIBRARY import, added recipeCount: number to props, uses recipeCount in subtitle
- `src/app/page.tsx` - Destructures recipeCount from usePlanEngine, passes recipeCount to AppHeader
- `src/hooks/usePlanEngine.test.ts` - 7 integration tests in jsdom environment with @testing-library/react renderHook

## Decisions Made

- `buildPlan recipesOverride` is optional — backward-compatible, no existing callers modified
- Initial recipes state is `RECIPE_LIBRARY` — eliminates blank/empty state before fetch completes
- `Object.defineProperty(window, "localStorage")` used instead of `vi.spyOn(Storage.prototype)` — more reliable in jsdom for this hook's direct `localStorage.*` calls
- Per-file `// @vitest-environment jsdom` used — keeps existing node environment for planEngine tests (no DOM needed, faster)
- Installed `@testing-library/react` + `jsdom` as devDependencies — required for `renderHook` on React hooks

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Dependency] Installed @testing-library/react and jsdom**
- **Found during:** Task 3
- **Issue:** @testing-library/react not in package.json, jsdom not available — renderHook would fail
- **Fix:** `npm install --save-dev @testing-library/react jsdom`
- **Files modified:** package.json, package-lock.json
- **Commit:** 185507f

**2. [Rule 1 - Bug] Corrected DEFAULT_LEARNING fixture type**
- **Found during:** Task 3 (RED phase — first test run)
- **Issue:** PreferenceLearning has fields `keptRecipeIds`, `regeneratedRecipeIds`, etc. — fixture used wrong field names
- **Fix:** Updated DEFAULT_LEARNING to match actual PreferenceLearning type from src/types/index.ts
- **Files modified:** src/hooks/usePlanEngine.test.ts
- **Commit:** 185507f

**3. [Rule 1 - Bug] Replaced vi.spyOn localStorage mock with Object.defineProperty**
- **Found during:** Task 3 (GREEN phase — second test run)
- **Issue:** `vi.spyOn(Storage.prototype, "getItem")` caused "localStorage.getItem is not a function" in jsdom — spying on prototype doesn't intercept direct property access
- **Fix:** Mock localStorage via `Object.defineProperty(window, "localStorage", { value: localStorageMock })`
- **Files modified:** src/hooks/usePlanEngine.test.ts
- **Commit:** 185507f

## Self-Check: PASSED

All key files exist. All 3 task commits verified in git log.

---
*Phase: 04-ai-recipe-generation*
*Completed: 2026-03-21*

---
phase: 01-foundation-hardening
plan: 02
subsystem: ui
tags: [refactoring, react, hooks, components, css, error-boundary, typescript, next]

# Dependency graph
requires:
  - phase: 01-foundation-hardening
    plan: 01
    provides: "46 passing Vitest tests as safety net for planEngine; framer-motion removed"
provides:
  - page.tsx orchestrator under 200 lines (192 lines)
  - 5 tab components (PlannerTab, WeekTab, ShoppingTab, CucinaTab, RicetteTab)
  - 3 custom hooks (useLocalStorage, usePlanEngine, useLearning)
  - 4 helper components (AuthModalInline, SectionHeader, TagPill, TimeTag)
  - ErrorBoundary class component wrapping app in layout.tsx
  - FreezeToast component replacing window.alert
  - Design tokens migrated from inline style tag to globals.css
  - Google Fonts loaded via link tag in layout.tsx head
affects: [02-auth-supabase, 03-ai-recipes, any-phase-touching-tab-components]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Orchestrator pattern: page.tsx delegates to tab components, owns shared state only"
    - "Custom hooks for localStorage persistence (useLocalStorage<T> typed generic)"
    - "Class-based ErrorBoundary (required by React error boundary API)"
    - "Non-blocking toast pattern for freeze reminders (FreezeToast + setTimeout auto-dismiss)"
    - "CSS custom properties in globals.css, not injected via JS style tag"

key-files:
  created:
    - src/hooks/useLocalStorage.ts
    - src/hooks/usePlanEngine.ts
    - src/hooks/useLearning.ts
    - src/components/PlannerTab.tsx
    - src/components/WeekTab.tsx
    - src/components/ShoppingTab.tsx
    - src/components/CucinaTab.tsx
    - src/components/RicetteTab.tsx
    - src/components/AuthModalInline.tsx
    - src/components/SectionHeader.tsx
    - src/components/TagPill.tsx
    - src/components/TimeTag.tsx
    - src/components/ErrorBoundary.tsx
    - src/components/FreezeToast.tsx
  modified:
    - src/app/page.tsx
    - src/app/globals.css
    - src/app/layout.tsx

key-decisions:
  - "Tab components receive props from orchestrator — no context/store, keeps data flow explicit and traceable"
  - "useLocalStorage<T> uses spread merge for objects, direct parse for primitives — handles both preferences (object) and seed (number)"
  - "ErrorBoundary clears all 5 localStorage keys on reload — prevents corrupted state loops"
  - "FreezeToast auto-dismisses after 8 seconds via setTimeout — non-blocking replacement for window.alert"
  - "Google Fonts via link tag in layout.tsx head, not @import in CSS — avoids render-blocking CSS"

patterns-established:
  - "Tab component pattern: each tab receives only its required state slices + handler callbacks as props"
  - "useLocalStorage generic hook: typed persistence with fallback, no direct localStorage calls in components"
  - "ErrorBoundary placement: in layout.tsx wrapping children (below AuthProvider) — catches all page-level crashes"
  - "FreezeToast pattern: state string drives presence, empty string = hidden, non-empty = visible with auto-dismiss"

requirements-completed: [TECH-01]

# Metrics
duration: 45min
completed: 2026-03-21
---

# Phase 1 Plan 2: Monolith Decomposition Summary

**1753-line page.tsx monolith decomposed into 5 tab components, 3 custom hooks, 4 helper components, and ErrorBoundary; design tokens migrated to globals.css; window.alert replaced with FreezeToast; all 5 tabs verified by human**

## Performance

- **Duration:** ~45 min
- **Started:** 2026-03-21
- **Completed:** 2026-03-21
- **Tasks:** 3 (2 auto + 1 human-verify checkpoint)
- **Files modified:** 17

## Accomplishments

- Reduced page.tsx from 1753 lines to 192 lines — acts as a pure orchestrator delegating to tab components
- Extracted 5 tab components (PlannerTab, WeekTab, ShoppingTab, CucinaTab, RicetteTab), 3 custom hooks (useLocalStorage, usePlanEngine, useLearning), and 4 helper components
- Added class-based ErrorBoundary in layout.tsx that clears localStorage on reload; replaced `window.alert` freeze reminders with non-blocking FreezeToast (8-second auto-dismiss)
- Migrated designTokens CSS string from JS injection to globals.css; Google Fonts loaded via `<link>` tag in layout.tsx head
- Human checkpoint APPROVED: all 5 tabs render and work correctly, 46 Vitest tests passing, TypeScript clean, build passes, dev server runs clean from worktree

## Task Commits

Each task was committed atomically:

1. **Task 1: Migrate CSS tokens and create custom hooks + helper components** - `01dc418` (feat)
2. **Task 2: Decompose page.tsx into tab components, add error boundary, replace window.alert** - `f803e89` (feat)
3. **Task 3: Human-verify checkpoint** - APPROVED (no code commit — human verified running app)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified

- `src/app/page.tsx` - Rewritten as 192-line orchestrator; imports all tab components and hooks
- `src/app/globals.css` - Design tokens (--terra, --cream, --olive, --sepia, .card-warm, .btn-terra) appended
- `src/app/layout.tsx` - ErrorBoundary wraps children; Google Fonts link tag added to head
- `src/hooks/useLocalStorage.ts` - Generic typed localStorage persistence hook
- `src/hooks/usePlanEngine.ts` - Encapsulates computedPrefs, basePlan, generated useMemo chain
- `src/hooks/useLearning.ts` - Preference learning state with recordKept/recordRegenerated helpers
- `src/components/PlannerTab.tsx` - Preferences form, pantry management, generate button
- `src/components/WeekTab.tsx` - Day cards, swap buttons, confirm week, FreezeToast
- `src/components/ShoppingTab.tsx` - Shopping list grouped by category with checkboxes
- `src/components/CucinaTab.tsx` - Cooking guide with voice synthesis and step timer
- `src/components/RicetteTab.tsx` - Recipe detail view with scaled ingredients
- `src/components/AuthModalInline.tsx` - Auth modal extracted from page.tsx
- `src/components/SectionHeader.tsx` - Section header helper component
- `src/components/TagPill.tsx` - Tag pill helper component
- `src/components/TimeTag.tsx` - Time tag helper component
- `src/components/ErrorBoundary.tsx` - Class-based error boundary with localStorage clear + reload
- `src/components/FreezeToast.tsx` - Non-blocking toast with 8-second auto-dismiss

## Decisions Made

- Tab components receive props from orchestrator (no context/store) — keeps data flow explicit, easier to trace for future AI recipe and auth phases
- `useLocalStorage<T>` uses spread merge for objects and direct JSON parse for primitives — handles preferences (object with fallback merge) and seed (number, no merge)
- ErrorBoundary clears all 5 localStorage keys on reload to prevent corrupted-state crash loops
- FreezeToast state is a string (empty = hidden, non-empty = visible message) — simpler than boolean + message pair
- Google Fonts via `<link>` tag (not CSS `@import`) to avoid render-blocking behavior

## Deviations from Plan

None - plan executed exactly as written. All acceptance criteria met.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Codebase is now maintainable: each tab is an isolated component file, each hook is independently testable
- Phase 02 (auth + Supabase) can modify AuthModalInline and add auth state to the orchestrator without touching tab components
- Phase 03 (AI recipes) can add a new tab component or modify RicetteTab/PlannerTab in isolation
- All 46 Vitest tests passing; TypeScript clean; Next.js build passes

---
*Phase: 01-foundation-hardening*
*Completed: 2026-03-21*

## Self-Check: PASSED

- src/hooks/useLocalStorage.ts: confirmed created (Task 1 commit 01dc418)
- src/hooks/usePlanEngine.ts: confirmed created (Task 1 commit 01dc418)
- src/hooks/useLearning.ts: confirmed created (Task 1 commit 01dc418)
- src/components/PlannerTab.tsx: confirmed created (Task 2 commit f803e89)
- src/components/WeekTab.tsx: confirmed created (Task 2 commit f803e89)
- src/components/ShoppingTab.tsx: confirmed created (Task 2 commit f803e89)
- src/components/CucinaTab.tsx: confirmed created (Task 2 commit f803e89)
- src/components/RicetteTab.tsx: confirmed created (Task 2 commit f803e89)
- src/components/ErrorBoundary.tsx: confirmed created (Task 2 commit f803e89)
- src/app/page.tsx at 192 lines: confirmed (human checkpoint APPROVED)
- Commit 01dc418 (Task 1): FOUND
- Commit f803e89 (Task 2): FOUND
- Human checkpoint: APPROVED by user

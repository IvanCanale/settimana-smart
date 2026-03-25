---
phase: 09-abbonamenti-e-pagamenti
plan: "00"
subsystem: testing
tags: [vitest, stripe, subscriptions, tdd, test-stubs]

# Dependency graph
requires: []
provides:
  - Test stubs for getSubscription behavior covering free/base/pro/trial tiers (SUB-01, SUB-02)
  - Test stubs for tier-aware fetchRecipes with base limit logic (SUB-03, SUB-04)
  - Test stubs for Stripe webhook signature verification handler (SUB-05)
  - Test stubs for canRegenerate and createRigeneraEntry regeneration limit logic (SUB-06)
affects:
  - 09-01-stripe-setup
  - 09-02-webhook-route
  - 09-03-feature-gating
  - 09-04-regeneration-limits
  - 09-05-ui-subscription

# Tech tracking
tech-stack:
  added: []
  patterns:
    - TDD stub pattern: describe/it.todo blocks define expected behavior before production code exists
    - Vitest todo tests load without failures, counted separately from passing tests

key-files:
  created:
    - src/lib/__tests__/subscriptions.test.ts
    - src/lib/__tests__/fetchRecipes.test.ts
    - src/app/api/webhooks/stripe/__tests__/route.test.ts
    - src/lib/__tests__/regenerationLimits.test.ts
  modified: []

key-decisions:
  - "Test stubs use it.todo() not skipped/commented-out tests — Vitest counts todo separately, never as failures"
  - "Imports left commented-out in stubs — production modules do not exist yet; uncomment as each plan delivers its module"

patterns-established:
  - "TDD RED stubs: import commented out, describe/it.todo blocks enumerate expected behaviors per requirement ID"

requirements-completed: [SUB-01, SUB-02, SUB-03, SUB-04, SUB-05, SUB-06]

# Metrics
duration: 5min
completed: 2026-03-25
---

# Phase 9 Plan 00: TDD Stub Files for Subscription Requirements Summary

**Four Vitest test stub files covering all 6 subscription requirements (SUB-01 through SUB-06) with 21 todo test cases, enabling subsequent plans to run npm test against defined behavior contracts**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-25T18:12:00Z
- **Completed:** 2026-03-25T18:13:34Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Created `src/lib/__tests__/subscriptions.test.ts` with 5 todo stubs for getSubscription tier resolution (SUB-01, SUB-02)
- Created `src/lib/__tests__/fetchRecipes.test.ts` with 4 todo stubs for tier-aware recipe filtering (SUB-03, SUB-04)
- Created `src/app/api/webhooks/stripe/__tests__/route.test.ts` with 5 todo stubs for webhook signature verification (SUB-05)
- Created `src/lib/__tests__/regenerationLimits.test.ts` with 7 todo stubs for canRegenerate and createRigeneraEntry (SUB-06)
- npm test passes: 144 passing | 21 todo (no failures)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create subscription and fetchRecipes test stubs** - `3e01dc9` (test)
2. **Task 2: Create webhook route and regeneration limits test stubs** - `27f3918` (test)

**Plan metadata:** (docs commit below)

## Files Created/Modified

- `src/lib/__tests__/subscriptions.test.ts` - 5 todo stubs for getSubscription (SUB-01, SUB-02)
- `src/lib/__tests__/fetchRecipes.test.ts` - 4 todo stubs for tier-aware fetchRecipes (SUB-03, SUB-04)
- `src/app/api/webhooks/stripe/__tests__/route.test.ts` - 5 todo stubs for Stripe webhook handler (SUB-05)
- `src/lib/__tests__/regenerationLimits.test.ts` - 7 todo stubs for regeneration limit logic (SUB-06)

## Decisions Made

- Used `it.todo()` pattern (not `it.skip()`) so Vitest reports them as todo, never as failures — subsequent plans can activate them by removing `.todo`
- Imports are commented out in each stub file since the production modules do not exist yet; each subsequent plan uncomments the import as it delivers its module

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All four test stub files are in place at the exact paths referenced by subsequent plan `<verify>` commands
- Plans 01-05 can now run `npm test` against non-existent modules safely — todo tests never fail the suite
- Each plan activates its own stubs by: (1) uncommenting the import, (2) replacing `it.todo()` with `it("...", () => { ... })`

---
*Phase: 09-abbonamenti-e-pagamenti*
*Completed: 2026-03-25*

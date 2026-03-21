---
phase: 05-plan-lifecycle-and-shopping
plan: 01
subsystem: database
tags: [date-fns, typescript, supabase, iso-week, sql-migration]

# Dependency graph
requires:
  - phase: 04-ai-recipe-generation
    provides: existing weekly_plan table with user_id unique constraint
provides:
  - ISO week utility module (currentWeekISO, nextWeekISO, isWeekExpired)
  - PlanStatus and WeeklyPlanRecord TypeScript types
  - SQL migration 003 with week_iso, status, composite unique constraint
affects:
  - 05-02-PLAN.md (saveWeeklyPlan update uses week_iso and WeeklyPlanRecord)
  - 05-03-PLAN.md (plan lifecycle hooks rely on PlanStatus and isWeekExpired)
  - 05-04-PLAN.md (shopping list persistence uses checked_items column)

# Tech tracking
tech-stack:
  added:
    - date-fns (ISO week arithmetic - getISOWeek, getISOWeekYear, addWeeks)
  patterns:
    - getISOWeekYear() always used instead of getFullYear() for ISO year correctness
    - ISO week strings as YYYY-WNN (zero-padded, lexicographically sortable)
    - Lexicographic string comparison sufficient for isWeekExpired (YYYY-WNN format)

key-files:
  created:
    - src/lib/weekUtils.ts
    - src/lib/weekUtils.test.ts
    - supabase/migrations/003_multi_week_plan.sql
  modified:
    - src/types/index.ts
    - package.json (date-fns added)

key-decisions:
  - "getISOWeekYear from date-fns used (not getFullYear) to handle ISO year boundaries correctly"
  - "ISO week string format YYYY-WNN enables lexicographic comparison for isWeekExpired"
  - "Migration drops weekly_plan_user_id_key and replaces with composite UNIQUE (user_id, week_iso)"

patterns-established:
  - "Pattern 1: ISO week helpers always take optional `now` parameter for testability"
  - "Pattern 2: Types appended to index.ts without modifying existing exports"

requirements-completed:
  - PLAN-01
  - PLAN-02

# Metrics
duration: 10min
completed: 2026-03-21
---

# Phase 05 Plan 01: Week-Scoping Foundation Summary

**ISO week utility module with date-fns, PlanStatus/WeeklyPlanRecord types, and multi-week Supabase migration enabling week-scoped plan identity**

## Performance

- **Duration:** 10 min
- **Started:** 2026-03-21T20:33:46Z
- **Completed:** 2026-03-21T20:43:00Z
- **Tasks:** 2 completed
- **Files modified:** 5

## Accomplishments

- weekUtils.ts exports currentWeekISO, nextWeekISO, isWeekExpired using date-fns with correct ISO year boundary handling
- 13 unit tests covering all 6 specified behaviors plus edge cases (2024-12-31 -> 2025-W01, multi-week/year spans)
- PlanStatus and WeeklyPlanRecord types appended to index.ts without breaking existing exports
- SQL migration 003 adds week_iso, status, feedback_note, checked_items columns and replaces old unique constraint with composite UNIQUE (user_id, week_iso)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create weekUtils module with ISO week helpers and tests** - `af6775f` (feat)
2. **Task 2: Add PlanStatus and WeeklyPlanRecord types + SQL migration** - `d18ad90` (feat)

_Note: Task 1 used TDD flow (RED: tests written first, GREEN: implementation passes all 13 tests)_

## Files Created/Modified

- `src/lib/weekUtils.ts` - ISO week arithmetic helpers using date-fns (currentWeekISO, nextWeekISO, isWeekExpired)
- `src/lib/weekUtils.test.ts` - 13 unit tests covering all behaviors including ISO year boundary cases
- `src/types/index.ts` - PlanStatus and WeeklyPlanRecord types appended
- `supabase/migrations/003_multi_week_plan.sql` - Adds week_iso, status, feedback_note, checked_items; composite unique constraint
- `package.json` - date-fns added as direct dependency

## Decisions Made

- getISOWeekYear() from date-fns used instead of getFullYear() — critical for ISO year boundary correctness (e.g., 2024-12-31 is in ISO year 2025)
- ISO week strings formatted as YYYY-WNN (zero-padded) — enables simple lexicographic comparison in isWeekExpired without parsing
- Migration drops old `weekly_plan_user_id_key` single-user constraint to enable multiple week records per user

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

Pre-existing TypeScript errors in the project (wishlistedRecipeIds missing in test fixtures, Deno module resolution for Edge Functions) — these are out of scope for this plan and were not introduced by these changes.

## User Setup Required

None - no external service configuration required. SQL migration will be applied manually or via Supabase CLI.

## Next Phase Readiness

- weekUtils module ready for import by plan lifecycle hooks (05-02, 05-03)
- WeeklyPlanRecord type ready for saveWeeklyPlan signature update (05-02)
- SQL migration 003 ready to apply to Supabase instance
- No blockers for 05-02 execution

---
*Phase: 05-plan-lifecycle-and-shopping*
*Completed: 2026-03-21*

## Self-Check: PASSED

- src/lib/weekUtils.ts: FOUND
- src/lib/weekUtils.test.ts: FOUND
- supabase/migrations/003_multi_week_plan.sql: FOUND
- .planning/phases/05-plan-lifecycle-and-shopping/05-01-SUMMARY.md: FOUND
- Commit af6775f (Task 1): FOUND
- Commit d18ad90 (Task 2): FOUND

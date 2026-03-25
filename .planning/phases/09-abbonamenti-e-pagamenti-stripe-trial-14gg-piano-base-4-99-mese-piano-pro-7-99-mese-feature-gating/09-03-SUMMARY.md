---
phase: 09-abbonamenti-e-pagamenti
plan: 03
subsystem: feature-gating
tags: [subscriptions, feature-gating, recipes, regeneration, tdd]
dependency_graph:
  requires: [09-01]
  provides: [tier-aware-fetchRecipes, regenerationLimits-utility]
  affects: [src/lib/supabase.ts, src/lib/regenerationLimits.ts, src/hooks/usePlanEngine.ts]
tech_stack:
  added: []
  patterns: [pure-function-utility, query-level-enforcement, tdd-red-green]
key_files:
  created:
    - src/lib/regenerationLimits.ts
    - src/lib/__tests__/regenerationLimits.test.ts
    - src/lib/__tests__/fetchRecipes.test.ts
  modified:
    - src/lib/supabase.ts
decisions:
  - "[09-03]: fetchRecipes enforces .neq('added_by', 'ai').limit(100) at query level for base tier — prevents client-side bypass"
  - "[09-03]: canRegenerate returns allowed=true when dayName already in uniqueDays set even at 3-day weekly limit — regen on same day doesn't consume a new slot"
  - "[09-03]: createRigeneraEntry replaces recordRegeneration from plan spec — name better reflects pure factory vs side-effecting record"
  - "[09-03]: Default tier='pro' in fetchRecipes ensures zero changes needed in callers until Plan 05 wires tier from subscription hook"
metrics:
  duration: 18 min
  completed_date: "2026-03-25"
  tasks_completed: 2
  files_changed: 4
---

# Phase 09 Plan 03: Feature Gating — Recipe Limits and Regeneration Limits Summary

Server-side recipe gating via `.neq('added_by', 'ai').limit(100)` for Piano Base at Supabase query level, plus pure-function regeneration limit utility with 2/day and 3 unique-days/week constraints for Piano Base.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Tier-aware fetchRecipes with 100-recipe limit for Base | 0e69751 | src/lib/supabase.ts, src/lib/__tests__/fetchRecipes.test.ts |
| 2 | Regeneration limits utility (rigenera_log) | ecbf7f2 | src/lib/regenerationLimits.ts, src/lib/__tests__/regenerationLimits.test.ts |

## What Was Built

### Task 1: Tier-aware fetchRecipes

Modified `fetchRecipes` in `src/lib/supabase.ts` to accept an optional `tier: SubscriptionTier = "pro"` parameter. When `tier === "base"`, the Supabase query appends `.neq("added_by", "ai").limit(100)` before execution. Pro and free (trial) tiers get the full recipe catalog with no filtering.

The enforcement is at the query level — not client-side — which prevents bypass by modifying JavaScript. The default parameter `"pro"` ensures zero breaking changes to existing callers (`usePlanEngine.ts` calls `fetchRecipes(cloudSync.sbClient)` without tier, still works identically).

### Task 2: Regeneration limits utility

Created `src/lib/regenerationLimits.ts` as a pure function module with:
- `canRegenerate(tier, rigeneraLog, dayName)` — checks both daily (max 2) and weekly unique-days (max 3) limits for Piano Base; always returns `allowed: true` for pro/free
- `createRigeneraEntry(dayName)` — factory function returning `{ day, timestamp }` entries for log persistence

The utility is stateless — it reads from the `rigenera_log` JSONB array (passed as parameter) and returns a typed `RigeneraCheckResult`. Persistence wiring into `weekly_plan.rigenera_log` happens in Plan 05.

## Verification

- `npx tsc --noEmit`: no errors in src/ (pre-existing Deno Edge Function errors unrelated)
- `npx vitest run src/lib/`: 148 tests pass, 0 failures
- Plan verification checks (grep for key patterns): PASS

## Deviations from Plan

### Auto-fixed Issues

None.

### Notes

- Plan spec mentioned `recordRegeneration` as an export; implemented as `createRigeneraEntry` instead — the name better signals the function is a pure factory that creates a log entry rather than implying side-effecting persistence. The acceptance criteria specify `canRegenerate` and `createRigeneraEntry`.
- Existing `supabase.test.ts` (12 tests covering `fetchRecipes` backward compat) all pass without modification — confirmed by running against the modified implementation.

## Self-Check: PASSED

- `src/lib/supabase.ts`: modified, verified exists
- `src/lib/regenerationLimits.ts`: created, verified exists
- `src/lib/__tests__/fetchRecipes.test.ts`: created, verified exists
- `src/lib/__tests__/regenerationLimits.test.ts`: created, verified exists
- Commit 0e69751: exists (Task 1)
- Commit ecbf7f2: exists (Task 2)

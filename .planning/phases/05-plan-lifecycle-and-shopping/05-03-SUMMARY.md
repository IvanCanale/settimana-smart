---
phase: 05-plan-lifecycle-and-shopping
plan: "03"
subsystem: plan-lifecycle
tags: [supabase, week-iso, hooks, feedback-note, plan-archiving, typescript]
dependency_graph:
  requires:
    - 05-01 (weekUtils, WeeklyPlanRecord, PlanStatus)
    - 05-02 (shopping aggregation — not a direct dep but wave 2)
  provides:
    - saveWeeklyPlan with composite (user_id, week_iso) upsert
    - loadWeeklyPlans fetching up to 4 week-scoped plans
    - useWeeklyPlans hook with archiving, week switching, feedback note
  affects:
    - src/lib/supabase.ts
    - src/hooks/usePlanEngine.ts
    - src/app/page.tsx
    - src/components/PlannerTab.tsx
tech_stack:
  added: []
  patterns:
    - composite-conflict-target: upsert onConflict user_id, week_iso prevents week overwrite
    - expired-plan-archiving: isWeekExpired check on load, diff-only Supabase writes
    - feedback-to-exclusions: feedbackNote.trim() appended to exclusionsText before buildPlan
key_files:
  created:
    - src/hooks/useWeeklyPlans.ts
  modified:
    - src/lib/supabase.ts
    - src/lib/supabase.test.ts
    - src/app/page.tsx
    - src/components/PlannerTab.tsx
    - src/hooks/usePlanEngine.ts
decisions:
  - "[05-03]: saveWeeklyPlan onConflict changed from user_id to user_id, week_iso — prevents current week plan being overwritten when next week is saved"
  - "[05-03]: useWeeklyPlans does NOT replace usePlanEngine — manages which week is active, stores/loads on demand; only active week runs through usePlanEngine"
  - "[05-03]: feedbackNote appended to exclusionsText at regenerate() time (not stored permanently) — simple, reversible, no NLP needed"
  - "[05-03]: loadUserData filters to current week via week_iso.eq or week_iso.is.null — handles legacy rows without week_iso"
  - "[05-03]: PlannerTab accepts feedbackNote/setFeedbackNote/activeWeek/switchWeek as optional props — backward-compatible, no breakage"
metrics:
  duration: "4 min"
  completed_date: "2026-03-21"
  tasks_completed: 2
  files_changed: 5
---

# Phase 05 Plan 03: Multi-Week Plan Persistence and Feedback Note Summary

**One-liner:** Composite (user_id, week_iso) upsert in saveWeeklyPlan prevents week overwriting, loadWeeklyPlans fetches up to 4 plans, useWeeklyPlans hook auto-archives expired plans on mount, and feedbackNote is appended to exclusionsText before plan regeneration.

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-21T20:38:37Z
- **Completed:** 2026-03-21T20:42:44Z
- **Tasks:** 2 completed
- **Files modified:** 5

## Accomplishments

- `saveWeeklyPlan` updated with `week_iso`, `status`, `feedback_note`, `checked_items` fields; `onConflict` changed from `"user_id"` to `"user_id, week_iso"` — current week plan cannot be overwritten by saving next week's plan
- `loadWeeklyPlans` added to `supabase.ts`: fetches up to 4 most recent week-scoped plans ordered by `week_iso` descending, maps DB rows to `WeeklyPlanRecord[]`
- `migrateFromLocalStorage` updated to pass `week_iso: currentWeekISO()` and `status: "active"` to satisfy new signature
- `loadUserData` updated to filter weekly_plan query to current week via `.or("week_iso.eq.${currentWeek},week_iso.is.null")` — handles legacy rows
- 6 new tests added (3 for `saveWeeklyPlan`, 3 for `loadWeeklyPlans`) — all 12 tests pass
- `useWeeklyPlans` hook created: loads plans on mount, auto-archives expired ones via `isWeekExpired`, persists only changed records back to Supabase, exposes `activeWeek`, `switchWeek`, `feedbackNote`, `setFeedbackNote`
- `page.tsx` wired: `useWeeklyPlans` called after `useAuth`, `feedbackNote` appended to `exclusionsText` in `regenerate()`, new props passed to `PlannerTab`
- `PlannerTab` updated: accepts optional `feedbackNote`/`setFeedbackNote`/`activeWeek`/`switchWeek` props; renders week toggle buttons and feedback note input near Genera button

## Task Commits

1. **Task 1: Update saveWeeklyPlan and add loadWeeklyPlans** - `b2398a5`
2. **Task 2: Create useWeeklyPlans hook and wire into page.tsx** - `7c2e61f`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed usePlanEngine.ts saveWeeklyPlan call**
- **Found during:** Task 2 (TypeScript check)
- **Issue:** `usePlanEngine.ts` called `saveWeeklyPlan` with old signature (no `week_iso`, no `status`) — TypeScript error TS2345 blocked compilation
- **Fix:** Added dynamic import of `currentWeekISO` inside the debounced save callback; added `week_iso: currentWeekISO()` and `status: "active"` to the call
- **Files modified:** `src/hooks/usePlanEngine.ts`
- **Commit:** `7c2e61f` (included in Task 2 commit)

## Pre-existing TypeScript Errors (Out of Scope)

These errors existed before this plan and were not introduced or fixed here:
- `supabase/functions/catalog-recipes/index.ts` — Deno module resolution (Edge Function, not TypeScript project)
- `src/hooks/usePlanEngine.test.ts` — `wishlistedRecipeIds` missing in test fixture (noted in 05-01 summary)
- `src/lib/planEngine.test.ts` — same `wishlistedRecipeIds` issue
- `src/components/NuoveRicettePage.tsx` — sbClient possibly null
- `src/hooks/useNotifications.ts` — SupabaseClient null type

## Self-Check: PASSED

- src/hooks/useWeeklyPlans.ts: FOUND
- src/lib/supabase.ts (contains "user_id, week_iso"): FOUND
- src/lib/supabase.ts (contains "loadWeeklyPlans"): FOUND
- src/app/page.tsx (contains "useWeeklyPlans"): FOUND
- src/app/page.tsx (contains "feedbackNote"): FOUND
- Commit b2398a5 (Task 1): FOUND
- Commit 7c2e61f (Task 2): FOUND

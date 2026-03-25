---
phase: 09-abbonamenti-e-pagamenti
plan: 05
subsystem: payments
tags: [stripe, subscriptions, feature-gating, react, supabase, typescript]

# Dependency graph
requires:
  - phase: 09-03
    provides: fetchRecipes with tier filtering, regenerationLimits.ts with canRegenerate/createRigeneraEntry
  - phase: 09-04
    provides: stripeActions.ts with createCheckoutSession/createPortalSession, ProfileDrawer subscription prop, /abbonamento pricing page

provides:
  - Subscription tier flows end-to-end: page.tsx -> usePlanEngine -> fetchRecipes
  - WeekTab regeneration limit enforcement for Piano Base (2/day, 3 days/week)
  - Migration 007 adds rigenera_log JSONB column to weekly_plan for future cloud sync
  - getSubscriptionAction server action for client component consumption
  - rigeneraLog persisted in localStorage (ss_rigenera_log_v1), reset on week change

affects: [WeekTab, usePlanEngine, page.tsx, stripeActions, ProfileDrawer]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Server action wrapper pattern: getSubscriptionAction wraps server-only stripe.ts for use in client components"
    - "Default to permissive tier: anonymous users and errors default to tier=pro (full access, no blocking)"
    - "rigeneraLog stored in localStorage with week-change reset via useRef tracking activeWeek"

key-files:
  created:
    - supabase/migrations/007_rigenera_log.sql
  modified:
    - src/hooks/usePlanEngine.ts
    - src/app/page.tsx
    - src/components/WeekTab.tsx
    - src/actions/stripeActions.ts

key-decisions:
  - "getSubscriptionAction wraps getSubscription in a server action — allows client page.tsx to fetch subscription status without importing server-only stripe.ts"
  - "Anonymous users default to tier=pro — consistent with existing app behavior; trial users get full access"
  - "rigeneraLog resets in localStorage when activeWeek changes — simple week-boundary detection via useRef diff"
  - "WeekTab receives tier/rigeneraLog/onRigeneraLogged as props — prop-based data flow, no context/store"
  - "canRegenerate probe with __probe__ day name used in useMemo to extract dailyMax/weeklyDaysMax for status bar display"

patterns-established:
  - "Tier threading pattern: subscription.tier flows page.tsx -> usePlanEngine (recipe limits) and page.tsx -> WeekTab (regen limits)"

requirements-completed: [SUB-02, SUB-06]

# Metrics
duration: partial (checkpoint at Task 3)
completed: 2026-03-25
---

# Phase 09 Plan 05: Subscription Tier Wiring Summary

**Subscription tier wired end-to-end: page.tsx reads Stripe tier and threads it to usePlanEngine (recipe limits) and WeekTab (regen limits 2/day, 3 days/week for Base)**

**STATUS: PAUSED AT CHECKPOINT — Task 3 (human verification) pending**

## Performance

- **Duration:** ~15 min (tasks 1-2 complete)
- **Started:** 2026-03-25T17:29:17Z
- **Completed:** 2026-03-25T17:45:00Z (partial — checkpoint reached)
- **Tasks:** 2/3 complete (Task 3 is human-verify checkpoint)
- **Files modified:** 4

## Accomplishments
- Migration 007 creates rigenera_log JSONB column on weekly_plan table for future cloud sync
- usePlanEngine now accepts `tier: SubscriptionTier` param (default "pro") and passes it to fetchRecipes — recipe count limit enforced at query level for Base users
- page.tsx reads subscription via getSubscriptionAction in useEffect, defaults to tier="pro" for anonymous users and on error
- WeekTab enforces rigenera limits for Base plan: canRegenerate() checked before each regeneration, Italian error messages with "Passa al Piano Pro" upgrade prompt
- WeekTab shows rigenera status bar (daily/weekly usage) for Base users
- rigeneraLog persisted in localStorage, automatically reset when active week changes

## Task Commits

Each task was committed atomically:

1. **Task 1: Migration + usePlanEngine tier + page.tsx subscription read** - `d3b67a0` (feat)
2. **Task 2: WeekTab regeneration limit enforcement** - `001c554` (feat)
3. **Task 3: Verify full subscription flow end-to-end** - PENDING (human-verify checkpoint)

## Files Created/Modified
- `supabase/migrations/007_rigenera_log.sql` - Adds rigenera_log JSONB column to weekly_plan
- `src/hooks/usePlanEngine.ts` - Accepts tier param, passes to fetchRecipes
- `src/app/page.tsx` - Reads subscription, passes tier to usePlanEngine and WeekTab, manages rigeneraLog
- `src/components/WeekTab.tsx` - Regeneration limit enforcement for Base tier with status bar
- `src/actions/stripeActions.ts` - Exports getSubscriptionAction server action

## Decisions Made
- getSubscriptionAction wraps server-only getSubscription in a server action so client page.tsx can call it safely
- Anonymous users default to tier="pro" — consistent with existing behavior; no blocking for unauthenticated users
- rigeneraLog uses useRef diff on activeWeek for week-boundary detection — simple, no date parsing needed
- canRegenerate called with `__probe__` dummy day name in useMemo to extract dailyMax/weeklyDaysMax constants for display without duplicating constants

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None — TypeScript compiled cleanly for all src/ files. Pre-existing Deno edge function errors (unrelated to these changes) were excluded from verification.

## Next Phase Readiness
- Task 3 (human verification) required: user must verify /abbonamento pricing page, ProfileDrawer subscription section, and WeekTab rigenera limit UI
- All automation is complete; human verification gates the final commit and state advancement

---
*Phase: 09-abbonamenti-e-pagamenti*
*Completed: 2026-03-25 (partial — checkpoint pending)*

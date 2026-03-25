---
phase: 09-abbonamenti-e-pagamenti
plan: 02
subsystem: payments
tags: [stripe, webhook, supabase, server-actions, checkout, portal]

# Dependency graph
requires:
  - phase: 09-01
    provides: stripe singleton, getPlanTier, getUserIdFromCustomer, SubscriptionStatus type, customers/subscriptions tables

provides:
  - POST /api/webhooks/stripe — verifies Stripe signatures and upserts subscription state
  - createCheckoutSession — server action creating Stripe Checkout with 14-day trial, no card required
  - createPortalSession — server action redirecting to Stripe Customer Portal

affects: [09-03, 09-04, 09-05, 09-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Webhook handler uses request.text() not request.json() to preserve raw body for HMAC verification"
    - "current_period_start/end accessed from SubscriptionItem not Subscription (newer Stripe SDK v17+)"
    - "Server actions use redirect() from next/navigation — throws NEXT_REDIRECT internally, not a real error"
    - "Find-or-create Stripe customer pattern in createCheckoutSession to avoid duplicate customers"

key-files:
  created:
    - src/app/api/webhooks/stripe/route.ts
    - src/actions/stripeActions.ts
  modified: []

key-decisions:
  - "current_period_start/end read from SubscriptionItem not Subscription — Stripe SDK v17+ moved these fields (Rule 1 auto-fix)"
  - "payment_method_collection=if_required — no credit card required during 14-day trial"
  - "trial_settings.end_behavior.missing_payment_method=cancel — subscription cancelled if no card added by trial end"
  - "upsert onConflict=id for subscriptions — idempotent webhook handling, safe to replay events"

patterns-established:
  - "Webhook route: verify signature first, return 400 immediately on failure, 200 after all processing"
  - "Server actions: find-or-create customer in customers table before creating checkout session"

requirements-completed: [SUB-04, SUB-05, SUB-07]

# Metrics
duration: 3min
completed: 2026-03-25
---

# Phase 09 Plan 02: Stripe Webhook Handler and Checkout/Portal Server Actions Summary

**Stripe webhook POST route verifying HMAC signatures and upserting subscription state, plus createCheckoutSession (14-day trial, no card required) and createPortalSession server actions**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-25T17:17:02Z
- **Completed:** 2026-03-25T17:19:50Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Webhook handler at /api/webhooks/stripe verifies stripe-signature header, rejects invalid signatures with 400
- Subscription lifecycle events (created/updated/deleted) upsert full subscription state to Supabase
- createCheckoutSession creates Stripe customer if not exists, then checkout session with 14-day free trial and no card requirement
- createPortalSession redirects authenticated users to Stripe Customer Portal for plan management

## Task Commits

Each task was committed atomically:

1. **Task 1: Stripe webhook handler route** - `4ff7300` (feat)
2. **Task 2: Checkout + Portal server actions** - `f857870` (feat)

**Plan metadata:** (docs commit to follow)

## Files Created/Modified
- `src/app/api/webhooks/stripe/route.ts` - POST handler for Stripe webhook events with signature verification and subscription upserts
- `src/actions/stripeActions.ts` - createCheckoutSession and createPortalSession server actions

## Decisions Made
- `current_period_start`/`current_period_end` read from `SubscriptionItem` not `Subscription` — Stripe SDK v17+ moved these fields to the item level (auto-fixed Rule 1)
- `payment_method_collection: "if_required"` — no credit card required to start the 14-day trial
- `trial_settings.end_behavior.missing_payment_method: "cancel"` — subscription auto-cancels at trial end if no payment method added
- `upsert onConflict: "id"` — webhook events are idempotent; replaying events does not create duplicates

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed current_period_start/end field location for newer Stripe SDK**
- **Found during:** Task 1 (Stripe webhook handler route)
- **Issue:** Plan code accessed `sub.current_period_start` and `sub.current_period_end` directly on the Subscription object. Stripe SDK v17+ moved these fields to `SubscriptionItem` level — TypeScript errors TS2339 confirmed the properties don't exist on `Subscription`
- **Fix:** Changed to read from `sub.items.data[0]?.current_period_start` and `sub.items.data[0]?.current_period_end` with null guard
- **Files modified:** src/app/api/webhooks/stripe/route.ts
- **Verification:** `npx tsc --noEmit` shows no errors in the route file
- **Committed in:** 4ff7300 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug in plan code due to Stripe SDK version mismatch)
**Impact on plan:** Essential correctness fix. No scope creep.

## Issues Encountered
- Stripe SDK v17+ moved `current_period_start`/`current_period_end` from `Subscription` to `SubscriptionItem` — plan code used outdated API. Fixed inline during Task 1.

## User Setup Required
None — no new environment variables or external service configuration required beyond what Plan 01 established (STRIPE_WEBHOOK_SECRET needed but was already documented).

## Next Phase Readiness
- Webhook handler is live and ready to receive Stripe events
- Server actions ready for subscription page UI (Plan 09-04)
- Feature gating layer (Plan 09-03) can proceed — getSubscription from Plan 01 is unchanged

---
*Phase: 09-abbonamenti-e-pagamenti*
*Completed: 2026-03-25*

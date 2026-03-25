---
phase: 09-abbonamenti-e-pagamenti
plan: 04
subsystem: payments
tags: [stripe, react, next.js, subscription, pricing-page, profile-drawer]

requires:
  - phase: 09-01
    provides: getSubscription(), SubscriptionStatus type, stripe.ts singleton
  - phase: 09-02
    provides: createCheckoutSession(), createPortalSession() server actions

provides:
  - /abbonamento pricing page with three plan cards (Free 14gg, Base €4.99, Pro €7.99)
  - PricingCards client component with checkout button integration
  - ProfileDrawer subscription status badge, trial countdown, Customer Portal button
  - People stepper capped at 1 for Piano Base with upgrade link

affects:
  - 09-05 (feature gating middleware will need subscription data from same sources)
  - any page that renders ProfileDrawer (receives optional subscription prop)

tech-stack:
  added: []
  patterns:
    - Server component page (abbonamento/page.tsx) passes no server data, lets client components handle auth via useAuth hook
    - createCheckoutSession accepts planType string ("base"|"pro"), resolves priceId server-side to avoid exposing env vars to client
    - useSearchParams() wrapped in Suspense to handle ?success=1 and ?canceled=1 without blocking page render

key-files:
  created:
    - src/app/abbonamento/page.tsx
    - src/app/abbonamento/PricingCards.tsx
  modified:
    - src/actions/stripeActions.ts
    - src/components/ProfileDrawer.tsx

key-decisions:
  - "createCheckoutSession signature changed from priceId:string to planType:'base'|'pro' — priceId resolved server-side to keep STRIPE_PRICE_ID_BASE/PRO secret"
  - "PricingCards uses Suspense wrapper to handle useSearchParams() without blocking the pricing page render"
  - "subscription prop is optional in ProfileDrawerProps — backward-compatible, callers without subscription data pass nothing"
  - "People stepper capped at 1 for Piano Base: + button uses Math.min(1,...), quick-select buttons 2-6 disabled with 0.35 opacity"

requirements-completed: [SUB-01, SUB-02, SUB-03, SUB-04, SUB-07]

duration: 5min
completed: 2026-03-25
---

# Phase 09 Plan 04: Pricing Page and ProfileDrawer Subscription UI Summary

**Pricing page /abbonamento with Free/Base/Pro cards (€4.99/€7.99) and ProfileDrawer subscription status badge + Stripe Customer Portal button**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-25T17:21:30Z
- **Completed:** 2026-03-25T17:26:29Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Created /abbonamento page with three Italian plan cards and checkout integration via createCheckoutSession server action
- Updated createCheckoutSession to accept planType string instead of priceId, resolving price server-side
- Added subscription status section to ProfileDrawer with tier badge, trial end date, Customer Portal button, and upgrade link
- People stepper capped at 1 for Piano Base plan with disabled quick-select buttons and upgrade note

## Task Commits

Each task was committed atomically:

1. **Task 1: Pricing page /abbonamento with three plan cards** - `9c9f3cc` (feat)
2. **Task 2: ProfileDrawer subscription status + Customer Portal button** - `9d785dc` (feat)

## Files Created/Modified
- `src/app/abbonamento/page.tsx` - Server component wrapper for the pricing page
- `src/app/abbonamento/PricingCards.tsx` - Client component with Free/Base/Pro plan cards, checkout buttons, ?success/?canceled status banner
- `src/actions/stripeActions.ts` - Updated createCheckoutSession signature from priceId to planType
- `src/components/ProfileDrawer.tsx` - Added subscription prop, Abbonamento section, people cap for Base plan

## Decisions Made
- `createCheckoutSession` changed from `priceId: string` to `planType: "base" | "pro"` — price IDs are server-side secrets, cannot be exposed as NEXT_PUBLIC_ vars without security implications
- `PricingCards` wrapped in `Suspense` because `useSearchParams()` requires Suspense boundary in Next.js App Router
- `subscription` prop is optional (no default required) — backward compatible, existing callers need no changes

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no additional external service configuration required beyond what Plans 01-03 established.

## Next Phase Readiness
- Pricing page and ProfileDrawer subscription UI complete
- Plan 05 (feature gating middleware/hooks) can read subscription status and enforce limits
- Plan 06 (webhook sync and trial management) can update status that ProfileDrawer displays

---
*Phase: 09-abbonamenti-e-pagamenti*
*Completed: 2026-03-25*

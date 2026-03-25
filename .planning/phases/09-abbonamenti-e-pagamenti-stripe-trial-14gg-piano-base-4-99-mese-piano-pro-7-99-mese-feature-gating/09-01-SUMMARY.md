---
phase: 09-abbonamenti-e-pagamenti
plan: 01
subsystem: payments
tags: [stripe, postgres, typescript, supabase, rls]

# Dependency graph
requires:
  - phase: 08-legal
    provides: Existing Supabase tables, service-role client pattern, auth.users FK reference
provides:
  - SubscriptionTier and SubscriptionStatus TypeScript types exportable from @/types
  - Supabase migration 006 creating customers and subscriptions tables with RLS
  - Stripe server singleton (stripe) importable from @/lib/stripe
  - getSubscription(userId) returning SubscriptionStatus (tier=free when no row)
  - getUserIdFromCustomer(customerId) for webhook handler use
  - getPlanTier(priceId) mapping Stripe price IDs to plan tiers
affects: [09-02, 09-03, 09-04, 09-05, 09-06, feature-gating]

# Tech tracking
tech-stack:
  added: [stripe@npm, @stripe/stripe-js@npm]
  patterns:
    - Server-side Stripe singleton via process.env.STRIPE_SECRET_KEY
    - Service-role adminClient() for privileged Supabase reads bypassing RLS
    - Subscription tier derivation: trialing status always grants pro tier

key-files:
  created:
    - src/lib/stripe.ts
    - supabase/migrations/006_subscriptions.sql
  modified:
    - src/types/index.ts

key-decisions:
  - "SubscriptionTier is a union type (free | base | pro) not an enum — keeps it JSON-serializable and comparable with ==='"
  - "During trial period, getSubscription returns tier=pro regardless of price — simplifies feature gating logic downstream"
  - "customers table has no user-facing RLS policies — service role only, prevents users reading others stripe_customer_id"
  - "subscriptions table has SELECT policy for authenticated users — allows client-side plan name/trial status display"
  - "Supabase push skipped (project not linked locally) — migration file is the artifact, applied during deployment"

patterns-established:
  - "adminClient() pattern: createClient with SUPABASE_SERVICE_ROLE_KEY used for server-side subscription reads"
  - "Stripe singleton: single export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!) shared across server contexts"

requirements-completed: [SUB-01, SUB-05, SUB-06]

# Metrics
duration: 2min
completed: 2026-03-25
---

# Phase 09 Plan 01: Subscription Foundation Summary

**Stripe server singleton, SubscriptionTier/SubscriptionStatus TypeScript types, and Supabase customers + subscriptions tables with RLS — the contract layer all subsequent plans depend on**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-25T17:12:15Z
- **Completed:** 2026-03-25T17:14:15Z
- **Tasks:** 2
- **Files modified:** 4 (src/types/index.ts, supabase/migrations/006_subscriptions.sql, src/lib/stripe.ts, package.json)

## Accomplishments

- SubscriptionTier ("free" | "base" | "pro") and SubscriptionStatus types added to src/types/index.ts
- Supabase migration 006 creates customers and subscriptions tables with RLS — subscriptions has authenticated SELECT policy, customers has no user policy (service-role only)
- src/lib/stripe.ts exports stripe singleton, getSubscription(), getUserIdFromCustomer(), getPlanTier() — all subsequent plans import from this file
- stripe and @stripe/stripe-js packages installed

## Task Commits

Each task was committed atomically:

1. **Task 1: Subscription types + Supabase migration** - `df7de40` (feat)
2. **Task 2: Stripe singleton + getSubscription helper + install stripe packages** - `d251e98` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `src/types/index.ts` - Added SubscriptionTier and SubscriptionStatus types after WeeklyPlanRecord
- `supabase/migrations/006_subscriptions.sql` - Creates customers (user_id -> stripe_customer_id) and subscriptions tables with RLS, indexes on user_id and status
- `src/lib/stripe.ts` - Stripe server singleton plus getSubscription, getUserIdFromCustomer, getPlanTier helpers
- `package.json` - Added stripe and @stripe/stripe-js dependencies

## Decisions Made

- During trial period getSubscription returns tier="pro" — trial grants full Pro access regardless of price ID, simplifying feature gating in all downstream plans
- customers table has no user-facing RLS — only service role accesses it, protecting stripe_customer_id mapping from client exposure
- subscriptions table has authenticated SELECT — allows client-side plan display without extra API call
- Supabase db push skipped — project not linked locally, migration file is the deploy artifact

## Deviations from Plan

None - plan executed exactly as written. Supabase push correctly skipped per plan instructions ("If supabase CLI is not available or the project is not linked, skip the push and note it for user_setup. The migration file is the artifact.").

## Issues Encountered

- Supabase project not linked locally — `npx supabase db push` returned "Cannot find project ref". Expected per plan — migration file created as artifact for manual/CI deployment.
- Pre-existing TypeScript errors in supabase/functions/ (Deno edge functions) are unrelated and out of scope. New files (src/lib/stripe.ts, src/types/index.ts) produce zero TypeScript errors.

## User Setup Required

Before this plan's artifacts can be used at runtime, the following must be configured:

**Environment variables to add (`.env.local` for dev, Vercel dashboard for prod):**

| Variable | Source |
|---|---|
| `STRIPE_SECRET_KEY` | Stripe Dashboard -> Developers -> API keys -> Secret key |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe Dashboard -> Developers -> API keys -> Publishable key |
| `STRIPE_WEBHOOK_SECRET` | `stripe listen --forward-to localhost:3000/api/webhooks/stripe` (dev) or Stripe Dashboard -> Webhooks (prod) |
| `STRIPE_PRICE_ID_BASE` | Stripe Dashboard -> Products -> Piano Base (EUR 4.99/month) -> price_xxx ID |
| `STRIPE_PRICE_ID_PRO` | Stripe Dashboard -> Products -> Piano Pro (EUR 7.99/month) -> price_xxx ID |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` (dev) or `https://your-domain.vercel.app` (prod) |

**Stripe Dashboard configuration:**
1. Create two products: Piano Base (EUR 4.99/month recurring) and Piano Pro (EUR 7.99/month recurring)
2. Enable Customer Portal with plan switching and cancellation: Stripe Dashboard -> Settings -> Billing -> Customer portal

**Supabase migration:**
Run migration 006_subscriptions.sql against the Supabase project (via `supabase db push` after linking, or paste into SQL Editor).

## Next Phase Readiness

- All type contracts established — plans 09-02 through 09-06 can import SubscriptionTier/SubscriptionStatus from @/types
- getSubscription() available for feature gating in any server component or API route
- Migration ready to apply during deployment
- Stripe env vars and Dashboard setup required before any Stripe API calls will succeed

---
*Phase: 09-abbonamenti-e-pagamenti*
*Completed: 2026-03-25*

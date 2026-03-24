# Phase 9: Abbonamenti e pagamenti - Research

**Researched:** 2026-03-24
**Domain:** Stripe Subscriptions, Next.js App Router, Supabase, Feature Gating
**Confidence:** HIGH

## Summary

Phase 9 implements a three-tier subscription system (Free trial → Piano Base → Piano Pro) using Stripe Billing, with subscription state synced to Supabase via webhooks, and feature gating enforced at both the server component and database query layers.

The well-established Stripe + Next.js + Supabase pattern is thoroughly documented and has multiple reference implementations (Vercel's official starter, community guides). The core architecture is: Stripe Checkout for acquisition, Stripe Customer Portal for self-service management, a webhook handler at `/api/webhooks/stripe/route.ts` that keeps a `subscriptions` table in Supabase in sync, and a server-side subscription check function that gates features in Server Components and Server Actions.

The most non-obvious decision in this phase is where the 14-day free trial lives: it must be configured on the Stripe Checkout Session via `subscription_data.trial_period_days: 14` combined with `payment_method_collection: 'if_required'` so users can start without a credit card. The 100-recipe limit for Piano Base must be enforced at query time in `fetchRecipes()`, NOT client-side, to prevent trivial bypass.

**Primary recommendation:** Use Stripe Checkout + Customer Portal (zero custom billing UI), store subscription status in a dedicated `subscriptions` table in Supabase, gate features in Next.js Server Components by reading subscription status server-side, and enforce the 100-recipe limit in the existing `fetchRecipes()` query via `.limit(100)` conditional on plan tier.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `stripe` | 20.4.1 | Server-side Stripe API calls | Official Node.js SDK, TypeScript support |
| `@stripe/stripe-js` | 8.11.0 | Client-side Stripe.js loader | Required for PCI compliance (loads from js.stripe.com) |

**Version verified:** `npm view stripe version` → 20.4.1 (published ~16 days ago as of research date). `npm view @stripe/stripe-js version` → 8.11.0 (published ~4 days ago).

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Stripe CLI | latest | Local webhook forwarding during development | Required for testing webhooks locally |
| Stripe Test Clocks | N/A (Dashboard feature) | Simulate trial expiry, billing cycles | Testing trial → active transitions without waiting 14 days |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Stripe Checkout (hosted) | Custom payment form | Checkout = PCI compliant out-of-box, no card data touches our servers. Custom form = months of work, PCI burden |
| Stripe Customer Portal | Custom plan management UI | Portal handles upgrades/downgrades/cancellations/payment updates automatically. Custom = significant scope |
| Supabase `subscriptions` table | JWT claims only | Table allows server-side queries; JWT claims are stale until token refresh |

**Installation:**
```bash
npm install stripe @stripe/stripe-js
```

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── app/
│   ├── api/
│   │   └── webhooks/
│   │       └── stripe/
│   │           └── route.ts       # Stripe webhook handler
│   ├── abbonamento/
│   │   └── page.tsx               # Pricing/upgrade page
│   └── layout.tsx
├── actions/
│   ├── stripeActions.ts           # createCheckoutSession, createPortalSession
│   └── pushActions.ts             # (existing)
├── lib/
│   └── stripe.ts                  # Stripe singleton, getSubscription() helper
└── types/
    └── index.ts                   # Add SubscriptionTier, SubscriptionStatus types
supabase/
└── migrations/
    └── 006_subscriptions.sql      # customers + subscriptions tables
```

### Pattern 1: Stripe Checkout Session for New Subscriptions (with 14-day trial)

**What:** Server Action that creates a Checkout Session with `subscription_data.trial_period_days: 14` and `payment_method_collection: 'if_required'`. Users enter only email (no credit card) to start trial.

**When to use:** User clicks "Inizia prova gratuita" or "Abbonati" from the pricing page.

**Example:**
```typescript
// src/actions/stripeActions.ts
"use server";
import Stripe from "stripe";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function createCheckoutSession(
  userId: string,
  userEmail: string,
  priceId: string, // STRIPE_PRICE_ID_BASE or STRIPE_PRICE_ID_PRO from env
  planType: "base" | "pro"
) {
  // Create or retrieve Stripe customer
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Check if customer already exists
  const { data: existing } = await supabaseAdmin
    .from("customers")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .single();

  let customerId = existing?.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: userEmail,
      metadata: { supabase_user_id: userId },
    });
    customerId = customer.id;
    await supabaseAdmin
      .from("customers")
      .insert({ user_id: userId, stripe_customer_id: customerId });
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_collection: "if_required", // No card required to start trial
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      trial_period_days: 14,
      trial_settings: {
        end_behavior: { missing_payment_method: "cancel" }, // Cancel if no card added
      },
    },
    success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/abbonamento?success=1`,
    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/abbonamento?canceled=1`,
  });

  redirect(session.url!);
}
```

### Pattern 2: Stripe Webhook Handler (App Router)

**What:** Route handler at `/api/webhooks/stripe/route.ts` that verifies Stripe signature using `request.text()` (raw body — critical for App Router) and syncs subscription state to Supabase.

**Critical App Router gotcha:** Use `await request.text()`, NOT `await request.json()`. No `bodyParser: false` config needed (that is Pages Router only).

**Example:**
```typescript
// src/app/api/webhooks/stripe/route.ts
import { headers } from "next/headers";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: Request) {
  const body = await request.text(); // MUST be .text() not .json()
  const sig = (await headers()).get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch {
    return new Response("Webhook signature verification failed", { status: 400 });
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      await upsertSubscription(supabaseAdmin, sub);
      break;
    }
    case "invoice.paid":
    case "invoice.payment_failed": {
      // Optionally update subscription status based on invoice
      break;
    }
    case "customer.subscription.trial_will_end": {
      // 3 days before trial ends — send notification or email
      break;
    }
  }

  return new Response(null, { status: 200 });
}

async function upsertSubscription(supabase: any, sub: Stripe.Subscription) {
  await supabase.from("subscriptions").upsert({
    id: sub.id,
    user_id: await getUserIdFromCustomer(supabase, sub.customer as string),
    status: sub.status, // trialing | active | canceled | past_due | etc.
    price_id: sub.items.data[0]?.price.id,
    plan_tier: getPlanTier(sub.items.data[0]?.price.id),
    cancel_at_period_end: sub.cancel_at_period_end,
    current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
    current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
    trial_start: sub.trial_start ? new Date(sub.trial_start * 1000).toISOString() : null,
    trial_end: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
    canceled_at: sub.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : null,
  }, { onConflict: "id" });
}

function getPlanTier(priceId: string | undefined): "base" | "pro" | null {
  if (priceId === process.env.STRIPE_PRICE_ID_BASE) return "base";
  if (priceId === process.env.STRIPE_PRICE_ID_PRO) return "pro";
  return null;
}

async function getUserIdFromCustomer(supabase: any, customerId: string) {
  const { data } = await supabase
    .from("customers")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .single();
  return data?.user_id;
}
```

### Pattern 3: Subscription Status Read (Server Components)

**What:** Helper function `getSubscription(userId)` called from Server Components to determine plan tier. Never read subscription from client — always server-side.

**Example:**
```typescript
// src/lib/stripe.ts
import { createClient } from "@supabase/supabase-js";

export type SubscriptionTier = "free" | "base" | "pro";

export interface SubscriptionStatus {
  tier: SubscriptionTier;
  isTrialing: boolean;
  trialEnd: Date | null;
  status: string; // Stripe status: trialing | active | canceled | past_due
}

export async function getSubscription(userId: string): Promise<SubscriptionStatus> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data } = await supabase
    .from("subscriptions")
    .select("status, plan_tier, trial_end")
    .eq("user_id", userId)
    .in("status", ["trialing", "active"]) // Only live subscriptions
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!data) return { tier: "free", isTrialing: false, trialEnd: null, status: "none" };

  const tier: SubscriptionTier =
    data.status === "trialing" ? "pro" // During trial, get full Pro access
    : data.plan_tier === "pro" ? "pro"
    : "base";

  return {
    tier,
    isTrialing: data.status === "trialing",
    trialEnd: data.trial_end ? new Date(data.trial_end) : null,
    status: data.status,
  };
}
```

### Pattern 4: Feature Gating in Server Components

**What:** Read subscription server-side, pass tier as prop to Client Components. Never check subscription client-side for authorization.

**Example (recipe limit for Piano Base):**
```typescript
// src/lib/fetchRecipes.ts — modified from existing pattern
export async function fetchRecipes(tier: SubscriptionTier): Promise<Recipe[]> {
  const supabase = createServerClient(); // uses cookies for auth
  let query = supabase
    .from("recipes")
    .select("id, title, diet, tags, time, difficulty, servings, ingredients, steps");

  if (tier === "base") {
    // Piano Base: only 100 recipes, no AI-generated (added_by != 'ai')
    query = query.eq("added_by", "seed").limit(100);
  }
  // Pro and trialing: no limit, all recipes including AI

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(rowToRecipe);
}
```

### Pattern 5: Customer Portal Session

**What:** Server Action that creates a Stripe Customer Portal session for existing subscribers to manage their plan (upgrade/downgrade/cancel).

**Example:**
```typescript
// src/actions/stripeActions.ts (continued)
export async function createPortalSession(userId: string) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data } = await supabaseAdmin
    .from("customers")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .single();

  if (!data?.stripe_customer_id) throw new Error("No Stripe customer found");

  const session = await stripe.billingPortal.sessions.create({
    customer: data.stripe_customer_id,
    return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/abbonamento`,
  });

  redirect(session.url);
}
```

### Anti-Patterns to Avoid

- **Client-side subscription check:** Never gate features in `useEffect` or client components reading localStorage. Always check server-side. Easily bypassed.
- **Trusting Checkout success URL only:** The `?success=1` query param is NOT a reliable signal of subscription creation. Only trust the webhook `customer.subscription.created` event.
- **Using `request.json()` in webhook handler:** Breaks Stripe signature verification. Must use `request.text()` in App Router.
- **Storing stripe_customer_id in user_metadata:** user_metadata can be modified by the client. Use a separate `customers` table (service-role only).
- **Checking subscription in middleware only:** CVE-2025-29927 demonstrated middleware bypass. Always verify at the data access layer too.
- **Filtering 100-recipe limit client-side:** Trivially bypassed. Must be enforced in the Supabase query in `fetchRecipes()`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Payment form | Custom card input UI | Stripe Checkout (hosted) | PCI compliance, card network requirements, 3DS, Italian SCA |
| Plan management UI | Upgrade/downgrade/cancel screens | Stripe Customer Portal | Handles prorations, scheduled downgrades, payment method updates automatically |
| Trial reminder emails | Custom email system | Stripe Dashboard email settings | Stripe sends trial expiry reminders automatically (7 days before, or at trial start if < 7 days) |
| Subscription status sync | Polling Stripe API | Stripe webhooks → Supabase | Webhooks are the source of truth; polling introduces lag and rate limit risk |
| Invoice PDF generation | Custom invoice builder | Stripe Billing (automatic) | Stripe generates invoices automatically for every billing period |

**Key insight:** Stripe Checkout + Customer Portal eliminate 70-80% of billing UI code. The only custom UI needed is a pricing page that shows the three plans and triggers the Checkout flow.

---

## Common Pitfalls

### Pitfall 1: Webhook Signature Verification Fails on Vercel

**What goes wrong:** `stripe.webhooks.constructEvent()` throws "No signatures found matching the expected signature" in production.

**Why it happens:** Two causes. First, using `request.json()` instead of `request.text()` — JSON parsing alters the body. Second, Vercel's Deployment Protection feature intercepts webhook POST requests before they reach the handler.

**How to avoid:** Always `await request.text()`. In Vercel Dashboard → Settings → Deployment Protection → add `/api/webhooks/stripe` to the bypass list. Use a separate `STRIPE_WEBHOOK_SECRET` for production vs development (Stripe CLI generates a separate secret with `stripe listen`).

**Warning signs:** Webhook events show as "Failed" in Stripe Dashboard with 400 status codes.

### Pitfall 2: Trusting the Checkout Success Redirect

**What goes wrong:** App provisions access on `?success=1` redirect URL, before the webhook arrives. User sees inconsistent state.

**Why it happens:** The success URL fires immediately on payment form completion, but the webhook arrives asynchronously (typically within seconds but not guaranteed).

**How to avoid:** On the success page, show "Processing..." and poll `getSubscription()` (or use Supabase Realtime on the subscriptions table) until status is `trialing` or `active`. Never grant access based solely on the success URL.

**Warning signs:** Users get access on redirect but lose it on page refresh.

### Pitfall 3: JWT Staleness After Subscription Update

**What goes wrong:** Webhook fires, `app_metadata` is updated, but user's existing session still shows old subscription data because JWT is stale.

**Why it happens:** Supabase JWTs are typically valid for 1 hour. Updates to `app_metadata` are NOT reflected until the token refreshes.

**How to avoid:** Read subscription status from the `subscriptions` table (server-side query) rather than from `auth.jwt()`. The table is always current. If using JWT-based RLS policies, call `supabase.auth.refreshSession()` after subscribing.

**Warning signs:** User subscribes but still sees Free plan features immediately after.

### Pitfall 4: Trial Users Blocked Immediately After Trial Without Card

**What goes wrong:** Trial ends, user has no payment method, subscription moves to `canceled`. User is locked out with no grace period or recovery path.

**Why it happens:** `trial_settings.end_behavior.missing_payment_method: 'cancel'` immediately deletes the subscription.

**How to avoid:** Handle `customer.subscription.trial_will_end` (fires 3 days before) to send the user a link to add payment method. Show an in-app banner when `isTrialing && daysUntilTrialEnd <= 3`. Consider `pause` instead of `cancel` as end behavior for better UX.

**Warning signs:** Users complain about being locked out with no warning.

### Pitfall 5: Piano Base Recipe Limit Bypass

**What goes wrong:** Base plan user accesses Pro recipes because limit is only enforced client-side.

**Why it happens:** Client-side filtering is trivially bypassed (network tab, local state manipulation, removing the filter).

**How to avoid:** Apply `.limit(100).eq("added_by", "seed")` in `fetchRecipes()` at the Supabase query level, conditioned on the server-verified `tier`. The server always knows the tier from the `subscriptions` table before the query runs.

**Warning signs:** No server-side enforcement means any browser devtools user can access full recipe catalog.

### Pitfall 6: Stripe Dashboard Portal Not Configured for Test vs Live Mode

**What goes wrong:** Customer Portal works in test mode but 404s in production.

**Why it happens:** Stripe requires Portal configuration separately in both test mode and live mode. They are completely independent.

**How to avoid:** After configuring in test mode, remember to also configure in Stripe Dashboard → Billing → Customer Portal in live mode. Enable "Switch plans", set allowed plans, configure cancellation behavior.

---

## Code Examples

### Webhook Events: Minimum Required Set

```typescript
// Source: https://docs.stripe.com/billing/subscriptions/webhooks
const HANDLED_EVENTS = [
  "customer.subscription.created",   // New subscription — provision access
  "customer.subscription.updated",   // Plan change, trial→active, payment failure
  "customer.subscription.deleted",   // Canceled — revoke access
  "customer.subscription.trial_will_end", // 3 days before trial ends — notify user
  "invoice.paid",                    // Successful payment — confirm access
  "invoice.payment_failed",          // Failed payment — notify, collect new card
] as const;
```

### Supabase Migration: Subscription Tables

```sql
-- 006_subscriptions.sql

-- customers: private mapping of user_id → stripe_customer_id
CREATE TABLE customers (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
-- No user-facing policies — service role only

-- subscriptions: synced from Stripe webhooks
CREATE TABLE subscriptions (
  id TEXT PRIMARY KEY,                     -- Stripe subscription ID (sub_xxx)
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL,                    -- trialing | active | canceled | past_due | paused
  plan_tier TEXT,                          -- base | pro | null
  price_id TEXT,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
-- Users can read their own subscription (for UI display)
CREATE POLICY "Users read own subscription" ON subscriptions
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);
-- Only service role writes (webhook handler)

CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
```

### Feature Gating: Rigenera Button (Piano Base Limits)

```typescript
// In Server Component or Server Action
const { tier, isTrialing } = await getSubscription(userId);

// Piano Base limits
const isBase = tier === "base";
const canRigenera = !isBase || dailyRegenerationsUsed < 2;
const canRegenerateToday = !isBase || regenerableDaysThisWeek < 3;
```

### Environment Variables Required

```bash
# .env.local
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...          # From `stripe listen` (dev) or Dashboard (prod)
STRIPE_PRICE_ID_BASE=price_...           # Piano Base €4.99/mese
STRIPE_PRICE_ID_PRO=price_...            # Piano Pro €7.99/mese
NEXT_PUBLIC_SITE_URL=http://localhost:3000  # https://yourapp.vercel.app in prod
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Pages Router `bodyParser: false` + `buffer(req)` | App Router `await request.text()` | Next.js App Router (13+) | Simpler, no config export needed |
| Storing customer_id in user_metadata | Separate `customers` table | Best practice evolution | user_metadata is user-writable; table is service-role only |
| API routes for Server Actions | `"use server"` functions with `redirect()` | Next.js 13.4+ | No explicit API route needed for checkout/portal sessions |
| Polling Stripe API for subscription status | Webhooks → local database | Always | Single source of truth, no rate limits |
| Relay subscription status via JWT claims | Server-side DB query per request | Supabase RLS maturity | JWT is stale; DB query is always current |

**Deprecated/outdated:**
- `bodyParser: false` config: Only for Pages Router. Do not use in App Router.
- `stripe.webhooks.constructEvent(Buffer.from(body), sig, secret)`: Pages Router pattern. Use `string` body directly from `request.text()` in App Router.

---

## Piano Base Limits: Implementation Strategy

The Piano Base has three constraints that require tracking:

| Limit | Storage Location | Enforcement Point |
|-------|-----------------|-------------------|
| max 2 rigenerazioni/giorno | `weekly_plan.rigenera_count_today` + `rigenera_date` columns, OR existing `weekly_plan` JSONB | Before calling `regenerateSingleMeal()` in Server Action |
| max 3 giorni rigenerabili/settimana | `weekly_plan.rigenera_days_this_week` Set (could be JSONB column) | Before `regenerateSingleMeal()` |
| max 100 ricette (no AI) | No extra storage — enforced in `fetchRecipes()` query | At recipe fetch time |

**Simplest approach for regeneration limits:** Add two columns to `weekly_plan`:
- `rigenera_log JSONB DEFAULT '[]'` — array of `{ day: string, timestamp: string }` entries
- Query this in the Server Action before allowing regeneration; derive count from entries matching today's date and unique days this week.

**Alternatively:** Keep it stateless — since `weekly_plan` already stores the plan state, count how many days have had manual_overrides applied this week (proxy for "days regenerated"). This requires no new columns but is less precise.

**Recommendation:** Add `rigenera_log` column to `weekly_plan` in migration 006 or a separate 007 migration. Append on each successful regeneration. Server Action reads and validates before proceeding.

---

## Open Questions

1. **Trial behavior decision: cancel or pause when trial ends without card?**
   - What we know: Stripe supports `cancel` (subscription deleted immediately) or `pause` (subscription paused, user can reactivate). `cancel` is simpler; `pause` allows easier recovery.
   - What's unclear: Whether to offer a "reactivation" flow for canceled trial users who later want to pay.
   - Recommendation: Use `cancel` for simplicity. Show a clear in-app message 3 days before trial ends. If user re-subscribes after cancel, Stripe creates a new subscription — which is fine.

2. **Piano Base people limit (solo 1 persona): how to enforce?**
   - What we know: `Preferences.people` controls household size (number of people). Piano Base restricts to 1.
   - What's unclear: Whether to hard-cap the `people` value in the preferences form for Base users, or enforce it in `buildPlan()`.
   - Recommendation: Cap in the ProfileDrawer UI (disable the people stepper > 1 for Base users) AND clamp in `usePlanEngine` as a guard. This is UX enforcement, not security-critical, so UI-only is acceptable.

3. **Does existing `fetchRecipes()` need Supabase auth context or service role?**
   - What we know: Current `fetchRecipes()` uses the anon key (public read policy on `recipes`). The plan tier check will happen server-side before calling `fetchRecipes()`.
   - What's unclear: Whether the tier-aware `fetchRecipes()` should accept `tier` as a parameter or read it internally.
   - Recommendation: Pass `tier` as a parameter for testability and explicit data flow (consistent with existing prop-passing pattern in this codebase).

4. **One `subscriptions` row per user or multiple?**
   - What we know: A user could in theory have multiple historical subscriptions (e.g., cancel Base, re-subscribe Pro).
   - What's unclear: Whether to keep all rows or upsert on `id` (Stripe subscription ID).
   - Recommendation: Upsert on Stripe subscription `id` (the primary key). Query for the most recent `active` or `trialing` row to determine current tier. Historical rows remain for audit.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.0 |
| Config file | `vitest.config.ts` (node environment, globals: true) |
| Quick run command | `npm test` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SUB-01 | `getSubscription()` returns `free` when no subscription row | unit | `npm test -- subscriptions` | ❌ Wave 0 |
| SUB-02 | `getSubscription()` returns `pro`+`isTrialing:true` during trial | unit | `npm test -- subscriptions` | ❌ Wave 0 |
| SUB-03 | `fetchRecipes()` applies `.limit(100)` for Base tier | unit | `npm test -- fetchRecipes` | ❌ Wave 0 |
| SUB-04 | `fetchRecipes()` returns no AI recipes for Base tier | unit | `npm test -- fetchRecipes` | ❌ Wave 0 |
| SUB-05 | Webhook handler rejects invalid signature with 400 | unit | `npm test -- webhook` | ❌ Wave 0 |
| SUB-06 | Piano Base rigenera limit: 3rd click same day rejected | unit | `npm test -- regenerationLimits` | ❌ Wave 0 |
| SUB-07 | Pricing page renders all three plans | smoke | manual | N/A |
| SUB-08 | Full checkout flow (trial) completes on Stripe test mode | e2e | manual (Stripe test card) | N/A |

### Sampling Rate

- **Per task commit:** `npm test` (existing suite must stay green)
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green + manual Stripe test mode checkout verification before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/lib/__tests__/subscriptions.test.ts` — covers SUB-01, SUB-02 (mock Supabase)
- [ ] `src/lib/__tests__/fetchRecipes.test.ts` — covers SUB-03, SUB-04 (mock Supabase query builder)
- [ ] `src/app/api/webhooks/stripe/__tests__/route.test.ts` — covers SUB-05 (mock `stripe.webhooks.constructEvent`)
- [ ] `src/lib/__tests__/regenerationLimits.test.ts` — covers SUB-06

---

## Sources

### Primary (HIGH confidence)
- [Stripe Trials Documentation](https://docs.stripe.com/billing/subscriptions/trials) — trial_period_days, payment_method_collection, end behavior
- [Stripe Webhook Events Documentation](https://docs.stripe.com/billing/subscriptions/webhooks) — minimum required events
- [Stripe Subscription Documentation](https://docs.stripe.com/subscriptions) — subscription status lifecycle
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security) — RLS pattern for subscription gating
- [Supabase Admin API](https://supabase.com/docs/reference/javascript/auth-admin-updateuserbyid) — app_metadata update pattern
- Verified via `npm view stripe version` → 20.4.1; `npm view @stripe/stripe-js version` → 8.11.0

### Secondary (MEDIUM confidence)
- [Stripe + Next.js 15 Complete Guide (Pedro Alonso)](https://www.pedroalonso.net/blog/stripe-nextjs-complete-guide-2025/) — server action patterns for checkout and portal
- [Stripe Subscription Lifecycle in Next.js (DEV, 2026)](https://dev.to/thekarlesi/stripe-subscription-lifecycle-in-nextjs-the-complete-developer-guide-2026-4l9d) — webhook handler lifecycle
- [Next.js Supabase Stripe Subscriptions Integration (DEV)](https://dev.to/alexzrlu/nextjs-supabase-stripe-subscriptions-integration-818) — database schema: customers + subscriptions tables
- [Stripe Customer Portal Integration](https://docs.stripe.com/customer-management/integrate-customer-portal) — portal session creation
- [Next.js App Router + Stripe Webhook (Vercel discussion)](https://github.com/vercel/next.js/discussions/48885) — `request.text()` pattern confirmed
- [Stripe Configure Free Trials](https://docs.stripe.com/payments/checkout/free-trials) — `payment_method_collection: 'if_required'`

### Tertiary (LOW confidence)
- [Vercel nextjs-subscription-payments starter](https://github.com/vercel/nextjs-subscription-payments) — general schema pattern (schema.sql not directly read)
- Community guidance on Piano Base rigenera limit tracking (no authoritative source — see Open Questions)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified with `npm view`; stripe 20.4.1, @stripe/stripe-js 8.11.0
- Architecture: HIGH — based on official Stripe docs + Next.js App Router docs + multiple verified guides
- Webhook handler: HIGH — `request.text()` confirmed by multiple sources including Vercel's own GitHub discussions
- Pitfalls: HIGH — cross-referenced from multiple community sources and official docs
- Piano Base rigenera limit tracking: MEDIUM — pattern is clear, exact column design is a discretionary call

**Research date:** 2026-03-24
**Valid until:** 2026-04-24 (Stripe API and Next.js stable; @stripe/stripe-js releases frequently but changes are non-breaking)

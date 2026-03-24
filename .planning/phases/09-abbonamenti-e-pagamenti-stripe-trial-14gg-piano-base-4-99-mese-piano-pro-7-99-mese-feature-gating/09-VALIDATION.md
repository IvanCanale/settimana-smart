---
phase: 9
slug: 09-abbonamenti-e-pagamenti
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-03-24
---

# Phase 9 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.0 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 09-00-01 | 00 | 0 | SUB-01, SUB-02, SUB-03, SUB-04 | stub | `npm test` | ❌ W0 | ⬜ pending |
| 09-00-02 | 00 | 0 | SUB-05, SUB-06 | stub | `npm test` | ❌ W0 | ⬜ pending |
| 09-01-01 | 01 | 1 | SUB-01, SUB-05 | unit | `grep -q "SubscriptionTier" src/types/index.ts && grep -q "CREATE TABLE subscriptions" supabase/migrations/006_subscriptions.sql` | ✅ (grep) | ⬜ pending |
| 09-01-02 | 01 | 1 | SUB-01, SUB-02, SUB-06 | unit | `npm test -- subscriptions` | ❌ W0 → `src/lib/__tests__/subscriptions.test.ts` | ⬜ pending |
| 09-02-01 | 02 | 2 | SUB-05 | unit | `npm test -- webhook` | ❌ W0 → `src/app/api/webhooks/stripe/__tests__/route.test.ts` | ⬜ pending |
| 09-02-02 | 02 | 2 | SUB-04, SUB-07 | unit | `grep -q "trial_period_days: 14" src/actions/stripeActions.ts` | ✅ (grep) | ⬜ pending |
| 09-03-01 | 03 | 2 | SUB-03, SUB-04 | unit | `npm test -- fetchRecipes` | ❌ W0 → `src/lib/__tests__/fetchRecipes.test.ts` | ⬜ pending |
| 09-03-02 | 03 | 2 | SUB-06 | unit | `npm test -- regenerationLimits` | ❌ W0 → `src/lib/__tests__/regenerationLimits.test.ts` | ⬜ pending |
| 09-04-01 | 04 | 3 | SUB-07, SUB-01, SUB-04 | smoke | `grep -q "Piano Base" src/app/abbonamento/PricingCards.tsx` | ✅ (grep) | ⬜ pending |
| 09-04-02 | 04 | 3 | SUB-07 | smoke | `grep -q "createPortalSession" src/components/ProfileDrawer.tsx` | ✅ (grep) | ⬜ pending |
| 09-05-01 | 05 | 4 | SUB-02, SUB-06 | integration | `grep -q "subscription.tier" src/app/page.tsx && grep -q "canRegenerate" src/components/WeekTab.tsx` | ✅ (grep) | ⬜ pending |
| 09-05-03 | 05 | 4 | SUB-07, SUB-04 | manual | manual Stripe test mode checkout | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/__tests__/subscriptions.test.ts` — stubs for SUB-01, SUB-02 (mock Supabase)
- [ ] `src/lib/__tests__/fetchRecipes.test.ts` — stubs for SUB-03, SUB-04 (mock Supabase query builder)
- [ ] `src/app/api/webhooks/stripe/__tests__/route.test.ts` — stubs for SUB-05 (mock `stripe.webhooks.constructEvent`)
- [ ] `src/lib/__tests__/regenerationLimits.test.ts` — stubs for SUB-06

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Pricing page renders three plans with correct Italian text | SUB-07 | Visual/layout verification | Visit `/abbonamento`, confirm Free trial / Base EUR 4,99 / Pro EUR 7,99 cards render correctly |
| Full checkout flow completes on Stripe test mode | SUB-08 | Requires Stripe test mode + test card | 1. Click "Abbonati al Piano Pro" 2. Use card 4242424242424242 3. Confirm redirect to success page 4. Check subscription in Supabase |
| ProfileDrawer shows subscription tier and portal button | SUB-07 | Visual/interactive | Open ProfileDrawer, verify plan badge and "Gestisci abbonamento" button appear |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

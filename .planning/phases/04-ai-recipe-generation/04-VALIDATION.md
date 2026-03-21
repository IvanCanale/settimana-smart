---
phase: 4
slug: ai-recipe-generation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-21
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.0 |
| **Config file** | `vitest.config.ts` (project root) |
| **Quick run command** | `vitest run src/lib/planEngine.test.ts` |
| **Full suite command** | `vitest run` |
| **Estimated runtime** | ~8 seconds |

---

## Sampling Rate

- **After every task commit:** Run `vitest run src/lib/planEngine.test.ts` (allergen regression — fast, 54 tests)
- **After every plan wave:** Run `vitest run` (full suite)
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~8 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | RECIPES-02, RECIPES-03 | unit | `vitest run src/lib/recipeSchema.test.ts` | ❌ Wave 0 | ⬜ pending |
| 04-01-02 | 01 | 1 | RECIPES-01, RECIPES-03 | unit | `vitest run src/lib/supabase.test.ts` | ❌ Wave 0 | ⬜ pending |
| 04-01-03 | 01 | 1 | RECIPES-01 | unit | `vitest run src/lib/catalogJob.test.ts` | ❌ Wave 0 | ⬜ pending |
| 04-02-01 | 02 | 2 | RECIPES-04 | unit | `vitest run src/lib/planEngine.test.ts` | ✅ existing | ⬜ pending |
| 04-02-02 | 02 | 2 | RECIPES-01 | integration | `vitest run src/hooks/usePlanEngine.test.ts` | ❌ Wave 0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/recipeSchema.test.ts` — Zod schema unit tests for RECIPES-02, RECIPES-03
- [ ] `src/lib/supabase.test.ts` — `fetchRecipes()` and `rowToRecipe()` tests for RECIPES-01, RECIPES-03
- [ ] `src/lib/catalogJob.test.ts` — catalog job logic unit tests (mocked OpenAI/web search) for RECIPES-01
- [ ] `src/hooks/usePlanEngine.test.ts` — async recipe fetch integration test for RECIPES-01

*No framework install needed — Vitest 4.1.0 already configured.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Notification bell opens drawer | UX (CONTEXT.md) | Browser interaction | Click 🔔 in header — drawer opens, shows "N nuove ricette" |
| New Recipes page loads correctly | UX (CONTEXT.md) | Browser rendering | Click notification → recipe discovery page shows new recipes from last 7 days |
| Wishlist persists to Supabase | UX (CONTEXT.md) | Requires live Supabase | Add recipe to wishlist → refresh → recipe still wishlisted |
| buildPlan() prioritizes wishlisted recipes | RECIPES-01 | Requires live data | Wishlist a recipe → generate plan → recipe appears in plan |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

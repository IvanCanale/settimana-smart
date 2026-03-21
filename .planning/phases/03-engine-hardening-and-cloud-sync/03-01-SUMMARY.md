---
phase: 03-engine-hardening-and-cloud-sync
plan: 01
subsystem: plan-engine
tags: [engine, allergen, protein-variety, shopping, tdd]
dependency_graph:
  requires: []
  provides: [validateAllergenSafety, recipeContainsAllergen, allergen-retry-loop, shared-ingredient-metric]
  affects: [src/lib/planEngine.ts, src/hooks/usePlanEngine.ts, src/components/ShoppingTab.tsx]
tech_stack:
  added: []
  patterns: [module-level-export, tdd-red-green, useMemo-retry-loop, conditional-badge-render]
key_files:
  created: []
  modified:
    - src/lib/planEngine.ts
    - src/lib/planEngine.test.ts
    - src/hooks/usePlanEngine.ts
    - src/components/ShoppingTab.tsx
decisions:
  - "ALLERGEN_INGREDIENT_MAP moved to module scope (not exported) — only recipeContainsAllergen and validateAllergenSafety exported"
  - "Hard protein-category filter added in both primary pickRecipe filter and relaxed fallback — soft penalty in scoreCandidate retained for scoring bias"
  - "Allergen retry loop in usePlanEngine: skip retry entirely when exclusions is empty (fast path), retry up to 3 times with seed+1 on failure"
metrics:
  duration: 3 min
  completed_date: "2026-03-21"
  tasks_completed: 2
  files_modified: 4
---

# Phase 03 Plan 01: Engine Hardening (Allergen Safety + Protein Variety) Summary

Hard allergen validation exported from planEngine with post-generation retry loop in usePlanEngine, protein categories hard-capped in pickRecipe (not just scored), and reused-ingredient count surfaced in ShoppingTab badge.

## Tasks Completed

| # | Name | Commit | Key Files |
|---|------|--------|-----------|
| 1 | Hard protein-category filter + allergen validation export + tests | 2cd646e | src/lib/planEngine.ts, src/lib/planEngine.test.ts |
| 2 | Allergen retry loop in usePlanEngine + shared ingredient metric in ShoppingTab | 31895a7 | src/hooks/usePlanEngine.ts, src/components/ShoppingTab.tsx |

## What Was Built

### ENGINE-01: Allergen Safety Validation

- `ALLERGEN_INGREDIENT_MAP` promoted to module scope (private)
- `recipeContainsAllergen(recipe, allergen)` exported at module level
- `validateAllergenSafety(plan, exclusions)` new exported function — checks all meals in a PlanResult against exclusions list
- `usePlanEngine.ts` basePlan useMemo now wraps buildPlan with a retry loop: if exclusions present, attempts up to 3 seeds (seed, seed+1, seed+2), validates each with `validateAllergenSafety`, returns first safe plan. If all 3 fail, returns last attempt with a user-visible alert string.

### ENGINE-02: Hard Protein Variety Cap

- `pickRecipe()` primary `.filter()` now includes hard filter: `if ((categoryCounts[category] || 0) >= (maxPerCategory[category] ?? 99)) return false`
- Same hard filter added in the `relaxed` fallback path
- Previously this was soft-only via `score -= 80` in `scoreCandidate` — that soft penalty is retained for scoring bias below the cap

### ENGINE-03: Shared Ingredient Metric

- `ShoppingTab.tsx` now shows a pill badge between SectionHeader and shopping list when `generated.stats.reusedIngredients > 0`
- Badge shows recycle symbol + count + "ingredienti condivisi tra i pasti"
- Styled: `var(--olive)` text, `var(--cream)` background, 1px border, borderRadius 100

## Decisions Made

1. **ALLERGEN_INGREDIENT_MAP scope**: Moved to module scope but NOT exported — only the functions that use it are exported. Keeps the map implementation-private.
2. **Hard filter placement**: Added to both primary filter AND relaxed fallback to prevent the fallback from bypassing the protein cap entirely.
3. **Retry fast path**: When `exclusions.length === 0`, the retry loop is bypassed entirely — no overhead for users without exclusions.

## Test Coverage

- 54 tests pass (50 existing + 4 new)
- `describe('protein variety ENGINE-02')`: 4 tests (seeds 1, 42, 99, dinner-only)
- `describe('allergen gate ENGINE-01')`: 4 tests (validateAllergenSafety safe plan, unsafe plan, recipeContainsAllergen true, false)

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

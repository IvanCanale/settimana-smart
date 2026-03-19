# Testing Patterns

**Analysis Date:** 2026-03-19

## Test Framework

**Runner:** None configured.

No test framework is installed or configured. There are no `jest.config.*`, `vitest.config.*`, or equivalent files present. No test packages appear in `package.json` `dependencies` or `devDependencies`.

**Assertion Library:** None.

**Run Commands:**
```bash
# No test commands are defined in package.json scripts
# Available scripts:
npm run dev      # Start Next.js dev server
npm run build    # Production build
npm start        # Start production server
npm run lint     # Run ESLint (next lint)
```

## Test File Organization

**Location:** No test files exist in the codebase.

A search for `*.test.*` and `*.spec.*` files returned no matches.

**Naming:** Not applicable — no tests exist.

**Structure:** Not applicable.

## Test Structure

No test suites exist. The codebase has zero automated test coverage.

## Mocking

**Framework:** None.

No mocking infrastructure exists.

## Fixtures and Factories

**Test Data:** Not applicable.

The `src/data/recipes.ts` file contains a large static recipe library (`RECIPE_LIBRARY`) using factory helper functions. This could serve as test fixture data if tests were added:

```typescript
// src/data/recipes.ts — factory pattern already in place
const ing = (name: string, qty: number, unit: string, category: string): RecipeIngredient =>
  ({ name, qty, unit, category });

const r = (
  id: string, title: string, diet: Diet[], tags: string[], time: number,
  difficulty: Skill, servings: number, ingredients: RecipeIngredient[], steps: string[],
): Recipe => ({ id, title, diet, tags, time, difficulty, servings, ingredients, steps });
```

**Location:** No fixture directory exists.

## Coverage

**Requirements:** None enforced.

**View Coverage:** Not possible — no test runner configured.

## Test Types

**Unit Tests:** Not present.

**Integration Tests:** Not present.

**E2E Tests:** Not present.

## Sanity Check Function

The codebase contains one manual sanity check function that could be adapted as a test:

```typescript
// src/lib/planEngine.ts — line 665
export function runSanityChecks() {
  const strictPlan = buildPlan(
    {
      people: 2, diet: "mediterranea", maxTime: 20, budget: 60,
      skill: "beginner", mealsPerDay: "both", leftoversAllowed: true,
      exclusionsText: "", exclusions: [], sundaySpecial: false,
      sundayDinnerLeftovers: false, skippedMeals: [], coreIngredients: []
    },
    [{ name: "pasta", quantity: 500, unit: "g" }], 1,
  );
  if (!strictPlan.days.length) throw new Error("planner failed");
}
```

This function is exported but not called anywhere in the application or in any test runner. It validates that `buildPlan` returns a non-empty result for a basic configuration.

## Recommendations for Adding Tests

If tests are added in the future, the following areas in `src/lib/planEngine.ts` are good candidates for unit testing (pure functions with deterministic output):

- `normalize(text: string)` — string normalization
- `seededShuffle<T>(items, seed)` — deterministic shuffle
- `scaleQty(qty, recipeServings, targetPeople)` — quantity scaling
- `getRecipeCategory(recipe)` — category classification
- `aggregateShopping(meals, pantryItems, people)` — shopping list aggregation
- `computeStats(meals, shopping)` — plan statistics
- `buildPlan(preferences, pantryItems, seed)` — full plan generation (integration-level)

**Suggested framework:** Vitest is the natural choice given the Next.js/TypeScript stack.

```bash
# To add Vitest:
npm install -D vitest @vitejs/plugin-react
```

**Suggested test file location:** Co-locate with source files:
- `src/lib/planEngine.test.ts` for engine logic
- `src/lib/supabase.test.ts` for data layer (with mocking)

---

*Testing analysis: 2026-03-19*

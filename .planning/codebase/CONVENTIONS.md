# Coding Conventions

**Analysis Date:** 2026-03-19

## Naming Patterns

**Files:**
- React components: PascalCase `.tsx` — `AuthProvider.tsx`, `page.tsx`, `layout.tsx`
- UI primitives: kebab-case `.tsx` — `button.tsx`, `card.tsx`, `checkbox.tsx`
- Logic/utility modules: camelCase `.ts` — `planEngine.ts`, `supabase.ts`, `utils.ts`
- Data files: camelCase `.ts` — `recipes.ts`
- Type definitions: `index.ts` inside `src/types/`

**Functions:**
- Exported utility functions: camelCase — `buildPlan`, `aggregateShopping`, `computeStats`, `scaleQty`, `seededShuffle`, `normalize`, `getRecipeCategory`
- React components: PascalCase — `AuthProvider`, `AuthModalInline`, `SectionHeader`, `TagPill`, `TimeTag`, `SettimanaSmartMVP`
- Internal/private functions: camelCase — `scoreRecipe`, `scoreCandidate`, `pickRecipe`, `registerMeal`, `pantryMatches`, `roundPurchaseQuantity`, `estimateWaste`, `pickCoreIngredients`, `freshnessWeight`
- Event handlers: `handleX` convention — `handleEmail`

**Variables:**
- camelCase for all local vars and state — `pantryItems`, `manualOverrides`, `lastPickedId`, `usedIngredientCounts`
- SCREAMING_SNAKE_CASE for module-level constants — `DAYS`, `CATEGORY_ORDER`, `SKIP_OPTIONS`, `FREEZE_CANDIDATES`, `RECIPE_LIBRARY`
- CSS design token strings: `--terra`, `--cream`, `--olive`, `--sepia` (CSS custom properties in camelCase JS template literals)

**Types:**
- All exported types use PascalCase — `Recipe`, `DayPlan`, `Preferences`, `PlanResult`, `FreezeItem`, `ShoppingItem`
- Union string literal types for domain enumerations — `Diet = "mediterranea" | "onnivora" | "vegetariana" | "vegana"`, `Skill = "beginner" | "intermediate"`, `MealSlot = "lunch" | "dinner"`
- Type aliases preferred over interfaces for plain data shapes
- Compound types built with `&` intersection — `ShoppingItem = RecipeIngredient & { waste: number }`

## Code Style

**Formatting:**
- No Prettier config detected — formatting is manual/editor-default
- Trailing commas present throughout
- Single quotes for strings in most places, double quotes in JSX attributes and some module code
- Semicolons used consistently

**Linting:**
- ESLint configured via `eslint.config.mjs` using `eslint/config` v9 flat config format
- Extends `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`
- No custom rule overrides beyond the Next.js defaults

**TypeScript:**
- `strict: true` enabled in `tsconfig.json` — all code must pass strict checks
- `noEmit: true` — TypeScript used only for type-checking, not compilation
- `target: ES2017`, `module: esnext`, `moduleResolution: bundler`
- Path alias `@/*` maps to `./src/*` — use `@/components/...`, `@/lib/...`, `@/types`, `@/data/...`

## Import Organization

**Order observed in `src/app/page.tsx` and engine files:**
1. `"use client"` directive (first line, when needed)
2. React and core framework imports
3. Third-party library types (`@supabase/supabase-js`)
4. Internal UI component imports (`@/components/ui/...`)
5. Third-party icon imports (`lucide-react`)
6. Internal type imports (`@/types`) — use `import type` for type-only imports
7. Internal data imports (`@/data/recipes`)
8. Internal lib imports (`@/lib/planEngine`, `@/lib/AuthProvider`)

**Path Aliases:**
- `@/` resolves to `src/` — always use this alias, never relative paths like `../../`

**Type-only imports:**
- Use `import type { ... }` for types that are not used as values — enforced throughout the codebase

## Error Handling

**Pattern:**
- `try/catch/finally` blocks for async operations — `finally { setLoading(false); }`
- Catch typed as `unknown`, narrowed with `instanceof Error` check:
  ```typescript
  catch (err: unknown) {
    setError(err instanceof Error ? err.message : "Errore. Riprova.");
  }
  ```
- Empty `catch {}` blocks used in localStorage migration operations where failures are silent (acceptable for non-critical paths)
- Errors surfaced to UI via local state (`setError(...)`) — no global error boundary detected
- Guard clauses for missing configuration — `if (!url || !key) return;` in `AuthProvider.tsx`
- Null coalescing used heavily for fallbacks — `prefRes.data?.data ?? {}`

**Async patterns:**
- `Promise.all` for parallel async operations — `loadUserData` in `src/lib/supabase.ts`
- `async/await` consistently — no raw `.then()` chains except for `client.auth.getSession().then(...)`

## Logging

**Framework:** None — no logging library installed.

**Patterns:**
- No `console.log`, `console.error`, or `console.warn` calls found in source files
- Errors are silently swallowed in `try/catch` blocks for localStorage ops (migration code)
- User-facing status surfaced through React state (`syncStatus`, `lastMessage`, `error` state vars)

## Comments

**Style:**
- Italian-language inline comments for business logic — `// Fuzzy match per la dispensa: gestisce varianti di nome`
- Section header comments using ASCII box style — `// ── FREEZE LOGIC ──────────────────────────────────────────────────────────────`
- Helper group markers — `// ─── HELPERS ─────────────────────────────────────────────────────────────────`
- Inline explanations for scoring magic numbers — `// lieve preferenza inizio settimana`
- Disabled-feature stubs documented inline — `// sync disabilitato`
- No JSDoc/TSDoc annotations

**When to Comment:**
- Complex scoring/algorithm logic always gets inline explanation
- Business rules (diet constraints, freshness weights, freeze logic) are commented in Italian
- Disabled or stubbed code is commented with reason

## Function Design

**Size:** Functions range from single-line helpers (`normalize`, `scaleQty`, `cn`) to very large composite functions (`buildPlan` is ~400 lines, `scoreCandidate` is ~80 lines). Large functions are not decomposed — this is a current pattern, not a recommendation.

**Parameters:**
- Plain positional parameters for simple functions
- Destructured object parameter for complex config — `scoreCandidate(recipeItem, { special, preferNoMainCarb, avoidCarb, sameDayLunch, slot, dayIndex })`
- Default parameter values used in destructuring — `{ special = false, excludeIds = new Set<string>(), ... } = {}`

**Return Values:**
- Explicit early returns with guard clauses
- Functions return typed values matching declared return types
- Null returned (not undefined) for absent optional values — `Recipe | null`

## Module Design

**Exports:**
- Named exports used exclusively — no default exports except for Next.js pages/layouts (`export default function RootLayout`, `export default function SettimanaSmartMVP`)
- UI components export both the component and variants — `export { Button, buttonVariants }`
- Context hook exported alongside provider — `export function useAuth()`

**Barrel Files:**
- Not used — `src/types/index.ts` is the type definition file (not a re-export barrel)
- Each module is imported directly by file path

**Data Pattern:**
- Recipe data defined with factory helpers to reduce verbosity:
  ```typescript
  const ing = (name, qty, unit, category): RecipeIngredient => ({ name, qty, unit, category });
  const r = (id, title, diet, tags, time, difficulty, servings, ingredients, steps): Recipe => ({ ... });
  ```

## CSS / Styling Conventions

**Approach:** Mixed — inline styles via template literal `designTokens` string injected as `<style>` tag in `page.tsx`, plus Tailwind CSS utility classes for UI primitives.

**CSS Custom Properties:** Defined in `:root` block — `--terra`, `--cream`, `--olive`, `--sepia`, `--border`, etc.

**Semantic class names:** Used for reusable UI patterns — `.card-warm`, `.btn-terra`, `.btn-outline-terra`, `.tag-pill`, `.recipe-card`, `.day-card`, `.meal-slot`

**Tailwind:** Used in `src/components/ui/` components via the `cn()` helper from `src/lib/utils.ts`. Uses CVA (class-variance-authority) for variant composition in `button.tsx`.

---

*Convention analysis: 2026-03-19*

# Codebase Concerns

**Analysis Date:** 2026-03-19

## Tech Debt

**Monolithic page component (1738 lines):**
- Issue: The entire application — UI, state, business logic, helpers, inline CSS — lives in a single file
- Files: `src/app/page.tsx`
- Impact: Every feature addition increases cognitive load; unrelated changes cause conflicts; impossible to test in isolation; hot-reload rebuilds the whole tree on any change
- Fix approach: Extract sub-components (PlannerTab, WeekTab, ShoppingTab, RecipesTab, ReminderTab) into `src/components/` and move business logic hooks (useLocalStorage, usePlanEngine, useLearning) into `src/hooks/`

**Inline CSS design system in JS string:**
- Issue: `designTokens` is a ~400-line CSS string injected via `<style>` inside the render function at lines 28-427 of `src/app/page.tsx`; this bypasses Tailwind's purge and duplicates token definitions that also exist in `src/app/globals.css`
- Files: `src/app/page.tsx` (lines 28–427), `src/app/globals.css`
- Impact: Two parallel CSS systems exist simultaneously (custom CSS string vs Tailwind/shadcn tokens in globals.css); changes to visual tokens must be made in two places; Tailwind classes from shadcn components (`src/components/ui/`) may conflict with the inline system
- Fix approach: Move the `designTokens` string into `src/app/globals.css` as proper CSS custom properties and utility classes; delete the `<style>` injection

**Cloud sync is entirely disabled but infrastructure exists:**
- Issue: Three `useEffect` hooks (lines 582-584), two dead functions (`_applyCloudData_disabled`, `_loadCloudData_disabled` at lines 545-547), and a no-op effect (line 552) are placeholder stubs — the Supabase auth is wired but no data actually syncs to the cloud
- Files: `src/app/page.tsx` (lines 545-584), `src/lib/supabase.ts`, `src/lib/AuthProvider.tsx`
- Impact: The "Accedi · Salva i tuoi dati" button is misleading — users log in expecting cloud persistence but nothing is saved; `syncStatus` UI indicator ("saving", "saved", "error") is always "idle" and never changes
- Fix approach: Implement `loadUserData` / `savePreferences` / `savePantry` / `saveWeeklyPlan` calls from `src/lib/supabase.ts` inside the disabled effects, or remove the auth UI entirely until the feature is complete

**Hardcoded alias lists in planEngine.ts (non-normalized data):**
- Issue: `pantryMatches()` contains a manually-maintained `aliases` record (~70 entries), `FREEZE_CANDIDATES`, `MEAT_INGREDIENTS`, `FISH_INGREDIENTS`, `POULTRY_INGREDIENTS`, and `freshnessWeight` all use hardcoded ingredient name strings that must match exact values in `src/data/recipes.ts`
- Files: `src/lib/planEngine.ts` (lines 24-97, 251-390)
- Impact: Adding a new ingredient to `recipes.ts` requires manually updating up to six separate lists in `planEngine.ts`; a typo in any list causes silent mismatch — ingredient won't be pantry-matched or freeze-scheduled without any error
- Fix approach: Add a structured `meta` field to the `Recipe`/`RecipeIngredient` types (e.g. `perishability`, `proteinType`) and derive all engine logic from it at runtime instead of hardcoded string arrays

**Freeze logic duplicated in two places:**
- Issue: The freeze computation block in `buildPlan()` (lines 622-660 of `src/lib/planEngine.ts`) is copied verbatim inside the `generated` useMemo in `src/app/page.tsx` (lines 624-651) as `computeFreeze`
- Files: `src/lib/planEngine.ts` (lines 622-660), `src/app/page.tsx` (lines 624-651)
- Impact: Bug fixes to freeze logic must be applied in both locations; they have already drifted slightly in variable naming
- Fix approach: Export a `computeFreezeItems(days, preferences)` function from `src/lib/planEngine.ts` and call it from both places

**`budget` preference is collected but never used:**
- Issue: `Preferences.budget` is stored, displayed in the slider UI, and persisted to localStorage, but `buildPlan()` in `src/lib/planEngine.ts` never reads it — not even to filter recipes or estimate costs
- Files: `src/types/index.ts` (line 33), `src/lib/planEngine.ts`, `src/app/page.tsx` (line 1289)
- Impact: Users believe budget constrains meal selection; it does not. The "Risparmio" stat shown in the header (`estimatedSavings = reusedIngredients * 2.5`) is a fabricated estimate unrelated to actual budget
- Fix approach: Either remove the budget slider from the UI or implement budget-aware recipe filtering/scoring in `planEngine.ts`

**`getRecipeCategory` uses very long inline string arrays:**
- Issue: `getRecipeCategory()` in `src/lib/planEngine.ts` (lines 116-127) uses single-line if-statements containing 15-25 hardcoded ingredient name strings each, making the function ~12 lines but nearly unreadable and fragile
- Files: `src/lib/planEngine.ts` (lines 116-127)
- Impact: Adding a new pasta type or protein requires editing these long inline arrays; easy to introduce off-by-one or miss a variant
- Fix approach: Move category detection to a lookup map keyed by ingredient name or a `category` field on the recipe itself

## Known Bugs

**`window.alert()` used for freeze reminders:**
- Symptoms: When a freeze reminder fires, `window.alert(msg)` blocks the entire UI thread (lines 899 in `src/app/page.tsx`)
- Files: `src/app/page.tsx` (lines 895-900)
- Trigger: Freeze reminder timer fires (triggered by `confirmWeek()` with future scheduled setTimeout)
- Workaround: Close browser tab before reminder fires

**Day-of-week calculation bug in freeze reminder scheduling:**
- Symptoms: `scheduleFreezeReminders()` computes day offset using `item.useOnDayIndex` (0=Mon) but JavaScript's `Date.getDay()` uses 0=Sunday; the conversion at line 887 (`reminderDay === 0 ? 1 : reminderDay === 6 ? 0 : reminderDay + 1`) handles only two edge cases and produces wrong target days for Wednesday/Thursday
- Files: `src/app/page.tsx` (lines 882-905)
- Trigger: User presses "Conferma settimana" with freeze items scheduled mid-week
- Workaround: None; reminders may fire on wrong day

**Duplicate recipe possible after manual override dedup:**
- Symptoms: In the `generated` useMemo (lines 609-619 of `src/app/page.tsx`), when a dinner recipe collides with a used ID, it picks a replacement via `seededShuffle(RECIPE_LIBRARY.filter(...), seed + idx + 999)[0]`; the replacement is not scored against the learning system or pantry, and can produce a recipe already present on another day
- Files: `src/app/page.tsx` (lines 609-619)
- Trigger: User applies many manual overrides that create cascading ID collisions

**`framer-motion` is installed but never imported:**
- Issue: `framer-motion@^12.6.5` is listed in `package.json` dependencies but is not imported anywhere in `src/`
- Files: `package.json`
- Impact: Adds ~140KB+ to production bundle for no benefit

## Security Considerations

**No input validation on exclusions text:**
- Risk: `exclusionsText` is split by comma and used as substring match against ingredient names (`normalize(i.name).includes(ex)` at line 311 of `src/lib/planEngine.ts`); no sanitization prevents pathological inputs like an empty string matching every ingredient
- Files: `src/lib/planEngine.ts` (line 311), `src/app/page.tsx` (line 601)
- Current mitigation: `.filter(Boolean)` removes empty strings after split; only affects client-side filtering
- Recommendations: Add max-length validation to the exclusions text input; filter out single-character matches that would match too broadly

**localStorage data is trusted without schema validation:**
- Risk: All five localStorage keys (`ss_preferences_v1`, `ss_pantry_v1`, `ss_seed_v1`, `ss_manual_overrides_v1`, `ss_learning_v1`) are parsed with `JSON.parse()` and spread into state with no shape checking; a corrupted or tampered value would silently produce unexpected behavior
- Files: `src/app/page.tsx` (lines 514, 520, 573, 578)
- Current mitigation: `try/catch` blocks fall back to defaults on parse failure
- Recommendations: Add Zod schema validation on each parsed object before merging into state

**Supabase data functions use `unknown[]` / `Record<string, unknown>` types:**
- Risk: `savePreferences`, `savePantry`, and `loadUserData` in `src/lib/supabase.ts` accept and return untyped data; any client can store arbitrary JSON in these columns
- Files: `src/lib/supabase.ts` (lines 5-11, 28-44)
- Current mitigation: Cloud sync is currently disabled
- Recommendations: Replace loose types with the actual `Preferences`, `PantryItem[]`, etc. types and validate on load

**`migrateFromLocalStorage` silently swallows errors:**
- Risk: Empty `catch {}` blocks at lines 55-56 of `src/lib/supabase.ts` discard migration errors with no logging; a failed migration loses user data with no indication
- Files: `src/lib/supabase.ts` (lines 47-65)
- Current mitigation: Function is never called (cloud sync disabled)
- Recommendations: At minimum log errors; add user-facing feedback on migration failure

## Performance Bottlenecks

**`buildPlan` runs fully on every state change:**
- Problem: `buildPlan()` is called inside a `useMemo` that depends on `computedPrefs`, `pantryItems`, and `seed` — any preference change (including moving a slider) triggers a full re-plan across all 7 days including pantry fuzzy matching for every ingredient
- Files: `src/app/page.tsx` (line 603)
- Cause: The fuzzy matching loop in `scoreRecipe()` calls `Array.from(pantrySet).some(p => pantryMatches(p, ingr.name))` per ingredient per recipe candidate, which is O(pantry × ingredients × recipes) on every render
- Improvement path: Debounce preference changes before triggering re-plan; pre-compute a pantry match index at mount time

**`pantryMatches` iterates full pantry array per ingredient:**
- Problem: Inside `scoreRecipe()` (line 139 of `src/lib/planEngine.ts`), `Array.from(pantrySet).some(p => pantryMatches(...))` converts a Set to an array on each call; for 14 meals × 6 ingredients × pantry size this runs thousands of iterations
- Files: `src/lib/planEngine.ts` (lines 138-140)
- Cause: `pantrySet` is a Set of strings used for exact-match `has()` but fuzzy matching requires full iteration
- Improvement path: Pre-build a fuzzy match cache at the start of `buildPlan()` mapping ingredient keys to their pantry matches

**`src/data/recipes.ts` is 3979 lines loaded synchronously:**
- Problem: The entire recipe library (all 3979 lines) is a static import bundled into the main JavaScript chunk; it is evaluated synchronously at startup
- Files: `src/data/recipes.ts`
- Cause: Direct ES module import at top of `src/app/page.tsx` (line 21) and `src/lib/planEngine.ts` (line 2)
- Improvement path: Move to dynamic import or route-segment lazy loading; or convert to a JSON file for better tree-shaking

**Inline `<style>` tag re-injected on every render:**
- Problem: The `designTokens` string constant is referenced in the JSX return of `SettimanaSmartMVP` meaning React will reconcile a large style block on every state update
- Files: `src/app/page.tsx` (lines 1023, 1050)
- Cause: `<style>{designTokens}</style>` inside render path
- Improvement path: Move to `src/app/globals.css` so it is emitted once at build time

## Fragile Areas

**Tutorial/onboarding state in `tutorialStepRef`:**
- Files: `src/app/page.tsx` (lines 595-596, 761-773)
- Why fragile: `tutorialStepRef` is kept in sync with `tutorialStep` state via a `useEffect`, then `tourAdvance()` reads `tutorialStepRef.current` to avoid stale closure issues; dual source of truth (state + ref) means any missed sync causes the tour to advance incorrectly
- Safe modification: Always update both `tutorialStepRef.current` and call `setTutorialStep()` together; never read `tutorialStep` (state) inside `tourAdvance`
- Test coverage: None

**`generated` useMemo depends on derived props from `computedPrefs`:**
- Files: `src/app/page.tsx` (lines 654)
- Why fragile: The dependency array for `generated` manually lists `computedPrefs.people`, `computedPrefs.diet`, `computedPrefs.maxTime`, `computedPrefs.exclusions` instead of `computedPrefs` itself; if a new field is added to `Preferences`, it won't trigger re-generation until the dependency array is updated manually
- Safe modification: Use `computedPrefs` as a single dependency; ensure `computedPrefs` is stable via proper `useMemo`
- Test coverage: None

**Seed-based regeneration is not idempotent across sessions:**
- Files: `src/app/page.tsx` (lines 522, 795), `src/lib/planEngine.ts` (lines 105-114)
- Why fragile: `seed` increments by 1 on each "Genera piano" click and is stored in localStorage; the same seed always produces the same plan, but the actual value is arbitrary and unbounded; after 4 billion increments, the LCG `seededShuffle` would overflow (though in practice `% 4294967296` prevents this); seed starting at 1 means the very first generated plan is always identical for all new users
- Safe modification: Initialize seed with `Date.now() % 10000` or a random value; this avoids all new users seeing the same plan
- Test coverage: `runSanityChecks()` exists in `src/lib/planEngine.ts` (line 665) but is exported and never called in production or tests

**`coniglio` appears in both POULTRY and MEAT lists:**
- Files: `src/lib/planEngine.ts` (lines 283, 302)
- Why fragile: `"coniglio"` and `"coniglio a pezzi"` appear in both `MEAT_INGREDIENTS` (line 283) and `POULTRY_INGREDIENTS` (line 302); when the rotation excludes poultry (seed % 3 === 2), coniglio is excluded; when it excludes meat (seed % 3 === 0), it is also excluded; coniglio recipes are never generated under two of three rotation phases
- Safe modification: Remove `"coniglio"` from one of the two lists based on intended classification
- Test coverage: None

## Scaling Limits

**Recipe library as a static TS file:**
- Current capacity: 3979 lines / ~100-150 recipes in a single module
- Limit: Adding recipes requires editing one enormous file; no pagination, search, or lazy-loading; the module parse time grows linearly
- Scaling path: Migrate to a JSON data file or Supabase table; fetch recipes on demand or at build time via static generation

**localStorage as only persistence:**
- Current capacity: localStorage is capped at ~5MB per origin; the current data footprint is small (< 50KB estimated) but the `learning` object grows unboundedly as users interact
- Limit: Heavy users accumulating thousands of regenerations could hit limits; data is silently lost if user clears browser storage
- Scaling path: Complete the Supabase integration already scaffolded in `src/lib/supabase.ts`

## Dependencies at Risk

**`framer-motion@^12.6.5` installed but unused:**
- Risk: Dead dependency adds bundle weight and a transitive dependency surface with no benefit
- Impact: ~140KB+ additional bundle; any security advisory in framer-motion still affects this project
- Migration plan: Remove from `package.json`; no code changes needed

**`radix-ui@^1.4.3` and `@radix-ui/react-slot` both listed:**
- Risk: `radix-ui` is a meta-package that re-exports all Radix primitives; `@radix-ui/react-slot` is also listed explicitly; this creates version ambiguity if the meta-package and individual package resolve different versions
- Files: `package.json` (lines 12-13)
- Impact: Potential duplicate Radix code in bundle
- Migration plan: Keep only `@radix-ui/react-slot` (and add other individual primitives as needed) or use only the `radix-ui` meta-package; do not mix both patterns

**`next@16.1.6` with `force-dynamic` on every route:**
- Risk: `export const dynamic = "force-dynamic"` in `src/app/layout.tsx` (line 1) disables static generation for the entire app; with Next.js 16 (Turbopack default), this means every page request hits the Node.js runtime even for fully static content
- Files: `src/app/layout.tsx` (line 1)
- Impact: No static HTML served; slower initial load; no CDN edge caching benefit
- Migration plan: Remove `force-dynamic` from `layout.tsx`; the app is client-only (`"use client"` in page.tsx) so it renders as a client component anyway and does not need forced dynamic rendering at the layout level

## Missing Critical Features

**No error boundary:**
- Problem: If `buildPlan()` or `aggregateShopping()` throws (e.g. malformed localStorage data passed as `PantryItem[]`), the entire app unmounts with no user feedback
- Blocks: Any production deployment; a single corrupted localStorage item would leave the user with a blank screen
- Files: `src/app/page.tsx`, `src/app/layout.tsx`

**No data export / import:**
- Problem: User data (preferences, pantry, learning history) exists only in localStorage with no way to back it up, transfer to another device, or restore after a browser reset
- Blocks: Mobile PWA use case where users frequently clear browser data

**No recipe search or filter in the Ricette tab:**
- Problem: With ~150 recipes in the library, the Ricette tab shows only the currently selected recipe with no way to browse, search, or filter; the only way to view a recipe is to have it appear in the generated plan
- Blocks: User ability to discover or request specific recipes

## Test Coverage Gaps

**Zero application test files:**
- What's not tested: All business logic (`buildPlan`, `aggregateShopping`, `computeStats`, `pantryMatches`, `scaleQty`, `getRecipeCategory`), all React components, all localStorage persistence, the freeze scheduling calculation
- Files: `src/lib/planEngine.ts`, `src/lib/supabase.ts`, `src/app/page.tsx`
- Risk: Regressions in the scoring algorithm, category classification, or pantry matching go undetected until user reports; the day-of-week freeze bug described above was not caught
- Priority: High — `runSanityChecks()` at line 665 of `src/lib/planEngine.ts` is the only validation and it is never invoked

**No E2E or integration tests:**
- What's not tested: Onboarding flow, tutorial completion, meal regeneration, shopping list deduplication against pantry, cloud auth modal
- Files: All of `src/app/page.tsx`
- Risk: UI interactions that cross component state (e.g. confirming week triggers freeze reminders AND learning update AND banner display) can break silently
- Priority: Medium

---

*Concerns audit: 2026-03-19*

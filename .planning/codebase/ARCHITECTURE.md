# Architecture

**Analysis Date:** 2026-03-19

## Pattern Overview

**Overall:** Single-Page Application (SPA) with server-side rendering shell

**Key Characteristics:**
- All application logic lives in a single "god component" in `src/app/page.tsx` (~1000+ lines)
- Pure client-side computation: the meal planning algorithm runs entirely in the browser, no API routes
- Dual persistence model: localStorage as primary store, Supabase as optional cloud sync (currently disabled in code)
- PWA-enabled with service worker, web manifest, and installability
- Stateless server: Next.js is used only as a framework shell; `force-dynamic` prevents any server-side caching

## Layers

**Type Layer:**
- Purpose: Shared domain model definitions
- Location: `src/types/index.ts`
- Contains: All TypeScript types used across the application (`Recipe`, `Preferences`, `PlanResult`, `DayPlan`, `ShoppingItem`, `FreezeItem`, `PreferenceLearning`, etc.)
- Depends on: Nothing
- Used by: All other layers

**Data Layer:**
- Purpose: Static recipe database
- Location: `src/data/recipes.ts`
- Contains: `RECIPE_LIBRARY` — a hardcoded array of `Recipe` objects using shorthand factory functions (`r()`, `ing()`)
- Depends on: `src/types/index.ts`
- Used by: `src/lib/planEngine.ts`, `src/app/page.tsx`

**Business Logic Layer:**
- Purpose: Meal planning algorithm, shopping aggregation, statistics
- Location: `src/lib/planEngine.ts`
- Contains: `buildPlan()`, `aggregateShopping()`, `computeStats()`, `seededShuffle()`, `scaleQty()`, `normalize()`, `getRecipeCategory()`, constants (`DAYS`, `CATEGORY_ORDER`, `SKIP_OPTIONS`, `FREEZE_CANDIDATES`)
- Depends on: `src/types/index.ts`, `src/data/recipes.ts`
- Used by: `src/app/page.tsx`

**Auth / Context Layer:**
- Purpose: Supabase client lifecycle and auth state distribution via React Context
- Location: `src/lib/AuthProvider.tsx`
- Contains: `AuthProvider` component, `AuthContext`, `useAuth()` hook
- Depends on: `@supabase/supabase-js`
- Used by: `src/app/layout.tsx` (wraps all children), `src/app/page.tsx` (via `useAuth()`)

**Database Utilities Layer:**
- Purpose: Supabase table read/write wrappers and localStorage migration helper
- Location: `src/lib/supabase.ts`
- Contains: `loadUserData()`, `savePreferences()`, `savePantry()`, `saveWeeklyPlan()`, `migrateFromLocalStorage()`
- Depends on: `@supabase/supabase-js`
- Used by: `src/app/page.tsx` (cloud sync, currently disabled via stub effects)

**UI Component Layer:**
- Purpose: Reusable, accessible UI primitives built on Radix UI
- Location: `src/components/ui/`
- Contains: `badge.tsx`, `button.tsx`, `card.tsx`, `checkbox.tsx`, `input.tsx`, `label.tsx`, `select.tsx`, `slider.tsx`, `tabs.tsx`, `textarea.tsx`
- Depends on: `@radix-ui/*`, `src/lib/utils.ts` (for `cn()`)
- Used by: `src/app/page.tsx`

**View Layer:**
- Purpose: Full application UI and all UI state management
- Location: `src/app/page.tsx`
- Contains: Main component `SettimanaSmartMVP`, inline helper components (`AuthModalInline`, `SectionHeader`, `TagPill`, `TimeTag`), all CSS design tokens as an injected `<style>` block
- Depends on: Every other layer
- Used by: Next.js routing (auto-rendered at `/`)

## Data Flow

**Plan Generation:**

1. User sets `Preferences` (diet, people, maxTime, etc.) via form controls in `SettimanaSmartMVP`
2. `computedPrefs` is derived via `useMemo` — parses exclusions text, normalizes core ingredients
3. `basePlan` is derived via `useMemo` by calling `buildPlan(computedPrefs, pantryItems, seed, learning)` from `src/lib/planEngine.ts`
4. `generated` is derived via `useMemo` — applies `manualOverrides` on top of `basePlan`, recalculates shopping and freeze items
5. Result (`PlanResult`) flows into the render: week view, shopping list, freeze guide, stats chips

**Plan Algorithm (inside `buildPlan`):**

1. Filter `RECIPE_LIBRARY` by diet, time, exclusions, protein rotation (seed-based weekly rotation)
2. Score each candidate recipe with `scoreCandidate()` (pantry match, category balance, freshness by day, learning history, ingredient reuse)
3. `pickRecipe()` selects highest-scored candidate for each meal slot, iterating over 7 days × up to 2 slots
4. After all days filled: `aggregateShopping()` subtracts pantry items and rounds purchase quantities
5. `computeStats()` tallies ingredient reuse and category distribution
6. Freeze items computed: perishables (weight=5 ingredients) used after Tuesday flagged for freezing

**State Persistence:**

1. Every state slice (`preferences`, `pantryItems`, `seed`, `manualOverrides`, `learning`) has a dedicated `useEffect` that writes to localStorage on change
2. Initial state for each slice reads from localStorage (with `try/catch` fallback to defaults)
3. Cloud sync via Supabase is present in `src/lib/supabase.ts` but all sync effects in `page.tsx` are disabled stubs

**Auth Flow:**

1. `AuthProvider` in `src/lib/AuthProvider.tsx` initializes Supabase client from env vars `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
2. If env vars absent, auth stays disabled (no errors thrown)
3. `useAuth()` hook exposes `sbClient`, `user`, `showAuthModal`, `syncStatus` to any child
4. `page.tsx` accesses auth via `useAuth()` and shows `AuthModalInline` when `showAuthModal === true`

## Key Abstractions

**`buildPlan(preferences, pantryItems, seed, learning): PlanResult`:**
- Purpose: Core planning algorithm; deterministic given same inputs + seed
- Location: `src/lib/planEngine.ts` line 266
- Pattern: Pure function (no side effects); seed-based shuffle enables "generate new plan" without changing preferences

**`PlanResult`:**
- Purpose: Complete output of one planning run
- Location: `src/types/index.ts` line 72
- Fields: `days: DayPlan[]`, `shopping: ShoppingItem[]`, `stats: PlanStats`, `alerts: string[]`, `freezeItems: FreezeItem[]`

**`PreferenceLearning`:**
- Purpose: Accumulated user feedback that biases future plan scoring (kept/regenerated recipe counts, liked/disliked categories and ingredients)
- Location: `src/types/index.ts` line 45
- Pattern: Counter maps — scores added/subtracted inside `scoreCandidate()` in `planEngine.ts`

**`ManualOverrides`:**
- Purpose: Per-day, per-slot recipe replacements applied on top of the auto-generated plan
- Location: `src/types/index.ts` line 81
- Pattern: `Record<dayName, Partial<Record<MealSlot, Recipe | null>>>` — merged in the `generated` memo

**`RECIPE_LIBRARY`:**
- Purpose: Static database of all recipes
- Location: `src/data/recipes.ts` line 10
- Pattern: Immutable array built with factory shorthand functions; filtered and scored at runtime — never mutated

## Entry Points

**Application Root:**
- Location: `src/app/layout.tsx`
- Triggers: Next.js App Router renders this for every route
- Responsibilities: HTML shell, metadata/manifest/PWA meta tags, `AuthProvider` wrapper, service worker registration script injection

**Main Page:**
- Location: `src/app/page.tsx` — default export `SettimanaSmartMVP`
- Triggers: Next.js renders at route `/`
- Responsibilities: All UI state management, tab navigation (planner / week / shopping / cucina), plan computation via memos, auth modal, onboarding flow, voice cooking guide

**Service Worker:**
- Location: `public/sw.js`
- Triggers: Registered by inline script in `layout.tsx` on page load
- Responsibilities: Cache-first strategy for GET requests; network-only for Supabase API calls

## Error Handling

**Strategy:** Defensive try/catch at localStorage boundaries; silent fallback to defaults

**Patterns:**
- localStorage reads wrapped in `try/catch` in every state initializer — on parse failure, default value is used silently
- Auth operations in `AuthModalInline` use try/catch with user-visible error string state
- Supabase client only initialized when env vars are present; missing credentials → auth silently disabled (no error thrown)
- Recipe library filtering returns empty-plan sentinel if no recipes match (alerts array populated with reason)

## Cross-Cutting Concerns

**Styling:** Custom CSS design tokens injected via a `<style>` tag inside `page.tsx` using a `designTokens` string; Tailwind CSS v4 used for shadcn/ui components only; no CSS Modules

**State Management:** All state in `useState` hooks inside the single `SettimanaSmartMVP` component; no external state manager; derived state via `useMemo`

**Validation:** No form validation library; dietary/preference constraints enforced by filtering inside `buildPlan()`

**Localization:** Italian language hardcoded throughout UI text, recipe data, and day names (`DAYS = ["Lun", "Mar", ...]`)

**PWA:** Manifest at `public/manifest.json`, icons at `public/icon-192.png` / `public/icon-512.png`, service worker at `public/sw.js`

---

*Architecture analysis: 2026-03-19*

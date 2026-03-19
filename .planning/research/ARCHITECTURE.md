# Architecture Patterns

**Domain:** Mobile meal planning app (weekly plan generator with anti-waste focus)
**Researched:** 2026-03-19
**Confidence:** HIGH — derived from direct codebase analysis, not inference

---

## Current System Overview

The app exists as a working Next.js 16 PWA, not yet a React Native app. The PROJECT.md lists React Native as a pending decision; the actual codebase is a web app installable as a PWA. All architecture below reflects the real system.

**Pattern:** Single-page PWA with client-side computation
- All meal planning logic runs in the browser (no server API routes)
- Persistence: localStorage primary, Supabase scaffolded but disabled
- Platform: Next.js 16 + React 19, deployed as PWA (not native)
- One route (`/`), one mega-component (`SettimanaSmartMVP`, ~1738 lines)

---

## Component Boundaries

| Component | Location | Responsibility | Communicates With |
|-----------|----------|---------------|-------------------|
| **Type Definitions** | `src/types/index.ts` | Shared domain model: `Recipe`, `Preferences`, `PlanResult`, `DayPlan`, `ShoppingItem`, `FreezeItem`, `PreferenceLearning`, `ManualOverrides` | All layers depend on this |
| **Recipe Database** | `src/data/recipes.ts` | Static library of ~150 recipes as `RECIPE_LIBRARY: Recipe[]`; built with factory shorthand `r()` / `ing()` | Consumed by Plan Engine and View Layer |
| **Plan Engine** | `src/lib/planEngine.ts` | Core algorithm: `buildPlan()`, `aggregateShopping()`, `computeStats()`, `seededShuffle()`, `scoreCandidate()`, `pantryMatches()` | Reads Recipe DB and Types; called by View Layer |
| **Auth Context** | `src/lib/AuthProvider.tsx` | Supabase client lifecycle; exposes `useAuth()` hook with `sbClient`, `user`, `showAuthModal`, `syncStatus` | Wraps all children via layout; consumed by View Layer |
| **Cloud DB Utilities** | `src/lib/supabase.ts` | Supabase table wrappers: `loadUserData()`, `savePreferences()`, `savePantry()`, `saveWeeklyPlan()`, `migrateFromLocalStorage()` | Called by View Layer (currently all stubs/disabled) |
| **UI Primitives** | `src/components/ui/` | Accessible components (shadcn/ui on Radix UI): Button, Card, Tabs, Checkbox, Select, Slider, etc. | Consumed by View Layer |
| **View Layer** | `src/app/page.tsx` | All UI, all state management, tab navigation (Planner / Week / Shopping / Cucina / Ricette), orchestrates all other components | Depends on every other component |
| **PWA Shell** | `public/sw.js` + `public/manifest.json` | Service worker (cache-first GET, network-only for Supabase), installability metadata | Registered by layout.tsx |
| **Root Layout** | `src/app/layout.tsx` | HTML shell, PWA meta tags, `AuthProvider` wrapper, service worker registration | Parent of View Layer |

---

## Data Flow

### Plan Generation Flow

```
User input (Preferences form)
        |
        v
computedPrefs [useMemo]
  - parses exclusionsText (comma-split, normalize)
  - derives diet, people, maxTime, coreIngredients
        |
        v
basePlan [useMemo] → buildPlan(computedPrefs, pantryItems, seed, learning)
  |
  |  Inside buildPlan():
  |    1. Filter RECIPE_LIBRARY by diet + time + exclusions
  |    2. Separate protein rotation by seed (meat / fish / poultry)
  |    3. For each day × meal slot: scoreCandidate() ranks all candidates
  |       - pantry match bonus (fuzzy via pantryMatches())
  |       - category balance (CATEGORY_ORDER distribution)
  |       - freshness-by-day (perishables early in week)
  |       - learning history (kept/rejected recipe counts)
  |       - ingredient reuse bonus (cross-day shared ingredients)
  |    4. pickRecipe() selects top scorer; records used IDs
  |    5. aggregateShopping() subtracts pantryItems, rounds quantities
  |    6. computeStats() tallies reuse count, category distribution
  |    7. freezeItems: perishable ingredients used after Tuesday flagged
  |
  v
basePlan: PlanResult { days, shopping, stats, alerts, freezeItems }
        |
        v
generated [useMemo]
  - applies manualOverrides (per-day per-slot swaps) on top of basePlan
  - recomputes shopping and freeze for override-adjusted plan
        |
        v
Rendered UI:
  - Week tab: DayPlan[] → recipe cards per slot
  - Shopping tab: ShoppingItem[] → aggregated list
  - Cucina tab: recipe detail + voice guide
  - Planner tab: Preferences form input
```

### State Persistence Flow

```
State slice (preferences / pantryItems / seed / manualOverrides / learning)
        |
        v [useEffect on each slice]
localStorage.setItem("ss_{key}_v1", JSON.stringify(value))

On mount:
localStorage.getItem("ss_{key}_v1") → JSON.parse() [try/catch → default]
        |
        v
useState initializer

Cloud sync path (scaffolded, not yet active):
  useAuth() → sbClient
        |
        v [disabled useEffect stubs]
  supabase.ts: savePreferences() / savePantry() / saveWeeklyPlan()
```

### User Feedback Loop (Learning)

```
User keeps a recipe → learning.keptRecipes[id]++
User regenerates a slot → learning.rejectedRecipes[id]++
User marks ingredient liked/disliked → learning.likedIngredients / .dislikedIngredients

PreferenceLearning object persisted to localStorage as "ss_learning_v1"
        |
        v
Passed into buildPlan() → scoreCandidate() reads learning scores
→ recipes user kept score higher; rejected recipes score lower
```

### Single-Meal Swap Flow

```
User taps "Sostituisci" on a meal slot
        |
        v
SKIP_OPTIONS (N alternatives) shown based on same filters
        |
        v [user selects alternative]
manualOverrides[day][slot] = selectedRecipe
        |
        v
generated useMemo recomputes entire plan result with override applied
```

---

## Recommended Architecture (Target State)

The current architecture works but has two structural problems that will block future feature work: the monolithic `page.tsx` (~1738 lines) and disabled cloud sync. The roadmap should address these in order.

### Target Component Structure

```
src/
├── app/
│   ├── layout.tsx          # Unchanged (thin shell)
│   └── page.tsx            # Slim orchestrator only; delegates to tab components
├── components/
│   ├── ui/                 # Unchanged (shadcn primitives)
│   ├── PlannerTab.tsx      # Preferences form + onboarding
│   ├── WeekTab.tsx         # 7-day grid + swap UI
│   ├── ShoppingTab.tsx     # Aggregated shopping list
│   ├── CucinaTab.tsx       # Recipe detail + voice guide
│   └── RicetteTab.tsx      # Recipe browser/search
├── hooks/
│   ├── usePlanEngine.ts    # Wraps buildPlan memo + seed management
│   ├── useLocalStorage.ts  # Generic typed localStorage hook
│   ├── useLearning.ts      # PreferenceLearning state + updaters
│   └── useCloudSync.ts     # Supabase sync (replaces disabled stubs)
├── data/
│   └── recipes.ts          # Unchanged (or migrated to JSON/Supabase)
├── lib/
│   ├── planEngine.ts       # Unchanged (pure functions)
│   ├── AuthProvider.tsx    # Unchanged
│   ├── supabase.ts         # Activated (remove stubs)
│   └── utils.ts            # Unchanged
└── types/
    └── index.ts            # Unchanged (add meta fields to Recipe)
```

---

## Build Order (Phase Dependencies)

Components have hard dependencies that determine safe build order:

```
Layer 0: src/types/index.ts
  (no dependencies — must exist first)

Layer 1: src/data/recipes.ts
  (depends on: types)

Layer 2: src/lib/planEngine.ts
  (depends on: types, recipes)

Layer 3: src/lib/AuthProvider.tsx + src/lib/supabase.ts
  (depends on: types; independent of plan engine)

Layer 4: src/hooks/*
  (depends on: planEngine, localStorage, supabase)

Layer 5: src/components/{tab components}
  (depends on: hooks, ui primitives)

Layer 6: src/app/page.tsx (slim orchestrator)
  (depends on: all tab components, hooks)
```

**Implication for roadmap phases:**

1. **Core engine hardening** — Fix planEngine before building more features on top (aliases refactor, export `computeFreezeItems`, add Recipe.meta fields). No UI changes needed.

2. **Cloud sync activation** — AuthProvider and supabase.ts are already scaffolded. Completing this is isolated to `src/lib/supabase.ts` + `useCloudSync.ts` hook. Does not require decomposing the monolith first.

3. **Monolith decomposition** — Extract tab components and hooks from `page.tsx`. This is a refactor phase — behavior-preserving but unlocks parallel feature work. Must happen before adding major new tabs or flows.

4. **Recipe database evolution** — Move from static TS file to Supabase table. Depends on cloud sync being active. Enables server-side recipe curation, dynamic library growth.

5. **Feature additions** (shopping list enhancements, leftover suggestions, recipe search) — Build on the extracted components and active cloud sync. Each can be an independent phase.

---

## Patterns to Follow

### Pattern 1: Pure Plan Engine
**What:** `buildPlan()` is a pure function — same inputs always produce same output. No side effects, no global mutation.
**When:** All plan generation logic. New scoring criteria belong here, not in components.
**Benefit:** Testable in isolation, memoizable with `useMemo`, debuggable by logging inputs.

### Pattern 2: Seed-Based Determinism
**What:** Plan generation uses a seeded LCG shuffle (`seededShuffle`). The seed is stored in localStorage and incremented on explicit "regenerate" action.
**When:** Anywhere the plan needs to be reproducible (e.g. "show me the same plan again").
**Benefit:** User can regenerate without changing preferences; same seed = same plan.

### Pattern 3: Layered Persistence
**What:** localStorage is the primary store; Supabase is the sync layer.
**When:** Every state write goes to localStorage immediately; cloud sync is best-effort async.
**Benefit:** App works fully offline; cloud adds cross-device sync without blocking UX.

### Pattern 4: Override-on-Top
**What:** `manualOverrides` is applied as a delta on top of the auto-generated `basePlan` rather than mutating the plan in place.
**When:** Single-meal replacement UI.
**Benefit:** "Reset to generated plan" is trivially `setManualOverrides({})`.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Business Logic in Components
**What:** Putting scoring, filtering, or aggregation logic inside React components or hooks.
**Why bad:** Untestable, hard to share, triggers unnecessary re-renders.
**Instead:** All algorithm logic stays in `src/lib/planEngine.ts` as pure functions.

### Anti-Pattern 2: Direct localStorage Reads in Components
**What:** Calling `localStorage.getItem()` inside render functions or effects directly.
**Why bad:** Not reactive, bypasses type safety, hard to mock in tests.
**Instead:** Use a typed `useLocalStorage` hook that centralizes parse + fallback logic.

### Anti-Pattern 3: Inline CSS Strings in Render
**What:** The current `designTokens` string injected as `<style>{designTokens}</style>` in JSX.
**Why bad:** Re-injected on every render; bypasses Tailwind's build pipeline; dual CSS system.
**Instead:** Move all design tokens to `src/app/globals.css` as CSS custom properties.

### Anti-Pattern 4: Hardcoded Ingredient String Arrays in Engine
**What:** `FREEZE_CANDIDATES`, `MEAT_INGREDIENTS`, `FISH_INGREDIENTS`, alias maps all as hardcoded string arrays in `planEngine.ts`.
**Why bad:** Adding a recipe requires updating 6 separate lists; typos cause silent mismatches.
**Instead:** Add `meta: { perishability, proteinType, category }` to `RecipeIngredient` type and derive engine logic from structured data.

### Anti-Pattern 5: Disabled Feature Stubs in Production
**What:** The three disabled `useEffect` stubs and `_applyCloudData_disabled` functions in `page.tsx`.
**Why bad:** Misleads users (auth UI exists but does nothing); dead code increases cognitive load.
**Instead:** Complete the feature or remove the UI entirely. No "coming soon" stubs in production code.

---

## Scalability Considerations

| Concern | Current (MVP) | At Growth | Scaling Path |
|---------|--------------|-----------|--------------|
| Recipe library | ~150 recipes in static TS file | 500+ recipes unusable as a single module | Migrate to Supabase `recipes` table; query by diet/time on demand |
| User data | localStorage (~50KB) | Multi-device users lose data | Activate Supabase sync already scaffolded |
| Plan computation | Full re-plan on every preference change | Laggy on slow devices | Debounce preference changes; pre-compute pantry match index |
| Component size | 1738-line `page.tsx` | Any new feature worsens this | Decompose into tab components + custom hooks |
| Bundle size | Entire recipe library in main JS chunk | Slow initial load | Dynamic import or JSON + route-segment lazy loading |
| Learning data | Unbounded `learning` object in localStorage | 5MB localStorage limit | Cap history size; move to Supabase with TTL |

---

## Key Data Shapes

**`Preferences`** (user input → plan engine input):
- `diet`: `"mediterranea" | "onnivora" | "vegetariana" | "vegana" | "senza_glutine"`
- `people`: number of servings
- `maxTime`: max preparation minutes
- `exclusionsText`: free-text comma-separated ingredient exclusions
- `budget`: collected but not used in engine (known bug)

**`PlanResult`** (plan engine output → entire UI):
- `days: DayPlan[]` — 7 days, each with up to 2 meal slots (pranzo/cena)
- `shopping: ShoppingItem[]` — aggregated, pantry-subtracted shopping list
- `stats: PlanStats` — reused ingredient count, category distribution
- `alerts: string[]` — warnings (e.g. no matching recipes found)
- `freezeItems: FreezeItem[]` — perishables to freeze with day index

**`PreferenceLearning`** (feedback accumulator → scoring bias):
- `keptRecipes`, `rejectedRecipes`: `Record<recipeId, count>`
- `likedCategories`, `dislikedCategories`, `likedIngredients`, `dislikedIngredients`: `Record<string, count>`

---

## Sources

- Direct codebase analysis: `.planning/codebase/ARCHITECTURE.md` (2026-03-19)
- Direct codebase analysis: `.planning/codebase/CONCERNS.md` (2026-03-19)
- Direct codebase analysis: `.planning/codebase/STRUCTURE.md` (2026-03-19)
- Direct codebase analysis: `.planning/codebase/STACK.md` (2026-03-19)

**Confidence:** HIGH for all sections — based on direct source code analysis, not training data inference.

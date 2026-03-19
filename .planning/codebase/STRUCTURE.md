# Codebase Structure

**Analysis Date:** 2026-03-19

## Directory Layout

```
settimana-smart/
├── public/                  # Static assets served at root
│   ├── sw.js                # Service worker (cache-first PWA)
│   ├── manifest.json        # PWA manifest (name, icons, theme)
│   ├── icon-192.png         # PWA icon
│   ├── icon-512.png         # PWA icon
│   └── *.svg                # Default Next.js SVGs (unused by app)
├── src/
│   ├── app/                 # Next.js App Router — one route only
│   │   ├── layout.tsx       # Root layout: HTML shell, AuthProvider, SW registration
│   │   ├── page.tsx         # Entire application UI (~1000+ lines, single component)
│   │   ├── globals.css      # Global CSS (Tailwind imports, base resets)
│   │   └── favicon.ico      # Browser tab icon
│   ├── components/
│   │   └── ui/              # Shadcn/ui primitive components (Radix-based)
│   │       ├── badge.tsx
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── checkbox.tsx
│   │       ├── input.tsx
│   │       ├── label.tsx
│   │       ├── select.tsx
│   │       ├── slider.tsx
│   │       ├── tabs.tsx
│   │       └── textarea.tsx
│   ├── data/
│   │   └── recipes.ts       # RECIPE_LIBRARY: static array of all Recipe objects
│   ├── lib/
│   │   ├── planEngine.ts    # Core planning algorithm and utilities
│   │   ├── AuthProvider.tsx # Supabase auth context + useAuth() hook
│   │   ├── supabase.ts      # Supabase DB read/write helpers
│   │   └── utils.ts         # cn() utility (clsx + tailwind-merge)
│   └── types/
│       └── index.ts         # All shared TypeScript types
├── .planning/
│   └── codebase/            # GSD codebase map documents
├── next.config.ts           # Next.js config (empty, defaults only)
├── tsconfig.json            # TypeScript config (strict, @/* alias)
├── postcss.config.mjs       # PostCSS config (Tailwind v4 plugin)
├── eslint.config.mjs        # ESLint config (next/core-web-vitals)
├── components.json          # Shadcn/ui component registry config
└── package.json             # Dependencies and scripts
```

## Directory Purposes

**`src/app/`:**
- Purpose: Next.js App Router pages and layouts
- Contains: One route (`/`) implemented in `page.tsx`, root layout in `layout.tsx`, global styles
- Key files: `src/app/page.tsx` (the entire application), `src/app/layout.tsx` (PWA setup + auth wrapper)

**`src/components/ui/`:**
- Purpose: Reusable UI primitives — generated/managed by shadcn/ui CLI
- Contains: Accessible, unstyled-by-default components built on Radix UI primitives
- Key files: All `.tsx` files here follow the shadcn/ui pattern (export named functions, use `cn()` for class merging)
- Note: Components are lightly used in `page.tsx`; most UI is built with custom CSS classes defined inline

**`src/data/`:**
- Purpose: Static application data
- Contains: `recipes.ts` — the complete recipe database as a TypeScript constant
- Key files: `src/data/recipes.ts` exports `RECIPE_LIBRARY: Recipe[]`

**`src/lib/`:**
- Purpose: Non-UI logic — algorithms, external service clients, React context
- Contains: Plan engine, Supabase utilities, auth provider, shared utility functions
- Key files: `src/lib/planEngine.ts` (business logic core), `src/lib/AuthProvider.tsx` (auth context)

**`src/types/`:**
- Purpose: Shared TypeScript type definitions
- Contains: Single barrel file with all domain types
- Key files: `src/types/index.ts` — import all types from here

**`public/`:**
- Purpose: Files served as-is at the domain root
- Contains: Service worker, PWA manifest, app icons, SVG assets
- Generated: No — all manually maintained
- Committed: Yes

## Key File Locations

**Entry Points:**
- `src/app/layout.tsx`: Root HTML wrapper, PWA meta, `AuthProvider`, SW registration
- `src/app/page.tsx`: Complete application — default export `SettimanaSmartMVP`
- `public/sw.js`: Service worker for offline/PWA support

**Configuration:**
- `tsconfig.json`: TypeScript settings; defines `@/*` → `./src/*` path alias
- `next.config.ts`: Next.js config (currently empty)
- `components.json`: Shadcn/ui config (style: "new-york", baseColor: "neutral", cssVariables: true)
- `postcss.config.mjs`: Required by Tailwind v4

**Core Logic:**
- `src/lib/planEngine.ts`: `buildPlan()`, `aggregateShopping()`, `computeStats()`, `seededShuffle()`, scoring functions
- `src/data/recipes.ts`: `RECIPE_LIBRARY` — source of truth for all recipes
- `src/types/index.ts`: All type definitions (`Recipe`, `Preferences`, `PlanResult`, etc.)

**Auth / Cloud:**
- `src/lib/AuthProvider.tsx`: `AuthProvider` component + `useAuth()` hook
- `src/lib/supabase.ts`: DB helpers (`loadUserData`, `savePreferences`, `savePantry`, `saveWeeklyPlan`, `migrateFromLocalStorage`)

**Styling:**
- `src/app/globals.css`: Tailwind base imports
- CSS design tokens: Defined as a string constant `designTokens` inside `src/app/page.tsx` and injected via `<style>` tag at runtime

## Naming Conventions

**Files:**
- React components: `PascalCase.tsx` (e.g., `AuthProvider.tsx`, `card.tsx` in ui/ uses lowercase per shadcn convention)
- Pure TypeScript modules: `camelCase.ts` (e.g., `planEngine.ts`, `supabase.ts`, `utils.ts`)
- Type-only files: `index.ts` as barrel

**Directories:**
- Lowercase with no separators (e.g., `components/ui/`, `src/lib/`, `src/data/`, `src/types/`)

**Types:**
- PascalCase for all type aliases and object types (e.g., `Recipe`, `PlanResult`, `DayPlan`)
- String union types for enums (e.g., `Diet = "mediterranea" | "onnivora" | ...`)

**Constants:**
- SCREAMING_SNAKE_CASE for module-level constants (e.g., `RECIPE_LIBRARY`, `DAYS`, `FREEZE_CANDIDATES`, `CATEGORY_ORDER`)

**React Components:**
- PascalCase function names (e.g., `SettimanaSmartMVP`, `AuthModalInline`, `SectionHeader`)
- Inline helper components defined in `page.tsx` rather than separate files

**localStorage Keys:**
- Pattern: `ss_{key}_v1` (e.g., `ss_preferences_v1`, `ss_pantry_v1`, `ss_seed_v1`, `ss_manual_overrides_v1`, `ss_learning_v1`)

## Where to Add New Code

**New Feature (UI + logic):**
- If minor: Add state and JSX inside `src/app/page.tsx` (existing pattern)
- If substantial: Create a new component file in `src/components/` and import it into `page.tsx`
- Business logic: Add pure functions to `src/lib/planEngine.ts` or a new `src/lib/` module
- Tests: No test infrastructure exists currently — would need to be set up

**New UI Component:**
- Shadcn/ui primitive: Use shadcn CLI or manually create in `src/components/ui/` following existing pattern (named exports, `cn()` for classes)
- App-specific component: Create in `src/components/` (not in `ui/`)

**New Data / Recipes:**
- Add to `RECIPE_LIBRARY` array in `src/data/recipes.ts` using the `r()` and `ing()` factory helpers
- Follow existing `Recipe` shape from `src/types/index.ts`

**New Types:**
- Add to `src/types/index.ts` — all types live in this single file

**New API Route:**
- Create `src/app/api/{name}/route.ts` (standard Next.js App Router pattern — not used yet in this project)

**New Page / Route:**
- Create `src/app/{route}/page.tsx` (currently only `/` exists)

**Utilities:**
- Generic helpers (not plan-specific): Add to `src/lib/utils.ts`
- Plan-specific helpers: Add to `src/lib/planEngine.ts`
- Supabase/cloud helpers: Add to `src/lib/supabase.ts`

## Special Directories

**`.planning/`:**
- Purpose: GSD planning documents (codebase maps, phase plans)
- Generated: No — human/agent authored
- Committed: Yes

**`.next/`:**
- Purpose: Next.js build output and dev cache
- Generated: Yes (by `next build` / `next dev`)
- Committed: No (in `.gitignore`)

**`node_modules/`:**
- Purpose: npm dependencies
- Generated: Yes (by `npm install`)
- Committed: No (in `.gitignore`)

**`.claude/worktrees/`:**
- Purpose: Claude Code git worktrees for parallel agent work
- Generated: Yes (by Claude Code)
- Committed: Worktree metadata only

---

*Structure analysis: 2026-03-19*

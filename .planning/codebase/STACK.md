# Technology Stack

**Analysis Date:** 2026-03-19

## Languages

**Primary:**
- TypeScript 5.x - All application source code (`src/**/*.ts`, `src/**/*.tsx`)
- JavaScript - Service worker (`public/sw.js`), config files

**Secondary:**
- CSS - Global styles via Tailwind v4 CSS variables (`src/app/globals.css`)

## Runtime

**Environment:**
- Node.js (version not pinned; no `.nvmrc` present)

**Package Manager:**
- npm
- Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- Next.js 16.1.6 - App Router, RSC enabled, `force-dynamic` rendering (`src/app/layout.tsx`)
- React 19.0.0 - UI rendering, client components (`"use client"` directive)

**Styling:**
- Tailwind CSS 4.2.2 - Utility-first CSS via PostCSS plugin (`postcss.config.mjs`)
- tw-animate-css 1.4.0 - Animation utilities
- tailwind-merge 3.2.0 - Conditional class merging
- class-variance-authority 0.7.1 - Component variant management

**UI Components:**
- shadcn/ui (config at `components.json`) - Component library scaffolded into `src/components/ui/`
- Radix UI (`@radix-ui/react-slot` 1.1.2, `radix-ui` 1.4.3) - Accessible primitives underlying shadcn components

**Animation:**
- framer-motion 12.6.5 - Declared in `package.json`, not yet imported in source files

**Icons:**
- lucide-react 0.487.0 - Icon library (`src/app/page.tsx`)

**Build/Dev:**
- PostCSS 8.5.8 with `@tailwindcss/postcss` plugin (`postcss.config.mjs`)
- ESLint 9 with `eslint-config-next` 16.1.6 (`eslint.config.mjs`)

## Key Dependencies

**Critical:**
- `@supabase/supabase-js` 2.49.4 - Database client and auth (`src/lib/AuthProvider.tsx`, `src/lib/supabase.ts`)
- `next` 16.1.6 - Core framework; pinned version
- `react` / `react-dom` 19.0.0 - UI runtime

**Infrastructure:**
- `clsx` 2.1.1 - Class name utility (`src/lib/utils.ts`)
- `tailwind-merge` 3.2.0 - Merges Tailwind classes without conflicts (`src/lib/utils.ts`)

## Configuration

**Environment:**
- Runtime env vars read via `process.env` in `src/lib/AuthProvider.tsx`
- Required vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Env file: `.env.local.txt` present at root (non-standard extension; may not be auto-loaded by Next.js)
- Auth is disabled gracefully when env vars are absent

**TypeScript:**
- Strict mode enabled (`tsconfig.json`)
- Path alias: `@/*` → `./src/*`
- Target: ES2017
- Module resolution: `bundler`

**Build:**
- `next.config.ts` - Minimal config, no custom options set
- `postcss.config.mjs` - Only plugin: `@tailwindcss/postcss`
- `tsconfig.json` - Incremental build, Next.js plugin registered

**shadcn/ui:**
- Config: `components.json`
- Style: `default`, RSC enabled, tsx, CSS variables
- Base color: neutral
- Aliases: `@/components`, `@/components/ui`, `@/lib`, `@/hooks`

## Platform Requirements

**Development:**
- Node.js with npm
- Env file at `.env.local` with Supabase credentials (auth optional — app degrades gracefully without it)

**Production:**
- Target: Progressive Web App (PWA)
- PWA manifest: `public/manifest.json` (standalone display, Italian locale)
- Service worker: `public/sw.js` (cache-first for GET requests, network-only for Supabase API calls)
- App icons: `public/icon-192.png`, `public/icon-512.png`
- Layout sets `force-dynamic` export — all pages are SSR, not statically exported

---

*Stack analysis: 2026-03-19*

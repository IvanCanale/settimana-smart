# Technology Stack

**Project:** Settimana Smart — Weekly Meal Planning App
**Researched:** 2026-03-19
**Confidence:** MEDIUM (external search tools unavailable; based on codebase analysis + training knowledge with explicit uncertainty flagging)

---

## Critical Context: Existing Codebase vs. Greenfield Question

The research question asks about React Native vs. the standard mobile stack. However, the project already has a running codebase:

- **Framework:** Next.js 16.1.6 (App Router)
- **UI:** React 19 + shadcn/ui + Tailwind CSS v4
- **Backend:** Supabase (auth + PostgreSQL)
- **Target:** PWA (manifest, service worker, installable)
- **Platform decision:** "Pending" in PROJECT.md — "si valuta React Native per codebase unica"

**Recommendation: Do NOT rewrite to React Native. Continue as Next.js PWA.**

Rationale:
1. The core planning engine (`planEngine.ts`, `recipes.ts`, types) is framework-agnostic TypeScript — it would survive a port, but porting costs weeks of effort with zero user-facing benefit.
2. PWA now achieves feature parity with React Native for this app's requirements: offline support (service worker done), installability (manifest done), push notifications (Web Push API, supported on iOS 16.4+).
3. Supabase + Next.js is a proven, mature stack. Supabase RLS covers multi-user data isolation without backend code. Next.js API routes handle any server-side logic (e.g., AI recipe generation calls with secret keys).
4. React Native adds a native build pipeline (Xcode, Android Studio, EAS Build) with non-trivial ops overhead for a solo/small team with no demonstrated need for native APIs.
5. The only legitimate reason to choose React Native over PWA for this app would be App Store distribution. If that becomes a hard requirement, **Expo** (not bare React Native) is the right path — but that decision should wait for validated user traction.

---

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Next.js | 16.1.6 (current) | App framework, routing, API routes | Already in use; App Router enables server components for AI calls; Turbopack for dev speed |
| React | 19.0.0 | UI rendering | Already in use; concurrent features available for future use |
| TypeScript | 5.x | Type safety | Already in use; strict mode enabled; `@/*` path alias configured |

**Confidence:** HIGH — already running in production.

### Styling & UI

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Tailwind CSS | 4.2.2 | Utility styling | Already in use; v4 PostCSS plugin approach is the current standard |
| shadcn/ui | latest (component-by-component) | Accessible UI components | Already in use; built on Radix UI primitives; components are owned, not imported |
| Radix UI | via shadcn | Headless accessibility | Already in use; do not add `radix-ui` meta-package alongside individual packages (current bug — version ambiguity) |
| lucide-react | 0.487.0 | Icons | Already in use |

**Confidence:** HIGH — already running in production.

### Backend / Infrastructure

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Supabase | latest JS SDK (~2.49.x) | Auth, PostgreSQL, storage, edge functions | Already scaffolded (auth, 3 tables); Row Level Security enforces multi-user isolation without custom middleware; free tier sufficient for MVP; edge functions handle AI call proxying |
| Vercel | — | Hosting + edge network | Implied by repo structure (vercel.svg, next.config.ts); zero-config Next.js deployment; free tier covers hobby scale |

**Confidence:** HIGH for Supabase (already integrated). MEDIUM for Vercel (inferred, not verified in CI config).

### AI / Recipe Generation

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| OpenAI API (GPT-4o-mini) | latest | Recipe generation, meal suggestions, leftovers reuse | The app currently uses a ~150-recipe static library (`src/data/recipes.ts`); this is a hard scaling limit. GPT-4o-mini generates structured JSON output (function calling / `response_format: json_schema`) reliably and cheaply ($0.15/1M input tokens). Use via Next.js API route to keep the secret key server-side. |

**Confidence:** MEDIUM — OpenAI dominates this use case. GPT-4o-mini is the cost/quality sweet spot as of training knowledge (Aug 2025); verify current pricing at platform.openai.com before committing.

**Why not alternatives:**
- **Anthropic Claude API:** More expensive than GPT-4o-mini for structured JSON generation at this scale; no clear quality advantage for recipe domain.
- **Spoonacular / Edamam recipe APIs:** Provide real recipes but no "leftover reuse" intelligence, no natural-language customization, subscription costs scale with requests. Suitable only if building a recipe search feature — not the core planning intelligence.
- **Local LLM (Ollama etc.):** Requires server infrastructure; overkill for this stage; latency is worse.
- **Google Gemini Flash:** Viable alternative if OpenAI pricing becomes a concern; similar capability tier. LOW confidence — verify current state.

### State Management

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| React `useState` + `useMemo` | built-in | Local UI state | Already in use; sufficient for current scope. Do NOT add Zustand/Jotai/Redux until there is a clear pain point — the complexity is not justified yet. |
| Supabase Realtime | via `@supabase/supabase-js` | Cloud sync (when auth completes) | Already scaffolded but disabled; enables syncing plan across devices without a custom WebSocket setup |

**Confidence:** HIGH — deliberately minimal; matches project scale.

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Zod | ^3.x | Schema validation | Add now — needed for localStorage parse validation (documented security concern in CONCERNS.md) and for validating AI-generated JSON recipe output |
| react-hook-form | ^7.x | Form handling | Add when building onboarding form for profile setup; replaces the current uncontrolled inputs in `page.tsx` |
| Vitest | ^2.x | Unit testing | Add now — zero test coverage is the highest-risk item in CONCERNS.md; `planEngine.ts` is pure functions, ideal for unit tests |
| @testing-library/react | ^16.x | Component testing | Add alongside Vitest for component-level tests |

**Confidence:** MEDIUM — these are standard choices for the Next.js/React ecosystem as of training knowledge; version numbers should be verified against npm at implementation time.

---

## What NOT to Use

| Technology | Why Not |
|------------|---------|
| React Native / Expo | Rewrite cost > benefit; PWA achieves same UX for this app's features; native build pipeline adds ops burden with no validated need |
| Flutter | No code reuse from existing React codebase; requires Dart expertise; justified only for teams starting from zero |
| Redux / Zustand | No shared state across component subtrees that would justify a global store; `useState` + React Context is sufficient at current scale |
| GraphQL / tRPC | REST via Supabase client is simpler and already working; tRPC adds value only when a custom API layer grows to many endpoints |
| Prisma | Supabase's own client handles all DB access; Prisma adds type-gen overhead and conflicts with Supabase RLS patterns |
| framer-motion | Already installed but UNUSED — remove it (documented in CONCERNS.md); adds 140KB+ to bundle for no benefit |
| Spoonacular / Edamam | Recipe API services; adds per-request cost and dependency for something an LLM does better for this use case |

---

## Platform Decision: PWA vs React Native

| Criterion | Next.js PWA (current) | React Native + Expo |
|-----------|----------------------|---------------------|
| Codebase reuse | Full — no migration needed | Near-zero — complete rewrite |
| iOS install | Yes (Safari "Add to Home Screen") | Yes (App Store) |
| Android install | Yes (Chrome install prompt) | Yes (Play Store) |
| Offline support | Yes (service worker in place) | Yes (native) |
| Push notifications | Yes (Web Push, iOS 16.4+) | Yes (native, more reliable) |
| App Store distribution | No | Yes |
| Build pipeline | None (Vercel) | Xcode + Android Studio + EAS Build |
| Dev iteration speed | Fast | Slower (native builds) |
| Time to production | Now | 4-8 weeks additional |
| Meaningful differentiator | No | Only if App Store visibility is required |

**Verdict: Stay PWA.** Revisit React Native only if App Store distribution becomes a validated business requirement with evidence users won't install PWAs.

---

## Existing Versions (from package.json — authoritative)

```
next: 16.1.6
react: ^19.0.0
react-dom: ^19.0.0
typescript: ^5
@supabase/supabase-js: ^2.49.4
tailwindcss: ^4.2.2
tailwind-merge: ^3.2.0
class-variance-authority: ^0.7.1
@radix-ui/react-slot: ^1.1.2
radix-ui: ^1.4.3  ← NOTE: remove this, keep only individual @radix-ui/* packages
framer-motion: ^12.6.5  ← NOTE: remove, unused
lucide-react: ^0.487.0
clsx: ^2.1.1
```

---

## Installation — Additions to Make

```bash
# Schema validation + AI output validation
npm install zod

# Form management (add when building profile onboarding)
npm install react-hook-form @hookform/resolvers

# Testing infrastructure
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/user-event jsdom

# OpenAI SDK (when AI integration phase starts)
npm install openai

# Remove unused / problematic packages
npm uninstall framer-motion
```

---

## Sources

| Source | Type | Confidence |
|--------|------|------------|
| `.planning/codebase/STACK.md` | Direct codebase analysis | HIGH |
| `.planning/codebase/ARCHITECTURE.md` | Direct codebase analysis | HIGH |
| `.planning/codebase/INTEGRATIONS.md` | Direct codebase analysis | HIGH |
| `.planning/codebase/CONCERNS.md` | Direct codebase analysis | HIGH |
| `package.json` | Authoritative dependency versions | HIGH |
| OpenAI pricing / GPT-4o-mini capability | Training knowledge (Aug 2025 cutoff) | MEDIUM — verify current state |
| PWA iOS support (16.4+) | Training knowledge | MEDIUM — verify current iOS version support |
| Vitest / Zod / react-hook-form versions | Training knowledge | MEDIUM — verify on npm before adding |

# Project Research Summary

**Project:** Settimana Smart — Weekly Meal Planning App
**Domain:** Mobile-first meal planning PWA with anti-waste focus
**Researched:** 2026-03-19
**Confidence:** MEDIUM-HIGH (stack/architecture HIGH from codebase analysis; features/pitfalls MEDIUM from training data)

## Executive Summary

Settimana Smart is a working Next.js 16 PWA — not a greenfield project. It already has a functional plan generation engine (`planEngine.ts`), ~150-recipe static library, Supabase auth scaffolded (but disabled), and a service worker for offline support. The central architectural problem is not "what to build" but "how to evolve what exists": a 1738-line monolithic `page.tsx` that must be decomposed before new features can be added cleanly, and a Supabase cloud sync layer that is scaffolded but not activated. The platform debate (React Native vs. PWA) is resolved — stay PWA. The cost-benefit of a rewrite is negative with no validated need for App Store distribution.

The recommended development approach is to harden before expanding. The existing plan engine contains the core differentiator (cross-week ingredient sharing via `scoreCandidate()` bonus) but has known structural problems: hardcoded string arrays for ingredient classification, a `budget` field collected but never used, and zero test coverage on business-critical pure functions. These must be addressed before adding AI recipe generation, cloud sync, or new features — otherwise every new feature is built on a fragile foundation. The sequence is: engine hardening → cloud sync activation → monolith decomposition → feature expansion.

The highest-risk areas are safety (AI-generated meal plans could violate dietary restrictions for allergic users — a safety incident, not just a UX failure) and retention (the waste-reduction algorithm, if it optimizes ingredient reuse without a diversity constraint, will produce monotonous plans that cause week-2 churn). Both risks must be mitigated in Phase 1 design, not retrofitted later.

---

## Key Findings

### Recommended Stack

The existing stack (Next.js 16 / React 19 / Supabase / Tailwind v4 / shadcn/ui) is correct and should not be changed. The only additions needed are: **Zod** for localStorage and AI output validation (security and correctness), **Vitest + Testing Library** for zero-coverage plan engine (highest-risk gap), **react-hook-form** for onboarding profile form, and the **OpenAI SDK** when the AI generation phase begins. Two packages should be removed: `framer-motion` (installed but unused, 140KB+ bundle cost) and the `radix-ui` meta-package (creates version ambiguity alongside individual `@radix-ui/*` packages).

**Core technologies:**
- **Next.js 16.1.6:** App framework — already deployed, App Router enables server components for AI API calls with secret key protection
- **React 19 + TypeScript 5:** UI + type safety — already in use, strict mode enabled
- **Supabase (~2.49.x):** Auth + PostgreSQL + Realtime — auth scaffolded, sync stubs disabled; activating sync is the next infrastructure milestone
- **GPT-4o-mini (OpenAI):** Recipe generation — recommended when AI phase begins; use structured JSON output (`response_format: json_schema`) via Next.js API route; cheapest capable model for this use case
- **Vitest + Zod:** Testing + validation — must be added immediately; `planEngine.ts` is pure functions and ideal for unit tests

**Do not add:** React Native/Expo (rewrite cost, zero benefit over current PWA), Redux/Zustand (no global state pain point yet), Prisma (conflicts with Supabase RLS patterns), GraphQL/tRPC (no API layer complexity yet).

### Expected Features

The existing app already covers several table stakes: automated plan generation, recipe detail view, aggregated shopping list (via `aggregateShopping()`), single-meal swap with `manualOverrides`, mark-items-bought, and basic preference filtering. What is missing from table stakes is a proper **user profile onboarding flow** (preferences exist but the UI is unguided) and **allergen hard-filtering** (diet filtering exists; allergen-level filtering is not validated as safe for medical requirements).

**Must have (table stakes):**
- User profile onboarding — dietary preferences, intolerances (hard filter, safety-critical), household size
- Allergen validation layer — deterministic post-generation check, never delegated to LLM
- Weekly plan generation — already working, needs hardening (variety + waste multi-objective)
- Recipe detail view — exists, needs reliable content source
- Aggregated shopping list — `aggregateShopping()` exists; needs canonical ingredient registry for Italian names
- Single-meal swap — exists via `manualOverrides`

**Should have (differentiators):**
- Cross-week ingredient sharing — partially implemented in `scoreCandidate()` bonus; must be properly multi-objective (not just maximize overlap)
- Cloud sync / multi-device — scaffolded in Supabase; activation is near-term
- Leftover repurposing suggestions — implement at plan-design level only (no user meal tracking in v1)
- Push notifications — Sunday "plan your week" prompt; high perceived value, low implementation cost after core

**Defer (v2+):**
- "What's in my fridge?" input — high onboarding friction; validate demand first
- Pantry tracking — useful but setup friction; defer until users request it
- Partial plan replacement (keep Mon-Wed, redo Thu-Sun) — full swap + full regen covers 90% of use cases
- Grocery delivery integration — partnership/API surface area, out of scope for v1
- Calorie/macro tracking — confirmed out of scope in PROJECT.md; contradicts positioning

### Architecture Approach

The current architecture is a working single-page PWA with client-side computation. All plan logic runs as pure functions in `planEngine.ts` — this is correct and must be preserved. The structural debt is the monolithic `page.tsx` (~1738 lines) that owns all state, all tab rendering, and all orchestration. Decomposition into tab components (`PlannerTab`, `WeekTab`, `ShoppingTab`, `CucinaTab`, `RicetteTab`) and custom hooks (`usePlanEngine`, `useLocalStorage`, `useLearning`, `useCloudSync`) is required before any new feature tabs can be added without making the monolith worse. Cloud sync uses a layered persistence pattern: localStorage is primary (offline-first), Supabase is async best-effort sync.

**Major components:**
1. **Plan Engine (`src/lib/planEngine.ts`)** — pure function core; `buildPlan()` + scoring + aggregation; all algorithm logic stays here, never in components
2. **Auth + Cloud Layer (`src/lib/AuthProvider.tsx` + `supabase.ts`)** — Supabase client lifecycle and table wrappers; scaffolded but sync stubs disabled
3. **View Layer (`src/app/page.tsx`)** — current monolith; target state is a thin orchestrator delegating to extracted tab components
4. **PWA Shell (`public/sw.js` + `manifest.json`)** — cache-first offline support; already in place
5. **Recipe Database (`src/data/recipes.ts`)** — static ~150-recipe library; scales to Supabase table when library exceeds practical TS file size

**Patterns to follow:**
- Pure plan engine: all scoring/filtering/aggregation in `planEngine.ts`, never in components
- Seed-based determinism: `seededShuffle` ensures same seed = same plan (reproducible, debuggable)
- Layered persistence: localStorage writes first, Supabase syncs async
- Override-on-top: `manualOverrides` applied as delta on `basePlan` (trivial "reset to generated plan")

**Anti-patterns to avoid:**
- Business logic in components (untestable, causes re-renders)
- Direct `localStorage.getItem()` in render (use typed `useLocalStorage` hook)
- Inline CSS string `<style>` injection (move to `globals.css`)
- Hardcoded string arrays in engine for ingredient classification (add `Recipe.meta` structured fields)
- Disabled feature stubs in production code (auth UI exists but does nothing — complete or remove)

### Critical Pitfalls

1. **Dietary restriction violations via AI hallucination** — Never trust LLM to enforce allergens. Add a deterministic post-generation validation layer against a canonical allergen database (with Italian name mapping). For nuts/shellfish, add a UI disclaimer. This is a safety requirement, not a UX preference. Must be in Phase 1.

2. **Monotonous plans from single-objective ingredient overlap** — The existing `scoreCandidate()` already applies an ingredient-reuse bonus, which is good. But without an explicit variety constraint (max N same protein in a week, no recipe repeated in 2 weeks), the optimizer will produce boring plans. Add multi-objective scoring before shipping the generation feature to users.

3. **LLM recipe instructions are wrong at scale** — Use structured output schema (`{ingredients: [{name, quantity, unit}], steps: string[]}`) not free-text blobs. Scale quantities deterministically in code, not by prompting the LLM. Validate output schema strictly before persisting. Constrain cooking times with reference bounds per recipe category.

4. **Shopping list not truly aggregated** — `aggregateShopping()` exists but canonical ingredient normalization for Italian names needs validation. Build a bilingual ingredient registry (Italian → canonical → unit type) before the shopping list is user-facing with AI-generated content.

5. **AI generation latency (8-25s) without loading state design** — Design streaming response UX or a stepped progress indicator before building the generation trigger. Never block the UI thread. Add 30s timeout with retry. Generate on app open as a background task, not on-demand tap.

---

## Implications for Roadmap

Based on combined research, the suggested phase structure follows the build-order dependencies identified in ARCHITECTURE.md and addresses the safety-critical pitfalls from PITFALLS.md before any user-facing feature expansion.

### Phase 1: Engine Hardening and Test Coverage

**Rationale:** Zero test coverage on `planEngine.ts` is the highest-risk item in the codebase. The plan engine is the product's core value and has no safety net. Before adding AI, cloud sync, or new features, establish confidence in the existing engine through tests and structural cleanup. This phase has no user-facing output but de-risks everything that follows.

**Delivers:** Tested plan engine, Zod validation on localStorage parsing, removal of unused packages (framer-motion, radix-ui meta), resolution of known engine bugs (budget field unused, hardcoded ingredient string arrays replaced with `Recipe.meta` structured fields).

**Addresses:** Table stakes — plan generation correctness; allergen hard-filtering groundwork

**Avoids:** Pitfall 1 (allergen violations), Pitfall 2 (monotony — add variety constraint to scoring), silent failures from malformed localStorage data

**Research flag:** Standard patterns — no research phase needed. Pure function testing with Vitest is well-documented.

### Phase 2: User Profile and Onboarding

**Rationale:** The app's personalization is gated on a proper profile. Current preferences exist as an unguided form in the monolith. Before cloud sync is activated, user identity and profile must be defined. This phase also activates Supabase auth (scaffolded but unused) and wires the profile to the plan engine's `Preferences` type.

**Delivers:** Guided onboarding flow (allergy/intolerance hard filter + household size minimum; progressive profiling for diet/time/exclusions), Supabase auth activated (email + OAuth), user profile persisted to Supabase, allergen validation layer.

**Addresses:** Table stakes — user profile with intolerances (safety-critical); onboarding progressive disclosure

**Avoids:** Pitfall 1 (allergen hard filter built here, before AI is added), Pitfall 10 (onboarding drop-off — minimum viable profile only), Pitfall 11 (plan persisted offline immediately after generation)

**Research flag:** Standard patterns — Supabase auth + react-hook-form onboarding is well-documented. No research phase needed.

### Phase 3: Monolith Decomposition and Cloud Sync

**Rationale:** The 1738-line `page.tsx` must be decomposed before any new tabs or features can be added. This phase is a behavior-preserving refactor — it produces no new user-visible features but is the prerequisite for all subsequent feature work. Cloud sync activation (Supabase stubs → working `useCloudSync` hook) belongs here because it requires the hook extraction infrastructure.

**Delivers:** Extracted tab components (`PlannerTab`, `WeekTab`, `ShoppingTab`, `CucinaTab`, `RicetteTab`), custom hooks (`usePlanEngine`, `useLocalStorage`, `useLearning`, `useCloudSync`), working Supabase cloud sync (multi-device plan access), `designTokens` inline CSS moved to `globals.css`.

**Addresses:** Architecture pattern — pure plan engine, layered persistence; eliminates disabled feature stubs

**Avoids:** Anti-Pattern 1 (business logic in components), Anti-Pattern 2 (direct localStorage in render), Anti-Pattern 3 (inline CSS), Anti-Pattern 5 (disabled stubs)

**Research flag:** Standard patterns — React component extraction and custom hook patterns are well-documented. No research phase needed.

### Phase 4: AI Recipe Generation Integration

**Rationale:** The static 150-recipe library is a hard scaling limit. AI generation enables unlimited recipe variety, dynamic content matching user preferences, and the leftover repurposing differentiator. This phase requires the engine hardening (Phase 1), profile (Phase 2), and decomposed architecture (Phase 3) to all be in place.

**Delivers:** OpenAI GPT-4o-mini integration via Next.js API route (secret key server-side), structured recipe schema with Zod validation, post-generation allergen validation against canonical ingredient registry (Italian bilingual), streaming/progressive loading UX, Supabase `recipes` table replacing static TS file.

**Addresses:** Must-have — reliable recipe content; should-have — leftover repurposing at plan-design level

**Avoids:** Pitfall 1 (allergen validation layer), Pitfall 3 (structured output schema, no free-text blobs), Pitfall 4 (canonical ingredient registry), Pitfall 8 (streaming UX, 30s timeout), Pitfall 9 (Italian/English allergen mismatch)

**Research flag:** NEEDS research phase. AI integration has multiple decision points: streaming implementation with Next.js App Router, structured output schema design for recipes, Zod schema for AI output validation, canonical ingredient registry data source for Italian allergens.

### Phase 5: Shopping List Enhancement and Plan Lifecycle

**Rationale:** With AI-generated content and cloud sync in place, the shopping list can be made properly robust (canonical aggregation) and the plan lifecycle can be formalized (DRAFT/ACTIVE/ARCHIVED state machine prevents silent weekly regeneration surprises).

**Delivers:** Canonical ingredient registry with unit normalization for aggregated shopping list, plan state machine (DRAFT → CONFIRMED → ACTIVE → ARCHIVED), explicit weekly regeneration flow (Sunday push notification prompt), mark-as-bought persistence across sessions.

**Addresses:** Table stakes — aggregated shopping list; differentiator — plan lifecycle UX

**Avoids:** Pitfall 4 (shopping list aggregation), Pitfall 6 (silent auto-regeneration), Pitfall 11 (offline shopping list)

**Research flag:** Standard patterns for shopping list and push notifications. No research phase needed.

### Phase 6: Differentiators and Retention Features

**Rationale:** Once the core loop (profile → plan → cook → less waste) is validated with real users, add the differentiating features that increase retention without adding onboarding friction.

**Delivers:** Push notifications (Sunday plan prompt, meal prep reminders), leftover repurposing view (plan-design level, no user meal logging), cooking skill filter, partial plan replacement (keep Mon-Wed, redo Thu-Sun), preference learning surface (show users how the app is learning their tastes).

**Addresses:** Should-have differentiators — push notifications, leftover reuse, skill filter

**Avoids:** Pitfall 5 (leftover suggestions scoped to plan-time design, no tracking required), Anti-Feature: meal logging / food tracking

**Research flag:** Standard patterns for push notifications (Web Push API + Supabase edge functions). No research phase needed.

### Phase Ordering Rationale

- **Engine first, features second:** The plan engine is the product. Building features on an untested, structurally fragile engine compounds every bug. Phase 1 resolves this before any user-facing work.
- **Profile before cloud sync:** User identity must be established (Supabase auth activated) before syncing any data. The profile is also the entry point for allergen safety — it must come before AI generation.
- **Decomposition before feature expansion:** Every new tab or major feature added to the current monolith makes it worse. Phase 3 pays down this debt at the optimal moment — after the engine is tested and the profile is wired, but before AI and new features are added.
- **AI generation as its own phase:** This is the highest-complexity integration and requires its own research phase. Isolating it prevents AI complexity from contaminating the structural refactoring work.
- **Shopping list and lifecycle together:** Both require understanding what a "current plan" means. Formalizing the plan state machine (lifecycle) and the shopping list aggregation (canonical registry) are co-dependent — they share the same data model decisions.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Derived from direct codebase analysis (`package.json`, actual source files). Existing stack is confirmed running. Additions (Zod, Vitest, OpenAI SDK) are standard choices — verify versions on npm before installing. |
| Features | MEDIUM | Table stakes are well-established across the meal planning domain. Competitive landscape assessment (Mealime, PlateJoy, Yummly) based on training data as of August 2025 — verify current app store feature sets before roadmap finalization. |
| Architecture | HIGH | Derived from direct source code analysis of all key files. Component boundaries, data flows, and build-order dependencies are verified against actual code, not inferred. |
| Pitfalls | MEDIUM-HIGH | AI hallucination for allergens (HIGH — documented LLM safety pattern), monotony from single-objective optimization (HIGH — classic multi-objective failure), recipe scaling errors (HIGH — documented LLM arithmetic weakness), onboarding drop-off (HIGH — documented mobile retention pattern). Leftover tracking complexity and Italian/English allergen mismatch are MEDIUM (logical reasoning, not externally verified). |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- **OpenAI pricing and GPT-4o-mini capability:** Training knowledge cutoff is August 2025. Verify current pricing at platform.openai.com and current structured output capabilities before Phase 4 begins.
- **Italian allergen database source:** No specific bilingual ingredient registry was identified during research. Phase 4 needs to evaluate Open Food Facts API (Italian data), Edamam API, or a curated internal list before the allergen validation layer is designed.
- **iOS PWA Web Push support:** iOS 16.4+ added Web Push for PWAs. Verify current iOS adoption rate for the target demographic before committing to push notifications as a retention mechanism in Phase 6.
- **Competitive landscape validation:** App store feature assessments (Mealime, PlateJoy) are based on training data. Cross-check current feature sets before roadmap is finalized — a competitor may have launched ingredient-sharing waste-reduction positioning since August 2025.

---

## Sources

### Primary (HIGH confidence — direct codebase analysis)

- `.planning/codebase/STACK.md` — confirmed technology versions
- `.planning/codebase/ARCHITECTURE.md` — component boundaries and data flows
- `.planning/codebase/CONCERNS.md` — known bugs and technical debt
- `.planning/codebase/STRUCTURE.md` — file layout and module relationships
- `package.json` — authoritative dependency versions

### Secondary (MEDIUM confidence — training knowledge, August 2025 cutoff)

- Meal planning app domain analysis (Mealime, PlateJoy, Yummly, Paprika, Whisk) — feature landscape and competitive positioning
- LLM structured output and reliability literature — allergen violation and scaling error patterns
- Mobile app retention research — onboarding drop-off rates, offline failure modes

### Tertiary (LOW confidence — needs validation before implementation)

- OpenAI GPT-4o-mini pricing — verify at platform.openai.com before Phase 4
- Italian ingredient database sources — evaluate Open Food Facts, Edamam before Phase 4 allergen layer design
- iOS PWA Web Push adoption rates — verify before committing to push notification Phase 6

---

*Research completed: 2026-03-19*
*Ready for roadmap: yes*

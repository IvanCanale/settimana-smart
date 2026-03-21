---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: unknown
stopped_at: "Checkpoint reached: Task 3 of 04-04-PLAN.md (human-verify pending)"
last_updated: "2026-03-21T19:35:22.455Z"
progress:
  total_phases: 6
  completed_phases: 4
  total_plans: 10
  completed_plans: 10
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-19)

**Core value:** L'utente apre l'app a inizio settimana e trova già tutto deciso — cosa mangiare, come prepararlo, cosa comprare — senza sprechi e senza pensieri.
**Current focus:** Phase 04 — ai-recipe-generation

## Current Position

Phase: 04 (ai-recipe-generation) — EXECUTING
Plan: 4 of 4

## Performance Metrics

**Velocity:**

- Total plans completed: 2
- Average duration: 30 min
- Total execution time: 1 hour

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation-hardening | 2 | 60 min | 30 min |

**Recent Trend:**

- Last 5 plans: 15 min, 45 min
- Trend: -

*Updated after each plan completion*
| Phase 02-auth-and-onboarding P01 | 3 | 2 tasks | 3 files |
| Phase 03-engine-hardening-and-cloud-sync P01 | 3 | 2 tasks | 4 files |
| Phase 03-engine-hardening-and-cloud-sync P02 | 3 | 1 tasks | 4 files |
| Phase 04-ai-recipe-generation P01 | 3 | 2 tasks | 7 files |
| Phase 04-ai-recipe-generation P02 | 5 | 3 tasks | 5 files |
| Phase 04-ai-recipe-generation P03 | 3 | 2 tasks | 2 files |
| Phase 04-ai-recipe-generation P04 | 4 | 2 tasks | 6 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: Brownfield confirmed — evolve existing codebase, no rewrite
- [Phase 1]: Monolith decomposition and test coverage before any feature work — zero test coverage on `planEngine.ts` is highest-risk item
- [Phase 3]: Allergen validation layer is deterministic, never delegated to LLM — safety-critical constraint
- [Phase 4]: OpenAI GPT-4o-mini for recipe generation; verify pricing before Phase 4 begins (knowledge cutoff August 2025)
- [01-01]: Vitest node environment for planEngine unit tests — no DOM needed, faster execution
- [01-01]: coniglio classified as MEAT only — removed from POULTRY_INGREDIENTS (was causing 2/3 rotation exclusion bug)
- [01-01]: Budget scoring via ingredient count proxy in scoreCandidate — budget<=30 penalizes >5 ingredients, budget<=50 penalizes >7
- [01-02]: Tab components receive props from orchestrator (no context/store) — keeps data flow explicit and traceable
- [01-02]: useLocalStorage<T> uses spread merge for objects, direct parse for primitives — handles both preferences (object) and seed (number)
- [01-02]: ErrorBoundary clears all 5 localStorage keys on reload — prevents corrupted-state crash loops
- [01-02]: FreezeToast auto-dismisses after 8 seconds (non-blocking window.alert replacement)
- [01-02]: Google Fonts via link tag in layout.tsx head, not @import in CSS — avoids render-blocking
- [Phase 02-auth-and-onboarding]: OnboardingFlow sbClient passed as prop not via useAuth hook — keeps component portable and prop interface explicit
- [Phase 02-auth-and-onboarding]: Dynamic import of supabase.ts in migration useEffect — avoids bundling Supabase for anonymous users
- [02-02]: Auth UI removed from AppHeader entirely — now lives exclusively in ProfileDrawer to avoid duplication
- [02-02]: exclusions[] and exclusionsText merged in usePlanEngine — allergen chips were previously ignored by the plan engine (safety-critical fix)
- [02-02]: useLocalStorage spread merge restricted to plain objects — Array.isArray guard prevents arrays being converted to objects on reload
- [02-02]: Allergen→ingredient keyword map added to usePlanEngine — deterministic EU allergen coverage, precursor to Phase 3 validation layer
- [Phase 03-01]: ALLERGEN_INGREDIENT_MAP moved to module scope — only recipeContainsAllergen and validateAllergenSafety exported
- [Phase 03-01]: Hard protein-category filter in pickRecipe primary filter AND relaxed fallback — soft penalty retained for scoring bias
- [Phase 03-01]: Allergen retry loop fast path: skip retry when exclusions is empty
- [Phase 03-engine-hardening-and-cloud-sync]: cloudSync passed as optional param to usePlanEngine — backward-compatible, no-op for anonymous users
- [Phase 03-engine-hardening-and-cloud-sync]: local-wins-always: load-on-mount skips hydration if ss_seed_v1 exists in localStorage
- [Phase 04-ai-recipe-generation]: source_url required in AIRecipeSchema (z.string().url()) — rejects hallucinated recipes without verifiable Italian source
- [Phase 04-ai-recipe-generation]: fetchRecipes selects explicit columns not * — prevents extra DB fields leaking into Recipe type via rowToRecipe
- [Phase 04-ai-recipe-generation]: normalizeRecipeTitle uses NFD normalize + combining-char strip — client mirror of DB GENERATED ALWAYS column for consistent dedup
- [Phase 04-ai-recipe-generation]: buildPlan recipesOverride is optional — backward-compatible, no existing callers modified
- [Phase 04-ai-recipe-generation]: useState(RECIPE_LIBRARY) as initial recipes state — eliminates blank state before Supabase fetch
- [Phase 04-ai-recipe-generation]: Per-file jsdom env via // @vitest-environment jsdom — preserves node env for planEngine tests
- [04-03]: validateParsedRecipe() uses source_url.startsWith("http") — sufficient hallucination rejection gate before insert
- [04-03]: buildDietArray() vegana->3 tags (vegana+vegetariana+mediterranea), vegetariana->2, onnivora->2 — mirrors static recipe conventions
- [04-03]: Edge Function uses direct fetch to api.openai.com/v1/responses — avoids Deno npm compatibility issues with OpenAI SDK
- [04-03]: Notification inserted only when totalInserted > 0 — avoids noise from empty/failed runs
- [Phase 04-04]: ricette-nuove is a virtual tab activated only via notification click — avoids polluting main nav with contextual view
- [Phase 04-04]: markAllRead called on bell open (not on click) — optimistic unread badge clear
- [Phase 04-04]: WishlistButton internal showConfirm state — 2s confirmation logic contained within sub-component

### Pending Todos

None yet.

### Blockers/Concerns

- [Phase 4]: Italian allergen database source not identified — evaluate Open Food Facts API or curated internal list before Phase 4 planning begins
- [Phase 6]: iOS PWA Web Push adoption rate for target demographic needs validation before committing push notifications as retention mechanism

## Session Continuity

Last session: 2026-03-21T19:35:22.451Z
Stopped at: Checkpoint reached: Task 3 of 04-04-PLAN.md (human-verify pending)
Resume file: None

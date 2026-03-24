---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: unknown
stopped_at: Completed 08-01-PLAN.md
last_updated: "2026-03-22T00:07:44.957Z"
progress:
  total_phases: 8
  completed_phases: 7
  total_plans: 21
  completed_plans: 20
  percent: 94
---

---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: unknown
stopped_at: Completed 06-01-PLAN.md
last_updated: "2026-03-21T22:19:00.000Z"
progress:
  [█████████░] 94%
  completed_phases: 5
  total_plans: 17
  completed_plans: 15
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-19)

**Core value:** L'utente apre l'app a inizio settimana e trova già tutto deciso — cosa mangiare, come prepararlo, cosa comprare — senza sprechi e senza pensieri.
**Current focus:** Phase 07 — account-management

## Current Position

Phase: 07 (account-management) — EXECUTING
Plan: 1 of 2

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
| Phase 05 P01 | 10 | 2 tasks | 5 files |
| Phase 05 P02 | 8 | 2 tasks | 3 files |
| Phase 05 P03 | 4 | 2 tasks | 5 files |
| Phase 05 P04 | 15 | 2 tasks | 4 files |
| Phase 06-notifications P02 | 3 | 2 tasks | 6 files |
| Phase 06-notifications P03 | 20 | 3 tasks | 2 files |
| Phase 07 P01 | 2 | 2 tasks | 2 files |
| Phase 07 P02 | 3 | 2 tasks | 1 files |
| Phase 08 P01 | 5 | 2 tasks | 2 files |

## Accumulated Context

### Roadmap Evolution

- Phase 7 added: Account Management — eliminazione account, export dati GDPR, reset preferenze, pagina profilo
- Phase 8 added: Legal — Privacy Policy, Terms of Service, consenso esplicito al signup
- Phase 9 added: Abbonamenti e pagamenti — Stripe, trial 14gg, Piano Base €4,99, Piano Pro €7,99, feature gating

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
- [04-04]: onToggleWishlist receives full Recipe object — planEngine can include wishlisted recipes even if absent from Supabase fetch
- [04-04]: Allergen check never bypassed for wishlisted recipes — food safety hard constraint regardless of user wishlist preference
- [04-04]: maxTime warning badge on recipe cards — user sees when wishlisted recipe exceeds their configured time limit
- [Phase 05-01]: getISOWeekYear from date-fns used (not getFullYear) to handle ISO year boundaries correctly
- [Phase 05-01]: ISO week string format YYYY-WNN enables lexicographic comparison for isWeekExpired without parsing
- [Phase 05-01]: Migration 003 drops weekly_plan_user_id_key and adds composite UNIQUE (user_id, week_iso) for multi-week plan support
- [Phase 05-02]: CANONICAL_INGREDIENT map in planEngine.ts collapses Italian ingredient variants as aggregateShopping key; canonicalizeName fallback to normalize for unknown names
- [Phase 05-02]: checkedShoppingItems stored as string[] under ss_checked_shopping_v1 — Set not JSON-serializable; reconstructed with useMemo; wrapper accepts both direct Set and updater function
- [Phase 05-03]: saveWeeklyPlan onConflict changed to user_id, week_iso — prevents current week plan being overwritten when next week is saved
- [Phase 05-03]: useWeeklyPlans does NOT replace usePlanEngine — manages which week is active; only active week runs through usePlanEngine
- [Phase 05-03]: feedbackNote appended to exclusionsText at regenerate() time — simple, reversible, no NLP needed
- [Phase 05-04]: recipes prop threads from usePlanEngine return through page.tsx to WeekTab — explicit prop-based data flow, no context/store
- [Phase 05-04]: recipeContainsAllergen replaces manual string-includes check in regenerateSingleMeal — unified allergen logic, same map as buildPlan
- [Phase 05-04]: Avanzi badge applied in both mealsPerDay rendering paths (dinner-only and lunch+dinner) for consistent leftover labeling
- [06-01]: shoppingDay?, shoppingNotificationTime?, timezone? added as optional fields to Preferences — backward-compatible, no existing consumers affected
- [06-01]: Timezone auto-detected via Intl.DateTimeFormat().resolvedOptions().timeZone in ProfileDrawer useEffect — stored in preferences for Edge Function use in Plans 02/03
- [06-01]: Notification time input only rendered when shoppingDay !== undefined — avoids orphaned time preference with no shopping day context
- [Phase 06-02]: SW cache bumped to v2 to force push handler installation on existing browser sessions
- [Phase 06-02]: SUPABASE_SERVICE_ROLE_KEY used in push server actions — runs server-side, bypasses RLS for subscription upsert
- [Phase 06-02]: NotificationPrompt shown only after shopping day set and user logged in — contextual prompt avoids onboarding friction
- [Phase 06-03]: web-push npm package does NOT run in Deno — VAPID JWT built with Web Crypto API (crypto.subtle.sign) directly
- [Phase 06-03]: Two-query pattern for push_subscriptions + preferences: no direct FK between tables, PostgREST embedded join unavailable
- [Phase 06-03]: 410 Gone from push service triggers automatic deletion of expired subscription from push_subscriptions
- [Phase 07-01]: delete-account validates JWT with anon client before using admin client — defense in depth
- [Phase 07-01]: notifications table skipped in deletion — shared global catalog with no user_id column
- [Phase 07-01]: exportUserData exports endpoint+created_at only from push_subscriptions — private keys excluded from GDPR export
- [Phase 07-02]: [07-02]: Both tasks implemented in single atomic pass — state declarations and handler functions are interleaved in one component, single commit is cohesive
- [Phase 07-02]: [07-02]: defaultPrefs prop accepts Preferences from page.tsx; fallback hardcoded inline in handleReset for cases where defaultPrefs not passed

### Pending Todos

None yet.

### Blockers/Concerns

- [Phase 4]: Italian allergen database source not identified — evaluate Open Food Facts API or curated internal list before Phase 4 planning begins
- [Phase 6]: iOS PWA Web Push adoption rate for target demographic needs validation before committing push notifications as retention mechanism

## Session Continuity

Last session: 2026-03-22T00:07:44.953Z
Stopped at: Completed 08-01-PLAN.md
Resume file: None

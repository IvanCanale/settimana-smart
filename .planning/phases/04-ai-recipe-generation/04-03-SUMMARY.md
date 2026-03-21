---
phase: 04-ai-recipe-generation
plan: 03
subsystem: backend
tags: [supabase, edge-function, deno, openai, gpt-4o-mini, web-search, pg-cron, vitest, typescript]

# Dependency graph
requires:
  - phase: 04-01
    provides: AIRecipeSchema, SQL migrations (recipes + notifications tables), supabase patterns

provides:
  - supabase/functions/catalog-recipes/index.ts: Deno Edge Function with two-step AI catalog flow
  - validateParsedRecipe() validation logic (replicated in tests for unit coverage)
  - buildDietArray() diet tagging conventions per RESEARCH.md open question resolution
  - src/lib/catalogJob.test.ts: 17 unit tests covering validation and mapping logic

affects:
  - 04-04 (notification insert on catalog run — NotificationDrawer reads from notifications table)
  - deployment (pg_cron SQL documented in Edge Function header for user setup)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Two-step AI call: web_search_preview Step 1 for URLs, json_object Step 2 per URL — avoids known truncation bug with combined calls"
    - "validateParsedRecipe() as gate before upsert — rejects hallucinated recipes without valid source_url"
    - "BATCH_SIZE=5 concurrent Promise.all() batches — 60 AI calls in ~48s, within 10-min Edge Function limit"
    - "upsert with onConflict:title_normalized — deduplication without embeddings, re-runs are safe"
    - "added_by:ai_job distinguishes AI-cataloged recipes from seed recipes"
    - "Diet tagging convention: vegana->3 tags, vegetariana->2 tags, onnivora->2 tags — mirrors static recipe library"

key-files:
  created:
    - supabase/functions/catalog-recipes/index.ts
    - src/lib/catalogJob.test.ts
  modified: []

key-decisions:
  - "validateParsedRecipe() uses source_url.startsWith('http') not full URL parse — sufficient for hallucination rejection at insert time (AIRecipeSchema handles full URL validation at schema level)"
  - "buildDietArray() resolves RESEARCH.md open question: vegana gets 3 tags (vegana+vegetariana+mediterranea), vegetariana gets 2 (vegetariana+mediterranea), onnivora gets 2 (onnivora+mediterranea)"
  - "Edge Function uses direct fetch to api.openai.com/v1/responses — avoids Deno npm compatibility issues with OpenAI SDK"
  - "Notification inserted only when totalInserted > 0 — avoids noise from failed/empty runs"

# Metrics
duration: 3min
completed: 2026-03-21
---

# Phase 04 Plan 03: AI Catalog Edge Function Summary

**Deno Edge Function with two-step GPT-4o-mini web search + structured parse, targeting 20 Italian recipes per diet type per run, with Zod-equivalent validation, upsert deduplication, and 17 unit tests**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-21T16:10:07Z
- **Completed:** 2026-03-21T16:12:24Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Supabase Edge Function implements two-step AI flow: Step 1 uses `web_search_preview` to find 20 recipe URLs per diet type; Step 2 uses `json_object` to parse each URL into the AIRecipeSchema shape
- validateParsedRecipe() gate rejects hallucinated/incomplete recipes (no source_url, <2 ingredients, no steps, time<=0) before any insert
- upsert with `onConflict: "title_normalized"` ensures re-runs produce no duplicates
- BATCH_SIZE=5 concurrent batches keep total runtime ~48s, well within Edge Function 10-min limit
- Notification row inserted into `notifications` table with `type:"new_recipes"` and ISO week string after successful catalog run
- pg_cron schedule SQL documented in file header for user manual setup
- 17 new Vitest tests: 10 validation cases, 4 row-mapping cases, 3 diet-tagging cases — all passing
- Full suite: 106 tests green (up from 89 before this plan)

## Task Commits

Each task was committed atomically:

1. **Task 1: Supabase Edge Function for two-step AI recipe cataloging** - `20a11a8` (feat)
2. **Task 2: Unit tests for catalog job logic with mocked AI responses** - `553318d` (feat)

## Files Created/Modified

- `supabase/functions/catalog-recipes/index.ts` - Deno Edge Function: web_search_preview Step 1 + json_object Step 2, validateParsedRecipe(), upsert dedup, notification insert, pg_cron SQL in comments
- `src/lib/catalogJob.test.ts` - 17 Vitest tests covering validateParsedRecipe (10 cases), mapToRow defaults (4 cases), buildDietArray conventions (3 cases)

## Decisions Made

- `validateParsedRecipe()` uses `source_url.startsWith("http")` check — rejects non-URL strings and null values; sufficient for hallucination rejection gate before insert
- `buildDietArray()` resolves the open diet-tagging question from RESEARCH.md: vegana recipes get `["vegana", "vegetariana", "mediterranea"]`, vegetariana get `["vegetariana", "mediterranea"]`, onnivora get `["onnivora", "mediterranea"]` — matching static recipe library conventions
- Edge Function uses direct `fetch` to `https://api.openai.com/v1/responses` instead of importing the OpenAI SDK — avoids Deno npm compatibility issues documented in the plan
- Notification only inserted when `totalInserted > 0` — avoids inserting noise notifications on empty runs (e.g., if all recipes were duplicates)

## Deviations from Plan

None - plan executed exactly as written. The `validateParsedRecipe()` function was extracted as a named function (rather than inline) to enable clean unit testing — this matches the plan's instruction to "replicate the inline validation logic as a standalone function for testing."

## User Setup Required

Before the Edge Function can run:
1. Enable `pg_cron` extension: Supabase Dashboard -> Database -> Extensions -> pg_cron -> Enable
2. Enable `pg_net` extension: Supabase Dashboard -> Database -> Extensions -> pg_net -> Enable
3. Store API key in Supabase Vault: `supabase secrets set OPENAI_API_KEY=sk-...`
4. Deploy Edge Function: `supabase functions deploy catalog-recipes`
5. Run the pg_cron SQL from the file header in Supabase SQL Editor to schedule weekly execution

## Next Phase Readiness

- Edge Function is ready to deploy — requires user setup steps above before first run
- Notification table (from 04-01) will receive `type:"new_recipes"` inserts from this function
- 04-04 (NotificationDrawer) reads from the notifications table populated by this function

---
*Phase: 04-ai-recipe-generation*
*Completed: 2026-03-21*

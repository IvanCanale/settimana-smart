---
phase: 04-ai-recipe-generation
plan: 01
subsystem: database
tags: [zod, supabase, postgres, rls, vitest, typescript]

# Dependency graph
requires:
  - phase: 03-engine-hardening-and-cloud-sync
    provides: supabase.ts pattern (SupabaseClient as param), existing test infra (Vitest), Recipe/RecipeIngredient types

provides:
  - AIRecipeSchema Zod validator for AI-parsed recipe objects
  - RecipeIngredientSchema Zod validator
  - normalizeRecipeTitle() for client-side deduplication matching
  - rowToRecipe() DB row to Recipe type mapper
  - fetchRecipes() Supabase query returning Recipe[] via rowToRecipe
  - fetchNotifications() Supabase query returning AppNotification[]
  - markNotificationRead() Supabase update helper
  - SQL migrations for recipes table (RLS, GIN index, title_normalized dedup)
  - SQL migrations for notifications table (RLS)
  - seed-recipes.ts one-time migration script for RECIPE_LIBRARY

affects:
  - 04-02 (catalog job uses AIRecipeSchema to validate AI output before insert)
  - 04-03 (usePlanEngine replaces RECIPE_LIBRARY with fetchRecipes())
  - 04-04 (NotificationDrawer uses fetchNotifications())

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Zod schema enforced on every recipe before DB insert — AIRecipeSchema.parse() or throw"
    - "rowToRecipe() maps DB snake_case to Recipe type, explicitly drops non-Recipe DB fields"
    - "fetchRecipes/fetchNotifications follow existing SupabaseClient-as-param pattern from supabase.ts"
    - "Seed script uses upsert with onConflict:title_normalized — idempotent, safe to re-run"

key-files:
  created:
    - src/lib/recipeSchema.ts
    - src/lib/recipeSchema.test.ts
    - src/lib/supabase.test.ts
    - supabase/migrations/001_create_recipes.sql
    - supabase/migrations/002_create_notifications.sql
    - scripts/seed-recipes.ts
  modified:
    - src/lib/supabase.ts

key-decisions:
  - "AIRecipeSchema requires source_url (z.string().url()) — rejects hallucinated recipes without verifiable Italian source"
  - "rowToRecipe() drops estimated_cost, protein_category, source_url, added_by, created_at, title_normalized — Recipe type has no extra fields"
  - "normalizeRecipeTitle() uses NFD normalize + /[\\u0300-\\u036f]/g strip — client-side mirror of DB GENERATED ALWAYS column"
  - "fetchRecipes selects only Recipe fields (not *) — prevents extra DB fields leaking into Recipe type"
  - "Seed script uses onConflict:title_normalized — idempotent upsert safe for re-runs"

patterns-established:
  - "Pattern: Zod validates before insert — AIRecipeSchema.parse() is the gate for all AI output"
  - "Pattern: rowToRecipe() always explicit field mapping — never spread DB row into Recipe type"
  - "Pattern: fetchRecipes/fetchNotifications follow client-as-param pattern from existing supabase.ts"

requirements-completed: [RECIPES-01, RECIPES-02, RECIPES-03]

# Metrics
duration: 3min
completed: 2026-03-21
---

# Phase 04 Plan 01: Data Foundation Summary

**Zod schema + rowToRecipe mapping + fetchRecipes/fetchNotifications query functions + SQL migrations + seed script for shared Supabase recipes catalog**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-21T15:55:48Z
- **Completed:** 2026-03-21T15:59:00Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- AIRecipeSchema validates all recipe fields before DB insert — rejects missing source_url, empty ingredients, invalid diet enum, short titles
- rowToRecipe() cleanly maps DB rows to Recipe type with no extra fields leaking through
- SQL migrations define recipes table with RLS, GIN index on diet[], and title_normalized dedup constraint
- fetchRecipes() and fetchNotifications() follow existing SupabaseClient-as-param pattern
- Seed script upserts all RECIPE_LIBRARY entries in batches of 50 with idempotent onConflict dedup
- 28 new Vitest tests (21 schema + 7 supabase), full suite 82 tests green

## Task Commits

Each task was committed atomically:

1. **Task 1: Zod recipe schema, rowToRecipe mapping, and unit tests** - `69885ca` (feat)
2. **Task 2: SQL migrations, fetchRecipes(), fetchNotifications(), and seed script** - `1d113dc` (feat)

## Files Created/Modified
- `src/lib/recipeSchema.ts` - AIRecipeSchema, RecipeIngredientSchema, normalizeRecipeTitle(), rowToRecipe()
- `src/lib/recipeSchema.test.ts` - 21 Vitest tests covering all schema validation behaviors and rowToRecipe mapping
- `src/lib/supabase.ts` - Added fetchRecipes(), fetchNotifications(), markNotificationRead(), AppNotification type
- `src/lib/supabase.test.ts` - 7 Vitest tests for fetchRecipes (mapping, null, error) and fetchNotifications
- `supabase/migrations/001_create_recipes.sql` - recipes table with RLS, GIN diet index, title_normalized UNIQUE
- `supabase/migrations/002_create_notifications.sql` - notifications table with RLS
- `scripts/seed-recipes.ts` - Upserts RECIPE_LIBRARY in batches of 50 with onConflict:title_normalized

## Decisions Made
- `source_url` is REQUIRED in AIRecipeSchema (z.string().url()) — ensures every AI recipe has a verifiable Italian source per RESEARCH.md anti-hallucination strategy
- fetchRecipes uses explicit column selection (`id, title, diet, ...`) instead of `*` — prevents extra DB fields from leaking into the Recipe type through rowToRecipe
- normalizeRecipeTitle() uses NFD normalize then strip combining chars — exact client-side mirror of the DB GENERATED ALWAYS column for consistent dedup
- Seed script uses `onConflict: "title_normalized"` — safe to re-run without creating duplicates

## Deviations from Plan

None - plan executed exactly as written. One minor test fix: the initial test for "steps shorter than 10 chars" used "Too short." (exactly 10 chars, passes min(10)). Fixed test strings to 7-char steps that correctly fail validation. This was a test correctness fix, not a schema change.

## Issues Encountered
- Test for min(10) step length: "Too short." is exactly 10 characters, so it passes min(10) as expected. Fixed test to use 7-char strings ("Step 1.") that are actually below the minimum. No schema change needed.

## User Setup Required
None - SQL migrations must be run manually against the Supabase project before the app reads from the recipes table. The seed script (scripts/seed-recipes.ts) requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.

## Next Phase Readiness
- recipeSchema.ts is ready for the catalog job (04-02) to import AIRecipeSchema
- fetchRecipes() is ready for usePlanEngine (04-03) to replace RECIPE_LIBRARY
- fetchNotifications() is ready for NotificationDrawer (04-04)
- SQL migrations must be applied to the Supabase project before 04-03 is testable end-to-end

---
*Phase: 04-ai-recipe-generation*
*Completed: 2026-03-21*

# Phase 4: AI Recipe Generation (Catalog Enrichment) - Research

**Researched:** 2026-03-21
**Domain:** Supabase Edge Functions + pg_cron, OpenAI Responses API web search, shared catalog data model, in-app notification UX
**Confidence:** HIGH (architecture well-supported by official docs; one MEDIUM area noted below)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- AI does NOT generate recipes on-demand. AI acts as researcher/cataloger: finds real Italian recipes online via web search, structures them, saves to Supabase.
- `buildPlan()` remains unchanged — it will read from the Supabase `recipes` table instead of `RECIPE_LIBRARY` in `recipes.ts`.
- Weekly background job: 20 recipes per diet type per run (vegana, vegetariana, onnivora) via GPT-4o-mini + web search on Italian cooking sites.
- Single shared Supabase `recipes` table — all users benefit from every catalog run.
- 200 static recipes from `recipes.ts` become the initial seed — ALL migrated to Supabase before the AI job activates.
- `recipes.ts` is deprecated as a runtime data source after migration.
- Deduplication via normalized name (lowercase, no accents, trim) — no embeddings.
- Allergen validation: `validateAllergenSafety()` remains deterministic, applied unchanged at plan selection time.
- Notification UX: bell icon in AppHeader → NotificationDrawer → "Nuove Ricette" page → wishlist for next week's plan.
- Target Italian cooking sites: Giallo Zafferano, Cucchiaio d'Argento, La Cucina Italiana.

### Claude's Discretion

- Precise SQL schema for `recipes` table (indices, RLS policy, additional columns).
- Job structure: Supabase Edge Function (invoked by pg_cron) vs Node script vs API route.
- Name normalization logic for deduplication.
- Exact count of seed recipes to migrate (migrate all ~200).

### Deferred Ideas (OUT OF SCOPE)

- Push notification OS-level (Phase 6).
- Recipe ratings / "non rifarla" feedback (Phase 5 or v2 backlog).
- Seasonal recipe filtering (v2 backlog).
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| RECIPES-01 | Recipes are generated/sourced by AI (GPT-4o-mini) personalised on user preferences | Background catalog job with GPT-4o-mini + web search; `fetchRecipes()` in `usePlanEngine` applies user preferences at selection time |
| RECIPES-02 | Recipes respect Italian cuisine and are realistic (sourced from verified existing recipes, not invented) | AI does web search on authoritative Italian sites (Giallo Zafferano etc.) and stores `source_url` for provenance; `added_by` distinguishes seed vs AI |
| RECIPES-03 | Every recipe follows a structured schema: ingredients with qty/unit, preparation steps, estimated time | Zod schema enforced on every AI response before DB insert; schema maps directly to existing `Recipe` type in `src/types/index.ts` |
| RECIPES-04 | Generated recipes are validated post-generation for allergens/intolerances before shown to user | `validateAllergenSafety()` already exported from `planEngine.ts` — applied identically when reading from Supabase; no logic change |
</phase_requirements>

---

## Summary

Phase 4 replaces the static `RECIPE_LIBRARY` import with a shared Supabase `recipes` table, enriched weekly by a background AI job. The AI job is a Supabase Edge Function (TypeScript/Deno) invoked on a weekly pg_cron schedule, which calls GPT-4o-mini with the web search tool to research and structure real Italian recipes. A one-time seed migration moves all 200 existing recipes into Supabase before the job activates.

The plan engine (`buildPlan`) is unchanged. The only modification to the data layer is in `usePlanEngine.ts`: replace the `RECIPE_LIBRARY` import with an async `fetchRecipes()` call that queries Supabase. Allergen safety is unchanged — `validateAllergenSafety()` runs on the fetched array exactly as it does today on the static array.

The in-app notification center is a purely frontend addition: a bell icon in `AppHeader` opens a `NotificationDrawer`, which reads from a `notifications` table in Supabase populated by the weekly job. Clicking a notification navigates to a "Nuove Ricette" discovery page where users can wishlist recipes for prioritisation in next week's plan.

**Primary recommendation:** Deploy the catalog job as a Supabase Edge Function invoked by pg_cron (native Supabase pattern, no extra infra, secrets stored in Supabase Vault). Use a two-step AI call: first web search to retrieve recipe URLs, then a second structured-output call to parse each recipe into the Zod schema — this avoids the known reliability issue of combining web search and complex structured output in a single call.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/supabase-js` | 2.49.4 (already installed) | Database reads, notifications table | Already used in project |
| OpenAI SDK (Deno import) | `https://deno.land/x/openai@v4.24.0/mod.ts` | GPT-4o-mini API calls from Edge Function | Official Supabase pattern for Edge Functions |
| Zod | bundled in project (already installed) | Validate AI-parsed recipe before DB insert | Already used in project for LLM output validation |
| pg_cron (Supabase module) | built-in | Weekly schedule for catalog job | Native Supabase scheduler, no external infra |
| `lucide-react` | 0.487.0 (already installed) | Bell icon (`Bell`, `BellDot`) for notification UI | Already in project dependencies |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Supabase Vault | built-in | Store `OPENAI_API_KEY` secret | Required — never hardcode API keys in Edge Function |
| `pg_net` | built-in | HTTP calls from pg_cron to Edge Function | Needed if triggering Edge Function via SQL cron job |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Supabase Edge Function + pg_cron | Next.js API route + external cron (Vercel Cron, GitHub Actions) | Edge Function is self-contained in existing infra; no new services needed |
| Two-step AI call (search then parse) | Single call with web_search + structured output | Single-call approach has known reliability issues (JSON truncation with complex schemas) |
| Zod for recipe validation | Manual type guards | Zod already used in project — consistent pattern |

**Installation:** No new npm packages required. Deno imports handled natively inside Edge Function.

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── lib/
│   ├── planEngine.ts        # unchanged
│   ├── supabase.ts          # add fetchRecipes(), fetchNotifications(), markNotificationRead()
│   └── recipeSchema.ts      # NEW: Zod schema for AI-parsed recipe (shared with seed migration)
├── hooks/
│   └── usePlanEngine.ts     # swap RECIPE_LIBRARY for await fetchRecipes()
│   └── useNotifications.ts  # NEW: poll/read notifications from Supabase
├── components/
│   ├── AppHeader.tsx         # add bell icon button
│   ├── NotificationDrawer.tsx # NEW: slide-in panel
│   └── NuoveRicettePage.tsx  # NEW: discovery page, wishlist
supabase/
├── functions/
│   └── catalog-recipes/
│       └── index.ts         # Edge Function: AI job
├── migrations/
│   ├── 001_create_recipes.sql
│   ├── 002_seed_recipes.sql
│   └── 003_create_notifications.sql
scripts/
└── seed-recipes.ts          # One-time migration script (Node)
```

### Pattern 1: Two-Step AI Recipe Cataloging

**What:** First call uses GPT-4o-mini with `web_search` tool to find recipe URLs on target sites. Second call (one per URL) uses GPT-4o-mini with structured output to parse the recipe into the schema.

**When to use:** When combining web search and complex JSON output in a single call is unreliable (known OpenAI issue with truncated responses).

**Example:**
```typescript
// Source: https://platform.openai.com/docs/guides/tools-web-search
// Step 1 — find URLs
const searchResponse = await openai.responses.create({
  model: "gpt-4o-mini",
  tools: [{ type: "web_search_preview" }],
  input: `Trova 5 ricette ${dietType} italiane su giallozafferano.it o cucchiaio.it.
          Elenca solo i titoli e gli URL delle ricette trovate, in JSON:
          {"recipes": [{"title": "...", "url": "..."}]}`,
});

// Step 2 — parse each URL into schema
const parseResponse = await openai.responses.create({
  model: "gpt-4o-mini",
  input: `Leggi la ricetta all'URL ${url} e restituisci un JSON con questo schema:
          title, ingredients (array di {name, qty, unit, category}), steps, prepTime,
          difficulty (1|2|3), estimatedCost, proteinCategory, dietType, source_url`,
  text: {
    format: { type: "json_schema", schema: RecipeZodSchema }
  }
});
```

### Pattern 2: Supabase `recipes` Table Schema

```sql
-- Source: https://supabase.com/docs/guides/database/postgres/row-level-security
CREATE TABLE recipes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  title_normalized TEXT GENERATED ALWAYS AS (
    lower(translate(title, 'àáâãäèéêëìíîïòóôõöùúûüý', 'aaaaaeeeeiiiioooooouuuuy'))
  ) STORED,
  diet          TEXT[] NOT NULL,          -- ["vegana","vegetariana","onnivora"]
  tags          TEXT[] DEFAULT '{}',
  time          INTEGER NOT NULL,          -- prepTime in minutes (maps to Recipe.time)
  difficulty    TEXT NOT NULL,             -- "beginner" | "intermediate" (maps to Skill type)
  servings      INTEGER NOT NULL DEFAULT 2,
  ingredients   JSONB NOT NULL,           -- RecipeIngredient[]
  steps         TEXT[] NOT NULL,
  estimated_cost NUMERIC(5,2),
  protein_category TEXT,                  -- "carne"|"pesce"|"legumi"|"uova"|"latticini"|"vegano"
  source_url    TEXT,
  added_by      TEXT NOT NULL DEFAULT 'seed', -- 'seed' | 'ai_job'
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(title_normalized)                -- deduplication constraint
);

-- RLS: public read (shared catalog), service-role write only
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON recipes FOR SELECT TO anon, authenticated USING (true);
-- No INSERT/UPDATE policy = only service role key (used by Edge Function) can write

-- Indexes
CREATE INDEX idx_recipes_diet  ON recipes USING GIN(diet);
CREATE INDEX idx_recipes_added_at ON recipes(created_at DESC);
```

### Pattern 3: `fetchRecipes()` in `supabase.ts`

```typescript
// Source: existing supabase.ts pattern
export async function fetchRecipes(client: SupabaseClient): Promise<Recipe[]> {
  const { data, error } = await client
    .from("recipes")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToRecipe);   // rowToRecipe: DB row → Recipe type
}
```

### Pattern 4: pg_cron Weekly Schedule

```sql
-- Source: https://supabase.com/docs/guides/functions/schedule-functions
SELECT cron.schedule(
  'weekly-catalog-enrichment',
  '0 3 * * 1',   -- every Monday at 03:00 UTC
  $$
  SELECT net.http_post(
    url    := 'https://<project-ref>.supabase.co/functions/v1/catalog-recipes',
    body   := '{"run": true}'::jsonb,
    headers := '{"Authorization": "Bearer <service_role_key>"}'::jsonb
  );
  $$
);
```

### Pattern 5: Notification Table + Drawer

```sql
CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type        TEXT NOT NULL,        -- 'new_recipes'
  payload     JSONB NOT NULL,       -- {"count": 20, "week": "2026-W12"}
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  read        BOOLEAN DEFAULT FALSE
);
-- Public read (no user_id — single shared notification feed)
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON notifications FOR SELECT TO anon, authenticated USING (true);
```

### Recipe Wishlist Pattern

The wishlist is per-user and stored in the existing `preferences` JSONB column in Supabase (or a new `recipe_wishlist` table). `buildPlan()` receives a `wishedRecipeIds: string[]` parameter and boosts their score in `scoreRecipe()` — a minimal, targeted change.

### Anti-Patterns to Avoid

- **Single AI call for search + structured output:** Known truncation bug when web search and complex JSON schema are combined. Always separate into two calls.
- **Storing OPENAI_API_KEY in Edge Function code:** Use Supabase Vault (`supabase secrets set OPENAI_API_KEY=...`), accessed via `Deno.env.get('OPENAI_API_KEY')`.
- **Using `anon` key for writes in the Edge Function:** The Edge Function must use the `service_role` key to bypass RLS and insert into `recipes`.
- **Importing `RECIPE_LIBRARY` from `recipes.ts` anywhere after migration:** After seed is confirmed, all imports must point to `fetchRecipes()`. The file should remain as archive/reference only, not imported.
- **Blocking `usePlanEngine` on recipe fetch without cache:** Fetch must be async with a loading state and localStorage cache fallback — the existing `useLocalStorage` pattern applies here.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Weekly job scheduling | Custom cron server, GitHub Actions | Supabase pg_cron + Edge Function | Native, no extra infra, monitored in Supabase dashboard |
| Secure secret storage | Env vars in code | Supabase Vault | API key rotation, audit trail |
| Italian text normalization | Custom accent-stripping | Postgres `translate()` in GENERATED column | Database-native, zero app code, indexed |
| JSON schema enforcement on AI output | Manual key-checking | Zod (already in project) | Already established pattern in codebase |
| Deduplication | Embedding similarity search | `UNIQUE(title_normalized)` constraint | Zero overhead, deterministic, sufficient for obvious duplicates |

**Key insight:** The catalog approach means the AI's unreliability is absorbed at cataloging time, not plan generation time. Every recipe in the DB has already been validated — the user never waits for AI.

---

## Common Pitfalls

### Pitfall 1: Web Search + Structured Output Combined in One Call

**What goes wrong:** GPT-4o-mini with `web_search_preview` tool AND a complex JSON schema in the same call frequently truncates the response mid-JSON with no error.
**Why it happens:** Web search injects large search-result context; combined with structured output enforcement, the model runs out of effective output budget.
**How to avoid:** Two separate calls — Step 1: web search to find URLs (return simple JSON list). Step 2: parse each URL with structured output only.
**Warning signs:** Zod parse failure on AI response; `finish_reason: "length"` on many calls.

### Pitfall 2: Type Mismatch Between DB Schema and `Recipe` Type

**What goes wrong:** The existing `Recipe` type (in `src/types/index.ts`) uses `time: number`, `difficulty: Skill` (string union), `diet: Diet[]` (string union array). The DB stores these as `INTEGER`, `TEXT`, `TEXT[]`. The mapping function `rowToRecipe` must cast carefully.
**Why it happens:** Supabase returns raw Postgres types; TypeScript types are more specific.
**How to avoid:** Write `rowToRecipe()` with explicit casts and validate with Zod before inserting. Test with a fixture that round-trips DB→type.

### Pitfall 3: `usePlanEngine` Blocking on Async `fetchRecipes()`

**What goes wrong:** `buildPlan()` is synchronous and runs in a `useMemo`. If `fetchRecipes()` is awaited inside `useMemo`, React will throw or the plan will compute on an empty array until recipes arrive.
**Why it happens:** `useMemo` is synchronous; async data needs a `useState` + `useEffect` pattern.
**How to avoid:** Fetch recipes in a `useEffect` into a state variable (`recipes: Recipe[]`), seeded with a localStorage cache for offline/instant-load. Pass the state to `buildPlan()`. Show a skeleton or the cached plan while loading.

### Pitfall 4: RLS Misconfiguration on `recipes` Table

**What goes wrong:** Table with RLS enabled but no SELECT policy = no user can read recipes. Plan generation silently returns empty.
**Why it happens:** Supabase default: "RLS enabled + no policy = deny all."
**How to avoid:** Always add `CREATE POLICY "Public read" ON recipes FOR SELECT TO anon, authenticated USING (true);` immediately after enabling RLS. Verify with a `SELECT` using the `anon` key in Supabase Table Editor.

### Pitfall 5: Catalog Job Exceeds Edge Function 10-Minute Limit

**What goes wrong:** Cataloging 20 recipes × 3 diet types = 60 AI calls in a single function invocation. At ~2s/call, that is ~120s — exceeds the recommended 10-minute limit but is also slow if sequential.
**Why it happens:** Each recipe requires 2 AI calls (search + parse); sequential execution is slow.
**How to avoid:** Use `Promise.all()` with batches of 5 concurrent calls. 60 calls × 2 steps = 120 API calls; with 5-parallel batches that is ~24 rounds × 2s ≈ 48s total. Well within limits.

### Pitfall 6: AI Hallucinating Non-Italian Recipes

**What goes wrong:** Even with a system prompt specifying Italian sites, the model occasionally returns non-Italian or invented recipes when web search fails to find results.
**Why it happens:** GPT falls back to training data when search yields no usable results.
**How to avoid:** Include `source_url` as a required field in the Zod schema with URL validation (`z.string().url()`). If `source_url` is null or empty, reject the recipe before insert. This ensures every AI-added recipe has a verifiable Italian source.

---

## Code Examples

### Zod Schema for AI-Parsed Recipe (maps to `Recipe` type)

```typescript
// Source: src/types/index.ts (RecipeIngredient, Recipe, Diet, Skill types)
import { z } from "zod";

export const RecipeIngredientSchema = z.object({
  name:     z.string().min(1),
  qty:      z.number().positive(),
  unit:     z.string().min(1),
  category: z.string().min(1),
});

export const AIRecipeSchema = z.object({
  title:           z.string().min(3),
  diet:            z.array(z.enum(["mediterranea", "onnivora", "vegetariana", "vegana"])).min(1),
  tags:            z.array(z.string()).default([]),
  time:            z.number().int().positive(),
  difficulty:      z.enum(["beginner", "intermediate"]),
  servings:        z.number().int().positive().default(2),
  ingredients:     z.array(RecipeIngredientSchema).min(2),
  steps:           z.array(z.string().min(10)).min(2),
  estimated_cost:  z.number().positive().optional(),
  protein_category: z.enum(["carne", "pesce", "legumi", "uova", "latticini", "vegano"]).optional(),
  source_url:      z.string().url(),   // REQUIRED — rejects hallucinated recipes
});
```

### `rowToRecipe()` — DB Row to `Recipe` Type

```typescript
// Maps Supabase row to the Recipe type expected by buildPlan()
function rowToRecipe(row: Record<string, unknown>): Recipe {
  return {
    id:          row.id as string,
    title:       row.title as string,
    diet:        row.diet as Diet[],
    tags:        (row.tags as string[]) ?? [],
    time:        row.time as number,
    difficulty:  row.difficulty as Skill,
    servings:    (row.servings as number) ?? 2,
    ingredients: row.ingredients as RecipeIngredient[],
    steps:       row.steps as string[],
  };
}
```

### Bell Icon Addition to `AppHeader`

```typescript
// Source: AppHeader.tsx (existing pattern — button next to 👤 profile icon)
// lucide-react already in dependencies at 0.487.0
import { Bell, BellDot } from "lucide-react";

<button
  onClick={onNotificationOpen}
  style={{ width: 40, height: 40, borderRadius: "50%", /* same style as profile button */ }}
  title="Notifiche"
>
  {hasUnread ? <BellDot size={20} /> : <Bell size={20} />}
</button>
```

### Name Normalization for Deduplication

```typescript
// Client-side equivalent of the DB GENERATED ALWAYS column
// Used before insert to check for duplicates programmatically
function normalizeRecipeTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")  // remove accent combining chars
    .trim();
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Static `recipes.ts` import | Shared Supabase `recipes` table | Phase 4 | Catalog grows weekly; all users benefit |
| AI generates recipes on-demand | AI catalogs in background weekly | Phase 4 design decision | Zero user-facing latency; real recipes only |
| No notifications | Bell icon → drawer → discovery page | Phase 4 | User aware of catalog growth; wishlist drives next plan |
| `buildPlan()` reads static array | `buildPlan()` reads fetched async array | Phase 4 | One line change in `usePlanEngine`; engine logic unchanged |

**Deprecated/outdated after Phase 4:**
- `import { RECIPE_LIBRARY } from "@/data/recipes"` in `usePlanEngine.ts` and `AppHeader.tsx`: remove after seed confirmed.
- `RECIPE_LIBRARY.length` count in AppHeader subtitle: replace with live count from Supabase.

---

## Open Questions

1. **Wishlist storage location**
   - What we know: wishlist per user, recipes are shared catalog. Current `preferences` table already stores user data as JSONB.
   - What's unclear: store wishlist IDs in `preferences.data.wishlistedRecipeIds` (simplest) vs a separate `recipe_wishlist` table (cleaner if wishlist grows). For Phase 4, preferences JSONB is sufficient.
   - Recommendation: add `wishlistedRecipeIds: string[]` to the `Preferences` type and JSONB; skip new table. Revisit in Phase 5.

2. **Diet-type matching for catalog job**
   - What we know: the job targets "vegana, vegetariana, onnivora". The `Recipe.diet` field is `Diet[]` which includes "mediterranea".
   - What's unclear: when the AI catalogs an "onnivora" recipe, should it also be tagged "mediterranea" automatically?
   - Recommendation: AI sets `diet` to `["onnivora", "mediterranea"]` for meat/fish recipes, `["vegetariana", "mediterranea"]` for vegetarian, `["vegana", "vegetariana", "mediterranea"]` for vegan — matching the existing static recipe conventions.

3. **Offline behavior when Supabase recipes fetch fails**
   - What we know: CLOUD-02 (already complete) handles offline plan display. But `fetchRecipes()` is a new async call.
   - What's unclear: how long to cache fetched recipes in localStorage before re-fetching?
   - Recommendation: cache in `localStorage` key `ss_recipes_cache_v1` with a `fetched_at` timestamp; re-fetch if older than 24 hours or on fresh login.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.0 |
| Config file | `vitest.config.ts` (project root) |
| Quick run command | `vitest run src/lib/planEngine.test.ts` |
| Full suite command | `vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| RECIPES-01 | `fetchRecipes()` returns array compatible with `buildPlan()` | unit | `vitest run src/lib/supabase.test.ts` | ❌ Wave 0 |
| RECIPES-01 | Catalog job processes 20 recipes per diet type without error | unit | `vitest run src/lib/catalogJob.test.ts` | ❌ Wave 0 |
| RECIPES-02 | `AIRecipeSchema` rejects recipes without a valid `source_url` | unit | `vitest run src/lib/recipeSchema.test.ts` | ❌ Wave 0 |
| RECIPES-02 | `AIRecipeSchema` rejects recipes with empty `ingredients` array | unit | `vitest run src/lib/recipeSchema.test.ts` | ❌ Wave 0 |
| RECIPES-03 | `AIRecipeSchema` validates all required fields (title, ingredients, steps, time) | unit | `vitest run src/lib/recipeSchema.test.ts` | ❌ Wave 0 |
| RECIPES-03 | `rowToRecipe()` maps DB row to `Recipe` type without data loss | unit | `vitest run src/lib/supabase.test.ts` | ❌ Wave 0 |
| RECIPES-04 | `validateAllergenSafety()` still passes with Supabase-sourced recipes (regression) | unit | `vitest run src/lib/planEngine.test.ts` | ✅ (existing test) |
| RECIPES-04 | Plan generated from Supabase recipes excludes allergen-flagged recipes | unit | `vitest run src/lib/planEngine.test.ts::allergen` | ✅ (existing test) |
| RECIPES-01/03 | `normalizeRecipeTitle()` strips accents and lowercases consistently | unit | `vitest run src/lib/recipeSchema.test.ts` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `vitest run src/lib/planEngine.test.ts` (allergen regression — fast, already exists)
- **Per wave merge:** `vitest run` (full suite)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/lib/recipeSchema.test.ts` — covers RECIPES-02, RECIPES-03 (Zod schema validation)
- [ ] `src/lib/supabase.test.ts` — covers RECIPES-01, RECIPES-03 (`fetchRecipes`, `rowToRecipe`)
- [ ] `src/lib/catalogJob.test.ts` — covers RECIPES-01 (job logic unit tests, mocked OpenAI calls)
- [ ] No framework install needed — Vitest 4.1.0 already configured

---

## Sources

### Primary (HIGH confidence)
- Supabase Cron Docs: https://supabase.com/docs/guides/cron — pg_cron scheduling syntax
- Supabase Schedule Functions: https://supabase.com/docs/guides/functions/schedule-functions — Edge Function + cron pattern
- Supabase RLS Docs: https://supabase.com/docs/guides/database/postgres/row-level-security — `USING (true)` for public tables
- OpenAI Web Search Tool: https://platform.openai.com/docs/guides/tools-web-search — `web_search_preview` tool
- OpenAI Structured Outputs: https://developers.openai.com/api/docs/guides/structured-outputs — Responses API `text.format` syntax
- `src/types/index.ts` — authoritative `Recipe`, `Diet`, `Skill`, `RecipeIngredient` types
- `src/lib/planEngine.ts` — `buildPlan()`, `validateAllergenSafety()`, `RECIPE_LIBRARY` import location
- `src/hooks/usePlanEngine.ts` — integration point for async recipe fetch
- `src/lib/supabase.ts` — existing DB patterns (`upsert`, `select`, service pattern)

### Secondary (MEDIUM confidence)
- OpenAI Community — web search + structured output truncation issue: https://community.openai.com/t/web-search-completion-cuts-off-response-and-ignores-structured-outputs-on-complex-prompts/1229963 (community-verified, not in official docs)
- OpenAI Pricing: https://openai.com/api/pricing/ — $0.025/call for gpt-4o-mini web search (verified Oct 2025 snapshot; confirm before deploy)

### Tertiary (LOW confidence)
- None — all key claims are backed by official sources.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in project or native Supabase; no new installations
- Architecture: HIGH — Supabase Edge Function + pg_cron is the official documented pattern; two-step AI call is a workaround for a documented limitation
- Pitfalls: HIGH (web search + structured output bug) / MEDIUM (AI diet tagging conventions — project-specific inference)
- RLS patterns: HIGH — official Supabase docs

**Research date:** 2026-03-21
**Valid until:** 2026-04-21 (stable domain; OpenAI pricing page should be re-checked before deployment)

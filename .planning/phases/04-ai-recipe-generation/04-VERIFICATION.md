---
phase: 04-ai-recipe-generation
verified: 2026-03-21T21:10:00Z
status: human_needed
score: 12/12 must-haves verified
human_verification:
  - test: "Open the app in browser at http://localhost:3000. Verify the bell icon appears in the header row to the left of the profile button."
    expected: "Bell icon visible; idle state uses Bell icon (sepia-light or terra background depending on unread). No JavaScript errors in console."
    why_human: "CSS rendering and icon positioning cannot be verified by static analysis."
  - test: "Click the bell icon. NotificationDrawer should slide in from the right."
    expected: "Drawer opens with 'Notifiche' title in Playfair Display font. If no notifications exist, shows 'Nessuna notifica' empty state. Backdrop is visible behind panel."
    why_human: "Slide-in animation, font rendering, and backdrop visual cannot be verified programmatically."
  - test: "Close drawer with X button, then reopen and press Escape key. Then close by clicking the backdrop."
    expected: "All three close mechanisms work. Drawer closes cleanly each time."
    why_human: "Keyboard event handling and backdrop click interaction require runtime testing."
  - test: "Verify the AppHeader subtitle shows a recipe count (a number, not 'undefined' or '0')."
    expected: "Shows the static RECIPE_LIBRARY count (~200) as immediate fallback — or the Supabase count if DB is connected. Never 'undefined'."
    why_human: "Requires the running app to confirm recipeCount prop flows correctly to the subtitle."
  - test: "If notifications exist in Supabase, click one. Verify it navigates to 'Ricette della settimana' page."
    expected: "Page shows 'Ricette della settimana' heading, recipe cards with title, time, diet tag. If no AI-added recipes exist yet, shows 'Nessuna ricetta nuova questa settimana' empty state."
    why_human: "Navigation routing and page rendering require runtime verification. Supabase data presence is environment-dependent."
  - test: "On the Ricette della settimana page, tap a heart icon on any recipe card."
    expected: "Heart fills with terra color. 'Aggiunto!' text appears for ~2 seconds then disappears. Tap again — heart unfills (toggle off)."
    why_human: "2-second confirmation timeout and fill animation require runtime testing."
  - test: "Click the back arrow on NuoveRicettePage."
    expected: "Returns to the planner tab. The 'Ricette della settimana' page disappears."
    why_human: "Virtual tab routing behavior requires runtime verification."
  - test: "On mobile viewport (less than 640px): verify bell icon is visible and recipe grid is single column."
    expected: "Bell icon remains accessible in header. Recipe cards stack in single column layout."
    why_human: "Responsive CSS grid behavior (auto-fill minmax(280px, 1fr)) requires viewport testing."
---

# Phase 04: AI Recipe Generation Verification Report

**Phase Goal:** AI-powered recipe catalog — recipes fetched from Supabase, Edge Function catalogs new recipes weekly via GPT-4o-mini, notification center alerts users to new recipes, wishlist integration with plan engine.
**Verified:** 2026-03-21T21:10:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Zod schema validates every recipe before DB insert — missing title, empty ingredients, or no source_url are rejected | VERIFIED | `AIRecipeSchema` in `recipeSchema.ts:17-30` — `source_url: z.string().url()` required, `ingredients: z.array(...).min(2)`, `title: z.string().min(3)`. 21 tests pass. |
| 2 | All ~200 static recipes from RECIPE_LIBRARY can be converted to DB schema and inserted via seed script | VERIFIED | `scripts/seed-recipes.ts` imports `RECIPE_LIBRARY`, maps all fields, upserts in batches of 50 with `onConflict: "title_normalized"`. |
| 3 | fetchRecipes() returns Recipe[] compatible with buildPlan() — no type mismatch | VERIFIED | `supabase.ts:71-79` uses `rowToRecipe` mapper; `planEngine.ts:307-308` accepts `recipesOverride?: Recipe[]`. `usePlanEngine.ts:77` passes `mergedRecipes` to `buildPlan`. |
| 4 | rowToRecipe() correctly maps DB column names to Recipe type fields | VERIFIED | `recipeSchema.ts:43-56` — explicit field mapping, extra DB fields (`estimated_cost`, `source_url`, `added_by`, `created_at`) are dropped. |
| 5 | usePlanEngine fetches recipes from Supabase instead of importing RECIPE_LIBRARY statically | VERIFIED | `usePlanEngine.ts:4` imports `fetchRecipes`; `usePlanEngine.ts:42-51` calls `fetchRecipes(cloudSync.sbClient)` in useEffect with localStorage cache. |
| 6 | When Supabase is unreachable and no cache exists, the app falls back to RECIPE_LIBRARY | VERIFIED | `usePlanEngine.ts:23` — `useState<Recipe[]>(RECIPE_LIBRARY)` as initial state; catch block preserves fallback. Test case 3 in `usePlanEngine.test.ts` passes. |
| 7 | AppHeader subtitle shows live recipe count from Supabase, not static RECIPE_LIBRARY.length | VERIFIED | `AppHeader.tsx:18` — `recipeCount: number` prop. `AppHeader.tsx:29` — `{recipeCount} ricette`. No `RECIPE_LIBRARY` import in AppHeader. `page.tsx:40` destructures `recipeCount` from `usePlanEngine` and passes it at line 234. |
| 8 | Edge Function calls GPT-4o-mini with web_search_preview to find Italian recipe URLs | VERIFIED | `catalog-recipes/index.ts:65-71` — `tools: [{ type: "web_search_preview" }]` in Step 1. `TARGET_PER_DIET = 20` per diet type. |
| 9 | Only recipes with valid source_url are inserted — hallucinated recipes are rejected | VERIFIED | `catalog-recipes/index.ts:42-48` — `validateParsedRecipe()` returns false if `source_url` missing or does not start with "http". `recipeSchema.ts:28` — `z.string().url()` required. |
| 10 | Deduplication via UNIQUE(title_normalized) — re-runs do not create duplicates | VERIFIED | `001_create_recipes.sql:23` — `UNIQUE(title_normalized)`. `catalog-recipes/index.ts:178` — `.upsert(rows, { onConflict: "title_normalized", ignoreDuplicates: true })`. |
| 11 | Bell icon in AppHeader opens NotificationDrawer with recent catalog notifications | VERIFIED | `AppHeader.tsx:3,16,52-71` — `Bell`/`BellDot` from lucide-react, `onNotificationOpen` prop, bell button before profile button. `page.tsx:76-77,235-236` — `isNotificationOpen` state, `useNotifications` hook, `markAllRead` on open. `NotificationDrawer.tsx` — full slide-in drawer with `role="dialog"`, `aria-modal="true"`, `Nessuna notifica` empty state, Escape key handler. |
| 12 | User can wishlist a recipe — wishlisted IDs stored in preferences, wishlisted recipes prioritized in plan | VERIFIED | `types/index.ts:43` — `wishlistedRecipeIds: string[]` in Preferences. `DEFAULT_PREFS` includes `wishlistedRecipeIds: []`. `planEngine.ts:349,534-535` — wishlisted recipes bypass diet/time filters and receive +300 score boost. `usePlanEngine.ts:69-72` — merges full wishlisted Recipe objects into pool before `buildPlan`. |

**Score:** 12/12 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/recipeSchema.ts` | AIRecipeSchema, RecipeIngredientSchema, normalizeRecipeTitle(), rowToRecipe() | VERIFIED | 55 lines. All 4 exports confirmed. source_url required. |
| `supabase/migrations/001_create_recipes.sql` | recipes table with RLS, indexes, UNIQUE(title_normalized) | VERIFIED | 33 lines. CREATE TABLE, ENABLE ROW LEVEL SECURITY, CREATE POLICY, UNIQUE(title_normalized), GIN index on diet. |
| `supabase/migrations/002_create_notifications.sql` | notifications table with RLS | VERIFIED | 15 lines. CREATE TABLE notifications, ENABLE ROW LEVEL SECURITY. |
| `scripts/seed-recipes.ts` | RECIPE_LIBRARY migration to Supabase | VERIFIED | 67 lines. Imports RECIPE_LIBRARY, upsert with onConflict, batch size 50, progress logging. |
| `src/lib/supabase.ts` | fetchRecipes(), fetchNotifications(), markNotificationRead() | VERIFIED | 102 lines. All 3 functions exported plus AppNotification type. |
| `src/lib/recipeSchema.test.ts` | 21 Vitest tests | VERIFIED | 173 lines. 21 tests confirmed by grep. All pass. |
| `src/lib/supabase.test.ts` | 8 fetch/mapping tests | VERIFIED | 181 lines. 8 tests confirmed. All pass. |
| `src/hooks/usePlanEngine.ts` | Async fetch, cache, loading, fallback | VERIFIED | 207 lines. fetchRecipes import, ss_recipes_cache_v1 key, RECIPE_LIBRARY fallback, recipesLoading, recipeCount. |
| `src/hooks/usePlanEngine.test.ts` | 7 integration tests | VERIFIED | 233 lines. 7 tests all pass (cache hit, cache miss, Supabase failure, no sbClient, recipeCount, loading, expired cache). |
| `src/components/AppHeader.tsx` | Live recipeCount, Bell/BellDot | VERIFIED | 107 lines. Bell/BellDot imported, recipeCount prop, onNotificationOpen prop, no RECIPE_LIBRARY import. |
| `supabase/functions/catalog-recipes/index.ts` | Two-step AI catalog Edge Function | VERIFIED | 200 lines. web_search_preview, json_object format, validateParsedRecipe, upsert onConflict, added_by:ai_job, notification insert, pg_cron SQL comment. |
| `src/lib/catalogJob.test.ts` | 17 catalog validation tests | VERIFIED | 164 lines. 17 tests all pass. |
| `src/hooks/useNotifications.ts` | useNotifications hook | VERIFIED | 41 lines. fetchNotifications, markAllRead, unreadCount exported. |
| `src/components/NotificationDrawer.tsx` | Slide-in notification panel | VERIFIED | 176 lines. role=dialog, aria-modal, Nessuna notifica empty state, Escape handler, backdrop, Notifiche title. |
| `src/components/NuoveRicettePage.tsx` | Recipe discovery with wishlist | VERIFIED | 315 lines. Heart import, Ricette della settimana, Nessuna ricetta nuova, Aggiungi alla wishlist aria-label, added_by:ai_job filter. |
| `src/types/index.ts` | wishlistedRecipeIds in Preferences | VERIFIED | 87 lines. `wishlistedRecipeIds: string[]` confirmed. |
| `src/lib/planEngine.ts` | recipesOverride param, wishlist scoring | VERIFIED | 739 lines. `recipesOverride?: Recipe[]` on buildPlan, wishlist bypass filters (+300 score). |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/lib/recipeSchema.ts` | `src/types/index.ts` | Recipe, Diet, Skill, RecipeIngredient imports | WIRED | `recipeSchema.ts:4` — `import type { Diet, Skill, RecipeIngredient, Recipe } from "@/types"` |
| `src/lib/supabase.ts` | `src/lib/recipeSchema.ts` | rowToRecipe import for DB-to-type mapping | WIRED | `supabase.ts:5` — `import { rowToRecipe } from "@/lib/recipeSchema"`. Used at line 77: `.map(rowToRecipe)`. |
| `src/hooks/usePlanEngine.ts` | `src/lib/supabase.ts` | fetchRecipes() import | WIRED | `usePlanEngine.ts:4` — `import { ..., fetchRecipes } from "@/lib/supabase"`. Used at line 42. |
| `src/hooks/usePlanEngine.ts` | `src/lib/planEngine.ts` | buildPlan() receives fetched recipes | WIRED | `usePlanEngine.ts:77,80,88` — `buildPlan(computedPrefs, pantryItems, seed, learning, mergedRecipes)`. |
| `src/components/AppHeader.tsx` | `src/app/page.tsx` | recipeCount prop | WIRED | `AppHeader.tsx:18` prop interface. `page.tsx:234` — `recipeCount={recipeCount}`. |
| `src/app/page.tsx` | `src/hooks/useNotifications.ts` | useNotifications hook | WIRED | `page.tsx:16,77` — imported and called with `sbClient`. |
| `src/app/page.tsx` | `src/components/NotificationDrawer.tsx` | isNotificationOpen state and drawer rendering | WIRED | `page.tsx:14,76,244-253` — imported, state managed, NotificationDrawer rendered with all props. |
| `src/components/AppHeader.tsx` | `src/app/page.tsx` | onNotificationOpen callback and hasUnread prop | WIRED | `page.tsx:235-236` — `onNotificationOpen={() => { setIsNotificationOpen(true); markAllRead(); }}` and `hasUnread={unreadCount > 0}`. |
| `src/components/NuoveRicettePage.tsx` | Supabase (via sbClient) | Direct query for AI-added recipes | WIRED | `NuoveRicettePage.tsx:154-158` — `sbClient.from("recipes").select(...).gte("created_at", ...).eq("added_by", "ai_job")`. |
| `supabase/functions/catalog-recipes/index.ts` | `supabase/migrations/001_create_recipes.sql` | INSERT INTO recipes via upsert | WIRED | `catalog-recipes/index.ts:177-178` — `.from("recipes").upsert(rows, { onConflict: "title_normalized" })`. |
| `supabase/functions/catalog-recipes/index.ts` | OpenAI Responses API | web_search_preview tool | WIRED | `catalog-recipes/index.ts:66,71` — fetch to `api.openai.com/v1/responses` with `tools: [{ type: "web_search_preview" }]`. |

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|-------------|---------------|-------------|--------|----------|
| RECIPES-01 | 04-01, 04-02, 04-03, 04-04 | Le ricette sono generate da AI (GPT-4o-mini) personalizzate sulle preferenze utente | SATISFIED | Edge Function uses GPT-4o-mini; fetched recipes flow through usePlanEngine into buildPlan which applies user preferences (diet, time, skill, allergens). Wishlist integration further personalizes. |
| RECIPES-02 | 04-01, 04-03 | Le ricette rispettano la cucina italiana e sono realistiche (ispirate a ricette verificate) | SATISFIED | `source_url: z.string().url()` required in AIRecipeSchema; `validateParsedRecipe()` rejects recipes without valid URL; Edge Function targets `giallozafferano.it OR cucchiaio.it OR lacucinaitaliana.it`. |
| RECIPES-03 | 04-01 | Ogni ricetta segue uno schema strutturato: ingredienti con quantità e unità, passi di preparazione, tempo stimato | SATISFIED | `AIRecipeSchema` enforces `ingredients: z.array(RecipeIngredientSchema).min(2)`, `steps: z.array(z.string().min(10)).min(2)`, `time: z.number().int().positive()`. 21 schema tests pass. |
| RECIPES-04 | 04-02 | Le ricette generate sono validate per allergie/intolleranze prima di essere mostrate | SATISFIED | `usePlanEngine.ts:81` — `validateAllergenSafety(plan, exclusions)` runs on every `buildPlan` result using `mergedRecipes` (which includes fetched Supabase recipes). Wishlist comment in `planEngine.ts` confirms allergen check is never bypassed. |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/components/NotificationDrawer.tsx` | 52 | `if (!isOpen) return null;` | Info | Standard React pattern for conditional rendering — not a stub. Component has full implementation (176 lines). |
| `supabase/functions/catalog-recipes/index.ts` | 141, 148, 152 | `return null` in promise chain | Info | Expected null-return pattern inside `Promise.all` batch — null entries are filtered out via `results.filter(Boolean)` before insert. Not a stub. |

No blocker or warning anti-patterns found.

### Human Verification Required

The automated verification confirms all artifacts exist, are substantive, and are wired. The following behaviors require runtime testing because they depend on browser rendering, CSS animations, keyboard events, and live Supabase data:

#### 1. Bell Icon Visual Rendering

**Test:** Open http://localhost:3000 and inspect the AppHeader.
**Expected:** Bell icon visible in header, left of profile button. No `undefined` values in subtitle (recipe count shows a number).
**Why human:** CSS layout and prop-to-DOM flow requires visual inspection.

#### 2. NotificationDrawer Open/Close Mechanics

**Test:** Click bell icon. Verify drawer slides in. Close with X button, Escape key, and backdrop click.
**Expected:** All three close mechanisms work. Backdrop is semi-transparent with blur. Drawer has "Notifiche" title in Playfair Display.
**Why human:** CSS animation, keyboard event binding, and backdrop interaction cannot be verified statically.

#### 3. Notification Click Navigation

**Test:** If notifications exist in Supabase, click a notification item.
**Expected:** Drawer closes and "Ricette della settimana" page appears. If no AI-added recipes exist in DB yet (Edge Function not deployed), shows empty state.
**Why human:** Requires live Supabase data and runtime routing behavior.

#### 4. Wishlist Heart Toggle

**Test:** On NuoveRicettePage, tap a heart icon.
**Expected:** Heart fills with terra color. "Aggiunto!" text appears for ~2 seconds. Tap again to unfill.
**Why human:** 2-second setTimeout confirmation requires runtime testing. Color fill animation requires visual check.

#### 5. Back Navigation

**Test:** Press back arrow on NuoveRicettePage.
**Expected:** Returns to planner tab.
**Why human:** Virtual tab routing (activeTab === "ricette-nuove" branch) requires runtime verification.

#### 6. Mobile Responsive Layout

**Test:** At viewport width < 640px, verify bell icon accessible and recipe grid is single column.
**Expected:** Bell icon visible. Recipe cards stack vertically in single column.
**Why human:** CSS `auto-fill minmax(280px, 1fr)` grid behavior requires viewport testing.

#### 7. Edge Function Deployability

**Test:** Deploy `supabase functions deploy catalog-recipes` to the Supabase project.
**Expected:** Function deploys without error. Manual trigger returns `{ inserted: N }` JSON response.
**Why human:** Deno Edge Function deployment and OpenAI API key configuration require environment setup beyond static analysis. pg_cron scheduling must also be verified post-deploy.

### Gaps Summary

No gaps found. All 12 must-haves verified programmatically. The 8 human verification items above are behavioral/visual checks that cannot be confirmed by static analysis — they do not indicate missing code, but require runtime confirmation.

---

_Verified: 2026-03-21T21:10:00Z_
_Verifier: Claude (gsd-verifier)_

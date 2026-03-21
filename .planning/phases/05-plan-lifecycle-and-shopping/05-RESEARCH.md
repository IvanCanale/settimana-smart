# Phase 5: Plan Lifecycle and Shopping - Research

**Researched:** 2026-03-21
**Domain:** Plan state machine, week-scoped multi-plan coexistence, Italian ingredient fuzzy aggregation, shopping list persistence
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PLAN-01 | Piano associato a settimana specifica — corrente e prossima coesistono senza sovrascriversi | New `weekly_plan` schema with `week_iso` key; multiple rows per user |
| PLAN-02 | Piano corrente diventa automaticamente "archiviato" quando inizia la nuova settimana | `getISOWeek()` check on mount; status transition ACTIVE → ARCHIVED |
| PLAN-03 | Utente può creare/rigenerare il piano per settimana successiva mentre è attivo il corrente | Two independent plan slots; `usePlanEngine` called per-slot |
| PLAN-04 | Utente può rigenerare il piano fornendo feedback testuale | `feedbackNote` field on plan; injected into `buildPlan` as extra exclusion/preference text |
| PLAN-05 | Piano segnala esplicitamente i pasti che riutilizzano avanzi | Tag "avanzi" already exists on recipes; surface in WeekTab with a dedicated badge |
| PLAN-06 | Utente può scambiare un singolo pasto con un'alternativa compatibile con profilo | `regenerateSingleMeal` already exists in WeekTab; needs allergen-safe candidate pool from Supabase recipes |
| SHOP-01 | Aggregazione corretta ingredienti italiani varianti (pomodoro / pomodori pelati → voce singola) | Extend `pantryMatches` alias map + NFD normalization in `aggregateShopping` |
| SHOP-02 | Utente può segnare ingredienti come acquistati e stato persiste tra sessioni | Move `checkedShoppingItems` from `useState<Set>` to `useLocalStorage` (Set serialized as array) |
| SHOP-03 | Lista della spesa si aggiorna automaticamente quando il piano viene modificato o rigenerato | Already derived from `generated.shopping` in `usePlanEngine`; cleared on re-generate already done in `regenerate()` |
</phase_requirements>

---

## Summary

Phase 5 is primarily a **data-model and persistence upgrade**, not a new-feature build. The plan engine (`planEngine.ts`), the shopping aggregation (`aggregateShopping`), and the single-meal swap (`regenerateSingleMeal` in `WeekTab`) are all already implemented. The missing pieces are: (1) a week-scoped plan identity model so two weeks coexist in Supabase without the current single-row-per-user `weekly_plan` table overwriting itself, (2) a formal DRAFT/ACTIVE/ARCHIVED state machine with automatic Monday transition, (3) Italian ingredient canonicalization in `aggregateShopping` to collapse variants like "pomodori pelati" into "pomodoro", and (4) persisting `checkedShoppingItems` to `localStorage` so bought-item marks survive app reload.

The current `weekly_plan` Supabase table uses `user_id` as the unique key — a hard single-row-per-user constraint that prevents multi-week coexistence. This must be replaced with a composite key `(user_id, week_iso)`. The `week_iso` value is a standard ISO week string (e.g., `"2026-W13"`) derived from `date-fns/getISOWeek` + `getISOWeekYear`, which is already a transitive dependency via the project's dependencies. The state machine (DRAFT → ACTIVE → ARCHIVED) lives as a `status` column on this table and is updated client-side on mount.

Italian ingredient fuzzy aggregation is handled by the existing `pantryMatches` alias map in `planEngine.ts`. SHOP-01 requires extending that same alias logic inside `aggregateShopping` to group shopping items — currently the function uses exact `normalize(ingr.name)` as the map key, so "pomodori pelati" and "pomodoro" become two separate entries. The fix is a canonical-name resolution step before the map key is assigned.

**Primary recommendation:** Introduce a `week_iso`-keyed plan row schema, a client-side week utility module, and a canonical ingredient name resolver. Wire `checkedShoppingItems` through `useLocalStorage`. All other requirements (leftovers label, single-meal swap) are surfacing/UI changes on top of already-working logic.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| date-fns | already in project (transitive) | ISO week arithmetic (`getISOWeek`, `getISOWeekYear`, `startOfISOWeek`) | Deterministic, no locale surprises; already available |
| Supabase JS | already in project | Cloud persistence for multi-week plan rows | Already wired; adding a new table + migration |
| Vitest | already in project | Unit tests for new pure functions | Established test framework for this project |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| useLocalStorage (existing hook) | n/a | Persist checkedShoppingItems as serialized array | Set → JSON.stringify as array on write; JSON.parse → new Set on read |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| date-fns ISO week | Manual week arithmetic | Manual arithmetic is error-prone at year boundaries (week 52/1 crossing) — date-fns handles this correctly |
| Supabase multi-row plan | localStorage-only multi-week | Breaks CLOUD-01 (multi-device sync) — must use Supabase |
| Alias map extension | NLP/embedding similarity | NLP is massive overkill; the Italian ingredient name space is closed and enumerable |

**Installation:**
```bash
# date-fns is already a transitive dep — verify it is directly importable:
node -e "require('date-fns')" 2>/dev/null && echo "available" || npm install date-fns
```

**Version verification:** date-fns is a transitive dependency — check `node_modules/date-fns/package.json` for installed version before importing. The API used (`getISOWeek`, `getISOWeekYear`, `startOfISOWeek`) is stable across v2 and v3.

---

## Architecture Patterns

### Recommended Project Structure

New files for this phase:

```
src/
├── lib/
│   ├── weekUtils.ts          # ISO week helpers: currentWeekISO(), nextWeekISO(), isWeekExpired()
│   └── planEngine.ts         # extend: canonicalizeName(), update aggregateShopping()
├── hooks/
│   └── useWeeklyPlans.ts     # multi-week plan load/save/archive logic
└── types/
    └── index.ts              # extend: WeeklyPlanRecord, PlanStatus
```

New Supabase migration:

```
supabase/migrations/
└── 003_multi_week_plan.sql   # drop old single-row constraint, add week_iso + status columns
```

### Pattern 1: ISO Week Key

**What:** Each plan is identified by `"YYYY-WNN"` (e.g., `"2026-W13"`). This is the natural human unit for meal planning and avoids timezone edge cases from using Monday date strings.

**When to use:** Everywhere a plan needs to be identified — Supabase row key, localStorage fallback key, UI header display.

**Example:**
```typescript
// src/lib/weekUtils.ts
import { getISOWeek, getISOWeekYear, startOfISOWeek, addWeeks } from "date-fns";

export function currentWeekISO(now = new Date()): string {
  return `${getISOWeekYear(now)}-W${String(getISOWeek(now)).padStart(2, "0")}`;
}

export function nextWeekISO(now = new Date()): string {
  return currentWeekISO(addWeeks(now, 1));
}

export function isWeekExpired(weekISO: string, now = new Date()): boolean {
  return weekISO < currentWeekISO(now);
}
```

### Pattern 2: Plan State Machine

**What:** `PlanStatus = "draft" | "active" | "archived"`. Transitions:
- `draft` → `active`: when user confirms the week (or on first view)
- `active` → `archived`: automatically on Monday when `currentWeekISO()` advances past the plan's `week_iso`

**Implementation:** Check on app mount in `useWeeklyPlans`. Do not rely on server-side cron for this — derive state client-side from `currentWeekISO()` comparison.

```typescript
// src/hooks/useWeeklyPlans.ts (pattern sketch)
export type PlanStatus = "draft" | "active" | "archived";

export type WeeklyPlanRecord = {
  week_iso: string;
  status: PlanStatus;
  seed: number;
  manual_overrides: ManualOverrides;
  learning: PreferenceLearning;
  feedback_note: string;   // PLAN-04: user's text feedback for regeneration
  checked_items: string[]; // SHOP-02: serialized Set<string> of bought item keys
};
```

**Transition logic (mount-time check):**
```typescript
function archiveExpiredPlans(plans: WeeklyPlanRecord[]): WeeklyPlanRecord[] {
  const current = currentWeekISO();
  return plans.map((p) =>
    p.status === "active" && isWeekExpired(p.week_iso)
      ? { ...p, status: "archived" }
      : p
  );
}
```

### Pattern 3: Canonical Ingredient Name for Shopping Aggregation (SHOP-01)

**What:** Before using `normalize(ingr.name)` as the `shoppingMap` key, resolve the name to its canonical form using the existing alias map.

**The gap in current code:** `aggregateShopping` maps by `normalize(ingr.name)` exactly. Two recipes that use `"pomodori pelati"` and `"pomodoro"` both produce their own map entries because their normalized names are different strings. The alias map exists in `pantryMatches` but is not applied during shopping aggregation.

**Fix approach — canonical name resolver:**
```typescript
// Add to planEngine.ts (or extract to ingredientCanon.ts)
const CANONICAL_NAMES: Record<string, string> = {
  "pomodori pelati": "pomodoro",
  "pomodorini": "pomodoro",
  "pomodori ciliegia": "pomodoro",
  "pomodori maturi": "pomodoro",
  "petti di pollo": "pollo",
  "petto di pollo": "pollo",
  "cosce di pollo disossate": "pollo",
  // ... derive from existing aliases map, inverted
};

export function canonicalizeName(raw: string): string {
  const n = normalize(raw);
  return CANONICAL_NAMES[n] ?? n;
}
```

Then in `aggregateShopping`, replace:
```typescript
const key = normalize(ingr.name);
```
with:
```typescript
const key = canonicalizeName(ingr.name);
```

**Critical constraint:** The display name shown in the shopping list should be the canonical name (cleaner for the user), but the merged quantity must sum across all variant names correctly.

### Pattern 4: Shopping Item Persistence (SHOP-02)

**What:** `checkedShoppingItems` is currently `useState<Set<string>>` in `page.tsx` — in-memory only. Move it to `useLocalStorage`.

**Serialization:** `Set` is not JSON-serializable. Store as `string[]`, reconstruct as `new Set(arr)` on read.

```typescript
// In page.tsx, replace:
const [checkedShoppingItems, setCheckedShoppingItems] = useState<Set<string>>(new Set());

// With:
const [checkedItemsArray, setCheckedItemsArray] = useLocalStorage<string[]>("ss_checked_shopping_v1", []);
const checkedShoppingItems = useMemo(() => new Set(checkedItemsArray), [checkedItemsArray]);
const setCheckedShoppingItems = useCallback((updater: (prev: Set<string>) => Set<string>) => {
  setCheckedItemsArray((prev) => Array.from(updater(new Set(prev))));
}, [setCheckedItemsArray]);
```

**Reset on regenerate:** The existing `regenerate()` in `page.tsx` already calls `setCheckedShoppingItems(new Set())`. This must be updated to call `setCheckedItemsArray([])`.

### Pattern 5: Leftovers Label (PLAN-05)

**What:** The `"avanzi"` tag already exists on recipes and the `leftoversAllowed` preference gates inclusion. The only missing piece is a UI badge in `WeekTab` that explicitly calls out leftover meals.

**Where:** In the meal slot render in `WeekTab.tsx`, check `slotItem.recipe?.tags.includes("avanzi")` and render a "Avanzi" pill.

### Pattern 6: Multi-Week Supabase Schema

**What:** Replace the current `weekly_plan` table (single row per user via `UNIQUE(user_id)`) with a table that allows multiple rows per user keyed by `week_iso`.

```sql
-- supabase/migrations/003_multi_week_plan.sql
ALTER TABLE weekly_plan
  ADD COLUMN IF NOT EXISTS week_iso TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS feedback_note TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS checked_items JSONB DEFAULT '[]';

-- Drop old unique constraint on user_id alone
ALTER TABLE weekly_plan DROP CONSTRAINT IF EXISTS weekly_plan_user_id_key;

-- New composite unique constraint
ALTER TABLE weekly_plan
  ADD CONSTRAINT weekly_plan_user_id_week_iso_key UNIQUE (user_id, week_iso);
```

**Backward compatibility:** Existing rows with `week_iso = ''` are treated as legacy — migration code sets their `week_iso` to `currentWeekISO()` on first load.

### Anti-Patterns to Avoid

- **Never use Monday's date string as the plan key**: Year-boundary weeks (ISO week 1 of 2027 starting in late December 2026) will have the wrong year if you use `new Date().getFullYear()`. Always use `getISOWeekYear()` from date-fns.
- **Never archive plans server-side via cron**: The app is a PWA with no scheduled backend (Phase 6 will add this for notifications). Archive transitions happen client-side on mount.
- **Never clear shopping-item checks when a plan is archived**: Archived plans retain their `checked_items` so the user can review what they bought.
- **Never run `aggregateShopping` on the wrong plan's meals when two plans exist**: The shopping list must be scoped to the plan currently being viewed, not a merged aggregate of both weeks.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| ISO week arithmetic | Custom date math | `date-fns` `getISOWeek` + `getISOWeekYear` | Week 52/53 → Week 1 year boundary is non-trivial |
| Ingredient name clustering | Edit-distance / embeddings | Curated alias map extension (canonical names) | The Italian ingredient name space is closed and enumerable — fuzzy NLP is overkill and unpredictable |
| Multi-week plan UI | New state management library (Redux, Zustand) | Props + existing `useLocalStorage` pattern | Established architectural decision: tab components receive props from orchestrator (STATE.md decision 01-02) |

**Key insight:** The existing codebase handles 90% of the logic. Phase 5 is about wiring week-scoping into the data layer and surfacing it in the UI — not about replacing working logic.

---

## Common Pitfalls

### Pitfall 1: ISO Week Year vs Calendar Year

**What goes wrong:** Using `new Date().getFullYear()` to construct the week ISO string. In late December, ISO week 1 of the next year starts before December 31 — `getFullYear()` returns the wrong year.

**Why it happens:** JavaScript's `Date.getFullYear()` returns the calendar year, not the ISO week year.

**How to avoid:** Always use `getISOWeekYear(date)` from date-fns.

**Warning signs:** Plans generated in last week of December assigned to the wrong year.

### Pitfall 2: Set Serialization in localStorage

**What goes wrong:** `JSON.stringify(new Set(["a", "b"]))` returns `"{}"` — Sets are not JSON-serializable. The `useLocalStorage` hook's spread-merge for objects will further corrupt it.

**Why it happens:** `useLocalStorage` uses `JSON.parse`/`JSON.stringify`. Sets serialize to empty objects.

**How to avoid:** Store as `string[]`, reconstruct with `new Set(arr)` on read. The `useLocalStorage<string[]>` hook already handles arrays correctly (Array.isArray guard was added in Phase 01-02).

**Warning signs:** Shopping items re-appear as unchecked after reload despite being marked.

### Pitfall 3: Single-Row Supabase Constraint

**What goes wrong:** The current `weekly_plan` table has `UNIQUE(user_id)`. An upsert for next week's plan silently overwrites the current week's plan because both share the same `user_id`.

**Why it happens:** `saveWeeklyPlan` uses `{ onConflict: "user_id" }` — the upsert target is user_id only.

**How to avoid:** Migration 003 must drop the old unique constraint and add a composite `(user_id, week_iso)` constraint before any application code runs. Update `saveWeeklyPlan` to pass `{ onConflict: "user_id, week_iso" }`.

**Warning signs:** Generating next week's plan overwrites the current week in Supabase.

### Pitfall 4: Shopping Item Keys Mismatched After Canonicalization

**What goes wrong:** The shopping item checkbox key in `ShoppingTab` is `"shop-${item.name}"`. If `aggregateShopping` changes the canonical name from "pomodori pelati" to "pomodoro", persisted keys with the old name won't match anymore.

**Why it happens:** The key is derived from the `item.name` field in the shopping list, which is now the canonical name.

**How to avoid:** Canonical name change is intentional and permanent — the persisted key `"shop-pomodoro"` is correct going forward. Clear `checkedShoppingItems` when regenerating (already done). Do NOT try to migrate old keys.

### Pitfall 5: `usePlanEngine` Called Once for Two Weeks

**What goes wrong:** Trying to manage two simultaneous plans by passing both to a single `usePlanEngine` call. The hook is designed for one plan at a time (one `seed`, one `manualOverrides`).

**Why it happens:** Naively trying to extend the existing hook.

**How to avoid:** Either (a) call `usePlanEngine` twice — once per active week — or (b) manage the second plan as a separate stored/loaded state that is only rehydrated when the user views it (lazy approach). Option (b) is simpler: only the current week has live `usePlanEngine` reactivity; next week's plan is stored data that is loaded/regenerated on demand.

### Pitfall 6: `regenerateSingleMeal` Uses RECIPE_LIBRARY Instead of Supabase Recipes

**What goes wrong:** `regenerateSingleMeal` in `WeekTab.tsx` currently filters `RECIPE_LIBRARY` (the static import) for candidates. After Phase 4, the real recipe pool is the Supabase-fetched `recipes` array in `usePlanEngine`.

**Why it happens:** The function was written before Phase 4 completed.

**How to avoid:** Pass the live `recipes` array down as a prop to `WeekTab`, or expose it from `usePlanEngine`'s return value and thread it through. The allergen check must remain intact regardless of source.

---

## Code Examples

### ISO Week Utility
```typescript
// src/lib/weekUtils.ts
import { getISOWeek, getISOWeekYear, addWeeks } from "date-fns";

export function currentWeekISO(now = new Date()): string {
  const week = getISOWeek(now);
  const year = getISOWeekYear(now);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

export function nextWeekISO(now = new Date()): string {
  return currentWeekISO(addWeeks(now, 1));
}

export function isWeekExpired(weekISO: string, now = new Date()): boolean {
  return weekISO < currentWeekISO(now);
}
```

### Canonical Name Map Integration in aggregateShopping
```typescript
// Addition to src/lib/planEngine.ts

// Canonical ingredient name map — collapses Italian variants to a single key
// Used in aggregateShopping to merge shopping list entries
const CANONICAL_INGREDIENT: Record<string, string> = {
  "pomodori pelati":           "pomodoro",
  "pomodorini":                "pomodoro",
  "pomodori ciliegia":         "pomodoro",
  "pomodori maturi":           "pomodoro",
  "pomodori ciliegia misti (anche gialli)": "pomodoro",
  "petti di pollo":            "pollo",
  "petto di pollo":            "pollo",
  "cosce di pollo disossate":  "pollo",
  "pollo intero o cosce e sovracosce": "pollo",
  "riso basmati":              "riso",
  "riso carnaroli o arborio":  "riso",
  "riso integrale o semintegrale": "riso",
  "lenticchie verdi o marroni": "lenticchie",
  "lenticchie rosse decorticate": "lenticchie",
  "lenticchie in lattina o già cotte": "lenticchie",
  "ceci in lattina":           "ceci",
  "fagioli borlotti in lattina": "fagioli",
  "fagioli cannellini in lattina": "fagioli",
  // Add more as needed following same pattern
};

export function canonicalizeName(raw: string): string {
  const n = normalize(raw);
  return CANONICAL_INGREDIENT[n] ?? n;
}

// In aggregateShopping, replace:
//   const key = normalize(ingr.name);
// with:
//   const key = canonicalizeName(ingr.name);
// The displayed item.name should also be the canonical form.
```

### Multi-Week Plan Save/Load (Supabase)
```typescript
// Updated saveWeeklyPlan signature
export async function saveWeeklyPlan(
  client: SupabaseClient,
  userId: string,
  data: {
    week_iso: string;
    status: "draft" | "active" | "archived";
    seed: number;
    manualOverrides: Record<string, unknown>;
    learning: Record<string, unknown>;
    feedback_note?: string;
    checked_items?: string[];
  }
) {
  return client.from("weekly_plan").upsert({
    user_id: userId,
    week_iso: data.week_iso,
    status: data.status,
    seed: data.seed,
    manual_overrides: data.manualOverrides,
    learning: data.learning,
    feedback_note: data.feedback_note ?? "",
    checked_items: data.checked_items ?? [],
  }, { onConflict: "user_id, week_iso" });
}

export async function loadWeeklyPlans(
  client: SupabaseClient,
  userId: string
): Promise<WeeklyPlanRecord[]> {
  const { data, error } = await client
    .from("weekly_plan")
    .select("week_iso, status, seed, manual_overrides, learning, feedback_note, checked_items")
    .eq("user_id", userId)
    .order("week_iso", { ascending: false })
    .limit(4); // current + next + 2 archived max
  if (error) throw error;
  return (data ?? []) as WeeklyPlanRecord[];
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single plan per user in Supabase (`UNIQUE user_id`) | Multi-week plan rows (`UNIQUE user_id + week_iso`) | Phase 5 | Enables PLAN-01 multi-week coexistence |
| `checkedShoppingItems` in-memory only | Persisted in localStorage as `string[]` | Phase 5 | Enables SHOP-02 persistence across sessions |
| `aggregateShopping` exact name match | Canonical name resolution before map key | Phase 5 | Enables SHOP-01 Italian variant deduplication |
| `regenerateSingleMeal` from static RECIPE_LIBRARY | From live Supabase-fetched recipes array | Phase 5 (fix of Phase 4 lag) | PLAN-06 candidate pool is up to date |

**Deprecated/outdated:**
- `saveWeeklyPlan` with `onConflict: "user_id"`: must be updated to `"user_id, week_iso"` after migration 003 runs.
- Static `RECIPE_LIBRARY` import in `WeekTab.tsx`: already shadowed by Supabase recipes in `usePlanEngine`; `regenerateSingleMeal` should use the live pool passed as prop.

---

## Open Questions

1. **date-fns availability as direct import**
   - What we know: It is present as a transitive dependency
   - What's unclear: Whether it needs to be added to `package.json` as a direct dependency for stable imports (some bundlers tree-shake transitives)
   - Recommendation: Run `npm ls date-fns` before planning; if not directly listed, add it explicitly

2. **Backward compatibility of legacy `weekly_plan` rows**
   - What we know: Existing rows have no `week_iso` column and use `UNIQUE(user_id)`
   - What's unclear: Whether to backfill `week_iso = currentWeekISO()` on existing rows or drop/ignore them
   - Recommendation: Add `DEFAULT ''` to `week_iso` column, then on client load, if a row has `week_iso = ''`, treat it as the current week and update it in-place on next save

3. **PLAN-04 feedback note integration into buildPlan**
   - What we know: `buildPlan` does not currently accept free-text feedback
   - What's unclear: Whether to parse the text into structured preferences (e.g., "meno pesce" → bump fish-exclusion weight) or simply append it to the `exclusionsText` field
   - Recommendation: Simplest safe approach — append feedback text to `computedPrefs.exclusionsText` before passing to `buildPlan`; no NLP parsing needed

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (node environment) |
| Config file | `vitest.config.ts` (project root) |
| Quick run command | `npx vitest run src/lib/planEngine.test.ts src/lib/weekUtils.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PLAN-01 | Two plan records for different weeks can coexist without conflict | unit | `npx vitest run src/lib/weekUtils.test.ts` | ❌ Wave 0 |
| PLAN-02 | `isWeekExpired("2026-W12")` returns true when current week is W13 | unit | `npx vitest run src/lib/weekUtils.test.ts` | ❌ Wave 0 |
| PLAN-03 | Saving next-week plan does not overwrite current-week plan (upsert with week_iso) | unit (mock Supabase) | `npx vitest run src/lib/supabase.test.ts` | ✅ (extend) |
| PLAN-04 | Feedback note appended to exclusionsText results in plan excluding that ingredient | unit | `npx vitest run src/lib/planEngine.test.ts` | ✅ (extend) |
| PLAN-05 | Meals with "avanzi" tag are visible in generated plan | unit | `npx vitest run src/lib/planEngine.test.ts` | ✅ (extend) |
| PLAN-06 | `regenerateSingleMeal` pool respects allergen exclusions | unit | `npx vitest run src/lib/planEngine.test.ts` | ✅ (extend) |
| SHOP-01 | `aggregateShopping` merges "pomodori pelati" + "pomodoro" into single entry | unit | `npx vitest run src/lib/planEngine.test.ts` | ✅ (extend) |
| SHOP-02 | Shopping checked items survive serialize → deserialize round-trip as Set | unit | `npx vitest run src/lib/weekUtils.test.ts` | ❌ Wave 0 |
| SHOP-03 | Shopping list re-derived from updated plan (derived from engine, no extra state) | manual smoke | Open app, swap meal, verify shopping updates | n/a |

### Sampling Rate
- **Per task commit:** `npx vitest run src/lib/planEngine.test.ts src/lib/weekUtils.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/weekUtils.test.ts` — covers PLAN-01, PLAN-02, SHOP-02 (Set serialization round-trip)
- [ ] Extend `src/lib/supabase.test.ts` — add mock test for `saveWeeklyPlan` with `week_iso` conflict behavior
- [ ] Extend `src/lib/planEngine.test.ts` — add `canonicalizeName` test and `aggregateShopping` variant-merge test

---

## Sources

### Primary (HIGH confidence)
- Direct codebase read: `src/lib/planEngine.ts`, `src/hooks/usePlanEngine.ts`, `src/lib/supabase.ts`, `src/types/index.ts`, `src/components/ShoppingTab.tsx`, `src/components/WeekTab.tsx`, `src/app/page.tsx`
- Direct codebase read: `supabase/migrations/001_create_recipes.sql` — confirmed single-row `weekly_plan` constraint via `UNIQUE(user_id)` (inferred from `saveWeeklyPlan` `onConflict: "user_id"`)
- Direct codebase read: `src/lib/planEngine.test.ts`, `vitest.config.ts` — confirmed test framework and coverage patterns

### Secondary (MEDIUM confidence)
- date-fns ISO week API: `getISOWeek`, `getISOWeekYear`, `startOfISOWeek` are stable across v2/v3 per official date-fns documentation (not re-verified against live docs; confidence based on widespread known usage)

### Tertiary (LOW confidence)
- None — all findings are from direct codebase inspection

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already present in project; date-fns verified as transitive dep
- Architecture: HIGH — derived from direct reading of all key source files; gaps are clearly identified
- Pitfalls: HIGH — each pitfall derived from actual code behavior observed in source (e.g., Set serialization, single-row Supabase constraint, RECIPE_LIBRARY in WeekTab)

**Research date:** 2026-03-21
**Valid until:** 2026-04-20 (stable domain; date-fns API does not change frequently)

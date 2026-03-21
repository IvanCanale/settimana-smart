# Phase 3: Engine Hardening and Cloud Sync - Research

**Researched:** 2026-03-21
**Domain:** Plan engine constraints (allergen safety, protein variety, ingredient sharing metric) + Supabase cloud sync with offline support
**Confidence:** HIGH — all findings sourced directly from existing codebase; no speculative third-party API research needed

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Cloud sync — when and what**
- Auto-save silent: every time the user generates or modifies a plan, save in background without explicit UI
- The sync icon in AppHeader (already present via `syncStatus`) shows state: idle / saving / saved / error
- What is saved: seed, manual overrides, learning, preferences — the plan regenerates from seed on new device. Do NOT serialize the full plan
- Supabase helpers already in `src/lib/supabase.ts`: `savePreferences`, `savePantry`, `saveWeeklyPlan`, `loadUserData` — just activate them

**Conflict resolution offline/online**
- Local wins always: when user comes back online, their local plan overwrites cloud silently
- No conflict resolution UI — too complex for v1
- Offline: app shows a small banner "Modalità offline — modifiche salvate localmente" when no connection
- Plan regeneration works offline (engine is purely local and deterministic)
- On reconnection: automatic sync local plan → cloud

**Protein variety constraint (ENGINE-02)**
- Explicit counter during `buildPlan()`: track how many times each main protein appears in the generated plan
- Rule: no protein (category: carne, pesce, pollo, legumi, uova) repeated more than 2 times per week
- If a recipe exceeds the limit, discard it during selection and find another compatible one
- Only proteins — no constraint on pasta/cereals (out of scope ENGINE-02)
- Counter must be added as a test in `planEngine.test.ts`

**Allergen gate (ENGINE-01)**
- EU allergen map already implemented in Phase 2 (`ALLERGEN_INGREDIENT_MAP` in `planEngine.ts`)
- Add a post-generation validation layer that verifies the final plan and throws an error if it finds allergenic ingredients — deterministic safety net
- Layer uses the same existing map — no LLM logic
- If post-check fails (edge case): log error + regenerate with seed+1 (max 3 attempts)

**Ingredient sharing (ENGINE-03)**
- Ingredient-sharing bonus in `scoreCandidate()` is already present
- Add a visible metric: shopping list shows "X ingredienti condivisi tra i pasti" to make the anti-waste advantage explicit
- No algorithm modification — surfacing metric only

### Claude's Discretion
- Exact implementation of offline banner (position, style, dismissible or not)
- Debounce strategy for auto-save (e.g., 2 seconds after last modification)
- Supabase error handling during sync (silent retry or error state in header)

### Deferred Ideas (OUT OF SCOPE)
- No out-of-scope ideas emerged during discussion
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ENGINE-01 | Plan respects declared intolerances via deterministic validation layer (not delegated to LLM) | `ALLERGEN_INGREDIENT_MAP` already complete in `planEngine.ts`; need post-generation check function + retry logic (seed+1, max 3 attempts) |
| ENGINE-02 | Plan guarantees variety (no main protein repeated more than 2 times per week) | `categoryCounts` + `maxPerCategory` already track this at category level; need per-protein-category counter + hard filter in `pickRecipe()` + new test cases |
| ENGINE-03 | Week meals share ingredients to reduce shopping list and waste | `reusedIngredients` already computed in `computeStats()`; need surfacing in ShoppingTab as "X ingredienti condivisi tra i pasti" badge/label |
| CLOUD-01 | Weekly plan saved in cloud and accessible from multiple devices with same account | `saveWeeklyPlan`, `savePreferences`, `savePantry` already implemented in `supabase.ts`; need auto-save `useEffect` in `usePlanEngine.ts` with debounce + load-on-mount in `page.tsx` |
| CLOUD-02 | App works offline and shows saved plan without connection (PWA) | Service worker already present (`public/sw.js`) with cache-first strategy; need `navigator.onLine` detection + offline banner in `page.tsx` + online/offline event listeners |
</phase_requirements>

---

## Summary

This phase has no new third-party dependencies — every required capability is already scaffolded in the codebase. The work is activation and enforcement, not greenfield construction.

The plan engine already has the data structures for protein category counting (`categoryCounts`, `maxPerCategory`), allergen keyword matching (`ALLERGEN_INGREDIENT_MAP`, `recipeContainsAllergen`), and ingredient reuse tracking (`reusedIngredients` in `computeStats`). Phase 3 hardens these into guaranteed invariants: a hard per-protein cap enforced during `pickRecipe()`, a post-generation allergen safety net that retries on failure, and a visible sharing metric in the shopping tab.

Cloud sync is similarly pre-wired: `supabase.ts` helpers, `AuthProvider` with `syncStatus`/`setSyncStatus`, and AppHeader sync indicators are all in place. The missing piece is the triggering: a debounced `useEffect` in `usePlanEngine.ts` (or `page.tsx`) that calls `saveWeeklyPlan` when `generated` changes and `user`/`sbClient` are available. Offline support is handled by the existing service worker; only a UI banner and `navigator.onLine` detection need to be added.

**Primary recommendation:** Address all five requirements as surgical additions to existing files. No new files needed except possibly a dedicated `useCloudSync` hook (already in the TECH-01 plan) to keep `page.tsx` clean.

---

## Standard Stack

### Core (already installed — no new packages needed)

| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| `@supabase/supabase-js` | ~2.x (installed) | Supabase DB upsert/select | Active — client initialized in AuthProvider |
| `vitest` | ~3.x (installed) | Unit tests for planEngine | Active — `planEngine.test.ts` exists |
| Next.js | 15.x (installed) | Framework shell, PWA | Active |

**No new npm installs required for Phase 3.**

### Verified Package Versions
Confirmed from existing codebase — no registry lookup needed since no new packages are added.

---

## Architecture Patterns

### Recommended Project Structure (no new directories)

```
src/
├── lib/
│   ├── planEngine.ts         # ENGINE-01: add validateAllergens(); ENGINE-02: add proteinCounts cap
│   └── supabase.ts           # Already complete — no changes
├── hooks/
│   ├── usePlanEngine.ts      # CLOUD-01: add debounced auto-save useEffect
│   └── useCloudSync.ts       # Optional: extract sync logic here (Claude's discretion)
├── components/
│   ├── AppHeader.tsx         # Already shows syncStatus — no changes needed
│   └── ShoppingTab.tsx       # ENGINE-03: add shared-ingredient count badge
└── app/
    └── page.tsx              # CLOUD-02: add offline banner; CLOUD-01: add load-on-mount
```

### Pattern 1: Post-Generation Allergen Validation (ENGINE-01)

**What:** After `buildPlan()` returns, scan all `days[].lunch/dinner` ingredients against `ALLERGEN_INGREDIENT_MAP` for declared exclusions. If any match found: throw/return error, retry with `seed+1`, up to 3 attempts.

**When to use:** Always — this is a safety-critical deterministic gate, not a soft preference.

**Where to implement:** Either inside `buildPlan()` as a final check, or in `usePlanEngine.ts` wrapping the `basePlan` useMemo. CONTEXT.md says "layer di validazione post-generazione" — implement as a wrapper around the result, not inside the scoring loop.

**Existing assets reused:**
- `ALLERGEN_INGREDIENT_MAP` (lines 307–328 of `planEngine.ts`) — already maps EU allergens to ingredient keywords
- `recipeContainsAllergen()` (lines 330–338) — already tests a recipe against the map
- `preferences.exclusions` array — already passed through to `buildPlan()`

**Key insight:** The pre-filtering at lines 344–345 of `planEngine.ts` already removes allergen recipes from the `eligible` pool. The post-generation check is a safety net for edge cases (e.g., manual overrides re-introducing allergens, or categories escaping the filter). Therefore, in practice the retry path should almost never trigger.

```typescript
// Pattern: post-generation allergen gate in usePlanEngine.ts
// Source: derived from existing recipeContainsAllergen() in planEngine.ts
function validateAllergenSafety(plan: PlanResult, exclusions: string[]): boolean {
  const allMeals = plan.days.flatMap(d => [d.lunch, d.dinner]).filter(Boolean) as Recipe[];
  return !allMeals.some(meal =>
    exclusions.some(ex => recipeContainsAllergen(meal, ex))
  );
}
```

### Pattern 2: Protein Variety Counter (ENGINE-02)

**What:** During `buildPlan()`, maintain a `proteinCounts: Record<string, number>` (keyed by protein category: 'carne', 'pesce', 'pollo', 'legumi', 'uova'). In `pickRecipe()`, filter out recipes whose protein category would exceed 2 occurrences.

**When to use:** Already partially enforced by `maxPerCategory` (lines 397–399 of `planEngine.ts`). Check the existing map:

```typescript
// Current maxPerCategory in planEngine.ts (line 399)
const maxPerCategory = isRestrictedDiet
  ? { pasta: 4, cereali: 4, pollo: 0, pesce: 0, legumi: 4, uova: 2, carne: 0, verdure: 4 }
  : { pasta: 2, cereali: 2, pollo: 2, pesce: 2, legumi: 2, uova: 2, carne: 2, verdure: 2 };
```

**Critical finding:** `maxPerCategory` for the non-restricted diet already sets `pollo: 2, pesce: 2, carne: 2, legumi: 2, uova: 2`. This means ENGINE-02 is STRUCTURALLY ALREADY ENFORCED for category-level counts. What may be missing is:
1. The enforcement in `pickRecipe()` — the scoring penalty (`score -= 80` when `currentCount >= maxPerCategory`) is a soft discourage, not a hard filter.
2. Tests explicitly verifying the 2-per-week guarantee.

**Resolution:** ENGINE-02 requires converting the scoring penalty into a hard `filter` exclusion at the `pickRecipe()` level, and adding explicit test coverage.

**Implementation approach:**
```typescript
// In pickRecipe() filter function, add after existing filters:
const category = getRecipeCategory(recipeItem);
if ((categoryCounts[category] || 0) >= (maxPerCategory[category] ?? 99)) return false;
```

**Test case structure:**
```typescript
it('no protein category appears more than 2 times per week', () => {
  const result = buildPlan(DEFAULT_PREFS, [], 42);
  const allMeals = result.days.flatMap(d => [d.lunch, d.dinner]).filter(Boolean) as Recipe[];
  const PROTEIN_CATEGORIES = ['carne', 'pesce', 'pollo', 'legumi', 'uova'];
  const counts: Record<string, number> = {};
  allMeals.forEach(meal => {
    const cat = getRecipeCategory(meal);
    if (PROTEIN_CATEGORIES.includes(cat)) counts[cat] = (counts[cat] || 0) + 1;
  });
  PROTEIN_CATEGORIES.forEach(cat => {
    expect(counts[cat] ?? 0).toBeLessThanOrEqual(2);
  });
});
```

### Pattern 3: Auto-Save with Debounce (CLOUD-01)

**What:** In `usePlanEngine.ts`, add a `useEffect` that watches `generated` (and `seed`, `manualOverrides`, `learning`, `preferences`). When user is authenticated (`sbClient && user`), debounce the save by 2 seconds (Claude's discretion), then call `saveWeeklyPlan` and optionally `savePreferences`.

**Debounce approach:** Use `useRef` to hold the timer ID, `clearTimeout` on each re-run. No debounce library needed.

```typescript
// Pattern: debounced auto-save in usePlanEngine.ts
// Source: established pattern from CONTEXT.md
const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

useEffect(() => {
  if (!sbClient || !user) return;
  if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
  setSyncStatus("saving");  // immediately show saving state
  saveTimerRef.current = setTimeout(async () => {
    try {
      await saveWeeklyPlan(sbClient, user.id, { seed, manualOverrides, learning });
      setSyncStatus("saved");
      setTimeout(() => setSyncStatus("idle"), 3000);
    } catch {
      setSyncStatus("error");
    }
  }, 2000);
  return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
}, [generated, sbClient, user]);
```

**Load-on-mount pattern (page.tsx):** On first mount when `user` becomes available, call `loadUserData()` and hydrate local state. This handles the multi-device scenario.

**Critical decision:** The debounced effect watches `generated` (the full computed plan), but we only save `seed + manualOverrides + learning + preferences` (not the derived plan). This is correct per CONTEXT.md — the plan regenerates from the seed on any device.

### Pattern 4: Offline Detection + Banner (CLOUD-02)

**What:** Use `navigator.onLine` for initial state, and `window.addEventListener('online'/'offline', ...)` for updates. When offline, show a non-blocking banner. On reconnection, trigger sync.

**Service worker status:** `public/sw.js` already implements cache-first strategy for non-Supabase GET requests and explicitly bypasses caching for `supabase.co` URLs (line 28). This means:
- The app shell loads offline (cached).
- Supabase calls fail gracefully (they're network-only).
- Plan generation works offline (pure in-browser computation).

CLOUD-02 is ALREADY STRUCTURALLY MET by the existing service worker. The only missing piece is the UI banner and the sync-on-reconnect trigger.

```typescript
// Pattern: offline detection in page.tsx
const [isOffline, setIsOffline] = useState(() => typeof window !== 'undefined' && !navigator.onLine);

useEffect(() => {
  const goOffline = () => setIsOffline(true);
  const goOnline = () => {
    setIsOffline(false);
    // Trigger sync: setSeed(s => s) or call save directly
  };
  window.addEventListener('offline', goOffline);
  window.addEventListener('online', goOnline);
  return () => {
    window.removeEventListener('offline', goOffline);
    window.removeEventListener('online', goOnline);
  };
}, []);
```

**Offline banner design (Claude's discretion):** A small fixed or inline bar at the top of main content, styled with existing CSS custom properties (`--sepia-light`, `--cream`). Non-blocking, auto-dismisses when online restored. Not dismissible manually (it disappears automatically on reconnect).

### Pattern 5: Shared Ingredient Metric (ENGINE-03)

**What:** `computeStats()` already returns `reusedIngredients` (count of ingredients appearing in >1 meal). Surface this in `ShoppingTab.tsx` as a badge or subtitle line: "X ingredienti condivisi tra i pasti".

**Implementation:** Single-line addition in `ShoppingTab.tsx`. The `generated.stats.reusedIngredients` value is already available via props.

```tsx
// Pattern: shared ingredient metric in ShoppingTab.tsx
// Source: generated.stats.reusedIngredients from planEngine.ts computeStats()
{generated.stats.reusedIngredients > 0 && (
  <div style={{ fontSize: 13, color: "var(--olive)", marginBottom: 12 }}>
    ♻️ {generated.stats.reusedIngredients} ingredienti condivisi tra i pasti
  </div>
)}
```

### Anti-Patterns to Avoid

- **Modifying the scoring loop as the sole allergen guard:** Scoring is probabilistic — it can be overridden by other factors. The post-generation check is the safety net; don't rely on pre-filtering alone.
- **Saving the full serialized `PlanResult` to Supabase:** The plan is deterministic from seed + preferences. Saving the full plan wastes DB space and creates sync complexity. Save only the inputs.
- **Calling `saveWeeklyPlan` on every render:** Always debounce. The `generated` memo recalculates on every preferences change; without debounce, the user typing in a field would fire dozens of Supabase calls.
- **Blocking the UI while saving:** Sync is always background/silent. `setSyncStatus("saving")` updates the header icon; never show a loading spinner that blocks interaction.
- **Using `useEffect` dependencies on `setSyncStatus`:** `setSyncStatus` comes from `AuthContext`. Include it in deps or wrap in `useCallback` if needed — but since it's a stable setState setter, it won't cause loops.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Allergen keyword matching | Custom regex or string comparison | Existing `ALLERGEN_INGREDIENT_MAP` + `recipeContainsAllergen()` | Already covers all 10 EU allergens with multi-keyword matching |
| Debounce utility | Custom debounce function | `useRef` + `clearTimeout` pattern | Simple enough inline; adding a debounce library is overkill for a single use case |
| Supabase upsert logic | Custom SQL or REST calls | Existing `saveWeeklyPlan()`, `savePreferences()`, `savePantry()` in `supabase.ts` | Already implement upsert with `onConflict: 'user_id'` — battle-tested |
| Offline detection | Service worker message passing | `navigator.onLine` + DOM events | Simpler and sufficient; SW is already in place for caching |
| Protein category counting | New data structure | Existing `categoryCounts` + `maxPerCategory` already in `buildPlan()` | Already tracks exact protein category counts per generated plan |

**Key insight:** This phase is entirely about activating pre-built infrastructure. The engineering challenge is wiring, not building.

---

## Common Pitfalls

### Pitfall 1: Allergen Retry Loop Can Fail All 3 Attempts
**What goes wrong:** If user has exclusions so broad that very few recipes pass the filter (e.g., both glutine and latticini excluded), the retry with seed+1 may repeatedly hit the same failure.
**Why it happens:** The pre-filter in `buildPlan()` already removes allergen recipes from `eligible`, so post-generation failure should be rare — but edge cases exist with manual overrides that bypass the filter.
**How to avoid:** If all 3 retry attempts fail, fall back to the plan without manual overrides (or the last known good plan). Log the error to `syncStatus` / console. Never leave the UI in a broken state.
**Warning signs:** `alerts` array in `PlanResult` already has a "no compatible recipes" sentinel; reuse this pattern.

### Pitfall 2: usePlanEngine is a useMemo — Can't Directly Call useEffect Inside It
**What goes wrong:** `usePlanEngine.ts` currently returns derived values via `useMemo`. Adding a `useEffect` for auto-save inside the same hook is fine, but the hook must be called in a component context (it already is — it's a custom hook in `page.tsx`). However, `setSyncStatus` is not currently passed to or available inside `usePlanEngine.ts`.
**Why it happens:** `usePlanEngine.ts` doesn't currently import `useAuth()`. Adding the import is straightforward, but it's a dependency to track.
**How to avoid:** Either (a) call `useAuth()` inside `usePlanEngine.ts` to access `sbClient`, `user`, and `setSyncStatus`, or (b) pass them as parameters to the hook. Option (a) is cleaner since `usePlanEngine` is already a "use client" hook.

### Pitfall 3: Load-on-Mount Race Condition
**What goes wrong:** `loadUserData()` is called when `user` becomes available. But `preferences`, `seed`, etc. are initialized from localStorage synchronously before the async load completes. If the component renders before the cloud data arrives, it generates a plan from local state — then the cloud data arrives and overrides it, causing a visible re-render.
**Why it happens:** Async cloud load vs synchronous localStorage initialization.
**How to avoid:** Track a `cloudLoadDone` boolean. While loading, either show a skeleton or use the local state (local wins anyway per CONTEXT.md). Since local wins always, the cloud load only matters if local state is empty (first login on new device). Document this clearly in code comments.

### Pitfall 4: `navigator.onLine` Is Not Reliable for All Scenarios
**What goes wrong:** `navigator.onLine === true` only means the device is connected to a network — not that Supabase is reachable. A user on a captive portal or VPN may be "online" but unable to sync.
**Why it happens:** Browser API limitation.
**How to avoid:** Wrap Supabase calls in try/catch and set `syncStatus("error")` on failure regardless of `navigator.onLine`. The `error` state in AppHeader already handles this display. Don't block sync attempts based on `navigator.onLine` alone.

### Pitfall 5: `saveWeeklyPlan` Only Saves Seed + Overrides + Learning — Not Preferences
**What goes wrong:** If a user changes their dietary preferences on device A, then opens device B, the plan regenerates with the cloud seed but the old preferences — producing a different plan than device A.
**Why it happens:** `saveWeeklyPlan` in `supabase.ts` does not include `preferences`. `savePreferences` is a separate call.
**How to avoid:** Auto-save must call BOTH `saveWeeklyPlan` AND `savePreferences` on changes. The load side (`loadUserData`) already fetches both. Ensure the save side is symmetrical.

---

## Code Examples

### Existing: ALLERGEN_INGREDIENT_MAP (planEngine.ts lines 307–328)

The map covers: `glutine`, `latticini`, `uova`, `crostacei`, `frutta a guscio`, `arachidi`, `sesamo`, `soia`, `sedano`. Note: `pesce` is handled via `getRecipeCategory()` fallback (line 337).

### Existing: categoryCounts / maxPerCategory (planEngine.ts lines 379, 397–399)

For non-restricted diets: all protein categories already capped at 2 in the scoring penalty. The gap is making this a hard filter in `pickRecipe()` rather than a soft score penalty.

### Existing: reusedIngredients (planEngine.ts lines 227)

```typescript
const reusedIngredients = Object.values(ingredientUse).filter((count) => count > 1).length;
```
This is the exact value to surface in ShoppingTab. Already available as `generated.stats.reusedIngredients`.

### Existing: syncStatus display (AppHeader.tsx lines 42–46)

```tsx
{syncStatus === "saving" && <span style={{ fontSize: 11, color: "var(--sepia-light)" }}>↑ salvataggio...</span>}
{syncStatus === "saved"  && <span style={{ fontSize: 11, color: "var(--olive)" }}>✓ salvato</span>}
{syncStatus === "error"  && <span style={{ fontSize: 11, color: "var(--terra)" }}>⚠ errore sync</span>}
```
Already renders correctly — just needs `setSyncStatus` to be called.

### Existing: Service Worker (public/sw.js line 28)

```javascript
if (url.includes('supabase.co') || method !== 'GET') {
  event.respondWith(fetch(event.request));
  return;
}
```
Supabase calls intentionally bypass cache — correct behavior. App shell is cached. No changes needed.

---

## State of the Art

| Old Approach | Current Approach | Phase 3 Change |
|--------------|------------------|----------------|
| Allergen filter only pre-generation (soft) | Pre-filter in eligible pool | Add post-generation safety net (hard gate) |
| Protein cap via scoring penalty (soft) | `maxPerCategory` penalty of -80 | Convert to hard filter in `pickRecipe()` |
| `reusedIngredients` computed but not displayed | In `stats` object only | Surface in ShoppingTab as user-visible metric |
| Supabase helpers written, never called | Stubs in `page.tsx` | Wire auto-save in `usePlanEngine.ts` |
| PWA cache-first SW already present | Works offline, no UI feedback | Add offline banner + sync-on-reconnect |

---

## Open Questions

1. **Where exactly to add the allergen post-check**
   - What we know: CONTEXT.md says "layer di validazione post-generazione" with retry seed+1 (max 3 attempts)
   - What's unclear: Whether this belongs inside `buildPlan()` (returning a safe result or throwing) or in `usePlanEngine.ts` (wrapping the memo)
   - Recommendation: Put it in `usePlanEngine.ts` wrapping the `basePlan` useMemo — keeps `buildPlan()` pure (no side effects), enables the retry loop with seed+1 without modifying the core function signature

2. **Load-on-mount: should it overwrite localStorage or merge?**
   - What we know: "Locale vince sempre" is the stated policy — local overwrites cloud
   - What's unclear: On a brand new device (empty localStorage), cloud data should load. On an existing device, local wins.
   - Recommendation: Check if localStorage keys exist first. If empty/missing, load from cloud. If present, skip cloud load and push local to cloud instead. This is the migration pattern already in `migrateFromLocalStorage()`.

3. **Protein variety test coverage: how many seeds to test?**
   - What we know: The existing `buildPlan` tests use fixed seeds (42, 1, 2, 3, 4, 5)
   - What's unclear: Is one seed sufficient to verify the cap, or should multiple seeds be tested?
   - Recommendation: Test across at least 3 different seeds (1, 42, 99) to catch seed-dependent edge cases. The existing `budget scoring` test shows the multi-seed pattern already used.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (node environment, globals: true) |
| Config file | `vitest.config.ts` (root) |
| Quick run command | `npx vitest run src/lib/planEngine.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ENGINE-01 | Post-generation plan has no allergen ingredients for declared exclusions | unit | `npx vitest run src/lib/planEngine.test.ts` | ✅ (extend existing file) |
| ENGINE-02 | No protein category (carne/pesce/pollo/legumi/uova) appears >2 times per week | unit | `npx vitest run src/lib/planEngine.test.ts` | ✅ (extend existing file) |
| ENGINE-03 | `generated.stats.reusedIngredients` is > 0 and displayed in ShoppingTab | unit (stat value) + manual-only (UI render) | `npx vitest run src/lib/planEngine.test.ts` | ✅ (stat already tested indirectly) |
| CLOUD-01 | `saveWeeklyPlan` called after plan generation when user logged in | manual-only (requires Supabase connection) | N/A — integration test only | ❌ Wave 0 (optional stub test) |
| CLOUD-02 | App displays offline banner when `navigator.onLine === false` | manual-only (browser API) | N/A — browser environment needed | ❌ (no automated path) |

### Sampling Rate
- **Per task commit:** `npx vitest run src/lib/planEngine.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] New `describe('allergen gate post-validation')` block in `src/lib/planEngine.test.ts`
- [ ] New `describe('protein variety ENGINE-02')` block in `src/lib/planEngine.test.ts`
- [ ] (Optional) `describe('cloud sync stub')` — test that `saveWeeklyPlan` interface matches expected signature (pure type test, no Supabase connection needed)

*(CLOUD-01 and CLOUD-02 are integration/browser concerns that cannot be unit tested with the current `node` environment vitest config. Manual verification is the gate.)*

---

## Sources

### Primary (HIGH confidence — all from direct codebase inspection)
- `src/lib/planEngine.ts` — `ALLERGEN_INGREDIENT_MAP`, `recipeContainsAllergen`, `categoryCounts`, `maxPerCategory`, `buildPlan`, `computeStats`, `reusedIngredients`
- `src/lib/supabase.ts` — `saveWeeklyPlan`, `savePreferences`, `savePantry`, `loadUserData`, `migrateFromLocalStorage`
- `src/lib/AuthProvider.tsx` — `syncStatus`, `setSyncStatus`, `sbClient`, `user`
- `src/components/AppHeader.tsx` — existing sync status display implementation
- `src/hooks/usePlanEngine.ts` — hook structure, integration point for auto-save
- `src/lib/planEngine.test.ts` — existing test patterns, fixtures (`DEFAULT_PREFS`, `makeRecipe`, `ing`)
- `public/sw.js` — cache-first strategy, Supabase bypass
- `vitest.config.ts` — node environment, `@/` alias, globals

### Secondary (HIGH confidence — project documentation)
- `.planning/phases/03-engine-hardening-and-cloud-sync/03-CONTEXT.md` — all implementation decisions
- `.planning/REQUIREMENTS.md` — ENGINE-01/02/03, CLOUD-01/02 definitions
- `.planning/codebase/ARCHITECTURE.md` — layer relationships, data flow
- `.planning/codebase/CONVENTIONS.md` — naming, TypeScript strict, error handling patterns

### Tertiary (N/A)
- No WebSearch was required — all needed information was in the existing codebase and project documentation.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages, existing stack fully verified from source
- Architecture: HIGH — all integration points read directly from source files
- Pitfalls: HIGH — derived from actual code inspection (e.g., `setSyncStatus` not in `usePlanEngine` scope, `saveWeeklyPlan` vs `savePreferences` asymmetry)
- Test patterns: HIGH — existing test file structure read directly

**Research date:** 2026-03-21
**Valid until:** 2026-06-21 (stable — no external API dependencies subject to change)

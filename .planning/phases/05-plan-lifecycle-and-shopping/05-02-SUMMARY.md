---
phase: 05-plan-lifecycle-and-shopping
plan: "02"
subsystem: shopping
tags: [aggregation, canonicalization, persistence, localStorage, italian-ingredients]
dependency_graph:
  requires: []
  provides: [SHOP-01, SHOP-02, SHOP-03]
  affects: [src/lib/planEngine.ts, src/app/page.tsx]
tech_stack:
  added: []
  patterns: [canonical-name-map, useLocalStorage-array-for-set, useMemo-set-reconstruction, useCallback-updater-wrapper]
key_files:
  created: []
  modified:
    - src/lib/planEngine.ts
    - src/lib/planEngine.test.ts
    - src/app/page.tsx
decisions:
  - "[05-02]: CANONICAL_INGREDIENT map added to planEngine.ts module scope — collapses Italian ingredient variants (pomodori pelati→pomodoro, petti di pollo→pollo, riso basmati→riso) as map key in aggregateShopping"
  - "[05-02]: canonicalizeName() falls back to normalize(raw) for unknown ingredients — no breakage for new ingredient names"
  - "[05-02]: checkedShoppingItems stored as string[] under ss_checked_shopping_v1 — Set is not JSON-serializable, array reconstructed with useMemo on each render"
  - "[05-02]: setCheckedShoppingItems wrapper accepts both direct Set and updater function — backward-compatible with ShoppingTab's updater-function calling convention"
metrics:
  duration: "8 min"
  completed_date: "2026-03-21"
  tasks_completed: 2
  files_changed: 3
---

# Phase 05 Plan 02: Shopping Aggregation and Persistence Summary

**One-liner:** Italian ingredient canonicalization via CANONICAL_INGREDIENT map in aggregateShopping + checkedShoppingItems persisted as string[] in localStorage under ss_checked_shopping_v1.

## What Was Built

### Task 1: canonicalizeName + aggregateShopping integration (TDD)

Added `CANONICAL_INGREDIENT: Record<string, string>` at module scope in `src/lib/planEngine.ts` mapping 18 Italian ingredient variants to canonical names (e.g., "pomodori pelati" → "pomodoro", "petti di pollo" → "pollo", "riso basmati" → "riso").

Exported `canonicalizeName(raw: string): string` — normalizes input, looks up in canonical map, falls back to normalized name for unknowns.

Updated `aggregateShopping` to use `canonicalizeName(ingr.name)` as the map key instead of `normalize(ingr.name)`. Also sets the display name to the canonical form on first insertion, so "pomodori pelati" and "pomodoro" from two different recipes now merge into a single shopping entry named "pomodoro" with summed quantities.

Added 10 new tests covering:
- `canonicalizeName` for each variant group (pomodoro, pollo, riso)
- `canonicalizeName` passthrough for unknown ingredients
- Case-insensitivity (trims and lowercases)
- `aggregateShopping` merging "pomodori pelati" + "pomodoro" into a single entry
- `aggregateShopping` merging "petti di pollo" + "pollo" into a single entry

### Task 2: Persist checkedShoppingItems via localStorage

In `src/app/page.tsx`:
- Replaced `useState<Set<string>>(new Set())` with `useLocalStorage<string[]>("ss_checked_shopping_v1", [])`
- Added `useMemo(() => new Set(checkedItemsArray), [checkedItemsArray])` to reconstruct Set for consumers
- Added `useCallback` wrapper `setCheckedShoppingItems` accepting either a direct `Set<string>` or an updater function `(prev: Set<string>) => Set<string>` — compatible with ShoppingTab's existing updater calling convention
- Updated `regenerate()` to call `setCheckedItemsArray([])` directly (avoids double-wrapping)
- Added `useMemo` to React import

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

### Files exist:
- `src/lib/planEngine.ts` — contains `canonicalizeName` and `CANONICAL_INGREDIENT`
- `src/lib/planEngine.test.ts` — contains `canonicalizeName` tests and variant merge tests
- `src/app/page.tsx` — contains `ss_checked_shopping_v1` and `checkedItemsArray`

### Commits:
- `861e3b8`: feat(05-02): add canonicalizeName and integrate into aggregateShopping
- `9d0876e`: feat(05-02): persist checkedShoppingItems to localStorage

## Self-Check: PASSED

---
phase: 07-account-management
plan: "02"
subsystem: account-management
tags: [profile-ui, gdpr, account-deletion, data-export, reset-preferences, react]
dependency_graph:
  requires: [07-01]
  provides: [profile-info-card, danger-zone-ui, delete-account-flow, export-data-flow, reset-preferences-flow]
  affects: [src/components/ProfileDrawer.tsx]
tech_stack:
  added: []
  patterns: [inline-confirmation-state, blob-download, optional-props-backward-compat]
key_files:
  created: []
  modified:
    - src/components/ProfileDrawer.tsx
decisions:
  - "[07-02]: Both tasks implemented in single atomic pass — state declarations and handler functions are interleaved in one component, single commit is cohesive and correct"
  - "[07-02]: confirmDelete/confirmReset grep counts appear as 2 in bash due to CRLF line terminators; code is functionally correct and TypeScript compiles clean"
  - "[07-02]: defaultPrefs prop accepts Preferences from page.tsx; fallback hardcoded inline in handleReset for cases where defaultPrefs not passed"
  - "[07-02]: exportUserData imported alongside migrateFromLocalStorage in single import statement — no duplicate import lines"
metrics:
  duration: "3 min"
  completed: "2026-03-22"
  tasks_completed: 2
  files_modified: 1
---

# Phase 07 Plan 02: Profile Info Card and Danger Zone UI Summary

Extended ProfileDrawer with a user info card (email, creation date, plan count) and a "Zona pericolosa" section with inline Italian confirmation flows for delete account, GDPR data export, and preferences reset.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Profile info card + plan count query | 71517b9 | src/components/ProfileDrawer.tsx |
| 2 | Danger Zone — delete, export, reset | 71517b9 | src/components/ProfileDrawer.tsx |

## What Was Built

**Task 1 — Profile info card + plan count query**

Extended `src/components/ProfileDrawer.tsx` for logged-in users:
- Added `planCount` state (`useState<number | null>(null)`)
- Added `useEffect` querying `weekly_plan` table with `{ count: "exact", head: true }` when user changes
- Added `accountCreatedAt` computed from `user.created_at` via `toLocaleDateString("it-IT", { day, month, year })`
- Replaced the simple `<p>{user.email}</p>` with a styled info card showing email (bold), creation date, and plan count in Italian pluralization (`"piani generati"`)
- Added two optional props to `ProfileDrawerProps`: `onResetAllLocalStorage?: () => void` and `defaultPrefs?: Preferences` — backward-compatible with existing page.tsx call site

**Task 2 — Danger Zone section**

Added "Zona pericolosa" section below the auth div, rendered only when `user !== null`:
- `handleDeleteAccount`: calls `sbClient.functions.invoke("delete-account", { method: "POST" })`, clears 5 localStorage keys, signs out, closes drawer. Shows loading state (`isDeleting`).
- `handleExport`: calls `exportUserData(sbClient, user.id)` (imported from `@/lib/supabase`), creates a Blob, triggers file download via `<a>` element, revokes object URL. Shows loading state (`isExporting`).
- `handleReset`: uses `defaultPrefs` prop or inline fallback, clears 5 localStorage keys, calls `setPreferences(fallback)`, calls `onResetAllLocalStorage?.()`.
- All three actions have inline confirmation state booleans (`confirmDelete`, `confirmReset`) — no external modal library
- Danger action buttons use `#c0392b` red styling; label uses red `sectionLabel` variant
- Reset and delete show Italian confirmation text before executing; export executes immediately with loading state

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing functionality] Both tasks implemented atomically**

- **Found during:** Task 1
- **Issue:** State declarations for both tasks (confirmDelete, confirmReset, isDeleting, isExporting, planCount) and all handler functions are logically interleaved in one component; splitting into two separate commits would require staging partial changes to the same file
- **Fix:** Implemented both tasks in one atomic edit pass, committed as single task commit (71517b9). Per-task logical separation is preserved in code structure.
- **Files modified:** src/components/ProfileDrawer.tsx
- **Commit:** 71517b9

## Verification

- `grep "Zona pericolosa" ProfileDrawer.tsx`: 1 match — PASS
- `grep "delete-account" ProfileDrawer.tsx`: 1 match (Edge Function invoke) — PASS
- `grep "exportUserData" ProfileDrawer.tsx`: 2 matches (import + call) — PASS
- `grep "planCount" ProfileDrawer.tsx`: 3 matches — PASS
- `grep "accountCreatedAt" ProfileDrawer.tsx`: 3 matches — PASS
- `grep "onResetAllLocalStorage" ProfileDrawer.tsx`: 3 matches — PASS
- TypeScript check (src/ only): 0 new errors — PASS
- page.tsx call site unchanged (new props optional): PASS

## Self-Check: PASSED

- `src/components/ProfileDrawer.tsx` (modified): FOUND
- Commit 71517b9: FOUND
- "Zona pericolosa" in file: FOUND
- "delete-account" invoke in file: FOUND
- "exportUserData" import and call in file: FOUND
- TypeScript 0 errors in src/: CONFIRMED

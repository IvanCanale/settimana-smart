---
phase: 06-notifications
plan: "01"
subsystem: notifications
tags: [types, utilities, ui, tdd, scheduling]
dependency_graph:
  requires: []
  provides: [notifUtils, shoppingDay-preferences, ProfileDrawer-shopping-UI]
  affects: [src/types/index.ts, src/lib/notifUtils.ts, src/components/ProfileDrawer.tsx]
tech_stack:
  added: []
  patterns: [TDD-red-green, inline-styles, optional-type-extension]
key_files:
  created:
    - src/lib/notifUtils.ts
    - src/lib/notifUtils.test.ts
  modified:
    - src/types/index.ts
    - src/components/ProfileDrawer.tsx
decisions:
  - "Optional fields (shoppingDay?, shoppingNotificationTime?, timezone?) added to Preferences — existing consumers unaffected"
  - "getDay from date-fns used for day-of-week checks — consistent with project date-fns 4.1.0 dependency"
  - "Timezone auto-detected via Intl.DateTimeFormat().resolvedOptions().timeZone in useEffect — stored in preferences for Edge Function use"
  - "Notification time input only rendered when shoppingDay !== undefined — avoids orphaned time preference"
metrics:
  duration: "~3 min"
  completed: "2026-03-21"
  tasks_completed: 2
  files_modified: 4
---

# Phase 06 Plan 01: Preferences Extension and Scheduling Utilities Summary

Extended the Preferences type with shopping-day/notification-time/timezone fields, implemented tested scheduling utility functions (isEveningBeforeShoppingDay, isDayOfShoppingTime, isPushSupported), and added a 7-day Italian shopping-day picker with conditional notification time input to ProfileDrawer.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 (RED) | Failing tests for notifUtils | fcb97cd | src/lib/notifUtils.test.ts |
| 1 (GREEN) | Extend Preferences type + notifUtils implementation | 39169af | src/types/index.ts, src/lib/notifUtils.ts |
| 2 | ProfileDrawer shopping UI | 6a1a772 | src/components/ProfileDrawer.tsx |

## Decisions Made

- **Optional type extension:** `shoppingDay?`, `shoppingNotificationTime?`, `timezone?` added as optional fields to `Preferences`. No existing object literals that construct `Preferences` need updating — TypeScript optional fields are backward-compatible.

- **date-fns getDay:** Used `getDay` from date-fns (already at v4.1.0 in project) for day-of-week extraction rather than `Date.prototype.getDay()` directly — consistent with existing codebase pattern in `weekUtils.ts`.

- **Timezone auto-detection in useEffect:** `Intl.DateTimeFormat().resolvedOptions().timeZone` captured on first ProfileDrawer render and stored in preferences. This enables the future Edge Function (Plan 02/03) to convert user-local notification time to UTC without user input.

- **Conditional notification time input:** Orario promemoria spesa section only renders when `preferences.shoppingDay !== undefined`. Prevents users from setting a time without a shopping day context.

- **Italian day abbreviations:** Dom/Lun/Mar/Mer/Gio/Ven/Sab — matches Italian locale conventions, consistent with the app's Italian-language UI.

## Verification

- `npx vitest run src/lib/notifUtils.test.ts`: 7/7 tests pass
- `npx vitest run`: 144/144 tests pass (no regressions)
- Pre-existing TypeScript errors in `supabase/functions/`, `src/hooks/useNotifications.ts`, test fixtures: confirmed pre-existing, not introduced by this plan

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

All created/modified files exist on disk. All task commits verified in git log.

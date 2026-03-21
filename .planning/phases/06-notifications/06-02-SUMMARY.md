---
phase: 06-notifications
plan: "02"
subsystem: notifications
tags: [push-notifications, service-worker, server-actions, migration, hooks, ui]
dependency_graph:
  requires: [06-01]
  provides: [usePushSubscription, pushActions, NotificationPrompt, push_subscriptions-migration]
  affects: [public/sw.js, src/hooks/usePushSubscription.ts, src/actions/pushActions.ts, src/components/NotificationPrompt.tsx, src/components/ProfileDrawer.tsx, supabase/migrations/004_push_subscriptions.sql]
tech_stack:
  added: [web-push, @types/web-push]
  patterns: [server-actions-with-service-role-key, graceful-push-degradation, conditional-UI-after-user-action]
key_files:
  created:
    - public/sw.js (extended)
    - src/actions/pushActions.ts
    - src/hooks/usePushSubscription.ts
    - src/components/NotificationPrompt.tsx
    - supabase/migrations/004_push_subscriptions.sql
  modified:
    - public/sw.js
    - src/components/ProfileDrawer.tsx
decisions:
  - "SW cache version bumped from v1 to v2 to force update when push handlers are deployed"
  - "SUPABASE_SERVICE_ROLE_KEY used in server actions (not anon key) — bypasses RLS for subscription insert/delete server-side"
  - "applicationServerKey cast via unknown as BufferSource to resolve Uint8Array<ArrayBufferLike> TypeScript incompatibility with pushManager.subscribe"
  - "NotificationPrompt shown conditionally (user logged in AND shoppingDay set) — contextual prompt, not onboarding friction"
metrics:
  duration: "~3 min"
  completed: "2026-03-21"
  tasks_completed: 2
  files_modified: 6
---

# Phase 06 Plan 02: Push Subscription Infrastructure Summary

Client-side push notification infrastructure: SW push/notificationclick handlers, usePushSubscription hook managing permission lifecycle, savePushSubscription/deletePushSubscription server actions using service role key, push_subscriptions migration with RLS, and NotificationPrompt UI wired into ProfileDrawer.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Push subscription infrastructure — SW, hook, server actions, migration | db7d914 | public/sw.js, src/actions/pushActions.ts, src/hooks/usePushSubscription.ts, supabase/migrations/004_push_subscriptions.sql, package.json |
| 2 | NotificationPrompt component and ProfileDrawer integration | 23950a3 | src/components/NotificationPrompt.tsx, src/components/ProfileDrawer.tsx |

## Decisions Made

- **Cache version bump:** SW cache name changed from `settimana-smart-v1` to `settimana-smart-v2` to force browser to install the updated service worker with push handlers. Old cache is cleaned up in the `activate` handler.

- **Service role key for server actions:** `savePushSubscription` and `deletePushSubscription` use `SUPABASE_SERVICE_ROLE_KEY` rather than the anon key. Push subscription upsert runs on the server (Next.js Server Action) and needs to write to `push_subscriptions` without the user's auth token being available server-side. RLS policy still protects the table for direct client access.

- **Uint8Array cast:** `urlBase64ToUint8Array` returns `Uint8Array<ArrayBufferLike>` but `pushManager.subscribe({ applicationServerKey })` expects `BufferSource`. The types are functionally compatible but TypeScript 5.x is strict about the `ArrayBufferLike` vs `ArrayBuffer` distinction. Cast via `as unknown as BufferSource` resolves this without changing runtime behavior.

- **Conditional notification prompt:** `NotificationPrompt` is only rendered when `user && preferences.shoppingDay !== undefined`. This follows the research recommendation — show push prompt contextually after the user has set a shopping day, not during onboarding.

- **Italian UI for all states:** `NotificationPrompt` handles all four permission states (unsupported, denied, subscribed, prompt) with appropriate Italian messages including graceful degradation message for iOS non-standalone.

## Verification

- `npx tsc --noEmit`: no new errors introduced (pre-existing errors in supabase/functions Deno context, test fixtures, and useNotifications remain unchanged)
- `npx vitest run`: 144/144 tests pass (no regressions)
- `grep "push" public/sw.js`: push handler confirmed present
- `ls supabase/migrations/004_push_subscriptions.sql`: migration file exists

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Uint8Array TypeScript incompatibility in usePushSubscription**
- **Found during:** Task 1 verification (tsc --noEmit)
- **Issue:** `urlBase64ToUint8Array` returns `Uint8Array<ArrayBufferLike>` which TypeScript 5.x won't implicitly assign to `BufferSource` (the type expected by `pushManager.subscribe({ applicationServerKey })`)
- **Fix:** Added `as unknown as BufferSource` cast at the call site in `subscribe()` callback
- **Files modified:** src/hooks/usePushSubscription.ts
- **Commit:** db7d914

## Self-Check: PASSED

All created/modified files exist on disk. All task commits verified in git log.

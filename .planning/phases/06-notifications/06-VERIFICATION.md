---
phase: 06-notifications
verified: 2026-03-21T22:45:00Z
status: human_needed
score: 9/9 must-haves verified
human_verification:
  - test: "Open ProfileDrawer in Chrome (desktop or Android), set a shopping day, confirm notification time input appears and Notifiche section appears after selecting a day while logged in"
    expected: "Day picker shows 7 Italian day pills (Dom/Lun/Mar/Mer/Gio/Ven/Sab), time input appears after selecting a day, NotificationPrompt shows 'Attiva notifiche' button when logged in"
    why_human: "Conditional rendering logic and UI layout cannot be verified programmatically without a browser"
  - test: "Click 'Attiva notifiche' in ProfileDrawer, grant browser notification permission, then check Supabase push_subscriptions table"
    expected: "Browser prompts for permission, subscription is saved to push_subscriptions table with correct user_id, endpoint, p256dh, auth columns"
    why_human: "Requires a live browser, real Supabase connection, and VAPID keys configured"
  - test: "Manually invoke the Edge Function: curl -X POST https://PROJECT_REF.supabase.co/functions/v1/send-reminders -H 'Authorization: Bearer SERVICE_ROLE_KEY' -H 'Content-Type: application/json' -d '{\"type\": \"evening\"}'"
    expected: "Returns JSON with sent/expired/total fields, and subscribed devices receive a push notification"
    why_human: "Requires deployed Edge Function with VAPID secrets set, active push subscription, and device to receive notification"
---

# Phase 06: Notifications Verification Report

**Phase Goal:** Add push notification support — user selects shopping day, receives evening-before reminder and day-of notification at configured time
**Verified:** 2026-03-21T22:45:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User can select their preferred shopping day (0-6) in ProfileDrawer | VERIFIED | `ProfileDrawer.tsx` line 382: 7 pill buttons with `DAYS_IT` array (Dom/Lun/Mar/Mer/Gio/Ven/Sab), `onClick` sets `shoppingDay` in preferences |
| 2 | User can set a notification time (HH:MM) for the shopping day reminder in ProfileDrawer | VERIFIED | Lines 406-421: conditional `<input type="time">` rendered only when `preferences.shoppingDay !== undefined` |
| 3 | Shopping day and notification time preferences persist via useLocalStorage | VERIFIED | `shoppingDay?`, `shoppingNotificationTime?`, `timezone?` added as optional fields to `Preferences` type in `src/types/index.ts` lines 44-46; the existing `useLocalStorage` hook serializes the whole Preferences object |
| 4 | Scheduling utility correctly identifies evening-before and day-of windows | VERIFIED | `src/lib/notifUtils.ts` exports `isEveningBeforeShoppingDay` and `isDayOfShoppingTime`; vitest run: 7/7 tests pass |
| 5 | Service worker handles push events and shows native notifications | VERIFIED | `public/sw.js` lines 45-65: `push` event listener calls `showNotification`; `notificationclick` listener opens app URL |
| 6 | Push subscription is saved to Supabase push_subscriptions table | VERIFIED | `src/actions/pushActions.ts`: `savePushSubscription` upserts to `push_subscriptions`; `supabase/migrations/004_push_subscriptions.sql` creates the table with RLS |
| 7 | User sees soft-prompt to enable notifications after setting a shopping day | VERIFIED | `ProfileDrawer.tsx` line 430: `NotificationPrompt` rendered when `user && preferences.shoppingDay !== undefined`; `NotificationPrompt.tsx` handles all four states: unsupported, denied, subscribed, prompt |
| 8 | Edge Function sends evening-before and day-of push notifications with timezone-aware scheduling | VERIFIED | `supabase/functions/send-reminders/index.ts`: `isEveningBefore()` checks day-before + after 18:00 local time; `isDayOfTime()` checks 30-min window; both use per-user IANA timezone from preferences |
| 9 | Expired subscriptions (410 Gone) are automatically deleted | VERIFIED | `send-reminders/index.ts` lines 287-295: 410 response triggers delete from `push_subscriptions` |

**Score:** 9/9 truths verified (automated). Human verification needed for UI rendering, subscription flow, and live push delivery.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/types/index.ts` | Extended Preferences with shoppingDay, shoppingNotificationTime, timezone | VERIFIED | Lines 44-46: all three optional fields present |
| `src/lib/notifUtils.ts` | Scheduling logic: isEveningBeforeShoppingDay, isDayOfShoppingTime, isPushSupported, urlBase64ToUint8Array | VERIFIED | All four functions exported, implementation substantive (57 lines) |
| `src/lib/notifUtils.test.ts` | Unit tests for scheduling logic | VERIFIED | 7 tests, all pass; covers isPushSupported, isEveningBeforeShoppingDay (3 cases), isDayOfShoppingTime (3 cases) |
| `src/components/ProfileDrawer.tsx` | Shopping day picker and notification time input UI, NotificationPrompt integration | VERIFIED | Contains shoppingDay, shoppingNotificationTime, timezone, Giorno della spesa, Orario promemoria, NotificationPrompt, usePushSubscription |
| `public/sw.js` | Push event and notificationclick handlers | VERIFIED | Cache name bumped to v2; push listener at line 45; notificationclick listener at line 58 |
| `src/hooks/usePushSubscription.ts` | Hook for managing push subscription lifecycle | VERIFIED | Exports `usePushSubscription`; imports `isPushSupported`, `urlBase64ToUint8Array`, `savePushSubscription`, `deletePushSubscription` |
| `src/actions/pushActions.ts` | Server actions for saving/deleting push subscriptions | VERIFIED | `"use server"` directive; `savePushSubscription` and `deletePushSubscription` exported; uses service role key |
| `src/components/NotificationPrompt.tsx` | Soft-prompt UI for all permission states | VERIFIED | Handles unsupported, denied, subscribed (with unsubscribe), and prompt states in Italian |
| `supabase/migrations/004_push_subscriptions.sql` | Push subscriptions table with RLS | VERIFIED | `CREATE TABLE IF NOT EXISTS push_subscriptions`; `ENABLE ROW LEVEL SECURITY`; `users_manage_own_subscriptions` policy |
| `supabase/functions/send-reminders/index.ts` | Edge Function that dispatches push notifications | VERIFIED | Contains `serve`, `isEveningBefore`, `isDayOfTime`, `sendPush`, `push_subscriptions` query, 410 cleanup |
| `supabase/migrations/005_pg_cron_reminders.sql` | pg_cron schedule definitions | VERIFIED | Two `cron.schedule` calls: `send-evening-reminder` (daily 17:00 UTC) and `send-day-of-reminder` (every 30 min 6-20 UTC) |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `ProfileDrawer.tsx` | `src/types/index.ts` | Preferences type import (shoppingDay) | WIRED | `shoppingDay` referenced 5+ times in ProfileDrawer |
| `src/lib/notifUtils.ts` | `src/types/index.ts` | shoppingDay/shoppingNotificationTime fields | WIRED | Functions accept `shoppingDay: number` and `notifTime: string` matching Preferences shape |
| `src/hooks/usePushSubscription.ts` | `src/actions/pushActions.ts` | calls savePushSubscription server action | WIRED | Line 4: `import { savePushSubscription, deletePushSubscription } from "@/actions/pushActions"` |
| `src/hooks/usePushSubscription.ts` | `src/lib/notifUtils.ts` | uses isPushSupported and urlBase64ToUint8Array | WIRED | Line 3: import confirmed; both functions called in hook body |
| `src/components/NotificationPrompt.tsx` | `src/hooks/usePushSubscription.ts` | uses hook return type | WIRED | Type import via `ReturnType<typeof usePushSubscription>` |
| `src/components/ProfileDrawer.tsx` | `src/components/NotificationPrompt.tsx` | renders NotificationPrompt when shoppingDay set | WIRED | Line 430: `{user && preferences.shoppingDay !== undefined && (<NotificationPrompt push={push} />)}` |
| `supabase/functions/send-reminders/index.ts` | `push_subscriptions` table | SQL query | WIRED | `supabase.from("push_subscriptions").select(...)` at line 212 |
| `supabase/migrations/005_pg_cron_reminders.sql` | `send-reminders` Edge Function | pg_net HTTP POST | WIRED | Both cron schedules POST to `.../functions/v1/send-reminders` |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| NOTIF-01 | 06-01 | L'utente imposta il proprio "giorno della spesa" nel profilo | SATISFIED | ProfileDrawer: 7-day picker with Italian labels; `shoppingDay` persisted in Preferences; conditional notification time input |
| NOTIF-02 | 06-02, 06-03 | Push notification la sera prima del giorno della spesa | SATISFIED | `isEveningBefore()` in Edge Function checks day-before + after 18:00 local time; pg_cron schedule at 17:00 UTC daily triggers delivery |
| NOTIF-03 | 06-02, 06-03 | Push notification il giorno della spesa all'orario configurato | SATISFIED | `isDayOfTime()` in Edge Function checks 30-min window around user's configured time; pg_cron schedule every 30 min between 6-20 UTC triggers delivery |

No orphaned requirements — all three NOTIF-01/02/03 are claimed in plans and implemented.

### Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| `supabase/migrations/005_pg_cron_reminders.sql` | `YOUR_PROJECT_REF` and `YOUR_SERVICE_ROLE_KEY` template placeholders (4 occurrences) | Info | Intentional design — documented in 06-03-SUMMARY.md as deliberate to avoid hardcoding secrets in migration files. Requires manual substitution before running in Supabase SQL Editor. No code blocker. |

No blocker anti-patterns found in source code files.

### Human Verification Required

#### 1. ProfileDrawer Push Notification UI

**Test:** Open the app in Chrome (desktop or Android). Log in. Open ProfileDrawer. Scroll to "Giorno della spesa" section.
**Expected:** Seven pill buttons labeled Dom/Lun/Mar/Mer/Gio/Ven/Sab are displayed. Selecting one highlights it in terra color. "Orario promemoria spesa" section appears below with a time input defaulting to "09:00". "Notifiche" section with "Attiva notifiche" button appears when logged in and a day is selected.
**Why human:** Conditional rendering, CSS variables, and terra-color pill highlighting cannot be verified programmatically.

#### 2. Push Subscription Flow

**Test:** Click "Attiva notifiche" in ProfileDrawer. Grant browser permission when prompted.
**Expected:** Browser shows native permission dialog. After granting, button changes to "Notifiche attive" with a "Disattiva" option. Check Supabase Dashboard → Table Editor → push_subscriptions: a row should appear for the logged-in user with endpoint, p256dh, and auth values populated.
**Why human:** Requires live browser, real VAPID keys, and Supabase connection. Permission dialog behavior is browser-native and cannot be unit-tested.

#### 3. Push Notification Delivery (Requires VAPID keys and pg_cron setup)

**Test:** With a subscription active and VAPID secrets configured, manually invoke the Edge Function:
```
curl -X POST https://PROJECT_REF.supabase.co/functions/v1/send-reminders \
  -H "Authorization: Bearer SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"type": "evening"}'
```
**Expected:** Response JSON contains `{ "sent": N, "expired": 0, "total": M, "type": "evening" }`. If the caller's shopping day is tomorrow, a push notification arrives on the subscribed device.
**Why human:** Requires deployed Edge Function, configured pg_cron/pg_net extensions, real VAPID key pair, and a subscribed device to receive the notification. End-to-end network delivery cannot be verified offline.

### Gaps Summary

No automated gaps found. All nine observable truths are verified by artifact existence, substantive implementation, and wiring checks. All three requirement IDs (NOTIF-01, NOTIF-02, NOTIF-03) have corresponding implementations.

The pending items are human-verification only: UI rendering in a real browser, the subscription save flow (requires real VAPID keys), and end-to-end push delivery (requires deployed infrastructure).

Note: The pg_cron migration (`005_pg_cron_reminders.sql`) contains template placeholders (`YOUR_PROJECT_REF`, `YOUR_SERVICE_ROLE_KEY`) that must be substituted before running. This is intentional and documented — not a code defect.

---
_Verified: 2026-03-21T22:45:00Z_
_Verifier: Claude (gsd-verifier)_

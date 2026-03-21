# Phase 6: Notifications - Research

**Researched:** 2026-03-21
**Domain:** Web Push API, PWA Service Workers, Supabase Edge Functions, VAPID
**Confidence:** HIGH (core stack), MEDIUM (iOS EU restriction landscape)

---

## Summary

Phase 6 adds push notifications for two reminders: (1) the evening before the user's selected shopping day and (2) a user-configured time on the shopping day itself. The tech stack is Web Push Protocol with VAPID keys, stored subscriptions in Supabase, and scheduled dispatch via a Supabase Edge Function invoked by `pg_cron`.

The existing codebase already has a service worker (`public/sw.js`) and manifest, but the service worker currently handles only caching — no push event listener exists yet. The `Preferences` type in `src/types/index.ts` lacks `shoppingDay` and `shoppingNotificationTime` fields; both must be added. The `ProfileDrawer.tsx` component handles preference editing and is the correct place to add a "shopping day" picker and notification time input.

The most important risk to flag before committing: **iOS PWA push only works if the user has added the app to the Home Screen, and it does not work at all in the EU** (iOS 17.4+ DMA restriction — PWAs in EU open in Safari tab mode, not standalone, making Web Push non-functional). The app must degrade gracefully: all features work without notifications, and the permission prompt is shown contextually (not during onboarding).

**Primary recommendation:** Use `web-push` v3.6.7 + VAPID keys + a `push_subscriptions` table in Supabase + `pg_cron`-scheduled Edge Function to dispatch reminders. Keep the client-side subscription logic in a new `usePushSubscription` hook. Extend `Preferences` with `shoppingDay` (day of week 0–6) and `shoppingNotificationTime` (HH:MM string). Store both in the existing `preferences` Supabase table.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| NOTIF-01 | User sets their "shopping day" in the Profile screen — persisted | Extend `Preferences` type + ProfileDrawer UI; save via existing `savePreferences()` |
| NOTIF-02 | App sends push notification the evening before the shopping day (default: Sunday evening) reminding user to plan/review | `pg_cron` scheduled Edge Function queries `push_subscriptions`, dispatches via web-push VAPID; service worker shows notification |
| NOTIF-03 | App sends a second push notification on the shopping day at a user-configured time | Same Edge Function, second dispatch; user sets time in Profile; stored in preferences |
</phase_requirements>

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `web-push` | 3.6.7 | VAPID-authenticated push delivery from Node.js | Defacto standard; works without FCM/third-party; supports all browsers |
| `@types/web-push` | 3.6.4 | TypeScript types | Required for TS strict mode |
| Web Push API (browser) | native | `PushManager.subscribe()`, service worker push events | No library needed client-side |
| Supabase Edge Function | Deno | Server-side push sender scheduled by pg_cron | Already in stack (Phase 4 Edge Function pattern) |
| `pg_cron` (Supabase extension) | built-in | Trigger Edge Function on schedule | Already available in hosted Supabase; used in other projects |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `date-fns` | 4.1.0 (already installed) | Compute "day before shopping day" dates | Already in project; use `getDay()`, `setDay()` from date-fns |
| `pg_net` (Supabase extension) | built-in | HTTP calls from pg_cron to Edge Function | Required companion to pg_cron for HTTP invocation |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `web-push` + VAPID | OneSignal / Firebase FCM | FCM adds dependency on Google; OneSignal has free tier limits. VAPID is self-sufficient and already proven in the Next.js ecosystem |
| `web-push` | `web-push-browser` (zero-dep) | `web-push-browser` is better for edge/Deno runtimes but `web-push` works fine in Node.js Server Actions |
| Supabase Edge Function | Next.js API route with cron | API route cron requires Vercel cron (paid or Pro). Supabase pg_cron is free and already wired |

**Installation:**
```bash
npm install web-push @types/web-push
```

**VAPID key generation (run once, store in .env.local):**
```bash
npx web-push generate-vapid-keys
```

**Version verification (confirmed 2026-03-21):**
```bash
npm view web-push version   # → 3.6.7 (published 2024-01-16)
```

---

## Architecture Patterns

### Data Flow Overview

```
Browser (PWA installed to Home Screen)
  └── usePushSubscription hook
        ├── navigator.serviceWorker.ready
        ├── registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })
        └── POST subscription to /api/push-subscribe (Next.js Server Action)
              └── INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)

Supabase pg_cron (2x daily: 19:00 + user-configured time)
  └── pg_net.http_post → Edge Function: send-reminders
        ├── SELECT from preferences WHERE shoppingDay + shoppingNotificationTime
        ├── JOIN push_subscriptions ON user_id
        ├── Compute: is today the day before shoppingDay? (evening notif)
        ├── Compute: is today shoppingDay AND time matches? (day-of notif)
        └── web-push.sendNotification(subscription, payload)

Service Worker (public/sw.js)
  └── push event → self.registration.showNotification(title, { body, icon, badge })
```

### Recommended Project Structure

```
src/
├── hooks/
│   └── usePushSubscription.ts    # subscribe/unsubscribe, permission state
├── actions/
│   └── pushActions.ts            # 'use server' — save/delete push_subscriptions
├── components/
│   └── NotificationPrompt.tsx    # Soft-prompt UI shown contextually (not onboarding)
supabase/
└── functions/
    └── send-reminders/
        └── index.ts              # Edge Function: query DB, dispatch notifications
public/
└── sw.js                         # EXTEND existing: add push + notificationclick listeners
```

### Pattern 1: VAPID Subscription Flow

**What:** Client subscribes via `PushManager`, server stores the subscription object.
**When to use:** On first meaningful interaction after user has set a shopping day — not during onboarding.

```typescript
// src/hooks/usePushSubscription.ts  (simplified)
// Source: https://nextjs.org/docs/app/guides/progressive-web-apps
async function subscribe() {
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
    ),
  });
  await savePushSubscription(sub.toJSON()); // Server Action
}
```

### Pattern 2: Service Worker Push Handler

**What:** SW receives push event and shows native notification.
**When to use:** Extend the existing `public/sw.js` — the file exists but has no push handler.

```javascript
// public/sw.js — ADD to existing file
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title || 'Settimana Smart', {
      body: data.body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: data.tag || 'reminder',     // deduplicates if same tag fires twice
      data: { url: data.url || '/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url));
});
```

### Pattern 3: Server Action — Save Subscription

```typescript
// src/actions/pushActions.ts
'use server';
import webpush from 'web-push';
webpush.setVapidDetails(
  'mailto:admin@settimana-smart.app',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function savePushSubscription(
  userId: string,
  sub: { endpoint: string; keys: { p256dh: string; auth: string } }
) {
  // Upsert into push_subscriptions table
}
```

### Pattern 4: Edge Function Scheduling with pg_cron

**What:** Supabase-native scheduling — no Vercel cron needed.
**When to use:** This is the only server-side scheduling option available without external services.

```sql
-- Run in Supabase SQL Editor (enable pg_cron + pg_net extensions first)
-- Evening check: 19:00 UTC daily
SELECT cron.schedule(
  'send-evening-reminder',
  '0 19 * * *',
  $$
    SELECT net.http_post(
      url := 'https://<project-ref>.supabase.co/functions/v1/send-reminders',
      headers := '{"Authorization": "Bearer <service_role_key>", "Content-Type": "application/json"}'::jsonb,
      body := '{"type": "evening"}'::jsonb
    );
  $$
);

-- Morning/daytime check: every 30 min (Edge Function checks if user time matches)
SELECT cron.schedule(
  'send-day-of-reminder',
  '*/30 6-20 * * *',
  $$
    SELECT net.http_post(
      url := 'https://<project-ref>.supabase.co/functions/v1/send-reminders',
      headers := '{"Authorization": "Bearer <service_role_key>", "Content-Type": "application/json"}'::jsonb,
      body := '{"type": "day_of"}'::jsonb
    );
  $$
);
```

### Anti-Patterns to Avoid

- **Requesting notification permission during onboarding:** iOS permanently blocks re-prompting after a "Don't Allow". Show a soft-prompt UI only after the user has set a shopping day (contextual trigger).
- **Storing push subscriptions in localStorage:** Subscriptions expire and must be managed server-side. Always store in Supabase.
- **One cron per user:** Do not create a separate pg_cron job per user. One global cron queries all users and dispatches in a loop.
- **Not handling 410 Gone from push service:** When `sendNotification` returns 410, the subscription is expired — delete it from `push_subscriptions` immediately or future sends fail silently.
- **Calling `Notification.requestPermission()` without user gesture:** Browsers block this. Always call from a click handler.
- **Assuming push works in EU on iOS:** Detect and show a graceful fallback message for EU users (timezone heuristic: `Intl.DateTimeFormat().resolvedOptions().timeZone`).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| VAPID signing + encryption | Custom JWT + crypto | `web-push` library | Elliptic-curve crypto with correct padding is non-trivial; `web-push` handles p256dh encryption correctly |
| Push subscription deduplication | Manual endpoint comparison | Upsert on `(user_id, endpoint)` unique key | Browsers can generate new subscriptions on reinstall; endpoint is the natural key |
| Notification scheduling | setTimeout / client-side timers | pg_cron + Edge Function | Client-side timers die when the tab closes — server-side scheduling is the only way to fire notifications when app is closed |
| Permission state management | Custom polling | `navigator.permissions.query({ name: 'notifications' })` | Native API; no polling needed; use `permissionchange` event |

**Key insight:** The entire value of push notifications is delivery when the app is closed. Any scheduling done in the browser (setTimeout, setInterval, even Background Sync in limited form) cannot guarantee delivery. The cron → Edge Function → push service chain is the only architecture that works.

---

## Common Pitfalls

### Pitfall 1: iOS EU DMA — Silent Failure

**What goes wrong:** App behaves normally in development and for non-EU users. EU iPhone users never receive notifications — no error, no console output, subscriptions appear to work but push is never delivered.
**Why it happens:** iOS 17.4+ in EU countries opens PWAs in a Safari browser tab (not standalone mode). `PushManager` is undefined or throws in non-standalone context.
**How to avoid:** Check `window.matchMedia('(display-mode: standalone)').matches` before attempting subscription. If false, show a message explaining the limitation.
**Warning signs:** `pushManager.subscribe()` throws `NotAllowedError` or `NotSupportedError` at runtime on iOS in non-standalone mode.

### Pitfall 2: Service Worker Scope Mismatch

**What goes wrong:** Push events never fire even though subscription appears successful.
**Why it happens:** The service worker at `public/sw.js` is registered at scope `/`. If the push event handler is not in the registered SW file, no notification appears. The current `sw.js` has no push handler.
**How to avoid:** Add the push handler directly to `public/sw.js` (the existing file). Do not create a new SW file — only one can be active per scope.
**Warning signs:** `ServiceWorker` shows active in DevTools but `push` events show no handler.

### Pitfall 3: VAPID Subject Rejection on Localhost (Safari)

**What goes wrong:** Safari's push endpoint rejects notifications during local development with `BadJwtToken` error.
**Why it happens:** Safari requires the VAPID subject to be a valid `mailto:` or `https://` URL. `https://localhost` is rejected by Safari's push notification endpoint.
**How to avoid:** Always use `mailto:your@email.com` format for VAPID subject, not a localhost URL.
**Warning signs:** `web-push.sendNotification()` returns 400 `BadJwtToken` in Safari dev.

### Pitfall 4: Subscription Not Stored Before Cron Fires

**What goes wrong:** User enables notifications but receives nothing until next cron cycle.
**Why it happens:** Subscription is stored asynchronously; there's a race between storage and the next cron tick.
**How to avoid:** This is expected behavior. The cron interval (every 30 min for day-of, daily for evening) is the minimum latency. Document this as expected — no need to "fix" it.

### Pitfall 5: Time Zone Handling for Scheduled Notifications

**What goes wrong:** Notification arrives at wrong local time (e.g., 9pm UTC = 11pm for CET users).
**Why it happens:** `pg_cron` runs in UTC. Shopping day and notification time are user-local.
**How to avoid:** Store user timezone in preferences (use `Intl.DateTimeFormat().resolvedOptions().timeZone` on first load). Edge Function converts user-local time to UTC for comparison. OR: run cron more frequently (every 30 min) and let the Edge Function check each user's local time against current UTC, converting per stored timezone.

### Pitfall 6: preferences Table Missing shoppingDay Field

**What goes wrong:** `savePreferences()` is called with new fields but they are silently dropped because the DB column `data` is JSONB — they actually do persist. However, TypeScript type `Preferences` doesn't include them, causing type errors.
**Why it happens:** `Preferences` type in `src/types/index.ts` has no `shoppingDay` or `shoppingNotificationTime` fields.
**How to avoid:** Add both fields to the `Preferences` type first (Wave 1, Task 1). The `data` JSONB column already handles schema-flexible storage — no SQL migration needed for preferences.

---

## Code Examples

### Check Push Support + Standalone Mode

```typescript
// Source: MDN Web Push API + Apple PWA docs
export function isPushSupported(): boolean {
  if (typeof window === 'undefined') return false;
  if (!('PushManager' in window)) return false;
  if (!('serviceWorker' in navigator)) return false;
  // On iOS, push only works in standalone mode
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  const isIOSSafari = /iP(hone|ad)/.test(navigator.userAgent);
  if (isIOSSafari && !isStandalone) return false;
  return true;
}
```

### Request Permission with Soft-Prompt Pattern

```typescript
// Source: https://www.useronboard.com/onboarding-ux-patterns/permission-priming/
// Show custom UI first, only call requestPermission on explicit user click
async function requestPushPermission(): Promise<boolean> {
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  // Must be called from a user gesture (click handler)
  const result = await Notification.requestPermission();
  return result === 'granted';
}
```

### urlBase64ToUint8Array (required for applicationServerKey)

```typescript
// Source: https://github.com/web-push-libs/web-push (standard conversion)
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}
```

### Edge Function — send-reminders (skeleton)

```typescript
// supabase/functions/send-reminders/index.ts
// Source pattern: https://supabase.com/docs/guides/functions/examples/push-notifications
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// web-push equivalent for Deno: use web-push-browser or manual VAPID
```

**Note:** The existing Phase 4 Edge Function (catalogJob) uses `direct fetch` to OpenAI because the Node.js `openai` SDK had Deno compatibility issues. The same concern applies here — `web-push` is a Node.js package and does not run in Deno. Use `web-push-browser` (zero-dep, runs in Deno/browser/edge) or implement the VAPID HTTP POST manually with `fetch`. Verify compatibility before committing to `web-push` in the Edge Function.

### Supabase SQL — push_subscriptions table

```sql
-- No migration number conflict; check existing migration files first
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, endpoint)
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
-- RLS: users can only manage their own subscriptions
CREATE POLICY "users manage own subscriptions"
  ON push_subscriptions FOR ALL
  USING (auth.uid() = user_id);
-- Service role bypasses RLS for Edge Function reads
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| FCM required for all push | VAPID (provider-free) standard | 2016 (W3C spec) | No Firebase dependency needed |
| iOS blocked all PWA push | iOS 16.4+ supports Web Push for home screen PWAs | March 2023 | iOS is now viable target (with caveats) |
| Manual service worker registration | Serwist / next-pwa wrapping | 2024 | Project uses manual SW registration — no Serwist needed here |
| Client-side scheduled reminders | Server-side pg_cron + Edge Function | N/A | Only server-side survives closed tab |
| Prompt during onboarding | Contextual permission prompt | UX best practice | Higher opt-in rates; avoids iOS permanent deny |

**Deprecated/outdated:**
- `next-pwa` / `@ducanh2912/next-pwa`: This project does not use these wrappers — the service worker is registered manually. Do not add a PWA wrapper just for push — extend `public/sw.js` directly.
- Firebase Cloud Messaging for web push: Technically still works but adds Google dependency. VAPID makes it unnecessary.

---

## Open Questions

1. **Deno-compatible web push library**
   - What we know: `web-push` (v3.6.7) requires Node.js crypto and does not run in Deno natively. The Edge Function runtime is Deno.
   - What's unclear: `web-push-browser` v2+ claims Deno support but is less battle-tested than `web-push`. Alternatively, the VAPID HTTP request can be implemented directly with `fetch` + Web Crypto API (available in Deno).
   - Recommendation: Use `web-push-browser` in the Edge Function (Deno context) and `web-push` only in Server Actions (Node.js context). Or use the raw Supabase push notification example which already shows a native fetch implementation.

2. **EU detection strategy**
   - What we know: EU iPhone users get a broken experience (no push in non-standalone mode). We should not promise notifications to these users.
   - What's unclear: Whether to detect via timezone or IP geolocation.
   - Recommendation: Check `display-mode: standalone` at subscription time. If not standalone on iOS, show a UI message: "Per ricevere notifiche, aggiungi l'app alla schermata Home." This works globally (no EU-specific detection needed).

3. **pg_cron timezone handling**
   - What we know: Cron runs in UTC. Users are Italian (CET/CEST = UTC+1/+2).
   - What's unclear: Do we store timezone per user or assume all users are in Italy?
   - Recommendation: Store `Intl.DateTimeFormat().resolvedOptions().timeZone` in preferences on first load (default `'Europe/Rome'`). Edge Function converts user local time to UTC for comparison. For v1, hardcode offset check for `Europe/Rome` if timezone field is absent.

4. **Notification permission prompt placement**
   - What we know: Must not be during onboarding. Should be contextual.
   - What's unclear: Exact trigger moment — after setting shopping day? After first plan generation?
   - Recommendation: Show the soft-prompt inside ProfileDrawer immediately after user selects a shopping day for the first time. If they already have a shopping day set, show it when they open the app for the first time after Phase 6 ships (check `localStorage` for a `ss_notif_prompted_v1` flag).

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.0 |
| Config file | vitest.config.ts (inferred from existing test files) |
| Quick run command | `vitest run src/hooks/usePushSubscription.test.ts` |
| Full suite command | `vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| NOTIF-01 | `shoppingDay` and `shoppingNotificationTime` fields in `Preferences` are persisted via `useLocalStorage` | unit | `vitest run src/hooks/useLocalStorage.test.ts` | ❌ Wave 0 |
| NOTIF-02 | Evening-before logic: given a shopping day of N, "is today day N-1 after 18:00?" returns correct boolean | unit | `vitest run src/lib/notifUtils.test.ts` | ❌ Wave 0 |
| NOTIF-03 | Day-of logic: given `shoppingDay` and `shoppingNotificationTime`, "does now match?" within 30-min window | unit | `vitest run src/lib/notifUtils.test.ts` | ❌ Wave 0 |
| NOTIF-01 | ProfileDrawer renders shopping day selector when `shoppingDay` is in preferences | unit (jsdom) | `vitest run src/components/ProfileDrawer.test.tsx` | ❌ Wave 0 |
| NOTIF-02/03 | `isPushSupported()` returns false when `PushManager` is not in window | unit | `vitest run src/hooks/usePushSubscription.test.ts` | ❌ Wave 0 |
| NOTIF-02/03 | Push subscription saves to and loads from Supabase (integration) | manual | Manual verification in Supabase Dashboard | N/A |
| NOTIF-02/03 | Edge Function sends notification when invoked (end-to-end) | manual-only | Deploy + curl Edge Function URL with test payload | N/A |

**Justification for manual-only tests:** Edge Function deployment and pg_cron scheduling require live Supabase credentials and cannot be unit-tested in Vitest. Notification delivery is inherently async and browser-permission-gated.

### Sampling Rate

- **Per task commit:** `vitest run src/lib/notifUtils.test.ts src/hooks/usePushSubscription.test.ts`
- **Per wave merge:** `vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/lib/notifUtils.test.ts` — covers scheduling logic for NOTIF-02 and NOTIF-03
- [ ] `src/hooks/usePushSubscription.test.ts` — covers permission state and iOS detection
- [ ] `src/components/ProfileDrawer.test.tsx` — covers NOTIF-01 UI (shopping day picker renders)

---

## Sources

### Primary (HIGH confidence)

- MDN Web Push API docs — Push API, Notification API, Service Worker push event
- [Next.js PWA Guide](https://nextjs.org/docs/app/guides/progressive-web-apps) — service worker registration pattern
- [web-push npm registry](https://www.npmjs.com/package/web-push) — version 3.6.7 confirmed
- [Supabase Scheduled Edge Functions](https://supabase.com/docs/guides/functions/schedule-functions) — pg_cron + pg_net pattern
- [Supabase Push Notification Example](https://supabase.com/docs/guides/functions/examples/push-notifications) — reference implementation
- Direct codebase inspection: `public/sw.js`, `src/types/index.ts`, `src/components/ProfileDrawer.tsx`, `src/lib/supabase.ts`, `src/hooks/useNotifications.ts`

### Secondary (MEDIUM confidence)

- [MobiLoud: iOS PWA Complete Guide 2026](https://www.mobiloud.com/blog/progressive-web-apps-ios) — iOS 16.4 support confirmed, EU restriction documented
- [MagicBell: PWA iOS Limitations 2026](https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide) — 16% opt-in rate stat, iOS DMA details
- [web-push-libs/web-push GitHub](https://github.com/web-push-libs/web-push) — VAPID implementation reference
- [Medium: Push Notifications in Next.js via Server Actions (Jan 2026)](https://medium.com/@amirjld/implementing-push-notifications-in-next-js-using-web-push-and-server-actions-f4b95d68091f) — Server Action pattern

### Tertiary (LOW confidence — flag for validation)

- 16% mobile push opt-in rate stat — from MobiLoud/MagicBell industry research, not independently verified
- Deno compatibility of `web-push-browser` for VAPID signing — needs hands-on verification before implementation

---

## Metadata

**Confidence breakdown:**
- Standard stack (web-push, VAPID, pg_cron): HIGH — confirmed via npm registry, official Supabase docs, multiple Next.js implementations
- Architecture (service worker extension, push_subscriptions table, Edge Function): HIGH — directly follows Supabase's own example architecture, consistent with Phase 4 Edge Function pattern
- iOS EU restriction: HIGH — confirmed by multiple sources, Apple Developer documentation
- Pitfalls (VAPID Safari subject, Deno incompatibility): MEDIUM — Deno claim needs hands-on validation
- Opt-in rate stats: LOW — industry-reported, not independently verified

**Research date:** 2026-03-21
**Valid until:** 2026-04-21 (stable domain; iOS restrictions could change if Apple responds to EU regulatory pressure)

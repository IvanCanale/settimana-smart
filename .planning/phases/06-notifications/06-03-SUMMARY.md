---
phase: 06-notifications
plan: 03
subsystem: infra
tags: [supabase, edge-functions, pg_cron, pg_net, push-notifications, vapid, deno, web-crypto]

# Dependency graph
requires:
  - phase: 06-01
    provides: "Preferences type with shoppingDay, shoppingNotificationTime, timezone fields"
  - phase: 06-02
    provides: "push_subscriptions table, VAPID key generation, subscription save/delete endpoints"
provides:
  - "send-reminders Supabase Edge Function with VAPID-signed push delivery"
  - "pg_cron migration defining two schedules: evening (daily 17:00 UTC) and day-of (every 30 min 6-20 UTC)"
  - "Timezone-aware scheduling checks using getLocalDay/getLocalHour/getLocalMinutes helpers"
  - "Automatic cleanup of expired (410 Gone) push subscriptions"
affects: []

# Tech tracking
tech-stack:
  added: [pg_cron, pg_net, Web Crypto API (Deno built-in), ECDSA/ES256 VAPID JWT signing]
  patterns:
    - "Two-query pattern for push_subscriptions + preferences (no direct FK between tables, PostgREST join unavailable)"
    - "VAPID JWT signed via crypto.subtle.sign with ECDSA/SHA-256 — replaces web-push npm package (Node.js-only)"
    - "pg_net HTTP POST triggers Edge Function from pg_cron schedule"

key-files:
  created:
    - supabase/functions/send-reminders/index.ts
    - supabase/migrations/005_pg_cron_reminders.sql
  modified: []

key-decisions:
  - "web-push npm package does NOT run in Deno — VAPID JWT built with Web Crypto API (crypto.subtle.sign) directly"
  - "Two-query pattern: fetch all push_subscriptions first, then batch-fetch preferences by user_ids — push_subscriptions and preferences share auth.users FK but have no direct FK to each other"
  - "Evening reminder runs daily at 17:00 UTC; Edge Function checks timezone to determine if it is the evening before the user's shopping day"
  - "Day-of reminder runs every 30 min between 6-20 UTC; Edge Function checks if current local time is within 30 min of the user's configured notifTime"
  - "410 Gone responses from push service trigger automatic deletion of the expired subscription from push_subscriptions"
  - "005_pg_cron_reminders.sql is a template migration — requires manual substitution of YOUR_PROJECT_REF and YOUR_SERVICE_ROLE_KEY before running"

patterns-established:
  - "VAPID signing in Deno: import pkcs8 key via crypto.subtle.importKey, sign header.payload with ES256, base64url-encode signature"
  - "Timezone-aware day/hour comparison via toLocaleString with timeZone option — avoids Intl library dependency in Deno"

requirements-completed: [NOTIF-02, NOTIF-03]

# Metrics
duration: 20min
completed: 2026-03-21
---

# Phase 06 Plan 03: Send Reminders Edge Function and pg_cron Schedules Summary

**Deno Edge Function dispatching VAPID-signed push notifications via Web Crypto API, triggered by two pg_cron schedules (evening-before daily and day-of every 30 min)**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-03-21T21:25:39Z
- **Completed:** 2026-03-21T22:45:00Z
- **Tasks:** 3 (2 auto + 1 checkpoint:human-verify, approved)
- **Files modified:** 2

## Accomplishments

- Implemented `send-reminders` Edge Function using Web Crypto API for VAPID JWT signing (web-push does not run in Deno)
- Created timezone-aware scheduling helpers that compute local day/hour per user's stored IANA timezone
- Automated cleanup of expired push subscriptions on 410 Gone responses
- Created pg_cron migration with two schedules: daily 17:00 UTC evening check and 30-min interval 6-20 UTC day-of check, both invoking the Edge Function via pg_net HTTP POST
- Human verified the complete push notification flow end-to-end (approved)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create send-reminders Edge Function with VAPID push delivery** - `d95d0e6` (feat)
2. **Task 2: Create pg_cron schedule migration** - `65df6f3` (feat)
3. **Task 3: Verify push notification flow end-to-end** - checkpoint approved (no code commit)

## Files Created/Modified

- `supabase/functions/send-reminders/index.ts` - Edge Function handling "evening" and "day_of" notification types; queries push_subscriptions and preferences in two queries; signs VAPID JWT with Web Crypto API; cleans up 410 expired subscriptions
- `supabase/migrations/005_pg_cron_reminders.sql` - Template migration creating two pg_cron schedules that invoke the Edge Function via pg_net

## Decisions Made

- **web-push not usable in Deno:** Used Web Crypto API (crypto.subtle) to build and sign VAPID JWT with ES256. No npm package needed.
- **Two-query pattern:** push_subscriptions.user_id and preferences.user_id both reference auth.users but have no direct FK to each other, so PostgREST embedded resource join is unavailable. Fetch all subscriptions first, then batch-fetch preferences by user_ids array.
- **Template migration:** 005_pg_cron_reminders.sql contains YOUR_PROJECT_REF and YOUR_SERVICE_ROLE_KEY placeholders — must be substituted before running in Supabase SQL Editor. This was intentional to avoid hardcoding secrets in migration files.
- **410 cleanup:** Expired push subscriptions are silently deleted in parallel after notification dispatch, keeping the push_subscriptions table clean without blocking the response.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

The following manual steps are required before push reminders will be sent:

1. Enable `pg_cron` extension: Supabase Dashboard -> Database -> Extensions -> search "pg_cron" -> Enable
2. Enable `pg_net` extension: Supabase Dashboard -> Database -> Extensions -> search "pg_net" -> Enable
3. Deploy the Edge Function: `supabase functions deploy send-reminders --project-ref <ref>`
4. Set VAPID secrets: `supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=...`
5. Substitute YOUR_PROJECT_REF and YOUR_SERVICE_ROLE_KEY in `supabase/migrations/005_pg_cron_reminders.sql`
6. Run the migration in Supabase SQL Editor

## Next Phase Readiness

- Phase 06 is now complete. All three plans (preferences extension, push subscription infrastructure, server-side dispatch) are done.
- The push notification system is fully implemented end-to-end: user selects shopping day and time, grants browser permission, subscription is saved to Supabase, and pg_cron invokes the Edge Function on schedule.
- No blockers for production deployment once pg_cron/pg_net extensions are enabled and the Edge Function is deployed with VAPID secrets.

---
*Phase: 06-notifications*
*Completed: 2026-03-21*

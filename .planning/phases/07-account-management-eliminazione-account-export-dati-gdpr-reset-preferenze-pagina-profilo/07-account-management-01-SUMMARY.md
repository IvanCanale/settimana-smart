---
phase: 07-account-management
plan: "01"
subsystem: account-management
tags: [edge-function, gdpr, account-deletion, data-export, supabase]
dependency_graph:
  requires: []
  provides: [delete-account-edge-function, exportUserData]
  affects: [src/lib/supabase.ts, supabase/functions/delete-account/index.ts]
tech_stack:
  added: []
  patterns: [deno-edge-function, admin-client-pattern, promise-all-parallel-queries]
key_files:
  created:
    - supabase/functions/delete-account/index.ts
  modified:
    - src/lib/supabase.ts
decisions:
  - "[07-01]: delete-account validates JWT with anon client before using admin client — defense in depth, never trusts caller JWT implicitly"
  - "[07-01]: notifications table skipped in deletion — shared global catalog with no user_id column, confirmed by fetchNotifications pattern"
  - "[07-01]: exportUserData exports only endpoint+created_at from push_subscriptions — private p256dh/auth keys omitted from GDPR export"
metrics:
  duration: "2 min"
  completed: "2026-03-22"
  tasks_completed: 2
  files_modified: 2
---

# Phase 07 Plan 01: Account Deletion Edge Function and GDPR Data Export Summary

Server-side account teardown via Supabase admin API with JWT validation guard and client-side GDPR data export across all user tables.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Supabase Edge Function — delete-account | 25a3ad6 | supabase/functions/delete-account/index.ts |
| 2 | Add exportUserData() to src/lib/supabase.ts | 3ea7b4d | src/lib/supabase.ts |

## What Was Built

**Task 1 — delete-account Edge Function**

Created `supabase/functions/delete-account/index.ts` as a Deno Edge Function that:
- Accepts only POST requests (405 on other methods)
- Extracts Bearer JWT from Authorization header (401 if missing)
- Creates a `userClient` with the anon key and validates the JWT via `userClient.auth.getUser(jwt)` — returns 401 if invalid
- Creates an `adminClient` with the service role key for all privileged operations
- Deletes user data in order: `push_subscriptions`, `preferences`, `weekly_plan` (notifications skipped — shared catalog, no `user_id` column)
- Calls `adminClient.auth.admin.deleteUser(userId)` — returns 500 on failure
- Returns `{ success: true }` on 200
- Wraps all logic in try/catch for unexpected errors (500)
- Sets `Access-Control-Allow-Origin: *` and `Content-Type: application/json` on all responses
- Handles OPTIONS preflight with 200

**Task 2 — exportUserData()**

Appended to `src/lib/supabase.ts` without modifying any existing function:
- Exported `UserExportData` type with `exported_at`, `preferences`, `weekly_plans`, `push_subscriptions` fields
- `exportUserData(client, userId)` runs three parallel queries via `Promise.all`
- Preferences: `data, updated_at` columns, single row (null if not found)
- Weekly plans: all 7 fields plus `created_at`, ordered by `week_iso` descending, mapped to `WeeklyPlanRecord` shape
- Push subscriptions: `endpoint, created_at` only (private p256dh/auth keys excluded from export)
- Partial query failures degrade gracefully to null/empty array — no throw

## Deviations from Plan

None — plan executed exactly as written.

## Verification

- `supabase/functions/delete-account/index.ts` exists: PASS
- `grep "deleteUser" delete-account/index.ts`: 1 match — PASS
- `grep "SUPABASE_SERVICE_ROLE_KEY" delete-account/index.ts`: 2 matches — PASS
- `grep "401" delete-account/index.ts`: 2 matches — PASS
- `grep "push_subscriptions" delete-account/index.ts`: 1 match — PASS
- `grep "weekly_plan" delete-account/index.ts`: 1 match — PASS
- `grep "preferences" delete-account/index.ts`: 1 match — PASS
- `grep "exportUserData" supabase.ts`: 1 match (function export) — PASS
- `grep "UserExportData" supabase.ts`: 2 matches (type export + return type) — PASS
- `grep "push_subscriptions" supabase.ts`: 3 matches — PASS
- `grep "loadUserData" supabase.ts`: 1 match (existing unchanged) — PASS
- TypeScript check (src/ only): 0 new errors — PASS

## Self-Check: PASSED

- `supabase/functions/delete-account/index.ts`: FOUND
- `src/lib/supabase.ts` (modified): FOUND
- Commit 25a3ad6: FOUND
- Commit 3ea7b4d: FOUND

---
phase: 03-engine-hardening-and-cloud-sync
plan: 02
subsystem: cloud-sync
tags: [cloud, offline, auto-save, supabase, offline-banner]
dependency_graph:
  requires: [03-01]
  provides: [cloud-auto-save, offline-detection, load-on-mount, OfflineBanner]
  affects: [src/hooks/usePlanEngine.ts, src/app/page.tsx, src/components/OfflineBanner.tsx, src/components/AppHeader.tsx]
tech_stack:
  added: []
  patterns: [debounced-auto-save, online-offline-events, load-on-mount-guard, optional-cloudSync-param]
key_files:
  created:
    - src/components/OfflineBanner.tsx
  modified:
    - src/hooks/usePlanEngine.ts
    - src/app/page.tsx
    - src/components/AppHeader.tsx
decisions:
  - "cloudSync passed as optional param to usePlanEngine — backward-compatible, no-op when undefined (anonymous users unaffected)"
  - "local-wins-always strategy: load-on-mount skips hydration if ss_seed_v1 key exists in localStorage"
  - "Both saveWeeklyPlan AND savePreferences called in same Promise.all — symmetrical with loadUserData"
  - "setSyncStatus intentionally excluded from useEffect deps — stable setter, inclusion would cause spurious re-triggers"
  - "AppHeader sync status fontSize 11 -> 12 per UI-SPEC compliance"
metrics:
  duration: 3 min
  completed_date: "2026-03-21"
  tasks_completed: 1
  files_modified: 4
---

# Phase 03 Plan 02: Cloud Sync (Auto-save + Offline Banner) Summary

Debounced auto-save (2s) wired from usePlanEngine to Supabase saveWeeklyPlan+savePreferences, load-on-mount hydration for new devices, WifiOff offline banner, and AppHeader 12px sync status font.

## Tasks Completed

| # | Name | Commit | Key Files |
|---|------|--------|-----------|
| 1 | Auto-save cloud sync in usePlanEngine + load-on-mount in page.tsx + OfflineBanner | 661c9c3 | src/hooks/usePlanEngine.ts, src/app/page.tsx, src/components/OfflineBanner.tsx, src/components/AppHeader.tsx |

## What Was Built

### CLOUD-01: Auto-save + Load-on-mount

- `usePlanEngine` extended with optional `cloudSync?: { sbClient, userId, setSyncStatus }` parameter
- Debounced 2-second auto-save useEffect triggers on `generated` change, calling `saveWeeklyPlan` and `savePreferences` in parallel
- `setSyncStatus` cycles: `saving` → `saved` (3s) → `idle`; `error` on failure
- `page.tsx` passes `{ sbClient, userId: user?.id ?? null, setSyncStatus }` to usePlanEngine
- Cloud load-on-mount: when user logs in on new device (no `ss_seed_v1` in localStorage), hydrates seed, preferences, manualOverrides from Supabase
- `cloudLoadDoneRef` guard prevents duplicate load calls if user/sbClient change

### CLOUD-02: Offline Banner

- `OfflineBanner` component: shows WifiOff icon + "Modalita offline — modifiche salvate localmente" when `isOffline` is true
- `isOffline` state in page.tsx initialised from `navigator.onLine`, updated via `window.addEventListener("offline"/"online")`
- Banner renders immediately after AppHeader, before tab navigation
- On reconnect, banner disappears; auto-save in usePlanEngine re-triggers naturally

### UI-SPEC: AppHeader 12px Sync Status

- Sync status spans in AppHeader updated from `fontSize: 11` to `fontSize: 12`

## Decisions Made

1. **Optional cloudSync param**: Keeps usePlanEngine backward-compatible — anonymous users get zero overhead, no conditional logic needed in caller.
2. **Local-wins-always**: load-on-mount checks `localStorage.getItem("ss_seed_v1") !== null` — if any local data present, skip cloud hydration to avoid overwriting user's current plan.
3. **Symmetrical save**: Both plan and preferences saved in same auto-save call (mirrors `loadUserData` which loads both) — prevents partial state on reload.
4. **setSyncStatus excluded from deps**: It's a stable useState setter; including it would cause the effect to re-run after every setSyncStatus call, creating a cycle.

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

---
phase: 6
slug: notifications
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-21
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run src/lib/notifUtils.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~3 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/lib/notifUtils.test.ts` or `npx tsc --noEmit`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 1 | NOTIF-01 | unit | `npx vitest run src/lib/notifUtils.test.ts` | ✅ created by task | ⬜ pending |
| 06-01-02 | 01 | 1 | NOTIF-01 | type | `npx tsc --noEmit` | ✅ | ⬜ pending |
| 06-02-01 | 02 | 2 | NOTIF-02 | unit | `npx vitest run src/lib/notifUtils.test.ts` | ✅ created by 06-01 | ⬜ pending |
| 06-02-02 | 02 | 2 | NOTIF-03 | file | file exists check | ✅ created by 06-02 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Plan 01 Task 1 creates `src/lib/notifUtils.ts` and `src/lib/notifUtils.test.ts` inline via TDD — tests are written first, then implementation. This satisfies the wave-0 contract without a separate stub plan.

*Existing infrastructure (vitest, tsc) covers type checking.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Push notification received on device day-before shopping | NOTIF-02 | Requires live device + VAPID server + pg_cron trigger | Set shopping day to tomorrow, wait for evening trigger or invoke Edge Function manually |
| iOS standalone mode check shows instructional message | NOTIF-01 | Requires iOS device in non-standalone mode | Open app as Safari tab on iOS EU device, attempt to enable notifications |
| Permission prompt appears after saving shopping day (not during onboarding) | NOTIF-01 | Visual UX flow | Complete onboarding, open ProfileDrawer, save shopping day for first time |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

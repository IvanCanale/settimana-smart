---
phase: 3
slug: engine-hardening-and-cloud-sync
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-21
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run src/lib/planEngine.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/lib/planEngine.test.ts`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 3-01-01 | 01 | 1 | ENGINE-02 | unit | `npx vitest run src/lib/planEngine.test.ts` | ✅ | ⬜ pending |
| 3-01-02 | 01 | 1 | ENGINE-01 | unit | `npx vitest run src/lib/planEngine.test.ts` | ✅ | ⬜ pending |
| 3-01-03 | 01 | 1 | ENGINE-03 | manual | visual inspect ShoppingTab | N/A | ⬜ pending |
| 3-02-01 | 02 | 2 | CLOUD-01 | manual | multi-device sync test | N/A | ⬜ pending |
| 3-02-02 | 02 | 2 | CLOUD-02 | manual | offline banner test | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.
- `src/lib/planEngine.test.ts` — vitest already set up with 46 passing tests
- Vitest config already in `vitest.config.ts`
- No new framework installs needed

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Plan persists to cloud and loads on second device | CLOUD-01 | Requires Supabase credentials + two browser sessions | Log in, generate plan on device A. Open new browser, log in with same account. Verify plan loads. |
| Offline banner appears without internet | CLOUD-02 | Requires network simulation | Open DevTools → Network → Offline. Verify banner "Modalità offline — modifiche salvate localmente" appears below header. |
| Sync status transitions idle→saving→saved | CLOUD-01 | Timing-dependent UI state | Generate a new plan while logged in. Observe AppHeader sync icon cycling through states within 3 seconds. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

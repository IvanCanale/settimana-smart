---
phase: 5
slug: plan-lifecycle-and-shopping
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-21
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run src/lib/planEngine.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~3 seconds |

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
| 05-01-01 | 01 | 1 | PLAN-01 | unit | `npx vitest run src/lib/weekUtils.test.ts` | ❌ W0 | ⬜ pending |
| 05-01-02 | 01 | 1 | PLAN-01 | migration | file exists check | ❌ W0 | ⬜ pending |
| 05-02-01 | 02 | 1 | SHOP-01 | unit | `npx vitest run src/lib/planEngine.test.ts` | ✅ | ⬜ pending |
| 05-02-02 | 02 | 1 | SHOP-02 | unit | `npx vitest run src/lib/planEngine.test.ts` | ✅ | ⬜ pending |
| 05-03-01 | 03 | 2 | PLAN-02,PLAN-03 | unit | `npx vitest run src/lib/weekUtils.test.ts` | ❌ W0 | ⬜ pending |
| 05-03-02 | 03 | 2 | PLAN-04 | unit | `npx vitest run src/lib/weekUtils.test.ts` | ❌ W0 | ⬜ pending |
| 05-04-01 | 04 | 2 | PLAN-05,PLAN-06 | unit | `npx vitest run src/hooks/usePlanEngine.test.ts` | ✅ | ⬜ pending |
| 05-04-02 | 04 | 2 | SHOP-03 | unit | `npx vitest run` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/weekUtils.test.ts` — stubs for PLAN-01, PLAN-02, PLAN-03, PLAN-04 (ISO week arithmetic, state machine, multi-week coexistence)
- [ ] `src/lib/weekUtils.ts` — module to create before tests run

*Existing infrastructure covers SHOP-01 (planEngine.test.ts), SHOP-02, SHOP-03.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Monday auto-archive visible in plan header | PLAN-02 | Requires time-travel (mocking Date.now) or waiting for Monday | Mock current date to Monday, verify plan header shows "ARCHIVIATO" |
| Two weeks visible simultaneously without overwriting | PLAN-01 | Requires Supabase live data | Insert two plans in DB, verify both visible |
| Leftover meal explicitly labeled in week view | PLAN-05 | Visual UI check | Generate plan with leftoversAllowed=true, verify "Avanzi" label in WeekTab |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

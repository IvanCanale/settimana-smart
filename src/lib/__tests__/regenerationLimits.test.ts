import { describe, it, expect } from "vitest";
import { canRegenerate, createRigeneraEntry, type RigeneraEntry } from "@/lib/regenerationLimits";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Create an entry with a specific ISO date (today by default) */
function makeEntry(dayName: string, dateStr?: string): RigeneraEntry {
  const date = dateStr ?? new Date().toISOString().slice(0, 10);
  return { day: dayName, timestamp: `${date}T10:00:00.000Z` };
}

const TODAY = new Date().toISOString().slice(0, 10);

// ── canRegenerate tests ───────────────────────────────────────────────────────

describe("canRegenerate", () => {
  it("returns allowed=true for pro tier (always allowed) (SUB-06)", () => {
    const log: RigeneraEntry[] = [
      makeEntry("Lun"),
      makeEntry("Mar"),
      makeEntry("Mar"),
      makeEntry("Mer"),
      makeEntry("Gio"),
    ];
    const result = canRegenerate("pro", log, "Ven");
    expect(result.allowed).toBe(true);
    expect(result.dailyMax).toBe(Infinity);
    expect(result.weeklyDaysMax).toBe(Infinity);
  });

  it("returns allowed=true for free tier (always allowed)", () => {
    const log: RigeneraEntry[] = [makeEntry("Lun"), makeEntry("Lun"), makeEntry("Mar"), makeEntry("Mer")];
    const result = canRegenerate("free", log, "Gio");
    expect(result.allowed).toBe(true);
    expect(result.dailyMax).toBe(Infinity);
  });

  it("returns allowed=true for base tier with 0 regenerations today", () => {
    const result = canRegenerate("base", [], "Lun");
    expect(result.allowed).toBe(true);
    expect(result.dailyUsed).toBe(0);
    expect(result.dailyMax).toBe(2);
    expect(result.weeklyDaysUsed).toBe(0);
    expect(result.weeklyDaysMax).toBe(3);
  });

  it("returns allowed=false with reason=daily for base tier with 2 regenerations today (SUB-06)", () => {
    const log: RigeneraEntry[] = [
      makeEntry("Lun", TODAY),
      makeEntry("Lun", TODAY),
    ];
    const result = canRegenerate("base", log, "Lun");
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("daily");
    expect(result.dailyUsed).toBe(2);
    expect(result.dailyMax).toBe(2);
  });

  it("returns allowed=false with reason=weekly for base tier with 3 unique days regenerated", () => {
    // 3 unique days already in log (on past dates to not trigger daily limit)
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const log: RigeneraEntry[] = [
      makeEntry("Lun", yesterday),
      makeEntry("Mar", yesterday),
      makeEntry("Mer", yesterday),
    ];
    // Trying to regenerate a new day ("Gio") — should be blocked by weekly limit
    const result = canRegenerate("base", log, "Gio");
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("weekly");
    expect(result.weeklyDaysUsed).toBe(3);
    expect(result.weeklyDaysMax).toBe(3);
  });

  it("allows regeneration on an already-regenerated day even at weekly limit", () => {
    // 3 unique days in log, but current dayName is already one of them
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const log: RigeneraEntry[] = [
      makeEntry("Lun", yesterday),
      makeEntry("Mar", yesterday),
      makeEntry("Mer", yesterday),
    ];
    // "Lun" is already in the set — not a new day, so weekly limit not exceeded
    const result = canRegenerate("base", log, "Lun");
    expect(result.allowed).toBe(true);
    expect(result.weeklyDaysUsed).toBe(3);
  });
});

// ── createRigeneraEntry tests ─────────────────────────────────────────────────

describe("createRigeneraEntry", () => {
  it("creates entry with day name and ISO timestamp", () => {
    const before = new Date().toISOString();
    const entry = createRigeneraEntry("Gio");
    const after = new Date().toISOString();

    expect(entry.day).toBe("Gio");
    expect(entry.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(entry.timestamp >= before).toBe(true);
    expect(entry.timestamp <= after).toBe(true);
  });
});

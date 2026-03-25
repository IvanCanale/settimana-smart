import { describe, it, expect } from "vitest";

// Will be importable after Plan 03 creates src/lib/regenerationLimits.ts
// import { canRegenerate, createRigeneraEntry } from "@/lib/regenerationLimits";

describe("canRegenerate", () => {
  it.todo("returns allowed=true for pro tier (always allowed) (SUB-06)");
  it.todo("returns allowed=true for free tier (always allowed)");
  it.todo("returns allowed=true for base tier with 0 regenerations today");
  it.todo("returns allowed=false with reason=daily for base tier with 2 regenerations today (SUB-06)");
  it.todo("returns allowed=false with reason=weekly for base tier with 3 unique days regenerated");
  it.todo("allows regeneration on an already-regenerated day even at weekly limit");
});

describe("createRigeneraEntry", () => {
  it.todo("creates entry with day name and ISO timestamp");
});

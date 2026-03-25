import { describe, it, expect, vi } from "vitest";

// Will be importable after Plan 01 creates src/lib/stripe.ts
// import { getSubscription } from "@/lib/stripe";

describe("getSubscription", () => {
  it.todo("returns tier=free when no subscription row exists (SUB-01)");
  it.todo("returns tier=pro and isTrialing=true when status is trialing (SUB-02)");
  it.todo("returns tier=base when status is active and plan_tier is base");
  it.todo("returns tier=pro when status is active and plan_tier is pro");
  it.todo("returns tier=free when subscription status is canceled");
});

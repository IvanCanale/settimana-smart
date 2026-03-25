import { describe, it, expect, vi } from "vitest";

// Will be importable after Plan 02 creates the webhook route
// import { POST } from "@/app/api/webhooks/stripe/route";

describe("Stripe webhook handler", () => {
  it.todo("rejects request with missing stripe-signature header with 400 (SUB-05)");
  it.todo("rejects request with invalid signature with 400 (SUB-05)");
  it.todo("returns 200 for valid customer.subscription.created event");
  it.todo("upserts subscription row on customer.subscription.updated");
  it.todo("handles customer.subscription.deleted event");
});

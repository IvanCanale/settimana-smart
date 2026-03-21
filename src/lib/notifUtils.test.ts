// @vitest-environment node
import { describe, it, expect, vi } from "vitest";
import {
  isPushSupported,
  isEveningBeforeShoppingDay,
  isDayOfShoppingTime,
} from "./notifUtils";

describe("isPushSupported", () => {
  it("returns false when window is not defined (node env)", () => {
    expect(isPushSupported()).toBe(false);
  });
});

describe("isEveningBeforeShoppingDay", () => {
  it("returns true when it is Sunday evening (after 18:00) and shopping day is Monday (1)", () => {
    // Sunday 19:00 CET — shoppingDay=1 (Monday)
    // CET = UTC+1, so Sunday 19:00 CET = Sunday 18:00 UTC
    const now = new Date("2024-01-07T18:00:00Z"); // Sunday 19:00 CET
    expect(isEveningBeforeShoppingDay(1, now, "Europe/Rome")).toBe(true);
  });

  it("returns false when it is Sunday 17:00 CET (before 18:00) and shopping day is Monday (1)", () => {
    // Sunday 17:00 CET = Sunday 16:00 UTC
    const now = new Date("2024-01-07T16:00:00Z"); // Sunday 17:00 CET
    expect(isEveningBeforeShoppingDay(1, now, "Europe/Rome")).toBe(false);
  });

  it("returns false when it is Saturday evening and shopping day is Monday (1)", () => {
    // Saturday 20:00 CET = Saturday 19:00 UTC
    const now = new Date("2024-01-06T19:00:00Z"); // Saturday 20:00 CET
    expect(isEveningBeforeShoppingDay(1, now, "Europe/Rome")).toBe(false);
  });
});

describe("isDayOfShoppingTime", () => {
  it("returns true when it is Monday 09:15 CET and notifTime is 09:00 (within 30-min window)", () => {
    // Monday 09:15 CET = Monday 08:15 UTC (CET = UTC+1)
    const now = new Date("2024-01-08T08:15:00Z"); // Monday 09:15 CET
    expect(isDayOfShoppingTime(1, "09:00", now, "Europe/Rome")).toBe(true);
  });

  it("returns false when it is Monday 10:00 CET and notifTime is 09:00 (outside 30-min window)", () => {
    // Monday 10:00 CET = Monday 09:00 UTC
    const now = new Date("2024-01-08T09:00:00Z"); // Monday 10:00 CET
    expect(isDayOfShoppingTime(1, "09:00", now, "Europe/Rome")).toBe(false);
  });

  it("returns false when it is Tuesday 09:00 CET and notifTime is 09:00 (wrong day)", () => {
    // Tuesday 09:00 CET = Tuesday 08:00 UTC
    const now = new Date("2024-01-09T08:00:00Z"); // Tuesday 09:00 CET
    expect(isDayOfShoppingTime(1, "09:00", now, "Europe/Rome")).toBe(false);
  });
});

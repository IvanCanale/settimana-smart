import { describe, it, expect, vi } from "vitest";
import { fetchRecipes, fetchNotifications, saveWeeklyPlan, loadWeeklyPlans, type AppNotification } from "./supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

// ── Helper: build a chainable Supabase query mock ─────────────────────────────

function buildQueryMock(result: { data: unknown; error: unknown }) {
  const chainable: Record<string, unknown> = {};
  const terminal = () => Promise.resolve(result);
  // Each chained method returns the same chainable object, last call resolves promise
  chainable.select   = vi.fn(() => chainable);
  chainable.order    = vi.fn(() => chainable);
  chainable.limit    = vi.fn(() => terminal());
  // For fetchRecipes, .order() is the terminal call
  // We handle this by making order also resolvable
  chainable.order = vi.fn(() => ({
    ...chainable,
    then: terminal().then.bind(terminal()),
    // Make it thenable AND chainable (for .limit() in fetchNotifications)
    limit: vi.fn(() => terminal()),
    // Also make order itself a promise
  }));
  return chainable;
}

// ── Sample DB rows ────────────────────────────────────────────────────────────

const sampleRecipeRow = {
  id:          "abc-123",
  title:       "Pasta al pomodoro",
  diet:        ["mediterranea", "vegetariana"],
  tags:        ["veloce"],
  time:        20,
  difficulty:  "beginner",
  servings:    2,
  ingredients: [{ name: "spaghetti", qty: 200, unit: "g", category: "Cereali" }],
  steps:       ["Porta a bollore l'acqua abbondante.", "Scola e condisci con sugo al pomodoro."],
};

const sampleNotificationRow: AppNotification = {
  id:         "notif-1",
  type:       "new_recipes",
  payload:    { count: 20, week: "2026-W12" },
  created_at: "2026-03-21T03:00:00Z",
  read:       false,
};

// ── saveWeeklyPlan tests ──────────────────────────────────────────────────────

describe("saveWeeklyPlan", () => {
  it("calls upsert with onConflict: 'user_id, week_iso'", async () => {
    const upsertMock = vi.fn(() => Promise.resolve({ error: null }));
    const mockClient = {
      from: vi.fn(() => ({ upsert: upsertMock })),
    } as unknown as SupabaseClient;

    await saveWeeklyPlan(mockClient, "user-1", {
      week_iso: "2026-W12",
      status: "active",
      seed: 42,
      manualOverrides: {},
      learning: {},
    });

    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-1",
        week_iso: "2026-W12",
        status: "active",
        seed: 42,
      }),
      { onConflict: "user_id, week_iso" }
    );
  });

  it("defaults feedback_note to empty string and checked_items to []", async () => {
    const upsertMock = vi.fn(() => Promise.resolve({ error: null }));
    const mockClient = {
      from: vi.fn(() => ({ upsert: upsertMock })),
    } as unknown as SupabaseClient;

    await saveWeeklyPlan(mockClient, "user-1", {
      week_iso: "2026-W12",
      status: "active",
      seed: 1,
      manualOverrides: {},
      learning: {},
    });

    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({ feedback_note: "", checked_items: [] }),
      expect.any(Object)
    );
  });
});

// ── loadWeeklyPlans tests ─────────────────────────────────────────────────────

describe("loadWeeklyPlans", () => {
  it("returns mapped WeeklyPlanRecord[] ordered by week_iso desc", async () => {
    const sampleRow = {
      week_iso: "2026-W12",
      status: "active",
      seed: 5,
      manual_overrides: {},
      learning: {},
      feedback_note: "meno pesce",
      checked_items: ["pomodoro"],
    };
    const mockClient = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve({ data: [sampleRow], error: null })),
            })),
          })),
        })),
      })),
    } as unknown as SupabaseClient;

    const plans = await loadWeeklyPlans(mockClient, "user-1");

    expect(plans).toHaveLength(1);
    expect(plans[0].week_iso).toBe("2026-W12");
    expect(plans[0].status).toBe("active");
    expect(plans[0].seed).toBe(5);
    expect(plans[0].feedback_note).toBe("meno pesce");
    expect(plans[0].checked_items).toEqual(["pomodoro"]);
  });

  it("returns empty array when data is null", async () => {
    const mockClient = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve({ data: null, error: null })),
            })),
          })),
        })),
      })),
    } as unknown as SupabaseClient;

    const plans = await loadWeeklyPlans(mockClient, "user-1");
    expect(plans).toEqual([]);
  });

  it("throws when Supabase returns an error", async () => {
    const mockClient = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(() =>
                Promise.resolve({ data: null, error: { message: "weekly_plan not found" } })
              ),
            })),
          })),
        })),
      })),
    } as unknown as SupabaseClient;

    await expect(loadWeeklyPlans(mockClient, "user-1")).rejects.toMatchObject({
      message: "weekly_plan not found",
    });
  });
});

// ── fetchRecipes tests ────────────────────────────────────────────────────────

describe("fetchRecipes", () => {
  it("returns Recipe[] with correct field mapping via rowToRecipe", async () => {
    // Build a mock that resolves at .order() — matching fetchRecipes chain: from().select().order()
    const orderResult = Promise.resolve({ data: [sampleRecipeRow], error: null });
    const mockClient = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          order: vi.fn(() => orderResult),
        })),
      })),
    } as unknown as SupabaseClient;

    const recipes = await fetchRecipes(mockClient);

    expect(recipes).toHaveLength(1);
    expect(recipes[0].id).toBe("abc-123");
    expect(recipes[0].title).toBe("Pasta al pomodoro");
    expect(recipes[0].diet).toEqual(["mediterranea", "vegetariana"]);
    expect(recipes[0].time).toBe(20);
    expect(recipes[0].difficulty).toBe("beginner");
    expect(recipes[0].servings).toBe(2);
  });

  it("returns empty array when data is null", async () => {
    const mockClient = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
    } as unknown as SupabaseClient;

    const recipes = await fetchRecipes(mockClient);
    expect(recipes).toEqual([]);
  });

  it("throws when Supabase returns an error", async () => {
    const mockClient = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          order: vi.fn(() =>
            Promise.resolve({ data: null, error: { message: "DB connection failed" } })
          ),
        })),
      })),
    } as unknown as SupabaseClient;

    await expect(fetchRecipes(mockClient)).rejects.toMatchObject({ message: "DB connection failed" });
  });

  it("drops DB-only fields: estimated_cost, source_url, added_by are not in returned recipes", async () => {
    const rowWithExtras = {
      ...sampleRecipeRow,
      estimated_cost: 5.5,
      source_url:     "https://example.com",
      added_by:       "seed",
      created_at:     "2026-03-21T00:00:00Z",
      title_normalized: "pasta al pomodoro",
    };
    const mockClient = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: [rowWithExtras], error: null })),
        })),
      })),
    } as unknown as SupabaseClient;

    const recipes = await fetchRecipes(mockClient);
    const recipe = recipes[0] as Record<string, unknown>;
    expect(recipe.estimated_cost).toBeUndefined();
    expect(recipe.source_url).toBeUndefined();
    expect(recipe.added_by).toBeUndefined();
  });
});

// ── fetchNotifications tests ─────────────────────────────────────────────────

describe("fetchNotifications", () => {
  it("returns AppNotification[] from the notifications table", async () => {
    const mockClient = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() =>
              Promise.resolve({ data: [sampleNotificationRow], error: null })
            ),
          })),
        })),
      })),
    } as unknown as SupabaseClient;

    const notifications = await fetchNotifications(mockClient);

    expect(notifications).toHaveLength(1);
    expect(notifications[0].id).toBe("notif-1");
    expect(notifications[0].type).toBe("new_recipes");
    expect(notifications[0].read).toBe(false);
  });

  it("returns empty array when data is null", async () => {
    const mockClient = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve({ data: null, error: null })),
          })),
        })),
      })),
    } as unknown as SupabaseClient;

    const notifications = await fetchNotifications(mockClient);
    expect(notifications).toEqual([]);
  });

  it("throws when Supabase returns an error", async () => {
    const mockClient = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() =>
              Promise.resolve({ data: null, error: { message: "notifications table not found" } })
            ),
          })),
        })),
      })),
    } as unknown as SupabaseClient;

    await expect(fetchNotifications(mockClient)).rejects.toMatchObject({
      message: "notifications table not found",
    });
  });
});

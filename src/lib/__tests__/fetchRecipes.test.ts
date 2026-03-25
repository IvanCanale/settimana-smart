import { describe, it, expect, vi } from "vitest";
import { fetchRecipes } from "@/lib/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

// ── Helper: build a chainable Supabase query mock ─────────────────────────────

/**
 * Build a mock Supabase query chain.
 * For base tier: from().select().order().neq().limit() -> terminal
 * For pro tier:  from().select().order() -> terminal (no neq/limit)
 */
function buildBaseQueryMock(result: { data: unknown; error: unknown }) {
  const terminal = () => Promise.resolve(result);
  const limitMock = vi.fn(() => terminal());
  const neqMock = vi.fn(() => ({ limit: limitMock }));
  const orderMock = vi.fn(() => ({
    neq: neqMock,
    // Also make order directly awaitable for pro tier (no neq/limit)
    then: terminal().then.bind(terminal()),
  }));
  const selectMock = vi.fn(() => ({ order: orderMock }));
  const fromMock = vi.fn(() => ({ select: selectMock }));
  return {
    client: { from: fromMock } as unknown as SupabaseClient,
    orderMock,
    neqMock,
    limitMock,
  };
}

const sampleRecipeRow = {
  id: "abc-123",
  title: "Pasta al pomodoro",
  diet: ["mediterranea", "vegetariana"],
  tags: ["veloce"],
  time: 20,
  difficulty: "beginner",
  servings: 2,
  ingredients: [{ name: "spaghetti", qty: 200, unit: "g", category: "Cereali" }],
  steps: ["Porta a bollore l'acqua.", "Scola e condisci."],
};

// ── fetchRecipes tier-aware tests ─────────────────────────────────────────────

describe("fetchRecipes tier-aware", () => {
  it("applies .neq('added_by', 'ai') and .limit(100) for base tier (SUB-03, SUB-04)", async () => {
    const { client, neqMock, limitMock } = buildBaseQueryMock({ data: [sampleRecipeRow], error: null });

    const recipes = await fetchRecipes(client, "base");

    expect(neqMock).toHaveBeenCalledWith("added_by", "ai");
    expect(limitMock).toHaveBeenCalledWith(100);
    expect(recipes).toHaveLength(1);
    expect(recipes[0].id).toBe("abc-123");
  });

  it("does NOT apply neq or limit for pro tier — full recipe set returned", async () => {
    const { client, neqMock, limitMock } = buildBaseQueryMock({ data: [sampleRecipeRow], error: null });

    const recipes = await fetchRecipes(client, "pro");

    expect(neqMock).not.toHaveBeenCalled();
    expect(limitMock).not.toHaveBeenCalled();
    expect(recipes).toHaveLength(1);
  });

  it("does NOT apply limit for free tier (trial = full access)", async () => {
    const { client, neqMock, limitMock } = buildBaseQueryMock({ data: [sampleRecipeRow], error: null });

    const recipes = await fetchRecipes(client, "free");

    expect(neqMock).not.toHaveBeenCalled();
    expect(limitMock).not.toHaveBeenCalled();
    expect(recipes).toHaveLength(1);
  });

  it("defaults to pro tier when no tier parameter is passed (backward compat)", async () => {
    const { client, neqMock, limitMock } = buildBaseQueryMock({ data: [sampleRecipeRow], error: null });

    // Call without tier param — should behave like "pro"
    const recipes = await fetchRecipes(client);

    expect(neqMock).not.toHaveBeenCalled();
    expect(limitMock).not.toHaveBeenCalled();
    expect(recipes).toHaveLength(1);
  });
});

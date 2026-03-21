// src/lib/catalogJob.test.ts
// Unit tests for catalog job validation and mapping logic.
//
// The Edge Function runs in Deno and cannot be imported in Vitest directly.
// We replicate the key validation and mapping logic here as standalone testable functions,
// mirroring the exact logic in supabase/functions/catalog-recipes/index.ts.

import { describe, it, expect } from "vitest";

// ── Replicated logic from Edge Function ─────────────────────────────────────
// Mirror of validateParsedRecipe() in supabase/functions/catalog-recipes/index.ts

function validateParsedRecipe(parsed: Record<string, unknown>): boolean {
  if (!parsed.title || (parsed.title as string).length < 3) return false;
  if (!parsed.source_url || !(parsed.source_url as string).startsWith("http")) return false;
  if (!parsed.ingredients || (parsed.ingredients as unknown[]).length < 2) return false;
  if (!parsed.steps || (parsed.steps as unknown[]).length < 2) return false;
  if (!parsed.time || (parsed.time as number) <= 0) return false;
  return true;
}

// Mirror of row mapping in supabase/functions/catalog-recipes/index.ts

type DietType = "vegana" | "vegetariana" | "onnivora";

function buildDietArray(dietType: DietType): string[] {
  if (dietType === "vegana") return ["vegana", "vegetariana", "mediterranea"];
  if (dietType === "vegetariana") return ["vegetariana", "mediterranea"];
  return ["onnivora", "mediterranea"];
}

function mapToRow(r: Record<string, unknown>, dietType: DietType) {
  const dietArray = buildDietArray(dietType);
  return {
    title: r.title as string,
    diet: (r.diet as string[]) ?? dietArray,
    tags: (r.tags as string[]) ?? [],
    time: r.time as number,
    difficulty: (r.difficulty as string) ?? "intermediate",
    servings: (r.servings as number) ?? 2,
    ingredients: r.ingredients,
    steps: r.steps,
    estimated_cost: (r.estimated_cost as number) ?? null,
    protein_category: (r.protein_category as string) ?? null,
    source_url: r.source_url as string,
    added_by: "ai_job",
  };
}

// ── Fixture: a valid parsed AI recipe ───────────────────────────────────────

const validParsed: Record<string, unknown> = {
  title: "Spaghetti al Pomodoro",
  diet: ["onnivora", "mediterranea"],
  tags: ["primo", "veloce"],
  time: 25,
  difficulty: "beginner",
  servings: 2,
  ingredients: [
    { name: "spaghetti", qty: 200, unit: "g", category: "Cereali" },
    { name: "passata di pomodoro", qty: 300, unit: "g", category: "Dispensa" },
  ],
  steps: [
    "Porta a bollore una pentola d'acqua abbondante e sala generosamente.",
    "Scola la pasta al dente e versala nel sugo caldo. Mescola e servi subito.",
  ],
  estimated_cost: 3.5,
  protein_category: null,
  source_url: "https://www.giallozafferano.it/ricette/spaghetti-pomodoro",
};

// ── validateParsedRecipe: valid inputs ──────────────────────────────────────

describe("validateParsedRecipe", () => {
  it("accepts a valid parsed recipe with all required fields", () => {
    expect(validateParsedRecipe(validParsed)).toBe(true);
  });

  it("rejects a recipe with missing source_url", () => {
    const { source_url: _dropped, ...noUrl } = validParsed;
    expect(validateParsedRecipe(noUrl)).toBe(false);
  });

  it("rejects a recipe with source_url that does not start with http", () => {
    expect(validateParsedRecipe({ ...validParsed, source_url: "ftp://not-a-web-url.com" })).toBe(false);
  });

  it("rejects a recipe with an empty ingredients array", () => {
    expect(validateParsedRecipe({ ...validParsed, ingredients: [] })).toBe(false);
  });

  it("rejects a recipe with only one ingredient (less than min 2)", () => {
    expect(validateParsedRecipe({
      ...validParsed,
      ingredients: [{ name: "spaghetti", qty: 200, unit: "g", category: "Cereali" }],
    })).toBe(false);
  });

  it("rejects a recipe with title shorter than 3 characters", () => {
    expect(validateParsedRecipe({ ...validParsed, title: "AB" })).toBe(false);
  });

  it("rejects a recipe with time equal to 0", () => {
    expect(validateParsedRecipe({ ...validParsed, time: 0 })).toBe(false);
  });

  it("rejects a recipe with negative time", () => {
    expect(validateParsedRecipe({ ...validParsed, time: -5 })).toBe(false);
  });

  it("rejects a recipe with fewer than 2 steps", () => {
    expect(validateParsedRecipe({
      ...validParsed,
      steps: ["Solo un passo — non sufficiente per una ricetta."],
    })).toBe(false);
  });

  it("rejects a recipe with null title", () => {
    expect(validateParsedRecipe({ ...validParsed, title: null })).toBe(false);
  });
});

// ── mapToRow: DB row shape and defaults ────────────────────────────────────

describe("mapToRow", () => {
  it("includes added_by: ai_job on every mapped row", () => {
    const row = mapToRow(validParsed, "onnivora");
    expect(row.added_by).toBe("ai_job");
  });

  it("defaults tags to [] when tags is missing", () => {
    const { tags: _dropped, ...noTags } = validParsed;
    const row = mapToRow(noTags, "onnivora");
    expect(row.tags).toEqual([]);
  });

  it("defaults difficulty to 'intermediate' when difficulty is missing", () => {
    const { difficulty: _dropped, ...noDiff } = validParsed;
    const row = mapToRow(noDiff, "onnivora");
    expect(row.difficulty).toBe("intermediate");
  });

  it("defaults servings to 2 when servings is missing", () => {
    const { servings: _dropped, ...noServings } = validParsed;
    const row = mapToRow(noServings, "onnivora");
    expect(row.servings).toBe(2);
  });
});

// ── buildDietArray: diet tagging conventions ───────────────────────────────

describe("buildDietArray", () => {
  it("tags vegana recipe with ['vegana', 'vegetariana', 'mediterranea']", () => {
    expect(buildDietArray("vegana")).toEqual(["vegana", "vegetariana", "mediterranea"]);
  });

  it("tags vegetariana recipe with ['vegetariana', 'mediterranea']", () => {
    expect(buildDietArray("vegetariana")).toEqual(["vegetariana", "mediterranea"]);
  });

  it("tags onnivora recipe with ['onnivora', 'mediterranea']", () => {
    expect(buildDietArray("onnivora")).toEqual(["onnivora", "mediterranea"]);
  });
});

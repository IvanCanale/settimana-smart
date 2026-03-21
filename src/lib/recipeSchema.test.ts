import { describe, it, expect } from "vitest";
import { AIRecipeSchema, RecipeIngredientSchema, normalizeRecipeTitle, rowToRecipe } from "./recipeSchema";

// ── Fixture: a valid recipe object ─────────────────────────────────────────

const validIngredient = {
  name: "spaghetti",
  qty: 200,
  unit: "g",
  category: "Cereali",
};

const validRecipe = {
  title: "Pasta al pomodoro",
  diet: ["mediterranea", "vegetariana"] as const,
  tags: ["veloce", "economica"],
  time: 20,
  difficulty: "beginner" as const,
  servings: 2,
  ingredients: [validIngredient, { name: "passata di pomodoro", qty: 300, unit: "g", category: "Dispensa" }],
  steps: [
    "Porta a bollore una pentola d'acqua abbondante e sala generosamente.",
    "Scola la pasta e versala nel sugo. Mescola e servi subito.",
  ],
  source_url: "https://www.giallozafferano.it/ricette/pasta-al-pomodoro",
};

// ── RecipeIngredientSchema ──────────────────────────────────────────────────

describe("RecipeIngredientSchema", () => {
  it("accepts a valid ingredient", () => {
    expect(() => RecipeIngredientSchema.parse(validIngredient)).not.toThrow();
  });

  it("rejects an ingredient with empty name", () => {
    expect(() => RecipeIngredientSchema.parse({ ...validIngredient, name: "" })).toThrow();
  });

  it("rejects an ingredient with non-positive qty", () => {
    expect(() => RecipeIngredientSchema.parse({ ...validIngredient, qty: 0 })).toThrow();
  });
});

// ── AIRecipeSchema ──────────────────────────────────────────────────────────

describe("AIRecipeSchema", () => {
  it("accepts a valid recipe object", () => {
    expect(() => AIRecipeSchema.parse(validRecipe)).not.toThrow();
  });

  it("rejects a recipe with empty ingredients array", () => {
    expect(() => AIRecipeSchema.parse({ ...validRecipe, ingredients: [] })).toThrow();
  });

  it("rejects a recipe with only one ingredient (min 2)", () => {
    expect(() => AIRecipeSchema.parse({ ...validRecipe, ingredients: [validIngredient] })).toThrow();
  });

  it("rejects a recipe without source_url", () => {
    const { source_url: _dropped, ...noUrl } = validRecipe;
    expect(() => AIRecipeSchema.parse(noUrl)).toThrow();
  });

  it("rejects a recipe with title shorter than 3 chars", () => {
    expect(() => AIRecipeSchema.parse({ ...validRecipe, title: "AB" })).toThrow();
  });

  it("rejects a recipe with invalid diet value 'keto'", () => {
    expect(() => AIRecipeSchema.parse({ ...validRecipe, diet: ["keto"] })).toThrow();
  });

  it("rejects a recipe with empty diet array (min 1)", () => {
    expect(() => AIRecipeSchema.parse({ ...validRecipe, diet: [] })).toThrow();
  });

  it("rejects a recipe with steps shorter than 10 chars", () => {
    // "Step 1." is 7 chars, "Step 2." is 7 chars — both below min(10)
    expect(() =>
      AIRecipeSchema.parse({ ...validRecipe, steps: ["Step 1.", "Step 2."] })
    ).toThrow();
  });

  it("accepts optional estimated_cost and protein_category", () => {
    const extended = { ...validRecipe, estimated_cost: 5.5, protein_category: "legumi" as const };
    expect(() => AIRecipeSchema.parse(extended)).not.toThrow();
  });

  it("rejects a recipe with invalid source_url (not a URL)", () => {
    expect(() => AIRecipeSchema.parse({ ...validRecipe, source_url: "not-a-url" })).toThrow();
  });
});

// ── normalizeRecipeTitle ────────────────────────────────────────────────────

describe("normalizeRecipeTitle", () => {
  it("lowercases and strips accents from a title with accented characters", () => {
    const result = normalizeRecipeTitle("Pasta all'Amatriciana");
    expect(result).toBe("pasta all'amatriciana");
  });

  it("trims and lowercases a title with surrounding spaces", () => {
    const result = normalizeRecipeTitle("  Risotto  ");
    expect(result).toBe("risotto");
  });

  it("strips NFD accent combining characters like è, à, ù", () => {
    const result = normalizeRecipeTitle("Pappardelle all'Anatra è Buona");
    // è → e, à → a
    expect(result).toBe("pappardelle all'anatra e buona");
  });
});

// ── rowToRecipe ─────────────────────────────────────────────────────────────

describe("rowToRecipe", () => {
  const dbRow = {
    id: "abc-123",
    title: "Pasta al pomodoro",
    diet: ["mediterranea", "vegetariana"],
    tags: ["veloce"],
    time: 20,
    difficulty: "beginner",
    servings: 2,
    ingredients: [{ name: "spaghetti", qty: 200, unit: "g", category: "Cereali" }],
    steps: ["Step 1 description", "Step 2 description"],
    // Extra DB-only fields that should be dropped:
    estimated_cost: 4.5,
    protein_category: "vegano",
    source_url: "https://example.com/recipe",
    added_by: "seed",
    created_at: "2026-03-21T00:00:00Z",
    title_normalized: "pasta al pomodoro",
  };

  it("maps a DB row to a valid Recipe object", () => {
    const recipe = rowToRecipe(dbRow);
    expect(recipe.id).toBe("abc-123");
    expect(recipe.title).toBe("Pasta al pomodoro");
    expect(recipe.diet).toEqual(["mediterranea", "vegetariana"]);
    expect(recipe.tags).toEqual(["veloce"]);
    expect(recipe.time).toBe(20);
    expect(recipe.difficulty).toBe("beginner");
    expect(recipe.servings).toBe(2);
    expect(recipe.ingredients).toEqual([{ name: "spaghetti", qty: 200, unit: "g", category: "Cereali" }]);
    expect(recipe.steps).toEqual(["Step 1 description", "Step 2 description"]);
  });

  it("returns an object with exactly the keys: id, title, diet, tags, time, difficulty, servings, ingredients, steps", () => {
    const recipe = rowToRecipe(dbRow);
    const keys = Object.keys(recipe).sort();
    expect(keys).toEqual(["diet", "difficulty", "id", "ingredients", "servings", "steps", "tags", "time", "title"]);
  });

  it("drops DB-only fields: estimated_cost, protein_category, source_url, added_by, created_at, title_normalized", () => {
    const recipe = rowToRecipe(dbRow) as Record<string, unknown>;
    expect(recipe.estimated_cost).toBeUndefined();
    expect(recipe.protein_category).toBeUndefined();
    expect(recipe.source_url).toBeUndefined();
    expect(recipe.added_by).toBeUndefined();
    expect(recipe.created_at).toBeUndefined();
    expect(recipe.title_normalized).toBeUndefined();
  });

  it("defaults tags to [] when row.tags is null/undefined", () => {
    const recipe = rowToRecipe({ ...dbRow, tags: null });
    expect(recipe.tags).toEqual([]);
  });

  it("defaults servings to 2 when row.servings is null/undefined", () => {
    const recipe = rowToRecipe({ ...dbRow, servings: null });
    expect(recipe.servings).toBe(2);
  });
});

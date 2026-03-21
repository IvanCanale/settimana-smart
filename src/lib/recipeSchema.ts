// lib/recipeSchema.ts
// Zod validation schema for AI-parsed recipes + DB row mapping utilities
import { z } from "zod";
import type { Diet, Skill, RecipeIngredient, Recipe } from "@/types";

// ── Ingredient schema ───────────────────────────────────────────────────────

export const RecipeIngredientSchema = z.object({
  name:     z.string().min(1),
  qty:      z.number().positive(),
  unit:     z.string().min(1),
  category: z.string().min(1),
});

// ── Recipe schema (AI output / Supabase insert) ─────────────────────────────

export const AIRecipeSchema = z.object({
  title:            z.string().min(3),
  diet:             z.array(z.enum(["mediterranea", "onnivora", "vegetariana", "vegana"])).min(1),
  tags:             z.array(z.string()).default([]),
  time:             z.number().int().positive(),
  difficulty:       z.enum(["beginner", "intermediate"]),
  servings:         z.number().int().positive().default(2),
  ingredients:      z.array(RecipeIngredientSchema).min(2),
  steps:            z.array(z.string().min(10)).min(2),
  estimated_cost:   z.number().positive().optional(),
  protein_category: z.enum(["carne", "pesce", "legumi", "uova", "latticini", "vegano"]).optional(),
  source_url:       z.string().url(), // REQUIRED — rejects hallucinated recipes
});

// ── Client-side title normalizer (mirrors DB GENERATED ALWAYS column) ────────

export function normalizeRecipeTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip accent combining characters
    .trim();
}

// ── DB row → Recipe type mapper ───────────────────────────────────────────────

export function rowToRecipe(row: Record<string, unknown>): Recipe {
  return {
    id:          row.id as string,
    title:       row.title as string,
    diet:        row.diet as Diet[],
    tags:        ((row.tags as string[]) ?? []),
    time:        row.time as number,
    difficulty:  row.difficulty as Skill,
    servings:    ((row.servings as number) ?? 2),
    ingredients: row.ingredients as RecipeIngredient[],
    steps:       row.steps as string[],
  };
}

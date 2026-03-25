import { describe, it, expect, vi } from "vitest";

// Will be importable after Plan 03 modifies src/lib/supabase.ts
// import { fetchRecipes } from "@/lib/supabase";

describe("fetchRecipes tier-aware", () => {
  it.todo("applies .limit(100) and .neq('added_by', 'ai') for base tier (SUB-03, SUB-04)");
  it.todo("does NOT apply limit for pro tier");
  it.todo("does NOT apply limit for free tier (trial = full access)");
  it.todo("defaults to pro tier when no tier parameter is passed (backward compat)");
});

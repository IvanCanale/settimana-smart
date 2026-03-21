// Run with: npx tsx scripts/seed-recipes.ts
//
// One-time migration script: inserts all RECIPE_LIBRARY entries into the Supabase recipes table.
// Uses upsert with onConflict: 'title_normalized' — safe to re-run without creating duplicates.
//
// Required env vars:
//   SUPABASE_URL             — your project URL (https://<ref>.supabase.co)
//   SUPABASE_SERVICE_ROLE_KEY — service role key (bypasses RLS for write access)

import { createClient } from "@supabase/supabase-js";
import { RECIPE_LIBRARY } from "../src/data/recipes";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.");
  process.exit(1);
}

const client = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const BATCH_SIZE = 50;

async function seed() {
  const total = RECIPE_LIBRARY.length;
  console.log(`Starting seed: ${total} recipes to insert`);

  const rows = RECIPE_LIBRARY.map((recipe) => ({
    title:            recipe.title,
    diet:             recipe.diet,
    tags:             recipe.tags,
    time:             recipe.time,
    difficulty:       recipe.difficulty,
    servings:         recipe.servings,
    ingredients:      recipe.ingredients, // JSONB
    steps:            recipe.steps,
    protein_category: null,
    estimated_cost:   null,
    source_url:       null,
    added_by:         "seed",
  }));

  let seeded = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await client
      .from("recipes")
      .upsert(batch, { onConflict: "title_normalized" });

    if (error) {
      console.error(`Error inserting batch starting at index ${i}:`, error.message);
      process.exit(1);
    }

    seeded += batch.length;
    console.log(`Seeded ${seeded}/${total} recipes`);
  }

  console.log(`Done. ${seeded} recipes upserted successfully.`);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});

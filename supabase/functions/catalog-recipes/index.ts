// supabase/functions/catalog-recipes/index.ts
// Supabase Edge Function: weekly AI recipe catalog enrichment
//
// Run in Supabase SQL Editor after deploying this Edge Function:
// SELECT cron.schedule(
//   'weekly-catalog-enrichment',
//   '0 3 * * 1',
//   $$
//   SELECT net.http_post(
//     url := '<SUPABASE_URL>/functions/v1/catalog-recipes',
//     body := '{"run": true}'::jsonb,
//     headers := '{"Authorization": "Bearer <SERVICE_ROLE_KEY>"}'::jsonb
//   );
//   $$
// );

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const DIET_TYPES = ["vegana", "vegetariana", "onnivora"] as const;
const TARGET_PER_DIET = 20; // 20 per diet type = ~60 total per run (per user decision)
const BATCH_SIZE = 5; // 5-parallel batches — ~60 calls in ~48s, well within 10-min Edge Function limit
const ITALIAN_SITES = "giallozafferano.it OR cucchiaio.it OR lacucinaitaliana.it";

type DietType = typeof DIET_TYPES[number];

function buildDietArray(dietType: DietType): string[] {
  if (dietType === "vegana") return ["vegana", "vegetariana", "mediterranea"];
  if (dietType === "vegetariana") return ["vegetariana", "mediterranea"];
  return ["onnivora", "mediterranea"];
}

function getISOWeek(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

function validateParsedRecipe(parsed: Record<string, unknown>): boolean {
  if (!parsed.title || (parsed.title as string).length < 3) return false;
  if (!parsed.source_url || !(parsed.source_url as string).startsWith("http")) return false;
  if (!parsed.ingredients || (parsed.ingredients as unknown[]).length < 2) return false;
  if (!parsed.steps || (parsed.steps as unknown[]).length < 2) return false;
  if (!parsed.time || (parsed.time as number) <= 0) return false;
  return true;
}

serve(async (_req) => {
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!openaiKey || !supabaseUrl || !serviceKey) {
    return new Response("Missing env vars", { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  let totalInserted = 0;

  for (const dietType of DIET_TYPES) {
    // STEP 1: Web search to find recipe URLs
    const searchPrompt = `Trova ${TARGET_PER_DIET} ricette ${dietType} italiane su ${ITALIAN_SITES}.
Per ogni ricetta restituisci titolo e URL della pagina originale.
Rispondi SOLO con un JSON array: [{"title": "...", "url": "..."}]`;

    const searchBody = {
      model: "gpt-4o-mini",
      tools: [{ type: "web_search_preview" }],
      input: searchPrompt,
    };

    const searchRes = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify(searchBody),
    });

    if (!searchRes.ok) {
      console.error(`Search failed for ${dietType}: ${searchRes.status}`);
      continue;
    }

    const searchData = await searchRes.json();
    // Extract text from the response output_text or output array
    const searchText: string = searchData.output_text ??
      searchData.output?.find((o: { type: string }) => o.type === "message")?.content?.[0]?.text ?? "";

    let urls: { title: string; url: string }[] = [];
    try {
      // Extract JSON array from response (may have markdown wrapping)
      const jsonMatch = searchText.match(/\[[\s\S]*\]/);
      if (jsonMatch) urls = JSON.parse(jsonMatch[0]);
    } catch {
      console.error(`Failed to parse search results for ${dietType}`);
      continue;
    }

    // STEP 2: Parse each URL into structured recipe
    const dietArray = buildDietArray(dietType);

    for (let i = 0; i < urls.length; i += BATCH_SIZE) {
      const batch = urls.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(
        batch.map(async ({ title, url }) => {
          try {
            const parsePrompt = `Leggi la ricetta "${title}" all'URL ${url} e restituisci un JSON con esattamente questi campi:
{
  "title": "nome ricetta",
  "diet": ${JSON.stringify(dietArray)},
  "tags": ["tag1", "tag2"],
  "time": <minuti preparazione>,
  "difficulty": "beginner" | "intermediate",
  "servings": <porzioni>,
  "ingredients": [{"name": "...", "qty": <numero>, "unit": "...", "category": "Verdure|Proteine|Latticini|Cereali|Dispensa"}],
  "steps": ["passo 1 dettagliato (almeno 10 caratteri)", "passo 2..."],
  "estimated_cost": <euro stimati opzionale>,
  "protein_category": "carne"|"pesce"|"legumi"|"uova"|"latticini"|"vegano" oppure null,
  "source_url": "${url}"
}
Rispondi SOLO con il JSON, niente altro.`;

            const parseRes = await fetch("https://api.openai.com/v1/responses", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${openaiKey}`,
              },
              body: JSON.stringify({
                model: "gpt-4o-mini",
                input: parsePrompt,
                text: { format: { type: "json_object" } },
              }),
            });

            if (!parseRes.ok) return null;
            const parseData = await parseRes.json();
            const text: string = parseData.output_text ??
              parseData.output?.find((o: { type: string }) => o.type === "message")?.content?.[0]?.text ?? "";
            const parsed: Record<string, unknown> = JSON.parse(text);

            // Validate before insert — rejects hallucinated/incomplete recipes
            if (!validateParsedRecipe(parsed)) return null;

            return parsed;
          } catch {
            return null;
          }
        })
      );

      // Insert valid recipes
      const valid = results.filter(Boolean) as Record<string, unknown>[];
      if (valid.length === 0) continue;

      const rows = valid.map((r) => ({
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
      }));

      const { error } = await supabase
        .from("recipes")
        .upsert(rows, { onConflict: "title_normalized", ignoreDuplicates: true });

      if (error) {
        console.error(`Insert error for ${dietType} batch: ${error.message}`);
      } else {
        totalInserted += rows.length;
      }
    }
  }

  // Create notification for new recipes
  if (totalInserted > 0) {
    const week = getISOWeek();
    await supabase.from("notifications").insert({
      type: "new_recipes",
      payload: { count: totalInserted, week },
    });
  }

  return new Response(JSON.stringify({ inserted: totalInserted }), {
    headers: { "Content-Type": "application/json" },
  });
});

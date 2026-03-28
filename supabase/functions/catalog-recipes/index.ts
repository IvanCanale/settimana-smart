// supabase/functions/catalog-recipes/index.ts
// Supabase Edge Function: weekly AI recipe catalog enrichment (uses Anthropic Claude)
//
// Run in Supabase SQL Editor after deploying — 4 cron jobs, one per diet, 5 min apart:
//
// SELECT cron.schedule('catalog-vegana',       '0 3 * * 0', $$ SELECT net.http_post(url:='<URL>/functions/v1/catalog-recipes', body:='{"diet":"vegana"}'::jsonb,       headers:='{"Authorization":"Bearer <SERVICE_ROLE_KEY>"}'::jsonb); $$);
// SELECT cron.schedule('catalog-vegetariana',  '5 3 * * 0', $$ SELECT net.http_post(url:='<URL>/functions/v1/catalog-recipes', body:='{"diet":"vegetariana"}'::jsonb,  headers:='{"Authorization":"Bearer <SERVICE_ROLE_KEY>"}'::jsonb); $$);
// SELECT cron.schedule('catalog-onnivora',    '10 3 * * 0', $$ SELECT net.http_post(url:='<URL>/functions/v1/catalog-recipes', body:='{"diet":"onnivora"}'::jsonb,    headers:='{"Authorization":"Bearer <SERVICE_ROLE_KEY>"}'::jsonb); $$);
// SELECT cron.schedule('catalog-mediterranea','15 3 * * 0', $$ SELECT net.http_post(url:='<URL>/functions/v1/catalog-recipes', body:='{"diet":"mediterranea"}'::jsonb, headers:='{"Authorization":"Bearer <SERVICE_ROLE_KEY>"}'::jsonb); $$);

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const MODEL = "claude-haiku-4-5-20251001";

const VALID_DIETS = ["vegana", "vegetariana", "onnivora", "mediterranea"] as const;
const TARGET = 20;
const RECIPES_PER_CALL = 5;
const MAX_ROUNDS = 6;

type DietType = typeof VALID_DIETS[number];

function buildDietArray(dietType: DietType): string[] {
  if (dietType === "vegana") return ["vegana", "vegetariana", "mediterranea"];
  if (dietType === "vegetariana") return ["vegetariana", "mediterranea"];
  if (dietType === "mediterranea") return ["mediterranea"];
  return ["onnivora", "mediterranea"];
}

function getDietRule(dietType: DietType): string {
  if (dietType === "vegana") return "completamente vegane (no carne, pesce, latticini, uova)";
  if (dietType === "vegetariana") return "vegetariane (no carne né pesce)";
  if (dietType === "mediterranea") return "mediterranee (verdure, legumi, pesce, olio d'oliva, poca carne rossa)";
  return "con carne o pesce";
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
  if (!parsed.ingredients || (parsed.ingredients as unknown[]).length < 2) return false;
  if (!parsed.steps || (parsed.steps as unknown[]).length < 2) return false;
  if (!parsed.time || (parsed.time as number) <= 0) return false;
  return true;
}

async function generateBatch(
  anthropicKey: string,
  dietType: DietType,
  existingTitles: string[],
  round: number,
): Promise<Record<string, unknown>[]> {
  const dietArray = buildDietArray(dietType);
  const avoidList = existingTitles.length > 0
    ? `\nEvita assolutamente questi titoli già presenti: ${existingTitles.slice(0, 80).join(", ")}`
    : "";

  const prompt = `Genera esattamente ${RECIPES_PER_CALL} ricette italiane ${dietType} originali e varie (round ${round}).${avoidList}
Rispondi SOLO con un JSON array valido. Nessun testo, nessun markdown.

Formato:
[{"title":"Nome","diet":${JSON.stringify(dietArray)},"tags":["tag"],"time":30,"difficulty":"beginner","servings":4,"ingredients":[{"name":"ingrediente","qty":200,"unit":"g","category":"Verdure"},{"name":"altro","qty":100,"unit":"g","category":"Dispensa"}],"steps":["Passo 1 dettagliato.","Passo 2 dettagliato.","Passo 3 dettagliato."],"estimated_cost":5.0,"protein_category":null}]

Regole:
- difficulty: "beginner" o "intermediate"
- category ingredienti: "Verdure","Proteine","Latticini","Cereali","Dispensa"
- protein_category: "carne","pesce","legumi","uova","latticini","vegano" o null
- almeno 3 ingredienti e 3 passi
- ricette ${getDietRule(dietType)} e tipicamente italiane`;

  const res = await fetch(ANTHROPIC_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": anthropicKey,
      "anthropic-version": ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4000,
      system: "Sei un esperto di cucina italiana. Rispondi SOLO con un JSON array valido, senza markdown né testo.",
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    console.error(`[${dietType}] r${round} API error: ${res.status}`);
    return [];
  }

  const data = await res.json();
  const text: string = data.content?.find((c: { type: string }) => c.type === "text")?.text ?? "";
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];

  try {
    const recipes = JSON.parse(jsonMatch[0]);
    return recipes.filter(validateParsedRecipe);
  } catch {
    return [];
  }
}

serve(async (req) => {
  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!anthropicKey || !supabaseUrl || !serviceKey) {
    return new Response("Missing env vars", { status: 500 });
  }

  // Parse diet from request body
  let dietType: DietType;
  try {
    const body = await req.json();
    if (!VALID_DIETS.includes(body.diet)) {
      return new Response(`Invalid diet. Use one of: ${VALID_DIETS.join(", ")}`, { status: 400 });
    }
    dietType = body.diet as DietType;
  } catch {
    return new Response("Invalid JSON body. Provide {\"diet\": \"vegana|vegetariana|onnivora|mediterranea\"}", { status: 400 });
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  const dietArray = buildDietArray(dietType);

  // Fetch existing titles to avoid duplicates
  const { data: existing } = await supabase
    .from("recipes")
    .select("title")
    .order("created_at", { ascending: false })
    .limit(200);

  const knownTitles: string[] = existing?.map((r: { title: string }) => r.title) ?? [];
  const lowerKnown = new Set(knownTitles.map((t) => t.toLowerCase()));

  let totalInserted = 0;

  for (let round = 1; round <= MAX_ROUNDS && totalInserted < TARGET; round++) {
    const needed = TARGET - totalInserted;
    const parallelCalls = Math.ceil(needed / RECIPES_PER_CALL);

    const batchResults = await Promise.all(
      Array.from({ length: parallelCalls }, (_, i) =>
        generateBatch(anthropicKey, dietType, knownTitles, round * 10 + i)
      ),
    );

    const candidates = batchResults.flat();
    const unique = candidates.filter((r) => {
      const t = (r.title as string).toLowerCase();
      if (lowerKnown.has(t)) return false;
      lowerKnown.add(t);
      return true;
    });

    if (unique.length === 0) continue;

    const rows = unique.map((r) => ({
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
      source_url: null,
      added_by: "ai_job",
    }));

    const { error } = await supabase
      .from("recipes")
      .upsert(rows, { onConflict: "title_normalized", ignoreDuplicates: true });

    if (error) {
      console.error(`[${dietType}] r${round} insert error: ${error.message}`);
      continue;
    }

    totalInserted += rows.length;
    knownTitles.push(...rows.map((r) => r.title));
    console.log(`[${dietType}] r${round}: +${rows.length} (total ${totalInserted}/${TARGET})`);
  }

  if (totalInserted > 0) {
    const week = getISOWeek();
    await supabase.from("notifications").insert({
      type: "new_recipes",
      payload: { count: totalInserted, week, diet: dietType },
    });
  }

  console.log(`[${dietType}] done: ${totalInserted} inserted`);
  return new Response(JSON.stringify({ diet: dietType, inserted: totalInserted }), {
    headers: { "Content-Type": "application/json" },
  });
});

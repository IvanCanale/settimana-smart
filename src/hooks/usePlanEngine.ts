"use client";
import { useMemo, useEffect, useRef, useState } from "react";
import { buildPlan, aggregateShopping, computeStats, seededShuffle, scaleQty, normalize, DAYS, FREEZE_CANDIDATES, validateAllergenSafety, recipeContainsAllergen } from "@/lib/planEngine";
import { saveWeeklyPlan, savePreferences, fetchRecipes } from "@/lib/supabase";
import { RECIPE_LIBRARY } from "@/data/recipes";
import type { Preferences, PantryItem, PreferenceLearning, ManualOverrides, DayPlan, Recipe, SubscriptionTier } from "@/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export function usePlanEngine(
  preferences: Preferences,
  pantryItems: PantryItem[],
  seed: number,
  learning: PreferenceLearning,
  manualOverrides: ManualOverrides,
  cloudSync?: {
    sbClient: SupabaseClient | null;
    userId: string | null;
    setSyncStatus: (v: "idle" | "saving" | "saved" | "error") => void;
  },
  wishlistedRecipes?: Recipe[],
  tier: SubscriptionTier = "pro", // Subscription tier for recipe filtering
) {
  // ── ASYNC RECIPE FETCH with localStorage cache and RECIPE_LIBRARY fallback ──
  const [recipes, setRecipes] = useState<Recipe[]>(RECIPE_LIBRARY);
  const [recipesLoading, setRecipesLoading] = useState(false);

  useEffect(() => {
    // Include tier in cache key so a tier downgrade (pro→base) always fetches fresh recipes
    const CACHE_KEY = `ss_recipes_cache_${tier}_v1`;
    const CACHE_TS_KEY = `ss_recipes_cache_${tier}_ts_v1`;
    const cached = localStorage.getItem(CACHE_KEY);
    const cachedTs = localStorage.getItem(CACHE_TS_KEY);
    const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

    if (cached && cachedTs && (Date.now() - Number(cachedTs)) < CACHE_TTL) {
      try {
        const parsed = JSON.parse(cached) as Recipe[];
        if (parsed.length > 0) setRecipes(parsed);
      } catch { /* ignore corrupt cache */ }
    }

    // Aspetta anche userId — garantisce che la sessione Supabase sia attiva
    if (!cloudSync?.sbClient || !cloudSync?.userId) return;
    setRecipesLoading(true);
    fetchRecipes(cloudSync.sbClient, tier)
      .then((fetched) => {
        if (fetched.length > 0) {
          setRecipes(fetched);
          localStorage.setItem(CACHE_KEY, JSON.stringify(fetched));
          localStorage.setItem(CACHE_TS_KEY, String(Date.now()));
        }
      })
      .catch(() => {
        console.warn("fetchRecipes failed — using cached or static recipes");
      })
      .finally(() => setRecipesLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cloudSync?.sbClient, cloudSync?.userId, tier]);

  // Calcola le preferenze normalizzate
  const computedPrefs = useMemo(() => ({
    ...preferences,
    coreIngredients: preferences.coreIngredients.map((x) => normalize(x)),
    exclusions: [
      ...preferences.exclusionsText.split(",").map((x) => normalize(x)).filter(Boolean),
      ...(preferences.exclusions || []).map(normalize),
    ],
  }), [preferences]);

  // Piano base con allergen safety gate — retry fino a 3 tentativi con seed+1
  const basePlan = useMemo(() => {
    // Merge ricette in wishlist nel pool (deduplicando per id)
    const existingIds = new Set(recipes.map((r) => r.id));
    const mergedRecipes = wishlistedRecipes?.length
      ? [...recipes, ...wishlistedRecipes.filter((r) => !existingIds.has(r.id))]
      : recipes;

    const exclusions = computedPrefs.exclusions || [];
    if (exclusions.length === 0) {
      return buildPlan(computedPrefs, pantryItems, seed, learning, mergedRecipes);
    }
    for (let attempt = 0; attempt < 3; attempt++) {
      const plan = buildPlan(computedPrefs, pantryItems, seed + attempt, learning, mergedRecipes);
      if (validateAllergenSafety(plan, exclusions)) {
        return plan;
      }
      // Log per debug — non visibile a utente
      console.warn(`Allergen gate failed for plan seed ${seed + attempt}, attempt ${attempt + 1}/3 — retrying with seed ${seed + attempt + 1}`);
    }
    // Tutti e 3 i tentativi falliti — ritorna l'ultimo tentativo con alert
    const fallback = buildPlan(computedPrefs, pantryItems, seed + 2, learning, mergedRecipes);
    return {
      ...fallback,
      alerts: [...fallback.alerts, "Non e stato possibile generare un piano sicuro. Riprova modificando le preferenze."],
    };
  }, [computedPrefs, pantryItems, seed, learning, recipes, wishlistedRecipes]);

  // Piano finale con override manuali applicati
  const generated = useMemo(() => {
    if (!Object.keys(manualOverrides).length) return basePlan;

    const rawDays = basePlan.days.map((day) => {
      const override = manualOverrides[day.day];
      return override ? { ...day, ...override } : day;
    });

    const usedIds = new Set<string>();
    const dedupedDays = rawDays.map((day, idx) => {
      let lunch = day.lunch;
      let dinner = day.dinner;
      if (lunch && usedIds.has(lunch.id)) lunch = null;
      if (lunch) usedIds.add(lunch.id);
      if (dinner && usedIds.has(dinner.id)) {
        const replacement = seededShuffle(
          recipes.filter((rec) => {
            if (!rec.diet.includes(computedPrefs.diet)) return false;
            if (rec.time > computedPrefs.maxTime) return false;
            if (computedPrefs.exclusions.some((ex) => recipeContainsAllergen(rec, ex))) return false;
            if (usedIds.has(rec.id)) return false;
            if (rec.tags.includes("speciale") || rec.tags.includes("domenica")) return false;
            return true;
          }),
          seed + idx + 999
        )[0] || null;
        dinner = replacement;
      }
      if (dinner) usedIds.add(dinner.id);
      return { ...day, lunch, dinner };
    });

    const planMeals = dedupedDays.flatMap((day) => [day.lunch, day.dinner].filter(Boolean)) as Recipe[];
    const shopping = aggregateShopping(planMeals, pantryItems, computedPrefs.people);
    const stats = computeStats(planMeals, shopping);

    // Ricalcola freezeItems sui giorni aggiornati
    const computeFreeze = (planDays: DayPlan[], pref: Preferences) => {
      const dayMap2: Record<string, { dayIndex: number; qty: number; unit: string; recipe: string }[]> = {};
      planDays.forEach((day, dayIndex) => {
        [day.lunch, day.dinner].filter(Boolean).forEach((meal) => {
          if ((meal as Recipe).tags?.includes("avanzi")) return;
          (meal as Recipe).ingredients.forEach((ingr) => {
            const k = normalize(ingr.name);
            if (!FREEZE_CANDIDATES.includes(k)) return;
            if (!dayMap2[k]) dayMap2[k] = [];
            const sq = scaleQty(ingr.qty, (meal as Recipe).servings, pref.people);
            dayMap2[k].push({ dayIndex, qty: sq, unit: ingr.unit, recipe: (meal as Recipe).title });
          });
        });
      });
      const items = [] as typeof basePlan.freezeItems;
      Object.entries(dayMap2).forEach(([k, uses]) => {
        uses.sort((a, b) => a.dayIndex - b.dayIndex);
        uses.filter((u) => u.dayIndex > 1).forEach((lateUse) => {
          items.push({
            name: k,
            unit: lateUse.unit,
            qtyToFreeze: Math.round(lateUse.qty * 10) / 10,
            useOnDay: DAYS[lateUse.dayIndex],
            useOnDayIndex: lateUse.dayIndex,
            recipe: lateUse.recipe,
          });
        });
      });
      return items;
    };

    return {
      ...basePlan,
      days: dedupedDays,
      shopping,
      stats,
      freezeItems: computeFreeze(dedupedDays, computedPrefs),
    };
  }, [basePlan, manualOverrides, pantryItems, computedPrefs, seed, recipes]);

  // ── AUTO-SAVE CLOUD SYNC ──
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!cloudSync?.sbClient || !cloudSync?.userId) return;
    const { sbClient: client, userId, setSyncStatus: setStatus } = cloudSync;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setStatus("saving");

    saveTimerRef.current = setTimeout(async () => {
      try {
        const { currentWeekISO } = await import("@/lib/weekUtils");
        await Promise.all([
          saveWeeklyPlan(client, userId, {
            week_iso: currentWeekISO(),
            status: "active",
            seed,
            manualOverrides: manualOverrides as Record<string, unknown>,
            learning: learning as Record<string, unknown>,
          }),
          savePreferences(client, userId, preferences as unknown as Record<string, unknown>),
        ]);
        setStatus("saved");
        setTimeout(() => setStatus("idle"), 3000);
      } catch {
        setStatus("error");
      }
    }, 2000);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generated, cloudSync?.sbClient, cloudSync?.userId, seed, preferences, manualOverrides, learning]);

  return { computedPrefs, basePlan, generated, recipesLoading, recipeCount: recipes.length, recipes };
}

"use client";
import { useMemo } from "react";
import { buildPlan, aggregateShopping, computeStats, seededShuffle, scaleQty, normalize, DAYS, FREEZE_CANDIDATES } from "@/lib/planEngine";
import { RECIPE_LIBRARY } from "@/data/recipes";
import type { Preferences, PantryItem, PreferenceLearning, ManualOverrides, DayPlan, Recipe } from "@/types";

export function usePlanEngine(
  preferences: Preferences,
  pantryItems: PantryItem[],
  seed: number,
  learning: PreferenceLearning,
  manualOverrides: ManualOverrides,
) {
  // Calcola le preferenze normalizzate
  const computedPrefs = useMemo(() => ({
    ...preferences,
    coreIngredients: preferences.coreIngredients.map((x) => normalize(x)),
    exclusions: [
      ...preferences.exclusionsText.split(",").map((x) => normalize(x)).filter(Boolean),
      ...(preferences.exclusions || []).map(normalize),
    ],
  }), [preferences]);

  // Piano base generato dall'engine
  const basePlan = useMemo(
    () => buildPlan(computedPrefs, pantryItems, seed, learning),
    [computedPrefs, pantryItems, seed, learning],
  );

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
          RECIPE_LIBRARY.filter((rec) => {
            if (!rec.diet.includes(computedPrefs.diet)) return false;
            if (rec.time > computedPrefs.maxTime) return false;
            if (computedPrefs.exclusions.some((ex) => rec.ingredients.some((i) => normalize(i.name).includes(ex)))) return false;
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
  }, [basePlan, manualOverrides, pantryItems, computedPrefs, seed]);

  return { computedPrefs, basePlan, generated };
}

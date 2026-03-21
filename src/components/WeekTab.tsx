"use client";
import React from "react";
import { SectionHeader } from "@/components/SectionHeader";
import { TagPill } from "@/components/TagPill";
import { TimeTag } from "@/components/TimeTag";
import { FreezeToast } from "@/components/FreezeToast";
import { seededShuffle, normalize, getRecipeCategory, DAYS, FREEZE_CANDIDATES, scaleQty, recipeContainsAllergen } from "@/lib/planEngine";
import type { PlanResult, Preferences, ManualOverrides, PreferenceLearning, Recipe, MealSlot, FreezeItem } from "@/types";

interface WeekTabProps {
  generated: PlanResult;
  computedPrefs: Preferences;
  preferences: Preferences;
  manualOverrides: ManualOverrides;
  setManualOverrides: React.Dispatch<React.SetStateAction<ManualOverrides>>;
  swappedDays: Set<string>;
  setSwappedDays: React.Dispatch<React.SetStateAction<Set<string>>>;
  seed: number;
  learning: PreferenceLearning;
  learnFromRecipe: (recipe: Recipe | null, action: "keep" | "regenerate") => void;
  selectedRecipe: Recipe | null;
  setSelectedRecipe: React.Dispatch<React.SetStateAction<Recipe | null>>;
  setActiveTab: (tab: string) => void;
  onStartRecipeFlow: (rec: Recipe | null) => void;
  setLastMessage: React.Dispatch<React.SetStateAction<string>>;
  setShowGeneratedBanner: React.Dispatch<React.SetStateAction<boolean>>;
  onConfirmWeek: () => void;
  tourAdvance: (action: string) => void;
  recipes: Recipe[];
}

export function WeekTab({
  generated,
  computedPrefs,
  preferences,
  manualOverrides,
  setManualOverrides,
  swappedDays,
  setSwappedDays,
  seed,
  learnFromRecipe,
  selectedRecipe,
  setSelectedRecipe,
  setActiveTab,
  onStartRecipeFlow,
  setLastMessage,
  setShowGeneratedBanner,
  tourAdvance,
  recipes,
}: WeekTabProps) {
  const [freezeToastMessage, setFreezeToastMessage] = React.useState("");

  const swapMeals = (dayName: string) => {
    setSwappedDays((prev) => {
      const next = new Set(prev);
      if (next.has(dayName)) next.delete(dayName);
      else next.add(dayName);
      return next;
    });
  };

  const regenerateSingleMeal = (dayName: string, slot: MealSlot) => {
    const currentDay = generated.days.find((d) => d.day === dayName);
    const currentRecipe = currentDay?.[slot] || null;
    learnFromRecipe(currentRecipe, "regenerate");
    const siblingRecipe = slot === "lunch" ? currentDay?.dinner || null : currentDay?.lunch || null;
    const siblingCarb = siblingRecipe?.ingredients.find((i) => i.category === "Cereali")?.name || null;
    const siblingCategory = siblingRecipe ? getRecipeCategory(siblingRecipe) : null;
    const usedElsewhere = new Set(
      generated.days.flatMap((d) => [d.lunch, d.dinner]).filter(Boolean)
        .filter((meal) => meal?.id !== currentRecipe?.id)
        .map((meal) => (meal as Recipe).id)
    );
    const exclusions = computedPrefs.exclusions || [];
    const pool = recipes.filter((rec) => {
      if (!rec.diet.includes(computedPrefs.diet)) return false;
      const isSpecial = dayName === "Dom" && slot === "lunch" && preferences.sundaySpecial;
      if (rec.time > (isSpecial ? Math.max(computedPrefs.maxTime, 60) : computedPrefs.maxTime)) return false;
      if (!isSpecial && (rec.tags.includes("speciale") || rec.tags.includes("domenica"))) return false;
      if (exclusions.some((allergen) => recipeContainsAllergen(rec, allergen))) return false;
      if (usedElsewhere.has(rec.id) || rec.id === currentRecipe?.id) return false;
      const carb = rec.ingredients.find((i) => i.category === "Cereali")?.name || null;
      if (slot === "dinner" && siblingCarb && carb && normalize(carb) === normalize(siblingCarb)) return false;
      if (slot === "dinner" && siblingCategory && getRecipeCategory(rec) === siblingCategory) return false;
      return true;
    });
    const scored = seededShuffle(pool, seed + dayName.length + slot.length + Object.keys(manualOverrides).length)
      .map((rec) => {
        let score = 0;
        if (slot === "dinner") {
          if (!rec.ingredients.some((i) => i.category === "Cereali")) score += 8;
          if (["pesce", "legumi", "uova", "pollo", "verdure"].includes(getRecipeCategory(rec))) score += 6;
        }
        if (computedPrefs.coreIngredients.length) score += rec.ingredients.filter((i) => computedPrefs.coreIngredients.includes(normalize(i.name))).length * 20;
        return { recipe: rec, score };
      })
      .sort((a, b) => b.score - a.score);
    const nextRecipe = scored[0]?.recipe || null;
    if (!nextRecipe) { setLastMessage(`Nessuna alternativa per ${dayName}`); return; }
    setManualOverrides((prev) => ({ ...prev, [dayName]: { ...(prev[dayName] || {}), [slot]: nextRecipe } }));
    setSelectedRecipe(nextRecipe);
    setLastMessage(`Rigenerato ${slot === "lunch" ? "pranzo" : "cena"} di ${dayName}`);
    setShowGeneratedBanner(true);
    tourAdvance("regenerated");
  };

  return (
    <div className="animate-in delay-2 mobile-stack" style={{ display: "grid", gridTemplateColumns: "1.3fr 0.7fr", gap: 20 }}>
      <div>
        <SectionHeader icon="📅" title="Piano della settimana" subtitle="Bilanciato per riutilizzare ingredienti e ridurre gli sprechi" />
        <div style={{ display: "grid", gap: 12 }}>
          {generated.days.map((day, di) => (
            <div key={day.day} className="day-card animate-in" style={{ animationDelay: `${di * 0.04}s` }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <h4 className="font-display" style={{ margin: 0, fontSize: 17, fontWeight: 600, color: "var(--sepia)" }}>{day.day === "Dom" ? "☀️ " : ""}{day.day}</h4>
                <span className="tag-pill">{preferences.mealsPerDay === "both" ? "pranzo + cena" : "cena"}</span>
              </div>
              {(() => {
                if (preferences.mealsPerDay !== "both") {
                  return (
                    <div className="meal-slot" onClick={() => { if (day.dinner) { setSelectedRecipe(day.dinner); tourAdvance("recipe_selected"); } }}>
                      <p style={{ margin: "0 0 6px", fontWeight: 600, color: "var(--sepia)", fontSize: 15 }}>
                        {day.dinner?.title || <span style={{ color: "var(--sepia-light)", fontStyle: "italic" }}>Pasto saltato</span>}
                        {day.dinner?.tags?.includes("avanzi") && (
                          <span className="tag-pill" style={{ fontSize: 10, padding: "2px 6px", background: "var(--olive)", color: "white", borderRadius: 8, marginLeft: 6 }}>Avanzi</span>
                        )}
                      </p>
                      {day.dinner && <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}><TimeTag minutes={day.dinner.time} />{day.dinner.tags.slice(0, 3).map((t) => <TagPill key={t}>{t}</TagPill>)}</div>}
                      {day.dinner && <p style={{ margin: "0 0 8px", fontSize: 12, color: "var(--sepia-light)" }}>{day.dinner.ingredients.slice(0, 4).map((i) => i.name).join(" · ")}</p>}
                      {day.dinner && <button className="btn-ghost" style={{ fontSize: 12, padding: "4px 8px" }} onClick={(e) => { e.stopPropagation(); regenerateSingleMeal(day.day, "dinner"); }}>↺ rigenera</button>}
                    </div>
                  );
                }
                const isSwapped = swappedDays.has(day.day);
                const lunchRecipe = isSwapped ? day.dinner : day.lunch;
                const dinnerRecipe = isSwapped ? day.lunch : day.dinner;
                const slots = [
                  { label: "Pranzo", recipe: lunchRecipe, slot: "lunch" as MealSlot },
                  { label: "Cena", recipe: dinnerRecipe, slot: "dinner" as MealSlot },
                ];
                return (
                  <div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 8 }}>
                      <div style={{ height: 1, flex: 1, background: "rgba(61,43,31,0.12)" }} />
                      <button onClick={() => swapMeals(day.day)} title="Inverti pranzo e cena" style={{ background: isSwapped ? "var(--terra)" : "var(--cream-dark)", border: `1.5px solid ${isSwapped ? "var(--terra)" : "rgba(61,43,31,0.12)"}`, borderRadius: 100, padding: "4px 14px", display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 12, fontWeight: 700, color: isSwapped ? "white" : "var(--sepia-light)", transition: "all 0.15s", whiteSpace: "nowrap" }}>
                        ← {isSwapped ? "ripristina" : "inverti"} →
                      </button>
                      <div style={{ height: 1, flex: 1, background: "rgba(61,43,31,0.12)" }} />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      {slots.map((slotItem) => (
                        <React.Fragment key={slotItem.label}>
                          <div className="meal-slot" onClick={() => { if (slotItem.recipe) { setSelectedRecipe(slotItem.recipe); tourAdvance("recipe_selected"); } }}>
                            <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--sepia-light)" }}>{slotItem.label}</p>
                            <p style={{ margin: "0 0 8px", fontWeight: 600, color: "var(--sepia)", fontSize: 14, lineHeight: 1.3 }}>
                              {slotItem.recipe?.title || <span style={{ color: "var(--sepia-light)", fontStyle: "italic" }}>Pasto saltato</span>}
                              {slotItem.recipe?.tags?.includes("avanzi") && (
                                <span className="tag-pill" style={{ fontSize: 10, padding: "2px 6px", background: "var(--olive)", color: "white", borderRadius: 8, marginLeft: 6 }}>Avanzi</span>
                              )}
                            </p>
                            {slotItem.recipe && <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}><TimeTag minutes={slotItem.recipe.time} />{slotItem.recipe.tags.slice(0, 2).map((t) => <TagPill key={t}>{t}</TagPill>)}</div>}
                            {slotItem.recipe && <button className="btn-ghost" style={{ fontSize: 12, padding: "4px 8px" }} onClick={(e) => { e.stopPropagation(); regenerateSingleMeal(day.day, slotItem.slot); }}>↺ rigenera</button>}
                          </div>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                );
              })()}
              {day.notes.length > 0 && <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>{day.notes.map((n) => <span key={n} className="tag-pill tag-pill-terra">{n}</span>)}</div>}
            </div>
          ))}
        </div>
      </div>

      {/* Strategia + ricetta selezionata */}
      <div style={{ display: "grid", gap: 16, alignContent: "start" }}>
        <div className="card-warm" style={{ padding: 20 }}>
          <SectionHeader icon="🧠" title="Strategia" subtitle="Come è stato costruito il piano" />
          <div style={{ display: "grid", gap: 8 }}>
            {generated.alerts.map((a, i) => (
              <div key={i} style={{ background: "var(--cream)", borderRadius: 10, padding: "10px 12px", fontSize: 12, color: "var(--sepia-light)", lineHeight: 1.5 }}>{a}</div>
            ))}
          </div>
        </div>
        {selectedRecipe && (
          <div className="card-warm" style={{ padding: 20 }}>
            <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--terra)" }}>Selezionata</p>
            <h4 className="font-display" style={{ margin: "0 0 10px", fontSize: 16, color: "var(--sepia)", fontWeight: 600 }}>{selectedRecipe.title}</h4>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}><TimeTag minutes={selectedRecipe.time} />{selectedRecipe.tags.slice(0, 3).map((t) => <TagPill key={t}>{t}</TagPill>)}</div>
            <button className="btn-terra" style={{ width: "100%", justifyContent: "center" }} onClick={() => { onStartRecipeFlow(selectedRecipe); setActiveTab("recipes"); }}>▶ Avvia procedimento guidato</button>
          </div>
        )}
      </div>

      {/* Toast scongelo non bloccante */}
      {freezeToastMessage && (
        <FreezeToast message={freezeToastMessage} onDismiss={() => setFreezeToastMessage("")} />
      )}
    </div>
  );
}

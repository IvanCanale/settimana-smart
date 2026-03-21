"use client";
import React from "react";
import { SectionHeader } from "@/components/SectionHeader";
import { TagPill } from "@/components/TagPill";
import { TimeTag } from "@/components/TimeTag";
import type { Recipe, PlanResult } from "@/types";

interface RicetteTabProps {
  generated: PlanResult;
  selectedRecipe: Recipe | null;
  setSelectedRecipe: React.Dispatch<React.SetStateAction<Recipe | null>>;
  recipeDetailRef: React.RefObject<HTMLDivElement | null>;
  onStartRecipeFlow: (rec: Recipe | null) => void;
}

export function RicetteTab({
  generated,
  selectedRecipe,
  setSelectedRecipe,
  recipeDetailRef,
  onStartRecipeFlow,
}: RicetteTabProps) {
  const meals = generated.days.flatMap((day) => [day.lunch, day.dinner].filter(Boolean)) as Recipe[];

  return (
    <div className="animate-in delay-2 mobile-stack" style={{ display: "grid", gridTemplateColumns: "0.85fr 1.15fr", gap: 20 }}>
      <div>
        <SectionHeader icon="📖" title="Ricette della settimana" subtitle="Clicca per vedere ingredienti e preparazione" />
        <div style={{ display: "grid", gap: 8 }}>
          {Array.from(new Map(meals.map((m) => [m.id, m])).values()).map((meal) => (
            <div key={meal.id} className={`recipe-card${selectedRecipe?.id === meal.id ? " selected" : ""}`} onClick={() => setSelectedRecipe(meal)}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                <p style={{ margin: "0 0 6px", fontWeight: 600, color: "var(--sepia)", fontSize: 14, lineHeight: 1.3 }}>{meal.title}</p>
                <TimeTag minutes={meal.time} />
              </div>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>{meal.tags.slice(0, 3).map((t) => <TagPill key={t}>{t}</TagPill>)}</div>
            </div>
          ))}
        </div>
      </div>

      <div ref={recipeDetailRef} style={{ position: "sticky", top: 20, alignSelf: "start" }}>
        {selectedRecipe ? (
          <div className="card-warm" style={{ padding: 28 }}>
            <h2 className="font-display" style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 700, color: "var(--sepia)", lineHeight: 1.2 }}>{selectedRecipe.title}</h2>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
              <TimeTag minutes={selectedRecipe.time} />
              <TagPill terra>{selectedRecipe.servings} porzioni</TagPill>
              {selectedRecipe.tags.map((t) => <TagPill key={t}>{t}</TagPill>)}
            </div>

            <div className="divider-ornament"><span style={{ fontSize: 12 }}>✦ Ingredienti ✦</span></div>
            <div style={{ display: "grid", gap: 6, marginBottom: 20, marginTop: 12 }}>
              {selectedRecipe.ingredients.map((ingr) => (
                <div key={ingr.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--cream)", borderRadius: 8, padding: "8px 12px" }}>
                  <span style={{ fontSize: 14, color: "var(--sepia)", fontWeight: 500 }}>{ingr.name}</span>
                  <span style={{ fontSize: 13, color: "var(--terra)", fontWeight: 600 }}>{ingr.qty} {ingr.unit}</span>
                </div>
              ))}
            </div>

            <div className="divider-ornament"><span style={{ fontSize: 12 }}>✦ Preparazione ✦</span></div>
            <ol style={{ listStyle: "none", padding: 0, margin: "12px 0 20px", display: "grid", gap: 10 }}>
              {selectedRecipe.steps.map((step, i) => (
                <li key={i} className="step-item">
                  <div style={{ display: "flex", gap: 10 }}>
                    <span style={{ fontWeight: 800, color: "var(--terra)", fontSize: 15, minWidth: 20 }}>{i + 1}.</span>
                    <span style={{ fontSize: 14, color: "var(--sepia)", lineHeight: 1.6 }}>{step}</span>
                  </div>
                </li>
              ))}
            </ol>

            <button className="btn-terra" style={{ width: "100%", justifyContent: "center", padding: "12px 20px" }} onClick={() => onStartRecipeFlow(selectedRecipe)}>▶ Avvia procedimento guidato</button>
          </div>
        ) : (
          <div className="card-warm" style={{ padding: 40, textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🍽️</div>
            <p className="font-display" style={{ margin: 0, fontSize: 18, color: "var(--sepia-light)", fontStyle: "italic" }}>Seleziona una ricetta per vedere gli ingredienti e i passaggi.</p>
          </div>
        )}
      </div>
    </div>
  );
}

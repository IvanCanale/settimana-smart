"use client";
import React from "react";
import type { Recipe } from "@/types";

interface RecipeModalProps {
  recipe: Recipe;
  stepIndex: number;
  stepChecked: boolean;
  onClose: () => void;
  onAdvance: () => void;
  onStepCheck: (checked: boolean) => void;
}

export function RecipeModal({ recipe, stepIndex, stepChecked, onClose, onAdvance, onStepCheck }: RecipeModalProps) {
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <h3 className="font-display" style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 700, color: "var(--sepia)" }}>{recipe.title}</h3>
            <p style={{ margin: 0, fontSize: 13, color: "var(--sepia-light)" }}>Step {stepIndex + 1} di {recipe.steps.length}</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "var(--sepia-light)", lineHeight: 1 }}>×</button>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 18 }}>
          {recipe.steps.map((_, i) => (
            <span key={i} className={`step-badge ${i < stepIndex ? "done" : i === stepIndex ? "active" : "todo"}`}>{i < stepIndex ? "✓" : i + 1}</span>
          ))}
        </div>
        <div style={{ background: "var(--cream)", borderRadius: 16, padding: 20, marginBottom: 16, borderLeft: "4px solid var(--terra)" }}>
          <p style={{ margin: 0, fontSize: 15, color: "var(--sepia)", lineHeight: 1.7 }}>{recipe.steps[stepIndex]}</p>
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", background: "var(--cream-dark)", borderRadius: 10, padding: "10px 14px", marginBottom: 18, fontWeight: 400 }}>
          <input type="checkbox" checked={stepChecked} onChange={(e) => onStepCheck(e.target.checked)} className="checkbox-warm" />
          <span style={{ fontSize: 14, color: "var(--sepia)" }}>Ho completato questo passaggio</span>
        </label>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button className="btn-ghost" onClick={onClose}>Chiudi</button>
          <button className="btn-terra" onClick={onAdvance}>{stepIndex >= recipe.steps.length - 1 ? "✓ Fine!" : "Avanti →"}</button>
        </div>
      </div>
    </div>
  );
}

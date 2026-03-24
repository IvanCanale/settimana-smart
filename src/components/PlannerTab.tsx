"use client";
import React from "react";
import { SectionHeader } from "@/components/SectionHeader";
import { normalize, SKIP_OPTIONS } from "@/lib/planEngine";
import type { Preferences, PantryItem, PreferenceLearning, PlanResult, Diet, Skill } from "@/types";

interface PlannerTabProps {
  preferences: Preferences;
  setPreferences: React.Dispatch<React.SetStateAction<Preferences>>;
  pantryItems: PantryItem[];
  setPantryItems: React.Dispatch<React.SetStateAction<PantryItem[]>>;
  pantryInput: { name: string; quantity: string; unit: string };
  setPantryInput: React.Dispatch<React.SetStateAction<{ name: string; quantity: string; unit: string }>>;
  seed: number;
  setSeed: React.Dispatch<React.SetStateAction<number>>;
  isGenerating: boolean;
  lastMessage: string;
  showGeneratedBanner: boolean;
  generated: PlanResult;
  learning: PreferenceLearning;
  onGenerate: () => void;
  onConfirmWeek: () => void;
  onReset: () => void;
  onRestartOnboarding: () => void;
  setManualOverrides: React.Dispatch<React.SetStateAction<Record<string, Partial<Record<"lunch" | "dinner", import("@/types").Recipe | null>>>>>;
  setShowGeneratedBanner: React.Dispatch<React.SetStateAction<boolean>>;
  setLastMessage: React.Dispatch<React.SetStateAction<string>>;
  // Week-scoped plan management (optional — wired from useWeeklyPlans in page.tsx)
  feedbackNote?: string;
  setFeedbackNote?: React.Dispatch<React.SetStateAction<string>>;
  activeWeek?: string;
  switchWeek?: (week: string) => void;
}

export function PlannerTab({
  preferences,
  setPreferences,
  pantryItems,
  setPantryItems,
  pantryInput,
  setPantryInput,
  seed,
  setSeed,
  isGenerating,
  lastMessage,
  showGeneratedBanner,
  generated,
  learning,
  onGenerate,
  onConfirmWeek,
  onReset,
  onRestartOnboarding,
  feedbackNote,
  setFeedbackNote,
  activeWeek,
  switchWeek,
}: PlannerTabProps) {
  const addPantryItem = () => {
    if (!pantryInput.name.trim()) return;
    setPantryItems((prev) => [...prev, { name: pantryInput.name.trim(), quantity: Number(pantryInput.quantity || 0), unit: pantryInput.unit }]);
    setPantryInput({ name: "", quantity: "", unit: "g" });
  };

  const removePantryItem = (index: number) => setPantryItems((prev) => prev.filter((_, i) => i !== index));

  const toggleSkippedMeal = (value: string) =>
    setPreferences((p) => ({
      ...p,
      skippedMeals: p.skippedMeals.includes(value)
        ? p.skippedMeals.filter((x) => x !== value)
        : [...p.skippedMeals, value],
    }));

  return (
    <div className="animate-in delay-2 mobile-stack" style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 20 }}>

      {/* Preferenze */}
      <div className="card-warm mobile-pad" style={{ padding: 28 }}>
        <SectionHeader icon="🎛️" title="Preferenze" subtitle="Configura il tuo piano settimanale" />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }} className="mobile-stack">
          <div>
            <label>👥 Persone</label>
            <input type="number" min={1} value={preferences.people} onChange={(e) => setPreferences((p) => ({ ...p, people: Number(e.target.value || 1) }))} className="input-warm" style={{ marginTop: 6 }} />
          </div>
          <div>
            <label>🥗 Dieta</label>
            <select value={preferences.diet} onChange={(e) => setPreferences((p) => ({ ...p, diet: e.target.value as Diet }))} className="select-warm" style={{ marginTop: 6 }}>
              <option value="mediterranea">Mediterranea</option>
              <option value="onnivora">Onnivora</option>
              <option value="vegetariana">Vegetariana</option>
              <option value="vegana">Vegana</option>
            </select>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <div>
            <label>💶 Budget: €{preferences.budget}/settimana</label>
            <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--sepia-light)", fontStyle: "italic" }}>(Fase Beta, potrebbe non rispettarlo)</p>
            <input type="range" min={20} max={150} step={5} value={preferences.budget} onChange={(e) => setPreferences((p) => ({ ...p, budget: Number(e.target.value) }))} className="slider-warm" style={{ marginTop: 10 }} />
          </div>
          <div>
            <label>⏱ Tempo max: {preferences.maxTime} min</label>
            <input type="range" min={10} max={60} step={5} value={preferences.maxTime} onChange={(e) => setPreferences((p) => ({ ...p, maxTime: Number(e.target.value) }))} className="slider-warm" style={{ marginTop: 10 }} />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }} className="mobile-stack">
          <div>
            <label>👨‍🍳 Livello</label>
            <select value={preferences.skill} onChange={(e) => setPreferences((p) => ({ ...p, skill: e.target.value as Skill }))} className="select-warm" style={{ marginTop: 6 }}>
              <option value="beginner">Principiante</option>
              <option value="intermediate">Intermedio</option>
            </select>
          </div>
          <div>
            <label>🍽️ Pasti</label>
            <select value={preferences.mealsPerDay} onChange={(e) => setPreferences((p) => ({ ...p, mealsPerDay: e.target.value as "dinner" | "both" }))} className="select-warm" style={{ marginTop: 6 }}>
              <option value="dinner">Solo cena</option>
              <option value="both">Pranzo + cena</option>
            </select>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label>🧄 Ingredienti principali</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
            {preferences.coreIngredients.map((ing, i) => (
              <span key={i} className="pantry-tag">{ing}<button onClick={() => setPreferences((p) => ({ ...p, coreIngredients: p.coreIngredients.filter((_, j) => j !== i) }))} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--terra-light)", fontSize: 16, lineHeight: 1, padding: 0, marginLeft: 4 }}>×</button></span>
            ))}
            <input
              placeholder="Aggiungi ingrediente..."
              className="input-warm"
              style={{ flex: 1, minWidth: 140 }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  const val = (e.target as HTMLInputElement).value.trim().replace(/,$/, "");
                  if (val) {
                    setPreferences((p) => ({ ...p, coreIngredients: [...p.coreIngredients, val] }));
                    (e.target as HTMLInputElement).value = "";
                  }
                }
              }}
              onBlur={(e) => {
                const val = e.target.value.trim().replace(/,$/, "");
                if (val) {
                  setPreferences((p) => ({ ...p, coreIngredients: [...p.coreIngredients, val] }));
                  e.target.value = "";
                }
              }}
            />
          </div>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--sepia-light)" }}>Premi Invio o virgola per aggiungere. Questi ingredienti verranno favoriti nel piano.</p>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label>🚫 Ingredienti da escludere</label>
          <textarea placeholder="es. tonno, funghi, peperoni" value={preferences.exclusionsText} onChange={(e) => setPreferences((p) => ({ ...p, exclusionsText: e.target.value }))} className="input-warm" style={{ marginTop: 6, resize: "vertical", minHeight: 60 }} />
        </div>

        <div style={{ background: "var(--cream)", border: "1px solid rgba(61,43,31,0.12)", borderRadius: 14, padding: 16, marginBottom: 16, display: "grid", gap: 12 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontWeight: 400 }}>
            <input type="checkbox" checked={preferences.leftoversAllowed} onChange={(e) => setPreferences((p) => ({ ...p, leftoversAllowed: e.target.checked }))} className="checkbox-warm" />
            <span><strong>Riusa gli avanzi</strong> — il planner favorisce piatti riutilizzabili</span>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontWeight: 400 }}>
            <input type="checkbox" checked={preferences.sundaySpecial} onChange={(e) => setPreferences((p) => ({ ...p, sundaySpecial: e.target.checked }))} className="checkbox-warm" />
            <span><strong>Domenica speciale</strong> — piatto più ricco e laborioso</span>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontWeight: 400 }}>
            <input type="checkbox" checked={preferences.sundayDinnerLeftovers} onChange={(e) => setPreferences((p) => ({ ...p, sundayDinnerLeftovers: e.target.checked }))} className="checkbox-warm" />
            <span><strong>Cena domenica con avanzi</strong> del pranzo</span>
          </label>
        </div>

        <div style={{ background: "var(--cream)", border: "1px solid rgba(61,43,31,0.12)", borderRadius: 14, padding: 16, marginBottom: 20 }}>
          <label style={{ display: "block", marginBottom: 10 }}>📅 Pasti da saltare</label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
            {SKIP_OPTIONS.map((slot) => (
              <label key={slot} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 12, fontWeight: 400, background: preferences.skippedMeals.includes(slot) ? "rgba(196,103,58,0.08)" : "transparent", borderRadius: 8, padding: "5px 8px" }}>
                <input type="checkbox" checked={preferences.skippedMeals.includes(slot)} onChange={() => toggleSkippedMeal(slot)} className="checkbox-warm" />
                <span>{slot.replace("-", " ")}</span>
              </label>
            ))}
          </div>
        </div>

        {switchWeek && activeWeek && (
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            <button
              className={activeWeek === "current" || !activeWeek.includes("next") ? "btn-outline-terra" : "btn-ghost"}
              onClick={() => switchWeek("current")}
              style={{ fontSize: 13, padding: "7px 14px" }}
            >
              Questa settimana
            </button>
            <button
              className={activeWeek === "next" ? "btn-outline-terra" : "btn-ghost"}
              onClick={() => switchWeek("next")}
              style={{ fontSize: 13, padding: "7px 14px" }}
            >
              Prossima settimana
            </button>
          </div>
        )}

        {setFeedbackNote !== undefined && (
          <div style={{ marginBottom: 14 }}>
            <label>💬 Nota per la rigenerazione</label>
            <input
              type="text"
              placeholder="es. meno pesce questa settimana"
              value={feedbackNote ?? ""}
              onChange={(e) => setFeedbackNote(e.target.value)}
              className="input-warm"
              style={{ marginTop: 6 }}
            />
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--sepia-light)" }}>Verrà aggiunta alle esclusioni al prossimo piano generato.</p>
          </div>
        )}

        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
          <button className="btn-terra" onClick={onGenerate} disabled={isGenerating}>{isGenerating ? "⏳ Generazione..." : "✨ Genera piano"}</button>
          <button className="btn-outline-terra" onClick={onConfirmWeek}>❤️ Conferma settimana</button>
          <button className="btn-ghost" onClick={onReset}>↺ Reset</button>
          <button className="btn-ghost" onClick={onRestartOnboarding} style={{ fontSize: 12, color: "var(--sepia-light)" }}>⚙ Ripeti configurazione iniziale</button>
          {!showGeneratedBanner && <span style={{ fontSize: 13, color: "var(--sepia-light)" }}>{lastMessage}</span>}
        </div>
      </div>

      {/* Dispensa */}
      <div className="card-warm" style={{ padding: 28 }}>
        <SectionHeader icon="🧊" title="Dispensa" subtitle="Gli ingredienti già in casa vengono esclusi dalla spesa" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 90px 90px auto", gap: 8, marginBottom: 14 }}>
          <input placeholder="Ingrediente" value={pantryInput.name} onChange={(e) => setPantryInput((p) => ({ ...p, name: e.target.value }))} className="input-warm" onKeyDown={(e) => e.key === "Enter" && addPantryItem()} />
          <input placeholder="Qtà" value={pantryInput.quantity} onChange={(e) => setPantryInput((p) => ({ ...p, quantity: e.target.value }))} className="input-warm" />
          <select value={pantryInput.unit} onChange={(e) => setPantryInput((p) => ({ ...p, unit: e.target.value }))} className="select-warm">
            <option value="g">g</option><option value="kg">kg</option><option value="ml">ml</option><option value="L">L</option><option value="pezzi">pz</option><option value="cucchiai">cucchiai</option>
          </select>
          <button className="btn-terra" onClick={addPantryItem} style={{ padding: "9px 14px" }}>+</button>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
          {pantryItems.map((item, i) => (
            <span key={`${item.name}-${i}`} className="pantry-tag">{item.name} <span style={{ color: "var(--sepia-light)", fontSize: 11 }}>{item.quantity}{item.unit}</span><button onClick={() => removePantryItem(i)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--terra-light)", fontSize: 16, lineHeight: 1, padding: 0, marginLeft: 2 }}>×</button></span>
          ))}
        </div>
        {pantryItems.length === 0 && <p style={{ color: "var(--sepia-light)", fontSize: 13, marginTop: 12 }}>Nessun ingrediente in dispensa.</p>}

        <div className="divider-ornament" style={{ margin: "20px 0 16px" }}><span style={{ fontSize: 12 }}>✦</span></div>

        <div style={{ background: "var(--cream)", borderRadius: 12, padding: 14 }}>
          <p style={{ margin: "0 0 8px", fontWeight: 600, fontSize: 13, color: "var(--sepia)" }}>📊 Apprendimento preferenze</p>
          <p style={{ margin: "0 0 8px", fontSize: 13, color: "var(--sepia-light)" }}>Confermati: <strong style={{ color: "var(--olive)" }}>{Object.values(learning.keptRecipeIds).reduce((a, b) => a + b, 0)}</strong> · Rigenerati: <strong style={{ color: "var(--terra)" }}>{Object.values(learning.regeneratedRecipeIds).reduce((a, b) => a + b, 0)}</strong></p>
          {Object.keys(learning.likedIngredients).length > 0 && (
            <p style={{ margin: 0, fontSize: 12, color: "var(--sepia-light)" }}>❤️ Preferiti: {Object.entries(learning.likedIngredients).sort((a, b) => b[1] - a[1]).slice(0, 4).map((x) => x[0]).join(", ")}</p>
          )}
        </div>

        <div style={{ marginTop: 14, background: "rgba(92,107,58,0.07)", borderRadius: 12, padding: 14 }}>
          <p style={{ margin: 0, fontSize: 13, color: "var(--olive)", lineHeight: 1.5 }}>💾 Preferenze, dispensa e apprendimento vengono salvati automaticamente.</p>
        </div>
      </div>
    </div>
  );
}

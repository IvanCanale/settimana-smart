"use client";
import React, { useState } from "react";
import type { Preferences, Diet } from "@/types";
import { ALLERGEN_OPTIONS } from "@/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AuthModalInline } from "@/components/AuthModalInline";

interface OnboardingFlowProps {
  preferences: Preferences;
  setPreferences: React.Dispatch<React.SetStateAction<Preferences>>;
  onboardingStep: number;
  setOnboardingStep: React.Dispatch<React.SetStateAction<number>>;
  onComplete: () => void;
  sbClient: SupabaseClient | null;
}

export function OnboardingFlow({
  preferences,
  setPreferences,
  onboardingStep,
  setOnboardingStep,
  onComplete,
  sbClient,
}: OnboardingFlowProps) {
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>(() =>
    preferences.exclusions.filter((e) =>
      (ALLERGEN_OPTIONS as readonly string[]).includes(e)
    )
  );
  const [showAuthInline, setShowAuthInline] = useState(false);

  const noneSelected = selectedAllergens.includes("nessuna");

  const toggleAllergen = (allergen: string) => {
    setSelectedAllergens((prev) => {
      if (allergen === "nessuna") {
        return prev.includes("nessuna") ? [] : ["nessuna"];
      }
      const without = prev.filter((a) => a !== "nessuna");
      return without.includes(allergen)
        ? without.filter((a) => a !== allergen)
        : [...without, allergen];
    });
  };

  const steps = [
    // Step 0 — persone
    {
      emoji: "👥",
      title: "Per quante persone cucini?",
      subtitle: "Adatteremo le dosi e la lista della spesa",
      content: (
        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20 }}>
            <button
              onClick={() => setPreferences((p) => ({ ...p, people: Math.max(1, p.people - 1) }))}
              style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--cream-dark)", border: "2px solid rgba(61,43,31,0.12)", fontSize: 24, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "var(--sepia)" }}
            >−</button>
            <div style={{ textAlign: "center", minWidth: 100 }}>
              <div style={{ fontSize: 52, fontWeight: 800, color: "var(--terra)", fontFamily: "'Playfair Display', serif", lineHeight: 1 }}>{preferences.people}</div>
              <div style={{ fontSize: 14, color: "var(--sepia-light)", marginTop: 4 }}>{preferences.people === 1 ? "persona" : "persone"}</div>
            </div>
            <button
              onClick={() => setPreferences((p) => ({ ...p, people: Math.min(12, p.people + 1) }))}
              style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--terra)", border: "none", fontSize: 24, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "white" }}
            >+</button>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <button
                key={n}
                onClick={() => setPreferences((p) => ({ ...p, people: n }))}
                style={{ width: 40, height: 40, borderRadius: "50%", background: preferences.people === n ? "var(--terra)" : "var(--cream)", border: `2px solid ${preferences.people === n ? "var(--terra)" : "rgba(61,43,31,0.12)"}`, fontSize: 14, fontWeight: 700, cursor: "pointer", color: preferences.people === n ? "white" : "var(--sepia)", transition: "all 0.15s" }}
              >{n}</button>
            ))}
          </div>
          <button
            onClick={() => setOnboardingStep(1)}
            style={{ background: "var(--terra)", border: "none", borderRadius: 14, padding: "14px", color: "white", fontWeight: 700, fontSize: 16, cursor: "pointer", marginTop: 4 }}
          >Continua →</button>
        </div>
      ),
    },
    // Step 1 — dieta
    {
      emoji: "🥗",
      title: "Che tipo di dieta segui?",
      subtitle: "Mostreremo solo ricette adatte a te",
      content: (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {([
            { value: "mediterranea", emoji: "🫒", label: "Mediterranea", desc: "Pasta, pesce, carne, verdure" },
            { value: "onnivora", emoji: "🥩", label: "Onnivora", desc: "Tutto, senza restrizioni" },
            { value: "vegetariana", emoji: "🥦", label: "Vegetariana", desc: "No carne e pesce" },
            { value: "vegana", emoji: "🌱", label: "Vegana", desc: "Solo vegetale" },
          ] as { value: Diet; emoji: string; label: string; desc: string }[]).map((opt) => (
            <button
              key={opt.value}
              onClick={() => { setPreferences((p) => ({ ...p, diet: opt.value })); setOnboardingStep(2); }}
              style={{ background: preferences.diet === opt.value ? "rgba(196,103,58,0.08)" : "var(--cream)", border: `2px solid ${preferences.diet === opt.value ? "var(--terra)" : "rgba(61,43,31,0.12)"}`, borderRadius: 16, padding: "18px 16px", cursor: "pointer", textAlign: "left", transition: "all 0.15s" }}
            >
              <div style={{ fontSize: 28, marginBottom: 8 }}>{opt.emoji}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--sepia)", marginBottom: 4 }}>{opt.label}</div>
              <div style={{ fontSize: 12, color: "var(--sepia-light)" }}>{opt.desc}</div>
            </button>
          ))}
        </div>
      ),
    },
    // Step 2 — allergie (NEW)
    {
      emoji: "⚠️",
      title: "Hai allergie o intolleranze?",
      subtitle: "Escluderemo questi alimenti da tutte le ricette",
      content: (
        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {(ALLERGEN_OPTIONS as readonly string[]).map((allergen) => {
              const isSelected = selectedAllergens.includes(allergen);
              return (
                <button
                  key={allergen}
                  onClick={() => !noneSelected && toggleAllergen(allergen)}
                  style={{
                    background: isSelected ? "rgba(196,103,58,0.08)" : "var(--cream)",
                    border: `2px solid ${isSelected ? "var(--terra)" : "rgba(61,43,31,0.12)"}`,
                    borderRadius: 100,
                    padding: "8px 16px",
                    cursor: noneSelected ? "not-allowed" : "pointer",
                    fontSize: 14,
                    fontWeight: 600,
                    color: "var(--sepia)",
                    transition: "all 0.15s",
                    opacity: noneSelected && !isSelected ? 0.4 : 1,
                    pointerEvents: noneSelected ? "none" : "auto",
                  }}
                >
                  {allergen.charAt(0).toUpperCase() + allergen.slice(1)}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => toggleAllergen("nessuna")}
            style={{
              background: noneSelected ? "rgba(196,103,58,0.08)" : "var(--cream)",
              border: `2px solid ${noneSelected ? "var(--terra)" : "rgba(61,43,31,0.12)"}`,
              borderRadius: 100,
              padding: "10px 20px",
              cursor: "pointer",
              fontSize: 15,
              fontWeight: 700,
              color: "var(--sepia)",
              transition: "all 0.15s",
              width: "100%",
              textAlign: "center",
            }}
          >
            {noneSelected ? "✓ " : ""}Nessuna allergia
          </button>
          <button
            onClick={() => {
              if (noneSelected) {
                setPreferences((p) => ({ ...p, exclusions: [] }));
              } else {
                setPreferences((p) => ({ ...p, exclusions: selectedAllergens }));
              }
              setOnboardingStep(3);
            }}
            disabled={selectedAllergens.length === 0}
            style={{
              background: "var(--terra)",
              border: "none",
              borderRadius: 14,
              padding: "14px",
              color: "white",
              fontWeight: 700,
              fontSize: 16,
              cursor: selectedAllergens.length === 0 ? "not-allowed" : "pointer",
              marginTop: 4,
              opacity: selectedAllergens.length === 0 ? 0.5 : 1,
              transition: "all 0.15s",
            }}
          >Continua →</button>
        </div>
      ),
    },
    // Step 3 — tempo (was step 2)
    {
      emoji: "⏱",
      title: "Quanto tempo hai per cucinare?",
      subtitle: "Selezioneremo ricette adatte ai tuoi ritmi",
      content: (
        <div style={{ display: "grid", gap: 10 }}>
          {[
            { time: 15, emoji: "⚡", label: "Velocissimo", desc: "Max 15 minuti" },
            { time: 20, emoji: "🏃", label: "Rapido", desc: "Max 20 minuti" },
            { time: 30, emoji: "🍳", label: "Normale", desc: "Max 30 minuti" },
            { time: 45, emoji: "👨‍🍳", label: "Con calma", desc: "Max 45 minuti" },
          ].map((opt) => (
            <button
              key={opt.time}
              onClick={() => { setPreferences((p) => ({ ...p, maxTime: opt.time })); setOnboardingStep(4); }}
              style={{ background: preferences.maxTime === opt.time ? "rgba(196,103,58,0.08)" : "var(--cream)", border: `2px solid ${preferences.maxTime === opt.time ? "var(--terra)" : "rgba(61,43,31,0.12)"}`, borderRadius: 16, padding: "16px 18px", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 16, transition: "all 0.15s" }}
            >
              <span style={{ fontSize: 28 }}>{opt.emoji}</span>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--sepia)" }}>{opt.label}</div>
                <div style={{ fontSize: 13, color: "var(--sepia-light)", marginTop: 2 }}>{opt.desc}</div>
              </div>
            </button>
          ))}
        </div>
      ),
    },
    // Step 4 — registrazione (NEW)
    {
      emoji: "☁️",
      title: "Salva i tuoi dati nel cloud",
      subtitle: "Registrati per sincronizzare tra dispositivi. Puoi farlo anche dopo.",
      content: (
        <div style={{ display: "grid", gap: 12 }}>
          {showAuthInline ? (
            <AuthModalInline
              onClose={() => { setShowAuthInline(false); onComplete(); }}
              client={sbClient}
            />
          ) : (
            <>
              <button
                onClick={() => setShowAuthInline(true)}
                className="btn-terra"
                style={{ justifyContent: "center", width: "100%" }}
              >
                Crea account o accedi
              </button>
              <button
                onClick={onComplete}
                className="btn-ghost"
                style={{ justifyContent: "center", width: "100%", fontSize: 14 }}
              >
                Continua senza account →
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  const step = steps[onboardingStep];

  return (
    <div className="bg-texture" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div className="card-warm animate-in" style={{ maxWidth: 480, width: "100%", padding: "clamp(20px, 6vw, 36px)" }}>
        <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 28 }}>
          {steps.map((_, i) => (
            <div
              key={i}
              style={{ width: i === onboardingStep ? 24 : 8, height: 8, borderRadius: 100, background: i <= onboardingStep ? "var(--terra)" : "var(--cream-dark)", transition: "all 0.3s" }}
            />
          ))}
        </div>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 52, marginBottom: 12 }}>{step.emoji}</div>
          <h2 className="font-display" style={{ margin: "0 0 8px", fontSize: 24, fontWeight: 700, color: "var(--sepia)" }}>{step.title}</h2>
          <p style={{ margin: 0, fontSize: 14, color: "var(--sepia-light)" }}>{step.subtitle}</p>
        </div>
        {step.content}
        {onboardingStep > 0 && (
          <button className="btn-ghost" onClick={() => setOnboardingStep((p) => p - 1)} style={{ marginTop: 16, width: "100%", justifyContent: "center" }}>← indietro</button>
        )}
      </div>
    </div>
  );
}

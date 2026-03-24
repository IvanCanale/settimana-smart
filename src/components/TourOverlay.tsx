"use client";
import React from "react";

export type TourStep = {
  tab: string;
  emoji: string;
  title: string;
  body: string;
  instruction: string | null;
  waitFor: string | null;
  highlight: string | null;
  position: "top" | "bottom";
};

export const TOUR_STEPS: TourStep[] = [
  { tab: "planner", emoji: "👋", title: "Benvenuto in Menumix!", body: "Questa app pianifica i tuoi pasti settimanali, crea la lista della spesa e ti guida in cucina — tutto in automatico.", instruction: null, waitFor: null, highlight: null, position: "bottom" },
  { tab: "planner", emoji: "🎛️", title: "Il Planner", body: "Qui imposti le tue preferenze: quante persone, che dieta segui, quanto tempo hai per cucinare.", instruction: "👇 Premi 'Genera piano' per creare la tua prima settimana", waitFor: "generate", highlight: "btn-genera", position: "top" },
  { tab: "week", emoji: "📅", title: "La tua settimana", body: "Ecco il piano generato! Ogni giorno ha pranzo e cena bilanciati.", instruction: "👇 Tocca uno dei piatti per vedere la ricetta", waitFor: "recipe_selected", highlight: "meal-slot", position: "top" },
  { tab: "week", emoji: "⇅", title: "Personalizza i pasti", body: "Puoi rigenerare un singolo piatto con ↺, oppure invertire pranzo e cena.", instruction: "👇 Premi ↺ su uno dei piatti per rigenerarlo", waitFor: "regenerated", highlight: "rigenera", position: "top" },
  { tab: "shopping", emoji: "🛒", title: "La lista della spesa", body: "Tutto quello che ti serve per la settimana, organizzato per categoria.", instruction: "👇 Spunta un ingrediente come se fossi al supermercato", waitFor: "item_checked", highlight: "checkbox-spesa", position: "top" },
  { tab: "recipes", emoji: "📖", title: "Il procedimento guidato", body: "Ogni ricetta ha dosi precise e passaggi dettagliati.", instruction: "👆 Seleziona una ricetta, premi 'Avvia procedimento guidato' e completala", waitFor: "guided_completed", highlight: "btn-guida", position: "top" },
  { tab: "planner", emoji: "🧊", title: "La dispensa", body: "Aggiungi gli ingredienti che hai già in casa — il sistema li escluderà dalla lista della spesa.", instruction: null, waitFor: null, highlight: null, position: "bottom" },
];

interface TourOverlayProps {
  steps: TourStep[];
  currentStep: number;
  onAdvance: () => void;
  onComplete: () => void;
}

export function TourOverlay({ steps, currentStep, onAdvance, onComplete }: TourOverlayProps) {
  const step = steps[currentStep];
  if (!step) return null;
  const isIntro = step.waitFor === null;

  return (
    <>
      <div style={{ position: "fixed", inset: 0, zIndex: 90, pointerEvents: "none", background: "rgba(61,43,31,0.18)" }} />
      <div style={{ position: "fixed", ...(step.position === "top" ? { top: 0, left: 0, right: 0, padding: "12px 12px 0" } : { bottom: 0, left: 0, right: 0, padding: "0 12px 12px" }), zIndex: 100 }}>
        <div style={{ maxWidth: 560, margin: "0 auto", background: "var(--warm-white)", borderRadius: step.position === "top" ? "14px 14px 20px 20px" : "20px 20px 14px 14px", boxShadow: step.position === "top" ? "0 8px 40px rgba(61,43,31,0.22)" : "0 -8px 40px rgba(61,43,31,0.22)", overflow: "hidden" }}>
          <div style={{ height: 3, background: "var(--cream-dark)" }}>
            <div style={{ height: "100%", background: "var(--terra)", width: `${((currentStep + 1) / steps.length) * 100}%`, transition: "width 0.4s ease" }} />
          </div>
          <div style={{ padding: "14px 18px 16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--terra)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{currentStep + 1} / {steps.length}</span>
              <button onClick={onComplete} style={{ background: "none", border: "none", fontSize: 12, color: "var(--sepia-light)", cursor: "pointer", fontWeight: 500, padding: "4px 8px" }}>Salta il tour ×</button>
            </div>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 12 }}>
              <span style={{ fontSize: 30, lineHeight: 1, flexShrink: 0 }}>{step.emoji}</span>
              <div>
                <p style={{ margin: "0 0 5px", fontWeight: 700, fontSize: 15, color: "var(--sepia)", fontFamily: "'Playfair Display', serif" }}>{step.title}</p>
                <p style={{ margin: 0, fontSize: 13, color: "var(--sepia-light)", lineHeight: 1.55 }}>{step.body}</p>
              </div>
            </div>
            {step.instruction && (
              <div style={{ background: "rgba(196,103,58,0.08)", border: "1px solid rgba(196,103,58,0.2)", borderRadius: 10, padding: "8px 12px", marginBottom: 12 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--terra)" }}>{step.instruction}</p>
              </div>
            )}
            {isIntro && (
              <button className="btn-terra" style={{ width: "100%", justifyContent: "center" }} onClick={onAdvance}>Avanti →</button>
            )}
            {!isIntro && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, opacity: 0.6 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--terra)", animation: "pulse 1.2s infinite" }} />
                <span style={{ fontSize: 12, color: "var(--sepia-light)" }}>In attesa che tu completi l&apos;azione…</span>
              </div>
            )}
          </div>
        </div>
      </div>
      {step.highlight && step.position === "top" && (
        <div style={{ position: "fixed", top: 170, left: "50%", transform: "translateX(-50%)", zIndex: 95, textAlign: "center", pointerEvents: "none" }}>
          <div style={{ animation: "bounce 0.8s infinite", fontSize: 28 }}>👇</div>
        </div>
      )}
      {step.highlight && step.position === "bottom" && (
        <div style={{ position: "fixed", bottom: 170, left: "50%", transform: "translateX(-50%)", zIndex: 95, textAlign: "center", pointerEvents: "none" }}>
          <div style={{ animation: "bounce 0.8s infinite", fontSize: 28 }}>👆</div>
        </div>
      )}
    </>
  );
}

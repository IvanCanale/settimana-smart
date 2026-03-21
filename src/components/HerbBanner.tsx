"use client";
import React from "react";
import { normalize } from "@/lib/planEngine";
import type { PantryItem } from "@/types";

interface HerbBannerProps {
  herbsToCheck: string[];
  herbAnswers: Record<string, boolean>;
  setHerbAnswers: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  setPantryItems: React.Dispatch<React.SetStateAction<PantryItem[]>>;
  onDismiss: () => void;
}

export function HerbBanner({ herbsToCheck, herbAnswers, setHerbAnswers, setPantryItems, onDismiss }: HerbBannerProps) {
  return (
    <div className="animate-in" style={{ background: "var(--warm-white)", border: "1.5px solid rgba(92,107,58,0.3)", borderRadius: 18, padding: "18px 22px", marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <span style={{ fontSize: 22 }}>🌿</span>
        <div>
          <p style={{ margin: 0, fontWeight: 700, color: "var(--sepia)", fontSize: 15 }}>Hai ancora queste erbe fresche?</p>
          <p style={{ margin: "2px 0 0", fontSize: 13, color: "var(--sepia-light)" }}>Se le hai ancora non le mettiamo nella lista della spesa del prossimo piano.</p>
        </div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        {herbsToCheck.map((herb) => (
          <div key={herb} style={{ display: "flex", alignItems: "center", gap: 8, background: herbAnswers[herb] === true ? "rgba(92,107,58,0.12)" : herbAnswers[herb] === false ? "rgba(196,103,58,0.08)" : "var(--cream)", border: `1.5px solid ${herbAnswers[herb] === true ? "var(--olive)" : herbAnswers[herb] === false ? "var(--terra-light)" : "rgba(61,43,31,0.12)"}`, borderRadius: 100, padding: "7px 14px" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--sepia)" }}>{herb}</span>
            <button
              onClick={() => {
                setHerbAnswers((p) => ({ ...p, [herb]: true }));
                setPantryItems((prev) => prev.some((x) => normalize(x.name) === normalize(herb)) ? prev : [...prev, { name: herb, quantity: 1, unit: "mazzetto" }]);
              }}
              style={{ background: herbAnswers[herb] === true ? "var(--olive)" : "transparent", border: `1px solid ${herbAnswers[herb] === true ? "var(--olive)" : "rgba(61,43,31,0.12)"}`, borderRadius: 100, padding: "3px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer", color: herbAnswers[herb] === true ? "white" : "var(--sepia-light)" }}
            >✓ Sì</button>
            <button
              onClick={() => setHerbAnswers((p) => ({ ...p, [herb]: false }))}
              style={{ background: herbAnswers[herb] === false ? "var(--terra)" : "transparent", border: `1px solid ${herbAnswers[herb] === false ? "var(--terra)" : "rgba(61,43,31,0.12)"}`, borderRadius: 100, padding: "3px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer", color: herbAnswers[herb] === false ? "white" : "var(--sepia-light)" }}
            >✗ No</button>
          </div>
        ))}
      </div>
      {Object.keys(herbAnswers).length === herbsToCheck.length && (
        <button onClick={onDismiss} style={{ marginTop: 14, background: "var(--olive)", border: "none", borderRadius: 10, padding: "8px 18px", color: "white", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>✓ Fatto, aggiorna la dispensa</button>
      )}
    </div>
  );
}

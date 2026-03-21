"use client";
import React from "react";
import type { PlanResult } from "@/types";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { RECIPE_LIBRARY } from "@/data/recipes";

interface AppHeaderProps {
  isMounted: boolean;
  generated: PlanResult;
  user: User | null;
  syncStatus: string;
  sbClient: SupabaseClient | null;
  onSignIn: () => void;
  onSignOut: () => void;
}

export function AppHeader({ isMounted, generated, user, syncStatus, sbClient, onSignIn, onSignOut }: AppHeaderProps) {
  return (
    <div className="animate-in mobile-stack" style={{ display: "grid", gridTemplateColumns: "1fr auto", alignItems: "start", gap: 12, marginBottom: 20 }}>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 6 }}>
          <div style={{ width: 52, height: 52, borderRadius: 16, background: "var(--terra)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, boxShadow: "0 4px 16px rgba(196,103,58,0.35)" }}>🍳</div>
          <div>
            <h1 className="font-display" style={{ fontSize: "clamp(22px, 6vw, 32px)", fontWeight: 700, color: "var(--sepia)", margin: 0, lineHeight: 1.1 }}>Settimana Smart</h1>
            <p style={{ margin: 0, fontSize: 14, color: "var(--sepia-light)", fontWeight: 400 }}>Meal planning · {RECIPE_LIBRARY.length} ricette con istruzioni dettagliate</p>
          </div>
        </div>
      </div>
      <div className="mobile-hide" style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "flex-end" }}>
        <div className="stat-chip" style={{ minWidth: 110 }}>
          <div><div style={{ fontSize: 11, fontWeight: 600, color: "var(--sepia-light)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Riutilizzati</div><div className="font-display" style={{ fontSize: 26, fontWeight: 700, color: "var(--terra)", lineHeight: 1.1 }}>{isMounted ? generated.stats.reusedIngredients : "—"}</div></div>
          <span style={{ fontSize: 22 }}>♻️</span>
        </div>
        <div className="stat-chip" style={{ minWidth: 110 }}>
          <div><div style={{ fontSize: 11, fontWeight: 600, color: "var(--sepia-light)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Risparmio</div><div className="font-display" style={{ fontSize: 26, fontWeight: 700, color: "var(--olive)", lineHeight: 1.1 }}>{isMounted ? `€${generated.stats.estimatedSavings.toFixed(0)}` : "—"}</div></div>
          <span style={{ fontSize: 22 }}>💶</span>
        </div>
      </div>
      <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end", marginTop: -8 }}>
        {isMounted && (user ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {syncStatus === "saving" && <span style={{ fontSize: 11, color: "var(--sepia-light)" }}>↑ salvataggio...</span>}
            {syncStatus === "saved"  && <span style={{ fontSize: 11, color: "var(--olive)" }}>✓ salvato</span>}
            {syncStatus === "error"  && <span style={{ fontSize: 11, color: "var(--terra)" }}>⚠ errore sync</span>}
            <button onClick={onSignOut} style={{ background: "none", border: "1px solid var(--cream-dark)", borderRadius: 100, padding: "5px 14px", fontSize: 12, cursor: "pointer", color: "var(--sepia-light)", fontWeight: 600 }}>{user?.email?.split("@")[0] ?? "Account"} · Esci</button>
          </div>
        ) : (
          <button onClick={onSignIn} className="btn-terra" style={{ padding: "7px 16px", fontSize: 13 }}>Accedi · Salva i tuoi dati ☁️</button>
        ))}
      </div>
    </div>
  );
}

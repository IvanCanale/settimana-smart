"use client";
import React, { useState } from "react";
import type { Preferences, Diet } from "@/types";
import { ALLERGEN_OPTIONS } from "@/types";
import { useAuth } from "@/lib/AuthProvider";
import { AuthModalInline } from "@/components/AuthModalInline";
import { migrateFromLocalStorage } from "@/lib/supabase";

interface ProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  preferences: Preferences;
  setPreferences: React.Dispatch<React.SetStateAction<Preferences>>;
}

export function ProfileDrawer({ isOpen, onClose, preferences, setPreferences }: ProfileDrawerProps) {
  const { sbClient, user } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  if (!isOpen) return null;

  const selectedAllergens = preferences.exclusions.filter((e) =>
    (ALLERGEN_OPTIONS as readonly string[]).includes(e)
  );
  const noneSelected = preferences.exclusions.length === 0 && selectedAllergens.length === 0;
  const noneExplicit = preferences.exclusions.includes("nessuna");

  const toggleAllergen = (allergen: string) => {
    if (allergen === "nessuna") {
      setPreferences((p) => ({ ...p, exclusions: p.exclusions.includes("nessuna") ? [] : ["nessuna"] }));
      return;
    }
    setPreferences((p) => {
      const without = p.exclusions.filter((a) => a !== "nessuna");
      return {
        ...p,
        exclusions: without.includes(allergen)
          ? without.filter((a) => a !== allergen)
          : [...without, allergen],
      };
    });
  };

  const sectionLabel: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    color: "var(--sepia-light)",
    marginBottom: 12,
    marginTop: 0,
  };

  const divider: React.CSSProperties = {
    margin: "20px 0",
    background: "var(--cream-dark)",
    height: 1,
    border: "none",
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 200,
          background: "rgba(61,43,31,0.6)",
          backdropFilter: "blur(6px)",
        }}
      />

      {/* Drawer panel */}
      <div
        className="animate-in"
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "min(400px, 90vw)",
          background: "var(--warm-white)",
          overflowY: "auto",
          padding: 24,
          boxShadow: "-8px 0 30px rgba(61,43,31,0.15)",
          zIndex: 201,
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <h2
            style={{
              margin: 0,
              fontFamily: "'Playfair Display', serif",
              fontSize: 22,
              fontWeight: 700,
              color: "var(--sepia)",
            }}
          >
            Il tuo profilo
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: 22,
              cursor: "pointer",
              color: "var(--sepia-light)",
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {/* Section: Persone */}
        <div style={{ marginBottom: 20 }}>
          <p style={sectionLabel}>Persone</p>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20, marginBottom: 12 }}>
            <button
              onClick={() => setPreferences((p) => ({ ...p, people: Math.max(1, p.people - 1) }))}
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                background: "var(--cream-dark)",
                border: "2px solid rgba(61,43,31,0.12)",
                fontSize: 24,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                color: "var(--sepia)",
                transition: "all 0.15s",
              }}
            >
              −
            </button>
            <div style={{ textAlign: "center", minWidth: 80 }}>
              <div
                style={{
                  fontSize: 48,
                  fontWeight: 800,
                  color: "var(--terra)",
                  fontFamily: "'Playfair Display', serif",
                  lineHeight: 1,
                }}
              >
                {preferences.people}
              </div>
              <div style={{ fontSize: 13, color: "var(--sepia-light)", marginTop: 4 }}>
                {preferences.people === 1 ? "persona" : "persone"}
              </div>
            </div>
            <button
              onClick={() => setPreferences((p) => ({ ...p, people: Math.min(12, p.people + 1) }))}
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                background: "var(--terra)",
                border: "none",
                fontSize: 24,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                color: "white",
                transition: "all 0.15s",
              }}
            >
              +
            </button>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <button
                key={n}
                onClick={() => setPreferences((p) => ({ ...p, people: n }))}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  background: preferences.people === n ? "var(--terra)" : "var(--cream)",
                  border: `2px solid ${preferences.people === n ? "var(--terra)" : "rgba(61,43,31,0.12)"}`,
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                  color: preferences.people === n ? "white" : "var(--sepia)",
                  transition: "all 0.15s",
                }}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <hr style={divider} />

        {/* Section: Dieta */}
        <div style={{ marginBottom: 20 }}>
          <p style={sectionLabel}>Dieta</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {(
              [
                { value: "mediterranea", emoji: "🫒", label: "Mediterranea", desc: "Pasta, pesce, carne, verdure" },
                { value: "onnivora", emoji: "🥩", label: "Onnivora", desc: "Tutto, senza restrizioni" },
                { value: "vegetariana", emoji: "🥦", label: "Vegetariana", desc: "No carne e pesce" },
                { value: "vegana", emoji: "🌱", label: "Vegana", desc: "Solo vegetale" },
              ] as { value: Diet; emoji: string; label: string; desc: string }[]
            ).map((opt) => (
              <button
                key={opt.value}
                onClick={() => setPreferences((p) => ({ ...p, diet: opt.value }))}
                style={{
                  background: preferences.diet === opt.value ? "rgba(196,103,58,0.08)" : "var(--cream)",
                  border: `2px solid ${preferences.diet === opt.value ? "var(--terra)" : "rgba(61,43,31,0.12)"}`,
                  borderRadius: 16,
                  padding: "14px 12px",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.15s",
                }}
              >
                <div style={{ fontSize: 24, marginBottom: 6 }}>{opt.emoji}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--sepia)", marginBottom: 2 }}>{opt.label}</div>
                <div style={{ fontSize: 11, color: "var(--sepia-light)" }}>{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <hr style={divider} />

        {/* Section: Allergie */}
        <div style={{ marginBottom: 20 }}>
          <p style={sectionLabel}>Allergie / Intolleranze</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
            {(ALLERGEN_OPTIONS as readonly string[]).map((allergen) => {
              const isSelected = preferences.exclusions.includes(allergen);
              const isDisabled = noneExplicit;
              return (
                <button
                  key={allergen}
                  onClick={() => !isDisabled && toggleAllergen(allergen)}
                  style={{
                    background: isSelected ? "rgba(196,103,58,0.08)" : "var(--cream)",
                    border: `2px solid ${isSelected ? "var(--terra)" : "rgba(61,43,31,0.12)"}`,
                    borderRadius: 100,
                    padding: "8px 14px",
                    cursor: isDisabled ? "not-allowed" : "pointer",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--sepia)",
                    transition: "all 0.15s",
                    opacity: isDisabled && !isSelected ? 0.4 : 1,
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
              background: noneExplicit ? "rgba(196,103,58,0.08)" : "var(--cream)",
              border: `2px solid ${noneExplicit ? "var(--terra)" : "rgba(61,43,31,0.12)"}`,
              borderRadius: 100,
              padding: "10px 20px",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 700,
              color: "var(--sepia)",
              transition: "all 0.15s",
              width: "100%",
              textAlign: "center",
            }}
          >
            {noneExplicit ? "✓ " : ""}Nessuna allergia
          </button>
        </div>

        <hr style={divider} />

        {/* Section: Tempo */}
        <div style={{ marginBottom: 20 }}>
          <p style={sectionLabel}>Tempo massimo</p>
          <div style={{ display: "grid", gap: 8 }}>
            {[
              { time: 15, emoji: "⚡", label: "Velocissimo", desc: "Max 15 minuti" },
              { time: 20, emoji: "🏃", label: "Rapido", desc: "Max 20 minuti" },
              { time: 30, emoji: "🍳", label: "Normale", desc: "Max 30 minuti" },
              { time: 45, emoji: "👨‍🍳", label: "Con calma", desc: "Max 45 minuti" },
            ].map((opt) => (
              <button
                key={opt.time}
                onClick={() => setPreferences((p) => ({ ...p, maxTime: opt.time }))}
                style={{
                  background: preferences.maxTime === opt.time ? "rgba(196,103,58,0.08)" : "var(--cream)",
                  border: `2px solid ${preferences.maxTime === opt.time ? "var(--terra)" : "rgba(61,43,31,0.12)"}`,
                  borderRadius: 12,
                  padding: "12px 14px",
                  cursor: "pointer",
                  textAlign: "left",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  transition: "all 0.15s",
                }}
              >
                <span style={{ fontSize: 22 }}>{opt.emoji}</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--sepia)" }}>{opt.label}</div>
                  <div style={{ fontSize: 12, color: "var(--sepia-light)", marginTop: 2 }}>{opt.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <hr style={divider} />

        {/* Section: Budget */}
        <div style={{ marginBottom: 20 }}>
          <p style={sectionLabel}>Budget settimanale</p>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: 13, color: "var(--sepia-light)" }}>€20</span>
            <span
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: "var(--terra)",
                fontFamily: "'Playfair Display', serif",
              }}
            >
              €{preferences.budget}
            </span>
            <span style={{ fontSize: 13, color: "var(--sepia-light)" }}>€100</span>
          </div>
          <input
            type="range"
            min={20}
            max={100}
            step={10}
            value={preferences.budget}
            onChange={(e) => setPreferences((p) => ({ ...p, budget: Number(e.target.value) }))}
            style={{ width: "100%", accentColor: "var(--terra)" }}
          />
        </div>

        <hr style={divider} />

        {/* Auth section */}
        <div>
          {user === null ? (
            <div style={{ display: "grid", gap: 10 }}>
              <p style={{ margin: 0, fontSize: 14, color: "var(--sepia-light)" }}>
                Accedi per salvare i tuoi dati nel cloud
              </p>
              <button
                onClick={() => setShowAuthModal(true)}
                className="btn-terra"
                style={{ justifyContent: "center", width: "100%", transition: "all 0.15s" }}
              >
                Accedi / Registrati
              </button>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              <p style={{ margin: 0, fontSize: 14, color: "var(--sepia)", fontWeight: 600 }}>
                {user.email}
              </p>
              <button
                onClick={() => sbClient?.auth.signOut()}
                className="btn-outline"
                style={{ justifyContent: "center", width: "100%", fontSize: 14, transition: "all 0.15s" }}
              >
                Esci
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Auth modal on top */}
      {showAuthModal && (
        <AuthModalInline
          onClose={() => {
            setShowAuthModal(false);
            if (user && sbClient) migrateFromLocalStorage(sbClient, user.id);
          }}
          client={sbClient}
        />
      )}
    </>
  );
}

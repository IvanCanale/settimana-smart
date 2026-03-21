"use client";
import React, { useState, useEffect } from "react";
import { Heart } from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";

interface NewRecipe {
  id: string;
  title: string;
  diet: string[];
  tags: string[];
  time: number;
  difficulty: string;
  servings: number;
  ingredients: { name: string; qty: number; unit: string; category: string }[];
  steps: string[];
  source_url: string;
  added_by: string;
  created_at: string;
}

interface NuoveRicettePageProps {
  sbClient: SupabaseClient | null;
  wishlistedIds: string[];
  onToggleWishlist: (recipe: NewRecipe) => void;
  onBack: () => void;
  maxTime: number;
}


function WishlistButton({
  recipeId,
  isWishlisted,
  onToggle,
}: {
  recipeId: string;
  isWishlisted: boolean;
  onToggle: () => void;
}) {
  const [showConfirm, setShowConfirm] = useState(false);

  const handleClick = () => {
    onToggle();
    if (!isWishlisted) {
      setShowConfirm(true);
      setTimeout(() => setShowConfirm(false), 2000);
    }
  };

  if (showConfirm) {
    return (
      <div
        style={{
          width: 44,
          height: 44,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span style={{ fontSize: 13, color: "var(--olive)", fontWeight: 400 }}>Aggiunto!</span>
      </div>
    );
  }

  return (
    <button
      onClick={handleClick}
      aria-label={isWishlisted ? "Rimuovi dalla wishlist" : "Aggiungi alla wishlist"}
      aria-pressed={isWishlisted}
      style={{
        width: 44,
        height: 44,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: isWishlisted ? "rgba(196,103,58,0.08)" : "transparent",
        border: "none",
        borderRadius: "50%",
        cursor: "pointer",
        transition: "all 0.15s",
        flexShrink: 0,
      }}
    >
      <Heart
        size={22}
        color={isWishlisted ? "var(--terra)" : "var(--sepia-light)"}
        fill={isWishlisted ? "var(--terra)" : "none"}
      />
    </button>
  );
}

export function NuoveRicettePage({ sbClient, wishlistedIds, onToggleWishlist, onBack, maxTime }: NuoveRicettePageProps) {
  const [newRecipes, setNewRecipes] = useState<NewRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!sbClient) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(false);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sbClient
      .from("recipes")
      .select("id, title, diet, tags, time, difficulty, servings, ingredients, steps, source_url, added_by, created_at")
      .gte("created_at", sevenDaysAgo.toISOString())
      .eq("added_by", "ai_job")
      .order("created_at", { ascending: false })
      .then(({ data, error: fetchError }) => {
        if (fetchError) {
          setError(true);
        } else if (data) {
          setNewRecipes(data as NewRecipe[]);
        }
        setLoading(false);
      });
  }, [sbClient, retryCount]);

  return (
    <div className="animate-in" style={{ paddingBottom: 40 }}>
      {/* Page header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
        <button
          onClick={onBack}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: 20,
            color: "var(--sepia-light)",
            padding: "4px 8px",
            display: "flex",
            alignItems: "center",
          }}
          aria-label="Torna al planner"
        >
          ←
        </button>
        <h1
          className="font-display"
          style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "var(--sepia)" }}
        >
          Ricette della settimana
        </h1>
      </div>
      {!loading && !error && (
        <p style={{ margin: "0 0 24px", fontSize: 14, fontWeight: 400, color: "var(--sepia-light)" }}>
          {newRecipes.length} ricett{newRecipes.length === 1 ? "a" : "e"} aggiunt{newRecipes.length === 1 ? "a" : "e"} negli ultimi 7 giorni
        </p>
      )}

      {/* Loading state */}
      {loading && (
        <div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 16,
              marginBottom: 12,
            }}
          >
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="recipe-card"
                style={{
                  height: 120,
                  background: "var(--cream-dark)",
                  animation: "pulse 1.4s ease infinite",
                }}
              />
            ))}
          </div>
          <p style={{ textAlign: "center", fontSize: 13, fontWeight: 400, color: "var(--sepia-light)" }}>
            Caricamento ricette...
          </p>
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div style={{ textAlign: "center", padding: "32px 0" }}>
          <p style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 400, color: "var(--sepia-light)" }}>
            Impossibile caricare le ricette. Controlla la connessione e riprova.
          </p>
          <button
            onClick={() => setRetryCount((c) => c + 1)}
            className="btn-outline"
            style={{ fontSize: 14 }}
          >
            Riprova il caricamento
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && newRecipes.length === 0 && (
        <div style={{ textAlign: "center", padding: "32px 0" }}>
          <p style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 700, color: "var(--sepia)" }}>
            Nessuna ricetta nuova questa settimana
          </p>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 400, color: "var(--sepia-light)" }}>
            Il catalogo viene arricchito ogni lunedì. Torna presto!
          </p>
        </div>
      )}

      {/* Recipe grid */}
      {!loading && !error && newRecipes.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 16,
          }}
        >
          {newRecipes.map((recipe) => {
            const isWishlisted = wishlistedIds.includes(recipe.id);
            return (
              <div key={recipe.id} className="recipe-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <p
                    style={{
                      margin: "0 0 8px",
                      fontSize: 16,
                      fontWeight: 700,
                      color: "var(--sepia)",
                      lineHeight: 1.4,
                      flex: 1,
                    }}
                  >
                    {recipe.title}
                  </p>
                  <WishlistButton
                    recipeId={recipe.id}
                    isWishlisted={isWishlisted}
                    onToggle={() => onToggleWishlist(recipe)}
                  />
                </div>

                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8, alignItems: "center" }}>
                  {recipe.diet && recipe.diet[0] && (
                    <span className="tag-pill">{recipe.diet[0]}</span>
                  )}
                  <span className="badge-time">{recipe.time} min</span>
                  {recipe.time > maxTime && (
                    <span style={{ fontSize: 11, fontWeight: 600, color: "var(--terra)", background: "rgba(196,103,58,0.1)", borderRadius: 6, padding: "2px 7px" }}>
                      ⚠ supera i tuoi {maxTime} min
                    </span>
                  )}
                </div>

                <p style={{ margin: 0, fontSize: 12, fontWeight: 400, color: "var(--sepia-light)", fontStyle: "italic" }}>
                  {isWishlisted ? "✓ Nel prossimo piano" : "♡ Tocca il cuore per aggiungerla al prossimo piano"}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

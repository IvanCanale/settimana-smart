"use client";
import React, { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/AuthProvider";
import { createCheckoutSession } from "@/actions/stripeActions";

const PLANS = [
  {
    id: "free",
    name: "Prova Gratuita",
    price: "Gratis",
    period: "14 giorni",
    features: [
      "Tutto incluso per 14 giorni",
      "Nessuna carta di credito richiesta",
      "Piano settimanale completo",
      "Tutte le ricette incluse AI",
      "Rigenera illimitato",
      "Persone illimitate",
    ],
    cta: "Inizia la prova gratuita",
    highlight: false,
  },
  {
    id: "base",
    name: "Piano Base",
    price: "\u20ac4,99",
    period: "/mese",
    features: [
      "1 persona",
      "Max 2 rigenerazioni al giorno",
      "Rigenera su 3 giorni a settimana",
      "100 ricette (no AI)",
      "Piano settimanale completo",
      "Lista della spesa",
    ],
    cta: "Abbonati al Piano Base",
    highlight: false,
  },
  {
    id: "pro",
    name: "Piano Pro",
    price: "\u20ac7,99",
    period: "/mese",
    features: [
      "Persone illimitate",
      "Rigenera illimitato tutti i giorni",
      "Tutte le ricette incluse AI",
      "Piano settimanale completo",
      "Lista della spesa",
      "Supporto prioritario",
    ],
    cta: "Abbonati al Piano Pro",
    highlight: true,
  },
];

function StatusBanner() {
  const searchParams = useSearchParams();
  const success = searchParams.get("success");
  const canceled = searchParams.get("canceled");

  if (success === "1") {
    return (
      <p
        style={{
          color: "var(--olive-dark, #3d4f2f)",
          background: "rgba(107,124,69,0.1)",
          border: "1px solid var(--olive, #6b7c45)",
          borderRadius: 8,
          padding: "12px 16px",
          textAlign: "center",
          marginBottom: 20,
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        Abbonamento attivato con successo! Benvenuto.
      </p>
    );
  }
  if (canceled === "1") {
    return (
      <p
        style={{
          color: "var(--sepia-light, #8b7d6b)",
          background: "var(--cream, #faf8f0)",
          border: "1px solid var(--sepia-border, #d4c5a9)",
          borderRadius: 8,
          padding: "12px 16px",
          textAlign: "center",
          marginBottom: 20,
          fontSize: 14,
        }}
      >
        Pagamento annullato. Puoi riprovare quando vuoi.
      </p>
    );
  }
  return null;
}

function PricingCardsInner() {
  const { user } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubscribe = async (planId: string) => {
    if (!user) {
      setError(
        "Devi accedere per abbonarti. Vai al profilo per fare login.",
      );
      return;
    }

    setLoading(planId);
    setError(null);
    try {
      await createCheckoutSession(
        user.id,
        user.email!,
        planId === "base" ? "base" : "pro",
      );
    } catch {
      setError("Errore durante la creazione della sessione di pagamento.");
      setLoading(null);
    }
  };

  return (
    <>
      <StatusBanner />
      {error && (
        <p
          style={{
            color: "var(--terra, #c0392b)",
            textAlign: "center",
            marginBottom: 16,
            fontSize: 14,
          }}
        >
          {error}
        </p>
      )}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 20,
        }}
      >
        {PLANS.map((plan) => (
          <div
            key={plan.id}
            style={{
              border: plan.highlight
                ? "2px solid var(--olive, #6b7c45)"
                : "1px solid var(--sepia-border, #d4c5a9)",
              borderRadius: 12,
              padding: 24,
              background: plan.highlight
                ? "var(--cream-light, #faf8f0)"
                : "white",
              position: "relative",
            }}
          >
            {plan.highlight && (
              <span
                style={{
                  position: "absolute",
                  top: -12,
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: "var(--olive, #6b7c45)",
                  color: "white",
                  padding: "2px 12px",
                  borderRadius: 12,
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                Consigliato
              </span>
            )}
            <h3
              style={{
                fontSize: 20,
                marginBottom: 4,
                marginTop: 0,
                color: "var(--olive-dark, #3d4f2f)",
              }}
            >
              {plan.name}
            </h3>
            <p style={{ fontSize: 28, fontWeight: 700, margin: "8px 0" }}>
              {plan.price}
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 400,
                  color: "var(--sepia-light, #8b7d6b)",
                }}
              >
                {plan.period}
              </span>
            </p>
            <ul style={{ listStyle: "none", padding: 0, margin: "16px 0" }}>
              {plan.features.map((f, i) => (
                <li
                  key={i}
                  style={{
                    fontSize: 14,
                    padding: "4px 0",
                    color: "var(--sepia, #5c4f3d)",
                  }}
                >
                  {"\u2713"} {f}
                </li>
              ))}
            </ul>
            {plan.id === "free" ? (
              <p
                style={{
                  fontSize: 13,
                  color: "var(--sepia-light, #8b7d6b)",
                  textAlign: "center",
                  marginTop: 16,
                  marginBottom: 0,
                }}
              >
                Attivo per tutti i nuovi utenti
              </p>
            ) : (
              <button
                className="btn-primary"
                style={{ width: "100%", marginTop: 8 }}
                disabled={loading === plan.id}
                onClick={() => handleSubscribe(plan.id)}
              >
                {loading === plan.id ? "Caricamento..." : plan.cta}
              </button>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

export function PricingCards() {
  return (
    <Suspense fallback={null}>
      <PricingCardsInner />
    </Suspense>
  );
}

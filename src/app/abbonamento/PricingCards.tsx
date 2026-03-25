"use client";
import React, { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/AuthProvider";
import { createCheckoutSession } from "@/actions/stripeActions";

const PLANS = [
  {
    id: "base",
    name: "Piano Base",
    price: "€2,99",
    period: "/mese",
    features: [
      "Piano settimanale completo",
      "Accesso a 200 ricette italiane",
      "Fino a 2 persone",
      "2 rigenerazioni al giorno",
      "Lista della spesa",
      "Sync cloud multi-dispositivo",
    ],
    cta: "Abbonati al Piano Base",
    highlight: false,
  },
  {
    id: "pro",
    name: "Piano Pro",
    price: "€5,99",
    period: "/mese",
    features: [
      "Tutto del Base",
      "20 nuove ricette ogni settimana",
      "Persone illimitate",
      "Rigenerazioni illimitate",
      "Suggerimenti congelamento",
      "Notifiche nuove ricette",
      "Filtri dieta avanzati",
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

function TrialBanner({ createdAt }: { createdAt: string | undefined }) {
  if (!createdAt) return null;
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysSince = Math.floor((Date.now() - new Date(createdAt).getTime()) / msPerDay);
  const daysLeft = Math.max(0, 14 - daysSince);
  if (daysLeft === 0) return null;
  const pct = Math.round(((14 - daysLeft) / 14) * 100);

  return (
    <div style={{
      background: "linear-gradient(135deg, var(--terra, #C4673A) 0%, #a0522d 100%)",
      borderRadius: 12, padding: "20px 24px", marginBottom: 28, color: "white",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 2 }}>Prova gratuita in corso</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>
            {daysLeft === 1 ? "Ultimo giorno!" : `${daysLeft} giorni rimasti`}
          </div>
        </div>
        <div style={{ textAlign: "right", fontSize: 13, opacity: 0.85 }}>
          <div>Iniziata il</div>
          <div style={{ fontWeight: 600 }}>
            {new Date(createdAt).toLocaleDateString("it-IT", { day: "numeric", month: "long" })}
          </div>
        </div>
      </div>
      <div style={{ background: "rgba(255,255,255,0.25)", borderRadius: 99, height: 6, overflow: "hidden" }}>
        <div style={{ background: "white", width: `${pct}%`, height: "100%", borderRadius: 99, transition: "width 0.4s" }} />
      </div>
      <div style={{ fontSize: 12, opacity: 0.8, marginTop: 8 }}>
        Scegli un piano prima della scadenza per non perdere i tuoi dati
      </div>
    </div>
  );
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
      <TrialBanner createdAt={user?.created_at} />
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
        {PLANS.filter(p => p.id !== "free").map((plan) => (
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

"use client";
import React, { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/AuthProvider";
import { createCheckoutSession } from "@/actions/stripeActions";

const PLANS = [
  {
    id: "base",
    name: "Piano Base",
    monthly: { price: 2.99, label: "€2,99", perDay: "€0,10" },
    annual:  { price: 29.99, label: "€29,99", perMonth: "€2,50", perDay: "€0,08", saving: "2 mesi gratis" },
    features: [
      { text: "Piano settimanale completo", highlight: false },
      { text: "200 ricette italiane", highlight: false },
      { text: "Fino a 2 persone", highlight: false },
      { text: "2 rigenerazioni al giorno", highlight: false },
      { text: "Lista della spesa", highlight: false },
      { text: "Sync cloud multi-dispositivo", highlight: false },
    ],
    cta: "Abbonati al Base",
    highlight: false,
  },
  {
    id: "pro",
    name: "Piano Pro",
    monthly: { price: 5.99, label: "€5,99", perDay: "€0,20" },
    annual:  { price: 59.99, label: "€59,99", perMonth: "€5,00", perDay: "€0,16", saving: "2 mesi gratis" },
    features: [
      { text: "20 nuove ricette ogni settimana", highlight: true },
      { text: "Persone illimitate", highlight: true },
      { text: "Rigenerazioni illimitate", highlight: true },
      { text: "Tutto del Piano Base", highlight: false },
      { text: "Suggerimenti congelamento", highlight: false },
      { text: "Notifiche nuove ricette", highlight: false },
      { text: "Supporto prioritario", highlight: false },
    ],
    cta: "Abbonati al Pro",
    highlight: true,
  },
];

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

function StatusBanner() {
  const searchParams = useSearchParams();
  const success = searchParams.get("success");
  const canceled = searchParams.get("canceled");
  if (success === "1") return (
    <p style={{ color: "var(--olive-dark, #3d4f2f)", background: "rgba(107,124,69,0.1)", border: "1px solid var(--olive, #6b7c45)", borderRadius: 8, padding: "12px 16px", textAlign: "center", marginBottom: 20, fontSize: 14, fontWeight: 600 }}>
      Abbonamento attivato con successo! Benvenuto.
    </p>
  );
  if (canceled === "1") return (
    <p style={{ color: "var(--sepia-light, #8b7d6b)", background: "var(--cream, #faf8f0)", border: "1px solid var(--sepia-border, #d4c5a9)", borderRadius: 8, padding: "12px 16px", textAlign: "center", marginBottom: 20, fontSize: 14 }}>
      Pagamento annullato. Puoi riprovare quando vuoi.
    </p>
  );
  return null;
}

function PricingCardsInner() {
  const { user, sbClient } = useAuth();
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubscribe = async (planId: string) => {
    if (!user || !sbClient) {
      // Salva il piano scelto e rimanda al login
      sessionStorage.setItem("pending_plan", planId);
      sessionStorage.setItem("pending_billing", billing);
      window.location.href = "/?login=1";
      return;
    }
    setLoading(planId); setError(null);
    const { data: { session } } = await sbClient.auth.getSession();
    if (!session?.access_token) { setError("Sessione scaduta, riaccedi."); setLoading(null); return; }
    const result = await createCheckoutSession(session.access_token, planId === "base" ? "base" : "pro", billing);
    if (result.error) {
      setError(`Errore: ${result.error}`);
      setLoading(null);
      return;
    }
    window.location.href = result.url!;
  };

  return (
    <>
      <TrialBanner createdAt={user?.created_at} />
      <StatusBanner />

      {/* Toggle mensile/annuale */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 28 }}>
        <div style={{ display: "inline-flex", background: "var(--cream, #faf8f0)", borderRadius: 99, padding: 4, border: "1px solid var(--sepia-border, #d4c5a9)" }}>
          {(["monthly", "annual"] as const).map((b) => (
            <button key={b} onClick={() => setBilling(b)} style={{
              padding: "8px 20px", borderRadius: 99, border: "none", cursor: "pointer", fontSize: 14, fontWeight: 600, transition: "all 0.2s",
              background: billing === b ? "var(--terra, #C4673A)" : "transparent",
              color: billing === b ? "white" : "var(--sepia, #5c4f3d)",
            }}>
              {b === "monthly" ? "Mensile" : "Annuale"}
              {b === "annual" && <span style={{ marginLeft: 6, fontSize: 11, background: "rgba(107,124,69,0.2)", color: "var(--olive-dark, #3d4f2f)", padding: "2px 6px", borderRadius: 99, fontWeight: 700 }}>-17%</span>}
            </button>
          ))}
        </div>
      </div>

      {error && <p style={{ color: "var(--terra, #c0392b)", textAlign: "center", marginBottom: 16, fontSize: 14 }}>{error}</p>}

      <style>{`
        @keyframes fadePrice { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
        .price-animate { animation: fadePrice 0.22s ease; }
        .plan-card { transition: box-shadow 0.2s, transform 0.2s; }
        .plan-card:hover { box-shadow: 0 8px 32px rgba(61,43,31,0.12); transform: translateY(-2px); }
        .cta-base { width: 100%; padding: 14px; border-radius: 10px; font-size: 15px; font-weight: 600; cursor: pointer; border: 2px solid var(--sepia-border, #d4c5a9); background: white; color: var(--sepia, #5c4f3d); transition: all 0.18s; }
        .cta-base:hover:not(:disabled) { border-color: var(--terra, #C4673A); color: var(--terra, #C4673A); background: rgba(196,103,58,0.05); }
        .cta-pro { width: 100%; padding: 14px; border-radius: 10px; font-size: 15px; font-weight: 700; cursor: pointer; border: none; background: var(--olive, #6b7c45); color: white; transition: all 0.18s; box-shadow: 0 4px 12px rgba(107,124,69,0.3); }
        .cta-pro:hover:not(:disabled) { background: var(--olive-dark, #3d4f2f); box-shadow: 0 6px 18px rgba(107,124,69,0.4); }
        .cta-base:disabled, .cta-pro:disabled { opacity: 0.6; cursor: not-allowed; }
      `}</style>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
        {PLANS.map((plan) => {
          const pricing = billing === "annual" ? plan.annual : plan.monthly;
          return (
            <div key={plan.id} className="plan-card" style={{
              border: plan.highlight ? "2px solid var(--olive, #6b7c45)" : "1px solid var(--sepia-border, #d4c5a9)",
              borderRadius: 16, padding: 28, background: "white", position: "relative",
            }}>
              {plan.highlight && (
                <span style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: "var(--olive, #6b7c45)", color: "white", padding: "3px 14px", borderRadius: 99, fontSize: 12, fontWeight: 700 }}>
                  Consigliato
                </span>
              )}

              <h3 style={{ fontSize: 18, marginBottom: 12, marginTop: 0, color: "var(--sepia, #5c4f3d)", fontWeight: 600 }}>{plan.name}</h3>

              {/* Prezzo animato */}
              <div key={`${plan.id}-${billing}`} className="price-animate">
                <div style={{ marginBottom: 4 }}>
                  <span style={{ fontSize: 36, fontWeight: 800, color: "var(--olive-dark, #3d4f2f)" }}>{pricing.label}</span>
                  <span style={{ fontSize: 14, color: "var(--sepia-light, #8b7d6b)", marginLeft: 4 }}>
                    {billing === "annual" ? "/anno" : "/mese"}
                  </span>
                </div>
                {billing === "annual" && "perMonth" in pricing && (
                  <div style={{ fontSize: 13, color: "var(--sepia-light, #8b7d6b)", marginBottom: 4 }}>
                    {(pricing as { perMonth: string }).perMonth}/mese · <span style={{ color: "var(--olive, #6b7c45)", fontWeight: 600 }}>{plan.annual.saving}</span>
                  </div>
                )}
                <div style={{ fontSize: 12, color: "var(--sepia-light, #8b7d6b)", marginBottom: 20 }}>
                  {pricing.perDay} al giorno
                </div>
              </div>

              <div style={{ height: 1, background: "var(--sepia-border, #d4c5a9)", marginBottom: 20 }} />

              {/* Features */}
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px" }}>
                {plan.features.map((f, i) => (
                  <li key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", fontSize: 14, color: "var(--sepia, #5c4f3d)", fontWeight: f.highlight ? 700 : 400 }}>
                    <span style={{ color: "var(--olive, #6b7c45)", fontWeight: 700, fontSize: 15 }}>✓</span>
                    {f.text}
                  </li>
                ))}
              </ul>

              <button
                className={plan.highlight ? "cta-pro" : "cta-base"}
                disabled={loading === plan.id}
                onClick={() => handleSubscribe(plan.id)}
              >
                {loading === plan.id ? "⏳ Caricamento..." : !user ? "Accedi per abbonarti →" : plan.cta + " →"}
              </button>
            </div>
          );
        })}
      </div>

      <p style={{ textAlign: "center", fontSize: 13, color: "var(--sepia-light, #8b7d6b)", marginTop: 24 }}>
        Annulla quando vuoi · Nessun addebito durante i 14 giorni
      </p>
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

import { PricingCards } from "./PricingCards";

export const metadata = {
  title: "Abbonamento | Menumix",
  description: "Scegli il piano giusto per te",
};

export default function AbbonamentoPage() {
  return (
    <main
      className="bg-texture"
      style={{ minHeight: "100vh", padding: "40px 16px 60px" }}
    >
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <a
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            color: "var(--sepia-light)",
            fontSize: 14,
            textDecoration: "none",
            marginBottom: 32,
          }}
        >
          ← Torna all&apos;app
        </a>
        <h1
          style={{
            textAlign: "center",
            fontSize: 28,
            marginBottom: 8,
            marginTop: 0,
            color: "var(--olive-dark, #3d4f2f)",
            fontFamily: "'Playfair Display', serif",
          }}
        >
          Scegli il tuo piano
        </h1>
        <p
          style={{
            textAlign: "center",
            color: "var(--sepia-light, #8b7d6b)",
            marginBottom: 32,
            fontSize: 15,
          }}
        >
          Inizia con 14 giorni gratuiti, poi scegli il piano che fa per te.
        </p>
        <PricingCards />
      </div>
    </main>
  );
}

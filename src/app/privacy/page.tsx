function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 32 }}>
      <h2 className="font-display" style={{ fontSize: 20, color: "var(--sepia)", marginBottom: 12, marginTop: 0 }}>
        {title}
      </h2>
      <div style={{ color: "var(--sepia-light)", fontSize: 15, lineHeight: 1.7 }}>
        {children}
      </div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <div className="bg-texture" style={{ minHeight: "100vh", padding: "20px 20px 60px" }}>
      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        <a href="/" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--sepia-light)", fontSize: 14, textDecoration: "none", marginBottom: 32, marginTop: 20 }}>
          ← Torna all&apos;app
        </a>
        <div className="card-warm" style={{ padding: "clamp(24px, 6vw, 48px)" }}>
          <h1 className="font-display" style={{ fontSize: "clamp(24px, 5vw, 36px)", color: "var(--sepia)", marginBottom: 8, marginTop: 0 }}>
            Privacy Policy
          </h1>
          <p style={{ color: "var(--sepia-light)", fontSize: 14, marginBottom: 40, marginTop: 0 }}>
            Ultimo aggiornamento: marzo 2026
          </p>

          <Section title="Titolare del trattamento">
            <p>
              Settimana Smart è un servizio offerto da un privato. Per qualsiasi questione relativa ai tuoi dati, contattaci a:{" "}
              <a href="mailto:privacy@settimana-smart.app" style={{ color: "var(--terra)" }}>
                privacy@settimana-smart.app
              </a>
            </p>
          </Section>

          <Section title="Dati raccolti">
            <p>Raccogliamo i seguenti dati per fornirti il servizio:</p>
            <ul style={{ paddingLeft: 20, margin: "8px 0" }}>
              <li style={{ marginBottom: 6 }}>Preferenze alimentari</li>
              <li style={{ marginBottom: 6 }}>Piani pasto settimanali</li>
              <li style={{ marginBottom: 6 }}>Abbonamenti notifiche push</li>
              <li style={{ marginBottom: 6 }}>Indirizzo email se crei un account</li>
            </ul>
            <p>Nessun dato viene venduto a terze parti.</p>
          </Section>

          <Section title="Come utilizziamo i dati">
            <p>I tuoi dati vengono utilizzati esclusivamente per:</p>
            <ul style={{ paddingLeft: 20, margin: "8px 0" }}>
              <li style={{ marginBottom: 6 }}>Generare piani pasto personalizzati</li>
              <li style={{ marginBottom: 6 }}>Sincronizzare i tuoi piani tra dispositivi</li>
              <li style={{ marginBottom: 6 }}>Inviare notifiche push (solo con il tuo consenso esplicito)</li>
            </ul>
          </Section>

          <Section title="Fornitore di servizi (sub-responsabile)">
            <p>
              Utilizziamo{" "}
              <a href="https://supabase.com" style={{ color: "var(--terra)" }}>
                Supabase (supabase.com)
              </a>{" "}
              come fornitore di database e autenticazione. I dati sono conservati in Europa. Supabase agisce come responsabile del trattamento ai sensi del GDPR.
            </p>
          </Section>

          <Section title="Conservazione dei dati">
            <p>
              I tuoi dati vengono conservati finché il tuo account è attivo. Puoi richiedere la cancellazione tramite{" "}
              <strong>Profilo &gt; Elimina account</strong>. Tutti i dati vengono eliminati entro 30 giorni dalla richiesta.
            </p>
          </Section>

          <Section title="I tuoi diritti">
            <p>Ai sensi del GDPR, hai il diritto di:</p>
            <ul style={{ paddingLeft: 20, margin: "8px 0" }}>
              <li style={{ marginBottom: 6 }}>
                <strong>Accedere ai tuoi dati</strong> — tramite la funzione &quot;Esporta i miei dati&quot; nelle impostazioni
              </li>
              <li style={{ marginBottom: 6 }}>
                <strong>Cancellare i tuoi dati</strong> — tramite &quot;Elimina account&quot; nel tuo profilo
              </li>
              <li style={{ marginBottom: 6 }}>
                <strong>Opporti al trattamento</strong> — contattaci a{" "}
                <a href="mailto:privacy@settimana-smart.app" style={{ color: "var(--terra)" }}>
                  privacy@settimana-smart.app
                </a>
              </li>
            </ul>
          </Section>

          <Section title="Cookie e archiviazione locale">
            <p>
              Utilizziamo il <strong>localStorage</strong> del browser per salvare le tue preferenze localmente. Non utilizziamo cookie di profilazione né tracker di terze parti.
            </p>
          </Section>

          <Section title="Contatti">
            <p>
              Per qualsiasi domanda sulla privacy, scrivi a:{" "}
              <a href="mailto:privacy@settimana-smart.app" style={{ color: "var(--terra)" }}>
                privacy@settimana-smart.app
              </a>
            </p>
          </Section>
        </div>
      </div>
    </div>
  );
}

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

export default function TermsPage() {
  return (
    <div className="bg-texture" style={{ minHeight: "100vh", padding: "20px 20px 60px" }}>
      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        <a href="/" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--sepia-light)", fontSize: 14, textDecoration: "none", marginBottom: 32, marginTop: 20 }}>
          ← Torna all&apos;app
        </a>
        <div className="card-warm" style={{ padding: "clamp(24px, 6vw, 48px)" }}>
          <h1 className="font-display" style={{ fontSize: "clamp(24px, 5vw, 36px)", color: "var(--sepia)", marginBottom: 8, marginTop: 0 }}>
            Termini di Servizio
          </h1>
          <p style={{ color: "var(--sepia-light)", fontSize: 14, marginBottom: 40, marginTop: 0 }}>
            Ultimo aggiornamento: marzo 2026
          </p>

          <Section title="Il Servizio">
            <p>
              Menumix è un&apos;app web per la pianificazione dei pasti settimanali. Il servizio genera piani pasto personalizzati, liste della spesa e ricette in base alle tue preferenze alimentari.
            </p>
          </Section>

          <Section title="Utilizzo del Servizio">
            <p>Utilizzando Menumix, accetti di:</p>
            <ul style={{ paddingLeft: 20, margin: "8px 0" }}>
              <li style={{ marginBottom: 6 }}>Usare il servizio solo per scopi personali e non commerciali</li>
              <li style={{ marginBottom: 6 }}>Non tentare di accedere ai sistemi interni o all&apos;infrastruttura del servizio</li>
              <li style={{ marginBottom: 6 }}>Non utilizzare il servizio per generare contenuti illegali o dannosi</li>
            </ul>
          </Section>

          <Section title="Account">
            <p>
              La creazione di un account è opzionale. Se scegli di registrarti, sei responsabile della sicurezza delle tue credenziali di accesso. Non condividere le tue credenziali con terze parti.
            </p>
          </Section>

          <Section title="Contenuti generati dall'IA">
            <p>
              Le ricette e i piani pasto sono generati da algoritmi e intelligenza artificiale. Non forniamo alcuna garanzia sull&apos;accuratezza nutrizionale dei contenuti generati. Per esigenze alimentari specifiche o condizioni mediche, consulta sempre un professionista della salute qualificato.
            </p>
          </Section>

          <Section title="Limitazione di Responsabilità">
            <p>
              Il servizio è fornito &quot;così com&apos;è&quot;, senza garanzie di alcun tipo. Non siamo responsabili per:
            </p>
            <ul style={{ paddingLeft: 20, margin: "8px 0" }}>
              <li style={{ marginBottom: 6 }}>Interruzioni o malfunzionamenti del servizio</li>
              <li style={{ marginBottom: 6 }}>Decisioni prese dall&apos;utente basate sui piani generati</li>
              <li style={{ marginBottom: 6 }}>Errori negli ingredienti o nelle ricette generate</li>
            </ul>
          </Section>

          <Section title="Modifiche al Servizio">
            <p>
              Ci riserviamo il diritto di modificare, sospendere o interrompere il servizio in qualsiasi momento, con o senza preavviso. Ci impegniamo a comunicare eventuali modifiche significative con ragionevole anticipo.
            </p>
          </Section>

          <Section title="Legge Applicabile">
            <p>
              I presenti termini sono regolati dalla legge italiana. Per qualsiasi controversia relativa all&apos;utilizzo del servizio, è competente il foro di residenza dell&apos;utente.
            </p>
          </Section>

          <Section title="Contatti">
            <p>
              Per qualsiasi domanda sui presenti termini, scrivi a:{" "}
              <a href="mailto:privacy@menumix.app" style={{ color: "var(--terra)" }}>
                privacy@menumix.app
              </a>
            </p>
          </Section>
        </div>
      </div>
    </div>
  );
}

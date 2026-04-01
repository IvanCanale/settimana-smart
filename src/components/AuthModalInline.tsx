"use client";
import React from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

export function AuthModalInline({ onClose, client, forced = false, initialMode = "login" }: { onClose: () => void; client: SupabaseClient | null; forced?: boolean; initialMode?: "login" | "signup" | "forgot" | "reset" }) {
  const [mode, setMode] = React.useState<"login" | "signup" | "forgot" | "reset">(initialMode);
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState("");

  // Se l'utente arriva dal link di reset password (token in URL hash)
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    if (hash.includes("type=recovery") || hash.includes("access_token")) {
      setMode("reset");
    }
  }, []);

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(""); setSuccess("");
    try {
      if (!client) throw new Error("Client non disponibile");
      if (mode === "login") {
        const { error } = await client.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onClose();
      } else if (mode === "signup") {
        const { error } = await client.auth.signUp({ email, password });
        if (error) throw error;
        setSuccess("Controlla la tua email per confermare l'account.");
      } else if (mode === "forgot") {
        const { error } = await client.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setSuccess("Link inviato! Controlla la tua email.");
      } else if (mode === "reset") {
        if (newPassword.length < 6) throw new Error("La password deve essere di almeno 6 caratteri.");
        const { error } = await client.auth.updateUser({ password: newPassword });
        if (error) throw error;
        setSuccess("Password aggiornata!");
        window.history.replaceState({}, "", "/");
        setTimeout(() => { onClose(); }, 1500);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Errore. Riprova.");
    } finally { setLoading(false); }
  }

  function switchMode(next: "login" | "signup" | "forgot") {
    setMode(next); setError(""); setSuccess("");
  }

  const title =
    mode === "login" ? (forced ? "Benvenuto su Menumix" : "Accedi") :
    mode === "signup" ? "Crea account" :
    mode === "forgot" ? "Recupera password" :
    "Nuova password";

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, background: forced ? "var(--warm-white)" : "rgba(61,43,31,0.6)", backdropFilter: forced ? "none" : "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "var(--warm-white)", borderRadius: forced ? 0 : 24, padding: 32, width: "100%", maxWidth: forced ? 440 : 400, boxShadow: forced ? "none" : "0 24px 60px rgba(61,43,31,0.25)" }}>
        {forced && (
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <img src="/menumix-icon-192.png" alt="Menumix" style={{ width: 72, height: 72, borderRadius: 18, marginBottom: 12 }} />
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontFamily: "'Playfair Display', serif", fontSize: 22, color: "var(--sepia)" }}>
            {title}
          </h2>
          {!forced && <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "var(--sepia-light)" }}>×</button>}
        </div>

        {/* Bottoni OAuth — solo in login/signup */}
        {(mode === "login" || mode === "signup") && (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
              <button onClick={() => client?.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin } })}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "12px 20px", borderRadius: 12, border: "1.5px solid var(--cream-dark)", background: "white", cursor: "pointer", fontSize: 15, fontWeight: 600, color: "var(--sepia)" }}>
                <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                Continua con Google
              </button>
              <button onClick={() => client?.auth.signInWithOAuth({ provider: "apple", options: { redirectTo: window.location.origin } })}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "12px 20px", borderRadius: 12, border: "none", background: "#000", cursor: "pointer", fontSize: 15, fontWeight: 600, color: "white" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.7 9.05 7.07c1.17.06 2.01.6 2.74.63.98-.18 1.94-.76 2.95-.73 1.28.07 2.25.65 2.9 1.65-2.53 1.54-1.84 4.93.6 5.93-.54 1.48-1.22 2.92-2.19 3.73zM12.03 7c-.12-2.16 1.74-3.96 3.73-4C15.94 5.11 14 7.11 12.03 7z"/></svg>
                Continua con Apple
              </button>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
              <div style={{ flex: 1, height: 1, background: "var(--cream-dark)" }} /><span style={{ fontSize: 13, color: "var(--sepia-light)" }}>oppure</span><div style={{ flex: 1, height: 1, background: "var(--cream-dark)" }} />
            </div>
          </>
        )}

        {/* Form */}
        <form onSubmit={handleEmail} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {mode === "reset" ? (
            <input type="password" placeholder="Nuova password (min. 6 caratteri)" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={6} className="input-warm" style={{ width: "100%", boxSizing: "border-box" as const }} />
          ) : (
            <>
              <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required className="input-warm" style={{ width: "100%", boxSizing: "border-box" as const }} />
              {mode !== "forgot" && (
                <input type="password" placeholder="Password (min. 6 caratteri)" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} className="input-warm" style={{ width: "100%", boxSizing: "border-box" as const }} />
              )}
            </>
          )}

          {/* Link password dimenticata — solo in login */}
          {mode === "login" && (
            <button type="button" onClick={() => switchMode("forgot")}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--sepia-light)", fontSize: 13, textAlign: "right", padding: 0 }}>
              Password dimenticata?
            </button>
          )}

          {error   && <p style={{ margin: 0, fontSize: 13, color: "var(--terra)", fontWeight: 600 }}>{error}</p>}
          {success && <p style={{ margin: 0, fontSize: 13, color: "var(--olive)", fontWeight: 600 }}>{success}</p>}

          <button type="submit" disabled={loading} className="btn-terra" style={{ justifyContent: "center", opacity: loading ? 0.7 : 1 }}>
            {loading ? "..." :
              mode === "login" ? "Accedi" :
              mode === "signup" ? "Crea account" :
              mode === "forgot" ? "Invia link" :
              "Salva nuova password"}
          </button>
        </form>

        {/* Footer link */}
        {(mode === "login" || mode === "signup") && (
          <p style={{ margin: "16px 0 0", textAlign: "center", fontSize: 14, color: "var(--sepia-light)" }}>
            {mode === "login" ? "Non hai un account? " : "Hai già un account? "}
            <button onClick={() => switchMode(mode === "login" ? "signup" : "login")}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--terra)", fontWeight: 700, fontSize: 14 }}>
              {mode === "login" ? "Registrati" : "Accedi"}
            </button>
          </p>
        )}
        {mode === "forgot" && (
          <p style={{ margin: "16px 0 0", textAlign: "center", fontSize: 14, color: "var(--sepia-light)" }}>
            <button onClick={() => switchMode("login")}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--terra)", fontWeight: 700, fontSize: 14 }}>
              ← Torna al login
            </button>
          </p>
        )}
      </div>
    </div>
  );
}

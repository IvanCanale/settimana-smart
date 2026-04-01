"use client";
import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // La pagina è pronta — il client Supabase gestisce automaticamente
    // il token dall'hash URL quando viene inizializzato
    setReady(true);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) { setError("La password deve essere di almeno 6 caratteri."); return; }
    setLoading(true); setError("");

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const client = createClient(url, key);

    const { error } = await client.auth.updateUser({ password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    setSuccess(true);
    setTimeout(() => { window.location.href = "/"; }, 2000);
  }

  if (!ready) return null;

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "var(--warm-white)", padding: 20, fontFamily: "'DM Sans', sans-serif"
    }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <img src="/menumix-icon-192.png" alt="Menumix" style={{ width: 72, height: 72, borderRadius: 18, marginBottom: 16 }} />
          <h1 style={{ margin: 0, fontFamily: "'Playfair Display', serif", fontSize: 24, color: "var(--sepia)" }}>
            Nuova password
          </h1>
          <p style={{ margin: "8px 0 0", fontSize: 15, color: "var(--sepia-light)" }}>
            Scegli una nuova password per il tuo account
          </p>
        </div>

        {success ? (
          <div style={{ textAlign: "center", padding: 24, background: "var(--cream)", borderRadius: 16 }}>
            <p style={{ fontSize: 16, color: "var(--olive)", fontWeight: 600, margin: 0 }}>
              ✅ Password aggiornata! Reindirizzamento in corso...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <input
              type="password"
              placeholder="Nuova password (min. 6 caratteri)"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
              className="input-warm"
              style={{ width: "100%", boxSizing: "border-box" as const }}
            />
            {error && <p style={{ margin: 0, fontSize: 13, color: "var(--terra)", fontWeight: 600 }}>{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="btn-terra"
              style={{ justifyContent: "center", opacity: loading ? 0.7 : 1 }}
            >
              {loading ? "..." : "Salva nuova password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

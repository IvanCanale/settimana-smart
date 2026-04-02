"use client";
import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient, User, Session } from "@supabase/supabase-js";
import React, { createContext, useContext, useEffect, useRef, useState } from "react";

// Context per condividere il client supabase
type AuthContextType = {
  sbClient: SupabaseClient | null;
  user: User | null;
  authLoading: boolean;
  showAuthModal: boolean;
  setShowAuthModal: (v: boolean) => void;
  syncStatus: "idle" | "saving" | "saved" | "error";
  setSyncStatus: (v: "idle" | "saving" | "saved" | "error") => void;
};

export const AuthContext = createContext<AuthContextType>({
  sbClient: null, user: null, authLoading: true,
  showAuthModal: false, setShowAuthModal: () => {},
  syncStatus: "idle", setSyncStatus: () => {},
});

export function useAuth() { return useContext(AuthContext); }

const USER_KEYS = [
  "ss_preferences_v1", "ss_pantry_v1", "ss_seed_v1",
  "ss_manual_overrides_v1", "ss_checked_shopping_v1",
  "ss_rigenera_log_v1", "ss_learning_v1", "ss_onboarding_done",
  "ss_tutorial_done",
];

function clearUserStorage() {
  USER_KEYS.forEach((k) => localStorage.removeItem(k));
  ["pro", "base", "free"].forEach((t) => {
    localStorage.removeItem(`ss_recipes_cache_${t}_v1`);
    localStorage.removeItem(`ss_recipes_cache_${t}_ts_v1`);
  });
  localStorage.removeItem("ss_recipes_cache_v1");
  localStorage.removeItem("ss_recipes_cache_ts_v1");
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [sbClient, setSbClient] = useState<SupabaseClient | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"idle"|"saving"|"saved"|"error">("idle");
  // Traccia l'ultimo userId per rilevare cambio utente sullo stesso browser
  const previousUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    // Se le credenziali non sono configurate, auth rimane disabilitata
    if (!url || !key) { setAuthLoading(false); return; }

    const client = createClient(url, key);
    setSbClient(client);

    client.auth.getSession().then(({ data: { session } }: {data: {session: Session|null}}) => {
      setUser(session?.user ?? null);
      if (session?.user) previousUserIdRef.current = session.user.id;
      setAuthLoading(false);
    });

    const { data: { subscription } } = client.auth.onAuthStateChange(
      (event: string, session: Session | null) => {
        setUser(session?.user ?? null);
        setAuthLoading(false);

        if (typeof window === "undefined") return;

        if (event === "SIGNED_OUT") {
          // Pulisce tutti i dati utente al logout
          previousUserIdRef.current = null;
          clearUserStorage();
        } else if (event === "SIGNED_IN" && session?.user) {
          // Se l'utente cambia (nuovo account sullo stesso browser senza logout esplicito),
          // pulisce i dati locali del vecchio utente per evitare data leakage
          if (previousUserIdRef.current && previousUserIdRef.current !== session.user.id) {
            clearUserStorage();
          }
          previousUserIdRef.current = session.user.id;
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ sbClient, user, authLoading, showAuthModal, setShowAuthModal, syncStatus, setSyncStatus }}>
      {children}
    </AuthContext.Provider>
  );
}

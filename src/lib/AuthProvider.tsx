"use client";
import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient, User, Session } from "@supabase/supabase-js";
import React, { createContext, useContext, useEffect, useState } from "react";

// Context per condividere il client supabase
type AuthContextType = {
  sbClient: SupabaseClient | null;
  user: User | null;
  authLoading: boolean;
  isPasswordRecovery: boolean;
  setIsPasswordRecovery: (v: boolean) => void;
  showAuthModal: boolean;
  setShowAuthModal: (v: boolean) => void;
  syncStatus: "idle" | "saving" | "saved" | "error";
  setSyncStatus: (v: "idle" | "saving" | "saved" | "error") => void;
};

export const AuthContext = createContext<AuthContextType>({
  sbClient: null, user: null, authLoading: true,
  isPasswordRecovery: false, setIsPasswordRecovery: () => {},
  showAuthModal: false, setShowAuthModal: () => {},
  syncStatus: "idle", setSyncStatus: () => {},
});

export function useAuth() { return useContext(AuthContext); }

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [sbClient, setSbClient] = useState<SupabaseClient | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"idle"|"saving"|"saved"|"error">("idle");

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    // Se le credenziali non sono configurate, auth rimane disabilitata
    if (!url || !key) { setAuthLoading(false); return; }

    const client = createClient(url, key);
    setSbClient(client);

    // Controlla subito se è un redirect di recovery prima che getSession risolva
    if (typeof window !== "undefined" && window.location.hash.includes("type=recovery")) {
      setIsPasswordRecovery(true);
    }

    client.auth.getSession().then(({ data: { session } }: {data: {session: Session|null}}) => {
      // Se è recovery non fare login automatico — aspettiamo che l'utente imposti la nuova password
      if (!isPasswordRecovery && typeof window !== "undefined" && !window.location.hash.includes("type=recovery")) {
        setUser(session?.user ?? null);
      }
      setAuthLoading(false);
    });

    const { data: { subscription } } = client.auth.onAuthStateChange(
      (event: string, session: Session | null) => {
        if (event === "PASSWORD_RECOVERY") {
          setIsPasswordRecovery(true);
          setAuthLoading(false);
          return; // non fare login automatico
        }
        setUser(session?.user ?? null);
        setAuthLoading(false);
        // Clear all user-specific localStorage on signout to prevent cross-user data leakage
        // when multiple people share the same browser (e.g. family members).
        if (event === "SIGNED_OUT" && typeof window !== "undefined") {
          const USER_KEYS = [
            "ss_preferences_v1", "ss_pantry_v1", "ss_seed_v1",
            "ss_manual_overrides_v1", "ss_checked_shopping_v1",
            "ss_rigenera_log_v1", "ss_learning_v1", "ss_onboarding_done",
            "ss_tutorial_done",
          ];
          USER_KEYS.forEach((k) => localStorage.removeItem(k));
          // Clear tier-specific recipe caches
          ["pro", "base", "free"].forEach((t) => {
            localStorage.removeItem(`ss_recipes_cache_${t}_v1`);
            localStorage.removeItem(`ss_recipes_cache_${t}_ts_v1`);
          });
          // Clear legacy cache key (before tier was included in key)
          localStorage.removeItem("ss_recipes_cache_v1");
          localStorage.removeItem("ss_recipes_cache_ts_v1");
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ sbClient, user, authLoading, isPasswordRecovery, setIsPasswordRecovery, showAuthModal, setShowAuthModal, syncStatus, setSyncStatus }}>
      {children}
    </AuthContext.Provider>
  );
}

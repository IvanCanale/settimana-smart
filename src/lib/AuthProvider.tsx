"use client";
import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient, User, Session } from "@supabase/supabase-js";
import React, { createContext, useContext, useEffect, useState } from "react";

// Context per condividere il client supabase
type AuthContextType = {
  sbClient: SupabaseClient | null;
  user: User | null;
  showAuthModal: boolean;
  setShowAuthModal: (v: boolean) => void;
  syncStatus: "idle" | "saving" | "saved" | "error";
  setSyncStatus: (v: "idle" | "saving" | "saved" | "error") => void;
};

export const AuthContext = createContext<AuthContextType>({
  sbClient: null, user: null,
  showAuthModal: false, setShowAuthModal: () => {},
  syncStatus: "idle", setSyncStatus: () => {},
});

export function useAuth() { return useContext(AuthContext); }

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [sbClient, setSbClient] = useState<SupabaseClient | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"idle"|"saving"|"saved"|"error">("idle");

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    // Se le credenziali non sono configurate, auth rimane disabilitata
    if (!url || !key) return;

    const client = createClient(url, key);
    setSbClient(client);

    client.auth.getSession().then(({ data: { session } }: {data: {session: Session|null}}) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = client.auth.onAuthStateChange(
      (_event: string, session: Session | null) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ sbClient, user, showAuthModal, setShowAuthModal, syncStatus, setSyncStatus }}>
      {children}
    </AuthContext.Provider>
  );
}

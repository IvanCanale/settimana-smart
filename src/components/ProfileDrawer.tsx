"use client";
import React, { useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}
import type { Preferences, Diet, SubscriptionStatus } from "@/types";
import { ALLERGEN_OPTIONS } from "@/types";
import { useAuth } from "@/lib/AuthProvider";
import { createPortalSession } from "@/actions/stripeActions";
import { AuthModalInline } from "@/components/AuthModalInline";
import { migrateFromLocalStorage, exportUserData } from "@/lib/supabase";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import { NotificationPrompt } from "@/components/NotificationPrompt";

const DAYS_IT = [
  { value: 0, label: "Dom" },
  { value: 1, label: "Lun" },
  { value: 2, label: "Mar" },
  { value: 3, label: "Mer" },
  { value: 4, label: "Gio" },
  { value: 5, label: "Ven" },
  { value: 6, label: "Sab" },
];

interface ProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  preferences: Preferences;
  setPreferences: React.Dispatch<React.SetStateAction<Preferences>>;
  onResetAllLocalStorage?: () => void;
  defaultPrefs?: Preferences;
  subscription?: SubscriptionStatus;
}

export function ProfileDrawer({ isOpen, onClose, preferences, setPreferences, onResetAllLocalStorage, defaultPrefs, subscription }: ProfileDrawerProps) {
  const { sbClient, user } = useAuth();
  const push = usePushSubscription(user?.id ?? null, sbClient);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [planCount, setPlanCount] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isPortalLoading, setIsPortalLoading] = useState(false);
  const [showPeopleProMsg, setShowPeopleProMsg] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<Event | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  React.useEffect(() => {
    const handler = (e: Event) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setIsInstalled(true));
    if (window.matchMedia("(display-mode: standalone)").matches) setIsInstalled(true);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  React.useEffect(() => {
    if (!preferences.timezone) {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      setPreferences((p) => ({ ...p, timezone: tz }));
    }
  }, [preferences.timezone, setPreferences]);

  React.useEffect(() => {
    if (!user || !sbClient) { setPlanCount(null); return; }
    sbClient
      .from("weekly_plan")
      .select("week_iso", { count: "exact", head: true })
      .eq("user_id", user.id)
      .then(({ count }) => setPlanCount(count ?? 0));
  }, [user, sbClient]);

  const accountCreatedAt = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" })
    : null;

  const handleDeleteAccount = async () => {
    if (!sbClient || !user) return;
    setIsDeleting(true);
    try {
      const { error } = await sbClient.functions.invoke("delete-account", { method: "POST" });
      if (error) throw error;
      // signOut fires SIGNED_OUT in AuthProvider which clears localStorage automatically.
      // We call it first so the clear happens before navigation.
      await sbClient.auth.signOut();
      onClose();
    } catch (err) {
      console.error("Errore eliminazione account:", err);
      alert("Errore durante l'eliminazione dell'account. Riprova.");
    } finally {
      setIsDeleting(false);
      setConfirmDelete(false);
    }
  };

  const handleExport = async () => {
    if (!sbClient || !user) return;
    setIsExporting(true);
    try {
      const data = await exportUserData(sbClient, user.id);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `menumix-export-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Errore export dati:", err);
      alert("Errore durante l'export dei dati. Riprova.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleOpenPortal = async () => {
    if (!user || !sbClient) return;
    setIsPortalLoading(true);
    try {
      const { data: { session } } = await sbClient.auth.getSession();
      if (!session?.access_token) throw new Error("Sessione scaduta");
      await createPortalSession(session.access_token);
    } catch (err) {
      console.error("Errore apertura portale:", err);
      alert("Errore durante l'apertura del portale di gestione abbonamento.");
    } finally {
      setIsPortalLoading(false);
    }
  };

  const handleReset = () => {
    const fallback = defaultPrefs ?? { people: 2, diet: "mediterranea" as const, maxTime: 20, budget: 60, skill: "beginner" as const, mealsPerDay: "dinner" as const, leftoversAllowed: true, exclusionsText: "", exclusions: [], sundaySpecial: true, sundayDinnerLeftovers: true, skippedMeals: [], coreIngredients: [] };
    ["ss_preferences_v1", "ss_pantry_v1", "ss_seed_v1", "ss_manual_overrides_v1",
     "ss_checked_shopping_v1", "ss_rigenera_log_v1", "ss_learning_v1"].forEach(k => localStorage.removeItem(k));
    setPreferences(fallback as Preferences);
    onResetAllLocalStorage?.();
    setConfirmReset(false);
  };

  if (!isOpen) return null;

  const selectedAllergens = preferences.exclusions.filter((e) =>
    (ALLERGEN_OPTIONS as readonly string[]).includes(e)
  );
  const noneSelected = preferences.exclusions.length === 0 && selectedAllergens.length === 0;
  const noneExplicit = preferences.exclusions.includes("nessuna");

  const toggleAllergen = (allergen: string) => {
    if (allergen === "nessuna") {
      setPreferences((p) => ({ ...p, exclusions: p.exclusions.includes("nessuna") ? [] : ["nessuna"] }));
      return;
    }
    setPreferences((p) => {
      const without = p.exclusions.filter((a) => a !== "nessuna");
      return {
        ...p,
        exclusions: without.includes(allergen)
          ? without.filter((a) => a !== allergen)
          : [...without, allergen],
      };
    });
  };

  const sectionLabel: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    color: "var(--sepia-light)",
    marginBottom: 12,
    marginTop: 0,
  };

  const divider: React.CSSProperties = {
    margin: "20px 0",
    background: "var(--cream-dark)",
    height: 1,
    border: "none",
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 200,
          background: "rgba(61,43,31,0.6)",
          backdropFilter: "blur(6px)",
        }}
      />

      {/* Drawer panel */}
      <div
        className="animate-in"
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "min(400px, 90vw)",
          background: "var(--warm-white)",
          overflowY: "auto",
          padding: 24,
          boxShadow: "-8px 0 30px rgba(61,43,31,0.15)",
          zIndex: 201,
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <h2
            style={{
              margin: 0,
              fontFamily: "'Playfair Display', serif",
              fontSize: 22,
              fontWeight: 700,
              color: "var(--sepia)",
            }}
          >
            Il tuo profilo
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: 22,
              cursor: "pointer",
              color: "var(--sepia-light)",
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {/* Section: Persone */}
        <div style={{ marginBottom: 20 }}>
          <p style={sectionLabel}>Persone</p>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20, marginBottom: 12 }}>
            <button
              onClick={() => setPreferences((p) => ({ ...p, people: Math.max(1, p.people - 1) }))}
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                background: "var(--cream-dark)",
                border: "2px solid rgba(61,43,31,0.12)",
                fontSize: 24,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                color: "var(--sepia)",
                transition: "all 0.15s",
              }}
            >
              −
            </button>
            <div style={{ textAlign: "center", minWidth: 80 }}>
              <div
                style={{
                  fontSize: 48,
                  fontWeight: 800,
                  color: "var(--terra)",
                  fontFamily: "'Playfair Display', serif",
                  lineHeight: 1,
                }}
              >
                {preferences.people}
              </div>
              <div style={{ fontSize: 13, color: "var(--sepia-light)", marginTop: 4 }}>
                {preferences.people === 1 ? "persona" : "persone"}
              </div>
            </div>
            <button
              onClick={() => {
                if (subscription?.tier === "base" && preferences.people >= 2) {
                  setShowPeopleProMsg(true);
                  return;
                }
                setShowPeopleProMsg(false);
                setPreferences((p) => ({ ...p, people: Math.min(12, p.people + 1) }));
              }}
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                background: "var(--terra)",
                border: "none",
                fontSize: 24,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                color: "white",
                transition: "all 0.15s",
              }}
            >
              +
            </button>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
            {[1, 2, 3, 4, 5, 6].map((n) => {
              const isBaseCapped = subscription?.tier === "base" && n > 2;
              return (
                <button
                  key={n}
                  onClick={() => {
                    if (isBaseCapped) { setShowPeopleProMsg(true); return; }
                    setShowPeopleProMsg(false);
                    setPreferences((p) => ({ ...p, people: n }));
                  }}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    background: preferences.people === n ? "var(--terra)" : isBaseCapped ? "var(--cream-dark, #ede8dc)" : "var(--cream)",
                    border: `2px solid ${preferences.people === n ? "var(--terra)" : "rgba(61,43,31,0.12)"}`,
                    fontSize: isBaseCapped ? 11 : 14,
                    fontWeight: 700,
                    cursor: isBaseCapped ? "pointer" : "pointer",
                    color: preferences.people === n ? "white" : isBaseCapped ? "var(--sepia-light)" : "var(--sepia)",
                    transition: "all 0.15s",
                    position: "relative",
                  }}
                >
                  {isBaseCapped ? "🔒" : n}
                </button>
              );
            })}
          </div>
          {showPeopleProMsg && subscription?.tier === "base" && (
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap",
              marginTop: 10, background: "rgba(107,124,69,0.08)", border: "1px solid rgba(107,124,69,0.25)",
              borderRadius: 10, padding: "10px 14px",
            }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--olive-dark, #3d4f2f)" }}>
                🔒 Disponibile con Piano Pro
              </span>
              <a href="/abbonamento" style={{
                fontSize: 13, fontWeight: 700, color: "white",
                background: "var(--olive, #6b7c45)", padding: "6px 14px",
                borderRadius: 8, textDecoration: "none", whiteSpace: "nowrap",
              }}>
                Aggiorna piano →
              </a>
            </div>
          )}
        </div>

        <hr style={divider} />

        {/* Section: Dieta */}
        <div style={{ marginBottom: 20 }}>
          <p style={sectionLabel}>Dieta</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {(
              [
                { value: "mediterranea", emoji: "🫒", label: "Mediterranea", desc: "Pasta, pesce, carne, verdure" },
                { value: "onnivora", emoji: "🥩", label: "Onnivora", desc: "Tutto, senza restrizioni" },
                { value: "vegetariana", emoji: "🥦", label: "Vegetariana", desc: "No carne e pesce" },
                { value: "vegana", emoji: "🌱", label: "Vegana", desc: "Solo vegetale" },
              ] as { value: Diet; emoji: string; label: string; desc: string }[]
            ).map((opt) => (
              <button
                key={opt.value}
                onClick={() => setPreferences((p) => ({ ...p, diet: opt.value }))}
                style={{
                  background: preferences.diet === opt.value ? "rgba(196,103,58,0.08)" : "var(--cream)",
                  border: `2px solid ${preferences.diet === opt.value ? "var(--terra)" : "rgba(61,43,31,0.12)"}`,
                  borderRadius: 16,
                  padding: "14px 12px",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.15s",
                }}
              >
                <div style={{ fontSize: 24, marginBottom: 6 }}>{opt.emoji}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--sepia)", marginBottom: 2 }}>{opt.label}</div>
                <div style={{ fontSize: 11, color: "var(--sepia-light)" }}>{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <hr style={divider} />

        {/* Section: Allergie */}
        <div style={{ marginBottom: 20 }}>
          <p style={sectionLabel}>Allergie / Intolleranze</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
            {(ALLERGEN_OPTIONS as readonly string[]).map((allergen) => {
              const isSelected = preferences.exclusions.includes(allergen);
              const isDisabled = noneExplicit;
              return (
                <button
                  key={allergen}
                  onClick={() => !isDisabled && toggleAllergen(allergen)}
                  style={{
                    background: isSelected ? "rgba(196,103,58,0.08)" : "var(--cream)",
                    border: `2px solid ${isSelected ? "var(--terra)" : "rgba(61,43,31,0.12)"}`,
                    borderRadius: 100,
                    padding: "8px 14px",
                    cursor: isDisabled ? "not-allowed" : "pointer",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--sepia)",
                    transition: "all 0.15s",
                    opacity: isDisabled && !isSelected ? 0.4 : 1,
                  }}
                >
                  {allergen.charAt(0).toUpperCase() + allergen.slice(1)}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => toggleAllergen("nessuna")}
            style={{
              background: noneExplicit ? "rgba(196,103,58,0.08)" : "var(--cream)",
              border: `2px solid ${noneExplicit ? "var(--terra)" : "rgba(61,43,31,0.12)"}`,
              borderRadius: 100,
              padding: "10px 20px",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 700,
              color: "var(--sepia)",
              transition: "all 0.15s",
              width: "100%",
              textAlign: "center",
            }}
          >
            {noneExplicit ? "✓ " : ""}Nessuna allergia
          </button>
        </div>

        <hr style={divider} />

        {/* Section: Tempo */}
        <div style={{ marginBottom: 20 }}>
          <p style={sectionLabel}>Tempo massimo</p>
          <div style={{ display: "grid", gap: 8 }}>
            {[
              { time: 15, emoji: "⚡", label: "Velocissimo", desc: "Max 15 minuti" },
              { time: 20, emoji: "🏃", label: "Rapido", desc: "Max 20 minuti" },
              { time: 30, emoji: "🍳", label: "Normale", desc: "Max 30 minuti" },
              { time: 45, emoji: "👨‍🍳", label: "Con calma", desc: "Max 45 minuti" },
            ].map((opt) => (
              <button
                key={opt.time}
                onClick={() => setPreferences((p) => ({ ...p, maxTime: opt.time }))}
                style={{
                  background: preferences.maxTime === opt.time ? "rgba(196,103,58,0.08)" : "var(--cream)",
                  border: `2px solid ${preferences.maxTime === opt.time ? "var(--terra)" : "rgba(61,43,31,0.12)"}`,
                  borderRadius: 12,
                  padding: "12px 14px",
                  cursor: "pointer",
                  textAlign: "left",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  transition: "all 0.15s",
                }}
              >
                <span style={{ fontSize: 22 }}>{opt.emoji}</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--sepia)" }}>{opt.label}</div>
                  <div style={{ fontSize: 12, color: "var(--sepia-light)", marginTop: 2 }}>{opt.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <hr style={divider} />

        {/* Section: Budget */}
        <div style={{ marginBottom: 20 }}>
          <p style={sectionLabel}>Budget settimanale</p>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: 13, color: "var(--sepia-light)" }}>€20</span>
            <span
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: "var(--terra)",
                fontFamily: "'Playfair Display', serif",
              }}
            >
              €{preferences.budget}
            </span>
            <span style={{ fontSize: 13, color: "var(--sepia-light)" }}>€100</span>
          </div>
          <input
            type="range"
            min={20}
            max={100}
            step={10}
            value={preferences.budget}
            onChange={(e) => setPreferences((p) => ({ ...p, budget: Number(e.target.value) }))}
            style={{ width: "100%", accentColor: "var(--terra)" }}
          />
        </div>

        <hr style={divider} />

        {/* Section: Giorno della spesa */}
        <div style={{ marginBottom: 20 }}>
          <p style={sectionLabel}>Giorno della spesa</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {DAYS_IT.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setPreferences((p) => ({ ...p, shoppingDay: value }))}
                style={{
                  background: preferences.shoppingDay === value ? "rgba(196,103,58,0.08)" : "var(--cream)",
                  border: `2px solid ${preferences.shoppingDay === value ? "var(--terra)" : "rgba(61,43,31,0.12)"}`,
                  borderRadius: 100,
                  padding: "8px 14px",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--sepia)",
                  transition: "all 0.15s",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {preferences.shoppingDay !== undefined && (
          <div style={{ marginBottom: 20 }}>
            <p style={sectionLabel}>Orario promemoria spesa</p>
            <p style={{ fontSize: 13, color: "var(--sepia-light)", margin: "0 0 12px 0" }}>
              Riceverai un promemoria a quest&apos;ora il giorno della spesa
            </p>
            <input
              type="time"
              value={preferences.shoppingNotificationTime ?? "09:00"}
              onChange={(e) => setPreferences((p) => ({ ...p, shoppingNotificationTime: e.target.value }))}
              style={{
                width: "100%",
                borderRadius: 12,
                padding: 12,
                fontSize: 16,
                color: "var(--sepia)",
                background: "var(--cream)",
                border: "2px solid rgba(61,43,31,0.12)",
                boxSizing: "border-box",
              }}
            />
          </div>
        )}

        {user && preferences.shoppingDay !== undefined && (
          <>
            <hr style={divider} />
            <div style={{ marginBottom: 20 }}>
              <p style={sectionLabel}>Notifiche</p>
              <NotificationPrompt push={push} />
            </div>
          </>
        )}

        {/* Installa app */}
        {installPrompt && !isInstalled && (
          <>
            <hr style={divider} />
            <div style={{ marginBottom: 20 }}>
              <p style={sectionLabel}>App</p>
              <button
                onClick={() => {
                  (installPrompt as BeforeInstallPromptEvent).prompt();
                  (installPrompt as BeforeInstallPromptEvent).userChoice.then(() => setInstallPrompt(null));
                }}
                style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "12px 16px", borderRadius: 12, border: "1.5px solid var(--cream-dark)", background: "white", cursor: "pointer", fontSize: 14, fontWeight: 600, color: "var(--sepia)" }}
              >
                📲 Installa Menumix sul dispositivo
              </button>
            </div>
          </>
        )}

        <hr style={divider} />

        {/* Auth section */}
        <div>
          {user === null ? (
            <div style={{ display: "grid", gap: 10 }}>
              <p style={{ margin: 0, fontSize: 14, color: "var(--sepia-light)" }}>
                Accedi per salvare i tuoi dati nel cloud
              </p>
              <button
                onClick={() => setShowAuthModal(true)}
                className="btn-terra"
                style={{ justifyContent: "center", width: "100%", transition: "all 0.15s" }}
              >
                Accedi / Registrati
              </button>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{
                background: "var(--cream)",
                borderRadius: 12,
                padding: "14px 16px",
                display: "grid",
                gap: 6,
              }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--sepia)" }}>{user.email}</div>
                {accountCreatedAt && (
                  <div style={{ fontSize: 12, color: "var(--sepia-light)" }}>
                    Account creato il {accountCreatedAt}
                  </div>
                )}
                {planCount !== null && (
                  <div style={{ fontSize: 12, color: "var(--sepia-light)" }}>
                    {planCount === 0 ? "Nessun piano generato" : `${planCount} ${planCount === 1 ? "piano" : "piani"} generati`}
                  </div>
                )}
              </div>
              <button
                onClick={() => sbClient?.auth.signOut()}
                className="btn-outline"
                style={{ justifyContent: "center", width: "100%", fontSize: 14, transition: "all 0.15s" }}
              >
                Esci
              </button>
            </div>
          )}
        </div>

        {/* Subscription section */}
        {user && (
          <>
            <hr style={divider} />
            <div style={{ marginBottom: 20 }}>
              <p style={sectionLabel}>Abbonamento</p>

              {/* Plan info card */}
              {(() => {
                const tier = subscription?.tier ?? "free";
                const isTrialing = subscription?.isTrialing ?? false;
                const fmt = (d: Date) => d.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" });

                let label = "";
                let sublabel = "";
                let bg = "var(--cream-dark, #e8e0d0)";
                let color = "var(--sepia-light, #8b7d6b)";

                if (isTrialing && subscription?.trialEnd) {
                  label = "Prova gratuita";
                  sublabel = `scade il ${fmt(subscription.trialEnd)}`;
                  bg = "rgba(107,124,69,0.1)";
                  color = "var(--olive-dark, #3d4f2f)";
                } else if (tier === "pro") {
                  label = "Piano Pro";
                  sublabel = subscription?.renewalDate ? `rinnovo il ${fmt(subscription.renewalDate)}` : "";
                  bg = "rgba(107,124,69,0.1)";
                  color = "var(--olive-dark, #3d4f2f)";
                } else if (tier === "base") {
                  label = "Piano Base";
                  sublabel = subscription?.renewalDate ? `rinnovo il ${fmt(subscription.renewalDate)}` : "";
                  bg = "rgba(196,103,58,0.08)";
                  color = "var(--terra, #c4673a)";
                } else {
                  label = "Nessun piano";
                  sublabel = "14 giorni di prova inclusi";
                }

                return (
                  <div style={{ background: bg, borderRadius: 12, padding: "14px 16px", marginBottom: 12 }}>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color }}>{label}</p>
                    {sublabel ? <p style={{ margin: "3px 0 0", fontSize: 13, color, opacity: 0.8 }}>{sublabel}</p> : null}
                  </div>
                );
              })()}

              {/* Gestisci abbonamento */}
              {subscription && subscription.status !== "none" && (
                <button
                  onClick={handleOpenPortal}
                  disabled={isPortalLoading}
                  className="btn-outline"
                  style={{ width: "100%", justifyContent: "center", fontSize: 14, marginBottom: 8, opacity: isPortalLoading ? 0.6 : 1 }}
                >
                  {isPortalLoading ? "Caricamento..." : "Gestisci abbonamento"}
                </button>
              )}

              {/* Aggiorna al Pro — solo per Base */}
              {subscription?.tier === "base" && !subscription.isTrialing && (
                <a
                  href="/abbonamento"
                  style={{
                    display: "block", textAlign: "center",
                    background: "var(--olive, #6b7c45)", color: "white",
                    fontWeight: 700, fontSize: 14, padding: "12px",
                    borderRadius: 10, textDecoration: "none",
                    marginBottom: 8,
                  }}
                >
                  Aggiorna al Pro →
                </a>
              )}

              {/* Vedi piani — per free */}
              {(!subscription || subscription.status === "none") && (
                <a
                  href="/abbonamento"
                  style={{
                    display: "block", textAlign: "center",
                    fontSize: 13, color: "var(--olive, #6b7c45)",
                    textDecoration: "underline", marginTop: 4,
                  }}
                >
                  Scegli un piano
                </a>
              )}
            </div>
          </>
        )}

        {/* Danger Zone */}
        {user && (
          <>
            <hr style={divider} />
            <div style={{ marginBottom: 24 }}>
              <p style={{ ...sectionLabel }}>Gestione account</p>

              {/* Export data */}
              <button
                onClick={handleExport}
                disabled={isExporting}
                style={{
                  width: "100%",
                  background: "var(--cream)",
                  border: "2px solid rgba(61,43,31,0.12)",
                  borderRadius: 12,
                  padding: "12px 16px",
                  cursor: isExporting ? "not-allowed" : "pointer",
                  textAlign: "left",
                  marginBottom: 10,
                  opacity: isExporting ? 0.6 : 1,
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--sepia)" }}>
                  {isExporting ? "Esportazione..." : "Scarica i tuoi dati"}
                </div>
                <div style={{ fontSize: 12, color: "var(--sepia-light)", marginTop: 2 }}>
                  Esporta preferenze e piani in formato JSON (GDPR)
                </div>
              </button>

              {/* Reset preferences */}
              {!confirmReset ? (
                <button
                  onClick={() => setConfirmReset(true)}
                  style={{
                    width: "100%",
                    background: "var(--cream)",
                    border: "2px solid rgba(192,57,43,0.3)",
                    borderRadius: 12,
                    padding: "12px 16px",
                    cursor: "pointer",
                    textAlign: "left",
                    marginBottom: 10,
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#c0392b" }}>
                    Reimposta preferenze
                  </div>
                  <div style={{ fontSize: 12, color: "var(--sepia-light)", marginTop: 2 }}>
                    Riporta tutte le impostazioni ai valori predefiniti
                  </div>
                </button>
              ) : (
                <div style={{
                  background: "rgba(192,57,43,0.06)",
                  border: "2px solid rgba(192,57,43,0.3)",
                  borderRadius: 12,
                  padding: "14px 16px",
                  marginBottom: 10,
                }}>
                  <p style={{ margin: "0 0 12px", fontSize: 14, color: "var(--sepia)", fontWeight: 600 }}>
                    Reimpostare le preferenze? Questa azione non può essere annullata.
                  </p>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={handleReset}
                      style={{
                        flex: 1, background: "#c0392b", color: "white", border: "none",
                        borderRadius: 8, padding: "10px 0", cursor: "pointer", fontWeight: 700, fontSize: 14,
                      }}
                    >
                      Reimposta
                    </button>
                    <button
                      onClick={() => setConfirmReset(false)}
                      style={{
                        flex: 1, background: "var(--cream)", color: "var(--sepia)", border: "2px solid rgba(61,43,31,0.12)",
                        borderRadius: 8, padding: "10px 0", cursor: "pointer", fontWeight: 600, fontSize: 14,
                      }}
                    >
                      Annulla
                    </button>
                  </div>
                </div>
              )}

              {/* Delete account */}
              {!confirmDelete ? (
                <button
                  onClick={() => setConfirmDelete(true)}
                  style={{
                    width: "100%",
                    background: "#c0392b",
                    border: "none",
                    borderRadius: 12,
                    padding: "12px 16px",
                    cursor: "pointer",
                    textAlign: "left",
                    color: "white",
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 700 }}>Elimina account</div>
                  <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>
                    Elimina definitivamente account e tutti i dati
                  </div>
                </button>
              ) : (
                <div style={{
                  background: "rgba(192,57,43,0.06)",
                  border: "2px solid #c0392b",
                  borderRadius: 12,
                  padding: "14px 16px",
                }}>
                  <p style={{ margin: "0 0 12px", fontSize: 14, color: "var(--sepia)", fontWeight: 600 }}>
                    Eliminare definitivamente l&apos;account? Tutti i tuoi dati saranno cancellati e non potranno essere recuperati.
                  </p>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={handleDeleteAccount}
                      disabled={isDeleting}
                      style={{
                        flex: 1, background: "#c0392b", color: "white", border: "none",
                        borderRadius: 8, padding: "10px 0", cursor: isDeleting ? "not-allowed" : "pointer",
                        fontWeight: 700, fontSize: 14, opacity: isDeleting ? 0.6 : 1,
                      }}
                    >
                      {isDeleting ? "Eliminazione..." : "Elimina"}
                    </button>
                    <button
                      onClick={() => setConfirmDelete(false)}
                      disabled={isDeleting}
                      style={{
                        flex: 1, background: "var(--cream)", color: "var(--sepia)", border: "2px solid rgba(61,43,31,0.12)",
                        borderRadius: 8, padding: "10px 0", cursor: "pointer", fontWeight: 600, fontSize: 14,
                      }}
                    >
                      Annulla
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Legal links */}
        <div style={{ marginTop: 32, paddingTop: 16, borderTop: "1px solid var(--cream-dark)", display: "flex", gap: 20, justifyContent: "center" }}>
          <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "var(--sepia-light)", textDecoration: "none" }}>
            Privacy Policy
          </a>
          <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "var(--sepia-light)", textDecoration: "none" }}>
            Termini di Servizio
          </a>
        </div>
      </div>

      {/* Auth modal on top */}
      {showAuthModal && (
        <AuthModalInline
          onClose={() => {
            setShowAuthModal(false);
            if (user && sbClient) migrateFromLocalStorage(sbClient, user.id);
          }}
          client={sbClient}
        />
      )}
    </>
  );
}

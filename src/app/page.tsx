"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/AuthProvider";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { usePlanEngine } from "@/hooks/usePlanEngine";
import { useLearning } from "@/hooks/useLearning";
import { AuthModalInline } from "@/components/AuthModalInline";
import { OnboardingFlow } from "@/components/OnboardingFlow";
import { TourOverlay, TOUR_STEPS } from "@/components/TourOverlay";
import { HerbBanner } from "@/components/HerbBanner";
import { RecipeModal } from "@/components/RecipeModal";
import { AppHeader } from "@/components/AppHeader";
import { ProfileDrawer } from "@/components/ProfileDrawer";
import { PlannerTab } from "@/components/PlannerTab";
import { WeekTab } from "@/components/WeekTab";
import { ShoppingTab } from "@/components/ShoppingTab";
import { CucinaTab } from "@/components/CucinaTab";
import { RicetteTab } from "@/components/RicetteTab";
import { normalize } from "@/lib/planEngine";
import { loadUserData } from "@/lib/supabase";
import { OfflineBanner } from "@/components/OfflineBanner";
import type { Preferences, PantryItem, ManualOverrides, Recipe, VoiceOption, FreezeItem } from "@/types";

const DEFAULT_PREFS: Preferences = { people: 2, diet: "mediterranea", maxTime: 20, budget: 60, skill: "beginner", mealsPerDay: "dinner", leftoversAllowed: true, exclusionsText: "", exclusions: [], sundaySpecial: true, sundayDinnerLeftovers: true, skippedMeals: [], coreIngredients: [] };
const DEFAULT_PANTRY: PantryItem[] = [{ name: "pasta", quantity: 500, unit: "g" }, { name: "olio extravergine", quantity: 200, unit: "ml" }, { name: "uova fresche", quantity: 2, unit: "pezzi" }];
const TABS = [{ id: "planner", label: "Planner" }, { id: "week", label: "Settimana" }, { id: "shopping", label: "Spesa" }, { id: "recipes", label: "Ricette" }, { id: "reminder", label: "Reminder" }];
const PERISHABLE_HERBS = ["basilico fresco","menta fresca","prezzemolo fresco","erba cipollina","salvia fresca","timo fresco","rosmarino fresco","menta o basilico fresco","basilico e menta freschi","aneto","erba cipollina o aneto"];

export default function SettimanaSmartMVP() {
  const [preferences, setPreferences] = useLocalStorage<Preferences>("ss_preferences_v1", DEFAULT_PREFS);
  const [pantryItems, setPantryItems] = useLocalStorage<PantryItem[]>("ss_pantry_v1", DEFAULT_PANTRY);
  const [seed, setSeed] = useLocalStorage<number>("ss_seed_v1", 1);
  const [manualOverrides, setManualOverrides] = useLocalStorage<ManualOverrides>("ss_manual_overrides_v1", {});
  const { learning, learnFromRecipe } = useLearning();
  const { sbClient, user, showAuthModal, setShowAuthModal, syncStatus, setSyncStatus } = useAuth();
  const { computedPrefs, generated, recipeCount } = usePlanEngine(
    preferences, pantryItems, seed, learning, manualOverrides,
    { sbClient, userId: user?.id ?? null, setSyncStatus },
  );
  const [isMounted, setIsMounted] = useState(false);
  const [activeTab, setActiveTab] = useState("planner");
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastMessage, setLastMessage] = useState("Pronto a generare");
  const [showGeneratedBanner, setShowGeneratedBanner] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [swappedDays, setSwappedDays] = useState<Set<string>>(new Set());
  const [checkedShoppingItems, setCheckedShoppingItems] = useState<Set<string>>(new Set());
  const [extraShoppingItems, setExtraShoppingItems] = useState<string[]>([]);
  const [freezeReminderTimers, setFreezeReminderTimers] = useState<number[]>([]);
  const [pantryInput, setPantryInput] = useState({ name: "", quantity: "", unit: "g" });
  const [onboardingDone, setOnboardingDone] = useState(() => typeof window !== "undefined" ? localStorage.getItem("ss_onboarding_done") === "1" : true);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [tutorialDone, setTutorialDone] = useState(() => typeof window !== "undefined" ? localStorage.getItem("ss_tutorial_done") === "1" : true);
  const [tutorialStep, setTutorialStep] = useState(0);
  const tutorialStepRef = useRef(0);
  const [prepTime, setPrepTime] = useState("18:30");
  const [prepReminderMessage, setPrepReminderMessage] = useState("È ora di iniziare a cucinare");
  const [scheduledReminderText, setScheduledReminderText] = useState("");
  const [availableVoices, setAvailableVoices] = useState<VoiceOption[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState("");
  const [runningRecipe, setRunningRecipe] = useState<Recipe | null>(null);
  const [runningStepIndex, setRunningStepIndex] = useState(0);
  const [currentStepChecked, setCurrentStepChecked] = useState(false);
  const [freezeToastMessage, setFreezeToastMessage] = useState("");
  const reminderTimerRef = useRef<number | null>(null);
  const recipeDetailRef = useRef<HTMLDivElement>(null);
  const [herbsToCheck, setHerbsToCheck] = useState<string[]>([]);
  const [herbAnswers, setHerbAnswers] = useState<Record<string, boolean>>({});
  const [showHerbBanner, setShowHerbBanner] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [isOffline, setIsOffline] = useState(() =>
    typeof window !== "undefined" ? !navigator.onLine : false
  );
  const cloudLoadDoneRef = useRef(false);

  // ── Effects ───────────────────────────────────────────────────────────────
  useEffect(() => { setIsMounted(true); }, []);
  useEffect(() => { tutorialStepRef.current = tutorialStep; }, [tutorialStep]);
  useEffect(() => { const first = preferences.mealsPerDay === "both" ? generated.days[0]?.lunch || generated.days[0]?.dinner : generated.days[0]?.dinner; setSelectedRecipe(first || null); }, [generated, preferences.mealsPerDay]);
  useEffect(() => {
    const loadVoices = () => { if (typeof window === "undefined" || !("speechSynthesis" in window)) return; const voices = window.speechSynthesis.getVoices().map((v) => ({ name: v.name, lang: v.lang })); setAvailableVoices(voices); if (!selectedVoiceName && voices.length) { const it = voices.find((v) => v.lang.toLowerCase().startsWith("it")); setSelectedVoiceName((it || voices[0]).name); } };
    loadVoices();
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => { if (reminderTimerRef.current) window.clearTimeout(reminderTimerRef.current); if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.onvoiceschanged = null; };
  }, [selectedVoiceName]);
  const completeTutorial = () => { localStorage.setItem("ss_tutorial_done", "1"); setTutorialDone(true); };
  const tourAdvance = useCallback((action: string) => {
    if (tutorialDone) return;
    const step = TOUR_STEPS[tutorialStepRef.current];
    if (!step || step.waitFor !== action) return;
    const delay = ["regenerated", "item_checked"].includes(action) ? 1500 : 0;
    setTimeout(() => { const idx = tutorialStepRef.current; if (idx >= TOUR_STEPS.length - 1) { completeTutorial(); return; } const next = TOUR_STEPS[idx + 1]; setActiveTab(next.tab); setTutorialStep(idx + 1); tutorialStepRef.current = idx + 1; }, delay);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tutorialDone]);
  const regenerate = () => {
    tourAdvance("generate"); setIsGenerating(true); setShowGeneratedBanner(false); setShowHerbBanner(false); setLastMessage("Generazione in corso...");
    setTimeout(() => {
      const usedHerbs = Array.from(new Set(generated.days.flatMap((d) => [d.lunch, d.dinner].filter(Boolean) as Recipe[]).flatMap((r) => r.ingredients).filter((i) => PERISHABLE_HERBS.includes(normalize(i.name))).map((i) => i.name)));
      if (usedHerbs.length > 0) { setHerbsToCheck(usedHerbs); setHerbAnswers({}); setShowHerbBanner(true); }
      setManualOverrides({}); setSwappedDays(new Set()); setCheckedShoppingItems(new Set()); setExtraShoppingItems([]);
      setSeed((prev) => prev + 1); setIsGenerating(false); setShowGeneratedBanner(true);
      setLastMessage(`Piano generato alle ${new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}`);
    }, 500);
  };

  const scheduleFreezeReminders = (items: FreezeItem[]) => {
    freezeReminderTimers.forEach((t) => window.clearTimeout(t));
    const newTimers: number[] = [];
    items.forEach((item) => {
      const now = new Date(); const target = new Date(); const reminderDay = item.useOnDayIndex - 1;
      const targetDayJS = reminderDay === 0 ? 1 : reminderDay === 6 ? 0 : reminderDay + 1;
      let daysUntil = (targetDayJS - now.getDay() + 7) % 7; if (daysUntil === 0 && now.getHours() >= 20) daysUntil = 7;
      target.setDate(target.getDate() + daysUntil); target.setHours(20, 0, 0, 0);
      const delay = target.getTime() - now.getTime();
      if (delay > 0) { const msg = `⏰ Ricordati di mettere a scongelare ${item.name} (${item.qtyToFreeze}${item.unit}) per domani — serve per: ${item.recipe}`; const t = window.setTimeout(() => { if (typeof Notification !== "undefined" && Notification.permission === "granted") new Notification("Settimana Smart — Scongela!", { body: msg }); setFreezeToastMessage(msg); }, delay); newTimers.push(t); }
    });
    setFreezeReminderTimers(newTimers);
  };

  const confirmWeek = () => { const meals = generated.days.flatMap((d) => [d.lunch, d.dinner].filter(Boolean)) as Recipe[]; meals.forEach((m) => learnFromRecipe(m, "keep")); setLastMessage("Settimana confermata ✓"); setShowGeneratedBanner(true); if (generated.freezeItems.length > 0) scheduleFreezeReminders(generated.freezeItems); };

  const playReminderPreview = () => { if (typeof window === "undefined" || !("speechSynthesis" in window)) return; const u = new SpeechSynthesisUtterance(prepReminderMessage || "È ora di iniziare a cucinare"); const v = window.speechSynthesis.getVoices().find((vx) => vx.name === selectedVoiceName); if (v) u.voice = v; u.lang = v?.lang || "it-IT"; window.speechSynthesis.cancel(); window.speechSynthesis.speak(u); };

  const scheduleReminder = async () => {
    if (typeof window === "undefined") return; if (reminderTimerRef.current) window.clearTimeout(reminderTimerRef.current);
    const [h, m] = prepTime.split(":").map(Number); const now = new Date(); const target = new Date(); target.setHours(h, m, 0, 0);
    if (target.getTime() <= now.getTime()) target.setDate(target.getDate() + 1);
    if (typeof Notification !== "undefined" && Notification.permission === "default") { try { await Notification.requestPermission(); } catch {} }
    reminderTimerRef.current = window.setTimeout(() => { const msg = prepReminderMessage || "È ora di iniziare a cucinare"; if (typeof Notification !== "undefined" && Notification.permission === "granted") new Notification("Settimana Smart", { body: msg }); if ("speechSynthesis" in window) { const u = new SpeechSynthesisUtterance(msg); const v = window.speechSynthesis.getVoices().find((vx) => vx.name === selectedVoiceName); if (v) u.voice = v; u.lang = v?.lang || "it-IT"; window.speechSynthesis.cancel(); window.speechSynthesis.speak(u); } }, target.getTime() - now.getTime());
    setScheduledReminderText(`Promemoria impostato per le ${prepTime}`);
  };

  const startRecipeFlow = (rec: Recipe | null) => { if (!rec) return; setRunningRecipe(rec); setRunningStepIndex(0); setCurrentStepChecked(false); };
  const closeRecipeFlow = (completed = false) => { setRunningRecipe(null); setRunningStepIndex(0); setCurrentStepChecked(false); if (completed) setTimeout(() => tourAdvance("guided_completed"), 50); };
  const advanceRecipeFlow = () => { if (!runningRecipe) return; if (runningStepIndex >= runningRecipe.steps.length - 1) { const t = runningRecipe.title; closeRecipeFlow(true); setLastMessage(`Completato: ${t}`); return; } setRunningStepIndex((p) => p + 1); setCurrentStepChecked(false); };
  const goToRecipe = (recipe: Recipe) => { setSelectedRecipe(recipe); setActiveTab("recipes"); setTimeout(() => { recipeDetailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }, 100); };
  useEffect(() => {
    if (!user || !sbClient || !onboardingDone) return;
    // Migrate localStorage data to cloud on first login/signup
    import("@/lib/supabase").then(({ migrateFromLocalStorage }) => {
      migrateFromLocalStorage(sbClient, user.id);
    });
  }, [user, sbClient, onboardingDone]);

  // ── OFFLINE DETECTION ──
  useEffect(() => {
    const goOffline = () => setIsOffline(true);
    const goOnline = () => {
      setIsOffline(false);
      // Sync triggers automatically via usePlanEngine's auto-save effect
    };
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  // ── CLOUD LOAD ON MOUNT ──
  useEffect(() => {
    if (!sbClient || !user || cloudLoadDoneRef.current) return;
    cloudLoadDoneRef.current = true;

    // Solo se localStorage e' vuoto (nuovo dispositivo) — altrimenti locale vince
    const hasLocalData = typeof window !== "undefined" && localStorage.getItem("ss_seed_v1") !== null;
    if (hasLocalData) return; // Locale vince sempre — push to cloud via auto-save

    (async () => {
      try {
        const data = await loadUserData(sbClient, user.id);
        if (data.seed !== undefined) setSeed(data.seed);
        if (data.preferences && Object.keys(data.preferences).length > 0) {
          setPreferences(prev => ({ ...prev, ...data.preferences as Partial<Preferences> }));
        }
        if (data.manualOverrides && Object.keys(data.manualOverrides).length > 0) {
          setManualOverrides(data.manualOverrides as ManualOverrides);
        }
      } catch {
        // Errore cloud load — fallback silenzioso a stato locale
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sbClient, user]);

  if (isMounted && !onboardingDone) return (
    <OnboardingFlow
      preferences={preferences}
      setPreferences={setPreferences}
      onboardingStep={onboardingStep}
      setOnboardingStep={setOnboardingStep}
      onComplete={() => {
        localStorage.setItem("ss_onboarding_done", "1");
        setOnboardingDone(true);
        setSeed((p) => p + 1);
        setShowGeneratedBanner(true);
        setLastMessage("Piano generato — benvenuto!");
        setActiveTab("week");
        setTutorialDone(false);
        setTutorialStep(0);
      }}
      sbClient={sbClient}
    />
  );
  const dayMap: Record<number, string> = { 1: "Lun", 2: "Mar", 3: "Mer", 4: "Gio", 5: "Ven", 6: "Sab", 0: "Dom" };
  const todayKey = dayMap[new Date().getDay()]; const isLunchTime = new Date().getHours() < 15;
  const todayPlan = generated.days.find((d) => d.day === todayKey);
  const isDaySwapped = todayKey ? swappedDays.has(todayKey) : false;
  const effLunch = isDaySwapped ? todayPlan?.dinner : todayPlan?.lunch;
  const effDinner = isDaySwapped ? todayPlan?.lunch : todayPlan?.dinner;
  const currentRecipe = preferences.mealsPerDay === "both" ? (isLunchTime ? effLunch || effDinner : effDinner || effLunch) : todayPlan?.dinner;
  return (
    <>
      {showAuthModal && isMounted && <AuthModalInline onClose={() => setShowAuthModal(false)} client={sbClient} />}
      {isMounted && !tutorialDone && (
        <TourOverlay steps={TOUR_STEPS} currentStep={tutorialStep}
          onAdvance={() => { if (tutorialStep >= TOUR_STEPS.length - 1) { completeTutorial(); return; } const next = TOUR_STEPS[tutorialStep + 1]; setActiveTab(next.tab); setTutorialStep((p) => p + 1); }}
          onComplete={completeTutorial}
        />
      )}

      <div className="bg-texture" style={{ minHeight: "100vh", paddingBottom: 60 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "clamp(14px, 4vw, 28px) clamp(12px, 4vw, 20px)" }}>

          <AppHeader isMounted={isMounted} generated={generated} user={user} syncStatus={syncStatus} sbClient={sbClient}
            onSignIn={() => setShowAuthModal(true)} onSignOut={() => sbClient?.auth.signOut()}
            onProfileOpen={() => setShowProfile(true)} recipeCount={recipeCount} />
          <OfflineBanner isOffline={isOffline} />
          <ProfileDrawer
            isOpen={showProfile}
            onClose={() => setShowProfile(false)}
            preferences={preferences}
            setPreferences={setPreferences}
          />
          {isMounted && currentRecipe && (
            <div style={{ background: "linear-gradient(135deg, var(--terra), var(--terra-dark))", borderRadius: 18, padding: "16px 18px", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, boxShadow: "0 4px 20px rgba(196,103,58,0.3)", flexWrap: "wrap" }} className="animate-in">
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <span style={{ fontSize: 32 }}>🍳</span>
                <div>
                  <p style={{ margin: 0, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(255,255,255,0.7)" }}>{isLunchTime ? "Ora cucino · Pranzo" : "Ora cucino · Cena"}</p>
                  <p style={{ margin: "3px 0 0", fontWeight: 700, color: "white", fontSize: 18, fontFamily: "'Playfair Display', serif" }}>{currentRecipe.title}</p>
                  <p style={{ margin: "3px 0 0", fontSize: 13, color: "rgba(255,255,255,0.8)" }}>⏱ {currentRecipe.time} min · {currentRecipe.ingredients.length} ingredienti</p>
                </div>
              </div>
              <button onClick={() => goToRecipe(currentRecipe)} style={{ background: "rgba(255,255,255,0.2)", border: "1.5px solid rgba(255,255,255,0.4)", borderRadius: 12, padding: "10px 18px", color: "white", fontWeight: 700, fontSize: 14, cursor: "pointer", whiteSpace: "nowrap" }}>Vedi ricetta →</button>
            </div>
          )}
          {showGeneratedBanner && (
            <div className="alert-banner animate-in" style={{ marginBottom: 20 }}>
              <span style={{ fontSize: 20 }}>🎉</span>
              <div><p style={{ margin: 0, fontWeight: 600, color: "var(--sepia)", fontSize: 14 }}>Piano generato con successo</p><p style={{ margin: "2px 0 0", fontSize: 13, color: "var(--sepia-light)" }}>{lastMessage} — apri i tab Settimana e Spesa per vedere il risultato.</p></div>
            </div>
          )}

          {showHerbBanner && herbsToCheck.length > 0 && <HerbBanner herbsToCheck={herbsToCheck} herbAnswers={herbAnswers} setHerbAnswers={setHerbAnswers} setPantryItems={setPantryItems} onDismiss={() => setShowHerbBanner(false)} />}
          <div className="tab-nav animate-in delay-1" style={{ gridTemplateColumns: `repeat(${TABS.length}, 1fr)`, marginBottom: 24 }}>
            {TABS.map((tab) => <button key={tab.id} className={`tab-item${activeTab === tab.id ? " active" : ""}`} onClick={() => setActiveTab(tab.id)}>{tab.label}</button>)}
          </div>

          {activeTab === "planner" && <PlannerTab preferences={preferences} setPreferences={setPreferences} pantryItems={pantryItems} setPantryItems={setPantryItems} pantryInput={pantryInput} setPantryInput={setPantryInput} seed={seed} setSeed={setSeed} isGenerating={isGenerating} lastMessage={lastMessage} showGeneratedBanner={showGeneratedBanner} generated={generated} learning={learning} onGenerate={regenerate} onConfirmWeek={confirmWeek} onReset={() => { setPreferences(DEFAULT_PREFS); setSeed(1); setManualOverrides({}); setLastMessage("Reset effettuato"); setShowGeneratedBanner(false); }} onRestartOnboarding={() => { localStorage.removeItem("ss_onboarding_done"); setOnboardingDone(false); setOnboardingStep(0); }} setManualOverrides={setManualOverrides} setShowGeneratedBanner={setShowGeneratedBanner} setLastMessage={setLastMessage} />}
          {activeTab === "week" && <WeekTab generated={generated} computedPrefs={computedPrefs} preferences={preferences} manualOverrides={manualOverrides} setManualOverrides={setManualOverrides} swappedDays={swappedDays} setSwappedDays={setSwappedDays} seed={seed} learning={learning} learnFromRecipe={learnFromRecipe} selectedRecipe={selectedRecipe} setSelectedRecipe={setSelectedRecipe} setActiveTab={setActiveTab} onStartRecipeFlow={startRecipeFlow} setLastMessage={setLastMessage} setShowGeneratedBanner={setShowGeneratedBanner} onConfirmWeek={confirmWeek} tourAdvance={tourAdvance} />}
          {activeTab === "shopping" && <ShoppingTab generated={generated} checkedShoppingItems={checkedShoppingItems} setCheckedShoppingItems={setCheckedShoppingItems} extraShoppingItems={extraShoppingItems} setExtraShoppingItems={setExtraShoppingItems} tourAdvance={tourAdvance} />}
          {activeTab === "recipes" && <RicetteTab generated={generated} selectedRecipe={selectedRecipe} setSelectedRecipe={setSelectedRecipe} recipeDetailRef={recipeDetailRef} onStartRecipeFlow={startRecipeFlow} />}
          {activeTab === "reminder" && <CucinaTab prepTime={prepTime} setPrepTime={setPrepTime} prepReminderMessage={prepReminderMessage} setPrepReminderMessage={setPrepReminderMessage} scheduledReminderText={scheduledReminderText} availableVoices={availableVoices} selectedVoiceName={selectedVoiceName} setSelectedVoiceName={setSelectedVoiceName} onPlayReminderPreview={playReminderPreview} onScheduleReminder={scheduleReminder} />}

        </div>
      </div>

      {runningRecipe && <RecipeModal recipe={runningRecipe} stepIndex={runningStepIndex} stepChecked={currentStepChecked} onClose={() => closeRecipeFlow()} onAdvance={advanceRecipeFlow} onStepCheck={(checked) => { setCurrentStepChecked(checked); if (!checked) return; window.setTimeout(() => advanceRecipeFlow(), 250); }} />}
      {freezeToastMessage && <div style={{ position: "fixed", bottom: "1.5rem", left: "50%", transform: "translateX(-50%)", zIndex: 9999, backgroundColor: "var(--sepia, #3D2B1F)", color: "white", padding: "1rem 1.5rem", borderRadius: "0.75rem", boxShadow: "0 4px 20px rgba(0,0,0,0.2)", maxWidth: "90vw", display: "flex", alignItems: "center", gap: "0.75rem" }}><span>{freezeToastMessage}</span><button onClick={() => setFreezeToastMessage("")} style={{ background: "none", border: "none", color: "white", cursor: "pointer", fontSize: "1.2rem", padding: "0 0.25rem" }}>x</button></div>}
    </>
  );
}

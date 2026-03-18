"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { useAuth } from "@/lib/AuthProvider";

import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ShoppingCart, ChefHat, Refrigerator, Wand2, RotateCcw, Users,
  Clock3, Euro, Sparkles, PartyPopper, Bell, Play, X, CheckCircle2, Heart,
} from "lucide-react";
import type {
  Diet, Skill, MealSlot, PantryItem, Recipe, DayPlan,
  Preferences, PreferenceLearning, PlanStats, PlanResult,
  FreezeItem, VoiceOption, ManualOverrides, ShoppingItem,
} from "@/types";
import { RECIPE_LIBRARY } from "@/data/recipes";
import {
  buildPlan, aggregateShopping, computeStats, seededShuffle, scaleQty,
  normalize, getRecipeCategory,
  DAYS, CATEGORY_ORDER, SKIP_OPTIONS, FREEZE_CANDIDATES,
} from "@/lib/planEngine";

const designTokens = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400;1,600&family=DM+Sans:wght@300;400;500;600&display=swap');

  :root {
    --terra: #C4673A;
    --terra-light: #E8856A;
    --terra-dark: #9B4E2B;
    --cream: #FAF5ED;
    --cream-dark: #F0E8D8;
    --olive: #5C6B3A;
    --olive-light: #7A8C4E;
    --sepia: #3D2B1F;
    --sepia-light: #6B4C3B;
    --warm-white: #FFFDF8;
    --border: rgba(61,43,31,0.12);
  }

  * { font-family: 'DM Sans', sans-serif; }

  .font-display { font-family: 'Playfair Display', Georgia, serif; }

  .bg-texture {
    background-color: var(--cream);
    background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23C4673A' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
  }

  .card-warm {
    background: var(--warm-white);
    border: 1px solid var(--border);
    border-radius: 20px;
    box-shadow: 0 2px 16px rgba(61,43,31,0.06), 0 1px 3px rgba(61,43,31,0.04);
  }

  .card-terra {
    background: var(--terra);
    border-radius: 20px;
    color: white;
  }

  .card-olive {
    background: var(--olive);
    border-radius: 20px;
    color: white;
  }

  .tag-pill {
    display: inline-flex;
    align-items: center;
    padding: 2px 10px;
    border-radius: 100px;
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.02em;
    background: var(--cream-dark);
    color: var(--sepia-light);
    border: 1px solid var(--border);
  }

  .tag-pill-terra {
    background: rgba(196,103,58,0.12);
    color: var(--terra-dark);
    border-color: rgba(196,103,58,0.2);
  }

  .btn-terra {
    background: var(--terra);
    color: white;
    border: none;
    border-radius: 12px;
    padding: 10px 20px;
    font-weight: 600;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.15s ease;
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }
  .btn-terra:hover { background: var(--terra-dark); transform: translateY(-1px); box-shadow: 0 4px 12px rgba(196,103,58,0.3); }
  .btn-terra:disabled { opacity: 0.6; transform: none; cursor: not-allowed; }

  .btn-outline-terra {
    background: transparent;
    color: var(--terra);
    border: 1.5px solid var(--terra);
    border-radius: 12px;
    padding: 10px 20px;
    font-weight: 600;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.15s ease;
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }
  .btn-outline-terra:hover { background: rgba(196,103,58,0.06); }

  .btn-ghost {
    background: transparent;
    color: var(--sepia-light);
    border: none;
    border-radius: 10px;
    padding: 6px 12px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .btn-ghost:hover { background: var(--cream-dark); color: var(--sepia); }

  .input-warm {
    background: var(--cream);
    border: 1.5px solid var(--border);
    border-radius: 10px;
    padding: 9px 14px;
    font-size: 14px;
    color: var(--sepia);
    width: 100%;
    outline: none;
    transition: border-color 0.15s;
    font-family: 'DM Sans', sans-serif;
  }
  .input-warm:focus { border-color: var(--terra-light); }
  .input-warm::placeholder { color: rgba(61,43,31,0.35); }

  .tab-nav {
    display: grid;
    background: var(--warm-white);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 4px;
    gap: 2px;
  }

  .tab-item {
    border: none;
    border-radius: 12px;
    padding: 9px 4px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;
    background: transparent;
    color: var(--sepia-light);
    font-family: 'DM Sans', sans-serif;
  }
  .tab-item.active {
    background: var(--terra);
    color: white;
    font-weight: 600;
    box-shadow: 0 2px 8px rgba(196,103,58,0.25);
  }
  .tab-item:not(.active):hover { background: var(--cream-dark); color: var(--sepia); }

  .recipe-card {
    border: 1.5px solid var(--border);
    border-radius: 16px;
    padding: 14px 16px;
    cursor: pointer;
    transition: all 0.15s;
    background: var(--warm-white);
  }
  .recipe-card:hover { border-color: var(--terra-light); background: var(--cream); transform: translateY(-1px); }
  .recipe-card.selected { border-color: var(--terra); background: rgba(196,103,58,0.04); }

  .day-card {
    border: 1px solid var(--border);
    border-radius: 18px;
    padding: 18px;
    background: var(--warm-white);
  }

  .meal-slot {
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 14px;
    background: var(--cream);
    transition: all 0.15s;
    cursor: pointer;
  }
  .meal-slot:hover { border-color: var(--terra-light); }

  .stat-chip {
    background: var(--cream);
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 14px 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .section-icon {
    width: 38px;
    height: 38px;
    border-radius: 10px;
    background: rgba(196,103,58,0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--terra);
    flex-shrink: 0;
  }

  .divider-ornament {
    display: flex;
    align-items: center;
    gap: 12px;
    color: var(--terra-light);
    margin: 4px 0;
  }
  .divider-ornament::before,
  .divider-ornament::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--border);
  }

  .shopping-category {
    background: var(--warm-white);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 16px;
  }

  .shopping-item {
    background: var(--cream);
    border-radius: 10px;
    padding: 8px 12px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .step-item {
    background: var(--cream);
    border-radius: 12px;
    padding: 14px 16px;
    border-left: 3px solid var(--terra-light);
    position: relative;
  }

  .badge-time {
    background: rgba(92,107,58,0.12);
    color: var(--olive);
    border-radius: 100px;
    padding: 3px 10px;
    font-size: 12px;
    font-weight: 600;
  }

  .select-warm {
    background: var(--cream);
    border: 1.5px solid var(--border);
    border-radius: 10px;
    padding: 9px 14px;
    font-size: 14px;
    color: var(--sepia);
    width: 100%;
    outline: none;
    font-family: 'DM Sans', sans-serif;
    cursor: pointer;
  }
  .select-warm:focus { border-color: var(--terra-light); }

  .checkbox-warm {
    width: 18px;
    height: 18px;
    border-radius: 5px;
    border: 2px solid var(--terra-light);
    cursor: pointer;
    accent-color: var(--terra);
    flex-shrink: 0;
  }

  .slider-warm {
    -webkit-appearance: none;
    width: 100%;
    height: 4px;
    border-radius: 4px;
    background: var(--cream-dark);
    outline: none;
    cursor: pointer;
  }
  .slider-warm::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: var(--terra);
    cursor: pointer;
    box-shadow: 0 2px 6px rgba(196,103,58,0.3);
  }

  .modal-overlay {
    position: fixed;
    inset: 0;
    z-index: 50;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(61,43,31,0.5);
    backdrop-filter: blur(4px);
    padding: 16px;
  }

  .modal-content {
    background: var(--warm-white);
    border-radius: 24px;
    padding: 28px;
    max-width: 560px;
    width: 100%;
    box-shadow: 0 24px 60px rgba(61,43,31,0.2);
  }

  .step-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    border-radius: 50%;
    font-size: 12px;
    font-weight: 700;
    flex-shrink: 0;
  }
  .step-badge.done { background: var(--olive); color: white; }
  .step-badge.active { background: var(--terra); color: white; }
  .step-badge.todo { background: var(--cream-dark); color: var(--sepia-light); }

  .pantry-tag {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: var(--cream-dark);
    border: 1px solid var(--border);
    border-radius: 100px;
    padding: 4px 12px;
    font-size: 13px;
    color: var(--sepia);
  }

  .alert-banner {
    background: linear-gradient(135deg, rgba(196,103,58,0.08), rgba(92,107,58,0.06));
    border: 1px solid rgba(196,103,58,0.2);
    border-radius: 14px;
    padding: 14px 18px;
    display: flex;
    align-items: flex-start;
    gap: 12px;
  }

  label { font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 600; color: var(--sepia); letter-spacing: 0.01em; }

  @keyframes fadeSlideUp {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-in { animation: fadeSlideUp 0.4s ease both; }
  .delay-1 { animation-delay: 0.05s; }
  .delay-2 { animation-delay: 0.1s; }
  .delay-3 { animation-delay: 0.15s; }
  .delay-4 { animation-delay: 0.2s; }

  @keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-8px); }
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.5; transform: scale(0.85); }
  }

  /* ── MOBILE ── */
  @media (max-width: 640px) {
    .mobile-stack { grid-template-columns: 1fr !important; }
    .mobile-hide { display: none !important; }
    .mobile-full { grid-column: 1 / -1 !important; }
    .mobile-pad { padding: 16px !important; }
    .mobile-small-text { font-size: 13px !important; }
    
    .tab-item { font-size: 11px !important; padding: 8px 2px !important; }
    
    .day-card { padding: 12px !important; }
    .meal-slot { padding: 10px !important; }
    
    .card-warm { border-radius: 16px !important; }
    
    .shopping-category { padding: 12px !important; }
    .shopping-item { padding: 6px 10px !important; }
    
    .step-item { padding: 10px 12px !important; }
    
    .modal-content { padding: 20px !important; border-radius: 20px !important; }
  }
`;

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function SectionHeader({ icon, title, subtitle }: { icon: string; title: string; subtitle?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 20 }}>
      <div className="section-icon"><span style={{ fontSize: 18 }}>{icon}</span></div>
      <div>
        <h3 className="font-display" style={{ fontSize: 18, fontWeight: 600, color: "var(--sepia)", margin: 0, lineHeight: 1.3 }}>{title}</h3>
        {subtitle && <p style={{ margin: "3px 0 0", fontSize: 13, color: "var(--sepia-light)", fontWeight: 400 }}>{subtitle}</p>}
      </div>
    </div>
  );
}

function TagPill({ children, terra }: { children: React.ReactNode; terra?: boolean }) {
  return <span className={`tag-pill${terra ? " tag-pill-terra" : ""}`}>{children}</span>;
}

function TimeTag({ minutes }: { minutes: number }) {
  return <span className="badge-time">⏱ {minutes} min</span>;
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export default function SettimanaSmartMVP() {
  const [preferences, setPreferences] = useState<Preferences>(() => {
    const fallback: Preferences = { people: 2, diet: "mediterranea", maxTime: 20, budget: 60, skill: "beginner", mealsPerDay: "dinner", leftoversAllowed: true, exclusionsText: "", exclusions: [], sundaySpecial: true, sundayDinnerLeftovers: true, skippedMeals: [], coreIngredients: [] };
    if (typeof window === "undefined") return fallback;
    try { const saved = localStorage.getItem("ss_preferences_v1"); return saved ? { ...fallback, ...JSON.parse(saved) } : fallback; } catch { return fallback; }
  });
  const [pantryInput, setPantryInput] = useState({ name: "", quantity: "", unit: "g" });
  const [pantryItems, setPantryItems] = useState<PantryItem[]>(() => {
    const fallback = [{ name: "pasta", quantity: 500, unit: "g" }, { name: "olio extravergine", quantity: 200, unit: "ml" }, { name: "uova fresche", quantity: 2, unit: "pezzi" }];
    if (typeof window === "undefined") return fallback;
    try { const saved = localStorage.getItem("ss_pantry_v1"); return saved ? JSON.parse(saved) : fallback; } catch { return fallback; }
  });
  const [seed, setSeed] = useState(() => { if (typeof window === "undefined") return 1; const saved = localStorage.getItem("ss_seed_v1"); return saved ? Number(saved) : 1; });
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastMessage, setLastMessage] = useState("Pronto a generare");
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [showGeneratedBanner, setShowGeneratedBanner] = useState(false);
  const [herbsToCheck, setHerbsToCheck] = useState<string[]>([]);
  const [herbAnswers, setHerbAnswers] = useState<Record<string, boolean>>({});
  const [showHerbBanner, setShowHerbBanner] = useState(false);
  const [swappedDays, setSwappedDays] = useState<Set<string>>(new Set());
  const [extraShoppingItems, setExtraShoppingItems] = useState<string[]>([]);
  const [extraShoppingInput, setExtraShoppingInput] = useState("");
  const [checkedShoppingItems, setCheckedShoppingItems] = useState<Set<string>>(new Set());
  const [freezeReminderTimers, setFreezeReminderTimers] = useState<number[]>([]);
  // ── AUTH STATE ──────────────────────────────────────────────────────────
  const { sbClient, user, showAuthModal, setShowAuthModal, syncStatus, setSyncStatus } = useAuth();

  const [isMounted, setIsMounted] = useState(false);
  const recipeDetailRef = useRef<HTMLDivElement>(null);
  useEffect(() => { setIsMounted(true); }, []);



  // Carica dati dal cloud
  const _applyCloudData_disabled = (_data: Record<string, unknown>) => { /* disabled */ };

  const _loadCloudData_disabled = async (_userId: string) => { /* disabled */ };

  // Carica dati cloud quando sbClient e user sono disponibili
  // (deve stare dopo la dichiarazione di loadCloudData)
  useEffect(() => {
    if (sbClient && user) (() => {})();
  }, [sbClient, user]);


  const [onboardingDone, setOnboardingDone] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("ss_onboarding_done") === "1";
  });
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [tutorialDone, setTutorialDone] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("ss_tutorial_done") === "1";
  });
  const [tutorialStep, setTutorialStep] = useState(0);





  const [manualOverrides, setManualOverrides] = useState<ManualOverrides>(() => {
    if (typeof window === "undefined") return {};
    try { const saved = localStorage.getItem("ss_manual_overrides_v1"); return saved ? JSON.parse(saved) : {}; } catch { return {}; }
  });
  const [learning, setLearning] = useState<PreferenceLearning>(() => {
    const fallback: PreferenceLearning = { keptRecipeIds: {}, regeneratedRecipeIds: {}, likedCategories: {}, dislikedCategories: {}, likedIngredients: {}, dislikedIngredients: {} };
    if (typeof window === "undefined") return fallback;
    try { const saved = localStorage.getItem("ss_learning_v1"); return saved ? { ...fallback, ...JSON.parse(saved) } : fallback; } catch { return fallback; }
  });

  // Auto-sync su cloud quando cambiano preferenze, dispensa, seed (disabilitato)
  useEffect(() => { /* sync disabilitato */ }, [preferences, user]);
  useEffect(() => { /* sync disabilitato */ }, [pantryItems, user]);
  useEffect(() => { /* sync disabilitato */ }, [seed, manualOverrides, learning, user]);
  const [activeTab, setActiveTab] = useState("planner");
  const [prepTime, setPrepTime] = useState("18:30");
  const [prepReminderMessage, setPrepReminderMessage] = useState("È ora di iniziare a cucinare");
  const [scheduledReminderText, setScheduledReminderText] = useState("");
  const [availableVoices, setAvailableVoices] = useState<VoiceOption[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState("");
  const [runningRecipe, setRunningRecipe] = useState<Recipe | null>(null);
  const [runningStepIndex, setRunningStepIndex] = useState(0);
  const [currentStepChecked, setCurrentStepChecked] = useState(false);
  const reminderTimerRef = useRef<number | null>(null);
  const tutorialStepRef = useRef(0);
  useEffect(() => { tutorialStepRef.current = tutorialStep; }, [tutorialStep]);

  const computedPrefs = useMemo(() => ({
    ...preferences,
    coreIngredients: preferences.coreIngredients.map((x) => normalize(x)),
    exclusions: preferences.exclusionsText.split(",").map((x) => normalize(x)).filter(Boolean),
  }), [preferences]);
  const basePlan = useMemo(() => buildPlan(computedPrefs, pantryItems, seed, learning), [computedPrefs, pantryItems, seed]);

  const generated = useMemo(() => {
    if (!Object.keys(manualOverrides).length) return basePlan;
    const rawDays = basePlan.days.map((day) => { const override = manualOverrides[day.day]; return override ? { ...day, ...override } : day; });
    const usedIds = new Set<string>();
    const dedupedDays = rawDays.map((day, idx) => {
      let lunch = day.lunch; let dinner = day.dinner;
      if (lunch && usedIds.has(lunch.id)) lunch = null;
      if (lunch) usedIds.add(lunch.id);
      if (dinner && usedIds.has(dinner.id)) {
        const replacement = seededShuffle(RECIPE_LIBRARY.filter((rec) => { if (!rec.diet.includes(computedPrefs.diet)) return false; if (rec.time > computedPrefs.maxTime) return false; if (computedPrefs.exclusions.some((ex) => rec.ingredients.some((i) => normalize(i.name).includes(ex)))) return false; if (usedIds.has(rec.id)) return false; if (rec.tags.includes("speciale") || rec.tags.includes("domenica")) return false; return true; }), seed + idx + 999)[0] || null;
        dinner = replacement;
      }
      if (dinner) usedIds.add(dinner.id);
      return { ...day, lunch, dinner };
    });
    const planMeals = dedupedDays.flatMap((day) => [day.lunch, day.dinner].filter(Boolean)) as Recipe[];
    const shopping = aggregateShopping(planMeals, pantryItems, computedPrefs.people);
    const stats = computeStats(planMeals, shopping);
    // Ricalcola freezeItems sui giorni aggiornati (include le sostituzioni manuali)
    const computeFreeze = (planDays: DayPlan[], pref: Preferences): FreezeItem[] => {
      const dayMap2: Record<string, {dayIndex: number; qty: number; unit: string; recipe: string}[]> = {};
      planDays.forEach((day, dayIndex) => {
        [day.lunch, day.dinner].filter(Boolean).forEach((meal) => {
          if ((meal as Recipe).tags?.includes('avanzi')) return;
          (meal as Recipe).ingredients.forEach((ingr) => {
            const k = normalize(ingr.name);
            if (!FREEZE_CANDIDATES.includes(k)) return;
            if (!dayMap2[k]) dayMap2[k] = [];
            const sq = scaleQty(ingr.qty, (meal as Recipe).servings, pref.people);
            dayMap2[k].push({ dayIndex, qty: sq, unit: ingr.unit, recipe: (meal as Recipe).title });
          });
        });
      });
      const items: FreezeItem[] = [];
      Object.entries(dayMap2).forEach(([k, uses]) => {
        uses.sort((a, b) => a.dayIndex - b.dayIndex);
        uses.filter((u) => u.dayIndex > 1).forEach((lateUse) => {
          items.push({
            name: k, unit: lateUse.unit,
            qtyToFreeze: Math.round(lateUse.qty * 10) / 10,
            useOnDay: DAYS[lateUse.dayIndex],
            useOnDayIndex: lateUse.dayIndex,
            recipe: lateUse.recipe,
          });
        });
      });
      return items;
    };
    return { ...basePlan, days: dedupedDays, shopping, stats, freezeItems: computeFreeze(dedupedDays, computedPrefs) };
  }, [basePlan, manualOverrides, pantryItems, computedPrefs.people, computedPrefs.diet, computedPrefs.maxTime, computedPrefs.exclusions, seed]);

  useEffect(() => { const first = preferences.mealsPerDay === "both" ? generated.days[0]?.lunch || generated.days[0]?.dinner : generated.days[0]?.dinner; setSelectedRecipe(first || null); }, [generated, preferences.mealsPerDay]);
  useEffect(() => { if (typeof window !== "undefined") localStorage.setItem("ss_preferences_v1", JSON.stringify(preferences)); }, [preferences]);
  useEffect(() => { if (typeof window !== "undefined") localStorage.setItem("ss_pantry_v1", JSON.stringify(pantryItems)); }, [pantryItems]);
  useEffect(() => { if (typeof window !== "undefined") localStorage.setItem("ss_seed_v1", String(seed)); }, [seed]);
  useEffect(() => { if (typeof window !== "undefined") localStorage.setItem("ss_manual_overrides_v1", JSON.stringify(manualOverrides)); }, [manualOverrides]);
  useEffect(() => { if (typeof window !== "undefined") localStorage.setItem("ss_learning_v1", JSON.stringify(learning)); }, [learning]);

  useEffect(() => {
    const loadVoices = () => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
      const voices = window.speechSynthesis.getVoices().map((v) => ({ name: v.name, lang: v.lang }));
      setAvailableVoices(voices);
      if (!selectedVoiceName && voices.length) { const it = voices.find((v) => v.lang.toLowerCase().startsWith("it")); setSelectedVoiceName((it || voices[0]).name); }
    };
    loadVoices();
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => { if (reminderTimerRef.current) window.clearTimeout(reminderTimerRef.current); if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.onvoiceschanged = null; };
  }, [selectedVoiceName]);

  const addPantryItem = () => { if (!pantryInput.name.trim()) return; setPantryItems((prev) => [...prev, { name: pantryInput.name.trim(), quantity: Number(pantryInput.quantity || 0), unit: pantryInput.unit }]); setPantryInput({ name: "", quantity: "", unit: "g" }); };
  const removePantryItem = (index: number) => setPantryItems((prev) => prev.filter((_, i) => i !== index));
  const toggleSkippedMeal = (value: string) => setPreferences((p) => ({ ...p, skippedMeals: p.skippedMeals.includes(value) ? p.skippedMeals.filter((x) => x !== value) : [...p.skippedMeals, value] }));

  const PERISHABLE_HERBS = ["basilico fresco","menta fresca","prezzemolo fresco","erba cipollina","salvia fresca","timo fresco","rosmarino fresco","menta o basilico fresco","basilico e menta freschi","aneto","erba cipollina o aneto"];

  const completeTutorial = () => {
    localStorage.setItem("ss_tutorial_done", "1");
    setTutorialDone(true);
  };

  const TOUR_STEPS = [
    {
      tab: "planner",
      emoji: "👋",
      title: "Benvenuto in Settimana Smart!",
      body: "Questa app pianifica i tuoi pasti settimanali, crea la lista della spesa e ti guida in cucina — tutto in automatico.",
      instruction: null,
      waitFor: null, // step intro: ha solo il bottone Avanti
      highlight: null,
      position: "bottom",
    },
    {
      tab: "planner",
      emoji: "🎛️",
      title: "Il Planner",
      body: "Qui imposti le tue preferenze: quante persone, che dieta segui, quanto tempo hai per cucinare. Puoi cambiarle quando vuoi.",
      instruction: "👇 Premi 'Genera piano' per creare la tua prima settimana",
      waitFor: "generate", // si sblocca quando l'utente clicca Genera
      highlight: "btn-genera",
      position: "top",
    },
    {
      tab: "week",
      emoji: "📅",
      title: "La tua settimana",
      body: "Ecco il piano generato! Ogni giorno ha pranzo e cena bilanciati. Il sistema rispetta la deperibilità degli alimenti — il pesce fresco è sempre a inizio settimana.",
      instruction: "👇 Tocca uno dei piatti per vedere la ricetta",
      waitFor: "recipe_selected",
      highlight: "meal-slot",
      position: "top",
    },
    {
      tab: "week",
      emoji: "⇅",
      title: "Personalizza i pasti",
      body: "Puoi rigenerare un singolo piatto con ↺, oppure invertire pranzo e cena con il bottone ⇅ tra i due slot.",
      instruction: "👇 Premi ↺ su uno dei piatti per rigenerarlo",
      waitFor: "regenerated",
      highlight: "rigenera",
      position: "top",
    },
    {
      tab: "shopping",
      emoji: "🛒",
      title: "La lista della spesa",
      body: "Tutto quello che ti serve per la settimana, organizzato per categoria — Verdure, Proteine, Latticini, Cereali, Dispensa. Già depurato da quello che hai in casa.",
      instruction: "👇 Spunta un ingrediente come se fossi al supermercato",
      waitFor: "item_checked",
      highlight: "checkbox-spesa",
      position: "top",
    },
    {
      tab: "recipes",
      emoji: "📖",
      title: "Il procedimento guidato",
      body: "Ogni ricetta ha dosi precise e passaggi dettagliati. Avvia il procedimento guidato e spunta ogni step con il quadratino fino alla fine.",
      instruction: "👆 Seleziona una ricetta, premi 'Avvia procedimento guidato' e completala fino a Fine!",
      waitFor: "guided_completed",
      highlight: "btn-guida",
      position: "top",
    },
    {
      tab: "planner",
      emoji: "🧊",
      title: "La dispensa",
      body: "Nell'ultima sezione del Planner trovi la Dispensa. Aggiungi gli ingredienti che hai già in casa — olio, pasta, uova — e il sistema li escluderà automaticamente dalla lista della spesa ogni settimana. Sei pronto!",
      instruction: null,
      waitFor: null,
      highlight: null,
      position: "bottom",
    },
  ];

  const tourAdvance = (action: string) => {
    if (tutorialDone) return;
    const currentStep = tutorialStepRef.current;
    const step = TOUR_STEPS[currentStep];
    if (!step || step.waitFor !== action) return;
    const delay = ["regenerated", "item_checked"].includes(action) ? 1500 : 0;
    setTimeout(() => {
      const idx = tutorialStepRef.current;
      if (idx >= TOUR_STEPS.length - 1) { completeTutorial(); return; }
      const next = TOUR_STEPS[idx + 1];
      setActiveTab(next.tab);
      setTutorialStep(idx + 1);
      tutorialStepRef.current = idx + 1;
    }, delay);
  };

  const regenerate = () => {
    tourAdvance("generate");
    setIsGenerating(true); setShowGeneratedBanner(false); setShowHerbBanner(false); setLastMessage("Generazione in corso...");
    setTimeout(() => {
      // Calcola le erbe usate nel piano corrente prima di rigenerare
      const usedHerbs = Array.from(new Set(
        generated.days.flatMap((d) => [d.lunch, d.dinner].filter(Boolean) as Recipe[])
          .flatMap((r) => r.ingredients)
          .filter((i) => PERISHABLE_HERBS.includes(normalize(i.name)))
          .map((i) => i.name)
      ));
      if (usedHerbs.length > 0) {
        setHerbsToCheck(usedHerbs);
        setHerbAnswers({});
        setShowHerbBanner(true);
      }
      setManualOverrides({});
      setSwappedDays(new Set());
      setCheckedShoppingItems(new Set());
      setExtraShoppingItems([]);
      setSeed((prev) => prev + 1);
      setIsGenerating(false);
      setShowGeneratedBanner(true);
      setLastMessage(`Piano generato alle ${new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}`);
    }, 500);
  };

  const learnFromRecipe = (recipeItem: Recipe | null, action: "keep" | "regenerate") => {
    if (!recipeItem) return;
    const category = getRecipeCategory(recipeItem);
    setLearning((prev) => {
      const next: PreferenceLearning = { keptRecipeIds: { ...prev.keptRecipeIds }, regeneratedRecipeIds: { ...prev.regeneratedRecipeIds }, likedCategories: { ...prev.likedCategories }, dislikedCategories: { ...prev.dislikedCategories }, likedIngredients: { ...prev.likedIngredients }, dislikedIngredients: { ...prev.dislikedIngredients } };
      if (action === "keep") { next.keptRecipeIds[recipeItem.id] = (next.keptRecipeIds[recipeItem.id] || 0) + 1; next.likedCategories[category] = (next.likedCategories[category] || 0) + 1; recipeItem.ingredients.forEach((ingr) => { const k = normalize(ingr.name); next.likedIngredients[k] = (next.likedIngredients[k] || 0) + 1; }); }
      else { next.regeneratedRecipeIds[recipeItem.id] = (next.regeneratedRecipeIds[recipeItem.id] || 0) + 1; next.dislikedCategories[category] = (next.dislikedCategories[category] || 0) + 1; recipeItem.ingredients.forEach((ingr) => { const k = normalize(ingr.name); next.dislikedIngredients[k] = (next.dislikedIngredients[k] || 0) + 1; }); }
      return next;
    });
  };

  const goToRecipe = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setActiveTab("recipes");
    setTimeout(() => {
      recipeDetailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  // Avanza il tour quando l'utente compie l'azione richiesta

  const swapMeals = (dayName: string) => {
    setSwappedDays((prev) => {
      const next = new Set(prev);
      if (next.has(dayName)) next.delete(dayName);
      else next.add(dayName);
      return next;
    });
  };

  const regenerateSingleMeal = (dayName: string, slot: MealSlot) => {
    const currentDay = generated.days.find((d) => d.day === dayName);
    const currentRecipe = currentDay?.[slot] || null;
    learnFromRecipe(currentRecipe, "regenerate");
    const siblingRecipe = slot === "lunch" ? currentDay?.dinner || null : currentDay?.lunch || null;
    const siblingCarb = siblingRecipe?.ingredients.find((i) => i.category === "Cereali")?.name || null;
    const siblingCategory = siblingRecipe ? getRecipeCategory(siblingRecipe) : null;
    const usedElsewhere = new Set(generated.days.flatMap((d) => [d.lunch, d.dinner]).filter(Boolean).filter((meal) => meal?.id !== currentRecipe?.id).map((meal) => (meal as Recipe).id));
    const pool = RECIPE_LIBRARY.filter((rec) => {
      if (!rec.diet.includes(computedPrefs.diet)) return false;
      const isSpecial = dayName === "Dom" && slot === "lunch" && preferences.sundaySpecial;
      if (rec.time > (isSpecial ? Math.max(computedPrefs.maxTime, 60) : computedPrefs.maxTime)) return false;
      if (!isSpecial && (rec.tags.includes("speciale") || rec.tags.includes("domenica"))) return false;
      if (computedPrefs.exclusions.some((ex) => rec.ingredients.some((i) => normalize(i.name).includes(ex)))) return false;
      if (usedElsewhere.has(rec.id) || rec.id === currentRecipe?.id) return false;
      const carb = rec.ingredients.find((i) => i.category === "Cereali")?.name || null;
      if (slot === "dinner" && siblingCarb && carb && normalize(carb) === normalize(siblingCarb)) return false;
      if (slot === "dinner" && siblingCategory && getRecipeCategory(rec) === siblingCategory) return false;
      return true;
    });
    const scored = seededShuffle(pool, seed + dayName.length + slot.length + Object.keys(manualOverrides).length).map((rec) => { let score = 0; if (slot === "dinner") { if (!rec.ingredients.some((i) => i.category === "Cereali")) score += 8; if (["pesce","legumi","uova","pollo","verdure"].includes(getRecipeCategory(rec))) score += 6; } if (computedPrefs.coreIngredients.length) score += rec.ingredients.filter((i) => computedPrefs.coreIngredients.includes(normalize(i.name))).length * 20; return { recipe: rec, score }; }).sort((a, b) => b.score - a.score);
    const nextRecipe = scored[0]?.recipe || null;
    if (!nextRecipe) { setLastMessage(`Nessuna alternativa per ${dayName}`); return; }
    setManualOverrides((prev) => ({ ...prev, [dayName]: { ...(prev[dayName] || {}), [slot]: nextRecipe } }));
    setSelectedRecipe(nextRecipe);
    setLastMessage(`Rigenerato ${slot === "lunch" ? "pranzo" : "cena"} di ${dayName}`);
    setShowGeneratedBanner(true);
    tourAdvance("regenerated");
  };

  const playReminderPreview = () => { if (typeof window === "undefined" || !("speechSynthesis" in window)) return; const u = new SpeechSynthesisUtterance(prepReminderMessage || "È ora di iniziare a cucinare"); const v = window.speechSynthesis.getVoices().find((vx) => vx.name === selectedVoiceName); if (v) u.voice = v; u.lang = v?.lang || "it-IT"; window.speechSynthesis.cancel(); window.speechSynthesis.speak(u); };
  const scheduleReminder = async () => { if (typeof window === "undefined") return; if (reminderTimerRef.current) window.clearTimeout(reminderTimerRef.current); const [h, m] = prepTime.split(":").map(Number); const now = new Date(); const target = new Date(); target.setHours(h, m, 0, 0); if (target.getTime() <= now.getTime()) target.setDate(target.getDate() + 1); const delay = target.getTime() - now.getTime(); if (typeof Notification !== "undefined" && Notification.permission === "default") { try { await Notification.requestPermission(); } catch {} } reminderTimerRef.current = window.setTimeout(() => { const msg = prepReminderMessage || "È ora di iniziare a cucinare"; if (typeof Notification !== "undefined" && Notification.permission === "granted") new Notification("Settimana Smart", { body: msg }); if ("speechSynthesis" in window) { const u = new SpeechSynthesisUtterance(msg); const v = window.speechSynthesis.getVoices().find((vx) => vx.name === selectedVoiceName); if (v) u.voice = v; u.lang = v?.lang || "it-IT"; window.speechSynthesis.cancel(); window.speechSynthesis.speak(u); } window.alert(msg); }, delay); setScheduledReminderText(`Promemoria impostato per le ${prepTime}`); };

  const startRecipeFlow = (rec: Recipe | null) => { if (!rec) return; setRunningRecipe(rec); setRunningStepIndex(0); setCurrentStepChecked(false); };
  const closeRecipeFlow = (completed = false) => { 
    setRunningRecipe(null); 
    setRunningStepIndex(0); 
    setCurrentStepChecked(false);
    // Chiamiamo tourAdvance dopo che React ha aggiornato lo stato del modale
    if (completed) setTimeout(() => tourAdvance("guided_completed"), 50);
  };
  const advanceRecipeFlow = () => { if (!runningRecipe) return; if (runningStepIndex >= runningRecipe.steps.length - 1) { const t = runningRecipe.title; closeRecipeFlow(true); setLastMessage(`Completato: ${t}`); return; } setRunningStepIndex((p) => p + 1); setCurrentStepChecked(false); };
  const completeCurrentStep = (checked: boolean) => { setCurrentStepChecked(checked); if (!checked) return; window.setTimeout(() => advanceRecipeFlow(), 250); };
  const meals = generated.days.flatMap((day) => [day.lunch, day.dinner].filter(Boolean)) as Recipe[];
  const scheduleFreezeReminders = (items: FreezeItem[]) => {
    // Cancella timer precedenti
    freezeReminderTimers.forEach((t) => window.clearTimeout(t));
    const newTimers: number[] = [];
    items.forEach((item) => {
      // La sera prima alle 20:00
      const now = new Date();
      const reminderDay = item.useOnDayIndex - 1; // giorno precedente
      const target = new Date();
      // Calcola quanti giorni mancano al giorno del promemoria
      const todayJS = now.getDay(); // 0=Dom
      const targetDayJS = reminderDay === 0 ? 1 : reminderDay === 6 ? 0 : reminderDay + 1; // converti Lun=0 a JS
      let daysUntil = (targetDayJS - todayJS + 7) % 7;
      if (daysUntil === 0 && now.getHours() >= 20) daysUntil = 7;
      target.setDate(target.getDate() + daysUntil);
      target.setHours(20, 0, 0, 0);
      const delay = target.getTime() - now.getTime();
      if (delay > 0) {
        const msg = `⏰ Ricordati di mettere a scongelare ${item.name} (${item.qtyToFreeze}${item.unit}) per domani — serve per: ${item.recipe}`;
        const t = window.setTimeout(() => {
          if (typeof Notification !== "undefined" && Notification.permission === "granted") {
            new Notification("Settimana Smart — Scongela!", { body: msg });
          }
          window.alert(msg);
        }, delay);
        newTimers.push(t);
      }
    });
    setFreezeReminderTimers(newTimers);
  };

  const confirmWeek = () => {
    meals.forEach((m) => learnFromRecipe(m, "keep"));
    setLastMessage("Settimana confermata ✓");
    setShowGeneratedBanner(true);
    // Programma i promemoria scongelo per tutti gli items da congelare
    if (generated.freezeItems.length > 0) scheduleFreezeReminders(generated.freezeItems);
  };


  const TABS = [
    { id: "planner", label: "Planner" },
    { id: "week", label: "Settimana" },
    { id: "shopping", label: "Spesa" },
    { id: "recipes", label: "Ricette" },
    { id: "reminder", label: "Reminder" },
  ];

  const categoryEmoji: Record<string, string> = { Verdure: "🥦", Proteine: "🥩", Latticini: "🧀", Cereali: "🌾", Dispensa: "🫙" };

  const completeOnboarding = () => {
    localStorage.setItem("ss_onboarding_done", "1");
    setOnboardingDone(true);
    setSeed((prev) => prev + 1);
    setShowGeneratedBanner(true);
    setLastMessage("Piano generato — benvenuto!");
    setActiveTab("week");
    // Mostra tutorial dopo onboarding
    setTutorialDone(false);
    setTutorialStep(0);
  };


  // ── ONBOARDING ──
  if (isMounted && !onboardingDone) {
    const steps = [
      {
        emoji: "👥",
        title: "Per quante persone cucini?",
        subtitle: "Adatteremo le dosi e la lista della spesa",
        content: (
          <div style={{ display: "grid", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20 }}>
              <button onClick={() => setPreferences((p) => ({ ...p, people: Math.max(1, p.people - 1) }))}
                style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--cream-dark)", border: "2px solid var(--border)", fontSize: 24, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "var(--sepia)" }}>−</button>
              <div style={{ textAlign: "center", minWidth: 100 }}>
                <div style={{ fontSize: 52, fontWeight: 800, color: "var(--terra)", fontFamily: "'Playfair Display', serif", lineHeight: 1 }}>{preferences.people}</div>
                <div style={{ fontSize: 14, color: "var(--sepia-light)", marginTop: 4 }}>{preferences.people === 1 ? "persona" : "persone"}</div>
              </div>
              <button onClick={() => setPreferences((p) => ({ ...p, people: Math.min(12, p.people + 1) }))}
                style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--terra)", border: "none", fontSize: 24, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "white" }}>+</button>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <button key={n} onClick={() => setPreferences((p) => ({ ...p, people: n }))}
                  style={{ width: 40, height: 40, borderRadius: "50%", background: preferences.people === n ? "var(--terra)" : "var(--cream)", border: `2px solid ${preferences.people === n ? "var(--terra)" : "var(--border)"}`, fontSize: 14, fontWeight: 700, cursor: "pointer", color: preferences.people === n ? "white" : "var(--sepia)", transition: "all 0.15s" }}>{n}</button>
              ))}
            </div>
            <button onClick={() => setOnboardingStep(1)}
              style={{ background: "var(--terra)", border: "none", borderRadius: 14, padding: "14px", color: "white", fontWeight: 700, fontSize: 16, cursor: "pointer", marginTop: 4 }}>
              Continua →
            </button>
          </div>
        ),
      },
      {
        emoji: "🥗",
        title: "Che tipo di dieta segui?",
        subtitle: "Mostreremo solo ricette adatte a te",
        content: (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {([
              { value: "mediterranea", emoji: "🫒", label: "Mediterranea", desc: "Pasta, pesce, carne, verdure" },
              { value: "onnivora", emoji: "🥩", label: "Onnivora", desc: "Tutto, senza restrizioni" },
              { value: "vegetariana", emoji: "🥦", label: "Vegetariana", desc: "No carne e pesce" },
              { value: "vegana", emoji: "🌱", label: "Vegana", desc: "Solo vegetale" },
            ] as { value: Diet; emoji: string; label: string; desc: string }[]).map((opt) => (
              <button key={opt.value} onClick={() => { setPreferences((p) => ({ ...p, diet: opt.value })); setOnboardingStep(2); }}
                style={{ background: preferences.diet === opt.value ? "rgba(196,103,58,0.08)" : "var(--cream)", border: `2px solid ${preferences.diet === opt.value ? "var(--terra)" : "var(--border)"}`, borderRadius: 16, padding: "18px 16px", cursor: "pointer", textAlign: "left", transition: "all 0.15s" }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>{opt.emoji}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--sepia)", marginBottom: 4 }}>{opt.label}</div>
                <div style={{ fontSize: 12, color: "var(--sepia-light)" }}>{opt.desc}</div>
              </button>
            ))}
          </div>
        ),
      },
      {
        emoji: "⏱",
        title: "Quanto tempo hai per cucinare?",
        subtitle: "Selezioneremo ricette adatte ai tuoi ritmi",
        content: (
          <div style={{ display: "grid", gap: 10 }}>
            {([
              { time: 15, emoji: "⚡", label: "Velocissimo", desc: "Max 15 minuti — arrivi a casa distrutto" },
              { time: 20, emoji: "🏃", label: "Rapido", desc: "Max 20 minuti — la norma nei giorni lavorativi" },
              { time: 30, emoji: "🍳", label: "Normale", desc: "Max 30 minuti — hai un po' di tempo" },
              { time: 45, emoji: "👨‍🍳", label: "Con calma", desc: "Max 45 minuti — quando hai voglia di cucinare" },
            ]).map((opt) => (
              <button key={opt.time} onClick={() => { setPreferences((p) => ({ ...p, maxTime: opt.time })); completeOnboarding(); }}
                style={{ background: preferences.maxTime === opt.time ? "rgba(196,103,58,0.08)" : "var(--cream)", border: `2px solid ${preferences.maxTime === opt.time ? "var(--terra)" : "var(--border)"}`, borderRadius: 16, padding: "16px 18px", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 16, transition: "all 0.15s" }}>
                <span style={{ fontSize: 28 }}>{opt.emoji}</span>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "var(--sepia)" }}>{opt.label}</div>
                  <div style={{ fontSize: 13, color: "var(--sepia-light)", marginTop: 2 }}>{opt.desc}</div>
                </div>
              </button>
            ))}
          </div>
        ),
      },
    ];

    const step = steps[onboardingStep];

    return (
      <>
        <style>{designTokens}</style>
        <div className="bg-texture" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div className="card-warm animate-in" style={{ maxWidth: 480, width: "100%", padding: "clamp(20px, 6vw, 36px)" }}>
            {/* Progress dots */}
            <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 28 }}>
              {steps.map((_, i) => (
                <div key={i} style={{ width: i === onboardingStep ? 24 : 8, height: 8, borderRadius: 100, background: i <= onboardingStep ? "var(--terra)" : "var(--cream-dark)", transition: "all 0.3s" }} />
              ))}
            </div>
            <div style={{ textAlign: "center", marginBottom: 28 }}>
              <div style={{ fontSize: 52, marginBottom: 12 }}>{step.emoji}</div>
              <h2 className="font-display" style={{ margin: "0 0 8px", fontSize: 24, fontWeight: 700, color: "var(--sepia)" }}>{step.title}</h2>
              <p style={{ margin: 0, fontSize: 14, color: "var(--sepia-light)" }}>{step.subtitle}</p>
            </div>
            {step.content}
            {onboardingStep > 0 && (
              <button className="btn-ghost" onClick={() => setOnboardingStep((p) => p - 1)} style={{ marginTop: 16, width: "100%", justifyContent: "center" }}>← indietro</button>
            )}
          </div>
        </div>
      </>
    );
  }


  return (
    <>
      <style>{designTokens}</style>
      {/* ── AUTH MODAL ── */}
      {/* auth modal rimosso */}

      {/* ── TOUR INTERATTIVO ── */}
      {isMounted && !tutorialDone && (() => {
        const step = TOUR_STEPS[tutorialStep];
        const isIntro = step.waitFor === null;
        const advanceStep = () => {
          if (tutorialStep >= TOUR_STEPS.length - 1) { completeTutorial(); return; }
          const next = TOUR_STEPS[tutorialStep + 1];
          setActiveTab(next.tab);
          setTutorialStep((p) => p + 1);
        };
        return (
          <>
            {/* Overlay semi-trasparente — l'app è usabile */}
            <div style={{ position: "fixed", inset: 0, zIndex: 90, pointerEvents: "none", background: "rgba(61,43,31,0.18)" }} />

            {/* Pannello — in alto o in basso secondo lo step */}
            <div style={{ position: "fixed", ...(step.position === "top" ? { top: 0, left: 0, right: 0, padding: "12px 12px 0" } : { bottom: 0, left: 0, right: 0, padding: "0 12px 12px" }), zIndex: 100 }}>
              <div style={{ maxWidth: 560, margin: "0 auto", background: "var(--warm-white)", borderRadius: step.position === "top" ? "14px 14px 20px 20px" : "20px 20px 14px 14px", boxShadow: step.position === "top" ? "0 8px 40px rgba(61,43,31,0.22)" : "0 -8px 40px rgba(61,43,31,0.22)", overflow: "hidden" }}>
                
                {/* Progress bar */}
                <div style={{ height: 3, background: "var(--cream-dark)" }}>
                  <div style={{ height: "100%", background: "var(--terra)", width: `${((tutorialStep + 1) / TOUR_STEPS.length) * 100}%`, transition: "width 0.4s ease" }} />
                </div>

                <div style={{ padding: "14px 18px 16px" }}>
                  {/* Header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "var(--terra)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      {tutorialStep + 1} / {TOUR_STEPS.length}
                    </span>
                    <button onClick={completeTutorial} style={{ background: "none", border: "none", fontSize: 12, color: "var(--sepia-light)", cursor: "pointer", fontWeight: 500, padding: "4px 8px" }}>
                      Salta il tour ×
                    </button>
                  </div>

                  {/* Contenuto step */}
                  <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 12 }}>
                    <span style={{ fontSize: 30, lineHeight: 1, flexShrink: 0 }}>{step.emoji}</span>
                    <div>
                      <p style={{ margin: "0 0 5px", fontWeight: 700, fontSize: 15, color: "var(--sepia)", fontFamily: "'Playfair Display', serif" }}>{step.title}</p>
                      <p style={{ margin: 0, fontSize: 13, color: "var(--sepia-light)", lineHeight: 1.55 }}>{step.body}</p>
                    </div>
                  </div>

                  {/* Istruzione azione — se c'è */}
                  {step.instruction && (
                    <div style={{ background: "rgba(196,103,58,0.08)", border: "1px solid rgba(196,103,58,0.2)", borderRadius: 10, padding: "8px 12px", marginBottom: 12 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--terra)" }}>{step.instruction}</p>
                    </div>
                  )}

                  {/* Bottone avanti — solo per step senza azione da compiere */}
                  {isIntro && (
                    <button className="btn-terra" style={{ width: "100%", justifyContent: "center" }} onClick={advanceStep}>
                      Avanti →
                    </button>
                  )}

                  {/* Messaggio attesa azione */}
                  {!isIntro && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, opacity: 0.6 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--terra)", animation: "pulse 1.2s infinite" }} />
                      <span style={{ fontSize: 12, color: "var(--sepia-light)" }}>In attesa che tu completi l'azione…</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Freccia rimbalzante — punta verso dove agire */}
            {step.highlight && step.position === "top" && (
              <div style={{ position: "fixed", top: 170, left: "50%", transform: "translateX(-50%)", zIndex: 95, textAlign: "center", pointerEvents: "none" }}>
                <div style={{ animation: "bounce 0.8s infinite", fontSize: 28 }}>👇</div>
              </div>
            )}
            {step.highlight && step.position === "bottom" && (
              <div style={{ position: "fixed", bottom: 170, left: "50%", transform: "translateX(-50%)", zIndex: 95, textAlign: "center", pointerEvents: "none" }}>
                <div style={{ animation: "bounce 0.8s infinite", fontSize: 28 }}>👆</div>
              </div>
            )}
          </>
        );
      })()}
      <div className="bg-texture" style={{ minHeight: "100vh", paddingBottom: 60 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "clamp(14px, 4vw, 28px) clamp(12px, 4vw, 20px)" }}>

          {/* ── HEADER ── */}
          <div className="animate-in mobile-stack" style={{ display: "grid", gridTemplateColumns: "1fr auto", alignItems: "start", gap: 12, marginBottom: 20 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 6 }}>
                <div style={{ width: 52, height: 52, borderRadius: 16, background: "var(--terra)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, boxShadow: "0 4px 16px rgba(196,103,58,0.35)" }}>🍳</div>
                <div>
                  <h1 className="font-display" style={{ fontSize: "clamp(22px, 6vw, 32px)", fontWeight: 700, color: "var(--sepia)", margin: 0, lineHeight: 1.1 }}>Settimana Smart</h1>
                  <p style={{ margin: 0, fontSize: 14, color: "var(--sepia-light)", fontWeight: 400 }}>Meal planning · {RECIPE_LIBRARY.length} ricette con istruzioni dettagliate</p>
                </div>
              </div>
            </div>
            <div className="mobile-hide" style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "flex-end" }}>
              <div className="stat-chip" style={{ minWidth: 110 }}>
                <div><div style={{ fontSize: 11, fontWeight: 600, color: "var(--sepia-light)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Riutilizzati</div><div className="font-display" style={{ fontSize: 26, fontWeight: 700, color: "var(--terra)", lineHeight: 1.1 }}>{isMounted ? generated.stats.reusedIngredients : "—"}</div></div>
                <span style={{ fontSize: 22 }}>♻️</span>
              </div>
              <div className="stat-chip" style={{ minWidth: 110 }}>
                <div><div style={{ fontSize: 11, fontWeight: 600, color: "var(--sepia-light)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Risparmio</div><div className="font-display" style={{ fontSize: 26, fontWeight: 700, color: "var(--olive)", lineHeight: 1.1 }}>{isMounted ? `€${generated.stats.estimatedSavings.toFixed(0)}` : "—"}</div></div>
                <span style={{ fontSize: 22 }}>💶</span>
              </div>
            </div>
            {/* Pulsante account */}
            <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end", marginTop: -8 }}>
              {isMounted && (user ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {syncStatus === "saving" && <span style={{ fontSize: 11, color: "var(--sepia-light)" }}>↑ salvataggio...</span>}
                  {syncStatus === "saved"  && <span style={{ fontSize: 11, color: "var(--olive)" }}>✓ salvato</span>}
                  {syncStatus === "error"  && <span style={{ fontSize: 11, color: "var(--terra)" }}>⚠ errore sync</span>}
                  <button
                    onClick={() => sbClient?.auth.signOut()}
                    style={{ background: "none", border: "1px solid var(--cream-dark)", borderRadius: 100, padding: "5px 14px", fontSize: 12, cursor: "pointer", color: "var(--sepia-light)", fontWeight: 600 }}
                  >
                    {user?.email?.split("@")[0] ?? "Account"} · Esci
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="btn-terra"
                  style={{ padding: "7px 16px", fontSize: 13 }}
                >
                  Accedi · Salva i tuoi dati ☁️
                </button>
              ))}
            </div>
          </div>

          {/* ── ORA CUCINO ── */}
          {isMounted && (() => {
            const today = new Date().getDay();
            const dayMap: Record<number, string> = { 1: "Lun", 2: "Mar", 3: "Mer", 4: "Gio", 5: "Ven", 6: "Sab", 0: "Dom" };
            const todayKey = dayMap[today];
            const todayPlan = generated.days.find((d) => d.day === todayKey);
            const currentHour = new Date().getHours();
            const isLunchTime = currentHour < 15;
            const mealLabel = isLunchTime ? "Ora cucino · Pranzo" : "Ora cucino · Cena";
            const isDaySwapped = todayKey ? swappedDays.has(todayKey) : false;
            const effectiveLunch = isDaySwapped ? todayPlan?.dinner : todayPlan?.lunch;
            const effectiveDinner = isDaySwapped ? todayPlan?.lunch : todayPlan?.dinner;
            const currentRecipe = preferences.mealsPerDay === "both"
              ? (isLunchTime ? effectiveLunch || effectiveDinner : effectiveDinner || effectiveLunch)
              : todayPlan?.dinner;
            if (!currentRecipe) return null;
            return (
              <div style={{ background: "linear-gradient(135deg, var(--terra), var(--terra-dark))", borderRadius: 18, padding: "16px 18px", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, boxShadow: "0 4px 20px rgba(196,103,58,0.3)", flexWrap: "wrap" }} className="animate-in">
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <span style={{ fontSize: 32 }}>🍳</span>
                  <div>
                    <p style={{ margin: 0, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(255,255,255,0.7)" }}>{mealLabel}</p>
                    <p style={{ margin: "3px 0 0", fontWeight: 700, color: "white", fontSize: 18, fontFamily: "'Playfair Display', serif" }}>{currentRecipe.title}</p>
                    <p style={{ margin: "3px 0 0", fontSize: 13, color: "rgba(255,255,255,0.8)" }}>⏱ {currentRecipe.time} min · {currentRecipe.ingredients.length} ingredienti</p>
                  </div>
                </div>
                <button onClick={() => goToRecipe(currentRecipe)} style={{ background: "rgba(255,255,255,0.2)", border: "1.5px solid rgba(255,255,255,0.4)", borderRadius: 12, padding: "10px 18px", color: "white", fontWeight: 700, fontSize: 14, cursor: "pointer", whiteSpace: "nowrap" }}>
                  Vedi ricetta →
                </button>
              </div>
            );
          })()}

          {/* ── BANNER ── */}
          {showGeneratedBanner && (
            <div className="alert-banner animate-in" style={{ marginBottom: 20 }}>
              <span style={{ fontSize: 20 }}>🎉</span>
              <div><p style={{ margin: 0, fontWeight: 600, color: "var(--sepia)", fontSize: 14 }}>Piano generato con successo</p><p style={{ margin: "2px 0 0", fontSize: 13, color: "var(--sepia-light)" }}>{lastMessage} — apri i tab Settimana e Spesa per vedere il risultato.</p></div>
            </div>
          )}

          {/* ── BANNER ERBE ── */}
          {showHerbBanner && herbsToCheck.length > 0 && (
            <div className="animate-in" style={{ background: "var(--warm-white)", border: "1.5px solid rgba(92,107,58,0.3)", borderRadius: 18, padding: "18px 22px", marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <span style={{ fontSize: 22 }}>🌿</span>
                <div>
                  <p style={{ margin: 0, fontWeight: 700, color: "var(--sepia)", fontSize: 15 }}>Hai ancora queste erbe fresche?</p>
                  <p style={{ margin: "2px 0 0", fontSize: 13, color: "var(--sepia-light)" }}>Se le hai ancora non le mettiamo nella lista della spesa del prossimo piano.</p>
                </div>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {herbsToCheck.map((herb) => (
                  <div key={herb} style={{ display: "flex", alignItems: "center", gap: 8, background: herbAnswers[herb] === true ? "rgba(92,107,58,0.12)" : herbAnswers[herb] === false ? "rgba(196,103,58,0.08)" : "var(--cream)", border: `1.5px solid ${herbAnswers[herb] === true ? "var(--olive)" : herbAnswers[herb] === false ? "var(--terra-light)" : "var(--border)"}`, borderRadius: 100, padding: "7px 14px" }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--sepia)" }}>{herb}</span>
                    <button onClick={() => { setHerbAnswers((p) => ({ ...p, [herb]: true })); setPantryItems((prev) => prev.some((x) => normalize(x.name) === normalize(herb)) ? prev : [...prev, { name: herb, quantity: 1, unit: "mazzetto" }]); }} style={{ background: herbAnswers[herb] === true ? "var(--olive)" : "transparent", border: `1px solid ${herbAnswers[herb] === true ? "var(--olive)" : "var(--border)"}`, borderRadius: 100, padding: "3px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer", color: herbAnswers[herb] === true ? "white" : "var(--sepia-light)" }}>✓ Sì</button>
                    <button onClick={() => setHerbAnswers((p) => ({ ...p, [herb]: false }))} style={{ background: herbAnswers[herb] === false ? "var(--terra)" : "transparent", border: `1px solid ${herbAnswers[herb] === false ? "var(--terra)" : "var(--border)"}`, borderRadius: 100, padding: "3px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer", color: herbAnswers[herb] === false ? "white" : "var(--sepia-light)" }}>✗ No</button>
                  </div>
                ))}
              </div>
              {Object.keys(herbAnswers).length === herbsToCheck.length && (
                <button onClick={() => setShowHerbBanner(false)} style={{ marginTop: 14, background: "var(--olive)", border: "none", borderRadius: 10, padding: "8px 18px", color: "white", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>✓ Fatto, aggiorna la dispensa</button>
              )}
            </div>
          )}

          {/* ── TABS ── */}
          <div className="tab-nav animate-in delay-1" style={{ gridTemplateColumns: `repeat(${TABS.length}, 1fr)`, marginBottom: 24 }}>
            {TABS.map((tab) => (
              <button key={tab.id} className={`tab-item${activeTab === tab.id ? " active" : ""}`} onClick={() => setActiveTab(tab.id)}>{tab.label}</button>
            ))}
          </div>

          {/* ══════════════ TAB: PLANNER ══════════════ */}
          {activeTab === "planner" && (
            <div className="animate-in delay-2 mobile-stack" style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 20 }}>

              {/* Preferenze */}
              <div className="card-warm mobile-pad" style={{ padding: 28 }}>
                <SectionHeader icon="🎛️" title="Preferenze" subtitle="Configura il tuo piano settimanale" />

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }} className="mobile-stack">
                  <div>
                    <label>👥 Persone</label>
                    <input type="number" min={1} value={preferences.people} onChange={(e) => setPreferences((p) => ({ ...p, people: Number(e.target.value || 1) }))} className="input-warm" style={{ marginTop: 6 }} />
                  </div>
                  <div>
                    <label>🥗 Dieta</label>
                    <select value={preferences.diet} onChange={(e) => setPreferences((p) => ({ ...p, diet: e.target.value as Diet }))} className="select-warm" style={{ marginTop: 6 }}>
                      <option value="mediterranea">Mediterranea</option>
                      <option value="onnivora">Onnivora</option>
                      <option value="vegetariana">Vegetariana</option>
                      <option value="vegana">Vegana</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                  <div>
                    <label>💶 Budget: €{preferences.budget}/settimana</label>
                    <input type="range" min={20} max={150} step={5} value={preferences.budget} onChange={(e) => setPreferences((p) => ({ ...p, budget: Number(e.target.value) }))} className="slider-warm" style={{ marginTop: 10 }} />
                  </div>
                  <div>
                    <label>⏱ Tempo max: {preferences.maxTime} min</label>
                    <input type="range" min={10} max={60} step={5} value={preferences.maxTime} onChange={(e) => setPreferences((p) => ({ ...p, maxTime: Number(e.target.value) }))} className="slider-warm" style={{ marginTop: 10 }} />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }} className="mobile-stack">
                  <div>
                    <label>👨‍🍳 Livello</label>
                    <select value={preferences.skill} onChange={(e) => setPreferences((p) => ({ ...p, skill: e.target.value as Skill }))} className="select-warm" style={{ marginTop: 6 }}>
                      <option value="beginner">Principiante</option>
                      <option value="intermediate">Intermedio</option>
                    </select>
                  </div>
                  <div>
                    <label>🍽️ Pasti</label>
                    <select value={preferences.mealsPerDay} onChange={(e) => setPreferences((p) => ({ ...p, mealsPerDay: e.target.value as "dinner" | "both" }))} className="select-warm" style={{ marginTop: 6 }}>
                      <option value="dinner">Solo cena</option>
                      <option value="both">Pranzo + cena</option>
                    </select>
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label>🧄 Ingredienti principali</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                    {preferences.coreIngredients.map((ing, i) => (
                      <span key={i} className="pantry-tag">{ing}<button onClick={() => setPreferences((p) => ({ ...p, coreIngredients: p.coreIngredients.filter((_, j) => j !== i) }))} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--terra-light)", fontSize: 16, lineHeight: 1, padding: 0, marginLeft: 4 }}>×</button></span>
                    ))}
                    <input
                      placeholder="Aggiungi ingrediente..."
                      className="input-warm"
                      style={{ flex: 1, minWidth: 140 }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === ",") {
                          e.preventDefault();
                          const val = (e.target as HTMLInputElement).value.trim().replace(/,$/, "");
                          if (val) {
                            setPreferences((p) => ({ ...p, coreIngredients: [...p.coreIngredients, val] }));
                            (e.target as HTMLInputElement).value = "";
                          }
                        }
                      }}
                      onBlur={(e) => {
                        const val = e.target.value.trim().replace(/,$/, "");
                        if (val) {
                          setPreferences((p) => ({ ...p, coreIngredients: [...p.coreIngredients, val] }));
                          e.target.value = "";
                        }
                      }}
                    />
                  </div>
                  <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--sepia-light)" }}>Premi Invio o virgola per aggiungere. Questi ingredienti verranno favoriti nel piano.</p>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label>🚫 Ingredienti da escludere</label>
                  <textarea placeholder="es. tonno, funghi, peperoni" value={preferences.exclusionsText} onChange={(e) => setPreferences((p) => ({ ...p, exclusionsText: e.target.value }))} className="input-warm" style={{ marginTop: 6, resize: "vertical", minHeight: 60 }} />
                </div>

                <div style={{ background: "var(--cream)", border: "1px solid var(--border)", borderRadius: 14, padding: 16, marginBottom: 16, display: "grid", gap: 12 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontWeight: 400 }}>
                    <input type="checkbox" checked={preferences.leftoversAllowed} onChange={(e) => setPreferences((p) => ({ ...p, leftoversAllowed: e.target.checked }))} className="checkbox-warm" />
                    <span><strong>Riusa gli avanzi</strong> — il planner favorisce piatti riutilizzabili</span>
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontWeight: 400 }}>
                    <input type="checkbox" checked={preferences.sundaySpecial} onChange={(e) => setPreferences((p) => ({ ...p, sundaySpecial: e.target.checked }))} className="checkbox-warm" />
                    <span><strong>Domenica speciale</strong> — piatto più ricco e laborioso</span>
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontWeight: 400 }}>
                    <input type="checkbox" checked={preferences.sundayDinnerLeftovers} onChange={(e) => setPreferences((p) => ({ ...p, sundayDinnerLeftovers: e.target.checked }))} className="checkbox-warm" />
                    <span><strong>Cena domenica con avanzi</strong> del pranzo</span>
                  </label>
                </div>

                <div style={{ background: "var(--cream)", border: "1px solid var(--border)", borderRadius: 14, padding: 16, marginBottom: 20 }}>
                  <label style={{ display: "block", marginBottom: 10 }}>📅 Pasti da saltare</label>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
                    {SKIP_OPTIONS.map((slot) => (
                      <label key={slot} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 12, fontWeight: 400, background: preferences.skippedMeals.includes(slot) ? "rgba(196,103,58,0.08)" : "transparent", borderRadius: 8, padding: "5px 8px" }}>
                        <input type="checkbox" checked={preferences.skippedMeals.includes(slot)} onChange={() => toggleSkippedMeal(slot)} className="checkbox-warm" />
                        <span>{slot.replace("-", " ")}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
                  <button className="btn-terra" onClick={regenerate} disabled={isGenerating}>{isGenerating ? "⏳ Generazione..." : "✨ Genera piano"}</button>
                  <button className="btn-outline-terra" onClick={confirmWeek}>❤️ Conferma settimana</button>
                  <button className="btn-ghost" onClick={() => { setPreferences({ people: 2, diet: "mediterranea", maxTime: 20, budget: 60, skill: "beginner", mealsPerDay: "dinner", leftoversAllowed: true, exclusionsText: "", exclusions: [], sundaySpecial: true, sundayDinnerLeftovers: true, skippedMeals: [], coreIngredients: [] }); setSeed(1); setManualOverrides({}); setLastMessage("Reset effettuato"); setShowGeneratedBanner(false); }}>↺ Reset</button>
                  <button className="btn-ghost" onClick={() => { localStorage.removeItem("ss_onboarding_done"); setOnboardingDone(false); setOnboardingStep(0); }} style={{ fontSize: 12, color: "var(--sepia-light)" }}>⚙ Ripeti configurazione iniziale</button>
                  {!showGeneratedBanner && <span style={{ fontSize: 13, color: "var(--sepia-light)" }}>{lastMessage}</span>}
                </div>
              </div>

              {/* Dispensa */}
              <div className="card-warm" style={{ padding: 28 }}>
                <SectionHeader icon="🧊" title="Dispensa" subtitle="Gli ingredienti già in casa vengono esclusi dalla spesa" />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 90px 90px auto", gap: 8, marginBottom: 14 }}>
                  <input placeholder="Ingrediente" value={pantryInput.name} onChange={(e) => setPantryInput((p) => ({ ...p, name: e.target.value }))} className="input-warm" onKeyDown={(e) => e.key === "Enter" && addPantryItem()} />
                  <input placeholder="Qtà" value={pantryInput.quantity} onChange={(e) => setPantryInput((p) => ({ ...p, quantity: e.target.value }))} className="input-warm" />
                  <select value={pantryInput.unit} onChange={(e) => setPantryInput((p) => ({ ...p, unit: e.target.value }))} className="select-warm">
                    <option value="g">g</option><option value="kg">kg</option><option value="ml">ml</option><option value="L">L</option><option value="pezzi">pz</option><option value="cucchiai">cucchiai</option>
                  </select>
                  <button className="btn-terra" onClick={addPantryItem} style={{ padding: "9px 14px" }}>+</button>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                  {pantryItems.map((item, i) => (
                    <span key={`${item.name}-${i}`} className="pantry-tag">{item.name} <span style={{ color: "var(--sepia-light)", fontSize: 11 }}>{item.quantity}{item.unit}</span><button onClick={() => removePantryItem(i)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--terra-light)", fontSize: 16, lineHeight: 1, padding: 0, marginLeft: 2 }}>×</button></span>
                  ))}
                </div>
                {pantryItems.length === 0 && <p style={{ color: "var(--sepia-light)", fontSize: 13, marginTop: 12 }}>Nessun ingrediente in dispensa.</p>}

                <div className="divider-ornament" style={{ margin: "20px 0 16px" }}><span style={{ fontSize: 12 }}>✦</span></div>

                <div style={{ background: "var(--cream)", borderRadius: 12, padding: 14 }}>
                  <p style={{ margin: "0 0 8px", fontWeight: 600, fontSize: 13, color: "var(--sepia)" }}>📊 Apprendimento preferenze</p>
                  <p style={{ margin: "0 0 8px", fontSize: 13, color: "var(--sepia-light)" }}>Confermati: <strong style={{ color: "var(--olive)" }}>{Object.values(learning.keptRecipeIds).reduce((a, b) => a + b, 0)}</strong> · Rigenerati: <strong style={{ color: "var(--terra)" }}>{Object.values(learning.regeneratedRecipeIds).reduce((a, b) => a + b, 0)}</strong></p>
                  {Object.keys(learning.likedIngredients).length > 0 && (
                    <p style={{ margin: 0, fontSize: 12, color: "var(--sepia-light)" }}>❤️ Preferiti: {Object.entries(learning.likedIngredients).sort((a, b) => b[1] - a[1]).slice(0, 4).map((x) => x[0]).join(", ")}</p>
                  )}
                </div>

                <div style={{ marginTop: 14, background: "rgba(92,107,58,0.07)", borderRadius: 12, padding: 14 }}>
                  <p style={{ margin: 0, fontSize: 13, color: "var(--olive)", lineHeight: 1.5 }}>💾 Preferenze, dispensa e apprendimento vengono salvati automaticamente.</p>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════ TAB: SETTIMANA ══════════════ */}
          {activeTab === "week" && (
            <div className="animate-in delay-2 mobile-stack" style={{ display: "grid", gridTemplateColumns: "1.3fr 0.7fr", gap: 20 }}>
              <div>
                <SectionHeader icon="📅" title="Piano della settimana" subtitle="Bilanciato per riutilizzare ingredienti e ridurre gli sprechi" />
                <div style={{ display: "grid", gap: 12 }}>
                  {generated.days.map((day, di) => (
                    <div key={day.day} className="day-card animate-in" style={{ animationDelay: `${di * 0.04}s` }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                        <h4 className="font-display" style={{ margin: 0, fontSize: 17, fontWeight: 600, color: "var(--sepia)" }}>{day.day === "Dom" ? "☀️ " : ""}{day.day}</h4>
                        <span className="tag-pill">{preferences.mealsPerDay === "both" ? "pranzo + cena" : "cena"}</span>
                      </div>
                      {(() => {
                        if (preferences.mealsPerDay !== "both") {
                          return (
                            <div className="meal-slot" onClick={() => { if (day.dinner) { setSelectedRecipe(day.dinner); tourAdvance("recipe_selected"); } }}>
                              <p style={{ margin: "0 0 6px", fontWeight: 600, color: "var(--sepia)", fontSize: 15 }}>{day.dinner?.title || <span style={{ color: "var(--sepia-light)", fontStyle: "italic" }}>Pasto saltato</span>}</p>
                              {day.dinner && <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}><TimeTag minutes={day.dinner.time} />{day.dinner.tags.slice(0, 3).map((t) => <TagPill key={t}>{t}</TagPill>)}</div>}
                              {day.dinner && <p style={{ margin: "0 0 8px", fontSize: 12, color: "var(--sepia-light)" }}>{day.dinner.ingredients.slice(0, 4).map((i) => i.name).join(" · ")}</p>}
                              {day.dinner && <button className="btn-ghost" style={{ fontSize: 12, padding: "4px 8px" }} onClick={(e) => { e.stopPropagation(); regenerateSingleMeal(day.day, "dinner"); }}>↺ rigenera</button>}
                            </div>
                          );
                        }
                        const isSwapped = swappedDays.has(day.day);
                        const lunchRecipe = isSwapped ? day.dinner : day.lunch;
                        const dinnerRecipe = isSwapped ? day.lunch : day.dinner;
                        const slots = [
                          { label: "Pranzo", recipe: lunchRecipe, slot: "lunch" as MealSlot },
                          { label: "Cena", recipe: dinnerRecipe, slot: "dinner" as MealSlot },
                        ];
                        return (
                          <div>
                            {/* Frecce swap centrate sopra i due slot */}
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 8 }}>
                              <div style={{ height: 1, flex: 1, background: "var(--border)" }} />
                              <button onClick={() => swapMeals(day.day)} title="Inverti pranzo e cena" style={{ background: isSwapped ? "var(--terra)" : "var(--cream-dark)", border: `1.5px solid ${isSwapped ? "var(--terra)" : "var(--border)"}`, borderRadius: 100, padding: "4px 14px", display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 12, fontWeight: 700, color: isSwapped ? "white" : "var(--sepia-light)", transition: "all 0.15s", whiteSpace: "nowrap" }}>
                                ← {isSwapped ? "ripristina" : "inverti"} →
                              </button>
                              <div style={{ height: 1, flex: 1, background: "var(--border)" }} />
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                            {slots.map((slotItem, idx) => (
                              <React.Fragment key={slotItem.label}>
                                <div className="meal-slot" onClick={() => { if (slotItem.recipe) { setSelectedRecipe(slotItem.recipe); tourAdvance("recipe_selected"); } }}>
                                  <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--sepia-light)" }}>{slotItem.label}</p>
                                  <p style={{ margin: "0 0 8px", fontWeight: 600, color: "var(--sepia)", fontSize: 14, lineHeight: 1.3 }}>{slotItem.recipe?.title || <span style={{ color: "var(--sepia-light)", fontStyle: "italic" }}>Pasto saltato</span>}</p>
                                  {slotItem.recipe && <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}><TimeTag minutes={slotItem.recipe.time} />{slotItem.recipe.tags.slice(0, 2).map((t) => <TagPill key={t}>{t}</TagPill>)}</div>}
                                  {slotItem.recipe && <button className="btn-ghost" style={{ fontSize: 12, padding: "4px 8px" }} onClick={(e) => { e.stopPropagation(); regenerateSingleMeal(day.day, slotItem.slot); }}>↺ rigenera</button>}
                                </div>
                              </React.Fragment>
                            ))}
                            </div>
                          </div>
                        );
                      })()}
                      {day.notes.length > 0 && <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>{day.notes.map((n) => <span key={n} className="tag-pill tag-pill-terra">{n}</span>)}</div>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Strategia + ricetta selezionata */}
              <div style={{ display: "grid", gap: 16, alignContent: "start" }}>
                <div className="card-warm" style={{ padding: 20 }}>
                  <SectionHeader icon="🧠" title="Strategia" subtitle="Come è stato costruito il piano" />
                  <div style={{ display: "grid", gap: 8 }}>
                    {generated.alerts.map((a, i) => (
                      <div key={i} style={{ background: "var(--cream)", borderRadius: 10, padding: "10px 12px", fontSize: 12, color: "var(--sepia-light)", lineHeight: 1.5 }}>{a}</div>
                    ))}
                  </div>
                </div>
                {selectedRecipe && (
                  <div className="card-warm" style={{ padding: 20 }}>
                    <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--terra)" }}>Selezionata</p>
                    <h4 className="font-display" style={{ margin: "0 0 10px", fontSize: 16, color: "var(--sepia)", fontWeight: 600 }}>{selectedRecipe.title}</h4>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}><TimeTag minutes={selectedRecipe.time} />{selectedRecipe.tags.slice(0, 3).map((t) => <TagPill key={t}>{t}</TagPill>)}</div>
                    <button className="btn-terra" style={{ width: "100%", justifyContent: "center" }} onClick={() => { startRecipeFlow(selectedRecipe); setActiveTab("recipes"); }}>▶ Avvia procedimento guidato</button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══════════════ TAB: SPESA ══════════════ */}
          {activeTab === "shopping" && (
            <div className="animate-in delay-2">
              <SectionHeader icon="🛒" title="Lista della spesa" subtitle="Consolidata e già depurata da ciò che hai in dispensa" />
              {generated.shopping.length === 0 ? (
                <div className="card-warm" style={{ padding: 28, textAlign: "center", color: "var(--sepia-light)" }}>Nessun ingrediente da acquistare con questi parametri.</div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(260px, 100%), 1fr))", gap: 12 }}>
                  {CATEGORY_ORDER.map((cat) => {
                    const items = generated.shopping.filter((i) => i.category === cat);
                    if (!items.length) return null;
                    return (
                      <div key={cat} className="shopping-category">
                        <h4 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 700, color: "var(--sepia)", display: "flex", alignItems: "center", gap: 8 }}>{categoryEmoji[cat] || "📦"} {cat}</h4>
                        <div style={{ display: "grid", gap: 6 }}>
                          {items.map((item) => {
                            const itemKey = `shop-${item.name}`;
                            const isChecked = checkedShoppingItems.has(itemKey);
                            return (
                              <div key={item.name} className="shopping-item" style={{ opacity: isChecked ? 0.45 : 1, transition: "opacity 0.2s" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
                                  <input type="checkbox" checked={isChecked} onChange={() => { setCheckedShoppingItems((p) => { const n = new Set(p); n.has(itemKey) ? n.delete(itemKey) : n.add(itemKey); return n; }); tourAdvance("item_checked"); }} className="checkbox-warm" />
                                  <span style={{ fontSize: 14, color: "var(--sepia)", fontWeight: 500, textDecoration: isChecked ? "line-through" : "none" }}>{item.name}</span>
                                </div>
                                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--terra)" }}>{Number.isInteger(item.qty) ? item.qty : item.qty.toFixed(1)} {item.unit}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── BANNER CONGELATORE ── */}
              {generated.freezeItems.length > 0 && (
                <div style={{ background: "linear-gradient(135deg, rgba(92,107,58,0.1), rgba(92,107,58,0.05))", border: "1.5px solid rgba(92,107,58,0.3)", borderRadius: 18, padding: "18px 20px", marginTop: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                    <span style={{ fontSize: 24 }}>🧊</span>
                    <div>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: "var(--sepia)" }}>Da congelare subito</p>
                      <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--sepia-light)" }}>Questi ingredienti servono in giorni diversi — congela la parte indicata e riceverai un alert la sera prima di scongelarla.</p>
                    </div>
                  </div>
                  <div style={{ display: "grid", gap: 8 }}>
                    {generated.freezeItems.map((item, i) => (
                      <div key={i} style={{ background: "var(--warm-white)", borderRadius: 12, padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontSize: 18 }}>❄️</span>
                          <div>
                            <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: "var(--sepia)" }}>{item.name}</p>
                            <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--sepia-light)" }}>Congela <strong style={{ color: "var(--olive)" }}>{item.qtyToFreeze} {item.unit}</strong> · scongela {item.useOnDayIndex > 0 ? `la sera di ${DAYS[item.useOnDayIndex - 1]}` : "domenica sera"} per {item.useOnDay}</p>
                            <p style={{ margin: "1px 0 0", fontSize: 11, color: "var(--sepia-light)", fontStyle: "italic" }}>Serve per: {item.recipe}</p>
                          </div>
                        </div>
                        <span style={{ background: "rgba(92,107,58,0.12)", color: "var(--olive)", borderRadius: 100, padding: "4px 12px", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>Alert sera prima ✓</span>
                      </div>
                    ))}
                  </div>
                  <p style={{ margin: "12px 0 0", fontSize: 12, color: "var(--olive)", fontWeight: 500 }}>💡 Premi "Conferma settimana" nel Planner per attivare i promemoria scongelo automatici.</p>
                </div>
              )}

              {/* Extra items manuali */}
              <div className="card-warm" style={{ padding: 20, marginTop: 16 }}>
                <h4 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 700, color: "var(--sepia)", display: "flex", alignItems: "center", gap: 8 }}>✏️ Aggiunte manuali</h4>
                <div style={{ display: "flex", gap: 8, marginBottom: extraShoppingItems.length > 0 ? 12 : 0 }}>
                  <input value={extraShoppingInput} onChange={(e) => setExtraShoppingInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && extraShoppingInput.trim()) { setExtraShoppingItems((p) => [...p, extraShoppingInput.trim()]); setExtraShoppingInput(""); } }} placeholder="es. detersivo, pane, acqua..." className="input-warm" />
                  <button className="btn-terra" style={{ padding: "9px 14px", whiteSpace: "nowrap" }} onClick={() => { if (extraShoppingInput.trim()) { setExtraShoppingItems((p) => [...p, extraShoppingInput.trim()]); setExtraShoppingInput(""); } }}>+</button>
                </div>
                {extraShoppingItems.length > 0 && (
                  <div style={{ display: "grid", gap: 6 }}>
                    {extraShoppingItems.map((item, i) => {
                      const key = `extra-${i}`;
                      const isChecked = checkedShoppingItems.has(key);
                      return (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--cream)", borderRadius: 10, padding: "8px 12px", opacity: isChecked ? 0.45 : 1, transition: "opacity 0.2s" }}>
                          <input type="checkbox" checked={isChecked} onChange={() => setCheckedShoppingItems((p) => { const n = new Set(p); n.has(key) ? n.delete(key) : n.add(key); return n; })} className="checkbox-warm" />
                          <span style={{ fontSize: 14, flex: 1, textDecoration: isChecked ? "line-through" : "none", color: "var(--sepia)" }}>{item}</span>
                          <button onClick={() => setExtraShoppingItems((p) => p.filter((_, j) => j !== i))} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--terra-light)", fontSize: 18, lineHeight: 1 }}>×</button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Pulisci spuntati */}
              {checkedShoppingItems.size > 0 && (
                <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
                  <button className="btn-ghost" onClick={() => setCheckedShoppingItems(new Set())} style={{ fontSize: 13 }}>↺ Rimuovi spunte ({checkedShoppingItems.size})</button>
                </div>
              )}
            </div>
          )}

          {/* ══════════════ TAB: RICETTE ══════════════ */}
          {activeTab === "recipes" && (
            <div className="animate-in delay-2 mobile-stack" style={{ display: "grid", gridTemplateColumns: "0.85fr 1.15fr", gap: 20 }}>
              <div>
                <SectionHeader icon="📖" title="Ricette della settimana" subtitle="Clicca per vedere ingredienti e preparazione" />
                <div style={{ display: "grid", gap: 8 }}>
                  {Array.from(new Map(meals.map((m) => [m.id, m])).values()).map((meal) => (
                    <div key={meal.id} className={`recipe-card${selectedRecipe?.id === meal.id ? " selected" : ""}`} onClick={() => setSelectedRecipe(meal)}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                        <p style={{ margin: "0 0 6px", fontWeight: 600, color: "var(--sepia)", fontSize: 14, lineHeight: 1.3 }}>{meal.title}</p>
                        <TimeTag minutes={meal.time} />
                      </div>
                      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>{meal.tags.slice(0, 3).map((t) => <TagPill key={t}>{t}</TagPill>)}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div ref={recipeDetailRef} style={{ position: "sticky", top: 20, alignSelf: "start" }}>
                {selectedRecipe ? (
                  <div className="card-warm" style={{ padding: 28 }}>
                    <h2 className="font-display" style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 700, color: "var(--sepia)", lineHeight: 1.2 }}>{selectedRecipe.title}</h2>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
                      <TimeTag minutes={selectedRecipe.time} />
                      <TagPill terra>{selectedRecipe.servings} porzioni</TagPill>
                      {selectedRecipe.tags.map((t) => <TagPill key={t}>{t}</TagPill>)}
                    </div>

                    <div className="divider-ornament"><span style={{ fontSize: 12 }}>✦ Ingredienti ✦</span></div>
                    <div style={{ display: "grid", gap: 6, marginBottom: 20, marginTop: 12 }}>
                      {selectedRecipe.ingredients.map((ingr) => (
                        <div key={ingr.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--cream)", borderRadius: 8, padding: "8px 12px" }}>
                          <span style={{ fontSize: 14, color: "var(--sepia)", fontWeight: 500 }}>{ingr.name}</span>
                          <span style={{ fontSize: 13, color: "var(--terra)", fontWeight: 600 }}>{ingr.qty} {ingr.unit}</span>
                        </div>
                      ))}
                    </div>

                    <div className="divider-ornament"><span style={{ fontSize: 12 }}>✦ Preparazione ✦</span></div>
                    <ol style={{ listStyle: "none", padding: 0, margin: "12px 0 20px", display: "grid", gap: 10 }}>
                      {selectedRecipe.steps.map((step, i) => (
                        <li key={i} className="step-item">
                          <div style={{ display: "flex", gap: 10 }}>
                            <span style={{ fontWeight: 800, color: "var(--terra)", fontSize: 15, minWidth: 20 }}>{i + 1}.</span>
                            <span style={{ fontSize: 14, color: "var(--sepia)", lineHeight: 1.6 }}>{step}</span>
                          </div>
                        </li>
                      ))}
                    </ol>

                    <button className="btn-terra" style={{ width: "100%", justifyContent: "center", padding: "12px 20px" }} onClick={() => startRecipeFlow(selectedRecipe)}>▶ Avvia procedimento guidato</button>
                  </div>
                ) : (
                  <div className="card-warm" style={{ padding: 40, textAlign: "center" }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>🍽️</div>
                    <p className="font-display" style={{ margin: 0, fontSize: 18, color: "var(--sepia-light)", fontStyle: "italic" }}>Seleziona una ricetta per vedere gli ingredienti e i passaggi.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══════════════ TAB: REMINDER ══════════════ */}
          {activeTab === "reminder" && (
            <div className="animate-in delay-2" style={{ maxWidth: 560 }}>
              <div className="card-warm" style={{ padding: 28 }}>
                <SectionHeader icon="🔔" title="Promemoria preparazione" subtitle="Imposta un orario, un messaggio e una voce audio" />
                <div style={{ display: "grid", gap: 18 }}>
                  <div>
                    <label>⏰ Orario inizio preparazione</label>
                    <input type="time" value={prepTime} onChange={(e) => setPrepTime(e.target.value)} className="input-warm" style={{ marginTop: 6 }} />
                  </div>
                  <div>
                    <label>💬 Messaggio personalizzato</label>
                    <textarea value={prepReminderMessage} onChange={(e) => setPrepReminderMessage(e.target.value)} placeholder="Es. È ora di iniziare a cucinare la cena" className="input-warm" style={{ marginTop: 6, resize: "vertical", minHeight: 70 }} />
                  </div>
                  <div>
                    <label>🎙️ Voce audio</label>
                    <select value={selectedVoiceName} onChange={(e) => setSelectedVoiceName(e.target.value)} className="select-warm" style={{ marginTop: 6 }}>
                      {availableVoices.length ? availableVoices.map((v) => <option key={v.name} value={v.name}>{v.name} · {v.lang}</option>) : <option value="">Voce di default</option>}
                    </select>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
                    <button className="btn-outline-terra" onClick={playReminderPreview}>🔊 Anteprima audio</button>
                    <button className="btn-terra" onClick={scheduleReminder}>🔔 Imposta promemoria</button>
                    {scheduledReminderText && <span style={{ fontSize: 13, color: "var(--olive)", fontWeight: 500 }}>✓ {scheduledReminderText}</span>}
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ══════════════ MODAL PROCEDIMENTO GUIDATO ══════════════ */}
      {runningRecipe && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div>
                <h3 className="font-display" style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 700, color: "var(--sepia)" }}>{runningRecipe.title}</h3>
                <p style={{ margin: 0, fontSize: 13, color: "var(--sepia-light)" }}>Step {runningStepIndex + 1} di {runningRecipe.steps.length}</p>
              </div>
              <button onClick={() => closeRecipeFlow()} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "var(--sepia-light)", lineHeight: 1 }}>×</button>
            </div>

            {/* Progress steps */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 18 }}>
              {runningRecipe.steps.map((_, i) => (
                <span key={i} className={`step-badge ${i < runningStepIndex ? "done" : i === runningStepIndex ? "active" : "todo"}`}>
                  {i < runningStepIndex ? "✓" : i + 1}
                </span>
              ))}
            </div>

            {/* Step content */}
            <div style={{ background: "var(--cream)", borderRadius: 16, padding: 20, marginBottom: 16, borderLeft: "4px solid var(--terra)" }}>
              <p style={{ margin: 0, fontSize: 15, color: "var(--sepia)", lineHeight: 1.7 }}>{runningRecipe.steps[runningStepIndex]}</p>
            </div>

            {/* Checkbox */}
            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", background: "var(--cream-dark)", borderRadius: 10, padding: "10px 14px", marginBottom: 18, fontWeight: 400 }}>
              <input type="checkbox" checked={currentStepChecked} onChange={(e) => completeCurrentStep(e.target.checked)} className="checkbox-warm" />
              <span style={{ fontSize: 14, color: "var(--sepia)" }}>Ho completato questo passaggio</span>
            </label>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button className="btn-ghost" onClick={() => closeRecipeFlow()}>Chiudi</button>
              <button className="btn-terra" onClick={advanceRecipeFlow}>{runningStepIndex >= runningRecipe.steps.length - 1 ? "✓ Fine!" : "Avanti →"}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

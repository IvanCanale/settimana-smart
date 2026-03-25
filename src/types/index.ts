export type Diet = "mediterranea" | "onnivora" | "vegetariana" | "vegana";
export type Skill = "beginner" | "intermediate";
export type MealSlot = "lunch" | "dinner";
export type MainCategory = "pasta" | "cereali" | "pollo" | "pesce" | "legumi" | "uova" | "carne" | "verdure";

export type PantryItem = { name: string; quantity: number; unit: string };
export type RecipeIngredient = { name: string; qty: number; unit: string; category: string };
export type ShoppingItem = RecipeIngredient & { waste: number };

export type Recipe = {
  id: string;
  title: string;
  diet: Diet[];
  tags: string[];
  time: number;
  difficulty: Skill;
  servings: number;
  ingredients: RecipeIngredient[];
  steps: string[];
};

export type DayPlan = {
  day: string;
  lunch: Recipe | null;
  dinner: Recipe | null;
  notes: string[];
};

export type Preferences = {
  people: number;
  diet: Diet;
  maxTime: number;
  budget: number;
  skill: Skill;
  mealsPerDay: "dinner" | "both";
  leftoversAllowed: boolean;
  exclusionsText: string;
  exclusions: string[];
  sundaySpecial: boolean;
  sundayDinnerLeftovers: boolean;
  skippedMeals: string[];
  coreIngredients: string[];
  wishlistedRecipeIds?: string[];
  shoppingDay?: number;              // 0=Sunday, 1=Monday, ..., 6=Saturday (matches JS getDay())
  shoppingNotificationTime?: string; // "HH:MM" format, e.g. "09:00"
  timezone?: string;                 // IANA timezone, e.g. "Europe/Rome"
};

export type PreferenceLearning = {
  keptRecipeIds: Record<string, number>;
  regeneratedRecipeIds: Record<string, number>;
  likedCategories: Record<string, number>;
  dislikedCategories: Record<string, number>;
  likedIngredients: Record<string, number>;
  dislikedIngredients: Record<string, number>;
};

export type PlanStats = {
  recipesCount: number;
  uniqueIngredients: number;
  reusedIngredients: number;
  estimatedSavings: number;
  estimatedTotal: number;
  categoryCounts: Record<string, number>;
};

export type FreezeItem = {
  name: string;
  unit: string;
  qtyToFreeze: number;        // quantità da congelare
  useOnDay: string;           // giorno in cui serve (es. "Ven")
  useOnDayIndex: number;      // indice giorno (0=Lun, 6=Dom)
  recipe: string;             // ricetta in cui viene usato
};

export type PlanResult = {
  days: DayPlan[];
  shopping: ShoppingItem[];
  stats: PlanStats;
  alerts: string[];
  freezeItems: FreezeItem[];
};

export type VoiceOption = { name: string; lang: string };
export type ManualOverrides = Record<string, Partial<Record<MealSlot, Recipe | null>>>;

export const ALLERGEN_OPTIONS = [
  "glutine", "latticini", "uova", "pesce", "crostacei",
  "frutta a guscio", "sesamo", "soia", "arachidi", "sedano",
] as const;

export type PlanStatus = "draft" | "active" | "archived";

export type WeeklyPlanRecord = {
  week_iso: string;
  status: PlanStatus;
  seed: number;
  manual_overrides: ManualOverrides;
  learning: PreferenceLearning;
  feedback_note: string;
  checked_items: string[];
};

export type SubscriptionTier = "free" | "base" | "pro";

export type SubscriptionStatus = {
  tier: SubscriptionTier;
  isTrialing: boolean;
  trialEnd: Date | null;
  status: string; // Stripe status: trialing | active | canceled | past_due | none
};

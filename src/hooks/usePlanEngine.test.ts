// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";

// Mock fetchRecipes before importing the hook
vi.mock("@/lib/supabase", () => ({
  fetchRecipes: vi.fn(),
  fetchNotifications: vi.fn().mockResolvedValue([]),
  markNotificationRead: vi.fn().mockResolvedValue(undefined),
  saveWeeklyPlan: vi.fn().mockResolvedValue(undefined),
  savePreferences: vi.fn().mockResolvedValue(undefined),
  loadUserData: vi.fn().mockResolvedValue({}),
  savePantry: vi.fn().mockResolvedValue(undefined),
  migrateFromLocalStorage: vi.fn().mockResolvedValue(undefined),
}));

import { fetchRecipes } from "@/lib/supabase";
import { RECIPE_LIBRARY } from "@/data/recipes";
import { usePlanEngine } from "@/hooks/usePlanEngine";
import type { Preferences, PantryItem, PreferenceLearning, ManualOverrides, Recipe } from "@/types";
import type { SupabaseClient } from "@supabase/supabase-js";

// ── Mock localStorage ──────────────────────────────────────────────────────────
let store: Record<string, string> = {};

const localStorageMock = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, val: string) => { store[key] = val; },
  removeItem: (key: string) => { delete store[key]; },
  clear: () => { store = {}; },
  length: 0,
  key: () => null,
};

beforeEach(() => {
  store = {};
  Object.defineProperty(window, "localStorage", {
    value: localStorageMock,
    writable: true,
  });
});
afterEach(() => {
  vi.restoreAllMocks();
});

// ── Fixtures ──────────────────────────────────────────────────────────────────
function mockRecipe(id: string): Recipe {
  return {
    id,
    title: `Test Recipe ${id}`,
    diet: ["mediterranea"],
    tags: [],
    time: 30,
    difficulty: "beginner",
    servings: 2,
    ingredients: [{ name: "pasta", qty: 200, unit: "g", category: "Cereali" }],
    steps: ["Step 1"],
  };
}

const DEFAULT_PREFS: Preferences = {
  people: 2,
  diet: "mediterranea",
  maxTime: 60,
  budget: 60,
  skill: "beginner",
  mealsPerDay: "dinner",
  leftoversAllowed: true,
  exclusionsText: "",
  exclusions: [],
  sundaySpecial: true,
  sundayDinnerLeftovers: true,
  skippedMeals: [],
  coreIngredients: [],
};
const DEFAULT_PANTRY: PantryItem[] = [];
const DEFAULT_LEARNING: PreferenceLearning = {
  keptRecipeIds: {},
  regeneratedRecipeIds: {},
  likedCategories: {},
  dislikedCategories: {},
  likedIngredients: {},
  dislikedIngredients: {},
};
const DEFAULT_OVERRIDES: ManualOverrides = {};

// Mock SupabaseClient — only needs to be a non-null object for the hook's sbClient check
const mockSbClient = {} as unknown as SupabaseClient;

function renderHookWithDefaults(sbClient: SupabaseClient | null = null) {
  return renderHook(() =>
    usePlanEngine(
      DEFAULT_PREFS,
      DEFAULT_PANTRY,
      1,
      DEFAULT_LEARNING,
      DEFAULT_OVERRIDES,
      sbClient ? { sbClient, userId: "user-123", setSyncStatus: vi.fn() } : undefined,
    )
  );
}

// ── Tests ──────────────────────────────────────────────────────────────────────
describe("usePlanEngine — async recipe fetch, cache, and fallback", () => {

  it("1. cache hit — fresh localStorage cache is used immediately (before Supabase fetch)", async () => {
    const cachedRecipes = [mockRecipe("cached-1"), mockRecipe("cached-2"), mockRecipe("cached-3")];
    store["ss_recipes_cache_v1"] = JSON.stringify(cachedRecipes);
    store["ss_recipes_cache_ts_v1"] = String(Date.now()); // fresh

    const mockFetch = vi.mocked(fetchRecipes);
    mockFetch.mockResolvedValue([mockRecipe("fetched-1")]);

    const { result } = renderHookWithDefaults(mockSbClient);

    // The cached data should be applied immediately from localStorage read in the useEffect
    await waitFor(() => {
      expect(result.current.recipeCount).toBe(3);
    });
  });

  it("2. cache miss + Supabase fetch — fetched recipes replace fallback and cache is written", async () => {
    // No cache in store
    const fetchedRecipes = Array.from({ length: 5 }, (_, i) => mockRecipe(`fetched-${i}`));
    const mockFetch = vi.mocked(fetchRecipes);
    mockFetch.mockResolvedValue(fetchedRecipes);

    const { result } = renderHookWithDefaults(mockSbClient);

    await waitFor(() => {
      expect(result.current.recipeCount).toBe(5);
    });

    // Verify localStorage was written with fetched data
    const cached = store["ss_recipes_cache_v1"];
    expect(cached).toBeDefined();
    const parsed = JSON.parse(cached) as Recipe[];
    expect(parsed).toHaveLength(5);
    expect(parsed[0].id).toBe("fetched-0");
  });

  it("3. Supabase unavailable — fallback to RECIPE_LIBRARY when fetch fails and no cache", async () => {
    // No cache in store
    const mockFetch = vi.mocked(fetchRecipes);
    mockFetch.mockRejectedValue(new Error("Network error"));

    const { result } = renderHookWithDefaults(mockSbClient);

    // Wait for loading to complete
    await waitFor(() => {
      expect(result.current.recipesLoading).toBe(false);
    });

    // Recipes should remain as RECIPE_LIBRARY (initial state — unchanged by failed fetch)
    expect(result.current.recipeCount).toBe(RECIPE_LIBRARY.length);
  });

  it("4. no sbClient — skip fetch entirely, use RECIPE_LIBRARY", async () => {
    const mockFetch = vi.mocked(fetchRecipes);
    mockFetch.mockClear();

    // Render without sbClient (cloudSync is undefined)
    const { result } = renderHookWithDefaults(null);

    // Give effect time to run
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    // fetchRecipes should NOT have been called
    expect(mockFetch).not.toHaveBeenCalled();

    // recipes should be RECIPE_LIBRARY
    expect(result.current.recipeCount).toBe(RECIPE_LIBRARY.length);
  });

  it("5. recipeCount reflects fetched recipes length after successful fetch", async () => {
    const fetchedRecipes = Array.from({ length: 10 }, (_, i) => mockRecipe(`r-${i}`));
    const mockFetch = vi.mocked(fetchRecipes);
    mockFetch.mockResolvedValue(fetchedRecipes);

    const { result } = renderHookWithDefaults(mockSbClient);

    await waitFor(() => {
      expect(result.current.recipeCount).toBe(10);
    });
  });

  it("6. recipesLoading is true while fetchRecipes is in-flight, false after resolve", async () => {
    let resolvePromise!: (recipes: Recipe[]) => void;
    const pendingPromise = new Promise<Recipe[]>((resolve) => {
      resolvePromise = resolve;
    });

    const mockFetch = vi.mocked(fetchRecipes);
    mockFetch.mockReturnValue(pendingPromise);

    const { result } = renderHookWithDefaults(mockSbClient);

    // Should be loading while in-flight
    await waitFor(() => {
      expect(result.current.recipesLoading).toBe(true);
    });

    // Resolve the promise
    await act(async () => {
      resolvePromise([mockRecipe("resolved-1")]);
      await pendingPromise;
    });

    // Should no longer be loading
    await waitFor(() => {
      expect(result.current.recipesLoading).toBe(false);
    });
  });

  it("7. expired cache is ignored — fresh fetch is performed", async () => {
    const oldRecipes = [mockRecipe("old-1")];
    store["ss_recipes_cache_v1"] = JSON.stringify(oldRecipes);
    // Set timestamp to 25 hours ago (beyond 24h TTL)
    store["ss_recipes_cache_ts_v1"] = String(Date.now() - 25 * 60 * 60 * 1000);

    const freshRecipes = Array.from({ length: 7 }, (_, i) => mockRecipe(`fresh-${i}`));
    const mockFetch = vi.mocked(fetchRecipes);
    mockFetch.mockResolvedValue(freshRecipes);

    const { result } = renderHookWithDefaults(mockSbClient);

    await waitFor(() => {
      expect(result.current.recipeCount).toBe(7);
    });
  });
});

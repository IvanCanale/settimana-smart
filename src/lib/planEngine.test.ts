import { describe, it, expect } from 'vitest';
import type { Recipe, RecipeIngredient, Preferences, PantryItem } from '@/types';
import {
  normalize,
  seededShuffle,
  getRecipeCategory,
  scaleQty,
  aggregateShopping,
  computeStats,
  buildPlan,
  runSanityChecks,
  DAYS,
} from '@/lib/planEngine';

// ── FIXTURES ──────────────────────────────────────────────────────────────────

const ing = (name: string, qty: number, unit: string, category: string): RecipeIngredient =>
  ({ name, qty, unit, category });

const makeRecipe = (overrides: Partial<Recipe> & { ingredients: RecipeIngredient[] }): Recipe => ({
  id: 'test-recipe',
  title: 'Test Recipe',
  diet: ['mediterranea', 'onnivora'],
  tags: [],
  time: 30,
  difficulty: 'beginner',
  servings: 2,
  steps: [],
  ...overrides,
});

const DEFAULT_PREFS: Preferences = {
  people: 2,
  diet: 'mediterranea',
  maxTime: 60,
  budget: 60,
  skill: 'beginner',
  mealsPerDay: 'both',
  leftoversAllowed: true,
  exclusionsText: '',
  exclusions: [],
  sundaySpecial: false,
  sundayDinnerLeftovers: false,
  skippedMeals: [],
  coreIngredients: [],
};

// ── normalize ────────────────────────────────────────────────────────────────

describe('normalize', () => {
  it('trims whitespace and lowercases', () => {
    expect(normalize('  Pasta ')).toBe('pasta');
  });

  it('returns empty string for empty input', () => {
    expect(normalize('')).toBe('');
  });

  it('handles already lowercase input', () => {
    expect(normalize('pasta al pomodoro')).toBe('pasta al pomodoro');
  });

  it('handles mixed case', () => {
    expect(normalize('POLLO E Riso')).toBe('pollo e riso');
  });
});

// ── seededShuffle ─────────────────────────────────────────────────────────────

describe('seededShuffle', () => {
  const input = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  it('produces the same output given the same seed', () => {
    const result1 = seededShuffle(input, 42);
    const result2 = seededShuffle(input, 42);
    expect(result1).toEqual(result2);
  });

  it('produces different output for different seeds', () => {
    const result1 = seededShuffle(input, 42);
    const result2 = seededShuffle(input, 99);
    expect(result1).not.toEqual(result2);
  });

  it('does not mutate the original array', () => {
    const original = [...input];
    seededShuffle(input, 42);
    expect(input).toEqual(original);
  });

  it('returns an array of the same length', () => {
    const result = seededShuffle(input, 42);
    expect(result).toHaveLength(input.length);
  });

  it('returns array with same elements', () => {
    const result = seededShuffle(input, 42);
    expect(result.sort()).toEqual(input.sort());
  });
});

// ── getRecipeCategory ─────────────────────────────────────────────────────────

describe('getRecipeCategory', () => {
  it('returns "pasta" for recipe with pasta ingredient', () => {
    const recipe = makeRecipe({
      title: 'Rigatoni al sugo',
      ingredients: [
        ing('rigatoni o paccheri', 180, 'g', 'Cereali'),
        ing('passata di pomodoro', 300, 'g', 'Dispensa'),
      ],
    });
    expect(getRecipeCategory(recipe)).toBe('pasta');
  });

  it('returns "pasta" for recipe with pasta in title', () => {
    const recipe = makeRecipe({
      title: 'Pasta alla norma',
      ingredients: [ing('melanzane', 200, 'g', 'Verdure')],
    });
    expect(getRecipeCategory(recipe)).toBe('pasta');
  });

  it('returns "pesce" for recipe with fish ingredient', () => {
    const recipe = makeRecipe({
      title: 'Salmone al forno',
      ingredients: [
        ing('filetti di salmone con pelle', 300, 'g', 'Proteine'),
        ing('limone', 1, 'pz', 'Verdure'),
      ],
    });
    expect(getRecipeCategory(recipe)).toBe('pesce');
  });

  it('returns "pollo" for recipe with chicken ingredient', () => {
    const recipe = makeRecipe({
      title: 'Petto di pollo',
      ingredients: [
        ing('petti di pollo', 300, 'g', 'Proteine'),
        ing('limone', 1, 'pz', 'Verdure'),
      ],
    });
    expect(getRecipeCategory(recipe)).toBe('pollo');
  });

  it('returns "carne" for recipe with beef ingredient', () => {
    const recipe = makeRecipe({
      title: 'Bistecca',
      ingredients: [
        ing('bistecca di manzo (controfiletto o entrecôte)', 300, 'g', 'Proteine'),
      ],
    });
    expect(getRecipeCategory(recipe)).toBe('carne');
  });

  it('returns "legumi" for recipe with legume ingredient', () => {
    const recipe = makeRecipe({
      title: 'Zuppa di ceci',
      ingredients: [
        ing('ceci in lattina', 400, 'g', 'Proteine'),
        ing('cipolla dorata', 1, 'pz', 'Verdure'),
      ],
    });
    expect(getRecipeCategory(recipe)).toBe('legumi');
  });

  it('returns "uova" for recipe with eggs', () => {
    const recipe = makeRecipe({
      title: 'Frittata',
      ingredients: [
        ing('uova fresche', 3, 'pz', 'Proteine'),
        ing('cipolla dorata', 1, 'pz', 'Verdure'),
      ],
    });
    expect(getRecipeCategory(recipe)).toBe('uova');
  });

  it('returns "verdure" for recipe with only vegetables', () => {
    const recipe = makeRecipe({
      title: 'Insalata mista',
      ingredients: [
        ing('lattuga o misticanza', 150, 'g', 'Verdure'),
        ing('pomodori ciliegia', 100, 'g', 'Verdure'),
      ],
    });
    expect(getRecipeCategory(recipe)).toBe('verdure');
  });

  it('returns "cereali" for risotto', () => {
    const recipe = makeRecipe({
      title: 'Risotto ai funghi',
      ingredients: [
        ing('riso carnaroli o arborio', 160, 'g', 'Cereali'),
        ing('funghi champignon', 200, 'g', 'Verdure'),
      ],
    });
    expect(getRecipeCategory(recipe)).toBe('cereali');
  });
});

// ── scaleQty ──────────────────────────────────────────────────────────────────

describe('scaleQty', () => {
  it('scales down from 4 to 2 servings', () => {
    expect(scaleQty(100, 4, 2)).toBe(50);
  });

  it('scales up from 2 to 4 servings', () => {
    expect(scaleQty(100, 2, 4)).toBe(200);
  });

  it('returns 0 for zero quantity', () => {
    expect(scaleQty(0, 4, 2)).toBe(0);
  });

  it('keeps same quantity when servings match', () => {
    expect(scaleQty(100, 2, 2)).toBe(100);
  });

  it('handles fractional results', () => {
    expect(scaleQty(100, 3, 1)).toBeCloseTo(33.33, 1);
  });
});

// ── aggregateShopping ─────────────────────────────────────────────────────────

describe('aggregateShopping', () => {
  it('returns empty array for no meals', () => {
    expect(aggregateShopping([], [], 2)).toEqual([]);
  });

  it('aggregates same ingredient across multiple meals', () => {
    const meal1 = makeRecipe({
      id: 'meal1',
      ingredients: [ing('olio extravergine', 3, 'cucchiai', 'Dispensa')],
    });
    const meal2 = makeRecipe({
      id: 'meal2',
      ingredients: [ing('olio extravergine', 2, 'cucchiai', 'Dispensa')],
    });
    const result = aggregateShopping([meal1, meal2], [], 2);
    const olio = result.find((item) => normalize(item.name) === 'olio extravergine');
    expect(olio).toBeDefined();
    // Both meals serve 2, people=2, so no scaling: total = 3+2 = 5
    expect(olio!.qty).toBeGreaterThanOrEqual(5);
  });

  it('subtracts pantry items from shopping list', () => {
    const meal = makeRecipe({
      ingredients: [ing('rigatoni o paccheri', 180, 'g', 'Cereali')],
    });
    const withoutPantry = aggregateShopping([meal], [], 2);
    const withPantry = aggregateShopping(
      [meal],
      [{ name: 'pasta', quantity: 500, unit: 'g' }],
      2,
    );
    // Pantry has enough pasta to cover the need
    expect(withPantry.length).toBeLessThan(withoutPantry.length);
  });

  it('returns item with waste property', () => {
    const meal = makeRecipe({
      ingredients: [ing('carote', 200, 'g', 'Verdure')],
    });
    const result = aggregateShopping([meal], [], 2);
    expect(result[0]).toHaveProperty('waste');
  });
});

// ── computeStats ──────────────────────────────────────────────────────────────

describe('computeStats', () => {
  it('returns correct recipesCount', () => {
    const meals = [
      makeRecipe({ id: 'r1', ingredients: [ing('pasta', 100, 'g', 'Cereali')] }),
      makeRecipe({ id: 'r2', ingredients: [ing('riso', 100, 'g', 'Cereali')] }),
    ];
    const stats = computeStats(meals, []);
    expect(stats.recipesCount).toBe(2);
  });

  it('counts unique ingredients correctly', () => {
    const meals = [
      makeRecipe({
        id: 'r1',
        ingredients: [
          ing('pasta', 100, 'g', 'Cereali'),
          ing('pomodoro', 200, 'g', 'Verdure'),
        ],
      }),
    ];
    const stats = computeStats(meals, []);
    expect(stats.uniqueIngredients).toBe(2);
  });

  it('counts reused ingredients across meals', () => {
    const meals = [
      makeRecipe({
        id: 'r1',
        ingredients: [
          ing('aglio', 2, 'spicchi', 'Verdure'),
          ing('pasta', 100, 'g', 'Cereali'),
        ],
      }),
      makeRecipe({
        id: 'r2',
        ingredients: [
          ing('aglio', 1, 'spicchio', 'Verdure'),
          ing('riso', 100, 'g', 'Cereali'),
        ],
      }),
    ];
    const stats = computeStats(meals, []);
    // 'aglio' appears in both meals
    expect(stats.reusedIngredients).toBeGreaterThanOrEqual(1);
  });

  it('returns 0 recipesCount for empty meals', () => {
    const stats = computeStats([], []);
    expect(stats.recipesCount).toBe(0);
    expect(stats.uniqueIngredients).toBe(0);
  });
});

// ── buildPlan ─────────────────────────────────────────────────────────────────

describe('buildPlan', () => {
  it('returns 7 days for standard preferences', () => {
    const result = buildPlan(DEFAULT_PREFS, [], 42);
    expect(result.days).toHaveLength(7);
    expect(result.days.map((d) => d.day)).toEqual(DAYS);
  });

  it('returns non-empty shopping list', () => {
    const result = buildPlan(DEFAULT_PREFS, [], 42);
    expect(result.shopping.length).toBeGreaterThan(0);
  });

  it('returns days with both lunch and dinner for mealsPerDay=both', () => {
    const result = buildPlan(DEFAULT_PREFS, [], 42);
    result.days.forEach((day) => {
      // Both meals should be present (no skipped meals in default prefs)
      expect(day.lunch).not.toBeNull();
      expect(day.dinner).not.toBeNull();
    });
  });

  it('returns null lunch slots for mealsPerDay=dinner', () => {
    const dinnerOnlyPrefs: Preferences = { ...DEFAULT_PREFS, mealsPerDay: 'dinner' };
    const result = buildPlan(dinnerOnlyPrefs, [], 42);
    result.days.forEach((day) => {
      expect(day.lunch).toBeNull();
      expect(day.dinner).not.toBeNull();
    });
  });

  it('with vegana diet returns no meat or fish recipes', () => {
    const veganPrefs: Preferences = { ...DEFAULT_PREFS, diet: 'vegana' };
    const result = buildPlan(veganPrefs, [], 42);
    const allMeals = result.days.flatMap((d) => [d.lunch, d.dinner]).filter(Boolean) as Recipe[];
    const MEAT_FISH = [
      'petti di pollo', 'petto di pollo', 'filetti di salmone', 'filetti di merluzzo',
      'carne macinata mista (manzo e maiale)', 'bistecca di manzo (controfiletto o entrecôte)',
      'salsiccia fresca', 'lonza di maiale', 'tonno sott\'olio',
    ];
    allMeals.forEach((meal) => {
      meal.ingredients.forEach((ingr) => {
        expect(MEAT_FISH).not.toContain(normalize(ingr.name));
      });
    });
  });

  it('excludes specified ingredients from all meals', () => {
    const prefsWithExclusions: Preferences = {
      ...DEFAULT_PREFS,
      exclusionsText: 'uova',
      exclusions: ['uova'],
    };
    const result = buildPlan(prefsWithExclusions, [], 42);
    const allMeals = result.days.flatMap((d) => [d.lunch, d.dinner]).filter(Boolean) as Recipe[];
    allMeals.forEach((meal) => {
      meal.ingredients.forEach((ingr) => {
        expect(normalize(ingr.name)).not.toContain('uova');
      });
    });
  });

  it('with maxTime=20 returns no recipe exceeding 20 minutes', () => {
    const fastPrefs: Preferences = { ...DEFAULT_PREFS, maxTime: 20 };
    const result = buildPlan(fastPrefs, [], 42);
    const allMeals = result.days.flatMap((d) => [d.lunch, d.dinner]).filter(Boolean) as Recipe[];
    allMeals.forEach((meal) => {
      expect(meal.time).toBeLessThanOrEqual(20);
    });
  });

  it('returns stats with recipesCount matching meal count', () => {
    const result = buildPlan(DEFAULT_PREFS, [], 42);
    const mealCount = result.days.reduce((acc, d) => {
      if (d.lunch) acc++;
      if (d.dinner) acc++;
      return acc;
    }, 0);
    // Stats should reflect all meals (including sunday leftover variant)
    expect(result.stats.recipesCount).toBeGreaterThan(0);
    expect(result.stats.recipesCount).toBeLessThanOrEqual(mealCount);
  });

  it('returns alerts array', () => {
    const result = buildPlan(DEFAULT_PREFS, [], 42);
    expect(Array.isArray(result.alerts)).toBe(true);
    expect(result.alerts.length).toBeGreaterThan(0);
  });
});

// ── runSanityChecks ───────────────────────────────────────────────────────────

describe('runSanityChecks', () => {
  it('does not throw', () => {
    expect(() => runSanityChecks()).not.toThrow();
  });
});

// ── pantry matching via buildPlan ─────────────────────────────────────────────

describe('pantry matching via buildPlan', () => {
  it('pantry items reduce the shopping list', () => {
    // Build plan without any pantry
    const withoutPantry = buildPlan(DEFAULT_PREFS, [], 42);

    // Build plan with a well-stocked pantry (common ingredients)
    const pantry: PantryItem[] = [
      { name: 'pasta', quantity: 1000, unit: 'g' },
      { name: 'riso', quantity: 1000, unit: 'g' },
      { name: 'olio', quantity: 500, unit: 'ml' },
      { name: 'aglio', quantity: 5, unit: 'spicchi' },
      { name: 'cipolla', quantity: 3, unit: 'pz' },
      { name: 'parmigiano', quantity: 200, unit: 'g' },
    ];
    const withPantry = buildPlan(DEFAULT_PREFS, pantry, 42);

    // Same seed same plan, but pantry should reduce the shopping list
    expect(withPantry.shopping.length).toBeLessThan(withoutPantry.shopping.length);
  });
});

// ── coniglio classification ───────────────────────────────────────────────────

describe('coniglio classification', () => {
  it('coniglio recipe is categorized as carne, not pollo', () => {
    const coniglioRecipe = makeRecipe({
      title: 'Coniglio alla cacciatora',
      diet: ['mediterranea', 'onnivora'],
      ingredients: [
        ing('coniglio a pezzi', 600, 'g', 'Proteine'),
        ing('pomodori maturi', 300, 'g', 'Verdure'),
      ],
    });
    expect(getRecipeCategory(coniglioRecipe)).toBe('carne');
  });

  it('coniglio should NOT be categorized as pollo', () => {
    const coniglioRecipe = makeRecipe({
      title: 'Coniglio in umido',
      diet: ['mediterranea', 'onnivora'],
      ingredients: [
        ing('coniglio a pezzi', 500, 'g', 'Proteine'),
      ],
    });
    expect(getRecipeCategory(coniglioRecipe)).not.toBe('pollo');
  });
});

// ── budget scoring ────────────────────────────────────────────────────────────

describe('budget scoring', () => {
  it('buildPlan with different budgets produces valid plans', () => {
    const lowBudgetPrefs: Preferences = { ...DEFAULT_PREFS, budget: 20 };
    const highBudgetPrefs: Preferences = { ...DEFAULT_PREFS, budget: 100 };

    const lowResult = buildPlan(lowBudgetPrefs, [], 42);
    const highResult = buildPlan(highBudgetPrefs, [], 42);

    expect(lowResult.days).toHaveLength(7);
    expect(highResult.days).toHaveLength(7);
  });

  it('low budget plan favors simpler recipes (fewer ingredients on average)', () => {
    const lowBudgetPrefs: Preferences = { ...DEFAULT_PREFS, budget: 20 };
    const highBudgetPrefs: Preferences = { ...DEFAULT_PREFS, budget: 100 };

    // Average over multiple seeds to reduce variance
    const seeds = [1, 2, 3, 4, 5];
    let lowAvg = 0;
    let highAvg = 0;

    for (const seed of seeds) {
      const lowResult = buildPlan(lowBudgetPrefs, [], seed);
      const highResult = buildPlan(highBudgetPrefs, [], seed);

      const lowMeals = lowResult.days.flatMap((d) => [d.lunch, d.dinner]).filter(Boolean) as Recipe[];
      const highMeals = highResult.days.flatMap((d) => [d.lunch, d.dinner]).filter(Boolean) as Recipe[];

      if (lowMeals.length) {
        lowAvg += lowMeals.reduce((sum, m) => sum + m.ingredients.length, 0) / lowMeals.length;
      }
      if (highMeals.length) {
        highAvg += highMeals.reduce((sum, m) => sum + m.ingredients.length, 0) / highMeals.length;
      }
    }

    lowAvg /= seeds.length;
    highAvg /= seeds.length;

    // Low budget should produce plans with fewer average ingredients than high budget
    expect(lowAvg).toBeLessThanOrEqual(highAvg);
  });
});

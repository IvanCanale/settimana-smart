import type { Recipe, RecipeIngredient, PantryItem, Preferences, PreferenceLearning, PlanResult, PlanStats, ShoppingItem, DayPlan, FreezeItem, MainCategory, MealSlot } from "@/types";
import { RECIPE_LIBRARY } from "@/data/recipes";

export const DAYS = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];
export const CATEGORY_ORDER = ["Verdure", "Proteine", "Latticini", "Cereali", "Dispensa"];
export const SKIP_OPTIONS = [
  "Lun-pranzo","Lun-cena","Mar-pranzo","Mar-cena","Mer-pranzo","Mer-cena",
  "Gio-pranzo","Gio-cena","Ven-pranzo","Ven-cena","Sab-pranzo","Sab-cena","Dom-pranzo","Dom-cena",
];

export function normalize(text: string) {
  return text.trim().toLowerCase();
}

// Canonical ingredient name map — collapses Italian variants to a single shopping key.
// Used in aggregateShopping to merge entries that would otherwise be separate.
const CANONICAL_INGREDIENT: Record<string, string> = {
  "pomodori pelati":           "pomodoro",
  "pomodorini":                "pomodoro",
  "pomodori ciliegia":         "pomodoro",
  "pomodori maturi":           "pomodoro",
  "pomodori ciliegia misti (anche gialli)": "pomodoro",
  "petti di pollo":            "pollo",
  "petto di pollo":            "pollo",
  "cosce di pollo disossate":  "pollo",
  "pollo intero o cosce e sovracosce": "pollo",
  "riso basmati":              "riso",
  "riso carnaroli o arborio":  "riso",
  "riso integrale o semintegrale": "riso",
  "lenticchie verdi o marroni": "lenticchie",
  "lenticchie rosse decorticate": "lenticchie",
  "lenticchie in lattina o gia cotte": "lenticchie",
  "ceci in lattina":           "ceci",
  "fagioli borlotti in lattina": "fagioli",
  "fagioli cannellini in lattina": "fagioli",
};

export function canonicalizeName(raw: string): string {
  const n = normalize(raw);
  return CANONICAL_INGREDIENT[n] ?? n;
}

// Fuzzy match per la dispensa: gestisce varianti di nome
// es. "uova" matches "uova fresche", "pollo" matches "petto di pollo"
function pantryMatches(pantryName: string, ingredientName: string): boolean {
  const p = normalize(pantryName);
  const i = normalize(ingredientName);
  if (p === i) return true;
  // Match esatto contenuto
  if (i.includes(p) || p.includes(i)) return true;
  // Alias comuni
  const aliases: Record<string, string[]> = {
    "uova": ["uova fresche"],
    "pollo": ["petto di pollo", "petti di pollo", "cosce di pollo disossate", "pollo intero o cosce e sovracosce"],
    "tacchino": ["fesa di tacchino", "fesa di tacchino a fette"],
    "salmone": ["filetti di salmone", "filetti di salmone con pelle", "salmone affumicato"],
    "merluzzo": ["filetti di merluzzo"],
    "gamberi": ["gamberi freschi o decongelati"],
        "spinaci": ["spinaci freschi"],
    "lattuga": ["lattuga o misticanza"],
    "pomodori": ["pomodori ciliegia", "pomodori ciliegia misti (anche gialli)", "pomodori maturi", "pomodorini"],
    "funghi": ["funghi champignon"],
    "peperoni": ["peperoni misti (rosso e giallo)"],
    "mozzarella": ["mozzarella fiordilatte"],
    "feta": ["feta greca"],
    "ricotta": ["ricotta fresca"],
    "lenticchie": ["lenticchie verdi o marroni", "lenticchie rosse decorticate", "lenticchie in lattina o già cotte"],
    "ceci": ["ceci in lattina"],
    "fagioli": ["fagioli borlotti in lattina", "fagioli cannellini in lattina"],
    "pasta": ["rigatoni o paccheri", "spaghetti", "penne rigate", "trofie o fusilli", "pasta (conchiglie o penne)", "pasta (tagliatelle o pappardelle)", "pasta (rigatoni o sedanini)", "pasta mista o ditaloni", "pasta (farfalle o penne)", "pasta (spaghetti o linguine)", "orecchiette o pasta corta"],
    "riso": ["riso basmati", "riso carnaroli o arborio", "riso integrale o semintegrale", "riso basmati cotto (anche avanzato)"],
    "prezzemolo": ["prezzemolo fresco"],
    "basilico": ["basilico fresco", "menta o basilico fresco"],
    "menta": ["menta fresca"],
    "rosmarino": ["rosmarino fresco"],
    "timo": ["timo fresco"],
    "salvia": ["salvia fresca"],
    "cipolla": ["cipolla dorata", "cipolla rossa"],
    "olio": ["olio extravergine", "olio di semi di girasole", "olio di sesamo"],
    "parmigiano": ["parmigiano grattugiato"],
    "burro": ["burro"],
    "aglio": ["aglio"],
    "limone": ["limone"],
    "vitello": ["fettine di vitello sottili","fesa di vitello","ossobuco di vitello","scaloppine di vitello","carne di vitello"],
    "maiale": ["lonza di maiale","lonza di maiale con cotenna","salsiccia fresca","braciole di maiale","costine di maiale"],
    "salsiccia": ["salsiccia fresca","salsiccia di maiale"],
    "agnello": ["agnello a pezzi","cosciotto di agnello","costolette di agnello"],
    "coniglio": ["coniglio a pezzi"],
    "polpo": ["polpo fresco o surgelato"],
    "spada": ["tranci di pesce spada"],
    "pesce spada": ["tranci di pesce spada"],
    "tonno fresco": ["tranci di tonno fresco"],
    "trippa": ["trippa precotta"],
    "lonza": ["lonza di maiale","lonza di maiale con cotenna"],
    "avocado": ["avocado maturo","avocado"],
    "bulgur": ["bulgur fine","bulgur"],
    "farro": ["farro perlato","farro"],
    "orzo": ["orzo perlato","orzo"],
    "quinoa": ["quinoa","quinoa cotta"],
    "tempeh": ["tempeh"],
    "tahini": ["tahini","crema di sesamo"],
    "miso": ["pasta di miso bianco","miso"],
    "barbabietola": ["barbabietola cotta","barbabietola"],
    "edamame": ["edamame surgelati","edamame"],
    "mango": ["mango maturo","mango"],
    "erba cipollina": ["erba cipollina","erba cipollina o aneto"],
    "aneto": ["aneto","erba cipollina o aneto"],
    "wurstel": ["wurstel o prosciutto cotto"],
    "prosciutto cotto": ["prosciutto cotto","prosciutto cotto a fette","wurstel o prosciutto cotto"],
    "bistecca": ["bistecca di manzo (controfiletto o entrecôte)"],
    "branzino": ["branzino intero o filetti"],
    "ossobuco": ["ossobuco di vitello"],
    "coda": ["coda di bue a pezzi"],
    "pancetta": ["pancetta tesa a cubetti"],
    "speck": ["speck a fette","speck a listarelle"],
    "cozze": ["cozze fresche","cozze sgusciate cotte"],
    "vongole": ["vongole fresche"],
    "seppie": ["seppie pulite"],
    "tonno": ["tonno sott'olio di qualità","tonno sott'olio","tonno sott'olio buono","tranci di tonno fresco"],
    "orata": ["orata intera o filetti"],
    "pollo macinato": ["petto di pollo macinato"],
    "carne macinata": ["carne macinata mista (manzo e maiale)"],
    "fettine di manzo": ["fettine di manzo (scamone o fesa)"],
    "manzo": ["manzo da brasato (cappello del prete)","manzo da spezzatino","bistecca di manzo (controfiletto o entrecôte)","fettine di manzo (scamone o fesa)"],
  };
  for (const [key, variants] of Object.entries(aliases)) {
    if ((p === key || p.includes(key)) && variants.some((v) => i.includes(v) || v.includes(i))) return true;
    if (variants.some((v) => p.includes(v) || v.includes(p)) && (i === key || i.includes(key))) return true;
  }
  return false;
}

export function seededShuffle<T>(items: T[], seed: number) {
  const arr = [...items];
  let s = seed;
  for (let i = arr.length - 1; i > 0; i -= 1) {
    s = (s * 1664525 + 1013904223) % 4294967296;
    const j = Math.floor((s / 4294967296) * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function getRecipeCategory(recipeItem: Recipe): MainCategory {
  const names = recipeItem.ingredients.map((i) => normalize(i.name));
  const title = normalize(recipeItem.title);
  if (title.includes("pasta") || title.includes("spaghetti") || title.includes("bucatini") || title.includes("carbonara") || title.includes("amatriciana") || title.includes("cacio") || title.includes("trofie") || title.includes("linguine") || title.includes("tagliatelle") || title.includes("maltagliati") || names.some((n) => ["rigatoni o paccheri","spaghetti","penne rigate","trofie o linguine","trofie o fusilli","pasta (conchiglie o penne)","orecchiette o pasta corta","pasta (tagliatelle o pappardelle)","pasta (rigatoni o sedanini)","pasta mista o ditaloni","pasta (farfalle o penne)","pasta (spaghetti o linguine)","sfoglie lasagna secche","cannelloni secchi","bucatini","pasta corta (rigatoni o penne)","pasta mista o ditaloni","pasta avanzata condita","pasta corta mista o maltagliati","pasta (mezze maniche o rigatoni)","pasta (rigatoni o fusilli)","pasta (tagliatelle o penne)"].includes(n))) return "pasta";
  if (title.includes("gnocchi") || title.includes("risotto") || title.includes("focaccia") || title.includes("pizza") || names.some((n) => ["riso basmati","riso carnaroli","riso carnaroli o arborio","riso integrale o semintegrale","riso basmati cotto (anche avanzato)","farro perlato","orzo perlato","bulgur","cous cous","quinoa","sfoglie lasagna","piadina o wrap integrali","gnocchi di patate freschi","bulgur fine","pasta brisée o sfoglia pronta","pasta brisée pronta","farina di polenta istantanea","farina 00 o manitoba","cous cous","piadine romagnole","piadine o wrap","pane a cassetta","pane a cassetta o brioche tostate"].includes(n))) return "cereali";
  if (names.some((n) => ["filetti di salmone con pelle","filetti di salmone","salmone affumicato","filetti di merluzzo","orata intera o filetti","gamberi freschi o decongelati","gamberi","cozze fresche","tonno sott'olio di qualità","tonno sott'olio","branzino intero o filetti","polpo fresco o surgelato","acciughe sott'olio","vongole fresche","sarde fresche o sott'olio","tranci di tonno fresco","sogliole intere o filetti","baccalà dissalato","gamberetti cotti","seppie pulite","cozze sgusciate cotte","tonno sott'olio buono","tranci di pesce spada"].includes(n)) || recipeItem.tags.includes("pesce")) return "pesce";
  if (names.some((n) => ["ceci in lattina","lenticchie verdi o marroni","lenticchie rosse decorticate","lenticchie in lattina o già cotte","fagioli borlotti in lattina","fagioli cannellini in lattina","hummus","burger di ceci già pronti","tofu compatto","burger vegetali","falafel surgelati o pronti","tempeh","edamame","lenticchie verdi","lenticchie verdi o marroni cotte","fagiolini","edamame (fagioli di soia sgusciati)"].includes(n))) return "legumi";
  if (names.includes("uova fresche") || names.includes("uova")) return "uova";
  if (names.some((n) => ["petti di pollo","petto di pollo","cosce di pollo disossate","pollo intero o cosce e sovracosce","fesa di tacchino","fesa di tacchino a fette","petto di pollo macinato"].includes(n))) return "pollo";
  if (names.some((n) => ["carne macinata mista (manzo e maiale)","bistecca di manzo (controfiletto o entrecôte)","fettine di manzo (scamone o fesa)","manzo da brasato (cappello del prete)","ossobuco di vitello","fettine di vitello sottili","fesa di vitello","coda di bue a pezzi","coniglio a pezzi","lonza di maiale","manzo da spezzatino","cosciotto di agnello","agnello a pezzi","trippa precotta","salsiccia fresca","lonza di maiale con cotenna"].includes(n))) return "carne";
  return "verdure";
}

function scoreRecipe(recipeItem: Recipe, selected: Preferences, pantrySet: Set<string>, usedCounts: Record<string, number>, leftoversAllowed: boolean) {
  let score = 0;
  if (recipeItem.time <= selected.maxTime) score += 4;
  if (recipeItem.diet.includes(selected.diet)) score += 6;
  if (selected.skill === recipeItem.difficulty) score += 2;
  if (selected.skill === "intermediate" && recipeItem.difficulty === "beginner") score += 1;
  if (leftoversAllowed && recipeItem.tags.includes("avanzi")) score += 2;
  recipeItem.ingredients.forEach((ingr) => {
    const key = normalize(ingr.name);
    // Check dispensa con fuzzy match
    const inPantry = pantrySet.has(key) || Array.from(pantrySet).some((p) => pantryMatches(p, ingr.name));
    if (inPantry) score += 3;
    if (usedCounts[key]) score += usedCounts[key] * 2;
  });
  return score;
}

export function scaleQty(qty: number, recipeServings: number, targetPeople: number) {
  return (qty / recipeServings) * targetPeople;
}

function roundPurchaseQuantity(item: RecipeIngredient, qty: number) {
  const unit = normalize(item.unit);
  if (["pz","pezzi","spicchio","spicchi","foglie","foglia","rametti","rametto","gambi","gambo","bustina","mazzetto","mazzetti"].includes(unit)) return Math.max(1, Math.round(qty));
  if (unit === "g") {
    if (qty <= 250) return Math.ceil(qty / 50) * 50;
    if (qty <= 1000) return Math.ceil(qty / 100) * 100;
    return Math.ceil(qty / 250) * 250;
  }
  if (unit === "ml") {
    if (qty <= 250) return Math.ceil(qty / 50) * 50;
    if (qty <= 1000) return Math.ceil(qty / 100) * 100;
    return Math.ceil(qty / 250) * 250;
  }
  if (unit === "kg" || unit === "l") return Math.ceil(qty * 10) / 10;
  if (["cucchiaio","cucchiai","cucchiaino","cucchiaini"].includes(unit)) return Math.max(1, Math.round(qty));
  if (unit === "cm") return Math.max(1, Math.round(qty));
  return Number(qty.toFixed(1));
}

function estimateWaste(needed: number, bought: number) {
  const waste = bought - needed;
  if (waste <= 0) return 0;
  return Number(waste.toFixed(1));
}

export function aggregateShopping(meals: Recipe[], pantryItems: PantryItem[], people: number): ShoppingItem[] {
  const pantryQtyMap = new Map(pantryItems.map((item) => [normalize(item.name), Number(item.quantity || 0)]));
  const shoppingMap = new Map<string, RecipeIngredient>();
  meals.forEach((meal) => {
    meal.ingredients.forEach((ingr) => {
      const key = canonicalizeName(ingr.name);
      const canonical = CANONICAL_INGREDIENT[normalize(ingr.name)] ?? ingr.name;
      const existing = shoppingMap.get(key) || { ...ingr, qty: 0, name: canonical };
      existing.qty += scaleQty(ingr.qty, meal.servings, people);
      shoppingMap.set(key, existing);
    });
  });
  const FRESH_HERBS = ["basilico fresco","menta fresca","prezzemolo fresco","erba cipollina","salvia fresca","timo fresco","rosmarino fresco","menta o basilico fresco","basilico e menta freschi","aneto","erba cipollina o aneto"];

  return Array.from(shoppingMap.values())
    .map((item) => {
      // Cerca nella dispensa con fuzzy match
      let pantryQty = pantryQtyMap.get(normalize(item.name)) || 0;
      if (pantryQty === 0) {
        for (const [pantryKey, pantryVal] of pantryQtyMap.entries()) {
          if (pantryMatches(pantryKey, item.name)) { pantryQty = pantryVal; break; }
        }
      }
      const neededQty = item.qty - pantryQty;
      if (neededQty <= 0) return null;
      // Erbe fresche: nella spesa sempre "1 mazzetto" indipendentemente dalle foglie
      if (FRESH_HERBS.includes(normalize(item.name))) {
        return { ...item, qty: 1, unit: "mazzetto", waste: 0 };
      }
      const roundedQty = roundPurchaseQuantity(item, neededQty);
      const wasteRatio = roundedQty > 0 ? (roundedQty - neededQty) / neededQty : 0;
      const finalQty = wasteRatio > 0.4 && neededQty > 50 ? Math.ceil(neededQty / 50) * 50 : roundedQty;
      const waste = estimateWaste(neededQty, finalQty);
      return { ...item, qty: finalQty, waste };
    })
    .filter((item): item is ShoppingItem => Boolean(item))
    .sort((a, b) => {
      const categoryDiff = CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category);
      return categoryDiff !== 0 ? categoryDiff : a.name.localeCompare(b.name);
    });
}

export function computeStats(meals: Recipe[], shopping: ShoppingItem[]): PlanStats {
  const ingredientUse: Record<string, number> = {};
  const categoryCounts: Record<string, number> = {};
  meals.forEach((meal) => {
    meal.ingredients.forEach((ingr) => {
      const key = normalize(ingr.name);
      ingredientUse[key] = (ingredientUse[key] || 0) + 1;
    });
    const category = getRecipeCategory(meal);
    categoryCounts[category] = (categoryCounts[category] || 0) + 1;
  });
  const reusedIngredients = Object.values(ingredientUse).filter((count) => count > 1).length;
  return {
    recipesCount: meals.length,
    uniqueIngredients: Object.keys(ingredientUse).length,
    reusedIngredients,
    estimatedSavings: reusedIngredients * 2.5,
    estimatedTotal: Math.max(12, shopping.length * 1.8),
    categoryCounts,
  };
}

function pickCoreIngredients(recipes: Recipe[], count = 8) {
  const freq: Record<string, number> = {};
  recipes.forEach((rec) => {
    rec.ingredients.forEach((ingr) => {
      const key = normalize(ingr.name);
      freq[key] = (freq[key] || 0) + 1;
    });
  });
  return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, count).map((x) => x[0]);
}

export const FREEZE_CANDIDATES = [
    "petti di pollo",    "petto di pollo",    "cosce di pollo disossate",
    "fesa di tacchino",    "fesa di tacchino a fette",    "pollo intero o cosce e sovracosce",
    "petto di pollo macinato",    "carne macinata mista (manzo e maiale)",    "bistecca di manzo (controfiletto o entrecôte)",
    "fettine di manzo (scamone o fesa)",    "fettine di vitello sottili",    "fesa di vitello",
    "salsiccia fresca",    "lonza di maiale",    "lonza di maiale con cotenna",
    "coniglio a pezzi",    "agnello a pezzi",    "cosciotto di agnello",
    "manzo da spezzatino",    "filetti di salmone",    "filetti di salmone con pelle",
    "filetti di merluzzo",    "gamberi freschi o decongelati",    "gamberi",
    "orata intera o filetti",    "tranci di tonno fresco",    "tranci di pesce spada",
    "sogliole intere o filetti",    "polpo fresco o surgelato",    "sarde fresche o sott'olio",
    "cozze fresche",    "cozze sgusciate cotte",    "vongole fresche",
    "seppie pulite",    "branzino intero o filetti",    "coda di bue a pezzi",
    "manzo da brasato (cappello del prete)",    "ossobuco di vitello",    "tacchino",
    "ali di pollo",    "sovracosce di pollo",    "petto di tacchino",
    "anatra"
  ];
// Mappa allergie EU → parole chiave che compaiono nei nomi degli ingredienti del database ricette
const ALLERGEN_INGREDIENT_MAP: Record<string, string[]> = {
  glutine: [
    "pasta","penne","spaghetti","bucatini","rigatoni","linguine","tagliatelle","pappardelle",
    "fusilli","orecchiette","farfalle","trofie","cannelloni","lasagna","lasagne","sfoglie",
    "gnocchi","farina","pane","pangrattato","panini","brioche","brisée","pizza","grissini",
    "piadina","piadine","wrap","cous cous","couscous","bulgur","farro","orzo","avena","semola",
  ],
  latticini: [
    "latte intero","mozzarella","burrata","parmigiano","pecorino","burro","ricotta",
    "formaggio","yogurt","gorgonzola","mascarpone","stracchino","squacquerone",
    "scamorza","provola","emmenthal","gruyère","feta","panna","pesto",
  ],
  uova: ["uova","maionese"],
  crostacei: [
    "gamberi","gamberetti","cozze","vongole","seppie","polpo","aragosta","scampi","mazzancolle",
  ],
  "frutta a guscio": ["noci","mandorle","nocciole","pistacchi","pinoli","anacardi","castagne","pecan"],
  arachidi: ["arachidi"],
  sesamo: ["sesamo","tahini","olio di sesamo"],
  soia: ["soia","tofu","edamame","tempeh","miso"],
  sedano: ["sedano"],
};

export function recipeContainsAllergen(recipeItem: Recipe, allergen: string): boolean {
  const keywords = ALLERGEN_INGREDIENT_MAP[allergen];
  if (keywords) {
    return recipeItem.ingredients.some((i) => keywords.some((k) => normalize(i.name).includes(k)));
  }
  // Fallback: controlla nome ingrediente e categoria
  return recipeItem.ingredients.some((i) => normalize(i.name).includes(allergen))
    || getRecipeCategory(recipeItem) === allergen;
}

export function validateAllergenSafety(plan: PlanResult, exclusions: string[]): boolean {
  const allMeals = plan.days.flatMap(d => [d.lunch, d.dinner]).filter(Boolean) as Recipe[];
  return !allMeals.some(meal =>
    exclusions.some(ex => recipeContainsAllergen(meal, ex))
  );
}

export function buildPlan(preferences: Preferences, pantryItems: PantryItem[], seed: number, learning?: PreferenceLearning, recipesOverride?: Recipe[]): PlanResult {
  const pool_source = recipesOverride ?? RECIPE_LIBRARY;
  const pantrySet = new Set(pantryItems.map((x) => normalize(x.name)));
  const exclusions = preferences.exclusions || [];

  // Ogni settimana esclude una delle 3 categorie proteiche principali a rotazione
  // seed % 3: 0=escludi carne, 1=escludi pesce, 2=escludi pollo
  const proteinRotation = seed % 3;
  const MEAT_INGREDIENTS = [
    "carne macinata mista (manzo e maiale)",    "bistecca di manzo (controfiletto o entrecôte)",    "fettine di manzo (scamone o fesa)",    "manzo",
    "controfiletto",    "scamone",    "fesa di manzo",    "manzo da spezzatino",
    "manzo da brasato (cappello del prete)",    "maiale",    "lonza di maiale",    "lonza di maiale con cotenna",
    "braciole di maiale",    "costine di maiale",    "salsiccia",    "salsiccia fresca",
    "pancetta",    "pancetta tesa a cubetti",    "guanciale",    "speck",
    "speck a fette",    "prosciutto crudo",    "prosciutto cotto",    "wurstel o prosciutto cotto",
    "vitello",    "fettine di vitello",    "fettine di vitello sottili",    "scaloppine di vitello",
    "ossobuco",    "ossobuco di vitello",    "macinato di vitello",    "fesa di vitello",
    "agnello",    "agnello a pezzi",    "cosciotto di agnello",    "costolette di agnello",
    "coniglio",    "coniglio a pezzi",    "trippa",    "trippa precotta",
    "coda di bue a pezzi",    "prosciutto cotto a fette",    "speck a listarelle"
  ];

  const FISH_INGREDIENTS = [
    "filetti di salmone","filetti di salmone con pelle","filetti di merluzzo","gamberi freschi o decongelati","gamberi",
    "cozze fresche","cozze sgusciate cotte","vongole fresche","tonno sott\'olio di qualità","tonno sott\'olio",
    "salmone affumicato","orata intera o filetti","branzino intero o filetti","branzino","spigola",
    "filetti di sogliola","sogliole intere o filetti","filetti di trota","acciughe","acciughe sott\'olio",
    "sardine","sarde fresche o sott\'olio","polpo","polpo fresco o surgelato","seppie","seppie pulite",
    "calamari","tranci di tonno fresco","tranci di pesce spada","baccalà dissalato","gamberetti cotti",
    "acciughe sott'olio","sarde fresche o sott'olio","tonno sott'olio buono",
    "tonno sott'olio","tonno sott'olio di qualità",
  ];
  const POULTRY_INGREDIENTS = [
    "petti di pollo",    "petto di pollo",    "cosce di pollo disossate",
    "fesa di tacchino",    "fesa di tacchino a fette",    "pollo intero o cosce e sovracosce",
    "petto di pollo macinato",    "tacchino",    "ali di pollo",
    "sovracosce di pollo",    "petto di tacchino",    "anatra",
  ];

  const excludedProtein = proteinRotation === 0 ? MEAT_INGREDIENTS : proteinRotation === 1 ? FISH_INGREDIENTS : POULTRY_INGREDIENTS;

  const eligible = pool_source.filter((recipeItem) => {
    const isWishlisted = preferences.wishlistedRecipeIds?.includes(recipeItem.id) ?? false;
    // Allergen check: mai bypassato — sicurezza alimentare
    if (exclusions.some((ex) => recipeContainsAllergen(recipeItem, ex))) return false;
    // Ricette in wishlist bypassano dieta, tempo e rotazione proteica
    if (isWishlisted) return true;
    if (!recipeItem.diet.includes(preferences.diet)) return false;
    if (recipeItem.tags.includes("speciale") || recipeItem.tags.includes("domenica")) return false;
    if (recipeItem.time > preferences.maxTime) return false;
    // Escludi la categoria proteica di questa settimana (solo per diete onnivore/mediterranee)
    if (["onnivora","mediterranea"].includes(preferences.diet)) {
      if (recipeItem.ingredients.some((i) => excludedProtein.includes(normalize(i.name)))) return false;
    }
    return true;
  });

  const specialEligible = pool_source.filter((recipeItem) => {
    if (!recipeItem.diet.includes(preferences.diet)) return false;
    if (!(recipeItem.tags.includes("speciale") || recipeItem.tags.includes("domenica"))) return false;
    if (recipeItem.time > Math.max(preferences.maxTime, 60)) return false;
    if (exclusions.some((ex) => recipeItem.ingredients.some((i) => normalize(i.name).includes(ex)))) return false;
    return true;
  });

  if (!eligible.length && !specialEligible.length) {
    return {
      days: DAYS.map((day) => ({ day, lunch: null, dinner: null, notes: [] })),
      shopping: [],
      stats: { recipesCount: 0, uniqueIngredients: 0, reusedIngredients: 0, estimatedSavings: 0, estimatedTotal: 0, categoryCounts: {} },
      alerts: ["Nessuna ricetta compatibile con i filtri selezionati."],
      freezeItems: [],
    };
  }

  const coreIngredients = preferences.coreIngredients.length
    ? preferences.coreIngredients.map((x) => normalize(x))
    : pickCoreIngredients(eligible.length ? eligible : specialEligible, 8);

  const pool = seededShuffle(eligible.length ? eligible : specialEligible, seed);
  const specialPool = seededShuffle(specialEligible.length ? specialEligible : eligible, seed + 97);
  const usedIngredientCounts: Record<string, number> = {};
  const usedRecipeCounts: Record<string, number> = {};
  const categoryCounts: Record<string, number> = { pasta: 0, cereali: 0, pollo: 0, pesce: 0, legumi: 0, uova: 0, carne: 0, verdure: 0 };
  const perishableCounts: Record<string, number> = {};
  const allMeals: Recipe[] = [];
  const usedThisWeek = new Set<string>();
  let lastPickedId: string | null = null;
  let lastDinnerCategory: MainCategory | null = null;

  // Per vegani e vegetariani, aumenta i limiti per categoria
  const isRestrictedDiet = preferences.diet === "vegana" || preferences.diet === "vegetariana";

  const targets = preferences.mealsPerDay === "both"
    ? (isRestrictedDiet
        ? { pasta: 2, cereali: 2, pollo: 0, pesce: 0, legumi: 3, uova: 2, carne: 0, verdure: 3 }
        : { pasta: 1, cereali: 1, pollo: 1, pesce: 1, legumi: 1, uova: 1, carne: 1, verdure: 1 })
    : (isRestrictedDiet
        ? { pasta: 1, cereali: 1, pollo: 0, pesce: 0, legumi: 2, uova: 1, carne: 0, verdure: 2 }
        : { pasta: 1, cereali: 1, pollo: 1, pesce: 1, legumi: 1, uova: 1, carne: 1, verdure: 1 });

  const maxPerCategory = isRestrictedDiet
    ? { pasta: 4, cereali: 4, pollo: 0, pesce: 0, legumi: 4, uova: 2, carne: 0, verdure: 4 }
    : { pasta: 2, cereali: 2, pollo: 2, pesce: 2, legumi: 2, uova: 2, carne: 2, verdure: 2 };

  const freshnessWeight = (name: string) => {
    const key = normalize(name);
    if (["spinaci freschi","lattuga o misticanza","lattuga","rucola",
      "filetti di salmone con pelle","filetti di salmone","filetti di merluzzo",
      "gamberi freschi o decongelati","gamberi","orata intera o filetti",
      "tranci di tonno fresco","tranci di pesce spada","sogliole intere o filetti",
      "polpo fresco o surgelato","sarde fresche o sott'olio",
      "petti di pollo","petto di pollo","cosce di pollo disossate","fesa di tacchino",
      "fesa di tacchino a fette","pollo intero o cosce e sovracosce","petto di pollo macinato",
      "carne macinata mista (manzo e maiale)","bistecca di manzo (controfiletto o entrecôte)",
      "fettine di manzo (scamone o fesa)","fettine di vitello sottili","fesa di vitello",
      "salsiccia fresca","lonza di maiale","lonza di maiale con cotenna",
      "coniglio a pezzi","agnello a pezzi","cosciotto di agnello","manzo da spezzatino",
      "bistecca di manzo (controfiletto o entrecôte)","coda di bue a pezzi",
      "manzo da brasato (cappello del prete)","ossobuco di vitello",
      "branzino intero o filetti","cozze fresche","cozze sgusciate cotte",
      "vongole fresche","seppie pulite","tacchino","ali di pollo",
      "sovracosce di pollo","petto di tacchino","anatra"
    ].includes(key)) return 5;
    if (["zucchine","funghi champignon","pomodori ciliegia","pomodori ciliegia misti (anche gialli)","pomodorini","cetriolo","tofu compatto","burrata"].includes(key)) return 4;
    if (["broccoli","peperoni","peperoni misti (rosso e giallo)","melanzane","ricotta fresca","mozzarella fiordilatte","mozzarella","feta greca","feta","yogurt greco","avocado"].includes(key)) return 3;
    if (["carote","patate","cipolla","ceci in lattina","lenticchie verdi o marroni","lenticchie rosse decorticate","fagioli borlotti in lattina","fagioli cannellini in lattina","riso basmati","farro perlato","orzo perlato","bulgur","cous cous","quinoa"].includes(key)) return 1;
    return 2;
  };

  const getMainCarb = (recipeItem: Recipe | null) => recipeItem?.ingredients.find((i) => i.category === "Cereali")?.name || null;
  const getPerishableCount = (recipeItem: Recipe) => recipeItem.ingredients.filter((i) => i.category === "Verdure" || i.category === "Proteine").length;
  const getIngredientOverlap = (recipeItem: Recipe, other: Recipe | null) => {
    if (!other) return 0;
    const otherSet = new Set(other.ingredients.map((i) => normalize(i.name)));
    return recipeItem.ingredients.filter((i) => otherSet.has(normalize(i.name))).length;
  };
  const getFreshnessScore = (recipeItem: Recipe, dayIndex: number) => {
    let score = 0;
    recipeItem.ingredients.forEach((ingr) => {
      const weight = freshnessWeight(ingr.name);
      const key = normalize(ingr.name);
      // Ingredienti congelabili (peso 5: carne, pesce, pollame):
      // Bonus lieve nei primi giorni (meglio freschi), ma NO penalità forti dopo
      // Il sistema di congelamento gestisce automaticamente i casi tardivi
      if (weight === 5) {
        if (dayIndex <= 1) score += 15;       // lieve preferenza inizio settimana
        else if (dayIndex <= 3) score += 5;   // ancora ok fino a giovedì
        else if (dayIndex >= 6) score -= 10;  // solo domenica lieve penalità
      }
      // Molto deperibili NON congelabili (peso 4: zucchine, funghi, burrata):
      // Questi vanno usati presto perché non si congelano
      else if (weight === 4) {
        if (dayIndex <= 2) score += 18;
        else if (dayIndex === 3) score += 4;
        else if (dayIndex >= 5) score -= 20;
      }
      // Mediamente deperibili (peso 3): neutri nei primi giorni, leggero bonus a metà settimana
      else if (weight === 3) {
        if (dayIndex >= 2 && dayIndex <= 4) score += 8;
      }
      // Longevi (peso 1): preferibili a fine settimana
      else if (weight === 1) {
        if (dayIndex >= 4) score += 6;
      }
      // Bonus riuso: se l'ingrediente è già stato usato, meglio riusarlo subito
      if (perishableCounts[key] && weight >= 3) score += perishableCounts[key] * 5;
    });
    return score;
  };

  const scoreCandidate = (
    recipeItem: Recipe,
    context: { special?: boolean; preferNoMainCarb?: boolean; avoidCarb?: string | null; sameDayLunch?: Recipe | null; slot: MealSlot; dayIndex: number },
  ) => {
    let score = scoreRecipe(recipeItem, preferences, pantrySet, usedIngredientCounts, preferences.leftoversAllowed);
    const overlap = recipeItem.ingredients.filter((ingr) => coreIngredients.includes(normalize(ingr.name))).length;
    // Se l'utente ha specificato ingredienti principali, li favoriamo molto fortemente
    if (preferences.coreIngredients.length > 0) {
      score += overlap * 20;
      // Penalizza ricette senza nessun ingrediente principale (se ne abbiamo ancora da soddisfare)
      const satisfiedCore = new Set(allMeals.flatMap((m) => m.ingredients.map((i) => normalize(i.name))).filter((n) => coreIngredients.includes(n)));
      const unsatisfiedCore = coreIngredients.filter((c) => !satisfiedCore.has(c));
      if (overlap === 0 && unsatisfiedCore.length > 0) score -= 15;
    } else {
      score += overlap * 3;
    }

    // SEMPLICITÀ: premia ricette con pochi ingredienti
    const ingCount = recipeItem.ingredients.length;
    if (ingCount <= 4) score += 14;
    else if (ingCount <= 5) score += 10;
    else if (ingCount <= 6) score += 5;
    else if (ingCount >= 9) score -= 10;

    // INGREDIENTI RARI: penalizza cose difficili da trovare
    const rareIngredients = ["tahini","edamame","zafferano","miso","lemongrass","harissa","za'atar","sumac","pasta di tamarindo","olio di sesamo","salsa worcestershire","aceto di riso"];
    const hasRare = recipeItem.ingredients.some((ingr) => rareIngredients.includes(normalize(ingr.name)));
    if (hasRare) score -= 15;

    // CAP INGREDIENTI: penalizza forte se un ingrediente principale è già usato 2+ volte
    const mainIngredients = recipeItem.ingredients.filter((ingr) =>
      ingr.category === "Proteine" || ingr.category === "Cereali"
    );
    mainIngredients.forEach((ingr) => {
      const uses = usedIngredientCounts[normalize(ingr.name)] || 0;
      if (uses >= 2) score -= 35;
      if (uses >= 3) score -= 50;
    });
    // Anche le verdure principali: max 2 volte
    const mainVeggies = recipeItem.ingredients.filter((ingr) => ingr.category === "Verdure" && !["aglio","cipolla","cipolla dorata","cipolla rossa","limone","prezzemolo fresco","basilico fresco","menta fresca","timo fresco","rosmarino fresco","salvia fresca","erba cipollina","peperoncino"].includes(normalize(ingr.name)));
    mainVeggies.forEach((ingr) => {
      const uses = usedIngredientCounts[normalize(ingr.name)] || 0;
      if (uses >= 2) score -= 20;
      if (uses >= 3) score -= 40;
    });

    const category = getRecipeCategory(recipeItem);
    const currentCount = categoryCounts[category] || 0;
    const target = targets[category] || 1;

    if (currentCount >= maxPerCategory[category]) score -= 80;
    else if (currentCount >= target) score -= 10;
    else score += (target - currentCount) * 6;

    if (currentCount === 0 && ["pesce", "legumi", "uova"].includes(category)) score += 10;
    if (currentCount === 0 && category === "verdure") score += 6;
    // Ricette in wishlist: priorità assoluta — l'utente le ha scelte esplicitamente
    if (preferences.wishlistedRecipeIds?.includes(recipeItem.id)) score += 300;
    score -= (usedRecipeCounts[recipeItem.id] || 0) * 40;
    if (usedThisWeek.has(recipeItem.id)) score -= 60;
    if (lastPickedId === recipeItem.id) score -= 80;
    const mainCarb = getMainCarb(recipeItem);
    if (context.avoidCarb && mainCarb && normalize(mainCarb) === normalize(context.avoidCarb)) score -= 24;
    if (context.preferNoMainCarb && !mainCarb) score += 8;
    if (context.slot === "dinner" && mainCarb) score -= 6;
    if (context.slot === "dinner" && !mainCarb) score += 5;
    const lunchCategory = context.sameDayLunch ? getRecipeCategory(context.sameDayLunch) : null;
    if (context.slot === "dinner" && lunchCategory && category === lunchCategory) score -= 16;
    if (context.slot === "dinner" && lastDinnerCategory && category === lastDinnerCategory) score -= 12;
    const sameDayOverlap = getIngredientOverlap(recipeItem, context.sameDayLunch || null);
    if (context.slot === "dinner") score += sameDayOverlap * 2;
    score += getPerishableCount(recipeItem) * 2;
    score += getFreshnessScore(recipeItem, context.dayIndex);
    recipeItem.ingredients.forEach((ingr) => {
      const key = normalize(ingr.name);
      if ((ingr.category === "Verdure" || ingr.category === "Proteine") && perishableCounts[key]) score += 4 + perishableCounts[key] * 2;
    });
    if (preferences.leftoversAllowed && recipeItem.tags.includes("avanzi")) score += 4;
    if (context.special) score += 6;

    // ── BUDGET SCORING ──
    // budget è un valore 20-100 (slider). Budget basso penalizza ricette con molti ingredienti.
    const budgetIngCount = recipeItem.ingredients.length;
    if (preferences.budget <= 30) {
      // Budget molto basso: penalizza ricette con più di 5 ingredienti
      if (budgetIngCount > 5) score -= 3;
    } else if (preferences.budget <= 50) {
      // Budget medio-basso: penalizza ricette con più di 7 ingredienti
      if (budgetIngCount > 7) score -= 2;
    }
    // budget > 50: nessuna penalità (budget generoso)

    if (learning) {
      score += (learning.keptRecipeIds[recipeItem.id] || 0) * 10;
      score -= (learning.regeneratedRecipeIds[recipeItem.id] || 0) * 12;
      score += (learning.likedCategories[category] || 0) * 6;
      score -= (learning.dislikedCategories[category] || 0) * 7;
      recipeItem.ingredients.forEach((ingr) => {
        const key = normalize(ingr.name);
        score += (learning.likedIngredients[key] || 0) * 2;
        score -= (learning.dislikedIngredients[key] || 0) * 2;
      });
    }
    return score;
  };

  const pickRecipe = ({
    special = false,
    excludeIds = new Set<string>(),
    preferNoMainCarb = false,
    avoidCarb = null as string | null,
    sameDayLunch = null as Recipe | null,
    slot = "dinner" as MealSlot,
    dayIndex = 0,
  } = {}) => {
    const sourcePool = special ? specialPool : pool;
    const scored = sourcePool
      .filter((recipeItem) => {
        if (excludeIds.has(recipeItem.id)) return false;
        if (usedThisWeek.has(recipeItem.id)) return false;
        // Hard cap: protein category must not exceed maxPerCategory
        const category = getRecipeCategory(recipeItem);
        if ((categoryCounts[category] || 0) >= (maxPerCategory[category as keyof typeof maxPerCategory] ?? 99)) return false;
        const recipeIngredients = recipeItem.ingredients.map((i) => normalize(i.name));
        if (sameDayLunch) {
          const lunchIngredients = sameDayLunch.ingredients.map((i) => normalize(i.name));
          const sharedWithLunch = recipeIngredients.filter((ingr) => lunchIngredients.includes(ingr)).length;
          if (sharedWithLunch >= 2) return false;
        }
        // Blocca solo se ha 3+ ingredienti già usati 3+ volte (soglia molto più permissiva)
        const recentIngredientThreshold = 3;
        const overlappingRecentIngredients = recipeIngredients.filter((ingr) => (usedIngredientCounts[ingr] || 0) >= recentIngredientThreshold);
        if (overlappingRecentIngredients.length >= 3) return false;
        return true;
      })
      .map((recipeItem) => ({
        recipe: recipeItem,
        score: scoreCandidate(recipeItem, { special, preferNoMainCarb, avoidCarb, sameDayLunch, slot, dayIndex }),
      }))
      .sort((a, b) => b.score - a.score);

    if (scored[0]?.recipe) return scored[0].recipe;

    const relaxed = sourcePool
      .filter((rec) => {
        if (excludeIds.has(rec.id)) return false;
        const cat = getRecipeCategory(rec);
        if ((categoryCounts[cat] || 0) >= (maxPerCategory[cat as keyof typeof maxPerCategory] ?? 99)) return false;
        return true;
      })
      .map((rec) => ({ recipe: rec, score: scoreCandidate(rec, { special, preferNoMainCarb, avoidCarb, sameDayLunch, slot, dayIndex }) }))
      .sort((a, b) => b.score - a.score);
    return relaxed[0]?.recipe || null;
  };

  const registerMeal = (meal: Recipe | null, slot: MealSlot) => {
    if (!meal) return;
    allMeals.push(meal);
    usedThisWeek.add(meal.id);
    lastPickedId = meal.id;
    if (slot === "dinner") lastDinnerCategory = getRecipeCategory(meal);
    meal.ingredients.forEach((ingr) => {
      const key = normalize(ingr.name);
      usedIngredientCounts[key] = (usedIngredientCounts[key] || 0) + 1;
      if (ingr.category === "Verdure" || ingr.category === "Proteine") perishableCounts[key] = (perishableCounts[key] || 0) + 1;
    });
    usedRecipeCounts[meal.id] = (usedRecipeCounts[meal.id] || 0) + 1;
    const category = getRecipeCategory(meal);
    categoryCounts[category] = (categoryCounts[category] || 0) + 1;
  };

  const days = DAYS.map((dayName, index) => {
    const isSunday = index === 6;
    const notes: string[] = [];
    const skipLunch = preferences.skippedMeals.includes(`${dayName}-pranzo`);
    const skipDinner = preferences.skippedMeals.includes(`${dayName}-cena`);
    let lunch: Recipe | null = null;
    let dinner: Recipe | null = null;

    if (preferences.mealsPerDay === "both") {
      if (!skipLunch) {
        lunch = pickRecipe({ special: isSunday && preferences.sundaySpecial, slot: "lunch", dayIndex: index });
        registerMeal(lunch, "lunch");
      } else { notes.push("Pranzo saltato"); }
      if (!skipDinner) {
        if (isSunday && preferences.sundayDinnerLeftovers && lunch) {
          dinner = { ...lunch, id: `${lunch.id}-leftover`, title: `Avanzi di ${lunch.title}`, tags: [...new Set([...(lunch.tags || []), "avanzi"])] };
          notes.push("Cena con avanzi del pranzo");
          registerMeal(dinner, "dinner");
        } else {
          dinner = pickRecipe({ avoidCarb: getMainCarb(lunch), preferNoMainCarb: true, sameDayLunch: lunch, slot: "dinner", dayIndex: index });
          registerMeal(dinner, "dinner");
        }
      } else { notes.push("Cena saltata"); }
    } else if (!skipDinner) {
      dinner = pickRecipe({ special: isSunday && preferences.sundaySpecial, preferNoMainCarb: true, slot: "dinner", dayIndex: index });
      registerMeal(dinner, "dinner");
    } else { notes.push("Cena saltata"); }

    return { day: dayName, lunch, dinner, notes };
  });

  const shopping = aggregateShopping(allMeals, pantryItems, preferences.people);
  const stats = computeStats(allMeals, shopping);
  const alerts = [
    preferences.coreIngredients.length > 0 ? `Ingredienti principali richiesti: ${preferences.coreIngredients.join(", ")} — il piano li favorisce fortemente.` : `Ingredienti core automatici: ${coreIngredients.join(", ")}`,
    "Il planner evita i duplicati, bilancia meglio pranzi e cene e anticipa gli ingredienti più deperibili all'inizio della settimana.",
    `Bilanciamento settimana — pasta: ${stats.categoryCounts.pasta || 0}, cereali: ${stats.categoryCounts.cereali || 0}, pollo: ${stats.categoryCounts.pollo || 0}, pesce: ${stats.categoryCounts.pesce || 0}, legumi: ${stats.categoryCounts.legumi || 0}, uova: ${stats.categoryCounts.uova || 0}.`,
  ];
  if (preferences.sundaySpecial) alerts.push("Domenica con piatto speciale abilitata.");
  if (preferences.sundayDinnerLeftovers) alerts.push("Cena della domenica impostata su avanzi del pranzo quando possibile.");
  if (preferences.skippedMeals.length) alerts.push("I pasti saltati sono stati esclusi dalla spesa.");
  // ── FREEZE LOGIC ──────────────────────────────────────────────────────────
  // Ingredienti deperibili (peso 5) usati in più giorni: calcola cosa congelare
  // FREEZE_CANDIDATES definita come costante globale


  // Mappa ingrediente -> lista di {dayIndex, qty, recipe}
  const ingredientDayMap: Record<string, {dayIndex: number; qty: number; unit: string; recipe: string}[]> = {};

  days.forEach((day, dayIndex) => {
    [day.lunch, day.dinner].filter(Boolean).forEach((meal) => {
      // Salta i pasti "avanzi" - usano ingredienti già contati nel pasto originale
      if ((meal as Recipe).tags?.includes('avanzi')) return;
      (meal as Recipe).ingredients.forEach((ingr) => {
        const key = normalize(ingr.name);
        if (!FREEZE_CANDIDATES.includes(key)) return;
        if (!ingredientDayMap[key]) ingredientDayMap[key] = [];
        const scaledQty = scaleQty(ingr.qty, (meal as Recipe).servings, preferences.people);
        ingredientDayMap[key].push({ dayIndex, qty: scaledQty, unit: ingr.unit, recipe: (meal as Recipe).title });
      });
    });
  });

  const freezeItems: FreezeItem[] = [];
  Object.entries(ingredientDayMap).forEach(([key, uses]) => {
    uses.sort((a, b) => a.dayIndex - b.dayIndex);
    // Congela tutto ciò che viene usato dopo martedì (dayIndex > 1)
    // indipendentemente da quante volte appare o quando è il primo uso
    const toFreeze = uses.filter((u) => u.dayIndex > 1);
    toFreeze.forEach((lateUse) => {
      freezeItems.push({
        name: key,
        unit: lateUse.unit,
        qtyToFreeze: Math.round(lateUse.qty * 10) / 10,
        useOnDay: DAYS[lateUse.dayIndex],
        useOnDayIndex: lateUse.dayIndex,
        recipe: lateUse.recipe,
      });
    });
  });

  return { days, shopping, stats, alerts, freezeItems };
}

export function runSanityChecks() {
  const strictPlan = buildPlan(
    { people: 2, diet: "mediterranea", maxTime: 20, budget: 60, skill: "beginner", mealsPerDay: "both", leftoversAllowed: true, exclusionsText: "", exclusions: [], sundaySpecial: false, sundayDinnerLeftovers: false, skippedMeals: [], coreIngredients: [] },
    [{ name: "pasta", quantity: 500, unit: "g" }], 1,
  );
  if (!strictPlan.days.length) throw new Error("planner failed");
}

"use client";
export const dynamic = "force-dynamic";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth, AuthProvider } from "@/lib/AuthProvider";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";
import { loadUserData, savePreferences, savePantry, saveWeeklyPlan, migrateFromLocalStorage } from "@/lib/supabase";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

type Diet = "mediterranea" | "onnivora" | "vegetariana" | "vegana";
type Skill = "beginner" | "intermediate";
type MealSlot = "lunch" | "dinner";
type MainCategory = "pasta" | "cereali" | "pollo" | "pesce" | "legumi" | "uova" | "carne" | "verdure";

type PantryItem = { name: string; quantity: number; unit: string };
type RecipeIngredient = { name: string; qty: number; unit: string; category: string };
type ShoppingItem = RecipeIngredient & { waste: number };

type Recipe = {
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

type DayPlan = {
  day: string;
  lunch: Recipe | null;
  dinner: Recipe | null;
  notes: string[];
};

type Preferences = {
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
};

type PreferenceLearning = {
  keptRecipeIds: Record<string, number>;
  regeneratedRecipeIds: Record<string, number>;
  likedCategories: Record<string, number>;
  dislikedCategories: Record<string, number>;
  likedIngredients: Record<string, number>;
  dislikedIngredients: Record<string, number>;
};

type PlanStats = {
  recipesCount: number;
  uniqueIngredients: number;
  reusedIngredients: number;
  estimatedSavings: number;
  estimatedTotal: number;
  categoryCounts: Record<string, number>;
};

type FreezeItem = {
  name: string;
  unit: string;
  qtyToFreeze: number;        // quantità da congelare
  useOnDay: string;           // giorno in cui serve (es. "Ven")
  useOnDayIndex: number;      // indice giorno (0=Lun, 6=Dom)
  recipe: string;             // ricetta in cui viene usato
};

type PlanResult = {
  days: DayPlan[];
  shopping: ShoppingItem[];
  stats: PlanStats;
  alerts: string[];
  freezeItems: FreezeItem[];
};

type VoiceOption = { name: string; lang: string };
type ManualOverrides = Record<string, Partial<Record<MealSlot, Recipe | null>>>;

const DAYS = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];
const CATEGORY_ORDER = ["Verdure", "Proteine", "Latticini", "Cereali", "Dispensa"];
const SKIP_OPTIONS = [
  "Lun-pranzo","Lun-cena","Mar-pranzo","Mar-cena","Mer-pranzo","Mer-cena",
  "Gio-pranzo","Gio-cena","Ven-pranzo","Ven-cena","Sab-pranzo","Sab-cena","Dom-pranzo","Dom-cena",
];

const ing = (name: string, qty: number, unit: string, category: string): RecipeIngredient => ({ name, qty, unit, category });

const r = (
  id: string, title: string, diet: Diet[], tags: string[], time: number,
  difficulty: Skill, servings: number, ingredients: RecipeIngredient[], steps: string[],
): Recipe => ({ id, title, diet, tags, time, difficulty, servings, ingredients, steps });

const RECIPE_LIBRARY: Recipe[] = [

  // ── PASTE ──────────────────────────────────────────────────────────────────

  r("pasta-pomodoro", "Pasta al pomodoro con basilico fresco",
    ["mediterranea", "vegetariana", "onnivora"], ["veloce", "economica", "classico"],
    20, "beginner", 2,
    [
      ing("rigatoni o paccheri", 180, "g", "Cereali"),
      ing("passata di pomodoro", 300, "g", "Dispensa"),
      ing("cipolla dorata", 0.5, "pz", "Verdure"),
      ing("aglio", 1, "spicchio", "Verdure"),
      ing("olio extravergine", 3, "cucchiai", "Dispensa"),
      ing("basilico fresco", 8, "foglie", "Verdure"),
      ing("parmigiano grattugiato", 25, "g", "Latticini"),
    ],
    [
      "Porta a bollore una pentola d'acqua abbondante. Sala generosamente (l'acqua deve essere sapida come il mare).",
      "In una padella larga scalda 3 cucchiai di olio extravergine a fuoco medio. Aggiungi la mezza cipolla affettata sottile e lo spicchio d'aglio schiacciato. Fai appassire dolcemente per 5-6 minuti senza far colorare.",
      "Versa la passata di pomodoro. Alza leggermente la fiamma, porta a leggero bollore, poi abbassa e lascia sobbollire per 10 minuti, mescolando di tanto in tanto. Il sugo deve restringersi e diventare più denso e profumato.",
      "Nel frattempo cuoci la pasta: butta i rigatoni nell'acqua bollente e cuoci per 1 minuto in meno rispetto al tempo indicato sulla confezione. Tieni da parte una tazza di acqua di cottura.",
      "Scola la pasta e versala direttamente nel sugo. Mescola energicamente a fuoco vivo per 1 minuto, aggiungendo un mestolino di acqua di cottura per mantecare. La pasta deve risultare lucida e avvolta nel sugo.",
      "Spegni il fuoco, aggiungi le foglie di basilico strappate a mano e una spolverata di parmigiano. Servi subito.",
    ]
  ),

  r("pasta-aglio-olio", "Spaghetti aglio, olio e peperoncino",
    ["mediterranea", "vegetariana", "vegana"], ["veloce", "economica"],
    15, "beginner", 2,
    [
      ing("spaghetti", 180, "g", "Cereali"),
      ing("aglio", 3, "spicchi", "Verdure"),
      ing("olio extravergine", 5, "cucchiai", "Dispensa"),
      ing("peperoncino fresco o secco", 1, "pz", "Dispensa"),
      ing("prezzemolo fresco", 1, "ciuffo", "Verdure"),
    ],
    [
      "Cuoci gli spaghetti in abbondante acqua salata. Tieni da parte una tazza d'acqua di cottura prima di scolarli.",
      "Mentre la pasta cuoce, affetta sottilissimamente gli spicchi d'aglio. In una padella larga scalda l'olio a fuoco medio-basso. Aggiungi l'aglio e il peperoncino sbriciolato. Fai dorare l'aglio lentamente per 3-4 minuti: deve diventare dorato chiaro ma non bruciare, altrimenti diventa amaro.",
      "Appena l'aglio è dorato, togli la padella dal fuoco. Aggiungi 3-4 cucchiai di acqua di cottura della pasta (attenzione agli schizzi) e rimetti sul fuoco basso: si formerà un'emulsione cremosa.",
      "Scola gli spaghetti al dente e versali nella padella. Salta tutto a fuoco vivo per 1 minuto, aggiungendo altro liquido se necessario. Gli spaghetti devono risultare lucidi.",
      "Spegni, aggiungi il prezzemolo tritato abbondante e servi immediatamente nei piatti caldi.",
    ]
  ),

  r("pasta-arrabbiata", "Penne all'arrabbiata",
    ["mediterranea", "vegetariana", "vegana"], ["veloce", "piccante"],
    18, "beginner", 2,
    [
      ing("penne rigate", 180, "g", "Cereali"),
      ing("passata di pomodoro", 280, "g", "Dispensa"),
      ing("aglio", 2, "spicchi", "Verdure"),
      ing("peperoncino fresco", 1, "pz", "Dispensa"),
      ing("olio extravergine", 3, "cucchiai", "Dispensa"),
      ing("prezzemolo fresco", 1, "ciuffo", "Verdure"),
    ],
    [
      "Scalda l'olio in una padella a fuoco medio. Aggiungi l'aglio schiacciato e il peperoncino tagliato a rondelle (più peperoncino metti, più piccante sarà). Soffriggi per 1-2 minuti finché l'aglio sfrigola profumato.",
      "Versa la passata di pomodoro, aggiusta di sale e cuoci a fuoco medio per 10-12 minuti, mescolando ogni tanto. Il sugo deve ridursi e concentrarsi.",
      "Cuoci le penne in abbondante acqua salata, scolale al dente tenendo da parte un po' d'acqua di cottura. Versale nella padella con il sugo.",
      "Salta la pasta nel sugo per 1 minuto a fuoco vivo, aggiungendo un goccio di acqua di cottura se serve per mantecare. Finisci con il prezzemolo tritato.",
    ]
  ),

  r("pasta-zucchine-ricotta", "Pasta con zucchine grigliate e ricotta",
    ["mediterranea", "vegetariana"], ["cremosa", "estiva"],
    22, "beginner", 2,
    [
      ing("pasta (trofie o fusilli)", 180, "g", "Cereali"),
      ing("zucchine", 2, "pz", "Verdure"),
      ing("ricotta fresca", 150, "g", "Latticini"),
      ing("aglio", 1, "spicchio", "Verdure"),
      ing("olio extravergine", 2, "cucchiai", "Dispensa"),
      ing("menta o basilico fresco", 8, "foglie", "Verdure"),
      ing("parmigiano grattugiato", 20, "g", "Latticini"),
    ],
    [
      "Taglia le zucchine a rondelle di 5mm. Scalda una padella antiaderente a fuoco alto (deve essere molto calda). Grigliala senza olio per 2-3 minuti per lato finché compaiono le striature dorate. Salali subito. Metti da parte.",
      "Nella stessa padella a fuoco medio aggiungi l'olio e lo spicchio d'aglio. Scalda per 1 minuto, poi rimuovi l'aglio.",
      "Cuoci la pasta in acqua salata. Nel frattempo, in una ciotola, stempera la ricotta con 4-5 cucchiai di acqua di cottura della pasta: mescola bene con una forchetta fino a ottenere una crema liscia.",
      "Scola la pasta al dente e versala nella padella con l'olio agliato. Aggiungi le zucchine grigliate e la crema di ricotta. Mescola a fuoco spento per 1 minuto.",
      "Distribuisci nei piatti, finisci con le foglie di menta (o basilico) spezzettate e una grattugiata di parmigiano.",
    ]
  ),

  r("pasta-broccoli", "Pasta con broccoli, aglio e acciughe",
    ["mediterranea", "onnivora"], ["comfort", "saporita"],
    25, "beginner", 2,
    [
      ing("orecchiette o pasta corta", 180, "g", "Cereali"),
      ing("broccoli", 350, "g", "Verdure"),
      ing("aglio", 2, "spicchi", "Verdure"),
      ing("filetti di acciuga sott'olio", 3, "pz", "Proteine"),
      ing("olio extravergine", 4, "cucchiai", "Dispensa"),
      ing("peperoncino", 0.5, "pz", "Dispensa"),
    ],
    [
      "Dividi i broccoli in cimette piccole. Sbuccia il gambo e taglialo a cubetti.",
      "Cuoci i broccoli nella stessa acqua della pasta: butta prima le cimette, dopo 3 minuti aggiungi la pasta e cuoci il tutto insieme. I broccoli devono ammorbidirsi ma non sfaldarsi.",
      "Nel frattempo scalda l'olio a fuoco medio in una padella larga. Aggiungi l'aglio e il peperoncino. Dopo 1 minuto aggiungi le acciughe: si scioglieranno nell'olio caldo in 1-2 minuti. Mescola con un cucchiaio di legno.",
      "Scola pasta e broccoli insieme (tieni un po' di acqua di cottura). Versali nella padella con il condimento. Schiaccia metà dei broccoli con il dorso del cucchiaio per formare una cremina. Salta a fuoco vivo per 1 minuto aggiungendo acqua di cottura se serve.",
    ]
  ),

  r("pasta-spinaci-ricotta", "Pasta agli spinaci con crema di ricotta al limone",
    ["mediterranea", "vegetariana"], ["cremosa", "veloce"],
    20, "beginner", 2,
    [
      ing("pasta (conchiglie o penne)", 180, "g", "Cereali"),
      ing("spinaci freschi", 200, "g", "Verdure"),
      ing("ricotta fresca", 130, "g", "Latticini"),
      ing("limone (scorza e succo)", 0.5, "pz", "Verdure"),
      ing("aglio", 1, "spicchio", "Verdure"),
      ing("olio extravergine", 2, "cucchiai", "Dispensa"),
      ing("noce moscata", 1, "pizzico", "Dispensa"),
    ],
    [
      "In una padella larga scalda l'olio a fuoco medio con lo spicchio d'aglio. Aggiungi gli spinaci freschi e falli appassire per 2-3 minuti mescolando: si ridurranno moltissimo. Sala, aggiungi un pizzico di noce moscata, togli l'aglio.",
      "In una ciotola mescola la ricotta con la scorza grattugiata di mezzo limone, un cucchiaio di succo di limone e 3-4 cucchiai di acqua di cottura della pasta (che intanto cuoce). Deve diventare una crema fluida.",
      "Scola la pasta al dente tenendo un po' d'acqua di cottura. Versala nella padella con gli spinaci, aggiungi la crema di ricotta. Mescola velocemente a fuoco spento, aggiungendo acqua di cottura per rendere tutto cremoso e lucido.",
    ]
  ),

  r("pasta-funghi", "Pasta ai funghi con timo e parmigiano",
    ["mediterranea", "vegetariana"], ["autunnale", "comfort"],
    24, "beginner", 2,
    [
      ing("pasta (tagliatelle o pappardelle)", 180, "g", "Cereali"),
      ing("funghi champignon", 300, "g", "Verdure"),
      ing("aglio", 2, "spicchi", "Verdure"),
      ing("timo fresco", 3, "rametti", "Verdure"),
      ing("burro", 20, "g", "Latticini"),
      ing("olio extravergine", 2, "cucchiai", "Dispensa"),
      ing("vino bianco secco", 50, "ml", "Dispensa"),
      ing("parmigiano grattugiato", 30, "g", "Latticini"),
    ],
    [
      "Pulisci i funghi con un panno umido (non lavarli sotto l'acqua o si impregnano). Affettali spessi circa 5mm.",
      "In una padella larga scalda olio e burro a fuoco alto. Aggiungi i funghi in un unico strato: non mescolare subito, lasciali rosolare per 2-3 minuti finché sono dorati sotto. Poi mescola, aggiungi aglio e timo e cuoci altri 2 minuti.",
      "Sfuma con il vino bianco: versa i 50ml e lascia evaporare a fuoco alto per 1 minuto. Sala e pepa. Abbassa la fiamma.",
      "Cuoci la pasta in acqua abbondante salata. Scola al dente tenendo una tazza di acqua di cottura.",
      "Versa la pasta nella padella con i funghi, aggiungi 3-4 cucchiai di acqua di cottura e mescola a fuoco medio per 1 minuto. Spegni e manteca con il parmigiano.",
    ]
  ),

  r("pasta-norma", "Pasta alla Norma con ricotta salata",
    ["mediterranea", "vegetariana"], ["classico", "siciliana"],
    30, "beginner", 2,
    [
      ing("pasta (rigatoni o sedanini)", 180, "g", "Cereali"),
      ing("melanzane", 1, "pz", "Verdure"),
      ing("passata di pomodoro", 250, "g", "Dispensa"),
      ing("aglio", 1, "spicchio", "Verdure"),
      ing("ricotta salata", 40, "g", "Latticini"),
      ing("basilico fresco", 8, "foglie", "Verdure"),
      ing("olio extravergine", 4, "cucchiai", "Dispensa"),
    ],
    [
      "Taglia la melanzana a cubetti di 2cm. Mettili in uno scolapasta con un pizzico di sale e lascia che rilascino l'acqua amara per 10 minuti. Tamponali con carta da cucina.",
      "In una padella capiente scalda 3 cucchiai di olio a fuoco alto. Friggi i cubetti di melanzana a fiamme vivace per 5-6 minuti, girandoli, finché sono dorati su tutti i lati. Scolali su carta assorbente.",
      "Nella stessa padella (aggiungi un filo di olio se serve) rosola lo spicchio d'aglio per 1 minuto, poi aggiungi la passata. Cuoci a fuoco medio per 8-10 minuti. Aggiusta di sale.",
      "Cuoci la pasta al dente. Versala nella padella col sugo, aggiungi le melanzane fritte e mescola bene. Impiatta, finisci con la ricotta salata grattugiata abbondante e le foglie di basilico.",
    ]
  ),

  r("pasta-lenticchie", "Pasta e lenticchie al rosmarino",
    ["vegana", "vegetariana", "mediterranea"], ["legumi", "comfort", "invernale"],
    28, "beginner", 2,
    [
      ing("pasta mista o ditaloni", 160, "g", "Cereali"),
      ing("lenticchie rosse decorticate", 180, "g", "Proteine"),
      ing("passata di pomodoro", 150, "g", "Dispensa"),
      ing("cipolla dorata", 0.5, "pz", "Verdure"),
      ing("aglio", 1, "spicchio", "Verdure"),
      ing("rosmarino fresco", 1, "rametto", "Verdure"),
      ing("olio extravergine", 3, "cucchiai", "Dispensa"),
    ],
    [
      "In una pentola capiente scalda l'olio a fuoco medio. Aggiungi la cipolla tritata finemente e falla appassire per 5 minuti. Aggiungi l'aglio e il rosmarino, cuoci 1 minuto.",
      "Versa la passata e le lenticchie (non hanno bisogno di ammollo). Copri con 600ml di acqua, porta a bollore, poi cuoci a fuoco medio per 12-15 minuti finché le lenticchie si ammorbidiscono e si sfaldano leggermente.",
      "Aggiungi la pasta direttamente nel brodo di lenticchie. Cuoci mescolando spesso (la pasta assorbe il liquido rapidamente). Aggiungi acqua calda se si asciuga troppo: il risultato deve essere cremoso, non asciutto.",
      "Aggiusta di sale, rimuovi il rametto di rosmarino. Lascia riposare 2 minuti prima di servire. Finisci con un filo d'olio extravergine crudo.",
    ]
  ),

  r("spaghetti-cozze", "Spaghetti alle cozze in bianco",
    ["mediterranea", "onnivora"], ["pesce", "saporita", "veloce"],
    25, "beginner", 2,
    [
      ing("spaghetti", 180, "g", "Cereali"),
      ing("cozze fresche", 600, "g", "Proteine"),
      ing("aglio", 2, "spicchi", "Verdure"),
      ing("vino bianco secco", 80, "ml", "Dispensa"),
      ing("olio extravergine", 4, "cucchiai", "Dispensa"),
      ing("prezzemolo fresco", 1, "ciuffo", "Verdure"),
      ing("peperoncino", 0.5, "pz", "Dispensa"),
    ],
    [
      "Pulisci le cozze: raschia i gusci con una paglietta metallica, strappa il bisso (il filamento) tirando verso la coda della cozza. Scarta quelle con il guscio rotto o già aperte.",
      "In una padella grande scalda 2 cucchiai di olio con uno spicchio d'aglio schiacciato. Aggiungi le cozze e il vino bianco. Copri con un coperchio e cuoci a fuoco alto per 3-4 minuti, scuotendo la padella, finché le cozze si aprono. Scarta quelle rimaste chiuse.",
      "Filtra il liquido di cottura delle cozze attraverso un colino. Sguscia la maggior parte delle cozze, lasciandone qualcuna con il guscio per l'impiattamento.",
      "In un'altra padella scalda 2 cucchiai di olio con l'altro spicchio d'aglio e il peperoncino per 1 minuto. Aggiungi il liquido delle cozze filtrato e lascia ridurre a fuoco vivo per 2 minuti.",
      "Cuoci gli spaghetti al dente. Scolali e versali nella padella con il sughetto. Aggiungi le cozze sgusciate, salta tutto 1 minuto. Finisci con prezzemolo abbondante e un filo d'olio crudo.",
    ]
  ),

  // ── CEREALI / RISO / ALTRI CARBOIDRATI ─────────────────────────────────────

  r("riso-pollo-verdure", "Riso saltato con pollo e verdure croccanti",
    ["mediterranea", "onnivora"], ["proteico", "meal prep", "completo"],
    25, "beginner", 2,
    [
      ing("riso basmati", 170, "g", "Cereali"),
      ing("petto di pollo", 280, "g", "Proteine"),
      ing("zucchine", 1, "pz", "Verdure"),
      ing("carote", 1, "pz", "Verdure"),
      ing("cipolla di Tropea", 0.5, "pz", "Verdure"),
      ing("salsa di soia", 2, "cucchiai", "Dispensa"),
      ing("olio extravergine", 2, "cucchiai", "Dispensa"),
      ing("paprika dolce", 1, "cucchiaino", "Dispensa"),
    ],
    [
      "Sciacqua il riso basmati più volte finché l'acqua è quasi trasparente. Cuoci in 340ml di acqua salata: porta a bollore, abbassa al minimo, copri e cuoci 12 minuti. Spegni e lascia riposare coperto 5 minuti. Sgrana con una forchetta.",
      "Taglia il pollo a bocconcini di 2cm. Condisci con sale, pepe e paprika. Scalda una padella con 1 cucchiaio di olio a fuoco alto. Rosola il pollo per 5-6 minuti senza muoverlo troppo: deve dorare bene su tutti i lati. Metti da parte.",
      "Nella stessa padella aggiungi un altro cucchiaio d'olio. Salta carote (tagliate a julienne) e zucchine (a mezzalune) a fuoco alto per 3-4 minuti: devono restare croccanti. Aggiungi la cipolla affettata, cuoci 1 minuto.",
      "Aggiungi il riso e il pollo nella padella. Versa la salsa di soia e salta tutto a fuoco alto per 2 minuti, mescolando continuamente. Aggiusta di sale se serve.",
    ]
  ),

  r("quinoa-verdure", "Bowl di quinoa con verdure arrostite e tahini",
    ["mediterranea", "vegetariana", "vegana"], ["light", "nutriente", "meal prep"],
    25, "beginner", 2,
    [
      ing("quinoa", 160, "g", "Cereali"),
      ing("zucchine", 1, "pz", "Verdure"),
      ing("peperoni", 1, "pz", "Verdure"),
      ing("carote", 1, "pz", "Verdure"),
      ing("ceci in lattina", 200, "g", "Proteine"),
      ing("tahini (crema di sesamo)", 2, "cucchiai", "Dispensa"),
      ing("limone", 1, "pz", "Verdure"),
      ing("olio extravergine", 3, "cucchiai", "Dispensa"),
      ing("cumino in polvere", 1, "cucchiaino", "Dispensa"),
    ],
    [
      "Riscalda il forno a 200°C. Taglia tutte le verdure a pezzi irregolari di circa 3cm. Disponi su una teglia con i ceci scolati, condisci con 2 cucchiai di olio, cumino, sale e pepe. Arrostisci per 20 minuti finché i bordi sono dorati.",
      "Sciacqua la quinoa in un colino a maglia fitta. Cuoci in 320ml di acqua salata: porta a bollore, copri, abbassa al minimo e cuoci 12 minuti. Lascia riposare 5 minuti, poi sgrana con una forchetta.",
      "Prepara la salsa tahini: in una ciotolina mescola il tahini con il succo di limone e 3-4 cucchiai di acqua fredda. Mescola energicamente finché diventa una crema fluida e chiara. Aggiusta di sale.",
      "Componi le bowl: quinoa alla base, verdure e ceci arrostiti sopra, drizzle di salsa tahini. Finisci con la scorza del limone grattugiata.",
    ]
  ),

  r("cous-cous-ceci-zucchine", "Cous cous alle spezie con ceci e verdure",
    ["mediterranea", "vegetariana", "vegana"], ["veloce", "estivo", "meal prep"],
    18, "beginner", 2,
    [
      ing("cous cous", 170, "g", "Cereali"),
      ing("ceci in lattina", 240, "g", "Proteine"),
      ing("zucchine", 2, "pz", "Verdure"),
      ing("pomodori ciliegia", 150, "g", "Verdure"),
      ing("cipolla rossa", 0.5, "pz", "Verdure"),
      ing("cumino", 1, "cucchiaino", "Dispensa"),
      ing("coriandolo in polvere", 0.5, "cucchiaino", "Dispensa"),
      ing("olio extravergine", 3, "cucchiai", "Dispensa"),
      ing("limone", 0.5, "pz", "Verdure"),
      ing("menta fresca", 8, "foglie", "Verdure"),
    ],
    [
      "Porta a bollore 200ml di acqua salata con 1 cucchiaio di olio e le spezie (cumino, coriandolo). Versa il cous cous, mescola, copri e togli dal fuoco. Lascia gonfiare 5 minuti, poi sgrana con una forchetta.",
      "Taglia le zucchine a rondelle spesse. Scalda una padella antiaderente a fuoco alto senza olio e grigliala per 2-3 minuti per lato finché sono dorate. Salale.",
      "In una ciotola grande unisci cous cous, ceci (scolati e sciacquati), zucchine grigliate, pomodorini tagliati a metà e cipolla rossa affettata sottile.",
      "Condisci con il succo di mezzo limone, 2 cucchiai di olio extravergine, sale e pepe. Mescola bene. Finisci con foglie di menta spezzettate.",
    ]
  ),

  r("farro-tonno-pomodori", "Farro con tonno, pomodori e olive",
    ["mediterranea", "onnivora"], ["freddo", "completo", "veloce"],
    25, "beginner", 2,
    [
      ing("farro perlato", 170, "g", "Cereali"),
      ing("tonno sott'olio buono", 160, "g", "Proteine"),
      ing("pomodori maturi", 2, "pz", "Verdure"),
      ing("olive nere denocciolate", 60, "g", "Dispensa"),
      ing("capperi sotto sale", 1, "cucchiaio", "Dispensa"),
      ing("cipollotto fresco", 1, "pz", "Verdure"),
      ing("olio extravergine", 2, "cucchiai", "Dispensa"),
      ing("origano secco", 1, "cucchiaino", "Dispensa"),
    ],
    [
      "Cuoci il farro in abbondante acqua salata secondo i tempi del pacchetto (di solito 25 minuti). Scola e passa sotto acqua fredda per fermarne la cottura. Lascia asciugare bene.",
      "Dissala i capperi sciacquandoli abbondantemente. Taglia i pomodori a cubetti piccoli, il cipollotto a rondelle sottili.",
      "In una ciotola capiente unisci il farro, il tonno sgocciolato e spezzettato, i pomodori, le olive tagliate a metà, i capperi e il cipollotto.",
      "Condisci con olio extravergine, origano, sale (poco, i capperi salano già) e una macinata di pepe. Mescola e lascia riposare 5 minuti prima di servire: i sapori si amalgamano meglio.",
    ]
  ),

  r("orzo-feta-pomodori", "Insalata di orzo con feta, pomodori e cetriolo",
    ["mediterranea", "vegetariana"], ["freddo", "estivo", "greco"],
    24, "beginner", 2,
    [
      ing("orzo perlato", 180, "g", "Cereali"),
      ing("feta greca", 120, "g", "Latticini"),
      ing("pomodori ciliegia", 200, "g", "Verdure"),
      ing("cetriolo", 1, "pz", "Verdure"),
      ing("olive kalamata", 60, "g", "Dispensa"),
      ing("origano secco", 1, "cucchiaino", "Dispensa"),
      ing("olio extravergine", 3, "cucchiai", "Dispensa"),
      ing("aceto di vino rosso", 1, "cucchiaio", "Dispensa"),
    ],
    [
      "Cuoci l'orzo in acqua salata per 18-20 minuti finché è al dente. Scola e raffredda sotto acqua corrente, poi lascia asciugare in un colino.",
      "Taglia i pomodorini a metà, il cetriolo a cubetti piccoli (con la buccia se fresco), la feta a cubetti di 1cm.",
      "In una ciotola grande unisci l'orzo freddo, le verdure, la feta e le olive. Condisci con olio, aceto, origano, sale e pepe.",
      "Mescola delicatamente per non sgretolare la feta. Lascia riposare almeno 10 minuti prima di servire: l'orzo assorbe i condimenti e il piatto diventa più saporito.",
    ]
  ),

  r("bulgur-lenticchie", "Bulgur con lenticchie, carote caramellate e cumino",
    ["mediterranea", "vegetariana", "vegana"], ["meal prep", "mediorientale"],
    25, "beginner", 2,
    [
      ing("bulgur", 160, "g", "Cereali"),
      ing("lenticchie verdi", 180, "g", "Proteine"),
      ing("carote", 2, "pz", "Verdure"),
      ing("cipolla", 1, "pz", "Verdure"),
      ing("cumino in semi", 1, "cucchiaino", "Dispensa"),
      ing("olio extravergine", 3, "cucchiai", "Dispensa"),
      ing("limone", 0.5, "pz", "Verdure"),
    ],
    [
      "Cuoci le lenticchie in acqua fredda non salata: porta a bollore, abbassa e cuoci per 15-18 minuti finché sono tenere ma non sfatte. Scola e sala.",
      "Reidrata il bulgur: metti 160g di bulgur in una ciotola, copri con 280ml di acqua bollente salata, copri con un piatto e lascia riposare 10 minuti. Sgrana con una forchetta.",
      "Affetta la cipolla in mezze lune sottili. In una padella scalda l'olio a fuoco medio-alto, aggiungi i semi di cumino (sfriggolano subito), poi la cipolla. Cuoci mescolando per 8-10 minuti finché la cipolla è dorata e quasi caramellata.",
      "Taglia le carote a cubetti piccoli e aggiungile alla cipolla. Cuoci altri 5 minuti. Unisci le lenticchie e il bulgur, mescola. Aggiusta di sale e finisci con il succo di limone.",
    ]
  ),

  // ── POLLO ──────────────────────────────────────────────────────────────────

  r("pollo-zucchine", "Petto di pollo con zucchine al limone",
    ["mediterranea", "onnivora"], ["proteico", "veloce", "light"],
    22, "beginner", 2,
    [
      ing("petti di pollo", 320, "g", "Proteine"),
      ing("zucchine", 2, "pz", "Verdure"),
      ing("aglio", 1, "spicchio", "Verdure"),
      ing("limone", 1, "pz", "Verdure"),
      ing("timo fresco", 3, "rametti", "Verdure"),
      ing("olio extravergine", 2, "cucchiai", "Dispensa"),
    ],
    [
      "Appiattisci i petti di pollo con un batticarne (o il fondo di un pentolino): devono essere spessi circa 1.5cm uniformemente, così cuociono in modo omogeneo. Sala e pepa su entrambi i lati.",
      "Scalda una padella a fuoco alto con l'olio. Quando fuma leggermente, adagia il pollo. Cuoci 4-5 minuti per lato senza muoverlo: si formerà una crosticina dorata. Aggiungi l'aglio schiacciato e il timo nell'ultimo minuto.",
      "Togli il pollo e mettilo a riposare su un tagliere per 3 minuti (questo mantiene i succhi interni).",
      "Nella stessa padella (fuoco medio) aggiungi le zucchine a rondelle. Cuoci 4-5 minuti finché sono dorate ma ancora un po' croccanti. Sfuma con il succo di mezzo limone.",
      "Affetta il pollo in diagonale, servi con le zucchine e la scorza del limone grattugiata sopra.",
    ]
  ),

  r("pollo-limone", "Pollo al limone con capperi e prezzemolo",
    ["mediterranea", "onnivora"], ["veloce", "saporita"],
    20, "beginner", 2,
    [
      ing("petti di pollo", 320, "g", "Proteine"),
      ing("farina 00", 2, "cucchiai", "Dispensa"),
      ing("limone", 1, "pz", "Verdure"),
      ing("capperi sotto sale", 1, "cucchiaio", "Dispensa"),
      ing("prezzemolo fresco", 1, "ciuffo", "Verdure"),
      ing("burro", 15, "g", "Latticini"),
      ing("olio extravergine", 2, "cucchiai", "Dispensa"),
    ],
    [
      "Taglia i petti di pollo a scaloppine spesse 1cm. Infarinale leggermente su entrambi i lati, eliminando l'eccesso di farina.",
      "Sciacqua i capperi abbondantemente per togliere il sale.",
      "In una padella scalda olio e burro a fuoco medio-alto. Cuoci le scaloppine 2-3 minuti per lato finché sono dorate e cotte. Toglile e mettile da parte.",
      "Nella stessa padella a fuoco basso aggiungi il succo di limone e i capperi. Raschia il fondo della padella con un cucchiaio di legno (i residui di cottura daranno sapore). Cuoci 1 minuto. Rimetti il pollo nella padella, scaldalo 30 secondi nel sughetto.",
      "Servi con prezzemolo tritato e fette di limone.",
    ]
  ),

  r("pollo-insalata", "Insalata di pollo tiepido con avocado e pomodorini",
    ["mediterranea", "onnivora"], ["light", "estiva", "proteica"],
    18, "beginner", 2,
    [
      ing("petti di pollo", 280, "g", "Proteine"),
      ing("lattuga mista o songino", 100, "g", "Verdure"),
      ing("pomodori ciliegia", 150, "g", "Verdure"),
      ing("avocado maturo", 1, "pz", "Verdure"),
      ing("olio extravergine", 2, "cucchiai", "Dispensa"),
      ing("limone", 0.5, "pz", "Verdure"),
      ing("senape di Digione", 0.5, "cucchiaino", "Dispensa"),
    ],
    [
      "Scalda una padella con 1 cucchiaio di olio. Cuoci i petti di pollo interi a fuoco medio-alto: 5-6 minuti per lato, finché l'interno è bianco e non rosa. Sala. Lascia riposare 3 minuti, poi affetta sottilmente in diagonale.",
      "Prepara la vinaigrette: in una ciotolina mescola il succo di mezzo limone, la senape, 1 cucchiaio di olio, sale e pepe. Emulsiona con una forchetta.",
      "Disponi la lattuga nel piatto. Aggiungi i pomodorini tagliati a metà, l'avocado a fette (condito subito con un po' di limone per non annerire) e le fettine di pollo ancora tiepide.",
      "Condisci con la vinaigrette al momento di servire.",
    ]
  ),

  r("pollo-spinaci", "Pollo con spinaci all'aglio e yogurt",
    ["mediterranea", "onnivora"], ["proteico", "comfort"],
    22, "beginner", 2,
    [
      ing("petti di pollo", 320, "g", "Proteine"),
      ing("spinaci freschi", 300, "g", "Verdure"),
      ing("aglio", 2, "spicchi", "Verdure"),
      ing("yogurt greco", 80, "g", "Latticini"),
      ing("paprika affumicata", 1, "cucchiaino", "Dispensa"),
      ing("olio extravergine", 2, "cucchiai", "Dispensa"),
    ],
    [
      "Taglia il pollo a bocconcini. Condisci con paprika, sale e pepe.",
      "Scalda l'olio in una padella larga a fuoco alto. Rosola il pollo per 5-6 minuti, girandolo, finché è ben dorato su tutti i lati. Metti da parte.",
      "Nella stessa padella a fuoco medio aggiungi l'aglio affettato, fallo dorare 1 minuto. Aggiungi gli spinaci freschi in 2-3 riprese, aspettando che appassiscano tra un'aggiunta e l'altra. Sala.",
      "Rimetti il pollo nella padella. Abbassa il fuoco, aggiungi lo yogurt greco e mescola delicatamente: non deve bollire altrimenti si separa. Scalda 1 minuto a fuoco bassissimo. Servi subito.",
    ]
  ),

  r("pollo-peperoni", "Pollo ai peperoni in umido",
    ["mediterranea", "onnivora"], ["family", "comfort", "saporita"],
    30, "beginner", 2,
    [
      ing("cosce di pollo disossate", 350, "g", "Proteine"),
      ing("peperoni misti (rosso e giallo)", 2, "pz", "Verdure"),
      ing("cipolla", 1, "pz", "Verdure"),
      ing("passata di pomodoro", 150, "g", "Dispensa"),
      ing("aglio", 1, "spicchio", "Verdure"),
      ing("origano secco", 1, "cucchiaino", "Dispensa"),
      ing("olio extravergine", 3, "cucchiai", "Dispensa"),
    ],
    [
      "Taglia il pollo a pezzi irregolari. Sala e pepa. Scalda l'olio a fuoco alto in una padella capiente e rosola il pollo per 5-6 minuti finché è ben dorato. Metti da parte.",
      "Abbassa la fiamma a fuoco medio. Nella stessa padella soffriggi cipolla e aglio affettati per 3 minuti. Aggiungi i peperoni tagliati a listarelle e cuoci 5 minuti.",
      "Rimetti il pollo, aggiungi la passata e l'origano. Mescola, copri con un coperchio e cuoci a fuoco basso per 15 minuti, mescolando ogni tanto. Il sugo deve restringersi e il pollo risultare morbido.",
    ]
  ),

  r("pollo-funghi", "Pollo ai funghi con vino bianco e prezzemolo",
    ["mediterranea", "onnivora"], ["comfort", "autunnale"],
    28, "beginner", 2,
    [
      ing("petti di pollo", 320, "g", "Proteine"),
      ing("funghi champignon", 280, "g", "Verdure"),
      ing("aglio", 2, "spicchi", "Verdure"),
      ing("vino bianco secco", 80, "ml", "Dispensa"),
      ing("brodo di pollo o verdure", 100, "ml", "Dispensa"),
      ing("prezzemolo fresco", 1, "ciuffo", "Verdure"),
      ing("olio extravergine", 2, "cucchiai", "Dispensa"),
    ],
    [
      "Taglia il pollo a pezzi di 3cm. Scalda l'olio in padella a fuoco alto e rosola il pollo 4-5 minuti finché dorato. Metti da parte.",
      "Affetta i funghi spessi. Nella stessa padella cuocili a fuoco alto senza mescolare per 2-3 minuti (devono dorare, non lessarsi). Aggiungi l'aglio tritato, cuoci 1 minuto.",
      "Rimetti il pollo. Sfuma con il vino bianco a fuoco alto, lascia evaporare 1 minuto. Aggiungi il brodo, abbassa la fiamma, copri e cuoci 10 minuti.",
      "Scopri, alza la fiamma e lascia ridurre il fondo per 2 minuti. Sala, pepa, finisci con abbondante prezzemolo tritato.",
    ]
  ),

  r("tacchino-piselli", "Tacchino con piselli e menta",
    ["mediterranea", "onnivora"], ["economica", "primaverile"],
    22, "beginner", 2,
    [
      ing("fesa di tacchino", 320, "g", "Proteine"),
      ing("piselli (freschi o surgelati)", 220, "g", "Verdure"),
      ing("cipolla", 0.5, "pz", "Verdure"),
      ing("brodo vegetale", 100, "ml", "Dispensa"),
      ing("menta fresca", 8, "foglie", "Verdure"),
      ing("olio extravergine", 2, "cucchiai", "Dispensa"),
    ],
    [
      "Taglia il tacchino a bocconcini di 3cm. Scalda l'olio a fuoco alto e rosola il tacchino per 4-5 minuti finché dorato. Metti da parte.",
      "Abbassa a fuoco medio, soffriggi la cipolla tritata per 3 minuti. Aggiungi i piselli (se surgelati direttamente dal freezer) e il brodo. Cuoci 5-6 minuti.",
      "Rimetti il tacchino, aggiusta di sale e pepa. Cuoci insieme 2-3 minuti finché il fondo si addensa leggermente. Finisci con le foglie di menta spezzettate.",
    ]
  ),

  r("tacchino-griglia", "Tacchino alla griglia con insalata di finocchi",
    ["mediterranea", "onnivora"], ["proteico", "light"],
    18, "beginner", 2,
    [
      ing("fesa di tacchino a fette", 320, "g", "Proteine"),
      ing("finocchio", 1, "pz", "Verdure"),
      ing("arance", 1, "pz", "Verdure"),
      ing("olio extravergine", 3, "cucchiai", "Dispensa"),
      ing("limone", 0.5, "pz", "Verdure"),
    ],
    [
      "Batti le fette di tacchino per uniformarle a 1cm. Condisci con olio, sale, pepe. Scalda una padella grill o antiaderente a fuoco alto finché è molto calda.",
      "Cuoci il tacchino 3 minuti per lato senza muoverlo: si staccherà da solo quando è pronto. Deve risultare dorato con striature.",
      "Prepara l'insalata: affetta il finocchio sottilissimo con un coltello. Pela l'arancia a vivo e taglia gli spicchi. Condisci con olio, succo di limone, sale e pepe.",
      "Servi il tacchino affiancato dall'insalata di finocchi e arance.",
    ]
  ),

  // ── PESCE ──────────────────────────────────────────────────────────────────

  r("merluzzo-forno", "Merluzzo al forno con pomodorini, olive e capperi",
    ["mediterranea", "onnivora"], ["pesce", "light", "mediterraneo"],
    25, "beginner", 2,
    [
      ing("filetti di merluzzo", 350, "g", "Proteine"),
      ing("pomodori ciliegia", 200, "g", "Verdure"),
      ing("olive nere denocciolate", 50, "g", "Dispensa"),
      ing("capperi sotto sale", 1, "cucchiaio", "Dispensa"),
      ing("aglio", 1, "spicchio", "Verdure"),
      ing("origano secco", 1, "cucchiaino", "Dispensa"),
      ing("olio extravergine", 3, "cucchiai", "Dispensa"),
    ],
    [
      "Preriscalda il forno a 200°C. Sciacqua i capperi per dessalarli.",
      "In una teglia disponi i pomodorini tagliati a metà, le olive, i capperi e l'aglio affettato. Condisci con 2 cucchiai di olio, origano, sale e pepe. Inforna 10 minuti.",
      "Asciuga i filetti di merluzzo con carta da cucina. Salali leggermente. Adagiali sopra i pomodorini, condisci con un filo d'olio e inforna altri 12-14 minuti, finché il pesce è bianco e si sfoglia facilmente con una forchetta.",
    ]
  ),

  r("salmone-padella", "Salmone in padella con burro, limone e spinaci",
    ["mediterranea", "onnivora"], ["pesce", "proteico", "veloce"],
    20, "beginner", 2,
    [
      ing("filetti di salmone con pelle", 320, "g", "Proteine"),
      ing("spinaci freschi", 250, "g", "Verdure"),
      ing("aglio", 1, "spicchio", "Verdure"),
      ing("burro", 15, "g", "Latticini"),
      ing("limone", 1, "pz", "Verdure"),
      ing("olio extravergine", 1, "cucchiaio", "Dispensa"),
    ],
    [
      "Asciuga i filetti di salmone con carta da cucina. Sala il lato della carne, non la pelle.",
      "Scalda una padella antiaderente a fuoco medio-alto con l'olio. Adagia il salmone con la pelle verso il basso. Premi delicatamente per i primi 30 secondi. Cuoci 4-5 minuti senza toccare: la pelle diventerà croccante. Gira e cuoci altri 2 minuti. Il salmone è pronto quando l'interno è ancora leggermente rosa. Metti da parte.",
      "Nella stessa padella abbassa la fiamma. Aggiungi il burro e l'aglio schiacciato. Quando il burro fuma aggiungi gli spinaci, mescola per 2 minuti finché appassiscono. Sala.",
      "Servi il salmone sugli spinaci con fette di limone a parte.",
    ]
  ),

  r("salmone-forno-limone", "Salmone al forno in crosta di erbe con zucchine",
    ["mediterranea", "onnivora"], ["pesce", "light", "elegante"],
    25, "beginner", 2,
    [
      ing("filetti di salmone", 320, "g", "Proteine"),
      ing("zucchine", 2, "pz", "Verdure"),
      ing("prezzemolo fresco", 1, "ciuffo", "Verdure"),
      ing("aglio", 1, "spicchio", "Verdure"),
      ing("pangrattato", 2, "cucchiai", "Dispensa"),
      ing("limone", 1, "pz", "Verdure"),
      ing("olio extravergine", 3, "cucchiai", "Dispensa"),
    ],
    [
      "Preriscalda il forno a 190°C. Prepara la crosta: trita insieme prezzemolo, aglio e pangrattato. Aggiungi la scorza grattugiata di mezzo limone, 1 cucchiaio di olio, sale e pepe.",
      "Taglia le zucchine a rondelle di 5mm. Disponile in una teglia, condiscile con olio, sale e pepe. Adagia i filetti di salmone sulle zucchine.",
      "Distribuisci la crosta di erbe sopra ogni filetto, premendo leggermente. Irrora con un filo d'olio. Inforna 15-18 minuti finché la crosta è dorata e il salmone è cotto.",
    ]
  ),

  r("orata-forno", "Orata al forno con patate al rosmarino",
    ["mediterranea", "onnivora"], ["pesce", "classico", "domenicale"],
    40, "beginner", 2,
    [
      ing("orata intera o filetti", 500, "g", "Proteine"),
      ing("patate", 400, "g", "Verdure"),
      ing("rosmarino fresco", 1, "rametto", "Verdure"),
      ing("aglio", 2, "spicchi", "Verdure"),
      ing("limone", 1, "pz", "Verdure"),
      ing("olio extravergine", 4, "cucchiai", "Dispensa"),
    ],
    [
      "Preriscalda il forno a 200°C. Sbuccia le patate, tagliale a spicchi spessi 1.5cm. Condiscile in una ciotola con 2 cucchiai di olio, rosmarino, aglio schiacciato, sale e pepe. Disponi in una teglia e inforna per 15 minuti.",
      "Se usi il pesce intero, fai 3 incisioni sui fianchi con un coltello. Sala l'interno e l'esterno, inserisci una fetta di limone dentro.",
      "Estrai la teglia, spostala leggermente le patate e adagia l'orata sopra. Condisci con 2 cucchiai di olio e succo di limone. Inforna altri 20-22 minuti (o 15 minuti se usi solo filetti).",
      "Il pesce è cotto quando la carne si stacca facilmente dalla lisca e ha perso la trasparenza.",
    ]
  ),

  r("gamberi-padella", "Gamberi saltati con aglio, vino e zucchine",
    ["mediterranea", "onnivora"], ["pesce", "veloce", "estivo"],
    18, "beginner", 2,
    [
      ing("gamberi freschi o decongelati", 300, "g", "Proteine"),
      ing("zucchine", 2, "pz", "Verdure"),
      ing("aglio", 2, "spicchi", "Verdure"),
      ing("vino bianco secco", 60, "ml", "Dispensa"),
      ing("prezzemolo fresco", 1, "ciuffo", "Verdure"),
      ing("peperoncino", 0.5, "pz", "Dispensa"),
      ing("olio extravergine", 3, "cucchiai", "Dispensa"),
    ],
    [
      "Se i gamberi sono interi, sgusciali lasciando la coda. Asciugali con carta da cucina: più asciutti sono, più rosoleranno bene.",
      "Taglia le zucchine a rondelle. Scalda 2 cucchiai di olio in padella a fuoco alto. Salta le zucchine per 3-4 minuti finché dorate. Salale e metti da parte.",
      "Nella stessa padella aggiungi 1 cucchiaio d'olio, l'aglio a lamelle e il peperoncino. Dopo 30 secondi aggiungi i gamberi in un unico strato. Cuoci 1-2 minuti per lato finché diventano rosa e opachi. Non esagerare con la cottura o diventano gommosi.",
      "Sfuma con il vino bianco, lascia evaporare 1 minuto. Rimetti le zucchine, mescola, aggiusta di sale. Finisci con abbondante prezzemolo tritato.",
    ]
  ),

  r("tonno-fagioli-insalata", "Insalata di tonno, fagioli borlotti e cipolla rossa",
    ["mediterranea", "onnivora"], ["freddo", "veloce", "proteica"],
    12, "beginner", 2,
    [
      ing("tonno sott'olio di qualità", 200, "g", "Proteine"),
      ing("fagioli borlotti in lattina", 240, "g", "Proteine"),
      ing("cipolla rossa", 0.5, "pz", "Verdure"),
      ing("sedano", 2, "gambi", "Verdure"),
      ing("olio extravergine", 2, "cucchiai", "Dispensa"),
      ing("aceto di vino bianco", 1, "cucchiaio", "Dispensa"),
      ing("prezzemolo fresco", 1, "ciuffo", "Verdure"),
    ],
    [
      "Affetta la cipolla rossa finissima. Mettila in una ciotolina con un cucchiaio di aceto e un pizzico di sale per 5 minuti: si ammorbidirà e perderà l'asprezza cruda.",
      "Scola e sciacqua i fagioli. Taglia il sedano a fette oblique.",
      "In una ciotola grande unisci i fagioli, il tonno sbriciolato (sgocciolato dall'olio), il sedano e la cipolla scolata dall'aceto.",
      "Condisci con olio extravergine, pepe e prezzemolo tritato. Mescola delicatamente. Aggiusta di sale (il tonno è già sapido). Servi subito o lascia riposare qualche minuto.",
    ]
  ),

  // ── UOVA ───────────────────────────────────────────────────────────────────

  r("frittata-zucchine", "Frittata di zucchine con menta e parmigiano",
    ["mediterranea", "vegetariana"], ["veloce", "light"],
    18, "beginner", 2,
    [
      ing("uova fresche", 5, "pz", "Proteine"),
      ing("zucchine", 2, "pz", "Verdure"),
      ing("parmigiano grattugiato", 30, "g", "Latticini"),
      ing("menta fresca", 8, "foglie", "Verdure"),
      ing("olio extravergine", 2, "cucchiai", "Dispensa"),
    ],
    [
      "Taglia le zucchine a rondelle sottili (3-4mm). Scalda 1 cucchiaio di olio in una padella antiaderente da 22cm a fuoco medio-alto. Cuoci le zucchine per 4-5 minuti finché sono dorate. Sala e metti da parte a intiepidire.",
      "Sbatti le uova in una ciotola con un pizzico di sale, pepe, parmigiano e le foglie di menta spezzettate. Aggiungi le zucchine tiepide e mescola.",
      "Scalda 1 cucchiaio di olio nella padella a fuoco medio. Versa il composto di uova. Cuoci senza mescolare per 4-5 minuti finché i bordi sono sodi e il centro ancora morbido.",
      "Gira la frittata aiutandoti con un piatto: coprila con il piatto, capovolgi la padella, poi fai scivolare la frittata di nuovo in padella dal lato crudo. Cuoci altri 2-3 minuti. Servi tiepida o a temperatura ambiente.",
    ]
  ),

  r("uova-pomodoro", "Uova al pomodoro piccanti in padella",
    ["mediterranea", "vegetariana"], ["veloce", "comfort"],
    18, "beginner", 2,
    [
      ing("uova fresche", 4, "pz", "Proteine"),
      ing("passata di pomodoro", 280, "g", "Dispensa"),
      ing("cipolla dorata", 0.5, "pz", "Verdure"),
      ing("aglio", 1, "spicchio", "Verdure"),
      ing("peperoncino", 0.5, "pz", "Dispensa"),
      ing("olio extravergine", 2, "cucchiai", "Dispensa"),
      ing("basilico fresco", 8, "foglie", "Verdure"),
    ],
    [
      "In una padella larga scalda l'olio a fuoco medio. Soffriggi cipolla e aglio tritati con il peperoncino per 4 minuti finché morbidi.",
      "Aggiungi la passata, sala e cuoci per 8 minuti a fuoco medio finché il sugo si addensa un po'.",
      "Abbassa la fiamma al minimo. Crea 4 piccole conche nel sugo con il dorso di un cucchiaio. Rompi un uovo in ogni conca. Copri con un coperchio.",
      "Cuoci 4-5 minuti per uova con tuorlo ancora morbido, 6-7 minuti per tuorli più sodi. Il bianco deve essere completamente coagulato. Finisci con basilico fresco e un filo d'olio crudo.",
    ]
  ),

  r("shakshuka", "Shakshuka con peperoni, pomodori e feta",
    ["mediterranea", "vegetariana"], ["comfort", "mediorientale", "saporita"],
    22, "beginner", 2,
    [
      ing("uova fresche", 4, "pz", "Proteine"),
      ing("passata di pomodoro", 300, "g", "Dispensa"),
      ing("peperoni rossi", 1, "pz", "Verdure"),
      ing("cipolla", 0.5, "pz", "Verdure"),
      ing("aglio", 2, "spicchi", "Verdure"),
      ing("cumino in polvere", 1, "cucchiaino", "Dispensa"),
      ing("paprika dolce", 1, "cucchiaino", "Dispensa"),
      ing("feta sbriciolata", 60, "g", "Latticini"),
      ing("prezzemolo fresco", 1, "ciuffo", "Verdure"),
      ing("olio extravergine", 2, "cucchiai", "Dispensa"),
    ],
    [
      "Scalda l'olio in una padella larga a fuoco medio. Soffriggi cipolla e peperoni tagliati a cubetti per 6-7 minuti finché morbidi. Aggiungi l'aglio, cumino e paprika, cuoci 1 minuto: il profumo delle spezie deve intensificarsi.",
      "Versa la passata, sala e cuoci a fuoco medio per 8-10 minuti finché il sugo si addensa.",
      "Abbassa la fiamma. Crea 4 conche nel sugo e rompi un uovo in ognuna. Copri e cuoci 5-6 minuti per tuorli morbidi.",
      "Sbriciola la feta sopra, aggiungi prezzemolo abbondante. Servi direttamente nella padella con pane per raccogliere il sugo.",
    ]
  ),

  r("omelette-formaggio", "Omelette morbida al formaggio con erba cipollina",
    ["mediterranea", "vegetariana"], ["veloce", "colazione-cena"],
    12, "beginner", 2,
    [
      ing("uova fresche", 4, "pz", "Proteine"),
      ing("emmenthal o gruyère grattugiato", 60, "g", "Latticini"),
      ing("burro", 15, "g", "Latticini"),
      ing("erba cipollina", 1, "ciuffo", "Verdure"),
      ing("latte intero", 2, "cucchiai", "Latticini"),
    ],
    [
      "Sbatti le uova con il latte, un pizzico di sale e pepe. Non sbatterle troppo: basta che siano amalgamate.",
      "Scalda una padella antiaderente da 22cm a fuoco medio. Aggiungi il burro e aspetta che smetta di fare la schiuma.",
      "Versa le uova. Muovi la padella in senso circolare mentre con una spatola raduci il composto verso il centro: si formerà un'omelette morbida e ancora semiliquida al centro.",
      "Aggiungi il formaggio grattugiato su metà dell'omelette. Piega l'altra metà sopra. Fai scivolare nel piatto. L'interno deve essere ancora cremoso. Finisci con erba cipollina tritata.",
    ]
  ),

  r("frittata-patate", "Frittata di patate e cipolla",
    ["mediterranea", "vegetariana"], ["comfort", "economica"],
    25, "beginner", 2,
    [
      ing("uova fresche", 5, "pz", "Proteine"),
      ing("patate", 300, "g", "Verdure"),
      ing("cipolla dorata", 1, "pz", "Verdure"),
      ing("parmigiano grattugiato", 25, "g", "Latticini"),
      ing("olio extravergine", 3, "cucchiai", "Dispensa"),
    ],
    [
      "Pela le patate e tagliale a fettine sottili (3mm). Affetta finemente la cipolla.",
      "Scalda 2 cucchiai di olio in una padella antiaderente a fuoco medio. Cuoci patate e cipolla insieme per 12-15 minuti, mescolando spesso, finché le patate sono morbide e leggermente dorate. Sala. Fai intiepidire 2 minuti.",
      "Sbatti le uova con parmigiano, sale e pepe. Aggiungi le patate e mescola.",
      "Scalda 1 cucchiaio di olio nella padella a fuoco medio. Versa il composto. Cuoci 5-6 minuti finché i bordi sono sodi. Gira con l'aiuto di un piatto e cuoci altri 3-4 minuti. Servi tiepida.",
    ]
  ),

  r("uova-spinaci", "Uova strapazzate con spinaci e formaggio di capra",
    ["mediterranea", "vegetariana"], ["light", "veloce"],
    12, "beginner", 2,
    [
      ing("uova fresche", 4, "pz", "Proteine"),
      ing("spinaci freschi", 200, "g", "Verdure"),
      ing("formaggio di capra fresco", 60, "g", "Latticini"),
      ing("aglio", 1, "spicchio", "Verdure"),
      ing("burro", 10, "g", "Latticini"),
      ing("olio extravergine", 1, "cucchiaio", "Dispensa"),
    ],
    [
      "In una padella scalda l'olio con lo spicchio d'aglio schiacciato. Aggiungi gli spinaci e falli appassire per 2 minuti. Togli l'aglio, sala gli spinaci e metti da parte.",
      "Sbatti le uova con un pizzico di sale e pepe.",
      "Nella stessa padella (asciugata) scalda il burro a fuoco basso. Versa le uova. Mescola lentamente con una spatola, raccogliendo le uova dal fondo: devono formare grandi fiocchi morbidi. Spegni il fuoco quando sono ancora leggermente lucide.",
      "Aggiungi gli spinaci e il formaggio di capra sbriciolato. Mescola delicatamente e servi subito.",
    ]
  ),

  // ── LEGUMI ─────────────────────────────────────────────────────────────────

  r("ceci-pomodoro", "Ceci al pomodoro con rosmarino e pane tostato",
    ["mediterranea", "vegetariana", "vegana"], ["economica", "comfort"],
    22, "beginner", 2,
    [
      ing("ceci in lattina", 480, "g", "Proteine"),
      ing("passata di pomodoro", 250, "g", "Dispensa"),
      ing("cipolla dorata", 0.5, "pz", "Verdure"),
      ing("aglio", 2, "spicchi", "Verdure"),
      ing("rosmarino fresco", 1, "rametto", "Verdure"),
      ing("olio extravergine", 3, "cucchiai", "Dispensa"),
      ing("pane di campagna", 4, "fette", "Cereali"),
    ],
    [
      "Scola e sciacqua i ceci. In una padella scalda 2 cucchiai di olio a fuoco medio. Aggiungi cipolla tritata, aglio e rosmarino. Cuoci 5 minuti finché la cipolla è morbida.",
      "Versa i ceci e la passata. Cuoci a fuoco medio per 12-15 minuti: i ceci si insaporiscono e il sugo si addensa. Schiaccia una piccola parte dei ceci con una forchetta per rendere il fondo più cremoso. Aggiusta di sale.",
      "Tosta le fette di pane in padella o nel tostapane. Strofina ogni fetta con mezzo spicchio d'aglio crudo. Servi i ceci sopra il pane tostato con un filo d'olio crudo.",
    ]
  ),

  r("ceci-spinaci", "Ceci e spinaci con cumino e yogurt",
    ["mediterranea", "vegetariana"], ["proteico", "speziato"],
    18, "beginner", 2,
    [
      ing("ceci in lattina", 480, "g", "Proteine"),
      ing("spinaci freschi", 280, "g", "Verdure"),
      ing("aglio", 2, "spicchi", "Verdure"),
      ing("cumino in polvere", 1, "cucchiaino", "Dispensa"),
      ing("paprika affumicata", 0.5, "cucchiaino", "Dispensa"),
      ing("yogurt greco", 80, "g", "Latticini"),
      ing("olio extravergine", 2, "cucchiai", "Dispensa"),
      ing("limone", 0.5, "pz", "Verdure"),
    ],
    [
      "Scalda l'olio in una padella a fuoco medio. Aggiungi l'aglio affettato, cumino e paprika. Cuoci 1 minuto: le spezie profumano.",
      "Aggiungi i ceci scolati e sciacquati. Mescola e cuoci 2-3 minuti finché si insaporiscono. Aggiungi gli spinaci in 2-3 riprese, aspettando che appassiscano. Sala.",
      "Spegni il fuoco. Aggiungi il succo di mezzo limone. Impiatta e aggiungi una cucchiaiata di yogurt greco e un filo d'olio extravergine crudo.",
    ]
  ),

  r("lenticchie-umido", "Lenticchie in umido con verdure e alloro",
    ["mediterranea", "vegetariana", "vegana"], ["comfort", "invernale"],
    28, "beginner", 2,
    [
      ing("lenticchie verdi o marroni", 240, "g", "Proteine"),
      ing("passata di pomodoro", 200, "g", "Dispensa"),
      ing("carote", 1, "pz", "Verdure"),
      ing("cipolla", 1, "pz", "Verdure"),
      ing("sedano", 1, "gambo", "Verdure"),
      ing("aglio", 1, "spicchio", "Verdure"),
      ing("foglie di alloro", 2, "pz", "Dispensa"),
      ing("olio extravergine", 3, "cucchiai", "Dispensa"),
    ],
    [
      "Sciacqua le lenticchie. In una pentola scalda l'olio a fuoco medio. Prepara il soffritto: trita finemente cipolla, carota e sedano (è il classico battuto). Cuoci per 6-7 minuti finché morbidi.",
      "Aggiungi l'aglio e le foglie di alloro, cuoci 1 minuto. Versa la passata e le lenticchie. Copri con 400ml di acqua. Porta a bollore, poi abbassa la fiamma e cuoci a fuoco lento per 20-22 minuti, mescolando di tanto in tanto.",
      "Le lenticchie sono pronte quando sono tenere ma non sfatte e il fondo è denso e saporito. Aggiusta di sale, togli l'alloro. Finisci con un filo d'olio extravergine crudo.",
    ]
  ),

  r("fagioli-uccelletto", "Fagioli all'uccelletto con salvia",
    ["mediterranea", "vegetariana", "vegana"], ["comfort", "toscano", "semplice"],
    22, "beginner", 2,
    [
      ing("fagioli cannellini in lattina", 480, "g", "Proteine"),
      ing("passata di pomodoro", 180, "g", "Dispensa"),
      ing("aglio", 2, "spicchi", "Verdure"),
      ing("salvia fresca", 6, "foglie", "Verdure"),
      ing("olio extravergine", 3, "cucchiai", "Dispensa"),
    ],
    [
      "Scola e sciacqua i fagioli. In una padella scalda l'olio a fuoco medio con l'aglio schiacciato e le foglie di salvia. Cuoci 2 minuti finché l'aglio è dorato e la salvia croccante.",
      "Aggiungi i fagioli. Mescola e cuoci 2 minuti. Versa la passata, aggiusta di sale e pepa.",
      "Cuoci a fuoco medio-basso per 12-15 minuti: il sugo deve restringersi e avvolgere i fagioli. Schiaccia qualche fagiolo con il cucchiaio per rendere il fondo più cremoso. Servi con pane rustico.",
    ]
  ),

  r("zuppa-lenticchie", "Zuppa di lenticchie rosse con zenzero e limone",
    ["vegana", "vegetariana", "mediterranea"], ["comfort", "invernale", "nutriente"],
    28, "beginner", 2,
    [
      ing("lenticchie rosse decorticate", 220, "g", "Proteine"),
      ing("carote", 2, "pz", "Verdure"),
      ing("cipolla", 1, "pz", "Verdure"),
      ing("aglio", 2, "spicchi", "Verdure"),
      ing("zenzero fresco", 2, "cm", "Dispensa"),
      ing("cumino in polvere", 1, "cucchiaino", "Dispensa"),
      ing("limone", 1, "pz", "Verdure"),
      ing("olio extravergine", 2, "cucchiai", "Dispensa"),
    ],
    [
      "Scalda l'olio in una pentola a fuoco medio. Soffriggi cipolla, carote a cubetti e aglio per 5 minuti. Aggiungi lo zenzero grattugiato e il cumino, cuoci 1 minuto.",
      "Aggiungi le lenticchie rosse (non hanno bisogno di ammollo) e 800ml di acqua. Porta a bollore, poi cuoci a fuoco medio per 15-18 minuti finché le lenticchie si sfaldano completamente. Mescola spesso nel finale.",
      "Frulla con un frullatore a immersione fino a ottenere una crema liscia (o lascia parzialmente rustica se preferisci). Aggiusta di sale. Aggiungi il succo di limone. Servi con un filo d'olio crudo.",
    ]
  ),

  r("zuppa-ceci-rosmarino", "Zuppa di ceci e rosmarino con bruschetta",
    ["mediterranea", "vegetariana", "vegana"], ["comfort", "invernale"],
    25, "beginner", 2,
    [
      ing("ceci in lattina", 480, "g", "Proteine"),
      ing("aglio", 3, "spicchi", "Verdure"),
      ing("rosmarino fresco", 1, "rametto", "Verdure"),
      ing("passata di pomodoro", 100, "g", "Dispensa"),
      ing("brodo vegetale", 400, "ml", "Dispensa"),
      ing("olio extravergine", 4, "cucchiai", "Dispensa"),
      ing("pane di campagna", 4, "fette", "Cereali"),
    ],
    [
      "Scalda 3 cucchiai di olio in una pentola a fuoco medio. Aggiungi 2 spicchi d'aglio schiacciati e il rosmarino. Cuoci 2 minuti finché l'aglio sfrigola.",
      "Aggiungi i ceci scolati e la passata. Mescola e cuoci 2 minuti. Versa il brodo, porta a bollore e cuoci 12-15 minuti.",
      "Frulla con un frullatore a immersione solo una metà dei ceci, lasciando il resto intero. Aggiusta di sale e pepe.",
      "Tosta le fette di pane e strofina con lo spicchio d'aglio rimasto. Servi la zuppa nelle ciotole con la bruschetta a lato e un generoso filo d'olio crudo.",
    ]
  ),

  r("ceci-curry", "Ceci al curry con latte di cocco e riso basmati",
    ["vegana", "vegetariana", "mediterranea"], ["speziato", "nutriente", "comfort"],
    25, "beginner", 2,
    [
      ing("ceci in lattina", 480, "g", "Proteine"),
      ing("latte di cocco", 200, "ml", "Dispensa"),
      ing("passata di pomodoro", 150, "g", "Dispensa"),
      ing("cipolla", 1, "pz", "Verdure"),
      ing("aglio", 2, "spicchi", "Verdure"),
      ing("curry in polvere", 2, "cucchiaini", "Dispensa"),
      ing("zenzero in polvere", 0.5, "cucchiaino", "Dispensa"),
      ing("riso basmati", 160, "g", "Cereali"),
      ing("olio extravergine", 2, "cucchiai", "Dispensa"),
    ],
    [
      "Cuoci il riso basmati: sciacqualo, metti in pentola con 320ml di acqua salata, porta a bollore, copri e cuoci a fuoco minimo 12 minuti. Lascia riposare 5 minuti.",
      "In una padella scalda l'olio a fuoco medio. Soffriggi la cipolla tritata per 5 minuti. Aggiungi aglio, curry e zenzero, cuoci 1 minuto mescolando.",
      "Aggiungi i ceci scolati, la passata e il latte di cocco. Mescola, porta a bollore, poi cuoci a fuoco medio per 12 minuti finché il sugo si addensa. Aggiusta di sale.",
      "Servi il curry di ceci affiancato dal riso basmati.",
    ]
  ),

  r("hummus-piatto", "Piatto hummus con verdure croccanti e pita tostata",
    ["mediterranea", "vegetariana", "vegana"], ["freddo", "light", "mediorientale"],
    15, "beginner", 2,
    [
      ing("hummus", 250, "g", "Proteine"),
      ing("carote", 2, "pz", "Verdure"),
      ing("cetriolo", 1, "pz", "Verdure"),
      ing("peperoni", 1, "pz", "Verdure"),
      ing("pane pita", 2, "pz", "Cereali"),
      ing("paprika affumicata", 0.5, "cucchiaino", "Dispensa"),
      ing("olio extravergine", 2, "cucchiai", "Dispensa"),
      ing("olive nere", 40, "g", "Dispensa"),
    ],
    [
      "Taglia le verdure: carote a bastoncini, cetriolo a rondelle, peperoni a listarelle.",
      "Tosta le pite nel forno a 180°C per 4-5 minuti (o in padella senza olio) finché croccanti. Tagliala a spicchi.",
      "Disponi l'hummus in una ciotola o direttamente nel piatto. Con il dorso di un cucchiaio crea un vortice. Condisci con olio extravergine e paprika affumicata. Aggiungi le olive.",
      "Servi con le verdure crude e la pita tostata per intingere.",
    ]
  ),

  r("burger-ceci", "Burger di ceci con insalata, avocado e salsa allo yogurt",
    ["mediterranea", "vegetariana"], ["meal prep", "completo"],
    25, "beginner", 2,
    [
      ing("burger di ceci già pronti", 2, "pz", "Proteine"),
      ing("lattuga o misticanza", 80, "g", "Verdure"),
      ing("pomodori", 2, "pz", "Verdure"),
      ing("avocado", 1, "pz", "Verdure"),
      ing("yogurt greco", 80, "g", "Latticini"),
      ing("limone", 0.5, "pz", "Verdure"),
      ing("aglio", 0.5, "spicchio", "Verdure"),
      ing("olio extravergine", 1, "cucchiaio", "Dispensa"),
    ],
    [
      "Prepara la salsa: mescola yogurt greco con succo di limone, mezzo spicchio d'aglio grattugiato, sale e un filo d'olio. Tieni in frigo.",
      "Scalda una padella con olio a fuoco medio. Cuoci i burger 4-5 minuti per lato finché ben dorati e caldi al centro.",
      "Prepara l'insalata: lattuga, pomodori a fette, avocado a fette (condito con limone subito).",
      "Servi i burger affiancati dall'insalata, con la salsa allo yogurt a parte.",
    ]
  ),

  r("tofu-soia-verdure", "Tofu croccante saltato con verdure e salsa di soia",
    ["vegana", "vegetariana", "mediterranea"], ["proteico", "veloce"],
    22, "beginner", 2,
    [
      ing("tofu compatto", 280, "g", "Proteine"),
      ing("zucchine", 1, "pz", "Verdure"),
      ing("carote", 1, "pz", "Verdure"),
      ing("peperoni", 1, "pz", "Verdure"),
      ing("salsa di soia", 3, "cucchiai", "Dispensa"),
      ing("aglio", 1, "spicchio", "Verdure"),
      ing("olio di semi di girasole", 3, "cucchiai", "Dispensa"),
      ing("sesamo tostato", 1, "cucchiaino", "Dispensa"),
    ],
    [
      "Pressa il tofu: avvolgilo in carta da cucina e metti un peso sopra per 10 minuti. Questo elimina l'acqua in eccesso e lo rende più croccante. Taglialo a cubetti di 2cm.",
      "Scalda 2 cucchiai di olio in una padella a fuoco alto. Aggiungi il tofu in un unico strato. Non muovere per 3 minuti: si forma una crosticina dorata. Gira e cuoci altri 2-3 minuti. Metti da parte.",
      "Nella stessa padella aggiungi 1 cucchiaio di olio. Salta carote (a bastoncini), peperoni (a listarelle) e zucchine (a rondelle) a fuoco alto per 3-4 minuti: devono restare croccanti.",
      "Aggiungi l'aglio grattugiato, il tofu e la salsa di soia. Mescola e cuoci 1 minuto. Finisci con sesamo tostato.",
    ]
  ),

  r("insalata-quinoa-ceci", "Bowl di quinoa, ceci arrostiti e verdure fresche",
    ["vegana", "vegetariana", "mediterranea"], ["freddo", "meal prep", "estivo"],
    22, "beginner", 2,
    [
      ing("quinoa", 160, "g", "Cereali"),
      ing("ceci in lattina", 240, "g", "Proteine"),
      ing("pomodori ciliegia", 150, "g", "Verdure"),
      ing("cetriolo", 1, "pz", "Verdure"),
      ing("cipolla rossa", 0.25, "pz", "Verdure"),
      ing("limone", 1, "pz", "Verdure"),
      ing("olio extravergine", 3, "cucchiai", "Dispensa"),
      ing("prezzemolo fresco", 1, "ciuffo", "Verdure"),
      ing("paprika", 0.5, "cucchiaino", "Dispensa"),
    ],
    [
      "Sciacqua la quinoa. Cuoci in 320ml di acqua salata: porta a bollore, copri, abbassa al minimo e cuoci 12 minuti. Lascia riposare 5 minuti. Sgrana e lascia intiepidire.",
      "Riscalda il forno a 200°C. Scola i ceci, asciugali bene, condiscili con olio, paprika e sale. Arrostisci su una teglia per 15-18 minuti finché croccanti.",
      "Taglia pomodorini, cetriolo e cipolla rossa a pezzi piccoli. Prepara il condimento: succo di limone, olio, sale e pepe.",
      "Componi la bowl: quinoa alla base, verdure fresche, ceci croccanti. Condisci con la vinaigrette e finisci con prezzemolo abbondante.",
    ]
  ),

  r("insalata-lenticchie", "Insalata di lenticchie, pomodori e cipolla rossa",
    ["vegana", "vegetariana", "mediterranea"], ["freddo", "veloce"],
    15, "beginner", 2,
    [
      ing("lenticchie in lattina o già cotte", 320, "g", "Proteine"),
      ing("pomodori maturi", 2, "pz", "Verdure"),
      ing("cipolla rossa", 0.5, "pz", "Verdure"),
      ing("cetriolo", 1, "pz", "Verdure"),
      ing("prezzemolo fresco", 1, "ciuffo", "Verdure"),
      ing("olio extravergine", 3, "cucchiai", "Dispensa"),
      ing("aceto di vino rosso", 1, "cucchiaio", "Dispensa"),
      ing("cumino in polvere", 0.5, "cucchiaino", "Dispensa"),
    ],
    [
      "Scola e sciacqua le lenticchie. Affetta la cipolla rossa sottile e mettila in acqua fredda per 5 minuti (si addolcisce).",
      "Taglia pomodori e cetriolo a cubetti. Trita il prezzemolo.",
      "In una ciotola grande unisci tutti gli ingredienti. Condisci con olio, aceto, cumino, sale e pepe. Mescola e lascia riposare almeno 5 minuti prima di servire.",
    ]
  ),

  r("falafel-piatto", "Piatto falafel con hummus, insalata e salsa tahini",
    ["mediterranea", "vegetariana"], ["street food", "completo"],
    20, "beginner", 2,
    [
      ing("falafel surgelati o pronti", 8, "pz", "Proteine"),
      ing("hummus", 150, "g", "Proteine"),
      ing("lattuga o misticanza", 80, "g", "Verdure"),
      ing("pomodori ciliegia", 120, "g", "Verdure"),
      ing("cetriolo", 0.5, "pz", "Verdure"),
      ing("tahini", 2, "cucchiai", "Dispensa"),
      ing("limone", 0.5, "pz", "Verdure"),
      ing("pane pita", 2, "pz", "Cereali"),
    ],
    [
      "Scalda i falafel in forno a 200°C per 10-12 minuti finché croccanti fuori. Oppure in padella con poco olio per 3-4 minuti per lato.",
      "Prepara la salsa tahini: mescola il tahini con il succo di mezzo limone e 3-4 cucchiai di acqua fredda finché diventa cremosa e chiara. Aggiusta di sale.",
      "Tosta le pite. Disponi nel piatto: lattuga, pomodorini tagliati, cetriolo a rondelle, hummus, falafel caldi. Irrora con la salsa tahini e servi con la pita.",
    ]
  ),

  r("wrap-hummus", "Wrap con hummus, verdure grigliate e rucola",
    ["mediterranea", "vegana", "vegetariana"], ["veloce", "light"],
    15, "beginner", 2,
    [
      ing("piadina o wrap integrali", 2, "pz", "Cereali"),
      ing("hummus", 150, "g", "Proteine"),
      ing("zucchine", 1, "pz", "Verdure"),
      ing("peperoni", 1, "pz", "Verdure"),
      ing("rucola", 40, "g", "Verdure"),
      ing("olio extravergine", 1, "cucchiaio", "Dispensa"),
      ing("limone", 0.25, "pz", "Verdure"),
    ],
    [
      "Taglia zucchine e peperoni a listarelle. Scalda una padella grill a fuoco alto. Grigliala per 2-3 minuti per lato finché compaiono le striature. Sala.",
      "Scalda le piadine in padella o al microonde per 30 secondi.",
      "Spalca abbondante hummus su ogni piadina. Aggiungi le verdure grigliate tiepide e la rucola. Spremi qualche goccia di limone.",
      "Arrotola stretto e taglia a metà. Servi subito.",
    ]
  ),

  r("burger-vegetali", "Burger vegetale con insalata di cavolo e senape",
    ["mediterranea", "vegana", "vegetariana"], ["meal prep", "completo"],
    18, "beginner", 2,
    [
      ing("burger vegetali", 2, "pz", "Proteine"),
      ing("cavolo cappuccio", 150, "g", "Verdure"),
      ing("carote", 1, "pz", "Verdure"),
      ing("maionese vegana", 2, "cucchiai", "Dispensa"),
      ing("senape di Digione", 1, "cucchiaino", "Dispensa"),
      ing("limone", 0.25, "pz", "Verdure"),
      ing("olio extravergine", 1, "cucchiaio", "Dispensa"),
    ],
    [
      "Prepara la coleslaw: affetta finissimo il cavolo, grattugia la carota. Condisci con maionese vegana, senape, succo di limone, sale e pepe. Metti in frigo.",
      "Scalda una padella con l'olio a fuoco medio. Cuoci i burger 4-5 minuti per lato finché dorati e caldi.",
      "Servi i burger affiancati dalla coleslaw. L'acidità del cavolo bilancia perfettamente la sapidità del burger.",
    ]
  ),

  // ── VERDURE / PIATTI VEGETARIANI ────────────────────────────────────────────

  r("riso-verdure", "Riso pilaf con verdure e mandorle tostate",
    ["mediterranea", "vegetariana", "vegana"], ["light", "profumato"],
    22, "beginner", 2,
    [
      ing("riso basmati", 170, "g", "Cereali"),
      ing("zucchine", 1, "pz", "Verdure"),
      ing("carote", 1, "pz", "Verdure"),
      ing("cipolla", 0.5, "pz", "Verdure"),
      ing("mandorle a lamelle", 30, "g", "Dispensa"),
      ing("curcuma", 0.5, "cucchiaino", "Dispensa"),
      ing("olio extravergine", 2, "cucchiai", "Dispensa"),
    ],
    [
      "In una pentola scalda l'olio a fuoco medio. Soffriggi la cipolla tritata per 3 minuti. Aggiungi il riso e la curcuma, tosta per 2 minuti mescolando: i chicchi diventano traslucidi.",
      "Versa 340ml di acqua salata bollente. Porta a bollore, copri, abbassa al minimo e cuoci 12 minuti. Spegni e lascia riposare 5 minuti.",
      "Nel frattempo salta zucchine e carote (tagliate a julienne) in padella con un filo d'olio a fuoco alto per 3-4 minuti. Sala.",
      "Sgrana il riso con una forchetta. Unisci le verdure. Tosta le mandorle in un padellino secco a fuoco medio per 2-3 minuti finché dorate. Spargile sopra al momento di servire.",
    ]
  ),

  r("riso-ceci-verdure", "Riso con ceci, spinaci e limone",
    ["mediterranea", "vegetariana", "vegana"], ["meal prep", "nutriente"],
    22, "beginner", 2,
    [
      ing("riso integrale o semintegrale", 170, "g", "Cereali"),
      ing("ceci in lattina", 240, "g", "Proteine"),
      ing("spinaci freschi", 200, "g", "Verdure"),
      ing("carote", 1, "pz", "Verdure"),
      ing("aglio", 1, "spicchio", "Verdure"),
      ing("limone", 0.5, "pz", "Verdure"),
      ing("olio extravergine", 2, "cucchiai", "Dispensa"),
    ],
    [
      "Cuoci il riso integrale seguendo le istruzioni (di solito 25-30 minuti in acqua salata). Scola.",
      "In una padella scalda l'olio con l'aglio. Aggiungi le carote a cubetti e cuoci 4 minuti. Aggiungi i ceci scolati, cuoci 2 minuti.",
      "Aggiungi gli spinaci, falli appassire per 2 minuti. Aggiusta di sale. Unisci il riso e il succo di limone. Mescola e servi.",
    ]
  ),

  r("riso-gamberi-zucchine", "Riso con gamberi, zucchine e zafferano",
    ["mediterranea", "onnivora"], ["pesce", "elegante"],
    28, "beginner", 2,
    [
      ing("riso carnaroli o arborio", 180, "g", "Cereali"),
      ing("gamberi", 250, "g", "Proteine"),
      ing("zucchine", 2, "pz", "Verdure"),
      ing("zafferano", 1, "bustina", "Dispensa"),
      ing("cipolla", 0.5, "pz", "Verdure"),
      ing("vino bianco", 60, "ml", "Dispensa"),
      ing("brodo di pesce o vegetale", 500, "ml", "Dispensa"),
      ing("olio extravergine", 3, "cucchiai", "Dispensa"),
    ],
    [
      "Scalda il brodo in un pentolino e tienilo caldo. Sciogli lo zafferano in un cucchiaio di brodo caldo.",
      "In una padella larga scalda 2 cucchiai di olio a fuoco medio. Soffriggi la cipolla 3 minuti. Aggiungi il riso e tostalo 2 minuti. Sfuma con il vino bianco e lascia evaporare.",
      "Aggiungi il brodo caldo un mestolo alla volta, mescolando e aspettando che venga assorbito prima di aggiungerne altro. A metà cottura aggiungi le zucchine a rondelle e lo zafferano.",
      "A 2 minuti dalla fine, aggiungi i gamberi sgusciati: cuociono velocemente (1-2 minuti). Aggiusta di sale. Il risotto deve essere all'onda: cremoso e fluido. Togli dal fuoco, aggiungi 1 cucchiaio d'olio crudo e mescola.",
    ]
  ),

  r("riso-tofu-verdure", "Riso saltato con tofu, edamame e salsa di soia",
    ["mediterranea", "vegana", "vegetariana"], ["proteico", "veloce"],
    22, "beginner", 2,
    [
      ing("riso basmati cotto (anche avanzato)", 300, "g", "Cereali"),
      ing("tofu compatto", 200, "g", "Proteine"),
      ing("edamame (fagioli di soia sgusciati)", 100, "g", "Proteine"),
      ing("carote", 1, "pz", "Verdure"),
      ing("cipollotto", 2, "pz", "Verdure"),
      ing("salsa di soia", 3, "cucchiai", "Dispensa"),
      ing("olio di semi", 3, "cucchiai", "Dispensa"),
      ing("zenzero fresco", 1, "cm", "Dispensa"),
    ],
    [
      "Pressa e cuoci il tofu come nella ricetta del tofu saltato. Taglia a cubetti.",
      "Scalda 2 cucchiai di olio in un wok o padella grande a fuoco molto alto. Aggiungi carote a julienne, cuoci 2 minuti. Aggiungi gli edamame e il cipollotto a rondelle, cuoci 1 minuto.",
      "Aggiungi il riso (meglio se freddo di frigo): si sgranerà meglio. Salta a fuoco alto per 2-3 minuti. Aggiungi tofu, salsa di soia e zenzero grattugiato. Mescola vivacemente per 1 minuto.",
    ]
  ),

  // ── DOMENICA / SPECIALE ─────────────────────────────────────────────────────

  r("lasagna", "Lasagna al ragù bianco di pollo e verdure",
    ["mediterranea", "onnivora"], ["speciale", "domenica", "family"],
    55, "intermediate", 4,
    [
      ing("sfoglie lasagna secche", 250, "g", "Cereali"),
      ing("petto di pollo macinato", 350, "g", "Proteine"),
      ing("zucchine", 2, "pz", "Verdure"),
      ing("carote", 1, "pz", "Verdure"),
      ing("cipolla", 1, "pz", "Verdure"),
      ing("latte intero", 500, "ml", "Latticini"),
      ing("farina 00", 40, "g", "Dispensa"),
      ing("burro", 40, "g", "Latticini"),
      ing("parmigiano grattugiato", 80, "g", "Latticini"),
      ing("olio extravergine", 2, "cucchiai", "Dispensa"),
      ing("noce moscata", 1, "pizzico", "Dispensa"),
    ],
    [
      "Prepara la besciamella: in un pentolino sciogli il burro a fuoco medio. Aggiungi la farina tutta in una volta e mescola velocemente con una frusta per 1-2 minuti (si forma il roux). Versa il latte caldo a filo, mescolando continuamente con la frusta per evitare i grumi. Cuoci per 5-7 minuti finché la salsa si addensa. Sala, pepa e aggiungi un pizzico di noce moscata.",
      "In una padella scalda l'olio a fuoco medio. Soffriggi cipolla e carote tritate per 5 minuti. Aggiungi il pollo macinato e rosola per 5-6 minuti, sgranandolo con una forchetta. Aggiungi le zucchine a cubetti, cuoci 3 minuti. Sala e pepa.",
      "Preriscalda il forno a 180°C. In una pirofila rettangolare (circa 30x20cm) stendi un velo di besciamella sul fondo. Strati: sfoglie di lasagna, ragù di pollo, besciamella, parmigiano. Ripeti per 4-5 strati. Termina con abbondante besciamella e parmigiano.",
      "Copri con carta alluminio e inforna 30 minuti. Scopri e cuoci altri 10-15 minuti finché la superficie è dorata e gratinata. Lascia riposare 10 minuti prima di tagliare.",
    ]
  ),

  r("pollo-forno-patate", "Pollo al forno con patate arrosto e rosmarino",
    ["mediterranea", "onnivora"], ["speciale", "domenica", "classico"],
    55, "beginner", 4,
    [
      ing("pollo intero o cosce e sovracosce", 1000, "g", "Proteine"),
      ing("patate gialle", 800, "g", "Verdure"),
      ing("aglio", 4, "spicchi", "Verdure"),
      ing("rosmarino fresco", 1, "rametto", "Verdure"),
      ing("limone", 1, "pz", "Verdure"),
      ing("vino bianco secco", 100, "ml", "Dispensa"),
      ing("olio extravergine", 5, "cucchiai", "Dispensa"),
    ],
    [
      "Preriscalda il forno a 200°C. Taglia le patate a spicchi con la buccia (lavata). Conditele in una ciotola con 3 cucchiai di olio, rosmarino, 2 spicchi d'aglio schiacciati, sale e pepe. Disponile in una teglia grande.",
      "Incidi la pelle del pollo in più punti. Strofina con olio, sale, pepe, aglio e succo di mezzo limone. Inserisci qualche spicchio di limone e rosmarino sotto la pelle o dentro la cavità.",
      "Adagia il pollo al centro della teglia sopra le patate. Versa il vino bianco nella teglia (non sul pollo). Inforna per 45-50 minuti, irrorando ogni 15 minuti con i succhi che si raccolgono nella teglia.",
      "Il pollo è cotto quando, incidendo la coscia, il liquido che fuoriesce è chiaro (non rosa). La pelle deve essere dorata e croccante. Lascia riposare 5 minuti prima di servire.",
    ]
  ),

  r("parmigiana-light", "Parmigiana di melanzane al forno (versione leggera)",
    ["mediterranea", "vegetariana"], ["speciale", "domenica", "estivo"],
    45, "intermediate", 4,
    [
      ing("melanzane", 3, "pz", "Verdure"),
      ing("passata di pomodoro", 400, "g", "Dispensa"),
      ing("mozzarella fiordilatte", 300, "g", "Latticini"),
      ing("parmigiano grattugiato", 60, "g", "Latticini"),
      ing("basilico fresco", 8, "foglie", "Verdure"),
      ing("aglio", 1, "spicchio", "Verdure"),
      ing("olio extravergine", 5, "cucchiai", "Dispensa"),
    ],
    [
      "Taglia le melanzane a fette di 7-8mm. Disponi su teglie rivestite di carta forno, spennella entrambi i lati con olio. Inforna a 220°C per 18-20 minuti, girando a metà, finché sono dorate e morbide.",
      "Prepara il sugo: scalda 1 cucchiaio di olio con l'aglio, aggiungi la passata e cuoci 10 minuti. Aggiusta di sale, aggiungi basilico.",
      "Abbassa il forno a 180°C. Taglia la mozzarella a fette e tamponala con carta da cucina (per ridurre l'acqua). In una pirofila alterna: sugo, fette di melanzana, mozzarella, parmigiano, basilico. Ripeti per 3-4 strati. Termina con sugo e parmigiano abbondante.",
      "Inforna per 20-25 minuti finché la superficie è dorata e il formaggio fuso. Lascia riposare 10 minuti. È ancora più buona il giorno dopo.",
    ]
  ),

  r("lasagna-verdure", "Lasagna di verdure con ricotta e besciamella",
    ["mediterranea", "vegetariana"], ["speciale", "domenica"],
    50, "intermediate", 4,
    [
      ing("sfoglie lasagna", 250, "g", "Cereali"),
      ing("zucchine", 2, "pz", "Verdure"),
      ing("melanzane", 1, "pz", "Verdure"),
      ing("peperoni", 1, "pz", "Verdure"),
      ing("ricotta fresca", 350, "g", "Latticini"),
      ing("mozzarella", 200, "g", "Latticini"),
      ing("parmigiano grattugiato", 60, "g", "Latticini"),
      ing("passata di pomodoro", 300, "g", "Dispensa"),
      ing("olio extravergine", 3, "cucchiai", "Dispensa"),
    ],
    [
      "Grigliala le verdure (zucchine, melanzane, peperoni) a fette in una padella grill con un filo d'olio, 2-3 minuti per lato. Sala. Puoi farlo anche in forno a 220°C per 15 minuti.",
      "Mescola la ricotta con metà del parmigiano, sale e pepe fino a ottenere una crema.",
      "Preriscalda il forno a 180°C. In una pirofila stendi un velo di passata. Strati: sfoglie, crema di ricotta, verdure grigliate, passata, mozzarella a pezzi. Ripeti per 4 strati. Finisci con mozzarella e parmigiano.",
      "Copri con alluminio e inforna 25 minuti. Scopri e cuoci altri 10-15 minuti. Lascia riposare prima di servire.",
    ]
  ),

  r("cannelloni-ricotta-spinaci", "Cannelloni ripieni di ricotta e spinaci",
    ["mediterranea", "vegetariana"], ["speciale", "domenica", "family"],
    50, "intermediate", 4,
    [
      ing("cannelloni secchi", 250, "g", "Cereali"),
      ing("ricotta fresca", 350, "g", "Latticini"),
      ing("spinaci freschi", 400, "g", "Verdure"),
      ing("uova", 1, "pz", "Proteine"),
      ing("parmigiano grattugiato", 80, "g", "Latticini"),
      ing("passata di pomodoro", 350, "g", "Dispensa"),
      ing("mozzarella", 150, "g", "Latticini"),
      ing("noce moscata", 1, "pizzico", "Dispensa"),
      ing("burro", 20, "g", "Latticini"),
    ],
    [
      "Appassisci gli spinaci in padella con un filo d'olio per 3 minuti. Scola bene strizzandoli con le mani. Tritali grossolanamente.",
      "In una ciotola mescola ricotta, spinaci, l'uovo, metà del parmigiano e un pizzico di noce moscata. Aggiusta di sale. Il ripieno deve essere compatto.",
      "Preriscalda il forno a 180°C. Prepara un sugo semplice: scalda la passata con un filo d'olio per 8 minuti.",
      "Riempi i cannelloni crudi con il ripieno usando un sac-à-poche o un cucchiaino. Stendi un velo di sugo in una pirofila. Disponi i cannelloni in un unico strato. Copri con il restante sugo, mozzarella a pezzi e parmigiano.",
      "Copri con alluminio e inforna 30 minuti. Scopri e cuoci altri 10 minuti finché dorati. Lascia riposare 5 minuti.",
    ]
  ),

  // ── NUOVE RICETTE AGGIUNTE ──────────────────────────────────────────────────

  r("pasta-pomodorini-freschi", "Spaghetti con pomodorini scoppiati e burrata",
    ["mediterranea", "vegetariana"], ["estivo", "veloce", "saporita"],
    18, "beginner", 2,
    [
      ing("spaghetti", 180, "g", "Cereali"),
      ing("pomodori ciliegia misti (anche gialli)", 300, "g", "Verdure"),
      ing("aglio", 2, "spicchi", "Verdure"),
      ing("burrata", 1, "pz", "Latticini"),
      ing("basilico fresco", 8, "foglie", "Verdure"),
      ing("olio extravergine", 4, "cucchiai", "Dispensa"),
    ],
    [
      "Cuoci gli spaghetti in acqua abbondante salata.",
      "In una padella larga scalda l'olio con l'aglio schiacciato a fuoco medio-alto. Aggiungi i pomodorini interi. Cuocili a fuoco alto per 5-6 minuti: scoppieranno e rilasceranno il loro succo. Schiaccia i più grossi con il cucchiaio. Sala e aggiungi basilico.",
      "Scola gli spaghetti al dente tenendo l'acqua di cottura. Versali nella padella, salta 1 minuto con i pomodorini aggiungendo acqua di cottura per mantecare.",
      "Impiatta e poggia sopra la burrata aperta. Il calore della pasta la scioglierà parzialmente. Finisci con basilico e olio crudo.",
    ]
  ),

  r("polpette-pomodoro", "Polpette di carne al sugo di pomodoro",
    ["mediterranea", "onnivora"], ["comfort", "family", "classico"],
    35, "beginner", 4,
    [
      ing("carne macinata mista (manzo e maiale)", 500, "g", "Proteine"),
      ing("pangrattato", 50, "g", "Dispensa"),
      ing("parmigiano grattugiato", 40, "g", "Latticini"),
      ing("uova", 1, "pz", "Proteine"),
      ing("aglio", 1, "spicchio", "Verdure"),
      ing("prezzemolo fresco", 1, "ciuffo", "Verdure"),
      ing("passata di pomodoro", 400, "g", "Dispensa"),
      ing("cipolla", 0.5, "pz", "Verdure"),
      ing("olio extravergine", 3, "cucchiai", "Dispensa"),
    ],
    [
      "In una ciotola mescola la carne con pangrattato, parmigiano, l'uovo, aglio e prezzemolo tritati, sale e pepe. Impasta bene con le mani finché è omogeneo. Forma palline della grandezza di una noce (circa 35-40g).",
      "Scalda 2 cucchiai di olio in una padella capiente a fuoco alto. Rosola le polpette in due riprese senza affollarle: 3-4 minuti per lato finché dorate su tutti i lati. Metti da parte.",
      "Nella stessa padella a fuoco medio soffriggi la cipolla tritata con 1 cucchiaio di olio per 4 minuti. Aggiungi la passata, sala e cuoci 5 minuti.",
      "Rimetti le polpette nel sugo. Copri e cuoci a fuoco basso per 15-18 minuti, girandole delicatamente a metà. Il sugo si addensa e le polpette diventano morbide. Ottime con pane o purè.",
    ]
  ),

  r("insalata-greca", "Insalata greca con feta, olive e origano",
    ["mediterranea", "vegetariana"], ["freddo", "estivo", "veloce"],
    12, "beginner", 2,
    [
      ing("pomodori maturi grandi", 3, "pz", "Verdure"),
      ing("cetriolo", 1, "pz", "Verdure"),
      ing("cipolla rossa", 0.5, "pz", "Verdure"),
      ing("peperoni verdi", 0.5, "pz", "Verdure"),
      ing("feta greca", 150, "g", "Latticini"),
      ing("olive kalamata", 80, "g", "Dispensa"),
      ing("origano secco", 1, "cucchiaino", "Dispensa"),
      ing("olio extravergine", 4, "cucchiai", "Dispensa"),
      ing("aceto di vino rosso", 1, "cucchiaio", "Dispensa"),
    ],
    [
      "Taglia i pomodori a spicchi grandi, il cetriolo a rondelle spesse, la cipolla rossa a rondelle sottili, il peperone a listarelle.",
      "Disponi le verdure in un piatto fondo. Aggiungi le olive. Metti sopra il blocco di feta intero (tradizione greca) o a cubetti.",
      "Condisci con abbondante olio extravergine, aceto, origano, sale e pepe. Non mescolare troppo: l'insalata greca non si mescola come un'insalata normale. Servi con pane.",
    ]
  ),

  r("zucchine-ripiene", "Zucchine ripiene di riso, pomodori e erbe",
    ["mediterranea", "vegetariana"], ["estivo", "speciale"],
    40, "beginner", 2,
    [
      ing("zucchine grandi", 2, "pz", "Verdure"),
      ing("riso carnaroli", 100, "g", "Cereali"),
      ing("pomodori maturi", 2, "pz", "Verdure"),
      ing("cipolla", 0.5, "pz", "Verdure"),
      ing("basilico e menta freschi", 8, "foglie", "Verdure"),
      ing("olio extravergine", 3, "cucchiai", "Dispensa"),
      ing("parmigiano grattugiato", 30, "g", "Latticini"),
    ],
    [
      "Preriscalda il forno a 180°C. Taglia le zucchine a metà nel senso della lunghezza. Svuotale con un cucchiaino lasciando 5mm di bordo. Trita la polpa estratta.",
      "Cuoci il riso a metà (circa 8 minuti in acqua salata): deve essere ancora duro al centro perché finirà di cuocere in forno. Scola.",
      "Trita cipolla e pomodori a cubetti piccoli. In una ciotola mescola riso, polpa di zucchine, pomodori, cipolla, basilico e menta tritati, parmigiano, 2 cucchiai di olio, sale e pepe.",
      "Riempi le barchette di zucchine con il composto di riso, pressando leggermente. Disponi in una teglia unta, condisci con un filo d'olio. Inforna per 28-30 minuti finché le zucchine sono tenere e il riso dorato in superficie.",
    ]
  ),

  r("salmone-avocado-bowl", "Bowl di salmone al sesamo con avocado e riso",
    ["mediterranea", "onnivora"], ["pesce", "completo", "meal prep"],
    22, "beginner", 2,
    [
      ing("filetti di salmone", 300, "g", "Proteine"),
      ing("riso basmati", 160, "g", "Cereali"),
      ing("avocado", 1, "pz", "Verdure"),
      ing("cetriolo", 0.5, "pz", "Verdure"),
      ing("sesamo tostato", 1, "cucchiaio", "Dispensa"),
      ing("salsa di soia", 2, "cucchiai", "Dispensa"),
      ing("olio di sesamo", 1, "cucchiaio", "Dispensa"),
      ing("limone", 0.5, "pz", "Verdure"),
      ing("cipollotto", 1, "pz", "Verdure"),
    ],
    [
      "Cuoci il riso basmati e lascialo intiepidire.",
      "Taglia il salmone a cubetti di 2cm. Marina per 5 minuti in salsa di soia e olio di sesamo.",
      "Scalda una padella antiaderente a fuoco alto. Cuoci il salmone 1-2 minuti per lato: deve essere dorato fuori e ancora leggermente rosa dentro.",
      "Affetta avocado e cetriolo. Componi la bowl: riso alla base, salmone, avocado e cetriolo. Condisci con qualche goccia di salsa di soia, succo di limone, cipollotto a rondelle e sesamo.",
    ]
  ),

  r("carne-verdure-padella", "Straccetti di manzo con rucola e parmigiano",
    ["mediterranea", "onnivora"], ["veloce", "proteico"],
    18, "beginner", 2,
    [
      ing("fettine di manzo (scamone o fesa)", 300, "g", "Proteine"),
      ing("rucola", 80, "g", "Verdure"),
      ing("parmigiano a scaglie", 40, "g", "Latticini"),
      ing("limone", 1, "pz", "Verdure"),
      ing("olio extravergine", 3, "cucchiai", "Dispensa"),
    ],
    [
      "Taglia le fettine di manzo a listarelle larghe 2cm.",
      "Scalda una padella a fuoco molto alto con 2 cucchiai di olio. Quando fuma, aggiungi la carne in un unico strato: cuoci 1-2 minuti senza mescolare. Gira e cuoci altri 30 secondi. La carne deve essere rosata dentro. Sala e pepa.",
      "Servi subito: disponi la rucola nel piatto, aggiungi gli straccetti caldi sopra (la rucola appassirà leggermente a contatto col calore), le scaglie di parmigiano e una spremitura generosa di limone. Finisci con 1 cucchiaio di olio crudo.",
    ]
  ),

  r("soup-minestrone", "Minestrone ricco di verdure di stagione",
    ["mediterranea", "vegetariana"], ["comfort", "invernale", "nutriente"],
    35, "beginner", 4,
    [
      ing("patate", 2, "pz", "Verdure"),
      ing("carote", 2, "pz", "Verdure"),
      ing("zucchine", 2, "pz", "Verdure"),
      ing("sedano", 2, "gambi", "Verdure"),
      ing("cipolla", 1, "pz", "Verdure"),
      ing("pomodori pelati in lattina", 200, "g", "Dispensa"),
      ing("fagioli borlotti in lattina", 240, "g", "Proteine"),
      ing("pasta mista piccola o riso", 120, "g", "Cereali"),
      ing("olio extravergine", 3, "cucchiai", "Dispensa"),
    ],
    [
      "Taglia tutte le verdure a cubetti irregolari di 1-2cm.",
      "In una pentola grande scalda l'olio a fuoco medio. Soffriggi cipolla, carote e sedano per 6-7 minuti. Aggiungi le patate e i pomodori schiacciati con le mani.",
      "Aggiungi 1.5 litri di acqua salata e, se ce l'hai, la crosta di parmigiano (insaporisce moltissimo il brodo). Porta a bollore, poi cuoci a fuoco medio per 15 minuti.",
      "Aggiungi zucchine, fagioli e la pasta. Cuoci altri 10 minuti finché la pasta è cotta. Aggiusta di sale. Il minestrone deve essere denso e ricco. Finisci con abbondante olio extravergine crudo.",
    ]
  ),

  r("pollo-yogurt-spezie", "Cosce di pollo marinate allo yogurt e spezie",
    ["mediterranea", "onnivora"], ["speziato", "estivo"],
    30, "beginner", 2,
    [
      ing("cosce di pollo disossate", 4, "pz", "Proteine"),
      ing("yogurt greco", 150, "g", "Latticini"),
      ing("aglio", 2, "spicchi", "Verdure"),
      ing("paprika affumicata", 1, "cucchiaino", "Dispensa"),
      ing("cumino", 1, "cucchiaino", "Dispensa"),
      ing("coriandolo in polvere", 0.5, "cucchiaino", "Dispensa"),
      ing("limone", 1, "pz", "Verdure"),
      ing("olio extravergine", 2, "cucchiai", "Dispensa"),
    ],
    [
      "Prepara la marinata: mescola yogurt, aglio grattugiato, tutte le spezie, succo di mezzo limone, olio, sale e pepe. Fai delle incisioni nelle cosce di pollo con un coltello. Immergi nella marinata. Lascia riposare almeno 15 minuti (meglio 1 ora in frigo).",
      "Scalda il grill del forno a 220°C o una padella grill a fuoco alto. Cuoci le cosce per 8-10 minuti per lato, finché l'esterno è ben dorato e leggermente carbonizzato ai bordi. L'interno deve essere cotto completamente.",
      "Servi con spicchi di limone e, se hai, pane pita e yogurt fresco.",
    ]
  ),

  r("peperoni-ripieni", "Peperoni ripieni di riso, feta e olive",
    ["mediterranea", "vegetariana"], ["speciale", "colorato"],
    40, "beginner", 2,
    [
      ing("peperoni grandi (misti)", 2, "pz", "Verdure"),
      ing("riso basmati", 120, "g", "Cereali"),
      ing("feta", 100, "g", "Latticini"),
      ing("olive nere denocciolate", 50, "g", "Dispensa"),
      ing("pomodorini", 100, "g", "Verdure"),
      ing("origano secco", 1, "cucchiaino", "Dispensa"),
      ing("olio extravergine", 3, "cucchiai", "Dispensa"),
    ],
    [
      "Preriscalda il forno a 180°C. Taglia la calotta ai peperoni e svuotali dai semi. Fai cuocere il riso per 8 minuti (sarà al dente). Scola.",
      "In una ciotola mescola riso, feta sbriciolata, olive, pomodorini tagliati a metà, origano, olio, sale e pepe.",
      "Riempi i peperoni con il composto. Rimetti le calotte. Disponi in una teglia con un filo d'olio e 2-3 cucchiai di acqua sul fondo.",
      "Inforna per 30-35 minuti finché i peperoni sono morbidi e il riso completamente cotto. Ottimi anche tiepidi o freddi.",
    ]
  ),

  r("frittata-asparagi", "Frittata di asparagi e pecorino",
    ["mediterranea", "vegetariana"], ["primaverile", "veloce"],
    20, "beginner", 2,
    [
      ing("uova fresche", 5, "pz", "Proteine"),
      ing("asparagi", 200, "g", "Verdure"),
      ing("pecorino romano grattugiato", 30, "g", "Latticini"),
      ing("cipollotto", 1, "pz", "Verdure"),
      ing("olio extravergine", 2, "cucchiai", "Dispensa"),
    ],
    [
      "Taglia la parte legnosa degli asparagi e tagliali a tronchetti di 3cm. Scalda 1 cucchiaio di olio in padella antiaderente, cuoci gli asparagi con il cipollotto per 4-5 minuti. Sala.",
      "Sbatti le uova con il pecorino, sale e pepe. Aggiungi gli asparagi tiepidi.",
      "Scalda 1 cucchiaio di olio in padella a fuoco medio. Versa le uova. Cuoci 4-5 minuti, poi gira con un piatto e cuoci altri 3 minuti. Servi tiepida.",
    ]
  ),

  r("pasta-tonno", "Pasta al tonno con pomodorini e capperi",
    ["mediterranea", "onnivora"], ["veloce", "economica"],
    18, "beginner", 2,
    [
      ing("pasta (spaghetti o linguine)", 180, "g", "Cereali"),
      ing("tonno sott'olio", 160, "g", "Proteine"),
      ing("pomodori ciliegia", 200, "g", "Verdure"),
      ing("capperi sotto sale", 1, "cucchiaio", "Dispensa"),
      ing("aglio", 1, "spicchio", "Verdure"),
      ing("olio extravergine", 3, "cucchiai", "Dispensa"),
      ing("prezzemolo fresco", 1, "ciuffo", "Verdure"),
    ],
    [
      "Cuoci la pasta in acqua abbondante salata.",
      "Sciacqua i capperi. In una padella scalda l'olio con l'aglio a fuoco medio. Aggiungi i pomodorini tagliati a metà, cuocili 3-4 minuti finché si ammorbidiscono. Aggiungi i capperi.",
      "Spezza il tonno sull'olio e aggiungilo alla padella. Mescola e scalda 1 minuto (il tonno non deve cuocere ulteriormente o si sfalda troppo).",
      "Scola la pasta al dente, versala nella padella. Salta 1 minuto. Finisci con abbondante prezzemolo.",
    ]
  ),

  r("bistecca-verdure", "Tagliata di manzo con rucola e pomodorini",
    ["mediterranea", "onnivora"], ["proteico", "veloce", "carne"],
    20, "beginner", 2,
    [
      ing("bistecca di manzo (controfiletto o entrecôte)", 350, "g", "Proteine"),
      ing("rucola", 80, "g", "Verdure"),
      ing("pomodori ciliegia", 150, "g", "Verdure"),
      ing("parmigiano a scaglie", 30, "g", "Latticini"),
      ing("limone", 0.5, "pz", "Verdure"),
      ing("olio extravergine", 2, "cucchiai", "Dispensa"),
    ],
    [
      "Tira fuori la bistecca dal frigo 20 minuti prima. Asciugala con carta da cucina. Non salarla prima: il sale tira fuori i liquidi.",
      "Scalda una padella in ghisa o antiaderente a fuoco altissimo per 2-3 minuti: deve essere rovente. Aggiungi un filo d'olio. Cuoci la bistecca 2-3 minuti per lato (al sangue), 3-4 minuti (media cottura). Sala subito dopo la cottura.",
      "Lascia riposare la carne su un tagliere per 3-4 minuti: i succhi si redistribuiscono e rimane morbida. Tagliala in fette oblique.",
      "Disponi la rucola nel piatto, adagia la tagliata sopra con i pomodorini tagliati a metà. Condisci con olio extravergine, succo di limone e scaglie di parmigiano.",
    ]
  ),

  r("merluzzo-ceci", "Merluzzo con ceci e pomodori in padella",
    ["mediterranea", "onnivora"], ["pesce", "completo", "saporita"],
    25, "beginner", 2,
    [
      ing("filetti di merluzzo", 320, "g", "Proteine"),
      ing("ceci in lattina", 240, "g", "Proteine"),
      ing("pomodori pelati in lattina", 200, "g", "Dispensa"),
      ing("aglio", 2, "spicchi", "Verdure"),
      ing("prezzemolo fresco", 1, "ciuffo", "Verdure"),
      ing("olio extravergine", 3, "cucchiai", "Dispensa"),
    ],
    [
      "Scalda l'olio in una padella capiente a fuoco medio. Aggiungi l'aglio e fallo dorare 1 minuto. Versa i pomodori pelati schiacciandoli con le mani, aggiungi i ceci scolati. Cuoci 8 minuti a fuoco medio.",
      "Asciuga il merluzzo con carta da cucina. Aggiusta di sale il sugo, poi adagia i filetti nel sugo di ceci e pomodori.",
      "Copri con un coperchio e cuoci a fuoco medio-basso per 10-12 minuti, finché il merluzzo è bianco e si sfoglia facilmente. Non mescolare per non rompere i filetti. Finisci con abbondante prezzemolo tritato.",
    ]
  ),

  r("pasta-salmone-limone", "Pasta con salmone affumicato, panna leggera e limone",
    ["mediterranea", "onnivora"], ["veloce", "cremosa", "pesce"],
    18, "beginner", 2,
    [
      ing("pasta (farfalle o penne)", 180, "g", "Cereali"),
      ing("salmone affumicato", 120, "g", "Proteine"),
      ing("panna fresca", 100, "ml", "Latticini"),
      ing("limone (scorza e succo)", 1, "pz", "Verdure"),
      ing("erba cipollina o aneto", 1, "mazzetto", "Verdure"),
      ing("olio extravergine", 1, "cucchiaio", "Dispensa"),
    ],
    [
      "Cuoci la pasta in acqua salata.",
      "In una padella scalda l'olio a fuoco basso. Aggiungi la panna e la scorza grattugiata di mezzo limone. Scalda senza far bollire per 2-3 minuti.",
      "Scola la pasta al dente tenendo 2 cucchiai di acqua di cottura. Versa nella padella con la panna, mescola aggiungendo l'acqua di cottura se serve. Il condimento deve essere cremoso.",
      "Spegni il fuoco. Aggiungi il salmone affumicato tagliato a listarelle, un cucchiaio di succo di limone e l'erba cipollina tritata. Mescola delicatamente e servi subito.",
    ]
  ),

  // ── PRIMI ELABORATI ──────────────────────────────────────────────────────────

  r("gnocchi-pomodoro-basilico", "Gnocchi al pomodoro fresco e basilico",
    ["mediterranea", "vegetariana", "onnivora"], ["comfort", "classico", "economica"],
    25, "beginner", 2,
    [
      ing("gnocchi di patate freschi", 400, "g", "Cereali"),
      ing("pomodori San Marzano o pelati", 400, "g", "Dispensa"),
      ing("aglio", 2, "spicchi", "Verdure"),
      ing("basilico fresco", 8, "foglie", "Verdure"),
      ing("olio extravergine", 3, "cucchiai", "Dispensa"),
      ing("parmigiano grattugiato", 30, "g", "Latticini"),
    ],
    [
      "Scalda l'olio in una padella larga a fuoco medio. Aggiungi l'aglio schiacciato e fallo dorare 1 minuto. Versa i pomodori schiacciandoli con le mani. Cuoci a fuoco medio per 15 minuti finché il sugo si addensa. Aggiusta di sale.",
      "Porta a bollore abbondante acqua salata. Cuoci gli gnocchi: sono pronti quando salgono a galla (circa 2-3 minuti). Scolali con una schiumarola direttamente nella padella con il sugo.",
      "Salta gli gnocchi nel sugo per 1 minuto a fuoco vivo. Spegni, aggiungi basilico spezzettato e parmigiano. Servi subito — gli gnocchi non aspettano.",
    ]
  ),

  r("gnocchi-gorgonzola-noci", "Gnocchi al gorgonzola e noci",
    ["mediterranea", "vegetariana"], ["cremosa", "comfort", "autunnale"],
    20, "beginner", 2,
    [
      ing("gnocchi di patate freschi", 400, "g", "Cereali"),
      ing("gorgonzola dolce", 120, "g", "Latticini"),
      ing("panna fresca", 80, "ml", "Latticini"),
      ing("gherigli di noci", 40, "g", "Dispensa"),
      ing("burro", 15, "g", "Latticini"),
      ing("salvia fresca", 4, "foglie", "Verdure"),
    ],
    [
      "Tosta le noci in un padellino secco a fuoco medio per 2-3 minuti finché profumano. Tritale grossolanamente.",
      "In una padella larga scioglili il burro a fuoco basso con la salvia. Aggiungi il gorgonzola a pezzetti e la panna. Mescola con una spatola finché il formaggio si scioglie completamente formando una crema. Non alzare la fiamma o la panna si separa.",
      "Cuoci gli gnocchi in acqua salata bollente. Scola quando salgono a galla e versali nella crema di gorgonzola. Mescola delicatamente. Impiatta e distribuisci le noci tostate sopra.",
    ]
  ),

  r("risotto-parmigiano", "Risotto al parmigiano mantecato",
    ["mediterranea", "vegetariana", "onnivora"], ["comfort", "classico", "regionale"],
    30, "intermediate", 2,
    [
      ing("riso carnaroli", 180, "g", "Cereali"),
      ing("brodo vegetale caldo", 600, "ml", "Dispensa"),
      ing("cipolla dorata", 0.5, "pz", "Verdure"),
      ing("vino bianco secco", 80, "ml", "Dispensa"),
      ing("burro", 40, "g", "Latticini"),
      ing("parmigiano grattugiato", 60, "g", "Latticini"),
    ],
    [
      "Tieni il brodo caldo in un pentolino a fuoco basso — è fondamentale che sia caldo quando lo aggiungi al riso.",
      "In una casseruola larga scioglili 20g di burro a fuoco medio. Soffriggi la cipolla tritata finissima per 5 minuti senza farla colorare.",
      "Aggiungi il riso e tostalo per 2 minuti mescolando: i chicchi devono diventare traslucidi ai bordi. Sfuma con il vino bianco e lascia evaporare completamente.",
      "Aggiungi il brodo caldo un mestolo alla volta, mescolando continuamente e aspettando che venga assorbito prima di aggiungerne altro. Il processo dura 17-18 minuti. Il riso deve essere all'onda: cremoso e fluido.",
      "Spegni il fuoco. Manteca con il burro rimasto freddo e il parmigiano, mescolando energicamente per 1-2 minuti. Copri e lascia riposare 1 minuto. Servi subito.",
    ]
  ),

  r("risotto-funghi-porcini", "Risotto ai funghi porcini",
    ["mediterranea", "vegetariana", "onnivora"], ["autunnale", "comfort", "regionale"],
    35, "intermediate", 2,
    [
      ing("riso carnaroli", 180, "g", "Cereali"),
      ing("funghi porcini secchi", 20, "g", "Dispensa"),
      ing("funghi champignon freschi", 200, "g", "Verdure"),
      ing("brodo vegetale caldo", 600, "ml", "Dispensa"),
      ing("cipolla dorata", 0.5, "pz", "Verdure"),
      ing("vino bianco secco", 80, "ml", "Dispensa"),
      ing("burro", 40, "g", "Latticini"),
      ing("parmigiano grattugiato", 40, "g", "Latticini"),
      ing("prezzemolo fresco", 4, "foglie", "Verdure"),
    ],
    [
      "Metti i porcini secchi in una ciotola con 200ml di acqua tiepida per 20 minuti. Scolali (tieni l'acqua di ammollo filtrata) e tritali grossolanamente.",
      "Aggiungi l'acqua di ammollo filtrata al brodo caldo. Pulisci i champignon e affettali spessi.",
      "Scalda metà del burro in una casseruola. Soffriggi la cipolla 5 minuti. Aggiungi i champignon a fuoco alto, senza mescolare per 2-3 minuti finché dorano. Aggiungi i porcini.",
      "Aggiungi il riso e tostalo 2 minuti. Sfuma con il vino. Poi aggiungi il brodo caldo un mestolo alla volta per 17-18 minuti. Manteca con burro freddo e parmigiano. Finisci con prezzemolo tritato.",
    ]
  ),

  r("risotto-zucca-speck", "Risotto alla zucca con speck croccante",
    ["mediterranea", "onnivora"], ["autunnale", "regionale", "comfort"],
    35, "intermediate", 2,
    [
      ing("riso carnaroli", 180, "g", "Cereali"),
      ing("zucca butternut", 350, "g", "Verdure"),
      ing("speck a fette", 80, "g", "Proteine"),
      ing("brodo vegetale caldo", 600, "ml", "Dispensa"),
      ing("cipolla dorata", 0.5, "pz", "Verdure"),
      ing("vino bianco", 60, "ml", "Dispensa"),
      ing("burro", 30, "g", "Latticini"),
      ing("parmigiano grattugiato", 40, "g", "Latticini"),
      ing("salvia fresca", 4, "foglie", "Verdure"),
    ],
    [
      "Taglia la zucca a cubetti di 2cm. In una padella scalda un filo d'olio e cuoci la zucca per 10 minuti finché morbida. Schiaccia metà con una forchetta per formare una cremina.",
      "In un padellino antiaderente senza grassi, cuoci le fette di speck a fuoco alto per 1-2 minuti per lato finché croccanti. Metti da parte e spezzetta.",
      "Prepara il risotto base: soffriggi cipolla in burro, tosta il riso, sfuma col vino. Aggiungi brodo a mestoli per 16 minuti. A metà cottura incorpora la zucca cremosa.",
      "Manteca con burro e parmigiano. Impiatta e distribuisci lo speck croccante e le foglie di salvia sopra.",
    ]
  ),

  r("pasta-carbonara", "Spaghetti alla carbonara",
    ["mediterranea", "onnivora"], ["classico", "romano", "regionale"],
    20, "intermediate", 2,
    [
      ing("spaghetti", 180, "g", "Cereali"),
      ing("guanciale", 120, "g", "Proteine"),
      ing("uova fresche", 3, "pz", "Proteine"),
      ing("pecorino romano grattugiato", 50, "g", "Latticini"),
      ing("pepe nero macinato fresco", 1, "cucchiaino", "Dispensa"),
    ],
    [
      "Taglia il guanciale a listarelle spesse. Cuocilo in una padella fredda a fuoco medio-basso: il grasso deve sciogliersi lentamente. Dopo 8-10 minuti sarà dorato e croccante. Togli dal fuoco e lascia intiepidire. Tieni il grasso nella padella.",
      "In una ciotola sbatti i tuorli (e un albero intero) con il pecorino e una generosa macinata di pepe. Aggiungi 2-3 cucchiai di acqua di cottura della pasta fredda — l'acqua deve essere fredda per non cuocere le uova.",
      "Cuoci gli spaghetti in abbondante acqua salata. Scola al dente tenendo una tazza di acqua di cottura. Versa la pasta nella padella con il guanciale a fuoco spento.",
      "Aggiungi il composto di uova e mescola rapidamente. Se troppo denso aggiungi acqua di cottura calda a cucchiai. La carbonara è pronta quando la crema è fluida e avvolge la pasta — mai uova strapazzate. Servi con altro pecorino e pepe.",
    ]
  ),

  r("pasta-amatriciana", "Bucatini all'amatriciana",
    ["mediterranea", "onnivora"], ["classico", "romano", "regionale"],
    25, "beginner", 2,
    [
      ing("bucatini", 180, "g", "Cereali"),
      ing("guanciale", 120, "g", "Proteine"),
      ing("pomodori pelati", 300, "g", "Dispensa"),
      ing("pecorino romano grattugiato", 40, "g", "Latticini"),
      ing("vino bianco secco", 50, "ml", "Dispensa"),
      ing("peperoncino", 1, "pz", "Dispensa"),
    ],
    [
      "Taglia il guanciale a listarelle. Cuocilo in una padella larga a fuoco medio-basso per 8 minuti finché croccante. Sfuma con il vino bianco e lascia evaporare. Aggiungi il peperoncino.",
      "Aggiungi i pomodori pelati schiacciandoli con le mani. Cuoci a fuoco medio per 15 minuti finché il sugo si addensa. Aggiusta di sale (il guanciale è già sapido).",
      "Cuoci i bucatini in abbondante acqua salata. Scola al dente tenendo acqua di cottura. Versa nella padella con il sugo, salta 1 minuto aggiungendo acqua se serve. Spegni e manteca con il pecorino.",
    ]
  ),

  r("pasta-cacio-pepe", "Spaghetti cacio e pepe",
    ["mediterranea", "vegetariana", "onnivora"], ["classico", "romano", "regionale", "veloce"],
    18, "intermediate", 2,
    [
      ing("spaghetti o tonnarelli", 180, "g", "Cereali"),
      ing("pecorino romano grattugiato", 80, "g", "Latticini"),
      ing("parmigiano grattugiato", 20, "g", "Latticini"),
      ing("pepe nero in grani", 1, "cucchiaino", "Dispensa"),
    ],
    [
      "Tosta i grani di pepe in una padella larga a secco per 1 minuto finché profumano. Pestali grossolanamente nel mortaio (o con il fondo di un bicchiere). Non devono essere polvere — i pezzi irregolari danno più carattere.",
      "Scalda la padella con il pepe pestato e 2 mestoli di acqua di cottura della pasta bollente. Il pepe sfrigola e profuma — questo è il fondo della salsa.",
      "Cuoci gli spaghetti in acqua salata (meno sale del solito — il pecorino è molto sapido). In una ciotola mescola pecorino e parmigiano con qualche cucchiaio di acqua fredda formando una pasta densa.",
      "Scola la pasta al dente, versala nella padella col pepe a fuoco spento. Aggiungi la crema di formaggi e mescola energicamente aggiungendo acqua di cottura a cucchiai finché la crema è fluida e avvolge la pasta. La temperatura non deve essere troppo alta o il formaggio si agglomera.",
    ]
  ),

  r("gnocchi-burro-salvia", "Gnocchi burro e salvia con parmigiano",
    ["mediterranea", "vegetariana"], ["classico", "veloce", "regionale"],
    15, "beginner", 2,
    [
      ing("gnocchi di patate freschi", 400, "g", "Cereali"),
      ing("burro", 60, "g", "Latticini"),
      ing("salvia fresca", 8, "foglie", "Verdure"),
      ing("parmigiano grattugiato", 40, "g", "Latticini"),
    ],
    [
      "Cuoci gli gnocchi in abbondante acqua salata bollente. Quando salgono a galla aspetta ancora 30 secondi poi scolali con la schiumarola.",
      "Nel frattempo scalda il burro in una padella larga a fuoco medio. Aggiungi le foglie di salvia intere. Il burro deve schiumare e diventare leggermente nocciola — profumo di biscotto. Attenzione: non bruciarlo.",
      "Versa gli gnocchi nel burro alla salvia. Salta delicatamente per 1 minuto. Impiatta e copri con parmigiano abbondante.",
    ]
  ),

  // ── SECONDI ELABORATI ────────────────────────────────────────────────────────

  r("pollo-arrosto-erbe", "Pollo arrosto alle erbe con aglio e limone",
    ["mediterranea", "onnivora"], ["domenica", "speciale", "regionale"],
    55, "beginner", 4,
    [
      ing("pollo intero o cosce e sovracosce", 1200, "g", "Proteine"),
      ing("aglio", 4, "spicchi", "Verdure"),
      ing("rosmarino fresco", 2, "rametti", "Verdure"),
      ing("timo fresco", 4, "rametti", "Verdure"),
      ing("limone", 2, "pz", "Verdure"),
      ing("olio extravergine", 4, "cucchiai", "Dispensa"),
      ing("vino bianco secco", 100, "ml", "Dispensa"),
    ],
    [
      "Preriscalda il forno a 200°C. Prepara la marinata: in una ciotola mescola olio, aglio tritato, rosmarino e timo sminuzzati, scorza e succo di un limone, sale e pepe.",
      "Massaggia il pollo con la marinata su tutta la superficie, anche sotto la pelle del petto. Inserisci il limone rimanente tagliato a metà dentro la cavità.",
      "Metti il pollo in una teglia. Versa il vino bianco sul fondo. Inforna per 45-55 minuti (dipende dal peso). Ogni 15 minuti irrora con i succhi della teglia.",
      "Il pollo è pronto quando la pelle è dorata e croccante e, incidendo la coscia, il liquido è trasparente. Lascia riposare 5-10 minuti prima di tagliare — i succhi si redistribuiscono.",
    ]
  ),

  r("vitello-tonato", "Vitello tonnato",
    ["mediterranea", "onnivora"], ["freddo", "estivo", "regionale", "piemontese"],
    35, "intermediate", 4,
    [
      ing("fesa di vitello", 600, "g", "Proteine"),
      ing("tonno sott'olio di qualità", 160, "g", "Proteine"),
      ing("capperi sotto sale", 2, "cucchiai", "Dispensa"),
      ing("acciughe sott'olio", 3, "pz", "Proteine"),
      ing("maionese", 150, "g", "Dispensa"),
      ing("limone", 1, "pz", "Verdure"),
      ing("sedano", 1, "gambo", "Verdure"),
      ing("carote", 1, "pz", "Verdure"),
    ],
    [
      "Cuoci la fesa di vitello: mettila in una pentola con acqua fredda, sedano, carota, sale. Porta a bollore, abbassa e cuoci a fuoco basso per 25-30 minuti. Lascia raffreddare nel brodo.",
      "Prepara la salsa tonnata: frulla nel mixer tonno sgocciolato, acciughe, capperi sciacquati, succo di limone e maionese finché è una crema liscia. Aggiusta di sale e consistenza (aggiungi brodo se troppo densa).",
      "Affetta la carne fredda molto sottile (2-3mm). Disponi le fette in un piatto da portata, copri generosamente con la salsa. Decora con capperi interi. Lascia riposare in frigo almeno 30 minuti prima di servire.",
    ]
  ),

  r("brasato-al-vino", "Brasato di manzo al vino rosso",
    ["mediterranea", "onnivora"], ["domenica", "speciale", "regionale", "invernale"],
    90, "intermediate", 4,
    [
      ing("manzo da brasato (cappello del prete)", 800, "g", "Proteine"),
      ing("vino rosso corposo", 400, "ml", "Dispensa"),
      ing("carote", 2, "pz", "Verdure"),
      ing("cipolla", 1, "pz", "Verdure"),
      ing("sedano", 2, "gambi", "Verdure"),
      ing("aglio", 2, "spicchi", "Verdure"),
      ing("rosmarino fresco", 1, "rametto", "Verdure"),
      ing("brodo di carne o vegetale", 300, "ml", "Dispensa"),
      ing("olio extravergine", 3, "cucchiai", "Dispensa"),
    ],
    [
      "Sala e pepa la carne su tutti i lati. Scalda l'olio in una casseruola larga a fuoco alto. Rosola la carne 4-5 minuti per lato finché è ben dorata su tutta la superficie — questa fase è fondamentale per il sapore.",
      "Togli la carne. Nel fondo rosolato soffriggi carote, cipolla, sedano e aglio tagliati a pezzi per 5 minuti. Rimetti la carne.",
      "Versa il vino rosso e lascia evaporare l'alcool per 3 minuti a fuoco alto. Aggiungi il brodo e il rosmarino. Il liquido deve arrivare a metà della carne.",
      "Abbassa la fiamma al minimo, copri e cuoci per 75-80 minuti, girando la carne ogni 20 minuti. La carne è pronta quando è tenerissima e si sfalda con una forchetta.",
      "Togli la carne e frulla il fondo di cottura per ottenere una salsa densa. Affetta la carne e servi con la salsa. Ottimo con polenta o purè.",
    ]
  ),

  r("scaloppine-limone", "Scaloppine di vitello al limone con capperi",
    ["mediterranea", "onnivora"], ["veloce", "classico", "regionale"],
    18, "beginner", 2,
    [
      ing("fettine di vitello sottili", 320, "g", "Proteine"),
      ing("farina 00", 3, "cucchiai", "Dispensa"),
      ing("limone", 2, "pz", "Verdure"),
      ing("capperi sotto sale", 1, "cucchiaio", "Dispensa"),
      ing("burro", 30, "g", "Latticini"),
      ing("prezzemolo fresco", 4, "foglie", "Verdure"),
      ing("olio extravergine", 1, "cucchiaio", "Dispensa"),
    ],
    [
      "Batti le fettine di vitello con il batticarne fino a 5mm di spessore uniforme. Infarinale su entrambi i lati eliminando l'eccesso.",
      "Scalda olio e burro in una padella a fuoco medio-alto. Cuoci le scaloppine 1-2 minuti per lato finché dorate. Non sovraffollare la padella — cuoci in due riprese se necessario. Toglile e tienile al caldo.",
      "Nella stessa padella a fuoco basso aggiungi il succo di 2 limoni e i capperi sciacquati. Raschia il fondo con un cucchiaio. Cuoci 1 minuto finché la salsa si addensa leggermente. Rimetti le scaloppine per 30 secondi. Finisci con prezzemolo tritato.",
    ]
  ),

  r("ossobuco-gremolata", "Ossobuco alla milanese con gremolata",
    ["mediterranea", "onnivora"], ["domenica", "speciale", "regionale", "milanese"],
    75, "intermediate", 4,
    [
      ing("ossobuco di vitello", 4, "pz", "Proteine"),
      ing("cipolla", 1, "pz", "Verdure"),
      ing("carote", 1, "pz", "Verdure"),
      ing("sedano", 1, "gambo", "Verdure"),
      ing("vino bianco secco", 150, "ml", "Dispensa"),
      ing("brodo di carne o vegetale", 300, "ml", "Dispensa"),
      ing("pomodori pelati", 200, "g", "Dispensa"),
      ing("limone", 1, "pz", "Verdure"),
      ing("prezzemolo fresco", 4, "foglie", "Verdure"),
      ing("aglio", 1, "spicchio", "Verdure"),
      ing("farina 00", 2, "cucchiai", "Dispensa"),
      ing("burro", 30, "g", "Latticini"),
    ],
    [
      "Incidi il bordo esterno di ogni ossobuco con 3-4 tagli per evitare che si arricci in cottura. Infarinali su entrambi i lati.",
      "Scalda burro e un filo d'olio in una casseruola larga. Rosola gli ossibuchi 4-5 minuti per lato a fuoco alto. Toglili.",
      "Nella stessa casseruola soffriggi cipolla, carota e sedano tritati per 5 minuti. Rimetti la carne, sfuma col vino e lascia evaporare. Aggiungi i pelati e il brodo. Copri e cuoci a fuoco basso per 60 minuti, girando ogni 20 minuti.",
      "Prepara la gremolata: trita finissimamente prezzemolo, aglio e scorza di limone. Distribuiscila sulla carne negli ultimi 5 minuti di cottura. Servi con risotto allo zafferano o polenta.",
    ]
  ),

  r("pesce-cartoccio", "Branzino al cartoccio con pomodorini e olive",
    ["mediterranea", "onnivora"], ["pesce", "light", "saporita"],
    30, "beginner", 2,
    [
      ing("branzino intero o filetti", 500, "g", "Proteine"),
      ing("pomodori ciliegia", 150, "g", "Verdure"),
      ing("olive nere denocciolate", 50, "g", "Dispensa"),
      ing("capperi sotto sale", 1, "cucchiaio", "Dispensa"),
      ing("aglio", 2, "spicchi", "Verdure"),
      ing("prezzemolo fresco", 4, "foglie", "Verdure"),
      ing("olio extravergine", 3, "cucchiai", "Dispensa"),
      ing("vino bianco secco", 50, "ml", "Dispensa"),
    ],
    [
      "Preriscalda il forno a 200°C. Prepara il cartoccio: stendi un foglio grande di carta forno (o alluminio). Sciacqua i capperi.",
      "Al centro del foglio disponi il pesce. Attorno metti i pomodorini tagliati a metà, olive, capperi e aglio affettato. Condisci con olio, vino bianco, sale, pepe e prezzemolo.",
      "Chiudi il cartoccio sigillando bene i bordi — deve essere ermetico per trattenere il vapore. Metti su una teglia e inforna per 20-22 minuti (18 se sono filetti). Il cartoccio si gonfia: aprilo al tavolo davanti ai commensali per l'effetto scenico.",
    ]
  ),

  r("salmone-crosta-pistacchi", "Salmone in crosta di pistacchi con insalata",
    ["mediterranea", "onnivora"], ["pesce", "elegante", "veloce"],
    22, "beginner", 2,
    [
      ing("filetti di salmone", 320, "g", "Proteine"),
      ing("pistacchi non salati sgusciati", 60, "g", "Dispensa"),
      ing("senape di Digione", 2, "cucchiai", "Dispensa"),
      ing("limone", 1, "pz", "Verdure"),
      ing("rucola", 60, "g", "Verdure"),
      ing("pomodori ciliegia", 100, "g", "Verdure"),
      ing("olio extravergine", 2, "cucchiai", "Dispensa"),
    ],
    [
      "Trita i pistacchi grossolanamente — devono formare una granella irregolare, non una polvere.",
      "Spalma un cucchiaio di senape sulla superficie di ogni filetto di salmone. Premi la granella di pistacchi sopra formando una crosta uniforme.",
      "Scalda 1 cucchiaio di olio in una padella ovenproof a fuoco medio-alto. Cuoci il salmone con la crosta verso il basso per 3 minuti. Gira e cuoci altri 3-4 minuti. L'interno deve restare rosa.",
      "Prepara l'insalata con rucola e pomodorini conditi con olio e limone. Servi il salmone affiancato all'insalata con spicchi di limone.",
    ]
  ),

  r("polpette-verdure-forno", "Polpette di verdure al forno con salsa yogurt",
    ["mediterranea", "vegetariana"], ["economica", "forno", "light"],
    35, "beginner", 2,
    [
      ing("zucchine", 2, "pz", "Verdure"),
      ing("carote", 2, "pz", "Verdure"),
      ing("ceci in lattina", 240, "g", "Proteine"),
      ing("pangrattato", 60, "g", "Dispensa"),
      ing("parmigiano grattugiato", 30, "g", "Latticini"),
      ing("uova fresche", 1, "pz", "Proteine"),
      ing("aglio", 1, "spicchio", "Verdure"),
      ing("cumino in polvere", 1, "cucchiaino", "Dispensa"),
      ing("yogurt greco", 100, "g", "Latticini"),
      ing("limone", 0.5, "pz", "Verdure"),
    ],
    [
      "Grattugia le zucchine e le carote. Strizzale bene con le mani per eliminare l'acqua in eccesso — è fondamentale, altrimenti le polpette non reggono.",
      "Schiaccia i ceci con una forchetta grossolanamente. In una ciotola mescola ceci, zucchine, carote, pangrattato, parmigiano, uovo, aglio tritato, cumino, sale e pepe. Impasta con le mani. Se troppo morbido aggiungi pangrattato.",
      "Preriscalda il forno a 200°C. Forma palline della grandezza di una noce e disponile su una teglia con carta forno. Spennella con olio. Inforna per 22-25 minuti, girando a metà, finché dorate.",
      "Prepara la salsa: mescola yogurt greco con succo di limone, sale e un filo d'olio. Servi le polpette calde con la salsa a parte.",
    ]
  ),

  // ── ZUPPE E MINESTRE ─────────────────────────────────────────────────────────

  r("ribollita", "Ribollita toscana con cavolo nero",
    ["mediterranea", "vegetariana", "vegana"], ["invernale", "comfort", "regionale", "economica"],
    45, "beginner", 4,
    [
      ing("fagioli cannellini in lattina", 480, "g", "Proteine"),
      ing("cavolo nero", 300, "g", "Verdure"),
      ing("patate", 2, "pz", "Verdure"),
      ing("carote", 2, "pz", "Verdure"),
      ing("cipolla", 1, "pz", "Verdure"),
      ing("sedano", 2, "gambi", "Verdure"),
      ing("pomodori pelati", 200, "g", "Dispensa"),
      ing("pane di campagna raffermo", 4, "fette", "Cereali"),
      ing("aglio", 2, "spicchi", "Verdure"),
      ing("olio extravergine", 4, "cucchiai", "Dispensa"),
    ],
    [
      "In una pentola capiente scalda l'olio a fuoco medio. Prepara il soffritto: cipolla, carote, sedano a cubetti piccoli. Cuoci 7-8 minuti finché morbidi. Aggiungi aglio e cuoci 1 minuto.",
      "Aggiungi i pomodori pelati schiacciati, le patate a cubetti e il cavolo nero tagliato a striscioline (togli le costole dure). Mescola.",
      "Aggiungi i fagioli (metà interi, metà schiacciati con una forchetta per addensare) e 1 litro di acqua. Porta a bollore, poi cuoci a fuoco basso per 30 minuti. Aggiusta di sale.",
      "Togli dal fuoco. Adagia le fette di pane raffermo sopra la minestra. Lascia riposare 5 minuti: il pane assorbe il brodo e si ammorbidisce. Servi con un generoso filo d'olio crudo. È ancora più buona riscaldata il giorno dopo — da qui 'ribollita'.",
    ]
  ),

  r("pasta-fagioli", "Pasta e fagioli napoletana",
    ["mediterranea", "onnivora"], ["invernale", "comfort", "regionale", "economica"],
    35, "beginner", 4,
    [
      ing("fagioli borlotti in lattina", 480, "g", "Proteine"),
      ing("pasta mista piccola o ditaloni", 160, "g", "Cereali"),
      ing("pomodori pelati", 200, "g", "Dispensa"),
      ing("cipolla dorata", 0.5, "pz", "Verdure"),
      ing("aglio", 2, "spicchi", "Verdure"),
      ing("rosmarino fresco", 1, "rametto", "Verdure"),
      ing("olio extravergine", 4, "cucchiai", "Dispensa"),
    ],
    [
      "Scalda 3 cucchiai di olio a fuoco medio. Soffriggi cipolla e aglio tritati per 5 minuti. Aggiungi il rosmarino e i pomodori pelati schiacciati. Cuoci 5 minuti.",
      "Aggiungi i fagioli scolati. Schiaccia metà dei fagioli direttamente nella pentola con il dorso di un cucchiaio per rendere la minestra cremosa. Copri con 800ml di acqua. Cuoci 10 minuti.",
      "Aggiungi la pasta direttamente nella minestra. Cuoci mescolando spesso (la pasta assorbe il liquido): aggiungi acqua calda se si asciuga troppo. La consistenza deve essere cremosa, né troppo densa né troppo brodosa. Finisci con olio extravergine crudo.",
    ]
  ),

  r("zuppa-cipolla", "Zuppa di cipolle gratinata",
    ["mediterranea", "vegetariana"], ["invernale", "comfort", "francese"],
    40, "beginner", 2,
    [
      ing("cipolle dorate grandi", 4, "pz", "Verdure"),
      ing("brodo vegetale caldo", 800, "ml", "Dispensa"),
      ing("vino bianco secco", 100, "ml", "Dispensa"),
      ing("pane di campagna", 4, "fette", "Cereali"),
      ing("gruyère o emmenthal grattugiato", 100, "g", "Latticini"),
      ing("burro", 30, "g", "Latticini"),
      ing("timo fresco", 3, "rametti", "Verdure"),
    ],
    [
      "Affetta le cipolle a mezze lune sottili. In una pentola larga scalda il burro a fuoco medio-basso. Aggiungi le cipolle con un pizzico di sale. Cuoci mescolando ogni 5 minuti per 25-30 minuti: devono caramellare lentamente diventando dorate e dolci. È il passaggio chiave — la pazienza fa la differenza.",
      "Sfuma col vino bianco e lascia evaporare. Aggiungi il brodo caldo e il timo. Cuoci altri 10 minuti. Aggiusta di sale.",
      "Preriscalda il grill del forno a 220°C. Distribuisci la zuppa in ciotole da forno. Adagia una fetta di pane su ogni ciotola e copri generosamente con il formaggio grattugiato. Inforna sotto il grill per 3-5 minuti finché il formaggio è fuso e dorato. Servi subito con cautela — le ciotole sono bollenti.",
    ]
  ),

  r("minestrone-estivo", "Minestrone estivo con pesto",
    ["mediterranea", "vegetariana", "vegana"], ["estivo", "light", "veloce"],
    28, "beginner", 4,
    [
      ing("zucchine", 2, "pz", "Verdure"),
      ing("fagiolini", 150, "g", "Verdure"),
      ing("pomodori maturi", 2, "pz", "Verdure"),
      ing("patate", 2, "pz", "Verdure"),
      ing("cipolla", 0.5, "pz", "Verdure"),
      ing("pasta corta o riso", 100, "g", "Cereali"),
      ing("pesto al basilico", 3, "cucchiai", "Dispensa"),
      ing("olio extravergine", 2, "cucchiai", "Dispensa"),
    ],
    [
      "Taglia tutte le verdure a cubetti piccoli (1cm). In una pentola scalda l'olio, soffriggi la cipolla 3 minuti. Aggiungi patate e fagiolini, copri con 1.2 litri di acqua salata. Porta a bollore.",
      "Dopo 10 minuti aggiungi zucchine, pomodori e la pasta. Cuoci altri 10 minuti. Il minestrone deve essere denso ma non asciutto.",
      "Fuori dal fuoco aggiungi il pesto e mescola. Non cuocere il pesto o perde il colore brillante e il profumo. Servi con un filo d'olio crudo. Ottimo anche tiepido.",
    ]
  ),

  r("vellutata-zucca", "Vellutata di zucca con zenzero e panna",
    ["mediterranea", "vegetariana"], ["invernale", "comfort", "cremosa"],
    30, "beginner", 4,
    [
      ing("zucca butternut", 700, "g", "Verdure"),
      ing("cipolla dorata", 1, "pz", "Verdure"),
      ing("zenzero fresco", 3, "cm", "Dispensa"),
      ing("brodo vegetale", 600, "ml", "Dispensa"),
      ing("panna fresca", 80, "ml", "Latticini"),
      ing("olio extravergine", 2, "cucchiai", "Dispensa"),
      ing("semi di zucca tostati", 2, "cucchiai", "Dispensa"),
    ],
    [
      "Pela la zucca e tagliala a cubetti. Trita la cipolla. Scalda l'olio in una pentola a fuoco medio. Soffriggi la cipolla per 5 minuti. Aggiungi lo zenzero grattugiato e cuoci 1 minuto.",
      "Aggiungi la zucca e il brodo caldo. Porta a bollore, poi cuoci a fuoco medio per 15-18 minuti finché la zucca è morbida.",
      "Frulla con un frullatore a immersione fino a ottenere una crema liscia. Aggiungi la panna, aggiusta di sale. Riscalda a fuoco basso. Servi con semi di zucca tostati e un filo d'olio.",
    ]
  ),

  r("vellutata-piselli-menta", "Vellutata di piselli e menta",
    ["mediterranea", "vegetariana"], ["primaverile", "light", "veloce"],
    20, "beginner", 2,
    [
      ing("piselli surgelati", 400, "g", "Verdure"),
      ing("cipollotto", 2, "pz", "Verdure"),
      ing("brodo vegetale", 500, "ml", "Dispensa"),
      ing("menta fresca", 8, "foglie", "Verdure"),
      ing("yogurt greco", 80, "g", "Latticini"),
      ing("olio extravergine", 2, "cucchiai", "Dispensa"),
    ],
    [
      "Scalda l'olio in una pentola. Soffriggi il cipollotto affettato per 3 minuti. Aggiungi i piselli ancora surgelati e il brodo. Porta a bollore e cuoci 8 minuti.",
      "Aggiungi metà delle foglie di menta. Frulla tutto fino a crema liscia. Aggiusta di sale.",
      "Servi con una cucchiaiata di yogurt greco al centro, le foglie di menta rimaste e un filo d'olio. Ottima sia calda che fredda.",
    ]
  ),

  r("zuppa-pomodoro-pane", "Pappa al pomodoro toscana",
    ["mediterranea", "vegetariana", "vegana"], ["regionale", "economica", "comfort"],
    30, "beginner", 4,
    [
      ing("pomodori maturi o pelati", 600, "g", "Verdure"),
      ing("pane di campagna raffermo", 250, "g", "Cereali"),
      ing("aglio", 3, "spicchi", "Verdure"),
      ing("basilico fresco", 8, "foglie", "Verdure"),
      ing("brodo vegetale", 400, "ml", "Dispensa"),
      ing("olio extravergine", 5, "cucchiai", "Dispensa"),
    ],
    [
      "Scalda 3 cucchiai di olio in una pentola a fuoco medio. Aggiungi l'aglio affettato e fallo dorare 2 minuti. Aggiungi i pomodori schiacciati con le mani. Cuoci 15 minuti a fuoco medio.",
      "Aggiungi il pane tagliato a pezzi irregolari e il brodo caldo. Mescola bene: il pane deve assorbire tutto il liquido e disfarsi completamente.",
      "Cuoci altri 5 minuti mescolando. La consistenza deve essere densa come una pappa. Spegni, aggiungi basilico abbondante e 2 cucchiai di olio crudo. Servi tiepida o a temperatura ambiente.",
    ]
  ),

  r("minestra-farro-legumi", "Minestra di farro e legumi misti",
    ["mediterranea", "vegetariana", "vegana"], ["invernale", "nutriente", "economica"],
    35, "beginner", 4,
    [
      ing("farro perlato", 160, "g", "Cereali"),
      ing("lenticchie verdi o marroni", 120, "g", "Proteine"),
      ing("ceci in lattina", 240, "g", "Proteine"),
      ing("carote", 2, "pz", "Verdure"),
      ing("sedano", 2, "gambi", "Verdure"),
      ing("cipolla", 1, "pz", "Verdure"),
      ing("pomodori pelati", 200, "g", "Dispensa"),
      ing("rosmarino fresco", 1, "rametto", "Verdure"),
      ing("olio extravergine", 3, "cucchiai", "Dispensa"),
    ],
    [
      "Prepara il soffritto: cipolla, carote e sedano tritati in olio per 7 minuti a fuoco medio.",
      "Aggiungi i pomodori pelati schiacciati, le lenticchie, il farro e 1.2 litri di acqua. Il rosmarino. Porta a bollore, poi cuoci a fuoco basso per 25 minuti.",
      "Aggiungi i ceci scolati. Cuoci altri 5 minuti. La minestra deve essere densa. Aggiusta di sale, togli il rosmarino. Finisci con olio crudo.",
    ]
  ),

  // ── INSALATE E PIATTI FREDDI ─────────────────────────────────────────────────

  r("panzanella", "Panzanella toscana",
    ["mediterranea", "vegetariana", "vegana"], ["estivo", "freddo", "regionale", "economica"],
    15, "beginner", 2,
    [
      ing("pane di campagna raffermo", 200, "g", "Cereali"),
      ing("pomodori maturi grandi", 3, "pz", "Verdure"),
      ing("cetriolo", 1, "pz", "Verdure"),
      ing("cipolla rossa", 0.5, "pz", "Verdure"),
      ing("basilico fresco", 8, "foglie", "Verdure"),
      ing("aceto di vino rosso", 2, "cucchiai", "Dispensa"),
      ing("olio extravergine", 4, "cucchiai", "Dispensa"),
    ],
    [
      "Bagna il pane sotto l'acqua fredda per 1 minuto. Strizzalo bene con le mani fino a che è umido ma non inzuppato. Spezzettalo grossolanamente in una ciotola capiente.",
      "Taglia i pomodori a pezzi irregolari raccogliendo il succo. Il cetriolo a rondelle. La cipolla a mezze lune sottili — mettila in acqua fredda per 5 minuti per addolcirla.",
      "Unisci tutto nella ciotola con il pane. Condisci con aceto, olio abbondante, sale e pepe. Mescola bene. Aggiungi il basilico strappato a mano. Lascia riposare 15-20 minuti prima di servire: il pane assorbe i condimenti e diventa saporito.",
    ]
  ),

  r("insalata-nizzarda", "Insalata nizzarda con tonno e uova sode",
    ["mediterranea", "onnivora"], ["freddo", "completo", "estivo"],
    18, "beginner", 2,
    [
      ing("lattuga romana o misticanza", 100, "g", "Verdure"),
      ing("tonno sott'olio di qualità", 160, "g", "Proteine"),
      ing("uova fresche", 2, "pz", "Proteine"),
      ing("pomodori ciliegia", 150, "g", "Verdure"),
      ing("fagiolini", 120, "g", "Verdure"),
      ing("olive nere", 60, "g", "Dispensa"),
      ing("acciughe sott'olio", 4, "pz", "Proteine"),
      ing("olio extravergine", 3, "cucchiai", "Dispensa"),
      ing("aceto di vino bianco", 1, "cucchiaio", "Dispensa"),
    ],
    [
      "Lessa le uova: immergile in acqua fredda, porta a bollore e cuoci 8 minuti. Raffreddale in acqua ghiacciata, sgusciale e tagliale a spicchi. Sbollenta i fagiolini in acqua salata per 4 minuti, scolali e raffredali.",
      "Disponi la lattuga come base nel piatto. Aggiungi pomodorini tagliati a metà, fagiolini, uova a spicchi, tonno sbriciolato e olive.",
      "Prepara la vinaigrette: olio, aceto, sale e pepe. Versala sull'insalata. Disponi le acciughe sopra. Non mescolare — l'insalata nizzarda si compone senza mescolare.",
    ]
  ),

  r("insalata-riso-estiva", "Insalata di riso estiva colorata",
    ["mediterranea", "onnivora"], ["freddo", "estivo", "veloce", "meal prep"],
    25, "beginner", 4,
    [
      ing("riso basmati o parboiled", 300, "g", "Cereali"),
      ing("tonno sott'olio", 160, "g", "Proteine"),
      ing("mais in lattina", 120, "g", "Dispensa"),
      ing("wurstel o prosciutto cotto", 100, "g", "Proteine"),
      ing("cetriolini sott'aceto", 60, "g", "Dispensa"),
      ing("peperoni", 1, "pz", "Verdure"),
      ing("olive verdi denocciolate", 60, "g", "Dispensa"),
      ing("olio extravergine", 3, "cucchiai", "Dispensa"),
      ing("aceto di vino bianco", 1, "cucchiaio", "Dispensa"),
    ],
    [
      "Cuoci il riso in abbondante acqua salata. Scola al dente e passa sotto acqua fredda per fermarne la cottura. Lascia asciugare in un colino.",
      "Taglia a cubettini peperoni, wurstel e cetriolini. Scola mais, olive e tonno.",
      "In una ciotola grande unisci riso e tutti gli ingredienti. Condisci con olio, aceto, sale e pepe. Mescola bene. Lascia riposare in frigo almeno 30 minuti prima di servire — il riso assorbe i condimenti.",
    ]
  ),

  r("caprese-classica", "Caprese classica con mozzarella di bufala",
    ["mediterranea", "vegetariana"], ["estivo", "freddo", "veloce", "regionale"],
    10, "beginner", 2,
    [
      ing("mozzarella di bufala", 250, "g", "Latticini"),
      ing("pomodori cuore di bue o ramati", 3, "pz", "Verdure"),
      ing("basilico fresco", 8, "foglie", "Verdure"),
      ing("olio extravergine di qualità", 3, "cucchiai", "Dispensa"),
    ],
    [
      "Tira fuori la mozzarella dal frigo 20 minuti prima — a temperatura ambiente è più buona. Affetta i pomodori a rondelle spesse 7-8mm.",
      "Disponi nel piatto alternando fette di pomodoro e di mozzarella, leggermente sovrapposte. Inserisci le foglie di basilico tra le fette.",
      "Condisci con olio extravergine di qualità (è il protagonista insieme alla mozzarella), sale marino e pepe. Nient'altro. La semplicità è la sua forza.",
    ]
  ),

  r("insalata-polpo-patate", "Insalata di polpo e patate",
    ["mediterranea", "onnivora"], ["freddo", "estivo", "pesce", "regionale"],
    45, "intermediate", 4,
    [
      ing("polpo fresco o surgelato", 800, "g", "Proteine"),
      ing("patate a pasta gialla", 400, "g", "Verdure"),
      ing("sedano", 2, "gambi", "Verdure"),
      ing("olive nere", 60, "g", "Dispensa"),
      ing("prezzemolo fresco", 4, "foglie", "Verdure"),
      ing("olio extravergine", 5, "cucchiai", "Dispensa"),
      ing("limone", 1, "pz", "Verdure"),
      ing("aglio", 1, "spicchio", "Verdure"),
    ],
    [
      "Cuoci il polpo: immergilo in acqua bollente non salata con un coperchio. Cuoci a fuoco medio per 35-40 minuti (il polpo è pronto quando si infilza facilmente con uno stecchino). Lascialo raffreddare nell'acqua di cottura.",
      "Nel frattempo lessai le patate con la buccia in acqua salata per 20 minuti. Sbucciale ancora calde e tagliale a cubetti.",
      "Taglia il polpo a pezzi di 2-3cm. In una ciotola unisci polpo, patate, sedano a fettine, olive. Prepara il condimento: olio, succo di limone, aglio tritato finissimo, prezzemolo, sale e pepe. Versa sull'insalata e mescola. Lascia riposare 20 minuti prima di servire.",
    ]
  ),

  r("tabule-libanese", "Tabbouleh libanese con bulgur e pomodori",
    ["mediterranea", "vegetariana", "vegana"], ["freddo", "estivo", "mediorientale", "veloce"],
    18, "beginner", 2,
    [
      ing("bulgur fine", 120, "g", "Cereali"),
      ing("prezzemolo fresco", 1, "ciuffo", "Verdure"),
      ing("menta fresca", 8, "foglie", "Verdure"),
      ing("pomodori maturi", 2, "pz", "Verdure"),
      ing("cipollotto", 2, "pz", "Verdure"),
      ing("limone", 2, "pz", "Verdure"),
      ing("olio extravergine", 3, "cucchiai", "Dispensa"),
    ],
    [
      "Reidrata il bulgur: mettilo in una ciotola, copri con acqua bollente salata (il doppio del volume), copri e lascia riposare 10 minuti. Sgrana con una forchetta e lascia intiepidire.",
      "Trita finissimamente il prezzemolo e la menta (la lama del coltello deve essere affilata per non ossidare le erbe). Taglia i pomodori a cubettini piccoli raccogliendo il succo. Affetta il cipollotto sottile.",
      "In una ciotola unisci bulgur, prezzemolo, menta, pomodori e cipollotto. Condisci abbondantemente con succo di limone e olio. Il tabbouleh deve essere profumato e acidulo. Aggiusta di sale. Servilo fresco.",
    ]
  ),

  // ── PIATTI DA FORNO ──────────────────────────────────────────────────────────

  r("timballo-pasta-forno", "Pasta al forno con ragù e besciamella",
    ["mediterranea", "onnivora"], ["domenica", "speciale", "forno", "regionale"],
    60, "intermediate", 6,
    [
      ing("pasta corta (rigatoni o penne)", 400, "g", "Cereali"),
      ing("carne macinata mista (manzo e maiale)", 300, "g", "Proteine"),
      ing("passata di pomodoro", 400, "g", "Dispensa"),
      ing("cipolla dorata", 1, "pz", "Verdure"),
      ing("latte intero", 500, "ml", "Latticini"),
      ing("farina 00", 40, "g", "Dispensa"),
      ing("burro", 50, "g", "Latticini"),
      ing("mozzarella fiordilatte", 200, "g", "Latticini"),
      ing("parmigiano grattugiato", 80, "g", "Latticini"),
      ing("olio extravergine", 2, "cucchiai", "Dispensa"),
    ],
    [
      "Prepara il ragù: soffriggi cipolla in olio per 5 minuti. Aggiungi la carne macinata e rosola sgranandola per 8 minuti. Aggiungi la passata, sala e cuoci 20 minuti a fuoco basso.",
      "Prepara la besciamella: sciogli il burro, aggiungi la farina e cuoci il roux 2 minuti. Versa il latte caldo a filo mescolando con la frusta. Cuoci 7 minuti finché si addensa. Sala e aggiungi noce moscata.",
      "Cuoci la pasta in acqua salata per metà del tempo indicato — deve essere molto al dente. Scola.",
      "Preriscalda il forno a 180°C. In una pirofila alterna: strato di pasta, ragù, besciamella, mozzarella a pezzi, parmigiano. Ripeti per 3-4 strati. Termina con besciamella e parmigiano abbondante.",
      "Copri con alluminio e inforna 25 minuti. Scopri e cuoci altri 15 minuti finché la superficie è dorata e gratinata. Lascia riposare 10 minuti prima di servire.",
    ]
  ),

  r("melanzane-parmigiana-forno", "Parmigiana di melanzane classica",
    ["mediterranea", "vegetariana"], ["domenica", "speciale", "forno", "regionale", "napoletana"],
    50, "intermediate", 4,
    [
      ing("melanzane grandi", 3, "pz", "Verdure"),
      ing("passata di pomodoro", 500, "g", "Dispensa"),
      ing("mozzarella fiordilatte", 350, "g", "Latticini"),
      ing("parmigiano grattugiato", 80, "g", "Latticini"),
      ing("basilico fresco", 8, "foglie", "Verdure"),
      ing("aglio", 1, "spicchio", "Verdure"),
      ing("olio extravergine", 6, "cucchiai", "Dispensa"),
    ],
    [
      "Taglia le melanzane a fette di 7mm nel senso della lunghezza. Disponile su teglie con carta forno, spennella entrambi i lati con olio. Inforna a 220°C per 18-20 minuti girando a metà. Devono essere dorate e morbide.",
      "Prepara il sugo: scalda 2 cucchiai di olio con l'aglio. Aggiungi la passata e cuoci 12 minuti. Sala e aggiungi basilico.",
      "Taglia la mozzarella a fette spesse e tampona con carta da cucina per 10 minuti — l'acqua in eccesso rende la parmigiana acquosa.",
      "Preriscalda il forno a 180°C. In una pirofila alterna: sugo, melanzane, mozzarella, parmigiano, basilico. Ripeti per 3-4 strati. Termina con sugo e parmigiano.",
      "Inforna per 30-35 minuti finché la superficie è dorata. Lascia riposare 15 minuti. È ancora più buona il giorno dopo.",
    ]
  ),

  r("teglia-verdure-forno", "Teglia di verdure miste arrostite al forno",
    ["mediterranea", "vegetariana", "vegana"], ["forno", "light", "veloce", "economica"],
    35, "beginner", 2,
    [
      ing("zucchine", 2, "pz", "Verdure"),
      ing("melanzane", 1, "pz", "Verdure"),
      ing("peperoni misti", 2, "pz", "Verdure"),
      ing("pomodori ciliegia", 200, "g", "Verdure"),
      ing("cipolla rossa", 1, "pz", "Verdure"),
      ing("aglio", 3, "spicchi", "Verdure"),
      ing("timo fresco", 3, "rametti", "Verdure"),
      ing("olio extravergine", 4, "cucchiai", "Dispensa"),
    ],
    [
      "Preriscalda il forno a 210°C. Taglia tutte le verdure a pezzi irregolari di 3-4cm — non troppo piccoli o si bruciano.",
      "Distribuisci le verdure su una teglia grande in un unico strato (non sovrapporle). Condisci con olio abbondante, aglio schiacciato, timo, sale e pepe. Mescola con le mani.",
      "Inforna per 25-30 minuti, mescolando a metà cottura. Le verdure devono essere morbide dentro e leggermente caramellate ai bordi. Servi come contorno o accompagnate da pane rustico.",
    ]
  ),

  r("frittata-forno-patate-cipolle", "Frittata di patate e cipolle caramellate al forno",
    ["mediterranea", "vegetariana"], ["forno", "comfort", "economica"],
    35, "beginner", 4,
    [
      ing("uova fresche", 6, "pz", "Proteine"),
      ing("patate", 400, "g", "Verdure"),
      ing("cipolle dorate", 2, "pz", "Verdure"),
      ing("parmigiano grattugiato", 40, "g", "Latticini"),
      ing("rosmarino fresco", 1, "rametto", "Verdure"),
      ing("olio extravergine", 3, "cucchiai", "Dispensa"),
    ],
    [
      "Preriscalda il forno a 180°C. Affetta le patate sottilissime (3mm) e le cipolle a mezze lune. In una padella ovenproof scalda l'olio e cuoci patate e cipolle per 12-15 minuti finché morbide e leggermente dorate. Sala.",
      "Sbatti le uova con parmigiano, rosmarino tritato, sale e pepe. Versa le uova sulle verdure in padella. Cuoci sul fornello 3 minuti finché i bordi sono sodi.",
      "Trasferisci la padella in forno e cuoci per 12-15 minuti finché la frittata è gonfia e dorata in superficie. Servi tiepida direttamente dalla padella.",
    ]
  ),

  r("gratin-patate", "Gratin di patate con panna e parmigiano",
    ["mediterranea", "vegetariana"], ["forno", "comfort", "invernale", "francese"],
    45, "beginner", 4,
    [
      ing("patate a pasta gialla", 800, "g", "Verdure"),
      ing("panna fresca", 250, "ml", "Latticini"),
      ing("aglio", 1, "spicchio", "Verdure"),
      ing("parmigiano grattugiato", 60, "g", "Latticini"),
      ing("gruyère o emmenthal grattugiato", 60, "g", "Latticini"),
      ing("burro", 20, "g", "Latticini"),
      ing("noce moscata", 1, "pizzico", "Dispensa"),
    ],
    [
      "Preriscalda il forno a 180°C. Sbuccia le patate e affettale sottilissime (2-3mm) — usa una mandolina se ce l'hai. Strofinati la pirofila con l'aglio tagliato a metà, poi imburrala.",
      "Mescola la panna con sale, pepe e noce moscata. Disponi le patate a strati sovrapposti nella pirofila, irrorando ogni strato con la panna e aggiungendo un po' dei formaggi mescolati.",
      "Termina con i formaggi rimanenti e qualche fiocco di burro. Copri con alluminio e inforna 35 minuti. Scopri e cuoci altri 15-20 minuti finché la superficie è gratinata e dorata. Lascia riposare 5 minuti.",
    ]
  ),

  r("pollo-forno-verdure-miste", "Pollo al forno con verdure miste e olive",
    ["mediterranea", "onnivora"], ["forno", "completo", "domenica"],
    50, "beginner", 4,
    [
      ing("cosce di pollo disossate", 600, "g", "Proteine"),
      ing("zucchine", 2, "pz", "Verdure"),
      ing("peperoni", 2, "pz", "Verdure"),
      ing("pomodori ciliegia", 200, "g", "Verdure"),
      ing("olive nere", 60, "g", "Dispensa"),
      ing("aglio", 3, "spicchi", "Verdure"),
      ing("origano secco", 2, "cucchiaini", "Dispensa"),
      ing("olio extravergine", 4, "cucchiai", "Dispensa"),
      ing("vino bianco", 80, "ml", "Dispensa"),
    ],
    [
      "Preriscalda il forno a 200°C. Taglia le verdure a pezzi grandi. In una teglia capiente disponi pollo e verdure mescolati insieme.",
      "Condisci con olio abbondante, aglio schiacciato, origano, sale e pepe. Mescola tutto con le mani. Versa il vino bianco sul fondo della teglia. Aggiungi le olive.",
      "Inforna per 40-45 minuti, mescolando a metà cottura. Il pollo deve essere dorato con la pelle croccante e le verdure caramellate ai bordi.",
    ]
  ),

  r("sformato-spinaci-ricotta", "Sformato di spinaci e ricotta al forno",
    ["mediterranea", "vegetariana"], ["forno", "light", "economica"],
    35, "beginner", 4,
    [
      ing("spinaci freschi", 500, "g", "Verdure"),
      ing("ricotta fresca", 300, "g", "Latticini"),
      ing("uova fresche", 3, "pz", "Proteine"),
      ing("parmigiano grattugiato", 60, "g", "Latticini"),
      ing("aglio", 1, "spicchio", "Verdure"),
      ing("noce moscata", 1, "pizzico", "Dispensa"),
      ing("burro", 15, "g", "Latticini"),
    ],
    [
      "Appassisci gli spinaci in padella con aglio e un filo d'olio per 3 minuti. Strizzali bene, tritali grossolanamente.",
      "In una ciotola mescola ricotta, uova, metà del parmigiano, spinaci tritati, noce moscata, sale e pepe. Deve essere un composto omogeneo.",
      "Preriscalda il forno a 180°C. Imburra una pirofila, versaci il composto. Livella con una spatola. Cospargili con il parmigiano rimasto e qualche fiocco di burro.",
      "Inforna 25-28 minuti finché la superficie è dorata e il centro è sodo. Lascia intiepidire 5 minuti prima di servire a fette.",
    ]
  ),

  r("torta-patate-provola", "Torta di patate e provola affumicata",
    ["mediterranea", "vegetariana"], ["forno", "comfort", "regionale", "economica"],
    45, "beginner", 4,
    [
      ing("patate", 800, "g", "Verdure"),
      ing("provola affumicata", 200, "g", "Latticini"),
      ing("uova fresche", 2, "pz", "Proteine"),
      ing("parmigiano grattugiato", 50, "g", "Latticini"),
      ing("burro", 30, "g", "Latticini"),
      ing("noce moscata", 1, "pizzico", "Dispensa"),
      ing("pangrattato", 3, "cucchiai", "Dispensa"),
    ],
    [
      "Lessa le patate con la buccia in acqua salata per 25 minuti. Sbucciale ancora calde e schiacciale con lo schiacciapatate finché sono un purè liscio.",
      "Aggiungi al purè il burro a pezzetti, le uova, il parmigiano, la noce moscata, sale e pepe. Mescola bene.",
      "Preriscalda il forno a 180°C. Imburra una teglia rotonda da 24cm e cospargi di pangrattato. Versa metà del purè, livella. Distribuisci la provola a fette. Copri con il restante purè e livella. Spolvera di pangrattato e fiocchi di burro.",
      "Inforna per 30-35 minuti finché la superficie è dorata. Lascia intiepidire 10 minuti prima di tagliare a fette.",
    ]
  ),

  // ── REGIONALI ITALIANE AGGIUNTIVE ────────────────────────────────────────────

  r("arancini-riso", "Arancini di riso al ragù",
    ["mediterranea", "onnivora"], ["domenica", "speciale", "regionale", "siciliana"],
    60, "intermediate", 4,
    [
      ing("riso carnaroli", 300, "g", "Cereali"),
      ing("carne macinata mista (manzo e maiale)", 200, "g", "Proteine"),
      ing("passata di pomodoro", 200, "g", "Dispensa"),
      ing("piselli surgelati", 80, "g", "Verdure"),
      ing("mozzarella fiordilatte", 100, "g", "Latticini"),
      ing("uova fresche", 2, "pz", "Proteine"),
      ing("parmigiano grattugiato", 40, "g", "Latticini"),
      ing("pangrattato", 100, "g", "Dispensa"),
      ing("olio di semi di girasole", 500, "ml", "Dispensa"),
    ],
    [
      "Cuoci il riso come un risotto base con brodo, poi mantecalo con parmigiano e un uovo. Stendilo su un vassoio e lascialo raffreddare completamente — deve essere compatto.",
      "Prepara il ragù: rosola la carne, aggiungi passata e piselli. Cuoci 20 minuti. Lascia raffreddare.",
      "Forma gli arancini: prendi una manciata di riso freddo, appiattiscila sul palmo. Metti al centro un cucchiaio di ragù e un cubetto di mozzarella. Chiudi formando una palla compatta. Passa nell'uovo sbattuto, poi nel pangrattato.",
      "Friggi in olio abbondante a 170°C per 4-5 minuti girando, finché sono dorati uniformemente. Scola su carta assorbente. Servili caldi.",
    ]
  ),

  r("coda-alla-vaccinara", "Coda alla vaccinara romana",
    ["mediterranea", "onnivora"], ["domenica", "speciale", "regionale", "romano"],
    120, "intermediate", 4,
    [
      ing("coda di bue a pezzi", 1000, "g", "Proteine"),
      ing("pomodori pelati", 400, "g", "Dispensa"),
      ing("sedano", 3, "gambi", "Verdure"),
      ing("cipolla", 1, "pz", "Verdure"),
      ing("carote", 2, "pz", "Verdure"),
      ing("vino rosso", 150, "ml", "Dispensa"),
      ing("cacao amaro in polvere", 1, "cucchiaio", "Dispensa"),
      ing("pinoli", 30, "g", "Dispensa"),
      ing("uvetta", 30, "g", "Dispensa"),
      ing("olio extravergine", 3, "cucchiai", "Dispensa"),
    ],
    [
      "Rosola i pezzi di coda in olio caldo a fuoco alto, 4-5 minuti per lato, finché ben dorati. Toglili.",
      "Nella stessa pentola soffriggi cipolla, carote e sedano tritati per 7 minuti. Rimetti la coda, sfuma col vino rosso e lascia evaporare.",
      "Aggiungi i pelati schiacciati, copri con acqua. Porta a bollore, poi cuoci a fuoco bassissimo per 2 ore con coperchio. La carne deve staccarsi dall'osso.",
      "Negli ultimi 15 minuti aggiungi cacao, pinoli e uvetta — il segreto del sapore agrodolce tipico romano. Aggiusta di sale.",
    ]
  ),

  r("bucce-pasta-patate", "Pasta e patate napoletana",
    ["mediterranea", "vegetariana", "onnivora"], ["regionale", "comfort", "economica", "napoletana"],
    30, "beginner", 4,
    [
      ing("pasta mista o ditaloni", 200, "g", "Cereali"),
      ing("patate", 400, "g", "Verdure"),
      ing("pomodori pelati", 200, "g", "Dispensa"),
      ing("cipolla dorata", 1, "pz", "Verdure"),
      ing("aglio", 2, "spicchi", "Verdure"),
      ing("rosmarino fresco", 1, "rametto", "Verdure"),
      ing("parmigiano o pecorino grattugiato", 40, "g", "Latticini"),
      ing("olio extravergine", 4, "cucchiai", "Dispensa"),
    ],
    [
      "Taglia le patate a cubetti di 2cm. In una pentola larga scalda l'olio. Soffriggi cipolla e aglio per 5 minuti. Aggiungi le patate e i pelati schiacciati. Cuoci 5 minuti.",
      "Copri con 800ml di acqua salata calda. Porta a bollore e cuoci 10 minuti.",
      "Aggiungi la pasta direttamente nella pentola. Cuoci mescolando spesso per 10-12 minuti: la pasta assorbe il brodo e le patate si sfaldano leggermente rendendo tutto cremoso. Se troppo asciutto aggiungi acqua calda. Aggiusta di sale. Finisci con olio crudo e parmigiano.",
    ]
  ),

  r("crespelle-spinaci", "Crespelle ripiene di spinaci e ricotta",
    ["mediterranea", "vegetariana"], ["domenica", "speciale", "forno", "regionale"],
    50, "intermediate", 4,
    [
      ing("uova fresche", 2, "pz", "Proteine"),
      ing("farina 00", 120, "g", "Dispensa"),
      ing("latte intero", 300, "ml", "Latticini"),
      ing("spinaci freschi", 400, "g", "Verdure"),
      ing("ricotta fresca", 300, "g", "Latticini"),
      ing("parmigiano grattugiato", 60, "g", "Latticini"),
      ing("burro", 30, "g", "Latticini"),
      ing("passata di pomodoro", 300, "g", "Dispensa"),
      ing("noce moscata", 1, "pizzico", "Dispensa"),
    ],
    [
      "Prepara la pastella: sbatti uova, farina e latte con una frusta finché liscia. Lascia riposare 15 minuti. Cuoci le crespelle in una padella antiaderente da 20cm unta con poco burro: 1 mestolino di pastella per volta, 1 minuto per lato. Ottieni 8-10 crespelle.",
      "Appassisci gli spinaci in padella, strizzali e tritali. Mescola con ricotta, metà parmigiano, noce moscata, sale e pepe.",
      "Farcisci ogni crespella con il ripieno, arrotolala. Disponi in una pirofila imburrata. Copri con passata di pomodoro scaldata e parmigiano rimanente.",
      "Inforna a 180°C per 20 minuti finché il formaggio è fuso e i bordi dorati.",
    ]
  ),

  // ── ECONOMICHE ───────────────────────────────────────────────────────────────

  r("frittata-pasta-avanzata", "Frittata di pasta avanzata",
    ["mediterranea", "vegetariana"], ["economica", "avanzi", "veloce"],
    15, "beginner", 2,
    [
      ing("pasta avanzata condita", 250, "g", "Cereali"),
      ing("uova fresche", 3, "pz", "Proteine"),
      ing("parmigiano grattugiato", 30, "g", "Latticini"),
      ing("olio extravergine", 2, "cucchiai", "Dispensa"),
    ],
    [
      "Sbatti le uova con il parmigiano, sale e pepe in una ciotola capiente. Aggiungi la pasta avanzata e mescola finché le uova avvolgono tutta la pasta.",
      "Scalda l'olio in una padella antiaderente a fuoco medio. Versa il composto e appiattisci con una spatola. Cuoci 4-5 minuti finché il fondo è dorato.",
      "Gira con l'aiuto di un piatto e cuoci altri 3-4 minuti. Servi a spicchi, calda o a temperatura ambiente. Ottima anche il giorno dopo.",
    ]
  ),

  r("zuppa-pane-formaggi", "Zuppa di pane raffermo e formaggi misti",
    ["mediterranea", "vegetariana"], ["economica", "avanzi", "invernale"],
    25, "beginner", 2,
    [
      ing("pane di campagna raffermo", 200, "g", "Cereali"),
      ing("brodo vegetale", 600, "ml", "Dispensa"),
      ing("formaggio misto grattugiato o a pezzi", 80, "g", "Latticini"),
      ing("aglio", 1, "spicchio", "Verdure"),
      ing("olio extravergine", 3, "cucchiai", "Dispensa"),
      ing("timo fresco", 3, "rametti", "Verdure"),
    ],
    [
      "Tosta le fette di pane in forno o in padella finché croccanti. Strofinale con l'aglio.",
      "Scalda il brodo in una pentola. Spezza il pane tostato in pezzi e immergili nel brodo caldo. Cuoci a fuoco basso per 5 minuti: il pane assorbe il brodo e si ammorbidisce.",
      "Distribuisci nei piatti, aggiungi il formaggio sopra. Metti sotto il grill del forno per 3 minuti finché il formaggio è fuso. Finisci con timo e olio crudo.",
    ]
  ),

  r("riso-latte-parmigiano", "Riso in bianco con burro e parmigiano",
    ["mediterranea", "vegetariana"], ["economica", "veloce", "classico"],
    15, "beginner", 2,
    [
      ing("riso carnaroli o vialone nano", 180, "g", "Cereali"),
      ing("burro", 40, "g", "Latticini"),
      ing("parmigiano grattugiato", 60, "g", "Latticini"),
      ing("brodo vegetale caldo", 500, "ml", "Dispensa"),
    ],
    [
      "Porta il brodo a ebollizione. Aggiungi il riso e cuoci a fuoco medio per 14-16 minuti mescolando di tanto in tanto, come un risotto, aggiungendo brodo se necessario.",
      "A fine cottura, fuori dal fuoco, aggiungi il burro freddo a pezzetti e il parmigiano. Manteca energicamente per 1-2 minuti: il riso deve diventare cremoso e lucido.",
      "Servi subito. Semplicissimo ma delizioso quando si ha poco tempo o voglia di qualcosa di confortante.",
    ]
  ),

  r("omelette-pomodoro-basilico", "Omelette con pomodoro e basilico fresco",
    ["mediterranea", "vegetariana"], ["economica", "veloce", "estivo"],
    12, "beginner", 2,
    [
      ing("uova fresche", 4, "pz", "Proteine"),
      ing("pomodori maturi", 2, "pz", "Verdure"),
      ing("basilico fresco", 6, "foglie", "Verdure"),
      ing("burro", 15, "g", "Latticini"),
      ing("parmigiano grattugiato", 20, "g", "Latticini"),
    ],
    [
      "Taglia i pomodori a cubettini e condiscili con sale, olio e basilico. Tienili da parte 5 minuti.",
      "Sbatti le uova con parmigiano, sale e pepe. Scalda il burro in padella antiaderente a fuoco medio. Versa le uova e cuoci formando l'omelette morbida.",
      "Prima di chiudere l'omelette, distribuisci i pomodori conditi su metà. Chiudi a mezzaluna e servi immediatamente.",
    ]
  ),


  // ── ALTRI PRIMI ──────────────────────────────────────────────────────────────

  r("pasta-pesto-genovese", "Trofie al pesto genovese con fagiolini e patate",
    ["mediterranea", "vegetariana"], ["classico", "regionale", "ligure"],
    25, "beginner", 2,
    [
      ing("trofie o linguine", 180, "g", "Cereali"),
      ing("pesto al basilico", 4, "cucchiai", "Dispensa"),
      ing("fagiolini", 100, "g", "Verdure"),
      ing("patate", 1, "pz", "Verdure"),
      ing("parmigiano grattugiato", 20, "g", "Latticini"),
    ],
    [
      "Pela la patata e tagliala a cubetti piccoli. Spunta i fagiolini e spezzali a metà.",
      "Cuoci tutto insieme nella stessa pentola: prima la patata (5 minuti), poi i fagiolini (3 minuti), poi la pasta. Scola al dente tenendo un mestolino di acqua di cottura.",
      "In una ciotola grande metti il pesto. Aggiungi l'acqua di cottura tiepida e mescola. Versa la pasta con verdure e mescola velocemente. Il calore ammorbidisce il pesto senza cuocerlo. Finisci con parmigiano.",
    ]
  ),

  r("pasta-al-pesto-pistacchi", "Pasta al pesto di pistacchi e limone",
    ["mediterranea", "vegetariana"], ["veloce", "siciliana", "cremosa"],
    18, "beginner", 2,
    [
      ing("pasta (mezze maniche o rigatoni)", 180, "g", "Cereali"),
      ing("pistacchi non salati sgusciati", 80, "g", "Dispensa"),
      ing("parmigiano grattugiato", 30, "g", "Latticini"),
      ing("aglio", 1, "spicchio", "Verdure"),
      ing("limone", 1, "pz", "Verdure"),
      ing("olio extravergine", 4, "cucchiai", "Dispensa"),
    ],
    [
      "Prepara il pesto: frulla i pistacchi con aglio, parmigiano, scorza di limone e olio fino a ottenere una crema granulosa. Aggiusta di sale.",
      "Cuoci la pasta in acqua salata. Scola al dente tenendo acqua di cottura.",
      "Allarga il pesto con 3-4 cucchiai di acqua di cottura. Versa la pasta e mescola a fuoco spento. Finisci con scorza di limone grattugiata e pistacchi tritati grossolani.",
    ]
  ),

  r("spaghetti-vongole", "Spaghetti alle vongole in bianco",
    ["mediterranea", "onnivora"], ["pesce", "classico", "regionale", "napoletana"],
    25, "beginner", 2,
    [
      ing("spaghetti", 180, "g", "Cereali"),
      ing("vongole fresche", 600, "g", "Proteine"),
      ing("aglio", 3, "spicchi", "Verdure"),
      ing("vino bianco secco", 100, "ml", "Dispensa"),
      ing("prezzemolo fresco", 1, "ciuffo", "Verdure"),
      ing("olio extravergine", 5, "cucchiai", "Dispensa"),
      ing("peperoncino", 1, "pz", "Dispensa"),
    ],
    [
      "Metti le vongole in acqua fredda salata per 30 minuti a spurgare. Sciacquale bene.",
      "In una padella larga scalda 3 cucchiai di olio con aglio e peperoncino. Aggiungi le vongole e il vino. Copri e cuoci a fuoco alto 3-4 minuti finché si aprono. Scarta quelle chiuse. Filtra il liquido.",
      "Cuoci gli spaghetti molto al dente (2 minuti meno del tempo). Versali nella padella con il liquido filtrato. Salta a fuoco vivo 2 minuti aggiungendo acqua di cottura. Le vongole vanno aggiunte solo nell'ultimo minuto. Finisci con prezzemolo e olio crudo.",
    ]
  ),

  r("pasta-sarde", "Pasta con le sarde alla palermitana",
    ["mediterranea", "onnivora"], ["pesce", "regionale", "siciliana"],
    30, "beginner", 2,
    [
      ing("pasta (bucatini o spaghetti)", 180, "g", "Cereali"),
      ing("sarde fresche o sott'olio", 200, "g", "Proteine"),
      ing("finocchietto selvatico o finocchio", 100, "g", "Verdure"),
      ing("cipolla dorata", 1, "pz", "Verdure"),
      ing("uvetta", 30, "g", "Dispensa"),
      ing("pinoli", 30, "g", "Dispensa"),
      ing("zafferano", 1, "bustina", "Dispensa"),
      ing("olio extravergine", 4, "cucchiai", "Dispensa"),
    ],
    [
      "Sbollenta il finocchietto 5 minuti in acqua salata. Scola e trita. Tieni l'acqua per cuocere la pasta.",
      "In una padella larga scalda l'olio. Soffriggi la cipolla 5 minuti. Aggiungi uvetta, pinoli e zafferano sciolto in acqua calda. Cuoci 2 minuti.",
      "Aggiungi il finocchietto e le sarde (pulite e spinate se fresche, sgocciolate se sott'olio). Cuoci 5 minuti schiacciando le sarde con il cucchiaio. Cuoci la pasta nell'acqua del finocchietto. Scola e manteca nella padella.",
    ]
  ),

  r("lasagna-bolognese", "Lasagna alla bolognese classica",
    ["mediterranea", "onnivora"], ["domenica", "speciale", "regionale", "bolognese"],
    70, "intermediate", 6,
    [
      ing("sfoglie lasagna secche", 300, "g", "Cereali"),
      ing("carne macinata mista (manzo e maiale)", 400, "g", "Proteine"),
      ing("passata di pomodoro", 400, "g", "Dispensa"),
      ing("latte intero", 600, "ml", "Latticini"),
      ing("farina 00", 50, "g", "Dispensa"),
      ing("burro", 60, "g", "Latticini"),
      ing("parmigiano grattugiato", 100, "g", "Latticini"),
      ing("cipolla dorata", 1, "pz", "Verdure"),
      ing("carote", 1, "pz", "Verdure"),
      ing("sedano", 1, "gambo", "Verdure"),
      ing("vino rosso", 100, "ml", "Dispensa"),
    ],
    [
      "Ragù: soffriggi cipolla, carota e sedano tritati in olio per 7 minuti. Aggiungi la carne e rosola 8 minuti sgranando. Sfuma col vino rosso. Aggiungi la passata. Cuoci a fuoco basso 30 minuti. Aggiusta di sale.",
      "Besciamella: sciogli 50g di burro, aggiungi farina e cuoci 2 minuti. Versa il latte caldo a filo mescolando. Cuoci 8 minuti finché densa. Sala e aggiungi noce moscata.",
      "Preriscalda il forno a 180°C. In una pirofila alterna: besciamella, sfoglie, ragù, besciamella, parmigiano. Ripeti per 5-6 strati. Termina con besciamella e parmigiano abbondante e fiocchi di burro.",
      "Copri con alluminio e inforna 30 minuti. Scopri e cuoci altri 15 minuti finché dorata. Lascia riposare 15 minuti prima di tagliare.",
    ]
  ),

  r("gnocchi-ragu-napoli", "Gnocchi al ragù napoletano",
    ["mediterranea", "onnivora"], ["domenica", "regionale", "comfort"],
    50, "intermediate", 4,
    [
      ing("gnocchi di patate freschi", 600, "g", "Cereali"),
      ing("carne macinata mista (manzo e maiale)", 300, "g", "Proteine"),
      ing("passata di pomodoro", 500, "g", "Dispensa"),
      ing("cipolla dorata", 1, "pz", "Verdure"),
      ing("vino rosso", 80, "ml", "Dispensa"),
      ing("basilico fresco", 8, "foglie", "Verdure"),
      ing("parmigiano grattugiato", 50, "g", "Latticini"),
      ing("olio extravergine", 3, "cucchiai", "Dispensa"),
    ],
    [
      "Soffriggi la cipolla tritata in olio per 5 minuti. Aggiungi la carne e rosola 7 minuti sgranando. Sfuma col vino rosso e lascia evaporare.",
      "Aggiungi la passata. Cuoci a fuoco basso per 30 minuti mescolando ogni tanto. Il ragù deve essere denso e saporito. Aggiusta di sale e aggiungi basilico.",
      "Cuoci gli gnocchi in abbondante acqua salata. Scola con la schiumarola quando salgono a galla. Versali nel ragù, mescola delicatamente. Servi con parmigiano abbondante.",
    ]
  ),

  r("pasta-melanzane-scamorza", "Pasta con melanzane fritte e scamorza",
    ["mediterranea", "vegetariana"], ["estivo", "saporita", "comfort"],
    30, "beginner", 2,
    [
      ing("pasta (rigatoni o penne)", 180, "g", "Cereali"),
      ing("melanzane", 1, "pz", "Verdure"),
      ing("scamorza affumicata", 100, "g", "Latticini"),
      ing("passata di pomodoro", 200, "g", "Dispensa"),
      ing("aglio", 1, "spicchio", "Verdure"),
      ing("basilico fresco", 6, "foglie", "Verdure"),
      ing("olio extravergine", 4, "cucchiai", "Dispensa"),
    ],
    [
      "Taglia la melanzana a cubetti di 2cm. Friggi in olio abbondante a fuoco alto per 5-6 minuti finché dorata. Scola su carta assorbente.",
      "In una padella scalda 1 cucchiaio di olio con l'aglio. Aggiungi la passata e cuoci 10 minuti. Aggiusta di sale.",
      "Cuoci la pasta al dente. Versala nella padella con il sugo. Aggiungi le melanzane fritte e la scamorza tagliata a cubetti. Mescola: il calore scioglie leggermente la scamorza. Finisci con basilico.",
    ]
  ),

  r("pasta-boscaiola", "Pasta alla boscaiola con funghi e pancetta",
    ["mediterranea", "onnivora"], ["autunnale", "comfort", "cremosa"],
    25, "beginner", 2,
    [
      ing("pasta (tagliatelle o penne)", 180, "g", "Cereali"),
      ing("funghi champignon", 250, "g", "Verdure"),
      ing("pancetta tesa a cubetti", 80, "g", "Proteine"),
      ing("panna fresca", 100, "ml", "Latticini"),
      ing("aglio", 1, "spicchio", "Verdure"),
      ing("prezzemolo fresco", 1, "ciuffo", "Verdure"),
      ing("parmigiano grattugiato", 30, "g", "Latticini"),
    ],
    [
      "In una padella larga rosola la pancetta a fuoco medio finché croccante. Aggiungi i funghi a fette e cuoci a fuoco alto 5 minuti senza mescolare finché dorano. Aggiungi l'aglio e cuoci 1 minuto.",
      "Abbassa la fiamma, aggiungi la panna e mescola. Cuoci 2 minuti. Aggiusta di sale.",
      "Scola la pasta al dente tenendo acqua di cottura. Versala nella padella, mescola aggiungendo acqua se troppo densa. Finisci con prezzemolo e parmigiano.",
    ]
  ),

  r("pasta-pomodoro-mascarpone", "Pasta al pomodoro e mascarpone",
    ["mediterranea", "vegetariana"], ["cremosa", "veloce", "comfort"],
    18, "beginner", 2,
    [
      ing("pasta (rigatoni o penne)", 180, "g", "Cereali"),
      ing("passata di pomodoro", 250, "g", "Dispensa"),
      ing("mascarpone", 80, "g", "Latticini"),
      ing("cipolla dorata", 0.5, "pz", "Verdure"),
      ing("basilico fresco", 6, "foglie", "Verdure"),
      ing("olio extravergine", 2, "cucchiai", "Dispensa"),
    ],
    [
      "Soffriggi la cipolla tritata in olio per 4 minuti. Aggiungi la passata e cuoci 12 minuti a fuoco medio.",
      "A fuoco basso incorpora il mascarpone mescolando: si scioglie nel sugo formando una crema rosa e vellutata. Aggiusta di sale.",
      "Scola la pasta al dente e versala nella padella. Manteca 1 minuto. Finisci con basilico spezzettato.",
    ]
  ),

  r("maltagliati-ceci", "Maltagliati con ceci e rosmarino",
    ["mediterranea", "vegetariana", "vegana"], ["regionale", "economica", "comfort"],
    25, "beginner", 2,
    [
      ing("pasta corta mista o maltagliati", 180, "g", "Cereali"),
      ing("ceci in lattina", 480, "g", "Proteine"),
      ing("rosmarino fresco", 1, "rametto", "Verdure"),
      ing("aglio", 2, "spicchi", "Verdure"),
      ing("pomodori pelati", 150, "g", "Dispensa"),
      ing("olio extravergine", 4, "cucchiai", "Dispensa"),
    ],
    [
      "Scalda l'olio con aglio e rosmarino. Aggiungi i ceci e i pelati schiacciati. Cuoci 8 minuti schiacciando metà dei ceci per addensare il fondo.",
      "Copri con 400ml di acqua calda. Porta a bollore. Aggiungi la pasta e cuoci mescolando fino a cottura — come una pasta e fagioli. Aggiusta di sale. Finisci con olio crudo.",
    ]
  ),

  // ── SECONDI AGGIUNTIVI ───────────────────────────────────────────────────────

  r("involtini-prosciutto-salvia", "Involtini di vitello con prosciutto e salvia",
    ["mediterranea", "onnivora"], ["veloce", "classico", "regionale"],
    18, "beginner", 2,
    [
      ing("fettine di vitello sottili", 300, "g", "Proteine"),
      ing("prosciutto crudo", 60, "g", "Proteine"),
      ing("salvia fresca", 8, "foglie", "Verdure"),
      ing("burro", 30, "g", "Latticini"),
      ing("vino bianco secco", 60, "ml", "Dispensa"),
    ],
    [
      "Stendi ogni fettina di vitello, adagia una fetta di prosciutto e una foglia di salvia. Arrotola e ferma con uno stuzzicadenti.",
      "Scalda il burro in padella a fuoco medio-alto. Cuoci gli involtini 2-3 minuti per lato finché dorati. Sala leggermente (il prosciutto è già sapido).",
      "Sfuma col vino bianco, lascia evaporare 1 minuto. La salsina che si forma è il condimento. Servi subito con la propria salsa.",
    ]
  ),

  r("pollo-hunter-cacciatore", "Pollo alla cacciatora",
    ["mediterranea", "onnivora"], ["comfort", "regionale", "domenica"],
    45, "beginner", 4,
    [
      ing("pollo intero o cosce e sovracosce", 1000, "g", "Proteine"),
      ing("peperoni", 2, "pz", "Verdure"),
      ing("cipolla", 1, "pz", "Verdure"),
      ing("pomodori pelati", 300, "g", "Dispensa"),
      ing("olive nere", 60, "g", "Dispensa"),
      ing("vino rosso", 100, "ml", "Dispensa"),
      ing("aglio", 2, "spicchi", "Verdure"),
      ing("rosmarino fresco", 1, "rametto", "Verdure"),
      ing("olio extravergine", 3, "cucchiai", "Dispensa"),
    ],
    [
      "Sala e pepa il pollo. Rosola in olio caldo a fuoco alto 5 minuti per lato finché ben dorato. Toglilo.",
      "Nella stessa pentola soffriggi cipolla e aglio 4 minuti. Aggiungi i peperoni a listarelle, cuoci 5 minuti. Sfuma col vino rosso.",
      "Aggiungi il pollo, i pelati schiacciati, le olive e il rosmarino. Copri e cuoci a fuoco basso 30 minuti, girando a metà. La carne deve essere morbidissima. Aggiusta di sale.",
    ]
  ),

  r("coniglio-ligure", "Coniglio alla ligure con olive e pinoli",
    ["mediterranea", "onnivora"], ["regionale", "ligure", "domenica"],
    55, "intermediate", 4,
    [
      ing("coniglio a pezzi", 1000, "g", "Proteine"),
      ing("olive taggiasche", 100, "g", "Dispensa"),
      ing("pinoli", 40, "g", "Dispensa"),
      ing("cipolla", 1, "pz", "Verdure"),
      ing("aglio", 2, "spicchi", "Verdure"),
      ing("rosmarino fresco", 2, "rametti", "Verdure"),
      ing("vino bianco secco", 150, "ml", "Dispensa"),
      ing("olio extravergine", 4, "cucchiai", "Dispensa"),
    ],
    [
      "Rosola il coniglio in olio caldo a fuoco alto 5 minuti per lato. Toglilo.",
      "Soffriggi cipolla e aglio 4 minuti. Rimetti il coniglio. Sfuma col vino bianco e lascia evaporare. Aggiungi rosmarino e 100ml di acqua.",
      "Copri e cuoci a fuoco basso 35 minuti. Negli ultimi 10 minuti aggiungi olive e pinoli. Il coniglio è pronto quando la carne si stacca facilmente dall'osso. Aggiusta di sale.",
    ]
  ),

  r("spezzatino-patate", "Spezzatino di manzo con patate",
    ["mediterranea", "onnivora"], ["domenica", "comfort", "invernale", "economica"],
    55, "beginner", 4,
    [
      ing("manzo da spezzatino", 600, "g", "Proteine"),
      ing("patate", 500, "g", "Verdure"),
      ing("cipolla", 1, "pz", "Verdure"),
      ing("carote", 2, "pz", "Verdure"),
      ing("pomodori pelati", 200, "g", "Dispensa"),
      ing("brodo di carne o vegetale", 300, "ml", "Dispensa"),
      ing("rosmarino fresco", 1, "rametto", "Verdure"),
      ing("olio extravergine", 3, "cucchiai", "Dispensa"),
    ],
    [
      "Taglia la carne a cubetti di 4cm. Rosola in olio caldo a fuoco alto in due riprese per non abbassare la temperatura — devono dorare bene. Toglili.",
      "Soffriggi cipolla e carote a cubetti 5 minuti. Rimetti la carne, aggiungi i pelati schiacciati e il brodo. Rosmarino. Porta a bollore, copri e cuoci a fuoco basso 35 minuti.",
      "Aggiungi le patate a cubetti grandi. Cuoci altri 20 minuti finché patate e carne sono morbide. Aggiusta di sale. Il fondo deve essere denso e saporito.",
    ]
  ),

  r("baccala-mantecato", "Baccalà mantecato con polenta",
    ["mediterranea", "onnivora"], ["regionale", "veneto", "domenica"],
    45, "intermediate", 4,
    [
      ing("baccalà dissalato", 500, "g", "Proteine"),
      ing("farina di polenta istantanea", 200, "g", "Cereali"),
      ing("aglio", 2, "spicchi", "Verdure"),
      ing("olio extravergine", 150, "ml", "Dispensa"),
      ing("prezzemolo fresco", 1, "ciuffo", "Verdure"),
      ing("latte intero", 200, "ml", "Latticini"),
    ],
    [
      "Cuoci il baccalà in acqua e latte per 20 minuti a fuoco basso. Scola e rimuovi pelle e lische. Tieni il liquido di cottura.",
      "Metti il baccalà in una ciotola e lavoralo con una frusta o a mano aggiungendo olio a filo come una maionese, alternando con il liquido di cottura tiepido. Deve diventare una crema bianca soffice. Aggiungi aglio tritato finissimo e prezzemolo.",
      "Prepara la polenta seguendo le istruzioni del pacchetto (istantanea: 5 minuti). Servi il baccalà mantecato sulla polenta calda o come bruschetta su crostini.",
    ]
  ),

  r("tonno-fresco-pomodoro", "Trancio di tonno fresco alla piastra con pomodorini",
    ["mediterranea", "onnivora"], ["pesce", "veloce", "estivo"],
    15, "beginner", 2,
    [
      ing("tranci di tonno fresco", 320, "g", "Proteine"),
      ing("pomodori ciliegia", 200, "g", "Verdure"),
      ing("aglio", 1, "spicchio", "Verdure"),
      ing("capperi sotto sale", 1, "cucchiaio", "Dispensa"),
      ing("origano secco", 1, "cucchiaino", "Dispensa"),
      ing("olio extravergine", 3, "cucchiai", "Dispensa"),
      ing("limone", 1, "pz", "Verdure"),
    ],
    [
      "Asciuga i tranci di tonno con carta da cucina. Condisci con olio, sale e pepe. Scalda una padella grill o antiaderente a fuoco altissimo.",
      "Cuoci il tonno 2 minuti per lato — deve restare rosa all'interno. Non esagerare con la cottura o diventa secco.",
      "Nel frattempo scalda un filo d'olio con l'aglio. Aggiungi i pomodorini tagliati a metà e i capperi sciacquati. Cuoci 3 minuti. Aggiungi origano. Servi il tonno con i pomodorini e una spremitura di limone.",
    ]
  ),

  r("sogliola-burro-limone", "Sogliola al burro e limone",
    ["mediterranea", "onnivora"], ["pesce", "veloce", "classico", "light"],
    15, "beginner", 2,
    [
      ing("sogliole intere o filetti", 400, "g", "Proteine"),
      ing("farina 00", 3, "cucchiai", "Dispensa"),
      ing("burro", 50, "g", "Latticini"),
      ing("limone", 2, "pz", "Verdure"),
      ing("prezzemolo fresco", 1, "ciuffo", "Verdure"),
    ],
    [
      "Infarina le sogliole su entrambi i lati, elimina l'eccesso.",
      "Scalda il burro in padella a fuoco medio-alto fino a quando smette di schiumare. Cuoci le sogliole 3-4 minuti per lato finché dorate. Togli dal fuoco.",
      "Aggiungi il succo di limone nella padella ancora calda — sfrigola subito. Rimetti le sogliole 30 secondi. Servi con prezzemolo tritato e fette di limone.",
    ]
  ),

  r("polpettone-forno", "Polpettone al forno con uovo sodo",
    ["mediterranea", "onnivora"], ["domenica", "forno", "comfort"],
    50, "beginner", 4,
    [
      ing("carne macinata mista (manzo e maiale)", 600, "g", "Proteine"),
      ing("uova fresche", 3, "pz", "Proteine"),
      ing("pangrattato", 60, "g", "Dispensa"),
      ing("parmigiano grattugiato", 40, "g", "Latticini"),
      ing("prezzemolo fresco", 1, "ciuffo", "Verdure"),
      ing("aglio", 1, "spicchio", "Verdure"),
      ing("passata di pomodoro", 200, "g", "Dispensa"),
      ing("olio extravergine", 2, "cucchiai", "Dispensa"),
    ],
    [
      "Sodi 2 uova: cuoci 8 minuti in acqua bollente, raffredda e sbuccia. Prepara il mix: impasta carne, 1 uovo crudo, pangrattato, parmigiano, aglio e prezzemolo tritati, sale e pepe.",
      "Su carta forno stendi il mix a rettangolo. Posiziona le uova sode al centro. Arrotola il polpettone avvolgendole. Chiudi bene.",
      "Metti in teglia con la passata e un filo d'olio. Inforna a 180°C per 35-40 minuti irrorando con i succhi ogni 15 minuti. Lascia riposare 5 minuti prima di tagliare a fette.",
    ]
  ),

  r("arrosto-maiale-mele", "Arrosto di maiale alle mele e rosmarino",
    ["mediterranea", "onnivora"], ["domenica", "speciale", "autunnale"],
    65, "intermediate", 4,
    [
      ing("lonza di maiale", 800, "g", "Proteine"),
      ing("mele golden", 2, "pz", "Verdure"),
      ing("rosmarino fresco", 2, "rametti", "Verdure"),
      ing("aglio", 3, "spicchi", "Verdure"),
      ing("vino bianco secco", 150, "ml", "Dispensa"),
      ing("olio extravergine", 3, "cucchiai", "Dispensa"),
    ],
    [
      "Stecca la lonza: fai dei fori con un coltello e inserisci spicchi d'aglio e aghi di rosmarino. Sala e pepa su tutta la superficie.",
      "Rosola in olio caldo a fuoco alto su tutti i lati, 3-4 minuti per lato finché dorata. Sfuma col vino bianco.",
      "Disponi nella teglia con le mele tagliate a spicchi (con la buccia). Inforna a 180°C per 45-50 minuti. Irrora ogni 15 minuti. La carne è cotta quando il termometro segna 65-70°C al centro (o il succo è trasparente). Lascia riposare 10 minuti prima di affettare.",
    ]
  ),

  r("salmone-avocado-insalata", "Insalata di salmone affumicato con avocado e finocchio",
    ["mediterranea", "onnivora"], ["freddo", "light", "estivo"],
    12, "beginner", 2,
    [
      ing("salmone affumicato", 150, "g", "Proteine"),
      ing("avocado", 1, "pz", "Verdure"),
      ing("finocchio", 1, "pz", "Verdure"),
      ing("limone", 1, "pz", "Verdure"),
      ing("olio extravergine", 2, "cucchiai", "Dispensa"),
      ing("aneto", 1, "ciuffo", "Verdure"),
    ],
    [
      "Affetta il finocchio sottilissimo con un coltello. Taglia l'avocado a fette (condisci subito con limone per non annerire).",
      "Disponi nel piatto: finocchio, avocado e salmone affumicato a striscioline.",
      "Condisci con olio, succo di limone, sale e pepe. Finisci con aneto fresco (o prezzemolo). Ottimo come antipasto o piatto unico leggero.",
    ]
  ),

  // ── CONTORNI CHE DIVENTANO PIATTI UNICI ─────────────────────────────────────

  r("cicoria-ripassata", "Cicoria ripassata in padella con aglio e peperoncino",
    ["mediterranea", "vegetariana", "vegana"], ["light", "regionale", "romano", "economica"],
    20, "beginner", 2,
    [
      ing("cicoria o catalogna", 500, "g", "Verdure"),
      ing("aglio", 3, "spicchi", "Verdure"),
      ing("peperoncino", 1, "pz", "Dispensa"),
      ing("olio extravergine", 4, "cucchiai", "Dispensa"),
    ],
    [
      "Lessa la cicoria in acqua salata bollente per 8-10 minuti finché morbida. Scola e strizza bene con le mani per eliminare l'acqua in eccesso.",
      "In una padella larga scalda l'olio con l'aglio affettato e il peperoncino. Quando l'aglio è dorato (non bruciato) aggiungi la cicoria. Alza la fiamma e salta per 4-5 minuti a fuoco vivo finché asciutta e insaporita.",
      "Aggiusta di sale. Ottima da sola con pane casereccio o come accompagnamento a carne e pesce.",
    ]
  ),

  r("caponata-siciliana", "Caponata di melanzane siciliana",
    ["mediterranea", "vegetariana", "vegana"], ["estivo", "regionale", "siciliana", "meal prep"],
    35, "beginner", 4,
    [
      ing("melanzane", 2, "pz", "Verdure"),
      ing("sedano", 3, "gambi", "Verdure"),
      ing("cipolla dorata", 1, "pz", "Verdure"),
      ing("pomodori pelati", 300, "g", "Dispensa"),
      ing("olive verdi denocciolate", 80, "g", "Dispensa"),
      ing("capperi sotto sale", 2, "cucchiai", "Dispensa"),
      ing("aceto di vino rosso", 3, "cucchiai", "Dispensa"),
      ing("zucchero", 1, "cucchiaio", "Dispensa"),
      ing("olio extravergine", 5, "cucchiai", "Dispensa"),
    ],
    [
      "Taglia le melanzane a cubetti, sala e lascia riposare 15 minuti. Tamponale. Friggile in olio abbondante a fuoco alto finché dorate. Scola.",
      "In una padella scalda 2 cucchiai di olio. Soffriggi cipolla e sedano a pezzi per 7 minuti. Aggiungi i pelati schiacciati. Cuoci 10 minuti.",
      "Aggiungi olive, capperi sciacquati, aceto e zucchero. Mescola — è il momento agrodolce. Cuoci 5 minuti. Aggiungi le melanzane fritte. Lascia riposare almeno 30 minuti (è più buona il giorno dopo).",
    ]
  ),

  r("peperonata", "Peperonata classica con pomodori",
    ["mediterranea", "vegetariana", "vegana"], ["estivo", "regionale", "economica"],
    30, "beginner", 4,
    [
      ing("peperoni misti (rosso e giallo)", 4, "pz", "Verdure"),
      ing("cipolla dorata", 1, "pz", "Verdure"),
      ing("pomodori maturi", 3, "pz", "Verdure"),
      ing("aglio", 2, "spicchi", "Verdure"),
      ing("basilico fresco", 8, "foglie", "Verdure"),
      ing("olio extravergine", 4, "cucchiai", "Dispensa"),
    ],
    [
      "Taglia i peperoni a listarelle spesse, la cipolla a mezze lune.",
      "In una padella capiente scalda l'olio a fuoco medio. Soffriggi cipolla e aglio 5 minuti. Aggiungi i peperoni. Cuoci a fuoco medio-basso per 15 minuti mescolando ogni tanto.",
      "Aggiungi i pomodori a pezzi. Cuoci altri 10 minuti finché tutto è morbido e insaporito. Aggiusta di sale. Finisci con basilico. Ottima calda o a temperatura ambiente.",
    ]
  ),

  r("fagioli-borlotti-sagra", "Fagioli borlotti in umido con pomodoro e salvia",
    ["mediterranea", "vegetariana", "vegana"], ["comfort", "economica", "regionale"],
    25, "beginner", 2,
    [
      ing("fagioli borlotti in lattina", 480, "g", "Proteine"),
      ing("pomodori pelati", 200, "g", "Dispensa"),
      ing("aglio", 2, "spicchi", "Verdure"),
      ing("salvia fresca", 6, "foglie", "Verdure"),
      ing("olio extravergine", 3, "cucchiai", "Dispensa"),
    ],
    [
      "Scalda l'olio con aglio e salvia a fuoco medio. Quando l'aglio sfrigola aggiungi i pelati schiacciati. Cuoci 8 minuti.",
      "Aggiungi i fagioli scolati. Schiaccia un terzo con il dorso del cucchiaio. Cuoci 10 minuti finché il fondo si addensa. Aggiusta di sale. Servi con pane tostato.",
    ]
  ),

  r("zucchine-scapece", "Zucchine alla scapece (marinate con aceto e menta)",
    ["mediterranea", "vegetariana", "vegana"], ["estivo", "freddo", "regionale", "napoletana"],
    20, "beginner", 2,
    [
      ing("zucchine", 4, "pz", "Verdure"),
      ing("aglio", 2, "spicchi", "Verdure"),
      ing("menta fresca", 8, "foglie", "Verdure"),
      ing("aceto di vino bianco", 3, "cucchiai", "Dispensa"),
      ing("olio di semi di girasole", 200, "ml", "Dispensa"),
    ],
    [
      "Taglia le zucchine a rondelle di 5mm. Friggile in olio di semi a fuoco alto fino a doratura. Scola su carta assorbente e sala subito.",
      "In un contenitore disponi le zucchine fritte. Aggiungi aglio affettato e foglie di menta.",
      "Versa l'aceto sulle zucchine ancora calde. Copri e lascia marinare almeno 2 ore (meglio tutta la notte). Si servono a temperatura ambiente — sono più buone il giorno dopo.",
    ]
  ),

  // ── PIATTI UNICI COMPLETI ────────────────────────────────────────────────────

  r("piadina-squacquerone-rucola", "Piadina con squacquerone, prosciutto crudo e rucola",
    ["mediterranea", "onnivora"], ["veloce", "regionale", "romagnola"],
    10, "beginner", 2,
    [
      ing("piadine romagnole", 2, "pz", "Cereali"),
      ing("squacquerone o stracchino", 150, "g", "Latticini"),
      ing("prosciutto crudo", 80, "g", "Proteine"),
      ing("rucola", 40, "g", "Verdure"),
      ing("olio extravergine", 1, "cucchiaio", "Dispensa"),
    ],
    [
      "Scalda la piadina in una padella antiaderente calda per 1 minuto per lato finché leggermente dorata e morbida.",
      "Spalca lo squacquerone generosamente su tutta la superficie. Distribuisci il prosciutto crudo. Aggiungi la rucola condita con olio e sale.",
      "Chiudi a metà o arrotola. Servi subito — è ottima calda.",
    ]
  ),

  r("panino-gourmet-pollo", "Panino con pollo alla griglia, avocado e senape al miele",
    ["mediterranea", "onnivora"], ["veloce", "completo", "pranzo"],
    18, "beginner", 2,
    [
      ing("pane ciabatta o panini", 2, "pz", "Cereali"),
      ing("petti di pollo", 250, "g", "Proteine"),
      ing("avocado", 1, "pz", "Verdure"),
      ing("lattuga", 2, "foglie", "Verdure"),
      ing("pomodori", 1, "pz", "Verdure"),
      ing("senape di Digione", 1, "cucchiaio", "Dispensa"),
      ing("miele", 1, "cucchiaino", "Dispensa"),
      ing("olio extravergine", 1, "cucchiaio", "Dispensa"),
    ],
    [
      "Batti il pollo a 1cm di spessore. Condisci con olio, sale e pepe. Cuoci in padella grill 4 minuti per lato. Lascia riposare 2 minuti poi affetta.",
      "Prepara la salsa: mescola senape e miele. Taglia l'avocado a fette.",
      "Tosta i panini. Spalca la salsa senape-miele su entrambe le metà. Componi con lattuga, pomodoro, avocado e pollo. Servi subito.",
    ]
  ),

  r("uova-benedict-semplice", "Uova in camicia su pane tostato con spinaci",
    ["mediterranea", "vegetariana"], ["brunch", "veloce", "proteico"],
    15, "beginner", 2,
    [
      ing("uova fresche", 4, "pz", "Proteine"),
      ing("pane a cassetta o brioche tostate", 4, "fette", "Cereali"),
      ing("spinaci freschi", 150, "g", "Verdure"),
      ing("aceto di vino bianco", 2, "cucchiai", "Dispensa"),
      ing("burro", 15, "g", "Latticini"),
      ing("sale e pepe", 1, "pizzico", "Dispensa"),
    ],
    [
      "Appassisci gli spinaci in padella con il burro per 2 minuti. Sala.",
      "Porta a bollore una pentola d'acqua con l'aceto. Abbassa a fuoco basso (non deve bollire vivacemente). Crea un mulinello con un cucchiaio. Rompi delicatamente un uovo in una ciotolina, poi fallo scivolare nel mulinello. Cuoci 3 minuti. Scola con una schiumarola. Ripeti per ogni uovo.",
      "Tosta il pane. Disponi su ogni fetta gli spinaci, poi l'uovo in camicia. Condisci con sale, pepe e un filo d'olio.",
    ]
  ),

  r("frittata-erbe-formaggi", "Frittata alle erbe fresche e formaggi misti",
    ["mediterranea", "vegetariana"], ["veloce", "economica"],
    15, "beginner", 2,
    [
      ing("uova fresche", 5, "pz", "Proteine"),
      ing("prezzemolo fresco", 1, "ciuffo", "Verdure"),
      ing("erba cipollina", 1, "ciuffo", "Verdure"),
      ing("formaggio morbido (stracchino o ricotta)", 60, "g", "Latticini"),
      ing("parmigiano grattugiato", 20, "g", "Latticini"),
      ing("olio extravergine", 2, "cucchiai", "Dispensa"),
    ],
    [
      "Sbatti le uova con parmigiano, prezzemolo e erba cipollina tritati, sale e pepe.",
      "Scalda l'olio in padella antiaderente a fuoco medio. Versa le uova. Distribuisci il formaggio morbido a cucchiaiate sulla superficie.",
      "Cuoci 4-5 minuti finché i bordi sono sodi. Gira con un piatto e cuoci altri 2-3 minuti. Servi a spicchi.",
    ]
  ),

  r("cous-cous-verdure-harissa", "Cous cous con verdure arrostite e salsa piccante",
    ["mediterranea", "vegetariana", "vegana"], ["veloce", "estivo", "speziato"],
    22, "beginner", 2,
    [
      ing("cous cous", 180, "g", "Cereali"),
      ing("zucchine", 1, "pz", "Verdure"),
      ing("melanzane", 1, "pz", "Verdure"),
      ing("peperoni", 1, "pz", "Verdure"),
      ing("cipolla rossa", 1, "pz", "Verdure"),
      ing("cumino in polvere", 1, "cucchiaino", "Dispensa"),
      ing("paprika affumicata", 1, "cucchiaino", "Dispensa"),
      ing("olio extravergine", 4, "cucchiai", "Dispensa"),
      ing("limone", 1, "pz", "Verdure"),
    ],
    [
      "Taglia tutte le verdure a pezzi irregolari. Condisci con olio, cumino, paprika, sale e pepe. Arrostisci in forno a 210°C per 20 minuti finché caramellate.",
      "Reidrata il cous cous con acqua bollente salata (stesso volume). Copri 5 minuti, sgrana con forchetta.",
      "Unisci cous cous e verdure arrostite. Condisci con succo di limone e olio crudo. Aggiusta di sale.",
    ]
  ),

  // ── ZUPPE AGGIUNTIVE ─────────────────────────────────────────────────────────

  r("vellutata-carote-zenzero", "Vellutata di carote e zenzero",
    ["mediterranea", "vegetariana", "vegana"], ["invernale", "comfort", "light"],
    25, "beginner", 4,
    [
      ing("carote", 600, "g", "Verdure"),
      ing("cipolla dorata", 1, "pz", "Verdure"),
      ing("zenzero fresco", 3, "cm", "Dispensa"),
      ing("brodo vegetale", 600, "ml", "Dispensa"),
      ing("latte di cocco", 100, "ml", "Dispensa"),
      ing("olio extravergine", 2, "cucchiai", "Dispensa"),
      ing("limone", 0.5, "pz", "Verdure"),
    ],
    [
      "Scalda l'olio in una pentola. Soffriggi cipolla 5 minuti. Aggiungi carote a rondelle e zenzero grattugiato. Cuoci 3 minuti.",
      "Versa il brodo. Porta a bollore, cuoci 18 minuti finché le carote sono morbide.",
      "Frulla fino a crema liscia. Aggiungi il latte di cocco e il succo di limone. Aggiusta di sale. Riscalda e servi con un filo d'olio.",
    ]
  ),

  r("zuppa-farro-funghi", "Zuppa di farro e funghi secchi",
    ["mediterranea", "vegetariana", "vegana"], ["invernale", "comfort", "nutriente"],
    35, "beginner", 4,
    [
      ing("farro perlato", 200, "g", "Cereali"),
      ing("funghi porcini secchi", 20, "g", "Dispensa"),
      ing("cipolla", 1, "pz", "Verdure"),
      ing("carote", 2, "pz", "Verdure"),
      ing("sedano", 1, "gambo", "Verdure"),
      ing("pomodori pelati", 150, "g", "Dispensa"),
      ing("rosmarino fresco", 1, "rametto", "Verdure"),
      ing("olio extravergine", 3, "cucchiai", "Dispensa"),
    ],
    [
      "Ammolla i funghi in 300ml di acqua tiepida per 20 minuti. Scola (tieni l'acqua filtrata) e trita.",
      "Soffriggi cipolla, carota e sedano in olio 7 minuti. Aggiungi funghi, pelati e farro. Versa l'acqua dei funghi filtrata e 800ml di acqua. Rosmarino.",
      "Porta a bollore, poi cuoci a fuoco basso 25-28 minuti finché il farro è cotto. Aggiusta di sale. La zuppa deve essere densa. Finisci con olio crudo.",
    ]
  ),

  r("acquacotta-maremmana", "Acquacotta maremmana con uovo",
    ["mediterranea", "vegetariana"], ["invernale", "regionale", "economica", "toscana"],
    30, "beginner", 2,
    [
      ing("cipolla dorata", 2, "pz", "Verdure"),
      ing("pomodori pelati", 200, "g", "Dispensa"),
      ing("sedano", 2, "gambi", "Verdure"),
      ing("uova fresche", 2, "pz", "Proteine"),
      ing("pane di campagna raffermo", 4, "fette", "Cereali"),
      ing("pecorino grattugiato", 40, "g", "Latticini"),
      ing("olio extravergine", 4, "cucchiai", "Dispensa"),
    ],
    [
      "Scalda l'olio in una pentola a fuoco medio. Soffriggi cipolla e sedano affettati per 10 minuti finché appassiscono. Aggiungi i pelati schiacciati. Cuoci 5 minuti. Copri con 800ml di acqua salata. Cuoci 15 minuti.",
      "Abbassa la fiamma al minimo. Rompi le uova direttamente nella zuppa. Copri e cuoci 4-5 minuti finché il bianco è cotto ma il tuorlo ancora morbido.",
      "Metti il pane tostato nelle ciotole. Versa la zuppa con l'uovo sopra. Cospargili di pecorino e olio crudo.",
    ]
  ),

  r("crema-lenticchie-rossa", "Crema di lenticchie rosse con crostini all'aglio",
    ["mediterranea", "vegetariana", "vegana"], ["invernale", "economica", "comfort"],
    25, "beginner", 2,
    [
      ing("lenticchie rosse decorticate", 200, "g", "Proteine"),
      ing("cipolla dorata", 1, "pz", "Verdure"),
      ing("carote", 2, "pz", "Verdure"),
      ing("cumino in polvere", 1, "cucchiaino", "Dispensa"),
      ing("paprika dolce", 1, "cucchiaino", "Dispensa"),
      ing("brodo vegetale", 700, "ml", "Dispensa"),
      ing("pane di campagna", 4, "fette", "Cereali"),
      ing("aglio", 2, "spicchi", "Verdure"),
      ing("olio extravergine", 3, "cucchiai", "Dispensa"),
    ],
    [
      "Soffriggi cipolla e carote in olio 5 minuti. Aggiungi cumino e paprika, cuoci 1 minuto. Aggiungi le lenticchie e il brodo. Cuoci 15-18 minuti finché si sfaldano.",
      "Frulla fino a crema liscia. Aggiusta di sale.",
      "Tosta le fette di pane. Strofina con aglio crudo. Servi la crema con i crostini e un filo d'olio.",
    ]
  ),

  r("minestrone-invernale-kale", "Minestrone invernale con cavolo kale e orzo",
    ["mediterranea", "vegetariana", "vegana"], ["invernale", "nutriente", "comfort"],
    35, "beginner", 4,
    [
      ing("cavolo kale o cavolo nero", 200, "g", "Verdure"),
      ing("patate", 2, "pz", "Verdure"),
      ing("carote", 2, "pz", "Verdure"),
      ing("cipolla", 1, "pz", "Verdure"),
      ing("orzo perlato", 100, "g", "Cereali"),
      ing("ceci in lattina", 240, "g", "Proteine"),
      ing("pomodori pelati", 200, "g", "Dispensa"),
      ing("olio extravergine", 3, "cucchiai", "Dispensa"),
    ],
    [
      "Soffriggi cipolla e carote in olio 5 minuti. Aggiungi patate a cubetti, i pelati e 1.2 litri di acqua. Porta a bollore.",
      "Aggiungi l'orzo e i ceci. Cuoci 15 minuti. Aggiungi il cavolo kale a striscioline (togli le costole dure). Cuoci altri 10 minuti.",
      "Aggiusta di sale. Finisci con olio extravergine crudo.",
    ]
  ),

  // ── INSALATE AGGIUNTIVE ──────────────────────────────────────────────────────

  r("insalata-farro-verdure", "Insalata di farro con verdure grigliate e feta",
    ["mediterranea", "vegetariana"], ["freddo", "meal prep", "estivo"],
    30, "beginner", 2,
    [
      ing("farro perlato", 160, "g", "Cereali"),
      ing("zucchine", 2, "pz", "Verdure"),
      ing("peperoni", 1, "pz", "Verdure"),
      ing("feta", 100, "g", "Latticini"),
      ing("olive nere", 50, "g", "Dispensa"),
      ing("menta fresca", 6, "foglie", "Verdure"),
      ing("olio extravergine", 3, "cucchiai", "Dispensa"),
      ing("aceto di vino rosso", 1, "cucchiaio", "Dispensa"),
    ],
    [
      "Cuoci il farro in acqua salata per 25 minuti. Scola e lascia raffreddare.",
      "Grigliala le zucchine e i peperoni tagliati a fette in padella grill con un filo d'olio. 3 minuti per lato. Sala.",
      "In una ciotola unisci farro, verdure grigliate tagliate a pezzi, olive e feta sbriciolata. Condisci con olio, aceto, menta, sale e pepe.",
    ]
  ),

  r("insalata-pollo-mango", "Insalata di pollo con mango e rucola",
    ["mediterranea", "onnivora"], ["estivo", "light", "fruttato"],
    18, "beginner", 2,
    [
      ing("petti di pollo", 250, "g", "Proteine"),
      ing("rucola", 80, "g", "Verdure"),
      ing("mango maturo", 1, "pz", "Verdure"),
      ing("pomodori ciliegia", 100, "g", "Verdure"),
      ing("limone", 1, "pz", "Verdure"),
      ing("olio extravergine", 2, "cucchiai", "Dispensa"),
      ing("paprika dolce", 0.5, "cucchiaino", "Dispensa"),
    ],
    [
      "Condisci il pollo con olio, paprika, sale e pepe. Cuoci in padella 5-6 minuti per lato. Lascia riposare 3 minuti e affetta.",
      "Pela il mango e taglialo a cubetti. Dimezza i pomodorini.",
      "Disponi la rucola nel piatto. Aggiungi mango, pomodorini e pollo ancora tiepido. Condisci con olio e succo di limone.",
    ]
  ),

  r("insalata-bulgur-pomodori-secchi", "Insalata di bulgur con pomodori secchi e olive",
    ["mediterranea", "vegetariana", "vegana"], ["freddo", "meal prep", "saporita"],
    18, "beginner", 2,
    [
      ing("bulgur", 160, "g", "Cereali"),
      ing("pomodori secchi sott'olio", 60, "g", "Dispensa"),
      ing("olive verdi denocciolate", 60, "g", "Dispensa"),
      ing("cipolla rossa", 0.5, "pz", "Verdure"),
      ing("prezzemolo fresco", 1, "ciuffo", "Verdure"),
      ing("limone", 1, "pz", "Verdure"),
      ing("olio extravergine", 3, "cucchiai", "Dispensa"),
    ],
    [
      "Reidrata il bulgur con acqua bollente salata. Copri 10 minuti, sgrana e lascia raffreddare.",
      "Trita i pomodori secchi. Affetta le olive e la cipolla rossa.",
      "Unisci tutto in una ciotola. Condisci con succo di limone, olio, prezzemolo tritato, sale e pepe. Lascia riposare 10 minuti.",
    ]
  ),

  r("insalata-mare-mista", "Insalata di mare con rucola e limone",
    ["mediterranea", "onnivora"], ["pesce", "estivo", "freddo"],
    25, "beginner", 2,
    [
      ing("gamberetti cotti", 150, "g", "Proteine"),
      ing("seppie pulite", 150, "g", "Proteine"),
      ing("cozze sgusciate cotte", 100, "g", "Proteine"),
      ing("rucola", 60, "g", "Verdure"),
      ing("sedano", 2, "gambi", "Verdure"),
      ing("limone", 1, "pz", "Verdure"),
      ing("aglio", 1, "spicchio", "Verdure"),
      ing("olio extravergine", 4, "cucchiai", "Dispensa"),
      ing("prezzemolo fresco", 1, "ciuffo", "Verdure"),
    ],
    [
      "Cuoci le seppie: tagliale ad anelli e sbollentale in acqua salata per 8-10 minuti finché tenere. Raffredda.",
      "In una ciotola unisci gamberetti, seppie e cozze. Aggiungi sedano a fettine sottili.",
      "Condisci con olio abbondante, succo di limone, aglio tritato finissimo e prezzemolo. Mescola bene. Lascia marinare 15 minuti. Servi sulla rucola.",
    ]
  ),

  // ── PIATTI DA FORNO AGGIUNTIVI ───────────────────────────────────────────────

  r("moussaka-greca", "Moussaka greca con melanzane e agnello",
    ["mediterranea", "onnivora"], ["domenica", "speciale", "greco", "forno"],
    65, "intermediate", 4,
    [
      ing("melanzane", 2, "pz", "Verdure"),
      ing("carne macinata mista (manzo e maiale)", 400, "g", "Proteine"),
      ing("cipolla", 1, "pz", "Verdure"),
      ing("pomodori pelati", 300, "g", "Dispensa"),
      ing("cannella in polvere", 0.5, "cucchiaino", "Dispensa"),
      ing("latte intero", 400, "ml", "Latticini"),
      ing("farina 00", 35, "g", "Dispensa"),
      ing("burro", 35, "g", "Latticini"),
      ing("parmigiano o kefalotiri grattugiato", 60, "g", "Latticini"),
      ing("olio extravergine", 4, "cucchiai", "Dispensa"),
    ],
    [
      "Taglia le melanzane a fette di 1cm. Spennella con olio e inforna a 220°C per 15 minuti. Oppure friggile in olio.",
      "Ragù: soffriggi cipolla, aggiungi carne e rosola 8 minuti. Aggiungi pelati, cannella, sale. Cuoci 15 minuti.",
      "Besciamella: burro, farina, latte caldo. Cuoci 7 minuti. Aggiusta di sale.",
      "In una pirofila: strato di melanzane, ragù, melanzane, ragù. Copri con besciamella e parmigiano. Inforna a 180°C per 35-40 minuti. Lascia riposare 15 minuti prima di servire.",
    ]
  ),

  r("torta-salata-verdure", "Torta salata con verdure e ricotta",
    ["mediterranea", "vegetariana"], ["forno", "pranzo", "economica"],
    40, "beginner", 4,
    [
      ing("pasta brisée o sfoglia pronta", 1, "rotolo", "Cereali"),
      ing("zucchine", 2, "pz", "Verdure"),
      ing("peperoni", 1, "pz", "Verdure"),
      ing("ricotta fresca", 250, "g", "Latticini"),
      ing("uova fresche", 2, "pz", "Proteine"),
      ing("parmigiano grattugiato", 40, "g", "Latticini"),
      ing("olio extravergine", 2, "cucchiai", "Dispensa"),
    ],
    [
      "Preriscalda il forno a 180°C. Salta le verdure tagliate a cubetti in padella con olio per 5 minuti. Sala. Lascia intiepidire.",
      "Mescola ricotta, uova, parmigiano, sale e pepe. Aggiungi le verdure.",
      "Stendi la pasta in uno stampo da 24cm imburrato. Versa il ripieno. Ripiega i bordi. Inforna 30-35 minuti finché la superficie è dorata. Ottima calda o tiepida.",
    ]
  ),

  r("focaccia-pomodoro-olive", "Focaccia alta con pomodorini e olive",
    ["mediterranea", "vegetariana", "vegana"], ["forno", "regionale", "pugliese"],
    45, "intermediate", 6,
    [
      ing("farina 00", 400, "g", "Dispensa"),
      ing("lievito di birra secco", 7, "g", "Dispensa"),
      ing("pomodori ciliegia", 200, "g", "Verdure"),
      ing("olive nere", 80, "g", "Dispensa"),
      ing("origano secco", 2, "cucchiaini", "Dispensa"),
      ing("olio extravergine", 6, "cucchiai", "Dispensa"),
    ],
    [
      "Mescola farina, lievito, 1 cucchiaino di sale e 250ml di acqua tiepida. Aggiungi 3 cucchiai di olio. Impasta 10 minuti finché liscio ed elastico. Copri e lascia lievitare 1 ora.",
      "Ungi una teglia con olio abbondante. Stendi l'impasto premendo con le dita — la caratteristica delle focaccine nell'olio. Lascia riposare 20 minuti.",
      "Premi i pomodorini e le olive nell'impasto. Condisci con olio abbondante, origano e sale grosso. Inforna a 200°C per 20-25 minuti finché dorata e croccante sotto.",
    ]
  ),

  r("quiche-lorraine", "Quiche lorraine con pancetta e gruyère",
    ["mediterranea", "onnivora"], ["forno", "francese", "pranzo"],
    45, "intermediate", 4,
    [
      ing("pasta brisée pronta", 1, "rotolo", "Cereali"),
      ing("pancetta tesa a cubetti", 150, "g", "Proteine"),
      ing("panna fresca", 200, "ml", "Latticini"),
      ing("uova fresche", 3, "pz", "Proteine"),
      ing("gruyère o emmenthal grattugiato", 100, "g", "Latticini"),
    ],
    [
      "Preriscalda il forno a 180°C. Stendi la pasta brisée in uno stampo da 24cm. Copri con carta forno e fagioli secchi (cottura in bianco). Inforna 10 minuti, rimuovi pesi e cuoci altri 5 minuti.",
      "Rosola la pancetta in padella senza grassi finché croccante.",
      "Sbatti uova, panna, sale e pepe. Aggiungi il gruyère e la pancetta. Versa nel guscio di pasta. Inforna 25-30 minuti finché il ripieno è sodo e dorato. Lascia intiepidire 10 minuti prima di tagliare.",
    ]
  ),

  r("pizza-casalinga-margherita", "Pizza casalinga margherita",
    ["mediterranea", "vegetariana", "onnivora"], ["domenica", "forno", "classico"],
    50, "intermediate", 4,
    [
      ing("farina 00 o manitoba", 400, "g", "Dispensa"),
      ing("lievito di birra secco", 7, "g", "Dispensa"),
      ing("passata di pomodoro", 200, "g", "Dispensa"),
      ing("mozzarella fiordilatte", 250, "g", "Latticini"),
      ing("basilico fresco", 8, "foglie", "Verdure"),
      ing("olio extravergine", 3, "cucchiai", "Dispensa"),
    ],
    [
      "Impasto: sciogli il lievito in 250ml di acqua tiepida. Unisci alla farina con 1 cucchiaino di sale e 2 cucchiai di olio. Impasta 10 minuti. Copri e lascia lievitare 1 ora a temperatura ambiente (o tutta la notte in frigo).",
      "Dividi in 2 palline. Stendi su carta forno in teglie unte, allargando con le mani — non col mattarello. Lo spessore deve essere 4-5mm.",
      "Condisci con passata, un filo d'olio e sale. Inforna a 250°C (forno al massimo) per 8 minuti. Aggiungi la mozzarella a pezzi e cuoci altri 4-5 minuti. Finisci con basilico fresco.",
    ]
  ),

  // ── RICETTE VELOCI EXTRA ─────────────────────────────────────────────────────

  r("toast-prosciutto-formaggio", "Toast prosciutto cotto e formaggio filante",
    ["mediterranea", "onnivora"], ["veloce", "economica", "pranzo"],
    8, "beginner", 2,
    [
      ing("pane a cassetta", 4, "fette", "Cereali"),
      ing("prosciutto cotto", 80, "g", "Proteine"),
      ing("formaggio a fette (emmenthal o scamorza)", 60, "g", "Latticini"),
      ing("burro", 10, "g", "Latticini"),
    ],
    [
      "Scalda il tostapane o una padella antiaderente a fuoco medio.",
      "Componi il toast: su una fetta di pane metti il prosciutto e il formaggio. Copri con l'altra fetta. Spalca l'esterno con il burro.",
      "Cuoci in padella 2-3 minuti per lato premendo leggermente con una spatola finché dorato e il formaggio è filante. Taglia in diagonale e servi subito.",
    ]
  ),

  r("insalata-capricciosa", "Insalata capricciosa con pollo e verdure miste",
    ["mediterranea", "onnivora"], ["freddo", "light", "veloce"],
    15, "beginner", 2,
    [
      ing("petti di pollo", 200, "g", "Proteine"),
      ing("lattuga mista o misticanza", 100, "g", "Verdure"),
      ing("carote", 1, "pz", "Verdure"),
      ing("cetriolo", 1, "pz", "Verdure"),
      ing("mais in lattina", 80, "g", "Dispensa"),
      ing("olio extravergine", 2, "cucchiai", "Dispensa"),
      ing("aceto di vino bianco", 1, "cucchiaio", "Dispensa"),
    ],
    [
      "Cuoci il pollo in padella con poco olio, sale e pepe. 5-6 minuti per lato. Lascia raffreddare e taglia a striscette.",
      "Prepara le verdure: carote a julienne, cetriolo a rondelle.",
      "Disponi la lattuga nel piatto. Aggiungi tutte le verdure, il mais e il pollo. Condisci con olio, aceto, sale e pepe.",
    ]
  ),

  r("frittata-asparagi-speck", "Frittata di asparagi e speck",
    ["mediterranea", "onnivora"], ["primaverile", "veloce"],
    20, "beginner", 2,
    [
      ing("uova fresche", 5, "pz", "Proteine"),
      ing("asparagi", 200, "g", "Verdure"),
      ing("speck a listarelle", 60, "g", "Proteine"),
      ing("parmigiano grattugiato", 25, "g", "Latticini"),
      ing("olio extravergine", 2, "cucchiai", "Dispensa"),
    ],
    [
      "Spunta gli asparagi e tagliali a rondelle. Rosola lo speck in padella senza grassi finché croccante. Aggiungi gli asparagi e cuoci 4 minuti. Sala poco (lo speck è sapido).",
      "Sbatti le uova con parmigiano, sale e pepe. Versa sugli asparagi e speck.",
      "Cuoci 4-5 minuti a fuoco medio finché i bordi sono sodi. Gira con un piatto e cuoci altri 3 minuti.",
    ]
  ),

  r("pasta-ricotta-pomodori-secchi", "Pasta con ricotta, pomodori secchi e basilico",
    ["mediterranea", "vegetariana"], ["veloce", "cremosa", "estivo"],
    18, "beginner", 2,
    [
      ing("pasta (rigatoni o fusilli)", 180, "g", "Cereali"),
      ing("ricotta fresca", 150, "g", "Latticini"),
      ing("pomodori secchi sott'olio", 60, "g", "Dispensa"),
      ing("basilico fresco", 8, "foglie", "Verdure"),
      ing("parmigiano grattugiato", 20, "g", "Latticini"),
      ing("olio extravergine", 2, "cucchiai", "Dispensa"),
    ],
    [
      "Cuoci la pasta in acqua salata. Tieni acqua di cottura.",
      "In una ciotola grande stempera la ricotta con 4-5 cucchiai di acqua di cottura calda, olio e parmigiano. Mescola finché cremosa.",
      "Scola la pasta al dente e versala nella ciotola con la crema di ricotta. Aggiungi i pomodori secchi tagliati a striscioline e il basilico. Mescola velocemente.",
    ]
  ),

  r("wrap-pollo-verdure", "Wrap di pollo alla griglia con hummus e verdure",
    ["mediterranea", "onnivora"], ["veloce", "pranzo", "light"],
    18, "beginner", 2,
    [
      ing("piadine o wrap", 2, "pz", "Cereali"),
      ing("petti di pollo", 200, "g", "Proteine"),
      ing("hummus", 80, "g", "Proteine"),
      ing("lattuga", 2, "foglie", "Verdure"),
      ing("pomodori", 1, "pz", "Verdure"),
      ing("cetriolo", 0.5, "pz", "Verdure"),
      ing("paprika dolce", 0.5, "cucchiaino", "Dispensa"),
      ing("olio extravergine", 1, "cucchiaio", "Dispensa"),
    ],
    [
      "Condisci il pollo con olio, paprika, sale e pepe. Cuoci in padella grill 4-5 minuti per lato. Affetta.",
      "Scalda le piadine 30 secondi per lato in padella.",
      "Spalca l'hummus su ogni piadina. Aggiungi lattuga, pomodori a fettine, cetriolo e pollo. Arrotola stretto e taglia a metà.",
    ]
  ),

  r("riso-primavera", "Riso primavera con piselli, asparagi e menta",
    ["mediterranea", "vegetariana"], ["primaverile", "light", "veloce"],
    22, "beginner", 2,
    [
      ing("riso basmati", 170, "g", "Cereali"),
      ing("piselli surgelati", 150, "g", "Verdure"),
      ing("asparagi", 150, "g", "Verdure"),
      ing("cipollotto", 2, "pz", "Verdure"),
      ing("menta fresca", 6, "foglie", "Verdure"),
      ing("limone", 0.5, "pz", "Verdure"),
      ing("olio extravergine", 2, "cucchiai", "Dispensa"),
      ing("parmigiano grattugiato", 20, "g", "Latticini"),
    ],
    [
      "Cuoci il riso. Spunta gli asparagi e tagliali a pezzi. In una padella scalda l'olio con il cipollotto affettato per 2 minuti. Aggiungi asparagi e piselli. Cuoci 5 minuti. Sala.",
      "Unisci il riso alle verdure. Aggiungi succo di limone, menta spezzettata e parmigiano. Mescola e servi.",
    ]
  ),


  // ── ULTRA VELOCI (sotto 15 min) ──────────────────────────────────────────────

  r("uova-prosciutto-parmigiano", "Uova al tegamino con prosciutto crudo e parmigiano",
    ["mediterranea", "onnivora"], ["veloce", "economica", "pranzo"],
    8, "beginner", 2,
    [
      ing("uova fresche", 4, "pz", "Proteine"),
      ing("prosciutto crudo", 60, "g", "Proteine"),
      ing("parmigiano a scaglie", 30, "g", "Latticini"),
      ing("burro", 15, "g", "Latticini"),
    ],
    [
      "Scalda il burro in una padella antiaderente a fuoco medio. Adagia le fette di prosciutto e scaldali 30 secondi per lato.",
      "Rompi le uova direttamente sopra il prosciutto. Sala leggermente il bianco (non il tuorlo). Copri con un coperchio e cuoci 3-4 minuti — il bianco deve essere sodo, il tuorlo ancora morbido.",
      "Distribuisci le scaglie di parmigiano sopra e servi subito direttamente dalla padella.",
    ]
  ),

  r("avocado-toast-uovo", "Avocado toast con uovo in camicia e sesamo",
    ["mediterranea", "vegetariana"], ["veloce", "trendy", "brunch"],
    12, "beginner", 2,
    [
      ing("pane a cassetta o pane integrale", 4, "fette", "Cereali"),
      ing("avocado maturo", 2, "pz", "Verdure"),
      ing("uova fresche", 2, "pz", "Proteine"),
      ing("limone", 0.5, "pz", "Verdure"),
      ing("sesamo tostato", 1, "cucchiaino", "Dispensa"),
      ing("aceto di vino bianco", 1, "cucchiaio", "Dispensa"),
      ing("peperoncino in fiocchi", 1, "pizzico", "Dispensa"),
    ],
    [
      "Tosta il pane. Schiaccia l'avocado con una forchetta, condisci con succo di limone, sale e pepe. Spalca sulle fette di pane tostate.",
      "Uova in camicia: porta a ebollizione acqua con l'aceto. Abbassa la fiamma. Crea un mulinello, rompi l'uovo in una ciotolina e fallo scivolare nell'acqua. Cuoci 3 minuti. Scola.",
      "Adagia l'uovo in camicia sull'avocado toast. Finisci con sesamo, peperoncino in fiocchi e un filo d'olio.",
    ]
  ),

  r("bruschetta-pomodoro-classica", "Bruschetta al pomodoro fresco e basilico",
    ["mediterranea", "vegetariana", "vegana"], ["veloce", "estivo", "economica"],
    10, "beginner", 2,
    [
      ing("pane di campagna", 4, "fette", "Cereali"),
      ing("pomodori maturi", 3, "pz", "Verdure"),
      ing("aglio", 1, "spicchio", "Verdure"),
      ing("basilico fresco", 8, "foglie", "Verdure"),
      ing("olio extravergine", 3, "cucchiai", "Dispensa"),
    ],
    [
      "Taglia i pomodori a cubetti piccoli. Condisci con olio, sale, pepe e basilico spezzettato. Lascia riposare 5 minuti.",
      "Tosta il pane in padella o nel forno a 200°C per 5 minuti. Ancora caldo, strofinalo con lo spicchio d'aglio tagliato a metà.",
      "Distribuisci il pomodoro condito sulle fette di pane. Aggiungi altro olio crudo. Servi immediatamente — se aspetti troppo il pane si ammorbidisce.",
    ]
  ),

  r("insalata-tonno-veloce", "Insalata tonno, mais e cetriolo in 5 minuti",
    ["mediterranea", "onnivora"], ["veloce", "economica", "freddo"],
    5, "beginner", 2,
    [
      ing("tonno sott'olio di qualità", 200, "g", "Proteine"),
      ing("mais in lattina", 120, "g", "Dispensa"),
      ing("cetriolo", 1, "pz", "Verdure"),
      ing("cipolla rossa", 0.25, "pz", "Verdure"),
      ing("olio extravergine", 2, "cucchiai", "Dispensa"),
      ing("aceto di vino bianco", 1, "cucchiaio", "Dispensa"),
    ],
    [
      "Scola tonno e mais. Taglia il cetriolo a cubetti e la cipolla rossa a fettine sottili.",
      "Unisci tutto in una ciotola. Condisci con olio, aceto, sale e pepe. Mescola. Pronto in 5 minuti.",
    ]
  ),

  r("pasta-burro-parmigiano", "Pasta burro e parmigiano",
    ["mediterranea", "vegetariana"], ["veloce", "economica", "classico"],
    12, "beginner", 2,
    [
      ing("pasta (spaghetti o rigatoni)", 180, "g", "Cereali"),
      ing("burro", 50, "g", "Latticini"),
      ing("parmigiano grattugiato", 60, "g", "Latticini"),
      ing("pepe nero macinato fresco", 1, "pizzico", "Dispensa"),
    ],
    [
      "Cuoci la pasta in abbondante acqua salata. Scola al dente tenendo una tazza di acqua di cottura.",
      "Fuori dal fuoco, in una ciotola calda, mescola la pasta con il burro freddo a pezzetti. Aggiungi parmigiano abbondante e un mestolino di acqua di cottura. Mescola energicamente finché cremoso. Pepe abbondante.",
    ]
  ),

  r("prosciutto-melone", "Prosciutto crudo e melone",
    ["mediterranea", "onnivora"], ["veloce", "estivo", "freddo"],
    5, "beginner", 2,
    [
      ing("prosciutto crudo", 120, "g", "Proteine"),
      ing("melone cantalupo maturo", 0.5, "pz", "Verdure"),
    ],
    [
      "Taglia il melone a fette eliminando la buccia.",
      "Disponi le fette di melone nel piatto. Adagia il prosciutto crudo sopra o accanto. Il contrasto dolce-salato è tutto il piatto. Pepe nero facoltativo.",
    ]
  ),

  r("carpaccio-manzo-rucola", "Carpaccio di manzo con rucola e parmigiano",
    ["mediterranea", "onnivora"], ["veloce", "light", "freddo"],
    10, "beginner", 2,
    [
      ing("fettine di manzo (scamone o fesa)", 250, "g", "Proteine"),
      ing("rucola", 60, "g", "Verdure"),
      ing("parmigiano a scaglie", 40, "g", "Latticini"),
      ing("limone", 1, "pz", "Verdure"),
      ing("olio extravergine", 3, "cucchiai", "Dispensa"),
    ],
    [
      "Batti le fettine di manzo tra due fogli di carta forno fino a renderle molto sottili (2-3mm). Disponile nel piatto.",
      "Condisci la carne con olio extravergine, succo di limone, sale e pepe. Lascia riposare 2 minuti — il limone 'cuoce' leggermente la carne.",
      "Distribuisci la rucola sopra e finisci con le scaglie di parmigiano e la scorza di limone grattugiata.",
    ]
  ),

  // ── DOMENICALI ELABORATI ─────────────────────────────────────────────────────

  r("agnello-al-forno-rosmarino", "Cosciotto di agnello al forno con rosmarino e aglio",
    ["mediterranea", "onnivora"], ["domenica", "speciale", "pasqua", "regionale"],
    90, "intermediate", 6,
    [
      ing("cosciotto di agnello", 1500, "g", "Proteine"),
      ing("aglio", 6, "spicchi", "Verdure"),
      ing("rosmarino fresco", 3, "rametti", "Verdure"),
      ing("vino bianco secco", 200, "ml", "Dispensa"),
      ing("patate", 800, "g", "Verdure"),
      ing("olio extravergine", 5, "cucchiai", "Dispensa"),
    ],
    [
      "Stecca il cosciotto: fai dei fori profondi con un coltello e inserisci spicchi d'aglio e aghi di rosmarino. Sala e pepa abbondantemente su tutta la superficie. Lascia riposare 30 minuti a temperatura ambiente.",
      "Preriscalda il forno a 200°C. Rosola il cosciotto in una teglia con olio a fuoco alto su tutti i lati, 4-5 minuti per lato.",
      "Aggiungi le patate a spicchi nella teglia. Versa il vino bianco. Inforna per 60-70 minuti, irrorando ogni 20 minuti con i succhi. Abbassa a 180°C dopo i primi 20 minuti.",
      "L'agnello è pronto quando la temperatura interna è 65°C (rosa) o 72°C (ben cotto). Lascia riposare 15 minuti prima di tagliare.",
    ]
  ),

  r("risotto-frutti-di-mare", "Risotto ai frutti di mare",
    ["mediterranea", "onnivora"], ["domenica", "speciale", "pesce", "elegante"],
    45, "intermediate", 4,
    [
      ing("riso carnaroli", 320, "g", "Cereali"),
      ing("cozze fresche", 400, "g", "Proteine"),
      ing("vongole fresche", 300, "g", "Proteine"),
      ing("gamberi freschi o decongelati", 200, "g", "Proteine"),
      ing("vino bianco secco", 150, "ml", "Dispensa"),
      ing("brodo di pesce o vegetale", 800, "ml", "Dispensa"),
      ing("aglio", 2, "spicchi", "Verdure"),
      ing("prezzemolo fresco", 1, "ciuffo", "Verdure"),
      ing("olio extravergine", 4, "cucchiai", "Dispensa"),
    ],
    [
      "Apri cozze e vongole separatamente in padella con un filo d'olio e coperchio. Filtra il liquido. Sguscia la maggior parte lasciandone qualcuna con il guscio.",
      "Prepara il risotto base: tosta il riso nell'olio, sfuma con metà vino bianco. Aggiungi il brodo caldo con il liquido dei molluschi filtrato a mestoli per 16 minuti.",
      "A 3 minuti dalla fine aggiungi i gamberi sgusciati. Nell'ultimo minuto aggiungi cozze e vongole. Manteca con olio crudo abbondante fuori dal fuoco. Finisci con prezzemolo e il vino rimasto.",
    ]
  ),

  r("porchetta-casalinga", "Porchetta casalinga con finocchietto e pepe",
    ["mediterranea", "onnivora"], ["domenica", "speciale", "regionale", "laziale"],
    90, "intermediate", 6,
    [
      ing("lonza di maiale con cotenna", 1200, "g", "Proteine"),
      ing("aglio", 5, "spicchi", "Verdure"),
      ing("rosmarino fresco", 3, "rametti", "Verdure"),
      ing("finocchietto selvatico o semi di finocchio", 2, "cucchiai", "Dispensa"),
      ing("pepe nero macinato abbondante", 2, "cucchiaini", "Dispensa"),
      ing("olio extravergine", 3, "cucchiai", "Dispensa"),
    ],
    [
      "Apri la lonza a libro con un coltello (o chiedi al macellaio). La carne deve formare un rettangolo piatto.",
      "Prepara il ripieno: trita aglio, rosmarino e finocchietto finissimi. Mescola con pepe abbondante e olio. Spalca su tutta la superficie interna.",
      "Arrotola stretto e lega con spago da cucina ogni 3cm. Sala e pepa l'esterno.",
      "Preriscalda il forno a 220°C. Rosola in teglia 5 minuti per lato. Abbassa a 180°C e cuoci 75-80 minuti. La cotenna deve essere croccante. Lascia riposare 15 minuti prima di affettare.",
    ]
  ),

  r("pesce-spada-salmoriglio", "Pesce spada alla griglia con salmoriglio",
    ["mediterranea", "onnivora"], ["pesce", "estivo", "siciliana", "veloce"],
    18, "beginner", 2,
    [
      ing("tranci di pesce spada", 350, "g", "Proteine"),
      ing("limone", 2, "pz", "Verdure"),
      ing("aglio", 1, "spicchio", "Verdure"),
      ing("origano secco", 2, "cucchiaini", "Dispensa"),
      ing("prezzemolo fresco", 1, "ciuffo", "Verdure"),
      ing("olio extravergine", 5, "cucchiai", "Dispensa"),
    ],
    [
      "Prepara il salmoriglio: emulsiona olio, succo di limone, aglio tritato finissimo, origano e prezzemolo con una frusta o forchetta. Sala e pepa.",
      "Scalda la padella grill a fuoco altissimo. Asciuga il pesce spada e condisci con poco olio. Cuoci 3-4 minuti per lato — si formano le striature e l'interno resta umido.",
      "Disponi nel piatto e versa il salmoriglio abbondante sopra. Il contrasto caldo-freddo esalta i sapori. Servi con pane per raccogliere il condimento.",
    ]
  ),

  r("teglia-agnello-verdure", "Teglia di agnello con carciofi e patate",
    ["mediterranea", "onnivora"], ["domenica", "speciale", "primaverile"],
    65, "beginner", 4,
    [
      ing("agnello a pezzi", 800, "g", "Proteine"),
      ing("patate", 500, "g", "Verdure"),
      ing("carciofi", 4, "pz", "Verdure"),
      ing("aglio", 4, "spicchi", "Verdure"),
      ing("rosmarino fresco", 2, "rametti", "Verdure"),
      ing("limone", 1, "pz", "Verdure"),
      ing("vino bianco", 100, "ml", "Dispensa"),
      ing("olio extravergine", 4, "cucchiai", "Dispensa"),
    ],
    [
      "Pulisci i carciofi: togli le foglie dure esterne, taglia le punte, dividili a metà e rimuovi il fieno. Mettili in acqua e limone per non annerire.",
      "In una teglia capiente disponi l'agnello, le patate a spicchi e i carciofi. Aggiungi aglio, rosmarino, olio, vino bianco, sale e pepe. Mescola tutto con le mani.",
      "Inforna a 200°C per 50-55 minuti mescolando a metà cottura. La carne deve essere morbida e le verdure dorate. Irrorare con i succhi ogni 20 minuti.",
    ]
  ),

  // ── VEGANI AGGIUNTIVI ────────────────────────────────────────────────────────

  r("buddha-bowl-completa", "Buddha bowl con quinoa, verdure arrostite e tahini",
    ["vegana", "vegetariana", "mediterranea"], ["meal prep", "nutriente", "completo"],
    28, "beginner", 2,
    [
      ing("quinoa", 160, "g", "Cereali"),
      ing("ceci in lattina", 240, "g", "Proteine"),
      ing("cavolo rosso", 150, "g", "Verdure"),
      ing("carote", 2, "pz", "Verdure"),
      ing("avocado", 1, "pz", "Verdure"),
      ing("tahini", 2, "cucchiai", "Dispensa"),
      ing("limone", 1, "pz", "Verdure"),
      ing("olio extravergine", 3, "cucchiai", "Dispensa"),
      ing("sesamo tostato", 1, "cucchiaino", "Dispensa"),
    ],
    [
      "Cuoci la quinoa. Arrostisci i ceci con olio e paprika a 200°C per 18 minuti finché croccanti.",
      "Affetta il cavolo rosso sottile e condiscilo con limone e sale — si ammorbidisce leggermente. Grattugia le carote.",
      "Salsa tahini: mescola tahini con succo di limone e acqua finché cremosa.",
      "Componi la bowl: quinoa alla base, cavolo, carote, avocado a fette e ceci croccanti in spicchi separati. Versa la salsa tahini e finisci con sesamo.",
    ]
  ),

  r("dahl-lenticchie-cocco", "Dahl di lenticchie rosse con latte di cocco",
    ["mediterranea", "vegana", "vegetariana"], ["speziato", "comfort", "economica"],
    25, "beginner", 2,
    [
      ing("lenticchie rosse decorticate", 200, "g", "Proteine"),
      ing("latte di cocco", 200, "ml", "Dispensa"),
      ing("cipolla", 1, "pz", "Verdure"),
      ing("aglio", 2, "spicchi", "Verdure"),
      ing("zenzero fresco", 2, "cm", "Dispensa"),
      ing("curry in polvere", 2, "cucchiaini", "Dispensa"),
      ing("cumino in semi", 1, "cucchiaino", "Dispensa"),
      ing("spinaci freschi", 100, "g", "Verdure"),
      ing("olio di semi di girasole", 2, "cucchiai", "Dispensa"),
      ing("riso basmati", 160, "g", "Cereali"),
    ],
    [
      "Cuoci il riso. In una pentola scalda l'olio, aggiungi i semi di cumino (sfriggolano). Aggiungi cipolla, aglio e zenzero grattugiato. Cuoci 5 minuti.",
      "Aggiungi curry e lenticchie. Versa 400ml di acqua e il latte di cocco. Porta a bollore, cuoci 15 minuti mescolando — le lenticchie si sfaldano e addensano tutto.",
      "Aggiungi gli spinaci e mescola 1 minuto finché appassiscono. Aggiusta di sale. Servi sul riso.",
    ]
  ),

  r("burger-lenticchie-barbabietola", "Burger di lenticchie e barbabietola",
    ["mediterranea", "vegana", "vegetariana"], ["meal prep", "saporita"],
    30, "beginner", 2,
    [
      ing("lenticchie verdi o marroni", 200, "g", "Proteine"),
      ing("barbabietola cotta", 150, "g", "Verdure"),
      ing("avena o pangrattato", 50, "g", "Cereali"),
      ing("cipolla", 0.5, "pz", "Verdure"),
      ing("cumino in polvere", 1, "cucchiaino", "Dispensa"),
      ing("paprika affumicata", 1, "cucchiaino", "Dispensa"),
      ing("olio extravergine", 2, "cucchiai", "Dispensa"),
      ing("lattuga e pomodori per servire", 1, "pz", "Verdure"),
    ],
    [
      "Cuoci le lenticchie in acqua per 20 minuti. Scola e lascia asciugare bene. Frulla grossolanamente con la barbabietola — deve restare rustica.",
      "Aggiungi avena, cipolla tritata, spezie, sale e pepe. Mescola e forma 4 burger. Se troppo morbidi aggiungi avena. Lascia riposare 10 minuti in frigo.",
      "Cuoci in padella con olio a fuoco medio 4-5 minuti per lato finché dorati e croccanti. Servi con lattuga e pomodori.",
    ]
  ),

  r("pasta-pomodoro-vegana-capperi", "Pasta puttanesca vegana con olive e capperi",
    ["vegana", "vegetariana", "mediterranea"], ["veloce", "saporita"],
    18, "beginner", 2,
    [
      ing("pasta (spaghetti o linguine)", 180, "g", "Cereali"),
      ing("passata di pomodoro", 280, "g", "Dispensa"),
      ing("olive nere denocciolate", 60, "g", "Dispensa"),
      ing("capperi sotto sale", 2, "cucchiai", "Dispensa"),
      ing("aglio", 2, "spicchi", "Verdure"),
      ing("peperoncino", 1, "pz", "Dispensa"),
      ing("olio extravergine", 3, "cucchiai", "Dispensa"),
      ing("origano secco", 1, "cucchiaino", "Dispensa"),
    ],
    [
      "Sciacqua i capperi. Scalda l'olio con aglio e peperoncino. Aggiungi olive, capperi e origano. Cuoci 2 minuti.",
      "Versa la passata. Cuoci a fuoco medio 12 minuti. Aggiusta di sale (va poco — olive e capperi salano già).",
      "Scola la pasta al dente nella padella con il sugo. Salta 1 minuto.",
    ]
  ),

  r("tempeh-verdure-saltate", "Tempeh saltato con verdure e salsa teriyaki",
    ["mediterranea", "vegana", "vegetariana"], ["proteico", "veloce"],
    20, "beginner", 2,
    [
      ing("tempeh", 200, "g", "Proteine"),
      ing("broccoli", 200, "g", "Verdure"),
      ing("carote", 1, "pz", "Verdure"),
      ing("peperoni", 1, "pz", "Verdure"),
      ing("salsa di soia", 3, "cucchiai", "Dispensa"),
      ing("miele o sciroppo d'acero", 1, "cucchiaio", "Dispensa"),
      ing("aglio", 1, "spicchio", "Verdure"),
      ing("olio di semi di girasole", 3, "cucchiai", "Dispensa"),
      ing("sesamo tostato", 1, "cucchiaino", "Dispensa"),
    ],
    [
      "Taglia il tempeh a cubetti. Scalda 2 cucchiai di olio in padella a fuoco alto. Cuoci il tempeh 3-4 minuti per lato finché dorato. Toglilo.",
      "Nella stessa padella salta le verdure tagliate a pezzi a fuoco alto per 4 minuti — devono restare croccanti.",
      "Prepara la salsa: mescola soia, miele e aglio grattugiato. Aggiungi tempeh e salsa alla padella. Salta 1 minuto. Finisci con sesamo.",
    ]
  ),

  r("zuppa-miso-tofu", "Zuppa di miso con tofu e alghe",
    ["mediterranea", "vegana", "vegetariana"], ["veloce", "light", "giapponese"],
    12, "beginner", 2,
    [
      ing("pasta di miso bianco", 3, "cucchiai", "Dispensa"),
      ing("tofu compatto", 150, "g", "Proteine"),
      ing("cipollotto", 2, "pz", "Verdure"),
      ing("alghe wakame secche", 1, "cucchiaio", "Dispensa"),
    ],
    [
      "Porta a ebollizione 600ml di acqua. Abbassa la fiamma. Scioglieva la pasta di miso in una ciotola con qualche cucchiaio di brodo caldo — non bollirla mai o perde i probiotici.",
      "Aggiungi il tofu tagliato a cubetti nel brodo caldo. Aggiungi le alghe (si reidratano in 2 minuti). Versa il miso sciolto.",
      "Servi immediatamente con il cipollotto affettato sottile. Non riscaldare dopo aver aggiunto il miso.",
    ]
  ),

  // ── REGIONALI AGGIUNTIVE ─────────────────────────────────────────────────────

  r("trippa-pomodoro", "Trippa alla romana con pomodoro e mentuccia",
    ["mediterranea", "onnivora"], ["regionale", "romano", "domenica", "economica"],
    50, "beginner", 4,
    [
      ing("trippa precotta", 600, "g", "Proteine"),
      ing("pomodori pelati", 400, "g", "Dispensa"),
      ing("cipolla", 1, "pz", "Verdure"),
      ing("sedano", 1, "gambo", "Verdure"),
      ing("carote", 1, "pz", "Verdure"),
      ing("menta fresca", 8, "foglie", "Verdure"),
      ing("pecorino romano grattugiato", 50, "g", "Latticini"),
      ing("olio extravergine", 3, "cucchiai", "Dispensa"),
      ing("vino bianco", 80, "ml", "Dispensa"),
    ],
    [
      "Taglia la trippa a striscioline di 1cm. Soffriggi cipolla, carota e sedano in olio per 7 minuti.",
      "Aggiungi la trippa e sfuma col vino bianco. Lascia evaporare. Aggiungi i pelati schiacciati. Cuoci a fuoco basso 35-40 minuti finché la trippa è morbida e il sugo denso.",
      "Aggiusta di sale. Fuori dal fuoco aggiungi la menta spezzettata. Impiatta e copri con pecorino romano abbondante.",
    ]
  ),

  r("bagna-cauda-piemontese", "Bagna cauda piemontese con verdure crude",
    ["mediterranea", "onnivora"], ["regionale", "piemontese", "invernale"],
    25, "beginner", 4,
    [
      ing("acciughe sott'olio", 8, "pz", "Proteine"),
      ing("aglio", 6, "spicchi", "Verdure"),
      ing("olio extravergine", 150, "ml", "Dispensa"),
      ing("burro", 40, "g", "Latticini"),
      ing("carote", 2, "pz", "Verdure"),
      ing("sedano", 3, "gambi", "Verdure"),
      ing("peperoni", 2, "pz", "Verdure"),
      ing("finocchio", 1, "pz", "Verdure"),
      ing("cavolo rosso", 200, "g", "Verdure"),
    ],
    [
      "Sbuccia l'aglio e sbollentalo in acqua per 10 minuti — perde l'aggressività ma mantiene il profumo. Schiaccialo in pasta.",
      "In una piccola casseruola (o fondue) scalda l'olio a fuoco bassissimo. Aggiungi l'aglio e le acciughe. Mescola finché le acciughe si sciolgono completamente (5-7 minuti). Aggiungi il burro. La salsa deve rimanere calda ma non bollire mai.",
      "Taglia tutte le verdure a bastoncini. Porta in tavola la bagna cauda calda: si intinge ogni verdura e si porta alla bocca. È un piatto conviviale.",
    ]
  ),

  r("parmigiana-melanzane-bianca", "Parmigiana bianca di melanzane con besciamella",
    ["mediterranea", "onnivora"], ["forno", "regionale", "domenica"],
    50, "intermediate", 4,
    [
      ing("melanzane", 3, "pz", "Verdure"),
      ing("latte intero", 500, "ml", "Latticini"),
      ing("farina 00", 40, "g", "Dispensa"),
      ing("burro", 40, "g", "Latticini"),
      ing("prosciutto cotto a fette", 150, "g", "Proteine"),
      ing("mozzarella fiordilatte", 250, "g", "Latticini"),
      ing("parmigiano grattugiato", 60, "g", "Latticini"),
      ing("noce moscata", 1, "pizzico", "Dispensa"),
      ing("olio extravergine", 4, "cucchiai", "Dispensa"),
    ],
    [
      "Grigliala le melanzane a fette in forno a 220°C con olio per 18 minuti.",
      "Besciamella: burro, farina, latte caldo. Cuoci 7 minuti. Sala e noce moscata.",
      "In una pirofila alterna: besciamella, melanzane, prosciutto cotto, mozzarella, parmigiano. Ripeti 3-4 volte. Termina con besciamella e parmigiano.",
      "Inforna a 180°C per 25-30 minuti finché gratinata. Lascia riposare 10 minuti.",
    ]
  ),

  r("pasta-e-ciceri", "Pasta e ceci alla pugliese con rosmarino",
    ["mediterranea", "vegetariana", "vegana"], ["regionale", "pugliese", "comfort", "economica"],
    30, "beginner", 4,
    [
      ing("pasta corta mista o ditaloni", 200, "g", "Cereali"),
      ing("ceci in lattina", 480, "g", "Proteine"),
      ing("aglio", 3, "spicchi", "Verdure"),
      ing("rosmarino fresco", 2, "rametti", "Verdure"),
      ing("pomodori pelati", 150, "g", "Dispensa"),
      ing("peperoncino", 1, "pz", "Dispensa"),
      ing("olio extravergine", 5, "cucchiai", "Dispensa"),
    ],
    [
      "Scalda 4 cucchiai di olio con aglio, rosmarino e peperoncino. Aggiungi i ceci e i pelati schiacciati. Cuoci 5 minuti schiacciando metà ceci.",
      "Copri con 600ml di acqua calda. Porta a bollore. Aggiungi la pasta e cuoci mescolando spesso. Aggiusta acqua se necessario — deve restare cremosa. Aggiusta di sale. Finisci con olio crudo abbondante.",
    ]
  ),

  r("tiella-riso-patate-cozze", "Tiella barese riso patate e cozze",
    ["mediterranea", "onnivora"], ["regionale", "pugliese", "domenica", "pesce"],
    60, "intermediate", 4,
    [
      ing("riso carnaroli o arborio", 300, "g", "Cereali"),
      ing("cozze fresche", 800, "g", "Proteine"),
      ing("patate", 400, "g", "Verdure"),
      ing("pomodori maturi", 3, "pz", "Verdure"),
      ing("cipolla dorata", 1, "pz", "Verdure"),
      ing("pecorino grattugiato", 60, "g", "Latticini"),
      ing("prezzemolo fresco", 1, "ciuffo", "Verdure"),
      ing("olio extravergine", 5, "cucchiai", "Dispensa"),
    ],
    [
      "Pulisci le cozze e aprile a metà lasciando il mollusco su un guscio. Tieni il liquido.",
      "Sbuccia le patate e affettale sottili. Affetta cipolla e pomodori. Ungi una teglia rotonda da 28cm.",
      "Disponi a strati: metà patate, cipolla, metà riso (crudo) condito con olio e pecorino, metà pomodori, cozze con il guscio verso il basso, riso rimasto, pomodori. Finisci con le patate rimaste e pecorino abbondante.",
      "Versa il liquido delle cozze e acqua tiepida finché il riso è quasi coperto. Aggiungi olio. Inforna a 180°C per 40-45 minuti finché il riso è cotto e la superficie dorata.",
    ]
  ),

  // ── DA 30-45 MIN CON CARNE ────────────────────────────────────────────────────

  r("pollo-salsa-verde", "Pollo in salsa verde con prezzemolo e capperi",
    ["mediterranea", "onnivora"], ["veloce", "saporita", "proteico"],
    22, "beginner", 2,
    [
      ing("petti di pollo", 300, "g", "Proteine"),
      ing("prezzemolo fresco", 1, "ciuffo", "Verdure"),
      ing("capperi sotto sale", 2, "cucchiai", "Dispensa"),
      ing("aglio", 1, "spicchio", "Verdure"),
      ing("aceto di vino bianco", 1, "cucchiaio", "Dispensa"),
      ing("olio extravergine", 5, "cucchiai", "Dispensa"),
      ing("limone", 0.5, "pz", "Verdure"),
    ],
    [
      "Prepara la salsa verde: frulla prezzemolo, capperi sciacquati, aglio, aceto, succo di limone e olio fino a salsa rustica. Aggiusta di sale.",
      "Cuoci i petti di pollo in padella con poco olio, sale e pepe — 5-6 minuti per lato. Lascia riposare 3 minuti.",
      "Affetta il pollo e servi con la salsa verde abbondante sopra. La salsa si conserva in frigo 3 giorni.",
    ]
  ),

  r("manzo-stracotto-polenta", "Stracotto di manzo con polenta morbida",
    ["mediterranea", "onnivora"], ["domenica", "invernale", "comfort", "regionale"],
    75, "intermediate", 4,
    [
      ing("manzo da brasato (cappello del prete)", 700, "g", "Proteine"),
      ing("farina di polenta istantanea", 200, "g", "Cereali"),
      ing("cipolla", 1, "pz", "Verdure"),
      ing("carote", 2, "pz", "Verdure"),
      ing("sedano", 1, "gambo", "Verdure"),
      ing("vino rosso", 200, "ml", "Dispensa"),
      ing("passata di pomodoro", 200, "g", "Dispensa"),
      ing("brodo di carne", 300, "ml", "Dispensa"),
      ing("olio extravergine", 3, "cucchiai", "Dispensa"),
    ],
    [
      "Rosola la carne a pezzi grandi in olio caldo su tutti i lati, 4-5 minuti per lato. Toglila.",
      "Soffriggi cipolla, carote, sedano 5 minuti. Rimetti la carne. Sfuma col vino rosso. Aggiungi passata e brodo. Copri e cuoci a fuoco basso 60 minuti finché la carne si sfalda.",
      "Prepara la polenta istantanea: porta a ebollizione 800ml di acqua salata, versa la polenta a pioggia mescolando. Cuoci 5 minuti. Aggiusta di sale e aggiungi un filo d'olio.",
      "Servi lo stracotto sulla polenta morbida con il fondo di cottura come salsa.",
    ]
  ),

  r("straccetti-pomodorini-olive", "Straccetti di manzo con pomodorini e olive",
    ["mediterranea", "onnivora"], ["veloce", "saporita"],
    18, "beginner", 2,
    [
      ing("fettine di manzo (scamone o fesa)", 300, "g", "Proteine"),
      ing("pomodori ciliegia", 200, "g", "Verdure"),
      ing("olive nere denocciolate", 50, "g", "Dispensa"),
      ing("aglio", 1, "spicchio", "Verdure"),
      ing("origano secco", 1, "cucchiaino", "Dispensa"),
      ing("olio extravergine", 3, "cucchiai", "Dispensa"),
    ],
    [
      "Taglia la carne a striscioline. Scalda l'olio in padella a fuoco alto. Cuoci la carne in una sola ripresa senza mescolare per 2 minuti, poi gira. Toglila.",
      "Nella stessa padella a fuoco medio cuoci i pomodorini tagliati a metà con l'aglio per 3 minuti. Aggiungi le olive e l'origano.",
      "Rimetti la carne, mescola velocemente e servi subito. Aggiusta di sale.",
    ]
  ),

  r("pollo-curry-verde", "Pollo al curry verde con riso al vapore",
    ["mediterranea", "onnivora"], ["speziato", "veloce", "comfort"],
    25, "beginner", 2,
    [
      ing("petti di pollo", 300, "g", "Proteine"),
      ing("latte di cocco", 200, "ml", "Dispensa"),
      ing("pasta di curry verde", 2, "cucchiai", "Dispensa"),
      ing("spinaci freschi", 100, "g", "Verdure"),
      ing("cipollotto", 2, "pz", "Verdure"),
      ing("riso basmati", 160, "g", "Cereali"),
      ing("olio di semi di girasole", 2, "cucchiai", "Dispensa"),
      ing("limone", 0.5, "pz", "Verdure"),
    ],
    [
      "Cuoci il riso basmati. Taglia il pollo a bocconcini.",
      "In una padella larga scalda l'olio. Aggiungi la pasta di curry verde e cuoci 1 minuto mescolando — profuma intensamente. Aggiungi il pollo e rosola 4-5 minuti.",
      "Versa il latte di cocco. Porta a bollore leggero e cuoci 8 minuti. Aggiungi gli spinaci e il cipollotto. Cuoci 1 minuto. Aggiusta di sale e aggiungi succo di limone. Servi sul riso.",
    ]
  ),

  r("hamburger-manzo-casalingo", "Hamburger di manzo casalingo con cipolla caramellata",
    ["mediterranea", "onnivora"], ["comfort", "veloce", "family"],
    25, "beginner", 2,
    [
      ing("carne macinata mista (manzo e maiale)", 300, "g", "Proteine"),
      ing("panini per hamburger", 2, "pz", "Cereali"),
      ing("cipolla dorata", 1, "pz", "Verdure"),
      ing("lattuga", 2, "foglie", "Verdure"),
      ing("pomodori", 1, "pz", "Verdure"),
      ing("burro", 15, "g", "Latticini"),
      ing("senape di Digione", 1, "cucchiaio", "Dispensa"),
      ing("olio extravergine", 1, "cucchiaio", "Dispensa"),
    ],
    [
      "Caramella la cipolla: affettala sottile e cuoci in burro a fuoco basso per 15-18 minuti mescolando ogni tanto finché dorata e dolce.",
      "Forma 2 hamburger di 150g comprimendo poco la carne — più è compressa più diventa dura. Sala e pepa. Cuoci in padella calda con olio 3-4 minuti per lato (al sangue) o 5 minuti (ben cotti).",
      "Tosta i panini. Componi: senape, lattuga, pomodoro, hamburger e cipolla caramellata. Servi subito.",
    ]
  ),

  r("salsiccia-friarielli", "Salsiccia con friarielli (o cime di rapa)",
    ["mediterranea", "onnivora"], ["regionale", "napoletana", "comfort"],
    25, "beginner", 2,
    [
      ing("salsiccia fresca", 300, "g", "Proteine"),
      ing("friarielli o cime di rapa", 500, "g", "Verdure"),
      ing("aglio", 2, "spicchi", "Verdure"),
      ing("peperoncino", 1, "pz", "Dispensa"),
      ing("olio extravergine", 3, "cucchiai", "Dispensa"),
    ],
    [
      "Cuoci i friarielli: sbollentali in acqua salata 5 minuti. Scola. In padella scalda olio con aglio e peperoncino. Aggiungi i friarielli e salta a fuoco alto 4-5 minuti. Sala.",
      "In un'altra padella cuoci le salsicce bucherellate a fuoco medio per 12-15 minuti girandole, finché dorate e cotte.",
      "Servi le salsicce con i friarielli a lato. Il sapore amaro dei friarielli bilancia perfettamente la grassezza della salsiccia.",
    ]
  ),

];

// ─────────────────────────────────────────────────────────────────────────────

function normalize(text: string) {
  return text.trim().toLowerCase();
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

function seededShuffle<T>(items: T[], seed: number) {
  const arr = [...items];
  let s = seed;
  for (let i = arr.length - 1; i > 0; i -= 1) {
    s = (s * 1664525 + 1013904223) % 4294967296;
    const j = Math.floor((s / 4294967296) * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function getRecipeCategory(recipeItem: Recipe): MainCategory {
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

function scaleQty(qty: number, recipeServings: number, targetPeople: number) {
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

function aggregateShopping(meals: Recipe[], pantryItems: PantryItem[], people: number): ShoppingItem[] {
  const pantryQtyMap = new Map(pantryItems.map((item) => [normalize(item.name), Number(item.quantity || 0)]));
  const shoppingMap = new Map<string, RecipeIngredient>();
  meals.forEach((meal) => {
    meal.ingredients.forEach((ingr) => {
      const key = normalize(ingr.name);
      const existing = shoppingMap.get(key) || { ...ingr, qty: 0 };
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

function computeStats(meals: Recipe[], shopping: ShoppingItem[]): PlanStats {
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

const FREEZE_CANDIDATES = [
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
function buildPlan(preferences: Preferences, pantryItems: PantryItem[], seed: number, learning?: PreferenceLearning): PlanResult {
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
    "coniglio"
  ];

  const excludedProtein = proteinRotation === 0 ? MEAT_INGREDIENTS : proteinRotation === 1 ? FISH_INGREDIENTS : POULTRY_INGREDIENTS;

  const eligible = RECIPE_LIBRARY.filter((recipeItem) => {
    if (!recipeItem.diet.includes(preferences.diet)) return false;
    if (recipeItem.tags.includes("speciale") || recipeItem.tags.includes("domenica")) return false;
    if (recipeItem.time > preferences.maxTime) return false;
    if (exclusions.some((ex) => recipeItem.ingredients.some((i) => normalize(i.name).includes(ex)))) return false;
    // Escludi la categoria proteica di questa settimana (solo per diete onnivore/mediterranee)
    if (["onnivora","mediterranea"].includes(preferences.diet)) {
      if (recipeItem.ingredients.some((i) => excludedProtein.includes(normalize(i.name)))) return false;
    }
    return true;
  });

  const specialEligible = RECIPE_LIBRARY.filter((recipeItem) => {
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
      .filter((rec) => !excludeIds.has(rec.id))
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

function runSanityChecks() {
  const strictPlan = buildPlan(
    { people: 2, diet: "mediterranea", maxTime: 20, budget: 60, skill: "beginner", mealsPerDay: "both", leftoversAllowed: true, exclusionsText: "", exclusions: [], sundaySpecial: false, sundayDinnerLeftovers: false, skippedMeals: [], coreIngredients: [] },
    [{ name: "pasta", quantity: 500, unit: "g" }], 1,
  );
  if (!strictPlan.days.length) throw new Error("planner failed");
}

runSanityChecks();

// ─────────────────────────────────────────────────────────────────────────────
// UI COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────


// ─────────────────────────────────────────────────────────────────────────────
// DESIGN SYSTEM — Trattoria Moderna
// Palette: terracotta, crema, verde oliva, seppia
// Font: Playfair Display (titoli) + DM Sans (corpo)
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// AUTH MODAL COMPONENT (inline)
// ─────────────────────────────────────────────────────────────────────────────
function AuthModalInline({ onClose, client }: { onClose: () => void; client: SupabaseClient | null }) {
  const [mode, setMode] = React.useState<"login" | "signup">("login");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState("");

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(""); setSuccess("");
    try {
      if (!client) throw new Error("Client non disponibile");
      if (mode === "login") {
        const { error } = await client.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onClose();
      } else {
        const { error } = await client.auth.signUp({ email, password });
        if (error) throw error;
        setSuccess("Controlla la tua email per confermare l'account.");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Errore. Riprova.");
    } finally { setLoading(false); }
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(61,43,31,0.6)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "var(--warm-white)", borderRadius: 24, padding: 32, width: "100%", maxWidth: 400, boxShadow: "0 24px 60px rgba(61,43,31,0.25)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontFamily: "'Playfair Display', serif", fontSize: 22, color: "var(--sepia)" }}>
            {mode === "login" ? "Accedi" : "Crea account"}
          </h2>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "var(--sepia-light)" }}>×</button>
        </div>

        {/* Social buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
          <button onClick={() => client?.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin } })}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "12px 20px", borderRadius: 12, border: "1.5px solid var(--cream-dark)", background: "white", cursor: "pointer", fontSize: 15, fontWeight: 600, color: "var(--sepia)" }}>
            <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Continua con Google
          </button>
          <button onClick={() => client?.auth.signInWithOAuth({ provider: "apple", options: { redirectTo: window.location.origin } })}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "12px 20px", borderRadius: 12, border: "none", background: "#000", cursor: "pointer", fontSize: 15, fontWeight: 600, color: "white" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.7 9.05 7.07c1.17.06 2.01.6 2.74.63.98-.18 1.94-.76 2.95-.73 1.28.07 2.25.65 2.9 1.65-2.53 1.54-1.84 4.93.6 5.93-.54 1.48-1.22 2.92-2.19 3.73zM12.03 7c-.12-2.16 1.74-3.96 3.73-4C15.94 5.11 14 7.11 12.03 7z"/></svg>
            Continua con Apple
          </button>
        </div>

        {/* Divider */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <div style={{ flex: 1, height: 1, background: "var(--cream-dark)" }} /><span style={{ fontSize: 13, color: "var(--sepia-light)" }}>oppure</span><div style={{ flex: 1, height: 1, background: "var(--cream-dark)" }} />
        </div>

        {/* Email form */}
        <form onSubmit={handleEmail} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required className="input-warm" style={{ width: "100%", boxSizing: "border-box" as const }} />
          <input type="password" placeholder="Password (min. 6 caratteri)" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} className="input-warm" style={{ width: "100%", boxSizing: "border-box" as const }} />
          {error   && <p style={{ margin: 0, fontSize: 13, color: "var(--terra)", fontWeight: 600 }}>{error}</p>}
          {success && <p style={{ margin: 0, fontSize: 13, color: "var(--olive)", fontWeight: 600 }}>{success}</p>}
          <button type="submit" disabled={loading} className="btn-terra" style={{ justifyContent: "center", opacity: loading ? 0.7 : 1 }}>
            {loading ? "..." : mode === "login" ? "Accedi" : "Crea account"}
          </button>
        </form>

        <p style={{ margin: "16px 0 0", textAlign: "center", fontSize: 14, color: "var(--sepia-light)" }}>
          {mode === "login" ? "Non hai un account? " : "Hai già un account? "}
          <button onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); setSuccess(""); }}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--terra)", fontWeight: 700, fontSize: 14 }}>
            {mode === "login" ? "Registrati" : "Accedi"}
          </button>
        </p>
      </div>
    </div>
  );
}

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

  // Carica dati cloud quando sbClient e user sono disponibili
  useEffect(() => {
    if (sbClient && user) loadCloudData(user.id);
  }, [sbClient, user]);

  // Carica dati dal cloud
  const loadCloudData = async (userId: string) => {
    if (!sbClient) return;
    try {
      const data = await loadUserData(sbClient, userId);
      // Se non ci sono dati cloud, migra da localStorage
      const hasCloudData = Object.keys(data.preferences || {}).length > 0 ||
                           (data.pantry || []).length > 0;
      if (!hasCloudData) {
        await migrateFromLocalStorage(sbClient, userId);
        // Ricarica dopo migrazione
        const migrated = await loadUserData(sbClient, userId);
        applyCloudData(migrated);
      } else {
        applyCloudData(data);
      }
    } catch (err) {
      console.error("Errore caricamento dati cloud:", err);
    }
  };

  const applyCloudData = (data: Awaited<ReturnType<typeof loadUserData>>) => {
    if (data.preferences && Object.keys(data.preferences).length > 0) {
      setPreferences(data.preferences as typeof preferences);
    }
    if (data.pantry && (data.pantry as typeof pantryItems).length > 0) {
      setPantryItems(data.pantry as typeof pantryItems);
    }
    if (data.seed) setSeed(data.seed as number);
    if (data.manualOverrides) setManualOverrides(data.manualOverrides as typeof manualOverrides);
    if (data.learning) setLearning(data.learning as typeof learning);
  };

  // syncToCloud definita sotto dopo tutti gli useState
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
  useEffect(() => { tutorialStepRef.current = tutorialStep; }, [tutorialStep]);




  const [manualOverrides, setManualOverrides] = useState<ManualOverrides>(() => {
    if (typeof window === "undefined") return {};
    try { const saved = localStorage.getItem("ss_manual_overrides_v1"); return saved ? JSON.parse(saved) : {}; } catch { return {}; }
  });
  const [learning, setLearning] = useState<PreferenceLearning>(() => {

  // Salva su cloud con debounce
  const syncToCloud = useCallback(async (type: "preferences" | "pantry" | "plan") => {
    if (!user) return;
    setSyncStatus("saving");
    try {
      if (type === "preferences") await savePreferences(sbClient!, user.id, preferences as Record<string, unknown>);
      if (type === "pantry") await savePantry(sbClient!, user.id, pantryItems);
      if (type === "plan") await saveWeeklyPlan(sbClient!, user.id, {
        seed,
        manualOverrides: manualOverrides as Record<string, unknown>,
        learning: learning as Record<string, unknown>,
      });
      setSyncStatus("saved");
      setTimeout(() => setSyncStatus("idle"), 2000);
    } catch {
      setSyncStatus("error");
      setTimeout(() => setSyncStatus("idle"), 3000);
    }
  }, [sbClient, user, preferences, pantryItems, seed, manualOverrides, learning]);

  // Auto-sync su cloud quando cambiano preferenze, dispensa, seed
  useEffect(() => { if (user) syncToCloud("preferences"); }, [preferences, user]);
  useEffect(() => { if (user) syncToCloud("pantry"); }, [pantryItems, user]);
  useEffect(() => { if (user) syncToCloud("plan"); }, [seed, manualOverrides, learning, user]);
    const fallback: PreferenceLearning = { keptRecipeIds: {}, regeneratedRecipeIds: {}, likedCategories: {}, dislikedCategories: {}, likedIngredients: {}, dislikedIngredients: {} };
    if (typeof window === "undefined") return fallback;
    try { const saved = localStorage.getItem("ss_learning_v1"); return saved ? { ...fallback, ...JSON.parse(saved) } : fallback; } catch { return fallback; }
  });
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
    const meals = dedupedDays.flatMap((day) => [day.lunch, day.dinner].filter(Boolean)) as Recipe[];
    const shopping = aggregateShopping(meals, pantryItems, computedPrefs.people);
    const stats = computeStats(meals, shopping);
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
  const confirmWeek = () => {
    meals.forEach((m) => learnFromRecipe(m, "keep"));
    setLastMessage("Settimana confermata ✓");
    setShowGeneratedBanner(true);
    // Programma i promemoria scongelo per tutti gli items da congelare
    if (generated.freezeItems.length > 0) scheduleFreezeReminders(generated.freezeItems);
  };

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

  const completeTutorial = () => {
    localStorage.setItem("ss_tutorial_done", "1");
    setTutorialDone(true);
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

  // Tour interattivo: ogni step aspetta che l'utente compia l'azione
  // waitFor: nome dell'azione che sblocca lo step successivo
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

  return (
    <AuthProvider>
    <>
      <style>{designTokens}</style>
      {/* ── AUTH MODAL ── */}
      {showAuthModal && isMounted && (
        <AuthModalInline onClose={() => setShowAuthModal(false)} client={sbClient} />
      )}

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
                    {user.email?.split("@")[0] ?? "Account"} · Esci
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
    </AuthProvider>
  );
}

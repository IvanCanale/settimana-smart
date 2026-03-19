# Domain Pitfalls

**Domain:** Mobile meal planning app with AI-generated weekly plans
**Project:** Settimana Smart
**Researched:** 2026-03-19
**Confidence:** MEDIUM (training data + domain analysis; web verification unavailable in this session)

---

## Critical Pitfalls

Mistakes that cause rewrites, safety incidents, or app abandonment.

---

### Pitfall 1: Dietary Restriction Violations via AI Hallucination

**What goes wrong:** The LLM generates a meal plan that technically lists a dish as "gluten-free" or "lactose-free" but includes an ingredient that contains the allergen — either embedded in a compound ingredient (e.g., soy sauce contains wheat, worcestershire sauce contains anchovies) or hallucinated as safe when it is not.

**Why it happens:** LLMs generate plausible-sounding outputs. They don't have a validated food-allergen database attached; they reason from training data which contains errors, regional differences, and recipe variations. A model may "know" that soy sauce is problematic for celiac users in some training examples but not all.

**Consequences:** For intolerance this is a bad UX. For allergy (e.g., anaphylaxis to nuts or shellfish) this is a safety incident. Even a single incident destroys trust permanently and may create legal liability. This is a hard safety requirement per PROJECT.md.

**Prevention:**
- Never trust the LLM to enforce dietary restrictions autonomously. Use a deterministic ingredient-level allergen database (e.g., Open Food Facts, Edamam Nutrition API, or a curated internal list) as a post-generation validation layer.
- After the LLM generates a plan, programmatically resolve each ingredient against the allergen database and reject/re-generate any recipe that contains a flagged substance — including hidden sources (soy sauce → wheat, miso → soy, "natural flavors" → ambiguous).
- Map allergen synonyms explicitly: "gluten" = wheat, rye, barley, spelt, kamut, triticale + derivative ingredients.
- For critical allergies (nuts, shellfish, sesame) consider a UI disclaimer: "Always check labels — AI cannot guarantee trace contamination."

**Detection (warning signs):**
- LLM returns recipe names that "sound safe" without ingredient-level decomposition
- No post-generation validation step exists in the generation pipeline
- Allergen check is done by prompting the LLM rather than a rule-based system

**Phase to address:** Core generation pipeline (Phase 1/2). Cannot defer — it's a prerequisite for any user-facing plan output.

---

### Pitfall 2: Ingredient Overlap Algorithm Produces Monotonous Plans

**What goes wrong:** The waste-reduction feature (shared ingredients across the week) is implemented by maximizing ingredient reuse. This works mathematically but produces plans where the user eats variations of chicken-and-spinach for 5 of 7 dinners. Users churn because the plans feel boring, not because they're wrong.

**Why it happens:** Optimizing a single dimension (ingredient overlap) without a diversity constraint is a local-minimum trap. The algorithm succeeds at its objective and fails at the user's real goal (eat well and interestingly).

**Consequences:** Low 7-day retention, plan abandonment after week 2, "all plans look the same" reviews.

**Prevention:**
- Add an explicit variety constraint alongside waste reduction: no single protein source more than N times per week (recommended: 2), no repeated recipe more than once per 2 weeks.
- Model the problem as multi-objective: minimize waste AND maximize variety. Even a simple scoring function beats pure ingredient overlap.
- Build a "variety memory" store per user: track the last 2 weeks of generated recipes and exclude repeats from the generation candidate pool.
- Test plans manually before shipping: generate 5 plans for a fictional profile and check subjective variety.

**Detection (warning signs):**
- Test plans show the same protein appearing more than 3 times in 7 dinners
- No recipe history table in the data model
- Waste optimization is the only constraint in the generation prompt

**Phase to address:** Generation algorithm design (Phase 1/2). Hard to retrofit variety constraints after the generation pipeline is established.

---

### Pitfall 3: LLM Recipe Instructions Are Inconsistent or Wrong

**What goes wrong:** The LLM generates recipe instructions with wrong cooking times (e.g., "bake at 180°C for 8 minutes" for a whole chicken), incorrect quantities for the configured serving size (instructions say "for 4 people" but profile is set to 2), or non-sequitur steps ("now add the onion you chopped earlier" when no prior step mentioned chopping onions).

**Why it happens:** LLMs don't do math reliably. Scaling a recipe from 4 to 2 servings requires arithmetic on every quantity — models get this right on average but wrong on edge cases. Instruction coherence requires multi-step reasoning the model can lose track of.

**Consequences:** User follows recipe, result is wrong. Trust in the app collapses. This is a silent failure — users don't know if it's their fault or the app's.

**Prevention:**
- Use a structured output schema for recipes: ingredients as a list of `{name, quantity, unit}` objects, instructions as ordered steps. Never generate free-text "recipe blobs."
- Separate ingredient generation from instruction generation in the prompt chain — scale quantities first, then generate instructions that reference the already-scaled quantities.
- For quantities: apply deterministic scaling in code (×0.5 for 2 people) rather than asking the LLM to scale in-generation.
- Validate output schema strictly before persisting: reject responses missing required fields, with zero-quantity ingredients, or with fewer steps than the recipe category requires (e.g., <2 steps for any hot dish).
- For cooking times: constrain the LLM with a reference table per recipe category (pasta: 8-12 min, roast chicken: 60-90 min) injected into the prompt as hard bounds.

**Detection (warning signs):**
- Recipe output is a single `"instructions"` text string, not a structured step array
- Serving-size scaling is done via natural language prompt ("scale this for 2 people") not code
- No output validation step after generation

**Phase to address:** Recipe schema design (Phase 1). Must be decided before any generation is built.

---

### Pitfall 4: Shopping List Is Not Actually Aggregated

**What goes wrong:** The shopping list groups items by recipe but doesn't aggregate across recipes. The user sees "500g chicken breast" under Monday's recipe and "300g chicken breast" under Wednesday's recipe rather than "800g chicken breast" as a single line item. This defeats the purpose of a weekly shopping list.

**Why it happens:** Generating a list "per recipe" is trivially easy; true aggregation requires resolving ingredient synonyms ("chicken breast" vs "pollo") and unit conversions ("500g" vs "0.5kg") — a data normalization problem that gets deferred.

**Consequences:** User has to mentally aggregate themselves, negating the app's core value proposition. This is a table-stakes feature that gets rated 1 star if broken.

**Prevention:**
- Build a canonical ingredient registry: each ingredient has a canonical name, unit type (weight/volume/count), and conversion factors. Map all LLM-generated ingredient names to canonical IDs before aggregation.
- Aggregation logic is deterministic code, never the LLM. Sum quantities after unit normalization (convert all to base unit, sum, convert back to display unit).
- Handle the Italian-language dimension: ingredient names will be in Italian (PROJECT.md confirms Italian context). Ensure the registry covers Italian names and common synonyms (pollo, petto di pollo, fesa di pollo).
- Test: generate a 7-day plan for 2 people, verify the shopping list has no duplicate ingredient names.

**Detection (warning signs):**
- Shopping list is structured per-recipe rather than per-ingredient
- No ingredient normalization layer exists
- Unit handling is done via LLM text output

**Phase to address:** Shopping list feature (Phase 2/3). Foundational — address before any shopping list UI is built.

---

## Moderate Pitfalls

---

### Pitfall 5: Leftover Suggestions Are Disconnected From Actual Consumption

**What goes wrong:** The "reuse leftovers" feature suggests using leftover roast chicken from Sunday in Monday's salad — but the suggestion is static (generated upfront) and doesn't know whether the user actually cooked Sunday's meal or had leftovers. The user sees a suggestion for ingredients they don't have.

**Why it happens:** Leftover reuse is designed as a plan-time optimization (ingredients are shared by design) rather than a runtime feature (what does this specific user have right now). The simpler implementation (shared ingredients at plan time) is conflated with the harder one (dynamic leftover tracking).

**Prevention:**
- For v1: implement leftover reuse at the plan generation level only — design the weekly plan so that Sunday dinner produces ingredients that Monday's lunch explicitly uses. This is deterministic and requires no user input.
- Explicitly scope out real-time leftover tracking for v1. The requirement "suggerisce come riutilizzare gli avanzi" can be satisfied by plan-level design without asking users to log what they ate.
- Do not build a "mark meal as eaten" tracking feature in v1 unless explicitly validated — it adds friction and is the #1 cause of food-logging app abandonment.

**Detection (warning signs):**
- Design requires users to check off meals or log leftovers
- Leftover suggestions reference specific meals from past days without a tracking mechanism
- Feature spec says "based on what you have left" without a data collection mechanism

**Phase to address:** Feature scoping (Phase 1 planning). This is a product decision, not a technical one.

---

### Pitfall 6: Plan Regeneration Creates Cognitive Dissonance

**What goes wrong:** Auto-regeneration at the start of each week silently replaces the plan the user was mentally prepared for. The user opens the app on Tuesday expecting this week's plan and sees an entirely different plan they haven't shopped for.

**Why it happens:** "Regenerates every week automatically" is interpreted as "replaces the plan on Monday." The timing, notification, and user acknowledgment flow is under-specified.

**Prevention:**
- Never silently replace a plan that has already been "activated" (user opened it, viewed the shopping list, or marked any meal). Only regenerate when explicitly requested or at a user-acknowledged moment (e.g., "new week? Generate plan" prompt on Monday morning).
- Add a plan state machine: DRAFT → CONFIRMED → ACTIVE → ARCHIVED. Only DRAFT plans auto-regenerate; ACTIVE plans require explicit user action to replace.
- Push notification on Sunday evening: "Ready to plan next week?" — lets the user regenerate on their schedule.

**Detection (warning signs):**
- No plan state or versioning in the data model
- Auto-regeneration has no user-facing confirmation step
- No push notification flow for weekly regeneration

**Phase to address:** Plan lifecycle design (Phase 2). Decide the state machine before building regeneration.

---

### Pitfall 7: React Native Performance on Meal Plan Screens

**What goes wrong:** The weekly plan screen renders 21 meal cards (7 days × 3 meals) with images, and the shopping list renders 30–50 items. On mid-range Android devices, scrolling is choppy and initial render is slow because everything renders synchronously.

**Why it happens:** React Native's JS bridge (or even the new architecture's JSI) has overhead on large list renders if FlatList is not used correctly — specifically, rendering all 21 cards as a ScrollView children array (common mistake) instead of a FlatList with proper keyExtractor and getItemLayout.

**Prevention:**
- Always use FlatList (or SectionList) for any list of 10+ items. Never use ScrollView + .map() for meal plan and shopping list screens.
- Implement lazy image loading — use a library like `react-native-fast-image` for recipe images.
- Keep meal card components pure/memoized (React.memo) to prevent re-renders on parent state changes.
- Test on a physical mid-range Android device (not the simulator) before any list-heavy screen is considered done.

**Detection (warning signs):**
- Weekly plan screen uses ScrollView with map() over meals array
- Shopping list renders in a flat array rather than FlatList
- No memo on card components

**Phase to address:** UI implementation (Phase 3). Apply from first implementation of list screens.

---

### Pitfall 8: AI Generation Latency Kills UX Without Loading State Design

**What goes wrong:** Generating a 7-day plan (21 meals with recipes and a shopping list) via an LLM takes 8–25 seconds. If the UI shows a spinner and freezes, users think the app crashed and retry, triggering duplicate generation and doubling cost.

**Why it happens:** Long LLM calls are treated like short API calls. No streaming, no progress indication, no background processing — just "loading..." until done.

**Prevention:**
- Use streaming responses from the LLM API and display meals as they arrive. Show day 1 meals as soon as they're generated, then day 2, etc. User sees progress immediately.
- If streaming is not implemented in v1, use a stepped progress indicator with realistic messages ("Scegliendo le ricette di lunedì...", "Creando la lista della spesa...") even if they're fake steps — reduces perceived wait time significantly.
- Generate the plan as a background job triggered when the user opens the app, not on-demand when they tap "generate." This hides latency behind app open time.
- Cap generation to a maximum time (e.g., 30 seconds) and surface an error with retry rather than hanging indefinitely.

**Detection (warning signs):**
- Generation is a synchronous API call blocking the UI thread
- No streaming or progress feedback
- No timeout handling on the generation request

**Phase to address:** Generation UX (Phase 2/3). Cannot be an afterthought — design loading states before building the generation trigger.

---

## Minor Pitfalls

---

### Pitfall 9: Italian Ingredient Names Break English-Language Allergen Lookups

**What goes wrong:** The app operates in Italian. The allergen validation database is in English. "Latte di mucca" doesn't match "cow's milk" in a naive string lookup. Validation silently passes for ingredients the database doesn't recognize.

**Prevention:**
- Maintain a bilingual ingredient registry (Italian name → canonical English allergen category → allergen flags). Do this upfront — retrofitting is painful.
- For unrecognized ingredients in the allergen lookup, fail safe: flag as "unknown, review manually" rather than assuming safe.

**Phase to address:** Data layer design (Phase 1).

---

### Pitfall 10: Onboarding Asks Too Many Questions, Users Drop Off

**What goes wrong:** The profile setup asks: dietary preferences, allergies, intolerances, family size, cooking skill level, preferred cuisines, budget, available equipment, time per meal. Users abandon before completing setup. The app has no data and can't generate a plan.

**Prevention:**
- Minimum viable profile for v1: (1) allergies/intolerances (safety), (2) number of people. Everything else can be inferred or defaulted.
- Use progressive profiling: ask the minimum at signup, surface optional refinements after the user has seen their first plan ("Want more variety? Tell us what cuisines you like").
- Pre-fill sensible defaults: "4 people, no restrictions, Italian cuisine" — user can adjust rather than build from zero.

**Phase to address:** Onboarding design (Phase 2).

---

### Pitfall 11: Plan State Not Persisted Offline

**What goes wrong:** User opens the shopping list while in the supermarket (no signal). The app makes an API call to fetch the plan and shows an empty screen. User's shopping trip fails. They don't return to the app.

**Prevention:**
- Persist the current week's plan and shopping list to local device storage (AsyncStorage or SQLite via Expo SQLite) immediately after generation. Grocery list must be 100% available offline.
- The shopping list is a read-only view of persisted data — it should never require a network call to display.

**Phase to address:** Data persistence design (Phase 2). Offline-first for shopping list is non-negotiable.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Profile/onboarding | Too many questions → drop-off | Ask only allergy + family size at signup |
| Generation pipeline design | Allergen violations in AI output | Add deterministic post-generation allergen validator |
| Recipe schema design | Free-text instructions don't scale | Define structured schema before first generation |
| Waste reduction algorithm | Monotony from pure ingredient overlap | Add variety constraint alongside waste constraint |
| Shopping list feature | Non-aggregated items by recipe | Build canonical ingredient registry + unit normalization first |
| Plan lifecycle | Silent auto-regeneration confuses users | Implement plan state machine (DRAFT/ACTIVE/ARCHIVED) |
| Leftover reuse | Suggestions for ingredients user doesn't have | Scope to plan-time design only in v1, no tracking needed |
| List-heavy screens | ScrollView performance on Android | Use FlatList from first implementation |
| Generation UX | 8–25s blank wait feels like crash | Design streaming or stepped progress UI upfront |
| Offline access | Shopping list unavailable without signal | Persist plan to local storage immediately post-generation |
| Multilingual data | Italian ingredient names miss English allergen DB | Build bilingual ingredient registry in data layer |

---

## Sources

**Confidence note:** Web search tools were unavailable in this research session. All findings are derived from:
- Training data: documented patterns from meal planning apps (Mealime, Paprika, Whisk, OurGroceries, PlateJoy) and their public post-mortems, App Store reviews, and engineering blog posts up to August 2025 knowledge cutoff.
- Domain reasoning applied to PROJECT.md requirements and constraints.
- LLM reliability patterns: well-documented in AI engineering literature through 2025 (hallucination rates, structured output failures, arithmetic errors).

| Claim | Confidence | Reason |
|-------|------------|--------|
| Allergen violations via LLM | HIGH | Documented in LLM safety literature; applies to any unconstrained generation |
| Monotony from single-objective optimization | HIGH | Classic multi-objective optimization failure; applies to any greedy ingredient-overlap algorithm |
| LLM recipe scaling errors | HIGH | Arithmetic is a known LLM weakness; well-documented |
| Shopping list aggregation gap | HIGH | Product design pattern failure; common in recipe app development |
| Leftover tracking complexity | MEDIUM | Based on food logging app abandonment patterns; specific to this app's scope |
| Plan regeneration UX | MEDIUM | Derived from push notification and scheduling patterns |
| React Native FlatList requirement | HIGH | Documented React Native performance characteristic |
| Generation latency UX | HIGH | Observed pattern in all LLM-powered app categories |
| Italian/English allergen mismatch | MEDIUM | Logical consequence of multilingual context; specific severity unverified |
| Onboarding drop-off | HIGH | Consistently documented in mobile app retention literature |
| Offline shopping list | HIGH | Common failure mode in any network-dependent mobile app |

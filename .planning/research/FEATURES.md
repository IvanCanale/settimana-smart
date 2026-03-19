# Feature Landscape

**Domain:** Mobile meal planning app — busy users, waste-reduction focus
**Researched:** 2026-03-19
**Confidence note:** External web tools were unavailable during this research session. All findings are derived from training knowledge (cutoff August 2025) covering Mealime, PlateJoy, Yummly, Paprika, Whisk, and similar apps. Confidence is MEDIUM overall — core table stakes are well-established, differentiator assessment reflects the market as of mid-2025.

---

## Table Stakes

Features users expect from any meal planning app. Missing one = users leave within the first week.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| User profile with dietary preferences | Every app has it; without it the plan is useless | Low | Vegetarian, vegan, gluten-free, dairy-free are the minimum set |
| Allergen / intolerance configuration | Safety requirement — users with celiac, nut allergy etc. need hard filtering | Low-Med | Must be a hard filter, not a preference; legally and safety-critical |
| Automated weekly meal plan generation | This IS the product; without it you are just a recipe browser | High | Must cover all meals or at least dinners; breakfast/lunch are bonus |
| Per-recipe instructions with prep time | Users need to know how to cook the meal and how long it takes | Med | Step-by-step format; time labels like "30 min" are minimum |
| Aggregated weekly shopping list | Users go to the supermarket once; the app must consolidate all ingredients | Med | Quantities must be merged (e.g., 3 chicken breasts total, not 1+1+1) |
| Servings / household size setting | Families and singles need different quantities | Low | Affects ingredient quantities and shopping list amounts |
| Single-meal swap / replacement | Users dislike one meal; they need to replace it without regenerating everything | Med | Must offer alternatives that respect the same dietary profile |
| Plan regeneration on demand | Users want a fresh plan each week or when dissatisfied | Med | Regeneration must avoid repeating the same meals too frequently |
| Recipe detail view | Users need to see ingredients + steps before committing to a meal | Low-Med | Includes photo, ingredients, steps, time |
| Mark items as bought on shopping list | Basic list interaction — users check off items in store | Low | Checkbox UX; ideally persists across app sessions |

---

## Differentiators

Features that go beyond what users expect. Not required to launch, but they create competitive moat — especially for the anti-waste positioning.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Cross-week ingredient sharing optimization | Plan selects recipes that reuse the same ingredients (e.g., half a zucchini Monday used again Wednesday) | High | Core differentiator for Settimana Smart; requires constraint-solving in plan generation |
| Leftover / avanzi repurposing suggestions | After Thursday's chicken, app suggests Friday frittata di pollo | Med-High | Requires meal awareness; can be rule-based initially |
| "What's in my fridge?" ingredient input | User lists what they already have; plan uses those first | High | Reduces waste of existing inventory; popular in Yummly/Fridge2Feast style apps; increases onboarding complexity |
| Partial plan replacement (keep Mon-Wed, redo Thu-Sun) | Granular control without full regeneration | Med | Good DX for users who meal prep in waves |
| Pantry / staples tracking | Track what the user always has (oil, salt, pasta) so shopping list omits them | Med | Reduces list clutter; increases setup friction |
| Cooking skill level filter | Recipes matched to novice/intermediate/advanced | Low-Med | Good retention hook; prevents users from feeling overwhelmed |
| Season / local produce awareness | Plan biases toward what is in season | High | High complexity, low priority for v1 |
| Prep-batch mode (cook once, eat multiple times) | Sunday batch-cooking plan for the week | High | Very appealing for busy users; complex to plan correctly |
| Estimated weekly grocery cost | Shows approximate spend before going to store | High | Requires ingredient price data (market/regional); not worth v1 complexity |
| In-app grocery delivery integration (Instacart, etc.) | One-tap order from shopping list | Very High | Partnership + API work; out of scope for greenfield v1 |
| Push notifications for meal prep reminders | "Tonight is pasta night — defrost the chicken now" | Med | High perceived value; relatively low implementation cost after core is built |

---

## Anti-Features

Features to explicitly NOT build. Each one sounds useful but dilutes focus, adds complexity, or contradicts the app's anti-waste + simplicity positioning.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Calorie and macro tracking | Turns the app into MyFitnessPal lite; adds database complexity; not the focus | State the plan is "nutritionally balanced" at a high level without numbers |
| Weight loss / fitness goal setting | Different user mental model (discipline/tracking vs. convenience/variety) | Keep the promise simple: good food, no waste, minimal effort |
| Social sharing / community recipes | Adds moderation overhead, shifts focus from tool to platform | Keep the app a personal utility; no user-generated content in v1 |
| Manual recipe entry by user | High support cost; users enter bad data; off-brand for "plan is already done for you" | Offer a curated recipe database; add import later if validated |
| Detailed nutritional database per ingredient | Expensive to source and maintain (USDA data is stale, branded foods require licensing) | Descriptive labels ("protein-rich", "light") are sufficient for the target user |
| Restaurant / takeout integration | Contradicts the "cook at home, reduce waste" positioning entirely | Out of scope by design |
| Complex recipe customization (substitute every ingredient) | Exponential complexity in plan coherence; breaks waste-reduction logic | Allow swap at meal level, not ingredient level |
| Separate iOS and Android native codebases | Double the development effort for a greenfield project | React Native — confirmed in PROJECT.md Key Decisions |

---

## Feature Dependencies

```
User profile (dietary preferences + intolerances)
  └── Weekly plan generation (plan is meaningless without profile)
        ├── Recipe detail view (plan items must be tappable)
        ├── Shopping list generation (derived from plan)
        │     └── Mark items as bought
        └── Single-meal swap (swap must respect the same profile)
              └── Partial plan replacement (more granular swap)

Cross-week ingredient sharing
  └── Weekly plan generation (sharing IS the generation strategy, not a post-process)
        └── Leftover repurposing suggestions (requires knowing what was cooked)

Pantry / staples tracking
  └── Shopping list generation (subtract pantry from list)

"What's in my fridge?" input
  └── Weekly plan generation (fridge contents become a constraint)
        └── Cross-week ingredient sharing (extended: use fridge items first)
```

---

## MVP Recommendation

The v1 must prove the core loop: profile → plan → cook → less waste. Everything else is iteration.

**Prioritize:**
1. User profile — preferences, intolerances, household size (safety-critical for intolerances)
2. Automated weekly plan generation — the product's reason to exist
3. Recipe detail view — users need to know what they're committing to
4. Aggregated shopping list — closes the loop for the weekly use case
5. Single-meal swap — without this, users with one rejected meal churn
6. Cross-week ingredient sharing in plan generation — this is the primary differentiator; it must be in v1, not bolted on later, because it requires being designed into the generation algorithm from the start

**Defer (post-validation):**
- Leftover repurposing: Medium complexity, genuine differentiator — add in v2 once plan generation is validated
- "What's in my fridge?" input: High complexity and onboarding friction — validate whether users will invest the setup time
- Push notifications: Easy to add, but premature until core engagement is proven
- Pantry tracking: Useful but adds setup friction; defer until users ask for it
- Partial plan replacement: Nice-to-have; full swap plus full regen covers 90% of use cases at launch

**Hard no in v1:**
- Calorie/macro tracking (PROJECT.md Out of Scope — confirmed)
- Social features (PROJECT.md Out of Scope — confirmed)
- Grocery delivery integration (out of scope: too much partnership/API surface area)

---

## Competitive Landscape Notes

**Mealime** (MEDIUM confidence — training data): Focuses on quick meals (30 min or less), strong on shopping list consolidation, weak on waste reduction. Subscription model. Known for clean UI and simplicity. No explicit ingredient-sharing / waste optimization.

**PlateJoy** (MEDIUM confidence — training data): Strong personalization via onboarding quiz, integrates with Instacart, skews toward health/diet goals. Positions as a health tool, not a waste-reduction tool. More nutritional tracking than Settimana Smart wants.

**Yummly** (MEDIUM confidence — training data): Recipe discovery first, meal planning second. Large recipe database. Smart shopping list. Acquired by Whirlpool; has smart appliance integration. Not waste-reduction focused.

**Gap in market** (LOW confidence — based on training data, needs validation): No major app explicitly positions itself around ingredient-sharing across the week for waste reduction as its primary value proposition. Most apps treat waste reduction as a secondary benefit ("oh and you'll waste less food") rather than the core organizing principle of plan generation. This gap is Settimana Smart's opportunity — if validated by users.

---

## Sources

- Training knowledge covering Mealime, PlateJoy, Yummly, Paprika, Whisk, Frigo Magic app landscape (as of August 2025) — MEDIUM confidence
- External web verification was unavailable during this session (WebSearch and WebFetch tools denied). Findings should be cross-checked against current app store listings and competitor feature pages before roadmap is finalized.
- PROJECT.md (Settimana Smart) — HIGH confidence for project-specific scope decisions

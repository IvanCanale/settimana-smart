# Roadmap: Settimana Smart

## Overview

Settimana Smart is a brownfield Next.js 16 PWA with a working plan generation engine. The path to v1 is not building from scratch but evolving what exists: harden the engine, activate auth and onboarding, decompose the monolith and wire cloud sync, integrate AI recipe generation, formalize the plan lifecycle and shopping list, then add notifications. Each phase delivers a coherent, verifiable capability on top of what came before.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation Hardening** - Decompose the monolith, add test coverage, and clean dependencies so every subsequent phase builds on a solid base (completed 2026-03-21)
- [x] **Phase 2: Auth and Onboarding** - Activate Supabase auth and replace the unguided preferences form with a step-by-step onboarding flow including safety-critical allergen selection (completed 2026-03-21)
- [x] **Phase 3: Engine Hardening and Cloud Sync** - Add allergen validation layer, multi-objective variety constraints, and activate Supabase cloud sync (completed 2026-03-21)
- [x] **Phase 4: AI Recipe Generation** - Replace the static 150-recipe library with GPT-4o-mini generated recipes validated through a deterministic allergen layer (completed 2026-03-21)
- [x] **Phase 5: Plan Lifecycle and Shopping** - Formalize the DRAFT/ACTIVE/ARCHIVED plan state machine, week-scoped plan co-existence, and canonical shopping list aggregation (completed 2026-03-21)
- [x] **Phase 6: Notifications** - Add push notifications for weekly planning prompts and shopping day reminders (completed 2026-03-21)
- [x] **Phase 7: Account Management** - Add account deletion (Apple App Store compliance), GDPR data export, preference reset, and enhanced profile info page (completed 2026-03-21)

## Phase Details

### Phase 1: Foundation Hardening
**Goal**: The codebase is decomposed and tested so new features can be added without compounding existing structural debt
**Depends on**: Nothing (first phase)
**Requirements**: TECH-01, TECH-02, ENGINE-04
**Success Criteria** (what must be TRUE):
  1. `page.tsx` has been split into tab components (`PlannerTab`, `WeekTab`, `ShoppingTab`) and custom hooks (`usePlanEngine`, `useLocalStorage`) — the monolith file is under 200 lines
  2. `planEngine.ts` business-critical functions are covered by Vitest tests — running `vitest` shows green with coverage on `buildPlan()`, `scoreCandidate()`, `aggregateShopping()`
  3. `framer-motion` and the `radix-ui` meta-package are removed from `package.json` and the bundle
  4. The app still opens in the browser and the plan, recipe, and shopping views all render without errors after refactoring
**Plans:** 2/2 plans complete
Plans:
- [x] 01-01-PLAN.md — Vitest setup, planEngine test coverage, engine bug fixes, dependency cleanup
- [ ] 01-02-PLAN.md — CSS migration, monolith decomposition into tab components and hooks, error boundary

### Phase 2: Auth and Onboarding
**Goal**: Users have a real identity in the system and have completed a guided profile setup that includes allergen selection before accessing the app
**Depends on**: Phase 1
**Requirements**: AUTH-01, AUTH-02, AUTH-03, ONBOARD-01, ONBOARD-02, ONBOARD-03, ONBOARD-04, ONBOARD-05
**Success Criteria** (what must be TRUE):
  1. A new user opening the app for the first time is taken through a step-by-step onboarding flow before reaching the main screen — they cannot skip allergen/intolerance selection
  2. A user can register with email and password and their account persists across app restarts
  3. A user can log in, remain logged in across browser sessions, and log out from any screen
  4. A returning user can open Profile and change their intolerances, dietary preferences, or household size after onboarding
  5. The plan generated after onboarding reflects the household size and dietary preferences entered during onboarding
**Plans:** 2/2 plans complete
Plans:
- [x] 02-01-PLAN.md — Extend OnboardingFlow to 5 steps with allergen selection and optional registration
- [x] 02-02-PLAN.md — ProfileDrawer component with preference editing and auth management

### Phase 3: Engine Hardening and Cloud Sync
**Goal**: The plan engine enforces allergen safety deterministically, guarantees meal variety, and user plans are persisted to the cloud and accessible from multiple devices
**Depends on**: Phase 2
**Requirements**: ENGINE-01, ENGINE-02, ENGINE-03, CLOUD-01, CLOUD-02
**Success Criteria** (what must be TRUE):
  1. A plan generated for a user with a declared intolerance (e.g., lactose) contains no meals with that allergen — verified by inspecting generated plan ingredients
  2. No protein (e.g., chicken, fish, legumes) appears in the main meal slot more than twice in the same week's generated plan
  3. The weekly shopping list is shorter than the sum of individual meal ingredient lists — ingredient sharing between meals is active and measurable
  4. A user who logs in on a second device sees the same plan they generated on the first device
  5. The app shows the saved plan when the device has no internet connection
**Plans:** 2/2 plans complete
Plans:
- [ ] 03-01-PLAN.md — Engine hardening: hard protein variety cap, allergen post-validation gate, shared ingredient metric
- [ ] 03-02-PLAN.md — Cloud sync: auto-save with debounce, load-on-mount for multi-device, offline banner

### Phase 4: AI Recipe Generation
**Goal**: The static recipe library is replaced by a shared Supabase catalog enriched weekly by an AI job that researches real Italian recipes, with the plan engine reading from Supabase and a notification center surfacing new recipes to users
**Depends on**: Phase 3
**Requirements**: RECIPES-01, RECIPES-02, RECIPES-03, RECIPES-04
**Success Criteria** (what must be TRUE):
  1. The app generates a complete weekly plan using AI-created recipes — none of the recipes are from the static `recipes.ts` file
  2. Every AI-generated recipe includes structured ingredients with quantity and unit, numbered preparation steps, and an estimated cooking time
  3. A recipe generated for a user with a declared allergen never reaches the UI containing that allergen — the post-generation validation layer blocks it before display
  4. Generated recipes are recognizable Italian dishes with realistic ingredients (not invented combinations)
  5. The plan generation screen shows a progress indicator while AI generation runs — the UI never freezes or shows a blank screen during the 8-25 second generation window
**Plans:** 4/4 plans complete
Plans:
- [ ] 04-01-PLAN.md — Zod recipe schema, SQL migrations, fetchRecipes(), seed migration script
- [ ] 04-02-PLAN.md — Wire usePlanEngine to Supabase with async fetch, cache, and fallback
- [ ] 04-03-PLAN.md — Supabase Edge Function for two-step AI recipe cataloging
- [ ] 04-04-PLAN.md — Notification center UI: bell icon, drawer, recipe discovery page, wishlist

### Phase 5: Plan Lifecycle and Shopping
**Goal**: Plans are week-scoped with a formal state machine, multiple weeks can coexist without overwriting each other, and the shopping list correctly aggregates Italian ingredient variants into single entries
**Depends on**: Phase 4
**Requirements**: PLAN-01, PLAN-02, PLAN-03, PLAN-04, PLAN-05, PLAN-06, SHOP-01, SHOP-02, SHOP-03
**Success Criteria** (what must be TRUE):
  1. The plan for the current week and the plan for next week are visible simultaneously without one overwriting the other
  2. When Monday arrives, last week's plan automatically moves to ARCHIVED status — the user can see this reflected in the plan header
  3. A user can regenerate next week's plan with a text note ("less fish this week") while the current week's plan remains unchanged
  4. A user marking "pomodori pelati" as bought sees it merged with "pomodoro" — they are not listed as two separate shopping items
  5. A user who marks three shopping items as bought, closes the app, and reopens it finds those three items still marked as bought
  6. A meal that reuses leftovers from the previous day is explicitly labeled in the week view
  7. A user can swap a single meal and receive a suggested replacement compatible with their allergen profile
**Plans:** 4/4 plans complete
Plans:
- [ ] 05-01-PLAN.md — Week utilities (ISO week helpers), PlanStatus/WeeklyPlanRecord types, multi-week SQL migration
- [ ] 05-02-PLAN.md — Shopping canonicalization (Italian ingredient variant merging) and checked-item persistence
- [ ] 05-03-PLAN.md — Multi-week plan persistence (Supabase save/load update), useWeeklyPlans hook, feedback note
- [ ] 05-04-PLAN.md — Leftover badge in week view, regenerateSingleMeal fix to use live recipe pool

### Phase 6: Notifications
**Goal**: Users receive timely push notifications that prompt weekly planning before the shopping day and are sent only on the day they chose
**Depends on**: Phase 5
**Requirements**: NOTIF-01, NOTIF-02, NOTIF-03
**Success Criteria** (what must be TRUE):
  1. A user can select their preferred shopping day in the Profile screen — this setting is saved and persists
  2. The evening before the user's selected shopping day, the app sends a push notification reminding them to review/finalize the weekly plan
  3. The user can configure a specific time for a second notification sent on the shopping day itself as a reminder to go shopping — this time is saved in the profile
  4. A user who has not granted notification permissions is prompted to grant them at an appropriate moment (not during onboarding) — the app works fully without notifications if declined
**Plans:** 3/3 plans complete
Plans:
- [ ] 06-01-PLAN.md — Extend Preferences type, notification scheduling utils with tests, ProfileDrawer shopping day picker
- [ ] 06-02-PLAN.md — Push subscription infrastructure: service worker, hook, server actions, migration, NotificationPrompt UI
- [ ] 06-03-PLAN.md — Edge Function for scheduled push dispatch, pg_cron schedules, end-to-end verification

### Phase 7: Account Management — eliminazione account, export dati GDPR, reset preferenze, pagina profilo
**Goal**: Users can delete their account (required for Apple App Store), export all their data as JSON (GDPR), reset preferences to defaults, and see enhanced profile information including creation date and plan count
**Depends on**: Phase 6
**Requirements**: ACCT-01, ACCT-02, ACCT-03, ACCT-04
**Success Criteria** (what must be TRUE):
  1. A logged-in user can permanently delete their account from ProfileDrawer — all rows in preferences, weekly_plan, and push_subscriptions are deleted and the auth account is removed
  2. A logged-in user can download all their data as a JSON file from ProfileDrawer
  3. A user can reset all preferences to default values with a single confirmed action — all 5 localStorage keys are cleared
  4. ProfileDrawer shows user email, account creation date, and number of plans generated for logged-in users
  5. All destructive actions (delete, reset) require an explicit Italian confirmation step before executing
**Plans:** 2/2 plans complete
Plans:
- [ ] 07-01-PLAN.md — Supabase Edge Function delete-account + exportUserData() client utility
- [ ] 07-02-PLAN.md — ProfileDrawer: enhanced profile info card + Zona pericolosa (delete/export/reset)

### Phase 8: Legal — Privacy Policy e Terms of Service (pagine pubbliche), consenso esplicito al signup
**Goal**: Users can access a Privacy Policy at /privacy and Terms of Service at /terms, and must explicitly consent to both before creating an account during onboarding
**Depends on**: Phase 7
**Requirements**: LEGAL-01, LEGAL-02, LEGAL-03
**Success Criteria** (what must be TRUE):
  1. /privacy renders an Italian-language Privacy Policy covering data collected, Supabase as processor, retention, and user rights
  2. /terms renders an Italian-language Terms of Service covering service description, no-warranty clause, and Italian governing law
  3. Both pages are accessible without authentication and use the existing design system (no external dependencies)
  4. The onboarding Step 4 (registration) shows a consent checkbox linking to /privacy and /terms — "Crea account o accedi" is disabled until checked
  5. "Continua senza account" requires no consent — anonymous use remains frictionless
**Plans:** 2 plans
Plans:
- [ ] 08-01-PLAN.md — Privacy Policy page (/privacy) and Terms of Service page (/terms) as static server components
- [ ] 08-02-PLAN.md — Consent checkbox in OnboardingFlow Step 4 with links to legal pages

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation Hardening | 2/2 | Complete   | 2026-03-21 |
| 2. Auth and Onboarding | 2/2 | Complete   | 2026-03-21 |
| 3. Engine Hardening and Cloud Sync | 2/2 | Complete   | 2026-03-21 |
| 4. AI Recipe Generation | 4/4 | Complete   | 2026-03-21 |
| 5. Plan Lifecycle and Shopping | 4/4 | Complete   | 2026-03-21 |
| 6. Notifications | 3/3 | Complete   | 2026-03-21 |
| 7. Account Management | 2/2 | Complete   | 2026-03-21 |
| 8. Legal | 0/2 | In Progress | — |

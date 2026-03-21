# Phase 2: Auth and Onboarding - Context

**Gathered:** 2026-03-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Identità utente nel sistema + flusso onboarding guidato step-by-step (obbligatorio alla prima apertura) con selezione allergie safety-critical prima di accedere all'app. Auth Supabase attivato (già scaffolded). L'utente può registrarsi, fare login/logout, e modificare il proprio profilo dopo l'onboarding. L'app funziona anche per utenti anonimi (localStorage).

</domain>

<decisions>
## Implementation Decisions

### Ordine auth ↔ onboarding
- Onboarding prima, registrazione come ultimo step dell'onboarding
- Flusso primo avvio: persone → dieta → allergie → tempo → registrazione (opzionale)
- Se l'utente salta la registrazione: usa l'app con dati in localStorage (utente anonimo)
- Auth modal appare solo quando l'utente clicca "Sincronizza su cloud" o funzioni cloud-only
- Un utente anonimo ha accesso completo all'app — nessun muro prima di vedere il valore

### Allergie nell'onboarding (ONBOARD-02 — safety-critical)
- Step allergie aggiunto come step 3 nell'`OnboardingFlow` esistente: persone → dieta → **allergie** → tempo → registrazione
- UI: chip multi-select, stile coerente con i bottoni dieta esistenti in `OnboardingFlow.tsx`
- Allergie da mostrare (10): glutine, latticini, uova, pesce, crostacei, frutta a guscio, sesamo, soia, arachidi, sedano
- Opzione esclusiva "Nessuna allergia" che deselezione tutto il resto
- **Non skippabile** — l'utente DEVE scegliere almeno "Nessuna allergia" per andare avanti
- Le intolleranze selezionate sono salvate in `Preferences.exclusions[]` (campo già esistente nel tipo)

### Profilo post-onboarding (ONBOARD-05)
- Icona profilo nell'`AppHeader` esistente apre un drawer/modal laterale
- Il drawer mostra tutti i campi modificabili: persone, dieta, allergie, tempo, budget
- Sezione auth nel drawer: se anonimo mostra "Accedi / Registrati" (apre `AuthModalInline`); se loggato mostra email + pulsante "Esci"
- NON aggiungere un tab dedicato al profilo — 5 tab esistenti sono già sufficienti

### Utenti anonimi
- L'app funziona completamente senza account (dati in localStorage)
- Il sync cloud è opzionale e non blocca l'uso dell'app
- Il modal auth appare solo se l'utente clicca esplicitamente su "Sincronizza / Salva nel cloud"
- Alla registrazione/login: migrazione automatica dati localStorage → Supabase (funzione `migrateFromLocalStorage` già in `src/lib/supabase.ts`)

### Claude's Discretion
- Design esatto del drawer profilo (larghezza, animazione, overlay)
- Comportamento del pulsante "indietro" nell'onboarding al passo allergie
- Messaggio di conferma dopo la migrazione localStorage → cloud
- Gestione errori Supabase durante signup (email già in uso, password troppo corta)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Codice auth esistente
- `src/lib/AuthProvider.tsx` — Supabase client creation, session management, AuthContext, useAuth hook
- `src/components/AuthModalInline.tsx` — Modal completo con Google, Apple, email/password — già funzionante
- `src/lib/supabase.ts` — Helper DB: loadUserData, savePreferences, savePantry, saveWeeklyPlan, migrateFromLocalStorage

### Onboarding esistente
- `src/components/OnboardingFlow.tsx` — Flusso 3 step attuale (persone, dieta, tempo) — va esteso con step allergie e step registrazione
- `src/components/AppHeader.tsx` — Header esistente dove aggiungere icona profilo

### Requisiti di fase
- `.planning/REQUIREMENTS.md` §AUTH-01, §AUTH-02, §AUTH-03, §ONBOARD-01, §ONBOARD-02, §ONBOARD-03, §ONBOARD-04, §ONBOARD-05
- `.planning/ROADMAP.md` §Phase 2 — success criteria della fase

### Architettura e pattern
- `.planning/codebase/ARCHITECTURE.md` — layer esistenti, pattern data flow
- `.planning/codebase/CONVENTIONS.md` — naming, TypeScript strict, path alias @/*

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `AuthProvider.tsx` + `useAuth()` hook: già in `src/lib/AuthProvider.tsx`, già wrappa l'app in `layout.tsx` — disponibile in qualsiasi componente
- `AuthModalInline.tsx`: modal auth completo con Google, Apple, email — riusabile dentro il drawer profilo
- `OnboardingFlow.tsx`: struttura 3-step esistente — aggiungere step allergie (index 2) e step registrazione (index 4)
- `migrateFromLocalStorage()` in `supabase.ts`: già implementata, chiamarla al primo login/signup

### Established Patterns
- Preferenze in `Preferences` type: `exclusions: string[]` già esistente per allergie
- Stile bottoni onboarding: CSS var `--terra`, `--cream`, `--sepia` — coerenza visiva garantita riusando gli stili esistenti in `OnboardingFlow.tsx`
- Animazioni: `animate-in` class CSS già definita in `globals.css`

### Integration Points
- `page.tsx` (ora orchestratore ~192 righe): gestisce `onboardingStep` e `hasOnboarded` via `useLocalStorage` — la condizione di gate onboarding si aggiunge qui
- `AppHeader.tsx`: aggiungere icona profilo che apre drawer — il componente riceve già `user` come prop dall'`AuthContext`
- Al login/signup: chiamare `migrateFromLocalStorage(sbClient, userId)` prima di caricare dati utente dal cloud

</code_context>

<specifics>
## Specific Ideas

- L'onboarding è già visivamente curato (card warm, animazioni, progress dots) — lo step allergie deve seguire lo stesso stile
- "Nessuna allergia" come chip esclusivo evita ambiguità: l'utente non può avanzare senza scegliere qualcosa
- Il drawer profilo riusa gli stessi widget dell'onboarding (numero persone con +/−, dieta a griglia, allergie a chip, tempo a lista)

</specifics>

<deferred>
## Deferred Ideas

- Nessuna idea fuori scope emersa durante la discussione

</deferred>

---

*Phase: 02-auth-and-onboarding*
*Context gathered: 2026-03-21*

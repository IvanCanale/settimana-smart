# Phase 1: Foundation Hardening - Context

**Gathered:** 2026-03-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Refactoring strutturale del codebase esistente: decomposizione del monolith `page.tsx`, aggiunta test coverage su `planEngine.ts`, cleanup dipendenze inutilizzate, fix bug noti che verranno comunque toccati durante il refactoring, e aggiunta di un error boundary. Zero nuove feature visibili all'utente. L'app deve funzionare esattamente come prima al termine della fase.

</domain>

<decisions>
## Implementation Decisions

### Decomposizione page.tsx

- Estrai i 5 tab come componenti separati in `src/components/`: `PlannerTab`, `WeekTab`, `ShoppingTab`, `CucinaTab`, `RicetteTab`
- Estrai custom hooks in `src/hooks/`: `usePlanEngine`, `useLocalStorage`, `useLearning`
- Estrai helper components inline in `src/components/`: `AuthModalInline`, `SectionHeader`, `TagPill`, `TimeTag`
- Target: `page.tsx` ridotto a orchestratore sotto 200 righe
- CSS `designTokens` (~400 righe di `<style>` iniettata nel render): sposta in `src/app/globals.css` come CSS custom properties — rimuove 400 righe da page.tsx, risolve il problema di performance (re-inject ad ogni render), elimina il doppio sistema CSS
- Verifica nessuna regressione con Vitest snapshot UI sui componenti estratti

### Test coverage (ENGINE-04)

- Framework: Vitest (da installare)
- Funzioni da coprire in `src/lib/planEngine.ts`: `buildPlan()`, `scoreCandidate()`, `aggregateShopping()`, `pantryMatches()`, `normalize()`, `computeStats()`, `getRecipeCategory()`
- Strategia: `runSanityChecks()` già esistente (line 665 di planEngine.ts) integrata come smoke test + Vitest con asserzioni precise per ogni funzione
- Focus: casi limite (dieta vegana, intolleranze multiple, dispensa vuota, dispensa piena, piano con override manuali)

### Bug noti da correggere durante Fase 1

- **window.alert() → toast/banner**: Sostituire `window.alert(msg)` (line 899 di page.tsx) con un componente toast/banner non bloccante — verrà comunque toccato durante la decomposizione
- **Logica budget nel motore**: Implementare filtro/scoring budget in `planEngine.ts` — il campo `budget` in `Preferences` esiste già, va solo collegato all'algoritmo di selezione ricette
- **Fix coniglio duplicato**: Rimuovere `"coniglio"` e `"coniglio a pezzi"` da `POULTRY_INGREDIENTS` in planEngine.ts (attualmente in entrambi MEAT e POULTRY, risultato: non viene mai generato in 2/3 dei casi)

### Error boundary

- Aggiungere error boundary in `src/app/layout.tsx` che wrappa l'applicazione
- Comportamento su crash: mostra messaggio "Qualcosa è andato storto" + pulsante "Ricarica" che pulisce localStorage corrotto e ricarica l'app
- Prerequisito per qualsiasi deployment in produzione

### Verifica regressione

- Vitest snapshot UI sui componenti estratti per garantire nessuna regressione visiva
- Test manuali sui flussi critici: genera piano, swap pasto, spunta ingrediente spesa

### Claude's Discretion

- Struttura esatta delle cartelle dentro `src/components/` e `src/hooks/`
- Granularità dei Vitest (numero e profondità dei test case per funzione)
- Implementazione specifica del toast/banner per i freeze reminder
- Design del messaggio e UI dell'error boundary

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Codice da refactorare
- `.planning/codebase/ARCHITECTURE.md` — architettura attuale, layer e dipendenze tra moduli
- `.planning/codebase/CONCERNS.md` — lista completa dei tech debt, bug noti, e problemi di sicurezza con file e line numbers
- `.planning/codebase/CONVENTIONS.md` — convenzioni di naming, import order, TypeScript strict mode, path aliases `@/*`
- `.planning/codebase/STRUCTURE.md` — struttura file attuale del progetto
- `.planning/codebase/TESTING.md` — stato attuale test coverage (zero)

### Requisiti di fase
- `.planning/REQUIREMENTS.md` §TECH-01, §TECH-02, §ENGINE-04 — requisiti tecnici mappati a questa fase
- `.planning/ROADMAP.md` §Phase 1 — success criteria della fase

### File principali da modificare
- `src/app/page.tsx` — monolith da decomporre (1738 righe)
- `src/lib/planEngine.ts` — funzioni pure da testare + fix coniglio + logica budget
- `src/app/globals.css` — destinazione del CSS da migrare da designTokens
- `src/app/layout.tsx` — dove aggiungere l'error boundary
- `package.json` — rimozione framer-motion e radix-ui meta-package

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/ui/` — button, card, checkbox, input, label, select, slider, tabs, textarea già disponibili (shadcn/ui)
- `src/lib/utils.ts` — `cn()` helper per className composition
- `runSanityChecks()` in `src/lib/planEngine.ts` line 665 — già scritta, da integrare come smoke test in Vitest
- `src/types/index.ts` — tutti i tipi (`Recipe`, `Preferences`, `PlanResult`, etc.) già definiti e stabili

### Established Patterns
- Path alias `@/` → `src/` — usare sempre, mai relative paths `../../`
- TypeScript strict mode — tutto il codice deve passare `tsc --noEmit`
- Named exports — mai default exports tranne per Next.js pages/layouts
- Commenti in italiano per business logic, ASCII section headers per separare blocchi
- `import type { ... }` per type-only imports

### Integration Points
- `src/app/layout.tsx` wrappa `AuthProvider` — l'error boundary va aggiunto qui
- `src/app/page.tsx` importa `useAuth()` da `src/lib/AuthProvider.tsx` — il hook dovrà essere importato nei tab components estratti
- `RECIPE_LIBRARY` è importata sia da `page.tsx` che da `planEngine.ts` — i componenti estratti la importano da `@/data/recipes`
- State management: tutto in `useState` nel componente principale — i custom hooks incapsulan lettura/scrittura localStorage

</code_context>

<specifics>
## Specific Ideas

- Il CSS `designTokens` usa variabili CSS come `--terra`, `--cream`, `--olive`, `--sepia` — verificare che non collidano con variabili Tailwind v4 in globals.css prima della migrazione
- La logica budget dovrà agire sul `scoreCandidate()` — aggiungere un fattore di scoring basato sul campo `budget` (es. penalizza ricette con ingredienti costosi)
- Il toast per i freeze reminder dovrà essere non bloccante (non `window.alert`) — può usare un componente toast semplice o uno shadcn/ui toast

</specifics>

<deferred>
## Deferred Ideas

- Zod validation su localStorage parsing — CONCERNS.md lo suggerisce come security fix, ma è in scope Fase 3 (Cloud Sync) dove i dati vengono validati al caricamento
- Pre-build pantry match cache per performance — CONCERNS.md documenta O(pantry × ingredients × recipes) — defer a quando il motore ha test coverage solida
- Recipe search/filter nella tab Ricette — nuova feature, Fase 4+
- `force-dynamic` in layout.tsx — rimuovere per CDN caching — defer, rischio basso durante refactoring

</deferred>

---

*Phase: 01-foundation-hardening*
*Context gathered: 2026-03-19*

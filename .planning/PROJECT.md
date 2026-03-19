# Settimana Smart

## What This Is

PWA mobile-first (Next.js 16 / React 19 / Supabase) per la pianificazione dei pasti settimanali. L'app genera automaticamente un piano pasto personalizzato ogni settimana (colazione, pranzo, cena), con ricette, lista della spesa aggregata e ottimizzazione anti-spreco tramite condivisione degli ingredienti tra i pasti. Pensata per persone e famiglie con poco tempo che vogliono mangiare in modo equilibrato senza dover decidere ogni giorno cosa cucinare.

## Core Value

L'utente apre l'app a inizio settimana e trova già tutto deciso: cosa mangiare ogni giorno, come prepararlo, e cosa comprare — senza sprechi e senza pensieri.

## Requirements

### Validated

- ✓ Piano settimanale generato automaticamente (`planEngine.ts` con `buildPlan()`) — esistente
- ✓ Vista dettaglio ricette — esistente
- ✓ Lista della spesa aggregata (`aggregateShopping()`) — esistente
- ✓ Swap singolo pasto con override manuale — esistente
- ✓ Supporto offline base (service worker + manifest PWA) — esistente
- ✓ Form preferenze alimentari base — esistente (unguided)
- ✓ Algoritmo anti-spreco parziale (bonus ingredient-sharing in `scoreCandidate()`) — esistente

### Active

- [ ] Onboarding guidato con hard-filter per intolleranze/allergie (safety-critical)
- [ ] Auth Supabase attivato (scaffolded ma disabilitato)
- [ ] Cloud sync multi-device via Supabase
- [ ] Allergen validation layer deterministico (gate post-generazione, mai delegato a LLM)
- [ ] Vincolo varietà nel motore (multi-objective: anti-spreco + non-monotonia)
- [ ] Test coverage su `planEngine.ts` (zero coverage attuale — massimo rischio)
- [ ] AI generazione ricette via OpenAI GPT-4o-mini (supera limite 150 ricette statiche)
- [ ] Schema ricetta strutturato con Zod validation (previene errori da output LLM)
- [ ] Canonical ingredient registry per aggregazione lista della spesa (nomi italiani)
- [ ] Piano state machine (DRAFT → ACTIVE → ARCHIVED — previene rigenerazione silenziosa)
- [ ] Decomposizione monolith `page.tsx` (1738 righe → tab components + custom hooks)
- [ ] Push notifications (promemoria domenica per pianificare la settimana)
- [ ] Vista riutilizzo avanzi (piano-design level, nessun meal tracking)

### Out of Scope

- React Native / app nativa — la PWA è completa, rewrite a costo zero beneficio in v1
- Calorie / macro tracking — contraddice il posizionamento "senza pensieri"
- Funzionalità social / condivisione — app personale
- "Cosa ho in frigo" tracking — attrito onboarding troppo alto, defer v2
- Grocery delivery integration — partnership/API fuori scope v1
- Obiettivi dietetici specifici (perdita peso, massa muscolare) — fuori da v1

## Context

- **Codebase esistente**: Next.js 16.1.6, React 19, TypeScript 5, Tailwind v4, shadcn/ui, Supabase ~2.49.x
- **Piano engine**: `src/lib/planEngine.ts` — funzioni pure, seed-based determinism, zero test coverage
- **Recipe library**: `src/data/recipes.ts` — ~150 ricette statiche (limite di scaling documentato in CONCERNS.md)
- **Monolith**: `src/app/page.tsx` — 1738 righe, va decomposto prima di aggiungere feature
- **Supabase**: auth scaffolded + tabelle DB + RLS policy + stubs cloud sync — tutto disabilitato
- **Problemi noti** (da CONCERNS.md): framer-motion inutilizzato (140KB+), radix-ui meta-package da rimuovere, campo `budget` raccolto ma mai usato, array string hardcoded per classificazione ingredienti
- Il nome dell'app è già "settimana smart" — rispecchia il concetto

## Constraints

- **Stack**: Next.js 16 PWA — non si cambia piattaforma, si evolve l'esistente
- **Safety**: Le intolleranze/allergie sono un hard-filter deterministico — mai delegate a LLM
- **Tempo ricette**: Le ricette devono essere rapide da preparare (target utenti con poco tempo)
- **Lingua**: App e ricette in italiano

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| PWA invece di React Native | Codebase esistente funzionante, rewrite = 4-8 settimane a zero beneficio in v1 | ✓ Confermato dalla ricerca |
| Piano fisso con swap singoli | Riduce il carico cognitivo — l'utente aggiusta solo se necessario | — Pending |
| Anti-spreco multi-objective (varietà + ingredient-sharing) | Single-objective solo su overlap → piano monotono → churn settimana 2 | — Pending |
| Allergen validation layer deterministico | LLM non può essere responsabile della sicurezza alimentare | — Pending |
| OpenAI GPT-4o-mini per generazione ricette | Più economico, output strutturato, supera il limite 150 ricette | — Pending |

---
*Last updated: 2026-03-19 after research — brownfield, codebase esistente confermata*

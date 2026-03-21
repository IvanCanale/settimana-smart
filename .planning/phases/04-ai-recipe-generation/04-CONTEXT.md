# Phase 4: AI Recipe Generation - Context

**Gathered:** 2026-03-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Sostituire le 150 ricette statiche con un catalogo condiviso su Supabase, alimentato automaticamente da un job settimanale che usa web search + AI (GPT-4o-mini) per trovare, strutturare e catalogare ricette italiane reali. Il motore `buildPlan()` pesca dal catalogo Supabase invece del file statico `recipes.ts`. Non si genera AI on-demand per ogni piano — l'AI lavora in background per arricchire il catalogo.

</domain>

<decisions>
## Implementation Decisions

### Architettura: catalog enrichment, non generazione on-demand

- L'AI **non genera ricette al momento della richiesta del piano** — troppo lento e inaffidabile
- L'AI fa da **ricercatrice e catalogatrice**: trova ricette reali su siti italiani via web search, le struttura e le salva in Supabase
- Il motore `buildPlan()` rimane invariato ma legge dal catalogo Supabase invece di `recipes.ts`
- Questo approccio garantisce: ricette reali (non allucinatorie), allergen safety più robusta, zero latenza per l'utente al momento del piano

### Fonte ricette

- **Web search** su siti di cucina italiana (Giallo Zafferano, Cucchiaio d'Argento, La Cucina Italiana, ecc.)
- L'AI cerca, legge e struttura il contenuto delle pagine — nessuna API di terze parti a pagamento
- Le ricette devono essere **realisticamente italiane**: ingredienti verificabili, piatti riconoscibili, non combinazioni inventate

### Job di catalogazione

- **Automatico in background**, settimanale
- Aggiunge **20 ricette per tipo di dieta** a ogni run (es. 20 vegane, 20 vegetariane, 20 onnivore, ecc.)
- Deduplicazione per **nome normalizzato** (lowercase, senza accenti, trim) — evita duplicati evidenti senza overhead di embedding
- Nessuna UI per l'utente durante il job — silenzioso e trasparente

### Catalogo Supabase: tabella condivisa

- **Un'unica tabella `recipes` su Supabase** condivisa tra tutti gli utenti
- Tutti beneficiano del lavoro di catalogazione — nessuna duplicazione per utente
- Le 150 ricette statiche di `recipes.ts` diventano il **seed del catalogo** — migrate in Supabase prima dell'attivazione del job AI
- `recipes.ts` viene deprecato come sorgente dati principale dopo la migrazione

### Schema ricetta nel catalogo

Ogni ricetta nel catalogo Supabase deve avere:
- `ingredients`: array di `{ name, quantity, unit }` — necessario per allergen check e aggregazione spesa
- `steps`: array di stringhe numerate — istruzioni di preparazione step-by-step
- `prepTime`: numero in minuti — usato dal filtro `tempo_max` del motore
- `difficulty`: 1 | 2 | 3 — usato da `scoreCandidate()`
- `estimatedCost`: numero in euro — usato dallo scoring budget
- `proteinCategory`: `"carne" | "pesce" | "legumi" | "uova" | "latticini" | "vegano"` — usato dal filtro varietà ENGINE-02
- `dietType`: `"vegana" | "vegetariana" | "onnivora"` — per il filtro dieta
- `source_url`: URL di provenienza — tracciabilità e copyright attribution
- `added_by`: `"seed" | "ai_job"` — distingue ricette statiche migrate da quelle aggiunte dall'AI

### Allergen validation

- Il layer `validateAllergenSafety()` (già in produzione da Fase 3) viene applicato al momento della selezione delle ricette dal catalogo — **invariato**
- Nessuna logica allergenica delegata all'AI — deterministico come prima
- L'AI semplicemente cataloga; il gate di sicurezza è separato e controllato

### UX: scoperta ricette nuove

- Badge discreto nel **tab Ricette** quando ci sono ricette aggiunte nell'ultima settimana (`added_at > now() - 7 days`)
- Nessuna notifica push in Fase 4 — la push notification "20 nuove ricette disponibili" è **demandata alla Fase 6** come nuovo tipo di notifica
- L'utente genera il piano normalmente — non nota la differenza nel flusso, trova solo ricette che non aveva mai visto

### Claude's Discretion

- Schema SQL preciso della tabella `recipes` (indici, RLS policy, colonne aggiuntive)
- Struttura del job (cron Supabase Edge Function vs Node script vs API route)
- Logica di normalizzazione nomi per deduplicazione
- Numero di ricette nel seed iniziale (le 150 possono essere più o meno — migrare tutte)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Engine e schema ricette
- `src/lib/planEngine.ts` — struttura RecipeItem attuale, `buildPlan()`, `scoreCandidate()`, `aggregateShopping()`, `ALLERGEN_INGREDIENT_MAP`, `validateAllergenSafety` (da Fase 3)
- `src/data/recipes.ts` — 150 ricette statiche da migrare in Supabase come seed
- `src/hooks/usePlanEngine.ts` — hook che wrappa buildPlan(), punto di sostituzione della sorgente dati

### Database e cloud
- `src/lib/supabase.ts` — client Supabase, funzioni esistenti (`saveWeeklyPlan`, `savePreferences`, `loadWeeklyPlan`)

### Requirements
- `.planning/REQUIREMENTS.md` §RECIPES-01, §RECIPES-02, §RECIPES-03, §RECIPES-04

### Roadmap e success criteria
- `.planning/ROADMAP.md` §Phase 4 — success criteria da soddisfare

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `planEngine.ts → validateAllergenSafety()`: già esportata da Fase 3 — viene applicata identicamente al catalogo Supabase
- `planEngine.ts → buildPlan()`: accetta `RecipeItem[]` — basta passargli le ricette da Supabase invece di quelle statiche
- `supabase.ts`: client già configurato, pattern `saveWeeklyPlan`/`loadWeeklyPlan` da estendere per `fetchRecipes`
- `RicetteTab.tsx`: tab esistente che mostra le ricette — da estendere con badge "novità"

### Established Patterns
- Zod validation per output LLM strutturato — da applicare anche allo schema ricette parsate dall'AI
- `useLocalStorage` con fallback — pattern per cache locale del catalogo ricette (offline support)
- Debounced useEffect per sync Supabase (da `usePlanEngine` Fase 3) — riusabile per fetch ricette

### Integration Points
- `usePlanEngine.ts`: sostituire `import { recipes } from "@/data/recipes"` con `fetchRecipes()` da Supabase
- `src/data/recipes.ts`: migrare array in script di seed per Supabase, poi deprecare come import
- Nuovo: `src/lib/recipeJob.ts` (o Supabase Edge Function) per il job di catalogazione AI

</code_context>

<specifics>
## Specific Ideas

- "Non voglio che l'AI generi ricette ma che faccia ricerche, cataloghi le ricette, capisca gli ingredienti, tempistiche, costi e alimenti sempre il catalogo con ricette nuove" — l'AI è un ricercatore, non un generatore
- 20 ricette per tipo di dieta a settimana — obiettivo volume specifico per run
- Siti target italiani: Giallo Zafferano, Cucchiaio d'Argento, La Cucina Italiana (sorgenti di qualità verificata)

</specifics>

<deferred>
## Deferred Ideas

- Push notification "N nuove ricette disponibili" — Fase 6 (infrastruttura notifiche già pianificata lì)
- Rating/preferenze utente sulle ricette ("non rifarla") — potenziale Fase 5 o backlog v2
- Ricette stagionali (filtraggio per stagione) — backlog v2

</deferred>

---

*Phase: 04-ai-recipe-generation*
*Context gathered: 2026-03-21*

# Phase 3: Engine Hardening and Cloud Sync - Context

**Gathered:** 2026-03-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Il motore di generazione viene rafforzato con vincoli deterministici (varietà proteine, allergen gate) e i piani vengono sincronizzati nel cloud Supabase con supporto offline. Non si aggiungono nuove feature visibili — si garantisce correttezza e persistenza multi-device.

</domain>

<decisions>
## Implementation Decisions

### Cloud sync — quando e cosa

- **Auto-save silenzioso**: ogni volta che l'utente genera o modifica un piano, si salva in background senza UI esplicita
- L'icona di sync nell'AppHeader (già presente con `syncStatus`) mostra lo stato: idle / saving / saved / error
- **Cosa si salva**: seed, manual overrides, learning, preferences — il piano si rigenera dal seed sul nuovo dispositivo. NON si serializza il piano completo
- Supabase helpers già in `src/lib/supabase.ts`: `savePreferences`, `savePantry`, `saveWeeklyPlan`, `loadUserData` — vanno solo attivati

### Conflitti offline/online

- **Locale vince sempre**: quando l'utente torna online, il suo piano locale sovrascrive il cloud silenziosamente
- Nessuna UI di risoluzione conflitti — troppa complessità per v1
- **Offline**: l'app mostra un piccolo banner "Modalità offline — modifiche salvate localmente" quando non c'è connessione
- La rigenerazione del piano funziona offline (il motore è puramente locale e deterministico)
- Al ritorno online: sync automatico del piano locale → cloud

### Vincolo varietà proteine (ENGINE-02)

- **Contatore esplicito** durante `buildPlan()`: traccia quante volte ogni proteina principale compare nel piano generato
- Regola: nessuna proteina (categoria: carne, pesce, pollo, legumi, uova) ripetuta più di 2 volte nella settimana
- Se una ricetta supera il limite, viene scartata durante la selezione e se ne cerca un'altra compatibile
- Solo proteine — nessun vincolo su pasta/cereali (fuori scope ENGINE-02)
- Il contatore va aggiunto come test in `planEngine.test.ts`

### Allergen gate (ENGINE-01)

- La mappa allergie EU è già implementata in Fase 2 (`ALLERGEN_INGREDIENT_MAP` in `planEngine.ts`)
- Aggiungere un **layer di validazione post-generazione** che verifica il piano finale e lancia un errore se trova ingredienti allergenici — safety net deterministico
- Il layer usa la stessa mappa già esistente — non c'è logica LLM
- Se il post-check fallisce (edge case): log dell'errore + rigenera con seed+1 (max 3 tentativi)

### Ingredient sharing (ENGINE-03)

- Il bonus ingredient-sharing in `scoreCandidate()` è già presente
- Aggiungere una metrica visibile: la lista della spesa mostra "X ingredienti condivisi tra i pasti" per rendere esplicito il vantaggio anti-spreco
- Nessuna modifica all'algoritmo — solo surfacing della metrica

### Claude's Discretion

- Implementazione esatta del banner offline (posizione, stile, dismissibile o no)
- Strategia di debounce per il sync automatico (es. 2 secondi dopo l'ultima modifica)
- Gestione errori Supabase durante il sync (retry silenzioso o error state nell'header)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Supabase / Cloud sync
- `src/lib/supabase.ts` — helper DB già implementati (loadUserData, savePreferences, savePantry, saveWeeklyPlan, migrateFromLocalStorage)
- `src/lib/AuthProvider.tsx` — AuthContext con sbClient, user, syncStatus, setSyncStatus

### Plan engine
- `src/lib/planEngine.ts` — buildPlan(), scoreCandidate(), ALLERGEN_INGREDIENT_MAP già presenti
- `src/lib/planEngine.test.ts` — test esistenti da estendere con varietà proteine e allergen gate
- `src/hooks/usePlanEngine.ts` — hook che wrappa buildPlan, punto di integrazione sync

### Requisiti di fase
- `.planning/REQUIREMENTS.md` §ENGINE-01, §ENGINE-02, §ENGINE-03, §CLOUD-01, §CLOUD-02
- `.planning/ROADMAP.md` §Phase 3 — success criteria della fase

### Pattern esistenti
- `.planning/codebase/ARCHITECTURE.md` — layer architetturali, data flow
- `.planning/codebase/CONVENTIONS.md` — naming, TypeScript strict, path alias @/*

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `supabase.ts`: tutti gli helper DB sono già scritti e testabili — basta chiamarli al momento giusto
- `AuthProvider.tsx`: `syncStatus` / `setSyncStatus` già nel context — l'AppHeader li mostra già
- `ALLERGEN_INGREDIENT_MAP` in `planEngine.ts`: già completa per tutti i 10 allergeni EU
- `scoreCandidate()`: bonus ingredient-sharing già presente, serve solo surfacing della metrica

### Established Patterns
- Auto-save pattern: usare `useEffect` con debounce in `usePlanEngine` — quando `generated` cambia e `sbClient` e `user` sono disponibili, chiama `saveWeeklyPlan`
- Offline detection: `navigator.onLine` + event listener `online`/`offline`

### Integration Points
- `src/hooks/usePlanEngine.ts`: aggiungere logic di sync (useEffect su `generated`)
- `src/app/page.tsx`: aggiungere banner offline condizionale
- `src/lib/planEngine.ts`: aggiungere contatore proteine in `buildPlan()` + post-generation allergen check

</code_context>

<specifics>
## Specific Ideas

- Il banner offline deve essere piccolo e non invasivo — non bloccare il piano
- Il contatore proteine deve essere testabile: aggiungere test in planEngine.test.ts che verificano che nessuna proteina superi 2 occorrenze
- La metrica "ingredienti condivisi" nella lista spesa è il modo per rendere visibile il valore anti-spreco

</specifics>

<deferred>
## Deferred Ideas

- Nessuna idea fuori scope emersa durante la discussione

</deferred>

---

*Phase: 03-engine-hardening-and-cloud-sync*
*Context gathered: 2026-03-21*

# Requirements: Settimana Smart

**Defined:** 2026-03-19
**Core Value:** L'utente apre l'app a inizio settimana e trova già tutto deciso — cosa mangiare ogni giorno, come prepararlo, e cosa comprare — senza sprechi e senza pensieri.

---

## v1 Requirements

### Authentication

- [ ] **AUTH-01**: L'utente può registrarsi con email e password
- [ ] **AUTH-02**: L'utente può fare login e rimanere loggato tra sessioni
- [ ] **AUTH-03**: L'utente può fare logout da qualsiasi schermata

### Onboarding & Profilo

- [ ] **ONBOARD-01**: Alla prima apertura l'utente completa un onboarding guidato step-by-step prima di accedere all'app
- [ ] **ONBOARD-02**: L'utente seleziona intolleranze/allergie nel profilo (filtro hard obbligatorio — safety-critical)
- [ ] **ONBOARD-03**: L'utente indica le proprie preferenze alimentari (cibi preferiti, cibi da evitare)
- [ ] **ONBOARD-04**: L'utente indica il numero di persone in casa (calibra le quantità)
- [ ] **ONBOARD-05**: L'utente può modificare il profilo dopo l'onboarding

### Motore Piano

- [ ] **ENGINE-01**: Il piano generato rispetta rigidamente le intolleranze dichiarate tramite un layer di validazione deterministico (non delegato a LLM)
- [ ] **ENGINE-02**: Il piano garantisce varietà (nessuna proteina principale ripetuta più di 2 volte nella stessa settimana)
- [ ] **ENGINE-03**: I pasti della settimana condividono ingredienti per ridurre la lista della spesa e gli sprechi
- [x] **ENGINE-04**: Il motore di generazione è coperto da test automatici (Vitest) con coverage su funzioni business-critical

### Ricette & AI

- [ ] **RECIPES-01**: Le ricette sono generate da AI (GPT-4o-mini) personalizzate sulle preferenze utente
- [ ] **RECIPES-02**: Le ricette generate rispettano la cucina italiana e sono realistiche (ispirate a ricette verificate esistenti, non inventate)
- [ ] **RECIPES-03**: Ogni ricetta generata segue uno schema strutturato: ingredienti con quantità e unità, passi di preparazione, tempo stimato
- [ ] **RECIPES-04**: Le ricette generate sono validate post-generazione per allergie/intolleranze prima di essere mostrate all'utente

### Gestione Piano

- [ ] **PLAN-01**: Ogni piano è associato a una settimana specifica — il piano della settimana corrente e quello della settimana successiva coesistono senza sovrascriversi
- [ ] **PLAN-02**: Il piano della settimana corrente diventa automaticamente "archiviato" quando inizia la nuova settimana
- [ ] **PLAN-03**: L'utente può creare/rigenerare il piano per la settimana successiva mentre è ancora attivo il piano corrente
- [ ] **PLAN-04**: L'utente può rigenerare il piano fornendo feedback testuale ("meno pesce questa settimana", "più piatti veloci")
- [ ] **PLAN-05**: Il piano segnala esplicitamente i pasti che riutilizzano avanzi del giorno precedente
- [ ] **PLAN-06**: L'utente può scambiare un singolo pasto con un'alternativa suggerita compatibile con il profilo

### Lista della Spesa

- [ ] **SHOP-01**: La lista della spesa aggrega correttamente ingredienti con nomi italiani varianti (es. "pomodoro" e "pomodori pelati" non creano due voci separate)
- [ ] **SHOP-02**: L'utente può segnare ingredienti come acquistati e lo stato persiste tra sessioni
- [ ] **SHOP-03**: La lista della spesa si aggiorna automaticamente quando il piano viene modificato o rigenerato

### Cloud & Sincronizzazione

- [ ] **CLOUD-01**: Il piano settimanale è salvato nel cloud e accessibile da più dispositivi con lo stesso account
- [ ] **CLOUD-02**: L'app funziona offline e mostra il piano salvato senza connessione (PWA)

### Notifiche

- [ ] **NOTIF-01**: L'utente imposta il proprio "giorno della spesa" nel profilo
- [ ] **NOTIF-02**: L'app invia una push notification la sera prima del giorno della spesa impostato (default: domenica sera) con promemoria di pianificare/rivedere il piano della settimana
- [ ] **NOTIF-03**: L'app invia una seconda push notification il giorno della spesa stesso, all'orario configurato dall'utente nel profilo, come promemoria di fare la spesa

### Refactoring Tecnico

- [x] **TECH-01**: Il monolith `page.tsx` (1738 righe) è decomposto in tab components separati e custom hooks (`usePlanEngine`, `useLocalStorage`, `useCloudSync`)
- [x] **TECH-02**: I package inutilizzati sono rimossi dal bundle (`framer-motion`, `radix-ui` meta-package)

---

## v2 Requirements

### Piano Avanzato

- **PLAN-V2-01**: L'utente può visualizzare l'archivio dei piani delle settimane precedenti
- **PLAN-V2-02**: L'utente può ricaricare un piano passato come base per la settimana corrente
- **PLAN-V2-03**: Sostituzione parziale piano (mantieni lun-mer, rigenera gio-dom)

### Frigo & Dispensa

- **FRIDGE-V2-01**: L'utente può indicare cosa ha in casa e l'app usa quegli ingredienti nel piano
- **FRIDGE-V2-02**: Tracciamento dispensa: ingredienti acquistati scalati automaticamente

### Preferenze Avanzate

- **PREF-V2-01**: Obiettivi dietetici specifici (più proteine, meno carboidrati)
- **PREF-V2-02**: Filtro per livello di difficoltà / tempo di preparazione personalizzabile

---

## Out of Scope

| Feature | Motivo |
|---------|--------|
| React Native / app nativa | PWA funzionante, rewrite = 4-8 settimane a zero beneficio in v1 |
| Calorie / macro tracking | Contraddice il posizionamento "senza pensieri" |
| Social / condivisione piani | App personale, non social |
| Grocery delivery integration | Partnership/API fuori scope v1 |
| Pagamenti / abbonamento | Fuori scope v1 — prima validare il prodotto |

---

## Traceability

Aggiornato durante la creazione del roadmap.

| Requirement | Phase | Status |
|-------------|-------|--------|
| TECH-01 | Phase 1 | Complete |
| TECH-02 | Phase 1 | Complete |
| ENGINE-04 | Phase 1 | Complete |
| AUTH-01 | Phase 2 | Pending |
| AUTH-02 | Phase 2 | Pending |
| AUTH-03 | Phase 2 | Pending |
| ONBOARD-01 | Phase 2 | Pending |
| ONBOARD-02 | Phase 2 | Pending |
| ONBOARD-03 | Phase 2 | Pending |
| ONBOARD-04 | Phase 2 | Pending |
| ONBOARD-05 | Phase 2 | Pending |
| ENGINE-01 | Phase 3 | Pending |
| ENGINE-02 | Phase 3 | Pending |
| ENGINE-03 | Phase 3 | Pending |
| CLOUD-01 | Phase 3 | Pending |
| CLOUD-02 | Phase 3 | Pending |
| RECIPES-01 | Phase 4 | Pending |
| RECIPES-02 | Phase 4 | Pending |
| RECIPES-03 | Phase 4 | Pending |
| RECIPES-04 | Phase 4 | Pending |
| PLAN-01 | Phase 5 | Pending |
| PLAN-02 | Phase 5 | Pending |
| PLAN-03 | Phase 5 | Pending |
| PLAN-04 | Phase 5 | Pending |
| PLAN-05 | Phase 5 | Pending |
| PLAN-06 | Phase 5 | Pending |
| SHOP-01 | Phase 5 | Pending |
| SHOP-02 | Phase 5 | Pending |
| SHOP-03 | Phase 5 | Pending |
| NOTIF-01 | Phase 6 | Pending |
| NOTIF-02 | Phase 6 | Pending |
| NOTIF-03 | Phase 6 | Pending |

**Coverage:**
- v1 requirements: 32 total
- Mapped to phases: 32
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-19*
*Last updated: 2026-03-20 — ENGINE-04 and TECH-02 completed in plan 01-01*

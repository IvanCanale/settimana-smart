# Settimana Smart

## What This Is

App mobile (iOS/Android) che genera piani pasto settimanali personalizzati per persone con poco tempo da dedicare alla cucina. Data la configurazione del profilo utente (preferenze, intolleranze, numero di persone), l'app elimina la fatica di decidere cosa mangiare producendo un piano completo con ricette e lista della spesa, ottimizzato per ridurre gli sprechi alimentari.

## Core Value

L'utente apre l'app a inizio settimana e trova già tutto deciso: cosa mangiare ogni giorno, come prepararlo, e cosa comprare — senza sprechi.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] L'utente può registrarsi e configurare il profilo (preferenze alimentari, intolleranze/allergie, numero di persone)
- [ ] L'app genera automaticamente un piano pasto settimanale (colazione, pranzo, cena per ogni giorno)
- [ ] Il piano si rigenera ogni settimana automaticamente e su richiesta dell'utente
- [ ] Ogni pasto include la ricetta con istruzioni e tempi di preparazione
- [ ] Il piano include una lista della spesa aggregata per la settimana
- [ ] L'utente può sostituire un singolo pasto con alternative suggerite dall'app
- [ ] I pasti della settimana condividono ingredienti per minimizzare gli sprechi
- [ ] L'app suggerisce come riutilizzare gli avanzi dei pasti precedenti

### Out of Scope

- Calcolo valori nutrizionali dettagliati (calorie, macro) — non richiesto, aggiunge complessità senza essere il focus principale
- Obiettivi dietetici specifici (perdita peso, aumento muscolare) — fuori da v1, si parte da "mangiare equilibrato"
- Funzionalità social/condivisione — app personale, non social
- App nativa separata per iOS e Android — si valuta React Native per codebase unica

## Context

- Progetto greenfield, nessuna codebase esistente
- Il nome del repo suggerito è "settimana-smart" — rispecchia il concetto di pianificazione settimanale intelligente
- Il problema principale è la decision fatigue: le persone non sanno cosa mangiare e finiscono per mangiare male o sprecare cibo
- L'anti-spreco si realizza su due livelli: (1) ingredienti condivisi tra ricette della settimana, (2) suggerimenti di reimpiego degli avanzi

## Constraints

- **Piattaforma**: Mobile iOS/Android — preferibilmente React Native per codebase unica
- **Equilibrio dietetico**: Il piano generato deve rispettare una dieta bilanciata (varietà di nutrienti, non monotono)
- **Tempo di preparazione**: Le ricette devono essere rapide — utenti con poco tempo, quindi pasti semplici da preparare
- **Personalizzazione**: Il piano deve rispettare rigorosamente le intolleranze dichiarate (safety requirement)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| React Native per mobile | Codebase unica per iOS e Android, riduce effort di sviluppo | — Pending |
| Piano fisso con swap singoli | Riduce il carico cognitivo — l'utente non deve scegliere tutto, solo aggiustare se necessario | — Pending |
| Riciclo avanzi come feature esplicita | Differenziatore rispetto ad altre app di meal planning | — Pending |

---
*Last updated: 2026-03-19 after initialization*

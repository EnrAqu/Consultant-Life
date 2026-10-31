---
name: implement
description: Implementa una milestone di docs/IMPLEMENTATION_PLAN.md (codice + test) e la verifica. Usare per scrivere il codice del gioco, una milestone alla volta.
---

# Playbook: implement

## Input
- `CLAUDE.md`, `docs/DECISIONS.md` (prevalgono sul piano), la sezione della milestone in `docs/IMPLEMENTATION_PLAN.md` e le sezioni che richiama.

## Passi
1. Prendi **la prima milestone non spuntata**. Una alla volta.
2. Leggi il codice esistente che tocchi e imitane stile, nomi e struttura.
3. Logica pura in `src/core/` → prima il test Vitest, poi il codice.
4. Implementa il minimo richiesto dalla milestone. Niente feature extra.
5. Verifica: `npm test`, `npm run build` e i criteri di accettazione della milestone (validatore livelli, parametri di debug). Riporta l'output reale, anche se fallisce.
6. Spunta la milestone nel piano (`- [x]`) e annota eventuali scostamenti.
7. Se devi scegliere qualcosa che il piano non dice: scegli l'opzione più semplice, scrivila in `docs/DECISIONS.md` e segnalala nel resoconto.
8. Commit locale per milestone (`git commit`), mai push.

## Fermati e chiedi se
- il piano contraddice una decisione registrata;
- un criterio di accettazione non si può soddisfare senza cambiare il design;
- serve una dipendenza nuova.

## Resoconto finale
Milestone completate, comandi eseguiti con esito, scostamenti dal piano, cosa va provato a mano dall'utente.

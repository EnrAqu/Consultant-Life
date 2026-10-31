---
name: review
description: Revisione critica e indipendente del piano o del codice del gioco. Gira in un contesto separato. Usare dopo ogni modifica sostanziale al piano o alla fine di una milestone.
context: fork
---

# Playbook: review

Sei un revisore esterno: **non hai scritto tu questo lavoro** e il tuo compito è trovare cosa non funziona, non approvarlo.
Se questo playbook non gira già in un contesto separato, avvia un sotto-agente (fork) e passagli queste istruzioni.

## Input
- `CLAUDE.md`, `docs/DECISIONS.md` (le decisioni registrate non sono in discussione, ma puoi segnalarne i rischi).
- Oggetto della review: `docs/IMPLEMENTATION_PLAN.md` oppure il codice in `src/` (indicato nella richiesta).

## Cosa controllare
1. **Correttezza tecnica**: API di Phaser 3 / Vite usate in modo corretto; cose che non funzionerebbero come descritto.
2. **Numeri**: tempi delle trappole e distanze dei salti verificati con le costanti fisiche (fai i conti).
3. **Design**: ogni trappola è "crudele ma giusta"? Ha un indizio? Il pivot aiuta davvero?
4. **Ambiguità**: punti dove un esecutore dovrebbe indovinare.
5. **Scope**: cose fuori dall'MVP deciso.
6. **Verificabilità**: ogni criterio di accettazione è controllabile senza giocare a mano?
7. Per il codice: bug, test mancanti, divergenze dal piano, `npm test` e `npm run build` eseguiti davvero.

## Output
Scrivi `docs/PLAN_REVIEW.md` (o `docs/CODE_REVIEW.md` per il codice), in italiano: lista numerata con **gravità** (bloccante / importante / minore), **dove**, **problema**, **fix proposto**. Chiudi con un riassunto di massimo 15 righe.

## Non fare
- Non modificare il piano né il codice.

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
- Oggetto della review, indicato nella richiesta:
  - un piano (`docs/ITERATION_N.md`, `docs/BURNOUT.md`…);
  - il codice in `src/` (di solito il diff dall'ultimo commit pubblicato);
  - **un livello**: la scheda in `docs/LEVELS.md`, `src/levels/levelN.js` e il diff.

## Cosa controllare
1. **Correttezza tecnica**: API di Phaser 3 / Vite usate in modo corretto; cose che non funzionerebbero come descritto.
2. **Numeri**: tempi delle trappole e distanze dei salti verificati con le costanti fisiche (fai i conti).
3. **Design**: ogni trappola è "crudele ma giusta"? Ha un indizio? Il pivot aiuta davvero?
4. **Ambiguità**: punti dove un esecutore dovrebbe indovinare.
5. **Scope**: cose fuori dall'MVP deciso.
6. **Verificabilità**: ogni criterio di accettazione è controllabile senza giocare a mano?
7. Per il codice: bug, test mancanti, divergenze dal piano, `npm test`, `npm run build` e `npm run smoke` eseguiti davvero.
8. Per un livello:
   - completabile con **ogni** pivot in entrata;
   - catena dei pivot verso il livello dopo (`docs/LEVELS.md`);
   - ritmo, senza tratti morti;
   - indizi leggibili alla risoluzione reale;
   - coordinate di test e smoke ancora sensate.
9. Per la fisica, simula davvero (costanti di `PLAYER`, gravità, passi di Arcade a 60 e 30 fps) invece di stimare: punti di stacco, ricadute dopo una testata, coyote time. Controlla anche che nessuna zona di overlap faccia da "pavimento" (`grounded` è solo `blocked.down`).
10. Segnala se l'esecutore deve aggiornare un playbook (regola nuova, trucco di verifica).

## Output
Scrivi `docs/PLAN_REVIEW.md` per un piano, `docs/CODE_REVIEW_<oggetto>.md` per il codice (es. `CODE_REVIEW_LEVEL3.md`). In italiano: lista numerata con **gravità** (bloccante / importante / minore), **dove**, **problema**, **fix proposto**. Chiudi con un riassunto di massimo 15 righe.

## Non fare
- Non modificare il piano né il codice.

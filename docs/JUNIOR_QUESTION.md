# Il junior che si ferma con una domanda (livelli 3–5)

Richiesta dell'utente (2026-11-03): *"dal livello 3 in poi lo junior si ferma e tu lo devi andare a riprendere; quando lo vai a riprendere ti fa una domanda stupida ('Ma il PC si accende premendo il tasto ON?', 'Come sono fatte le persone?'…). Tornare indietro e poi andare avanti costa 0,5 giornate uomo."*

## Regole
- **Dove:** un punto per livello (entità `juniorStall`, solo grafica e logica, niente geometria):
  - livello 3, col 136: dopo il burrone dello scope creep, prima della porta 140;
  - livello 4, col 160: dopo il secondo varco, mentre l'arrivista corre al traguardo;
  - livello 5, piano 2 (riga 61), col 26: con l'escalation che sale.
- **Scatto:** quando l'**ultimo** junior della fila *attraversa* la colonna (col o col+1, sulla riga del punto) si ferma. Un respawn oltre il punto non lo fa scattare. Una volta per vita.
- **Indizio:**
  - un grande "?" giallo sulla testa e il fumetto "Ehm… ho una domanda";
  - il toast "Un junior si è fermato: torna a prenderlo";
  - l'HUD del team che scende di uno.
- **Tornare a prenderlo:** quando lo raggiungi (stessa altezza, entro 24 px) fa una domanda stupida, in ordine fisso per la pagina (`src/data/juniorQuestions.js`).
  - Tu glielo spieghi stando fermo per 1,8 s (lock `junior`).
  - Costa **0,5 GU** (causa `juniorQuestion`, non pivotabile).
  - Poi torna in fondo alla fila.
- **Lasciarlo lì:** è un junior perso (stato `stalled`, fuori da `aliveCount`). Si paga il burnout della perdita del team al checkpoint o a fine livello e non passa al livello dopo.
- File: `src/core/StallBrain.js` (logica, testata), `src/objects/npc/JuniorStall.js`, `Team.stall` / `Team.resumeStalled`.

## Verifica
- `tests/ItHrExternal.test.js`: `StallBrain` (scatto solo attraversando, domanda, ritorno, una volta per vita), domande, punti su un pavimento nei livelli 3–5.
- `smokeItHr.mjs`: nel livello 3 l'ultimo junior si ferma a 136 (team 3 → 2); tornando indietro chiede "Ma il PC si accende premendo il tasto ON?", −0,5 GU, poi team 3.

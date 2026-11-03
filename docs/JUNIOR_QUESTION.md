# Il junior che si ferma con una domanda (livelli 3 e 5)

Richiesta dell'utente (2026-11-03): *"dal livello 3 in poi lo junior si ferma e tu lo devi andare a riprendere; quando lo vai a riprendere ti fa una domanda stupida ('Ma il PC si accende premendo il tasto ON?', 'Come sono fatte le persone?'…). Tornare indietro e poi andare avanti costa 0,5 giornate uomo."*

## Regole
- **Dove:** un punto per livello (entità `juniorStall`, solo grafica e logica, niente geometria):
  - livello 3, col **113**: subito dopo il checkpoint 112, prima della sporgenza dello scope creep;
  - ~~livello 4~~: tolto (utente, 2026-11-03);
  - livello 5, piano 2 (riga 61), col **14**: ogni percorso dall'arrivo (17–25) ai gradini (9–11) la attraversa, verso sinistra.
- **Scatto:** si ferma quando l'**ultimo** junior della fila *attraversa* il bordo sinistro della colonna:
  - in entrambe le direzioni, con i piedi entro ±1 riga dal punto (anche in salto);
  - non conta un salto di più di 3 colonne in un passo (respawn, teletrasporto, il primo frame di un junior nuovo);
  - una volta per vita.
- **Domanda solo se torni:** la fa solo quando lo raggiungi dopo esserti allontanato almeno una volta.
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

## Esito della review (`docs/CODE_REVIEW_JUNIOR_STALL.md`)
- **Accolti:**
  - **#1 scatto fragile:** ora conta l'attraversamento in entrambe le direzioni, con ±1 riga, e ignora i salti di più di 3 colonne.
  - **#2–#4 posizioni ingiuste:** si torna indietro senza morire.
    - Al livello 3 il punto era nel raggio della porta 140, con il burrone 145 davanti.
    - Al livello 4 tornare indietro dava sempre la gara all'arrivista.
    - Al livello 5 l'escalation arrivava sempre.
  - **La domanda partiva subito se eri fermo lì:** ora parte solo dopo che ti sei allontanato.
  - **Commenti rimasti a +5% e +10%:** corretti.
- **Trovato dopo la review:** il primo frame di un junior nuovo è a x = 0, e il salto verso il checkpoint contava come attraversamento (un −0,5 GU fantasma all'inizio dal checkpoint 183). Corretto con il limite di 3 colonne.
- **Lasciati:**
  - il junior recuperato riappare nella sua posizione nella scia;
  - con l'unico junior fermo, lo stagista del livello 4 ne assume uno;
  - la perdita addebitata al checkpoint anche se poi lo recuperi.
- **Da chiedere all'utente:** i sollievi del burnout (caffè −2, KT vero −3, livello senza morti −5) restano così?

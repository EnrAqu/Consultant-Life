---
name: level
description: Modifica un singolo livello di Consultant Life (geometria, trappole, parametri, ritmo) partendo dalla sua scheda in docs/LEVELS.md, con verifica e registro. Usare quando l'utente vuole cambiare il livello N.
---

# Playbook: level

Il gioco ora si modifica **un livello alla volta**.
L'obiettivo è cambiare il livello N senza rompere né lui né la catena dei livelli: pivot, burnout, smoke.

## Input da leggere
1. `CLAUDE.md` e `docs/DECISIONS.md`: le decisioni registrate non si rimettono in discussione senza chiedere.
2. La **scheda del livello** in `docs/LEVELS.md`, con le regole che legano i livelli in cima al file.
3. Le sezioni dei documenti indicate in "Nato da": servono per capire perché il livello è fatto così.
4. Le note del livello in `docs/PLAYTEST.md`, se ci sono.
5. Il file `src/levels/levelN.js` e i test e gli smoke citati nella scheda.

## Passi
1. **Capire cosa vuole l'utente.** Tema, tono e difficoltà li decide l'utente. Se la richiesta è vaga, proponi 2–3 opzioni concrete e chiedi.
2. **Proposta scritta nella scheda.** Prima del codice, aggiungi una voce "In corso" al Registro del livello, con:
   - la mappa ASCII **prima/dopo** delle colonne (o righe) toccate;
   - i parametri delle entità;
   - i tempi verificati con le costanti fisiche (`src/config/constants.js`): il salto deve essere possibile e la trappola deve poter colpire chi corre.
3. **Effetti a catena.** Controllali e scrivili nella proposta:
   - **pivot in entrata:** gli slot del livello N devono corrispondere a cause che possono capitare nel livello N−1;
   - **pivot in uscita:** se aggiungi o togli un tipo di trappola, cambiano le lezioni del livello N+1;
   - **"crudele ma giusto":** ogni trappola nuova o spostata ha un indizio leggibile e nessuna casualità;
   - burnout minimo, GU di partenza, carriera e outfit, cartelli e frasi del narratore;
   - la classifica del livello: chiedi se azzerarla;
   - **le coordinate nei test e negli smoke** (teleport, colonne, `cp`): cambiando la geometria si rompono.
4. **Dimensione.**
   - Geometria, parametri o spostamenti di entità esistenti: procedi.
   - Una **meccanica nuova** (nuova entità, nuovo brain, nuova causa): passa prima dal playbook `plan`, con la sezione nel documento giusto, e poi da `review` sul piano.
5. **Implementa** imitando lo stile del livello (`createGrid`, commenti per sezione `S0…`). La logica pura nuova va in `src/core/`, prima con il test.
6. **Verifica**, riportando l'output reale anche se fallisce:
   - `npm test`: il validatore deve dare il livello completabile con **ogni** pivot possibile;
   - `npm run build`;
   - `npm run smoke`: a macchina scarica; se un controllo a tempo fallisce, rilancialo prima di concludere;
   - uno screenshot della zona cambiata, dalla cartella `scripts/smoke/shots/` o da uno script nella scratchpad.
7. **Test e smoke aggiornati.** Ogni comportamento nuovo del livello ha almeno un controllo automatico. Le coordinate vecchie vanno corrette, non i controlli cancellati.
8. **Review in contesto separato** (playbook `review` sul livello) se la modifica non è banale. Applica i punti o registra perché li respingi.
9. **Chiudi:**
   - Registro della scheda: la voce passa da "In corso" a data e riassunto, e si aggiornano i campi della tabella cambiati;
   - una riga in `DECISIONS.md` (data, decisione, motivo, "— utente" se l'ha chiesta l'utente);
   - commit locale a nome dell'utente, senza righe `Co-Authored-By`/`Claude-Session`;
   - **niente push** se l'utente non lo chiede.
10. **Resoconto:** cosa è cambiato, i comandi con il loro esito e l'URL di debug per provarlo (es. `?debug=1&level=level3&cp=cp0`), più cosa va provato a mano.

## Non fare
- Non toccare altri livelli, a meno che la catena dei pivot lo richieda. In quel caso dillo e chiedi.
- Non ritarare GU, burnout o fisica globali per sistemare un solo livello: si fa sul livello (parametri delle entità, geometria) o si chiede.
- Non cancellare controlli di test o smoke per farli passare.

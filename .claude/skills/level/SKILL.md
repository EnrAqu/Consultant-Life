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
   - **Scherzetti del cliente** (`hiddenMail`, `requirementShift`, livello 1): si leggono dallo **stacco del salto in pixel** (`player.jumpCount`/`lastJump`, coyote compreso), non da trigger zone. Sono un'eccezione registrata a "crudele ma giusto" (la mail non ha indizio), quindi **solo dove l'utente li chiede**. Per il punto d'innesco fai i conti della ricaduta dopo la testata (orizzontale ~260 px/s, caduta con gravità 1800 + 700): oltre una certa x si atterra comunque dall'altra parte.
4. **Dimensione.**
   - Geometria, parametri o spostamenti di entità esistenti: procedi.
   - Una **meccanica nuova** (nuova entità, nuovo brain, nuova causa): passa prima dal playbook `plan`, con la sezione nel documento giusto, e poi da `review` sul piano.
5. **Implementa** imitando lo stile del livello (`createGrid`, commenti per sezione `S0…`). La logica pura nuova va in `src/core/`, prima con il test.
6. **Verifica**, riportando l'output reale anche se fallisce:
   - `npm test`: il validatore deve dare il livello completabile con **ogni** pivot possibile;
   - `npm run build`;
   - `npm run smoke`: a macchina scarica; se un controllo a tempo fallisce, rilancialo prima di concludere;
   - uno screenshot della zona cambiata, dalla cartella `scripts/smoke/shots/` o da uno script nella scratchpad.
   - Nei controlli smoke che dipendono da **dove si stacca il salto**, fissa lo stacco in pixel (input bloccato, tasti premuti, poi `body.reset(x0, …)` + `setVelocityX(260)` + `jumpBufferTimer`), come in `smoke.mjs` 1d: con i tempi dei tasti il punto di stacco varia di decine di pixel.
7. **Test e smoke aggiornati.** Ogni comportamento nuovo del livello ha almeno un controllo automatico. Le coordinate vecchie vanno corrette, non i controlli cancellati.
8. **Review in contesto separato** (playbook `review` sul livello) se la modifica non è banale. Applica i punti o registra perché li respingi.
9. **Chiudi:**
   - Registro della scheda: la voce passa da "In corso" a data e riassunto, e si aggiornano i campi della tabella cambiati;
   - una riga in `DECISIONS.md` (data, decisione, motivo, "— utente" se l'ha chiesta l'utente);
   - commit locale a nome dell'utente, senza righe `Co-Authored-By`/`Claude-Session`;
   - **niente push** se l'utente non lo chiede. Il permesso vale per quel giro: un "pusha" non copre i commit successivi;
   - **aggiorna i playbook** (questo e gli altri toccati) con quello che hai imparato: nuove meccaniche, trucchi di verifica, errori da non ripetere (utente: "aggiorna sempre i playbook").
10. **Resoconto:** cosa è cambiato, i comandi con il loro esito e l'URL di debug per provarlo (es. `?debug=1&level=level3&cp=cp0`), più cosa va provato a mano.

## Fisica da ricordare
- `Player.grounded` è solo `body.blocked.down` (tilemap, corpi statici e immobili). Non usare `touching.down`: Arcade lo accende anche sulle sovrapposizioni con zone di innesco e di morte, e permetteva salti a mezz'aria. Una piattaforma calpestabile **non immobile** richiederebbe un controllo apposito.
- Le zone (`addTrigger`, `killZones`) sono overlap: non sostengono il giocatore.
- **Piattaforme che si muovono** (barra del PM): muoverle in modo cinematico, cioè `body.reset` a ogni frame sulla posizione del brain. Il giocatore va trasportato spostando solo `player.x`: il `friction` di Arcade non lo trascina in modo affidabile, e spostare anche `body.x` conta lo spostamento due volte.
- **Piattaforme che compaiono e spariscono** (VPN, gradini del fornitore, barra del PM): renderle one-way (`checkCollision` solo `up`), così riapparendo o scivolando sul pavimento non spingono né intrappolano il giocatore.
- **Blocchi del giocatore** (riavvio, corso, chiamate): mai a metà salto. Aspettare l'atterraggio, oppure mettere il lock solo a terra.

## Catena dei pivot e incidenti
- Uno slot scatta con la lezione di `entity.cause ?? entity.type`: se la trappola del livello N+1 è diversa da quella del livello N ma insegna la stessa lezione, usa `cause` (es. `pmStaffing` con `cause: 'pm'`).
- Un incidente (`stats.recordIncident`) deve contare **solo se fa danno** (morte entro poco, ticket richiuso con te davanti…) e al massimo una volta per vita. Altrimenti decide lui la lezione del livello dopo.
- Un costo di burnout legato a una trappola che si ripete a ogni vita (es. il PM +10%) va pagato **una volta per livello**, non a ogni tentativo.
- I junior che si perdono passano da `Team.lose`. Se il burnout l'hai già addebitato tu, usa `prepaid = true`, così il checkpoint non lo addebita una seconda volta. Lo stato `away` (team building) non è una perdita.
- Il tasto **E** va prima agli NPC che lo vogliono (`onAction()`, es. il fornitore) e solo poi alla delega.
- **Ogni stato nuovo del team** (`away`, `staying` con ritorno…) va controllato in **tutti** i conteggi di fine livello e del checkpoint (`count`, `aliveCount`, `netLoss`, `session.team`), con uno smoke che finisce il livello in quello stato.
- Un ostacolo a tempo (ticket, corso…) **non si azzera al respawn** se il checkpoint è prima di lui: una volta superato resta superato.
- Una trappola che scatta su una colonna deve scattare quando la si **attraversa** (col o col+1), non con `>= col`: un respawn o un teletrasporto oltre il punto la farebbe scattare subito.

## Verifica nel container cloud
- Chrome gira da root: serve `--no-sandbox`. Usa un wrapper come `CHROME_PATH` (uno script che lancia `/opt/pw-browsers/chromium-*/chrome-linux64/chrome --no-sandbox "$@"`), senza toccare gli script.
- Il tempo di gioco può scorrere a circa 0,3× il tempo reale (fps 5–10): negli smoke usa `waitForFunction` con timeout larghi (30 s) invece di sleep fissi, e controlla in pagina, non con lo stato letto a ogni passo.
- I controlli a tempo degli smoke vecchi falliscono anche senza modifiche: confronta l'elenco dei FAIL con quello del commit di prima (`git stash -u`, build, smoke, `git stash pop`) prima di dire che è una regressione.
- Teletrasportando il giocatore i junior restano indietro (e l'arrivista ne prende uno): negli smoke rimettili accanto al giocatore con `team.restore()`.
- Non usare `pkill -f` con un pattern che compare nel tuo stesso comando: uccide la shell.

## Non fare
- Non toccare altri livelli, a meno che la catena dei pivot lo richieda. In quel caso dillo e chiedi.
- Non ritarare GU, burnout o fisica globali per sistemare un solo livello: si fa sul livello (parametri delle entità, geometria) o si chiede.
- Non cancellare controlli di test o smoke per farli passare.

# Code review — Iterazione 5A (`783e8d8..67d27b0`)

> Revisore esterno, contesto separato. Oggetto: codice dell'iterazione 5A (livelli verticali, torcia/lavoratori, escalation, leccapiedi, opportunità e porta del Board, `EndingScene`, livello 5, test e `smoke5`).
> Riferimenti: `docs/ITERATION_5.md`, `docs/DECISIONS.md`. Data: 2026-11-01.

## Verifiche eseguite

- `npm test`: **148/148 verdi** (17 file).
- `npm run build`: ok (solo il warning noto sul chunk di Phaser).
- `npm run smoke`: **74/74 PASS**, `ERRORS: none` in tutte e 4 le suite (livelli 1–4 senza regressioni).
- Script usa e getta (non nel repo) che riusa il modello di `tests/Level5.test.js` per misurare il **margine** della marea: vedi #2.
- Lettura delle righe 14/38/62/86 della mappa del livello 5: vedi #1.
- Screenshot `scripts/smoke/shots/i5-bow.png` e `i5-escalation.png` guardati.
- Controllato a mano: il refactor di `MicromanagerBrain.inLight` su `inTorch` è equivalente (±8 px di altezza, 8 px dietro); i trigger di default di `BaseTrap` restano `2…16` per tutte le trappole dei livelli 1–4 (tutte a `y = 14`); il segno di `setFollowOffset(-lookAhead, +lookY)` è giusto (Phaser sottrae l'offset, quindi `+60` guarda in alto). Nel piano c'è scritto `-this.lookY`: è il piano a essere sbagliato, non il codice.

## Problemi

### 1. Blocco permanente: se salti un'opportunità non puoi più tornare indietro — **bloccante**
- **Dove:** `src/levels/level5.js` (solai `shelf(1, W - 2, 86/62/38/14)`), `Goal.onTouch`, checkpoint solo in avanti (`GameScene`).
- **Problema:** i quattro solai sono one-way **a tutta larghezza** (righe 86, 62, 38, 14 = `#====…====#`) e non si può scendere attraverso un `=`: in `Player`/`readInput` non c'è un tasto giù. Le opportunità stanno su deviazioni. Se ne salti una e sali al piano successivo, quella opportunità non è più raggiungibile. Arrivi al Board con 2/3 e la porta resta chiusa per sempre. Il respawn non aiuta, perché il checkpoint attivo è sempre il più alto. Sul Board la marea è ferma, quindi non arriva neanche il "Budget sforato" che chiuderebbe la partita. Restano due uscite: premere R una trentina di volte (0,5 GU ciascuna) oppure ricaricare la pagina. Oggi l'unico avviso che le opportunità sono obbligatorie è il cartello sul Board, cioè quando è già troppo tardi. `Pipeline 0/3` nell'HUD non dice che servono per uscire. Non è "crudele ma giusto": è un soft-lock senza indizio. Né il validatore né i test lo vedono, perché controllano solo che ogni `$` sia raggiungibile dallo spawn.
- **Fix (uno a scelta, meglio i primi due insieme):**
  1. lasciare in ogni solaio un "vano scala" (2–3 colonne vuote) per poter riscendere, oppure aggiungere "↓ = scendi da un `=`";
  2. cartello nella lobby: *"Il Board riceve solo con 3 opportunità in pipeline"*, e un toast quando superi un piano senza aver preso la sua opportunità;
  3. in alternativa, mettere le opportunità sul percorso obbligato.
- **Test:** validatore con partenza dal Board (o da ogni checkpoint) → ogni `$` ancora raggiungibile; oppure un test che verifica che ogni `$` sia raggiungibile partendo dal checkpoint del piano sopra.

### 2. La verifica della marea passa con 3,5 px di margine: un player "a buon ritmo" viene preso — **importante**
- **Dove:** `tests/Level5.test.js` ("escalation timing"), `ESCALATION_DEFAULTS.stages`, `worker1` (5 tavole).
- **Problema:** ho rifatto girare lo stesso modello del test misurando la distanza minima tra marea e piedi:
  - salto 750 ms + 2 s di tolleranza: 0 prese, ma il margine minimo è **0,11 righe** (≈ 3,5 px). Succede sul piano 1, mentre aspetti `worker1` (5 × 450 + 800 + 2000 ms a 50 px/s = 7,9 righe contro un guinzaglio di 8). Sul piano 3 il margine è 0,31 righe;
  - salto **800 ms** (+2 s): già **1 presa**. Con 600 ms e 2 s di tolleranza il margine resta 0,11: il collo di bottiglia è l'attesa, non la velocità di salto.

  Il modello poi è ottimista:
  - `dist` della BFS conta come "salto" anche un passo orizzontale fino a 7 colonne (≈ 0,86 s a 260 px/s);
  - presume che tu ti giri subito dal `worker1`, che vedi arrivando da destra;
  - ignora le attese obbligatorie del piano 2. La porta "Hai 5 minuti?" (`fiveMinutes`, col 18) è sul percorso obbligato: `standMs` 1,8 s, aggancio `hookMs` 3 s ≈ 5,6 righe a 60 px/s, contro un margine di 2,6 righe su quel piano. Ignora anche il crollo del deck.

  In pratica quasi ogni player alla prima partita prende −3 GU sul piano 1, e chi viene agganciato dal collega al piano 2 si prende due penalità. Lo `ITERATION_5 §2` chiedeva il contrario: "nessuna presa per un player che sale a ritmo".
- **Fix:**
  - dare margine vero: guinzaglio a 9–10 righe sul piano 1, oppure `worker1` che si sveglia prima (è già "near" dalla mensola 88) o che ha meno tavole;
  - nel test, contare le attese del piano 2 (`standMs` della porta, `wobbleMs` + caduta del deck);
  - cambiare l'asserzione da "0 prese" a **margine minimo ≥ 1,5 righe**, così il test non passa più per qualche pixel.

### 3. Il rimbalzo sul leccapiedi dipende dal frame rate (si perde a 30 fps) e ha margine d'altezza quasi nullo — **importante**
- **Dove:** `SycophantBrain.update` (stato `bowing`, `onBack`), `Sycophant.update`.
- **Problema:**
  - **Rilevamento:** il controllo guarda i piedi in un solo istante per frame, dentro una finestra di 16 px (`backY − 6 … backY + 10`). Se salti sul posto dal tappetino arrivi sulla schiena a ≈ 660 px/s, cioè 11 px a frame a 60 fps ma **22 px a 30 fps**: in circa 1 caso su 4 la finestra viene saltata, atterri sul pavimento (fuori finestra) e non rimbalzi. DECISIONS documenta già browser a 30 fps. Cadendo dalla mensola sopra (≈ 900 px/s) si sfora anche a 60 fps. Il risultato non è deterministico.
  - **Altezza:** l'apice dipende da dove eri nella finestra quando il rimbalzo scatta. Nel caso peggiore (piedi a `floor − 10`), con `vy = −759` e il `fallGravityExtra` (700) ancora attivo per un frame perché `Player.update` lo azzera solo al frame dopo, l'apice è ≈ 165 px sopra il pavimento a 60 fps e ≈ 160,5 px a 30 fps. Il bordo della piattaforma a 5 righe è a 160 px: in pratica non c'è margine.
  - **Visivo:** nello screenshot `i5-bow.png` la schiena disegnata è spostata ~10 px a destra del centro del tappetino, alta ~10 px invece di 20, e copre la scritta "Prego, Partner".
- **Fix:**
  - controllo "swept": tenere `prevFeetY` e rimbalzare se `prev ≤ backY + 10 && feet ≥ backY − 6`, oppure se il player tocca il pavimento del tappetino scendendo con `vy > 0` mentre lui è inchinato;
  - al rimbalzo riportare i piedi a `backY` (`body.y = backY − body.height`) e chiamare `setGravityY(0)`, così l'altezza diventa fissa;
  - allineare sprite e hitbox della schiena.
  - **Test:** in `Sycophant.test.js`, una caduta da 900 px/s con `dt = 33` che deve rimbalzare.

### 4. La marea non torna allo stadio del piano dopo un respawn — **importante**
- **Dove:** `EscalationBrain.resetBelow`, `stageFor` (lo stadio sale e basta).
- **Problema:** se muori al piano 3 dopo che è entrato il CEO (superficie sopra la riga 26) e rinasci a `cp2` (riga 37), `resetBelow` riporta la superficie a 8 righe sotto, ma `stageIndex` resta 3. Così rifai il piano 3 a 72 px/s invece che a 62. Lo stesso succede al piano 2 dopo il VP. Né la verifica analitica né i test coprono il respawn: `"after a respawn it waits below the checkpoint"` non guarda la velocità.
- **Fix:** in `resetBelow` ricalcolare `stageIndex = stageFor(surfaceY)`, senza banner. Aggiungere un test: CEO raggiunto → `resetBelow` alla riga 37 → velocità 62.

### 5. Delega: il filtro sull'altezza vale anche nei livelli orizzontali (regressione nei livelli 3–4) — **minore**
- **Dove:** `Team.findTarget` passa sempre `playerY`; `pickDelegateTarget` scarta i bersagli a più di 3 righe.
- **Problema:** nei livelli 3–4 tutte le trappole stanno a `y = 14`, quindi il loro bersaglio ha i piedi alla riga 15. Un player su una piattaforma rialzata (piedi ≤ riga 11) non può più delegare, mentre prima poteva. Il test `"without a height (horizontal levels) nothing changes"` non c'entra: verifica la funzione senza `playerY`, ma il gioco lo passa sempre. Lo smoke resta verde solo perché delega da terra.
- **Fix:** `playerY: scene.def.vertical ? player.body.bottom : null`, oppure registrare in DECISIONS che vale ovunque.

### 6. Delega in torre: il junior si ferma sul pavimento sotto il bersaglio — **minore**
- **Dove:** `Team.updateGoing` / `floorAt(x, m.fromY)`.
- **Problema:** `floorAt` cerca il pavimento **verso il basso** a partire dall'altezza del junior e ignora le tavole dei lavoratori (non stanno in `levelTiles`). Se il bersaglio è fino a 3 righe sopra (ora ammesso), il junior "salta" fino alla colonna giusta ma resta sul piano sotto. L'effetto della trappola (`onDelegate`) parte lo stesso, ma la scena non è credibile: le email cadono su un pavimento dove non c'è nessuno.
- **Fix:** per i target delegati usare come `refY` la `y` del bersaglio (quella aggiunta in `findTarget`), cioè `floorAt(x, target.y - TILE)`.

### 7. Il trigger di default copre 12 righe sopra: nella torre sconfina sul piano sopra — **minore**
- **Dove:** `BaseTrap.addTrigger` (`ty − 12 … ty + 2`), `slotA` (`replyAll`, `y = 67`).
- **Problema:** la zona di `slotA` va dalla riga 55 alla 69, quindi copre anche le righe 55–61 del piano 2 (solaio B a 62, mensole a 59 e 56, colonne 7–8). Oggi è innocuo, perché ci arrivi solo dopo averla già fatta scattare al piano 1. Diventa però una trappola latente per chi sposta le entità, e le email "nascono" dentro il solaio B (`spawnHeight 6` da `restRow 67` = riga 62).
- **Fix:** nei livelli `vertical` usare un default di `ty − 5 … ty + 1`, oppure passare righe esplicite in `level5.js`.

### 8. Il commento del validatore sulle cadute lunghe è falso — **minore**
- **Dove:** `LevelValidator.validateLevel`, ricerca limitata a `[y − 6, y + 8]`.
- **Problema:** "le cadute più lunghe passano comunque da celle intermedie" è vero solo se in mezzo c'è una cella su cui stare in piedi. Una caduta di 9 o più righe nel vuoto non viene più trovata. Il validatore resta prudente (non inventa percorsi), ma i test "senza `bounces`/`workers` il Board non si raggiunge" potrebbero passare per un limite della ricerca invece che per il design.
- **Fix:** ammettere sempre le cadute (`rise < 0`) senza limite di righe e limitare solo le salite. È ancora economico, perché le cadute sono una colonna.

### 9. Il leccapiedi non ricompare accanto a te dopo una presa, né al checkpoint — **minore**
- **Dove:** `Escalation.update` (`released`), `GameScene` (overlap del checkpoint).
- **Problema:** `ITERATION_5 §4` lo chiede, ma `placeNearPlayer()` si chiama solo in `onRespawn`. In pratica lui "salta" sul tuo piano appena atterri (`feetY = player.feetY`), quindi l'effetto c'è, ma con un pop verticale istantaneo che si vede.
- **Fix:** chiamare `sycophant?.placeNearPlayer()` su `released` e sull'attivazione di un checkpoint, oppure aggiornare il piano.

### 10. Debug e casi limite minori — **minore**
- `DEBUG.god`: il respawn per `pit`/`selfRestart` non chiama `escalation.onRespawn()`/`sycophant.onRespawn()`.
- `deals=3`: le opportunità della mappa restano raccoglibili e `dealCount` arriva a "Pipeline 4/3". Va limitato con `Math.min`.
- `cp=cp3`: al primo frame la marea fa `start` e `stop` insieme, quindi compaiono due toast e due battute.
- Nelle righe 1–2 di una torre l'HUD in alto copre il gioco: il validatore ora le ammette (`minRow = 0`), quindi va tenuto in mente se si mette qualcosa lassù.

### 11. Divergenze dal piano non registrate — **minore**
- La riga HUD dell'escalation sta **in basso** al centro (`UIScene`), non "sotto l'orologio" (§2). La scelta è sensata, ma non è in DECISIONS. In più in debug si sovrappone a `debugText` (`GAME_HEIGHT − 44` contro `− 34`).
- `ITERATION_5` §7–§8 parla ancora di `cp1…cp4`: DECISIONS (cp0…cp3) prevale, ma il piano va allineato.
- `torch.js` ha la firma `{reach, above, below, behind}` invece di `{range, rowsUp, rowsDown}`: va bene, ma va aggiornato il piano.
- Il cartello della lobby (col 5) è tagliato dal bordo sinistro del mondo (`i5-bow.png`).

### 12. Test mancanti — **minore**
- `EscalationBrain`: presa durante `paused` (caduta dentro la marea), stadio dopo `resetBelow` (#4), morte durante `catching`. Quest'ultima oggi funziona: `cancelCall` + `respawnAt` tolgono il blocco e `resetBelow` porta a `paused`.
- `SycophantBrain`: rimbalzo a `dt` grandi (#3).
- Soft-lock delle opportunità (#1).
- Checkpoint solo in avanti: la logica sta in `GameScene`, non in `core/`, quindi non ha test unitari. Si può estrarre in una funzione pura `nextCheckpointIndex(current, touched)`.

## Cose verificate e corrette

- **Morte durante la call:** `die()` → `escalation.cancelCall()`, poi `respawnAt` svuota i blocchi e `resetBelow` passa da `catching` a `paused`. Il player non resta bloccato.
- **Budget finito per una presa:** `spendGu` → `budgetOver`, con `return` immediato. Ok.
- **Standup:** `GameScene.update` esce prima di `escalation.update`, quindi la marea si ferma. I blocchi di input (KT, 5 minuti, presa) non la fermano, come da piano.
- **Respawn:** la marea scende a 8 righe sotto il punto di respawn e aspetta 1,5 s. Il lavoro dei lavoratori resta, le opportunità restano.
- **Checkpoint:** ordinati dal basso nei livelli `vertical`, attivazione solo con indice maggiore. Nei livelli orizzontali l'unica differenza è che un checkpoint saltato non si può più attivare tornando indietro: è coerente con il piano.
- **Livelli 1–4:** trigger invariati, smoke verde, outfit e leaderboard invariati. Unica regressione: la delega dall'alto (#5).
- **`EndingScene`:** il flusso livello 4 → livello 5 → finale Partner → Progetto 1 vestito da Partner è verificato dallo smoke. La leaderboard con 5 progetti entra nello schermo (ultima riga a y ≈ 476 su 540).

## Riassunto

1. **Bloccante (#1):** i solai a tutta larghezza senza discesa rendono la partita impossibile da finire se salti un'opportunità. Sul Board la marea è ferma e non arriva neanche il "Budget sforato": restano R ×30 o ricaricare la pagina.
2. **Importante (#2):** la verifica analitica della marea passa con 3,5 px di margine. Con salti da 800 ms il player "veloce" viene già preso, e il modello ignora la porta "5 minuti" e il deck. In pratica la presa al piano 1 è quasi certa.
3. **Importante (#3):** il trampolino del leccapiedi si perde a 30 fps (finestra di 16 px controllata una volta per frame) e la sua altezza dipende dal frame, con margine ≈ 0–5 px sulla piattaforma a 5 righe.
4. **Importante (#4):** dopo un respawn la marea resta allo stadio più alto raggiunto (CEO a 72 px/s al piano 3 rifatto da `cp2`).
5. **Minori:** delega filtrata per altezza anche nei livelli 3–4 (#5); junior delegato sul piano sbagliato (#6); trigger che sconfina sul piano sopra (#7); commento falso del validatore (#8); leccapiedi che non ricompare (#9); dettagli di debug (#10); divergenze dal piano (#11); test mancanti (#12).
6. Test (148), build e smoke (74/74) sono verdi. Morte durante la call, standup, respawn e livelli 1–4 si comportano correttamente.

**Priorità:** #1 prima del playtest; #2–#4 prima o subito dopo, perché decidono se la torre sembra "crudele ma giusta" o solo ingiusta.

## Esito (2026-11-01)

| # | Esito |
|---|---|
| 1 | **Corretto:** vano scale (2 colonne vuote) nei solai B, C e D, proprio sopra l'opportunità del piano sotto; cartelli "Scale ↓" e cartello nella lobby sulla pipeline; test: da ogni checkpoint ogni `$` e il Board sono raggiungibili (`validateLevel(..., { from })`) |
| 2 | **Corretto:** guinzaglio 10 righe, velocità 42 / 48 / 54 / 62 px/s; il test conta le attese del piano 2 (collega dei 5 minuti, crollo del deck) e chiede **margine ≥ 1,5 righe** con salti da 800 ms (oggi 2,7); un player lento (1,1 s a salto) viene preso |
| 3 | **Corretto:** controllo "swept" tra un frame e l'altro (vale anche il frame in cui sei già atterrato), piedi riportati sulla schiena e gravità extra azzerata al rimbalzo (altezza fissa); test a 30 fps; leccapiedi inchinato = accovacciato sul tappetino (niente più rotazione che copriva la scritta) |
| 4 | **Corretto:** `resetBelow` ricalcola lo stadio dalla quota della marea; test |
| 5 | **Corretto:** filtro sull'altezza solo nei livelli verticali |
| 6 | **Corretto:** il junior delegato cerca il pavimento partendo dalla quota del bersaglio |
| 7 | **Corretto:** nei livelli verticali i trigger di default coprono `ty − 5 … ty + 1` |
| 8 | **Corretto:** le cadute sono ammesse senza limite di righe (si limitano solo le salite), commento sistemato |
| 9 | **Corretto:** il leccapiedi ricompare accanto a te dopo la call e al checkpoint |
| 10 | **Corretto:** god mode chiama i respawn di marea e leccapiedi; `deals=3` non supera 3/3; partendo dal Board la marea non parte (niente doppio toast) |
| 11 | **Corretto:** riga HUD in basso registrata in DECISIONS, testo di debug spostato sopra; piano allineato (`cp0…cp3`, firma di `inTorch`). Il cartello della lobby "tagliato" è solo la camera (si legge entrando nella lobby) |
| 12 | **In parte:** aggiunti i test di #1, #3, #4, presa durante la pausa, partenza dal Board. Il checkpoint "solo in avanti" resta in `GameScene` (coperto dagli smoke) |

In più: il collega dei "5 minuti" reagisce solo a chi è sul suo piano (in una torre ci sono piani sopra e sotto di lui).
Verifica dopo le correzioni: 153 test Vitest, build, `npm run smoke` 74/74.

# Code review — IT, HR e fornitore esterno (`87314dd..11c3f8a`)

Oggetto: `git diff 87314dd..11c3f8a -- src tests scripts` (escluso il merge di `origin/main`). Piano: `docs/IT_HR_EXTERNAL.md` (§10 per le differenze).
Verifiche eseguite:
- `npx vitest run` → 226/226;
- riproduzione nel browser (preview su :4173, script temporaneo, poi cancellato) del punto 1.

Build e `smokeItHr` 11/11 non rieseguiti: li riporta l'esecutore.

Costanti usate nei conti:
- `jumpVelocity` 620, `GRAVITY` 1800 (+700 in discesa), `maxRunSpeed` 260 px/s, `coyoteTimeMs` 90;
- fisica a 120 Hz, `TILE` 32;
- altezza massima del salto ≈ 106,8 px (3,3 tile); durata di un salto in piano ≈ 0,64 s, quindi ≈ 165 px di corsa.

---

## 1. BLOCCANTE — I junior al team building si perdono per sempre se arrivi al traguardo prima che tornino
- **Dove:**
  - `src/scenes/GameScene.js:608-609` (`completeLevel`: `count: this.team.count`, `session.team = Math.max(1, team.count)`);
  - `src/objects/team/Team.js` (`count` = solo `follow`, `aliveCount` include `away`).
- **Problema:**
  - `chargeTeamLosses()` usa `netLoss()`, cioè `aliveCount`, che conta gli `away` come vivi: nessun burnout.
  - Il livello dopo riceve però `team.count`, che conta solo chi ti segue: i junior `away` spariscono dalla campagna senza burnout e senza messaggio, contro il §3.1 ("Non è una perdita").
  - Quanto è facile: il traguardo (210) è a 29 colonne dalla zona (181).
    - In modalità normale: ~1 s fino al chiosco, 4 s di ticket, ~0,6 s fino alla barriera, ~2,6 s sulle VPN, quindi arrivo a ≈ 8,2 s.
    - Il junior *i* torna a 8 s + 0,3·(i+1) s, quindi a 8,3 / 8,6 / 8,9 s. Una corsa pulita perde 2–3 junior.
    - Con `pivot=it` (P1 a 300 ms, VPN sempre connesse) arrivi in ~4 s e li perdi **tutti e tre**.
    - Delegare il ticket prima della zona, come suggerisce il piano, anticipa l'apertura e peggiora le cose.
- **Riprodotto:** livello 3, `cp=cp1`, corsa da 174 a 182,5, poi `completeLevel()`.
  - Prima: `count 0, aliveCount 3, netLoss 0`.
  - `LessonsLearnedScene` riceve `team {count: 0, size: 3}`, quindi `session.team = 1`: il livello 4 parte con 1 junior invece di 3, a burnout invariato.
- **Fix proposto:**
  - in `completeLevel`, prima di leggere il team, far tornare tutti gli `away` (`team.recallAway()` che chiama `comeBack` su ognuno); oppure usare `followers + away` sia per `team.count` del payload sia per `session.team`;
  - aggiungere un controllo a `smokeItHr`: "traguardo con i junior via, il livello 4 parte con 3 junior";
  - regola per il playbook `level`/`implement`: ogni stato nuovo dei membri va controllato in **tutti** i conteggi del team (`count`, `aliveCount`, `netLoss`, payload di fine livello, `session.team`).

## 2. IMPORTANTE — Il ticket IT si riazzera a ogni morte nelle VPN: 4–5 s morti a ogni tentativo
- **Dove:** `src/objects/traps/ItTicket.js:36` (`reset()` → `brain.reset()`, barriera chiusa); `src/levels/level3.js` (checkpoint 183, chiosco 184, barriera 189).
- **Problema:**
  - Le morti tipiche della sezione sono nel burrone delle VPN (191–204), dopo la barriera.
  - Si rinasce a 183 e ogni vita richiede di nuovo chiosco, 4 s di lavorazione e la corsa alla barriera: ~5 s di attesa pura prima di ritentare il tratto difficile.
  - È un tratto morto ripetuto, contro "Restart < 1 s" (nello spirito) e contro la voce "ritmo" del playbook `level`.
  - Il corso HR, invece, è stato reso "per tutto il livello" proprio per questo.
- **Fix proposto (uno dei due):**
  - a. una volta risolto, il ticket resta risolto per il livello: la barriera si richiude dietro di te, ma alla rinascita è aperta ("Ticket già chiuso");
  - b. un secondo checkpoint a 190, dopo la barriera.

  La (a) conserva l'incidente "si richiude con te davanti" nella prima vita. Va in `LEVELS.md` e `DECISIONS.md`.

## 3. IMPORTANTE — La causa `it` del burrone VPN scatta quasi sempre (≈ 94% del ciclo), anche per un salto sbagliato
- **Dove:** `src/objects/traps/VpnPlatform.js:5,28` (`CAUSE_WINDOW_MS = 3000`).
- **Problema:**
  - Il ciclo è 3200 ms (2000 connessa + 1200 disconnessa). "Disconnessa da ≤ 3 s" è vero per tutto il ciclo tranne 200 ms (`local ∈ [1800, 2000)`).
  - Ogni caduta nel burrone diventa quindi una morte `it`, anche un salto corto con tutte le VPN connesse.
  - Il conto conta per la lezione dominante del livello 3, che sceglie i pivot del livello 4. `it` non ha slot nel livello 4, quindi una morte che sarebbe stata `pit` (fuori dal conto) "spreca" il pivot del giocatore su una causa che non cambia niente.
  - È anche un'attribuzione non "giusta": il narratore dice "La VPN è caduta. Tu pure." a chi ha solo mancato il salto.
- **Fix proposto:**
  - ricordare su quale VPN il giocatore era appoggiato per ultimo (`blocked.down` con quel corpo, o `player.body.bottom` sulla sua riga dentro le sue colonne);
  - dare `it` solo se quella VPN si è spenta mentre ci eri sopra (o entro ~300 ms dallo stacco);
  - in alternativa, una finestra ≤ `offMs` (1200) misurata dallo spegnimento della VPN più vicina alla colonna di caduta.

## 4. IMPORTANTE — Delegare il ticket costa un junior (+5% di burnout) per guadagnare ~1 s: un'opzione sempre sbagliata
- **Dove:** `src/objects/traps/ItTicket.js:62` (`stay: true, staySeconds: 6.5`); `Team.js` (`staying` → `gone` alla scadenza, quindi conta in `netLoss`).
- **Problema:**
  - Il junior che resta al chiosco dopo 6,5 s passa a `gone`. È coerente con ITERATION_4 ("il junior delegato è perso").
  - Il guadagno però è nullo:
    - la barriera è a 5 colonne dal chiosco (0,6 s di corsa);
    - la finestra aperta è 2,5 s;
    - con il team building subito prima, delegare è possibile solo da 174–175: si anticipa il ticket di ~1 s.
  - Il prezzo: un junior per il resto della campagna più +5% di burnout a fine livello.
  - Il §2.3 lo presenta come una contromossa ("tu sei libero di posizionarti"), ma non lo è.
  - Inoltre `delegateReserved` resta `true` dopo che il junior è sparito: il chiosco non è più delegabile fino alla morte (innocuo, ma da sapere).
- **Fix proposto:** decidere con l'utente se:
  - (a) il junior al chiosco **torna** quando la barriera si apre (stato `away` per `workMs`, poi `comeBack`). Dà senso alla delega e si integra col team building;
  - (b) oppure si toglie `delegateTarget` al ticket.

  Registrarlo in `DECISIONS.md`.

## 5. IMPORTANTE — L'incidente `hr` del livello 3 è quasi irraggiungibile e misura una cosa diversa dal piano
- **Dove:** `src/objects/team/Team.js:196-203`.
- **Problema:**
  - Il piano (review A) dice: incidente `hr` "se mentre il team è via tocchi un chiosco o una barriera che lo richiederebbe".
  - Il codice lo conta premendo **E** quando tutti i follower sono via, ovunque e anche senza nessun bersaglio delegabile in vista.
  - Toccare il chiosco IT con il team via, che è il caso descritto, non conta.
  - Così la lezione `hr`, l'unico modo di arrivare al pivot `hr` del livello 4 (barriera aperta), non nasce quasi mai giocando normalmente: si preme E solo se c'è qualcosa da delegare.
  - Il `hrSaid` per vita è corretto.
- **Fix proposto:**
  - contare l'incidente anche in `ItTicket.onTrigger` quando `scene.team?.members.some(m => m.state === 'away')` e il ticket parte (una volta per vita);
  - in `delegate()`, contarlo solo se `findTarget()` avrebbe trovato un bersaglio.

## 6. MINORE — Il fornitore e la delega condividono E: a 104 si può ingaggiare per sbaglio (−4 GU), e con poche GU E chiude la partita
- **Dove:** `src/objects/npc/Contractor.js:48,67-72`; `GameScene.js:479`.
- **Problema:**
  - a. Dalla scrivania (104) il deck del livello 4 (112) è entro 10 colonne ed è delegabile. Chi preme E lì per delegare il deck ingaggia il fornitore. Il cartello avvisa, ma l'indicatore "E pronto" dell'HUD e il pulsante touch (`setDelegateReady`) **non** si accendono per il fornitore: il segnale visivo dice "E non fa nulla qui".
  - b. `near()` controlla solo la x: dalla piattaforma dell'AI a 103–104 riga 12 (due righe sopra) E ingaggia lo stesso.
  - c. Con meno di 4 GU l'ingaggio porta il budget a zero: `spendGu` restituisce `true`, cioè "Budget esaurito".
- **Fix proposto:**
  - accendere `canDelegate`/`touch.setDelegateReady` anche quando un NPC con `onAction` è a portata (es. `npc.actionReady?.()`);
  - in `near()`, richiedere `Math.abs(player.body.bottom - this.floorY) < 4`;
  - rifiutare l'ingaggio se `budget.gu <= cost` ("Budget insufficiente per il fornitore").

## 7. MINORE — Con il pivot `hr` il fornitore costruisce ancora una scala verso il nulla
- **Dove:** `Contractor.js` (indipendente dal modo di `slotHR`); `HrCourse.js:27` (l'attestato non si crea se pivoted).
- **Problema:** con `pivot=hr` la barriera è aperta e l'attestato non esiste, ma la scrivania offre ancora "ingaggia (4 GU)": 4 GU e ~8 s per tre gradini inutili.
- **Fix proposto:** con `slotHR` pivoted, il fornitore resta chiuso ("Fuori sede") oppure non viene costruito; oppure i gradini portano a un caffè.

## 8. MINORE — Il corso HR blocca a mezz'aria
- **Dove:** `src/objects/traps/HrCourse.js:24,72`.
- **Problema:**
  - Il trigger (118–119, righe 13–14) scatta anche in volo, quando scendi verso la barriera.
  - `stopMotion()` azzera anche la velocità verticale: il personaggio si ferma un istante in aria e poi cade dritto.
  - Il pavimento è sotto, quindi non è letale, ma contraddice la regola nuova del playbook ("freezes never mid-air") che `ForcedRestart` invece rispetta.
- **Fix proposto:** avviare il corso solo con `player.grounded` (il trigger viene richiamato ogni frame di overlap, basta un `if (!scene.player.grounded) return;`). In alternativa, `setVelocityX(0)` soltanto.

## 9. MINORE — Le barriere del ticket e del corso non bloccano la delega
- **Dove:** `src/objects/team/Team.js:169` (`blockers` solo `approvalGate`).
- **Problema:**
  - Dal lato sinistro di 120 (livello 4) lo scope creep a 124 è entro 10 colonne: il junior "attraversa" la barriera HR chiusa.
  - Lo stesso succede nel livello 3 da 185–188 verso destra, se in futuro ci sarà un bersaglio oltre 189.
  - È la stessa incoerenza che il commento "a closed gate is a wall for juniors too" voleva evitare.
- **Fix proposto:** includere `itTicket` con `!brain.open` e `hrCourse` con `state !== 'open'` nei `blockers`.

## 10. MINORE — La barriera del ticket che si richiude addosso al giocatore
- **Dove:** `src/objects/traps/ItTicket.js:69-71`.
- **Problema:**
  - Se la chiusura arriva con il giocatore dentro la colonna 189 (centro ≥ `tx*TILE`), Arcade lo trova sovrapposto per più di `delta + OVERLAP_BIAS`: nessuna separazione, il giocatore resta "incastrato" e passa.
  - Se il centro è appena prima della colonna 189, viene spinto indietro **e** prende l'incidente `it`.
  - Il risultato dipende da pochi pixel: non sbagliato, ma poco leggibile.
- **Fix proposto:** rimandare la chiusura finché il corpo del giocatore si sovrappone alla colonna della barriera (come fa un ascensore), oppure chiudere solo se il giocatore è a sinistra di `tx*TILE - bodyWidth/2`.

## 11. MINORE — Testi e indizi
- **`ForcedRestart.js:38`:** il conto alla rovescia è un toast di 1000 ms a tempo **reale** (UIScene), mentre il conto è a tempo di gioco (`dt` limitato a 50 ms).
  - Su macchine lente il "3…2…1" lampeggia o sparisce tra un numero e l'altro: l'indizio diventa intermittente proprio dove serve.
  - Un qualsiasi altro toast nel frattempo (caffè, checkpoint) lo sostituisce.
  - Fix: un'etichetta HUD dedicata (come lo standup) oppure durata 1200 ms con rinnovo a ogni frame del countdown.
- **`HrCourse.js:87`:** se prendi l'attestato dopo aver già fatto il corso, il toast dice "il corso HR è saltato". Fix: un testo diverso se `state === 'open'`.
- **`VpnPlatform`:** nessun `reset()`. È voluto (ciclo sul tempo del livello), ma il tempo si ferma nelle pause (standup, morte): il ritmo resta deterministico solo rispetto al tempo di gioco. Va bene, ma conviene scriverlo nella scheda del livello 3.

## 12. MINORE — Copertura dei test e degli smoke
- **Fornitore:** lo smoke teletrasporta il giocatore sull'ultimo gradino. Nessun controllo prova che i gradini one-way registrati dall'NPC si salgono davvero dal pavimento (salti da 64 px con 32 px di vuoto orizzontale tra 108 e 110: fattibili sulla carta, `reachHead` ignora la x).
  - Fix: uno smoke che sale dalla scrivania con input veri, oppure un test Vitest che controlla anche la distanza orizzontale gradino–gradino con la tabella dei salti "normali".
- **Riavvio forzato:** non è coperto lo scenario chiave del piano, cioè fermo su un post LinkedIn → morte `linkedin` + incidente `it`, né il "zero in aria → blocco all'atterraggio" nel gioco vero (solo nel brain).
- **Team building:** manca il caso del punto 1 (fine livello con junior via) e il ritorno del junior che coincide con la morte.
- **Test dell'attestato:** si limita alle altezze. Ho verificato a mano che nessun'altra geometria del livello 4 lo raggiunge: la piattaforma più alta vicina è l'ultima dell'AI (103–104, riga 12), da cui la testa arriva a ~249 px contro i 184 necessari.

---

## Conti verificati (nessun problema)
- **Gradini del fornitore:**
  - dal pavimento (480) al gradino 1 (416), poi 352 e 288: +64 px ciascuno, contro 106,8 di salto;
  - attestato (y 168–184): dal gradino 3 la testa arriva a 153 px ✓;
  - dal gradino 2 arriva a 217 px ✗, come voluto;
  - di corsa verso sinistra dal bordo del gradino 3, il corpo attraversa la x dell'attestato (3455–3489) tra 0,14 e 0,50 s dopo lo stacco ✓.
- **VPN:**
  - salti con 2 colonne vuote e 32 px di dislivello, ampiamente fattibili;
  - con coyote si può saltare la VPN 2 (da 194 a 201: ~151 px utili su ~165), trucco da esperti accettabile;
  - nessuna combinazione attraversa i 14 tile senza VPN ✓;
  - one-way via `checkCollision`, `body.enable` alternato correttamente; un corpo disabilitato non entra in `separate` ✓.
- **Barriere del ticket e del corso:** 4 tile (top 352), salto massimo dei piedi a 373 ✓.
- **Riavvio forzato:**
  - `die()` imposta `isDead` prima di `cancelCall()`, quindi l'incidente entro 2 s funziona;
  - `respawnAt` libera tutti i lock, e anche `reset()` / `cancelCall()` rilasciano `it` / `hr`;
  - il KT finto (83, riga 11) in mezzo al conto alla rovescia porta a `waitLand` finché la chiamata non finisce. Si somma (4 + 1,2 s), ma è leggibile.
- **`GameScene`:** E va prima agli NPC; il collider del fornitore è registrato dopo la creazione del `player` ✓.

## Playbook da aggiornare
- `implement` / `level`:
  - "ogni nuovo stato del team (`away`, `staying`…) va controllato nei conteggi di fine livello e in `session.team`, con uno smoke che completa il livello in quello stato";
  - "le trappole a tempo prima di un tratto difficile non si riazzerano alla rinascita se il checkpoint è prima di loro".

## Riassunto
- **1 bloccante:**
  - i junior al team building del livello 3 si perdono per il resto della campagna se tocchi il traguardo prima degli 8 s, ed è quasi inevitabile: ~8,2 s con una corsa pulita, ~4 s con `pivot=it`;
  - il burnout non lo conta, perché `netLoss` usa `aliveCount` mentre `completeLevel` usa `count`;
  - riprodotto nel browser.
- **4 importanti:**
  - il ticket IT si riazzera a ogni morte nelle VPN (5 s morti per tentativo);
  - la causa `it` del burrone scatta nel 94% del ciclo, anche per salti sbagliati, e spreca il pivot verso il livello 4;
  - delegare il ticket costa un junior per ~1 s di vantaggio;
  - l'incidente `hr` del livello 3 non segue il piano e non nasce quasi mai, quindi il pivot `hr` del livello 4 è quasi irraggiungibile.
- **Minori:**
  - E condivisa tra fornitore e delega, senza indicatore e con il rischio di finire il budget;
  - fornitore inutile con il pivot `hr`;
  - corso HR che blocca in aria;
  - barriere non considerate dalla delega;
  - chiusura del ticket addosso al giocatore;
  - countdown in un toast a tempo reale;
  - smoke che saltano la salita dei gradini e il caso LinkedIn + riavvio.
- **Funziona come da piano:**
  - fisica dei gradini e dell'attestato;
  - barriere non scavalcabili;
  - VPN one-way;
  - lock rilasciati alla morte;
  - E agli NPC prima della delega.

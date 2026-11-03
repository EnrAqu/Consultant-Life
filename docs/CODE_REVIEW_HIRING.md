# Code review — Assumere junior nel livello 4 (+ standup ogni 30 min, niente junior fermo nel livello 4)

Oggetto: commit `d8d3dbc` (standup 20 → 30, `stall4` tolto) e `1b5999b` (agenzia interinale, annuncio su LinkedIn, `docs/HIRING.md`).
File: `src/objects/npc/HiringDesk.js`, `src/core/HireBrain.js`, `src/objects/team/Team.js`, `src/scenes/GameScene.js`, `src/objects/npc/PmStaffing.js`, `src/levels/level4.js`, `scripts/smoke/smokeItHr.mjs`, test.

## Verifiche eseguite
- `npm test`: 231/231 PASS. `npm run build`: OK.
- `smoke4.mjs` lanciato sul server di anteprima già attivo su :4173 (non ho usato `npm run smoke`, che riavvia `vite preview` con `--strictPort` sulla stessa porta). Risultato: 3 FAIL nei livelli 2 e 3 (cartello portato 14 colonne avanti, varco del livello 3 aperto dopo 1,5 s, collega delle 5 dei minuti). Sono tutti controlli a tempo e falliscono per la lentezza del container (fps 6–23 nelle schermate): non c'entrano col diff, che non tocca quei livelli. Il resto è PASS.
- Ho scritto una sonda Puppeteer (`scratchpad/probe.mjs`, fuori dal repo) contro il gioco vero. Esiti:
  - **A** (agenzia a 62, poi E a 66 verso la piastra 72): membri `J:staying, J, J, T, T` → sulla piastra va un junior **vero**; `netLoss` = 1.
  - **B** (E a col 150, girato verso la piastra 152, 15 GU): parte l'annuncio, GU 15 → 14, brain `waiting`. Nessuna delega.
  - **C** (`gu=1`, tre E a col 151): tre toast "non te lo puoi permettere", nessuna delega, team invariato.

## Problemi

1. **Bloccante (design) — La delega non usa mai gli interinali finché ci sono junior veri** — `src/objects/team/Team.js:282` (`delegate`: `const first = this.followers[0]`), `Team.js:76-84` (`addTemps` li accoda in fondo).
   - **Problema:** `HIRING.md` dice "Servono per la piastra del varco 1 (76) e per le deleghe fino al checkpoint". Però `delegate()` manda sempre il primo della fila e gli interinali sono sempre in fondo. La sonda A lo conferma: con 2 interinali al seguito, E sulla piastra 72 manda un junior vero (`staying`, fuori da `aliveCount`). Al checkpoint 106 costa +4% di burnout e un junior nel livello dopo, mentre gli interinali gratis restano lì e se ne vanno senza aver fatto nulla. Con almeno un junior vero, l'agenzia è solo decorazione.
   - **Fix:** in `delegate()`, `const first = this.followers.find((m) => m.temp) ?? this.followers[0];`, e lo stesso per il fumetto "Su cosa, di preciso?". Valuta anche l'arrivista (`Rival.js:121`, `followers[0]`): oggi ruba un junior vero anche con gli interinali al seguito. Va deciso con l'utente. Aggiungi uno smoke: agenzia → E verso la piastra 72 → va un interinale, e al checkpoint `netLoss` = 0 con team 3.

2. **Importante — Il chiosco LinkedIn ruba il tasto E a chi delega sulla piastra 152** — `src/levels/level4.js:58` (x 150), `HiringDesk.js:38-41` (`near` ±1,2 tile → col 149,3–151,7), `HiringDesk.js:59-70` (`onAction`), `GameScene.js:481`.
   - **Problema:** davanti al varco 156 bisogna delegare sulla piastra 152, quindi è normale premere E fra 149 e 151. Il primo E pubblica l'annuncio e costa 1 GU (sonda B): è una "trappola" senza indizio, perché l'HUD intanto mostra "[E] delega" acceso. Con GU ≤ 1, `onAction` restituisce `true` col toast "non te lo puoi permettere" a **ogni** pressione e la delega da lì non parte mai (sonda C). Lo stesso schema c'era già nel fornitore (`Contractor.js:79-81`).
   - **Fix:**
     - Sposta il chiosco lontano da un bersaglio di delega obbligatorio, ad esempio col 140–141: dopo l'atterraggio del burrone dello scope creep, prima del tappeto del PM 142. Ricontrolla i ±10/−6 colonne di `pickDelegateTarget`.
     - Oppure dai priorità alla delega quando c'è un bersaglio davanti (`team.findTarget()` non nullo e diverso da un NPC-scrivania).
     - In tutti e due i casi, quando non te lo puoi permettere, mostra il toast una volta sola e poi restituisci `false`, così E arriva alla delega. Correggi allo stesso modo `Contractor.onAction`.
     - Smoke: E a col 151 girato verso 152 → la piastra si attiva e le GU non cambiano.

3. **Importante — Un interinale congedato a metà delega lascia il bersaglio prenotato** — `Team.js:87-95` (`dismissTemps`), `Team.js:298` / `Team.js:323-331` (`delegateReserved`).
   - **Problema:** `dismissTemps` mette `gone` anche chi è `going`/`staying`/`doomed`, ma non libera `m.target.owner.delegateReserved`. Il caso concreto è il deck `slotC`: il suo bersaglio (col 114) è a portata di delega da 104–106. Se deleghi e passi il checkpoint 106 prima che l'interinale arrivi, l'interinale sparisce e il deck non scatta. Il deck resta prenotato fino alla prossima morte, perché `respawn` azzera `delegateReserved`, quindi non lo puoi più delegare e lo devi affrontare tu. Oggi succede solo con 0 junior veri; col fix del punto 1 diventa il caso normale.
   - **Fix:** in `dismissTemps`, per ogni `m.state === 'going'` imposta `m.target.owner.delegateReserved = false`. In alternativa, più leggibile: congeda subito solo chi è `follow`/`away` e marca chi è `going`/`doomed`/`staying` come `m.expiring = true`, così esce quando la sua delega si chiude. Smoke: delega del deck con un interinale da col 103, poi checkpoint → il deck torna delegabile (`findTarget()?.kind === 'deckCollapse'`).

4. **Importante — Il junior di LinkedIn: conteggi incoerenti, morte e GU** — `Team.js:71-73` (`aliveCount` senza `joining`), `Team.js:98-104` (`addRunner` non tocca `savedCount`), `HiringDesk.js:44-47` (`reset` riarma), confronto con `InternDesk.js:61-63`.
   - **Problemi:**
     - Lo stagista dice "the hire survives a death" e fa `savedCount += 1`; il junior dell'annuncio no. Se muori dopo che è arrivato, `restore()` lo cancella: hai pagato 1 GU e `HIRING.md` dice "Resta, anche nel livello dopo". Anche se muori nei 6 s di attesa, la GU è persa e il chiosco si riarma (ripaghi).
     - Siccome non è in `savedCount`, a fine livello il junior assunto **compensa** una perdita. Esempio: piastra 152 (−1) + annuncio (+1) → `netLoss` 0, quindi niente +4%. Per lo stagista invece la compensazione non c'è. Può andare bene come design, ma va deciso e scritto.
     - `aliveCount` ignora `joining`. Nel livello 4 non c'è un checkpoint dopo 150, quindi oggi non si vede, ma un checkpoint attraversato mentre corre lo farebbe sparire alla morte successiva. È esattamente il caso della regola del playbook `level` ("ogni stato nuovo in tutti i conteggi").
   - **Fix:** aggiungi `joining` agli stati vivi di `aliveCount`. In `JobPost.onArrive` aggiungi `team.savedCount += 1`, come fa lo stagista, se l'utente vuole che resti anche dopo una morte, e non riarmare il chiosco in `reset()` se lo stato era `done`. Se muori in `waiting`, non azzerare il timer (il junior arriva comunque) oppure restituisci la GU. Scrivi in `HIRING.md` e `DECISIONS.md` se l'assunzione compensa le perdite.

5. **Importante (processo) — Mancano gli smoke che il playbook chiede per gli stati nuovi** — `scripts/smoke/smokeItHr.mjs:225-264`, `.claude/skills/level/SKILL.md` ("…con uno smoke che finisce il livello in quello stato").
   - **Problema:** nessuno smoke prova:
     - la fine del livello col junior ancora `joining` (`recallAway` → `session.team` = 4);
     - la morte con gli interinali (team 3 al respawn, agenzia riarmata, burnout invariato);
     - la delega con interinali (punto 1);
     - il chiosco vicino alla piastra (punto 2);
     - il congedo a metà delega (punto 3).

     `HireBrain` è testato, ma la logica dei conteggi sta tutta in `Team` (Phaser) e nessun test la copre.
   - **Fix:** aggiungi i 5 smoke. Valuta di estrarre in `src/core/` una funzione pura `teamCounts(members, savedCount, prepaid)` (alive/count/netLoss) con un test Vitest su tutti gli stati (`follow`, `going`, `staying`, `away`, `stalled`, `joining`, `doomed`, `gone`, `temp`).

6. **Minore — Lo stagista (col 69) conta gli interinali** — `src/objects/team/InternDesk.js:52`.
   - **Problema:** con 0 junior veri e 2 interinali risponde "Hai già un team" e non assume. Dopo il checkpoint 106 gli interinali se ne vanno e resti a 0 fino allo stagista di 147. Per fortuna lì in mezzo nulla è obbligatorio: il PM vuoto dice solo una battuta.
   - **Fix:** `if (team.followers.some((m) => !m.temp))`.

7. **Minore — Il cartello del chiosco copre quello dello stagista 147** — `HiringDesk.js:31-33` (`wordWrap` 150 px centrato su col 150 → 4741–4891 px), cartello dello stagista centrato su 4720.
   - **Problema:** in `shots/hiring-jobpost.png` "Assumi uno stag[ista] / Budget formazione: 2 GU" è coperto per metà. L'indizio sul costo dello stagista non si legge.
   - **Fix:** risolto spostando il chiosco (punto 2). Altrimenti accorcia il testo o riduci `wordWrap` a ~100 px.

8. **Minore — Gli interinali persi parlano e contano come junior veri in narratore e statistiche** — `Team.js:270` (`hitByTraps` → `lose(m)` non quiet), `Recruiter.js:103` (`recordIncident('linkedin')`).
   - **Problema:**
     - Un interinale colpito da una mail fa partire "Un junior in meno…".
     - Se torni indietro fino alla zona #OpenToWork (37–44, non ci sono barriere), il recruiter si prende un interinale e registra un incidente `linkedin`, che pesa su `dominantPivotCause`. `HIRING.md` dice "non contano mai".
   - **Fix:** `lose(m, m.temp)` in `hitByTraps`. Nel recruiter, `if (!member.temp && !this.incidentSaid)`. Oppure una battuta dedicata ("Contratto rescisso in anticipo").

9. **Minore — Valori fissi e parametri morti** — `HiringDesk.js:85` e `:92` ("2" fisso mentre si usa `p.count`), `HiringDesk.js:104` e `level4.js:59` (nel modo `pivoted` c'è `cost: 1`, ma il getter lo ignora).
   - **Fix:** testi con `${this.p.count ?? 2}`. Nel modo pivoted metti `cost: 0` e fai leggere al getter `this.p.cost ?? 1` (la configurazione sta nei dati, come per gli altri slot).

10. **Minore — Più di 6 membri** — `src/core/TeamTrail.js:4` (`maxMembers = 6`).
    - **Problema:** se il livello 3 finisce con 5 o più junior (regali del recruiter o del PM), i 2 interinali portano il team a 7. Il settimo campione resta fisso sul più vecchio e si sovrappone al sesto. Anche i pallini dell'HUD crescono.
    - **Fix:** `maxMembers: 8`, oppure un limite all'agenzia (`min(count, 6 - team.count)`).

11. **Minore — Il checkpoint 106 si può saltare** — `Checkpoint.js:7` (sprite 24×40, cima a y 440; apice del salto 620²/(2·1800) ≈ 107 px).
    - **Problema:** è un problema che c'era già, ma ora conta: se lo salti, gli interinali restano fino alla fine del livello e diventa raggiungibile il ramo "il PM si prende un interinale" (+6%, non `prepaid`). `HIRING.md` descrive quel ramo come normale.
    - **Fix:** scrivilo in `HIRING.md` ("se salti il checkpoint, il contratto finisce a fine livello"), oppure attiva il checkpoint anche quando lo attraversi in aria (zona alta tutta la colonna).

12. **Minore — Testi e documenti**
    - L'HUD mostra "[E] delega" acceso anche quando E assumerebbe (`Team.js:235`). Basta il cartello, ma un "[E] assumi" quando `npc.near()` sarebbe più chiaro.
    - "livelli 3–5" è ancora scritto in `src/objects/npc/JuniorStall.js:10`, `src/core/StallBrain.js:1`, `CLAUDE.md:23`, `docs/JUNIOR_QUESTION.md:1` e `:27`.
    - La scheda del livello 4 in `docs/LEVELS.md` cita come smoke solo `smoke4.mjs`: aggiungi `smokeItHr.mjs` (assunzioni, corso, fornitore).

13. **Nessun problema — Standup ogni 30 minuti**
    - `constants.js:73` è coerente col test aggiornato (`StandupSchedule.test.js`: 4° standup a 110 s, orologio 10:55).
    - `smoke.mjs:432` (`clock=09:19`) vale ancora, perché il primo standup resta alle 09:20. Gli altri smoke dei livelli usano `standup=off`.
    - Effetto voluto: lo standup che sfora (ogni 3°) arriva ogni 90 s invece di 60 s, quindi meno burnout per minuto. L'attesa di 6 s al chiosco ha meno probabilità di cadere su uno standup.
    - `IMPLEMENTATION_PLAN.md:663` parla ancora di 30/60/90 s del vecchio piano: è storia, ma una nota "superato da DECISIONS 2026-11-03" non guasterebbe.

## Playbook da aggiornare
- `level`: "Il tasto E va prima agli NPC" va completato con: **una scrivania con E non sta a meno di ~3 colonne da un bersaglio di delega obbligatorio, e un 'non puoi permettertelo' non si mangia il tasto**.
- `level`: "chi riceve la delega deve poter essere un interinale: controlla l'ordine della fila"; "un membro che sparisce (`gone`) mentre è `going` deve liberare `delegateReserved`".

## Riassunto
- Test (231/231) e build sono verdi. Lo smoke 4 ha 3 FAIL a tempo nei livelli 2–3, dovuti al container lento e non al diff.
- **1 bloccante:** gli interinali non vengono mai delegati finché c'è un junior vero (la sonda lo conferma), quindi l'agenzia non fa quello che `HIRING.md` promette.
- **4 importanti:**
  - il chiosco a col 150 si prende il tasto E di chi delega sulla piastra 152: costa 1 GU, e con ≤ 1 GU blocca la delega;
  - il congedo al checkpoint lascia prenotato il bersaglio di una delega in corso (deck 112);
  - il junior di LinkedIn sparisce alla morte (lo stagista no), compensa le perdite e `joining` manca da `aliveCount`;
  - mancano gli smoke richiesti dal playbook per gli stati nuovi.
- **Minori:** lo stagista conta gli interinali, cartelli sovrapposti, narratore e incidenti degli interinali, testi con "2" fisso e `cost` del pivot morto, limite di 6 membri del trail, checkpoint saltabile, commenti "3–5".
- Standup ogni 30 minuti: corretto e senza effetti sugli smoke.

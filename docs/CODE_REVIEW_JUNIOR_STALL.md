# Code review — Il junior che si ferma + ritaratura del burnout (commit `cd12b25`)

Oggetto: `docs/JUNIOR_QUESTION.md`, `src/core/StallBrain.js`, `src/objects/npc/JuniorStall.js`, `Team.stall` / `Team.resumeStalled`
(`src/objects/team/Team.js`), entità `stall3` / `stall4` / `stall5` nei livelli 3–5, `BURNOUT.gain` in `src/config/constants.js`.

Verifiche eseguite davvero:
- `npm test`: 229/229.
- `npm run build`: OK.
- Smoke, sul server di anteprima già acceso su :4173:
  - `smokeBurnout`, `smokePmLinkedin`, `smokeItHr`: tutto PASS.
  - `smoke3`, `smoke4`, `smoke5`: falliscono con macchina carica (load ~3,6), su controlli a tempo (micromanager, hook di 3 s, escalation, lavoratore, leccapiedi). Falliscono **uguali sul commit padre `dd8cfb5`** (worktree a parte, porta 4175): non sono regressioni di questo commit.
- Esperimenti nel browser (script usa e getta, già cancellati):
  - livello 5: entrando al piano 2 da col 25 e andando a sinistra, il junior **non** si ferma;
  - livello 4: l'arrivista arriva al traguardo (−2 GU) e ti scavalca mentre spieghi;
  - livello 4: il junior ripreso compare 7–15 colonne più avanti.
- Simulazione dell'escalation (copia temporanea di `tests/Level5.test.js` con un'attesa in più al piano 2, poi cancellata).

Le cose che chiedevi di controllare e che **sono a posto**:
- I conteggi:
  - `count` e `followers` escludono lo stato `stalled`.
  - `aliveCount` lo esclude, quindi `netLoss` lo addebita.
  - `snapshot()` lo toglie da `savedCount`.
  - `completeLevel` addebita prima di `recallAway`, e `session.team = max(1, count)` lo lascia indietro.
- Ignorano il junior fermo: `hitByTraps`, `findTarget`/`delegate`, il team building (`sendAway` solo su `follow`), il PM (ultimo dei `followers`), il recruiter e l'arrivista (`followers[0]`), il lavoratore (`followers`).
- Morte e respawn:
  - `die()` → `cancelCall()` toglie il lock `junior`;
  - `respawn()` chiama `npc.reset()` prima di `team.restore()`, quindi `member` non resta a puntare a uno sprite distrutto;
  - il junior torna con il respawn e si ferma di nuovo (una volta per vita).

---

## Problemi

### 1. Lo scatto è fragile: colonna e riga esatte; nel livello 5 spesso non scatta — **importante**
**Dove:** `src/core/StallBrain.js:23`, `src/objects/npc/JuniorStall.js:57`, `src/levels/level5.js:81`.

**Problema:** scatta solo se un campione della scia dell'ultimo junior cade su `col` o `col+1` **e** con `Math.round(y/32)-1 === row`. Un junior che attraversa quelle due colonne in volo non scatta mai.
- **Livello 5:** al piano 2 si arriva saltando dalla tavola del lavoratore 2 (col 25–26, riga 64) e poi si va **a sinistra** verso la porta 18.
  - Chi salta da col 25 non passa mai da 26–27: il junior non si ferma. Verificato nel browser: da (25,61) verso sinistra lo stato resta `idle`, team 3.
  - Da col 26 scatta: in pratica è 50/50, a seconda di dove stai sulla tavola.
  - Con il pivot `replyAll` la scala di email arriva al piano 2 alle col 17–19, a sinistra del punto: **non scatta mai**.
- **Livello 3:**
  - Atterrando dal pilastro 128–129 (salto pieno ≈165 px + coyote ≈ 4160→4348 px, cioè col ≈135,9) e rilanciando subito per scavalcare il collega della porta 140, l'ultimo junior passa 136–137 in volo.
  - A 0,03 s dallo stacco è già 16 px sopra il pavimento: riga 13. Lo scatto salta.
- Per il giocatore la regola diventa "a volte il junior si ferma, a volte no", senza un motivo leggibile.

**Fix proposto:**
- Scatto per **attraversamento** e non per uguaglianza: tieni la colonna precedente dell'ultimo junior.
  - Scatta quando passa la soglia `col` nella direzione del livello.
  - Accetta la riga con una tolleranza (es. `row-3 ≤ r ≤ row`): se è in volo, si ferma dove atterra.
- Nei livelli verticali, scatto per **piano**: la prima volta che l'ultimo junior sta sulla riga 61, a qualunque colonna (`colFrom/colTo` = tutta la soletta).
- Test: per ogni pivot di ingresso, ogni percorso del validatore (`validateLevel(...).reachable`) deve passare la soglia **a piedi**. Va aggiunto a `tests/ItHrExternal.test.js`; oggi controlla solo che sotto il punto ci sia un pavimento.

### 2. Livello 4: riprenderlo costa la gara con l'arrivista e un altro junior — **importante** (design, "giusto")
**Dove:** `src/levels/level4.js:55` (stall 160), con `rival2` (start 157, `triggerCol` 163, `stopCol` 176, 215 px/s) e `raEnd` (scatto 163–164, email 166–170).

**Problema — i conti:**
- Dopo il varco 156 di solito restano 2 junior. L'ultimo è a 600 ms: quando arriva a 160 tu sei a ≈160 + 0,6·260/32 ≈ **165**. L'arrivista è partito a 163 e stai frenando per la valanga.
- L'arrivista impiega (176·32+16 − 5040)/215 ≈ **2,83 s** per arrivare.
- Andata e ritorno valgono ≈0,7 s + 1,8 s di spiegazione + ≈0,7 s per tornare a 165, poi ≈2 s fino al traguardo: almeno 4,5 s. **L'arrivista vince sempre** (−2 GU, causa `rival`).
- Mentre sei fermo:
  - ti scavalca (lock `rival`), verificato nel browser con il lock `["junior","rival"]`;
  - passando prende `followers[0]` (`stealJunior`): i junior fermi sulla tua scia tra 160 e 166 sono tutti sulla sua strada.
- Bilancio: riprenderlo = 0,5 + 2 GU e spesso **un altro junior perso** (+4%); lasciarlo = +4%. La scelta non c'è e il costo vero non si legge.

**Fix proposto:**
- Spostare `stall4` prima del varco, dove si aspetta comunque (es. col 149–150: tra lo stagista 147 e la pedana 152, lontano dal tappeto del PM 142–144). Si torna indietro mentre il junior delegato va sulla pedana.
- Oppure: l'arrivista non parte o non ruba mentre il lock `junior` è attivo (meno pulito).
- Poi un controllo in `smoke4`.

### 3. Livello 5: la spiegazione si mangia il margine con l'escalation — **importante**
**Dove:** `src/levels/level5.js:81`, `tests/Level5.test.js` (`floor2Ms`).

**Problema:**
- Il test dell'escalation dà al giocatore "a buon ritmo" un margine minimo e non conta il junior.
- Ho rifatto la simulazione con un'attesa in più al piano 2:
  - +1,8 s (solo la spiegazione) → margine 0,35 righe;
  - **+2,8 s → una presa** (−3 GU, +4% `escalation`, 1,2 s fermo).
- Tornare indietro: il punto è a 26, lo scatto arriva quando sei alla porta 18 (3 junior: 7,3 colonne di ritardo). Andata e ritorno ≈2 s, più 1,8 s di spiegazione: ≈3,8 s.
- Riprenderlo costa 3,5 GU e +4%; lasciarlo +4%. Anche qui è una non-scelta. Con il punto 1 sistemato diventerebbe anche sistematica.

**Fix proposto (uno dei tre):**
- Mettere l'escalation in pausa durante il lock `junior` (come per la presa: `paused`).
- Spostare il punto dove si aspetta comunque. Il corridoio della porta 18 (`standMs` 1,8 s) è già nel `floor2Ms`; il lavoratore 2 costruisce mentre lo guardi di spalle.
- Dichiarare il costo nella scheda e aggiungere al test `floor2Ms` l'attesa del junior (`explainMs` + 2 s), mantenendo margine ≥ 1,5 righe.

### 4. Livello 3: il punto è nel raggio della porta 140 e lo scatto arriva sul burrone — **importante**
**Dove:** `src/levels/level3.js:123`.

**Problema:**
- Con 3 junior lo scatto (toast, HUD) arriva quando sei a ≈col 143: sul bordo del burrone 145–148, cioè proprio mentre devi saltare. L'indizio arriva nel momento peggiore per leggerlo.
- Tornare indietro vuol dire ripassare due volte il collega della porta 140 (avviso a 6 colonne, esce a 3: col ≤137,5), con il rischio di una presa ogni volta (−0,5 GU, +4%, 3 s). Se hai già saltato, anche il burrone due volte.
- Se il junior si ferma a col 137 e ti avvicini, sei a ≤3 colonne dalla porta: il collega esce mentre spieghi.
- Il "costa 0,5 GU" della scheda è molto ottimista.
- Lo smoke (`scripts/smoke/smokeItHr.mjs:202`) neutralizza la porta con `brain.occupy()` e così nasconde l'interazione.

**Fix proposto:**
- Spostare `stall3` dove il ritorno è "pulito". Per esempio nella S7, tra il checkpoint 183 e la barriera del ticket 189: lì si aspettano comunque 4 s di lavorazione. Bisogna ricontrollare lo stato `away` del team building 176–181 e il checkpoint, che addebiterebbe subito.
- Oppure in S1, sul tratto piano 30–40, considerando il micromanager A.
- Se resta a 136, aggiornare la scheda con il costo reale e fare uno smoke **senza** `occupy()`.

### 5. Il junior ripreso si teletrasporta in fondo alla fila, lontano da te — **minore**
**Dove:** `src/objects/team/Team.js:91-97`; `TeamTrail` non registra mentre sei bloccato (`Team.js:153`).

**Problema:**
- Alla ripresa diventa l'indice `n-1` e legge la scia di `n·300 ms` prima del lock: dove eri mentre tornavi da lui.
- Misurato: tu a col 161, lui a 167,4; in un altro giro 15 colonne.
- Salta oltre la porta o il burrone da cui sei tornato, e può finire su una zona di trappole nel frame dopo (`hitByTraps`).

**Fix proposto:**
- Dopo `resume`, uno stato breve di rincorsa (come `updateGoing`, verso `trail.positionFor(i)`) prima di `follow`.
- Oppure ripulire la scia: `trail.reset` con il campione corrente, così tutti ripartono da te.

### 6. Domanda immediata se sei fermo vicino al punto; il toast dice "torna a prenderlo" — **minore**
**Dove:** `src/objects/npc/JuniorStall.js:60-66`.

**Problema:**
- Se aspetti fermo (nel livello 3 è naturale: aspetti a 136–137 che il collega della porta 140 rientri), la fila ti raggiunge.
- L'ultimo junior scatta accanto a te: nello stesso frame o in quello dopo arriva `ask`, con −0,5 GU e 1,8 s fermo senza aver scelto niente.
- Il toast "torna a prenderlo" esce mentre lui ti sta già facendo la domanda.
- Riprodotto nel livello 5, team teletrasportato su col 26: lo scatto e la domanda sono arrivati nello stesso istante.

**Fix proposto:**
- `ask` solo dopo che ti sei allontanato almeno una volta (es. > 3 colonne) dal junior fermo.
- Oppure, se sei già vicino allo scatto, niente toast e il fumetto diretto.

### 7. Junior fermo dopo un checkpoint: addebitato ma ancora recuperabile — **minore**
**Dove:** `Team.snapshot()` (`Team.js:63-67`), `GameScene.js:254-255`.

**Problema:**
- Al checkpoint `netLoss` lo addebita (+4%) e `savedCount` lo esclude, ma resta `stalled` con il "?" visibile.
- Nel livello 5 il checkpoint (4,52) è sopra il punto e si può scendere di nuovo dal bordo destro della mensola T. Riprenderlo dopo: +4% **e** 0,5 GU, e lui passa al livello dopo.
- La scheda dice che lasciarlo significa perderlo "al checkpoint".

**Fix proposto:** in `snapshot()` (o in `chargeTeamLosses`) passare gli `stalled` a `gone` (`lose(m, true)`). In `JuniorStall`, nascondere "?" e fumetto e portare il brain a `done`.

### 8. Con l'unico junior fermo: E consiglia di assumere, e lo stagista assume davvero — **minore**
**Dove:** `Team.js:243`, `src/objects/team/InternDesk.js:52` (`team.count > 0`).

**Problema:**
- Con l'unico junior `stalled`, `count` vale 0:
  - E dice "Nessuno a cui delegare. Assumi uno stagista.";
  - la scrivania dello stagista (livello 4, col 147: ci si torna, il varco resta aperto) ne dà uno nuovo e fa `savedCount += 1`.
- Poi riprendi anche quello fermo: un junior in più gratis.

**Fix proposto:**
- `InternDesk` deve contare anche gli `stalled` (es. `team.members.some(m => ['follow','stalled','away'].includes(m.state))`).
- In `delegate()`, se c'è un junior fermo, un toast tipo "Il junior è rimasto indietro con una domanda".

### 9. Ritaratura del burnout: testi e conti rimasti al vecchio valore — **minore**
**Dove:**
- `docs/BURNOUT.md:12`: tabella "Sale con … **+5%**";
- `src/config/constants.js:57,61-62`;
- `src/objects/traps/HrCourse.js:9,11` (+10%);
- `src/objects/npc/PmStaffing.js:10,59` (+10%);
- `src/objects/npc/Recruiter.js:10` (+5%);
- `src/objects/team/Team.js:24` (+10%).
- La scheda del livello 4 in `docs/LEVELS.md` e `docs/IT_HR_EXTERNAL.md` ("4 GU contro il +10%").

**Problema:**
- Commenti e documenti dicono numeri che non valgono più.
- Lo scambio fornitore/attestato del livello 4 è cambiato (4 GU contro **+6%**): il fornitore conviene ancora meno.
- Ambiguità: `relief` (caffè 2, KT vero 3, livello pulito 5) non è stato toccato. È coerente con "crescere troppo", ma va confermato con l'utente.

**Fix proposto:**
- Aggiornare tabella e commenti.
- In `DECISIONS.md`: "i sollievi restano invariati" (da confermare con l'utente).
- Rivedere il costo del fornitore (es. 3 GU), se l'utente vuole che resti una scelta.

### 10. Test e smoke mancanti — **importante** (verificabilità)
**Dove:** `tests/ItHrExternal.test.js:158-193`, `scripts/smoke/smokeItHr.mjs:200-224`.

**Problema:** non c'è nessun controllo per:
- (a) lasciarlo: +4% al checkpoint 183 o a fine livello, e team 2 al livello 4;
- (b) una morte mentre è fermo o mentre spiega: lock tolto, team 3 al respawn, il junior si ferma di nuovo;
- (c) i livelli 4 e 5;
- (d) lo scatto su ogni percorso e pivot (vedi 1).

Lo smoke del livello 3 spegne la porta 140 (vedi 4).

**Fix proposto:**
- Aggiungere (a), (b) e la variante senza `occupy()` a `smokeItHr`.
- Un caso nel livello 4 (arrivista: vedi 2) e uno nel livello 5 (con `escalation=on`).
- Il test (d) in Vitest.

### 11. Playbook — **minore**
**Problema e fix proposto:** aggiungere a `.claude/skills/level/SKILL.md`:
- "Un punto che fa **tornare indietro** il giocatore va controllato contro i nemici a tempo (arrivista, escalation, collega delle porte) e contro i burroni da riattraversare; il suo costo reale va nella scheda."
- "Uno scatto su una colonna va controllato su ogni pivot di ingresso: si attraversa a piedi?"

In `.claude/skills/review/SKILL.md`, un trucco di verifica: per confrontare con il commit padre si usa `git worktree` + `vite preview --port 4175` + `sed` della `BASE`. Prima va creata `scripts/smoke/shots/` nel worktree: senza, lo smoke va in crash e `grep FAIL` dà 0, un falso PASS.

---

## Riassunto
- La logica di base è corretta:
  - stato `stalled` escluso da `count`, `aliveCount`, `followers`, quindi da trappole, delega, PM, recruiter, arrivista e team building;
  - `netLoss` e `savedCount` coerenti;
  - lock rilasciato a morte e respawn;
  - test (229/229) e build verdi.
- I problemi sono di **posizionamento e scatto**, cioè di equità:
  1. Lo scatto vuole colonna e riga esatte: nel livello 5 dipende dalla colonna della tavola, e con il pivot `replyAll` non scatta mai. Nel livello 3 un salto concatenato lo evita.
  2. Livello 4: tornare a 160 regala il traguardo all'arrivista (−2 GU), con scavalcamento e spesso un altro junior rubato.
  3. Livello 5: con la spiegazione arriva quasi sempre una presa dell'escalation (simulato: +2,8 s → presa).
  4. Livello 3: il punto è dentro il raggio della porta 140, il toast arriva sul burrone 145–148, e lo smoke spegne la porta.
- In tutti e tre i livelli "riprenderlo" costa molto più di 0,5 GU, e lasciarlo (+4%) è quasi sempre meglio: la scelta che la feature promette non c'è.
- Minori: teletrasporto del junior ripreso; domanda immediata se sei fermo vicino; junior addebitato al checkpoint ma recuperabile; stagista assumibile con il junior fermo; commenti e documenti del burnout fermi a 5%/10%.
- Smoke: `smokeBurnout`, `smokePmLinkedin`, `smokeItHr` passano. `smoke3`, `smoke4`, `smoke5` falliscono anche sul commit padre per il carico della macchina: vanno rifatti a macchina scarica.
- Priorità: punti 1, 2 e 3 (più il 10 per fissarli con i test), poi il 4.

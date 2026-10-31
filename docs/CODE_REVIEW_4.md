# Code review — Iterazione 4 (`d210cd5..HEAD`)

> Revisore esterno, contesto separato. Oggetto: codice dell'iterazione 4 (micromanager a torcia, email/CR veloci, ritmo, traguardo che tradisce, team & delega, arrivista, bonus AI, livello 4, smoke test).
> Riferimenti: `docs/ITERATION_4.md`, `docs/DECISIONS.md`. Data: 2026-10-31.

## Verifiche eseguite

- `npm test`: **100/100 verdi** (12 file).
- `npm run build`: ok (warning noto sulla dimensione del chunk di Phaser).
- `npm run smoke` (3 suite, macchina scarica): **1 FAIL** al primo giro, cioè `smoke3` "waiting for the emails builds a bridge you can walk on" (il player arriva a col 123, la soglia è 124). Rilanciato 2 volte da solo: verde entrambe le volte. È flaky, vedi #17.
- Simulazione di `MicromanagerBrain` per 60 s (script usa e getta, non nel repo): vedi #5.

## Problemi

### 1. Blocco permanente: delega al micromanager mentre ti sta già spiegando — **bloccante**
- **Dove:** `Micromanager.onDelegate` → `MicromanagerBrain.occupy()`, `Team.updateGoing`.
- **Problema:** la disponibilità del bersaglio si controlla quando premi E (`delegateTarget`: `lightOn`), ma `onDelegate` parte solo quando il junior arriva, fino a ~1,2 s dopo (10 colonne a 320 px/s, partendo da dietro di te). Se nel frattempo entri nella torcia, il MM ti prende (`explain`, lock `'mm'`). Poi arriva il junior: `occupy()` porta lo stato a `cooldown` **senza emettere `release`**, quindi il lock `'mm'` non viene più tolto. Il player resta congelato finché non preme R, che conta come morte e costa 0,5 GU. Il caso è molto plausibile: premi E e continui a camminare verso di lui.
- **Fix:** in `onDelegate`, se `brain.state !== 'patrol'` non fare nulla (il junior torna in fila o resta perso, ma senza effetti); in alternativa `occupy()` emette `release` quando interrompe `explain`. Ricontrollare in generale `delegateTarget()` all'arrivo (vedi #4). Test: brain in `explain` → `occupy()` → deve uscire un'azione `release`.

### 2. Blocco permanente: delega al collega "Hai 5 minuti?" mentre ti ha agganciato — **bloccante**
- **Dove:** `FiveMinutesDoor.onDelegate` → `FiveMinutesBrain.occupy()`.
- **Problema:** stessa dinamica del #1. Premi E con la porta davanti, avanzi, il collega esce e ti aggancia (`hooked`, lock `'five'`), poi arriva il junior: `occupy()` passa a `occupied` senza `release`. Il lock `'five'` resta per sempre, e anche il fumetto resta a vista (`say` non ha timeout).
- **Fix:** come nel #1. `onDelegate` non deve fare nulla se `brain.isOut || state === 'hooked'`; oppure `occupy()` rilascia. Aggiungere il test.

### 3. Morte ingiusta: delega alla CR già scattata la fa ripartire da zero — **bloccante**
- **Dove:** `ScopeCreepPlatform.onDelegate`.
- **Problema:** `onDelegate` forza `state = 'idle'` e `armedMs = armDelayMs` senza guardare lo stato. Se nel frattempo la CR è già `extending` o `done` (l'hai fatta scattare tu e magari ci sei salito sopra), al frame dopo la testa torna di colpo a `startHeadCol` e riparte. La scia resta della lunghezza vecchia finché `updateTrail` non la accorcia, e il player che sta sopra la CR estesa perde il pavimento e cade nel burrone.
- **Fix:** `if (this.state !== 'idle') return {};` in testa a `onDelegate`. In generale tutti gli `onDelegate` devono essere idempotenti, vedi #4.

### 4. La delega non ricontrolla il bersaglio all'arrivo — **importante**
- **Dove:** `Team.updateGoing` (chiama `m.target.owner.onDelegate(m)` senza ricontrollare).
- **Problema:** è la causa comune di #1–#3. Altri effetti: KT già raccolto da te, valanga già partita (lì `onTrigger` è protetto), MM passato in `demo` o `away`. In tutti questi casi il junior viene comunque perso per niente, e il `delegateReserved` resta fino al respawn.
- **Fix:** all'arrivo, `if (!owner.delegateTarget()) { junior torna in fila (o 'Troppo tardi…') ; owner.delegateReserved = false; return; }`, poi `onDelegate`. Serve un test (anche con un owner finto) che il bersaglio sia ricontrollato.

### 5. Il micromanager pattuglia solo i primi ~5,6 tile della zona — **importante**
- **Dove:** `MicromanagerBrain.update` (patrol).
- **Problema:** si gira solo per tempo (3 s × 60 px/s = 180 px = 5,6 tile) e mai "ai bordi" come chiede §0b. Partendo da `minX` va avanti 5,6 tile e torna indietro: oscilla per sempre fra `zoneFrom` e `zoneFrom + 5,6`. Simulato 60 s: livello 3 zona A (16–40) → MM fra col 16 e 21,6, la luce arriva al massimo a col 27; livello 2 (54–66) → fra 54 e 59,6. La metà destra delle zone lunghe (L3 A: 28–40; L3 B: 92–110) non è mai sorvegliata, eppure `longestQuietStretch` la conta come "attiva". La regola del ritmo è rispettata solo sulla carta.
- **Fix:** scegliere il ritmo di pattuglia in base alla zona (`turnEveryMs ≈ larghezza / walkSpeed`), oppure girarsi ai bordi e ripartire dal punto in cui si è girato, oppure restringere le zone a ciò che copre davvero. Un test di `MicromanagerBrain` che dopo N cicli `x` copra tutta la zona.

### 6. Il "…" del micromanager non si vede: usa `tellMs`, che non esiste più — **importante**
- **Dove:** `Micromanager.handle('tell')`: `this.say('…', this.brain.p.tellMs)`.
- **Problema:** `tellMs` è stato tolto da `MM_DEFAULTS` (ora c'è `turnTellMs`). `bubbleLeft` diventa `undefined`, quindi in `update` `bubbleLeft > 0` è falso: il fumetto non viene mai posizionato né nascosto. Il primo "…" compare a (0,0) del mondo, fuori schermo, e da lì non si sposta più. L'indizio principale prima che si giri (§0b) manca; resta solo il lampeggio della torcia.
- **Fix:** `this.say('…', this.brain.p.turnTellMs)`. Aggiungere un controllo smoke: la bolla è visibile e vicina al MM durante `turning`.

### 7. La presa del micromanager dentro un corridoio-trappola uccide — **importante**
- **Dove:** livello 2 (MM 54–66 con il corridoio del deck 60–65), livello 3 zona B (86–110, deck 96–101) e `MicromanagerBrain.inLight`.
- **Problema:** la presa congela per 2 s (`stopMotion` + lock). Se avviene dentro il corridoio del deck già innescato, le slide ti uccidono mentre sei bloccato. Nel livello 2 la torcia, rivolta a destra da col ≥ 55, copre proprio 60–64. Il player paga −0,5 GU e una morte per lo stesso errore, contro il principio "il micromanager non uccide mai" (in §0b la presa a terra serviva a evitare le prese sopra i burroni, ma c'è anche questo caso).
- **Fix:** passare al brain le colonne pericolose (corridoi delle trappole del livello) come "no-catch", come già si fa per `gaps`. Oppure la torcia si ferma prima del corridoio, come per le piante. Oppure, se c'è un oggetto letale in arrivo, la presa viene annullata.

### 8. Delega nel tutorial del livello 3: E davanti al varco manda il junior dal micromanager — **importante**
- **Dove:** `DelegateTargeting.pickDelegateTarget` (solo davanti, tolleranza mezzo tile), livello 3 (pedana col 8, varco col 12, MM a col 16).
- **Problema:** il gesto naturale è camminare fino al vetro (col ~11) e premere E. La pedana è dietro (−3 col) e quindi esclusa, mentre il MM (col 16, torcia accesa) è a 5 colonne davanti. Il junior **attraversa il vetro chiuso** (i junior delegati non hanno collisioni), va a "farsi spiegare" e viene perso, e il varco resta chiuso. Lo smoke non lo vede perché preme E da col 6. Primo contatto con la meccanica: confonde e costa un junior.
- **Fix:** (a) i bersagli oltre un varco chiuso non sono validi; (b) se c'è un varco chiuso entro ~5 colonne, la sua pedana ha la priorità in entrambe le direzioni. Test in `DelegateTargeting` + uno smoke "E contro il vetro → pedana".

### 9. Arrivista 2: i −2 GU sono quasi inevitabili e si pagano a ogni vita — **importante**
- **Dove:** `level4.js` (`rival2`: start 158, trigger 160, stop 176 = cartello; valanga `raEnd` con trigger 163–164), `Rival.handle('arrived')`, `GameScene.respawn` (resetta tutti gli NPC).
- **Problema (conti):** l'arrivista impiega (176−158)·32/240 = **2,40 s**. Il player, dal trigger a col 160, deve fare circa 17,5 colonne a 260 px/s, saltare il cartello e tornare a toccarlo da destra: circa **2,35 s**, ed è il caso migliore, cioè saltando anche il trigger della valanga. Se la valanga parte (−1 s) o arrivi da sinistra (1,5 s di freeze), lui vince sicuro. Inoltre `RivalBrain.reset()` a ogni respawn (checkpoint a col 106) lo rimette in attesa, quindi ogni tentativo nel tratto S5–S7 costa 0,5 + 2 GU. Con 15 GU di partenza, −5 dal tradimento e −4 per due stagisti (vedi #10), il finale del livello 4 rischia di essere uno sforamento di budget quasi garantito.
- **Fix:** i −2 GU una sola volta per livello (flag che non si azzera al respawn, come `GoalBrain.trolled`); arrivista più lento (220) o trigger più avanti; documentare in DECISIONS i tempi voluti. Un test di `RivalBrain` con il caso "player ottimo arriva prima".

### 10. Arrivista 1: il furto del junior all'inizio del livello 4 è garantito — **importante** (design)
- **Dove:** `level4.js` (`rival1` a col 6, trigger col 9; spawn col 2).
- **Problema:** l'arrivista parte esattamente fra te e il team. Quando passi col 9 di corsa, il primo junior (300 ms dietro, cioè circa 78 px) è a x ≈ 210 e lui a x = 208: `|dx| < 14`, furto immediato, senza indizio né contromossa. Se arrivi dal livello 3 con 1 junior (il minimo), ti ritrovi a 0, e i due varchi costano 2 × 2 GU di stagisti. Non rispetta "crudele ma giusto" (manca la contromossa) né la regola §4.3 "varchi obbligatori ≤ team di partenza".
- **Fix:** farlo partire davanti a te (ti supera solo se ti fermi), o dare un indizio ("Bel team. Me ne presti uno?") e una contromossa (es. saltargli in testa annulla il furto). Aggiungere al validatore o a un test il controllo "varchi obbligatori ≤ team minimo garantito, al netto dei furti".

### 11. Arrivista: il "salto in testa" (leapfrog) può farti cadere in un burrone — **importante**
- **Dove:** `Rival.update` (`overlapping`), `Rival.handle('leapfrog')`.
- **Problema:** sopra un burrone lo sprite dell'arrivista sta a `lastFloor − 20`. `overlapping` scatta se i tuoi piedi sono entro 10 px da lì, cioè se sei in aria, a filo del bordo, sopra il vuoto. Il leapfrog chiama `stopMotion()` (vx = vy = 0) e blocca i comandi per 300 ms: cadi dritto nel burrone (es. livello 4, pit 34–36, mentre lo sorpassi: velocità relativa 20 px/s, quindi restate sovrapposti a lungo). Contro "never kills".
- **Fix:** leapfrog solo se `player.grounded` e mai sopra colonne senza pavimento; niente `stopMotion` in aria.

### 12. `floorAt` di team e arrivista prende la piattaforma più alta, non il pavimento — **minore**
- **Dove:** `Team.floorAt`, `Rival.floorAt`.
- **Problema:** scorrono la colonna dall'alto e restituiscono il primo tile. Nel livello 4, cols 62–68 (sporgenza a riga 10), l'arrivista e i junior delegati "salgono" di 5 tile e poi riscendono. L'arrivista prende il caffè sulla sporgenza (col 65) anche se corre sul pavimento, perché il controllo è solo su x.
- **Fix:** cercare il pavimento più vicino sotto l'ultima y nota (o sotto la riga di partenza); per i caffè confrontare anche la y.

### 13. Lo stagista sovrascrive lo snapshot del checkpoint — **minore**
- **Dove:** `InternDesk.update` → `team.snapshot()`.
- **Problema:** se al checkpoint avevi 2 junior, li perdi entrambi e assumi uno stagista, `savedCount` diventa 1. Alla morte riparti con 1 invece che con 2, contro §4.1 ("alla tua morte il team torna com'era all'ultimo checkpoint").
- **Fix:** `savedCount = Math.max(savedCount, count)` oppure `savedCount += 1` al momento dell'assunzione.

### 14. Lo stagista con meno di 2 GU porta allo sforamento senza avviso — **minore**
- **Dove:** `InternDesk.update` (`spendGu(2)` → `budgetOver`).
- **Problema:** davanti a un varco, senza team e con < 2 GU, l'unica azione possibile chiude la partita. Non è un blocco (c'è la schermata di budget sforato), ma arriva senza preavviso.
- **Fix:** se `gu ≤ COST`, toast *"Budget formazione esaurito"* e niente spesa (la partita va comunque persa, ma in modo leggibile); oppure lo stagista costa `min(2, gu − 0,5)`.

### 15. `session.team` sopravvive a una nuova campagna — **minore**
- **Dove:** `GameScene` (`session.team`), `MvpEndScene` (Spazio → `level1`).
- **Problema:** dopo il livello 4, "ricomincia" riparte dal livello 1, ma `session.team` resta, per esempio a 1. Il livello 3 della seconda partita inizia con 1 junior invece che con 3.
- **Fix:** azzerare `session.team = null` quando si avvia `level1` (o all'ingresso del primo livello con `team`).

### 16. Divergenze minori dal piano — **minore**
- HUD: `E delega` non lampeggia quando c'è un bersaglio a portata (§4.4) e non mostra il numero. Il primo è un indizio utile proprio per il #8.
- La scia del team non si ferma durante la call del KT (§4.1): i junior ti si ammucchiano addosso.
- La battuta `goalRight` viene subito sostituita da `levelComplete` (`completeLevel` chiama `narrate` subito dopo): *"Consegnato dal lato del cliente…"* probabilmente non si legge mai.
- `Goal` calcola il lato solo dalla posizione, non da `velocity.x` (§3). Va bene, ma va aggiornato il piano.
- Il fumetto del collega delegato (*"Ehi, tu! Hai 5 minuti?…"*) resta visibile per sempre (nessun timeout).
- Commento in `level3.js` ancora "zona A (14–40)", ora è 16–40.
- Bonus AI: le piattaforme vere richiedono due salti da 5 colonne (89→95, 97→103), cioè sono **più difficili** del percorso normale (salti da 4). Non è una scorciatoia; è giusto se è voluto, ma va scritto in DECISIONS.

### 17. Verificabilità: test e smoke mancanti o fragili — **importante**
- Mancano rispetto ai criteri di accettazione:
  - smoke "saltandoci sopra no" (§0b);
  - Vitest sulla finestra d'impatto delle email (§2);
  - smoke "E vicino al KT finto → nessuna GU persa" (§4.3);
  - test che **ogni** varco sia obbligatorio da solo: oggi `gatesClosed` chiude tutti i varchi insieme, quindi se uno fosse aggirabile il test passerebbe comunque;
  - test "varchi ≤ team di partenza".
- Nessun test copre la delega su bersagli già usati o cambiati durante la corsa del junior (#1–#4), il reset al respawn di varco, team e arrivista, né `Team.hitByTraps`.
- `smoke3` "email bridge" è flaky (col 123 contro una soglia di 124, a macchina scarica): usare `holdUntil` come in `smoke4` invece di `hold(1800)`.

## Note positive (brevi)
- Il reset al respawn è coerente: trappole, NPC, `team.restore()` e `delegateReserved = false`; i junior `doomed` in sospeso controllano `members.includes(m)`.
- `Goal.cancelCall` evita il lock eterno se muori durante il freeze; il tradimento resta "una volta per livello".
- Torcia, piante e "solo a terra" hanno buoni test; i conti delle email (14 tile/s, trigger −3) li ho rifatti e colpiscono davvero chi corre a 260 px/s (sovrapposizione di ~60 ms per colonna).

## Riassunto

- Test 100/100 e build ok; smoke 1 fail flaky (bridge), verde rilanciato.
- **3 bloccanti**, tutti dalla stessa causa: la delega applica l'effetto all'arrivo del junior senza ricontrollare lo stato. MM e collega lasciano il player bloccato per sempre (uscita solo con R, che costa una morte). La CR già estesa riparte e fa cadere chi ci sta sopra.
- **Equità:** la presa del MM dentro il corridoio del deck uccide (#7); il leapfrog dell'arrivista sopra un burrone uccide (#11).
- **Design L4:** i −2 GU dell'arrivista 2 sono quasi inevitabili (2,35 s contro 2,40 s) e si ripetono a ogni vita (#9). Il furto del junior a inizio livello è garantito e senza contromossa (#10).
- **Tutorial L3:** E contro il vetro manda il junior dal MM attraverso il varco chiuso (#8).
- **Micromanager:** pattuglia solo ~6 tile della zona (#5) e il "…" non si vede per un parametro rinominato (#6).
- Da sistemare prima del playtest: #1–#4, #6, #7, #8, #11. Poi #5, #9, #10 (bilanciamento) e i test del #17.

---

## Esito (2026-11-01, parziale)

- ✅ #1–#4: la delega ricontrolla il bersaglio all'arrivo (se non è più valido il junior torna nel team); il micromanager delegato sblocca il player.
- ✅ #5–#6: il micromanager pattuglia tutta la zona (si gira anche ai bordi, con "…"); il "…" usa `turnTellMs`.
- ✅ #7: il micromanager non ferma mai dentro un corridoio-trappola (`dangerCols`).
- ✅ #8: un varco chiuso blocca anche la delega; se davanti non c'è niente, il junior va al bersaglio subito dietro (la pedana).
- ✅ #9–#11: arrivista 2 più lento (215 px/s, parte quando fai scattare la valanga), −2 GU una sola volta per livello; arrivista 1 parte dietro di te e del team; niente "leapfrog" a mezz'aria.
- ✅ #12–#15: `floorAt` ignora le sporgenze sopra la testa; lo stagista non sovrascrive lo snapshot e avvisa se non ci sono GU; nuova campagna = team nuovo.
- ✅ #16: HUD "[E] delega ◀" quando c'è un bersaglio; la scia si ferma quando sei bloccato; `goalRight` non viene sovrascritta; fumetto del collega con timeout.
- ✏️ #17: test aggiunti (delega, pattuglia, varchi). **Aperto:** lo smoke "un junior mandato a una trappola già scattata torna nel team" fallisce ancora (team 2 → 1): da indagare.

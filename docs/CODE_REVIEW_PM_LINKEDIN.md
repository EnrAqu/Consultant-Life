# Code review — Il PM e LinkedIn (commit 71afeb3)

Oggetto: `docs/PM_LINKEDIN.md`, schede dei livelli 2 e 3 in `docs/LEVELS.md`, `src/objects/traps/PmGantt.js`, `src/objects/traps/LinkedinPost.js`, `src/core/GanttBrain.js`, `src/core/PostBrain.js`, `src/levels/level2.js`, `src/levels/level3.js`, `src/core/LevelValidator.js`, dati, texture, test e smoke.

Verifiche eseguite davvero (in questo container):
- `npm test`: 197/197.
- `npm run build`: OK.
- `smokePmLinkedin.mjs`: 7/7 PASS.
- `smoke3.mjs` e `smoke4.mjs` lanciati sia su 71afeb3 sia sul commit precedente (7cf7ab8, worktree temporaneo). I FAIL di tempo ("micromanager catches you…", "hook releases after 3 s", "the sign is carried…", "E sends a junior to the plate") ci sono anche prima, quindi non sono regressioni. **Fa eccezione un controllo**, al punto 1.

Costanti usate nei conti:
- gravità 1800, +700 in caduta; salto 620 px/s; corsa 260 px/s; coyote 90 ms;
- corpo del giocatore 18×28;
- hitbox delle spine 28×12, alla base della tile.

Risultati:
- salto pieno alla stessa quota: 0,636 s, cioè 165 px;
- con 32 px di discesa: 176 px;
- hop minimo (jump-cut subito) con 32 px di discesa: 94 px.

---

## 1. Importante — smoke4 rotto dal nuovo teleport (regressione vera, non di tempo)
**Dove:** `scripts/smoke/smoke4.mjs:92`

**Problema:** il controllo "a delegated colleague never hooks you" adesso fallisce in modo deterministico: FAIL 2 volte su 2 su 71afeb3, PASS su 7cf7ab8. Il teleport è passato da col 41 a col 46, a 1 tile dalla porta 47, dentro `stepOutDist` = 3. Al primo frame il collega esce, e `FiveMinutesDoor.delegateTarget()` restituisce `null` finché è fuori. Quindi:
- `E` delega il junior alla porta 56 (team 2 → 1);
- poi il giocatore cammina dentro five1 e resta agganciato (`incidents.fiveMinutes: 1`).

La frase del contesto "i FAIL dei vecchi smoke esistono anche prima" non vale per questo controllo.

**Fix proposto:**
1. teleport a col 40 (7 tile dalla porta: il collega resta chiuso), con il micromanager `mmA` occupato;
2. `E`, poi attendere `five1.brain.state === 'occupied'`;
3. teleport a 46 e camminare.

In alternativa: `five1.brain.occupy()` via `evaluate`. Nello stesso file, smoke3 (`smoke3.mjs:82`) passa ancora, ma ora il collega esce già al primo frame: il commento va aggiornato.

## 2. Importante — Livello 3: il trigger di `slotA` (replyAll) è finito sopra il burrone di LinkedIn
**Dove:** `src/levels/level3.js:102` (burrone 59–64) con `slotA` a `level3.js:68` (`triggerDx: -3`, `triggerWidth: 2`, quindi trigger sulle col 63–64)

**Problema:** prima il trigger era sul pavimento piatto 59–65. La contromossa del replyAll normale era: attivarlo, fermarsi e aspettare circa 2,1 s che le email cadute su 66–75 spariscano. Adesso le col 63–64 sono burrone, e il trigger scatta in volo tra il post (60–62) e la col 65. Restano due posti dove aspettare:
- **il post**, che crolla 1050 ms dopo il primo contatto;
- **la sola col 65**. L'hitbox dell'email della col 66 (36 px, centrata su x = 2128) entra di 2 px nella 65: la finestra per i piedi è circa 30 px, e si arriva con lo slancio di un salto. Un salto lungo dal post verso 68+ attraversa le email mentre cadono ("timed on a running player").

Anche il bersaglio della delega (`delegateTarget`, x = col 64) ora è sul burrone: il junior ci "fluttua" sopra. Funziona, ma si vede.

È una combinazione nuova, non prevista in `PM_LINKEDIN.md` §5. Con `pivot=replyAll`, invece, il trigger pivoted (61–62) cade sul post: innocuo.

**Fix proposto (scegliere con l'utente):**
- spostare lo slot LinkedIn in modo che 63–65 tornino pavimento (es. burrone 57–62 con il post 58–60: verificare la distanza da five2 a 56);
- oppure portare il burrone a 59–63 e il post a 60–61, così il trigger 63–64 resta mezzo su terra (ma 58 → 64 = gap 5 si salta senza post con la tabella hard);
- oppure, solo nel livello 3, `triggerDx: -1`, rifacendo i tempi con `logImpacts`.

Poi aggiungere uno smoke "L3 normale: post → 65, aspetto, attraverso il corridoio".

## 3. Importante — Livello 3: la porta "Hai 5 minuti?" a una colonna dal burrone del PM
**Dove:** `src/levels/level3.js:100` (burrone 41–45) e `level3.js:58` (`five1` a col 47)

**Problema:** tra burrone e porta c'è solo la col 46.
- "Ehi…" scatta a 6 tile, cioè già da col 41 (sulla barra o in volo). Il collega esce a 3 tile, da col 44,5: mentre sei in aria.
- **Normale:** atterri su 46 con il collega già fuori. Per un atterraggio con il corpo oltre x ≈ 1481, i ~11 px di scivolata a 260 px/s bastano a toccarlo (zona 1510–1530): aggancio da 3 s, −0,5 GU, +5% burnout.
- **Pivoted:** la barra ti consegna a 44–45, proprio nel raggio di uscita.

Prima il corridoio 40–47 era piatto e c'era la rincorsa per saltarlo. È "giusto" (l'indizio c'è), ma i due indizi si sovrappongono: la didascalia del PM e la nuvoletta "Ehi…" compaiono insieme sopra la stessa zona. Il piano non lo dice.

**Fix proposto:**
- spostare five1 a col 49–50, così da 46 c'è rincorsa e il collega esce dopo l'atterraggio (ricontrollare la delega e smoke3/4);
- oppure spostare il burrone a 38–42, dentro la fine della zona A (attenzione a `mmA`), lasciando 43–46 piatte.

In ogni caso, scrivere la combinazione nella scheda del livello 3.

## 4. Importante — Il PM non avvisa durante i 450 ms (indizio più debole delle altre trappole)
**Dove:** `src/objects/traps/PmGantt.js:87-104` (nessun feedback nello stato `armed`), `PmGantt.js:28` (etichetta)

**Problema:** durante `armed` non cambia nulla a schermo. La didascalia "Il PM: «Abbiamo ripianificato.»" compare insieme al movimento, non prima. Gli indizi prima del contatto sono due:
- la freccia ◀◀ (10 px);
- l'etichetta "Go-live (da ripianificare)", 8 px in `#0f766e`, verde acqua scuro su sfondo `#1b1f2a` / `#334155`: contrasto circa 3:1 / 2,3:1. Con il giocatore sopra, l'etichetta è coperta.

Il deck (`wobbleMs`) e LinkedIn (il contatore che sale) hanno un conto alla rovescia visibile. Il PM no: per "crudele ma giusto" è l'indizio più debole del livello. Il PM stesso è uno sprite fermo: il commento "with his Gantt" (`PmGantt.js:34`) non corrisponde a niente di disegnato.

Rischio minore: ◀ (U+25C0) su alcuni sistemi mobili viene reso come emoji colorata.

**Fix proposto:**
- in `armed`: la barra trema di 1–2 px (solo grafica, con il corpo fermo) oppure la freccia lampeggia, e la nuvoletta del PM ("Un attimo…") compare all'atterraggio, non al movimento;
- etichetta in un colore chiaro (es. `#5eead4`) o con `backgroundColor`;
- frecce disegnate nella texture `ganttBar` invece del glifo.

## 5. Importante — Livello 2: due atterraggi su una sola colonna tra spine e burrone (uno non documentato)
**Dove:** `src/levels/level2.js:13-14` (col 73 tra il burrone 67–72 e le spine 74–76), `level2.js:22` (col 95 tra le spine del KT 91–94 e il burrone 96–103)

**Problema (conti):**
- **Col 73.** Per stare su 73 senza toccare la spina 74 (hitbox da x = 2370), il bordo sinistro del corpo deve stare in [2318, 2352]: una finestra di 34 px.
  - Dal bordo della barra (bordo sinistro < 2272), l'hop minimo a piena velocità percorre ~94 px: si arriva a 2366, sulle spine.
  - Lasciarsi cadere dal bordo porta a ~2314: nel burrone, per 4 px.
  - Si stacca solo con il bordo sinistro in [2224, 2258], cioè circa 130 ms di corsa. Poi serve subito un salto bufferizzato oltre 74–76: da 73 il salto pieno basta, con margine.
  - Il salto diretto barra → 77 richiede 190 px contro un massimo di 172: impossibile. Senza coyote al limite non si fa.
- **Col 95.** Prima era l'inizio di un pavimento lungo (95–110). Adesso è un'isola: spina 94 da una parte, burrone 96 dall'altra. Stessa finestra di 34 px ([3038, 3072)), dopo i salti da 4 del KT. Il piano (§4) e la scheda non la nominano.

Il livello 2 (consulente, secondo livello) passa così da 0 a 2 atterraggi di precisione, più 450 ms sulla barra e 300 ms sul post sponsorizzato. È coerente con "stretto di proposito" per la col 73, ma la col 95 sembra un effetto collaterale.

**Fix proposto:**
- dichiarare esplicitamente la col 95 nella scheda e nel piano, oppure aggiungere `ground(96, 96)` e spostare li1 a 98–99 (burrone 97–103, ricontrollare li1 → 104);
- per la 73, mettere nella checklist del playtest "quante morti su 73/74"; se troppe, spine 75–76 (due);
- aggiungere uno smoke guidato da input reali: barra → 73 → 77 e 95 → li1 → 104.

## 6. Importante (rischio di una decisione registrata) — `pm` e `linkedin` nel livello 3 rubano il pivot del livello 4
**Dove:** `src/data/causes.js:38-48` (pivotabili), `src/core/StatsTracker.js:139` (`dominantPivotCause`), `src/levels/level4.js` (nessuno slot)

**Problema:** nel livello 3 normale ora ci sono due trappole che uccidono. Il PM a 450 ms, in particolare, sarà spesso la causa dominante del livello 3, a meno che il pivot dal livello 2 non sia stato proprio `pm`. In quel caso:
- il livello 4 non cambia, e il giocatore perde la lezione che avrebbe ristrutturato replyAll/scope/deck/five in L4;
- la Lessons Learned scrive comunque "Azione correttiva: … le barre del Gantt ti portano avanti", promettendo qualcosa che nel livello 4 non c'è.

Il precedente (micromanager, KT) esiste, e "livello 4 invariato" è una scelta dell'utente: non la rimetto in discussione. Segnalo che qui succede molto più spesso, perché sono trappole mortali e non incidenti.

**Fix proposto (da chiedere all'utente):**
- (a) in `dominantPivotCause`, preferire la causa pivotabile più frequente **che ha uno slot nel livello dopo**;
- oppure (b) dal livello 3 in poi contare `pm`/`linkedin` con un peso minore;
- oppure (c) accettare il rischio e scriverlo in `LEVELS.md` §Livello 3.

## 7. Minore — Livello 3: il burrone del PM (5 colonne) si salta senza barra
**Dove:** `src/levels/level3.js:100`, `tests/PmLinkedin.test.js:92-95`

**Problema:** 40 → 46 è un gap di 5: per la tabella `hard` (la fisica) si passa. Il salto pieno dal bordo della 40 supera la barra e atterra sulla 46 (≈ 142 px richiesti, 165 disponibili). Il test "level 3 needs its PM slot" passa solo con `table: 'normal'`. Non è un bug (una scorciatoia per esperti è legittima), ma la frase del piano "In modalità normale sono trappole in più" e il test fanno pensare il contrario.

**Fix proposto:** scriverlo nella scheda del livello 3 ("saltabile da esperti"), oppure allargare il burrone a 41–46 come nel livello 2, ricontrollando la porta (punto 3).

## 8. Minore — La barra normale scivola dentro la riga dove il giocatore sta sul pavimento
**Dove:** `src/levels/level2.js:44-45` (`shift: -3` → 65–67, riga 14), `level3.js:143` (→ 39–40); `PmGantt.js:22-24`

**Problema:** a fine corsa la barra occupa la riga 14 sopra il pavimento delle col 65–66 (L2, dove sta anche lo sprite del PM) e 39–40 (L3). Con `body.reset` il `_dx` della barra è sempre 0, quindi in Arcade:
- se il giocatore è fermo, resta "incastrato" (embedded, nessuna separazione);
- se cammina piano verso la barra in arrivo, a volte viene bloccato di lato;
- se si muove veloce, la attraversa.

Non uccide nessuno, ma il comportamento è incoerente, si vede (la barra passa sopra il PM e dentro il giocatore) e non è deterministico rispetto agli fps.

**Fix proposto:** rendere la barra solo calpestabile dall'alto (`body.checkCollision.left = right = down = false`), come una piattaforma one-way. In alternativa: una corsa che si fermi sopra il burrone (L2 `shift: -2` arriva comunque alla col 66; meglio la one-way).

## 9. Minore — La barra pivoted ti trascina anche mentre torna indietro
**Dove:** `src/core/GanttBrain.js:54` (`returning`) con `PmGantt.js:100-103`

**Problema:** in modalità pivoted, chi sale sulla barra mentre torna a casa viene portato **all'indietro** (L3: da 44 a 42). È innocuo (resta sopra il burrone e poi si riarma), ma contraddice "a tuo favore".

**Fix proposto:** trasportare il giocatore solo nello stato `moving` (`this.brain.state === 'moving'`), oppure non far tornare la barra pivoted finché il giocatore è a destra della sua casa.

## 10. Minore — Il team non subisce le trappole nuove
**Dove:** `src/objects/team/Team.js:102-105` e `152-168`

**Problema:** i junior che ripercorrono la tua scia "camminano nell'aria" sul post crollato e sulla barra scivolata via. Quelli mandati con `E` (`updateGoing`) attraversano i burroni 41–45 e 59–64 in volo (`floorAt` restituisce `null`). L'iterazione 4 dice "vengono colpiti dalle trappole che hai appena evitato": qui no. Nessun bug di gioco: è un'incoerenza visiva e di regole.

**Fix proposto:** decisione dell'utente.
- O i follower sopra una colonna di burrone senza superficie in quel momento vengono persi (con burnout `teamLoss`: cambia l'economia);
- oppure, più semplice, un piccolo "salto" grafico del follower sopra i burroni, scritto nel piano come scelta consapevole.

## 11. Minore — Copertura dei test e degli smoke
**Dove:** `tests/PmLinkedin.test.js`, `scripts/smoke/smokePmLinkedin.mjs`, `scripts/smoke/smoke.mjs:477-487`

**Problema:**
- Nessun test di `trapSurfaces` per `pm` normale e `linkedin`, né di `dangerCols` (che copra tutta la corsa).
- Negli smoke si usa solo il teleport: manca un attraversamento reale del livello 2 (vedi 5), e mancano il livello 3 normale (PM e LinkedIn) e la combinazione del punto 2.
- Il controllo del deck in `smoke.mjs` è più debole: prima `deaths === 0`, ora `!byCause.deckCollapse`, quindi accetta morti per altre cause.
- Il listener `g.events.on('update', …)` non viene mai rimosso. È innocuo, perché la pagina si chiude subito dopo.

**Fix proposto:** due test unitari (superfici e `dangerCols`, normale e pivoted); smoke input-driven per i punti 2, 3 e 5; nel controllo del deck, `deaths` contate solo prima di col 67 (es. `byCause` letto al primo passaggio da `__maxCol >= 66`).

## 12. Minore — Commenti obsoleti e piccole pulizie
**Dove:** `src/objects/traps/PmGantt.js:9-11`, `:34`, `:55`

**Problema:**
- l'intestazione parla ancora di "friction 0" / "friction 1": l'implementazione è cinematica, e il friction non conta più;
- "with his Gantt" (vedi 4);
- `syncLabels` rifà `plat.setPosition(body.x, body.y)`, già fatto da `body.reset`.

**Fix proposto:** aggiornare i commenti; togliere il `setPosition` ridondante.

## 13. Minore — Punti aperti con l'utente
**Dove:** `docs/LEVELS.md` (registro del livello 2)

**Problema:** sono due.
- "Classifica del livello 2: chiedere all'utente se azzerarla" è ancora aperta: i tempi vecchi non sono più confrontabili.
- Il checkpoint resta uno solo, a col 52 (scelta dell'utente). Ogni morte a LinkedIn (96–103) rifà micromanager, PM, spine, KT e la col 95: circa 45 colonne. Restart < 1 s, ma il giro da ripetere si allunga molto.

**Fix proposto:** chiedere all'utente:
- se azzerare la classifica del livello 2 (cambiare chiave o filtrare `levelId: 'level2'` per versione);
- se, dopo il playtest, vuole un secondo checkpoint verso col 78–82.

---

## Verificato e corretto (nessuna azione)
- **Barra cinematica in Phaser 3.90.**
  - `body.reset` azzera `prev`/`prevFrame`, quindi `_dx` = 0 e Arcade non trascina il giocatore: in normale lo "scivolare via da sotto" è corretto.
  - Il trasporto pivoted con `player.x += delta` (solo lo sprite) viene ripreso da `updateFromGameObject` al passo dopo, senza contare due volte lo spostamento.
  - L'ordine è giusto: lo step fisico avviene prima di `scene.update`, poi `postUpdate`.
  - `blocked.down` vale anche sui corpi immovable.
- **Determinismo.** `GanttBrain` e `PostBrain` sono puri, guidati da `dt`, senza casualità. La barra torna sempre a casa (niente soft-lock); il post riappare dopo 2,5 s.
- **Cause di morte.** Le finestre di 3 s e i `pitRect` sono corretti in entrambi i livelli.
- **Micromanager.** `dangerCols` copre tutta la corsa (L2 64–71, L3 38–44, pivoted 41–46).
- **Bypass del PM nel livello 2.** 66 → 73 senza la barra è di fatto impossibile: senza coyote mancano ~9 px, e un salto basso col coyote sbatte contro il fianco della barra.
- **Percorso LinkedIn del livello 2.** li1 → 104 (186 px disponibili contro 142); li1 → li2 → 107 oltre il cartello. La vittoria "da destra" è prevista dal design di `ITERATION_4`.
- **Catena dei pivot in entrata.** È invariata. `debug.js` ha i pivot nuovi; le frasi del narratore e la lezione di LinkedIn sono quelle dell'utente.

## Riassunto
- Le due brain sono pulite e testate. Il trucco cinematico della barra è corretto in Phaser 3.90.
- I numeri del livello 2 tornano, ma lo rendono molto più tecnico: due atterraggi su una colonna da 34 px. Quello sulla col 95 non è documentato (5).
- Il problema più concreto è nel livello 3: gli slot nuovi sono stati incastrati in un corridoio già pieno.
  - Il trigger del replyAll ora sta sopra il burrone di LinkedIn e toglie il posto dove aspettare (2).
  - La porta "Hai 5 minuti?" si apre mentre sei sulla barra del PM e ti aspetta all'atterraggio (3).
- Il PM non avvisa durante i 450 ms, e la sua etichetta ha poco contrasto (4).
- `pm`/`linkedin` nel livello 3 sprecheranno spesso il pivot del livello 4: rischio di una decisione registrata, da chiedere all'utente (6).
- Su smoke4 il contesto è sbagliato: "a delegated colleague never hooks you" è una regressione deterministica del nuovo teleport a col 46, non un fallimento di tempo (1).
- Prima del commit successivo: correggere 1, decidere 2–3 con l'utente, aggiungere l'indizio in `armed` (4), documentare la col 95 (5).
- Il resto è minore: comportamento laterale della barra (8), barra pivoted che torna indietro (9), team (10), copertura (11), pulizie (12), punti aperti (13).

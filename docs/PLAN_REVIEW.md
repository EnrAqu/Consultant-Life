# Review di `docs/IMPLEMENTATION_PLAN.md`

> Revisore: agente di review. Fonte di design: `PLAN.md`. Il piano non è stato modificato.
> Severità: **bloccante** (così com'è non funziona o l'agente dovrà inventare una parte essenziale), **importante** (funziona male o porta quasi sicuramente a un'implementazione sbagliata), **minore** (incoerenza o rifinitura).

---

## 0. Verifica dei calcoli fisici (riferimento per gli issue sotto)

Costanti: `g = 1800`, gravità in caduta `1800 + 700 = 2500`, `v_jump = 620`, `v_run = 260`, hitbox 18×28, coyote 90 ms.

| Grandezza | Calcolo | Valore |
|---|---|---|
| Tempo di salita | 620 / 1800 | 0,344 s |
| Altezza max (piedi) | 620² / (2·1800) | **106,8 px = 3,34 tile** (il piano dice 107 px: corretto) |
| Tempo di caduta dall'apice alla quota di partenza | √(2·106,8 / 2500) | 0,292 s |
| Tempo in aria (stessa quota) | 0,344 + 0,292 | **0,637 s** |
| Distanza orizzontale a 260 px/s | 260 · 0,637 | **165,5 px = 5,2 tile** (piano: ≈ 5: corretto) |
| Gap superabile allo stesso livello | (165,5 + 18) / 32, perché si stacca con il bordo sinistro della hitbox e si atterra con il bordo destro | **≈ 5,7 tile**; con coyote (+23 px) ≈ 6,4 |
| Salita di +3 tile (96 px) | si raggiunge solo in discesa dopo l'apice, a t ≈ 0,437 s → 113 px + 18 | gap max **≈ 4 tile**, ma con solo **10,8 px** di margine verticale |
| Salita di +2 tile (64 px) | t ≈ 0,529 s → 137 px + 18 | gap max **≈ 4,8 tile** |
| Da 0 a velocità max | 260 / 2400 | 0,108 s (corrisponde all'accettazione M2) |
| Salto minimo (rilascio al frame successivo) | vy ≈ −590 · 0,45 ≈ −265 → 265²/3600 + ~10 px | **≈ 30 px ≈ 1 tile** (corrisponde a M2) |

**Conclusione:** i numeri sono coerenti tra loro. Le regole di raggiungibilità sono però **troppo prudenti sui gap** e **non coprono le combinazioni salita + gap** (vedi #9).

Cose **verificate come corrette** (nessuna azione): `base: './'` per GitHub Pages; `scene.make.graphics({ add: false })` + `generateTexture` + `destroy`; `make.tilemap({ data })` + `addTilesetImage` su texture generata; ordine dei parametri `tile.setCollision(left, right, up, down)` per i one-way; pin di versioni (`phaser 3.90.0`, `vite 6.3.5`, `vitest 3.2.4` sono compatibili tra loro); workflow Pages; freeze dello standup con pausa della fisica (`this.physics.pause()` congela davvero il player a mezz'aria e `body.reset`/`setVelocity(0)` funzionano anche a mondo in pausa); trasporto del player su solidi immovable in movimento (Arcade `body.friction.x = 1` di default).

---

## 1. Issue

### 1. Collider/overlap creati su array statici: gli oggetti generati a runtime non collidono — **bloccante**
- **Dove:** §4.5 (contratto `BaseTrap`: `get solids()`, `get killZones()`; ultima frase con `physics.add.collider(player, trap.solids)`), §6.2-A (email generate durante il gioco), §6.2-C (slide che passano da killZone a solido).
- **Problema:** GameScene crea collider e overlap una volta in `create()`, passando gli array restituiti dai getter. Le email vengono create *dopo*; se il getter restituisce un array nuovo o se gli oggetti vengono aggiunti a un array diverso, non entrano mai nei collider: le email non uccidono e quelle pivotate non sono solide. Inoltre le slide (e le email pivotate) cambiano ruolo da "killZone" a "solido", e il piano non dice come spostarle da un collider all'altro.
- **Fix:** ogni trappola crea in `build()` **due `Physics.Arcade.Group` stabili** (`this.solidGroup`, `this.killGroup`, oltre a `this.triggerGroup`) e i getter restituiscono **sempre quei gruppi**. Gli oggetti a runtime vengono presi da un **pool pre-allocato** (es. `count` email create in `build()`, disattivate con `disableBody(true, true)` e riattivate con `enableBody(...)`). Per il cambio di ruolo: un solo gruppo per tipo di oggetto, con un `processCallback` nel collider (`obj => obj.getData('state') === 'landed'`) e uno nell'overlap (`obj => obj.getData('state') === 'falling'`). Scriverlo nel contratto §4.5.

### 2. UIScene si iscrive al bus dopo che GameScene ha già emesso lo stato iniziale — **bloccante**
- **Dove:** §4.2 BootScene (`scene.start('GameScene')` poi `scene.launch('UIScene')`), §7 `create()` (emette `LEVEL_START`, `GU_CHANGED` e il narratore `levelStart`).
- **Problema:** le due scene vengono create nello stesso giro di coda dello SceneManager, nell'ordine in cui sono state accodate. `GameScene.create()` emette prima che `UIScene.create()` registri i listener: al primo avvio l'HUD resta vuoto, l'overlay titolo non sa che il livello è partito e la prima frase del narratore va persa. Il bug non si vede dopo i restart, quindi è subdolo.
- **Fix:** (a) in BootScene **prima** `scene.launch('UIScene')` e poi `scene.start('GameScene', ...)`, **e** (b) regola difensiva: UIScene, in `create()`, emette `EV.UI_READY`; GameScene, quando lo riceve (o in ogni caso al primo `update`), ri-emette uno snapshot (`LEVEL_START`, `GU_CHANGED`, `CLOCK_TICK`). In alternativa un `bus.getState()` che UIScene legge in `create`.

### 3. Le trappole temporizzate non colpiscono chi corre: la "prima trollata" non avviene — **bloccante** (game design)
- **Dove:** §6.2-A parametri normal, §6.2-C parametri normal, accettazione M6/M8 ("sprint... margine stretto ma possibile").
- **Problema (calcolo):**
  - **ReplyAll:** le email nascono a `y = 0` e cadono a 9 tile/s fino alla riga 14 → **≈ 1,55 s di caduta**. La prima tocca terra a 0,3 + 1,55 = **1,85 s** dopo il trigger. Un player che corre (8,1 tile/s) attraversa il corridoio di 10 tile in **≈ 1,2 s**. Nessuna email raggiunge mai l'altezza del player mentre lui è sotto: chi corre passa senza accorgersene, e chi esita vede arrivare le email per 1,5 s. Non è né cattiva né una trollata.
  - **Deck:** prima slide a terra a 0,6 (wobble) + ≈ 0,3 s = **0,9 s**; il corridoio di 6 tile si attraversa in **0,74 s** e la prima slide cade sulla colonna 1 (già superata). Lo sprint passa sempre con ampio margine, non "al limite".
- **Fix:** aggiungere al piano una regola di design misurabile: *"il primo frame letale di ogni trappola temporizzata deve coincidere con la posizione di un player che entra correndo a velocità massima; la soluzione è esitare/tornare indietro, oppure un timing preciso"*. Parametri concreti:
  - ReplyAll: nuovo parametro `spawnHeight` (tile sopra `floorY`, default 6) invece di `y = 0` → caduta ≈ 0,67 s (resta ≥ 500 ms di ombra); `startDelayMs: 0`; colonne **dall'ingresso verso l'uscita** e spaziate in modo che la k-esima email arrivi a terra quando il player che corre è lì (`intervalMs ≈ 1000 / 8,1 ≈ 120 ms` per colonna); trigger **2 tile prima** del corridoio. Va tenuta in GameScene, in debug, una riga che mostri `t_impatto` per colonna.
  - Deck: trigger **all'interno** del corridoio (a 2 tile dall'ingresso), `wobbleMs: 350`, slide che cadono **dall'uscita verso l'ingresso** (la prima chiude la strada davanti al player).
  - Aggiornare M6/M8: "un player che corre senza fermarsi muore; chi entra, torna indietro e aspetta passa; lo sprint con salto sopra la prima slide è possibile ma stretto".

### 4. Livello 2: un'unica mappa ASCII per due geometrie diverse; la slot deck in modalità normal forma comunque un ponte — **bloccante**
- **Dove:** §5.4 (formato livello: una sola `map`), §6.4 tabella livello 2 (slotA, slotB, slotC, slotD), §6.2 parametri default.
- **Problema:**
  - La mappa è statica e uguale per normal e pivoted, ma le slot sono descritte con geometrie diverse ("slotC normal: corridoio con deck normal" e anche "in normal lo stesso burrone ha 2 piattaforme"). Le due frasi si contraddicono.
  - I parametri default normal del deck (§6.2-C) sono pensati per un corridoio: in un burrone, le 6 slide si fermano come solidi alle righe 13–14 **a mezz'aria**, quindi formano un ponte largo 6 tile anche in modalità normal. Il pivot diventa inutile.
  - I default "pivoted" di ScopeCreep/Deck/KT presuppongono geometrie (burrone di 6–8 tile, piattaforme relative) che il piano non disegna. L'agente dovrà inventare tutto il livello 2 e le sue 8 varianti.
- **Fix:** (a) stabilire che la mappa è **comune** e che le differenze di geometria si fanno solo con le entità della slot (aggiungere un campo opzionale `params[mode].tiles: [{x,y,w,h,char}]` applicato dal builder prima di creare la tilemap, oppure vietare qualunque differenza di mappa); (b) scrivere **nel piano** i parametri completi di `level2` per ogni slot e modalità (non rimandare ai default); (c) per il deck normal in slot C, lasciare il corridoio con pavimento pieno e mettere il burrone solo nella variante pivoted tramite (a), oppure usare per il pivot una slot diversa.

### 5. Coordinate e ancore ambigue (righe, offset relativi, altezze non allineate alla griglia) — **importante**
- **Dove:** §6.2-B `pitRect: { x:0, y:15, ... }` "relativo all'entità"; §6.2-D `hiddenPlatforms` "relative all'entità"; §6.2-A `floorY`; §6.2-C `targets`, `stackY`, slide 64×36.
- **Problema:** con l'entità a riga 14, `pitRect.y = 15` relativo = riga 29 (fuori da un mondo di 17 righe). Non è chiaro se `floorY: 14` sia la riga del pavimento o la riga su cui l'oggetto si appoggia (§6.4 dice che il pavimento è a 15–16). Le slide sono alte 36 px, quindi due file alle righe 13 e 14 si sovrappongono di 4 px e la fila bassa entra di 4 px nel pavimento. `stackY` (assoluto) convive con `targets` (relativi).
- **Fix:** una regola unica in §5.4: *"x/y nei params sono offset **in tile relativi all'entità** (`dx`, `dy`, possono essere negativi); fanno eccezione i campi che finiscono in `Row`, che sono righe assolute"*. Rinominare quindi `floorY` → `restRow` ("riga in cui l'oggetto appoggia: il suo bordo inferiore coincide con il bordo superiore della riga `restRow + 1`"), `stackY` → `stackRow` e `pitRect` → `{dx, dy, w, h}`. Tutti gli oggetti usano `origin (0.5, 1)` = centro del bordo inferiore. Hitbox delle slide come solido = **64×32** (lo sprite può restare 36).

### 6. Il freeze di morte non mette in pausa la fisica — **importante**
- **Dove:** §3.4, §4.5 regola 3 ("durante il freeze la pausa della fisica ferma tutto"), §7 `update` (`if player.isDead return`).
- **Problema:** durante i 250 ms di morte la fisica *non* è in pausa ma `trap.update` non viene chiamato. Il cadavere continua a muoversi e cadere, e i solidi in movimento (testa dello scope creep, email, slide) superano la destinazione, perché è `update` a fermarli. Il `reset()` poi rimedia, ma intanto possono comparire spinte fantasma, overlap multipli e frame strani nelle clip.
- **Fix:** in `die()`: `player.body.stop(); player.body.setAllowGravity(false)` (o `body.enable = false`) e **continuare a chiamare `trap.update(dt)`** durante la morte (bloccando solo il player), **oppure** `this.physics.pause()` per 250 ms con `this.physics.resume()` in `respawn()`, facendo attenzione a non riprendere la fisica se nel frattempo è iniziato uno standup (usare un contatore di motivi di pausa: `pauseReasons = new Set(['death','standup'])`).

### 7. FakeKT: input bloccato a mezz'aria e spesa che aggira il controllo del budget — **importante**
- **Dove:** §6.2-D ("reset durante una call impossibile: non si muore bloccati"), §6.4 slotD ("KT finto sopra una fossa di spine"), §6.5 ("quando `budget.isOver()` dopo una spesa").
- **Problema:** la gravità resta attiva durante la call: se prendi il KT saltando sopra la fossa di spine (slotD) o un burrone, muori **mentre sei bloccato**. L'ipotesi "impossibile" è falsa e il caso va gestito sempre. Inoltre FakeKT chiama `budget.spend(3)` direttamente: se le GU arrivano a 0 così, nessuno attiva il budget sforato (la logica è solo in `die()`).
- **Fix:** (a) `die()` chiama sempre `fakeKT.cancelCall()` (`lockInput(false)`, emette `KT_CALL_END`); (b) introdurre in GameScene un unico `spendGu(amount, cause)` che fa spend + `recordGuLoss` + emissione di `GU_CHANGED` + controllo `isOver()`; le trappole chiamano solo quello (callback nel costruttore, come per il Player). (c) Valutare un congelamento anche verticale durante la call (`body.setAllowGravity(false)` e `vy = 0`), che è più leggibile ("sei in call, sei fermo") ed evita la morte ingiusta in slotD.

### 8. Il caffè che ricompare a ogni respawn annulla il costo della morte — **importante** (design)
- **Dove:** §4.4 Pickup ("ricompare al respawn"), §3.5 (`coffeeBonus 0.5 = deathCost 0.5`).
- **Problema:** se tra un checkpoint e il punto difficile c'è un caffè (in S4 ce ne sono 2–3 subito prima del checkpoint, e S7 ne ha uno), ogni morte costa 0,5 GU e il caffè le restituisce: il budget smette di contare proprio dove si muore di più. Così il budget sforato (M4) non è raggiungibile giocando normalmente.
- **Fix:** il caffè raccolto **resta raccolto per tutto il livello** (si azzera solo all'inizio del livello o con una nuova SOW). Aggiornare l'accettazione M3 ("caffè non ricompare dopo la morte").

### 9. Regole di raggiungibilità incomplete e troppo prudenti sui gap — **importante**
- **Dove:** §3.2 "Raggiungibilità".
- **Problema:** secondo i calcoli del §0, un gap di 4 tile allo stesso livello si supera con 1,7 tile di margine, quindi non è "dichiaratamente difficile". Il gap massimo è ≈ 5,7. Mancano anche le combinazioni: +3 tile di salita si fanno solo con gap ≤ 3 e 10 px di margine verticale, il che è fragile.
- **Fix:** sostituire con una tabella vincolante:

  | Dislivello (tile, + = sale) | Gap max "normale" | Gap max "difficile" |
  |---|---|---|
  | −2 o meno | 5 | 6 |
  | 0 | 4 | 5 |
  | +1 | 4 | 5 |
  | +2 | 3 | 4 |
  | +3 | 1 | 2 (sconsigliato) |
  | ≥ +4 | impossibile | impossibile |

  Aggiungere un **test automatico** (vedi #14) che verifichi questi vincoli sulle mappe.

### 10. ReplyAll pivotato: niente scala, schiacciamento del player, softlock — **importante**
- **Dove:** §6.2-A Pivoted.
- **Problema:**
  - `columns: [3,3,3,3,4,4,4,4,5,5,5,5]` con passo 0,5 tile → tre colonne alte **2 tile ciascuna**: un blocco piatto, non una scala. Da 2 tile a una sporgenza a 5 tile serve un salto di +3 (10 px di margine, §0): tecnicamente possibile ma frustrante, contrario a "il pivot aiuta".
  - Le email pivotate sono solide mentre cadono? Se cadono sul player (che aspetta nella colonna) un immovable in movimento lo spinge dentro il pavimento o lo fa attraversare.
  - Il trigger è one-shot per vita: dopo `stayMs` la scala sparisce e il player resta bloccato, costretto a premere R (−0,5 GU).
- **Fix:** `columns: [3,3,4,4,4,4,5,5,5,5,5,5]` → altezze 1/2/3 tile (scala vera; dalla cima a 3 tile, la sporgenza a 5 è a +2). Durante la caduta: `body.checkCollision.none = true`; all'arrivo, se c'è overlap con il player, aspettare che esca prima di diventare solida. In modalità pivoted riarmare il trigger quando l'ultima email è sparita. Far partire `stayMs` dall'atterraggio dell'**ultima** email.

### 11. Il pivot nel livello 2 aiuta troppo poco — **importante** (design)
- **Dove:** §6.4 tabella livello 2.
- **Problema:** le rotte normal sono già facili: slotB = burrone di 8 tile con 2 piattaforme da 1 tile, cioè gap da 2 (e non "da 3": 8 − 2 = 6 diviso 3 gap); slotD = 10 tile con 3 piattaforme da 1, cioè gap ≈ 1,75. Con i salti da 5,7 tile non servono quasi. Il giocatore non percepisce che "ciò che lo uccideva ora lo salva", che è il cuore della meccanica.
- **Fix:** la rotta normal di ogni slot deve essere **al limite** della tabella in #9 (gap "difficili", piattaforme da 1 tile, spine sul soffitto o sotto), mentre la rotta pivoted deve essere banale e **visibilmente** alternativa (es. slotB: normal = 2 piattaforme da 1 tile con gap da 5; pivoted = ponte). In slotD le piattaforme rivelate devono creare una scorciatoia, non solo allargare quelle esistenti.

### 12. La causa dominante misurata in GU favorisce sempre il KT finto — **importante** (design)
- **Dove:** §6.3 punto 1, slide Lessons Learned.
- **Problema:** un KT vale come 6 morti. Chi raccoglie il KT una volta (è luccicante e sta vicino ai caffè) e muore 5 volte per la stessa trappola ottiene come lezione "i finti KT", e la slide mostra "(0 morti, 3 GU bruciate)". Inoltre, se il giocatore muore 20 volte nei burroni (`pit`, non pivotabile) e una volta per replyAll, la slide dice "Causa principale: replyAll (1 morte)": è falsa, e chi gioca lo nota.
- **Fix:** misurare la dominanza in **incidenti** (morte = 1, KT finto = 2) invece che in GU; la slide mostra "N incidenti, X GU bruciate". Se la vera prima causa non è pivotabile, aggiungere un bullet onesto e comico: `Causa reale: {label} (non pivotabile. Il cliente ha scelto un'altra lesson.)`. Aggiungere un test per questo caso.

### 13. Narratore: l'interfaccia non trasporta la priorità e la specificità crea pareggi sbagliati — **importante**
- **Dove:** §4.3 (`pick → string|null`), §5.3 algoritmo, milestone.
- **Problema:** UIScene deve sapere la priorità (milestone/minSpot = 2), ma `pick` ritorna solo il testo. Una frase `{minSpot: 3}` e una `{cause: 'spike'}` hanno la stessa specificità (1) e vince il caso, quindi "3ª volta qui" può non comparire (M10 fallisce in modo casuale). L'esempio `death_many_1` con `minRunDeaths: 10` senza `runDeathsExact` compete con tutte le frasi di causa da 10 morti in poi.
- **Fix:** `pick` → `{ id, text, priority } | null`. Specificità pesata: `runDeathsExact` = 3, `minSpot` = 2, le altre chiavi = 1. Le milestone usano **solo** `runDeathsExact`, quindi va corretto l'esempio. Test: con spotCount 3 e causa spike vince sempre la frase spot.

### 14. Accettazione: molti criteri non sono verificabili dall'agente — **importante** (testabilità)
- **Dove:** §11 M2, M4, M5, M6–M9, M11 ("giocalo tu fino a farcela"), M12 ("tutte le 5 combinazioni completabili").
- **Problema:** l'agente Sonnet non gioca al gioco. Criteri come "feeling", "completabile in 60–90 s", "morendo 40 volte", "aspettare 09:30" diventeranno "verificato" senza esserlo davvero.
- **Fix:**
  - Separare in ogni milestone **"Verifica automatica (agente)"** e **"Verifica manuale (utente)"**.
  - Aggiungere parametri di debug: `?gu=1` (budget iniziale), `?clock=09:29` (ora di partenza), `?clockSpeed=10`, `?cp=<id>` (spawn al checkpoint), `?god=1` (le morti non costano e non resettano: utile per attraversare il livello).
  - Aggiungere `src/core/LevelValidator.js` (puro) con test su `level1`/`level2`: per ogni colonna calcola l'altezza della superficie calpestabile e verifica gap e dislivelli secondo la tabella #9, l'esistenza di un percorso P→G (grafo di salti tra superfici) e che le entità di trappola cadano dentro la mappa. Per il livello 2 deve girare sulle 5 combinazioni di modalità.
  - Rendere misurabili M6/M8 con i numeri di #3 (es. log in debug di `t_impatto` per colonna).

### 15. La lunghezza del livello 1 non corrisponde a "60–90 s" — **importante**
- **Dove:** §0 punto 1, §6.4 (~170 colonne), §11 M11 e M13 punto 4 ("almeno 2 standup").
- **Problema:** 170 × 32 = 5440 px; a 260 px/s sono **21 s** di corsa pura. Con le attese delle trappole (≈ 3–4 s per replyAll e deck, 0,5 s per scope) un run perfetto dura circa **30–40 s**. Il primo standup arriva a 30 s, quindi un run perfetto vede 0–1 standup.
- **Fix:** scegliere: o ~260–300 colonne, o target "35–50 s" con standup a `firstAt 09:20` e intervallo 20. In ogni caso il vincolo §6.4 "posiziona un salto lungo così che lo standup capiti a mezz'aria" non è realizzabile (l'orologio non dipende dalla posizione): riformularlo come "il livello contiene ≥ 3 gap da 4+ tile sopra burroni letali".

### 16. ScopeCreep: implementazione e geometria poco specificate — **importante**
- **Dove:** §6.2-B, §6.4 S3/S6.
- **Problema:**
  - La "catena di segmenti rivelati progressivamente" con una testa immovable in movimento è ambigua (quanti corpi? i segmenti dietro sono statici?).
  - Il tempo "a terra per `armDelayMs` cumulativi" non si può contare in una callback di overlap, che non riceve `dt`.
  - In S3, "burrone di 5 tile" e "piattaforma d'arrivo a 3 tile" sono incompatibili.
  - In S6 (`direction: 'left'`, muro a destra) non è chiaro come il player prosegua oltre il muro.
- **Fix:**
  - Testa = un solo sprite immovable che si muove con velocità; dietro di lei, **un unico rettangolo statico** (`TileSprite` + body statico) che viene ridimensionato con `setSize` + `body.updateFromGameObject()` a ogni tile superato.
  - Nella callback dell'overlap si imposta solo `this.playerOnTrigger = true`; `update(dt)` accumula se `playerOnTrigger && player.grounded` e poi azzera il flag.
  - Aggiungere uno schizzo ASCII di S3 e S6 con le colonne esatte.

### 17. Tell del KT/caffè: dati incoerenti e texture mancanti — **minore**
- **Dove:** §4.4 (caffè bob 1200 ms), §6.2-D tell (caffè "pulsa" a 1000 ms, KT alone 1300 ms), §4.6.
- **Problema:** il caffè ha un bob a 1200 ms ma il tell parla di pulsazione a 1000 ms; nessuna texture per gli aloni.
- **Fix:** caffè: bob 1000 ms + alone 1000 ms; KT: bob 1300 ms + alone 1300 ms (stesso periodo per bob e alone, così il fuori sincrono si nota). Aggiungere la texture `glow` 32×32 (cerchio bianco sfumato, da colorare con il tint).

### 18. Input "latched" durante lo standup — **minore**
- **Dove:** §3.3, §3.6 uscita dal freeze.
- **Problema:** `JustDown` resta vero finché non viene letto; un salto premuto durante lo standup scatta al primo frame dopo l'unfreeze (se si è a terra).
- **Fix:** durante il freeze GameScene chiama comunque `JustDown` sui tasti di salto e scarta il risultato (o `input.keyboard.resetKeys()` all'unfreeze).

### 19. Incoerenze varie — **minore**
- `dominantPivotCause(levelId)` (§4.3) vs `dominantPivotCause(run)` (§6.3): usare `(run)`.
- BudgetOverScene: "R/Spazio" (§4.2) vs "Premi R" (§6.5): accettare entrambi e scrivere `R o Spazio`.
- Entità `sign` (§5.4): nessuna classe né texture. Specificare `scene.add.text` su un rettangolo `pixel` scalato, gestito direttamente da GameScene.
- "I solidi delle trappole collidono col layer quando serve (specificato per trappola)": non è mai specificato. Scrivere "mai: le posizioni finali sono calcolate".
- Le zone trigger hanno bisogno di `physics.add.existing(zone, true)`: va scritto, altrimenti l'overlap non scatta.
- `completeLevel()` va protetto con `isDead` / `isComplete`, e durante gli 800 ms dopo il traguardo gli standup vanno sospesi.
- §6.4 slotB: con 2 piattaforme da 1 tile in un burrone di 8, i gap sono da 2, non "da 3".
- Le righe 0–1 stanno sotto l'HUD: vietare gameplay lì (anche lo spawn delle email).
- Testi con `pixelArt: true` e scala FIT risultano sgranati: `setResolution(2)` sui `Text`, o font ≥ 14 px (i "Text 10 px" di `CR #47` e del nome del deck sono a rischio leggibilità).
- Dopo un budget sforato, `startRun` azzera il run: le Lessons Learned contano solo l'ultimo tentativo. Va bene, ma scriverlo esplicitamente.

### 20. Scope: piccoli tagli possibili — **minore**
- `deathSpots` persistenti all-time (§5.2) non sono usati da nessuna parte (lo `spotCount` è per run): toglierli dall'MVP.
- `bestTimeMs` è usato solo se MvpEndScene lo mostra: decidere se mostrarlo o rimuoverlo.
- 45 frasi del narratore sono tante per l'MVP: 30 bastano (i requisiti per causa e per evento restano).
- Il resto dello scope è adeguato: il lavoro grosso sono le 4 trappole × 2 modalità, che sono il cuore dell'MVP.

---

## 2. Parere sulle domande aperte del planner

1. **Checkpoint nel livello 1:** **sì, uno solo** (a metà, col ~94). Il budget GU punisce già abbastanza: senza checkpoint, il budget sforato su 170+ colonne diventa abbandono. Condizione: il caffè non deve ricomparire (#8), altrimenti il checkpoint rende il budget irrilevante.
2. **R costa 0,5 GU:** **d'accordo.** Se fosse gratis diventerebbe un reset gratuito delle trappole (es. riarmare il ReplyAll senza pagare). La causa `selfRestart` e la frase "Dimissioni accettate" valgono il costo. Prima però vanno eliminati i softlock (#10), così R non diventa una tassa su un bug.
3. **L'orologio corre durante lo standup:** **d'accordo.** È coerente con il tema ("lo standup mangia minuti") e rende il calendario regolare (09:30, 10:00, ...). Con standup di 3–6 min e intervallo 30 min non ci sono sovrapposizioni. Il test di `StandupSchedule` deve coprire questo caso: dopo lo standup sforato delle 10:30, il successivo è comunque alle 11:00.
4. **Livello 2 con 15 GU nuove:** **d'accordo** per l'MVP: è più semplice, deterministico e testabile con `?level=level2`. Il riporto delle GU (o un bonus per quelle avanzate) è post-MVP.
5. **Niente audio nell'MVP:** **d'accordo.** Tutti i tell previsti sono visivi. L'unico punto in cui l'audio aiuterebbe davvero è l'avviso dello standup (il giocatore guarda il personaggio, non l'orologio): per compensare, il toast va reso ben visibile (grande, arancione, al centro-alto) e magari va aggiunto un bordo arancione lampeggiante allo schermo nei 3 s di warning.

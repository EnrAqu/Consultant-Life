# Review di `docs/BURNOUT.md` (barra burnout)

> Revisore: playbook `review`, contesto separato. Il piano e il codice non sono stati modificati.
> Riferimenti: `CLAUDE.md`, `docs/DECISIONS.md` (righe 130, 141, 142), codice reale in `src/` (`GameScene`, `UIScene`, `BudgetOverScene`, `EndingScene`, `BootScene`, `Escalation`, `Team`, `Rival`, `Micromanager`, `FiveMinutesDoor`, `FakeKT`, `Pickup`, `PlayerView`, `StandupSchedule`, `StatsTracker`, `config/debug.js`, `state.js`).
> Gravità: **bloccante** (l'esecutore deve inventare una parte essenziale, oppure il risultato contraddice l'obiettivo dichiarato), **importante** (porta quasi sicuramente a un bug o a un risultato ingiusto), **minore** (incoerenza o rifinitura).

## Conti di riferimento

Costanti reali: morte −0,5 GU; `startGu` 20 (livello 1) e 15 (livelli 2–5); standup ogni 20 s reali, uno su 3 sfora (`overrunEvery: 3`) → **+1%/minuto di gioco**, inevitabile.

- **Un "Budget sforato" vale circa +30%** (livelli 2–5: 15 / 0,5 = 30 morti; livello 1: +40%). Il burnout non torna indietro e si trascina nel retry.
- **Il minimo conta solo per chi muore poco.** Si parte da `max(trascinato, minimo)`: il trascinato supera il minimo appena si fanno più di ~15 eventi netti a livello. Esempi:

| Giocatore | L1 | L2 | L3 | L4 | L5 |
|---|---|---|---|---|---|
| Bravo: 10 eventi/livello, 1 caffè/livello | 0 → 8 | 15 → 23 | 30 → 38 | 45 → 53 | 60 → 100 dopo ~42 eventi |
| Medio "rage": 20 morti + ~3 standup + ~2 junior, nessuno sforamento | 0 → 21 | 21 → 44 | 44 → 69 | 69 → 94 | **94: 6 eventi** |
| Bloccato al livello 2 (come nel playtest #1) | 0 → 20 | 20 → +30 (sforato) → +30 (sforato) → 80 | **burnout a metà del livello 3** | – | – |

In pratica la regola effettiva è "**circa 100 eventi in tutta la campagna** = burnout", non "~40 eventi nel livello 5" come dice l'esempio del §1.

---

## Problemi

### 1. Il 100% arriva molto prima di quanto dice il piano — **bloccante (design, da portare all'utente)**
- **Dove:** §1 "Esempio di margine", tabella delle regole (minimi + trascinamento + nessun ritorno con "Budget sforato").
- **Problema:** l'esempio ("nel livello 5 parti almeno dal 60%, quindi ~40 eventi") vale solo per chi arriva al livello 5 avendo fatto ≤ 60 eventi netti nei livelli 1–4, cioè ≤ 15 morti a livello. In un rage game il giocatore medio arriva al livello 5 al 90%+ e chi sfora una volta il budget nei livelli 3–4 non vede il livello 5. Inoltre dopo un "Budget sforato" al livello 5 (60 + 30 = 90) il secondo tentativo ha ~10 eventi: il finale burnout diventa l'esito normale di chiunque sbagli il livello 5 una volta. Questo contraddice la citazione in testa al piano ("il burnout deve essere basso") e rende i minimi 0/15/30/45/60 quasi decorativi. Le decisioni registrate (+1% per evento, minimi, nessun ritorno con lo sforamento) non sono in discussione, ma la loro **combinazione** non è stata verificata con i conti.
- **Fix proposto:** presentare all'utente la tabella sopra prima di B-M2 e chiedere una di queste correzioni (in ordine di semplicità):
  a) **retry di "Budget sforato" = valore di inizio livello** (il tentativo fallito costa già il livello; il burnout ricorda solo i livelli finiti) — cambia la decisione del 2026-11-01 riga 142, che è ancora "da confermare nella review";
  b) **tetto per livello**: in un livello il burnout non sale più di `+N` sopra il valore d'ingresso (es. +20), così il minimo del livello successivo torna a contare;
  c) **trascinamento parziale**: `start = max(min, min + (trascinato − min) × 0,5)`.
  In ogni caso aggiungere a `tests/Burnout.test.js` una simulazione dei tre giocatori della tabella, con l'esito atteso scritto nel test: così la taratura dopo il playtest cambia un numero e un'aspettativa, non il codice.

### 2. KT vero: −3% a ogni respawn, il burnout (e le GU) si "farmano" — **importante**
- **Dove:** §4, riga "KT vero → `FakeKT.js:45`".
- **Problema:** `GameScene.respawn()` chiama `trap.reset()` e `FakeKT.reset()` rimette `collected = false`. Con il KT pivotato (livello 2 slot D col 83, livello 3 slot D col 164) il ciclo "prendo il KT vero → R (selfRestart, +1%) → riprendo il KT (−3%)" vale **−2% a giro** (e già oggi +0,5 GU a giro). È deterministico e ripetibile fino a 0%.
- **Fix proposto:** il sollievo del KT vero si dà **una volta per livello** (flag in `GameScene`, es. `this.burnoutRelieved = new Set()`, non azzerato da `respawn`), come il caffè che "non torna al respawn" (`Pickup.js:3`). Test: due prese del KT vero nello stesso livello → un solo −3. Segnalare a parte che anche il +1 GU del KT è farmabile (fuori scope del burnout).

### 3. `addBurnout` e `relieveBurnout` senza guardia su `this.ended` → doppio finale possibile — **importante**
- **Dove:** §4, firma di `addBurnout`/`relieveBurnout`; `burnoutOver()`.
- **Problema:** alcuni +1 arrivano **dopo** la fine del livello: il junior delegato a una trappola diventa `doomed` e viene perso in un `delayedCall(450)` (`Team.js:215`); `hitByTraps` può perdere più junior nello stesso frame; uno standup può partire durante la pausa di morte (`handleSchedule` gira prima del controllo `pauseReasons`). Se il livello è appena finito (`completeLevel` o `budgetOver` hanno già programmato un `fadeTo`) e il burnout è a 99%, `burnoutOver` lancia un secondo `fadeTo` verso `EndingScene`. Il piano dice "come `budgetOver()`", ma non dice di copiarne la guardia `if (this.ended) return`.
- **Fix proposto:** `addBurnout`: `if (DEBUG.god || this.ended) return false;`. `burnoutOver`: `if (this.ended) return;` come prima riga. `relieveBurnout('cleanLevel')` va chiamato in `completeLevel` **prima** di `endLevel()` (altrimenti la guardia lo blocca) e prima di costruire il `payload`. Test smoke: delega a una trappola + traguardo nello stesso secondo con `?burnout=99` → una sola scena finale.

### 4. Debug `?burnout=N` riapplicato a ogni `create` — **importante**
- **Dove:** §3, `new Burnout(DEBUG.burnout ?? session.burnout ?? 0)`; §7 B-M4.
- **Problema:** `GameScene.create` gira a ogni livello, a ogni retry e a ogni nuova campagna. Con `?burnout=50` il valore torna a 50 ogni volta: il trascinamento non si vede, lo smoke "retry da Budget sforato non azzera" passa anche se il codice è sbagliato, e lo smoke "nuova campagna dal finale riparte da 0" **fallisce sempre** (con `?burnout=99` si ricomincia al 99%). Inoltre `num()` in `debug.js` rifiuta 0 (va bene) ma non esclude valori > 100.
- **Fix proposto:** applicare `DEBUG.burnout` una sola volta, quando `session.burnout === null` (primo `create` della pagina), e solo dopo il reset della nuova campagna; da lì vale `session.burnout`. Aggiungere `burnout` al calcolo di `DEBUG.anyOverride` (già previsto) e `'burnout'` all'elenco ammesso di `DEBUG.ending` (`debug.js` accetta oggi solo `'partner'`; il piano lo dà per scontato).

### 5. Junior persi: contati due volte per lo stesso tratto e in modo incoerente tra le vie di perdita — **importante**
- **Dove:** §4, riga "Junior perso → `Team.lose` (anche `quiet`)" e nota sotto la tabella.
- **Problema:**
  - **Doppio conteggio per ciclo di morte:** dopo una morte `Team.restore()` riporta i junior del checkpoint; il junior colpito dalle email (+1) e poi la tua morte (+1) costano +2 per un tratto che alla fine non ti è costato nessun junior; il ciclo si ripete a ogni tentativo. Idem il **Rival** che ruba un junior (`Rival.js:123`, `lose(m, true)`) a ogni passaggio.
  - **Delega = sacrificio obbligatorio:** la delega a trappole/porta "5 minuti" passa da `doomed` → `lose(m, true)` → +1%. È la meccanica centrale dei livelli 3–4: punire con il burnout l'uso corretto della delega va deciso esplicitamente (DECISIONS riga 130 dice "junior persi", non "junior delegati").
  - **Incoerenza:** la delega al **micromanager** (`stay: true, staySeconds: 8`) termina con `m.state = 'gone'` dentro `Team.update` **senza** passare da `lose()` → nessun burnout; il varco "Approvazione richiesta" (`stay: true` senza timeout) idem. Eppure DECISIONS riga 110 dice che la delega al micromanager "consuma" il junior come le trappole.
- **Fix proposto:** scegliere una regola e scriverla nel piano. La più semplice e senza doppi conteggi: **contare le perdite nette al checkpoint e a fine livello** (`savedCount` precedente − `count` attuale quando si attiva un checkpoint o in `completeLevel`), non in `Team.lose`. Così i junior "restituiti" dal respawn non costano e tutte le vie (lose, gone, staying) sono coperte. In alternativa: contare in `Team.lose` **solo** se `!quiet` (trappole che colpiscono chi ti segue) e decidere con l'utente se delega e rival contano. Registrare la scelta in `DECISIONS.md`.

### 6. Ganci "prima di `spendGu`" senza `return` per micromanager e "5 minuti" — **minore**
- **Dove:** §4, righe Micromanager e "Hai 5 minuti?".
- **Problema:** per morte ed escalation il piano scrive `if (…addBurnout(…)) return;`, per micromanager e porta solo `addBurnout('…')`. Senza `return`, dopo il finale burnout parte comunque `spendGu` → `GU_CHANGED`, `recordGuLoss`, eventuale `narrate('budgetLow')` su una scena già finita. Numeri di riga: oggi sono `Micromanager.js:153` e `FiveMinutesDoor.js:113`.
- **Fix proposto:** uniformare: `if (scene.addBurnout('micromanager')) return;` e `if (scene.addBurnout('fiveMinutes')) return;`. Citare i ganci per nome del `case` (`'catch'`, `'hook'`) invece che per numero di riga.

### 7. `burnoutOver` lascia l'HUD visibile e sporca le statistiche — **minore**
- **Dove:** §4, `burnoutOver()` "come `budgetOver()`".
- **Problema:** `UIScene` nasconde l'HUD su `EV.LEVEL_COMPLETE` e `EV.BUDGET_OVER`; il piano non dice quale evento emette `burnoutOver`, quindi l'HUD resta durante la dissolvenza. `stats.failRun()` incrementa `budgetOvers` del livello: un burnout verrebbe registrato come sforamento.
- **Fix proposto:** nuovo `EV.BURNOUT_OVER` gestito da `UIScene` con `hideAll()`; non chiamare `failRun()` (o aggiungere un contatore `burnouts` separato, ma è fuori scope §8). Il `floatText("-0,5 GU")` di `die` viene mostrato prima del gancio anche quando la morte finisce la campagna: accettabile, ma meglio spostare il gancio prima del `floatText` o mostrare `+1% burnout`.

### 8. Ordine burnout/budget sullo stesso evento: corretto per la morte, da precisare per il resto — **minore**
- **Dove:** §1 riga "100%", §4.
- **Problema:** con il gancio prima di `spendGu` il burnout vince sempre (bene, coerente con la decisione). Però quando **solo** il budget finisce, il +1 è già stato salvato in `session.burnout` e il retry riparte con quel +1: va bene, ma va scritto (il §1 dice "riparti col valore che avevi quando hai sforato", che è ambiguo: prima o dopo l'ultimo evento?).
- **Fix proposto:** scrivere "compreso l'evento che ha sforato il budget" e aggiungere il caso al test di B-M4.

### 9. Nuova campagna vs retry del livello 1: giusto, ma il dato va letto in `init` — **minore**
- **Dove:** §3, "`GameScene.create(data)`".
- **Problema:** in `GameScene` i dati arrivano in `init(data)` (`levelId`, `pivotCause`); `create()` oggi non ha parametri. Phaser passa `data` anche a `create`, ma l'esecutore dovrebbe seguire lo schema esistente. Le vie verso il livello 1 sono tre: `BootScene` (primo avvio o `?level=level1`), `EndingScene` (nuova campagna) e `BudgetOverScene` (retry): con `retry: true` solo nell'ultima la regola funziona. Va bene anche che la stessa condizione azzeri `session.team` (riga 68), ma è un secondo posto che decide "nuova campagna": meglio un solo `const newCampaign = …` usato da entrambi.
- **Fix proposto:** `this.retry = data?.retry === true` in `init`; in `create` un solo `newCampaign` per team e burnout.

### 10. HUD: barretta attaccata alla barra GU e illeggibile su telefono — **importante**
- **Dove:** §6 HUD.
- **Problema:**
  - La barra GU occupa y 16–30 con bordo di 1 px (fino a 30,5): una barretta a **y = 31** è attaccata e si legge come parte della barra GU. Non ha sfondo né bordo specificati: a 0% è invisibile.
  - Su telefono il canvas 960×540 viene ridotto (circa 0,7× su un 6"): 11 px → ~7–8 px reali, 5 px → ~3,5 px. L'etichetta `burnout 23%` non si legge.
  - Spostamenti: `guText` 34→40 (alto ~18 px, finisce a 58), `levelText` 54→60, `teamText` 74→80, `dealsText` 94→100: nessuna sovrapposizione nuova con il riquadro del narratore (y 96, x 200–760) né con i controlli touch (tutti in basso). Resta però una **sovrapposizione già esistente** tra il toast (y 44–72, centrato; i toast lunghi come "[Calendario] … (si è aggiunto il cliente)" sono larghi ~530 px, quindi x ≈ 215–745) e `levelText` lungo ("Senior Manager — Il cliente strategico", x 16–~290): scendendo di 6 px la sovrapposizione verticale aumenta.
- **Fix proposto:** barretta a y = 34 (gap di 3 px), 200×6, con sfondo `0x111827` e bordo come la barra GU; etichetta a 13 px (come le righe di sinistra) o scritta dentro la riga GU (`GU residue: 12 / 15 · burnout 23%`); tutte le righe sotto spostate di 8 px. Spostare il toast a y ≥ 120 (sotto il narratore) oppure limitarne la larghezza a 480 px. Criterio verificabile: screenshot smoke a 960×540 e a 640×360 con toast lungo, narratore e team visibili insieme.

### 11. Personaggio stanco: due dettagli che non funzionano come descritti — **importante**
- **Dove:** §6 "Personaggio stanco".
- **Problema:**
  - `PlayerView.update` riporta ogni frame `sy → 1` e `tilt → 0` (righe 128–129): impostare "`sy` di base 0,95 e `tilt` 4°" non ha effetto se non si cambia il **valore di riposo** verso cui tende l'interpolazione. Il "4° in avanti" dipende dalla direzione: con `flipX` il segno va invertito.
  - "Texture `eyebags` posizionata sugli occhi del frame corrente": la testa si muove con `bob` (−1/0/+1 per frame) e lo sprite scala e ruota; un secondo sprite sovrapposto deve copiare origine, scala, angolo, alpha, flip e `bob`. L'esecutore deve indovinare le coordinate degli occhi per ogni outfit.
- **Fix proposto:** generare in `TextureFactory` le varianti `player_${outfit}_t1` / `_t2` passando a `makePlayerSheet` un flag `eyebags` (la funzione accetta già `key`), e cambiare `this.key` su `BURNOUT_CHANGED`. Per la postura: `restSy`/`restTilt` usati al posto di 1 e 0 nell'interpolazione, `restTilt = 4 * (flipX ? -1 : 1)` solo a terra e da fermo. Il tremolio va sommato alla posizione dopo l'interpolazione, non dentro.

### 12. Sollievo "livello senza morti" quasi sempre annullato dal minimo — **minore**
- **Dove:** §1, §6 Lessons Learned.
- **Problema:** chi chiude un livello senza morti è per definizione sotto il minimo del livello dopo (es. 8% → 3% → parte dal 15%): il −5 non si vede mai, e la riga "Burnout: 3% → il Progetto 2 parte dal 15%" può sembrare una punizione. Il "livello senza morti" conta anche dopo un retry (la `run` riparte a 0 morti), quindi premia chi ha appena sforato il budget.
- **Fix proposto:** applicare il −5 **dopo** `startLevel` del livello successivo (cioè sul valore di partenza), oppure accettare e togliere il −5 dal piano. Nella schermata Lessons Learned mostrare sempre il motivo ("minimo del Progetto 2").

### 13. Narratore `burnoutHigh` mai detto se si entra già sopra l'80% — **minore**
- **Dove:** §5.
- **Problema:** "una volta a livello, al passaggio del tier 2": con il trascinamento si entra spesso già a ≥ 80% (vedi tabella), e senza passaggio la riga non scatta proprio quando serve.
- **Fix proposto:** dirla anche all'inizio del livello se `tier === 2` (dopo `levelStart`, con priorità più bassa), al massimo una volta per livello.

### 14. Eventi che mancano o stonano rispetto al tema — **minore** (solo segnalazione)
- **Dove:** §1.
- **Problema:** il **KT finto** (1 ora di call inutile, −3 GU) non aumenta il burnout mentre il KT vero lo riduce; il "cliente cambia idea" al traguardo (`clientSwitch`, −5 GU) nemmeno. Lo standup che sfora pesa +1/minuto indipendentemente da come giochi (penalizza solo chi è lento, ed è attivo anche durante la pausa di morte).
- **Fix proposto:** chiedere all'utente se KT finto e `clientSwitch` devono valere +1; nessuna modifica senza il suo parere (i valori sono decisione dell'utente).

### 15. God mode e debug: coerenti, ma il piano non dice cosa succede ai sollievi — **minore**
- **Dove:** §4.
- **Problema:** `die` in god mode esce prima del gancio (bene) e `addBurnout` ignora gli aumenti, ma caffè/KT/livello pulito continuano a ridurre: in god mode il burnout può solo scendere. Accettabile per il debug, va solo scritto. `?ending=burnout` passa da `BootScene` con `levelId: 'level5'`: la riga "Burnout: 100% al Progetto N" va calcolata da `levelId` (già nel payload), non da `session.burnout` (null in quel caso).
- **Fix proposto:** una riga nel §3 su god mode; nell'`EndingScene` usare `levelId` e il valore 100 fisso.

---

## Riassunto

1. **Bloccante (design):** con +1% per evento, trascinamento pieno e retry che non torna indietro, il burnout arriva a ~100 eventi totali nella campagna: il giocatore "rage" medio lo vede nei livelli 4–5, chi sfora il budget una o due volte già al livello 3. L'esempio "~40 eventi al livello 5" è fuorviante. Serve una scelta dell'utente (retry = valore d'inizio livello, tetto per livello o trascinamento parziale) e una simulazione nei test.
2. **Importanti:** KT vero farmabile (−2% a giro, `FakeKT.reset` lo rimette a ogni respawn); manca la guardia `ended` in `addBurnout`/`burnoutOver` (junior `doomed` dopo 450 ms → doppio `fadeTo`); `?burnout=N` riapplicato a ogni `create` (rompe due smoke test di B-M4); junior persi contati due volte per ciclo di morte e in modo incoerente (micromanager e varco non passano da `Team.lose`); barretta HUD attaccata alla barra GU e illeggibile su telefono; personaggio stanco non realizzabile come scritto (l'interpolazione riporta `sy`/`tilt` a 1/0, occhiaie da sovrapporre a mano).
3. **Minori:** `return` mancante nei ganci micromanager/5 minuti; `burnoutOver` senza evento per nascondere l'HUD e con `failRun` che lo conta come sforamento; `retry` da leggere in `init`; sollievo "livello pulito" annullato dal minimo; `burnoutHigh` mai detto se si entra già all'80%; KT finto e `clientSwitch` non contano; god mode da documentare.
4. Ganci verificati e corretti nel punto indicato: `GameScene.die` (prima di `spendGu`, dopo `recordDeath`), `Escalation` `catch`, `handleSchedule` `start` con `overrun`, caffè (overlap in `registerColliders`), `completeLevel`; ordine burnout prima del budget giusto. Nuova campagna vs retry del livello 1 risolta correttamente con `retry: true` da `BudgetOverScene`.

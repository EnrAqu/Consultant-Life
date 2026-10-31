# Code review — Iterazioni 2 e 3 (`b3ba307..c3bcc61`)

> Revisore esterno, contesto separato. Riferimenti: `docs/ITERATION_2.md`, `docs/ITERATION_3.md`, `docs/DECISIONS.md`.
> Verifiche eseguite: `npm test` → 9 file, **60 test passati**; `npm run build` → **ok** (solo warning chunk > 500 kB).
> Simulazioni fatte da me con `MicromanagerBrain` reale (script fuori dal repo) per i casi di livello 2 e 3 citati sotto.
> Smoke test nel browser: **non riproducibili** (lo script non è nel repo, vedi #7).

## Problemi

### 1. Bloccante — Le piante (nascondigli) non vengono mai disegnate
- **Dove:** `src/scenes/GameScene.js` (`buildObjects`), `src/gfx/TextureFactory.js:220`, `src/core/LevelParser.js`.
- **Problema:** `LevelParser` raccoglie `level.plants` e la texture `plant` esiste, ma nessuno crea un'immagine. Il carattere `p` diventa un tile vuoto (lo conferma il test `tiles[14][57] === -1`). Così il cervello del micromanager usa nascondigli che il giocatore non vede: livello 2 col 57, livello 3 col 20, 33 e 93. La contromossa principale della §1.2 manca di indizio, quindi viola "crudele ma giusto".
- **Fix:** in `buildObjects` aggiungere `for (const p of level.plants) this.add.image(p.x*TILE+16, (p.y+1)*TILE, 'plant').setOrigin(0.5,1).setScale(1/TEXTURE_SCALE).setDepth(DEPTH.player + 1)`. La pianta va sopra il player, così "nascosto" si vede anche. Aggiungere un controllo smoke: esiste un'immagine `plant` per ogni pianta.

### 2. Bloccante — Il micromanager può causare una morte (cattura in aria, cammina sopra il burrone)
- **Dove:** `src/core/MicromanagerBrain.js:113-123` (`dash`), `:50-57` (`moveToward`); `src/levels/level3.js` zona A (14–40) con il burrone 27–29.
- **Problema:** il contatto in `dash` controlla solo `|player.x - mm.x| <= 20`, senza `y` e senza sapere se il player è a terra. `catch` chiama `stopMotion()` (vx = vy = 0). Se il player è in aria sopra il burrone, cade e muore (`pit`). Questo contraddice la decisione "Micromanager e 'Hai 5 minuti?' non uccidono".
  - Il micromanager si muove su un `floorY` fisso dentro tutta la zona, quindi cammina sopra il burrone 27–29. Simulazione: con il player fuori dalla zona, resta sopra il burrone ~3,2 s ogni 30 s.
  - Con il player fermo sul bordo (col 26), il MM può stare a destra del burrone (simulazione: `watch` a col 31). Se il controllo scatta mentre il player salta verso destra, i due si vengono incontro a ~600 px/s e la cattura arriva a metà salto, sopra il vuoto.
  - Caso minore nella zona 150–165: il bordo è la fossa di spine a col 166.
- **Fix:**
  - (a) Passare `grounded` al cervello: in `dash` catturare solo se `player.grounded`; se il player è in aria, il MM aspetta e cattura quando atterra, purché sia ancora in zona.
  - (b) Limitare il movimento del MM ai tratti di pavimento. Basta una lista di segmenti `floorSpans` calcolata dalla mappa; in alternativa si divide la zona A in 14–26 e 30–40, con la sola demo che attraversa il burrone.
  - (c) Test Vitest: "un player in aria non viene mai catturato" e "il MM non entra mai nelle colonne del burrone".

### 3. Importante — Nascondersi dietro la pianta funziona solo se il MM è a sinistra; lo smoke test del piano contraddice il livello
- **Dove:** `MicromanagerBrain.hiddenBehindPlant` (la pianta deve stare *strettamente tra* MM e player); `level2.js` (pianta 57, zona 47–66), `level3.js` (pianta 93, zona 86–110); `ITERATION_3.md` §1.6.
- **Problema:**
  - Da `idle` il MM pattuglia tutta la zona, quindi quando arrivi può trovarsi a destra (verso `zoneTo`). Allora ti segue *da destra*, la pianta resta alle tue spalle e vieni preso. Simulazione livello 2, player fermo a col 58 per 15 s: con il MM che parte da destra, 1 cattura; con il MM che parte da sinistra (sempre il caso dopo il respawn a `cp0`), 0 catture.
  - La contromossa dipende dalla fase della pattuglia al tuo arrivo: è deterministica, ma difficile da leggere.
  - Lo smoke test di §1.6 ("fermo a col 58 per 7 s → −0,5 GU") **non può passare** partendo da `cp0`: il MM si ferma a col 53 e la pianta a 57 ti copre. Il piano dice anche "per aspettare bisogna stare dietro la pianta a col 57", quindi piano e test si contraddicono.
- **Fix:** definire "nascosto" in modo simmetrico, cioè player a ≤ 1 tile da una pianta sulla stessa riga, da qualunque lato. In alternativa la pianta blocca la vista da entrambi i lati se il player le è adiacente. Correggere lo smoke test del piano (es. "fermo a col 55, lontano dalla pianta"). Aggiungere un test Vitest con il MM che arriva da destra.

### 4. Importante — Il MM cattura anche un player già bloccato (call del KT)
- **Dove:** `MicromanagerBrain` (`tell` usa solo `vx`), `objects/npc/Micromanager.js` (`catch`); livello 3: KT rosso a col 164 dentro la zona MM 150–165.
- **Problema:** durante la call del KT finto (4 s, vx = 0, input bloccato) il controllo vede un player "non impegnato" e lo cattura: altri 0,5 GU e un incidente, mentre il giocatore non può fare niente. Due punizioni sommate senza contromossa: non è giusto.
- **Fix:** passare `locked: player.inputLocked` al cervello e trattarlo come "impegnato" (niente `dash` né `catch`). Aggiungere un test.

### 5. Importante — La tabella salti "normale" non esiste: la regola dei percorsi obbligatori non è verificata
- **Dove:** `src/core/LevelValidator.js` (`validateLevel(parsed)` non ha opzioni; `maxGap` usa solo la colonna "difficile"); `tests/LevelParser.test.js`.
- **Problema:** ITERATION_2 §4 chiede `validateLevel(parsed, { table: 'normal' | 'hard' })`, e ITERATION_3 §3 dice che i percorsi del livello 3 sono "verificati dal LevelValidator" con la colonna normale. Oggi i test validano livelli 1–3 con la tabella difficile (gap fino a 5 a dislivello 0), quindi un gap da 5 obbligatorio passerebbe senza errori. Manca anche il test "checkpoint `cp0` del livello 2 raggiungibile" (§4).
- **Fix:** implementare `table: 'normal'` (≤ −2 → 5; 0/−1 → 4; +1 → 4; +2 → 3; +3 → 1) e validare con quella tutti i livelli e tutte le combinazioni di pivot. Aggiungere il test `reachable.has('52:14')` per il livello 2.

### 6. Importante — I pivot nuovi aiutano poco o non si possono mai raggiungere
- **Dove:** `level3.js` (`mmA`, `mmB` non sono slot; solo `slotMM` 150–165 pivota), `MM_DEFAULTS.guideSpeed = 160`, `five4`.
- **Problema:**
  - Se nel livello 2 la causa dominante è `micromanager`, nel livello 3 solo la zona 150–165 cambia: le zone A e B restano normali. La lesson ("ti precede e ti indica le trappole") promette più di quello che fa.
  - In modalità guida il MM va a 160 px/s e chi corre va a 260: il MM resta indietro e non "precede".
  - `fiveMinutes` non può essere dominante dopo il livello 2, che non ha porte, e il livello 3 è l'ultimo. Il pivot di `five4` si vede solo con `?pivot=fiveMinutes`.
- **Fix:**
  - Far seguire il pivot a tutti i MM del livello: `mode` da `pivotCause` anche per gli NPC non-slot, oppure rendere slot anche `mmA` e `mmB`.
  - Portare `guideSpeed` ≥ 280 e clampare a `player.x + guideAhead*T`.
  - Registrare in DECISIONS che il pivot `fiveMinutes` è "solo debug" finché non c'è un livello 4, oppure mettere una porta nel livello 2.

### 7. Importante — Le accettazioni "smoke" non sono riproducibili
- **Dove:** ITERATION_2 §1, §2, §5, §6, §8 e ITERATION_3 §1–§3 (criteri smoke); DECISIONS: smoke "fuori dal repo"; Q2 aperta.
- **Problema:** lo stato dichiara "33 + 12 controlli" passati, ma lo script non è nel repo e un revisore non può rieseguirli. Proprio i criteri smoke coprono i rischi trovati sopra (#2, #3), e il #3 è addirittura incoerente con il livello.
- **Fix:** chiedere all'utente di chiudere Q2. In attesa, salvare lo script in `scripts/smoke.mjs` (è fuori dal bundle e non aggiunge dipendenze se usa un `puppeteer-core` installato globalmente), con un comando `npm run smoke` documentato.

### 8. Importante — Test unitari deboli o mancanti
- **Dove:** `tests/MicromanagerBrain.test.js`, `tests/FiveMinutesBrain.test.js`, `tests/outfits.test.js`.
- **Problema:**
  - "never catches a running player": la `x` avanza di 32 px/s mentre `vx` dichiara 260. Verifica solo la soglia `busySpeed`, non uno scenario realistico.
  - Nessun test su `sees()` (direzione dello sguardo, `sightRange`, `sightRows`), sulla pianta dal lato opposto, sul player in aria o bloccato.
  - Il test "a runner covers 3 tiles in ~370 ms" non verifica mai `touching`: controlla solo lo stato dopo 1 s, quindi non prova che il collega sia fuori *prima* dell'arrivo.
  - Mancano `level3.career === 'manager'`, `nextLevel` / `projectNumber` e il flusso `level2 → LL2 → level3 → MvpEnd` (almeno la parte pura).
- **Fix:** aggiungere i test elencati, con posizione coerente con la velocità (`x = x0 + 260*t`) e un `touching` calcolato da una hitbox simulata.

### 9. Minore — Il ritmo dei controlli non è regolare
- **Dove:** `MicromanagerBrain` (`checkTimer` si azzera solo in `reset()` e quando scatta).
- **Problema:** se esci dalla zona e rientri, il timer riparte da dove era rimasto. Un controllo può scattare 500 ms dopo il rientro, contro la promessa "ogni 6 s".
- **Fix:** azzerare `checkTimer` nel passaggio `idle → watch`.

### 10. Minore — La demo parte dal punto della cattura, non da `demoJump.fromCol`
- **Dove:** `MicromanagerBrain` (`demoFrom = this.x`), `Micromanager.update` (animazione).
- **Problema:** se la cattura avviene a destra del burrone (es. col 38), il MM "salta" verso sinistra fino a col 30. Se la demo fallisce, "cade" a metà strada (col ~34) attraverso un pavimento solido. `fromCol` non viene mai usato.
- **Fix:** nello stato `demo`, prima camminare fino a `fromCol` (o teletrasportarsi lì) e poi saltare verso `toCol`.

### 11. Minore — La leaderboard registra anche le partite di debug
- **Dove:** `GameScene.completeLevel`.
- **Problema:** con `?cp=`, `?god=1`, `?gu=`, `?clockSpeed=` o `?level=` i tempi e le morti finiscono nella classifica locale e la falsano.
- **Fix:** non chiamare `leaderboard.record` se un override di debug è attivo; aggiungere un helper `DEBUG.anyOverride`.

### 12. Minore — Doppio avvio della scena con R + Spazio
- **Dove:** `BudgetOverScene` (due `once` su R e Spazio), `MvpEndScene`.
- **Problema:** premendo R e Spazio entro 180 ms si registrano due `camerafadeoutcomplete`, quindi `scene.start` parte due volte. `LessonsLearnedScene` ha già la guardia `gone`.
- **Fix:** applicare la stessa guardia, oppure metterla dentro `fadeTo` (flag sulla scena).

### 13. Minore — Il collega può riagganciare chi resta fermo davanti alla porta
- **Dove:** `FiveMinutesBrain` (`back` → `closed` dopo `rearmMs`, poi `notice` e `stepping` subito se il player è a ≤ 3 tile).
- **Problema:** chi resta fermo dopo il rilascio viene riagganciato ogni ~6,3 s, con 0,5 GU e un incidente ogni volta. È accettabile come crudeltà, ma non è documentato.
- **Fix:** registrare la scelta in DECISIONS, oppure non riarmare finché il player non si è allontanato oltre `noticeDist`.

### 14. Minore — Divergenze non registrate dal piano
- **Dove:** vari file.
- **Problema:**
  - `MvpEndScene` mostra la top 3 invece della top 5 (§8).
  - `SQUASH_MS = 40` invece di 120 ms (§2.3).
  - `BaseTrap.revealHint()` è stato sostituito da testi "!" creati dal MM (§1.3).
  - La riga `mm_catch_3` non ha la condizione `minCauseDeaths`: era irrealizzabile, perché il MM non uccide.
  - La card email è larga 54 invece di 40 (§5).
- **Fix:** una riga per ciascuna in DECISIONS (o nella §Stato del piano), così il piano resta la fonte di verità.

### 15. Minore — Bundle da 1,57 MB (warning di Vite)
- **Dove:** `npm run build`.
- **Problema:** quasi tutto è Phaser. Non è un errore, ma il warning resterà a ogni build e nasconde quelli nuovi.
- **Fix:** `build.rollupOptions.output.manualChunks: { phaser: ['phaser'] }`, oppure alzare `chunkSizeWarningLimit` con un commento.

## Cose verificate e corrette
- Ponte di email (livello 1, S6a): fosso di 6 tile (192 px), non saltabile (salto massimo ≈ 165 px a 260 px/s). 12 email su 6 colonne → riga 15 piena, a filo del pavimento. Validatore e test "senza `ra2` non si finisce" coerenti.
- Porta `five4` (col 140): sta a 4,5 tile dal bordo (col 145). La finestra di stacco per saltare il collega è ~[−4,1; −1,15] tile, con atterraggio entro col 144,5: stretto ma giusto.
- Blocchi dell'input per motivo (`kt`, `mm`, `five`), `cancelCall`/`reset` su morte e respawn, NPC congelati durante standup e morte: corretti.
- Leaderboard: storage che lancia eccezioni gestito, tetto 25 + 25, ranking corretto.

## Riassunto
Test (60) e build passano. Il codice è ordinato e la logica pura è separata e testata. Restano due **bloccanti**:
1. **Le piante non vengono disegnate.** Il nascondiglio contro il micromanager è invisibile, quindi la contromossa non ha indizio.
2. **Il micromanager può uccidere.** Cattura un player in aria (azzera la velocità sopra il burrone 27–29 del livello 3) e cammina sopra il vuoto. Contraddice la decisione "non uccidono".

Tra gli **importanti**:
- Nascondersi funziona solo se il MM è a sinistra; lo smoke test del piano per il livello 2 non può passare.
- Il MM cattura anche durante la call del KT.
- La tabella salti "normale" richiesta da ITERATION_2 §4 non esiste, quindi la regola dei percorsi obbligatori non è verificata.
- Il pivot del micromanager aiuta poco (solo 1 zona su 3, guida più lenta del player). Il pivot `fiveMinutes` non si può raggiungere nella campagna.
- Gli smoke test non sono nel repo e i test dei due cervelli non coprono i casi limite.

Il resto sono minori: ritmo dei controlli, animazione della demo, leaderboard sporcata dal debug, doppio avvio di scena, divergenze da registrare.
Priorità consigliata: #1, #2, #4, #3 (codice e piano), #5, poi un playtest del livello 3.

---

## Esito (2026-10-31)

| # | Esito | Cosa è stato fatto |
|---|---|---|
| 1 | ✅ corretto | Piante disegnate davanti al player (`GameScene.buildObjects`); smoke "plants are drawn" |
| 2 | ✅ corretto | Cattura solo con player a terra sul suo pavimento; il MM non cammina mai sopra i burroni (`gaps` → tratti calpestabili); se un burrone lo blocca rinuncia; dopo la demo riuscita torna dal suo lato. Test Vitest dedicati |
| 3 | ✅ corretto | "Nascosto" = accanto a una pianta (≤ 1 tile, da entrambi i lati) oppure pianta in mezzo; test con MM che arriva da destra; smoke del piano corretto (fermo a col 54 → preso; a col 57 → mai) |
| 4 | ✅ corretto | Player già bloccato (KT, collega) = "impegnato": niente controllo né cattura; idem per il collega dei 5 minuti |
| 5 | ✏️ parziale | Tabella `normal` implementata; livelli 1 e 3 verificati con `normal` per tutte le combinazioni di pivot; livello 2 resta "hard" sul percorso normale dello slot B per decisione (vedi DECISIONS); test `cp0` raggiungibile |
| 6 | ✏️ parziale | `mmA`/`mmB` ora slot (pivotano tutti); `guideSpeed` 300; pivot `fiveMinutes` raggiungibile solo in debug finché non c'è un livello con porte prima del 3 (DECISIONS) |
| 7 | ✏️ parziale | Script in `scripts/smoke/`; serve `puppeteer-core` come dipendenza: decisione dell'utente in sospeso |
| 8 | ✅ corretto | Test realistici (corsa vera a 260 px/s, sguardo, piante da entrambi i lati, aria, bloccato, burroni, contatto del collega, flusso dei livelli) |
| 9 | ✅ corretto | `checkTimer` azzerato al rientro nella zona |
| 10 | ✅ corretto | La demo parte sempre dal bordo `fromCol` |
| 11 | ✅ corretto | `DEBUG.anyOverride`: le partite di debug non entrano in classifica |
| 12 | ✅ corretto | Guardia in `fadeTo` (vale per tutte le scene) |
| 13 | ✅ corretto | Dopo una conversazione il collega aspetta che ti allontani |
| 14 | ✅ corretto | Divergenze registrate in DECISIONS |
| 15 | ✅ corretto | Phaser in un chunk separato (app 87 kB, Phaser 1,48 MB in cache) |

Verifica dopo le correzioni: 70 test Vitest, build, smoke nel browser 33 + 13 controlli, nessun errore in console.

# Code review — Livello extra "Il contadino" (commit `ecf6381`)

Oggetto: `docs/FARM.md` e il codice del commit `ecf6381` (`FarmScene`, `FarmHudScene`, `core/FarmDay.js`, `data/farm.js`, `levels/farm.js`, `sceneUtils.buildTileLayers`, modifiche a `GameScene`, `EndingScene`, `BootScene`, `debug.js`, `main.js`, `TextureFactory.generateFarm`, `tests/Farm.test.js`, `smokeFarm.mjs`, `smokeBurnout.mjs`).

Verifiche eseguite davvero:
- `npm test`: 185/185 verdi.
- `npm run build`: OK.
- `smokeFarm.mjs` e `smokeBurnout.mjs` (con `vite preview` e Chrome locale): tutti PASS, nessun errore in console.
- Una sonda puppeteer a parte (non nel repo) per i punti 1 e 3, più la lettura degli screenshot in `scripts/smoke/shots/farm-*.png`.

Il refactor di `buildTileLayers` è equivalente al vecchio `GameScene.buildTilemap`: stessa mappa dei frame, stesse collisioni, `this.layer` restituito. Nessuna regressione trovata lì.

---

1. **Importante — `src/scenes/FarmHudScene.js:54` (card creata a :26)**
   **Problema:** `this.cardBg.height = …` cambia solo il riempimento del `Rectangle`. Il bordo (`setStrokeStyle`) viene da `pathData`, che Phaser 3.90 ricalcola solo in `setSize()`/`updateData()`. Verificato nel sorgente (`RectangleWebGLRenderer` riempie con `src.width/height` e traccia il bordo con `StrokePathWebGL` su `pathData`) e a schermo. Con "Ti giro una cosa. Niente di urgente. URGENTE." la sonda dà `bgH 70` e `geom.height 58`: il bordo nero taglia a metà la seconda riga, cioè proprio la battuta ("URGENTE."). Vanno a capo almeno 3 messaggi su 8 (Partner, Recruiter, Teams).
   **Fix:** `this.cardBg.setSize(CARD_W, Math.max(58, …))`. Va bene anche `setSize` + `setStrokeStyle` di nuovo. In smoke, aggiungere un controllo sul messaggio 5 (`cardBg.geom.height === cardBg.height`).

2. **Importante (design/ritmo) — `src/config/constants.js:109-110`, `docs/FARM.md` §1 e §4**
   **Problema:** il piano promette un livello di "~1–2 min" con 8 messaggi, ma i conti dicono altro:
   - Dallo spawn (col 2) alla panchina (col 124) ci sono 3904 px. A `maxRunSpeed` 260 px/s servono **≈ 15 s**; raccogliendo tutto, ≈ 25–30 s.
   - Con `phoneFirstMs` 4000 e `phoneIntervalMs` 8000, i messaggi arrivano a 4, 12, 20, 28 s.
   - Chi va dritto ne vede **2**, chi fa le faccende 3–4. I messaggi 5–8 (Partner "URGENTE", "E chi è mo questo?", Recruiter, Teams) quasi nessuno li vede.
   - Lo stagno (col 101) si raggiunge a ≈ 12 s: si butta il telefono dopo una sola notifica, e il "Notifiche ignorate" del finale vale quasi sempre 1–3.

   **Fix (da decidere con l'utente):** una di queste:
   - (a) `phoneFirstMs` 2500, `phoneIntervalMs` 4500: 5–6 messaggi in 25 s, con `notificationMs` 3500 che resta minore dell'intervallo.
   - (b) Messaggi agganciati a colonne fisse (deterministici come ora, e garantiscono che le battute migliori arrivino prima dello stagno).
   - (c) Tagliare la lista a 4–5 messaggi.

   In ogni caso va corretto il "~1–2 min" in `FARM.md` e registrata la scelta in `DECISIONS.md`.

3. **Minore (ma fragile) — `src/scenes/FarmScene.js:37`, `src/scenes/GameScene.js:45`, `src/scenes/UIScene.js:135-136, 264`**
   **Problema:** `UIScene` va a dormire con lo stato transitorio congelato. La sonda sul percorso reale (morte al 100%), all'arrivo in fattoria, trova `narrLeft ≈ 2167 ms` con il testo "Partner: Hai chiesto un periodo di aspettativa…".
   - Al risveglio nel Progetto 1 la riga del narratore oggi viene coperta solo per caso: le righe `levelStart` non hanno `priority`, e `undefined < 3` è falso.
   - Lo stesso vale per `toastLeft` (es. il toast dell'escalation del livello 5).
   - C'è anche una gara a tempo: `hideAll()` nasconde l'HUD dopo 700 ms, mentre `FarmScene` parte dopo 600 + `FADE_MS` (180) = 780 ms. Il margine è di 80 ms. Se un giorno quel ritardo o `FADE_MS` cambiano, la `delayedCall` congelata scatterebbe dopo il risveglio e nasconderebbe l'HUD per tutto il Progetto 1.

   **Fix:**
   - In `UIScene`, `this.events.on('wake', …)` che azzera `narrLeft`, `toastLeft`, `standupLeft`, `ktLeft` e `warning`, nasconde narratore, toast, overlay e bordo, e cancella eventuali `hideAll` in sospeso (tenere il riferimento al `TimerEvent` e fare `remove()`).
   - In `smokeBurnout.mjs`, dopo "the new campaign starts from Project 1", verificare anche sul **percorso reale** quello che oggi `smokeFarm` verifica solo da `?level=farm`, dove `GameScene` non ha mai girato: `UIScene` sveglia, `hud.visible`, `narrText.text` che non contiene "aspettativa".

4. **Minore (leggibilità) — `src/scenes/FarmScene.js:251-254` (`floatText`), :303 ("bzz bzz"), :217 ("blub.")**
   **Problema:** testi fluttuanti chiari e senza contorno su cielo chiaro:
   - `#f8fafc` / `#fef3c7` / `#e0f2fe` su `#7dd3fc` → `#fdba74`. In `farm-phone.png` "bzz bzz" quasi non si vede.
   - "bzz bzz" a `player.y - 26` (≈ 438) finisce sul bordo inferiore dei cartelli (`floor - 40` = 440, sfondo crema) e diventa illeggibile quando passi sotto un cartello.
   - In `farm-pond.png` "blub." si legge a fatica.

   Il segnale del telefono nel mondo è l'unico indizio vicino al personaggio.
   **Fix:** in `floatText` aggiungere `stroke: '#1f2937', strokeThickness: 3` e alzare "bzz bzz" sopra la testa (`body.top - 14`).

5. **Minore — `src/scenes/FarmScene.js:214` (schizzo)**
   **Problema:** le particelle (`gravityY 400`, `lifespan 500`, `DEPTH.fx`) ricadono sotto la superficie e si vedono dentro la terra (`farm-pond.png`: puntini azzurri sotto lo stagno).
   **Fix:** profondità `DEPTH.tiles - 1`: la terra copre la parte sotto la superficie, mentre colline e cielo stanno sotto. In alternativa, `lifespan` ≈ 300 e `gravityY` più basso.

6. **Minore — `src/scenes/FarmScene.js:247` / `FarmHudScene`**
   **Problema:** `fadeTo` sfuma solo la camera di `FarmScene`. Per `FADE_MS` l'HUD (contatori, "Fine giornata.", card dell'ultimo messaggio) resta nitido sul nero e poi sparisce di colpo. Lo stesso succede all'ingresso (l'HUD appare prima del fade-in, meno grave).
   **Fix:** in `sitDown`, al termine del tramonto, `this.scene.get('FarmHudScene').cameras.main.fadeOut(FADE_MS)` insieme al `fadeTo`, oppure dissolvere il container dell'HUD con un tween.

7. **Minore — `src/scenes/FarmScene.js:264` / `src/input/TouchControls.js`**
   **Problema:** il pulsante touch ↺ resta visibile e non fa niente (il tasto viene consumato e ignorato). Su mobile è un controllo morto, e il piano dice "R non fa niente" ma non parla del pulsante.
   **Fix:** un `touch.setRestartVisible(false)` (o una classe CSS) finché si è in fattoria. In alternativa, registrare in `FARM.md`/`MOBILE.md` che resta visibile di proposito.

8. **Minore — `src/scenes/FarmScene.js:229`**
   **Problema:** `p.body.reset(this.bench.x, p.y)` teletrasporta il giocatore fino a ~33 px (metà panchina più metà corpo) nel frame in cui tocca il bordo della panchina: è uno scatto visibile. Se si arriva saltando, il giocatore viene spostato a mezz'aria e ricade.
   **Fix:** un tween breve (150 ms) di `x` verso `bench.x` con il corpo fermo, oppure un `overlap` solo con una zona stretta al centro della panchina.

9. **Minore (design, facoltativo) — `src/scenes/FarmScene.js:146-158`, `FARM.md` §3**
   **Problema:** lo stagno è disegnato sopra un terreno pieno, quindi il contadino ci cammina sopra (`farm-pond.png`: il personaggio è in piedi sull'acqua). È coerente con "solo grafica", ma stona proprio nel punto della battuta finale del telefono.
   **Fix:** una passerella di assi sopra lo stagno, oppure disegnare l'acqua 1–2 px sotto i piedi con un bordo d'erba davanti. In ogni caso senza burroni.

10. **Minore (documentazione) — `docs/FARM.md` §3 e §4**
    - Lo schema ASCII del §3 non corrisponde alla mappa reale:
      - nella riga 13 compaiono `e……e#` che nel codice non esistono;
      - mancano la balla 90–91, la `G` a col 124 e la riga 16;
      - le etichette di riga sono sfasate.

      Fix: rigenerarlo da `farm.map` (righe 13–15) oppure toglierlo e lasciare l'elenco delle coordinate, che invece è corretto.
    - Il §4 non elenca `sunsetColor` né `SKY`, esportati e usati dalla scena.
    - Il §1 dice "~1–2 min" (vedi punto 2).

11. **Minore (test) — `scripts/smoke/smokeFarm.mjs`, `tests/Farm.test.js`**
    **Problema:** alcuni comportamenti del piano non hanno un controllo automatico:
    - la posa "telefono" sulla panchina (`player.locks.has('bench')` solo con il telefono in tasca);
    - Shift come tasto alternativo per buttare il telefono;
    - il tasto touch "E" (`touch.take('delegate')`);
    - l'altezza della card (punto 1);
    - lo stato di `UIScene` dopo il percorso reale (punto 3).

    **Fix:** aggiungere i controlli in smoke. `page.keyboard.press('ShiftLeft')` nella zona dello stagno nel secondo blocco, e lettura di `player.locks` dopo `sitDown`.

12. **Minore (debug) — `src/scenes/BootScene.js:19-22`**
    Il `from` finto (`gu: 15, guMax: 15`, 0 morti) fa leggere al finale "GU residue: 15,0 / 15" accanto a "Burnout: 100%". È innocuo perché succede solo in debug.
    **Fix:** facoltativo, `gu: 0` o un valore plausibile, così gli screenshot di smoke non mostrano numeri incoerenti.

---

## Riassunto

Il livello rispetta le scelte dell'utente:
- scena separata, quindi GU, standup, burnout e morte restano fuori per costruzione;
- terreno continuo, pile ≤ 2 tile (salto ≈ 107 px ≈ 3,3 tile, conti giusti);
- telefono deterministico;
- stagno e panchina funzionanti;
- finale con i testi veri.

Test, build e i due smoke della fattoria passano davvero, e l'estrazione di `buildTileLayers` non introduce regressioni.

Non ci sono problemi bloccanti. I due punti importanti:
- **(1)** la card della notifica con due righe ha il bordo che taglia la battuta (bug verificato a schermo);
- **(2)** il ritmo del telefono non regge la durata reale del livello (≈ 15–30 s, non 1–2 min): si vedono 2–4 messaggi su 8, e lo stagno arriva quasi sempre dopo il primo.

Il punto 3 oggi non si vede, ma è fragile: `UIScene` dorme con timer e testi congelati e si salva solo per un margine di 80 ms e per una priorità `undefined`. Va reso esplicito con un reset al `wake`, coperto dallo smoke sul percorso reale.

Il resto è rifinitura: leggibilità dei testi fluttuanti, schizzo sotto terra, HUD che non sfuma, ↺ inerte su mobile, scatto sulla panchina, schema ASCII del piano da rigenerare.

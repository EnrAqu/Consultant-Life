# Iterazione 2 — dal playtest #1

> Fonte: `docs/PLAYTEST.md` (playtest #1) + risposte dell'utente del 2026-10-31.
> Si applica sopra `IMPLEMENTATION_PLAN.md` (v1.1). In caso di conflitto prevale questo documento, poi `DECISIONS.md` resta la fonte di verità.
> Regole invariate: trappole deterministiche senza tween né timer di Phaser per la logica, logica pura in `src/core/` con test, nessuna dipendenza nuova senza chiedere.

## 0. Cosa cambia

| # | Richiesta utente | Sezione | File principali |
|---|---|---|---|
| A | Nitidezza più alta | §1 | `main.js`, `constants.js`, `TextureFactory.js`, `GameScene.js`, tutte le scene |
| B | Movimenti più fluidi | §2 | `Player.js`, nuovo `PlayerView.js`, `GameScene.js`, trappole (solo resa) |
| C | Personaggio che cambia con la carriera (+ salopette) | §3 | nuovo `data/outfits.js`, `TextureFactory.js`, livelli, `UIScene.js` |
| D | Livello 2 troppo duro (spine con il pilastro) | §4 | `level2.js`, `LevelValidator.js`, test |
| E | Email che non fanno paura: si deve leggere URGENTE ecc. | §5 | `ReplyAllAvalanche.js`, `TextureFactory.js` |
| F | Variante: aspetti che cadano le email e le usi per passare un fosso | §6 | `ReplyAllAvalanche.js`, `level1.js`, `LevelValidator.js` |
| G | Nuove battute, sul cliente e simili | §7 | `data/narratorLines.js` |
| H | Leaderboard, anche temporanea | §8 | nuovo `core/Leaderboard.js`, `MvpEndScene.js`, `LessonsLearnedScene.js` |

Fisica di movimento (§3.2 del piano): **non si tocca** (playtest: piace).

---

## 1. Nitidezza (A)

**Problema:** canvas 960×540 con sprite minuscoli (player 24×32) ingranditi da `Scale.FIT` con fattori non interi + `pixelArt: true` → pixel irregolari, testo sgranato.

**Soluzione: rendering HD a coordinate di mondo invariate.**
- `GAME_WIDTH × GAME_HEIGHT` del canvas → **1920 × 1080**. Le coordinate di gioco restano quelle attuali (960×540 logici, tile 32): nuova costante `VIEW_W = 960`, `VIEW_H = 540`, `RENDER_SCALE = 2`.
- Ogni scena: `this.cameras.main.setZoom(RENDER_SCALE)`; in GameScene la camera segue il player come oggi (zoom 2 sul mondo). Le scene di UI/schermate usano `camera.setZoom(2)` e `camera.setOrigin(0, 0)` così il loro layout a 960×540 resta identico.
- Config: `pixelArt: false`, `antialias: true`, `roundPixels: false`.
- **Texture HD:** `TextureFactory` disegna tutto a `RENDER_SCALE` (ogni coordinata ×2; helper `make(scene, key, w, h, draw)` passa a `draw(g, s)` il fattore `s = 2`). Tutti gli sprite di gioco si creano con `setScale(1 / RENDER_SCALE)` → dimensioni nel mondo invariate, quindi **fisica e hitbox invariate**.
- **Tile:** la tilemap resta a 32 px per le collisioni ma diventa invisibile (`layer.setVisible(false)`). La resa grafica dei tile usa un `Blitter` con texture `tilesHD` (frame da 64×64), `blitter.setScale(0.5)` e bob in posizione `(x·64, y·64)`; i tile one-way usano il frame scrivania. Per le varianti pivotate con override `tiles` il blitter si costruisce dalla mappa già risolta.
- **Testo:** font **Inter** non disponibile offline → si usa `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif` per l'HUD e per le slide; monospace solo per il debug. `resolution: 2` resta (con lo zoom 2 diventa nitido).
- Sfondo: gradiente verticale semplice (blu notte → grigio ufficio) disegnato una volta come immagine `bgOffice` 1920×1080 fissa (`setScrollFactor(0)`), più una fila di "finestre dell'ufficio" in parallasse lenta (`setScrollFactor(0.3)`, texture `bgWindows`).

**Accettazione (agente):** `npm run build` ok; smoke test: `game.canvas.width === 1920`; `textures.get('player_junior').source[0].width` = 2× la larghezza logica; il test `jump clears a 2-tile gap` e tutti gli altri smoke test passano invariati (prova che fisica e mondo non sono cambiati).
**Playtest utente:** la grafica è nitida a schermo intero.

---

## 2. Movimenti fluidi (B)

### 2.1 Passo fisico e camera
- `physics.arcade.fps = 120` (oggi 60): su schermi a 120 Hz elimina lo scatto; a 60 Hz fa 2 passi per frame. La fisica di salto resta la stessa (verifica: smoke test del gap da 2 + validatore invariato).
- Camera: `startFollow(player, false, 0.12, 0.12)` (roundPixels **false**), deadzone invariata.
- Transizioni tra scene: `cameras.main.fadeOut(180)` → `start` → `fadeIn(180)` nella scena nuova (ammesso: non è logica di trappola).

### 2.2 Separare fisica e resa del player
- `Player` (sprite fisico) diventa **invisibile** (`setVisible(false)`: il corpo resta attivo).
- Nuovo `objects/PlayerView.js`: immagine che ogni frame (evento `postupdate` della scena) copia posizione del corpo e applica **solo effetti visivi**: animazione, squash & stretch, flip, tint, alpha. Così scalare il disegno non cambia mai la hitbox.
- Tutti gli effetti sono calcolati in `PlayerView.update(dt, state)` chiamato da GameScene (niente tween) → durante standup e morte restano congelati come il resto.

### 2.3 Animazioni del personaggio (per ogni outfit, §3)
Frame generati proceduralmente in un'unica texture per outfit (`player_<outfit>`, frame aggiunti con `texture.add(name, 0, x, y, w, h)`):

| Animazione | Frame | Durata frame | Quando |
|---|---|---|---|
| `idle` | 2 (respiro: busto ±1 px logico) | 400 ms | a terra, `|vx| < 10` |
| `run` | 4 (gambe/braccia alternate) | 70 ms a velocità max, scala con `|vx|` | a terra, `|vx| ≥ 10` |
| `jump` | 1 | — | `vy < 0` |
| `fall` | 1 | — | `vy > 0` in aria |
| `freeze` | 1 (posa "in call/standup": mano all'orecchio) | — | input bloccato |

Squash & stretch (valori di scala del solo disegno, ritorno a 1 con interpolazione esponenziale in 120 ms):
- stacco del salto: `scaleX 0.85, scaleY 1.18`;
- atterraggio con `vy_prima > 300`: `scaleX 1.2, scaleY 0.82`;
- inversione di direzione a terra: leggera inclinazione `angle ±4°` per 80 ms.

### 2.4 Effetti
- Particelle `dust` (texture HD 8×8 grigio chiaro): 6 particelle all'atterraggio, 4 allo stacco, 1 ogni 120 ms in corsa. Emitter Phaser (ammessi: solo estetici).
- Morte: 10 fogli di carta (`paper`, 10×12) che volano + flash rosso del disegno 2 frame; il player riappare con alpha 0→1 in 150 ms (calcolato in `PlayerView.update`).
- Trappole (solo resa, nella `update` della trappola):
  - email in caduta: oscillazione `angle = 8·sin(t/90ms)`; all'atterraggio piccolo rimbalzo visivo (scaleY 0.8 → 1 in 100 ms);
  - slide in caduta: `angle` che va da ±10° a 0 all'atterraggio; `camera.shake(60, 0.003)` alla prima slide che tocca terra;
  - scope creep: la testa ha un leggero "rimbalzo" di scala x (1.08 → 1) a ogni tile superato.

**Accettazione (agente):** smoke test invariati; con `?debug=1` il testo debug mostra `anim: run|idle|jump|fall|freeze` coerente in 4 situazioni scriptate (fermo, corsa, salto, caduta).
**Playtest utente:** "fluido" a 60 e (se disponibile) 120 Hz.

---

## 3. Outfit di carriera (C)

Nuovo `src/data/outfits.js` (dati puri) e un campo `career` in ogni livello.

| Id | Titolo HUD | Aspetto (disegno procedurale) | Usato in |
|---|---|---|---|
| `junior` | Junior Analyst | felpa grigia col cappuccio, cuffie al collo, jeans, sneakers bianche, zaino, capelli spettinati | livello 1 |
| `consultant` | Consultant | camicia azzurra con maniche arrotolate, chino beige, badge al collo | livello 2 |
| `manager` | Manager | giacca blu senza cravatta, camicia bianca, scarpe marroni | futuro |
| `seniorManager` | Senior Manager | completo grigio scuro, cravatta rossa, fazzoletto nel taschino | futuro |
| `partner` | Partner | "fa ciò che vuole": polo rosa, pullover sulle spalle, bermuda beige, mocassini senza calze, occhiali da sole | futuro |
| `farmer` | Contadino | salopette di jeans, camicia a quadri, cappello di paglia | finale "I campi" (futuro) |

- Tutti e 6 gli outfit vengono generati (costo trascurabile, procedurale); debug `?outfit=<id>` forza l'outfit per vederli.
- L'HUD mostra il titolo sopra il nome del progetto: `Junior Analyst — Progetto 1`.
- Per ora l'outfit è **solo estetico** (vedi domanda aperta Q3).

**Accettazione (agente):** test Vitest su `outfits.js` (ogni outfit ha titolo e palette completa; `level1.career === 'junior'`, `level2.career === 'consultant'`); smoke test: con `?outfit=partner` la texture attiva del PlayerView è `player_partner`.
**Playtest utente:** gli outfit sono riconoscibili e fanno ridere.

---

## 4. Livello 2 più giusto (D)

Diagnosi: i percorsi normali del livello 2 usano la colonna "difficile" (gap 5 + dislivello), senza checkpoint e con 15 GU. È uno scalino, non una curva. L'utente si blocca alla **fossa di spine con il pilastro** (slot D).

Modifiche:
- **Regola:** i percorsi normali di **tutti** i livelli rispettano la colonna **"normale"** della tabella §14.3. La colonna "difficile" è ammessa solo per salti opzionali (premi, scorciatoie).
- **Slot B (scope creep):** burrone cols 36–45 (10), pilastro **largo 2** cols 40–41 → gap 4 + 4 a dislivello 0. Atterraggio da col 46. Normal: `pitRect: {dx: 6, dy: 1, w: 10, h: 2}`. Pivoted: `maxLength: 16` (da col 30 a col 45).
- **Slot D (KT / spine):** fossa di spine cols 85–94 (10), pilastro **largo 2** cols 89–90 alto 1 (riga 14 solida) → gap 4 (salita +1) e 4 (discesa −1). Atterraggio da col 95. Piattaforme del KT vero invariate (cols 86–87, 89–90, 92–93 a riga 13).
- **Checkpoint** nel livello 2 a col 52, riga 14 (dopo lo slot B).
- Traguardo invariato (col 106).

Mappa slot D (righe 12–16, cols 82–96):
```
     82  85        90    95
r12  ...............
r13  ...............        (piattaforme del KT vero qui, solo pivoted)
r14  ...^^^^##^^^^..        ^ = spine, ## = pilastro (89–90)
r15  ###############
r16  ###############
```

`LevelValidator`: nuova opzione `validateLevel(parsed, { table: 'normal' | 'hard' })` (default `hard` = comportamento attuale). Tabella "normale": dislivello ≤ −2 → 5; 0/−1 → 4; +1 → 4; +2 → 3; +3 → 1; ≥ +4 → impossibile.

**Accettazione (agente):** test: livello 1 e livello 2 (5 combinazioni di pivot) completabili con `table: 'normal'`; il checkpoint `cp0` del livello 2 è raggiungibile; la sporgenza dello slot A resta raggiungibile **solo** con pivot `replyAll`.
**Playtest utente:** il livello 2 si finisce (con fatica).

---

## 5. Email che fanno paura (E)

- Nuove texture **card email** 40×24 logici (80×48 HD), cinque varianti con testo "cotto" nella texture (Text disegnato in una `RenderTexture` e salvato con `saveTexture`):
  1. barra rossa `URGENTE` + `!`
  2. `RE: RE: RE: FW:`
  3. `Rispondi a tutti`
  4. `ASAP!!!` (barra arancione)
  5. `Per conoscenza` (grigia, la più "innocua", per ironia)
- Assegnazione deterministica: email `i` usa la variante `i % 5`.
- Hitbox letale in caduta: **36×20** (oggi 20×12). Il trigger resta a 5 tile (già tarato per chi corre); con la hitbox più grande la finestra letale cresce → più pericolosa.
- **Indizi più minacciosi:**
  - icona inbox più grande (40×32 logici) con contatore che fa un "pop" (scala 1.3 → 1 in 120 ms) a ogni email; dopo la 5ª il numero diventa rosso;
  - l'ombra a terra cresce mentre l'email scende (scala 0.4 → 1 in base a quanto manca all'impatto);
  - all'impatto: micro shake (`camera.shake(40, 0.002)`, al massimo uno ogni 100 ms) e l'email resta a terra 600 ms come detrito (non letale, non solida), poi sfuma.

**Accettazione (agente):** smoke test "running through reply-all corridor dies by replyAll" passa; in debug il log `t_impatto` è invariato; 5 texture `email_*` esistono.
**Playtest utente:** "fanno paura" e si legge URGENTE.

---

## 6. Variante "aspetta l'escalation e usala come ponte" (F)

Nuovo parametro di `ReplyAllAvalanche`: `landing: 'vanish' | 'solid'` (default `'vanish'` = comportamento normale attuale).

Con `landing: 'solid'` (modalità **normal**):
- le email cadono **letali** come sempre;
- a terra si fermano e **diventano solide** (impilate a mezzo tile come nel pivot) e **restano** fino al respawn (niente `stayMs`);
- usate in un **fosso**: riempiono il fosso e formano un ponte a filo del pavimento. Il fosso è largo **6** (non saltabile nemmeno in "difficile"), quindi bisogna aspettare.
- **Indizio:** cartello prima del fosso `In attesa di riscontro dal cliente...` e icona inbox con etichetta `ESCALATION`.

Livello 1, sezione S6a (sostituisce `ra2`):
- fosso cols 132–137 (6), pavimento fino a col 131 e da col 138; spine 140–142 invariate;
- entità `ra2`: `{ type: 'replyAll', x: 132, y: 14, params: { triggerDx: -6, triggerWidth: 2, startDelayMs: 0, count: 12, intervalMs: 150, columns: [0,1,2,3,4,5], spawnHeight: 7, fallSpeed: 9, restRow: 15, landing: 'solid' } }` → 2 email per colonna = 1 tile pieno alla riga 15 (ponte a filo).
- Hitbox solida delle email a terra: 32×16 (come il pivot). Al passaggio `falling → landed` il corpo cambia dimensione (`body.setSize`) e viene riallineato con `body.reset`.

Curva del livello 1: **introduci** (S2, email letali) → **ripeti e tradisci** (S6a, le stesse email sono la tua unica via). Il pivot del livello 2 resta la scala non letale.

`LevelValidator.trapSurfaces`: le email con `landing: 'solid'` producono superfici anche in modalità normal (stessa formula del pivot).

**Accettazione (agente):** validatore: livello 1 completabile **solo** grazie al ponte (test: rimuovendo `ra2` il traguardo non è raggiungibile); smoke test: dopo aver attivato il trigger e aspettato 3 s, camminando si attraversa il fosso senza morire; correndo subito si muore (`replyAll` o `pit`).
**Playtest utente:** si capisce che bisogna aspettare.

---

## 7. Nuove battute (G)

Da aggiungere a `narratorLines.js` (≥ 20, tema cliente e simili). Proposte:

| Evento / condizione | Testo |
|---|---|
| death | Il cliente ha visto tutto. Ha chiesto se fa parte della demo. |
| death | Lo mettiamo nel report come "learning". |
| death | Il cliente ringrazia per l'impegno. Ha detto proprio "impegno", tra virgolette. |
| death pit | Il cliente aveva chiesto di andare oltre. Non così oltre. |
| death spike | Il cliente aveva anticipato la deadline. Te l'avevo girata, era nello spam. |
| death replyAll | Il cliente ha risposto a tutti. Anche a te. Soprattutto a te. |
| death replyAll | Trentadue persone in copia hanno visto la scena. |
| death scopeCreep | Il cliente: "È una modifica da cinque minuti". Cinque minuti fa eri vivo. |
| death scopeCreep | Non è scope creep, è "evoluzione naturale del perimetro". |
| death deckCollapse | Il cliente vuole le slide "più asciutte". Intanto ti sono cadute addosso bagnate. |
| death selfRestart | Il cliente non ha notato la differenza. Questo dovrebbe preoccuparti. |
| minSpot 3 | Il cliente ha chiesto di intitolare questo punto a te. |
| levelStart | Il cliente è contentissimo di averti nel team. Non ti ha ancora visto lavorare. |
| levelStartPivot | Il cliente ha letto le lessons learned. Ha cambiato tutto il resto. |
| standupStart | Il cliente si collega "solo per ascoltare". Ha già alzato la mano. |
| standupOverrun | Il cliente: "Un'ultima cosa veloce". Era la prima di dodici. |
| budgetLow | Il cliente chiede perché le GU stanno finendo. Ottima domanda, da girare a te. |
| checkpoint | Il cliente ha approvato il caffè. Con riserva. |
| idle | Il cliente chiede se sei ancora sul progetto. Io ho detto "credo". |
| ktFake | Il KT l'ha fatto l'ex fornitore. Ora capisco perché è ex. |
| levelComplete | Consegnato. Il cliente ha già chiesto la v2, "nello stesso budget". |
| emailBridge (nuovo evento, prima volta che il ponte di email si completa) | Vedi? Basta aspettare che l'escalation si sedimenti. |

**Accettazione (agente):** test esistenti del narratore passano; `NARRATOR_LINES.length ≥ 55`; id univoci; nuovo evento `emailBridge` coperto.

---

## 8. Leaderboard (H)

**Fase 1 (ora): leaderboard locale "temporanea"**, senza backend né nomi.
- Nuovo `src/core/Leaderboard.js` (puro, storage iniettato), chiave `ragebait.leaderboard.v1`:
  ```js
  { version: 1, entries: [ { levelId, timeMs, deaths, guLeft, at /* ISO date */ } ] }
  ```
  - `record(entry)` → `{ timeRank, shameRank }` (1-based, `null` se fuori dalla top 5);
  - `topTime(levelId, n = 5)` (tempo crescente, a parità meno morti);
  - `topShame(levelId, n = 5)` (**Hall of Shame**: morti decrescenti — è un rage game);
  - massimo 50 voci per livello (si tengono le migliori 25 per tempo + 25 per morti).
- Si registra a ogni livello completato. Mostrata:
  - nella slide Lessons Learned: un bullet `Record personale: #N per tempo` se `timeRank`;
  - in `MvpEndScene`: due colonne "I tuoi tempi migliori" e "Hall of Shame" (top 5 per livello 2 e livello 1).
- `?resetStats=1` azzera anche la leaderboard.

**Fase 2 (dopo, da decidere): classifica globale** su free tier (es. Cloudflare Worker + D1). Richiede: un account dell'utente, un filtro sui nomi, un minimo di anti-cheat (i punteggi lato client si falsificano facilmente). Solo descritta qui, **non** da implementare.

**Accettazione (agente):** test Vitest di `Leaderboard` (ordinamenti, parità, tetto 50, storage che lancia eccezioni); smoke test: completando il livello 1 due volte con tempi diversi, la seconda slide mostra il rank corretto.

---

## 9. Milestone

| Id | Contenuto | Verifica automatica |
|---|---|---|
| I2-M1 | Livello 2 ribilanciato + checkpoint + validatore `table: 'normal'` (§4) | Vitest |
| I2-M2 | Email: texture card, indizi, `landing: 'solid'`, S6a del livello 1 (§5, §6) | Vitest + smoke |
| I2-M3 | Nuove battute + evento `emailBridge` (§7) | Vitest |
| I2-M4 | Leaderboard locale (§8) | Vitest + smoke |
| I2-M5 | Rendering HD (§1) | build + smoke |
| I2-M6 | PlayerView, animazioni, outfit (§2.2–2.3, §3) | Vitest + smoke |
| I2-M7 | Effetti e fluidità: fps 120, camera, particelle, transizioni (§2.1, §2.4) | smoke |
| I2-M8 | Review del codice (playbook `review`) e playtest utente | — |

Ordine scelto: prima gameplay e contenuti (piccoli, testabili), poi la parte grafica che tocca tutte le scene.

## 10. Domande aperte per l'utente

- **Q1 — Stile grafico:** propongo uno stile **"flat HD"** (forme pulite, antialiasing) invece della pixel art: è quello che dà più nitidezza e fluidità con la grafica generata da codice. Va bene, o preferisci pixel art nitida?
- **Q2 — Smoke test nel repo:** il test nel browser richiede `puppeteer-core` come dipendenza di sviluppo. Lo aggiungo?
- **Q3 — Outfit:** solo estetici per ora. In futuro vuoi che cambino anche il gameplay (es. junior salta di più ma ha meno GU)?
- **Q4 — Leaderboard globale:** quando ci arriveremo, ti va bene usare un tuo account Cloudflare (gratuito)?

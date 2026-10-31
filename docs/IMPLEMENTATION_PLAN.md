# RageBait — Piano di implementazione MVP

> Documento operativo per l'agente che implementa. Fonte di design: `../PLAN.md`.
> Lingua: testo in italiano, identificatori di codice in inglese.
> Nome del gioco: **placeholder "RageBait"** ovunque nel codice (titolo finale da decidere).
> **v1.1 — La §14 "Revisione applicata" prevale su tutte le sezioni precedenti.** Prima di implementare una sezione, controlla se la §14 la modifica.
> In caso di dubbio: segui questo documento alla lettera; se qualcosa è impossibile, scegli la soluzione più semplice e annotala in `docs/DECISIONS.md` (unico file di documentazione aggiuntivo ammesso).

---

## 0. Obiettivo dell'MVP

Un link giocabile nel browser con:

1. **Livello 1** completo (~60–90 s se giocato perfettamente) con 4 trappole a tema consulenza.
2. **Slide "Lessons Learned"** con la causa di morte dominante.
3. **Livello 2** breve con 4 "slot" di trappole; la trappola dominante del livello 1 appare in forma **pivotata** (ciò che uccideva ora aiuta).
4. Budget **Giornate Uomo (GU)**, **daily standup** che congela il mondo, **narratore** passivo-aggressivo, **statistiche** in `localStorage`.
5. Zero asset esterni: tutta la grafica è generata a runtime (Phaser Graphics → `generateTexture`).
6. Si gioca entro 10 secondi dall'apertura: nessun menu, solo un overlay titolo non bloccante.

Fuori scope (vedi §13): audio, menu, escalation, NPC, AI, roll-off, mobile, Tiled.

---

## 1. Stack e versioni (pin esatti)

| Pacchetto | Versione | Tipo |
|---|---|---|
| `phaser` | `3.90.0` | dependency |
| `vite` | `6.3.5` | devDependency |
| `vitest` | `3.2.4` | devDependency |

- Node.js **20 LTS** (o superiore). JavaScript puro, ES modules (`"type": "module"`), **niente TypeScript, niente framework UI**.
- Versioni scritte **senza** `^`/`~` in `package.json`. Se una versione non fosse installabile, usa la patch più vicina della stessa minor e annotalo in `docs/DECISIONS.md`.
- Fisica: **Arcade Physics** di Phaser.
- Import di Phaser: `import Phaser from 'phaser';`

### `package.json` (script obbligatori)

```json
{
  "name": "ragebait",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run"
  }
}
```

### `vite.config.js`

- `base: './'` (path relativi → funziona su GitHub Pages sotto `/<repo>/` senza configurazione).
- `build.outDir: 'dist'`, `build.assetsInlineLimit` lasciare default.
- `test.environment: 'node'` (i test riguardano solo moduli logici puri, §10).

---

## 2. Struttura cartelle

```
RageBait game/
├── PLAN.md                       # design (esistente, non modificare)
├── docs/
│   ├── IMPLEMENTATION_PLAN.md    # questo file
│   └── DECISIONS.md              # (opzionale) deviazioni dal piano
├── .github/workflows/deploy.yml  # deploy GitHub Pages
├── .gitignore                    # node_modules, dist, .DS_Store
├── index.html
├── package.json
├── vite.config.js
├── tests/                        # unit test Vitest (solo logica pura)
│   ├── Budget.test.js
│   ├── StatsTracker.test.js
│   ├── Narrator.test.js
│   ├── LevelParser.test.js
│   ├── pivot.test.js
│   └── StandupSchedule.test.js
└── src/
    ├── main.js                   # config Phaser + avvio
    ├── config/
    │   ├── constants.js          # dimensioni, fisica, GU, standup, colori, depth
    │   └── debug.js              # parsing query string (?debug, ?level, ?pivot, ?standup)
    ├── core/                     # LOGICA PURA: nessun import di Phaser (testabile)
    │   ├── Storage.js            # wrapper localStorage con try/catch
    │   ├── StatsTracker.js       # statistiche run + persistenti, causa dominante
    │   ├── Budget.js             # contabilità GU
    │   ├── StandupSchedule.js    # orologio di gioco e calendario standup
    │   ├── Narrator.js           # selezione frasi + template
    │   ├── LevelParser.js        # ASCII map → struttura dati
    │   ├── pivot.js              # risoluzione modalità slot (normal/pivoted)
    │   └── format.js             # formattazione numeri italiani (12,5), orari (09:30)
    ├── data/
    │   ├── causes.js             # metadati cause di morte
    │   └── narratorLines.js      # frasi del narratore
    ├── levels/
    │   ├── index.js              # registry { level1, level2 }
    │   ├── level1.js
    │   └── level2.js
    ├── gfx/
    │   └── TextureFactory.js     # genera tutte le texture placeholder
    ├── events/
    │   └── EventBus.js           # singleton Phaser.Events.EventEmitter + nomi eventi
    ├── objects/
    │   ├── Player.js
    │   ├── Pickup.js             # caffè (pickup "vero")
    │   ├── Checkpoint.js
    │   ├── Goal.js
    │   └── traps/
    │       ├── BaseTrap.js
    │       ├── ReplyAllAvalanche.js
    │       ├── ScopeCreepPlatform.js
    │       ├── CollapsingDeck.js
    │       ├── FakeKT.js
    │       └── index.js          # registry: type string → classe
    └── scenes/
        ├── BootScene.js
        ├── GameScene.js
        ├── UIScene.js
        ├── LessonsLearnedScene.js
        ├── BudgetOverScene.js
        └── MvpEndScene.js
```

**Regola d'oro:** tutto ciò che sta in `src/core/` è JavaScript puro senza Phaser né DOM (eccetto `Storage.js`, che riceve lo storage per dependency injection, §5.1). Così è testabile con Vitest in ambiente Node.

---

## 3. Configurazione di gioco

### 3.1 Canvas e mondo

| Costante | Valore |
|---|---|
| `GAME_WIDTH` × `GAME_HEIGHT` | 960 × 540 |
| `TILE` | 32 px |
| Righe livello | 17 (altezza mondo 544 px; la camera segue in verticale, differenza trascurabile) |
| `pixelArt` | `true` |
| `scale.mode` | `Phaser.Scale.FIT`, `autoCenter: CENTER_BOTH` |
| `backgroundColor` | `#1b1f2a` (ufficio di notte) |
| `physics.arcade.gravity.y` | 1800 |
| `physics.arcade.debug` | `true` solo con `?debug=1` |
| FPS fisica | default (60, fixed step) |

### 3.2 Costanti fisiche del player (valori iniziali, in `constants.js` → `PLAYER`)

| Nome | Valore | Note |
|---|---|---|
| `maxRunSpeed` | 260 px/s | |
| `groundAccel` | 2400 px/s² | applicata manualmente su `velocity.x` |
| `groundDecel` | 3000 px/s² | quando nessun input orizzontale |
| `airAccel` | 1700 px/s² | |
| `airDecel` | 900 px/s² | |
| `turnMultiplier` | 1.6 | accel × 1.6 se l'input è opposto alla velocità (inversioni scattanti) |
| `jumpVelocity` | 620 px/s | `velocity.y = -620` |
| `jumpCutMultiplier` | 0.45 | al rilascio del tasto mentre `vy < 0`: `vy *= 0.45`, **una sola volta per salto** |
| `fallGravityExtra` | 700 px/s² | `body.setGravityY(700)` quando `vy > 0`, altrimenti 0 (caduta più netta) |
| `maxFallSpeed` | 900 px/s | `body.setMaxVelocityY(900)` (o clamp manuale) |
| `coyoteTimeMs` | 90 | salto ancora permesso fino a 90 ms dopo aver lasciato il bordo |
| `jumpBufferMs` | 110 | pressione di salto ricordata 110 ms prima di toccare terra |
| Sprite / hitbox | 24×32 / 18×28 | hitbox centrata in x, allineata ai piedi |

**Raggiungibilità (vincoli di level design derivati):**
- Altezza max salto ≈ 620² / (2·1800) ≈ 107 px ≈ **3,3 tile** → dislivelli superabili: **max 3 tile**.
- Distanza orizzontale salto pieno a velocità max ≈ 5 tile → gap superabili: **max 4 tile** (3 per i salti "normali", 4 solo per salti dichiaratamente difficili).
- Soffitti in corridoi: almeno **3 tile** di luce libera sopra il pavimento.

### 3.3 Input

| Azione | Tasti |
|---|---|
| Sinistra / Destra | ← → , A D |
| Salto | Spazio, ↑, W, Z |
| Restart volontario | R (costa come una morte, causa `selfRestart`) |
| Avanti nelle schermate | Spazio / Invio |

Il player legge l'input **ogni frame in `update`**; il salto è edge-triggered (`JustDown`) e alimenta il jump buffer.

### 3.4 Morte e restart (< 1 s)

- `DEATH_FREEZE_MS = 250`: alla morte il player diventa rosso (tint `0xff4444`), input disabilitato, `camera.shake(120, 0.006)`, testo flottante `-0,5 GU` sul punto di morte.
- Dopo 250 ms: **respawn senza riavviare la scena** (`GameScene.respawn()`): player all'ultimo checkpoint con velocità 0, tutte le trappole `reset()`, jump buffer/coyote azzerati, camera centrata con `camera.centerOn` istantaneo.
- Tempo totale morte → controllo di nuovo in mano: **≤ 400 ms**. Vietato `scene.restart()` per la morte.
- Cause di morte: caduta (`player.y > worldHeight + 64` → `pit`), spine (`spike`), zone letali delle trappole (causa della trappola), `R` (`selfRestart`).

### 3.5 Budget GU (in `constants.js` → `BUDGET`)

| Costante | Valore |
|---|---|
| `level1.startGu` | 20 |
| `level2.startGu` | 15 |
| `deathCost` | 0.5 |
| `fakeKtCost` | 3 |
| `realKtBonus` | 1 (KT pivotato) |
| `coffeeBonus` | 0.5 |

- Le GU non superano mai il budget iniziale del livello (clamp).
- Visualizzazione: `GU residue: 12,5 / 20` (virgola decimale, sempre 1 decimale).
- Colore barra: verde (`> 50%`), giallo (`> 25%`), rosso (`≤ 25%`).
- A `≤ 0` → stato **budget sforato** (§6.5). Le GU non diventano mai negative nella UI (clamp a 0).

### 3.6 Daily standup (in `constants.js` → `STANDUP`)

| Costante | Valore |
|---|---|
| `clockStart` | 09:00 |
| `minutesPerRealSecond` | 1 (1 s reale = 1 min di gioco) |
| `firstAt` | 09:30 |
| `interval` | 30 min di gioco |
| `warningLeadMinutes` | 3 |
| `durationMs` | 3000 |
| `overrunEvery` | 3 (ogni 3° standup del livello dura il doppio: 6000 ms) |

- L'orologio parte a 09:00 a ogni **inizio livello** (o nuovo budget). **Non** si resetta con la morte: è visibile nell'HUD, quindi prevedibile.
- L'orologio avanza anche durante lo standup (realismo: lo standup "mangia" minuti). Si ferma durante le schermate (Lessons Learned, Budget sforato).
- **Tell:** a `T − 3 min` l'orologio diventa arancione e lampeggia (on/off ogni 250 ms) e compare il toast `[Calendario] Daily standup tra 3 minuti`. Per gli standup che sforano il toast è `[Calendario] Daily standup tra 3 minuti (si è aggiunto il cliente)`.
- **Freeze:** fisica in pausa, trappole ferme, input del player ignorato, animazioni in pausa; overlay semitrasparente con testo `DAILY STANDUP — "Allora, giro veloce..."` e countdown. L'HUD (UIScene) **non** si ferma.
- **Uscita dal freeze:** `velocity.x = 0`, `velocity.y = 0` → se il player era a mezz'aria **cade da fermo**. Jump buffer azzerato. Coyote time NON concesso se in aria.
- Con `?standup=off` gli standup sono disabilitati (debug).

---

## 4. Moduli: responsabilità e interfacce

### 4.1 `events/EventBus.js`
Esporta `bus` (istanza singola di `Phaser.Events.EventEmitter`) e `EV` (costanti stringa). Eventi:

| Evento | Payload | Emesso da |
|---|---|---|
| `EV.LEVEL_START` | `{ levelId, startGu, pivotCause }` | GameScene |
| `EV.PLAYER_DIED` | `{ cause, x, y, spotKey, spotCount, deathsThisRun, totalDeaths }` | GameScene |
| `EV.GU_CHANGED` | `{ gu, max, delta, reason }` | GameScene (via Budget) |
| `EV.CLOCK_TICK` | `{ minutes, label, warning }` | GameScene (ogni cambio minuto) |
| `EV.STANDUP_WARNING` | `{ at, overrun }` | GameScene |
| `EV.STANDUP_START` / `EV.STANDUP_END` | `{ durationMs, overrun }` | GameScene |
| `EV.KT_CALL_START` / `EV.KT_CALL_END` | `{ pivoted }` | FakeKT |
| `EV.PICKUP` | `{ kind }` | Pickup |
| `EV.CHECKPOINT` | `{ id }` | Checkpoint |
| `EV.LEVEL_COMPLETE` | `{ levelId, runStats }` | GameScene |
| `EV.BUDGET_OVER` | `{ levelId, runStats }` | GameScene |
| `EV.NARRATE` | `{ text, priority, durationMs }` | GameScene (via Narrator) → UIScene |
| `EV.TOAST` | `{ text, durationMs, color }` | chiunque → UIScene |

Ogni scena che si iscrive al bus **deve disiscriversi** in `shutdown` (`this.events.once('shutdown', ...)`) per evitare listener duplicati.

### 4.2 `scenes/`

| Scena | Responsabilità |
|---|---|
| `BootScene` | Chiama `TextureFactory.generateAll(this)`; poi `scene.start('GameScene', { levelId, pivotCause })` (da query string o default `level1`) e `scene.launch('UIScene')`. Nessun preload di file. |
| `GameScene` | Costruisce il livello dai dati; crea player, tilemap, spine, pickup, checkpoint, goal, trappole; collisioni; gestisce morte/respawn, Budget, StandupSchedule, StatsTracker, Narrator; emette eventi. Unico proprietario dello stato di gioco. |
| `UIScene` | HUD sempre sopra (`scene.bringToTop`): barra GU, orologio, contatore "Ore non fatturabili" (morti totali all-time), contatore morti del run, box narratore, toast, overlay titolo, overlay standup, overlay call KT. Solo presentazione: non modifica stato. |
| `LessonsLearnedScene` | Slide fine livello 1 (§6.3). Avanti → `GameScene` con `{ levelId: 'level2', pivotCause }`. |
| `BudgetOverScene` | Schermata "budget sforato" (§6.5). R/Spazio → ricomincia lo stesso livello con budget pieno. |
| `MvpEndScene` | Fine livello 2: riepilogo statistiche + "Fine della demo. Il cliente chiederà di rifare tutto da capo." Spazio → ricomincia da `level1`. |

Transizioni: quando parte una schermata, `GameScene` viene fermata (`scene.stop`) e `UIScene` nasconde l'HUD (ascolta gli eventi `LEVEL_COMPLETE`/`BUDGET_OVER` e `LEVEL_START`).

### 4.3 `core/` (logica pura)

- **`Storage.js`** — `createStorage(backend = globalThis.localStorage)`; metodi `load(key, fallback)` e `save(key, value)`. Ogni accesso (anche la lettura di `globalThis.localStorage` stessa) dentro `try/catch`; in caso di errore o JSON non valido ritorna `fallback` e non lancia mai. Se il backend non esiste usa una `Map` in memoria.
- **`Budget.js`** — `class Budget { constructor(max); get gu; get max; spend(amount, reason); gain(amount, reason); isOver(); ratio(); }`. `spend`/`gain` ritornano il delta effettivo. Arrotondare a 0.5 per evitare errori floating point (`Math.round(x*2)/2`).
- **`StatsTracker.js`** — schema §5.2. Metodi: `startRun(levelId)`, `recordDeath({cause, x, y})` → `{ spotKey, spotCount, deathsThisRun, totalDeaths }`, `recordGuLoss(cause, amount)`, `recordPickup(kind)`, `completeRun(timeMs)`, `failRun()`, `getRun()`, `getPersistent()`, `dominantPivotCause(levelId)` (§6.3). Persiste tramite `Storage` dopo ogni morte, completamento e fallimento.
- **`StandupSchedule.js`** — `class StandupSchedule { constructor(cfg); update(dtMs) → events[]; get clockLabel; get isFrozen; get isWarning; reset(); }`. `update` ritorna un array di eventi `{type:'tick'|'warning'|'start'|'end', ...}` che GameScene traduce in bus events e freeze. Puramente basato su ms accumulati (testabile senza Phaser).
- **`Narrator.js`** — `class Narrator { constructor(lines, rng = Math.random); pick(event, ctx) → string|null }` (§5.3).
- **`LevelParser.js`** — `parseLevel(levelDef) → { width, height, tiles: number[][], spikes: [{x,y}], spawn, checkpoints, goal, pickups, entities }` (§5.4). Lancia `Error` descrittivo se: righe di lunghezza diversa, numero di righe ≠ 17, nessun `P` o più di uno, nessun `G`, carattere sconosciuto.
- **`pivot.js`** — `resolveMode(entity, pivotCause)` → `'normal' | 'pivoted'` (§5.4).
- **`format.js`** — `formatGu(12.5) → "12,5"`, `formatClock(570) → "09:30"` (minuti dalla mezzanotte), `formatDuration(ms) → "1:23"`.

### 4.4 `objects/`

- **`Player.js`** — estende `Phaser.Physics.Arcade.Sprite`. Implementa §3.2. Stato: `isDead`, `inputLocked`, `coyoteTimer`, `jumpBufferTimer`, `jumpCutApplied`. Metodi: `update(time, dt, input)`, `lockInput(bool)`, `freeze()`, `unfreeze()`, `respawnAt(x, y)`. Il player **non** decide quando muore: espone `kill(cause)` che emette verso GameScene (callback passata nel costruttore). Grounded = `body.blocked.down || body.touching.down`.
- **`Pickup.js`** — caffè: overlap → `budget.gain(0.5)`, sparisce; **ricompare al respawn** (reset). Bob verticale ±3 px, periodo 1200 ms (gestito in `update(dt)`, non tween).
- **`Checkpoint.js`** — macchinetta del caffè. Overlap → diventa attiva (texture/tint verde), aggiorna il punto di respawn, toast `Checkpoint: pausa caffè registrata`. Resta attiva fino a fine livello.
- **`Goal.js`** — cartello "Consegna al cliente". Overlap → `GameScene.completeLevel()`.

### 4.5 `objects/traps/BaseTrap.js` — contratto comune

```text
class BaseTrap {
  static type      // 'replyAll' | 'scopeCreep' | 'deckCollapse' | 'fakeKT'
  constructor(scene, def, mode)   // def = entità dal livello, mode = 'normal' | 'pivoted'
  build()          // crea game object e corpi fisici; chiamato una volta
  update(dtMs)     // logica; NON chiamato durante freeze (standup / morte)
  reset()          // riporta ESATTAMENTE allo stato iniziale (chiamato a ogni respawn)
  get solids()     // array di game object con corpo fisico su cui il player collide (può essere [])
  get killZones()  // array di game object che uccidono il player all'overlap (può essere [])
  get triggers()   // array di Zone che chiamano onTrigger(player) all'overlap
  onTrigger(player)
  destroy()
}
```

**Regole vincolanti per tutte le trappole:**
1. **Determinismo**: vietato `Math.random`. Ogni tempistica deriva dai parametri del livello.
2. **Tempo**: vietati `scene.time.delayedCall` e `scene.tweens` per la logica delle trappole. Usare timer accumulati in `update(dtMs)`. Così standup (non si chiama `update`) e `reset()` funzionano gratis.
3. **Movimento dei solidi**: corpi Arcade **dinamici** con `setImmovable(true)` e `body.setAllowGravity(false)`; il movimento si fa impostando `velocity` (così il collider spinge correttamente il player e lo trasporta). A destinazione: `velocity = 0` e posizione forzata al valore finale (`body.reset(x, y)`). Durante il freeze la pausa della fisica ferma tutto.
4. **Tell sempre visibile prima del pericolo**: ogni trappola ha un indizio sottile descritto in §6.2, presente fin dall'inizio o almeno 400 ms prima del primo frame letale.
5. Ogni trappola registra nel `def` un `id` univoco (usato per debug e stats).
6. La causa di morte delle `killZones` è `static type` della trappola.

`traps/index.js` esporta `TRAP_CLASSES = { replyAll: ReplyAllAvalanche, scopeCreep: ScopeCreepPlatform, deckCollapse: CollapsingDeck, fakeKT: FakeKT }`.

GameScene, per ogni trappola: `physics.add.collider(player, trap.solids)`, `physics.add.overlap(player, trap.killZones, () => die(trap.constructor.type))`, `physics.add.overlap(player, trap.triggers, (p, z) => trap.onTrigger(p))`. I solidi delle trappole collidono anche col layer della tilemap quando serve (specificato per trappola).

### 4.6 `gfx/TextureFactory.js`

Funzione `generateAll(scene)`: per ogni chiave disegna con `scene.make.graphics({ add: false })`, poi `generateTexture(key, w, h)` e `destroy()`. Nessun file esterno. Palette in `constants.js → COLORS`.

| Key | Dimensioni | Aspetto |
|---|---|---|
| `player` | 24×32 | completo blu navy `#1e3a8a`, testa `#f1c27d`, camicia bianca (striscia 4 px), cravatta rossa `#dc2626` |
| `tiles` | 96×32 (3 frame da 32) | frame 0: pavimento/muro grigio `#4b5563` con bordo `#6b7280`; frame 1: moquette `#334155`; frame 2: one-way (scrivania) `#92400e` solo i 6 px superiori pieni |
| `spike` | 32×32 | 3 triangoli rossi `#ef4444`, alti 14 px, base del tile; label implicita "deadline" via tint |
| `email` | 24×16 | rettangolo bianco, bordo `#94a3b8`, "V" della busta, puntino rosso in alto a destra |
| `emailShadow` | 24×6 | ellisse nera alpha 0.35 |
| `inboxBadge` | 28×24 | icona busta + cerchio rosso (il numero è un `Text` separato) |
| `scopeBlock` | 32×32 | giallo post-it `#facc15`, bordo `#ca8a04`, 3 linee "scritte" |
| `slide` | 64×36 | bianco, barra titolo blu `#2563eb` 8 px, 3 linee grigie |
| `kt` | 28×28 | cerchio dorato `#fbbf24` lucido + lettere tracciate "KT" (rettangoli), più **griglia calendario 6×6 px in basso a destra** (il tell) |
| `ktReal` | 28×28 | come `kt` ma **senza** griglia calendario e con bordo verde `#22c55e` |
| `coffee` | 16×20 | tazza marrone `#78350f`, vapore bianco |
| `checkpoint` | 24×40 | macchinetta grigia scura, spia rossa (inattiva) |
| `checkpointOn` | 24×40 | come sopra con spia verde |
| `goal` | 32×64 | asta + cartello bianco "OK" (forme) |
| `pixel` | 4×4 | bianco (per particelle e barre) |

Il testo (HUD, narratore, cartelli) usa `scene.add.text` con font di sistema: `fontFamily: '"Courier New", monospace'` per HUD e `'Arial, sans-serif'` per le slide. **Niente emoji** (render non garantito).

---

## 5. Formati dati

### 5.1 Chiavi `localStorage`

| Chiave | Contenuto |
|---|---|
| `ragebait.stats.v1` | schema §5.2 (persistente) |

Solo una chiave. Il run corrente vive in memoria (refresh = si riparte dal livello 1).

### 5.2 Schema statistiche

```js
// Persistente (ragebait.stats.v1)
{
  version: 1,
  totalDeaths: 0,            // all-time → HUD "Ore non fatturabili"
  totalGuBurned: 0,
  deathsByCause: { pit: 0, spike: 0, replyAll: 0, scopeCreep: 0, deckCollapse: 0, selfRestart: 0 },
  levels: {
    level1: {
      runs: 0, completions: 0, budgetOvers: 0,
      deaths: 0,
      deathsByCause: { /* come sopra */ },
      deathSpots: { "12:8": 4 },   // chiave = `${floor(x/64)}:${floor(y/64)}` → conteggio all-time
      bestTimeMs: null
    },
    level2: { /* idem */ }
  }
}

// Run corrente (in memoria, non persistito)
{
  levelId: 'level1',
  startedAt: 0,                 // ms di gioco
  deaths: 0,
  deathsByCause: {},
  guLostByCause: {},           // es. { replyAll: 3.5, fakeKT: 6 }
  deathSpots: {},              // come sopra ma solo per questo run
  pickups: { coffee: 0, fakeKT: 0, realKT: 0 },
  timeMs: 0
}
```

- `load` con versione diversa o oggetto malformato → si riparte dallo schema vuoto (merge difensivo con i default: chiavi mancanti aggiunte).
- `spotCount` restituito da `recordDeath` = conteggio **del run corrente** su quella cella (serve al narratore: "3ª volta qui").

### 5.3 Frasi del narratore (`data/narratorLines.js`)

```js
export const NARRATOR_LINES = [
  { id: 'death_generic_1', event: 'death', when: {}, text: 'Ottimo lavoro. Rifacciamolo.' },
  { id: 'death_replyall_1', event: 'death', when: { cause: 'replyAll' }, text: 'Bastava silenziare il thread. Come da mia precedente email.' },
  { id: 'death_spot_1', event: 'death', when: { minSpot: 3 }, text: 'È la {spotCount}ª volta che muori esattamente qui. Lo mettiamo a processo?' },
  { id: 'death_many_1', event: 'death', when: { minRunDeaths: 10 }, text: '{runDeaths} tentativi. Lo chiamerei "approccio iterativo".' },
  // ...
];
```

Campi:
- `id` (univoco), `event`, `text` (con placeholder), `when` (condizioni, tutte in AND), `priority` opzionale (default dal tipo evento).
- **Eventi:** `levelStart`, `levelStartPivot`, `death`, `ktFake`, `ktReal`, `standupStart`, `standupOverrun`, `budgetLow` (prima volta sotto 25%), `checkpoint`, `levelComplete`, `budgetOver`, `idle` (10 s senza input orizzontale, una volta per vita).
- **Condizioni `when` supportate:** `cause` (string), `minSpot` (spotCount ≥), `minRunDeaths`, `maxRunDeaths`, `minTotalDeaths`, `minCauseDeaths` (morti nel run per la stessa causa ≥), `levelId`.
- **Placeholder:** `{runDeaths}`, `{totalDeaths}`, `{spotCount}`, `{causeLabel}`, `{causeDeaths}`, `{gu}`, `{guMax}`, `{levelId}`, `{pivotLabel}`.

**Algoritmo `Narrator.pick(event, ctx)`** (deterministico a parità di `rng`):
1. Candidati = righe con `event` uguale e tutte le condizioni `when` soddisfatte da `ctx`.
2. Specificità = numero di chiavi in `when`. Tieni solo i candidati con specificità massima.
3. Escludi gli `id` usati nelle ultime 6 frasi (history interna); se resta vuoto, ignora l'esclusione.
4. Scegli con `rng()`; sostituisci i placeholder (placeholder mancanti in `ctx` → lascia stringa vuota, mai `undefined`).
5. Se nessun candidato → `null`.

**Visualizzazione (UIScene):** box in basso a sinistra, prefisso `Partner:`, testo per `durationMs` (default 3000 ms). Priorità: `budgetOver`/`levelComplete` 3 > `death` con `minSpot`/milestone 2 > altri 1. Una frase nuova sostituisce quella visibile se ha priorità ≥. Eccezione anti-spam: per `death` generiche, se l'ultima frase di morte è stata mostrata < 1200 ms fa, salta.

**Milestone morti** (eventi `death` con `when: { minRunDeaths: N }`): N = 1, 5, 10, 25, 50. Mostrare la milestone solo quando `runDeaths === N` (aggiungere condizione `runDeathsExact` oltre a quelle sopra; supportarla nel matcher).

**Contenuto minimo richiesto:** ≥ 45 frasi totali: ≥ 3 generiche di morte, ≥ 3 per ciascuna causa (`pit`, `spike`, `replyAll`, `scopeCreep`, `deckCollapse`, `selfRestart`), ≥ 3 `minSpot: 3`, ≥ 1 per ogni milestone, ≥ 2 per ogni altro evento. Tono: Partner cortese, passivo-aggressivo, gergo aziendale. Esempi di riferimento (usarli):

- `levelStart`: "Benvenuto a bordo! Il cliente è molto... motivato."
- `levelStartPivot`: "Non è un problema, è un'opportunità."
- `death/pit`: "Il burrone era in scope. Era nella slide 47."
- `death/spike`: "Le deadline sono puntuali. Tu un po' meno."
- `death/scopeCreep`: "Il cliente ha solo aggiunto una piccola cosa."
- `death/deckCollapse`: "La v7 era quella buona. La v8 ti è caduta addosso."
- `death/selfRestart`: "Dimissioni accettate. Ti riassumiamo subito, stessa RAL."
- `ktFake`: "Ottimo, un'ora di KT. Ora sai esattamente quanto prima."
- `ktReal`: "Questa volta il KT l'ha fatto qualcuno che sapeva le cose. Strano."
- `standupStart`: "Giro veloce: cosa hai fatto ieri, cosa fai oggi, perché sei a mezz'aria."
- `budgetLow`: "Le GU stanno finendo. Facciamo un allineamento veloce?"
- `checkpoint`: "Pausa caffè registrata. Non abituarti."
- `idle`: "Tutto ok? Ti vedo offline su Teams."
- `budgetOver`: "Abbiamo sforato. Ne parliamo con il cliente. Cioè, ne parli tu."
- `levelComplete`: "Consegnato. Il cliente ha già delle osservazioni."
- `death/minSpot`: "{spotCount}ª volta qui. Ormai è il tuo ufficio."

### 5.4 Formato livello (`levels/levelN.js`)

```js
export default {
  id: 'level1',
  name: 'Progetto 1 — Primo giorno',
  startGu: 20,
  map: [
    // 17 righe, tutte della stessa lunghezza; 1 carattere = 1 tile 32×32
    '..........................',
    // ...
    '##########....############',
  ],
  entities: [
    { id: 'ra1', type: 'replyAll', x: 40, y: 14, mode: 'normal', params: { /* §6.2 */ } },
    { id: 'slotA', type: 'replyAll', x: 20, y: 14, slot: true,
      params: { normal: { /* ... */ }, pivoted: { /* ... */ } } },
    { id: 'sign1', type: 'sign', x: 3, y: 13, text: 'Primo giorno! Benvenuto.' },
  ],
};
```

**Legenda della mappa:**

| Char | Significato |
|---|---|
| `.` | vuoto |
| `#` | solido (tile frame 0) |
| `=` | piattaforma one-way, solida solo dall'alto (frame 2) |
| `^` | spina (oggetto statico, hitbox 28×12 alla base del tile), causa `spike` |
| `P` | spawn player (esattamente 1) |
| `C` | checkpoint (0..n), id = `cp` + indice in ordine di x |
| `G` | traguardo (esattamente 1) |
| `o` | caffè |

Coordinate entità: `x`, `y` in **tile** (colonna, riga), angolo in alto a sinistra del tile; il builder converte in pixel. Tutte le distanze nei `params` delle trappole sono in **tile** (convertite dal builder), i tempi in **ms**, le velocità in **tile/s**.

**Tilemap:** costruita con `this.make.tilemap({ data, tileWidth: 32, tileHeight: 32 })` usando la texture generata `tiles` come tileset (`addTilesetImage('tiles', 'tiles', 32, 32, 0, 0)`). Indici: `-1` vuoto, `0` solido, `2` one-way. `layer.setCollision([0, 2])`; per i tile `2` impostare `tile.setCollision(false, false, true, false)` (solo lato superiore). I caratteri `^ P C G o` diventano `-1` nella tilemap e generano oggetti.

**Bordi del mondo:** `physics.world.setBounds(0, 0, width*32, height*32)` con `checkCollision.down = false` (si cade fuori → `pit`) e `checkCollision.up = false`. Il player ha `setCollideWorldBounds(true)` per sinistra/destra.

**Slot e pivot (`pivot.js`):**
- Entità con `slot: true` hanno `params.normal` e `params.pivoted`.
- `resolveMode(entity, pivotCause)`: se `!entity.slot` → `entity.mode ?? 'normal'`; se `entity.slot` e `entity.type === pivotCause` → `'pivoted'`; altrimenti `'normal'`.
- La trappola riceve `params[mode]` per gli slot, `params` per le entità non-slot.
- Si pivota **una sola** causa per livello (la dominante).

---

## 6. Gameplay dettagliato

### 6.1 Cause di morte (`data/causes.js`)

```js
export const CAUSES = {
  pit:          { label: 'il burrone delle deadline', pivotable: false },
  spike:        { label: 'le deadline appuntite',     pivotable: false },
  selfRestart:  { label: 'le dimissioni volontarie',  pivotable: false },
  replyAll:     { label: 'le email in "Rispondi a tutti"', pivotable: true,
                  lesson: 'Le email cadenti diventano piattaforme su cui salire.' },
  scopeCreep:   { label: 'lo scope creep',            pivotable: true,
                  lesson: 'Lo scope creep ora allunga i ponti sopra i burroni.' },
  deckCollapse: { label: 'il deck_FINAL_v7_DEF_ok.pptx', pivotable: true,
                  lesson: 'Le slide che crollano ora diventano un ponte.' },
  fakeKT:       { label: 'i finti KT',                pivotable: true,
                  lesson: 'Questa volta il KT è vero: rivela la strada nascosta.' },
};
export const DEFAULT_PIVOT_CAUSE = 'replyAll';
```

### 6.2 Le 4 trappole

Per ogni trappola: comportamento **normal**, **tell**, **pivoted**, parametri con default, comportamento di `reset()`.

---

#### A. `ReplyAllAvalanche` — Valanga di email "Rispondi a tutti"

**Normal (letale):**
- Un `trigger` (Zone) largo `triggerWidth` tile all'ingresso della zona.
- Quando il player entra nel trigger (one-shot per vita): dopo `startDelayMs`, cadono `count` email una alla volta, ogni `intervalMs`, nelle colonne `columns[i % columns.length]` (offset in tile dalla `x` dell'entità; **ordine dall'ultima colonna verso l'ingresso**, cioè verso il player che avanza).
- Ogni email nasce a `y = 0` del mondo (fuori vista se la camera è più in basso, altrimenti al bordo superiore) e cade a velocità costante `fallSpeed` tile/s finché tocca il pavimento (collisione con il layer o raggiunge `y` = riga del pavimento indicata `floorY`), poi sparisce dopo 150 ms. Durante la caduta è una `killZone` (hitbox 20×12).
- Dopo l'ultima email l'area è sicura finché non si muore (non si ri-triggera nella stessa vita).

**Tell:**
- Sopra l'ingresso, a 3 tile d'altezza, un'icona `inboxBadge` con contatore `(0)`. Al trigger il contatore sale di 1 per ogni email generata — il giocatore lo vede salire prima che le email arrivino.
- Ogni email è preceduta da un'ombra `emailShadow` sul pavimento della sua colonna, che appare **500 ms prima** dell'impatto (calcolata: compare quando il tempo di caduta residuo ≤ 500 ms; per semplicità: spawn ombra e email contemporanei, ma l'email nasce abbastanza in alto da impiegare ≥ 500 ms).
- Soluzione leggibile: entrare nel trigger, tornare indietro, aspettare che il contatore smetta di salire, poi passare.

**Pivoted (aiuta):**
- Stesso trigger e stessa sequenza, ma le email **non uccidono**: quando toccano il pavimento o un'altra email si fermano e diventano **solidi** (immovable, 24×16 visivamente; hitbox 32×16 per allinearsi alla griglia) per `stayMs`, poi spariscono (lampeggiano negli ultimi 600 ms).
- Le colonne pivotate cadono **nella stessa colonna ripetutamente** (`columns` con ripetizioni) così formano una **pila/scala** che permette di salire su una sporgenza altrimenti irraggiungibile (≥ 5 tile).
- Impilamento: tutte le email della stessa colonna si fermano sopra la precedente (calcolare il `y` di arresto come `floorY − k·0.5 tile` per la k-esima email della colonna; niente fisica di impilamento, solo velocity + stop a `y` calcolato).
- Tell del pivot: email con bordo verde invece che grigio.

**Parametri (default):**
```js
// normal
{ triggerWidth: 2, startDelayMs: 300, count: 10, intervalMs: 280, columns: [9,8,7,6,5,4,3,2], fallSpeed: 9, floorY: 14 }
// pivoted
{ triggerWidth: 2, startDelayMs: 200, count: 12, intervalMs: 350, columns: [3,3,3,3,4,4,4,4,5,5,5,5], fallSpeed: 9, floorY: 14, stayMs: 8000 }
```
**reset():** distrugge tutte le email/ombre attive, contatore a `(0)`, trigger riarmato, timer a 0.

---

#### B. `ScopeCreepPlatform` — La piattaforma che si allunga

**Normal (spinge nel vuoto):**
- Un blocco `scopeBlock` "radicato" in un muro, alto 1 tile, lunghezza iniziale `baseLength` tile, orientato `direction: 'right' | 'left'`.
- Un `trigger` largo `triggerWidth` tile × 1 tile posto sulla sporgenza davanti al blocco. Quando il player ci sta **a terra** per `armDelayMs` cumulativi (one-shot per vita), il blocco si estende nella `direction` a `extendSpeed` tile/s fino a `maxLength` tile.
- Estensione implementata come catena di segmenti `scopeBlock` (uno ogni tile) rivelati progressivamente; il segmento "di testa" è un corpo immovable con velocità → spinge il player. Il player può saltarci sopra (la parte superiore è solida): è la via di fuga.
- Il player spinto oltre il bordo cade nel burrone → morte `pit`. **Nota:** perché lo scope creep risulti causa di morte, il burrone sotto la sporgenza ha un `killZone` dedicata della trappola (`pitZone`, rettangolo `pitRect` in tile) che attribuisce la causa `scopeCreep` se il player ci entra **entro 2000 ms dall'ultimo contatto con la testa del blocco**; altrimenti la morte resta `pit`.

**Tell:**
- Sempre visibile: contorno tratteggiato (Graphics, alpha 0.18, colore giallo) dell'ingombro finale `maxLength`.
- Un post-it statico sul muro con testo `CR #47` (Text 10 px).
- Quando si arma il trigger: il blocco vibra (±1 px su x ogni 50 ms) per tutto l'`armDelayMs` prima di partire.

**Pivoted (aiuta):**
- Il blocco è posto sul bordo di un burrone troppo largo da saltare (≥ 6 tile). Il trigger è sulla sporgenza; dopo `armDelayMs` il blocco si estende **sopra il burrone** fino a `maxLength`, formando un ponte stabile (resta esteso finché non si muore). Nessuna `pitZone` attribuita.
- Tell del pivot: contorno tratteggiato verde invece che giallo.

**Parametri (default):**
```js
// normal
{ direction: 'right', baseLength: 1, maxLength: 5, triggerWidth: 3, armDelayMs: 450, extendSpeed: 5, pitRect: { x: 0, y: 15, w: 6, h: 3 } }  // pitRect relativo all'entità
// pivoted
{ direction: 'right', baseLength: 1, maxLength: 8, triggerWidth: 2, armDelayMs: 300, extendSpeed: 6 }
```
**reset():** lunghezza a `baseLength`, segmenti extra nascosti e corpi disabilitati, trigger riarmato, timer a 0.

---

#### C. `CollapsingDeck` — Il deck che crolla

**Normal (schiaccia):**
- Una pila di `slideCount` slide (`slide` 64×36) appoggiata su una mensola sopra un corridoio, posizionata a `stackY` (riga) e centrata sull'entità. Sotto, il corridoio lungo `corridorWidth` tile.
- `trigger`: zona all'ingresso del corridoio (`triggerWidth` tile). All'ingresso del player (one-shot per vita): fase **wobble** per `wobbleMs`, poi le slide cadono una alla volta ogni `dropIntervalMs`, ciascuna verso la propria posizione finale `targets[i]` (in tile, relativa all'entità) a `fallSpeed` tile/s.
- Durante la caduta ogni slide è `killZone` (hitbox 60×30). All'arrivo diventa **solido** statico (immovable, velocità 0): i normal target formano un mucchio alto 2 tile nel corridoio da scavalcare.
- Le slide cadono **solo in verticale** (target con stessa x della posizione iniziale), per restare leggibili.

**Tell:**
- Sopra la pila, testo `deck_FINAL_v7_DEF_ok.pptx` (Text 10 px) sempre visibile.
- La slide in cima ha un micro-wobble permanente (rotazione ±2° con periodo 1600 ms) già prima del trigger; al trigger il wobble diventa ±6° con periodo 200 ms per `wobbleMs`.
- Soluzione leggibile: entrare, tornare indietro, aspettare il crollo e scavalcare il mucchio — oppure sprintare (al limite).

**Pivoted (aiuta):**
- Stessa pila sopra un **burrone** largo 5–6 tile. Al trigger, le slide cadono in diagonale lungo un percorso dritto fino ai `targets` che formano un **ponte** (una fila orizzontale a filo con le due sponde). Durante la caduta non uccidono (nessuna killZone). Una volta posate sono solidi permanenti fino al respawn.
- Tell del pivot: barra titolo delle slide verde (`tint 0x22c55e` sulla texture) e testo `deck_FINAL_v8_APPROVATO.pptx`.

**Parametri (default):**
```js
// normal
{ slideCount: 6, stackY: 9, triggerWidth: 2, corridorWidth: 6, wobbleMs: 600, dropIntervalMs: 120, fallSpeed: 14,
  targets: [ {x:1,y:14},{x:3,y:14},{x:5,y:14},{x:1,y:13},{x:3,y:13},{x:5,y:13} ] }  // 2 file di 3 slide
// pivoted
{ slideCount: 3, stackY: 8, triggerWidth: 2, corridorWidth: 0, wobbleMs: 400, dropIntervalMs: 200, fallSpeed: 10,
  targets: [ {x:0,y:13},{x:2,y:13},{x:4,y:13} ] }  // ponte lungo 6 tile alla riga 13
```
Nel caso pivoted la posizione iniziale della slide `i` è `(x_entità + targets[i].x, stackY − i·1.2)`; la caduta è un movimento rettilineo a velocità costante verso il target.

**reset():** slide riportate alla pila iniziale, corpi disabilitati, killZone disattive, trigger riarmato.

---

#### D. `FakeKT` — Il falso power-up Knowledge Transfer

**Normal (non uccide, brucia GU):**
- Pickup `kt` che fluttua (bob ±4 px, periodo 900 ms) con alone dorato pulsante (alpha 0.3–0.6, periodo **1300 ms**).
- Overlap → il pickup sparisce; `budget.spend(3, 'fakeKT')`; `stats.recordGuLoss('fakeKT', 3)`; il player è **bloccato** (`lockInput(true)`, `velocity.x` decelera a 0 normalmente, la gravità resta attiva) per `callMs`.
- UIScene mostra l'overlay "call": finestra al centro `KT — Passaggio di consegne (durata: 1h)` con battute che ruotano ogni 1000 ms: "Mi sentite?", "Condivido lo schermo... ah no, aspettate", "Allora, il file è sul drive. Quale drive? Bella domanda.", "C'è un'eccezione, ma non mi ricordo quale.", "Per il resto è tutto nel README. Non c'è un README.".
- Il narratore commenta con evento `ktFake`.
- **Il KT conta come "incidente" per le Lessons Learned tramite le GU bruciate** (§6.3), non come morte.
- Il KT ricompare al respawn (si può cascarci di nuovo).

**Tell:**
- Il caffè vero pulsa con periodo 1000 ms; il KT con periodo **1300 ms** (fuori sincrono, visibile se sono vicini).
- Nella texture `kt` c'è una minuscola **griglia da calendario** in basso a destra (è un invito a una riunione).
- Posizionato su un ramo opzionale/esca, mai obbligatorio.

**Pivoted (aiuta, "KT vero"):**
- Texture `ktReal` (senza calendario, bordo verde). Overlap → `budget.gain(1, 'realKT')`, call breve `callMs` 800 ms con una battuta: "Ecco la lista delle trappole. Prego.", poi **rivela** le piattaforme nascoste dello slot: rettangoli `hiddenPlatforms` (in tile) che fino a quel momento sono invisibili e non solidi diventano visibili (frame 0 tile, alpha 1) e solidi fino al respawn.
- Tell del pivot: alone verde e nessuna griglia calendario.

**Parametri (default):**
```js
// normal
{ callMs: 4000 }
// pivoted
{ callMs: 800, hiddenPlatforms: [ {x:2,y:11,w:2,h:1},{x:6,y:9,w:2,h:1},{x:10,y:11,w:2,h:1} ] }  // relative all'entità
```
**reset():** pickup visibile e attivo, piattaforme nascoste di nuovo invisibili/non solide, timer a 0. Se il reset avviene durante una call (impossibile: non si muore bloccati, ma per sicurezza) → `lockInput(false)` ed emettere `KT_CALL_END`.

---

### 6.3 Causa dominante e Lessons Learned

`StatsTracker.dominantPivotCause(run)`:
1. Considera `run.guLostByCause` solo per cause con `pivotable: true` (`replyAll`, `scopeCreep`, `deckCollapse`, `fakeKT`). Ogni morte aggiunge `0.5` alla sua causa; il KT finto aggiunge `3`.
2. Prendi la causa con GU perse massime. **Parità** → vince quella più recente (tracciare `lastIncidentAt` per causa).
3. Nessuna causa pivotabile → `DEFAULT_PIVOT_CAUSE` e flag `isDefault: true`.
4. Ritorna `{ cause, guLost, deaths, isDefault }`.

**LessonsLearnedScene** (slide stile PowerPoint, sfondo bianco, testo scuro, font Arial):
- Barra titolo blu: `Lessons Learned — Progetto 1`.
- Bullet:
  - `Causa principale: {label} ({deaths} morti, {guLost} GU bruciate)` — se `isDefault`: `Nessun incidente rilevante. Sospetto. Abbiamo comunque preparato una lesson learned.`
  - `Azione correttiva: {lesson}`
  - `Morti totali nel progetto: {run.deaths} — Tempo: {formatDuration} — GU residue: {gu} / {max}`
- Footer piccolo: `deck_FINAL_v7_DEF_ok.pptx   |   Confidenziale   |   Slide 1 di 1`.
- Input accettato solo dopo 1000 ms (evita skip accidentali), poi `Premi Spazio per passare al Progetto 2`.
- Al passaggio: `scene.start('GameScene', { levelId: 'level2', pivotCause: cause })`; GameScene emette narratore `levelStartPivot` con `{pivotLabel}`.

### 6.4 Livelli

#### Livello 1 — "Primo giorno" (~170 colonne × 17 righe)

Pavimento base alla riga 15–16 (`#`), cielo libero sopra. Sezioni in ordine (colonne indicative; l'implementatore disegna la mappa ASCII rispettando §3.2 vincoli di raggiungibilità). Curva: **introduci → ripeti → tradisci → respiro**.

| # | Colonne | Contenuto | Scopo |
|---|---|---|---|
| S0 | 0–14 | Spawn `P` a col 2. Pavimento piatto, cartello "Primo giorno! Benvenuto in azienda." | Overlay titolo, prendere confidenza |
| S1 | 15–34 | 3 gap da 2–3 tile, un gradino di 2, una fila di 3 spine `^` fra due piattaforme, 1 caffè `o` | Insegna salto, salto variabile, spine |
| S2 | 35–52 | **ReplyAll #1** (normal, default params) in corridoio piatto da 10 tile | Prima trollata (< 1 min) |
| S3 | 53–72 | **ScopeCreep #1** (direction right): sporgenza di 3 tile dopo un piccolo dislivello, blocco radicato nel muro a sinistra, burrone di 5 tile sotto/davanti, piattaforma d'arrivo a 3 tile di distanza | Introduce scope creep |
| S4 | 73–95 | Respiro: 2 caffè su piattaforme `=`, poi **FakeKT #1** su un rametto rialzato opzionale accanto al 3° caffè (stessa altezza, così si vede la differenza di pulsazione). Checkpoint `C` a col ~94 | Pickup buoni → tradimento |
| S5 | 96–118 | **CollapsingDeck #1** (normal) su corridoio di 6 tile con mensola sopra | Introduce deck |
| S6 | 119–150 | Remix: **ReplyAll #2** più corto (`count: 6`, `columns: [5,4,3,2]`), **ScopeCreep #2** con `direction: 'left'` (spinge indietro verso un burrone **alle spalle**: tradimento della convenzione appresa), spine | Ripeti e tradisci |
| S7 | 151–169 | Rampa finale, ultimo caffè, `G` a col ~165 | Respiro e traguardo |

Standup: con 1 min di gioco/s il primo standup arriva a 30 s (circa S2–S3), il secondo a 60 s, il terzo (sforato) a 90 s. **Vincolo:** posizionare almeno un salto lungo (gap 4) in S3 o S6 in modo che uno standup a mezz'aria possa far cadere il player — clip garantita ma prevedibile.

#### Livello 2 — "Progetto 2: la rivincita" (~110 colonne × 17 righe, `startGu: 15`)

Quattro slot in sequenza, separati da brevi tratti piatti. **Ogni slot deve essere superabile anche in modalità normal** (percorso più difficile); il pivot offre una via chiaramente più facile o una scorciatoia.

| Slot | Colonne | Normal | Pivoted |
|---|---|---|---|
| `slotA` replyAll | 5–25 | Corridoio con valanga letale (params normal default); sopra, una sporgenza a 5 tile di altezza con un caffè (non raggiungibile) | Le email si impilano nelle colonne 3–5 → scala verso la sporgenza a 5 tile (caffè + scorciatoia che salta il resto dello slot) |
| `slotB` scopeCreep | 30–50 | Burrone di 8 tile con 2 piattaforme `=` intermedie da 1 tile (salti da 3) + uno scope creep normal sulla prima sporgenza | Il blocco si estende per 8 tile sopra il burrone → ponte |
| `slotC` deckCollapse | 55–75 | Corridoio con deck normal | Deck sopra un burrone di 6 tile: le slide formano il ponte. In normal lo stesso burrone ha 2 piattaforme `=` per attraversarlo con salti precisi |
| `slotD` fakeKT | 80–100 | KT finto in vista sopra una fossa di spine larga 10 tile attraversabile con 3 piattaforme strette (1 tile) | KT vero: rivela 3 piattaforme larghe 2 tile sopra le spine |

Traguardo `G` a col ~106. Nel debug (`?level=level2&pivot=<cause>`) ogni combinazione deve essere completabile.

### 6.5 Budget sforato

- Quando `budget.isOver()` dopo una spesa: niente respawn; `stats.failRun()`; narratore `budgetOver`; dopo 600 ms `scene.start('BudgetOverScene', { levelId, runStats })`.
- **BudgetOverScene:** sfondo rosso scuro `#450a0a`, titolo grande `BUDGET SFORATO`, sottotitolo `Il progetto ha superato le Giornate Uomo previste. Escalation in arrivo (prossimamente).`, riga statistiche (`morti`, `tempo`, `causa principale`), e `Premi R per riaprire il progetto (nuova SOW)`. Input dopo 1000 ms → `GameScene` stesso `levelId` (e stesso `pivotCause` se livello 2) con budget pieno e orologio a 09:00.

### 6.6 Overlay titolo (no menu)

- All'avvio di `level1` UIScene mostra al centro: `RAGEBAIT` (grande) + `← → / A D muoviti   Spazio salta   R ricomincia` + `(titolo provvisorio)` in piccolo.
- **Non blocca**: il player si muove subito. Svanisce (fade 400 ms) al primo input di movimento o dopo 5000 ms.
- Mostrato solo una volta per caricamento pagina.

### 6.7 HUD (UIScene)

| Elemento | Posizione | Contenuto |
|---|---|---|
| Barra GU | alto sinistra | barra 200×14 + testo `GU residue: 12,5 / 20` |
| Orologio | alto centro | `09:27` (arancione lampeggiante in warning) |
| Morti | alto destra | `Ore non fatturabili: {totalDeaths}` e sotto `Questo progetto: {runDeaths}` |
| Narratore | basso sinistra | box scuro alpha 0.8, larghezza 560, word wrap |
| Toast | alto centro sotto l'orologio | testo per 2500 ms |
| Overlay standup / KT | centro | descritti in §3.6 / §6.2-D |

HUD con `setScrollFactor(0)` (scena separata, quindi già fisso). Profondità definite in `constants.js → DEPTH`.

---

## 7. Flusso principale di `GameScene`

```text
init(data):  levelId = data.levelId ?? 'level1'; pivotCause = data.pivotCause ?? null
create():
  def = LEVELS[levelId]; parsed = parseLevel(def)
  build tilemap + collisione; spine; pickup; checkpoint; goal; cartelli
  per ogni entity trappola: mode = resolveMode(entity, pivotCause); new TRAP_CLASSES[type](this, entity, mode).build()
  player = new Player(...) a parsed.spawn
  colliders/overlaps (§4.5)
  camera.startFollow(player, true, 0.15, 0.15); camera.setBounds(mondo); camera.setDeadzone(120, 80)
  budget = new Budget(def.startGu); schedule = new StandupSchedule(STANDUP); stats.startRun(levelId)
  emit LEVEL_START; narratore levelStart / levelStartPivot
update(time, delta):
  dt = min(delta, 50)                 // evita salti enormi dopo tab in background
  events = schedule.update(dt) → gestisci tick/warning/start/end (freeze/unfreeze)
  if frozen (standup) o player.isDead: return (niente update player/trappole)
  player.update(time, dt, input)
  for trap of traps: trap.update(dt)
  pickups/checkpoint update (bob)
  if player.y > worldHeight + 64: die('pit')
  idle check; run time += dt
die(cause):
  if player.isDead: return
  player.isDead = true; fx morte; budget.spend(0.5); stats.recordDeath + recordGuLoss
  emit PLAYER_DIED, GU_CHANGED; narratore 'death' con ctx
  if budget.isOver(): budgetOver(); return
  dopo DEATH_FREEZE_MS (usa this.time.delayedCall: qui è ammesso) → respawn()
respawn():
  traps.forEach(reset); pickups.forEach(reset); player.respawnAt(checkpoint o spawn); player.isDead = false
completeLevel():
  stats.completeRun(runTimeMs); emit LEVEL_COMPLETE; narratore levelComplete
  dopo 800 ms: level1 → LessonsLearnedScene con dominantPivotCause; level2 → MvpEndScene
```

Nota: se la morte avviene esattamente mentre scatta uno standup, lo standup ha la precedenza visiva ma il respawn avviene comunque dopo 250 ms reali (usa `delayedCall` che non è influenzato dalla pausa della fisica).

---

## 8. Debug (`config/debug.js`)

Query string supportate (ignorate se assenti o invalide):

| Param | Effetto |
|---|---|
| `?debug=1` | corpi fisici Arcade visibili + testo in alto a sinistra sotto l'HUD: fps, `grounded`, `coyote`, `buffer`, `vx/vy`, posizione in tile |
| `?level=level2` | parte direttamente da quel livello |
| `?pivot=scopeCreep` | `pivotCause` forzato (solo con `level2`) |
| `?standup=off` | disabilita gli standup |
| `?resetStats=1` | cancella `ragebait.stats.v1` all'avvio |

---

## 9. Deploy

### `.github/workflows/deploy.yml`

```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: true
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run build
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- `package-lock.json` va committato (richiesto da `npm ci`).
- **Non** creare repository remoti né fare push: lo fa l'utente. Lui dovrà poi abilitare *Settings → Pages → Source: GitHub Actions*.

### Eseguire in locale

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit test logica
npm run build      # produzione in dist/
npm run preview    # serve dist/ per verificare i path relativi
```

---

## 10. Test

- **Unit (Vitest, `tests/`)** solo per `src/core/*`: niente Phaser nei test.
  - `Budget`: spesa, guadagno con clamp a max, `isOver` a 0, arrotondamento 0.5, mai negativo nella UI.
  - `StatsTracker`: `recordDeath` incrementa run e persistente, `spotKey` corretto, `spotCount` per run, `dominantPivotCause` (KT da 3 GU batte 5 morti da 0.5; parità → più recente; nessuna pivotabile → default), persistenza tramite storage fake, recovery da JSON corrotto.
  - `Storage`: backend che lancia eccezioni su `getItem`/`setItem` → nessuna eccezione propagata.
  - `Narrator`: filtro `when`, specificità massima, no ripetizioni nelle ultime 6, template con placeholder mancanti, `runDeathsExact`.
  - `LevelParser`: mappa valida, errori per righe disomogenee, 0 o 2 `P`, carattere sconosciuto; **e un test che parsa `level1` e `level2` reali** senza errori.
  - `pivot`: matrice slot/non-slot × pivotCause.
  - `StandupSchedule`: label orologio, warning a 09:27, start a 09:30, end dopo 3000 ms, 3° standup dura 6000 ms, `reset`.
- **Manuale**: checklist di accettazione per milestone (§11) eseguita con `npm run dev`.

---

## 11. Ordine di costruzione (milestone)

Ogni milestone termina con: `npm run build` OK, `npm test` OK (quando esistono test), e i criteri sotto verificati. Commit Git **locale** a fine milestone (messaggio `M<n>: <titolo>`). Non saltare milestone; non anticipare feature delle successive.

### M0 — Setup progetto
- `git init`, `.gitignore`, `package.json` con versioni pinnate, `vite.config.js`, `index.html` (div `#game`, `<title>RageBait</title>`, CSS: body margin 0, sfondo `#0b0d12`), `src/main.js` con una `BootScene` che scrive "RageBait — boot OK".
- `.github/workflows/deploy.yml` (§9).
- **Accettazione:** `npm install` senza errori; `npm run dev` mostra il canvas 960×540 scalato con il testo; `npm run build` produce `dist/index.html` con path relativi (`./assets/...`); `npm run preview` funziona.

### M1 — Texture e level parser
- `constants.js`, `TextureFactory.js` (tutte le chiavi §4.6), `LevelParser.js`, `format.js`, livello di test `levels/level1.js` provvisorio (pavimento + qualche piattaforma, spine, P, G).
- `GameScene` disegna tilemap e oggetti statici; nessun player ancora.
- Vitest configurato; `LevelParser.test.js`.
- **Accettazione:** la scena mostra tile, spine, caffè, checkpoint, goal generati senza file esterni (tab Network: nessuna richiesta di immagini); `npm test` passa.

### M2 — Player con buon feeling
- `Player.js` completo §3.2–3.3, camera follow, `?debug=1`.
- **Accettazione (manuale, con `?debug=1`):** corsa con accelerazione percepibile ma rapida (0 → max in ~0,1 s); tap breve = salto basso (~1 tile), pressione lunga = salto pieno (~3 tile); salto premuto ~80 ms dopo aver lasciato il bordo funziona (coyote); salto premuto ~100 ms prima di atterrare parte all'atterraggio (buffer); nessun "doppio salto" possibile; nessun incastro sugli spigoli tra tile adiacenti; piattaforme `=` attraversabili dal basso.

### M3 — Morte, respawn, checkpoint, Budget, Stats
- `Storage`, `Budget`, `StatsTracker` (+ test), `causes.js`, `Checkpoint`, `Pickup`, `Goal` (per ora `completeLevel` mostra solo un toast), morte per `pit`/`spike`/`R`.
- HUD minimo in `UIScene`: barra GU, morti.
- **Accettazione:** morte → controllo di nuovo disponibile in ≤ 400 ms (verifica a occhio + `console.time` in debug); ogni morte −0,5 GU; caffè +0,5 (max non superato) e ricompare al respawn; checkpoint sposta il respawn; dopo refresh "Ore non fatturabili" conserva il valore; con `localStorage` bloccato (Safari privata o override che lancia) il gioco funziona senza errori in console.

### M4 — Budget sforato
- `BudgetOverScene`; a 0 GU niente respawn.
- **Accettazione:** morendo 40 volte nel livello 1 (o con un budget di test basso) appare la schermata; `R` riapre il livello con 20 GU, orologio 09:00, stats persistenti incrementate (`budgetOvers`).

### M5 — Daily standup
- `StandupSchedule` (+ test), integrazione freeze/unfreeze, orologio e toast nell'HUD, overlay standup.
- **Accettazione:** orologio parte 09:00; a 09:27 diventa arancione lampeggiante con toast; a 09:30 tutto si ferma 3 s (HUD vivo); saltando a 09:29:59 il player resta sospeso e poi cade da fermo (vy = 0) senza poter saltare; il 3° standup (10:30) dura 6 s; con `?standup=off` nessuno standup; la morte non resetta l'orologio.

### M6 — Trappola ReplyAllAvalanche (normal + pivoted)
- `BaseTrap`, registry, `ReplyAllAvalanche`. Inserire una istanza normal nel livello 1 provvisorio.
- **Accettazione:** il contatore inbox sale al trigger; le ombre precedono ogni email di ≥ 500 ms; colpito → morte con causa `replyAll` (verifica in `localStorage`); entrare/uscire/aspettare permette di passare; respawn ripristina tutto; standup ferma le email a mezz'aria e poi riprendono; in modalità pivoted (istanza di test con `mode: 'pivoted'`) le email si impilano e si può salire 5 tile.

### M7 — ScopeCreepPlatform (normal + pivoted)
- **Accettazione:** contorno tratteggiato visibile da subito; restare sulla sporgenza ≥ 450 ms → vibrazione poi estensione che spinge il player nel burrone → morte con causa `scopeCreep`; caduta nello stesso burrone senza spinta → causa `pit`; si può saltare sopra il blocco in estensione; `direction: 'left'` funziona; pivoted forma un ponte di 8 tile percorribile; reset corretto.

### M8 — CollapsingDeck (normal + pivoted)
- **Accettazione:** wobble lento sempre visibile, veloce al trigger; slide in caduta uccidono (causa `deckCollapse`); posate diventano solide e scavalcabili; sprint al massimo della velocità senza esitazione passa (margine stretto ma possibile); pivoted forma un ponte orizzontale percorribile sopra un burrone di 6 tile; reset corretto.

### M9 — FakeKT (normal + pivoted)
- **Accettazione:** pulsazione KT (1300 ms) visibilmente fuori sincrono con il caffè (1000 ms); raccolta → −3 GU, input bloccato 4 s con overlay call e battute che ruotano, il player non muore; `guLostByCause.fakeKT` = 3 nel run; pivoted: +1 GU, overlay breve, compaiono 3 piattaforme solide; reset ripristina tutto.

### M10 — Narratore
- `Narrator.js` (+ test), `narratorLines.js` (≥ 45 frasi, §5.3), integrazione in GameScene/UIScene, priorità e anti-spam.
- **Accettazione:** a inizio livello appare una frase; ogni causa di morte ha una frase specifica; morire 3 volte nella stessa cella da 64 px produce una frase "stesso punto" con il numero corretto; milestone 1/5/10 compaiono esattamente a quei conteggi; nessuna frase ripetuta due volte di fila; nessun `{placeholder}` o `undefined` visibile.

### M11 — Livello 1 definitivo + overlay titolo
- Mappa completa §6.4 con tutte le trappole in posizione e parametri tarati; overlay titolo §6.6.
- **Accettazione:** il gioco è giocabile entro 10 s dall'apertura (nessun click richiesto oltre al focus); prima trappola raggiunta in < 60 s; livello completabile senza morti in 60–90 s da chi lo conosce (verifica: giocalo tu fino a farcela, annota il tempo in `docs/DECISIONS.md`); ogni salto rispetta i vincoli §3.2; `LevelParser` test sul livello reale passa.

### M12 — Lessons Learned + livello 2 con slot
- `pivot.js` (+ test), `dominantPivotCause` (+ test), `LessonsLearnedScene`, `level2.js` con 4 slot, `MvpEndScene`.
- **Accettazione:** completando il livello 1 dopo essere morto soprattutto per una certa trappola, la slide mostra quella causa con numeri corretti; nel livello 2 solo quello slot è pivotato e il narratore dice la frase `levelStartPivot`; con 0 morti pivotabili → testo "Nessun incidente rilevante..." e pivot `replyAll`; tutte le 5 combinazioni (`?level=level2` senza pivot e con ciascuno dei 4 `?pivot=`) sono completabili; fine livello 2 → `MvpEndScene` → Spazio riparte dal livello 1.

### M13 — Rifinitura e verifica finale
- Pulizia console (zero errori/warning nostri), `?resetStats=1`, verifica `npm run build && npm run preview` con path relativi, README breve **non** richiesto (le istruzioni stanno in §9).
- **Accettazione finale (checklist end-to-end):**
  1. `npm ci && npm test && npm run build` OK da clone pulito.
  2. Apertura → si gioca subito; overlay titolo sparisce.
  3. Tutte e 4 le trappole incontrate nel livello 1, ciascuna con tell visibile.
  4. Almeno 2 standup durante un run normale.
  5. Morte → respawn < 1 s, GU −0,5, frase del narratore.
  6. Budget a 0 → schermata sforamento → R riapre.
  7. Fine livello 1 → Lessons Learned coerente → livello 2 con pivot giusto → fine demo.
  8. Refresh → contatore all-time conservato.

---

## 12. Convenzioni di codice

- Una classe per file, `export default` per le classi, export nominati per costanti/utility.
- Nessun numero magico nelle scene: tutto in `constants.js` o nei `params` del livello.
- Tempi in ms, distanze nei dati in tile, nel codice runtime in px (conversione solo nel builder/trappola).
- Ogni trappola commenta in testa: comportamento normal, tell, pivoted (3 righe).
- Niente dipendenze oltre a `phaser`, `vite`, `vitest`.
- Testi visibili al giocatore in italiano; identificatori, commenti e log in inglese.

---

## 13. Post-MVP (non implementare ora)

- **Escalation** a GU zero (marea di email in CC che sale: Manager → Director → VP → CEO), al posto della schermata semplice.
- Troll del pivot: "Il cliente ha cambiato idea" (a volte il pivot non avviene).
- Audio: SFX (jsfxr) e tell sonori, musica CC0, tasto mute.
- Nuove trappole/eventi: inviti meeting-nastro, deadline-molle, "Hai 5 minuti?", timesheet del venerdì, roll-off improvviso, AI con piattaforme allucinate, KT vero raro nel livello normale.
- NPC: arrivista, micromanager (e sua variante pivotata), junior.
- Struttura carriera verticale (Analyst → Partner), finali multipli, sentiero segreto "I campi".
- Livelli in Tiled, asset Kenney / pixel art custom.
- Menu, opzioni, rimappatura tasti, timer speedrun, statistiche di fine run estese.
- Controlli touch / mobile; pagina itch.io; clip della vergogna; fantasmi e classifiche (backend free tier).

---

## 14. Revisione applicata (v1.1) — PREVALE sulle sezioni precedenti

Fonte: `docs/PLAN_REVIEW.md`. I numeri `#n` si riferiscono agli issue della review. Esito: ✅ accolto, ✏️ accolto con modifiche, ❌ respinto.

### 14.1 Architettura

**#1 ✅ Gruppi stabili e pool (sostituisce l'ultima parte del contratto §4.5).**
- Ogni trappola crea in `build()` gruppi `Physics.Arcade.Group` **stabili**: `this.solidGroup`, `this.killGroup`, `this.triggerGroup`. I getter `solids`, `killZones`, `triggers` restituiscono **sempre gli stessi gruppi**.
- Gli oggetti creati "a runtime" (email, slide) sono un **pool pre-allocato** in `build()` (dimensione = `count`/`slideCount`), disattivati con `disableBody(true, true)` e riattivati con `enableBody(true, x, y, true, true)`.
- Oggetti che cambiano ruolo (email/slide: letali in caduta → solidi a terra) stanno in **un solo gruppo** per tipo. GameScene registra per ogni trappola:
  - `physics.add.collider(player, trap.objectGroup, null, obj => obj.getData('state') === 'landed')`
  - `physics.add.overlap(player, trap.objectGroup, onKill, obj => obj.getData('state') === 'falling' && obj.getData('lethal'))`
- Le zone trigger richiedono `physics.add.existing(zone, true)` (#19).
- I solidi delle trappole **non** collidono mai con il layer: le posizioni finali sono calcolate (#19).

**#2 ✅ Ordine scene.** BootScene: prima `scene.launch('UIScene')`, poi `scene.start('GameScene', data)`. In più UIScene, in `create()`, emette `EV.UI_READY`; GameScene alla ricezione ri-emette uno snapshot (`LEVEL_START`, `GU_CHANGED`, `CLOCK_TICK`, ultima frase del narratore).

**#6 ✅ Freeze di morte.** GameScene mantiene `this.pauseReasons = new Set()`. `die()` aggiunge `'death'` e chiama `physics.pause()`; `respawn()` rimuove `'death'`; lo standup usa `'standup'`. `physics.resume()` solo quando il Set è vuoto. Le trappole non ricevono `update` mentre il Set non è vuoto.

**#7 ✅ Spesa GU centralizzata.** Unico metodo `GameScene.spendGu(amount, cause)` → `budget.spend` + `stats.recordGuLoss` + emissione `GU_CHANGED` + controllo `budget.isOver()` (→ §6.5). Player e trappole ricevono `spendGu` come callback; nessuno chiama `budget.spend` direttamente. `die()` chiama sempre `fakeKT.cancelCall()` su tutte le istanze. Durante la call del KT il player è congelato anche in verticale (`body.setAllowGravity(false)`, `vy = 0`); al termine si riattiva la gravità.

**#18 ✅ Input dopo il freeze.** All'unfreeze (standup, call KT, morte) chiamare `this.input.keyboard.resetKeys()`.

### 14.2 Coordinate (#5 ✅)

Regola unica per tutti i `params`:
- `x`/`y` delle **entità** = colonna/riga assolute del tile.
- Nei `params`: i campi `dx`, `dy` (e i rettangoli `{dx, dy, w, h}`) sono **offset in tile relativi all'entità**, anche negativi.
- I campi che terminano in `Row` sono **righe assolute**.
- Rinomina: `floorY` → `restRow` (riga in cui l'oggetto appoggia: il suo bordo inferiore coincide con il bordo superiore della riga `restRow + 1`); `stackY` → `stackRow`; `pitRect` → `pitRect: {dx, dy, w, h}`; `targets[i]` → `{dx, row}`; `hiddenPlatforms[i]` → `{dx, dy, w, h}`; `columns` restano offset `dx`.
- Tutti gli sprite delle trappole usano `origin (0.5, 1)`. Hitbox delle slide come solido: **64×32** (sprite 64×36).
- Righe 0–1 vietate al gameplay (sotto l'HUD), incluso lo spawn delle email (#19).
- Convenzione dei livelli: pavimento alle righe 15–16, quindi il player "a terra" sta sulla riga 14.

### 14.3 Raggiungibilità (#9 ✅, sostituisce §3.2 "Raggiungibilità")

| Dislivello (tile, + = sale) | Gap max "normale" | Gap max "difficile" |
|---|---|---|
| −2 o meno | 5 | 6 |
| 0 | 4 | 5 |
| +1 | 4 | 5 |
| +2 | 3 | 4 |
| +3 | 1 | 2 (sconsigliato) |
| ≥ +4 | impossibile | impossibile |

Vincolante per entrambi i livelli; verificata da `LevelValidator` (§14.6).

### 14.4 Trappole

**#3 ✅ Regola di design misurabile:** il primo momento letale di ogni trappola temporizzata coincide con la posizione di un player che entra correndo a velocità massima. Soluzioni: esitare/tornare indietro, oppure timing preciso.

**A. ReplyAll (sostituisce i parametri §6.2-A):**
- Le email nascono a `spawnHeight` tile sopra `restRow` (default 6, mai nelle righe 0–1), cadono a `fallSpeed`; l'ombra compare allo spawn (caduta ≈ 0,67 s ≥ 500 ms).
- Le colonne cadono **dall'ingresso verso l'uscita**, con `intervalMs` tale che la k-esima email arrivi a terra quando il player che corre è lì.
- Trigger **2 tile prima** del corridoio.
- Normal: `{ triggerDx: -2, triggerWidth: 2, startDelayMs: 0, count: 10, intervalMs: 120, columns: [0,1,2,3,4,5,6,7,8,9], spawnHeight: 6, fallSpeed: 9, restRow: 14 }`. In `?debug=1` loggare per colonna `t_impatto`.
- **#10 Pivoted:** `{ triggerDx: -2, triggerWidth: 2, startDelayMs: 200, count: 12, intervalMs: 300, columns: [3,3,4,4,4,4,5,5,5,5,5,5], spawnHeight: 6, fallSpeed: 9, restRow: 14, stayMs: 8000 }` → pile alte 1/2/3 tile (scala). Durante la caduta `body.checkCollision.none = true`; all'arrivo, se c'è overlap con il player, l'email diventa solida solo quando il player esce. `stayMs` parte dall'atterraggio dell'**ultima** email. Il trigger si riarma quando l'ultima email è sparita.

**B. ScopeCreep (#16 ✅, sostituisce l'implementazione §6.2-B):**
- La testa è un solo sprite immovable che si muove a velocità costante; dietro, **un unico rettangolo statico** (`TileSprite` + body statico) ridimensionato con `setSize` + `body.updateFromGameObject()` a ogni tile superato.
- La callback dell'overlap del trigger imposta solo `this.playerOnTrigger = true`; `update(dt)` accumula `armedMs` se `playerOnTrigger && player.grounded`, poi azzera il flag.
- Normal: `{ direction: 'right', baseLength: 1, maxLength: 6, triggerDx: 1, triggerWidth: 3, armDelayMs: 450, extendSpeed: 5, pitRect: { dx: 6, dy: 1, w: 4, h: 3 } }`.
- Pivoted: `{ direction: 'right', baseLength: 1, maxLength: 11, triggerDx: 0, triggerWidth: 2, armDelayMs: 300, extendSpeed: 6 }`.

**C. CollapsingDeck (#3 ✅, sostituisce i parametri §6.2-C):**
- Trigger **dentro** il corridoio, a 2 tile dall'ingresso; le slide cadono **dall'uscita verso l'ingresso** (la prima chiude la strada davanti al player).
- Normal: `{ slideCount: 6, stackRow: 9, triggerDx: 2, triggerWidth: 1, corridorWidth: 6, wobbleMs: 350, dropIntervalMs: 120, fallSpeed: 14, targets: [ {dx:5,row:14},{dx:3,row:14},{dx:1,row:14},{dx:5,row:13},{dx:3,row:13},{dx:1,row:13} ] }`.
- Pivoted: `{ slideCount: 3, stackRow: 8, triggerDx: -1, triggerWidth: 2, wobbleMs: 400, dropIntervalMs: 200, fallSpeed: 10, targets: [ {dx:0,row:14},{dx:2,row:14},{dx:4,row:14} ] }` → ponte a filo delle sponde.

**D. FakeKT:** parametri invariati salvo `hiddenPlatforms: [{dx:2,dy:-1,w:2,h:1},{dx:5,dy:-2,w:2,h:1},{dx:8,dy:-1,w:2,h:1}]`. Vedi §14.1 per la spesa e il congelamento.

**#17 ✅ Tell.** Caffè: bob 1000 ms + alone 1000 ms. KT: bob 1300 ms + alone 1300 ms. Nuova texture `glow` 32×32 (cerchio bianco sfumato, colorato con il tint).

### 14.5 Budget, caffè, Lessons Learned, narratore

- **#8 ✅** Il caffè raccolto resta raccolto per tutto il livello (si azzera solo a inizio livello / nuova SOW).
- **#12 ✏️ Causa dominante (sostituisce §6.3 punti 1–2):** si misura in **incidenti**: morte = 1, KT finto = 2. Parità → più recente. La slide mostra `Causa principale: {label} ({incidents} incidenti, {guLost} GU bruciate)`. Se la causa con più incidenti in assoluto **non** è pivotabile, aggiungere il bullet `Causa reale: {label} (non pivotabile. Il cliente ha scelto un'altra lesson.)`. Test dedicato.
- **#13 ✅ Narratore:** `pick` → `{ id, text, priority } | null`. Specificità pesata: `runDeathsExact` = 3, `minSpot` = 2, altre chiavi = 1. Le frasi milestone usano solo `runDeathsExact`. Test: con spotCount 3 e causa spike vince sempre la frase spot.
- **#20 ✅** Frasi del narratore: 30 bastano (restano i requisiti per causa e per evento). Rimossi `deathSpots` all-time e `bestTimeMs`.
- Dopo un budget sforato, `startRun` azzera il run: le Lessons Learned contano solo l'ultimo tentativo (voluto).
- `completeLevel()` è protetto da `isDead`/`isComplete`; durante gli 800 ms dopo il traguardo gli standup sono sospesi (#19).
- BudgetOverScene accetta `R` o `Spazio` (#19).

### 14.6 Verificabilità (#14 ✅)

Nuovi parametri di debug (in aggiunta a §8):

| Param | Effetto |
|---|---|
| `?gu=1` | budget iniziale forzato |
| `?clock=09:29` | ora di partenza dell'orologio |
| `?clockSpeed=10` | moltiplicatore dell'orologio |
| `?cp=<id>` | spawn al checkpoint indicato |
| `?god=1` | le morti non costano GU e non resettano il livello (si continua dal punto) |

**`src/core/LevelValidator.js`** (puro, con test su `level1` e `level2` × 5 combinazioni di pivot):
1. applica gli override `tiles` della modalità (§14.7) e calcola per ogni colonna le superfici calpestabili;
2. verifica gap e dislivelli secondo la tabella §14.3 (i solidi creati dalle trappole pivotate contano come superfici solo per la loro modalità);
3. verifica che esista un percorso `P` → `G` (grafo di salti tra superfici);
4. verifica che tutte le entità e i loro rettangoli stiano dentro la mappa e fuori dalle righe 0–1.

Ogni milestone in §11 va letta con due blocchi: **Verifica automatica (agente)** = `npm test`, `npm run build`, `LevelValidator`, log di debug; **Verifica manuale (utente)** = feeling, tempi, clip. L'agente non dichiara verificato ciò che è solo manuale: lo elenca nel resoconto come "da provare".

### 14.7 Livelli

**#4 ✏️ Mappa comune + override.** La mappa ASCII è unica. Un'entità slot può avere `params[mode].tiles: [{dx, dy, w, h, char}]` che il builder applica alla mappa **prima** di creare la tilemap (solo per la modalità attiva). Nessun'altra differenza di geometria è ammessa.

**#15 ✏️ Durata livello 1.** Livello 1 ~**220 colonne**, obiettivo 45–60 s per chi lo conosce. Standup: `firstAt: '09:20'`, intervallo **20** minuti, ogni terzo sforato (6 s). Il vincolo "standup a mezz'aria in un punto preciso" è sostituito da: il livello contiene **≥ 3 gap da 4+ tile sopra burroni letali**. Sezioni §6.4 riscalate proporzionalmente; S6 diventa due sezioni (S6a remix ReplyAll + spine, S6b ScopeCreep left).

**S3 (ScopeCreep right), geometria esplicita:**
```
col: 53   54   55..60          61..64     65..72
      gradino +2  muro col 54 (righe 9–12), sporgenza cols 55–60 a riga 12 (piedi), blocco radicato a col 54
      burrone cols 61–64 (4 tile, dislivello 0 → "normale"), arrivo cols 65–72 a riga 12
```
Il blocco parte dal muro (col 55) e si allunga a destra fino a `maxLength` 6 → copre fino a col 60: spinge il player nel burrone. Via di fuga: saltarci sopra o saltare il burrone prima.

**S6b (ScopeCreep left):** il player arriva da sinistra saltando un burrone di 4 tile su una sporgenza di 6 tile; a destra c'è un muro alto 3 tile in cui è radicato il blocco, che si allunga verso **sinistra** e spinge indietro nel burrone appena saltato. Si prosegue salendo **sopra il blocco** (+1) e poi sopra il muro (+2 dal blocco).

**Livello 2 (sostituisce la tabella §6.4, ~110 colonne, `startGu: 15`).** La rotta normal di ogni slot è **al limite** ("difficile" in §14.3); la pivoted è banale e visibilmente alternativa (#11):

| Slot | Normal | Pivoted |
|---|---|---|
| `slotA` replyAll (cols 5–25) | corridoio da 10 con valanga letale; sporgenza a +5 tile con caffè e scorciatoia, irraggiungibile | email impilate 1/2/3 tile → dalla cima +2 alla sporgenza → scorciatoia che salta il resto dello slot |
| `slotB` scopeCreep (cols 30–50) | burrone di 11 tile con **una** piattaforma `=` da 1 tile al centro (gap 5 + 5) + scope creep normal sulla prima sporgenza | il blocco si estende per 11 tile → ponte |
| `slotC` deckCollapse (cols 55–75) | corridoio pieno con deck normal (aspettare + scavalcare la pila alta 2) | override `tiles` rimuove 6 tile di pavimento (burrone) e le slide formano il ponte: si cammina |
| `slotD` fakeKT (cols 80–100) | fossa di spine da 11 tile con una piattaforma da 1 tile al centro (gap 5 + 5); il KT finto è sulla piattaforma centrale (esca) | KT vero all'ingresso: rivela 3 piattaforme da 2 tile → salti da 2 |

### 14.8 Varie (#19 ✅)
- `dominantPivotCause(run)` (non `levelId`).
- Entità `sign`: `scene.add.text` su un rettangolo `pixel` scalato, gestito da GameScene.
- Testi: `setResolution(2)` sui `Text`, font ≥ 14 px (i testi da 10 px diventano 14).

### 14.9 Esito delle domande aperte
Confermati: un checkpoint nel livello 1 (col ~110 dopo il riscalamento); `R` costa 0,5 GU; orologio che corre durante lo standup; livello 2 con 15 GU nuove; niente audio, con toast dello standup grande e arancione al centro-alto e bordo schermo arancione lampeggiante nei 3 s di warning.

---

## 15. Stato

- [x] M0–M13: prima versione giocabile (2026-10-31). Verifica automatica: 31 test Vitest, `npm run build`, smoke test nel browser (trappole, morte/respawn, KT, standup, budget sforato, Lessons Learned, livello 2 con tutti i pivot). Scostamenti in `docs/DECISIONS.md` § Implementazione.
- [ ] Verifica manuale (utente): feeling dei salti, difficoltà e durata del livello 1, leggibilità degli indizi.

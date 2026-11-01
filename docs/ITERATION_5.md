# Iterazione 5A — Livello 5 "Partner": la torre, l'escalation, il Board

Origine: brainstorming del 2026-11-01, revisione del piano (`docs/PLAN_REVIEW.md`, 21 punti) e risposte dell'utente.
Scelte dell'utente:
- livello **verticale**;
- **torcia invertita**, **Business Development**, **leccapiedi**;
- l'escalation, quando ti prende, **costa 3 GU** ("spiegare al cliente cosa è successo"), senza morte;
- si sviluppa **solo la 5A**.

Restano per la **5B**: SteerCo, ambiziosi, Recruiter, campi e i relativi finali (§9).
Il **burnout** è una feature a parte, con un suo playbook (`.claude/skills/burnout/`). Il finale burnout arriva con quella feature.

Prevale su `IMPLEMENTATION_PLAN.md` e sulle iterazioni precedenti dove le modifica.

---

## 0. Cosa cambia (5A)

| Id | Modifica | Tocca |
|---|---|---|
| A | Livelli di altezza variabile, camera verticale, checkpoint e delega in verticale | `builder.js`, `LevelParser`, `LevelValidator`, `DelegateTargeting`, `Team`, `GameScene`, `BaseTrap` |
| B | **Escalation**: marea di email in CC che sale; presa = −3 GU | `core/EscalationBrain`, `objects/Escalation`, `UIScene` |
| C | **Torcia invertita**: i lavoratori costruiscono solo se non li guardi | `core/torch.js`, `objects/npc/Worker` |
| D | **Il leccapiedi**: ti segue, ti adula, fa da trampolino sui tappetini | `core/SycophantBrain`, `objects/npc/Sycophant` |
| E | **Business Development**: 3 opportunità aprono il Board | `LevelParser` (`$`), `objects/Deal`, `Goal` |
| F | **Finale Partner** (troll) e scena dei finali | `scenes/EndingScene` (sostituisce `MvpEndScene`), `state.session` |
| G | Livello 5 "La Partnership" | `levels/level5.js`, `levels/index.js`, `config/debug.js` |

- Le meccaniche nuove del livello 5 **non hanno variante pivotata**, perché è l'ultimo livello.
- Il livello 5 contiene invece i **4 slot** pivotabili dal livello 4 (`replyAll`, `deckCollapse`, `scopeCreep`, `fiveMinutes`).
- Validazione su **5 casi**: nessun pivot, più un caso per ogni slot (review #20).

---

## 1. Livelli verticali (A)

### Parser e builder
- `createGrid(width, rows = LEVEL_ROWS)`; `ground()` usa `rows - 1`.
- `parseLevel` accetta `def.rows ?? LEVEL_ROWS` righe (errore se il numero è diverso).
- Nuovo carattere `$` per le opportunità (`out.deals`).
- **Checkpoint:**
  - nei livelli `vertical` sono ordinati per **y decrescente** (dal basso), negli altri per x come oggi; gli id restano `cp0…cpN` in quell'ordine (review #11);
  - un checkpoint si attiva solo se ha **indice maggiore** di quello attivo. Così non si torna mai indietro, e nei livelli orizzontali non cambia niente.
- `validateLevel` ignora il controllo "righe 0–1 riservate all'HUD" quando `def.vertical` (review #18): il parsed porta il flag `vertical`.

### Validatore
- Per prestazioni, la BFS cerca le celle di arrivo solo nelle righe `[y − 6, y + 8]` (review #20). Oltre non si sale e le cadute più lunghe passano comunque da celle intermedie.
- `validateLevel` calcola anche `dist`, il numero minimo di salti per ogni cella raggiunta (serve a §2).
- Opzione `bounces: [{x, y}]`: dalle celle dei **tappetini del leccapiedi** sono ammessi salti con rise fino a **5** e gap ≤ 2 (§4).
- Opzione `extraSurfaces`: celle solide aggiuntive, usata per le costruzioni dei lavoratori (§3).
- `trapSurfaces` resta com'è per le trappole esistenti.
- **Ritmo:** `longestQuietStretch` vale per i livelli orizzontali. Per quelli verticali c'è `longestQuietClimb(parsed)` (review #19):
  - una riga è "attiva" se ha un'entità (`entityRows`, a ±2 righe dalla sua `y`), un'opportunità, un checkpoint, una spina, o un piano raggiungibile su cui si atterra;
  - dallo spawn al traguardo al massimo **6** righe consecutive non attive.

### Camera (review #14, #9)
- `updateCamera` usa `cam.setFollowOffset(-lookAhead, -this.lookY)`.
- `lookY` vale 0 nei livelli orizzontali.
- Nei livelli verticali tende a **+60** (vedi di più **sopra**). Quando il player cade veloce (`vy > 350`) tende a **−50** (vedi di più sotto). Tempo di assestamento 400 ms, come il look-ahead orizzontale.
- `respawn` centra la camera tenendo conto dell'offset.
- Deadzone verticale 40 nei livelli verticali (70 negli altri).

### Trappole in verticale
- `BaseTrap.addTrigger` ha come default le righe `ty − 12 … ty + 2` invece di `2 … 16`.
- Per gli slot esistenti (tutti a `y = 14`) è identico; in una torre il trigger resta sul suo piano.

### Delega (review #12)
- `pickDelegateTarget(playerX, facing, targets, rangeCols, { blockers, behindCols, playerY, rangeRows = 3 })`: i bersagli con `y` a più di `rangeRows` righe dal player vengono scartati.
- `Team.findTarget` passa `playerY` e la `y` di ogni bersaglio (`owner.ty`).
- Il leccapiedi **non** è delegabile.

### Cadute
- Dentro la torre cadere non uccide: si perde quota.
- La morte `pit` resta solo fuori dal mondo (non succede: il fondo è pieno).

## 2. Escalation (B)

### Regola
- **Partenza:** quando i piedi del player salgono sopra `startRow` (il soffitto della lobby).
  - Sirena (flash rosso) e toast **"ESCALATION: il cliente ha messo in CC il suo capo."**
  - La marea parte dal pavimento della lobby.
- **Velocità per stadio**, in base alla riga della superficie. La catena è del cliente (review #21):

| Stadio | In CC | Velocità |
|---|---|---|
| 1 | il Manager del cliente | 50 px/s |
| 2 | + il Director | 60 px/s |
| 3 | + il VP | 70 px/s |
| 4 | + il **CEO** | 80 px/s |

- **Guinzaglio:** se la superficie è più di `leashRows = 8` righe sotto i piedi del player, salta a 8 righe.
- **Presa:** la superficie arriva ai piedi del player.
  - **−3 GU**, causa `escalation`, incidente registrato. Battuta: *"Call col cliente: spiegare tutto quello che è successo. −3 GU."*
  - Il player resta **bloccato 1,2 s** (blocco input `escalation`): è la call.
  - Poi la marea si riabbassa a `leashRows` sotto il player e resta ferma **1,5 s**.
  - Non è una morte: non c'è respawn e non si perde quota.
  - Con il guinzaglio a 8 righe la marea non può riprenderti subito, ma una caduta dentro la marea sì.
  - Dopo la presa le GU possono finire → "Budget sforato" (come oggi).
- **Respawn** dopo una morte per altre cause (slot, spine): la marea scende a 8 righe sotto il punto di respawn (se era più in alto) e resta ferma 1,5 s.
- **Fine:** quando il player arriva al piano del Board (`stopRow`) la marea si ferma per sempre: *"Il CEO del cliente è in ferie fino a lunedì."*
- Si congela con lo standup e con la morte (come tutto: `GameScene.update` si ferma). **Non** si congela per i blocchi di input (KT, 5 minuti, presa).

### Indizi
- La marea è un muro di buste che ribollono, con i soggetti `RE: RE: FW: URGENTE` sul bordo e una tinta rossa.
- Sul bordo c'è l'etichetta della catena: `CC: Manager, Director`.
- **HUD:** sotto l'orologio compare `ESCALATION · CC: Manager, Director · 5 righe sotto`, in rosso se mancano ≤ 3 righe.
- Banner a ogni nuovo stadio: *"Ora c'è in CC anche il VP."*

### Verifica dei tempi (review #13, analitica)
Test Vitest, senza smoke a tempo:
1. Per ogni piano si prende il numero minimo di salti `dist` della BFS, dall'ingresso del piano all'ingresso di quello sopra.
2. Ogni salto vale **0,75 s**, le attese obbligatorie si sommano (costruzione dei lavoratori), e si aggiungono 2 s di tolleranza per piano.
3. La simulazione di `EscalationBrain` con il player che sale a quel ritmo deve dare **zero prese**.
4. Con il ritmo di un player lento (salto = 1,1 s) deve dare **almeno una presa** in tutto il livello: la marea deve essere una minaccia vera.

### Architettura
- `core/EscalationBrain.js`, puro:
  - `constructor({ startRow, stopRow, floorRow, stages: [{ fromRow, speed, label }], leashRows })`;
  - `update(dt, { feetY })` restituisce le azioni `start`, `stage`, `catch`, `stop`;
  - `afterCatch(feetY)`, `resetBelow(feetY)`;
  - getter `surfaceY`, `stageIndex`, `chainLabel`, `distanceRows(feetY)`, `active`.
- `objects/Escalation.js`: disegno (tileSprite di buste e bordo animato), applica le azioni (GU, blocco, narratore, eventi HUD `EV.ESCALATION`).

## 3. Torcia invertita: i lavoratori (C)

*"Io lo sapevo fare meglio" ora lo dici tu.* Davanti al Partner c'è una "torcia": un alone tenue di **10 tile** nella direzione in cui guarda, su **±3 righe**. Vale **anche in aria**, così non si imbroglia saltellando (review #6).

- `core/torch.js`, puro: `inTorch(viewer, target, { range, rowsUp, rowsDown, requireGround })`.
  - `viewer = { x, feetY, facing, grounded }`, `target = { x, feetY }`.
  - `MicromanagerBrain` la riusa per la sua torcia (range 5, 2 righe, `requireGround: true`): stesso comportamento, verificato dai test esistenti.
  - Piante e burroni restano nel brain del micromanager.

### Il lavoratore (Worker)
- Un junior costruisce un pezzo di percorso **solo se non lo guardi**.
- **Forma esplicita:** lista ordinata di piattaforme 2×1 (`cells: [{dx, dy, w}]`). Niente colonne piene (review #6).
- **Costruzione:** una piattaforma ogni **450 ms** (preavviso: contorno tratteggiato dove arriverà).
  - Se il player o un junior occupano quella cella, aspetta.
  - Le piattaforme sono **one-way** (si attraversano da sotto).
- **Se lo guardi:** si ferma, si gira verso di te e dice **"Volevi un aggiornamento?"**. Riprende **800 ms** dopo che smetti di guardarlo (più di un salto intero).
- **Il lavoro fatto resta:** non si smonta con una morte.
- **Indizi:** barra di avanzamento sopra di lui; icona dell'occhio barrato quando lo guardi.
- I lavoratori stanno **nella direzione da cui arrivi**: guardarli è naturale, girarsi è la sfida.
- **Validatore:**
  - con `extraSurfaces` = tutte le piattaforme costruite il piano si sale;
  - senza, il traguardo **non** è raggiungibile: la sfida è obbligatoria.

## 4. Il leccapiedi (D)

L'arrivista dei livelli 3–4, ora tuo sottoposto. Ti segue e ti adula. **Non ti blocca mai**: la review #7 e #15 lo sconsigliavano, ed è più divertente così.

### Comportamento
- **Ti segue** a 1,5 tile **dietro** di te (lato opposto a dove guardi). Si muove fino a 300 px/s e salta quando serve, con movimento fittizio come i junior delegati.
- Al checkpoint e dopo una presa dell'escalation ricompare accanto a te.
- **Adula** a intervalli fissi (ogni 6 s) con una nuvoletta, senza effetti:
  - *"Che visione, Partner."*
  - *"Lo dicevo io che era la scelta giusta."*
  - *"Ho messo like al suo post. Due volte."*
  - *"Le ho tenuto la porta. E l'ascensore. E la sedia."*

### Trampolino (review #2–#3)
- Funziona **solo sui tappetini** (carattere mappa `b`, un tappetino rosso con scritto *"Prego, Partner"*).
- Quando sei a ≤ 2 tile da un tappetino, il leccapiedi ci corre sopra e si **inchina**: la sua schiena diventa un trampolino.
- **Rimbalzo:** se ci atterri sopra (`vy > 0`, piedi sopra la schiena) parti con `vy = −759` (k ≈ 1,22) e `jumpCutApplied = true`. L'altezza è fissa e non dipende da quanto tieni premuto.
  - Il conto: la schiena sta a ≈ 20 px dal pavimento, l'apice a 160 px sopra la schiena, quindi ≈ 5,6 tile sopra il pavimento.
  - Basta per salire su una piattaforma **5 righe** sopra (one-way, si attraversa da sotto).
- Battuta: *"Si appoggi pure, Partner!"*
- Lontano dai tappetini il leccapiedi non è un corpo solido: ci passi attraverso.
- **Validatore:** `bounces` = celle dei tappetini. Almeno un tappetino è obbligatorio (senza `bounces` il traguardo non è raggiungibile).

### Architettura
- `core/SycophantBrain.js`, puro, stati `follow` / `toMat` / `bowing`.
- `update(dt, { player: {x, feetY, facing, vy}, mats })` restituisce `bow`, `bounce`, `flatter`; più `targetX`.
- `objects/npc/Sycophant.js` riusa gli sprite dell'arrivista, con un outfit diverso.

## 5. Business Development (E)

Al Partner non si chiede di consegnare ma di **vendere**.
- **3 opportunità** (`$`): una valigetta con la stretta di mano. Una su una **deviazione** per ognuno dei piani 1–3.
- **HUD:** `Pipeline 1/3`.
- Restano raccolte anche dopo una morte.
- **Il traguardo è la porta del Board dei Partner:** `def.goal = { requiresDeals: 3, label: 'Board dei Partner' }`.
  - Toccandola prima: *"Il Board vuole vedere la pipeline. 2/3 non è una pipeline, è un auspicio."*
  - Non ci sono penalità; il messaggio si ripete solo dopo che ti sei allontanato.
- **Validatore:** ogni `$` è raggiungibile.
- Debug: `deals=3`.

## 6. Finale Partner e scena dei finali (F)

### `scenes/EndingScene.js`
Sostituisce `MvpEndScene` e ne riusa il blocco della leaderboard. Riceve `{ ending: 'partner', levelId, run, gu, guMax }`.

### Finale Partner
1. *"Benvenuto nella partnership."*
2. Dopo 1,5 s: *"Il cliente vuole rifare tutto da capo."*
3. Statistiche e leaderboard.
4. **Spazio:** si ricomincia dal Progetto 1 **vestiti da Partner** (`session.outfitOverride = 'partner'` fino al ricaricamento della pagina). `DEBUG.outfit` ha la precedenza.

Altri dettagli:
- La struttura `ending` è già pronta per la 5B (prodotto, campi) e per il burnout.
- `GameScene.completeLevel` va a `EndingScene` quando non c'è un livello successivo.
- Debug: `ending=partner` apre direttamente la scena, ed entra in `DEBUG.anyOverride`.

## 7. Livello 5 "La Partnership" (G)

- `id: 'level5'`, `name: 'Progetto 5 — La Partnership'`, `career: 'partner'`, `vertical: true`, `rows: 100`, `width: 32`, `startGu: 15` (come i livelli 2–4), team ereditato (minimo 1).
- Niente traguardo che tradisce, niente micromanager (il micromanager sei tu).
- Muri pieni alle colonne 0 e 31.
- I solai dei piani sono **one-way** (`=`): ci si atterra sopra e si attraversano da sotto, con tratti pieni (`#`) dove serve impedire scorciatoie.

| Zona | Righe | Stadio marea | Contenuto |
|---|---|---|---|
| Lobby | 86–99 | — | spawn; cartello *"Partner: finalmente puoi chiedere tu 'hai 5 minuti?'"*; il leccapiedi si presenta; **tappetino** obbligatorio (rise 5) per uscire dalla lobby |
| Piano 1 Delivery | 62–85 | 1 | 2 **lavoratori** (impalcature obbligatorie); slot `replyAll` (pivot: le email fanno da gradini); opportunità 1 su una deviazione; checkpoint `cp1` |
| Piano 2 | 38–61 | 2 | slot `fiveMinutes` (pivot: scorciatoia di mezzo piano); slot `deckCollapse` (pivot: ponte); opportunità 2; checkpoint `cp2` |
| Piano 3 | 14–37 | 3 → 4 | **tappetino** + 1 lavoratore; slot `scopeCreep` (pivot: ponte); opportunità 3; checkpoint `cp3`. Il CEO entra in CC a metà piano |
| Board | 2–13 | ferma | checkpoint `cp4`, porta del Board (3/3) |

Flusso: livello 4 → Lessons Learned 4 → livello 5 → `EndingScene` (Partner).

### Vincoli verificati dai test (mappa ASCII scritta in fase di implementazione)
- Validatore `normal`, con `bounces` ed `extraSurfaces`: spawn → Board e tutti i `$` e i checkpoint raggiungibili, nei **5 casi** di pivot.
- Senza `bounces` **oppure** senza `extraSurfaces`: Board non raggiungibile.
- `longestQuietClimb ≤ 6`.
- Verifica analitica dell'escalation (§2): nessuna presa per un player che sale a ritmo, almeno una per un player lento.
- Il livello 1–4 resta invariato: test esistenti e smoke verdi.

## 8. Cause, narratore, HUD, debug

- **Causa** `escalation` (*"l'escalation"*): non pivotabile; nella Lessons Learned non serve, perché è l'ultimo livello.
- **Narratore:**
  - escalation: partenza, stadi, presa ×3 varianti, stop;
  - leccapiedi: presentazione, tappetino;
  - lavoratore guardato;
  - opportunità;
  - Board chiuso / aperto;
  - finale.
- **HUD:** riga dell'escalation (§2), `Pipeline n/3` sotto il team.
- **Debug:**
  - `level=level5`, `cp=cp1…cp4`, `escalation=off`, `deals=3`, `ending=partner`;
  - `pivot` già esistente;
  - tutti questi parametri entrano in `DEBUG.anyOverride`.

## 9. Rimandato alla 5B (dopo un playtest della 5A)

- **SteerCo**, con le correzioni della review #4: righe a 2 tile, piattaforme one-way, velocità di scorrimento fissa, scatola nera nel validatore.
- **Ambiziosi**, con la review #5: stato `noticed` di 400 ms, o portata 3.
- **Porta Recruiter** con conferma su **↓/S** (review #8) → finale società prodotto.
- **Finestra e scala antincendio** → finale dei campi (pipeline 0/3), con le correzioni della review #9–#10: camera in discesa, marea solo nelle colonne della torre, pianerottoli-checkpoint, archi che attraversano le monete, e "Riprova il Progetto 5" nella scena dei finali.
- **Finale burnout**: arriva con la feature burnout (playbook `burnout`).

## 10. Milestone

| Id | Contenuto | Verifica |
|---|---|---|
| I5-M1 | Altezza variabile, `$`, checkpoint verticali, validatore (`bounces`, `extraSurfaces`, `dist`, righe limitate), `longestQuietClimb`, camera verticale, trigger relativi, delega con la y (§1) | Vitest + build + smoke livelli 1–4 |
| I5-M2 | `torch.js` (micromanager invariato) + lavoratori (§3) | Vitest |
| I5-M3 | Escalation (§2) | Vitest |
| I5-M4 | Leccapiedi e tappetini (§4) | Vitest |
| I5-M5 | Opportunità + porta del Board + `EndingScene` (Partner) (§5–6) | Vitest + build |
| I5-M6 | Livello 5 + flusso + verifica analitica + smoke (§7) | validatore 5 casi + Vitest + smoke |
| I5-M7 | Review del codice (contesto separato) + playtest utente | — |

## 11. Esito della review del piano (`docs/PLAN_REVIEW.md`)

| # | Esito |
|---|---|
| 1 | **Accolto, modificato dall'utente:** presa = −3 GU + 1,2 s di call (non morte). Così la presa non è più un premio |
| 2 | **Accolto:** posizione propria a 1,5 tile dietro, rimbalzo fisso k ≈ 1,22, `jumpCutApplied` |
| 3 | **Accolto:** trampolino solo sui tappetini `b` |
| 4, 5, 8, 9, 10 | **Rimandati alla 5B**, con il fix già scritto in §9 |
| 6 | **Accolto:** torcia attiva anche in aria per i lavoratori, ripresa 800 ms, piattaforme 2×1 esplicite, attesa se la cella è occupata, il lavoro resta |
| 7 | **Accolto:** il leccapiedi non blocca mai |
| 11 | **Accolto:** ordine per y nei livelli verticali, attivazione solo verso l'alto, checkpoint su ogni piano e al Board |
| 12 | **Accolto:** `playerY` / `rangeRows` |
| 13 | **Accolto:** verifica analitica in Vitest invece della corsa registrata |
| 14 | **Accolto:** `lookY` in `updateCamera`, `respawn` con offset |
| 15 | **Accolto:** 5A / 5B (scelta dell'utente); il complimento che blocca è tagliato; torre da 4 zone da 24 righe |
| 16 | **Accolto:** ambiziosi rimandati; il leccapiedi non costa GU |
| 17 | **Rimandato:** il finale burnout arriva con la feature burnout |
| 18 | **Accolto:** `G` = porta del Board con `requiresDeals`; `$` e `b` ASCII; controllo HUD nel validatore |
| 19 | **Accolto:** `entityRows` e definizione di riga attiva in §1 |
| 20 | **Accolto:** righe di ricerca limitate, "5 casi" |
| 21 | **Accolto:** catena del cliente, `ending` negli override, `startGu` 15 come i livelli 2–4. La leaderboard non cambia: il livello 5 si registra come gli altri |

## 12. Stato

- [x] Piano 5A (2026-11-01), review applicata.
- Scostamenti in sviluppo (registrati in DECISIONS): velocità della marea **50 / 60 / 62 / 72** px/s (non 70/80 ai piani alti: la verifica analitica dava prese anche a un player rapido); i lavoratori iniziano a costruire **quando arrivi sul loro piano** (altrimenti finirebbero prima che tu arrivi).
- Verifica: 148 test Vitest (livello 5 valido nei 5 casi di pivot, lavoratori e tappetini obbligatori, verifica analitica della marea), build, `npm run smoke` 74/74 (nuova suite `smoke5.mjs`).
- [x] I5-M1 · [x] I5-M2 · [x] I5-M3 · [x] I5-M4 · [x] I5-M5 · [x] I5-M6 · [ ] I5-M7

# Burnout — piano

Feature a parte (playbook `.claude/skills/burnout/`). Design rivisto con l'utente il 2026-11-01; review in `docs/PLAN_REVIEW.md`, esito in §9.

> *"L'idea è sì avere giornate uomo, ma il burnout deve essere basso."*
> Le **GU** sono quanto costa il progetto al cliente; il **burnout** è quanto costa **a te**.

## 1. Regole

| Regola | Valore |
|---|---|
| Sale con | **morte +0,25%** (anche ↺ ricomincia). **+1%**: presa dell'escalation, junior perso (netto, vedi §4), micromanager che ti becca, "Hai 5 minuti?" che ti ferma, standup che sfora, KT finto, cliente che cambia idea al traguardo. *"Non è morire che ti brucia, è come lavori"* |
| Scende con | caffè −2% (non torna al respawn), KT vero −3% (**una volta per livello**), livello finito senza morti −5% (applicato **sul valore di partenza** del livello dopo, quindi anche sotto il minimo) |
| Tra un livello e l'altro | non si azzera: si trascina |
| Minimo di partenza | livelli 1–5: **0 / 15 / 30 / 45 / 60%**. Si parte da `max(trascinato, minimo)` |
| "Budget sforato" (riprova del livello) | il burnout **non** torna indietro: riparti col valore che avevi quando hai sforato, **compreso** l'evento che ha sforato (sempre ≥ minimo) |
| Morte → checkpoint | il burnout non torna indietro (come le GU) |
| 100% | finale **burnout**, subito, in qualsiasi livello. Se lo stesso evento porta a zero le GU e al 100% il burnout, vince il **burnout** |
| Nuova campagna | (dal finale, o al primo avvio) il burnout torna a 0 |
| Persistenza | `session.burnout`: vive quanto la pagina, niente `localStorage` |
| Costi in GU | invariati: il burnout si **aggiunge**, non sostituisce |

Conti (review #1): con la morte a +1% un giocatore medio (~20 morti a livello) entrava nel livello 5 al 94% e un "Budget sforato" valeva +30%. Con la morte a **+0,25%** (decisione utente) lo stesso giocatore aggiunge ~5% di morti a livello più gli eventi sociali: i minimi tornano a contare e uno sforamento vale ~+7,5%. Il burnout lo fanno salire soprattutto gli eventi "sociali". Taratura fine: dopo il playtest, dall'utente.

Il valore è decimale (passi da 0,25); a schermo si mostra arrotondato all'intero.

## 2. Logica pura — `src/core/Burnout.js` (test Vitest)

```js
export default class Burnout {
  constructor(value = 0)            // clamp 0..100
  get value()                        // 0..100, multipli di 0,25 (arrotondato a 2 decimali)
  get isOver()                       // value >= 100
  get tier()                         // 0 (<50), 1 (>=50), 2 (>=80) — per il personaggio stanco
  add(cause, amount)                 // → { delta, value, over }; ignora amount <= 0; clamp a 100
  relieve(reason, amount)            // → { delta, value }; clamp a 0
  startLevel(levelIndex, minimums)   // value = max(value, minimums[levelIndex] ?? last); → { value, raisedBy }
}
```
`cause`/`reason` non cambiano il calcolo: servono solo per l'evento e per eventuali statistiche.

### Costanti — `src/config/constants.js`
```js
export const BURNOUT = {
  levelMin: [0, 15, 30, 45, 60],
  gain: { death: 0.25, escalation: 1, teamLoss: 1, micromanager: 1, fiveMinutes: 1, standupOverrun: 1, fakeKT: 1, clientSwitch: 1 },
  relief: { coffee: 2, realKT: 3, cleanLevel: 5 },
};
// max (100) e soglie del personaggio (50, 80) stanno in core/Burnout.js: BURNOUT_MAX, BURNOUT_TIERS
```

### Test
- `add` somma e satura a 100, `over` diventa true esattamente a 100.
- `relieve` non scende sotto 0.
- `startLevel`: alza al minimo, non abbassa un valore più alto; indice oltre la tabella → ultimo minimo.
- `tier` alle soglie 49/50/79/80.

## 3. Stato e ciclo di vita

- `src/state.js`: `session.burnout = null` (null = nessuna campagna ancora).
- `GameScene.init(data)`: `this.retry = data?.retry === true` (come `levelId`/`pivotCause`).
- `GameScene.create()` — un solo `const newCampaign = this.levelId === LEVEL_ORDER[0] && !this.retry`, usato sia per `session.team` sia per il burnout (review #9):
  - `newCampaign` → `session.burnout = 0`;
  - `session.burnout === null` (primo avvio, anche da `?level=…`) → `session.burnout = DEBUG.burnout ?? 0`: **il debug vale una sola volta** (review #4);
  - `this.burnout = new Burnout(session.burnout)`, poi `startLevel(LEVEL_ORDER.indexOf(levelId), BURNOUT.levelMin)`;
  - se `session.burnoutCleanBonus` → `relieve('cleanLevel')` e azzera il flag (review #12; mai su un retry);
  - salva in `session.burnout`.
- `BudgetOverScene` passa `retry: true` a `GameScene` (così riprovare il livello 1 non azzera il burnout).
- Ogni variazione aggiorna `session.burnout` ed emette `EV.BURNOUT_CHANGED { value, delta, reason, tier }`. `emitSnapshot` lo riemette.
- Avvio diretto da debug (`?level=level5`): parte dal minimo del livello (60).
- Debug: `?burnout=N` (1–100, valore iniziale al primo `create`, entra in `DEBUG.anyOverride`), `?ending=burnout` (`DEBUG.ending` accetta `'partner'` e `'burnout'`).
- Narratore `burnoutHigh`: una volta per livello, al passaggio al tier 2 **o** all'inizio del livello se si entra già al tier 2 (review #13).

## 4. Punti di aggancio

Un solo metodo in `GameScene`, come `spendGu`:
```js
// Single entry point for burnout gains. Returns true if it ended the campaign.
addBurnout(cause) { if (DEBUG.god || this.ended) return false; … if over → this.burnoutOver(); return true }
relieveBurnout(reason) { if (this.ended) return; … }   // anche in god mode: non può far finire nulla
```

| Evento | Dove | Chiamata |
|---|---|---|
| Morte (tutte le cause, anche `selfRestart`) | `GameScene.die`, **prima** di `spendGu` | `if (this.addBurnout('death')) return;` |
| Presa escalation | `Escalation.update`, `catch`, prima di `spendGu` | `if (scene.addBurnout('escalation')) return;` |
| Junior perso (netto) | al checkpoint (prima di `team.snapshot()`) e in `completeLevel`: `max(0, savedCount − count)` | `addBurnout('teamLoss', n)` |
| Micromanager ti becca | `Micromanager.update`, case `'catch'`, prima di `spendGu` | `if (scene.addBurnout('micromanager')) return;` |
| "Hai 5 minuti?" | `FiveMinutesDoor.update`, case `'hook'`, prima di `spendGu` | `if (scene.addBurnout('fiveMinutes')) return;` |
| KT finto | `FakeKT`, prima di `spendGu(fakeKtCost)` | `if (scene.addBurnout('fakeKT')) return;` |
| Cliente cambia idea | `Goal`, prima di `spendGu(CLIENT_COST)` | `if (scene.addBurnout('clientSwitch')) return;` |
| Standup che sfora | `GameScene.handleSchedule`, `start` con `ev.overrun` | `addBurnout('standupOverrun')` |
| Caffè | overlap del caffè | `relieveBurnout('coffee')` |
| KT vero | `FakeKT`, dove dà `realKtBonus` | `relieveBurnout('realKT')`, una volta per livello (`this.relievedOnce`, non azzerato da `respawn`) — review #2 |
| Livello senza morti | `completeLevel`, se `run.deaths === 0` e c'è un livello dopo | `session.burnoutCleanBonus = true` (applicato dopo `startLevel` del livello dopo) |

Junior (review #5): contare in `Team.lose` costava +1 a ogni giro morte → `restore` e non vedeva le deleghe al micromanager/approval gate. Il conteggio netto al checkpoint e a fine livello copre tutte le vie (trappole, delega, rivale) e non conta i junior restituiti dal respawn. `addBurnout(cause, amount = BURNOUT.gain[cause])`.

`burnoutOver()`: `if (this.ended) return;` poi `endLevel()`, narratore `burnoutOver`, nuovo `EV.BURNOUT_OVER` (l'HUD si nasconde come con `BUDGET_OVER`), poi `fadeTo('EndingScene', { ending: 'burnout', levelId, run, gu, guMax })`. **Non** chiama `stats.failRun()` (non è uno sforamento) e non entra in classifica (review #3, #7).

Nella morte il gancio va prima del `floatText` delle GU: se la morte chiude la campagna non compare "-0,5 GU".

## 5. Finale burnout = "i campi" — `EndingScene` (segnaposto)

Decisione utente (2026-11-01): al 100% **molli tutto e fai il contadino**. È lo stesso finale dei "campi": ai campi si arriva con il burnout, non più con la scala antincendio del livello 5 (ITERATION_5 §9).
- Il **livello extra "Il contadino"** si fa dopo, con un brainstorming a parte. Tono: rilassante e ironico. Niente trappole, GU, standup né burnout: campi, galline, tramonto, ma il telefono ogni tanto vibra ("Hai 5 minuti?").
- **Per ora** c'è un segnaposto: una nuova voce in `ENDINGS`.

```js
burnout: {
  title: 'Burnout.',
  color: '#86efac',
  after: 'Hai mollato tutto. Ora fai il contadino.\n(Il livello dei campi arriverà presto. Le galline sono in onboarding.)',
  restart: 'per ricominciare dal Progetto 1 (da junior, riposato)',
  outfit: null,
},
```
- Riga statistiche in più: `Burnout: 100% al Progetto N`.
- Il ricomincio azzera `session.outfitOverride` (null) e il burnout (nuova campagna).
- Testi del narratore: `burnoutOver` (2–3 righe), `burnoutHigh` (una volta a livello, al passaggio del tier 2).
- Quando ci sarà il livello contadino: `burnoutOver()` andrà al livello `farm` invece che a `EndingScene`, e la scena del finale arriverà alla fine di quel livello.

## 6. HUD e personaggio

### HUD (`UIScene`)
(HUD = le informazioni fisse a schermo: barra GU, orologio, morti…)
- Barretta **sotto la barra GU** a y=34 (3 px di stacco), 200 × 6 px, con sfondo `0x111827` e bordo come la barra GU: visibile anche a 0% (review #10).
- Colore: giallo < 50%, arancio 50–79%, rosso ≥ 80% (lampeggia ≥ 90%).
- Il valore sta nella riga GU, alla stessa dimensione (leggibile anche su telefono): `GU residue: 12 / 15 · Burnout 23%`. La riga scende a y=44; level, team e deals scendono di 10 px.
- Variazione: la riga GU lampeggia di arancio (salita) o verde (discesa) per 400 ms.
- Il toast resta a y=44 al centro ma con `wordWrap` 440 px, per non coprire le righe di sinistra.

### Personaggio stanco (`PlayerView`, solo vista, hitbox invariata)
- Le occhiaie sono **varianti della texture** (review #11): `makePlayerSheet` accetta `eyebags: 1 | 2` e genera `player_${outfit}_t1` e `_t2`; `PlayerView.setTier(tier)` cambia `this.key`.
- Tier 1 (≥ 50%): occhiaie.
- Tier 2 (≥ 80%): occhiaie più scure + postura **curva**: `restSy = 0.95` e `restTilt = 4° × (flipX ? -1 : 1)` a terra e da fermo, usati al posto di 1 e 0 nell'interpolazione. Tremolio ±0,5 px in idle (sinusoidale, deterministico) sommato alla posizione **dopo** l'interpolazione.
- Il tier si aggiorna su `EV.BURNOUT_CHANGED` (GameScene chiama `playerView.setTier`). Gli outfit non cambiano.

### Lessons Learned
- Nuovo punto con il motivo: `Burnout: 23% → il Progetto 3 parte dal 30% (minimo del progetto)`, oppure `parte dal 41%`, oppure `parte dal 25% (−5%: progetto senza morti)`. Calcolato con la stessa logica di `create` (funzione pura `nextStart` in `core/Burnout.js`).

## 7. Milestone

- [x] **B-M1** `core/Burnout.js` + test + `BURNOUT` in constants + `session.burnout` + debug `burnout`/`ending=burnout`.
- [x] **B-M2** Agganci (tabella §4), `retry` da BudgetOver, `EV.BURNOUT_CHANGED`, `burnoutOver` + finale burnout in `EndingScene` + righe narratore.
- [x] **B-M3** HUD (barretta, etichetta, delta), riga in Lessons Learned, personaggio stanco (tier 1 e 2).
- [x] **B-M4** Smoke: `?burnout=99.75` + una morte → `EndingScene` burnout (una sola scena); caffè scende; KT vero preso due volte = un solo −3; retry da Budget sforato non azzera (compreso l'ultimo evento); nuova campagna dal finale riparte da 0 (il debug non si riapplica); schermate con tier 2 a 960×540 e con toast lungo.

Criteri: `npm test`, `npm run build`, `npm run smoke` senza errori in console. Playtest utente per taratura e leggibilità.

## 8. Fuori scope (dopo il playtest)
- Taratura dei valori (decide l'utente).
- Il livello extra "Il contadino" (i campi): brainstorming a parte.
- Burnout nelle statistiche persistenti o in classifica.

## 9. Esito della review (`docs/PLAN_REVIEW.md`)

| # | Esito |
|---|---|
| 1 | **Accolto, scelta dell'utente:** la morte vale +0,25%, gli eventi sociali +1% |
| 2 | Accolto: KT vero una volta per livello (il +1 GU farmabile resta, fuori scope) |
| 3 | Accolto: guardie `this.ended`, −5% registrato prima di `endLevel` |
| 4 | Accolto: `?burnout` solo al primo `create`; `ending=burnout` ammesso |
| 5 | Accolto: junior persi contati al netto, al checkpoint e a fine livello |
| 6 | Accolto: `return` dopo i ganci, citati per `case` |
| 7 | Accolto: `EV.BURNOUT_OVER`, niente `failRun` |
| 8 | Accolto: "compreso l'evento che ha sforato" |
| 9 | Accolto: `retry` in `init`, un solo `newCampaign` |
| 10 | Accolto: barretta 200×6 con sfondo a y=34, valore nella riga GU, righe −10 px, toast più stretto |
| 11 | Accolto: varianti di texture, `restSy`/`restTilt`, tremolio dopo l'interpolazione |
| 12 | Accolto: −5% applicato sul valore di partenza del livello dopo (mai su un retry) |
| 13 | Accolto: `burnoutHigh` anche entrando già al tier 2 |
| 14 | Accolto in parte: KT finto e cliente che cambia idea +1%; lo standup resta com'è |

## 10. Stato
- [x] B-M1…B-M4 sviluppati (2026-11-01): 162 test Vitest, `npm run smoke` 88/88 (9 controlli nuovi in `scripts/smoke/smokeBurnout.mjs`).
- Scostamenti: a schermo il valore è arrotondato **per difetto** (99,75% mostra 99%: il 100% compare solo col finale). Il debug `?burnout=N` vale solo al primo livello della pagina; un ricomincio dopo un finale riparte da 0.
- In attesa: review del codice (contesto separato) e playtest dell'utente.

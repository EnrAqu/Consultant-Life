# Il contadino — livello extra dopo il burnout

Il livello dei "campi": ci si arriva solo con il burnout al 100% (`docs/BURNOUT.md` §5, `DECISIONS.md` 2026-11-01).
Sostituisce la schermata segnaposto ("Le galline sono in onboarding").

## 1. Scelte dell'utente (2026-11-02)
| Domanda | Scelta |
|---|---|
| Cosa fa il giocatore | **Faccende + tramonto**: livello orizzontale corto (~15 s di corsa, ~30 s con le faccende); raccogli uova e ortaggi (facoltativi, contati a fine livello), poi ti siedi sulla panchina al tramonto e parte il finale |
| Il telefono | **Ignora o butta**: vibra a orari fissi con messaggi ironici dall'ex ufficio e si ignora senza conseguenze; allo stagno lo puoi buttare (una riga in più nel finale) |
| Morte | **Mai**: niente burroni né pericoli; terreno continuo, balle di fieno facoltative da saltare |
| Finale | **Finale burnout rivisto**: la schermata burnout di `EndingScene` con un testo vero e le statistiche del contadino |

Tono: rilassante e ironico. Niente trappole, GU, standup, burnout, narratore né classifica.

## 2. Architettura
Una **scena a parte**, non un livello di `GameScene`: così GU, standup, burnout, morte e pivot restano fuori per costruzione.
- `src/levels/farm.js` — definizione (stesso formato dei livelli: `map` ASCII + `entities`). **Non** sta in `LEVELS`/`LEVEL_ORDER`: niente Lessons Learned, classifica, validatore dei pivot né `projectNumber`.
- `src/core/FarmDay.js` — logica pura (Vitest): conteggio faccende, telefono a orari fissi, buttare il telefono, riepilogo, colore del cielo, testi del finale.
- `src/data/farm.js` — messaggi del telefono (ordine fisso) e messaggio finale.
- `src/scenes/FarmScene.js` — mondo: tile, sfondo, sole, galline, faccende, stagno, panchina, giocatore (`Player` + `PlayerView` con outfit `farmer`).
- `src/scenes/FarmHudScene.js` — HUD (modello *pull*: legge `FarmScene.day` a ogni frame): contatori, notifica del telefono, cartello d'apertura, suggerimento allo stagno, "Fine giornata.".
- `sceneUtils.buildTileLayers(scene, tiles, hdKey, frameOf)` — estratto da `GameScene.buildTilemap` (strato di collisione invisibile + strato HD), riusato dalle due scene.

### Flusso
1. `GameScene.burnoutOver()`: come oggi (narratore `burnoutOver`, `EV.BURNOUT_OVER`), ma va a `FarmScene` con `{ from: { levelId, run: { ...run }, gu, guMax } }` invece che a `EndingScene`.
2. `FarmScene.create`: mette a dormire `UIScene` (`scene.sleep`), lancia `FarmHudScene`, mostra i controlli touch. `GameScene.create` risveglia `UIScene` se dorme (nuova campagna dal finale).
3. Panchina (`G`): input bloccato, il giocatore si ferma alla panchina, `day.finish()`, tramonto di `FARM.sunsetMs`, poi `fadeTo('EndingScene', { ending: 'burnout', ...from, farm: summary })`.
4. Il ricomincio dal finale funziona come oggi: Progetto 1, burnout 0, outfit di carriera.

### Debug
- `?debug=1&level=farm` parte dalla fattoria (`from` finto: Progetto 5, 0 morti). `DEBUG.level` accetta `farm`; conta già come override.
- `?ending=burnout` resta (finale senza statistiche della fattoria).

## 3. Mappa (`src/levels/farm.js`, 130 colonne)
Terreno continuo (righe 15–16) su tutte le colonne: **non si può cadere**. Le pile di fieno sono alte al massimo 2 tile (salto ≈ 620²/(2·1800) = 107 px ≈ 3,3 tile).

```
   0         10        20        30        40        50        60        70        80        90        100       110       120
12 ........................e...........................................v.............................................................
13 ........................##....e.......e..................v..........##............................................................
14 ..P...............e.....##....#...e..##.......v....v....###.........###...................##................................G.....
15 ##################################################################################################################################
```
(e = uovo, v = ortaggio; stagno 103–109 disegnato sul terreno, zona 101–111; spaventapasseri a col 84)
- **S0 Cascina** (0–14): spawn a col 2. Cartello: "Cascina. Wi-Fi: assente. Riunioni in calendario: 0."
- **S1 Pollaio** (15–41): 3 galline, 5 uova: (18,14), (24,12) sulla pila 24–25 alta 2, (30,13) sulla balla 30, (34,14), (38,13) sulla balla 37–38. Cartello: "Pollaio. Le galline non fanno standup."
- **S2 Orto** (42–75): 4 ortaggi: pomodoro (46,14), carota (51,14), zucchina (57,13) sull'aiuola 56–58, pomodoro (68,12) sulla pila 68–69 alta 2 (gradino a 70). Cartello: "Orto. Nessun KPI. Cresce lo stesso."
- **S3 Sentiero** (76–100): spaventapasseri vestito da Partner a col 84 ("Spaventapasseri. Ex Partner. Spaventa ancora."), balla 90–91.
- **S4 Stagno** (101–111): acqua disegnata sopra il terreno (solo grafica, 103–109). Zona per buttare il telefono: colonne 101–111. Cartello: "Stagno. Profondo quanto basta per un telefono."
- **S5 Panchina** (120–129): `G` a col 124 = panchina. Cartello: "Panchina. Prenotabile senza Outlook."

Entità: `sign` (testo), `chicken` (`range` in tile, `periodMs`, `phase`), `egg`, `veg` (`kind`: `tomato` | `carrot` | `zucchina`), `scarecrow`, `coop`, `pond` (`x`, `w`, `zoneFrom`, `zoneTo`).

## 4. Logica pura — `src/core/FarmDay.js`
```js
export default class FarmDay {
  constructor({ eggsTotal, vegTotal, messages, firstMs, intervalMs, finalMessage })
  start()            // al primo movimento: da qui parte l'orologio del telefono
  update(dt)         // → il messaggio da mostrare ora, o null. Uno alla volta; a orari fissi:
                     //   firstMs, firstMs + intervalMs, … (ciclo sui messaggi, in ordine). Niente se il telefono
                     //   è nello stagno, se la giornata è finita o prima di start()
  collect(kind)      // 'egg' | 'veg'
  throwPhone()       // true la prima volta, poi false
  finish()           // → riepilogo { eggs, eggsTotal, veg, vegTotal, received, phoneThrown, lastMessage }
                     //   se il telefono è ancora in tasca arriva un ultimo messaggio (lastMessage, received + 1)
}
export function progress(x, from, to)       // 0..1, limitato
export const SKY                            // colori: afternoon, golden, sunset, night
export function skyColor(t)                 // pomeriggio → oro (interi 0xRRGGBB), mentre cammini
export function sunsetColor(t)              // oro → viola → notte, sulla panchina
export function farmEndingText(summary)     // { after, stats } per EndingScene
```
Costanti in `constants.js`: `FARM = { phoneFirstMs: 2500, phoneIntervalMs: 4500, notificationMs: 3500, sunsetMs: 3200 }` (ritarati dopo la review #2: il livello dura ~15 s di corsa, ~30 s con le faccende; prima erano 4000/8000 e si vedevano 2–4 messaggi su 8).

Messaggi (ordine fisso, `src/data/farm.js`):
1. Marco (ex team): Hai 5 minuti?
2. Calendario: Daily standup tra 3 minuti
3. Il Cliente: Una domanda veloce veloce
4. HR: Ricordati il timesheet di ottobre
5. Partner: Ti giro una cosa. Niente di urgente. URGENTE.
6. Il Cliente: E chi è mo questo? (Ah, sei tu.)
7. Recruiter: Opportunità imperdibile come Senior Consultant
8. Teams: Sei stato aggiunto a "Allineamento sull'allineamento"

Messaggio finale (se il telefono è in tasca): "Partner: Domani alle 8 call di allineamento?"

Testi del finale (`farmEndingText`):
- `after`: "Hai mollato tutto. Ora fai il contadino." + seconda riga: telefono buttato → "Il telefono è nello stagno. Le rane non fanno call." / in tasca → "Il telefono è ancora in tasca. Vibra."
- `stats`: "Uova: 4/5 · Ortaggi: 3/4 · Notifiche ignorate: 6" (con il telefono buttato: "… · Telefono: nello stagno").
- Senza riepilogo (debug `?ending=burnout`): solo "Hai mollato tutto. Ora fai il contadino."

## 5. Scena — `FarmScene`
- Tile della fattoria (`tilesFarmHD`): terra, terra con erba, fieno (i solidi sopra la riga 15 sono fieno).
- Cielo: `camera.setBackgroundColor(skyColor(progress))` da col 2 a col 124; sole (`scrollFactor 0`) che scende con il progresso; colline (`bgHills`, tileSprite con parallasse 0,3) davanti al sole.
- Galline: posizione `x0 + sin(2π·t/periodMs + phase)·range` (deterministica), girate nel verso del moto, nessun corpo.
- Uova e ortaggi: immagini statiche con overlap; al tocco `day.collect`, testo fluttuante "+1 uovo".
- Telefono: quando `day.update` dà un messaggio, l'HUD mostra la notifica per `notificationMs` e sopra il giocatore compare "bzz bzz".
- Stagno: nella zona, tasto **E** (o Shift, o il tasto touch "E", evidenziato) butta il telefono: arco del telefono (tween estetico), schizzo, "blub.". Una volta sola; la notifica a schermo sparisce.
- Panchina: overlap con il `G` → sequenza di fine (giocatore fermo davanti alla panchina: con il telefono in tasca legge l'ultimo messaggio in posa "telefono", senza guarda il tramonto; "Fine giornata.", tramonto con tween del cielo e del sole, poi il finale).
- `R` non fa niente (non c'è niente da ricominciare). Nessun `die`: il giocatore non può uscire dal mondo (bordi laterali solidi, terreno continuo).

## 6. Milestone
- [x] **F-M1** `core/FarmDay.js` + `data/farm.js` + `FARM` in constants + test (`tests/Farm.test.js`: telefono, faccende, riepilogo, testi, cielo; mappa: terreno continuo, nessuna spina, pile ≤ 2, faccende raggiungibili e contate).
- [x] **F-M2** `FarmScene` + `FarmHudScene` + texture + `buildTileLayers`; `burnoutOver` → fattoria; `EndingScene` con i testi veri; debug `level=farm`.
- [x] **F-M3** Smoke `smokeFarm.mjs` (e `smokeBurnout.mjs` aggiornato): burnout al 100% → `FarmScene` (UIScene dorme, niente GU); uovo raccolto; notifica arrivata; telefono buttato allo stagno; panchina → `EndingScene` con le righe della fattoria; Spazio → Progetto 1 allo 0% con l'HUD di nuovo visibile; screenshot.

Criteri: `npm test`, `npm run build`, `npm run smoke` senza errori in console. Playtest utente: ritmo dei messaggi, leggibilità, tono.

## 7. Dopo (backlog)
- Musica/uccellini (non c'è audio nel gioco).
- Varianti del finale in base alle faccende (tutte le uova, nessuna…).

## 8. Esito della review (`docs/CODE_REVIEW_FARM.md`)
- **#1 bordo della notifica** — accolto: `setSize` al posto di `.height`.
- **#2 ritmo del telefono** — accolto: primo messaggio a 2,5 s, poi ogni 4,5 s (da confermare al playtest).
- **#3 `UIScene` addormentata con i timer congelati** — accolto: `hideAll` tiene il suo timer e `onLevelStart` lo annulla; al risveglio si azzerano narratore e toast; `smokeBurnout` controlla l'HUD visibile dopo il percorso reale.
- Minori accolti: testi fluttuanti con contorno; schizzo più corto; HUD della fattoria con dissolvenza; niente scatto laterale sulla panchina; mappa ASCII e `sunsetColor`/`SKY` nel piano.
- Lasciati: tasto touch ↺ visibile ma inattivo, si cammina sull'acqua dello stagno (è grafica sul terreno), GU nel finale del debug `?level=farm`, smoke per posa del telefono / Shift / "E" touch.

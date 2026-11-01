# Code review — Livello 1 "più difficile, da junior" (2026-11-02)

Oggetto: diff non committato (`git diff` + `tests/causes.test.js`), scheda e registro 2026-11-02 in `docs/LEVELS.md`, `src/levels/level1.js`.
Verifiche eseguite: `npm test` → 19 file, 165 test verdi; `npm run build` → ok. `npm run smoke` **non** eseguito (porta 4173 occupata da un altro processo): il "7/7" della sezione 1c nel registro non è verificato da questa review.

Conti fatti con `GRAVITY 1800`, `fallGravityExtra 700`, `jumpVelocity 620` (salto max ≈ 107 px, ~0,71 s in aria scendendo di 2 righe), `maxRunSpeed 260`, `groundDecel 3000` (frenata ≈ 11 px), corpo del giocatore 18×28, hitbox letale delle email 36×20, slide 64×32, vista del mondo 768×432 con look-ahead 70 px.

## Problemi

1. **Importante — smoke 1c (a) passa per il motivo sbagliato (`ra1b`)**
   - **Dove:** `scripts/smoke/smoke.mjs` sezione 1c, check "running out of the first corridor…"; `level1.js` `ra1b`.
   - **Problema:** il check tiene premuto solo → senza saltare. Il muro della sporgenza a col 55 (2 righe) ferma il giocatore a col 54, cioè **fermo sotto** le email di `ra1b` (col 52–54): muore chiunque stia lì, corra o no. Il vero "chi corre" salta sulla sporgenza. Dai conti, chi stacca intorno a col 52,3–52,6 passa sopra l'email 0 (col 53) con 1–3 px di margine, poi l'email 1 (col 54) è già sotto di lui. Quindi "chi ha aspettato la prima valanga riparte di corsa e viene preso" (registro) non è garantito: dipende dal punto di stacco. Non è ingiusto per il giocatore, ma la frase della scheda e lo smoke non dimostrano il tradimento.
   - **Fix proposto:** nello smoke, correre da col 41 (dopo `ra1` esaurita) e saltare a col 51, 52 e 53 (tre casi), poi controllare la morte. Se uno dei tre sopravvive, anticipare la coda (es. `startDelayMs` negativo non esiste: usare `columns: [2,1,0,…]` oppure `triggerDx: -3`) finché tutti e tre muoiono. In alternativa, correggere la scheda: "chi corre *probabilmente* viene preso".

2. **Importante — smoke 1c (e) non verifica la vera uscita dalla tempesta (`ra4` + `sc3` + `dk2`)**
   - **Dove:** smoke 1c, check "after waiting out the storm the CR step is safe".
   - **Problema:** il check teletrasporta a col 177, **fuori** dal trigger del fix (col 174–176), quindi `sc3` non si arma mai: `deaths === 0` è vero comunque. Il percorso vero dopo la tempesta è più stretto:
     - salire sul gradino (il blocco del fix a col 173 ha la cima a 96 px dal pavimento, salto max 107 px);
     - attraversare il trigger: a velocità piena resti sopra il trigger ~0,44 s, più dei 250 ms di armamento, quindi il fix parte sempre e ti insegue;
     - saltare il burrone 179–181 **e atterrare a col 182–183** (finestra di 64 px), perché un salto pieno da col 178 atterra a ~col 184,8, sul trigger di `dk2`.

     Questa catena di precisione, la più difficile del livello, non è coperta da nessun check.
   - **Fix proposto:** check che parte da col 170 dopo 1,8 s, salta sul gradino, corre e salta con salto corto (rilascio subito), poi `deaths === 0` e `dk2` ancora `idle`. Un secondo check: salto pieno → `dk2` scatta, inversione a sinistra entro 0,5 s → nessuna morte (dai conti `dk2` lascia ~0,8 s: è giusto, va solo dimostrato).

3. **Importante — il finale è una catena lunga senza checkpoint (rischio di design, da decidere con l'utente)**
   - **Dove:** `level1.js` S5–S7; `docs/DECISIONS.md` 2026-10-31 ("un checkpoint vero nel livello 1").
   - **Problema:** da cp0 (col 95) al traguardo ci sono 8 incontri letali (dk1, ra2, sc2, ra3 + salto di 4, ra4, sc3, dk2), e i 3 nuovi e più tecnici sono tutti in fondo. Ogni morte a `dk2` rifà mezzo livello. Con 20 GU e 0,5 GU a morte restano 40 morti. In più il burnout sale dell'1% a morte e **si porta avanti** (`nextStart`), quindi un livello 1 più mortale peggiora tutta la campagna. Non contraddice le decisioni (stessa lunghezza, 20 GU), ma l'effetto sul burnout non è citato nel registro.
   - **Fix proposto:** chiedere all'utente se aggiungere un cp1 dopo `sc2` (col ~147) o alzare `startGu`. In ogni caso, annotare nel registro l'effetto sul burnout e misurarlo al prossimo playtest.

4. **Importante — narratore: le frasi `junior_*` pareggiano con quelle "minSpot"**
   - **Dove:** `src/data/narratorLines.js` righe `junior_*`; `src/core/Narrator.js` (`WEIGHTS = { runDeathsExact: 3, minSpot: 2 }`).
   - **Problema:** `{ cause, levelId }` vale 2, quanto `minSpot: 3`. Prima, nel livello 1, le frasi "È la Nª volta che muori esattamente qui" vincevano sempre sulle frasi per causa (1). Ora entrano nello stesso pool delle `junior_*`: escono circa 3 volte su 5, e il filtro della storia le alterna. È proprio il commento che serve a chi è bloccato su `ra4`/`dk2`. `runDeathsExact` (3) vince ancora.
   - **Fix proposto:** `WEIGHTS = { runDeathsExact: 4, minSpot: 3 }`, più un test in `tests/Narrator.test.js` con le `NARRATOR_LINES` vere: livello 1, `cause: 'replyAll'`, `spotCount: 3` → esce una frase spot; `runDeaths: 5` → esce `ms_5`.

5. **Importante — i cartelli bugiardi coprono indizi e piattaforme (da verificare con screenshot)**
   - **Dove:** `level1.js` `sign3` (58,12) e `sign4` (81,13); il rendering dei cartelli in `GameScene` (testo 12 px, padding 6, `DEPTH.objects` sopra i tile).
   - **Problema** (larghezze stimate a ~6,3 px per carattere):
     - `sign4` è largo ~240 px, va da col 81 a ~88,5 con y 384–408 e copre la scrivania one-way 85–89 (riga 12), cioè la piattaforma accanto al caffè (col 85) e al KT finto (col 88);
     - `sign3` è largo ~340 px, va da col 58 a ~68,7 con y 352–376. Sta sulla stessa riga dell'etichetta "Fix #47 (codice di Marco)" (x ≈ 1700–1852, y ≈ 362–378), attaccato a lei, e si legge come un'unica frase. Inoltre copre l'aria sopra il burrone 61–64.

     L'indizio del fix (etichetta) perde leggibilità proprio dove il cartello invita a fermarsi.
   - **Fix proposto:** `sign4` a col 74–75 (riga 14), prima delle scrivanie, oppure testo su due righe. `sign3` una riga più su (y 11) o testo più corto ("Il codice di Marco regge. — senior"). Controllare lo screenshot di entrambi.

6. **Minore — etichetta "Fix #47 (codice di Marco)" troppo lunga e ripetuta**
   - **Dove:** `ScopeCreepPlatform.js` (etichetta junior).
   - **Problema:** ~150 px contro i ~40 px di "CR #47". Su `sc2` (col 143, verso sinistra) finisce sopra il muro 144–146. Su `sc1` tocca `sign3` (punto 5). Tutti e tre i fix si chiamano #47.
   - **Fix proposto:** "Fix #47" su una riga più un sottotitolo più piccolo "codice di Marco", oppure numeri diversi da un parametro dell'entità (`label`).

7. **Minore — i punti sicuri indicati sono sicuri solo in parte (hitbox email 36 px su colonne da 32)**
   - **Dove:** `ReplyAllAvalanche.setHitbox` ('lethal' 36×20); registro ("chi si ferma sul suo innesco (col 50) non viene colpito").
   - **Problema:** l'hitbox entra di 2 px nelle colonne vicine. Chi aspetta `ra1b` a col 51 o `ra3` a col 155 è sicuro solo se il bordo destro del corpo resta a sinistra di x = 1662 (o x = 4990). L'ombra mostra la colonna, non i 2 px in più. Era già così prima, ma ora "aspettare accanto alla colonna" è la soluzione di due trappole.
   - **Fix proposto:** hitbox letale larga 30 px (dentro la colonna), oppure indicare nella scheda "aspetta una colonna prima".

8. **Minore — il margine per uccidere chi corre è sottile (`dk2`, `ra3`)**
   - **Dove:** `dk2` (`wobbleMs 350`, `dropIntervalMs 120`), `ra3` (`intervalMs 120`).
   - **Problema:** chi corre al traguardo muore sotto la prima slide (col 188–189), che uccide tra ~725 e ~787 ms dall'innesco. In quel momento chi corre è sovrapposto alla slide di 21 px, che scendono a 5 px a fine finestra. Le email di `ra3` avanzano a 267 px/s contro i 260 del giocatore, con margini di 14–17 px. Oggi è deterministico, ma basta un ritocco a `PLAYER.maxRunSpeed` o ai tempi per ribaltare lo smoke (f)/(c) senza che nessuno se ne accorga.
   - **Fix proposto:** un test Vitest puro sui tempi (vedi 9) che fissi questi margini, oppure margini più larghi (es. `wobbleMs 300`).

9. **Minore — mancano test unitari per i nuovi comportamenti**
   - **Dove:** `tests/causes.test.js` (solo stringhe), `tests/LevelParser.test.js`.
   - **Problema:** i numeri della scheda (ra4 letale da 0,5 a 1,7 s; pila di `dk2` alta 2 righe, quindi 64 px < 107 px di salto; `ra3` che insegue) sono verificati solo a mano o dallo smoke. Il validatore e la regola dei 12 tratti passano, ma non sanno nulla delle trappole a tempo.
   - **Fix proposto:** estrarre in `src/core/` un helper puro `replyAllWindows(params)`, riusato da `logImpacts`, e testare le finestre di `ra1b`/`ra3`/`ra4`. Testare anche l'altezza della pila di `dk2` (righe distinte dei `targets` × 32 ≤ salto massimo).

10. **Minore — `causeLabel` nel contesto della morte non serve**
    - **Dove:** `GameScene.die()`.
    - **Problema:** nessuna frase usa `{causeLabel}`, quindi il cambio non ha effetto visibile, al contrario di quanto suggerisce la descrizione ("GameScene death narration").
    - **Fix proposto:** lasciarlo (è innocuo) ma non contarlo come copertura della skin, oppure toglierlo.

11. **Nota (nessuna azione) — il pivot del livello 2 usa l'etichetta standard**
    - **Dove:** `GameScene` riga 131 (`CAUSES[this.pivotCause]?.label`).
    - **Problema:** nel livello 2 il narratore dirà "Su le email in 'Rispondi a tutti'". Non è un'incoerenza: la lezione junior dice proprio "Da consulente i ticket diventano email", e il livello 2 mostra email. Usare l'etichetta junior lì sarebbe **sbagliato**.
    - **Fix proposto:** nessuno. Al massimo un commento nel codice che spieghi perché lì non si usa `causeLabel(…, skin)`.

## Regressioni livelli 2–5
Nessuna trovata:
- `this.def` è assegnato prima di `buildTraps`;
- senza skin `scene.def?.skin` dà `undefined` e restano le texture standard;
- `LEVELS[levelId]?.skin` in LessonsLearned e BudgetOver ha `levelId` sempre passato;
- le nuove texture vengono generate sempre ma costano poco;
- gli smoke esistenti al traguardo (teletrasporto a col 189 / `goal.x - 40`) saltano il trigger di `dk2` e restano validi;
- test e build sono verdi.

## Riassunto
- Le nuove trappole sono deterministiche e, dai conti, sopravvivibili: `ra1b` (fermarsi a col 50), `ra3` (fermarsi a col 154–155 per ~0,9 s), `ra4` (aspettare ~1,7 s sul pavimento 170–172), `dk2` (atterrare a 182–183, oppure invertire entro ~0,8 s); la pila di 2 righe (64 px) si scala (salto 107 px).
- Gli indizi (contatori, file .docx, etichetta del fix) entrano nell'inquadratura 768×432 in tempo.
- Il reset al respawn va: `respawn()` resetta tutte le trappole.
- **Importanti:**
  - lo smoke 1c dimostra meno di quanto dichiara: (a) passa perché il giocatore non salta; (e) evita il trigger del fix; la catena reale ra4 → sc3 → atterraggio corto prima di dk2 non è testata (1, 2);
  - le frasi `junior_*` pareggiano con "minSpot" e diluiscono il commento "muori sempre qui" (4);
  - i cartelli bugiardi rischiano di coprire la scrivania del KT e l'etichetta del fix (5, da screenshot);
  - il finale lungo senza checkpoint, più il burnout che si accumula, va riconsiderato con l'utente (3).
- **Minori:** etichetta del fix lunga e ripetuta, hitbox 36 px più larga della colonna, margini sottili contro chi corre, niente test unitari sui tempi, `causeLabel` inutilizzato.
- Il punto 3 della richiesta (pivot del livello 2) non è un'incoerenza: va lasciato così.
- `npm test` 165/165 e `npm run build` ok; smoke non eseguito.

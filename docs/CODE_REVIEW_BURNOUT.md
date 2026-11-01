# Code review — burnout (commit `cc7d13a`)

Oggetto: il codice della barra burnout confrontato con `docs/BURNOUT.md` (compreso §9, esito della review del piano).
Verifiche fatte davvero il 2026-11-01:
- `npm test`: 162/162 verdi.
- `npm run build`: ok.
- `scripts/smoke/smokeBurnout.mjs` su `vite preview`: 9/9 PASS, nessun errore in console.
- In più, una sonda Puppeteer a 960×540 (fuori dal repo) per i casi che lo smoke non copre: standup che sfora, junior persi al checkpoint e a fine livello, `burnoutHigh`, `?burnout=100`, postura curva girato a sinistra, toast lungo.

**Esito in breve:** il nucleo regge. Non ho trovato doppi finali, guardie mancanti o conteggi junior sbagliati. Il difetto vero è uno solo: la battuta `burnoutHigh` viene quasi sempre coperta subito dopo da un'altra battuta (punto 1).

## Cosa ho controllato e funziona

- **Doppi finali / scene già finite.** Tutti i ganci sono nella forma `if (scene.addBurnout(...) || scene.spendGu(...)) return;`, per cui il burnout passa prima del budget. `burnoutOver()` e `budgetOver()` hanno entrambi la guardia `if (this.ended) return`, e `addBurnout` restituisce `false` quando `ended` è vero. `respawn()` e il `burnoutHigh` ritardato controllano `ended`. Sonda: con lo standup che sfora a 99,5% si arriva solo a `EndingScene` (l'overlay dello standup sparisce con `hideAll`). Con un junior perso a 99,5%, sia al checkpoint sia in `completeLevel` si arriva a `EndingScene` e non a `LessonsLearnedScene`.
- **Guardie god/ended.** `addBurnout` non fa nulla in god mode. `relieveBurnout` funziona anche in god mode, che è quello che prevede il piano.
- **Junior netti.** `savedCount − count`, calcolato al checkpoint (prima di `snapshot`) e in `completeLevel`. `InternDesk` fa `team.add(1)` e anche `savedCount += 1`, quindi lo stagista non nasconde le perdite precedenti: perdi 2 su 3, assumi 1, e `netLoss` vale ancora 2. `restore` riporta indietro i junior senza addebitarli. Rival e delega passano da `count` e quindi sono contati.
- **Retry, nuova campagna e debug.** `retry: true` arriva solo da `BudgetOverScene`. `newCampaign` è calcolato una sola volta. `?burnout` si applica solo quando `session.burnout === null`. Il ricomincio da un finale riparte da 0 (smoke). Anche il bonus pulito viene azzerato.
- **KT vero una volta per livello.** `relievedOnce` sopravvive al respawn (smoke). Su un retry si ripristina, ma non si può sfruttare: arrivare a uno sforamento costa ~+7,5%.
- **cleanBonus.** Viene impostato prima di `endLevel`, applicato dopo `startLevel` e mai su un retry. Il caso con `next === null` è escluso. `nextStart` usa lo stesso ordine di `create`.
- **Texture.** `_t1`/`_t2` esistono per ogni voce di `OUTFITS`. Gli NPC e i junior del team usano chiavi proprie e non cambiano tier: è corretto. `setTexture(key, frameName())` tiene la tinta della morte.
- **PlayerView.** Girato a sinistra: `flipX = true`, angolo −4°, `sy` 0,95 (sonda). Lo sprite si inclina in avanti in entrambe le direzioni. Il tremolio si somma dopo `setPosition` ogni frame e quindi non si accumula. L'hitbox non cambia.
- **HUD.** Barretta da 200×6 con sfondo a y=34. Colori a 50/80, lampeggio da 90. A 960×540 il toast lungo, centrato e con wrap a 440 px, non tocca la riga `GU residue: … · Burnout N%` (circa 20 px di margine). I team arrivano al massimo a 3 junior, quindi la riga team non finisce sotto il box del narratore.
- **EndingScene.** Il layout del burnout regge: titolo, due righe, statistiche su due righe, intestazioni della classifica a y=180 senza sovrapposizioni. `outfitOverride` torna a `null`.
- **LessonsLearned.** La riga è coerente con il valore reale del livello dopo (smoke: 20 → 15 con il bonus pulito).

## Problemi

1. **Importante — `GameScene.addBurnout` → `sayBurnoutHigh` (src/scenes/GameScene.js, ~r. 376).**
   **Problema:** la battuta "sei al tier 2" si consuma (`burnoutHighSaid = true`) ma in pratica non si vede. Tutti i ganci chiamano `narrate(...)` subito dopo `addBurnout`: `death`, `mmCatch`, `fiveHook`, `ktFake`, `goalTroll`, `escalationCatch`, `checkpoint`, `levelComplete`. `burnoutHigh` ha priorità 1, quindi la battuta successiva, con priorità ≥ 1, la sovrascrive nello stesso frame. Sonda: a 79,75% una morte porta il burnout a 80% e a schermo resta *"La prima non si scorda mai…"*. Con un `addBurnout('micromanager')` seguito da `mmCatch` resta la battuta del micromanager. Succede lo stesso se si entra in un livello già al tier 2 e il primo evento arriva prima dei 3,5 s del timer: la battuta viene "detta" subito e coperta. Si salva solo lo standup che sfora, perché lì `narrate` viene prima.
   **Fix proposto:** due strade, a scelta.
   - (a) `sayBurnoutHigh` rimanda la battuta con `this.time.delayedCall(~1500, () => !this.ended && this.narrate('burnoutHigh'))` e alza `burnoutHigh` a `priority: 2`.
   - (b) Si mette solo un flag "da dire", e la battuta parte alla prima occasione in cui il narratore è libero (per esempio in `respawn()` o dopo 2 s).

   In entrambi i casi serve un controllo nello smoke: dopo il passaggio all'80% il testo del narratore deve contenere una battuta `burnout_high_*`.

2. **Minore — `?burnout=100` non finisce mai (GameScene.addBurnout).**
   **Problema:** con il valore di partenza già a 100 il primo `add` ha `delta === 0` e si esce prima del controllo `over`. Si gioca all'infinito al "100%" (sonda: dopo una morte resta `GameScene`). Riguarda solo il debug: in gioco 100 si raggiunge solo con un `add`.
   **Fix proposto:** in `addBurnout`, se `this.burnout.isOver` è già vero, chiamare `burnoutOver()` prima del controllo sul delta. In alternativa, limitare `DEBUG.burnout` a 99,75.

3. **Minore — Escalation: "-N GU" anche quando vince il burnout (src/objects/Escalation.js r. 52–54).**
   **Problema:** il `floatText` delle GU parte prima di `addBurnout`. Se l'escalation porta al 100%, compare "-N GU" ma le GU non scendono (il finale mostra le GU intatte). Per la morte il piano ha spostato il `floatText` dopo il gancio (§4). Qui no.
   **Fix proposto:** spostare il `floatText` dopo `if (scene.addBurnout('escalation')) return;`.

4. **Minore — Junior "in viaggio" al checkpoint (GameScene.chargeTeamLosses / Team.count).**
   **Problema:** `count` conta solo i `follow`. Se tocchi un checkpoint mentre un junior delegato corre verso il bersaglio (`going`), viene addebitato +1% e tolto dallo snapshot. Se poi torna ("Ah, è già stato fatto?"), `count` supera `savedCount` e copre la prossima perdita vera. Il conto finale torna giusto solo per caso, e il +1% viene addebitato in anticipo per un junior che non hai perso.
   **Fix proposto:** contare `going` (e `doomed`) come presenti in `netLoss` e `snapshot`, per esempio con `members.filter(m => m.state === 'follow' || m.state === 'going')`. Altrimenti accettare il caso e annotarlo in BURNOUT.md.

5. **Minore — Lampeggio arancio a ogni morte anche se la percentuale a schermo non cambia (UIScene.onBurnout).**
   **Problema:** +0,25% con il valore arrotondato per difetto: tre morti su quattro la riga lampeggia ma il numero resta uguale. Non è un errore, ma il segnale dice "è cambiato qualcosa" quando a schermo non cambia nulla.
   **Fix proposto:** lampeggiare solo se cambia `Math.floor(value)`, oppure per qualsiasi delta ≥ 1. Decide l'utente al playtest.

6. **Minore — Occhiaie un po' fuori dal viso (TextureFactory.drawPerson).**
   **Problema:** l'occhiaia destra (x 19,9–22,3, y ≈ 9,3–10,4) e la palpebra destra del tier 2 (x fino a 22,3, colore pelle) escono di ~0,5 px dal cerchio della testa, che a quell'altezza finisce a x ≈ 21,7. A risoluzione HD può comparire un pixel di colore sul profilo.
   **Fix proposto:** larghezza 2,0 per l'occhio destro (o x 19,9 → 19,7).

7. **Minore — Smoke B-M4 incompleto rispetto al piano (scripts/smoke/smokeBurnout.mjs).**
   **Problema:** il piano chiede "schermate con tier 2 a 960×540 e con toast lungo". Lo smoke scatta a 1920×1080, la schermata del tier 2 non ha un toast lungo e manca una schermata dedicata al tier 2 (c'è quella del tier 1). Mancano anche controlli automatici per i ganci che non sono la morte: standup che sfora, checkpoint e fine livello con junior persi, `burnoutHigh` (vedi il punto 1). Li ho verificati a mano con la sonda e funzionano, ma non sono protetti da regressioni.
   **Fix proposto:** aggiungere allo smoke:
   - una pagina a 960×540 con il tier 2 e un toast lungo;
   - `handleSchedule({type:'start', overrun:true})` a 99,5% → solo `EndingScene`;
   - `team.lose` + checkpoint a 99,5% → `EndingScene`;
   - il controllo sulla battuta del punto 1.

8. **Minore — `DEBUG.burnout` accetta anche valori tra 0 e 1 (debug.js).**
   **Problema:** il piano dice 1–100, `num` accetta qualsiasi valore > 0. Non ha effetti pratici.
   **Fix proposto:** nessuno, oppure allineare il piano a "> 0".

## Riassunto

- Test (162), build e smoke del burnout (9/9) sono verdi. La sonda a 960×540 conferma i casi limite non coperti dallo smoke.
- Nessun doppio finale. Le guardie `ended`/god sono corrette. Il burnout vince sul budget in tutti i ganci. Checkpoint, fine livello e standup che sfora portano solo a `EndingScene`.
- Il conteggio netto dei junior regge anche con `InternDesk` (grazie a `savedCount += 1`) e con `restore`. C'è solo un caso limite con i junior delegati ancora in viaggio (punto 4).
- Retry, nuova campagna, `?burnout` una sola volta, KT una volta per livello e cleanBonus sono conformi al piano.
- Le texture `_t1`/`_t2` ci sono per tutti gli outfit. La postura curva si inclina nel verso giusto con `flipX`. HUD, finale e Lessons Learned sono impaginati bene.
- **Da sistemare prima del playtest:** il punto 1. La battuta `burnoutHigh` viene coperta dalla battuta dell'evento che l'ha causata, e il playtest non mostrerebbe l'avviso del tier 2.
- Il resto è minore: `?burnout=100` di debug che non finisce, "-N GU" fantasma dell'escalation, junior in viaggio, lampeggio senza variazione visibile, un pixel delle occhiaie, smoke da completare.

## Esito (applicato)

| # | Esito |
|---|---|
| 1 | Corretto: `burnoutHigh` detto 1,5 s dopo l'evento, priorità 2; nuovo smoke "superando l'80% il narratore avvisa" |
| 2 | Corretto: `?burnout` limitato a 99,75 |
| 3 | Corretto: "-3 GU" dell'escalation dopo il controllo del burnout |
| 4 | Corretto: il junior che sta correndo verso una delega non conta come perso (`Team.aliveCount`) |
| 5 | Corretto: la riga lampeggia solo se cambia il numero mostrato |
| 6 | Corretto: occhiaia e palpebra destra più strette |
| 7 | In parte: aggiunto smoke tier 2 a 960×540 e avviso 80%; standup e perdite junior verificati a mano dalla review |
| 8 | Respinto: nessun effetto pratico |

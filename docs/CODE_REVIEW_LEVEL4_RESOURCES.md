# Review del codice — commit `9491c4b` (livello 4: il PM "Mi presti una risorsa?" e il recruiter di LinkedIn)

> Revisore: playbook `review`, contesto separato. Il codice non è stato modificato.
> Oggetto: `git show 9491c4b`, cioè `src/objects/npc/PmStaffing.js`, `src/objects/npc/Recruiter.js`, `src/core/StaffingBrain.js`, `src/core/RecruiterBrain.js`, `Team.lose(…, prepaid)` / `netLoss`, `BURNOUT.gain.pmResource`, `resolveMode` per `cause`, `tests/Level4Resources.test.js`, sezione livello 4 di `scripts/smoke/smokePmLinkedin.mjs`. Confronto con `docs/PM_LINKEDIN.md` §8–9 e `docs/DECISIONS.md` (righe 125, 163).
> Gravità: **bloccante** / **importante** / **minore**.

## Verifiche eseguite
- `npm test`: **210/210** passati (23 file).
- `npm run build`: OK.
- `smokePmLinkedin.mjs` (Chrome locale, `vite preview`): **13/13 PASS**, nessun errore in console. Le 6 voci del livello 4 passano:
  - PM: squadra da 3 a 2, burnout da 45 a 55, `net` 0;
  - scrivania sicura;
  - pivot `pm`: squadra 4;
  - fermo nella zona: 3 incidenti `linkedin`;
  - attraversamento di corsa: squadra 3;
  - pivot `linkedin`: squadra 4.
- Gli altri smoke non sono stati rieseguiti (vedi la nota sul container lento).

Il codice fa quello che dice il piano §8–9. `resolveMode` con `cause ?? type` è corretto e retrocompatibile. La contabilità `prepaid` torna nei casi verificati (PM + stagista assunto + varco: nessun doppio addebito, nessuna perdita nascosta). I problemi sotto sono soprattutto di **design / numeri** e di **test mancanti**.

---

## Problemi

### 1. Il +10% del PM non si restituisce alla morte, ma il junior sì; e dopo il PM non ci sono checkpoint — **importante**
- **Dove:** `PmStaffing.take` (`addBurnout('pmResource')` subito), `StaffingBrain.reset` (una volta per vita), `GameScene.respawn` → `team.restore()`; `level4.js` (unico checkpoint a 106).
- **Problema:**
  - Le perdite del team **non** si addebitano alla morte: `chargeTeamLosses` è chiamato solo al checkpoint e a fine livello, e `restore()` restituisce i junior.
  - Il +10% del PM invece è già pagato. Alla morte il junior torna, il 10% resta, e al passaggio seguente il PM chiede di nuovo.
  - Il tratto dopo il PM (143) è il più letale del livello: arrivista 2, valanga 166, traguardo che tradisce con spine 180–181 e fossa 184–186. Si rinasce a 106 e si ripassa sul tappeto.
  - Esempio: livello 4 dal 45%. Tre tentativi che calpestano il tappeto e muoiono dopo = 3 × (10 + 3) = **+39%**, cioè 84%. Il 10% "perdita compresa" diventa così un costo senza perdita.
  - Asimmetria con il recruiter: le sue perdite, se muori prima del checkpoint, non costano niente.
- **Fix proposto:** scegliere una via con l'utente (il +10% è sua decisione, il "una volta per vita" è del piano):
  - (a) il +10% si paga **una volta per livello** (flag nella scena, come `relievedOnce`); nelle vite dopo il PM prende il junior come perdita normale (`prepaid = false`, +5% solo se arrivi al traguardo senza);
  - (b) aggiungere un checkpoint dopo il PM (~146, prima dello stagista).

  Aggiungere uno smoke "muori dopo il PM: burnout +10 +3, al respawn il PM chiede di nuovo / non chiede".

### 2. Il recruiter dà un incidente `linkedin` per ogni junior: decide il pivot verso il livello 5, che non ha slot `linkedin` — **importante**
- **Dove:** `Recruiter.poach` (`recordIncident('linkedin')` per membro), `PmStaffing.take` (`recordIncident('pm')` per vita), `StatsTracker.dominantPivotCause`.
- **Problema:**
  - Un solo aggancio alla porta 46 con la squadra nella zona (la "combo" del piano) produce **3** incidenti `linkedin` in un colpo. Oltre a quelli, il PM dà un incidente `pm` a ogni vita.
  - Nessun'altra causa del livello 4 dà 3 incidenti per un singolo errore. `linkedin` (o `pm`) diventa facilmente dominante.
  - Il livello 5 ha slot solo per `replyAll`, `fiveMinutes`, `deckCollapse` e `scopeCreep`. Il giocatore perde il pivot proprio nell'ultimo livello, in contrasto con la decisione del 2026-11-01: "il livello 5 contiene gli slot delle trappole pivotabili dal livello 4".
- **Fix proposto:**
  - un incidente per **evento** di caccia, non per junior (accorpare `out.poached`);
  - chiedere all'utente se `dominantPivotCause` debba preferire le cause con uno slot nel livello dopo (vedi anche `PLAN_REVIEW.md` #16);
  - aggiungere un test su `dominantPivotCause` con lo scenario "1 aggancio = 3 junior".

### 3. La lezione `pm` promette le barre del Gantt, ma nel livello 4 il pivot è un junior in prestito — **minore**
- **Dove:** `data/causes.js` (`pm.lesson`: "le barre del Gantt ti portano avanti"); Lessons Learned dopo il livello 3.
- **Problema:** con il pivot `pm` dal livello 3, la scheda annuncia barre del Gantt che nel livello 4 non ci sono. Nel livello 4 il PM "ti presta un junior". Il testo inganna il giocatore sul livello che sta per giocare. `linkedin` regge meglio ("hai evitato un'opportunità").
- **Fix proposto:** lezione per livello di destinazione, sul modello di `SKIN_TEXT`: una mappa `LESSON_BY_NEXT_LEVEL.level4.pm` usata da `causeLesson` quando si conosce il livello dopo. In alternativa, un testo che vale per entrambi ("Il PM ora ripianifica a tuo favore").

### 4. Il tappeto del PM è a 2 colonne dall'atterraggio del burrone: un salto lungo dal pilastro ci atterra sopra — **minore**
- **Dove:** `level4.js`: pilastro 134–135, pavimento da 140, tappeto 142.
- **Problema:** stacco dal bordo destro del pilastro (centro ~4361 px), più il coyote (90 ms × 260 = 23 px), più un salto pieno di corsa (165 px) = 4549 px, cioè **col 142,2**: sul tappeto, senza aver "scelto" di camminarci. È raro (serve un salto pieno al limite del coyote), ma succede, e costa il 10%. Senza coyote si atterra a 141,4.
- **Fix proposto:** spostare la scrivania di una colonna (144, tappeto 143/145); lo stagista a 147 resta dopo. In alternativa, tappeto solo a 144, con 142 neutro. Aggiornare i test della scrivania (`tiles[14][142..144]`) e gli smoke.

### 5. Test mancanti sulla contabilità del team — **minore**
- **Dove:** `tests/Level4Resources.test.js`; `Team.netLoss` / `prepaid` (in `objects/`, non coperto da Vitest).
- **Problema:** il cuore del commit (non addebitare due volte) è coperto da una sola voce di smoke (`net === 0`). Non sono testati:
  - `snapshot()` e `restore()` che azzerano `prepaid`;
  - PM + stagista assunto + varco;
  - un regalo (pivot) che porta `aliveCount` sopra `savedCount` e assorbe una perdita successiva: oggi un junior perso al varco 156 dopo il regalo del PM non costa burnout. È accettabile, ma va deciso e scritto.
- **Fix proposto:** estrarre la regola in `core/` (es. `teamLoss({ saved, alive, prepaid })`) e testarla con questi scenari. Annotare in `PM_LINKEDIN.md` §8–9 che il junior regalato fa anche da "cuscinetto".

### 6. Lo smoke non prova la "combo" del piano e disattiva la porta in modo poco chiaro — **minore**
- **Dove:** `smokePmLinkedin.mjs`, sezione livello 4.
- **Problema:**
  - Il piano §9 dichiara come trappola principale "la porta 46 ti aggancia e perdi i junior nella zona". Nessuno smoke lo verifica: l'attraversamento tiene la porta chiusa con `brain.occupy(20000)`, ma `occupy()` non accetta argomenti e il 20000 è ignorato (la porta resta occupata fino al respawn).
  - Manca anche lo smoke "attraversare con la porta attiva saltando il collega tiene il team", cioè la contromossa reale.
- **Fix proposto:**
  - togliere l'argomento (`occupy()`);
  - aggiungere due voci: (a) teletrasporto a 44, la porta aggancia, entro 2 s la squadra va a 0 e `linkedin` vale 1 (dopo il fix #2); (b) corsa da 25 con salto sul collega a ~45, squadra 3.

### 7. Il recruiter rende conveniente il suicidio prima del checkpoint — **minore** (rischio di design, regola preesistente)
- **Dove:** `Recruiter` (zona 37–44, a ~5 s dallo spawn); `GameScene.die` non chiama `chargeTeamLosses`.
- **Problema:** perdere i 3 junior nella zona costa **+15%** al checkpoint 106. Premere R costa +3% e 0,5 GU, e restituisce i junior. Un giocatore attento impara a riavviare apposta dopo ogni caccia. La regola "le perdite restituite dal respawn non contano" è registrata in `BURNOUT.md`. Il recruiter, che fa perdere tutto il team in un colpo vicino allo spawn, la rende sfruttabile.
- **Fix proposto:** segnalarlo all'utente. Opzioni: le perdite del team si addebitano anche alla morte volontaria (`selfRestart`); oppure il recruiter caccia **un** junior per volta (il più esposto), con `poachMs` che riparte dopo ogni caccia.

### 8. Piccolezze — **minore**
- `RecruiterBrain.update` riceve `playerInZone` anche in modalità normale, dove non serve: va bene, ma il commento della firma dovrebbe dirlo.
- `PmStaffing` e `Recruiter` usano il colore del cartello per distinguere normale e pivot. Il tappeto giallo del PM non ha un'etichetta "non calpestare": l'indizio è il cartello "Cercasi risorse – urgente" più la regola imparata. Al primo passaggio si viene presi quasi sempre. È coerente con "crudele ma giusto", ma va annotato nel registro del livello.
- `INCIDENT_WEIGHT` aggiunge `pm: 1, linkedin: 1`, uguale al default (`?? 1`): è innocuo, serve solo come documentazione.

---

## Riassunto
- Test, build e smoke del commit passano (210/210, build OK, 13/13 PASS rieseguiti qui). La logica pura è pulita e il pivot per `cause` è corretto.
- **Importante #1:** il +10% del PM resta dopo la morte mentre il junior torna, e il PM richiede a ogni vita. Senza checkpoint dopo 143, tre tentativi falliti nel finale costano ~+39%. Proposti: +10% una volta per livello, oppure un checkpoint a ~146.
- **Importante #2:** il recruiter dà un incidente per junior (3 in un colpo). `linkedin`/`pm` vincono facilmente il pivot verso il livello 5, che non ha slot per loro, contro la decisione del 2026-11-01.
- **Minori:**
  - la lezione `pm` parla di barre del Gantt assenti nel livello 4;
  - il tappeto è a 2 colonne dall'atterraggio (un salto al limite ci finisce sopra);
  - mancano test Vitest sulla contabilità `prepaid`/regali;
  - lo smoke non prova la combo porta + zona, e `occupy(20000)` ha un argomento ignorato;
  - perdere tutti i junior nella zona rende conveniente premere R prima del checkpoint.

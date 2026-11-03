# Review di `docs/IT_HR_EXTERNAL.md` (IT, HR e fornitore esterno, livelli 2–5)

> Revisore: playbook `review`, contesto separato. Il piano e il codice non sono stati modificati.
> Riferimenti: `CLAUDE.md`, `docs/DECISIONS.md` (righe 86, 94, 113, 125, 162, 163), `docs/PM_LINKEDIN.md`, codice reale: `config/constants.js`, `core/LevelValidator.js`, `core/pivot.js`, `core/StatsTracker.js`, `data/causes.js`, `objects/Player.js`, `objects/team/Team.js`, `objects/traps/AiDraft.js`, `scenes/GameScene.js`, `levels/level2.js`, `level3.js`, `level4.js`.
> Gravità: **bloccante** (l'esecutore deve inventare una parte essenziale, oppure il risultato contraddice l'obiettivo dichiarato), **importante** (porta quasi sicuramente a un bug o a un risultato ingiusto), **minore** (incoerenza o rifinitura).

## Numeri di riferimento (da `constants.js`)
- Salto pieno: `jumpVelocity` 620, `GRAVITY` 1800 → altezza 620² / 3600 = **107 px (3,3 tile)**, salita 0,344 s; discesa con `fallGravityExtra` (2500 px/s²) 0,292 s → **in aria ~0,64 s**.
- Di corsa (260 px/s) un salto pieno copre **~165 px ≈ 5,2 colonne**; da fermo ~147 px (4,6 colonne). Frenata a terra: 260² / 6000 = **11 px**. In aria senza input la velocità orizzontale cala di 900 px/s² (da 260 a 0 in 0,29 s, ~37 px).
- 3 s di corsa = 780 px = **24 colonne**.
- `Player.lockInput` toglie solo l'input: la gravità resta, e con `jumpHeld` falso scatta subito il taglio del salto (`jumpCutMultiplier` 0,45).

---

## Problemi

### 1. Il fornitore del livello 4 sta sul percorso obbligato: "toccarla paga 4 GU" lo rende un pedaggio, non una scorciatoia facoltativa — **bloccante**
- **Dove:** §4 e §5 "Livello 4" (`contractor` a col 121).
- **Problema:** il livello 4 ha il pavimento continuo 102–129; la barriera HR è a 120, la scrivania a 121, la sporgenza dello scope creep a 124. Chiunque passi la barriera tocca la scrivania. Se "toccare" è un overlap, come tutti gli altri inneschi del gioco, **ogni** giocatore paga 4 GU su 15 e aspetta 4 s. Questo contraddice "è sempre una scorciatoia facoltativa". Anche "toccare di nuovo la scrivania segnala il difetto" non è definito: uscire e rientrare dall'overlap? Un tasto?
- **Fix proposto:** attivazione esplicita: tasto **E** quando sei sulla scrivania (con un'etichetta "E: ingaggia il fornitore (4 GU)"), oppure scrivania fuori dal percorso (su un rialzo a cui si sale apposta). Il secondo contatto ("segnala il difetto") va reso con la stessa azione. Lo smoke deve controllare che passare a piedi non costi GU.

### 2. Gli incidenti `it` e `hr` sono inevitabili e decidono il pivot al posto del giocatore — **importante**
- **Dove:** §2.1 ("Incidente `it` a ogni riavvio") e §3.1 ("Incidente `hr` per ogni junior preso").
- **Problema:** `StatsTracker.dominantPivotCause` sceglie la causa pivotabile con più incidenti. Gli incidenti di queste due trappole non dipendono dall'errore del giocatore:
  - il riavvio scatta per tutti, a ogni vita che passa la col 77, anche per chi lo gestisce bene;
  - il team building prende **ogni** junior che segue, cioè 2–3 incidenti per passaggio, perché la scia passa per forza da 176–181 (vedi #6).

  Esempio, livello 2: due morti per il PM e due vite oltre la col 77 danno `pm` 2 contro `it` 2. A parità vince l'incidente più recente, che è quasi sempre il riavvio (col 77, dopo il PM). Nel livello 3 un solo passaggio con 3 junior dà `hr` 3, più di quasi ogni altra causa: il livello 4 avrà quasi sempre il pivot `hr`. Così le lezioni PM/LinkedIn e quelle storiche smettono di arrivare.
- **Fix proposto:** l'incidente si conta solo quando la trappola **fa danno**:
  - riavvio: il congelamento finisce con una morte entro ~1 s, oppure parte in aria o su un post o una barra;
  - team building: un incidente per passaggio (non per junior), e solo se almeno un junior era in scia.

  In alternativa, peso 0,5 in `INCIDENT_WEIGHT`. Aggiungere un test su `dominantPivotCause` con lo scenario "2 morti PM + 2 riavvii".

### 3. Il congelamento del riavvio in aria non è specificato: scatta a metà salto e ti fa cadere — **importante**
- **Dove:** §2.1.
- **Problema:** "Il giocatore resta bloccato per `freezeMs`". Con il lock attuale (`Player.update`: input azzerato, gravità attiva) un congelamento a metà salto taglia il salto (`jumpCut`) e frena in aria a 900 px/s². Si percorrono ~37 px invece dei 96–128 che servono sulle fosse a spine (85–94, salti da 4) o sul burrone di LinkedIn: morte sicura, con causa `spike`/`pit`. Il conto alla rovescia è un indizio, ma tra 77 e 103 i salti sono obbligati e il giocatore deve contare "3…2…1" mentre salta. Il piano non dice neanche se si usa `stopMotion()` (come KT e standup).
- **Fix proposto:** decidere esplicitamente una delle due:
  - (a) a zero, se il giocatore non è a terra, il congelamento parte **all'atterraggio** ("Aggiornamento in sospeso…");
  - (b) congelamento in aria con `stopMotion()` e caduta da fermo, dichiarato come voluto.

  Raccomandata la (a): resta crudele (se atterri su un post muori lo stesso) ma è giusta. Va in `RestartBrain` (`countdown → pending → frozen`) con un test.

### 4. Lo schema ASCII della S7 contraddice il testo — **importante**
- **Dove:** §5 "Livello 3", blocco di codice.
- **Problema:** contando i caratteri dello schema, con la colonna 174 al primo carattere: K = 184 e | = 189 sono giusti. Però il pavimento (riga 15) va da 174 a **195**, il burrone da **196 a 209**, il pavimento riprende a **210** e il traguardo G è a **213**. Lo schema arriva a 218, oltre le 215 colonne. Il testo dice invece burrone 191–204, pavimento 205–214, traguardo 210. Anche le etichette dell'intestazione sono sfasate (il "180" cade su 181) e le VPN non sono disegnate.
- **Fix proposto:** rifare lo schema da `createGrid` (stampa di `g.toMap()` righe 13–16 dalla col 170 alla 214) e incollarlo. Vale il testo: burrone 191–204, VPN 193–194 / 197–198 / 201–202 su riga 14, pavimento 205–214, G a 210.

### 5. Il testo dei salti della S7 è sbagliato, e il ciclo VPN non dice il verso della fase — **importante**
- **Dove:** §2.2 e §5 "Livello 3".
- **Problema:**
  - "190 → 193 (2 vuote), poi 3 vuote, poi 3 vuote, poi 202 → 205 (2 vuote)": tra 194 e 197 le colonne vuote sono 2 (195–196), come tra 198 e 201. Sono tutti salti da 2 con salita 1: facilissimi, quindi la sfida è **solo** il tempo.
  - "Sfasata di `phaseMs`" non dice il verso. Con `isOn(t) = ((t − phase) mod 3200) < 2000` e fasi 0/800/1600:
    - A è accesa in [0, 2000), B in [800, 2800), C in [1600, 3600);
    - l'onda va **avanti** a 5 col/s, più piano della corsa (8 col/s);
    - chi corre arriva su B a ~500 ms, quando B è spenta. Bisogna aspettare ~0,3–0,8 s su ogni piattaforma larga 2 (si può: la frenata è di 11 px);
    - con la fase al contrario l'onda va indietro e si passa di corsa.

  Le due versioni sono livelli diversi. Manca anche un riferimento del tempo: orologio della trappola da quando? Si riazzera al respawn?
- **Fix proposto:**
  - definire `isOn(t)` con la formula e l'orologio (dal `reset()` della trappola, come `LinkedinPost.clock`);
  - aggiungere al piano la tabella delle finestre: A→B si sovrappongono 1200 ms, B→C 1200 ms;
  - test Vitest: esiste una sequenza di salti da ~0,5 s che attraversa, e chi corre senza fermarsi cade.

### 6. Team building: la contromossa "delega prima della zona" non funziona con le regole attuali della delega — **importante**
- **Dove:** §3.1.
- **Problema:**
  - L'unico bersaglio delegabile "più avanti" è il chiosco IT (184), e ne prende **uno**: gli altri junior in scia passano comunque da 176–181.
  - `pickDelegateTarget` ha portata 10 colonne: per delegare al chiosco bisogna stare a ≥ 174, cioè appena atterrati dalla fossa del KT (166–173), 2 colonne prima della zona.
  - Il junior delegato (`going`) si muove interpolando la x **attraverso** la zona: il piano dice "ogni junior che ti segue", quindi `going` è escluso, ma va scritto.
  - In pratica la trappola non si evita: è una tassa di 8 s senza team (e di incidenti, #2).
- **Fix proposto:**
  - scrivere che contano solo i membri in stato `follow`;
  - dare una contromossa vera: zona **sopra un tratto saltabile**, così chi salta la zona tiene la scia fuori. Per esempio una zona di 3 colonne (177–179) che un salto di corsa (5 colonne) scavalca: la scia replica il salto e i junior non "entrano" (si controlla `bottom` a terra nella zona). Va verificato che la scia dei junior replichi le altezze, come già fa `TeamTrail`;
  - oppure dichiarare che è inevitabile e togliere la frase sulla contromossa.

### 7. Stato `away`: `aliveCount`, fine livello e HUD non sono specificati — **importante**
- **Dove:** §3.1 ("`aliveCount` invariato").
- **Problema:** oggi `aliveCount` conta solo `follow` e `going`. Se `away` non viene aggiunto esplicitamente, `netLoss()` addebita +5% per ogni junior via quando si arriva al traguardo. Il traguardo è a 210, cioè ~34 colonne e ~4–8 s dopo la zona: con `awayMs` 8000 succede spesso. Inoltre:
  - `count` (i `followers`) scende e l'HUD mostra "team 0" durante il team building;
  - il PM e il recruiter del livello 4 usano `team.count`;
  - non è definito dove "ricompare" il junior se in quel momento sei sul burrone delle VPN.
- **Fix proposto:**
  - `aliveCount` conta `follow | going | away`;
  - a fine livello e al checkpoint i membri `away` tornano `follow` prima di `chargeTeamLosses`;
  - l'HUD mostra "2 + 1 al team building";
  - il rientro avviene sulla scia (`positionFor(i)`), cioè alle spalle del giocatore, mai sopra il vuoto in modo letale (è solo grafica);
  - test su `TeamBuildingBrain` e su `netLoss` con `away`.

### 8. Il validatore non vedrà le VPN: il livello 3 normale risulterà non completabile — **importante**
- **Dove:** §2.2, §5, milestone IT-2.
- **Problema:** `trapSurfaces` conta come solide solo le superfici delle trappole note. Le VPN non sono nell'elenco, quindi il burrone 191–204 (14 colonne) risulta invalicabile per il test "level3 completabile con salti normali, ogni pivot". Il piano non dice:
  - che le VPN vanno in `trapSurfaces` in **entrambe** le modalità (sono accese una parte del tempo);
  - che la barriera del ticket va trattata come `approvalGate` (muro solo con `gatesClosed`);
  - che `entityColumns` (regola dei 12) deve conoscere `vpn`, `itTicket`, `teamBuilding`, `hrCourse` e `contractor`;
  - che `forcedRestart` ha colonne attive.
- **Fix proposto:** aggiungere al piano l'elenco delle modifiche a `LevelValidator.js` (`trapSurfaces` e `entityColumns`) con i rettangoli esatti. Specificare che il ponte del fornitore **non** entra in `trapSurfaces`, così il livello resta verificato senza scorciatoia.

### 9. Il varco del ticket e i junior: delega inutile, barriera non è un blocco per la delega — **minore**
- **Dove:** §2.3.
- **Problema:**
  - Il chiosco (184) è sul percorso, 5 colonne prima della barriera: il giocatore lo tocca comunque passando. Delegare un junior non fa guadagnare nulla e costa il junior: `staying` non è in `aliveCount`, quindi vale come perdita (+5%).
  - `Team.findTarget` blocca la delega solo dietro un `approvalGate` chiuso. La barriera del ticket e quella HR non sono blocchi: un junior può essere delegato a un bersaglio oltre la barriera chiusa (es. il fornitore a 121 dietro la barriera HR a 120).
  - Non è detto cosa succede se la barriera si richiude mentre il player ci è dentro (col 189).
- **Fix proposto:**
  - chiosco fuori percorso (su un rialzo o in una nicchia), così la delega fa risparmiare la deviazione; oppure togliere la frase sulla delega;
  - estendere i `blockers` di `findTarget` a ogni barriera chiusa (proprietà comune `blocksDelegation`);
  - la barriera non si chiude finché il corpo del player la sovrappone.

### 10. Due attese obbligatorie in fondo al livello 3, dopo l'ultimo checkpoint (112) — **importante** (ritmo)
- **Dove:** §2.3 e §5.
- **Problema:** la S7 chiede:
  - 4 s fermi al ticket (`workMs`), più la finestra di 2,5 s;
  - 0,3–1 s di attesa su ogni VPN.

  È il tratto più difficile del livello ed è l'ultimo. Il checkpoint più vicino è a 112: ogni morte sulle VPN rifà ~80 colonne (micromanager B, scope creep, porta 140, zona del micromanager, KT) più il team building e di nuovo i 4 s di ticket. La regola dei 12 conta colonne, non secondi: queste attese non la violano, ma sono proprio i "tratti morti" che il playtest #2 ha segnalato.
- **Fix proposto:**
  - checkpoint a **183** (dopo il team building, prima del chiosco);
  - `workMs` 2500;
  - spazio di attesa dopo la barriera di almeno 2 colonne (oggi solo la 190 sta tra barriera e burrone), oppure la barriera a 188.

### 11. Causa della morte nel burrone delle VPN: la finestra "≤ 3 s" è sempre vera — **minore**
- **Dove:** §2.2.
- **Problema:** con 3 piattaforme che si spengono ogni 3,2 s, in ogni istante una di loro si è spenta da ≤ 3 s. Così ogni caduta nel burrone (anche un salto corto) è `it`, e questo gonfia ancora gli incidenti `it` (#2). Non è detto se le VPN sono una sola entità (con un `pitRect`) o tre slot separati, che avrebbero tre kill zone sovrapposte.
- **Fix proposto:**
  - **una** entità `vpn` (`type: 'vpn'`, `cause: 'it'`, `slot: true`) con `platforms: [{dx, phaseMs}]` e un solo `pitRect`;
  - causa `it` solo se la piattaforma su cui eri **per ultimo** si è spenta da ≤ `CAUSE_WINDOW_MS`, come `LinkedinPost`;
  - scrivere il campo `cause: 'it'` anche su `itTicket` (`resolveMode` usa `cause ?? type`).

### 12. Corso HR: ripetizione a ogni vita, attestato e respawn non specificati — **importante**
- **Dove:** §3.2, §5 "Livello 4".
- **Problema:**
  - L'attestato è a col 95 e il checkpoint a 106. Se l'attestato si perde alla morte, come i pickup e `AiDraft.reset()`, chi muore dopo 106 rinasce senza attestato e dovrebbe tornare indietro sopra il burrone 88–101.
  - Non è detto se il corso (+5% e 2 s) si ripete a ogni vita. Nel livello 4 si muore spesso dopo 120 (traguardo che tradisce, arrivista 2, spine 180–181), e ogni vita costerebbe +5% oltre al +3% della morte e al +10% del PM (vedi la review del codice, #1).
  - Manca il formato dell'attestato: nuovo carattere in `LevelParser.KNOWN`? Entità `certificate`?
- **Fix proposto:**
  - attestato e corso fatti **valgono per il livello** (un `Set` come `relievedOnce`, o il flag nella scena): una volta fatto il corso, la barriera resta aperta ai respawn;
  - attestato come entità `{ type: 'certificate', x: 95, y: 9 }`;
  - test: il cert a (95, 9) è raggiungibile solo da una cella sopra la riga 12 (oggi lo è: dalle piattaforme AI a riga 11 l'apice arriva a riga ~7,7; dal pilastro 92–93 solo fino a ~10,8).

### 13. Il ponte del fornitore non serve a niente e il "difetto" non si sente — **minore** (design)
- **Dove:** §4, §5 "Livello 4".
- **Problema:**
  - Il percorso normale del burrone 130–139 sono due salti da 4 sul pilastro 134–135, già validati con la tabella "normale".
  - Il ponte 130–137 (riga 14, alla quota della sporgenza dello scope creep) costa 4 GU e 4 s per evitare due salti facili.
  - La colonna mancante (138) lascia 2 vuote prima di 140: si salta senza accorgersene, quindi la gag "Come da specifica" e il secondo contatto non hanno effetto.
  - Con il pivot `scopeCreep` il ponte c'è già gratis.
- **Fix proposto:** usare il fornitore dove risparmia davvero qualcosa:
  - nel livello 4, come alternativa al percorso alto del chip AI sul burrone 88–101 (largo 14), con l'ultima colonna mancante che lascia un vuoto di 5–6: non si salta e obbliga a segnalare il difetto;
  - oppure solo nel livello 5.

  In ogni caso riusare `WorkerBrain` e `workerSurfaces`, che costruiscono già tavole one-way.

### 14. Fornitore: persistenza "il ponte resta" e `relievedOnce` — **minore**
- **Dove:** §4.
- **Problema:** `relievedOnce` è il registro dei sollievi del burnout. Usarlo per "pagato una volta" mescola due concetti, e `trap.reset()` al respawn smonterebbe il ponte. `spendGu(4, 'contractor')` registra GU persi per una causa che non è in `CAUSES`: `intern` invece c'è, come non pivotabile.
- **Fix proposto:** un flag proprio del `Contractor`, che il `reset()` non tocca (`paid`, `built`). Aggiungere `contractor: { label: 'il fornitore esterno', pivotable: false }` a `CAUSES`.

### 15. Riavvio nel livello 2: la contromossa sicura è "fermati 4 s" a ogni vita — **minore** (ritmo)
- **Dove:** §2.1.
- **Problema:** la soluzione ovvia è fermarsi in 77–84 per 3 + 1,2 s. Ogni vita oltre il checkpoint 52 aggiunge ~4 s di attesa, senza scelta. Il conto alla rovescia "fisso al centro dell'HUD" non è un'API esistente: `EV.TOAST` ha testo fisso e durata.
- **Fix proposto:**
  - `countdownMs` 2000 e `freezeMs` 1000;
  - oppure innesco a 79 (dopo l'atterraggio dalle spine), così chi corre arriva a zero sul pilastro 89–90;
  - specificare un evento HUD nuovo (`EV.COUNTDOWN` con secondi rimanenti), oppure toast aggiornati ogni secondo con la stessa chiave.

### 16. Catena dei pivot verso livelli senza slot — **minore** (rischio sulla decisione 2026-11-01)
- **Dove:** §1 "Catena dei pivot".
- **Problema:**
  - `it` nel livello 3 (morti sulle VPN, nel tratto più difficile e finale) diventa facilmente la causa dominante, ma il livello 4 non ha slot `it`.
  - Lo stesso vale per `hr` dal livello 4 al 5.
  - La decisione del 2026-11-01 dice che "il livello 5 contiene gli slot delle trappole pivotabili dal livello 4": con `hr` (e ora `pm`, `linkedin`) non è più vero. Il giocatore perde l'aiuto del pivot proprio nei livelli più difficili.
- **Fix proposto:** chiedere all'utente. Opzioni:
  - `dominantPivotCause(run, { slotsIn: nextLevel })`, che sceglie la causa dominante **tra quelle con uno slot nel livello dopo** e mostra le altre solo come riga;
  - oppure aggiungere slot `it` al livello 4 e `hr` al livello 5.

### 17. Testi, cause e verifica mancanti — **minore**
- **Dove:** §2–3, §6.
- **Problema:**
  - Mancano `label` per `it` e `hr` in `CAUSES`, le voci in `INCIDENT_WEIGHT`, le frasi del narratore per morte e incidente, e le chiavi `BURNOUT.gain.hrCourse` / `BURNOUT.md`.
  - La classifica del livello 3 (domanda 2) non è solo "non confrontabile": restano i record vecchi in `localStorage`.
  - Gli smoke dicono "confrontando i controlli a tempo con il commit prima", ma non c'è un criterio scritto per i controlli che falliscono già prima.
- **Fix proposto:**
  - elencare nel piano le voci da aggiungere a `causes.js`, `narratorLines.js` e `constants.js`;
  - per la classifica: nuova chiave `level3@2` o reset dei record del livello 3;
  - criterio smoke: "nessun FAIL nuovo rispetto al commit prima, sulla stessa macchina, in sequenza".

---

## Riassunto
1. **Bloccante:** il fornitore del livello 4 è sul percorso (121, dietro la barriera a 120) e "toccarla" farebbe pagare 4 GU a tutti. Serve un'attivazione esplicita (E) o una posizione fuori percorso.
2. Gli incidenti `it` (riavvio) e `hr` (team building) sono inevitabili e diventerebbero le cause dominanti: contarli solo quando fanno danno.
3. Il congelamento del riavvio a metà salto uccide senza scampo con il lock attuale: rimandarlo all'atterraggio.
4. Schema ASCII della S7 incoerente col testo (burrone 196–209, G a 213 nello schema); i salti VPN sono da 2, non da 3. Il verso della fase VPN decide se l'onda si cavalca o si attraversa di corsa: va definita con la formula, la tabella e un test.
5. Team building: la contromossa dichiarata non funziona (un solo bersaglio delegabile, scia obbligata). Lo stato `away` va incluso in `aliveCount`, nel fine livello e nell'HUD.
6. Il validatore va esteso (VPN sempre solide, barriere come varchi, `entityColumns` per i tipi nuovi), altrimenti il livello 3 risulta non completabile.
7. Ritmo del livello 3: 4 s di ticket e onda VPN dopo l'ultimo checkpoint (112). Proposto un checkpoint a 183 e `workMs` 2500.
8. Corso HR: attestato e corso devono valere per il livello (checkpoint 106 dopo l'attestato a 95), altrimenti +5% a ogni vita.
9. Il ponte del fornitore non risparmia niente (il pilastro 134–135 basta) e la colonna mancante non si nota: spostarlo dove serve.
10. Rischio di catena: `it`, `hr`, `pm` e `linkedin` possono vincere il pivot verso livelli senza slot, contro la decisione del 2026-11-01. Da chiedere all'utente.

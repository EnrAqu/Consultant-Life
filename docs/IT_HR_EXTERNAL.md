# IT, HR e risorse esterne — piano (livelli 2–5)

## 1. Scelte dell'utente (2026-11-03)
| Concetto | Livelli | Trappole scelte |
|---|---|---|
| **IT** | 2–3 | **Tutte e tre:** riavvio forzato, piattaforme VPN, ticket all'IT |
| **HR** | 3–4 | **Team building obbligatorio** e **corso obbligatorio** |
| **Risorse esterne** | 4–5 | **Il fornitore esterno** (contractor): costa GU, arriva in ritardo, costruisce "da specifica" |

Proposte di questo piano, da confermare con l'utente:
- **una lezione per IT (`it`) e una per HR (`hr`)**, valide per tutte le loro trappole, sul modello di PM e LinkedIn;
- il fornitore esterno **non è una causa** (non si muore per lui): è uno scambio GU ↔ tempo, senza pivot;
- il **livello 3 si allunga** da 180 a 215 colonne (nuova sezione S7), perché non ha più spazio libero.

Catena dei pivot:
- l'IT nasce nel livello 2 e ha gli slot nel livello 3;
- l'HR nasce nel livello 3 e ha lo slot nel livello 4;
- come per il PM e LinkedIn, una lezione senza slot nel livello dopo dà solo la riga in Lessons Learned.

Testi: italiano. Logica pura in `src/core/` con test, una milestone alla volta.

## 2. IT — causa `it` (pivotabile)
Lezione: *"L'IT ora è dalla tua parte: hai il numero diretto del sistemista."*

### 2.1 Riavvio forzato — `forcedRestart` (livello 2, non slot)
- Innesco: entrare nella colonna `triggerCol`, una volta per vita.
- Al centro dell'HUD compare "Il PC si riavvierà tra 3…2…1" (un toast fisso, `countdownMs` = 3000).
- A zero il **giocatore** resta bloccato per `freezeMs` = 1200 ("Aggiornamento 1 di 47…"), con il lock `it`. **Il mondo non si ferma:** trappole, post e barre continuano.
- Incidente `it` (peso 1) a ogni riavvio.
- Indizio: il conto alla rovescia, visibile per 3 s. Contromossa: arrivare a zero su un punto sicuro.
- **Livello 2:** `triggerCol` = 77, subito dopo le spine 75–76. Di corsa, dopo 3 s si è circa nel burrone di LinkedIn (97–103) o sopra la fossa del KT (85–94).
  - Punti sicuri: 77–84, il pilastro 89–90, 95–96.
  - Bloccati su un post si cade quando crolla: la causa della morte resta `linkedin`, ma l'incidente `it` è contato.
- `GanttBrain`/`PostBrain` non cambiano. Logica: `core/RestartBrain.js` (`idle → countdown → frozen → done`).

### 2.2 Piattaforme VPN — `vpn` (livello 3, slot)
- Piattaforme larghe `width` (2), una riga sopra il pavimento, con l'icona VPN: verde se connessa, rossa se no.
- Ciclo fisso: connessa `onMs` = 2000, disconnessa `offMs` = 1200, sfasata di `phaseMs` per ogni piattaforma.
- Negli ultimi 600 ms di "connessa" tre puntini si spengono uno alla volta: è l'indizio. Disconnessa la piattaforma non ha corpo ed è semitrasparente.
- Morte: zona del burrone → causa `it` se una VPN si è disconnessa da ≤ 3 s.
- **Pivoted** ("split tunneling"): sempre connessa.
- Logica pura `core/VpnBrain.js`: `isOn(t)`, `warning(t)`.

### 2.3 Ticket all'IT — `itTicket` (livello 3, slot)
- Una barriera alta 4 tile (come il varco di approvazione), con l'etichetta "Accesso negato: apri un ticket". Chiosco IT a `kioskDx` (−5) colonne.
- Toccare il chiosco apre il ticket: "Ticket in lavorazione — priorità bassa", con una barra di avanzamento.
  - Dopo `workMs` = 4000 la barriera si apre per `openMs` = 2500 ("Risolto. Chiudiamo il ticket.") e poi si richiude.
  - Il chiosco si riarma.
- Un junior delegato (E) apre il ticket al posto tuo e resta al chiosco: tu sei libero di posizionarti.
- **Pivoted** (priorità P1): si apre dopo 300 ms e resta aperta.
- Incidente `it` quando la barriera si richiude con te ancora davanti. Logica pura `core/TicketBrain.js`.

## 3. HR — causa `hr` (pivotabile)
Lezione: *"Hai capito come funziona HR: l'attestato ce l'hai già, e il team building lo salti."*

### 3.1 Team building obbligatorio — `teamBuilding` (livello 3, non slot)
- Zona "Team building obbligatorio — escape room" (`zoneFrom..zoneTo`), striscia viola sul pavimento.
- Ogni junior che ti segue e **entra** nella zona viene preso per `awayMs` = 8000, poi ricompare in fondo alla fila. Non è una perdita: niente burnout, `netLoss` non cambia.
- Incidente `hr` per ogni junior preso.
- Contromossa: prima della zona delegare i junior a qualcosa più avanti (la scia non passa dalla zona), oppure accettare di restare 8 s senza team.
- Logica pura `core/TeamBuildingBrain.js`: chi è via e fino a quando.
- Il `Team` ottiene lo stato `away` (né `follow` né perso), con `aliveCount` invariato.

### 3.2 Corso obbligatorio — `hrCourse` (livello 4, slot)
- Una barriera alta 4 tile con la referente HR: "Sicurezza sul lavoro — modulo 7 di 12".
- Toccarla avvia il corso: blocco di `courseMs` = 2000 (lock `hr`), burnout **+10%** (`BURNOUT.gain.hrCourse`, scelta dell'utente), incidente `hr`, poi la barriera si apre.
- Con l'**attestato** (raccolta `certificate`, sul percorso più difficile) la barriera si apre subito: "Attestato valido. Prego."
- **Pivoted:** l'attestato ce l'hai già (barriera aperta, cartello verde "Attestato caricato su Workday").

## 4. Risorse esterne — il fornitore — `contractor` (livelli 4–5, nessuna causa)
- Una scrivania "Fornitore esterno — 4 GU": toccarla paga 4 GU (`spendGu(4, 'contractor')`) e avvia il lavoro.
  - Dopo `delayMs` = 4000 ("Timezone offshore: risponde domattina") costruisce `bridge`, cioè piattaforme one-way, **meno l'ultima colonna** ("Come da specifica").
  - Toccare di nuovo la scrivania segnala il difetto: dopo 2000 ms aggiunge la colonna mancante, gratis.
  - Una volta per livello: non si ripaga dopo una morte e il ponte resta (`relievedOnce`).
- È sempre una **scorciatoia facoltativa**: il livello resta completabile senza.
- Logica pura `core/ContractorBrain.js`.

## 5. Geometria
### Livello 2 (stessa lunghezza)
- `forcedRestart` con `triggerCol` 77. Nessuna modifica alla mappa.

### Livello 3 (da 180 a 215 colonne)
Il traguardo passa da 176 a **210**. La sezione S7 parte dal pavimento dopo la fossa del KT (174):
```
     174   180       190       200       210
14   .........CK....|...==..==..==.......G....
15   #################..............##########
```
Legenda: team building 176–181; `C` checkpoint 183 (review A); `K` chiosco IT 184; `|` barriera 189; `=` VPN; `G` traguardo 210.
- Team building nella zona 176–181.
- Chiosco IT a 184, barriera a 189 (si aspetta in 185–188).
- Burrone 191–204 con tre VPN larghe 2 (193–194, 197–198, 201–202, riga 14). Tutti i salti hanno 2 colonne vuote: 190 → 193, 194 → 197, 198 → 201, 202 → 205. Senza le VPN il burrone (14 colonne) non si passa.
- Fase: la VPN *k* è sfasata di `k × 400 ms` nella stessa direzione della corsa, così una corsa ben cronometrata trova ogni VPN connessa. Chi si ferma su una VPN deve aspettare il giro successivo della seguente.
- Pavimento 205–214, traguardo 210.
- Da controllare: la regola dei 12 tratti vuoti e i salti con la tabella "normale"; smoke e test con le coordinate del vecchio traguardo (176) vanno aggiornati.

### Livello 4
- `hrCourse` a col **120** (tra il deck 112–117 e la sporgenza 124). L'attestato è a col 95, riga 9, raggiungibile solo dalle piattaforme del chip AI (percorso alto).
- `contractor` a col **121**: ponte one-way alla riga 14, colonne 130–138, in alternativa allo slot scope creep (burrone 130–139); "da specifica" arriva fino a 137.

### Livello 5 (torre)
- `contractor`: la posizione si propone nella milestone F-5, nella scheda del livello, dopo aver giocato il livello 4.

## 6. Milestone
- [x] **IT-1** `RestartBrain` + `forcedRestart` nel livello 2 + causa `it` + test + smoke.
- [x] **IT-2** `VpnBrain`, `TicketBrain`, `vpn`, `itTicket`; livello 3 allungato (S7) con gli slot `it`; test (anche il validatore con ogni pivot) + smoke.
- [x] **HR-1** `TeamBuildingBrain` + stato `away` nel `Team` + zona nel livello 3 + causa `hr` + test + smoke.
- [x] **HR-2** `hrCourse` + attestato + slot `hr` nel livello 4 + burnout `hrCourse` +5% + test + smoke.
- [x] **EXT-1** `ContractorBrain` + `contractor` nel livello 4 + test + smoke.
- [ ] **EXT-2** fornitore nel livello 5 (proposta nella scheda, poi codice).

Ogni milestone:
- `npm test`, `npm run build`, smoke senza errori in console (confrontando i controlli a tempo con il commit prima);
- scheda in `LEVELS.md` e riga in `DECISIONS.md`;
- review in contesto separato alla fine di IT e di HR.

## 7. Domande aperte per l'utente
1. Una lezione unica per IT e una per HR? Testi delle lezioni?
2. Livello 3 allungato a 215 colonne: va bene? (La classifica del livello 3 non sarebbe più confrontabile.)
3. Burnout del corso HR +5%: va bene?

## 8. Esito della review del piano (`docs/PLAN_REVIEW.md`)
Accolti nel piano (valgono per l'implementazione):
- **Fornitore (bloccante):**
  - si attiva solo con un'azione esplicita: **E** quando sei alla scrivania (prima della delega), mai al semplice tocco;
  - la scrivania sta fuori dal percorso obbligato;
  - la geometria della scorciatoia si propone in EXT-1, con un vantaggio reale (non accanto a un percorso con pilastri altrettanto facile) e un difetto "da specifica" che conta (salto non fattibile senza la colonna mancante).
- **Incidenti solo se fanno danno:**
  - riavvio forzato: incidente `it` solo se muori entro 2 s dall'inizio del blocco;
  - team building: un incidente `hr` per vita, solo se mentre il team è via tocchi un chiosco o una barriera che lo richiederebbe.
- **Riavvio forzato:** il blocco parte quando sei a terra (a zero, se sei in aria, aspetta l'atterraggio): mai un blocco a metà salto.
- **Livello 3:** schema ASCII corretto (sopra), salti da 2 colonne vuote, fase della VPN dichiarata, **checkpoint a 183**.
- **Validatore:**
  - VPN solide in entrambe le modalità;
  - `itTicket` e `hrCourse` come barriere nell'opzione `gatesClosed`;
  - i nuovi tipi in `entityColumns`.
- **Team building:**
  - lo stato `away` conta in `aliveCount` (non è una perdita né a fine livello né al checkpoint);
  - la contromossa dichiarata è aspettare gli 8 s oppure aprire il ticket da solo (non c'è un modo di "aggirare" la zona: la scia passa da lì).
- **Corso HR:** attestato e corso valgono per **tutto il livello** (non si perdono alla morte): il +5% si paga al massimo una volta.

Da decidere con l'utente: la catena dei pivot. `it`, `hr`, `pm` e `linkedin` possono diventare la lezione dominante verso un livello che non ha uno slot per loro (per esempio dal livello 4 al 5). Oggi la lezione si vede ma non cambia niente.

## 9. Review del codice del livello 4 (`docs/CODE_REVIEW_LEVEL4_RESOURCES.md`)
Applicati:
- il PM chiede **una volta per livello** (il +10% non si somma a ogni vita);
- il recruiter registra **un incidente per vita**;
- il testo della lezione `pm` cita anche le risorse;
- nuovo controllo smoke "dopo una morte il PM non chiede di nuovo";
- `occupy()` senza argomento.

Lasciati:
- il salto massimo dal pilastro che può atterrare sul tappeto (142): il tappeto è visibile;
- i test Vitest sul `prepaid` del `Team` (il `Team` dipende da Phaser; lo coprono gli smoke);
- il confronto R / proseguire dopo aver perso il team.

## 10. Risposte dell'utente e come è stato costruito (2026-11-03)
Risposte:
1. Sì alle lezioni `it` e `hr` con i testi proposti.
2. Sì al livello 3 a 215 colonne.
3. Corso HR **+10%**.
4. Le lezioni senza slot nel livello dopo restano come sono.

Differenze rispetto al piano:
- **Fornitore (EXT-1):** la scrivania è a col **104** del livello 4, prima del checkpoint 106; si ingaggia con **E** (4 GU), mai al tocco.
  - Costruisce tre gradini one-way: 110–111 r13, 107–108 r11, 110–111 r9. "Come da specifica" manca l'ultimo; si aggiunge segnalando il difetto con un altro **E**.
  - In cima, a col 108 riga 5, c'è l'**attestato HR**, raggiungibile solo dall'ultimo gradino (verificato con un test sull'altezza del salto).
  - Così il fornitore è una scelta vera: 4 GU contro il corso (+10% burnout e 2 s fermo).
- **Corso HR:** barriera a col 120, referente a 119, si attiva arrivando a 118–119. Corso e attestato valgono per tutto il livello.
- **Ticket IT:** un junior delegato apre il ticket e resta al chiosco. L'incidente `it` conta se la barriera si richiude con te davanti (entro 6 colonne).
- **VPN:** piattaforme one-way, ciclo sul tempo del livello (non si azzera al respawn).
- **Team building:** stato `away` nel `Team` (conta in `aliveCount`, torna in fondo alla fila).
- **Tasto E:** `GameScene` chiede prima agli NPC (`onAction`, il fornitore) e poi delega.
- **EXT-2 (fornitore nel livello 5):** non costruito. La posizione nella torre si propone dopo il playtest del livello 4.

Verifica:
- `tests/ItHrExternal.test.js` (14 test):
  - i brain;
  - livello 3: 215 colonne, non attraversabile senza VPN, barriera del ticket;
  - lezioni;
  - attestato raggiungibile solo dall'ultimo gradino.
- `tests/LevelParser.test.js` con i pivot `it` e `hr`.
- `scripts/smoke/smokeItHr.mjs`, 11 controlli:
  - riavvio forzato;
  - ticket, incidente e P1;
  - VPN;
  - team building, incidente e ritorno;
  - corso +10%;
  - fornitore con difetto e attestato;
  - pivot `hr`.
- Gli smoke hanno timeout larghi: in un container lento il tempo di gioco scorre a circa 0,3× quello reale.

## 11. Esito della review del codice (`docs/CODE_REVIEW_IT_HR.md`)
- **#1 (bloccante) junior al team building persi per sempre a fine livello:** accolto. `Team.recallAway()` in `completeLevel` li riporta nel team; c'è uno smoke da livello 3 a livello 4.
- **#2 ticket da rifare a ogni morte:** accolto. Una volta risolto resta aperto dopo la morte (smoke).
- **#3 morti nel burrone attribuite all'IT anche senza colpa:** accolto. Contano per l'IT solo se la VPN si è disconnessa con te sopra.
- **#4 delegare il ticket costava un junior:** accolto con una scelta mia, da confermare con l'utente. Il junior delegato torna in fondo alla fila quando la barriera si apre.
- **#5 incidente HR del livello 3:** accolto. Conta anche quando apri il ticket IT con il team al team building (`Team.blameHr`, una volta per vita).
- **#6 fornitore:** accolto.
  - E funziona solo a terra davanti alla scrivania.
  - Con meno GU del costo dice "non te lo puoi permettere" e non sfora il budget.
- **#7 fornitore con la lezione `hr`:** accolto. "Niente da costruire".
- **#8 corso HR a metà salto:** accolto. Parte solo a terra.
- **#9 i junior attraversano le barriere chiuse:** accolto. Ticket e corso chiusi bloccano la delega come il varco.
- **#11 conto alla rovescia e testi:** accolto. Il toast dura 1,5 s e il testo dell'attestato è corretto.
- **Lasciati:**
  - #10: la barriera che si richiude spinge indietro chi ci sta davanti, che è il suo scopo;
  - la spia E e il tasto touch per il fornitore;
  - parte di #12: test a input reale sui gradini.

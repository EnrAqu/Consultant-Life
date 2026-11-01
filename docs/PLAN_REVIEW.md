# Review di `docs/ITERATION_5.md` (livello 5 "Partner")

> Revisore: playbook `review`, contesto separato. Il piano e il codice non sono stati modificati.
> Riferimenti: `CLAUDE.md`, `docs/DECISIONS.md`, `PLAN.md`, codice in `src/` (parser, validatore, `GameScene`, `Player`, `TeamTrail`, `DelegateTargeting`, `Checkpoint`).
> Gravità: **bloccante** (così com'è non funziona, o l'esecutore deve inventare una parte essenziale), **importante** (porta quasi sicuramente a un risultato sbagliato o ingiusto), **minore** (incoerenza o rifinitura).

---

## 0. Conti fisici di riferimento

Costanti: `g = 1800`, gravità in caduta `2500`, `v_jump = 620`, `v_run = 260`, vista del mondo 768×432 px (24 × 13,5 tile).

| Grandezza | Calcolo | Valore |
|---|---|---|
| Apice del salto | 620² / 3600 | 106,8 px = **3,34 tile** (il piano: corretto) |
| Tempo in aria (stessa quota) | 0,344 + 0,292 | 0,637 s |
| Distanza a piena corsa | 260 · 0,637 | 165 px ≈ 5,2 tile |
| Salita di +3 tile | margine verticale all'apice | **10,8 px**: è il limite fisico |
| Salto del leccapiedi ×1,35 | 837² / 3600 | 194,6 px = **6,1 tile** sopra il punto di stacco; staccando dalla sua testa (≈ 1 tile) **≈ 7 tile** sopra il pavimento. Il piano dice "≈ 5,5" |
| Blocco ambizioso allo stadio 4 | 1,4 s · 80 px/s | 112 px = 3,5 righe (il piano: corretto) |
| Margine per piano | v_player < v_tide · 960 / 1216 | 0,79 × marea (il piano: corretto) |
| Attesa massima SteerCo | ciclo 3 × 2,4 s | 7,2 s → 504 px di marea allo stadio 3 (15,7 righe) |
| Scorrimento SteerCo | 6–19 colonne in 300 ms | **640–2000 px/s** (2,5–8 × la corsa del player) |

---

## 1. Problemi

### 1. Con la presa innocua + il guinzaglio, l'escalation non ha alcuna conseguenza (anzi, farsi prendere conviene)
- **Gravità:** bloccante (di design; tocca la decisione Q3, quindi serve l'utente)
- **Dove:** §2 "Guinzaglio", "Presa", "Verifica dei tempi"; §4 "Tempi"; I5-M3, I5-M7
- **Problema:** il guinzaglio tiene già la marea a ≤ 8 righe sotto il player. La presa la riporta **esattamente** a 8 righe sotto e la ferma 1,5 s: farsi prendere equivale a guadagnare 1,5 s di pausa, senza costo (niente morte, niente GU, e l'incidente registrato non serve a nulla perché dopo il livello 5 non c'è una Lessons Learned). La "sfida principale" del livello (DECISIONS 2026-11-01) è decorazione. Di conseguenza tutti i vincoli di tempo del piano (margine ≥ 3 righe, ambiziosi dove il margine è ≥ 5, corsa di riferimento) sono lavoro senza effetto. Inoltre ogni caduta dentro la torre (che è voluta e frequente) produce una presa → flash + battuta + toast ripetuti.
- **Fix proposto:** chiedere all'utente una penalità "innocua ma reale" che rispetti Q3 (niente morte né GU). Opzioni: (a) **dentro la marea sei rallentato** (corsa ×0,6, salto ×0,85) finché non ne esci, e la marea **non** si riabbassa né si ferma: costa tempo, non vite (consigliata); (b) almeno togliere la pausa di 1,5 s e il riabbassamento, così la presa non è un premio. Finché la penalità non è decisa, ridurre I5-M3 a una versione semplice (marea + stadi + indicatore) e rimandare la corsa di riferimento e i vincoli di margine. Battuta della presa al massimo una volta ogni N secondi.

### 2. Il trampolino del leccapiedi non si può realizzare con `TeamTrail`, e i numeri sono sbagliati
- **Gravità:** bloccante
- **Dove:** §5 "Ti segue", "Inchino-trampolino"; §9 piano 4 e lobby
- **Problema:** `TeamTrail.positionFor` restituisce la posizione esatta del player di 500 ms prima: appena ti fermi, dopo 0,5 s il leccapiedi è **sovrapposto a te**, quindi non puoi saltargli in testa (e i junior, a 300/600 ms, gli stanno addosso). Il leccapiedi è un'immagine senza corpo: manca un "piano" su cui atterrare. Il salto ×1,35 vale ≈ 6,1 tile (≈ 7 dalla testa), non 5,5; inoltre il taglio del salto (`jumpCutMultiplier` al rilascio del tasto) renderebbe l'altezza casuale per chi rilascia presto. Il passaggio obbligatorio del piano 4 dipende da tutto questo.
- **Fix proposto:** comportamento proprio, non la scia: segue la scia ma **si ferma 1,5 tile dietro** il player (lato opposto a `facing`) quando il player è fermo; testa = zona di overlap 16×6 px attiva solo se il player scende (`vy > 0`) e i piedi sono sopra la testa. Al rimbalzo: `vy = −k·620` con `jumpCutApplied = true` (altezza fissa, indipendente dal tasto). Scegliere `k` dai conti: per un'altezza di 5 tile dalla testa serve `v = √(2·1800·160) = 759` → **k ≈ 1,22**. Aggiornare la tabella `sycophant` del validatore con la formula, non a occhio.

### 3. Il trampolino, disponibile "ovunque tranne in aria", rompe le sfide obbligatorie
- **Gravità:** importante
- **Dove:** §9 vincoli del validatore; §3 "la sfida è obbligatoria"
- **Problema:** il validatore verifica che "senza lavoratori il piano 1 non si sale" con la tabella `normal`, ma il giocatore ha **sempre** il leccapiedi: con 6–7 tile di salto scavalca le scale dei lavoratori, la stanza SteerCo e magari i varchi. Il piano verifica il trampolino solo dove serve, non dove fa danni. Inoltre il leccapiedi esce dalla finestra e dà il trampolino anche nella scala antincendio.
- **Fix proposto:** tutte le verifiche "X è obbligatorio" girano con la tabella `sycophant` attiva; oppure il trampolino funziona solo su **tappetini marcati** (carattere mappa, es. `T`, o entità `bowSpot`): leggibile, verificabile, e il resto della torre resta progettabile. Consiglio la seconda: è anche un indizio migliore ("qui serve il leccapiedi").

### 4. SteerCo: il validatore del livello non può attraversare la stanza, e la fisica descritta non regge
- **Gravità:** bloccante
- **Dove:** §6; §9 "validatore normal dalla lobby al Board"; I5-M5, I5-M7
- **Problema:**
  1. `validateLevel` è statico; il piano non dice come rappresentare le piattaforme mobili (un layout? l'unione? nessuna?). L'unione dei layout darebbe collegamenti che non esistono mai insieme; nessuna superficie rende il Board irraggiungibile. Il criterio di I5-M7 così non è soddisfacibile.
  2. Piattaforme a 3 righe l'una dall'altra (e la prima a 3 righe dal pavimento): +3 tile è il limite fisico (10,8 px di margine) e con tabella `normal` il gap massimo è 1, cioè piattaforme quasi sovrapposte in orizzontale → il player sbatte la testa sotto la piattaforma superiore se il corpo è solido da tutti i lati. Nel codice non esiste ancora nessun corpo mobile one-way.
  3. Scorrimenti di 6–19 colonne in 300 ms = 640–2000 px/s: chi ci sta sopra viene sparato, chi sta atterrando trova la piattaforma sparita. Non è "crudele ma giusto".
  4. Il trasporto: in Arcade funziona solo se il corpo si muove **a velocità** (`moves = true`, `immovable`, `allowGravity = false`) con `friction.x = 1` (default); con tween/`setPosition` il player resta indietro. Il piano lo intuisce ma non lo specifica.
- **Fix proposto:** righe a **2** tile di distanza (gap `normal` fino a 3); corpi con `checkCollision.down/left/right = false` (one-way come `=`); velocità di scorrimento fissa (es. 400 px/s, durata = distanza/velocità, ≤ 1,5 × la corsa del player) al posto dei 300 ms; nel validatore la stanza è una **scatola nera**: `trapSurfaces('steerCo')` restituisce zero celle, ma il validatore aggiunge un arco "ingresso → uscita" se il test del brain passa (grafo sugli stati piattaforma×layout). Scriverlo nel piano.

### 5. Gli ambiziosi, come descritti, non si possono evitare saltando
- **Gravità:** importante
- **Dove:** §4 "Presa", "Come evitarli"
- **Problema:** la presa scatta appena l'ambizioso entra nella **tua** torcia (5 tile davanti) mentre sei a terra. Correndo verso di lui, a 5 tile sei preso prima di poter saltare; un salto da 6 tile copre ≈ 5,2 tile e atterri davanti a lui, di nuovo nella torcia. "Arrivare da dietro le sue spalle" non ha senso con questa regola: conta dove guardi tu, non lui. L'indizio a 7 tile dà 2 tile = 0,25 s a piena corsa.
- **Fix proposto:** stato `noticed` di 400 ms ("Partner!") all'ingresso nella torcia: se in quel tempo salti o esci dalla torcia, niente presa. Oppure portata 3 tile per gli ambiziosi. Togliere "da dietro le spalle" o definire il suo `facing` nella regola. Aggiungere un test del brain: "corsa a 260 px/s + salto all'indizio → nessuna presa".

### 6. I lavoratori si sfruttano saltellando sul posto
- **Gravità:** importante
- **Dove:** §3
- **Problema:** la torcia è spenta in aria e in aria passi ≈ 0,64 s per salto, quasi il 100 % del tempo se salti di continuo (jump buffer). Saltellare guardando il lavoratore = il lavoratore lavora. La battuta "girati dall'altra parte" sparisce. Inoltre "direzione `up`" produce una colonna piena (un muro, non una scala: nel gioco non esistono scale a pioli); il piano non dice cosa succede se la cella da costruire è occupata dal player o dal junior (incastro nel corpo solido), né se il costruito resta dopo una morte o un respawn al checkpoint.
- **Fix proposto:** per i lavoratori la torcia vale **anche in aria** (la regola "in aria è spenta" resta solo per gli ambiziosi) oppure `resumeMs ≥ 800` (più dell'intera fase di volo). Sostituire `up` con `stairs` (gradini da 1 riga, 2 colonne ciascuno) con forma esplicita; la costruzione salta (aspetta) se la cella interseca il player; il costruito resta fino al checkpoint successivo e al respawn riparte dallo stato salvato al checkpoint.

### 7. Il leccapiedi complimenta proprio quando le altre meccaniche ti chiedono di aspettare
- **Gravità:** importante
- **Dove:** §5 "Complimento" contro §3 (attesa dei lavoratori) e §6 (attesa del layout)
- **Problema:** ti segue sempre, quindi qualunque sosta > 0,8 s finisce con un blocco di 1 s. Davanti al lavoratore (aspetti 1–2 s per forza) e nello SteerCo (aspetti fino a 7,2 s) il blocco arriva quasi sempre, e nello SteerCo può cadere esattamente sulla finestra del layout giusto → altri 7,2 s. È deterministico, ma punisce l'unico comportamento che il livello stesso richiede: è "crudele", non "giusto".
- **Fix proposto:** il complimento non scatta su piattaforme mobili, nel raggio di un lavoratore attivo, né durante il preavviso SteerCo; oppure una sola volta per piano. In alternativa tagliare il complimento (vedi #15).

### 8. Porta Recruiter: la conferma con ↑ è anche un salto
- **Gravità:** importante
- **Dove:** §8 tabella, riga "Società prodotto"
- **Problema:** ↑ (come W, Z, Spazio) è il salto. DECISIONS 2026-10-31 ha già escluso ↑ per il pivot dei "5 minuti" esattamente per questo motivo. Premere ↑ davanti alla porta = salti e accetti insieme; ← → per "no" ti fanno anche camminare.
- **Fix proposto:** conferma con **↓ / S** (tasti oggi liberi in `GameScene.keys`), "no" = allontanarsi dalla porta. Registrare la scelta in DECISIONS.

### 9. Scala antincendio: discesa alla cieca e marea sopra di te
- **Gravità:** importante
- **Dove:** §1 "Camera", §2 "Si ferma", §8 "Il sentiero dei campi"
- **Problema:**
  1. La camera verticale mostra ≈ 8,5 righe sopra e ≈ 5 sotto il player, pensata per salire. Una discesa di 148 righe con salti precisi e monete "dove atterri naturalmente" vista con 5 righe sotto è un salto alla cieca: non è giusto. Vale anche per le cadute nella torre.
  2. La marea si ferma alla quota del Board, ma è una fascia larga quanto il mondo: le colonne 33–40 ne sarebbero coperte dalla riga ~20 in giù. Si scende dentro le email.
  3. Una moneta toccata riporta alla finestra: fino a 148 righe da rifare, senza checkpoint.
  4. Il validatore controlla solo le celle di atterraggio: una caduta lunga che **attraversa** una moneta a mezz'aria passa la BFS ma nel gioco ti rimanda su.
- **Fix proposto:** `followOffset.y` dipende dalla direzione verticale (−70 quando `vy > 300` o nella zona della scala antincendio); la marea è limitata alle colonne della torre (0–31); un pianerottolo-checkpoint ogni ~30 righe (la moneta riporta all'ultimo); nel validatore le monete sono celle `blocked` anche per le colonne attraversate dall'arco (estendere `clearArc` a tutto l'intervallo verticale per i salti con `rise ≤ −2`).

### 10. Il finale dei campi si chiude per sempre alla prima opportunità raccolta
- **Gravità:** importante
- **Dove:** §7 "Restano raccolte anche dopo una morte", §8 "pipeline 0/3", Q1
- **Problema:** chi raccoglie anche un solo `$` non può più aprire la finestra in quella partita, e non c'è modo di ricominciare il livello 5 (R = respawn al checkpoint; il finale Partner riporta al Progetto 1). Per provare il segreto bisogna rigiocare i livelli 1–4. Per un segreto "che si capisce senza spiegarlo" il costo di un tentativo è sproporzionato.
- **Fix proposto:** in `EndingScene` (tutti i finali tranne i campi) un'opzione "Riprova il Progetto 5" (stesso team e pivot); oppure un modo esplicito di "restituire" le opportunità. Decidere con l'utente; Q1 resta valida.

### 11. Checkpoint verticali: ordine, nomi e regressioni
- **Gravità:** importante
- **Dove:** §2 "Respawn", §9 tabella, §10 debug `cp=f2|f3|f4|board`
- **Problema:** `parseLevel` ordina i checkpoint per **x** e li chiama `cp0..cpN`: in una torre l'ordine è casuale e `?cp=f2` non corrisponde a nessun id. `Checkpoint.activate` accetta qualunque checkpoint non ancora attivo: chi salta il piano 2 con la scorciatoia dei "5 minuti" e poi cade, toccando il checkpoint del piano 2 **sposta il respawn in basso**. La tabella di §9 non mette un checkpoint al piano 1 né al Board, ma §2 parla di "checkpoint del Board".
- **Fix proposto:** nei livelli verticali ordinare per y decrescente (dal basso) e permettere id espliciti dalla mappa o da `def.checkpointIds`; un checkpoint si attiva solo se è più in alto di quello corrente; completare la tabella di §9 (piano 1 e Board).

### 12. La delega sceglie il bersaglio solo in orizzontale
- **Gravità:** importante
- **Dove:** §4 "delegare un junior"; `core/DelegateTargeting.js`
- **Problema:** `pickDelegateTarget(playerX, facing, targets, …)` ignora la y: in una torre il bersaglio "più vicino davanti" può essere un ambizioso o una trappola due piani sopra o sotto, nella stessa colonna.
- **Fix proposto:** aggiungere `playerY` e `rangeRows` (es. ±2 righe) a `pickDelegateTarget`, con test; dire nel piano che il leccapiedi non è delegabile.

### 13. Corsa di riferimento con input registrati: non verificabile in modo affidabile
- **Gravità:** importante
- **Dove:** §2 "Criterio", I5-M7
- **Problema:** gli smoke test girano in tempo reale e sono già sensibili al carico (DECISIONS 2026-10-31); un replay di input su 150 righe, con fisica a passo variabile, diverge dopo pochi secondi. Il criterio "≥ 3 righe di margine per piano" diventerebbe un test instabile.
- **Fix proposto:** verifica analitica in Vitest: percorso del validatore (BFS con lunghezza del cammino) × tempi per tipo di salto + attese fisse (lavoratori, layout SteerCo, blocchi) → tempo per piano, confrontato con `EscalationBrain` simulato. Lo smoke test controlla solo che la marea parta, cambi stadio e si fermi. Comunque subordinato a #1.

### 14. Camera: il piano non dice come convivere con `updateCamera`
- **Gravità:** minore
- **Dove:** §1 "Camera"; `GameScene.updateCamera`, `respawn`
- **Problema:** `updateCamera` chiama `cam.setFollowOffset(-lookAhead, 0)` a ogni frame: un `followOffset.y = 70` impostato in `create` viene azzerato subito. La deadzone attuale è 60×70 (non 60×40 come implica il "resta"). `respawn` usa `centerOn` senza l'offset (salto di camera al respawn).
- **Fix proposto:** `updateCamera` usa `this.cameraOffsetY` (0 nei livelli orizzontali, ±70 nei verticali, vedi #9); `respawn` centra tenendo conto dell'offset.

### 15. Troppe meccaniche nuove in un solo livello, e tre di queste sono "un NPC che ti ferma"
- **Gravità:** importante (design, ritmo)
- **Dove:** §0, §9
- **Problema:** il livello 5 introduce: livello verticale + camera, escalation, torcia invertita, lavoratori, ambiziosi, leccapiedi (trampolino **e** complimento), SteerCo, opportunità + porta del Board, porta Recruiter con conferma, finestra + scala antincendio + monete, 4 finali; e in più eredita team, delega, standup e 4 slot di pivot. I livelli 2–4 ne introducevano 2–4 ciascuno. Il piano 2 ha due meccaniche quasi identiche (ambiziosi e collega dei "5 minuti", entrambi "ti fermano per parlarti"), e il complimento del leccapiedi è una terza. Il tutto in un livello che dura, a stima, 90–120 s per chi lo conosce (150 righe a ~80 px/s + attese) più la scala antincendio: è il doppio del livello 1 (45–60 s, DECISIONS), dopo che il playtest #2 ha segnalato "noioso".
- **Fix proposto:** tagliare almeno due cose. Candidati: il complimento del leccapiedi (resta il trampolino, che è la parte divertente), lo slot `fiveMinutes` nel piano 2 (spostarlo o renderlo solo la porta pivotata), oppure gli ambiziosi (la torcia invertita resta coi lavoratori). Dividere l'iterazione in **5a** (torre, camera, escalation, lavoratori, trampolino, Board + finale Partner, burnout) e **5b** (SteerCo, ambiziosi, Recruiter, campi), con un playtest in mezzo. Torre da 4 piani da 24 righe invece di 5 da 30, se 5a basta.

### 16. Costo in GU di ambiziosi e complimenti non specificato
- **Gravità:** minore
- **Dove:** §4, §5, §10
- **Problema:** DECISIONS dice che micromanager e "5 minuti" costano 0,5 GU; qui si parla solo di "incidenti". L'esecutore deve indovinare. Con il peso dell'incidente inutile (ultimo livello, niente Lessons Learned) l'unico effetto concreto possibile è il GU.
- **Fix proposto:** scrivere esplicitamente "0 GU" o "0,5 GU" per ciascuno. Se 0, togliere la registrazione come incidente o dire che serve solo per le statistiche.

### 17. Il finale burnout è quasi irraggiungibile
- **Gravità:** minore
- **Dove:** §8, §9 (`startGu: 20`)
- **Problema:** nel livello 5 cadere non uccide, la marea è innocua, e le cose letali sono solo gli slot e le spine: servono 40 morti. Il finale "amaro ma comico" lo vedrà quasi nessuno.
- **Fix proposto:** se è voluto, scriverlo; altrimenti `startGu` più basso (10–12) o un costo GU per le prese della marea/degli ambiziosi (si lega a #1 e #16).

### 18. Parser e mappa: `G` unico, caratteri nuovi, righe HUD
- **Gravità:** minore
- **Dove:** §1, §7, §8; `LevelParser.js`
- **Problema:** il parser vuole esattamente una `G`: il piano non dice se è il Board (con `Goal`/`trolls`) o se `BoardDoor` la sostituisce. `$` e `€` vanno aggiunti a `KNOWN` (`€` non è ASCII: meglio un carattere ASCII). §1 dice che il parser esclude le righe 0–1, ma quel controllo (`e.y < 2`) sta nel validatore.
- **Fix proposto:** `G` = Board (porta chiusa via `def.goal.requiresDeals: 3`), Recruiter e uscita dei campi come entità; monete con un carattere ASCII (es. `€` → `b`); correggere §1.

### 19. `longestQuietClimb`: "stessa definizione per righe" non basta
- **Gravità:** minore
- **Dove:** §1 "Ritmo"
- **Problema:** `entityColumns` restituisce solo colonne; per le righe serve una `entityRows` per ogni tipo (vecchi e nuovi), e "gradino" / "burrone" non hanno un equivalente verticale ovvio. Le deviazioni delle opportunità contano come attività anche se fuori dal percorso?
- **Fix proposto:** definire `entityRows` per tipo e "riga attiva" = riga con un'entità, un pickup, un checkpoint o un cambio di piattaforma raggiungibile dal percorso BFS; tabella nel piano.

### 20. Validatore: costo e "tutte le combinazioni di pivot"
- **Gravità:** minore
- **Dove:** §1, §9
- **Problema:** la BFS prova tutte le righe di destinazione (`y2` da 1 a `height`): su 150 righe × 41 colonne, ripetuta per ogni pivot e per ogni tabella (`normal`, `sycophant`, monete), il test diventa lento. "Tutte le combinazioni di pivot" sono in realtà 5 casi (nessuno + 4 slot: un solo pivot per volta).
- **Fix proposto:** limitare `y2` a `[y − 6, height)` (oltre non si sale comunque); scrivere "5 casi".

### 21. Rifiniture di testo e coerenza
- **Gravità:** minore
- **Dove:** §2, §8
- **Problema:** "il cliente ha messo in CC il tuo capo": da Partner il "capo" stona; la catena Manager → CEO è del cliente o tua? §8 dice che la leaderboard non si mostra nei campi ma che le partite dei campi entrano in leaderboard: va bene, ma `Leaderboard.record` non ha un campo per l'etichetta del finale. Il finale dei campi è giocabile (outfit `farmer`, uccellini) o una scena fissa? Il debug `ending=` deve entrare in `DEBUG.anyOverride`. Lo `startGu` del livello 5 (20) è più alto dei livelli 2–4 (15) senza motivo scritto.
- **Fix proposto:** "il cliente ha messo in CC il suo CEO" (la catena è del cliente); aggiungere `ending` a `Leaderboard.record`; decidere scena fissa o giocabile; elencare `ending` tra gli override; motivare lo `startGu`.

---

## 2. Coerenza con `DECISIONS.md` e `PLAN.md`

- Coerente: torre verticale ("la scalata è letterale", PLAN.md), niente micromanager dal livello 4, 4 finali nel livello 5, slot pivot che coprono tutte le cause pivotabili possibili del livello 4 (`replyAll`, `fiveMinutes`, `deckCollapse`, `scopeCreep`), meccaniche nuove senza variante pivotata.
- Divergenze già decise dall'utente (ok): escalation fissa invece che "a GU esaurite o a caso" (e il "a caso" violerebbe comunque "niente casualità"); presa innocua invece di "torni all'inizio del mondo" (ma vedi #1).
- In conflitto con una decisione registrata: conferma con ↑ (#8).

## 3. Riassunto

Il piano è ricco e il tema regge (la torcia invertita e il finale dei campi con le "ore fatturabili" sono le idee migliori), ma così com'è non si può implementare senza inventare parti essenziali.
**Bloccanti (3, di cui uno di design):**
- #1: con presa innocua + guinzaglio l'escalation non ha conseguenze, anzi farsi prendere conviene. Serve una penalità decisa con l'utente (proposta: rallentamento dentro la marea).
- #2: il trampolino del leccapiedi non funziona con `TeamTrail` (ti sta addosso) e il salto vale ≈ 6–7 tile, non 5,5.
- #4: SteerCo non è modellato nel validatore, i salti da +3 sono al limite fisico, servono corpi mobili one-way e velocità di scorrimento ragionevoli.

**Importanti:** il trampolino scavalca le sfide obbligatorie (#3); gli ambiziosi non si evitano (#5); i lavoratori si sfruttano saltellando (#6); i complimenti colpiscono le attese obbligatorie (#7); ↑ = salto alla porta del Recruiter (#8); scala antincendio alla cieca e sommersa dalla marea (#9); il segreto dei campi costa una campagna intera per tentativo (#10); checkpoint e delega non sono pensati per la verticale (#11, #12); la corsa di riferimento sarebbe un test instabile (#13); troppe meccaniche in un livello (#15).

Consiglio: risolvere #1 con l'utente, poi dividere l'iterazione in 5a/5b (#15) e applicare i fix con il playbook `plan` prima di qualsiasi milestone.

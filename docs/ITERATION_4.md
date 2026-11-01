# Iterazione 4 — Ritmo, traguardo che tradisce, Team & Delega, Livello 4

> Stato: **in sviluppo** (2026-10-31): domande Q1–Q4 chiuse (E, team dal livello 3, junior persi per sempre, puppeteer-core).
> Fonte: `docs/PLAYTEST.md` (playtest #2) e risposte dell'utente del 2026-10-31.
> Regole invariate: trappole e NPC deterministici, logica pura in `src/core/` con test, percorsi obbligatori con salti "normali" (validatore), "crudele ma giusto".

## 0. Cosa cambia

| # | Richiesta | Sezione | File principali |
|---|---|---|---|
| A | Meno parti noiose (es. fine del livello 1) | §1 | `level1.js`, `LevelValidator.js` (nuovo controllo) |
| B | Email più veloci, CR **molto** più veloci | §2 | parametri nei livelli, `ScopeCreepPlatform.js` |
| C | Traguardo che tradisce: il cliente cambia idea (−5 GU); **si vince arrivando da destra**; altrimenti il cartello viene portato avanti. Solo livelli 2 e 4 | §3 | nuovo `objects/Goal.js`, `core/GoalBrain.js`, `level2.js`, `level4.js` |
| D | **Team** (ti segue) + **Delega** (sacrifichi un membro), con sfide che richiedono sacrifici | §4 | nuovi `core/TeamTrail.js`, `objects/team/*`, `objects/traps/ApprovalGate.js` |
| E | **Livello 4 "Senior Manager"** | §5 | `level4.js`, arrivista, bonus AI |

---

## 0b. Micromanager "a torcia" (richiesta del 2026-10-31)

Playtest: il micromanager è simpatico ma **inutile**: il controllo ogni 6 s e l'esenzione "se corri sei impegnato" lo rendono innocuo. Diventa una **sfida stealth**: il suo sguardo è una **torcia**, e se ci entri ti ferma.

| Prima (iterazione 3) | Ora |
|---|---|
| Controllo ogni 6 s, annunciato da "…" | **Nessun timer**: entri nella torcia → ti ferma |
| Se corri (≥ 200 px/s) non ti ferma | Correre **non** salva: conta solo stare fuori dalla luce |
| Cono lungo 7 tile, alto 3 | Torcia **corta e bassa**: lunga 5 tile, alta 2 tile dai piedi, quindi si **salta sopra** |
| Si gira solo ai bordi della zona | **Pattuglia a ritmo fisso**: si gira ogni `turnEveryMs` (3000) e ai bordi; 400 ms prima di girarsi fa "…" e la torcia lampeggia |

Regole:
- **Presa** = player **a terra** con la hitbox dentro la torcia, e non già bloccato. In aria dentro la torcia non succede nulla: se atterri fuori sei salvo. Così resta vero che il micromanager **non uccide mai** (nessuna presa sopra un burrone).
- Effetto della presa invariato: si avvicina, *"Fermati un attimo. Spiegami cosa stai facendo."*, sei bloccato 2 s, **−0,5 GU**, poi la demo *"Io l'avrei fatto così"* (riuscita o caduta alternate).
- Dopo la presa la torcia resta **spenta** per `cooldownMs` (3000): è la finestra per passare.
- Le **piante bloccano la luce**: dietro una pianta sei invisibile anche dentro la portata.
- La torcia non attraversa i burroni e lui non ci cammina sopra (invariato).
- Modalità `pivoted` invariata: ti precede e ti indica le trappole.

Contromosse leggibili: saltare sopra la torcia, passare alle sue spalle mentre guarda dall'altra parte (il "…" ti dice quando sta per girarsi), aspettare dietro una pianta.

Il controllo periodico ogni 6 s e l'esenzione `busySpeed` vengono **rimossi**.

Parametri: `{ sightRange: 5, sightRows: 2, turnEveryMs: 3000, turnTellMs: 400, explainMs: 2000, explainCost: 0.5, cooldownMs: 3000 }`.

**Accettazione (agente):** test di `MicromanagerBrain`:
- player a terra nella torcia → presa entro 1 frame (anche se corre);
- in aria sopra la torcia → nessuna presa;
- alle sue spalle → nessuna presa;
- dietro una pianta → nessuna presa;
- si gira ogni 3 s con "…" 400 ms prima;
- dopo una presa, 3 s senza prese.

Smoke: correndo dritto dentro la torcia nel livello 2 si perdono 0,5 GU; saltandoci sopra no.
**Playtest utente:** il micromanager diventa una sfida vera, non un fastidio.

---

## 1. Ritmo: niente tratti morti (A)

**Regola nuova, misurabile:** in un percorso obbligatorio non ci sono più di **12 colonne consecutive "vuote"**, cioè senza trappola, salto ≥ 2, NPC o pickup. Il `LevelValidator` la verifica con la funzione `longestQuietStretch(level)`; il test fallisce oltre 12. Le zone del micromanager e i corridoi delle trappole contano come "attivi".

**Livello 1:**
- **S4 (respiro, cols 73–110 → 73–96):** due caffè invece di tre; il KT finto resta accanto al 2° caffè; checkpoint spostato a col ~96.
- **S7 (fine, cols 161–219 → 161–190):** si toglie la corsa piatta. Nuovo finale "Prima di consegnare, un ultimo giro di commenti": una **CR veloce** (scope creep) sul penultimo gradino, poi una **mini-valanga** di 5 email a 4 colonne dal traguardo, quindi il cartello. Il livello 1 resta "onesto": il cartello non tradisce.
- Larghezza del livello 1: 220 → ~195 colonne. Durata stimata per chi lo conosce: 40–50 s.

**Accettazione (agente):** test `longestQuietStretch ≤ 12` per i livelli 1–4; validatore `normal` ok.
**Playtest utente:** "non mi annoio".

---

## 2. Email e CR più veloci (B)

### Email (tutte le valanghe letali)
- `fallSpeed` 9 → **14** tile/s. Con `spawnHeight` 6 la caduta dura 0,43 s; l'ombra resta visibile per tutta la caduta, quindi un preavviso di 430 ms.
- **Ricalcolo del trigger** perché colpiscano ancora chi corre. Il player che corre (8,1 tile/s) deve trovarsi nella colonna k mentre l'email k attraversa l'altezza del corpo (ultimi 2 tile, cioè tra 0,29 e 0,43 s dopo lo spawn). Ne risulta: `intervalMs` 120 (invariato), **`triggerDx` −5 → −3**.
- Ponte di email (S6a): `fallSpeed` 14, `intervalMs` 150 → 100. Il ponte si completa in ~1,6 s invece di ~2,2.

### CR (scope creep)
- `extendSpeed` 5 → **12** tile/s; `armDelayMs` 450 → **250**. La vibrazione d'avviso dura tutti i 250 ms e il contorno tratteggiato resta sempre visibile.
- Conseguenza voluta: una volta partita la CR **non si batte di corsa** (384 px/s contro 260). La contromossa è saltarci sopra durante la vibrazione, oppure non fermarsi sul trigger.
- Pivot (ponte): `extendSpeed` 8 → 14.

**Accettazione (agente):** smoke "running through reply-all corridor dies by replyAll" e "standing on scope-creep ledge dies by scopeCreep" passano con i nuovi valori; test: il log `t_impatto` delle email cade nella finestra del corridore.
**Playtest utente:** "le email fanno paura, le CR sono cattive".

---

## 3. Il traguardo che tradisce (C) — solo livelli 2 e 4

### Regola
- Il cartello **"Consegna al cliente"** ha un **lato giusto: la destra**, il lato del cliente.
- **Arrivi da sinistra** (come in ogni platform) → il cliente cambia idea:
  - freeze di 1,5 s, compare il cliente con il fumetto *"Ci abbiamo ripensato. Lo affidiamo a un altro fornitore."*;
  - **−5 GU** (causa `clientSwitch`, incidente non pivotabile). Se le GU scendono a 0 → budget sforato **sulla linea del traguardo**;
  - due figure di "un altro fornitore" (outfit diversi, grigi) **prendono il cartello e lo portano avanti** di `carryCols` colonne, oltre un ultimo tratto difficile;
  - il cartello nella nuova posizione tradisce **una sola volta**: se lo tocchi di nuovo da sinistra, vinci.
- **Arrivi da destra**, cioè lo salti senza toccarlo e lo tocchi tornando indietro → **vinci subito**, senza perdere GU. Narratore: *"Consegnato dal lato del cliente. Finalmente hai capito come funziona."*

### Indizi ("crudele ma giusto")
- Il pannello del cartello è **girato verso destra**: si legge il retro grigio da sinistra e il segno verde solo da destra.
- Una targhetta piccola sotto il pannello: *"Ingresso clienti →"*.
- Il cartello è alto 2 tile e si salta (il salto arriva a 3,3 tile), con almeno 3 colonne di pavimento a destra.
- Dopo il primo tradimento il narratore dà la chiave per il futuro: *"Il cliente riceve solo dal suo lato. Era nella SOW."*. Nel livello 4 chi se lo ricorda vince subito.

### Architettura
- `src/core/GoalBrain.js` (puro): `touch({ fromSide: 'left' | 'right', trolls: boolean }) → 'win' | 'troll'`, con stato `trolled` (una volta per vita del livello, non si azzera al respawn).
- `src/objects/Goal.js` sostituisce l'immagine statica di GameScene: zona di contatto, lato calcolato da `player.body.velocity.x` e dalla posizione del player rispetto al centro del cartello al momento dell'overlap, animazione "portato via" (scriptata, 1,2 s), spostamento della zona.
- Parametri di livello: `goal: { trolls: true, carryCols: 14 }` (solo livelli 2 e 4; default `trolls: false`).

### Livello 2
- Il cartello resta a col 106; il livello si allunga a ~125 colonne.
- Tratto oltre il cartello (cols 107–122): una CR veloce e una fossa di spine con pilastro largo 2, poi il cartello portato a col 120.

**Accettazione (agente):**
- test di `GoalBrain`: da sinistra → `troll`, poi `win`; da destra → `win`;
- validatore: la colonna a destra del cartello è raggiungibile saltandolo (salto ≤ "normale");
- smoke: toccarlo da sinistra costa 5 GU e sposta il cartello a col 120; saltarlo e tornare indietro chiude il livello senza perdere GU.

---

## 4. Team & Delega (D)

### 4.1 Il team ti segue (A)
- Dal **livello 3** ("Il primo team", outfit Manager) hai un team di **3 junior** (outfit junior, più piccoli dell'85%).
- Ogni junior **ripete il tuo percorso** con un ritardo: il junior *i* è dove eri tu `(i + 1) × 300 ms` fa (scia di posizioni registrata ogni frame, `core/TeamTrail.js`, puro). Non hanno fisica: non cadono nei burroni, perché passano dove sei passato tu.
- **Possono essere colpiti dalle trappole**: se un oggetto letale tocca un junior, il junior è perso (fogli di carta, narratore *"Il junior ha imparato molto. Troppo."*). È la conseguenza naturale di passare una trappola all'ultimo istante.
- Durante standup, morte e call del KT la scia si ferma con te.
- **Alla tua morte** il team torna com'era all'ultimo checkpoint (non si perde per le tue morti).
- **A fine livello:** la slide Lessons Learned mostra *"Team arrivato alla consegna: 2/3"*. Il numero passa al livello successivo (i junior persi non tornano), con il minimo di 1 garantito dallo "stagista" (§4.3).

### 4.2 Delega (B)
- **Tasto `E`** (anche `Shift`), mostrato nell'HUD come `E delega (3)`.
- Il primo junior **corre avanti** verso il **bersaglio delegabile** più vicino davanti a te, entro 10 colonne, e lo affronta al posto tuo. Il junior delegato è **perso** (resta lì o sparisce).

| Bersaglio | Cosa fa il junior | Effetto |
|---|---|---|
| Valanga di email (trigger) | entra nel corridoio | la valanga parte e lo travolge; dopo il corridoio è libero per la vita corrente |
| Deck che crolla | entra nel corridoio | le slide cadono su di lui e la pila resta da scavalcare |
| Scope creep | si ferma sul trigger | la CR lo spinge giù; poi la CR è estesa: ci sali sopra |
| KT finto | lo prende | la call la fa lui; nessuna GU persa |
| "Hai 5 minuti?" | va a parlare col collega | il collega è occupato: la porta resta chiusa fino al respawn |
| Micromanager | si fa vedere fermo nella zona | il MM spiega a lui: per 8 s la zona è sicura |
| **Varco "Approvazione richiesta"** (§4.3) | si piazza sulla pedana | il varco resta aperto finché lui resta lì (per sempre) |

- Nessun bersaglio entro 10 colonne → il junior dice *"Su cosa, di preciso?"* e torna in fila (nessun costo).
- I bersagli sono le entità con `delegable: true` (trappole e NPC esistenti, più il varco); ognuna espone `delegateTarget() → { x, kind }` e `onDelegate(junior)`.

### 4.3 Sfide che richiedono un sacrificio
- **Varco "Approvazione richiesta"** (nuova entità `approvalGate`): una barriera (vetrata con cartello rosso) che si apre solo finché **qualcuno sta sulla pedana** a 3–5 colonne di distanza. Se ci sali tu la barriera si apre, ma non puoi passare. Serve **delegare**.
- **Stagista di riserva**, per evitare che resti bloccato senza team: prima di ogni varco c'è una **macchinetta "Assumi uno stagista"**; toccandola, se il team è vuoto, arriva un nuovo junior al costo di **2 GU**. Indizio: cartello *"Budget formazione: 2 GU"*.
- **Sacrifici utili ma facoltativi:** tutte le trappole delegabili della tabella. Delegare fa risparmiare tempo e GU, ma arrivi alla consegna con meno persone.
- **Regola di design:** ogni livello con il team ha **almeno 1 varco obbligatorio** e **al massimo 2**, e il numero di varchi obbligatori non supera mai la dimensione del team di partenza. Il validatore lo verifica.

### 4.4 Architettura
- `src/core/TeamTrail.js` (puro): buffer circolare di `{ x, y, flipX, anim }` campionato ogni 16 ms, `positionFor(i)`. Si mette in pausa con il gioco.
- `src/core/DelegateTargeting.js` (puro): dato `playerX` e la lista dei bersagli `{ x, kind, available }`, restituisce il più vicino davanti entro 10 colonne.
- `src/objects/team/TeamMember.js` (vista + stato), `src/objects/team/Team.js` (gestore: scia, collisioni con oggetti letali, delega, HUD).
- `src/objects/traps/ApprovalGate.js` (normal; pivoted = la barriera è già aperta, *"Approvato in automatico. Nessuno sa da chi."*).
- Nuove cause: `teamLoss` (non è una morte del player, non pivotabile; serve al narratore e alle statistiche).
- HUD: icone del team (3 testine) vicino alle GU; `E delega` lampeggia quando c'è un bersaglio a portata.

**Accettazione (agente):**
- test di `TeamTrail` (ritardi, pausa, reset al checkpoint) e di `DelegateTargeting` (bersaglio più vicino davanti, niente dietro, 10 colonne);
- validatore: con il varco chiuso il traguardo non è raggiungibile, con il varco aperto sì;
- smoke: E davanti a un varco → il junior va sulla pedana, il varco si apre, il team scende a 2; E vicino al KT finto → nessuna GU persa.

**Playtest utente:** si capisce cosa fa E; sacrificare i junior fa ridere (e un po' male).

---

## 5. Livello 4 "Senior Manager" (E)

- `id: 'level4'`, `name: 'Progetto 4 — Il cliente strategico'`, `career: 'seniorManager'`, `startGu: 15`, ~200 colonne, team ereditato dal livello 3 (minimo 1).
- **Niente micromanager** (sei più alto di grado).
- **Arrivista** (dal backlog): collega veloce quanto te che corre in parallelo. Ti salta in testa (rimbalzo, non morte), **ti ruba un junior del team** se ti supera vicino al team (*"Te lo prendo in prestito, ok?"*), si prende i caffè prima di te. Puoi usarlo come piattaforma, cioè saltargli in testa per un salto extra. Se arriva al cartello prima di te: *"Il cliente ha già visto il lavoro. Lo ha presentato lui."* e −2 GU.
- **Bonus AI** (dal backlog): genera subito una scorciatoia di piattaforme, alcune **allucinate** (tremolio + glitch di colore) che spariscono se ci salti sopra. *"È una draft. Va ricontrollata."*
- **Porte "Hai 5 minuti?"** come slot: così il pivot `fiveMinutes` (scorciatoia) diventa raggiungibile in gioco quando è la causa dominante del livello 3.
- **2 varchi "Approvazione richiesta"**, gli slot delle trappole e il **traguardo che tradisce** (§3).
- Il flusso diventa: livello 3 → Lessons Learned 3 → livello 4 → fine demo.

Mappa a sezioni (dettaglio ASCII in fase di implementazione, vincolato dal validatore):

| Sezione | Contenuto |
|---|---|
| S0 | spawn, cartello *"Senior Manager: ora il cliente ti chiama per nome. Purtroppo."* |
| S1 | arrivista introdotto su un tratto piatto con 2 caffè |
| S2 | porta "5 minuti" (slot) + valanga veloce (slot) |
| S3 | varco 1 + stagista di riserva |
| S4 | bonus AI sopra un burrone largo (scorciatoia), percorso normale con salti da 4 |
| CP | checkpoint |
| S5 | deck (slot) + CR veloce (slot) |
| S6 | varco 2 + arrivista che corre verso il cartello |
| S7 | traguardo che tradisce + tratto oltre il cartello |

---

## 6. Milestone

| Id | Contenuto | Verifica |
|---|---|---|
| I4-M0 | Micromanager "a torcia" (§0b) | Vitest + smoke |
| I4-M1 | Velocità email/CR + ricalcolo trigger (§2) | Vitest + smoke |
| I4-M2 | Ritmo: `longestQuietStretch` + livello 1 accorciato (§1) | Vitest + smoke |
| I4-M3 | Traguardo che tradisce + livello 2 esteso (§3) | Vitest + smoke |
| I4-M4 | Team: scia, collisioni, HUD (§4.1) | Vitest + smoke |
| I4-M5 | Delega + varco + stagista; livello 3 con un varco (§4.2–4.3) | Vitest + validatore + smoke |
| I4-M6 | Arrivista + bonus AI (§5) | Vitest + smoke |
| I4-M7 | Livello 4 + flusso (§5) | validatore + smoke |
| I4-M8 | Review del codice (contesto separato) + playtest utente | — |

## 7. Domande aperte

- **Q1 — Tasto Delega:** propongo `E` (con `Shift` come alternativa). Va bene, o preferisci un altro tasto?
- **Q2 — Team dal livello 3 o dal 4?** Propongo il **3**: si chiama già "Il primo team" ed è il tuo primo livello da Manager. Il livello 3 riceverebbe un varco obbligatorio.
- **Q3 — I junior persi sono persi per sempre** (passano al livello dopo) o il team si **ricompone a ogni livello**? Propongo "persi per sempre, minimo 1": rende la delega una scelta vera.
- **Q4 — Smoke test nel repo:** serve `puppeteer-core` come dipendenza di sviluppo (domanda ancora aperta).

## 8. Stato

- [x] I4-M0 micromanager a torcia · M1 email/CR veloci · M2 ritmo (livello 1 a 195 colonne) · M3 traguardo che tradisce · M4/M5 team, delega, varco, stagista · M6 arrivista e bonus AI · M7 livello 4 — 2026-10-31.
- Verifica: 100 test Vitest (tra cui livello 4 con salti "normali" per tutte le combinazioni di pivot e varchi obbligatori), build, smoke nel browser (`npm run smoke`, 3 suite): tutti verdi a macchina scarica; sotto carico alcuni controlli a tempo falliscono (vedi DECISIONS).
- [x] I4-M8: review del codice (docs/CODE_REVIEW_4.md, 17 punti corretti) — [ ] playtest utente.

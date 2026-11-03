# Il PM e LinkedIn — due trappole nuove (livelli 2 e 3)

## 1. Scelte dell'utente (2026-11-03)
| Domanda | Scelta |
|---|---|
| Il PM | **Ripianifica il Gantt**: le piattaforme sono barre di un Gantt; quando ci sali il PM sposta la milestone e la barra scivola nella direzione della freccia |
| LinkedIn | **Post che crollano**: ci sali, i like salgono, al terzo like il post diventa virale e crolla. Indizio: il contatore |
| Livello 2 | **Stessa lunghezza** (125 colonne), più denso; stesso checkpoint |
| Pivot | **Sì**: entrambe le cause entrano nelle Lessons Learned; per LinkedIn la lezione è *"LinkedIn: hai evitato un'opportunità, errore."* |

Livello 4 invariato: come per micromanager e KT, una lezione senza slot nel livello dopo produce solo la riga in Lessons Learned.

## 2. Il PM — `pm` (`src/objects/traps/PmGantt.js`, logica `src/core/GanttBrain.js`)
- Barra del Gantt (`width` colonne, una riga, texture `ganttBar`, **solida solo da sopra**) sopra un burrone; il PM (texture `npc_pm`, solo grafica) accanto, a `pmDx`. Sulla barra: la freccia (◀◀ / ▶▶) e l'etichetta (`label`, es. "Go-live (da ripianificare)").
- **Normale:** quando atterri sulla barra il PM dice "Un attimo…" e la barra lampeggia; dopo `delayMs` compare "Il PM: «Abbiamo ripianificato.»" e la barra scivola di `shift` colonne a `speed` colonne/s **senza portarti** (scivola via da sotto i piedi). Contromossa: risaltare subito, oppure correre nella direzione della freccia.
- Ferma e senza nessuno sopra, dopo `returnDelayMs` torna a casa e si riarma (niente soft-lock).
- **Pivoted** ("Il PM ora ripianifica a tuo favore"): scivola nella direzione della freccia e **ti porta** (solo all'andata, non quando torna a casa).
- Movimento cinematico: a ogni frame la barra va dove dice il brain (tempo di gioco), e il giocatore sopra una barra pivoted si sposta della stessa quantità. Il `friction` di Arcade non trascinava il giocatore in modo affidabile.
- Morte: zona `pitRect` sul burrone → causa `pm` se la barra si è mossa da ≤ 3 s.
- `dangerCols`: il micromanager non ti ferma mai sopra la barra.
- Validatore: la barra a casa (normale) o lungo tutta la corsa (pivoted).

## 3. LinkedIn — `linkedin` (`src/objects/traps/LinkedinPost.js`, logica `src/core/PostBrain.js`)
- Post (`width` colonne, texture `linkedinTile`, testo del post sopra), contatore **sotto** il post ("Like 0/3": chi ci sta sopra non lo copre).
- **Normale:** al primo contatto partono i like, uno ogni `likeMs` (anche se scendi). A `likes` like: "Virale!", il post sparisce; dopo `respawnMs` (2,5 s) torna.
- Post **sponsorizzato** (`likes: 1`): l'etichetta dice "Sponsorizzato · Like 0/1" e crolla al primo like.
- **Pivoted:** non crolla mai, i like continuano ("Like N · in evidenza").
- Morte: `pitRect` → causa `linkedin` se un post è crollato da ≤ 3 s. `dangerCols` come sopra (solo in normale).

## 4. Livello 2 (stessa lunghezza)
```
col   60        70        80        90        100       110
13    ...................................................#
14    ...............^^........^^^^##^^^^...........G....#
15    #######......########################.......########
```
- **PM** (`pm1`): burrone 67–72 subito dopo la zona del micromanager; barra 68–70 una riga sopra il pavimento, `shift: -3`, `speed: 6`, `delayMs: 450`; PM a col 66.
  - Dopo la barra: due colonne (73–74), poi le spine 75–76.
  - Percorso: barra → 73–74 → sopra le spine.
  - Senza la barra il burrone non si passa (66 → 73 = 6 colonne vuote).
- **LinkedIn** (`li1`, `li2`): burrone 97–103 prima della consegna, con due colonne d'appoggio (95–96) dopo la fossa del KT.
  - Post 98–99 una riga sopra, 3 like.
  - Post sponsorizzato 101–102 tre righe sopra, 1 like: da lì si può saltare oltre il cartello (102 → 107) e vincere da destra.
  - Senza i post il burrone non si passa.

## 5. Livello 3 (slot nuovi)
- `slotPM`: burrone 41–46 dopo la zona A del micromanager (6 colonne: nessun salto pieno lo supera senza la barra), barra 42–43.
  - Normale: `shift: -3`, `delayMs: 450`.
  - Pivoted: `shift: +2`, `speed: 4`, `delayMs: 300`, ti porta verso 47.
  - La prima porta "Hai 5 minuti?" passa da col 47 a **col 51**: il collega non esce mentre atterri dalla barra.
- `slotLI`: burrone 58–62 dopo la seconda porta (56), post 59–61.
  - Normale: 3 like.
  - Pivoted: non crolla.
  - Atterraggio 63–65: l'innesco normale del reply-all (63–64) è sul pavimento, non sopra il burrone.
- In modalità normale sono trappole in più: il livello 3 diventa più difficile.

## 6. Verifica
- `tests/PmLinkedin.test.js`:
  - `GanttBrain`, `PostBrain`;
  - livelli 2 e 3 non completabili senza le entità nuove;
  - modalità degli slot;
  - cause pivotabili e lezione di LinkedIn.
- `tests/LevelParser.test.js`: livello 3 completabile con i pivot `pm` e `linkedin`.
- `scripts/smoke/smokePmLinkedin.mjs`:
  - la barra scivola e si muore per `pm`, poi torna a casa;
  - i like partono e il post regge, al terzo like si muore per `linkedin`;
  - il post sponsorizzato crolla al primo like;
  - livello 3 con `pivot=pm` la barra ti porta, con `pivot=linkedin` il post non crolla.
- Playtest utente: ritmo della barra (450 ms) e dei like (350 ms).

## 7. Esito della review (`docs/CODE_REVIEW_PM_LINKEDIN.md`)
- **#1 smoke4 (regressione vera)** — accolto: si delega da col 47 con la porta a 51.
- **#2 innesco del reply-all sopra il burrone di LinkedIn** — accolto: burrone a 58–62, innesco normale sul pavimento.
- **#3 porta subito dopo il burrone del PM** — accolto: porta a col 51.
- **#4 nessun avviso prima che la barra si muova** — accolto: "Un attimo…" e barra che lampeggia; etichetta più leggibile.
- **#5 atterraggi da una colonna (73 e 95)** — accolto: due colonne (73–74 e 95–96); una spina in meno (75–76).
- **#6 catena dei pivot verso il livello 4** — da chiedere all'utente (decisione registrata: livello 4 invariato).
- **#7 burrone del PM nel livello 3 superabile con un salto pieno** — accolto: largo 6.
- **#8 la barra che scivola sul pavimento** — accolto: piattaforma solida solo da sopra.
- **#9 la barra pivoted ti porta anche al ritorno** — accolto: solo all'andata.
- **#10 i junior camminano nel vuoto** — lasciato (solo grafica, come già sopra le trappole che scattano).
- **#11 test** — accolto in parte: test su superfici, atterraggi, larghezza del burrone, innesco del reply-all.
- **#12 commenti vecchi** — accolto.
- **#13 classifica del livello 2 e secondo checkpoint** — da chiedere all'utente.

## 8. Livello 4 — il PM: "Mi presti una risorsa?" — `pmStaffing` (slot, causa `pm`)
Scelta dell'utente (2026-11-03): nel livello 4 PM e LinkedIn chiedono **risorse**, cioè i tuoi junior. Burnout del PM: **+10%**.
- File: `src/objects/npc/PmStaffing.js`, logica `src/core/StaffingBrain.js`.
- Scrivania del PM: un tile solido a col 143 (sulla mappa). Il suo "area risorse" sono i tile di pavimento 142 e 144, segnati da un tappeto giallo. Sopra, il cartello "Cercasi risorse – urgente".
- **Normale:** se metti i piedi sul tappeto (a terra), il PM prende l'**ultimo junior** della fila: "Mi presti una risorsa? Due settimane, giuro." Incidente `pm` e burnout **+10%** subito (`BURNOUT.gain.pmResource`).
  - Quel +10% comprende la perdita: `Team.lose(member, quiet, prepaid = true)` e `netLoss` non la conta di nuovo al checkpoint.
  - Una volta per vita: al respawn torna a chiedere.
  - Senza junior: "Niente risorse? Allora ripianifico. Te." e nient'altro.
- Contromossa: saltare la scrivania partendo prima del tappeto (141 → 145), oppure fermarsi sulla scrivania.
- Subito dopo ci sono lo stagista (147) e il varco (156, piastra 152): senza junior devi assumere (2 GU).
- **Pivoted** ("il PM ripianifica a tuo favore"): tappeto verde, "Risorse disponibili: chiedi pure"; ti presta un junior (+1).

## 9. Livello 4 — LinkedIn: il recruiter — `recruiter` (slot, causa `linkedin`)
- File: `src/objects/npc/Recruiter.js`, logica `src/core/RecruiterBrain.js`.
- Zona "#OpenToWork" alle colonne 37–44: subito dopo il burrone 34–36 e prima della porta "Hai 5 minuti?" (46). La segnalano una banda verde sul pavimento e lo striscione "LinkedIn — #OpenToWork: opportunità imperdibili"; il recruiter è a col 40.
- **Normale:** un junior che ti segue e resta **1,5 s di fila** nella zona accetta "un'opportunità imperdibile" e si dimette.
  - Conta come perdita del team (+5% al checkpoint, come sempre) e come incidente `linkedin`.
  - Uscire dalla zona azzera il suo orologio.
  - Una barra rossa sopra il junior più esposto mostra il tempo.
- Attraversarla di corsa costa niente: circa 1 s per junior.
- La combo: se il collega della porta 46 ti aggancia mentre i junior sono ancora nella zona, la scia si ferma (il team si blocca con te) e li perdi.
- **Pivoted** ("hai evitato un'opportunità, errore": ora la cogli): striscione blu "#Hiring", la prima volta che entri ti assume un junior (+1).

### Pivot per causa
`resolveMode` usa `entity.cause ?? entity.type`: gli slot `pmStaffing` e `recruiter` scattano con le lezioni `pm` e `linkedin` (i tipi `pm`/`linkedin` sono già le trappole dei livelli 2–3).

### Verifica
- `tests/Level4Resources.test.js`: i due brain, il pivot per causa, la scrivania, il +10%.
- `tests/LevelParser.test.js`: livello 4 completabile anche con i pivot `pm` e `linkedin`.
- `smokePmLinkedin.mjs` (sezione livello 4): il PM prende un junior (+10%, niente da addebitare dopo); la scrivania è sicura; con il pivot il PM ti presta un junior; fermo nella zona perdi i 3 junior; attraversandola di corsa li tieni; con il pivot il recruiter ti assume un junior.

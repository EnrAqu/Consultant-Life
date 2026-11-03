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
- Barra del Gantt (`width` colonne, una riga, texture `ganttBar`) sopra un burrone; il PM (texture `npc_pm`, solo grafica) accanto, a `pmDx`. Sulla barra: la freccia (◀◀ / ▶▶) e l'etichetta (`label`, es. "Go-live (da ripianificare)").
- **Normale:** quando atterri sulla barra, dopo `delayMs` compare "Il PM: «Abbiamo ripianificato.»" e la barra scivola di `shift` colonne a `speed` colonne/s **senza portarti** (scivola via da sotto i piedi). Contromossa: risaltare subito, oppure correre nella direzione della freccia.
- Ferma e senza nessuno sopra, dopo `returnDelayMs` torna a casa e si riarma (niente soft-lock).
- **Pivoted** ("Il PM ora ripianifica a tuo favore"): scivola nella direzione della freccia e **ti porta**.
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
14    ..............^^^........^^^^##^^^^...........G....#
15    #######......#######################........########
```
- **PM** (`pm1`): burrone 67–72 subito dopo la zona del micromanager; barra 68–70 una riga sopra il pavimento, `shift: -3`, `speed: 6`, `delayMs: 450`; PM a col 66. Dopo: una sola colonna (73) prima delle tre spine 74–76. Percorso: barra → 73 (salto corto) → sopra le spine. Senza la barra il burrone non si passa (66 → 73 = 6 colonne vuote).
- **LinkedIn** (`li1`, `li2`): burrone 96–103 prima della consegna.
  - Post 97–98 una riga sopra, 3 like.
  - Post sponsorizzato 101–102 tre righe sopra, 1 like: da lì si può saltare oltre il cartello (102 → 107) e vincere da destra.
  - Senza i post il burrone non si passa.

## 5. Livello 3 (slot nuovi)
- `slotPM`: burrone 41–45 dopo la zona A del micromanager, barra 42–43.
  - Normale: `shift: -3`, `delayMs: 450`.
  - Pivoted: `shift: +2`, `speed: 4`, `delayMs: 300`, ti porta verso la porta di col 47.
- `slotLI`: burrone 59–64 dopo la seconda porta, post 60–62.
  - Normale: 3 like.
  - Pivoted: non crolla.
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
- Playtest utente: il salto corto barra → col 73 prima delle spine (stretto di proposito), ritmo dei like.

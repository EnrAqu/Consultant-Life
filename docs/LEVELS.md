# Livelli — schede e registro delle modifiche

Da qui in poi il gioco si modifica **un livello alla volta** (playbook `level`). Questo file è lo **stato attuale** di ogni livello: prevale sui documenti d'iterazione da cui il livello è nato, che restano come storia.
Ogni modifica a un livello aggiorna la sua scheda (sezione "Registro") e aggiunge una riga in `docs/DECISIONS.md`.

## Regole che legano i livelli
- **Lessons Learned (pivot):** la causa pivotabile con più incidenti nel livello N decide quali slot del livello N+1 passano in modalità `pivoted`, cioè diventano un aiuto. Le cause pivotabili sono `replyAll`, `scopeCreep`, `deckCollapse`, `fakeKT`, `micromanager` e `fiveMinutes` (`src/data/causes.js`). Ne derivano due vincoli:
  - cambiare le trappole del livello N cambia le lezioni possibili del N+1;
  - uno slot del livello N+1 ha senso solo se la sua causa può capitare nel livello N.
- **Burnout:** minimo di partenza per livello `BURNOUT.levelMin = [0, 15, 30, 45, 60]` (`src/config/constants.js`), trascinato tra i livelli (`docs/BURNOUT.md`).
- **Carriera e outfit:** ogni livello ha una `career` (junior → consultant → manager → seniorManager → partner), e da questa dipende l'outfit.
- **Classifica:** è per `levelId`. Se un livello cambia molto, i vecchi record non sono più confrontabili: chiedere all'utente se azzerarli (`?resetStats=1` in locale).
- **Debug:**
  - `?debug=1&level=levelN` parte dal livello N;
  - `&pivot=<causa>` simula una lezione;
  - `&cp=cpK` parte dal checkpoint K, numerato da sinistra o, nei livelli verticali, dal basso;
  - `&standup=off`, `&god=1`, `&gu=N`, `&burnout=N` regolano standup, invulnerabilità, budget e burnout.

## Livello 1 — "Primo giorno"
| | |
|---|---|
| File | `src/levels/level1.js` (195 colonne, orizzontale) |
| Carriera / GU / burnout min | junior · 20 GU · 0% |
| Nato da | `IMPLEMENTATION_PLAN.md` §6.4 · `ITERATION_2.md` §6 (ponte di email) · `ITERATION_4.md` §1 (ritmo) |
| Trappole | replyAll ×3 (una è il ponte `ra2`), scopeCreep ×3, deckCollapse, fakeKT. Non ha slot: è il primo livello |
| Checkpoint | cp0 (col 95) |
| Test | `tests/LevelParser.test.js`: completabile, e completabile **solo** grazie al ponte di email |
| Smoke | `smoke.mjs` (default senza `?level`), `smokeBurnout.mjs` |
| Prova | `?debug=1` |

**Registro:** —

## Livello 2 — "La rivincita"
| | |
|---|---|
| File | `src/levels/level2.js` (125 colonne, orizzontale) |
| Carriera / GU / burnout min | consultant · 15 GU · 15% |
| Nato da | `IMPLEMENTATION_PLAN.md` §6.4 · `ITERATION_2.md` §4 · `ITERATION_3.md` §1 (micromanager, zona 47–66) · `ITERATION_4.md` §3 (traguardo che tradisce) |
| Slot (pivot dal livello 1) | slotA replyAll · slotB scopeCreep · slotC deckCollapse · slotD fakeKT |
| Altro | micromanager a torcia, traguardo che tradisce (`goal.trolls`, cartello portato di 14 colonne) |
| Checkpoint | cp0 |
| Test | `tests/LevelParser.test.js`: completabile con ogni pivot |
| Smoke | `smoke.mjs`, `smoke3.mjs`, `smoke4.mjs`, `smokeBurnout.mjs` |
| Prova | `?debug=1&level=level2[&pivot=…][&cp=cp0]` |

**Registro:** —

## Livello 3 — "Il primo team"
| | |
|---|---|
| File | `src/levels/level3.js` (180 colonne, orizzontale) |
| Carriera / GU / burnout min | manager · 15 GU · 30% |
| Nato da | `ITERATION_3.md` §3 · `ITERATION_4.md` §4 (team, delega, varco, stagista) |
| Slot (pivot dal livello 2) | mmA/mmB/slotMM micromanager · slotA replyAll · slotB scopeCreep · slotC deckCollapse · five4 fiveMinutes · slotD fakeKT |
| Altro | 4 porte "Hai 5 minuti?", stagista, varco di approvazione |
| Checkpoint | cp0 |
| Test | `tests/LevelParser.test.js`: completabile con tutte le combinazioni di pivot; chiuso se il varco resta chiuso |
| Smoke | `smoke3.mjs`, `smoke4.mjs`, `smokeBurnout.mjs` |
| Prova | `?debug=1&level=level3[&pivot=…]` |

**Registro:** —

## Livello 4 — "Il cliente strategico"
| | |
|---|---|
| File | `src/levels/level4.js` (200 colonne, orizzontale) |
| Carriera / GU / burnout min | seniorManager · 15 GU · 45% |
| Nato da | `ITERATION_4.md` §5 (e §3, traguardo che tradisce) |
| Slot (pivot dal livello 3) | five1 fiveMinutes · slotA replyAll · slotC deckCollapse · slotB scopeCreep |
| Altro | 2 arrivisti, 2 stagisti, 2 varchi, bonus AI, traguardo che tradisce |
| Checkpoint | cp0 |
| Test | `tests/LevelParser.test.js`: completabile con salti "normali" per ogni pivot; varchi obbligatori |
| Smoke | `smoke4.mjs` |
| Prova | `?debug=1&level=level4[&pivot=…]` |

**Registro:** —

## Livello 5 — "La Partnership"
| | |
|---|---|
| File | `src/levels/level5.js` (32 colonne, **verticale**) |
| Carriera / GU / burnout min | partner · 15 GU · 60% |
| Nato da | `ITERATION_5.md` §1 (livelli verticali) e §7; la 5B (SteerCo, ambiziosi, porta del Recruiter) non è ancora fatta |
| Slot (pivot dal livello 4) | slotA replyAll · five1 fiveMinutes · slotC deckCollapse · slotB scopeCreep |
| Altro | escalation (marea), 3 lavoratori, leccapiedi, 3 deal per aprire il Board, vani scale segnalati |
| Checkpoint | cp0–cp3 (dal basso) |
| Test | `tests/Level5.test.js`, `tests/Vertical.test.js` |
| Smoke | `smoke5.mjs` |
| Prova | `?debug=1&level=level5[&cp=cp3][&escalation=off][&deals=3]` |

**Registro:** —

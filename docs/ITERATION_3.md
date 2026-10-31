# Iterazione 3 — Nuove sfide: Micromanager, "Hai 5 minuti?", Livello 3

> Stato: **in sviluppo** — richiesto dall'utente il 2026-10-31, insieme al resto dell'iterazione 2.
> Si applica sopra `ITERATION_2.md`. Regole invariate: trappole e NPC deterministici (niente `Math.random`, niente tween o timer di Phaser per la logica), logica pura in `src/core/` con test, tempi in ms accumulati in `update(dt)`.
> Prerequisito consigliato: chiudere prima il resto dell'iterazione 2 (ponte di email, battute, leaderboard).

## 0. Cosa cambia

| # | Elemento | Dove | File nuovi / toccati |
|---|---|---|---|
| A | **Micromanager** (NPC che ti ferma per spiegarti come avrebbe fatto lui) | livelli 2 e 3 (non dal 4: sei più alto di grado) | `core/MicromanagerBrain.js`, `objects/npc/Micromanager.js`, `data/causes.js`, `level2.js`, `level3.js` |
| B | **"Hai 5 minuti?"** (collega che esce dalla porta e ti aggancia) | livello 3 | `core/FiveMinutesBrain.js`, `objects/npc/FiveMinutesDoor.js`, `level3.js` |
| C | **Livello 3 "Manager"** + Lessons Learned dopo il livello 2 | nuovo livello | `levels/level3.js`, `LessonsLearnedScene.js`, `GameScene.js` |
| D | Arrivista, bonus AI | **backlog**, solo descritti (§6) | — |

Il micromanager e "Hai 5 minuti?" **non uccidono**: bloccano il player e costano GU. Contano come **incidenti** per le Lessons Learned (peso 1) e sono pivotabili.

---

## 1. Micromanager (A)

### 1.1 Comportamento (modalità `normal`)
Vive in una **zona** del livello (`zoneFrom`–`zoneTo`, colonne di un tratto d'ufficio piatto). Non insegue fuori dalla zona: è "il suo ufficio". Questo evita la navigazione sui burroni e rende il comportamento prevedibile.

Macchina a stati (pura, in `MicromanagerBrain`):

| Stato | Cosa fa | Uscita |
|---|---|---|
| `idle` | cammina avanti e indietro nella zona a `walkSpeed` (60 px/s), girandosi ai bordi | player entra nella zona → `watch` |
| `watch` | si gira verso il player e lo segue a distanza (`followDist` 5 tile) a `walkSpeed`; ogni `checkEveryMs` (6000) parte un controllo | timer → `tell` |
| `tell` | fumetto **"…"** e cono di sguardo che lampeggia per `tellMs` (500) | → `check` |
| `check` | valuta in un solo frame: il player è **visto** e **non impegnato**? | sì → `dash`; no → `watch` |
| `dash` | corre verso il player a `dashSpeed` (400 px/s) | contatto → `explain` |
| `explain` | player bloccato `explainMs` (2000), fumetto *"Fermati un attimo. Spiegami cosa stai facendo."*, `spendGu(0.5, 'micromanager')` | → `demo` |
| `demo` | *"Guarda, io l'avrei fatto così."* Esegue il salto dimostrativo sul punto `demoJump` della zona (animazione scriptata, non fisica). Esito **alternato e deterministico**: 1ª, 3ª, 5ª… volta riesce, 2ª, 4ª… cade | → `cooldown` |
| `cooldown` | `cooldownMs` (4000) senza controlli | → `watch` |

**Visto:** il player è dentro il **cono** (direzione dello sguardo, portata `sightRange` 7 tile, altezza 3 tile) **e** nessun nascondiglio (`plant`) si trova tra il micromanager e il player sulla stessa riga.
**Impegnato:** `|vx| ≥ busySpeed` (200 px/s, la corsa piena è 260). Se corri "sembri impegnato" e non ti ferma.

Esito della demo:
- **riuscita**: il micromanager atterra oltre il punto di salto, si gira, narratore *"Visto? Basta un po' di metodo."*;
- **fallita**: cade nel burrone (sparisce con i fogli di carta, ricompare a inizio zona dopo `respawnMs` 3000), narratore *"Ottimo. Ora dovrai spiegare anche questo."*

### 1.2 Indizi ("crudele ma giusto")
- Cono di sguardo sempre visibile, giallo semitrasparente (alpha 0.15), più acceso durante `tell`.
- Fumetto "…" 500 ms prima di ogni controllo; il ritmo è regolare (ogni 6 s).
- Le piante (`plant`, nuovo carattere di mappa `p`, oggetto decorativo alto 1,5 tile) sono nascondigli evidenti.
- Contromosse: correre, stare dietro una pianta, oppure uscire dalla zona.

### 1.3 Modalità `pivoted` ("Ti faccio vedere come si fa")
Se nel livello precedente il micromanager era la causa dominante:
- non ferma mai il player;
- cammina **davanti** al player (a `+3` tile) attraverso la zona;
- ogni trappola la cui area interseca la zona viene **evidenziata** al suo passaggio (contorno pulsante, metodo `trap.revealHint()` da aggiungere a `BaseTrap`, solo estetico) con il fumetto *"Attento lì. Lo dico per te."*

### 1.4 Parametri (default)
```js
{ zoneFrom, zoneTo, demoJump: { fromCol, toCol }, walkSpeed: 60, followDist: 5, checkEveryMs: 6000, tellMs: 500,
  sightRange: 7, busySpeed: 200, dashSpeed: 400, explainMs: 2000, explainCost: 0.5, cooldownMs: 4000, respawnMs: 3000 }
```

### 1.5 Architettura
- `src/core/MicromanagerBrain.js` (puro): `update(dt, { playerX, playerY, playerVx, playerInZone, hiddenBehindPlant }) → actions[]` (`'face'`, `'move'`, `'tell'`, `'catch'`, `'release'`, `'demoStart'`, `'demoEnd'`). Contatore delle demo per l'esito alternato.
- `src/objects/npc/Micromanager.js`: sprite (outfit `manager` con tazza in mano), cono (Graphics), fumetti (Text), applica le azioni: blocca il player con `player.lockInput(true)` + `stopMotion()` (come la call del KT), rilascia con `resetKeys()`.
- `GameScene`: crea gli NPC dalle entità `type: 'micromanager'`, li aggiorna nel loop come le trappole (fermi durante standup e morte), `die()` e `respawn()` chiamano `npc.reset()`.
- `data/causes.js`: `micromanager: { label: 'il micromanagement', pivotable: true, lesson: 'Il micromanager ora ti precede e ti indica le trappole.' }`; `INCIDENT_WEIGHT.micromanager = 1`.
- `StatsTracker`: nuovo `recordIncident(cause)` generico (il KT finto lo userà con peso 2).

### 1.6 Posizionamento
- **Livello 2**, zona cols 47–66: è il tratto dopo il checkpoint, con il **punto d'attesa davanti al deck** (corridoio 60–65). Chi aspetta il crollo delle slide resta fermo, e il micromanager lo nota: per aspettare bisogna stare dietro la pianta a col 57. `demoJump`: nessun burrone nella zona, quindi la demo è *"Io avrei aspettato meglio"* (si siede, 1 s) e conta sempre come riuscita.
- **Livello 3**: due zone (vedi §3).

**Accettazione (agente):** test Vitest di `MicromanagerBrain`:
- un player fermo nel cono viene preso dopo `checkEveryMs + tellMs`;
- uno che corre a 260 px/s non viene mai preso;
- uno dietro una pianta non viene preso;
- le demo alternano riuscita/fallita;
- in `pivoted` non emette mai `catch`.

Smoke test: con `?level=level2&cp=cp0`, restando fermi a col 58 per 7 s le GU scendono di 0,5 e `run.incidentsByCause.micromanager === 1`.
**Playtest utente:** è irritante nel modo giusto, non ingiusto.

---

## 2. "Hai 5 minuti?" (B)

### 2.1 Comportamento (modalità `normal`)
Entità `type: 'fiveMinutes'`: una **porta di cubicolo** nel muro di fondo.
- Il player si avvicina da sinistra. Quando è a ≤ `noticeDist` (6 tile) dalla porta compare il fumetto **"Ehi…"** sopra la porta: è il segnale.
- Quando il player è a ≤ `stepOutDist` (3 tile), il collega **esce** in `stepOutMs` (250) e si piazza nel corridoio davanti alla porta per `standMs` (1800), poi rientra.
- Se il player lo **tocca**: agganciato per `hookMs` (3000), bloccato, fumetti che ruotano ogni 1000 ms (*"Hai 5 minuti? È una cosa veloce."*, *"Volevo solo un parere su un Excel."*, *"Anzi, condivido lo schermo."*), `spendGu(0.5, 'fiveMinutes')`, incidente.
- **Soluzione:** saltarlo (è alto 1,25 tile, il salto arriva a 3,3), oppure aspettare che rientri.

**Verifica dei tempi:** chi corre a 260 px/s percorre i 3 tile di `stepOutDist` in ~370 ms. Il collega è fuori dopo 250 ms, quindi chi corre senza saltare lo urta. Il fumetto "Ehi…" a 6 tile dà ~740 ms di preavviso: **giusto**.

Combinazione con lo standup (nessun codice speciale): se l'aggancio è in corso quando scatta lo standup, il timer `hookMs` si ferma con tutto il resto, e la conversazione "dura" anche durante lo standup.

### 2.2 Modalità `pivoted` ("Ti faccio vedere una scorciatoia")
Il collega esce comunque, ma toccarlo non blocca: dice *"Passa di qua, conosco una scorciatoia"* e la porta diventa un **passaggio**. Premendo ↑ davanti alla porta il player viene spostato su `shortcutTo` (`{col, row}` nel livello), con una dissolvenza di 150 ms.

### 2.3 Parametri (default)
```js
{ noticeDist: 6, stepOutDist: 3, stepOutMs: 250, standMs: 1800, hookMs: 3000, hookCost: 0.5, shortcutTo: null }
```

### 2.4 Architettura
- `src/core/FiveMinutesBrain.js` (puro): stati `closed → notice → out → back` e `hooked`; `update(dt, { playerDx, touching })`.
- `src/objects/npc/FiveMinutesDoor.js`: porta (texture `door`, `doorAjar` con ombra dietro), collega (outfit `consultant` con tazza), fumetti.
- `data/causes.js`: `fiveMinutes: { label: 'i "hai 5 minuti?"', pivotable: true, lesson: 'Il collega dei 5 minuti ora ti apre una scorciatoia.' }`, peso incidente 1.
- Nuove texture: `door`, `doorAjar`, `plant`, sprite `npc_micromanager` (manager con tazza), `npc_colleague`.

**Accettazione (agente):** test Vitest di `FiveMinutesBrain`:
- il fumetto compare a 6 tile;
- il collega esce a 3 tile e rientra dopo 1800 ms;
- un player che lo tocca resta agganciato per esattamente 3000 ms;
- in `pivoted` non c'è aggancio.

Smoke test: correndo dritto si viene agganciati; correndo e saltando a 3 tile dalla porta no.

---

## 3. Livello 3 "Manager" (C)

- `id: 'level3'`, `name: 'Progetto 3 — Il primo team'`, `career: 'manager'`, `startGu: 15`, ~180 colonne.
- Cartello iniziale: *"Promosso Manager! Ora hai un capo in più."*
- Si arriva dal livello 2 tramite una nuova slide **Lessons Learned — Progetto 2** (stessa scena, parametrica sul numero di progetto): `level1 → LL1 → level2 → LL2 → level3 → MvpEndScene`.
- Gli slot del livello 3 sono pivotati dalla causa dominante del **livello 2** (che ora può essere anche `micromanager`).

| Sezione | Colonne | Contenuto | Curva |
|---|---|---|---|
| S0 | 0–12 | spawn, cartello | respiro |
| S1 | 13–40 | **micromanager zona A** (14–40), 2 piante (cols 20, 33), burrone da 3 (cols 27–29) = `demoJump` | introduci |
| S2 | 41–60 | **due porte "Hai 5 minuti?"** (cols 47, 56) in corridoio piatto | introduci |
| S3 | 61–85 | slot `replyAll` (corridoio, come livello 2) + porta "5 minuti" all'uscita (col 84) | combina |
| S4 | 86–110 | **micromanager zona B** (86–110) che include l'attesa del slot `deckCollapse` (corridoio 96–101), pianta a col 93 | combina |
| CP | 112 | checkpoint | — |
| S5 | 113–145 | slot `scopeCreep` (burrone 10 con pilastro largo 2, salti 4) + porta (col 140) appena prima di un gap da 4 | tradisci |
| S6 | 146–180 | slot `micromanager` pivotabile (zona 146–165), slot `fakeKT` sopra una fossa di spine, traguardo a col 176 | finale |

Regole: percorsi obbligatori solo con salti della colonna "normale" (gap ≤ 4 a dislivello 0), verificati dal `LevelValidator` per tutte le combinazioni di pivot. Le porte "5 minuti" non si mettono mai a meno di 4 tile da un bordo di burrone (l'aggancio non deve causare una morte).

**Accettazione (agente):** validatore: `level3` completabile con tutte le 7 combinazioni di pivot (nessuno + 6 cause pivotabili); smoke test: `level2` completato → slide "Lessons Learned — Progetto 2" → `level3` con l'outfit `manager`.

---

## 4. Narratore (nuove frasi)

| Evento / condizione | Testo |
|---|---|
| mmCatch | Il tuo responsabile vuole "solo capire il ragionamento". |
| mmCatch | Ti ha fermato per un allineamento. Sul nulla. |
| mmDemoOk | Visto? Basta un po' di metodo. Il suo. |
| mmDemoFail | Ottimo. Ora dovrai spiegare anche questo. |
| mmPivot | Il tuo responsabile ti fa da guida. Non abituarti. |
| fiveHook | Erano cinque minuti. Del suo orologio. |
| fiveHook | Ti ha chiesto un parere. Ne voleva tre. |
| death (minCauseDeaths micromanager 3) | Il cliente ha chiesto chi dei due è il manager. |
| levelStart level3 | Promosso! Ora hai le responsabilità del Partner e lo stipendio di prima. |

---

## 5. Milestone

| Id | Contenuto | Verifica automatica |
|---|---|---|
| I3-M1 | `recordIncident`, nuove cause, Lessons Learned parametrica (Progetto N) | Vitest |
| I3-M2 | `MicromanagerBrain` + test | Vitest |
| I3-M3 | `Micromanager` in Phaser + zona nel livello 2 + texture | smoke |
| I3-M4 | `FiveMinutesBrain` + test, `FiveMinutesDoor` | Vitest + smoke |
| I3-M5 | Livello 3, flusso LL2 → level3 → fine demo | validatore + smoke |
| I3-M6 | Nuove frasi del narratore | Vitest |
| I3-M7 | Review del codice (playbook `review`) + playtest utente | — |

---

## 6. Backlog (descritto, non pianificato)

- **Arrivista:** collega veloce quanto te, ti salta in testa (rimbalzo, non morte), ti ruba i caffè; se arriva prima al traguardo *"Il cliente ha già visto il lavoro. Lo ha presentato lui."*. Usabile come piattaforma (saltargli in testa = salto extra). Candidato per il livello 4 (Senior Manager).
- **Bonus AI:** genera subito una scorciatoia di piattaforme; alcune sono **allucinate** (tremolio + glitch di colore) e spariscono se ci salti sopra. *"È una draft. Va ricontrollata."*
- Escalation a GU zero, roll-off senza KT, finali multipli (Partner, società prodotto, burnout, i campi).

## 7. Domande aperte
- Nessuna bloccante. Da confermare in playtest: frequenza dei controlli del micromanager (6 s) e durata dell'aggancio (3 s).

## 8. Stato

- [x] I3-M1…M6 sviluppate il 2026-10-31: incidenti e cause nuove, `MicromanagerBrain` e `FiveMinutesBrain` (logica pura con test), NPC in Phaser, micromanager nel livello 2 (zona 47–66, pianta a col 57), livello 3 completo, Lessons Learned dopo ogni livello, nuove frasi.
- Verifica: 60 test Vitest (validatore: livello 3 completabile con tutte e 7 le combinazioni di pivot), build, smoke test nel browser (33 + 12 controlli) senza errori in console.
- [x] I3-M7: review del codice (docs/CODE_REVIEW.md, 15 punti, corretti o registrati) — [ ] playtest utente.

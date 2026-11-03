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
| Tema | **progetto da junior** (`skin: 'junior'`): le email sono ticket AMS, i CR sono fix sul codice di Marco (che non c'è più), il deck è la `Documentazione_v12_DEF.docx`. Etichette e lezioni in `src/data/causes.js` (`causeLabel`/`causeLesson`), frasi `junior_*` del narratore |
| Trappole | replyAll ×5 (ra1, ra1b, il ponte `ra2`, ra3, ra4), scopeCreep ×3, deckCollapse ×2 (dk1, dk2), fakeKT; scherzetti del cliente: `hiddenMail` hm1 (burrone 18–19) e hm2 (salto dal gradino del fix, burrone 179–181), senza indizio; `requirementShift` rs1 (atterraggio di 2 colonne 28–29 → 26–27, camuffato da pavimento). Non ha slot: è il primo livello |
| Checkpoint | cp0 (col 95) |
| Test | `tests/LevelParser.test.js`: completabile, e completabile **solo** grazie al ponte di email; `tests/causes.test.js`: testi della skin; `tests/Pranks.test.js`: scherzetti |
| Smoke | `smoke.mjs` (default senza `?level`; sezione 1c: tradimenti e combo; 1d: scherzetti, stacchi fissati in pixel), `smokeBurnout.mjs` |
| Prova | `?debug=1` |

**Registro:**
- **2026-11-02 — Più difficile e complesso, da junior** (utente: "combo di trappole" + "trappole che tradiscono", stessa lunghezza, 20 GU; "da junior che cosa hai? Documentazione, AMS di codici di altri").
  Stesse 4 cause, quindi la catena dei pivot verso il livello 2 non cambia (ci si aspetta più morti da ticket, quindi la lezione "replyAll" sarà più frequente). Le colonne invariate (spawn, primo burrone, spine, corridoio 42–51, KT, checkpoint, ponte, CR sinistro) tengono validi gli smoke esistenti.
  - **Seconda coda di ticket (`ra1b`, colonne 52–54):** chi ha aspettato la prima valanga riparte di corsa e viene preso all'uscita dalla seconda. Indizio: il secondo contatore, visibile da lontano. Chi si ferma sul suo innesco (col 50) non viene colpito.
  - **Cartelli che mentono:**
    - "Tranquillo, il codice di Marco regge. — il tuo senior" sopra il gradino del fix #47: invita a fermarsi, e fermarsi lo fa scattare;
    - "KT di onboarding: obbligatorio! — HR" accanto al KT rosso.
  - **Ultimo giro di ticket (`ra3`, colonne 156–160):** spostato da col 184 a prima del salto di 4. Le email inseguono chi corre (intervallo 120 ms ≈ velocità massima).
  - **Fix sotto la tempesta (`ra4` sul gradino 173–178):** 12 ticket letali da circa 0,5 s a 1,7 s dopo l'innesco (col 169). Sul gradino non puoi fermarti, perché il fix ti spinge nel burrone 179–181, e non puoi entrarci subito: aspetti, poi lo attraversi senza fermarti.
  - **La documentazione prima della consegna (`dk2`, colonne 184–189):** chi arriva di corsa al traguardo viene schiacciato. Chi aspetta trova una pila di 2 righe su cui salire per arrivare a col 191.

    ```
    prima (145–194)                                      dopo
    14 ##...o..................####.....R......G...       ##...o.....R................####.....D......G...
       (ra3 a 184, nessuna email sul gradino)           (ra3 a 156, ra4 sul gradino 173–178, dk2 a 184)
    ```
  Verifica: 166 test Vitest, build, `npm run smoke` 97/97. La sezione 1c di `smoke.mjs` (7 controlli) verifica che chi corre muoia e chi aspetta passi, compresa la catena reale "tempesta → fix → salto → fermarsi prima della documentazione". Screenshot di ticket, fix e pila di documentazione.
  Review (`docs/CODE_REVIEW_LEVEL1.md`, 11 punti, nessuno bloccante):
  - accolti: `ra1b` più fitto (12 ticket ogni 70 ms), perché chi saltava sul gradino passava per pochi pixel; controlli smoke (a) ed (e) rifatti, perché passavano per il motivo sbagliato; pesi del narratore (`minSpot` 3, `runDeathsExact` 4), perché le frasi "muori sempre qui" non perdano contro quelle da junior, con un test; cartelli spostati (KT sopra la scrivania, senior sopra l'etichetta del fix);
  - per l'utente: niente secondo checkpoint (decisione registrata), nonostante 8 trappole letali dopo cp0;
  - lasciati: margini stretti dei tempi, numero "#47" ripetuto, etichetta della causa nel contesto del narratore non usata.
- **2026-11-02 — Burnout più alto** (morte +3%, sociale +5%, vedi `BURNOUT.md`) e **un solo checkpoint** confermato dall'utente.
- **2026-11-02 — Scherzetti del cliente (implementati)** — utente: *"compare all'improvviso un blocchetto a forma di mail che si chiama 'Il Cliente: E chi è mo questo?'"* e *"il punto di atterraggio si sposta o indietro o in avanti, con una didascalia 'Il cliente ha cambiato il requisito, è un problema?'"*. Scelte: solo livello 1 per ora; mail **senza indizio** (eccezione registrata); direzione dello spostamento **fissa per piattaforma**.

  **Due entità nuove** in `src/objects/traps/` (registrate in `TRAP_CLASSES`), riusabili in altri livelli più avanti:

  **A. `hiddenMail` — "Il Cliente: E chi è mo questo?"** (`HiddenMail.js`)
  - Dove: il primo salto del gioco, burrone 18–19. Entità `{ id: 'hm1', type: 'hiddenMail', x: 17, y: 14, params: { takeoffCols: [17, 17] } }`.
  - Normale: invisibile, nessun corpo, **nessun indizio** (eccezione a "crudele ma giusto" decisa dall'utente: resta deterministica e sempre nello stesso punto, quindi la si impara).
  - Scatto: nel frame in cui il giocatore passa da a terra a in aria **con un salto** (`body.velocity.y < 0`) e la colonna del suo centro al decollo è in `takeoffCols`, con `velocity.x ≥ 0`. Il decollo si legge nella `update` della trappola confrontando `player.grounded` col frame prima (niente trigger zone: serve la colonna di stacco, non quella attraversata).
  - Effetto: compare un blocco-mail 32×32 (texture `mailBlock`, busta con "CC") **centrato sulla x del giocatore**, con il bordo inferiore 2 px sopra la testa (`body.top - 2`). Solido (`addPlatform`), più l'etichetta "Il Cliente: E chi è mo questo?" sopra (12 px, bold, `#facc15`), più un piccolo "pop" (scala 0.6→1 in 120 ms gestito in `update`, niente tween). Resta fino al respawn (`reset()` lo nasconde e disattiva il corpo).
  - Conti: alla velocità massima la testa sale di ~10 px a frame, quindi la testata arriva al frame dopo; `vy` va a 0 e il giocatore ricade da ~10 px in ~0,1 s percorrendo ~27 px. Il corpo (18 px) supera il bordo di col 17 (x 576) se al decollo il centro è oltre x ≈ 558 (col 17,45): **chi stacca sul bordo, cioè il salto "comodo", cade nel burrone**. Chi stacca a inizio col 17 ricade su col 17 sotto la mail: per ripartire torna a col 15–16 e salta di lì (a col 17 è già a ~60–100 px, sopra il blocco). Nessun soft-lock.
  - Contromossa imparata: staccare da col 16 o prima (burrone + col 17 = 3 colonne, il salto ne copre ~5).
  - Causa della morte: zona di morte sul burrone (cols 18–19, righe 15–16) che restituisce `'hiddenClient'` se la mail è comparsa da ≤ 2000 ms, altrimenti nulla (resta `'pit'` come oggi).
  - Pivoted: non previsto (nessuno slot nel livello 2). `delegateTarget`/`dangerCols`: default (null).

  **B. `requirementShift` — "Il cliente ha cambiato il requisito, è un problema?"** (`RequirementShift.js`)
  - Dove: il secondo burrone. Il terreno 27–29 diventa una piattaforma-trappola 3×1 a riga 15 (geometria: `g.ground(27, 29)` → rimosso; sotto resta vuoto, quindi il burrone diventa 24–29 finché la piattaforma non c'è).
    ```
    oggi (18–31)                      dopo
    13 ............##                 ............##
    14 ..............                 ..............
    15 ##..####...###                 ##..####...===     (=== piattaforma-trappola, a 27–29)
                                      dopo lo scatto:  ##..####.===..##   (a 25–27; burrone 28–29)
    ```
  - Entità: `{ id: 'rs1', type: 'requirementShift', x: 27, y: 15, params: { width: 3, shift: -2, speed: 10, takeoffCols: [20, 23] } }` (`shift` in colonne, negativo = indietro verso il giocatore; `speed` in colonne/s).
  - Scatto: decollo con un salto (come A) da una colonna in `takeoffCols`, con `velocity.x > 0`. La piattaforma scivola di `shift` colonne a `speed` (0,2 s per 2 colonne) e resta lì fino al respawn. Compare la didascalia "Il cliente ha cambiato il requisito, è un problema?" sopra la piattaforma per 2500 ms (testo che la segue).
  - Indizio: il movimento stesso e la didascalia, visibili a metà salto. Con `airAccel` 1700 si frena in aria: un giocatore pronto può correggere già al primo tentativo.
  - Conti: chi stacca di corsa dal bordo di col 23 resta in aria ~0,69 s e arriva a ~col 28,5, cioè sulla piattaforma originale ma oltre quella spostata (25–27): cade nel burrone 28–29 o sbatte contro il gradino di col 30 (riga 13). Contromossa: salto corto (rilascio presto del salto, `jumpCutMultiplier`) o frenata in aria. Dalla posizione spostata: 27 → 30 sale di 2 con 2 colonne vuote, che il validatore ammette anche in tabella "normale" (3).
  - Movimento: corpo immobile spostato con `body.reset` passo per passo in `update(dt)` (come `ScopeCreepPlatform.setHead`), niente tween. Se il giocatore ci sta sopra mentre si muove, lo trascina il collider di Arcade.
  - Causa: zona di morte sotto le cols 24–29 (righe 16–17) che restituisce `'requirementChange'` se lo spostamento è avvenuto da ≤ 3000 ms.
  - Validatore: `trapSurfaces` aggiunge la piattaforma nella **posizione finale** (`x + shift`, larghezza `width`, riga `y`), perché è lì quando atterri. Pivoted: non previsto.

  **Comune**
  - `src/data/causes.js`: `hiddenClient: { label: 'il cliente in copia nascosta', pivotable: false }`, `requirementChange: { label: 'il requisito che cambia', pivotable: false }`; per la skin junior le stesse etichette (è il cliente anche per un junior). Non sono pivotabili, quindi la catena dei pivot verso il livello 2 non cambia.
  - `src/data/narratorLines.js`: 2 frasi di morte per causa (es. "Il cliente era in CCN. Lo è sempre." / "Requisito cambiato. Il burrone no."), senza `levelId`.
  - `TextureFactory`: `mailBlock` (busta bianca bordo rosso, "CC").
  - Il decollo "con un salto" si ricava in `update` di ciascuna trappola: `wasGrounded && !player.grounded && player.body.velocity.y < 0`. Nessuna modifica a `Player.js`.
  - God mode: le trappole scattano comunque (servono agli smoke e a guardarle).
  - Burnout/GU: nessun costo extra; sono morti normali (+3%, −0,5 GU).
  - Classifica: il livello 1 non è ancora pubblicato con le modifiche di oggi, quindi nessun azzeramento.

  **Review del piano** (`docs/CODE_REVIEW_PRANKS.md`, 15 punti, 1 bloccante) — come cambia il piano (prevale sul testo sopra):
  1. *Bloccante, accolto:* il decollo letto come `wasGrounded && !grounded` arriva un frame tardi e salta i salti in coyote time: chi stacca dal bordo sfuggirebbe a entrambe. **`Player.js` cambia di 2 righe:** nel ramo del salto `jumpCount++` e `lastJump = { x, bottom }` (centro e piedi nel frame del salto). Le trappole confrontano `jumpCount` nella loro `update` (che gira subito dopo quella del giocatore) e leggono lo stacco **in pixel**, coyote compreso: `takeoffPx` mail `[544, 610)`, spostamento `[704, 800)` (cols 22–24).
  2. *Accolto:* la mail compare nel frame del salto a un'altezza fissa: bordo inferiore 12 px sopra la testa al suolo di stacco (`bottom − 28 − 12`), quindi non dipende dal frame rate.
  3. *Accolto:* il solido è invisibile, a misura piena e fermo; il "pop" è un'immagine senza corpo.
  4. *Accolto:* mail creata in `build()` nascosta e col corpo spento; scatta una volta sola fino al respawn; `reset()` nasconde tutto e azzera i tempi.
  5. *Accolto:* spostamento una tantum (`idle → moving → done`), aggancio esatto a `x + shift`; `reset()` la riporta a 27–29.
  6. *Accolto:* stacco della piattaforma solo da x ∈ [704, 800).
  7–8. *Accolti i conti corretti:* volo ~0,63 s; dal bordo si atterra a ~col 29,2. Per la mail: chi prende la testata presto atterra a destra della mail e può risaltare; per superarla da prima bisogna staccare da col ≲ 15,3.
  9. *Accolto:* finestra della mail dall'**ultimo contatto**; tempi accumulati in `update(dt)` (lo standup non li consuma). Per B, chi cade nel burrone entro 3 s dallo spostamento muore per `requirementChange` anche se ha sbagliato da solo: accettato.
  10. *Accolto:* tolta la frase sul trascinamento (nessuno può stare sulla piattaforma nei 0,2 s del movimento).
  11. *Accolto:* gli smoke fissano lo stacco in pixel (`body.reset` + `setVelocityX(260)`, poi Space), con i casi "ultimo pixel" e "coyote".
  12. *Segnalato per il playtest:* dopo lo spostamento il ripiano 30–31 si raggiunge saltando da 25–27; lo smoke controlla anche che non si muoia sulle spine.
  13. *Accolto come nota:* in god mode il respawn da burrone non resetta le trappole, quindi mail e piattaforma restano dove sono finché non si muore davvero o si ricarica.
  14. *Accolti:* ramo in `trapSurfaces` prima del ritorno per i non-pivoted; texture `reqPlatform` (foglio "Requisiti v2"); ASCII corretto qui sotto; busta con "CCN"; nessuna voce junior; i due tipi in `entityColumns`.
  15. *Accolto:* la prima morte `hiddenClient` ha una frase del narratore che la spiega ("Non è un bug dei comandi: il cliente era in CCN").

    Righe 13–15, colonne 16–33: suolo 16–17, burrone 18–19, suolo 20–23, burrone 24–26, piattaforma `===` 27–29 (dopo lo scatto 25–27, burrone 28–29), gradino 30–37 a riga 13 con le spine 32–34. Lo schema ASCII in alto è solo indicativo.

  **Milestone e criteri (verificabili)**
  1. *S-M1 core:* `trapSurfaces` per `requirementShift` + test Vitest (celle nella posizione finale); `level1` resta completabile in tabella `normal`; le nuove cause in `CAUSES` non sono pivotabili (test in `tests/causes.test.js`).
  2. *S-M2 trappole e livello:* `HiddenMail.js`, `RequirementShift.js`, texture, cause, frasi; `level1.js` aggiornato. `npm test`, `npm run build`.
  3. *S-M3 smoke* (`smoke.mjs`, sezione 1d):
     - il vecchio "jump clears a 2-tile gap" stacca da col 16 (teletrasporto a 14, salto quando `tile[0] === 16`) e passa senza mail;
     - stacco dal bordo di col 17 (teletrasporto a 17,6 colonne, corsa e salto): la mail è visibile e la morte è `hiddenClient`;
     - stacco di corsa da col 23: la piattaforma è a 25–27, la didascalia è visibile, la morte è `requirementChange`;
     - salto corto da col 23 dopo lo spostamento (o teletrasporto su col 26 dopo lo scatto): si arriva al gradino di col 30 senza morire;
     - screenshot di mail e didascalia.
     Tutti gli smoke esistenti verdi.
  4. Review del codice in contesto separato, poi playtest dell'utente.

  **Esito dell'implementazione:**
  - **Bug preesistente trovato e corretto:** `Player.grounded` usava `touching.down`, che Arcade imposta anche sulle *sovrapposizioni*. Cadendo dentro una zona di innesco o di morte il giocatore risultava "a terra" e poteva saltare a mezz'aria (anche dal fondo di un burrone con zona di morte). Ora vale solo `blocked.down`, che Phaser 3.90 imposta sul tilemap e sui corpi statici e immobili (tutte le superfici calpestabili), mai sulle sovrapposizioni. Gli smoke di tutti i livelli restano verdi.
  - Verifica: 170 test Vitest (`tests/Pranks.test.js`, 4 nuovi), build, `npm run smoke` verde con i 5 controlli 1d. Screenshot: `shot-prank-mail.png`, `shot-prank-requirement.png`.
  - Review del codice (`docs/CODE_REVIEW_PRANKS_CODE.md`, 12 punti minori): accolti `grounded = blocked.down` senza `markStanding` (inutile e fragile nei frame senza step fisico), commento di `level1.js` (sicuro da col 16), test con la piattaforma ferma a 27–29, nome dello smoke (d). Annotati: etichetta `requirementChange` = "il requisito che cambia a metà salto"; la frase "non è un bug dei comandi" torna alla prima morte da mail di ogni partita; busta e foglio senza scritte (bastano le didascalie). Lasciati: smoke di reset e di confine, `body.reset` invece della velocità (da rivedere se la piattaforma si riusa altrove).
  - Da provare al playtest: il salto dalla piattaforma spostata al gradino 30–31 (prima ci si saliva da fermi contro il muro) e il primo salto della partita.
- **2026-11-02 — Seconda mail e piattaforma camuffata** (utente: "un'altra mail come all'inizio, ma verso la fine"; "nascondi il pezzettino che si muove").
  - `hm2` sul salto dal gradino del fix (col 178) nel burrone 179–181: scatta se si stacca dagli ultimi 40 px (x 5704–5743). La catena reale del finale (stacco a col 177,9) passa; chi indugia sul bordo, spinto dal fix, prende la mail. Il limite destro tiene conto della discesa di 2 righe: da x ≥ 5744 la ricaduta finirebbe comunque su col 182.
  - `rs1` con `camouflage: true`: tile `top` + riempimento fino al fondo della mappa (2 righe), si muovono insieme. Sembra pavimento finché non scivola; la didascalia resta.
  - Smoke 1d(a) controlla il camuffamento, 1d(f) la seconda mail. `npm run smoke` 103/103, 170 test.
- **2026-11-02 — Piattaforma del requisito più piccola** (utente: "vorrei fosse difficile sopravvivere la prima volta"): `rs1` larga 2 (28–29 → 26–27) invece di 3. Si salva solo chi fa un saltello o frena presto in aria. Dalla posizione finale al gradino 30: 2 colonne vuote, salita di 2 (come prima). Smoke 103/103.

## Livello 2 — "La rivincita"
| | |
|---|---|
| File | `src/levels/level2.js` (125 colonne, orizzontale) |
| Carriera / GU / burnout min | consultant · 15 GU · 15% |
| Nato da | `IMPLEMENTATION_PLAN.md` §6.4 · `ITERATION_2.md` §4 · `ITERATION_3.md` §1 (micromanager, zona 47–66) · `ITERATION_4.md` §3 (traguardo che tradisce) |
| Slot (pivot dal livello 1) | slotA replyAll · slotB scopeCreep · slotC deckCollapse · slotD fakeKT |
| Altro | micromanager a torcia, traguardo che tradisce (`goal.trolls`, cartello portato di 14 colonne), **PM** (`pm1`, barra del Gantt sul burrone 67–72), **LinkedIn** (`li1`, `li2` sponsorizzato, burrone 97–103) |
| Checkpoint | cp0 |
| Test | `tests/LevelParser.test.js`: completabile con ogni pivot; `tests/PmLinkedin.test.js`: non completabile senza barra né post |
| Smoke | `smoke.mjs`, `smoke3.mjs`, `smoke4.mjs`, `smokeBurnout.mjs`, `smokePmLinkedin.mjs` |
| Prova | `?debug=1&level=level2[&pivot=…][&cp=cp0]` |

**Registro:**
- **2026-11-03 — Più denso, stessa lunghezza: il PM e LinkedIn** (utente: "complicare il livello 2, nuove trappole, introdurre il PM e LinkedIn"). Burrone 67–72 con la barra del PM che scivola indietro (poi due colonne, 73–74, prima delle spine 75–76); burrone 97–103 con due post LinkedIn (il secondo sponsorizzato, crolla al primo like) prima della consegna. Le cause `pm` e `linkedin` sono pivotabili: il livello 3 ha gli slot. Catena dei pivot in entrata invariata (gli slot del livello 2 restano quelli delle 4 cause del livello 1). Dettaglio in `docs/PM_LINKEDIN.md`. Classifica del livello 2: chiedere all'utente se azzerarla.

## Livello 3 — "Il primo team"
| | |
|---|---|
| File | `src/levels/level3.js` (180 colonne, orizzontale) |
| Carriera / GU / burnout min | manager · 15 GU · 30% |
| Nato da | `ITERATION_3.md` §3 · `ITERATION_4.md` §4 (team, delega, varco, stagista) |
| Slot (pivot dal livello 2) | mmA/mmB/slotMM micromanager · slotA replyAll · slotB scopeCreep · slotC deckCollapse · five4 fiveMinutes · slotD fakeKT · **slotPM pm** (burrone 41–46) · **slotLI linkedin** (burrone 58–62) |
| Altro | 4 porte "Hai 5 minuti?" (51, 56, 84, 140), stagista, varco di approvazione |
| Checkpoint | cp0 |
| Test | `tests/LevelParser.test.js`: completabile con tutte le combinazioni di pivot (anche `pm`, `linkedin`); chiuso se il varco resta chiuso; `tests/PmLinkedin.test.js` |
| Smoke | `smoke3.mjs`, `smoke4.mjs`, `smokeBurnout.mjs`, `smokePmLinkedin.mjs` |
| Prova | `?debug=1&level=level3[&pivot=…]` (anche `pivot=pm`, `pivot=linkedin`) |

**Registro:**
- **2026-11-03 — Slot del PM e di LinkedIn** (le cause nuove del livello 2 sono pivotabili, scelta dell'utente). Burrone 41–46 con la barra del Gantt (normale: scivola indietro; pivoted: ti porta avanti di 2) e burrone 58–62 con un post (normale: crolla al terzo like; pivoted: non crolla). La prima porta passa da col 47 a 51. In modalità normale sono due trappole in più. Livello 4 senza slot nuovi (come già per micromanager e KT). Dettaglio in `docs/PM_LINKEDIN.md`.

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

## Livello extra — "Il contadino"
| | |
|---|---|
| File | `src/levels/farm.js` (130 colonne, orizzontale) · scene `src/scenes/FarmScene.js` e `FarmHudScene.js` · logica `src/core/FarmDay.js` |
| Carriera / GU / burnout min | contadino (outfit `farmer`) · niente GU · niente burnout. **Fuori da `LEVEL_ORDER`**: niente pivot, Lessons Learned né classifica |
| Nato da | `docs/FARM.md` · `docs/BURNOUT.md` §5 |
| Come ci si arriva | solo con il burnout al 100% (`GameScene.burnoutOver`); alla panchina va al finale burnout |
| Contenuto | pollaio (3 galline, 5 uova), orto (4 ortaggi), spaventapasseri ex Partner, stagno (zona 101–111: E butta il telefono), panchina (col 124). Telefono: primo messaggio 2,5 s dopo il primo movimento, poi ogni 4,5 s, in ordine fisso |
| Checkpoint | nessuno (non si muore) |
| Test | `tests/Farm.test.js`: telefono, faccende, riepilogo, testi del finale, cielo; mappa senza burroni né spine, pile ≤ 2, faccende raggiungibili |
| Smoke | `smokeFarm.mjs`, `smokeBurnout.mjs` (morte al 100% → fattoria → finale) |
| Prova | `?debug=1&level=farm` |

**Registro:**
- **2026-11-02 — Prima versione** (utente: "sviluppa il livello del contadino"; scelte: faccende + tramonto, telefono da ignorare o buttare, nessuna morte, finale burnout rivisto). Dettaglio in `docs/FARM.md`.


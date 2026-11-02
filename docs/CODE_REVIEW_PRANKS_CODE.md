# Code review — Scherzetti del cliente (livello 1) e `Player.grounded`

Oggetto: diff non committato (`git diff` + `HiddenMail.js`, `RequirementShift.js`, `tests/Pranks.test.js`) che implementa la voce "Scherzetti del cliente" della scheda del livello 1 in `docs/LEVELS.md` (con la review del piano `docs/CODE_REVIEW_PRANKS.md`), più la modifica trasversale a `Player.grounded`.

Verifiche eseguite davvero:
- `npm test`: 20 file, **170 test verdi**.
- `npm run build`: ok.
- `npm run smoke`: **exit 0**, 102 PASS, 0 FAIL, nessun errore in console; la sezione 1d passa tutta (a–e).
- Riproduzione dedicata in Chrome headless (script nel mio scratchpad, non nel repo): giocatore fermo sulla piattaforma `rs1` (cols 27–29), campionando a ogni `postupdate` `grounded`, `blocked.down`, `standFrame === loop.frame` e il numero di step fisici del frame, con la fisica a 120 Hz (default) e a 30 Hz (`world.setFPS(30)`, per forzare frame senza step su un RAF a 60 Hz).

## Analisi del cambio `grounded` (la parte chiesta con più attenzione)

1. **`game.loop.frame` è costante tra lo step di Arcade e `scene.update`?** Sì. `TimeStep.step` chiama la callback del gioco e solo **dopo** fa `this.frame++` (TimeStep.js ~r. 744). In `Systems.step` l'ordine è `PRE_UPDATE` → `UPDATE` (lì gira `World.update`, con tutti gli step del frame e i collider) → `scene.update` → `POST_UPDATE` (`World.postUpdate`, poi la `syncView` di GameScene). Con più sotto-step (a 60 Hz ce ne sono 2 per frame con `PHYSICS_FPS` 120) tutte le callback dei collider hanno lo stesso `frame` di `scene.update`. Quindi l'uguaglianza è corretta **nei frame in cui c'è almeno uno step**.
2. **Frame senza step.** Con `fixedStep` e `PHYSICS_FPS` 120, su un display a 120 Hz con jitter, o a 144 Hz e più, ci sono frame con 0 step: lì `standFrame` resta al frame prima e `standFrame === frame` è falso. L'ho misurato: con la fisica a 30 Hz e il RAF a 60 Hz → 60 frame su 121 senza step, e `standFrame === frame` vero solo in 61 frame su 121. **Però `grounded` è rimasto vero in 121 frame su 121**, perché `blocked.down` era vero in tutti.
3. **Perché `blocked.down` è vero anche su corpi dinamici.** In Phaser 3.90, `ProcessY` (`RunImmovableBody2`) chiama `body1.processY(..., down = true)`, e `Body.processY` imposta `blocked.down`. Quindi atterrare su un corpo **immobile** imposta `blocked.down`, non solo `touching.down`. `blocked` si azzera solo in `preUpdate(willStep = true)`, quindi resta valido anche nei frame senza step e durante le pause della fisica. Le sovrapposizioni (`overlapOnly`) invece non toccano mai `blocked`: `separate` esce prima di `ProcessX/Y` e `GetOverlapY` imposta `blocked` solo se `!overlapOnly`. Quindi il bug di partenza (salto a mezz'aria dentro una zona di innesco o di morte) è davvero corretto, e senza regressioni.
4. **Elenco di tutto ciò su cui si può stare in piedi:**
   - tilemap: `blocked.down`;
   - solidi delle trappole (`addPlatform`: ScopeCreep trail, ApprovalGate barrier, AiDraft desks, FakeKT hiddenPlatforms, HiddenMail, RequirementShift), più la testa di ScopeCreep (`physics.add.image` + `setImmovable`): tutti immobili, quindi `blocked.down`;
   - oggetti `landed` di `objectGroup` (email di ReplyAll in `solidLanding`, slide di CollapsingDeck): il gruppo è `immovable: true`, quindi `blocked.down`;
   - assi dei lavoratori: corpi statici, quindi `blocked.down` (ramo `STATIC_BODY` di `GetOverlapY`).

   Non ci sono altri collider. `staticImage` di Goal, Deal, Checkpoint, Pickup, FakeKT e del chip di AiDraft sono solo overlap. Sycophant (dorso e tappetini), Rival, juniors, InternDesk ed Escalation sono a logica, senza corpi su cui stare. Nessuna superficie resta scoperta.
5. **Conseguenze per i consumatori di `grounded`** (coyote, ScopeCreep che si arma, piastra di ApprovalGate, `standing` di AiDraft, torcia del Micromanager, Rival, Sycophant, animazioni di PlayerView): **nessun flicker oggi**, perché lo regge `blocked.down` (vedi il punto 1 della lista sotto).

## Problemi

1. **Minore — `src/objects/Player.js` `markStanding`/`grounded`, `GameScene.registerColliders`, `Worker.js`.**
   - Problema: `markStanding` oggi è codice morto: ogni superficie su cui si sta è immobile o statica, quindi `blocked.down` è già vero. Inoltre il controllo `standFrame === game.loop.frame` è sbagliato nei frame senza step fisico (misurato: 61/121 frame veri). Lo si noterebbe con il primo corpo **non** immobile su cui si può stare, sui display ≥ 120 Hz: animazione che sfarfalla run↔fall, `groundDecel`/`airDecel` alternati, ScopeCreep che si arma più lento. Il commento in `Player.js` e la decisione in `DECISIONS.md` lasciano intendere che serva per i corpi solidi, e non è vero.
   - Fix proposto (uno dei due):
     - (a) eliminare `markStanding`, `standFrame` e le callback aggiunte, con `grounded = blocked.down` e un commento: "Arcade 3.90 imposta `blocked.down` anche sui corpi immobili; mai `touching.down`, che si accende sulle sovrapposizioni";
     - (b) tenerlo come rete di sicurezza, ma per step e non per frame: un contatore incrementato su `physics.world.on('worldstep')`, con `markStanding` che salva il contatore corrente e `grounded = blocked.down || standStep === stepCount - 1` (listener rimosso allo `shutdown`).

     In entrambi i casi aggiungere uno smoke: in piedi su un solido di trappola con `world.setFPS(30)`, `grounded` vero in tutti i frame.
2. **Minore — `Player.markStanding`.**
   - Problema: la condizione usa `this.body.touching.down`, cioè proprio il flag che le zone di sovrapposizione accendono (il bug appena corretto). Lo protegge solo `bottom <= other.top + 2`, che lascia un caso d'angolo: contatto laterale con lo spigolo mentre si attraversa una zona di innesco. Oggi non ha effetto per il punto 1.
   - Fix: se si sceglie il fix 1(b), usare `other.touching.up` (lo imposta la separazione sul solido stesso) oppure `this.body.blocked.down`.
3. **Minore — `scripts/smoke/smoke.mjs` sezione 1d.**
   - Problema: i 5 controlli sono sensati e passano per il motivo giusto: in (b) lo stesso stacco senza la mail supererebbe il burrone; (c) verifica `jump > 585`; (e) verifica anche le spine (riga 12). Mancano però:
     - (i) il **reset al respawn**: dopo la morte di (b) e (d) nessuno controlla `hm.shown === false`, la mail invisibile, `rs.state === 'idle'` e `plat === 27`;
     - (ii) i casi negativi al confine: stacco a x ≈ 540 (col 16, la contromossa dichiarata in `LEVELS.md`) senza mail; stacco a x < 704 (col 21) con la piattaforma che non si muove.
   - Fix: aggiungere (i) in coda a (b) e (d) dopo il respawn (~300 ms), e due casi (f) e (g) per (ii).
4. **Minore — `src/levels/level1.js` (commento di `hm1`).**
   - Problema: dice "take off from col 15 or earlier", ma la mail scatta solo da x ≥ 544. Uno stacco da col 16 (512–543) è sicuro, come dice la scheda ("staccare da col 16 o prima").
   - Fix: "take off before x 544 (col 16 or earlier)".
5. **Minore — `TextureFactory.js` `mailBlock` / `reqPlatform`.**
   - Problema: il punto 14 della review del piano dice busta con "CCN" e foglio "Requisiti v2", ma le texture hanno solo una striscia rossa e righe azzurre, senza testo. L'indizio a posteriori resta l'etichetta sopra la mail, quindi è solo una divergenza dal piano.
   - Fix: aggiungere il testo (un `scene.add.text` sopra l'immagine, o lettere disegnate) oppure aggiornare la scheda.
6. **Minore — `src/data/causes.js`.**
   - Problema: l'etichetta è "il requisito che cambia **a metà salto**", il piano dice "il requisito che cambia". Va bene, ma la scheda non è allineata.
   - Fix: aggiornare la scheda.
7. **Minore — `Narrator`/`narratorLines` `death_hiddenclient_first`.**
   - Problema: `causeDeaths` viene da `run.deathsByCause` (`StatsTracker.recordDeath`), quindi la frase "non è un bug dei comandi" torna **a ogni partita**, non solo la prima volta in assoluto. Probabilmente è voluto, ma non è scritto.
   - Fix: dichiararlo nella scheda, oppure usare un contatore persistente se la si vuole una sola volta.
8. **Minore — `LevelValidator.trapSurfaces` / `tests/Pranks.test.js`.**
   - Problema: il validatore vede `rs1` solo nella posizione finale (25–27). Il percorso con la piattaforma ferma a 27–29 (stacco da x < 704) non è più coperto da nessun test. Oggi funziona (era la geometria originale, 29 → 30 sale di 2 da fermi), ma una modifica futura potrebbe romperlo senza che ce ne si accorga.
   - Fix: un test con `shift: 0` (o con il ground 27–29 rimesso) che resti completabile in tabella `normal`.
9. **Minore — `RequirementShift.setX` (`body.reset` a ogni frame).**
   - Problema: dopo `reset` la piattaforma ha delta 0, quindi `GetOverlapX/Y` (`maxOverlap = delta + bias`) non spinge il giocatore se lei gli si teletrasporta addosso: chi si trovasse nel burrone a riga 15, cols 25–26, nei 0,2 s del movimento finirebbe dentro e ci cadrebbe attraverso. Con i numeri attuali è praticamente irraggiungibile, ed è comunque deterministico.
   - Fix: nessuno per ora. Se si riusa la trappola altrove, muoverla con `setVelocityX` (come la testa di ScopeCreep), così Arcade separa.
10. **Minore — `smoke.mjs` 1d(d) ed (e).**
    - Problema: il nome dice "from col 24", ma x = 770 ha il corpo ancora su col 23 (bordo a 768).
    - Fix: "dal bordo di col 23".
11. **Minore — `LevelValidator.entityColumns` `requirementShift`.**
    - Problema: il limite destro `x + width` è una colonna oltre la fine (30 invece di 29). Serve solo al ritmo, quindi è innocuo.
    - Fix: `+ p.width - 1 + 1` coerente con gli altri casi, oppure lasciare com'è con un commento.
12. **Nota (già accolta nel piano, punto 13) — god mode.**
    - In god mode `die('pit')` fa respawn senza `trap.reset()`: la mail resta visibile e solida e la piattaforma resta a 25–27 fino al reload. È coerente con le altre trappole. Va solo tenuto presente se si scrivono smoke in god mode.

Controllati e corretti:
- stacco letto nel frame del salto: `Player.update` gira prima delle trappole in `GameScene.update`, e lo stacco in coyote time è incluso (smoke 1d(c));
- mail a un'altezza fissa sopra i piedi allo stacco, quindi la testata è indipendente dal frame rate. Anche col salto corto (vy 279 → ~21 px di salita) la testata avviene sempre;
- `reset()` di entrambe le trappole: corpo spento, posizione di casa, `seenJumps` riallineato;
- pausa dello standup: le trappole non si aggiornano e i tempi stanno in `clock` accumulato da `dt`, quindi non vengono consumati;
- cause: `hiddenClient` solo se la mail è comparsa e c'è stato contatto da ≤ 2 s, altrimenti `pit`; `requirementChange` entro 3 s dallo spostamento;
- zone di morte sotto il livello del pavimento, quindi niente uccisioni stando sul bordo;
- cause non pivotabili, quindi la catena verso il livello 2 è invariata;
- pesi del narratore (5 > 4 > 3), con test.

## Riassunto

Nessun problema bloccante né importante. Test (170), build e smoke (102 PASS, sezione 1d compresa) sono verdi.
Il cambio di `grounded` è corretto e risolve il salto a mezz'aria nelle zone di sovrapposizione. Ho verificato nel sorgente di Phaser 3.90 e misurato in Chrome che `blocked.down` si accende anche sui corpi **immobili**, e su ogni superficie calpestabile del gioco (tilemap, solidi delle trappole, oggetti atterrati, assi statiche). Persiste anche nei frame senza step fisico.
`game.loop.frame` è costante tra gli step di Arcade e `scene.update` (`frame++` avviene dopo la callback).
Di conseguenza `markStanding` è di fatto ridondante, e il suo confronto per frame sarebbe sbagliato nei frame senza step (misurato: vero 61/121 con la fisica a 30 Hz): oggi non ha effetti, ma è una trappola latente e il commento è fuorviante (punti 1–2). Consiglio di toglierlo, o di farlo per step.
Le due trappole sono corrette, deterministiche e si azzerano al respawn. Agli smoke mancano il controllo del reset e i casi al confine (col 16, stacco prima di x 704) (punto 3). Restano piccole divergenze dal piano: testo sulle texture, etichetta della causa, commento in `level1.js`.

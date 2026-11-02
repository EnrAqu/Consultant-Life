# Review del piano — "Scherzetti del cliente" (livello 1: `hiddenMail`, `requirementShift`)

Oggetto: scheda del livello 1 in `docs/LEVELS.md`, voce di registro "2026-11-02 — Scherzetti del cliente (PIANO, da implementare)". Codice non ancora scritto.
Decisioni dell'utente non in discussione: solo livello 1; mail **senza indizio**; direzione dello spostamento fissa.

Conti fatti con `GRAVITY` 1800, `PLAYER` (salto 620, `fallGravityExtra` 700, `jumpCutMultiplier` 0,45, corsa 260, `airAccel` 1700, `airDecel` 900, coyote 90 ms, corpo 18×28), fisica Arcade a passo fisso **120 Hz** (`PHYSICS_FPS`, `main.js`). L'ordine nel frame è: passi fisici → `GameScene.update` (`player.update`, poi `trap.update`). Simulazione discreta a 60 e 30 fps: salto pieno 0,633 s / 164,7 px; testata sulla mail: ricaduta dopo 32,5 px (60 fps) o 45,5 px (30 fps); salto corto (rilascio subito) 0,317 s / 82 px.

`x0` indica il centro del giocatore nell'ultimo frame a terra, cioè il punto di stacco.

## Verificato e corretto
- **Testata sulla mail:** è pulita. A 120 Hz il giocatore sale al massimo di 5,2 px per passo, a qualsiasi fps di rendering, quindi non attraversa un blocco da 32 px. La compenetrazione al primo contatto è di circa 3 px, sotto `OVERLAP_BIAS` (4) più lo spostamento del passo. Con la gravità forte Arcade separa prima sull'asse Y, e `RunImmovableBody2` azzera `vy`.
- **Zone di morte:** la causa arriva prima di `'pit'`. L'overlap avviene durante il passo fisico (riga 15 o 16, y ≥ 480–512), mentre il controllo `'pit'` scatta molto dopo (`player.y > worldH + 64` = 608). Il percorso è quello già usato da `ScopeCreepPlatform.pitRect`.
- **Validatore:** con la piattaforma nella posizione finale (25–27, riga 15) il percorso in tabella `normal` esiste: 23→25 con 1 vuoto, poi 27→30 con salita di 2 e 2 vuoti (massimo 3), arco libero. `longestQuietStretch` non peggiora, perché le colonne 27–29 diventano burrone e contano come attive. Il test "solo grazie al ponte" non cambia.
- **Restano validi:** gli smoke e i test che toccano le colonne 15–37 (morte nel primo burrone senza saltare, spine a 30,12, 36,12, budget). L'unico che si rompe è "jump clears a 2-tile gap": partendo da col 15 con 250 ms di corsa stacca a circa col 17,1. Il piano lo prevede già.
- **Delega:** il livello 1 non ha team (`def.team` assente), quindi la delega non si applica. Le cause nuove non sono pivotabili, quindi la catena dei pivot non cambia.

## Problemi

1. **Bloccante — Rilevamento del decollo (A e B), `wasGrounded && !grounded && vy<0` e colonna del centro "al decollo".**
   **Problema:** il frame in cui `grounded` diventa falso è quello *dopo* il salto, quando i passi fisici hanno già spostato il giocatore di +4,3 px (60 fps) o +8,7 px (30 fps). Il corpo resta "a terra" finché il centro è entro +9 px oltre il bordo. Ne seguono due fughe:
   - **(a) stacco all'ultimo pixel:** per la mail, con `x0` ∈ [571,7 ; 585] la colonna letta è 18 e la mail non compare; per lo spostamento, con `x0` ∈ [763,7 ; 777] la colonna letta è 24 e la piattaforma non si sposta;
   - **(b) salto in coyote time:** chi esce dal bordo e salta entro 90 ms (fino a circa 23 px oltre) non ha mai `wasGrounded` vero, quindi nessuna delle due trappole scatta.

   Proprio il "salto comodo dal bordo", che il piano vuole punire, è quello che sfugge, e in modo che sembra casuale. A 60 fps la banda di stacco su col 17 si divide così:
   - 13 px: testata, ma si sopravvive;
   - 19 px: morte;
   - 13 px più il coyote: nessuna mail.

   Lo smoke S-M3 n. 2 come è scritto non vede mai la mail: `teleport(17.6)` porta il centro a 17,6·32 + 16 = 579 px, già nella fuga (a).

   **Fix:**
   - Esporre il salto dal `Player`: nel ramo del salto di `Player.update` impostare `this.jumpCount++` e `this.lastJump = { x: this.x, groundBottom: body.bottom }` (2 righe; va registrato, perché il piano dice "nessuna modifica a `Player.js`").
   - La trappola confronta `jumpCount` con il valore che ha visto l'ultima volta, nello **stesso frame** del salto, perché `trap.update` gira dopo `player.update`. Usa `lastJump.x` come punto di stacco.
   - Definire lo stacco in pixel e includere il coyote: mail con `x0` ∈ [544, 610), cioè `takeoffCols` [17, 18]; spostamento con `x0` ∈ [704, 800), cioè [22, 24] (vedi n. 6).
   - Resettare il contatore visto in `reset()`.

2. **Importante — Esito della mail che dipende dal frame rate.**
   **Problema:** la mail si piazza a "`body.top − 2`" nel momento in cui viene rilevata, cioè dopo 2 passi fisici (a 60 fps) o 4 (a 30 fps, che su mobile in risparmio energetico è frequente). La testata arriva quindi più in alto o più in basso, e così anche la ricaduta (32,5 contro 45,5 px). La soglia di morte diventa `x0` ≈ 552 a 60 fps e ≈ 540 a 30 fps. Una trappola che si deve *imparare* (niente indizio) cambia con il dispositivo.
   **Fix:** con il fix n. 1 la mail compare nel frame del salto, a un'altezza fissa rispetto al suolo di stacco (es. bordo inferiore = `lastJump.groundBottom − 28 − 12`). La testata arriva dopo circa 3 passi a 120 Hz a ogni fps, e l'esito dipende solo da `x0`.

3. **Importante — Il "pop" in scala 0.6→1 sul solido.**
   **Problema:** `addPlatform` crea una `tileSprite` con corpo dinamico, e Arcade ricalcola la misura del corpo dalla scala dell'oggetto (`Body.updateBounds`). Con `origin (0,0)`, durante i 120 ms il corpo è un quadrato da circa 19 px nell'angolo in alto a sinistra e cresce verso il basso, dentro la traiettoria della testa: altezza e momento della testata diventano variabili.
   **Fix:** due oggetti.
   - Un solido **invisibile a misura piena**, fermo: è quello in `solids`.
   - Un'immagine **senza corpo**, con `origin 0.5`, che fa il pop. In alternativa, niente pop.

4. **Importante — Ciclo di vita della mail (ambiguità che porta a bug).**
   **Problema:** i collider vengono registrati una volta sola in `registerColliders()`, dopo `build()`. Se la mail viene creata allo scatto, non collide. Inoltre `addPlatform(col,row,…)` lavora in colonne intere, mentre la mail va centrata in pixel. Manca anche una protezione "una volta sola": chi salta di nuovo stando *sopra* la mail su col 17 la vedrebbe spostarsi sopra la testa.
   **Fix:**
   - Creare il solido in `build()`, nascosto e con `body.enable = false`.
   - Allo scatto: `setPosition` + `body.reset(px, py)` + `enable = true`.
   - Stato `idle → shown` che scatta una volta sola fino a `reset()`.
   - `reset()` nasconde mail ed etichetta, disattiva il corpo e azzera i timer.

5. **Importante — `requirementShift` non dice che lo spostamento avviene una volta sola.**
   **Problema:** se il bersaglio si calcola come "posizione attuale + `shift`", un secondo stacco da 20–23 lo porta a 23–25, sovrapposto al terreno di col 23. Succede a chiunque abbia innescato la trappola con un saltello e poi salti il burrone.
   **Fix:**
   - Stato `idle → moving → done`, scatto solo in `idle`.
   - Bersaglio fisso `x + shift`, e alla fine aggancio esatto alla colonna (come `setHead`), così gioco e validatore coincidono.
   - `reset()` riporta la piattaforma a 27–29, nasconde la didascalia e azzera i timer.

6. **Minore — `takeoffCols: [20, 23]` è troppo largo.**
   **Problema:**
   - Chi atterra dal primo burrone su col 20–22 e risalta (jump buffer, saltelli) fa scattare lo spostamento in anticipo: quando arriva al bordo il burrone è di 1 colonna (23→25), quindi la trappola sparisce.
   - Un salto pieno da col 20 (`x0` ≈ 650) atterrerebbe nel burrone, ma con la piattaforma spostata finisce su 25–27: in quel caso la trappola *salva* il giocatore.

   **Fix:** stacco in pixel `x0` ∈ [704, 800) (col 22–24, coyote compreso; vedi n. 1). Da lì i salti pieni arrivano comunque oltre col 24.

7. **Minore — I conti di B nella scheda vanno corretti.**
   **Problema:**
   - Il volo dura 0,633 s, non 0,69. Dal bordo (`x0` ≈ 768) si atterra a col 29,2, non 28,5.
   - La finestra letale reale (dopo il fix n. 1) è `x0` ≥ 740 fino al coyote (~800). Chi stacca prima di `x0` 740 (col 23,1) atterra sulla piattaforma spostata.
   - Contromosse verificate:
     - salto corto: rilasciando subito si atterra a +82 px (su 25–27), rilasciando al decimo frame a +130 px (al limite);
     - frenata rilasciando la freccia: a 0,25 s si atterra a +105 px, a 0,35 s a +126 px (al limite);
     - **premere sinistra** a 0,35 s porta a +49 px, cioè nel burrone di col 24 (sovra-frenata).

   **Fix:** aggiornare "Conti" e usare questi valori negli smoke.

8. **Minore — I conti di A e la "contromossa" della scheda sono sbagliati.**
   **Problema:**
   - La ricaduta è di circa 32 px, non 27 (a 30 fps 45 px), e la soglia è `x0` ≈ 552.
   - Il suggerimento "torna a col 15–16 e salta di lì (a col 17 è già a ~60–100 px)" non regge: per superare la mail (fondo a ~40 px dal suolo, cima a ~72) serve staccare da `x0` ≲ 490 (col 15,3). Da col 16 si sbatte di nuovo contro la mail.
   - In compenso chi prende la testata nella zona "presto" atterra già **a destra** della mail: ricaduta `x0`+32,5 contro il bordo destro della mail a `x0`+20,3. Ancora su col 17, può risaltare subito e superare il burrone: nessun soft-lock e nessun ciclo ingiusto.

   **Fix:** correggere il testo, e prevedere uno smoke "testata presto → risalto → passa".

9. **Minore — Finestre di attribuzione della causa.**
   **Problema:**
   - La mail resta fino al respawn, ma `'hiddenClient'` vale solo per 2000 ms dalla comparsa. Una seconda testata contro la mail già presente, più tardi, viene contata come `'pit'`.
   - Per B, chi innesca lo spostamento e poi sbaglia da solo il salto entro 3 s muore per `'requirementChange'`.
   - Con `scene.time.now`, la pausa di 3 s dello standup consuma la finestra.

   **Fix:**
   - Mail: finestra dall'ultimo contatto (`onSolidContact` → `lastContactAt`, come `ScopeCreepPlatform`).
   - Timer: accumulare `dt` in `update` (si ferma con le pause).
   - B: accettabile, ma va scritto.

10. **Minore — "Se il giocatore ci sta sopra mentre si muove, lo trascina il collider di Arcade" è falso con `body.reset`.**
    **Problema:** `reset` copia `prev = position`, quindi in `ProcessY.RunImmovableBody2` lo spostamento trasmesso è 0. Oggi non conta, perché nessuno può stare sulla piattaforma nei 0,2 s del movimento (il volo minimo è circa 0,3 s), ma l'affermazione resta sbagliata.
    **Fix:** togliere la frase, oppure muovere la piattaforma con la velocità come fa `ScopeCreepPlatform` nello stato `extending`.

11. **Minore — Gli smoke S-M3 sono fragili.**
    **Problema:**
    - "Salto quando `tile[0] === 16`" con il polling di Puppeteer: col 16 dura 123 ms di corsa, e con la latenza di `evaluate` lo stacco reale può finire oltre `x0` 540–544, dove compare la mail.
    - L'helper `teleport` aggiunge +16 px: "17,6 colonne" vale 579 px.

    **Fix:**
    - Fissare il punto di stacco: `page.evaluate` con `body.reset(xPx, y)` + `setVelocityX(260)`, poi Space (es. mail: `x0` 530 passa, 565 muore, 600 in coyote muore; spostamento: `x0` 770 muore, 770 + rilascio immediato passa).
    - Aggiungere i casi "stacco all'ultimo pixel" e "coyote" a garanzia del fix n. 1.

12. **Minore — Dopo lo spostamento si deve atterrare su un ripiano di 2 colonne (30–31) prima delle spine 32–34.**
    **Problema:** il salto parte da 25–27, con 2 colonne vuote e una salita di 2. Prima si saliva da fermi contro il muro di col 30. È fattibile (salto pieno di corsa da `x0` ∈ [814, 878] o con dosaggio), ma si ripete a ogni morte prima di cp0 (col 95), e c'è un solo checkpoint (decisione registrata).
    **Fix:** nessun cambio obbligatorio. Lo smoke n. 4 deve controllare anche "nessuna morte da spine", con input definiti. Segnalarlo al playtest.

13. **Minore — God mode.**
    **Problema:** in god mode `die('pit')` fa solo `respawnAt` senza `trap.reset()`, quindi mail e piattaforma spostata restano dopo una caduta.
    **Fix:** scriverlo nella scheda, oppure chiamare `reset()` delle trappole anche nel respawn in god mode.

14. **Minore — Ambiguità minori per chi implementa.**
    - `trapSurfaces`: il ramo `requirementShift` va **prima** di `if (mode !== 'pivoted') return cells;`.
    - Texture della piattaforma 3×1 non specificata (sembra terreno? è una lastra sospesa sopra il vuoto, il che è già un mezzo indizio).
    - L'ASCII "oggi (18–31)" parte in realtà da col 16, e la riga 13 mette il gradino a 28–29 invece che a 30–31.
    - La busta mostra "CC" mentre etichetta e narratore dicono "copia nascosta"/"CCN": meglio "CCN".
    - `requirementChange` ("il requisito che cambia") è vicino all'esistente `clientSwitch` ("il cliente che cambia idea"): va bene, ma va scelto in modo consapevole.
    - Per la skin junior non serve nessuna voce: `causeLabel` usa già il valore di base.
    - Facoltativo: casi `hiddenMail`/`requirementShift` in `entityColumns`.
    - Aggiornare la tabella della scheda (Trappole, Test, Smoke 1d) quando si implementa.

15. **Minore (rischio di una decisione, non da cambiare) — La mail senza indizio è sul *primo salto della partita*.**
    **Problema:** il primo "muori anche se hai saltato" di un giocatore nuovo può sembrare un bug di input.
    **Fix:** la frase del narratore alla prima morte `hiddenClient` lo rende intenzionale. Valutare un peso alto per quella frase (es. `causeDeaths === 1`), senza toccare la trappola.

## Riassunto
- Il piano regge sul piano fisico. La testata a 120 Hz è pulita, senza attraversamenti. Le zone di morte attribuiscono la causa prima di `'pit'`. Il validatore con la posizione finale è l'approccio giusto. I test e gli smoke esistenti restano validi, tranne "jump clears a 2-tile gap", che il piano già prevede.
- **Bloccante (n. 1):** il rilevamento del decollo legge la colonna un frame dopo e ignora il coyote time. Lo stacco sul bordo, cioè proprio il caso da punire, sfugge a **entrambe** le trappole per gli ultimi 13 px e per tutto il coyote. Lo smoke previsto per la mail (`teleport` 17,6 = 579 px) non la vedrebbe mai. Fix: `jumpCount`/`lastJump` nel `Player` (2 righe, da registrare) e stacco misurato in pixel, coyote compreso.
- **Importanti:**
  - esito della mail che cambia con il frame rate: piazzarla ad altezza fissa nel frame del salto;
  - il "pop" in scala deforma il corpo Arcade: solido fisso più visuale separato;
  - la mail va creata in `build()` con posizionamento in pixel e scatto una tantum;
  - lo spostamento va dichiarato una tantum, con aggancio alla colonna finale.
- **Minori:**
  - conti da correggere (B: 0,633 s, col 29,2, finestra letale `x0` ≥ 740; A: ricaduta 32 px; "torna a col 15–16" sbagliato, ma niente soft-lock perché si atterra a destra della mail);
  - `takeoffCols` di B da stringere a 22–24;
  - attribuzione della mail sull'ultimo contatto e timer in `dt`;
  - la frase sul trascinamento con `body.reset` è falsa;
  - smoke da rendere deterministici con stacco in pixel;
  - ripiano 30–31 più esigente;
  - god mode;
  - ASCII, texture e "CC"/"CCN".

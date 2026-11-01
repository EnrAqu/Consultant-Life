# Registro decisioni

Formato: `data — decisione — motivo`. Le decisioni più recenti prevalgono su quelle precedenti e sui documenti di piano.

## Prodotto e tema
- 2026-10-31 — Platformer 2D browser, genere rage game — richiesta utente; genere adatto alla frustrazione "di precisione".
- 2026-10-31 — Costo zero: sito statico su itch.io + GitHub Pages, nessun backend nell'MVP — richiesta utente.
- 2026-10-31 — Tema: il mondo della consulenza, carriera come scalata (Analyst → Partner) — richiesta utente.
- 2026-10-31 — Nome del gioco **non deciso**; "RageBait" è un placeholder (_Up or Out_ non convince) — utente ci sta pensando.
- 2026-10-31 — Principio guida "crudele ma giusto": ogni trappola ha un indizio leggibile a posteriori — dalla ricerca sui rage game.
- 2026-10-31 — Narratore affettuoso-sarcastico, passivo-aggressivo aziendale, che commenta statistiche reali — ricerca + utente.

## Meccaniche
- 2026-10-31 — Meccanica "Lessons Learned": la causa di morte dominante del livello N diventa un aiuto (pivot) nel livello N+1 — idea dell'utente.
- 2026-10-31 — Risorsa vita/timer in **Giornate Uomo (GU)**, non ore né vite — scelta dell'utente.
- 2026-10-31 — Finali multipli: Partner (troll), società prodotto, burnout, **campi** (finale segreto, il vero lieto fine) — idea dell'utente. Post-MVP.
- 2026-10-31 — Elementi post-MVP: arrivista, capo micromanager ("io lo sapevo fare meglio"), escalation (a GU esaurite o rara), roll-off senza KT, bonus AI con piattaforme "allucinate" — idee dell'utente.
- 2026-10-31 — Daily standup a orari fissi e prevedibili: tutto si congela, se sei in aria cadi dopo — prevedibile quindi giusto.
- 2026-10-31 — KT è un finto power-up che brucia GU — idea dell'utente.

## Scope MVP
- 2026-10-31 — MVP: movimento + barra GU + 4 trappole (reply-all, scope creep, deck che crolla, KT finto) + standup + narratore + Lessons Learned con un pivot nel livello 2 — approvato dall'utente.
- 2026-10-31 — Niente audio nell'MVP; gli indizi delle trappole sono solo visivi — semplicità.
- 2026-10-31 — Grafica procedurale (placeholder generati in codice), nessun asset esterno nell'MVP — zero download.

## Tecnica
- 2026-10-31 — Phaser 3.90.0 + Vite 6.3.5 + Vitest 3.2.4, versioni esatte, JavaScript ES modules — piano MVP.
- 2026-10-31 — Logica pura in `src/core/` testata con Vitest; scene e oggetti Phaser separati — testabilità.
- 2026-10-31 — Restart in-place senza riavviare la scena (< 1 s) — requisito "ancora un tentativo".
- 2026-10-31 — Ogni trappola come gruppo/pool stabile con collider creati una volta (oggetti spawnati devono collidere) — review, bloccante #1.
- 2026-10-31 — UIScene avviata prima di GameScene, così l'HUD riceve gli eventi iniziali — review, bloccante #2.
- 2026-10-31 — Causa dominante misurata in **incidenti** (morte = 1, KT finto = 2), non in GU; se la causa reale non è pivotabile la slide lo dice — evita che il KT vinca sempre e che la slide menta (review #12).
- 2026-10-31 — Livello 1 ~220 colonne (45–60 s per chi lo conosce); standup dalle 09:20 ogni 20 min — il livello originale durava 30–40 s (review #15).
- 2026-10-31 — Mappa ASCII unica per livello; le varianti pivotate cambiano geometria solo tramite override `tiles` dello slot — review #4.
- 2026-10-31 — Spesa di GU centralizzata in `GameScene.spendGu`; durante la call del KT il player è congelato anche in verticale — review #7.
- 2026-10-31 — Piano v1.1: la §14 di `IMPLEMENTATION_PLAN.md` applica la review e prevale sulle sezioni precedenti.
- 2026-10-31 — Caffè raccoglibile una sola volta per livello (non ricompare al respawn) — review.
- 2026-10-31 — Un checkpoint vero nel livello 1; tasto R costa 0,5 GU; orologio corre durante lo standup; livello 2 con 15 GU nuove — proposta del piano, confermata dalla review.

## Processo
- 2026-10-31 — Un solo agente con più playbook (`plan`, `review`, `implement`) al posto di agenti specializzati — richiesta utente.
- 2026-10-31 — Il playbook `review` gira in un contesto separato — revisione indipendente, richiesta utente.
- 2026-10-31 — Un solo modello per tutti i playbook — accettato dall'utente.
- 2026-10-31 — Toolbox: oltre ai playbook, solo strumenti che danno verifiche automatiche: validatore di livelli (raggiungibilità) e parametri di debug via URL. Niente editor di livelli per ora — utili all'agente per verificare senza giocare a mano.

## Implementazione (prima versione)
- 2026-10-31 — Vite 6.4.5 e Vitest 4.1.12 invece di 6.3.5 / 3.2.4 — le versioni del piano avevano vulnerabilità note (npm audit: 0 dopo l'aggiornamento). Workflow su Node 22.
- 2026-10-31 — Mappe scritte con un piccolo helper (`src/levels/builder.js`) che produce le stesse 17 righe ASCII — più facile da modificare che 17 stringhe da 220 caratteri.
- 2026-10-31 — ReplyAll: trigger 5 tile prima del corridoio (non 2) — con 2 tile chi corre passava prima che le email arrivassero all'altezza del corpo (calcolo + test nel browser).
- 2026-10-31 — Deck: le slide sono ancorate per il bordo sinistro alla colonna `x + dx`; trigger all'ingresso del corridoio (dx 0); ordine di caduta dall'uscita (dx 4, 2, 0).
- 2026-10-31 — Livello 2: scope creep pivotato lungo 17 (dalla sporgenza fino all'altra sponda) e a livello del pavimento (`dy: 1`), così non spinge il player; deck pivotato veloce (trigger 8 tile prima, caduta 20 tile/s) per non far cadere chi corre; KT dello slot D sospeso all'ingresso in entrambe le modalità (opzionale, non sul percorso).
- 2026-10-31 — Niente `Goal.js`: il traguardo è un'immagine statica gestita da GameScene.
- 2026-10-31 — Smoke test nel browser (puppeteer-core su Chrome locale) eseguito fuori dal repo; da decidere con l'utente se aggiungerlo al progetto (richiede una dipendenza di sviluppo).

## Iterazione 2 (playtest #1)
- 2026-10-31 — Fisica di movimento invariata — piace all'utente.
- 2026-10-31 — Rendering HD: canvas 1920×1080, camera zoom 2, texture disegnate a 2× e scalate 0,5; coordinate di mondo e hitbox invariate — nitidezza senza toccare il gameplay.
- 2026-10-31 — Resa del player separata dal corpo fisico (`PlayerView`), con animazioni e squash & stretch solo visivi — fluidità senza cambiare le hitbox.
- 2026-10-31 — Outfit per livello di carriera: junior trasandato → consultant → manager → senior manager → partner "fa ciò che vuole"; salopette per il finale dei campi. Per ora solo estetici — richiesta utente.
- 2026-10-31 — Livello 2: geometria invariata, si aggiunge solo un checkpoint (col 52). L'utente ha scoperto che lo slot D si passa prendendo il KT verde: la difficoltà va bene — supersede ITERATION_2 §4 (pilastri larghi e tabella "normale" non si applicano).
- 2026-10-31 — KT finto **rosso**, KT vero **verde**: distinzione netta invece del dettaglio del calendario — all'utente piace l'idea "verde utile, rosso inutile".
- 2026-10-31 — Priorità dell'iterazione 2: prima nitidezza, fluidità e outfit (ITERATION_2 §1–3), poi il resto — richiesta utente.
- 2026-10-31 — Email come card leggibili (URGENTE, RE: RE: FW:, ...) con hitbox letale più grande — "non fanno paura".
- 2026-10-31 — Nuova variante delle email `landing: 'solid'`: letali in caduta, poi restano come ponte su un fosso non saltabile; usata nel livello 1 (S6a) — idea dell'utente.
- 2026-10-31 — Leaderboard: per ora solo locale (tempi migliori + Hall of Shame per morti); globale rimandata — richiesta utente ("anche temporanea").
- 2026-10-31 — Rendering: canvas 1920×1080; HUD e schermate a zoom 2 (layout 960×540); **mondo a zoom 2,5** (vista 768×432 px di mondo, personaggio più grande); texture disegnate a **3×** — l'utente vuole il gioco più grande e nitido. Supersede i numeri di ITERATION_2 §1.
- 2026-10-31 — Tile disegnati da una seconda tilemap HD scalata (il Blitter di Phaser ignora la scala); la tilemap a 32 px resta invisibile per le collisioni.
- 2026-10-31 — Box del narratore in alto al centro, così non copre il pavimento dove si gioca.
- 2026-10-31 — Livello 2, slot D: pilastro largo 2 (cols 89–90), salti da 4 invece di 5 — senza il KT verde il salto era al limite della fisica; l'utente ha scelto di ammorbidire (supersede la riga "geometria invariata").

## Iterazione 3 (pianificata, non sviluppata)
- 2026-10-31 — Micromanager nei livelli 2 e 3, non dal 4 in poi (sei più alto di grado) — utente.
- 2026-10-31 — Micromanager e "Hai 5 minuti?" non uccidono: bloccano e costano 0,5 GU; contano come incidenti (peso 1) e sono pivotabili — coerente con "crudele ma giusto".
- 2026-10-31 — Il micromanager vive in una zona fissa del livello (il "suo ufficio"), con controlli regolari ogni 6 s annunciati da "…"; ti lascia stare se corri o se sei dietro una pianta; esito della demo alternato (deterministico).
- 2026-10-31 — Seconda sfida scelta: "Hai 5 minuti?" — utente. Arrivista e bonus AI restano nel backlog.
- 2026-10-31 — Livello 3 "Manager" con Lessons Learned anche dopo il livello 2 — piano iterazione 3.
- 2026-10-31 — Iterazione 3 solo pianificata: non sviluppare finché l'utente non lo chiede.
- 2026-10-31 — L'utente chiede di sviluppare: prima il resto dell'iterazione 2 (battute, ponte di email, leaderboard), poi l'iterazione 3, infine una review del codice in contesto separato. Repo **solo locale**, nessun remoto per ora — utente.
- 2026-10-31 — "Hai 5 minuti?" pivotato: la scorciatoia scatta al contatto con il collega (flash + spostamento), non con ↑ — ↑ è già il salto.
- 2026-10-31 — Il player ha blocchi dell'input per motivo (`kt`, `mm`, `five`): più sistemi possono bloccarlo insieme senza sbloccarsi a vicenda.
- 2026-10-31 — Lessons Learned dopo ogni livello che ha un successivo (ordine in `levels/index.js`); la leaderboard locale registra ogni livello completato.

## Review del codice (iterazioni 2–3)
- 2026-10-31 — Micromanager: cattura solo a terra, mai sopra un burrone; non cammina sui burroni; "nascosto" = accanto a una pianta o pianta in mezzo; un player già bloccato non viene catturato — review #2–#4 ("non uccidono" deve essere vero).
- 2026-10-31 — Collega dei 5 minuti: dopo una conversazione non ti riaggancia finché non ti allontani — review #13.
- 2026-10-31 — Validatore con tabella `normal` (livelli 1 e 3); il livello 2 resta verificato con `hard` perché lo slot B ha volutamente il salto da 5 nel percorso normale (il pivot è l'alternativa) — review #5.
- 2026-10-31 — Il pivot `fiveMinutes` è raggiungibile solo in debug finché le porte compaiono solo nel livello 3 (l'ultimo) — review #6.
- 2026-10-31 — Divergenze dal piano accettate: classifica finale top 3 (non 5) per spazio; squash & stretch con costante 40 ms (più reattivo di 120); i "!" del micromanager pivotato al posto di `revealHint()`; `mm_catch_3` senza condizione (il MM non uccide); card email larga 54 per leggere i titoli — review #14.
- 2026-10-31 — Le partite con override di debug non entrano nella leaderboard — review #11.
- 2026-10-31 — Smoke test nel browser salvati in `scripts/smoke/`; per eseguirli serve `puppeteer-core` (dipendenza di sviluppo): **in attesa della decisione dell'utente**.

## Iterazione 4 (pianificata, non sviluppata)
- 2026-10-31 — Email più veloci (14 tile/s, trigger ricalcolato a −3) e CR molto più veloci (12 tile/s, attivazione 250 ms) — playtest #2.
- 2026-10-31 — Nessun tratto obbligatorio con più di 12 colonne "vuote", verificato dal validatore; livello 1 accorciato (S4 e S7) — playtest #2 ("noioso alla fine del livello 1").
- 2026-10-31 — Traguardo che tradisce solo nei livelli 2 e 4: da sinistra il cliente cambia idea (−5 GU) e il cartello viene portato avanti (una volta); **da destra si vince subito** — utente.
- 2026-10-31 — Team = A+B: i junior ti seguono ripetendo il tuo percorso e puoi delegarne uno (sacrificio) a una trappola o a un NPC; sfide con sacrificio obbligatorio ("Approvazione richiesta") con stagista di riserva per evitare blocchi — utente (A+B, sfide con sacrifici), dettagli proposti nel piano.
- 2026-10-31 — Livello 4 "Senior Manager" confermato: arrivista, bonus AI, porte "5 minuti" come slot, team, traguardo che tradisce, niente micromanager — utente.
- 2026-10-31 — Iterazione 4 solo pianificata: non sviluppare finché l'utente non lo chiede.
- 2026-10-31 — Micromanager "a torcia": niente controllo ogni 6 s né esenzione per chi corre; se entri (a terra) nella sua torcia ti ferma (−0,5 GU). Torcia corta e bassa (5×2 tile, si salta sopra), pattuglia che si gira ogni 3 s con preavviso, le piante bloccano la luce, 3 s di torcia spenta dopo una presa — utente ("abbastanza inutile"). Supersede ITERATION_3 §1.1–1.2.
- 2026-10-31 — Risposte dell'utente all'iterazione 4: tasto delega **E** (alternativa Shift); team **dal livello 3**; junior persi **per sempre** (minimo 1 grazie allo stagista); **`puppeteer-core`** aggiunto come dipendenza di sviluppo per gli smoke test (`npm run smoke`). Iterazione 4 in sviluppo.
- 2026-10-31 — Micromanager del livello 2: zona 54–66 (dopo il checkpoint, così al respawn non sei nella torcia).
- 2026-10-31 — puppeteer-core 25.14.0 (non la 24.x: vulnerabilità; non l'ultima 25.16: ha meno di due settimane).
- 2026-10-31 — Livello 1 ridotto a 195 colonne: zona caffè 73–96 (2 caffè), finale con CR veloce su un gradino e mini-valanga di 5 email prima del cartello; livello 2: tre spine tra deck e KT. Regola dei 12 tratti "vuoti" verificata da test per tutti i livelli.
- 2026-10-31 — **Nome del gioco: "Consultant Life"** — scelto dall'utente. Titolo della pagina, schermata iniziale e `package.json` aggiornati; le chiavi di `localStorage` restano `ragebait.*` per non perdere statistiche e classifica già salvate. Il nome della cartella locale non cambia.
- 2026-10-31 — Traguardo che tradisce implementato (`GoalBrain` + `Goal`): livello 2 con `goal: { trolls: true, carryCols: 14 }`, esteso a 125 colonne con una CR veloce oltre il cartello. Causa `clientSwitch` (incidente, non pivotabile).
- 2026-10-31 — Repo GitHub privata **EnrAqu/Consultant-Life** (richiesta utente). CI (test + build) a ogni push; deploy su Pages solo manuale, perché Pages richiede una repo pubblica o un piano a pagamento.
- 2026-10-31 — Repo resa **pubblica** e GitHub Pages attivato (sorgente: GitHub Actions), deploy automatico a ogni push su main — richiesta utente.
- 2026-10-31 — Team & delega implementati: `TeamTrail` e `DelegateTargeting` (puri, testati), `Team`, `ApprovalGate`, `InternDesk`; livello 3 si apre con il varco "Approvazione richiesta" (tutorial della delega: E), stagista a col 5; micromanager della zona A spostato a col 16 per non trovarselo addosso appena superato il varco.
- 2026-10-31 — Il tasto delega ascolta l'evento keydown (un tocco brevissimo non va perso: Phaser azzera `JustDown` al rilascio nello stesso frame).
- 2026-10-31 — La delega al KT finto, al collega e al micromanager "consuma" il junior come le trappole (persi per sempre, coerente con la Q3).
- 2026-10-31 — Micromanager: chi sta **alla pianta** è nascosto anche quando lui ci passa accanto pattugliando (bug trovato dagli smoke test).
- 2026-10-31 — Il "!" del micromanager pivotato resta un semplice punto esclamativo, senza testo — utente.
- 2026-10-31 — Livello 4 "Il cliente strategico" implementato: arrivista (×2: il primo si ferma al varco, il secondo corre al cartello e costa 2 GU se arriva prima), bonus AI con 2 piattaforme allucinate su 5, 2 varchi con stagista, porta "5 minuti" come slot (pivot ora raggiungibile dal livello 3), traguardo che tradisce. Validato con salti "normali" per tutte le combinazioni di pivot.
- 2026-10-31 — Gli smoke test nel browser aspettano in tempo reale: vanno eseguiti a macchina scarica (sotto carico Phaser rallenta il gioco invece di saltare frame e i controlli a tempo falliscono).
- 2026-10-31 — Tempo di gioco reale: `fps.smoothStep: false` (Phaser limitava ogni frame a 16,7 ms quando la finestra non ha il focus o nei primi 120 frame → a 30 fps il gioco andava a metà velocità). GameScene limita già un singolo frame a 50 ms.
- 2026-11-01 — Bonus AI: le piattaforme vere richiedono salti da 5 (più difficili del percorso normale): è voluto, l'AI è una scommessa, non una scorciatoia sicura (review 4 #16).
- 2026-11-01 — Camera: lerp indipendente dal frame rate (il lerp di Phaser è per frame: a 30 fps la camera restava il doppio indietro e tutto sembrava lento), lerp 0,18, deadzone 60×70, "look-ahead" di 70 px nella direzione di corsa — utente: "ho ancora la sensazione sia lento".
- 2026-11-01 — Smoke test: tutti e 61 i controlli verdi (`npm run smoke`); l'ultimo fallimento era una gara nel test (deck fatto scattare prima che il frame gestisse il tasto E), non un bug.

## Iterazione 5 (pianificata, non sviluppata)
- 2026-11-01 — Velocità di gioco: va bene così dopo la correzione della camera — utente.
- 2026-11-01 — Livello 5 "Partner" **verticale** (torre), con l'escalation come sfida principale — utente.
- 2026-11-01 — **Tutti e 4 i finali nel livello 5** (Partner troll, società prodotto, burnout, campi), per ora: probabilmente cambierà — utente.
- 2026-11-01 — Torcia invertita (la torcia ce l'hai tu: i lavoratori si fermano se li guardi), SteerCo, Business Development (3 opportunità per il Board), arrivista diventato leccapiedi, NPC "ambiziosi" che ti fermano per far colpo — utente. Dettagli proposti in `docs/ITERATION_5.md`.
- 2026-11-01 — Le meccaniche nuove del livello 5 non hanno variante pivotata (è l'ultimo livello); il livello 5 contiene gli slot delle trappole pivotabili dal livello 4.
- 2026-11-01 — Risposte all'iterazione 5: campi solo con pipeline 0/3; dopo il finale Partner si ricomincia vestiti da Partner; la presa dell'escalation **per ora è innocua** (nessuna morte né GU: la marea si riabbassa); la porta del Recruiter chiede conferma — utente.
- 2026-11-01 — Escalation: la presa costa **3 GU** ("spiegare al cliente cosa è successo") + 1,2 s di call, non è una morte — utente (sostituisce la presa innocua).
- 2026-11-01 — Si sviluppa solo la **5A** (torre, escalation, lavoratori, leccapiedi, opportunità, Board, finale Partner); SteerCo, ambiziosi, Recruiter e campi nella 5B — utente, su proposta della review.
- 2026-11-01 — Il leccapiedi non blocca mai il player (adula soltanto) e fa da trampolino solo sui tappetini `b` — review #2/#3/#7.
- 2026-11-01 — **Burnout** = feature a parte con un suo playbook (`.claude/skills/burnout/`): barra che sale con morti, prese dell'escalation, junior persi (per ora tutto +1%), non si azzera tra i livelli e ogni livello parte da un minimo più alto (0, 15, …); il finale burnout si lega alla barra — utente.
- 2026-11-01 — Escalation: velocità 50 / 60 / 62 / 72 px/s (VP e CEO più lenti del piano), verificate in `tests/Level5.test.js` contro la salita più breve: un player a buon ritmo non viene mai preso, uno lento sì.
- 2026-11-01 — I lavoratori iniziano a costruire quando il Partner arriva sul loro piano (entro 14 colonne e 4 righe): altrimenti avrebbero finito prima del tuo arrivo.
- 2026-11-01 — Livello 5 implementato: torre 32×100, solai one-way, 3 lavoratori (5 + 1 + 3 tavole), 2 tappetini del leccapiedi, 3 opportunità, checkpoint `cp0…cp3` dal basso (piano 1, 2, 3, Board), 4 slot pivotabili. Classifica finale ridotta ai primi 2 per progetto (5 progetti devono stare nella schermata).
- 2026-11-01 — Review del codice 5A (`docs/CODE_REVIEW_5.md`): vano scale nei solai per tornare a prendere un'opportunità saltata; marea con guinzaglio 10 righe e velocità **42 / 48 / 54 / 62** px/s (margine ≥ 1,5 righe per chi sale a buon ritmo); rimbalzo del leccapiedi controllato tra i frame; delega filtrata per altezza solo nelle torri.
- 2026-11-01 — La riga HUD dell'escalation sta in basso al centro (la marea arriva dal basso), non sotto l'orologio.

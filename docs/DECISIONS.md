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

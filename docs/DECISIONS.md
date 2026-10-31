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

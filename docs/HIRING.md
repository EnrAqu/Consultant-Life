# Assumere junior nel livello 4 — interinali e annuncio su LinkedIn

Richiesta dell'utente (2026-11-03): *"invece di togliere una meccanica ne aggiungerei una che aggiunge junior, ad esempio 'Posta annuncio su LinkedIn' o 'Accetta interinali'"* → **entrambe**.
È il contrario del PM e del recruiter: loro ti tolgono junior, queste due scrivanie te li danno.

## A. Agenzia interinale — `tempAgency` (col 62, non slot)
- **E** alla scrivania (a terra, davanti): arrivano subito **2 interinali**, gratis. Hanno la camicia arancione (`member.temp`).
- Contratto a termine: al **prossimo checkpoint** (106) se ne vanno ("Contratto degli interinali scaduto: grazie per la collaborazione"), e così a fine livello.
- **Non contano mai:**
  - fuori da `aliveCount`, quindi niente burnout e niente "junior persi" se si perdono o se ne vanno;
  - non passano al livello dopo (`Team.dismissTemps` al checkpoint e in `completeLevel`).
- Servono per la piastra del varco 1 (76) e per le deleghe fino al checkpoint.
- Il PM che si prende un interinale costa comunque +6%, ma non lo segna come `prepaid` (non c'è niente da addebitare al checkpoint).
- Una volta per vita: alla morte gli interinali spariscono (`restore`) e l'agenzia si riarma.

## B. Annuncio su LinkedIn — `jobPost` (col 150, slot con causa `linkedin`)
- **E** al chiosco: costa **1 GU** (causa `jobPost`, non pivotabile). Il chiosco mostra "Cercasi junior con 10 anni di esperienza. Candidature: 247…".
- Dopo **6 s** un junior **vero** parte di corsa dal chiosco e si mette in fondo alla fila (stato `joining`, poi `follow`). Resta, anche nel livello dopo.
- Se il livello finisce mentre corre, viene comunque contato (`recallAway`).
- **Con la lezione `linkedin`** (scelta dell'agente, l'utente non l'ha specificata) l'annuncio è **gratis**.
- Senza GU sufficienti: "L'annuncio costa 1 GU: non te lo puoi permettere".
- Una volta per vita.

## File
`src/core/HireBrain.js` (logica, testata), `src/objects/npc/HiringDesk.js` (`TempAgency`, `JobPost`), `Team.addTemps` / `dismissTemps` / `addRunner`.
Il tasto E va prima alle scrivanie (`onAction`), poi alla delega.

## Verifica
- `tests/ItHrExternal.test.js`: `HireBrain`, posizioni, slot `linkedin`.
- `smokeItHr.mjs`:
  - l'agenzia dà 2 interinali (team 5) che al checkpoint 106 se ne vanno (team 3, nessun burnout, nessuna perdita);
  - l'annuncio costa 1 GU e dopo 6 s il team è 4;
  - con il pivot `linkedin` l'annuncio è gratis.

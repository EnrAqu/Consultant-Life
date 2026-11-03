---
name: implement
description: Implementa una milestone di un piano (docs/ITERATION_N.md, docs/BURNOUT.md, la scheda di un livello in docs/LEVELS.md…) con codice e test, e la verifica. Usare per scrivere il codice del gioco, una milestone alla volta.
---

# Playbook: implement

## Input
- `CLAUDE.md` e `docs/DECISIONS.md`, che prevalgono sul piano.
- Il piano indicato nella richiesta: la sezione della milestone e le sezioni che richiama. Se non è indicato, prendi il documento con milestone ancora aperte. Per i livelli vale la scheda in `docs/LEVELS.md`.

## Passi
1. Prendi **la prima milestone non spuntata**. Una alla volta.
2. Leggi il codice esistente che tocchi e imitane stile, nomi e struttura.
3. Logica pura in `src/core/` → prima il test Vitest, poi il codice.
4. Implementa il minimo richiesto dalla milestone. Niente feature extra.
5. Verifica con `npm test`, `npm run build`, `npm run smoke` e i criteri di accettazione della milestone (validatore livelli, parametri di debug). Riporta l'output reale, anche se fallisce.
   - Lo smoke va lanciato a macchina scarica: un controllo a tempo che fallisce si rilancia prima di concludere.
   - Se cambi la geometria di un livello, correggi le coordinate di test e smoke; non cancellare i controlli.
6. Spunta la milestone nel piano (`- [x]`) e annota eventuali scostamenti. Se tocca un livello, aggiorna anche la sua scheda in `docs/LEVELS.md`.
7. Se devi scegliere qualcosa che il piano non dice: scegli l'opzione più semplice, scrivila in `docs/DECISIONS.md` e segnalala nel resoconto.
8. Commit locale per milestone, a nome dell'utente e senza righe `Co-Authored-By`/`Claude-Session`. Mai push senza richiesta esplicita (il permesso vale per quel giro di commit).
9. **Rete (classifica online, `docs/LEADERBOARD.md`):** il codice di rete sta solo in `src/services/leaderboardApi.js`, che non lancia mai eccezioni verso il gioco. Le scene usano `src/scenes/onlineScore.js`.
   - Gli smoke non toccano mai l'API vera: su localhost è spenta. Per provarla, usa `?lbApi=http://lb.test/api` e la request interception di puppeteer (vedi `smokeLeaderboard.mjs`); rispondi anche alle `OPTIONS` con gli header CORS.
   - Attenzione: `standup=off`, `god=1`, `cp=`… sono override di gioco (`DEBUG.anyOverride`), quindi la partita **non** va online. Per uno smoke online usa solo `?debug=1`.
   - Un `<input>` DOM sopra il canvas deve fermare la propagazione dei tasti, altrimenti Phaser (che ascolta su `window`) vede Spazio e Invio.
   - Menu con più tasti (es. `HomeScene`): usa un solo `keyboard.on('keydown')` sull'`event.code` e ignora un evento già visto (`WeakSet`). In headless due tasti nello stesso frame hanno rigiocato un evento.
   - La homepage si salta in debug: uno smoke che deve vederla usa `?debug=1&home=1`.
10. **Aggiorna i playbook** toccati con quello che hai imparato (utente: "aggiorna sempre i playbook").

## Fermati e chiedi se
- il piano contraddice una decisione registrata;
- un criterio di accettazione non si può soddisfare senza cambiare il design;
- serve una dipendenza nuova.

## Resoconto finale
Milestone completate, comandi eseguiti con esito, scostamenti dal piano, URL di debug per provare e cosa va provato a mano dall'utente.

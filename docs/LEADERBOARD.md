# Classifica online

La classifica condivisa tra tutti i giocatori, accanto a quella locale del browser (`src/core/Leaderboard.js`).
La classifica locale non cambia e resta il fallback quando la rete manca.

## Il backend
- Repo separata: `../Consultant-Life-Leaderboard` (Azure Functions .NET 10 + Table Storage). Il contratto è in `api/openapi.yaml`, la sicurezza in `SECURITY.md`.
- Produzione: `https://conslife-func-oeuiuzlliqsio.azurewebsites.net/api`.
  - CORS: solo `https://enraqu.github.io`.
  - Nessuna chiave nel client.
- Livelli ammessi: `level1`…`level5`. La fattoria no.
- Tempo minimo per livello (`MinTimeMs`, limiti fisici spawn→goal a velocità massima, −10%): level1 20 s, level2 11 s, level3 23 s, level4 19 s, level5 15 s. Si cambiano in `infra/main.bicepparam` della repo dell'API e si applicano con `infra/deploy.sh`.

## Il client
Tutto il codice di rete sta in `src/services/leaderboardApi.js`: niente Phaser, timeout 5 s, mai un'eccezione verso il gioco.

| Funzione | Cosa fa |
|---|---|
| `resolveApiUrl` | Sceglie l'URL dell'API (vedi "URL dell'API" sotto) |
| `createLeaderboardApi` | `startRun`, `submit`, `top`. Ogni errore diventa `{ kind: 'offline' \| 'rejected', message }` |
| `startOnlineRun(api, levelId)` | Un tentativo: chiede il token subito; `submit` lo invia **una volta sola** e non ritenta mai |
| `filterNameInput` / `normalizeName` / `isValidName` | La stessa regola del server: 1–16 caratteri tra `[A-Za-z0-9 _-]`, spazi ripiegati, vuoto = "Anonimo" |

**URL dell'API:**
- Vince `VITE_LEADERBOARD_API_URL` (variabile Vite al build), se impostata.
- Se non è impostata, si usa la produzione, tranne su un host locale (`localhost`, `127.0.0.1`). Lì il gioco resta solo locale: il dev server, `vite preview` e gli smoke non chiamano mai l'API vera.
- Solo su un host locale il parametro `?lbApi=<url>` punta il gioco a un'altra API: `func start` (`http://localhost:7071/api`) o un mock.

### Flusso
1. **`GameScene.create`:** se la partita non è di debug (`DEBUG.anyOverride`), `this.onlineRun = startOnlineRun(...)` chiede il token senza bloccare. Ogni nuova `GameScene` (livello successivo, retry dopo budget sforato) usa un token nuovo. Le morti con respawn restano nella stessa partita.
2. **`completeLevel`:**
   - registra in locale come prima;
   - passa `online: { attempt, result: { timeMs, deaths, guLeft } }` alla scena successiva (`LessonsLearnedScene`, o `EndingScene` dopo il Progetto 5).
3. **`src/scenes/onlineScore.js`, `mountOnlineScore`:**
   - Nome mai chiesto (`ragebait.playerName.v1` assente): un `<input>` DOM sopra il canvas. Filtra i caratteri mentre scrivi. I suoi tasti non arrivano a Phaser, quindi Spazio e Invio non saltano la slide. Invio conferma e invia.
   - Se si lascia la schermata con il campo aperto, il nome si conferma così com'è (vuoto = Anonimo).
   - Nome noto: invio subito.
   - L'esito si vede come "Classifica online: #N per tempo, #M nella classifica della vergogna", oppure con il `message` del server così com'è, oppure con "Classifica online non raggiungibile".
   - "come X — cambia nome" riapre il campo; il nome nuovo vale dalla partita dopo.
4. **Fine livello:** la slide si divide: punti a sinistra, classifica a destra. `drawLevelTop` mostra la top 5 del livello, per tempo e per vergogna. Si scarica dopo l'invio, con `cache: 'no-cache'`, così il tuo punteggio c'è già. Offline mostra la top locale con la nota "offline".
5. **Finale (`EndingScene`):**
   - invia il Progetto 5, con lo stato sotto la riga delle statistiche;
   - le colonne per progetto (top 2) passano all'online quando tutte le richieste rispondono, altrimenti restano locali;
   - il finale burnout non invia nulla, perché il progetto non è finito.

### Regole
- Le partite di debug (qualsiasi override di gioco: `level`, `cp`, `god`, `standup=off`, `gu`…) non chiamano **mai** l'API. `?debug=1` da solo non cambia il gioco, quindi va online (serve agli smoke con `?lbApi=`).
- Nessun ritentativo: il token è monouso (409 al secondo invio) e il controllo anti-cheat sul tempo reale non va aggirato.
- I nomi sono sempre testo Phaser, mai HTML.

## Homepage
`src/scenes/HomeScene.js` (utente, 2026-11-03): **solo all'apertura della pagina.**
- **Nuova partita:** Spazio la avvia sempre; Invio sceglie la voce selezionata; vale anche un tocco.
- **Classifica:** la apri anche con L. Mostra la top 10 online di ogni progetto: più veloci e classifica della vergogna.
  - ←/→ o ◀ ▶ cambiano progetto; Esc torna al menu.
  - Le liste online restano in cache finché la pagina è aperta.
  - Offline, o su un host locale senza API, mostra i tempi di questo browser, con il nome "tu".
- Restart, retry e nuova campagna dal finale **non** ripassano dalla home.
- La home lancia `UIScene` prima di `GameScene`, come faceva `BootScene`.
- In debug (`?debug=1` o un override di gioco) la home si salta e gli smoke partono nel gioco. `?home=1` la mostra comunque.
- I tasti arrivano da un solo listener `keydown`, che ignora un evento DOM già gestito. In Chrome headless due tasti nello stesso frame potevano rigiocare l'evento e far partire la partita da "Classifica".

## Verifica
- `tests/LeaderboardApi.test.js`: URL, nomi, GU, mappatura degli errori, timeout, top, un solo invio per tentativo.
- `scripts/smoke/smokeLeaderboard.mjs`, con un mock via request interception su `http://lb.test/api`:
  - token a inizio livello;
  - nome chiesto una volta, filtrato e ricordato;
  - Spazio nel campo non salta la slide;
  - body inviato;
  - posizioni e top;
  - rifiuto del server;
  - offline;
  - partita di debug e host locale senza rete;
  - homepage: niente partita né token prima di "Nuova partita"; classifica per progetto; Esc; Spazio avvia il Progetto 1 con l'HUD; senza API la classifica di questo browser.
- Playtest utente su GitHub Pages: il primo invio vero, il campo nome su mobile (tastiera virtuale) e la classifica nel finale.

## Dopo / backlog
- Alzare `MinTimeMs` quando ci saranno tempi reali (repo dell'API).
- Classifica online consultabile anche senza finire un livello?

# Prompt — API della classifica condivisa (Azure Functions + Table Storage)

Prompt da dare a una sessione di Claude che costruisce le API su Azure. L'integrazione nel gioco (client con fallback sul `localStorage`) è un lavoro separato, da fare nella repo del gioco dopo che l'API esiste.
Prima di usarlo: registra in `docs/DECISIONS.md` che la decisione "costo zero, nessun backend" cambia (backend minimo per la classifica). Poi scegli le due opzioni segnate **[DA DECIDERE]**.

---

```text
Costruisci l'API della classifica condivisa per "Consultant Life", un platformer 2D da browser (sito statico,
Phaser 3 + Vite) che oggi salva la classifica solo nel localStorage. Voglio un backend minimo, a costo quasi zero,
su Azure, con l'infrastruttura come codice e il deploy da GitHub. Lavora in una cartella `api/` (o in una repo
separata se te lo dico). Testi rivolti all'utente in italiano, codice e identificatori in inglese.

## Stack
- Azure Functions, modello isolated worker, C# sull'ultima LTS .NET supportata dalle Functions isolated
  (.NET 8 o .NET 10: verifica quale è supportata oggi e usala). Piano a consumo (Flex Consumption se disponibile
  nella region, altrimenti Consumption su Linux).
- Azure Table Storage (Azure.Data.Tables). Niente Blob: la classifica non deve essere un file unico sovrascritto.
- Accesso allo storage con Managed Identity (DefaultAzureCredential + ruolo "Storage Table Data Contributor"),
  nessuna connection string nel codice né nella repo.
- Segreto per firmare i token di partita in Key Vault, letto dalla Function App con un Key Vault reference.
- Application Insights per log e metriche.
- Infrastruttura in Bicep (Function App, Storage, Key Vault, App Insights, ruoli RBAC).
- Deploy con GitHub Actions e login OIDC verso Azure (federated credential, nessun secret di Azure in GitHub).
- Sviluppo locale con Azurite; README con i comandi per avviare tutto in locale.

## Dati che il gioco ha già
A fine livello il gioco produce: { levelId, timeMs, deaths, guLeft }.
- levelId ∈ "level1" … "level5" (configurabile: lista in app settings).
- timeMs: intero, millisecondi di gioco del livello.
- deaths: intero ≥ 0.
- guLeft: numero con un decimale (passi di 0,5), 0 ≤ guLeft ≤ 20.
Le partite in modalità debug non vengono mai inviate (lo garantisce il client, ma il server non deve fidarsi).

## API (JSON, CORS solo per le origin configurate in app settings)
1. POST /api/runs/start  { levelId }
   → 200 { runToken, startedAt }
   runToken = runId (GUID) + levelId + startedAt (UTC), firmato HMAC-SHA256 con il segreto in Key Vault.
   Stateless: il server non salva niente qui.
2. POST /api/scores  { runToken, levelId, timeMs, deaths, guLeft, name }
   Validazioni, in quest'ordine (ogni errore → 400 o 409 con un messaggio corto, mai dettagli interni):
   - firma del token valida, levelId uguale a quello del token, token non più vecchio di 2 ore;
   - token monouso: inserisci il runId in una tabella "UsedRuns" con insert-if-not-exists → 409 se esiste già;
   - tempo plausibile: il tempo reale passato dal startedAt (ora del server) deve essere ≥ timeMs − 2 s di tolleranza;
   - timeMs ≥ tempo minimo del livello (app settings per livello, es. MinTimeMs__level1) e ≤ 2 ore;
   - deaths 0..9999, guLeft 0..20 con passo 0,5;
   - name: [DA DECIDERE, vedi sotto]; se è un nome libero: 1–16 caratteri [A-Za-z0-9 _-], spazi normalizzati,
     filtro parole volgari (lista semplice in un file), altrimenti "Anonimo".
   Se tutto è valido salva due entità e rispondi 201 { rankTime, rankShame } (posizione nelle due classifiche).
3. GET /api/leaderboard/{levelId}?type=time|shame&top=10   (top massimo 50)
   → 200 [ { name, timeMs, deaths, guLeft, at } ] ordinata. Cache-Control: public, max-age=30.
4. DELETE /api/scores/{levelId}/{scoreId}  — solo moderazione, protetta (function key di livello admin o ruolo
   Entra ID), per cancellare record falsi da entrambe le tabelle.

## Modello in Table Storage
- Tabella "ScoresByTime": PartitionKey = levelId, RowKey = timeMs a 10 cifre + "_" + deaths a 5 cifre + "_" + scoreId
  → la query sulla partizione restituisce già i migliori tempi in ordine.
- Tabella "ScoresByShame": PartitionKey = levelId, RowKey = (99999 − deaths) a 5 cifre + "_" + timeMs a 10 cifre +
  "_" + scoreId → in testa chi è morto di più.
- Proprietà: name, timeMs, deaths, guLeft, at (UTC), ipHash (SHA-256 dell'IP con un salt in Key Vault, mai l'IP in chiaro).
- Tabella "UsedRuns": PartitionKey = data (yyyyMMdd), RowKey = runId; una Function a timer cancella le righe più
  vecchie di 2 giorni.
- Tabella "RateLimit": massimo 10 POST /api/scores per IP (hash) ogni 10 minuti, contatore con finestra fissa;
  oltre → 429.

## Sicurezza: obiettivi realistici
Il gioco gira nel browser: non esiste un segreto nel client e un punteggio falso fatto a mano non si può impedire
del tutto. L'obiettivo è rendere il cheat scomodo e poter moderare:
- niente chiavi nel frontend né nella repo; l'URL dell'API è pubblico e va bene così;
- token di partita firmato + monouso + controllo del tempo reale (blocca i tempi impossibili);
- validazione dura sul server, rate limit, CORS limitato (frena solo i browser);
- endpoint di moderazione protetto;
- dati personali minimi (nessun IP in chiaro, nessuna email).
Scrivi in un file SECURITY.md cosa protegge ogni misura e cosa no.

## Da decidere [DA DECIDERE] — usa i default se non te li dico
1. Identità: (default) nome libero filtrato, oppure login GitHub tramite Azure Static Web Apps (nome affidabile,
   ban possibile; in quel caso le Functions diventano le API gestite della Static Web App).
2. Origin CORS e dominio del gioco: (default) un valore in app settings, da riempire io.

## Qualità
- Logica di validazione e di costruzione delle chiavi in classi pure, con test xUnit (casi limite: token scaduto,
  riusato, firma sbagliata, tempo impossibile, nome volgare, guLeft fuori passo, ordinamento delle RowKey).
- Test di integrazione con Azurite per i tre endpoint pubblici.
- Nessun pacchetto senza versione esatta.
- Alla fine: README con architettura, comandi, costi stimati (a consumo, ordine di grandezza mensile per
  qualche migliaio di partite) e il contratto dell'API in un file openapi.yaml.

Non fare: database relazionali, Cosmos DB, contenitori, un frontend. Chiedimi prima di qualunque risorsa a pagamento
fissa (es. API Management a pagamento, Front Door).
```

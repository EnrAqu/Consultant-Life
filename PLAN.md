# RageBait Game — Piano (bozza v0.1)

> Platformer 2D browser, genere "rage game". Ispirato al platformer classico, ma con identità originale.
> Obiettivo: costo zero, link giocabile il prima possibile, iterazioni rapide.

---

## 1. Visione

Un platformer apparentemente innocuo che **ti mente**. Il livello sembra classico, ma ogni elemento familiare può tradirti. Un narratore sarcastico commenta i tuoi fallimenti.

**Principio guida:** *"mean but fair"*. Ogni trappola deve essere crudele la prima volta, ma memorizzabile e superabile. Il giocatore deve sempre pensare "colpa mia, ancora una volta".

**Pilastri:**
1. **Controlli precisi**: la frustrazione viene dal livello, non da input che non rispondono.
2. **Restart istantaneo**: < 1 secondo tra morte e nuovo tentativo.
3. **Tradimento delle aspettative**: trappole che giocano con le convenzioni del genere.
4. **Personalità**: narratore, contatore morti, statistiche umilianti.
5. **Clip-able**: momenti pensati per far reagire chi gioca (e chi guarda).

---

## 1b. Meccanica chiave: "Lessons Learned" (proposta)

**Come sei morto nel livello N diventa il modo per sopravvivere nel livello N+1.**

- Il gioco registra le cause di morte del livello (tipo di trappola, posizione).
- A fine livello compare una slide **"Lessons Learned"** con la causa principale ("Hai perso 23 volte contro le call last-minute").
- Il livello successivo contiene una **variante "pivotata"** di quella trappola: ciò che uccideva ora è piattaforma, trampolino, scudo o chiave.
- Il narratore lo annuncia in gergo aziendale: *"Non è un problema, è un'opportunità."*

**Esempi:**

| Morto per... | Livello dopo diventa... |
|---|---|
| Inviti a meeting che ti trascinano indietro | Inviti che ti trasportano avanti come nastri |
| Valanga di email "Rispondi a tutti" | Le email cadenti sono piattaforme su cui salire |
| Schiacciato dalle slide che crollano | Le slide sono un ponte / uno scivolo |
| Piattaforme "scope creep" che si allungano e ti spingono nel vuoto | Lo scope creep allunga i ponti sopra i burroni |
| Caduto nel burrone delle deadline | Le deadline sono molle che ti lanciano in alto |

**Note di design:**
- Ogni trappola va progettata **con la sua versione invertita**: livelli modulari con "slot" che accolgono la versione normale o quella pivotata.
- Si inverte la causa **dominante** (al massimo 1–2 per livello), così resta leggibile.
- Rischio da gestire: chi non muore mai non vede il pivot → si usa una causa di default.
- Bonus troll: a volte il pivot **non** avviene ("Il cliente ha cambiato idea").

---

## 1c. Tema: il mondo della consulenza (proposta)

**Nome di lavoro: _Up or Out_** (la regola delle società di consulenza: o vieni promosso o te ne vai).

- **Protagonista:** un/una junior analyst al primo giorno.
- **Struttura:** ogni mondo è uno scalino di carriera: Analyst → Consultant → Manager → Senior Manager → Partner. La scalata è letterale: il gioco si sviluppa in verticale.
- **Narratore:** il Partner, con tono passivo-aggressivo e cortese: *"Come da mia precedente email..."*, *"Facciamo un allineamento veloce?"*, *"Ottimo lavoro. Rifacciamolo."*
- **Contatore morti:** "Ore non fatturabili".
- **Collezionabili:** caffè (vita extra?), ore fatturabili (punteggio).
- **Trappole/nemici:** "Hai 5 minuti?", Reply-all, file `deck_FINAL_v7_DEF_ok.pptx` che si corrompe, cliente che cambia i requisiti (piattaforme che si spostano), timesheet del venerdì, scope creep, steering committee (boss).
- **Finale troll:** diventi Partner... e il cliente chiede di rifare tutto da capo.
- **Nome:** da decidere (_Up or Out_ è solo un placeholder).

### Risorsa "Giornate Uomo" (GU) ✅
Ogni livello/progetto ha un budget in GU (es. `GU residue: 12,5 / 20`) che fa da vita e timer:
- ogni morte costa GU (es. 0,5);
- il KT finto ne brucia tante (es. 3); l'AI ne restituisce un po' (es. 1);
- a zero GU il progetto **sfora il budget**: scatta un'escalation (vedi sotto) e si spinge verso un finale diverso.

### Finali multipli
La carriera si ramifica in base a come giochi (scelte di "porte" a fine mondo, ore rimaste, quanto hai collezionato o ignorato):

| Finale | Come ci arrivi (idea) | Tono |
|---|---|---|
| **Partner** | Percorso "corretto", tutto fatturato | Troll: il cliente vuole rifare tutto da capo |
| **Società prodotto** | Accetti l'offerta di un recruiter (porta nascosta a metà carriera) | Ironico: "Finalmente un prodotto tuo!"... roadmap, OKR, sprint |
| **Burnout / Out** | Ore a zero troppe volte | Amaro ma comico, si può ricominciare |
| **I campi** 🌾 | Finale segreto, il più difficile: rifiuti la promozione, ignori le ore fatturabili, trovi il sentiero nascosto | Il vero lieto fine. Niente narratore, solo silenzio e uccellini |

### Nemici e NPC
- **L'arrivista**: collega che ti corre accanto, ti salta in testa per arrivare prima, ruba i tuoi collezionabili ("ottimo lavoro, lo presento io al cliente"). Si può usare come piattaforma.
- **Lo junior**: compare negli imprevisti (vedi sotto).
- **Il cliente**: sposta le piattaforme ("piccola modifica ai requisiti").
- **Il capo micromanager**: ti insegue. Se ti raggiunge parte un fumetto "Spiegami cosa stai facendo": sei bloccato mentre le GU scendono. Poi dice *"Io lo sapevo fare meglio"*, ti scavalca e fa il salto al posto tuo. A volte ci riesce (e ti umilia), a volte muore (e la colpa è tua: −GU). Si può seminare o nascondersi.
  - *Variante pivotata (Lessons Learned)*: se ti ha bloccato spesso, nel livello dopo "ti fa vedere come si fa" e ti rivela involontariamente dove sono le trappole.

### Imprevisti
- **Daily standup**: a orari fissi e prevedibili (un orologio nell'HUD segna le 9:30) tutto si ferma per lo standup. Se sei a terra, aspetti qualche secondo. Se sei a mezz'aria, resti congelato... e poi cadi. Giusto (è prevedibile) ma cattivo, e perfetto per le clip. Ogni tanto lo standup "sfora" e dura il doppio.
- **Escalation** (caso estremo): scatta se sfori le GU o, raramente, a caso. Allarme rosso, e dal basso sale una marea di email in CC con la catena che cresce (Manager → Director → VP → CEO). Più sale, più accelera. Devi raggiungere la cima del livello prima che ti prenda; se ti prende, torni all'inizio del mondo.
- **Roll-off improvviso**: suona il telefono (segnale riconoscibile) e "un nuovo progetto ti cerca". Vieni trasferito in un altro livello e il tuo progresso passa allo junior senza KT. Lo vedi cadere nelle trappole che avevi imparato. Raro e annunciato, per restare "giusto".

### Bonus (veri e finti)
- **KT (Knowledge Transfer)** — *finto*: sembra un power-up. Lo apri, parte una call infinita che non spiega nulla: rallentamento e perdita di molte ore. Alla seconda volta lo riconosci da un dettaglio. Raramente esiste un KT vero, quasi identico.
- **AI** — *vero, con fregatura*: ti rimette subito in gioco generando "una draft". Appare una scorciatoia di piattaforme, ma alcune sono **allucinate** (tremolano appena) e vanno ricontrollate prima di saltarci sopra.
- **Caffè**: piccolo recupero di ore / breve boost di velocità.

---

## 2. Stack tecnico

| Area | Scelta | Costo |
|---|---|---|
| Motore | Phaser 3 (JS) | 0 € |
| Build | Vite | 0 € |
| Livelli | Tiled (editor mappe → JSON) | 0 € |
| Grafica | Asset Kenney.nl (CC0) → poi custom | 0 € |
| Audio | SFX da jsfxr / Kenney, musica CC0 | 0 € |
| Hosting | itch.io (scoperta) + GitHub Pages (sito) | 0 € |
| Versionamento | Git + GitHub | 0 € |
| Dominio (opzionale) | es. `.com` / `.it` | ~10 €/anno |

**Niente backend** nella prima fase: tutto statico. Salvataggi e statistiche in `localStorage`.
Più avanti, se servono classifiche globali: servizio free tier (es. Supabase / Cloudflare Workers + KV).

---

## 3. Struttura progetto (proposta)

```
RageBait game/
├── index.html
├── package.json
├── vite.config.js
├── public/
│   └── assets/        # sprite, tileset, audio, mappe Tiled (.json)
└── src/
    ├── main.js        # config Phaser
    ├── scenes/
    │   ├── Boot.js    # preload asset
    │   ├── Menu.js
    │   ├── Game.js    # livello + logica
    │   └── UI.js      # HUD: contatore morti, messaggi narratore
    ├── objects/
    │   ├── Player.js
    │   └── traps/     # una classe per tipo di trappola
    └── data/
        └── taunts.js  # frasi del narratore
```

---

## 4. Roadmap

### Fase 0 — Setup (½ giornata)
- [ ] Init repo Git + progetto Vite + Phaser 3
- [ ] Scena vuota che gira in locale
- [ ] Deploy automatico su GitHub Pages (GitHub Actions)
- **Risultato:** un URL pubblico (anche se vuoto)

### Fase 1 — Prototipo "il salto perfetto" (1–2 giorni)
- [ ] Player: corsa, salto con altezza variabile, coyote time, jump buffer
- [ ] Livello di test da Tiled con collisioni
- [ ] Morte (buche, spine) + **restart istantaneo**
- [ ] Contatore morti persistente (localStorage)
- **Risultato:** muoversi è *piacevole*. Se non lo è, non si va avanti.

### Fase 2 — Le trappole bugiarde (2–3 giorni)
Primo set di trappole (un livello breve, ~60–90 s se giocato perfettamente):
- [ ] **Blocco "?" traditore**: invece del bonus, ti lancia giù/esplode
- [ ] **Piattaforma che svanisce** appena ci atterri
- [ ] **Blocco invisibile** che ti blocca il salto a metà
- [ ] **Falso traguardo**: la bandiera scappa / il pavimento crolla
- [ ] **Moneta esca**: posizionata sopra una trappola
- [ ] **Falso checkpoint**: si attiva... e poi ride di te
- **Risultato:** livello 1 completo e giocabile

### Fase 3 — Personalità (1–2 giorni)
- [ ] Narratore testuale **che ti studia**: frasi basate sulle statistiche reali (dove muori, quante volte, quanto esiti)
- [ ] Ogni trappola ha un **indizio sottile** (visivo o sonoro) per restare "giusta"
- [ ] Schermata di vittoria con statistiche umilianti (morti, tempo, "trappola preferita")
- [ ] SFX + musica di base
- [ ] Menu iniziale

### Fase 4 — Pubblicazione (½ giornata)
- [ ] Build di produzione
- [ ] Pagina itch.io (screenshot, GIF, tag: `rage`, `platformer`, `difficult`, `funny`, `troll`)
- [ ] Raccolta feedback da 3–5 amici: dove si arrabbiano davvero? Dove mollano?

### Fase 5 — Iterazione (continua)
Idee da valutare dopo il primo feedback:
- Trappole **adattive**: il gioco cambia la trappola dove muori più spesso
- **Controlli che si degradano** dopo N morti (inerzia, input ritardato, comandi invertiti per qualche secondo)
- Più livelli / un unico livello verticale lunghissimo
- **Modalità streamer**: la chat Twitch sabota il giocatore, overlay OBS, contatore grande
- **Clip della vergogna**: esporta gli ultimi ~10 s come GIF o video verticale
- **Fantasmi delle morti** degli altri giocatori (backend free tier)
- Classifiche globali (backend free tier)
- Supporto mobile (controlli touch)

---

## 5. Decisioni aperte

- [ ] **Nome del gioco** e tema visivo (personaggio, ambientazione)
- [ ] Narratore: solo testo o anche voce? Tono: sarcastico, passivo-aggressivo, finto-gentile?
- [ ] Quanto punire la morte: restart del livello intero o checkpoint (veri) rari?
- [ ] Twist principale da spingere: livello bugiardo, controlli che peggiorano, o entrambi?
- [ ] Desktop-only all'inizio o anche mobile?

---

## 6. Ricerca

### Cosa rende un rage game avvincente
- **Crudele ma coerente**: se la sfida sembra arbitraria, la frustrazione diventa abbandono.
- **Progresso percepibile**: la padronanza nasce da ripetizione e memoria; un esperto finisce in minuti ciò che al primo giro richiede ore.
- **Loop "ancora una volta"**: restart ~1 s (stile Celeste) **oppure** perdita di progresso in un mondo continuo (stile caduta), che genera tensione e dramma.
- **Contatore morti come medaglia**, non come insulto (ma deve poter essere discreto).
- **Il narratore funziona meglio affettuoso-sarcastico** che cattivo: il gioco frustra già abbastanza.

### Cheap vs. "giusto"
- ✅ Fisica strana ma **deterministica**; trappola mostrata → ripetuta in variante → tradita.
- ❌ Morti senza alcun indizio, input lag, hitbox poco chiare, casualità.
- **Regola:** la trollata deve essere *leggibile a posteriori* ("ah, dovevo accorgermene").

### Viralità
- Capibile in 3 secondi anche da chi guarda.
- Il fallimento al 99% è la clip perfetta.
- Interazione con la chat e co-op caotico spingono gli stream.
- L'effetto streamer è un picco temporaneo: serve anche scoperta organica.

### Lezioni pratiche
- Divertimento entro 10 s, **nessun menu prima di giocare**; prima trollata entro il primo minuto.
- Curva: introduci → ripeti → tradisci → respiro.
- Campagna di 20–60 min per un giocatore esperto.
- Retention: morti in localStorage, statistiche di fine run, timer speedrun.
- itch.io: tag pertinenti (`rage-game`, `platformer`, `difficult`, `troll`, `funny`, `2d`, `pixel-art`, `short`, `speedrun`), screenshot, GIF come copertina, devlog, partecipare alle game jam.

### Top 5 idee (dal report)
1. **Narratore che ti studia**: commenta le tue statistiche reali ("14ª volta che salti proprio lì").
2. **Modalità streamer**: la chat Twitch sabota (vento, comandi invertiti, blocchi) + overlay OBS.
3. **"Clip della vergogna"**: buffer degli ultimi ~10 s, esportabile come GIF o video verticale con il contatore morti.
4. **Fantasmi delle morti collettive**: segni dove sono morti gli altri giocatori (richiede un backend free tier).
5. **Trolling leggibile**: ogni trappola ha un indizio sottile (un pixel diverso, un suono).

Altre idee: meta-troll sull'interfaccia (finto crash, pulsante "Salta livello" che scappa, da dosare), co-op asincrono contro il ghost di un amico.

Fonti principali: Wikipedia (Getting Over It), Game Developer, PC Gamer, Dexerto, linee guida e blog di itch.io.

---

## 7. Rischi

| Rischio | Mitigazione |
|---|---|
| Frustrazione "ingiusta" → abbandono | Playtest presto, trappole memorizzabili, restart istantaneo |
| Controlli imprecisi | Fase 1 dedicata solo al feeling del movimento |
| Troppo simile a giochi esistenti | Personaggio, tema e twist originali; niente asset/meccaniche copiate |
| Scope creep | Un solo livello pubblicato prima di aggiungere feature |

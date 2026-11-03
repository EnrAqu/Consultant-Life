# Consultant Life — Playbook di progetto

Platformer 2D browser, genere "rage game", a tema consulenza. Costo zero: sito statico, nessun backend.
Lingua: documenti e testi di gioco in **italiano**, identificatori di codice in **inglese**.

## Mappa dei file

| File | Ruolo | Chi lo modifica |
|---|---|---|
| `PLAN.md` | Documento di design: visione, tema, meccaniche, roadmap, idee future | Solo quando cambia il design (con l'utente) |
| `docs/DECISIONS.md` | Registro delle decisioni prese, con data e motivo. **Fonte di verità** in caso di conflitto | Ogni volta che si decide qualcosa |
| `docs/IMPLEMENTATION_PLAN.md` | Piano tecnico dell'MVP: struttura, interfacce, formati dati, milestone M0–M13 con criteri di accettazione | Playbook `plan` |
| `docs/ITERATION_2.md` | Piano dell'iterazione 2 (dal playtest #1): prevale su `IMPLEMENTATION_PLAN.md` dove lo modifica | Playbook `plan` |
| `docs/ITERATION_3.md` | Piano dell'iterazione 3 (micromanager, "Hai 5 minuti?", livello 3): sviluppata | Storia |
| `docs/ITERATION_4.md` | Piano dell'iterazione 4 (ritmo, traguardo che tradisce, team & delega, livello 4): sviluppata | Storia |
| `docs/ITERATION_5.md` | Piano dell'iterazione 5 (5A: livello 5 "Partner" verticale, escalation, lavoratori, leccapiedi, Board): 5A sviluppata, 5B da pianificare | Playbook `plan` |
| `docs/LEVELS.md` | **Stato attuale di ogni livello** (scheda: file, slot, checkpoint, test, smoke, URL di debug) e registro delle modifiche per livello | Playbook `level` |
| `docs/MOBILE.md` | Versione mobile: controlli su schermo (`src/input/TouchControls.js`) | Playbook `plan` / `implement` |
| `docs/BURNOUT.md` | Barra burnout: regole, agganci, HUD, finale burnout | Playbook `burnout` |
| `docs/FARM.md` | Livello extra "Il contadino" (dopo il burnout al 100%): `FarmScene`, telefono, stagno, panchina, finale | Playbook `plan` / `implement` |
| `docs/IT_HR_EXTERNAL.md` | Piano di IT (livelli 2–3), HR (3–4) e fornitore esterno (4–5): riavvio forzato, VPN, ticket, team building, corso, contractor | Playbook `plan` / `implement` |
| `docs/HIRING.md` | Assumere junior nel livello 4: agenzia interinale (fino al checkpoint) e annuncio su LinkedIn | Playbook `plan` / `level` |
| `docs/JUNIOR_QUESTION.md` | Il junior che si ferma con una domanda stupida (livelli 3–5): 0,5 GU per tornare a prenderlo | Playbook `plan` / `level` |
| `docs/PM_LINKEDIN.md` | Il PM e LinkedIn: barre del Gantt e post che crollano (livelli 2–3), richieste di risorse (livello 4: PM alla scrivania, recruiter), pivot | Playbook `plan` / `level` |
| `docs/PLAYTEST.md` | Note grezze dei playtest dell'utente | Dopo ogni playtest |
| `docs/PLAN_REVIEW.md` | Ultima revisione del piano (problemi + fix proposti) | Playbook `review` |
| `src/` | Codice del gioco (Phaser 3 + Vite) | Playbook `implement` |
| `.claude/skills/*` | I playbook operativi (vedi sotto) | **Sempre**, alla fine di ogni lavoro: meccaniche nuove, trucchi di verifica, errori da non ripetere |

**Precedenza in caso di conflitto:** `DECISIONS.md` > `LEVELS.md` (per i livelli) e i documenti di feature (`BURNOUT.md`, `MOBILE.md`, `FARM.md`, `PM_LINKEDIN.md`) > `ITERATION_N.md` (il più recente vince) > `IMPLEMENTATION_PLAN.md` > `PLAN.md`.

## Playbook (un solo agente, più playbook)

| Playbook | Quando | Output |
|---|---|---|
| `/level` | **Cambiare un livello** (il lavoro di adesso: un livello alla volta) | Scheda in `LEVELS.md` + codice, test, smoke + `DECISIONS.md` |
| `/plan` | Meccanica o feature nuova, o correzione di un piano | Documento della feature / `ITERATION_N.md` + `DECISIONS.md` |
| `/review` | Dopo ogni modifica sostanziale a un piano, al codice o a un livello. **Gira in un contesto separato** per restare critico | Scrive `PLAN_REVIEW.md` o `CODE_REVIEW_<oggetto>.md` |
| `/implement` | Realizzare una milestone del piano | Codice + test, milestone spuntata |
| `/burnout` | Ritarare o modificare la barra burnout (già costruita) | `BURNOUT` in constants, `docs/BURNOUT.md`, test e smoke |

Flusso per un livello: `level` (proposta nella scheda → codice → verifica) → `review` sul livello se non è banale → commit locale.
Flusso per una feature: `plan` → `review` → `plan` (applica i fix) → `implement` (una milestone alla volta) → `review` sul codice.

## Regole sempre valide

- **Ogni decisione va in `docs/DECISIONS.md`** (una riga: data, decisione, motivo). Non rimettere in discussione decisioni registrate senza chiederlo all'utente.
- **"Crudele ma giusto":** ogni trappola deve avere un indizio leggibile e un comportamento deterministico (niente casualità nelle trappole).
- **Restart < 1 s**, nessun menu prima di giocare.
- La logica pura sta in `src/core/` (senza Phaser) e ha test Vitest.
- `localStorage` sempre dentro try/catch; il gioco deve funzionare anche senza.
- Nessuna dipendenza nuova senza versione esatta (niente `^`/`~`).
- Niente push né modifiche al repo remoto senza richiesta esplicita dell'utente (vale per quel giro di commit). Il lavoro mandato nel cloud va su un branch suo, mai su `main`.
- **Aggiorna sempre i playbook** (`.claude/skills/*`) e questo file alla fine di un lavoro, con quello che è cambiato o che hai imparato — utente.
- Commit a nome dell'utente con l'email noreply di GitHub (già in `git config` locale); **nessuna** riga `Co-Authored-By: Claude` o `Claude-Session` nei messaggi di commit.

## Comandi

```bash
npm install        # dipendenze
npm run dev        # server locale (Vite)
npm run build      # build di produzione in dist/
npm test           # test Vitest della logica in src/core/ (incluso il validatore dei livelli)
npm run smoke      # build + smoke nel browser (Chrome locale): a macchina scarica
```

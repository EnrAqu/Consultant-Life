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
| `docs/ITERATION_3.md` | Piano dell'iterazione 3 (micromanager, "Hai 5 minuti?", livello 3): in sviluppo | Playbook `plan` |
| `docs/ITERATION_4.md` | Piano dell'iterazione 4 (ritmo, traguardo che tradisce, team & delega, livello 4): in sviluppo | Playbook `plan` |
| `docs/PLAYTEST.md` | Note grezze dei playtest dell'utente | Dopo ogni playtest |
| `docs/PLAN_REVIEW.md` | Ultima revisione del piano (problemi + fix proposti) | Playbook `review` |
| `src/` | Codice del gioco (Phaser 3 + Vite) | Playbook `implement` |
| `.claude/skills/*` | I playbook operativi (vedi sotto) | Quando un errore ricorrente va trasformato in regola |

**Precedenza in caso di conflitto:** `DECISIONS.md` > `ITERATION_2.md` > `IMPLEMENTATION_PLAN.md` > `PLAN.md`.

## Playbook (un solo agente, più playbook)

| Playbook | Quando | Output |
|---|---|---|
| `/plan` | Nuova feature o correzione del piano | Aggiorna `IMPLEMENTATION_PLAN.md` + `DECISIONS.md` |
| `/review` | Dopo ogni modifica sostanziale al piano o al codice. **Gira in un contesto separato** per restare critico | Scrive `PLAN_REVIEW.md` o una code review |
| `/implement` | Realizzare una milestone del piano | Codice + test, milestone spuntata |

Flusso tipico: `plan` → `review` → `plan` (applica i fix) → `implement` (una milestone alla volta) → `review` sul codice.

## Regole sempre valide

- **Ogni decisione va in `docs/DECISIONS.md`** (una riga: data, decisione, motivo). Non rimettere in discussione decisioni registrate senza chiederlo all'utente.
- **"Crudele ma giusto":** ogni trappola deve avere un indizio leggibile e un comportamento deterministico (niente casualità nelle trappole).
- **Restart < 1 s**, nessun menu prima di giocare.
- La logica pura sta in `src/core/` (senza Phaser) e ha test Vitest.
- `localStorage` sempre dentro try/catch; il gioco deve funzionare anche senza.
- Nessuna dipendenza nuova senza versione esatta (niente `^`/`~`).
- Niente push né modifiche al repo remoto senza richiesta esplicita dell'utente.
- Commit a nome dell'utente con l'email noreply di GitHub (già in `git config` locale); **nessuna** riga `Co-Authored-By: Claude` o `Claude-Session` nei messaggi di commit.

## Comandi

```bash
npm install        # dipendenze
npm run dev        # server locale (Vite)
npm run build      # build di produzione in dist/
npm test           # test Vitest della logica in src/core/
```

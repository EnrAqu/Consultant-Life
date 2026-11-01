---
name: burnout
description: Modifica la barra burnout di Consultant Life (risorsa personale accanto alle Giornate Uomo, finale burnout/contadino). Usare quando l'utente chiede di ritarare il burnout, aggiungere cause o sollievi, o cambiare HUD, personaggio stanco e finale.
---

# Playbook: burnout

La barra burnout è **costruita** (2026-11-01, milestone B-M1…B-M4 di `docs/BURNOUT.md`) e pubblicata.
Questo playbook serve a **modificarla** senza rompere il resto.

## Il concetto (parole dell'utente)
- *"L'idea è sì avere giornate uomo, ma il burnout deve essere basso."*
- Le **GU** sono il budget del progetto.
- Il **burnout** è quanto il lavoro costa **a te**.

## Regole in vigore
I valori stanno in `BURNOUT` in `src/config/constants.js`. La storia è in `DECISIONS.md`, sezione "Burnout".

| Regola | Valore |
|---|---|
| Sale | morte **+1%**; eventi sociali **+3%** (escalation, junior perso al netto, micromanager, "Hai 5 minuti?", standup che sfora, falso KT, cambio cliente) — utente, "più attivo" |
| Scende | caffè −2%; KT vero −3% (una volta per livello); livello senza morti −5% sulla partenza del livello dopo (mai su un retry) |
| Tra i livelli | si trascina; partenza = `max(trascinato, minimo)`, minimi `levelMin = [0, 15, 30, 45, 60]` |
| Nuova campagna | si riparte da 0 (livello 1 non da retry) |
| 100% | finale **burnout = il contadino / "i campi"** (segnaposto in `EndingScene`; il livello extra "Il contadino" è da fare). Vince sulle GU |
| Si legge | barra 200×6 nell'HUD (`Burnout N%`, per difetto), occhiaie al 50%, curvo e tremante all'80%, narratore al tier 2 |

## Procedura per una modifica
1. **Ritaratura di valori** (gain, relief, minimi): la decide l'utente.
   - Cambia `BURNOUT` e aggiorna §1 di `docs/BURNOUT.md`, la scheda in `docs/LEVELS.md` se tocca i minimi, e `DECISIONS.md`.
   - Aggiorna i valori attesi in `tests/Burnout.test.js` e `scripts/smoke/smokeBurnout.mjs`.
2. **Nuova causa o nuovo sollievo:**
   - aggiungi la voce in `BURNOUT.gain`/`relief`;
   - aggancia il punto di gioco con `GameScene.addBurnout(cause)` / `relieveBurnout(reason)`, **prima** di `spendGu`, perché il burnout vince;
   - rispetta le guardie su `this.ended` e sulla god mode;
   - aggiungi un controllo in `smokeBurnout.mjs`.
3. **Cambi visivi o del finale:** HUD in `UIScene`, personaggio in `PlayerView` e `TextureFactory` (`_t1`/`_t2`), finale in `EndingScene` (`ENDINGS.burnout`).
4. Verifica con `npm test`, `npm run build` e `npm run smoke`. Poi review del codice in contesto separato se la modifica non è banale, e commit locale.

## Non fare
- Non cambiare il costo in GU di morti e prese: il burnout si **aggiunge**, non sostituisce.
- Non introdurre casualità ("crudele ma giusto").
- Non tarare i valori a sentimento: li decide l'utente dopo il playtest.

---
name: burnout
description: Progetta e costruisce la feature "barra burnout" di Consultant Life (risorsa personale accanto alle Giornate Uomo, finale burnout). Usare quando l'utente chiede di sviluppare o modificare il burnout.
---

# Playbook: burnout

La barra burnout è una feature a sé, decisa con l'utente il 2026-11-01 e **non ancora costruita**.
Questo playbook raccoglie il design concordato e la procedura per costruirla senza rompere il resto.

## Il concetto (parole dell'utente)
- *"L'idea è sì avere giornate uomo, ma il burnout deve essere basso."*
- Le **GU** sono il budget del progetto (cliente, tempo, costi).
- Il **burnout** è quanto il lavoro costa **a te**.
- Separare "il progetto va bene" da "tu stai bene" è il cuore della feature.

## Regole decise
| Regola | Valore |
|---|---|
| Cosa lo fa salire | morte, presa dell'escalation, junior del team perso (+ in seguito: micromanager, "Hai 5 minuti?", ambiziosi, standup che sfora) |
| Quanto | **tutto +1%** per ora: "poi lo sistemiamo" |
| Tra un livello e l'altro | **non si azzera**: si trascina |
| Minimo di partenza per livello | sale a ogni livello: livello 1 = **0%**, livello 2 = **15%**, poi a salire. Per i livelli 3–5 proporre 30 / 45 / 60 e farli confermare. Il valore di partenza è `max(burnout trascinato, minimo del livello)` |
| 100% | finale **burnout**, in qualsiasi livello (sostituisce "GU a zero nel livello 5" di `ITERATION_5`). Le GU a zero restano "Budget sforato" |

## Idee proposte e piaciute all'utente (da confermare in fase di piano)
- **Scende poco**, e solo con cose "umane": caffè −2%, KT vero −3%, livello finito senza morti −5%.
- **Si legge sul personaggio** più che con un numero: occhiaie, postura curva, tazza che trema. Nell'HUD c'è una barretta sottile, così due numeri non affollano la schermata.
- **I campi** (finale segreto, iterazione 5B) potrebbero richiedere anche un burnout basso (es. < 30%). Domanda aperta per l'utente.
- Taratura: in un rage game si muore tanto, quindi gli eventi "sociali" peseranno più delle morti. Il messaggio è *"non è morire che ti brucia, è come lavori"*.

## Procedura
1. **Plan** (playbook `plan`): scrivi `docs/BURNOUT.md`.
   - Interfacce: `core/Burnout.js`, puro e testato, con `add(cause, amount)`, `relieve(reason, amount)`, `startLevel(levelIndex)`, `value`, `isOver`.
   - Eventi: `EV.BURNOUT_CHANGED`.
   - Persistenza nella `session` (vive quanto la campagna, non in `localStorage`, a meno che l'utente non chieda altro).
   - Punti di aggancio nel codice:
     - `GameScene.die`;
     - `Escalation` (presa);
     - `Team.lose`;
     - `GameScene.completeLevel` (trascinamento e minimo del livello successivo);
     - la nuova campagna (`levelId === LEVEL_ORDER[0]`: azzera).
   - Tabella dei valori in `config/constants.js` (`BURNOUT`), tutti a 1 per ora.
   - Finale: `EndingScene` con `ending: 'burnout'`. La scena esiste già dalla 5A: aggiungere solo la variante.
   - Registra le decisioni in `docs/DECISIONS.md`.
2. **Review** (playbook `review`, contesto separato) del piano. Controlla in particolare:
   - che il 100% non arrivi troppo presto con il minimo dei livelli alti;
   - l'interazione con le GU;
   - la leggibilità dell'HUD.
3. **Implement**: prima `core/Burnout.js` con i test Vitest, poi gli agganci, poi HUD e outfit "stanchi", infine il finale. Verifica con `npm test`, `npm run build`, `npm run smoke`.
4. **Review del codice** in contesto separato, poi playtest dell'utente.

## Non fare
- Non cambiare il costo in GU di morti e prese: il burnout si **aggiunge**, non sostituisce.
- Non introdurre casualità (regola "crudele ma giusto").
- Non tarare i valori a sentimento oltre l'1%: la taratura la decide l'utente dopo il playtest.

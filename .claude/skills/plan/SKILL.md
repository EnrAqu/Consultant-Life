---
name: plan
description: Scrive o aggiorna il piano tecnico di una feature (meccanica nuova, nuova iterazione) o applica una review al piano. Usare prima di scrivere codice per qualcosa che non è già specificato. Per modifiche a un solo livello usare il playbook level.
---

# Playbook: plan

Obiettivo: un piano che un esecutore possa seguire **senza indovinare**.

## Dove va il piano
- **Modifica di un solo livello** con meccaniche già esistenti: non serve un piano a parte. La proposta va nel Registro della scheda in `docs/LEVELS.md` (playbook `level`).
- **Meccanica nuova nata da un livello** (nuova entità, nuovo brain, nuova causa): una sezione nella scheda del livello in `docs/LEVELS.md` se resta confinata lì. Altrimenti un documento a parte.
- **Feature trasversale:** un documento proprio, `docs/<FEATURE>.md` (come `BURNOUT.md` e `MOBILE.md`) o `docs/ITERATION_N.md`, aggiunto alla mappa di `CLAUDE.md`.
- `docs/IMPLEMENTATION_PLAN.md` è il piano dell'MVP: si legge per interfacce e formati (§5), ma non si estende più.

## Input da leggere
1. `CLAUDE.md` (regole) e `docs/DECISIONS.md` (decisioni: non contraddirle).
2. `docs/LEVELS.md` se tocca dei livelli, e il documento della feature, se esiste.
3. `PLAN.md` per il design, solo le sezioni rilevanti; `docs/PLAN_REVIEW.md` se si applica una review.

## Passi
1. Elenca cosa cambia e quali documenti e livelli tocca.
2. Per ogni modifica specifica: file coinvolti, interfacce (firme, eventi), formati dati, costanti con valori, casi limite.
3. Per le trappole: comportamento `normal` e `pivoted`, indizio visivo, tempi verificati contro le costanti fisiche (il giocatore che corre deve poter essere colpito; il salto deve essere possibile).
4. Per i livelli:
   - geometria esplicita, con una mappa ASCII per ogni variante;
   - parametri di ogni entità;
   - verifica di raggiungibilità;
   - effetti sulla catena dei pivot (vedi `docs/LEVELS.md`).
5. Ogni milestone ha criteri di accettazione **verificabili dall'agente**: test Vitest, `npm run build`, validatore livelli, `npm run smoke`, parametri di debug URL. I controlli solo manuali vanno segnati come "playtest utente".
6. Applicando una review: per ogni punto scrivi in fondo al piano se è stato accolto, modificato o respinto, con il motivo.
7. Registra le nuove decisioni in `docs/DECISIONS.md`.

## Non fare
- Non scrivere codice di gioco.
- Non allargare lo scope oltre quanto deciso: le idee nuove vanno in una sezione "dopo" o "backlog".
- Non decidere al posto dell'utente su tema, nome, tono o scope: chiedi.

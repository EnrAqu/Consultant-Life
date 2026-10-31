---
name: plan
description: Aggiorna il piano tecnico del gioco (docs/IMPLEMENTATION_PLAN.md) per una nuova feature o per applicare una review. Usare prima di scrivere codice per qualcosa che non è già specificato nel piano.
---

# Playbook: plan

Obiettivo: un piano che un esecutore possa seguire **senza indovinare**.

## Input da leggere
1. `CLAUDE.md` (regole) e `docs/DECISIONS.md` (decisioni: non contraddirle).
2. `PLAN.md` per il design, solo le sezioni rilevanti.
3. `docs/IMPLEMENTATION_PLAN.md` (stato attuale) e, se presente, `docs/PLAN_REVIEW.md`.

## Passi
1. Elenca cosa cambia e quali sezioni del piano tocca.
2. Per ogni modifica specifica: file coinvolti, interfacce (firme, eventi), formati dati, costanti con valori, casi limite.
3. Per le trappole: comportamento `normal` e `pivoted`, indizio visivo, tempi verificati contro le costanti fisiche (il giocatore che corre deve poter essere colpito; il salto deve essere possibile).
4. Per i livelli: geometria esplicita (mappa ASCII per ogni variante), parametri di ogni entità, verifica di raggiungibilità.
5. Ogni milestone ha criteri di accettazione **verificabili dall'agente** (test Vitest, `npm run build`, validatore livelli, parametri di debug URL). I controlli solo manuali vanno segnati come "playtest utente".
6. Applicando una review: per ogni punto scrivi in fondo al piano se è stato accolto, modificato o respinto, con il motivo.
7. Registra le nuove decisioni in `docs/DECISIONS.md`.

## Non fare
- Non scrivere codice di gioco.
- Non allargare lo scope oltre quanto deciso: le idee nuove vanno nella sezione post-MVP.
- Non decidere al posto dell'utente su tema, nome, tono o scope: chiedi.

# Versione mobile — controlli su schermo

Richiesta dell'utente (2026-11-01): *"pensiamo anche ad una versione mobile, perché non ci posso giocare da là. Mi servirebbero i controlli su schermo."*

## Scelte (opzioni standard, da rivedere dopo il test sul telefono)

| Tema | Scelta |
|---|---|
| Quando compaiono | Solo su schermi touch (`pointer: coarse`) o con `?touch=1`. Da tastiera non cambia nulla |
| Movimento | In basso a sinistra un'unica "pulsantiera" ◀ ▶: conta la metà toccata, quindi si può far scivolare il dito da una direzione all'altra senza staccarlo |
| Salto | Pulsante grande in basso a destra. Tenerlo premuto = salto più alto, come con la tastiera (stesso jump cut) |
| Delega (E) | Pulsante piccolo sopra il salto. Si illumina quando c'è qualcosa da delegare, come il suggerimento nell'HUD |
| Ricomincia (R) | Pulsante piccolo ↺ accanto alla delega. Piccolo apposta: un tocco per sbaglio costa 0,5 GU |
| Multitouch | Eventi pointer per dito (`pointerId`): si corre e si salta insieme |
| Schermate "premi Spazio" | Lessons Learned, Budget sforato e finale si superano anche toccando lo schermo. Su touch il testo dice "Tocca lo schermo…" |
| Orientamento | Su telefono in verticale compare "Ruota il telefono". Al primo tocco si prova fullscreen + blocco in orizzontale (dove il browser lo permette: non su iPhone Safari, dove si usa "Aggiungi a Home") |
| Browser | `touch-action: none`, niente zoom, niente selezione del testo, niente menu del tocco lungo |
| Architettura | `src/input/TouchControls.js`: DOM sopra il canvas, senza Phaser. Stato `{ left, right, jumpHeld }` e code "una volta" per salto, delega e ricomincia. `GameScene.readInput` unisce tastiera e touch. Visibile solo durante `GameScene` |

## Verifica
- `npm test`, `npm run build`.
- Smoke `?touch=1`: i pulsanti compaiono e il ◀ ▶ muove il player. Il salto lo fa saltare (più in alto se tenuto). Il tocco supera le Lessons Learned.
- **Playtest utente** sul telefono (GitHub Pages).

## Stato
- [x] Sviluppato (2026-11-01) — in attesa del playtest sul telefono.

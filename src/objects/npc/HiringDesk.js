import { TILE, DEPTH, TEXTURE_SCALE, TEXT_RESOLUTION, UI_FONT } from '../../config/constants.js';
import HireBrain from '../../core/HireBrain.js';
import { bus, EV } from '../../events/EventBus.js';
import { touch } from '../../input/TouchControls.js';

const BASE = 1 / TEXTURE_SCALE;

// Desks that give you juniors (docs/HIRING.md, level 4, user 2026-11-03). E at the desk (asked before delegation):
// - `tempAgency` "Accetta interinali": 2 temps at once, free, until the next checkpoint (or the end of the level);
// - `jobPost` "Posta annuncio su LinkedIn": 1 GU (free with the `linkedin` lesson: a slot), 6 s later a real junior
//   runs in from the kiosk and joins the end of the line.
// Once per life.
class HiringDesk {
  constructor(scene, def, mode) {
    this.scene = scene;
    this.def = def;
    this.mode = mode;
    this.p = def.params ?? {};
    this.brain = new HireBrain({ delayMs: this.p.delayMs ?? 0 });
    this.x = def.x * TILE + 16;
    this.floorY = (def.y + 1) * TILE;
  }

  get pivoted() {
    return this.mode === 'pivoted';
  }

  build() {
    const scene = this.scene;
    scene.add.image(this.x, this.floorY, this.texture).setOrigin(0.5, 1).setScale(BASE).setTint(this.tint).setDepth(DEPTH.objects);
    this.sign = scene.add
      .text(this.x, this.floorY - 46, '', { fontFamily: UI_FONT, fontStyle: 'bold', fontSize: '9px', color: '#111827', backgroundColor: this.signColor, padding: { x: 4, y: 2 }, resolution: TEXT_RESOLUTION * 2, wordWrap: { width: 150 }, align: 'center' })
      .setOrigin(0.5, 1)
      .setDepth(DEPTH.objects);
    this.reset();
  }

  near() {
    const b = this.scene.player.body;
    return Math.abs(b.center.x - this.x) <= TILE * 1.2 && this.scene.player.grounded && Math.abs(b.bottom - this.floorY) <= 2;
  }

  // a death re-arms the desk only if nothing was paid yet (review HIRING #4); subclasses may override
  reset() {
    if (this.keepsHire && this.brain.state !== 'idle') return;
    this.brain.reset();
    this.refresh();
  }

  refresh() {
    const text = this.text(this.brain.state, touch.enabled ? 'Tocca E' : 'E');
    if (this.sign.text !== text) this.sign.setText(text);
  }

  cancelCall() {}

  delegateTarget() {
    return null;
  }

  onAction() {
    if (!this.scene.team || !this.near()) return false;
    if (this.brain.state === 'idle' && this.cost > 0 && this.scene.budget.gu <= this.cost) {
      bus.emit(EV.TOAST, { text: `L'annuncio costa ${this.cost} GU: non te lo puoi permettere`, durationMs: 1800, color: '#93c5fd' });
      // E still delegates (review HIRING #2)
      return false;
    }
    if (this.brain.act() !== 'hire') return false;
    this.onHire();
    this.refresh();
    return true;
  }

  update(dt) {
    if (this.brain.update(dt) === 'arrive') this.onArrive();
    this.refresh();
  }
}

export class TempAgency extends HiringDesk {
  static type = 'tempAgency';
  texture = 'internDesk';
  tint = 0xfdba74;
  signColor = '#fed7aa';
  cost = 0;

  text(state, key) {
    const n = this.p.count ?? 2;
    return state === 'idle' ? `Agenzia interinale — ${key}: accetta ${n} interinali (gratis, fino al prossimo checkpoint)` : 'Interinali assegnati. Contratto a termine.';
  }

  onHire() {}

  onArrive() {
    this.scene.team.addTemps(this.p.count ?? 2);
    bus.emit(EV.TOAST, { text: `Arrivano ${this.p.count ?? 2} interinali: contratto fino al prossimo checkpoint`, durationMs: 2000, color: '#fdba74' });
    this.scene.narrate('tempAgency');
  }
}

export class JobPost extends HiringDesk {
  static type = 'jobPost';
  texture = 'itKiosk';
  tint = 0x93c5fd;
  signColor = '#dbeafe';
  // paid once: after a death the ad keeps running and the hired junior stays (like the intern)
  keepsHire = true;

  get cost() {
    return this.pivoted ? 0 : this.p.cost ?? 1;
  }

  text(state, key) {
    if (state === 'idle') return `LinkedIn — ${key}: posta un annuncio (${this.cost ? `${this.cost} GU` : 'gratis: sai come funziona'})`;
    if (state === 'waiting') return '"Cercasi junior con 10 anni di esperienza." Candidature: 247…';
    return 'Posizione coperta. Il candidato ha scritto "appassionato".';
  }

  onHire() {
    if (this.cost > 0) this.scene.spendGu(this.cost, 'jobPost');
    bus.emit(EV.TOAST, { text: 'Annuncio pubblicato su LinkedIn. Candidature: 247.', durationMs: 1800, color: '#93c5fd' });
  }

  onArrive() {
    this.scene.team.addRunner(this.x, this.floorY);
    // the hire survives a death, like the intern's
    this.scene.team.savedCount += 1;
    bus.emit(EV.TOAST, { text: 'Assunto un junior da LinkedIn: ti sta raggiungendo', durationMs: 2000, color: '#93c5fd' });
    this.scene.narrate('jobPost');
  }
}

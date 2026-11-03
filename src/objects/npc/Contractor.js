import { TILE, DEPTH, TEXTURE_SCALE, TEXT_RESOLUTION, UI_FONT } from '../../config/constants.js';
import ContractorBrain from '../../core/ContractorBrain.js';
import { bus, EV } from '../../events/EventBus.js';
import { touch } from '../../input/TouchControls.js';

const BASE = 1 / TEXTURE_SCALE;

// External resources: the contractor (docs/IT_HR_EXTERNAL.md §4), level 4. An explicit action, never a touch (review A):
// E at his desk pays `cost` GU; after `delayMs` ("Timezone offshore") he builds the one-way steps "come da specifica"
// — all but the last one; E again reports the defect and after `fixMs` the last step comes, free. Once per level: a death
// undoes nothing. Here the steps lead to the HR certificate (you pay GU instead of the course's burnout).
export default class Contractor {
  static type = 'contractor';

  constructor(scene, def, mode) {
    this.scene = scene;
    this.def = def;
    this.mode = mode;
    this.p = def.params;
    this.brain = new ContractorBrain({ delayMs: this.p.delayMs ?? 4000, fixMs: this.p.fixMs ?? 2000 });
    this.x = def.x * TILE + 16;
    this.floorY = (def.y + 1) * TILE;
  }

  build() {
    const scene = this.scene;
    scene.add.image(this.x, this.floorY, 'contractorDesk').setOrigin(0.5, 1).setScale(BASE).setDepth(DEPTH.objects);
    const style = (size, color, bg) => ({ fontFamily: UI_FONT, fontStyle: 'bold', fontSize: `${size}px`, color, backgroundColor: bg, padding: { x: 4, y: 2 }, resolution: TEXT_RESOLUTION * 2, wordWrap: { width: 180 } });
    this.sign = scene.add.text(this.x, this.floorY - 46, '', style(9, '#111827', '#fde68a')).setOrigin(0.5, 1).setDepth(DEPTH.objects);
    this.steps = this.p.steps.map((st) => {
      const col = this.def.x + st.dx;
      const row = this.def.y + st.dy;
      const plat = scene.add.tileSprite(col * TILE, row * TILE, st.w * TILE, 10, 'scaffold').setOrigin(0, 0).setDepth(DEPTH.traps);
      plat.setTileScale(BASE);
      scene.physics.add.existing(plat);
      plat.body.setAllowGravity(false).setImmovable(true);
      plat.body.checkCollision.down = false;
      plat.body.checkCollision.left = false;
      plat.body.checkCollision.right = false;
      plat.setVisible(false);
      plat.body.enable = false;
      scene.physics.add.collider(scene.player, plat);
      return plat;
    });
    this.refresh();
  }

  // at his desk, on his floor (not from a platform above, review IT_HR #6)
  near() {
    const b = this.scene.player.body;
    return Math.abs(b.center.x - this.x) <= TILE * 1.2 && this.scene.player.grounded && Math.abs(b.bottom - this.floorY) <= 2;
  }

  // with the `hr` lesson there is no certificate to reach (review IT_HR #7)
  get useless() {
    return this.scene.traps.some((t) => t.type === 'hrCourse' && t.pivoted);
  }

  refresh() {
    const key = touch.enabled ? 'Tocca E' : 'E';
    const b = this.brain.state;
    if (this.useless) {
      if (this.sign.text !== 'Fornitore esterno: niente da costruire') this.sign.setText('Fornitore esterno: niente da costruire');
      return;
    }
    const text = {
      idle: `Fornitore esterno — ${key}: ingaggia (${this.p.cost} GU)`,
      hired: 'Timezone offshore: risponde domattina…',
      built: `Fatto come da specifica. ${key}: segnala un difetto`,
      fixing: 'Difetto preso in carico…',
      complete: 'Chiuso. Fattura in arrivo.',
    }[b];
    if (this.sign.text !== text) this.sign.setText(text);
  }

  // E at his desk (GameScene asks the NPCs before delegating). Returns true if he took the action.
  onAction() {
    if (!this.near() || this.useless) return false;
    if (this.brain.state === 'idle' && this.scene.budget.gu <= this.p.cost) {
      bus.emit(EV.TOAST, { text: `Il fornitore costa ${this.p.cost} GU: non te lo puoi permettere`, durationMs: 1800, color: '#fde68a' });
      return false;
    }
    const ev = this.brain.act();
    if (!ev) return false;
    if (ev === 'hire') {
      bus.emit(EV.TOAST, { text: `Fornitore ingaggiato: -${this.p.cost} GU`, durationMs: 1600, color: '#fde68a' });
      this.scene.spendGu(this.p.cost, 'contractor');
    }
    this.refresh();
    return true;
  }

  show(i) {
    this.steps[i].setVisible(true);
    this.steps[i].body.enable = true;
  }

  update(dt) {
    const ev = this.brain.update(dt);
    if (ev === 'build') for (let i = 0; i < this.steps.length - 1; i++) this.show(i);
    if (ev === 'fix') this.show(this.steps.length - 1);
    if (ev) {
      this.refresh();
      if (ev === 'build') bus.emit(EV.TOAST, { text: 'Il fornitore ha consegnato. Come da specifica.', durationMs: 1800, color: '#fde68a' });
    }
  }

  reset() {}

  cancelCall() {}

  delegateTarget() {
    return null;
  }
}

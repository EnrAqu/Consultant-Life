import { TILE, DEPTH, TEXTURE_SCALE, TEXT_RESOLUTION, UI_FONT } from '../../config/constants.js';
import { bus, EV } from '../../events/EventBus.js';

const COST = 2;

// "Assumi uno stagista": if your team is empty, touching the desk hires a new junior for 2 GU.
// It guarantees you never get stuck in front of an "Approvazione richiesta" gate.
export default class InternDesk {
  static type = 'intern';

  constructor(scene, def) {
    this.scene = scene;
    this.def = def;
    this.x = def.x * TILE + 16;
    this.floorY = (def.y + 1) * TILE;
  }

  build() {
    const scene = this.scene;
    scene.add.image(this.x, this.floorY, 'internDesk').setOrigin(0.5, 1).setScale(1 / TEXTURE_SCALE).setDepth(DEPTH.objects);
    scene.add
      .text(this.x, this.floorY - 44, `Assumi uno stagista\nBudget formazione: ${COST} GU`, {
        fontFamily: UI_FONT,
        fontSize: '8px',
        align: 'center',
        color: '#d1fae5',
        resolution: TEXT_RESOLUTION * 2,
      })
      .setOrigin(0.5, 1)
      .setDepth(DEPTH.objects);
    this.reset();
  }

  reset() {
    this.armed = true;
  }

  cancelCall() {}

  update() {
    const scene = this.scene;
    const team = scene.team;
    if (!team) return;
    const b = scene.player.body;
    const touching = b.right > this.x - 12 && b.left < this.x + 12 && b.bottom > this.floorY - 40;
    if (!touching) {
      this.armed = true;
      return;
    }
    if (!this.armed) return;
    this.armed = false;
    if (team.count > 0) {
      bus.emit(EV.TOAST, { text: 'Hai già un team. Il budget formazione è congelato.', durationMs: 1600 });
      return;
    }
    if (scene.budget.gu <= COST) {
      bus.emit(EV.TOAST, { text: 'Budget formazione esaurito. Non ci sono GU per uno stagista.', durationMs: 2200 });
      return;
    }
    scene.spendGu(COST, 'intern');
    team.add(1);
    // the hire survives a death, but does not overwrite the checkpoint team
    team.savedCount += 1;
    bus.emit(EV.TOAST, { text: `Nuovo stagista assunto: -${COST} GU`, durationMs: 1800 });
    scene.narrate('intern');
  }
}

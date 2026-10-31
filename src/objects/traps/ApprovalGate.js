import BaseTrap from './BaseTrap.js';
import { TILE, DEPTH, TEXTURE_SCALE, TEXT_RESOLUTION, UI_FONT } from '../../config/constants.js';

const HEIGHT = 4; // tiles: too tall to jump (max jump 3.3 tiles)

// Normal: a glass barrier that opens only while someone stands on its plate a few tiles before it.
// If you stand there yourself it opens, but you cannot pass: you need to delegate a junior (E).
// Pivoted: "Approvato in automatico. Nessuno sa da chi." — the barrier is open.
export default class ApprovalGate extends BaseTrap {
  static type = 'approvalGate';

  build() {
    const scene = this.scene;
    this.plateCol = this.tx + (this.p.plateDx ?? -4);
    this.floorY = (this.ty + 1) * TILE;
    this.barrier = this.addPlatform(this.tx, this.ty - HEIGHT + 1, 1, HEIGHT, 'gateTile');
    this.plate = scene.add.image(this.plateCol * TILE + 16, this.floorY, 'plate').setOrigin(0.5, 1).setScale(1 / TEXTURE_SCALE).setDepth(DEPTH.objects);
    this.label = scene.add
      .text(this.tx * TILE + 16, (this.ty - HEIGHT) * TILE - 4, this.pivoted ? 'Approvato in automatico' : 'Approvazione richiesta', {
        fontFamily: UI_FONT,
        fontStyle: 'bold',
        fontSize: '9px',
        color: '#ffffff',
        backgroundColor: this.pivoted ? '#15803d' : '#b91c1c',
        padding: { x: 4, y: 2 },
        resolution: TEXT_RESOLUTION * 2,
      })
      .setOrigin(0.5, 1)
      .setDepth(DEPTH.traps);
    this.reset();
  }

  reset() {
    this.held = false;
    this.setOpen(this.pivoted);
  }

  setOpen(open) {
    this.open = open;
    this.barrier.body.enable = !open;
    this.barrier.setAlpha(open ? 0.15 : 1);
    this.plate.setTint(open ? 0x22c55e : 0xffffff);
  }

  playerOnPlate() {
    const player = this.scene.player;
    return player.grounded && Math.floor(player.body.center.x / TILE) === this.plateCol && Math.abs(player.body.bottom - this.floorY) < 6;
  }

  update() {
    this.setOpen(this.pivoted || this.held || this.playerOnPlate());
  }

  delegateTarget() {
    if (this.pivoted || this.held) return null;
    return { x: this.plateCol * TILE + 16, kind: 'gate' };
  }

  onDelegate() {
    this.held = true;
    return { stay: true };
  }
}

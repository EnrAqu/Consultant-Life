import BaseTrap from './BaseTrap.js';
import { TILE, DEPTH, TEXTURE_SCALE } from '../../config/constants.js';

const VANISH_MS = 150;

// Bonus AI (ITERATION_4 §5): take the chip and a shortcut of platforms appears at once.
// Some are "hallucinated": they flicker and shift colour, and vanish when you stand on them.
// "È una draft. Va ricontrollata."
export default class AiDraft extends BaseTrap {
  static type = 'aiDraft';

  build() {
    const scene = this.scene;
    this.baseX = this.tx * TILE + 16;
    this.baseY = (this.ty + 1) * TILE - 16;
    this.glow = scene.add.image(this.baseX, this.baseY, 'glow').setTint(0xa78bfa).setScale(1 / TEXTURE_SCALE).setDepth(DEPTH.objects);
    this.sprite = scene.physics.add.staticImage(this.baseX, this.baseY, 'aiChip').setScale(1 / TEXTURE_SCALE).setDepth(DEPTH.traps).refreshBody();
    this.triggers.push(this.sprite);
    this.platforms = (this.p.platforms ?? []).map((pl) => ({
      ...pl,
      ts: this.addPlatform(this.tx + pl.dx, this.ty + pl.dy, pl.w, 1, 'tilesHD', false, 'desk'),
    }));
    this.reset();
  }

  reset() {
    this.taken = false;
    this.t = 0;
    this.sprite.enableBody(false, 0, 0, true, true);
    this.glow.setVisible(true);
    for (const pl of this.platforms) {
      pl.ts.setVisible(false).setAlpha(1).clearTint();
      pl.ts.body.enable = false;
      pl.vanishLeft = null;
    }
  }

  onTrigger() {
    if (this.taken) return;
    this.taken = true;
    this.sprite.disableBody(true, true);
    this.glow.setVisible(false);
    for (const pl of this.platforms) {
      pl.ts.setVisible(true).setTint(0xc4b5fd);
      pl.ts.body.enable = true;
    }
    this.scene.narrate('aiDraft');
  }

  update(dt) {
    this.t += dt;
    if (!this.taken) {
      this.sprite.y = this.baseY + Math.sin(this.t / 200) * 3;
      this.glow.y = this.sprite.y;
      return;
    }
    const body = this.scene.player.body;
    for (const pl of this.platforms) {
      if (!pl.fake || !pl.ts.visible) continue;
      // the tell: hallucinated platforms flicker and shift colour
      pl.ts.setAlpha(0.65 + 0.35 * Math.abs(Math.sin(this.t / 70)));
      pl.ts.setTint(Math.floor(this.t / 120) % 2 === 0 ? 0xc4b5fd : 0xf0abfc);
      const standing = this.scene.player.grounded && Math.abs(body.bottom - pl.ts.y) < 3 && body.right > pl.ts.x && body.left < pl.ts.x + pl.ts.width;
      if (standing && pl.vanishLeft === null) pl.vanishLeft = VANISH_MS;
      if (pl.vanishLeft !== null) {
        pl.vanishLeft -= dt;
        if (pl.vanishLeft <= 0) {
          pl.ts.setVisible(false);
          pl.ts.body.enable = false;
          this.scene.narrate('aiFake');
        }
      }
    }
  }
}

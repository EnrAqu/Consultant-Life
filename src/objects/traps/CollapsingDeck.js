import BaseTrap from './BaseTrap.js';
import { TILE, DEPTH, TEXT_RESOLUTION, TEXTURE_SCALE, UI_FONT } from '../../config/constants.js';

// Normal: entering the corridor makes the deck wobble, then slides fall from the exit backwards and crush you.
// Tell: deck file name, the top slide always wobbles a little.
// Pivoted: green "APPROVATO" slides fall into the pit and become a bridge, never lethal.
export default class CollapsingDeck extends BaseTrap {
  static type = 'deckCollapse';

  build() {
    const p = this.p;
    const scene = this.scene;
    const key = this.pivoted ? 'slideGreen' : 'slide';
    this.stackBottom = (p.stackRow + 1) * TILE;

    // Slides that fall first sit on top of their pile.
    this.slides = p.targets.slice(0, p.slideCount).map((t, i) => {
      const above = p.targets.slice(i + 1, p.slideCount).filter((o) => o.dx === t.dx).length;
      const x = (this.tx + t.dx) * TILE;
      const home = this.pivoted ? this.stackBottom - i * 38 : this.stackBottom - above * 36;
      const slide = this.objectGroup.create(x, home, key).setOrigin(0, 1).setScale(1 / TEXTURE_SCALE).setDepth(DEPTH.traps);
      // body sizes are in texture pixels (scaled by the sprite scale): 64×32 in the world
      slide.body.setSize(64 * TEXTURE_SCALE, 32 * TEXTURE_SCALE);
      slide.body.setOffset(0, 6 * TEXTURE_SCALE);
      slide.setData({ state: 'idle', lethal: !this.pivoted, home, target: (t.row + 1) * TILE });
      return slide;
    });
    this.topSlide = this.slides[0];

    const minX = Math.min(...this.slides.map((s) => s.x));
    const maxX = Math.max(...this.slides.map((s) => s.x)) + 64;
    scene.add.rectangle(minX - 4, this.stackBottom, maxX - minX + 8, 4, 0x6b7280).setOrigin(0, 0).setDepth(DEPTH.traps - 1);
    const topY = Math.min(...this.slides.map((s) => s.getData('home'))) - 50;
    scene.add
      .text((minX + maxX) / 2, topY, this.pivoted ? 'deck_FINAL_v8_APPROVATO.pptx' : 'deck_FINAL_v7_DEF_ok.pptx', {
        fontFamily: UI_FONT,
        fontSize: '12px',
        color: this.pivoted ? '#22c55e' : '#e5e7eb',
        resolution: TEXT_RESOLUTION * 2,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.traps);

    this.addTrigger(p.triggerDx, p.triggerWidth);
    this.reset();
  }

  reset() {
    this.state = 'idle';
    this.t = 0;
    this.elapsed = 0;
    this.dropped = 0;
    for (const s of this.slides) {
      s.body.reset(s.x, s.getData('home'));
      s.setData('state', 'idle').setAngle(0);
    }
    this.shaken = false;
  }

  onTrigger() {
    if (this.state !== 'idle') return;
    this.state = 'wobble';
    this.elapsed = 0;
  }

  dangerCols() {
    return this.pivoted ? null : [this.tx - 1, this.tx + 6];
  }

  delegateTarget() {
    if (this.state !== 'idle' || this.pivoted) return null;
    return { x: (this.tx + 2) * TILE + 16, kind: 'deckCollapse' };
  }

  onDelegate() {
    this.onTrigger();
    return {};
  }

  update(dt) {
    const p = this.p;
    this.t += dt;
    if (this.state === 'idle') {
      this.topSlide.setAngle(2 * Math.sin((this.t / 1600) * Math.PI * 2));
      return;
    }
    this.elapsed += dt;
    if (this.state === 'wobble') {
      this.topSlide.setAngle(6 * Math.sin((this.t / 200) * Math.PI * 2));
      if (this.elapsed >= p.wobbleMs) {
        this.state = 'dropping';
        this.elapsed = 0;
        this.topSlide.setAngle(0);
      }
      return;
    }
    while (this.dropped < this.slides.length && this.elapsed >= this.dropped * p.dropIntervalMs) {
      const s = this.slides[this.dropped++];
      s.setData('state', 'falling');
      s.setData('angle', this.dropped % 2 === 0 ? 10 : -10);
      s.body.setVelocityY(p.fallSpeed * TILE);
    }
    for (const s of this.slides) {
      if (s.getData('state') !== 'falling') continue;
      const total = s.getData('target') - s.getData('home');
      const progress = total > 0 ? (s.y - s.getData('home')) / total : 1;
      s.setAngle(s.getData('angle') * (1 - progress));
      if (s.y >= s.getData('target')) {
        s.body.reset(s.x, s.getData('target'));
        s.setData('state', 'landed').setAngle(0);
        if (!this.shaken) {
          this.shaken = true;
          this.scene.cameras.main.shake(60, 0.003);
        }
      }
    }
  }
}

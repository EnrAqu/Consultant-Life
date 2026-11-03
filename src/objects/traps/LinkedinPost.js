import BaseTrap from './BaseTrap.js';
import PostBrain from '../../core/PostBrain.js';
import { TILE, DEPTH, TEXT_RESOLUTION, UI_FONT } from '../../config/constants.js';

const CAUSE_WINDOW_MS = 3000;
const VIRAL_MS = 1200;

// LinkedIn (docs/PM_LINKEDIN.md §3). A post you can stand on; the likes start when you step on it.
// Normal: at `likes` likes it goes viral and collapses (back after `respawnMs`). Tell: the like counter "0/3" over it.
// A "Sponsorizzato" post (likes: 1) goes at the first like. Pivoted (lesson learned): it never collapses.
export default class LinkedinPost extends BaseTrap {
  static type = 'linkedin';

  build() {
    const scene = this.scene;
    const p = this.p;
    this.brain = new PostBrain({ likes: p.likes ?? 3, likeMs: p.likeMs ?? 350, respawnMs: p.respawnMs ?? 2500, pivoted: this.pivoted });
    this.plat = this.addPlatform(this.tx, this.ty, p.width, 1, 'linkedinTile');
    const cx = (this.tx + p.width / 2) * TILE;
    const style = (size, color, extra = {}) => ({ fontFamily: UI_FONT, fontSize: `${size}px`, color, resolution: TEXT_RESOLUTION * 2, ...extra });
    this.text = scene.add
      .text(cx, this.ty * TILE + 7, p.text ?? 'Sono felice di annunciare…', style(6, '#0f172a', { wordWrap: { width: p.width * TILE - 6 }, align: 'center' }))
      .setOrigin(0.5, 0)
      .setDepth(DEPTH.traps + 1);
    // under the post: the player standing on it never covers the counter
    this.counter = scene.add.text(cx, (this.ty + 1) * TILE + 3, '', style(10, '#0a66c2', { fontStyle: 'bold', backgroundColor: '#ffffff', padding: { x: 3, y: 1 } })).setOrigin(0.5, 0).setDepth(DEPTH.traps + 1);
    this.viral = scene.add.text(cx, this.ty * TILE - 22, 'Virale!', style(12, '#facc15', { fontStyle: 'bold', stroke: '#0a66c2', strokeThickness: 3 })).setOrigin(0.5, 1).setDepth(DEPTH.fx).setVisible(false);
    if (p.pitRect) {
      const r = p.pitRect;
      const zone = scene.add.zone((this.tx + r.dx) * TILE + (r.w * TILE) / 2, (this.ty + r.dy) * TILE + (r.h * TILE) / 2, r.w * TILE, r.h * TILE);
      scene.physics.add.existing(zone, true);
      this.killZones.push({ zone, check: () => (this.clock - this.collapsedAt <= CAUSE_WINDOW_MS ? 'linkedin' : null) });
    }
    this.clock = 0;
    this.reset();
  }

  setSolid(on) {
    this.plat.setVisible(on);
    this.plat.body.enable = on;
    this.text.setVisible(on);
  }

  refreshCounter() {
    const b = this.brain;
    const tag = this.p.likes === 1 && !this.pivoted ? 'Sponsorizzato · ' : '';
    this.counter.setText(this.pivoted ? `Like ${b.likes} · in evidenza` : `${tag}Like ${b.likes}/${b.maxLikes}`);
  }

  dangerCols() {
    return this.pivoted ? null : [this.tx - 1, this.tx + this.p.width];
  }

  onSolidContact() {
    const pb = this.scene.player?.body;
    if (pb && pb.blocked.down && pb.bottom <= this.plat.body.top + 3) this.brain.touch();
  }

  reset() {
    this.brain.reset();
    this.collapsedAt = -Infinity;
    this.viralMs = 0;
    this.viral.setVisible(false);
    this.setSolid(true);
    this.refreshCounter();
  }

  update(dt) {
    this.clock += dt;
    const ev = this.brain.update(dt);
    if (ev === 'collapse') {
      this.collapsedAt = this.clock;
      this.setSolid(false);
      this.viralMs = VIRAL_MS;
      this.viral.setVisible(true);
    }
    if (ev === 'restore') this.setSolid(true);
    if (ev) this.refreshCounter();
    if (this.viralMs > 0) {
      this.viralMs -= dt;
      if (this.viralMs <= 0) this.viral.setVisible(false);
    }
  }
}

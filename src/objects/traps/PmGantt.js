import BaseTrap from './BaseTrap.js';
import GanttBrain from '../../core/GanttBrain.js';
import { TILE, DEPTH, TEXT_RESOLUTION, TEXTURE_SCALE, UI_FONT } from '../../config/constants.js';

const CAUSE_WINDOW_MS = 3000;
const CAPTION_MS = 2000;

// The PM reschedules (docs/PM_LINKEDIN.md §2). A Gantt bar over a pit, the PM next to it.
// Normal: land on it and the PM says "Un attimo…" while the bar flashes; after `delayMs` the milestone slips and the
// bar slides away under you in the direction of its arrow. Tells: the arrow, the label, the warning. Counter: hop off
// at once, or run along with it. Pivoted ("il PM ripianifica a tuo favore"): it slides that way carrying you.
// A one-way platform (solid from above only): sliding over the floor it never pushes or traps the player (review #8).
// The validator sees it at home (normal) or along the whole ride (pivoted).
export default class PmGantt extends BaseTrap {
  static type = 'pm';

  build() {
    const scene = this.scene;
    const p = this.p;
    this.brain = new GanttBrain({ shift: p.shift, speed: p.speed, delayMs: p.delayMs, returnDelayMs: p.returnDelayMs });
    this.homeX = this.tx * TILE;
    this.y = this.ty * TILE;
    this.plat = this.addPlatform(this.tx, this.ty, p.width, 1, 'ganttBar');
    // moved by hand (update), never by velocity; solid from above only
    this.plat.body.setFriction(0, 0);
    this.plat.body.checkCollision.left = false;
    this.plat.body.checkCollision.right = false;
    this.plat.body.checkCollision.down = false;
    const style = (size, color, extra = {}) => ({ fontFamily: UI_FONT, fontStyle: 'bold', fontSize: `${size}px`, color, resolution: TEXT_RESOLUTION * 2, ...extra });
    const arrow = p.shift < 0 ? '◀◀' : '▶▶';
    this.arrow = scene.add.text(0, 0, arrow, style(10, '#ffffff')).setOrigin(0.5).setDepth(DEPTH.traps + 1);
    // readable on the dark office (review #4)
    this.label = scene.add.text(0, 0, p.label ?? 'Milestone (da ripianificare)', style(9, '#ccfbf1', { backgroundColor: '#134e4a', padding: { x: 3, y: 1 } })).setOrigin(0.5, 1).setDepth(DEPTH.traps);
    this.moveLine = this.pivoted ? 'Il PM: "Ripianifico io. A tuo favore."' : 'Il PM: "Abbiamo ripianificato."';
    this.caption = scene.add
      .text(0, 0, '', style(11, '#5eead4', { backgroundColor: '#134e4a', padding: { x: 4, y: 2 } }))
      .setOrigin(0.5, 1)
      .setDepth(DEPTH.fx)
      .setVisible(false);
    // the PM himself, on the edge before the bar, with his Gantt
    if (p.pmDx !== undefined) {
      scene.add.image((this.tx + p.pmDx) * TILE + 16, (this.ty + (p.pmDy ?? 1)) * TILE, 'npc_pm', 'idle0').setOrigin(0.5, 1).setScale(1 / TEXTURE_SCALE).setFlipX(p.pmDx > 0).setDepth(DEPTH.objects);
    }
    if (p.pitRect) {
      const r = p.pitRect;
      const zone = scene.add.zone((this.tx + r.dx) * TILE + (r.w * TILE) / 2, (this.ty + r.dy) * TILE + (r.h * TILE) / 2, r.w * TILE, r.h * TILE);
      scene.physics.add.existing(zone, true);
      this.killZones.push({ zone, check: () => (this.clock - this.movedAt <= CAUSE_WINDOW_MS ? 'pm' : null) });
    }
    this.clock = 0;
    this.reset();
  }

  say(text) {
    this.caption.setText(text).setVisible(true);
    this.captionMs = CAPTION_MS;
  }

  place(x) {
    this.plat.body.reset(x, this.y);
    this.syncLabels();
  }

  syncLabels() {
    const cx = this.plat.body.x + (this.p.width * TILE) / 2;
    this.plat.setPosition(this.plat.body.x, this.plat.body.y);
    this.arrow.setPosition(cx, this.y + 9);
    this.label.setPosition(cx, this.y - 2);
    this.caption.setPosition(cx, this.y - 30);
  }

  riding() {
    const pb = this.scene.player?.body;
    const b = this.plat.body;
    return Boolean(pb && pb.blocked.down && Math.abs(pb.bottom - b.top) <= 3 && pb.right > b.left && pb.left < b.right);
  }

  // frozen on a sliding bar = an unfair death: the micromanager never stops you over it
  dangerCols() {
    const p = this.p;
    return [Math.min(this.tx, this.tx + p.shift) - 1, Math.max(this.tx, this.tx + p.shift) + p.width];
  }

  onSolidContact() {
    if (this.riding()) this.brain.land();
  }

  reset() {
    this.brain.reset();
    this.plat.clearTint();
    this.movedAt = -Infinity;
    this.captionMs = 0;
    this.caption.setVisible(false);
    this.place(this.homeX);
  }

  // Kinematic: every frame the bar goes exactly where the brain says (game time, the same clock as everything else);
  // the pivoted bar moves its rider by the same amount, so it carries you even at a low frame rate.
  update(dt) {
    this.clock += dt;
    const riding = this.riding();
    const wasIdle = this.brain.state === 'idle';
    const ev = this.brain.update(dt, riding);
    // the warning: from the landing to the move, "Un attimo…" and the bar flashes
    if (wasIdle && this.brain.state === 'armed') this.say('Il PM: "Un attimo…"');
    const armed = this.brain.state === 'armed';
    if (armed && Math.floor(this.brain.timer / 90) % 2 === 0) this.plat.setTint(0xfde68a);
    else this.plat.clearTint();
    if (ev === 'move') {
      this.movedAt = this.clock;
      this.say(this.moveLine);
    }
    const x = this.homeX + this.brain.offset * TILE;
    const delta = x - this.plat.body.x;
    if (delta !== 0) {
      this.place(x);
      // carried only while it moves forward, not on its way back home (review #9)
      if (this.pivoted && riding && Math.sign(delta) === Math.sign(this.p.shift)) {
        // the sprite only: the body follows it at the next physics step (moving both counted the shift twice)
        this.scene.player.x += delta;
      }
    }
    if (this.captionMs > 0) {
      this.captionMs -= dt;
      if (this.captionMs <= 0) this.caption.setVisible(false);
    }
  }
}

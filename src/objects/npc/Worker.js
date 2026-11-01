import { TILE, DEPTH, TEXTURE_SCALE, TEXT_RESOLUTION, UI_FONT, COLORS } from '../../config/constants.js';
import WorkerBrain from '../../core/WorkerBrain.js';
import { inTorch } from '../../core/torch.js';

const BASE = 1 / TEXTURE_SCALE;
// The Partner's gaze (ITERATION_5 §3): 10 tiles ahead, 3 rows up or down, also in the air.
export const GAZE = { reach: 10 * TILE, above: 3 * TILE, below: 3 * TILE };
const PLANK_H = 10;
const LINES = ['Volevi un aggiornamento?', 'Sto finendo, giuro.', 'Mi guardi mentre lavoro? Ok.'];

// View + side effects of a junior building the scaffolding; decisions live in WorkerBrain (pure, tested).
// He builds one-way platforms (params.cells, in order) only while the Partner is not looking at him.
// Tell: dashed outline of the next platform, progress bar, crossed eye while watched.
export default class Worker {
  static type = 'worker';

  constructor(scene, def) {
    this.scene = scene;
    this.def = def;
    this.brain = new WorkerBrain(def.params);
    this.x = def.x * TILE + 16;
    this.floorY = (def.y + 1) * TILE;
  }

  build() {
    const scene = this.scene;
    this.npc = scene.add.image(this.x, this.floorY, 'player_junior', 'idle0').setOrigin(0.5, 1).setScale(BASE * 0.9).setDepth(DEPTH.player - 1);
    this.platforms = this.def.params.cells.map((c) => {
      const w = (c.w ?? 2) * TILE;
      const left = (this.def.x + c.dx) * TILE;
      const top = (this.def.y + c.dy) * TILE;
      const plank = scene.add.tileSprite(left, top, w, PLANK_H, 'scaffold').setOrigin(0, 0).setDepth(DEPTH.traps);
      plank.setTileScale(BASE).setVisible(false);
      scene.physics.add.existing(plank, true);
      // one-way: you land on it and jump through it from below
      Object.assign(plank.body.checkCollision, { down: false, left: false, right: false });
      plank.body.enable = false;
      scene.physics.add.collider(scene.player, plank);
      return { plank, rect: { left, top, w } };
    });
    this.outline = scene.add.graphics().setDepth(DEPTH.traps - 1);
    this.bar = scene.add.graphics().setDepth(DEPTH.fx);
    this.eye = scene.add.image(this.x + 12, this.floorY - 44, 'eyeOff').setScale(BASE).setDepth(DEPTH.fx).setVisible(false);
    this.bubble = scene.add
      .text(this.x, this.floorY - 52, '', { fontFamily: UI_FONT, fontSize: '9px', color: '#111827', backgroundColor: '#f8fafc', padding: { x: 4, y: 2 }, resolution: TEXT_RESOLUTION * 2 })
      .setOrigin(0.5, 1)
      .setDepth(DEPTH.fx)
      .setVisible(false);
    this.bubbleLeft = 0;
    this.lineIndex = 0;
    this.t = 0;
    this.drawOutline();
  }

  // Work done stays done: a death resets nothing here.
  reset() {}

  cancelCall() {}

  get watched() {
    const p = this.scene.player;
    const b = p.body;
    return inTorch({ x: b.center.x, feetY: b.bottom, facing: p.flipX ? -1 : 1 }, { x: this.x, feetY: this.floorY }, GAZE);
  }

  // The next platform would land on the player (or a junior): wait.
  nextBlocked() {
    const next = this.platforms[this.brain.built];
    if (!next) return false;
    const { left, top, w } = next.rect;
    const overlaps = (x, feet, head) => x + 9 > left && x - 9 < left + w && feet > top && head < top + PLANK_H;
    const b = this.scene.player.body;
    if (overlaps(b.center.x, b.bottom, b.top)) return true;
    return (this.scene.team?.followers ?? []).some((m) => overlaps(m.sprite.x, m.sprite.y, m.sprite.y - 26));
  }

  update(dt) {
    const scene = this.scene;
    this.t += dt;
    const watched = !this.brain.done && this.watched;
    for (const a of this.brain.update(dt, { watched, blocked: this.nextBlocked() })) {
      if (a.type === 'noticed') {
        this.say(LINES[this.lineIndex % LINES.length], 1500);
        this.lineIndex += 1;
        if (this.lineIndex === 1) scene.narrate('workerWatched');
      }
      if (a.type === 'build') {
        const { plank } = this.platforms[a.index];
        plank.setVisible(true);
        plank.body.enable = true;
        scene.playerView.dust.explode(5, plank.x + plank.width / 2, plank.y);
        this.drawOutline();
      }
      if (a.type === 'done') {
        this.say('Fatto! Posso andare a pranzo?', 1800);
        this.bar.clear();
      }
    }

    const sp = scene.player.body.center.x;
    this.npc.setFlipX(watched ? sp < this.x : this.t % 1600 < 800);
    this.npc.setFrame(this.brain.done ? 'idle0' : watched ? 'freeze' : `run${Math.floor(this.t / 120) % 4}`);
    this.eye.setVisible(watched);
    if (!this.brain.done) this.drawBar(watched);

    if (this.bubbleLeft > 0) {
      this.bubbleLeft -= dt;
      if (this.bubbleLeft <= 0) this.bubble.setVisible(false);
    }
  }

  say(text, ms) {
    this.bubble.setText(text).setVisible(true);
    this.bubbleLeft = ms;
  }

  drawBar(watched) {
    const w = 28;
    this.bar.clear();
    this.bar.fillStyle(0x111827, 0.85).fillRect(this.x - w / 2, this.floorY - 40, w, 4);
    this.bar.fillStyle(watched ? COLORS.grey : COLORS.green, 1).fillRect(this.x - w / 2, this.floorY - 40, w * this.brain.progress, 4);
  }

  // dashed outline where the next platform will appear
  drawOutline() {
    this.outline.clear();
    const next = this.platforms[this.brain.built];
    if (!next) return;
    const { left, top, w } = next.rect;
    this.outline.lineStyle(1.5, COLORS.postit, 0.6);
    for (let x = 0; x < w; x += 8) {
      this.outline.lineBetween(left + x, top, left + Math.min(x + 4, w), top);
      this.outline.lineBetween(left + x, top + PLANK_H, left + Math.min(x + 4, w), top + PLANK_H);
    }
  }
}

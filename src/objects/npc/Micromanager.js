import { TILE, DEPTH, TEXTURE_SCALE, TEXT_RESOLUTION, UI_FONT, COLORS } from '../../config/constants.js';
import MicromanagerBrain from '../../core/MicromanagerBrain.js';
import { TILE_EMPTY } from '../../core/LevelParser.js';

const BASE = 1 / TEXTURE_SCALE;
const BUBBLE_MS = 1800;

// View + side effects of the micromanager; all decisions live in MicromanagerBrain (pure, tested).
// Normal: every 6 s he checks on you; if you are still/slow and in sight he stops you and explains how he'd do it.
// Tell: visible gaze cone and a "…" bubble before each check. Escape: run, hide behind a plant, leave his zone.
// Pivoted: he walks ahead of you and points at the traps.
export default class Micromanager {
  static type = 'micromanager';

  constructor(scene, def, mode, level) {
    this.scene = scene;
    this.def = def;
    this.mode = mode;
    const p = def.params;
    const plants = level.plants
      .filter((pl) => pl.x >= p.zoneFrom && pl.x <= p.zoneTo)
      .map((pl) => ({ col: pl.x, row: pl.y }));
    // pits inside the zone: columns with no floor under his row
    const floorRow = p.floorRow ?? 14;
    const gaps = [];
    for (let c = p.zoneFrom; c <= p.zoneTo; c++) {
      if (level.tiles[floorRow + 1][c] !== TILE_EMPTY) continue;
      const last = gaps[gaps.length - 1];
      if (last && last[1] === c - 1) last[1] = c;
      else gaps.push([c, c]);
    }
    this.brain = new MicromanagerBrain({ ...p, plants, gaps }, mode);
    this.floorY = (this.brain.p.floorRow + 1) * TILE;
  }

  build() {
    const scene = this.scene;
    this.cone = scene.add.graphics().setDepth(DEPTH.objects);
    this.sprite = scene.add.image(this.brain.x, this.floorY, 'npc_micromanager', 'idle0').setOrigin(0.5, 1).setScale(BASE).setDepth(DEPTH.player - 1);
    this.bubble = scene.add
      .text(0, 0, '', { fontFamily: UI_FONT, fontSize: '9px', color: '#111827', backgroundColor: '#f8fafc', padding: { x: 4, y: 2 }, resolution: TEXT_RESOLUTION * 2, wordWrap: { width: 150 } })
      .setOrigin(0.5, 1)
      .setDepth(DEPTH.fx)
      .setVisible(false);
    this.hints = [];
    this.reset();
  }

  say(text, ms = BUBBLE_MS) {
    this.bubble.setText(text).setVisible(true);
    this.bubbleLeft = ms;
  }

  release() {
    this.scene.player.lockInput('mm', false);
  }

  cancelCall() {
    this.release();
  }

  reset() {
    this.release();
    this.brain.reset();
    this.bubbleLeft = 0;
    this.bubble.setVisible(false);
    this.sprite.setVisible(true).setAlpha(1).setAngle(0);
    this.t = 0;
    this.prevX = this.brain.x;
    for (const h of this.hints) h.destroy();
    this.hints = [];
    this.hinted = new Set();
  }

  update(dt) {
    const scene = this.scene;
    const player = scene.player;
    const body = player.body;
    this.t += dt;
    const actions = this.brain.update(dt, { x: body.center.x, y: body.bottom, vx: body.velocity.x, grounded: player.grounded, locked: player.inputLocked });
    for (const a of actions) this.handle(a);

    // view
    const b = this.brain;
    let x = b.x;
    let y = this.floorY;
    if (b.state === 'demo' && b.p.demoJump) {
      const k = b.demoProgress;
      const from = this.demoFromX;
      const to = b.p.demoJump.toCol * TILE + 16;
      if (b.demoSuccess) {
        x = from + (to - from) * k;
        y = this.floorY - Math.sin(k * Math.PI) * 70;
      } else {
        const mid = (from + to) / 2;
        x = from + (mid - from) * Math.min(1, k * 2);
        y = this.floorY - (k < 0.5 ? Math.sin(k * Math.PI) * 50 : -(k - 0.5) * 400);
        this.sprite.setAlpha(k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3);
      }
    }
    if (b.state === 'demo' && !b.p.demoJump) this.sprite.setScale(BASE, BASE * 0.85);
    else this.sprite.setScale(BASE);
    this.sprite.setVisible(b.state !== 'away');
    if (b.state !== 'demo' && b.state !== 'away') this.sprite.setAlpha(1);
    this.sprite.setPosition(x, y);
    this.sprite.setFlipX(b.facing < 0);
    const moving = Math.abs(x - this.prevX) > 0.1;
    this.sprite.setFrame(moving ? `run${Math.floor(this.t / 110) % 4}` : `idle${Math.floor(this.t / 400) % 2}`);
    this.prevX = x;

    this.cone.clear();
    if (this.mode === 'normal' && ['idle', 'watch', 'tell', 'dash'].includes(b.state)) {
      const eyeY = this.floorY - 32;
      const reach = b.p.sightRange * TILE * b.facing;
      this.cone.fillStyle(COLORS.postit, b.state === 'tell' ? 0.3 : 0.1);
      this.cone.fillTriangle(x + 6 * b.facing, eyeY, x + reach, eyeY - 56, x + reach, eyeY + 32);
    }

    if (this.bubbleLeft > 0) {
      this.bubbleLeft -= dt;
      this.bubble.setPosition(x, y - 44);
      if (this.bubbleLeft <= 0) this.bubble.setVisible(false);
    }

    if (this.mode === 'pivoted' && b.state === 'guide') this.pointAtTraps(x);
  }

  handle(a) {
    const scene = this.scene;
    const player = scene.player;
    switch (a.type) {
      case 'tell':
        this.say('…', this.brain.p.tellMs);
        break;
      case 'catch':
        player.lockInput('mm', true);
        player.stopMotion();
        this.say('Fermati un attimo. Spiegami cosa stai facendo.', this.brain.p.explainMs);
        scene.stats.recordIncident('micromanager');
        if (scene.spendGu(a.cost, 'micromanager')) return;
        scene.narrate('mmCatch');
        break;
      case 'release':
        this.release();
        scene.input.keyboard.resetKeys();
        break;
      case 'demoStart':
        this.demoFromX = this.brain.demoFrom;
        this.say(a.kind === 'sit' ? 'Io avrei aspettato meglio. Così, guarda.' : "Guarda, io l'avrei fatto così.");
        break;
      case 'demoEnd':
        scene.narrate(a.success ? 'mmDemoOk' : 'mmDemoFail');
        break;
      case 'guideStart':
        this.say('Ti faccio vedere come si fa.');
        scene.narrate('mmPivot');
        break;
      default:
        break;
    }
  }

  // Pivoted: mark each trap he walks past with a "!" (cosmetic hint).
  pointAtTraps(x) {
    for (const trap of this.scene.traps) {
      if (this.hinted.has(trap)) continue;
      const tx = trap.tx * TILE;
      if (Math.abs(tx - x) > 2 * TILE) continue;
      this.hinted.add(trap);
      this.say('Attento lì. Lo dico per te.');
      const mark = this.scene.add
        .text(tx + 16, (trap.ty - 3) * TILE, '!', { fontFamily: UI_FONT, fontStyle: 'bold', fontSize: '22px', color: '#facc15', resolution: TEXT_RESOLUTION * 2 })
        .setOrigin(0.5)
        .setDepth(DEPTH.fx);
      this.hints.push(mark);
    }
  }
}

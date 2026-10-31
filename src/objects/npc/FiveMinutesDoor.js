import { TILE, DEPTH, TEXTURE_SCALE, TEXT_RESOLUTION, UI_FONT } from '../../config/constants.js';
import FiveMinutesBrain, { tilesBetween } from '../../core/FiveMinutesBrain.js';

const BASE = 1 / TEXTURE_SCALE;
const HOOK_LINES = ['Hai 5 minuti? È una cosa veloce.', 'Volevo solo un parere su un Excel.', 'Anzi, condivido lo schermo.'];

// View + side effects of the "Hai 5 minuti?" colleague; decisions live in FiveMinutesBrain (pure, tested).
// Normal: he steps out of his door as you pass; touching him hooks you for 3 s. Jump over him or wait.
// Tell: "Ehi…" bubble at 6 tiles, door ajar with a shadow.
// Pivoted: touching him opens a shortcut through his door.
export default class FiveMinutesDoor {
  static type = 'fiveMinutes';

  constructor(scene, def, mode) {
    this.scene = scene;
    this.def = def;
    this.mode = mode;
    this.brain = new FiveMinutesBrain(def.params ?? {}, mode);
    this.x = def.x * TILE + 16;
    this.floorY = (def.y + 1) * TILE;
  }

  build() {
    const scene = this.scene;
    this.door = scene.add.image(this.x, this.floorY, 'door').setOrigin(0.5, 1).setScale(BASE).setDepth(DEPTH.objects);
    this.npc = scene.add.image(this.x, this.floorY, 'npc_colleague', 'idle0').setOrigin(0.5, 1).setScale(BASE).setDepth(DEPTH.player - 1).setFlipX(true);
    this.bubble = scene.add
      .text(this.x, this.floorY - 62, '', { fontFamily: UI_FONT, fontSize: '9px', color: '#111827', backgroundColor: '#fef3c7', padding: { x: 4, y: 2 }, resolution: TEXT_RESOLUTION * 2, wordWrap: { width: 150 } })
      .setOrigin(0.5, 1)
      .setDepth(DEPTH.fx);
    this.reset();
  }

  say(text) {
    this.bubble.setText(text).setVisible(text !== '');
  }

  release() {
    this.scene.player.lockInput('five', false);
  }

  cancelCall() {
    this.release();
  }

  reset() {
    this.release();
    this.brain.reset();
    this.hookedMs = 0;
    this.t = 0;
    this.door.setTexture('door');
    this.npc.setAlpha(0);
    this.say('');
  }

  touching() {
    if (!this.brain.isOut) return false;
    const b = this.scene.player.body;
    return b.right > this.x - 10 && b.left < this.x + 10 && b.bottom > this.floorY - 38 && b.top < this.floorY;
  }

  update(dt) {
    const player = this.scene.player;
    this.t += dt;
    const actions = this.brain.update(dt, { distTiles: tilesBetween(player.body.center.x, this.x), touching: this.touching() });
    for (const a of actions) this.handle(a);

    this.npc.setAlpha(this.brain.outAmount);
    this.npc.setFrame(`idle${Math.floor(this.t / 400) % 2}`);
    if (this.brain.state === 'hooked') {
      this.hookedMs += dt;
      this.say(HOOK_LINES[Math.floor(this.hookedMs / 1000) % HOOK_LINES.length]);
    }
  }

  handle(a) {
    const scene = this.scene;
    const player = scene.player;
    switch (a.type) {
      case 'notice':
        this.door.setTexture('doorAjar');
        this.say('Ehi…');
        break;
      case 'quiet':
        this.door.setTexture('door');
        this.say('');
        break;
      case 'hook':
        player.lockInput('five', true);
        player.stopMotion();
        this.hookedMs = 0;
        scene.stats.recordIncident('fiveMinutes');
        if (scene.spendGu(a.cost, 'fiveMinutes')) return;
        scene.narrate('fiveHook');
        break;
      case 'release':
        this.release();
        scene.input.keyboard.resetKeys();
        break;
      case 'goBack':
        this.say('');
        this.door.setTexture('door');
        break;
      case 'shortcutOffer': {
        const to = this.def.params?.shortcutTo;
        this.say('Passa di qua, conosco una scorciatoia.');
        scene.narrate('fiveShortcut');
        if (to) {
          const cam = scene.cameras.main;
          cam.flash(150, 255, 255, 255);
          player.body.reset(to.col * TILE + 16, (to.row + 1) * TILE - 16);
        }
        break;
      }
      default:
        break;
    }
  }
}

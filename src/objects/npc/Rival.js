import { TILE, DEPTH, TEXTURE_SCALE, TEXT_RESOLUTION, UI_FONT, PLAYER } from '../../config/constants.js';
import RivalBrain from '../../core/RivalBrain.js';

const BASE = 1 / TEXTURE_SCALE;
const STUN_MS = 300;
const GOAL_COST = 2;

// The "arrivista" (ITERATION_4 §5): races you to the goal. He steals one junior and the coffees he reaches first,
// leapfrogs you if he catches you, and lets you use his head as a platform. Never kills.
export default class Rival {
  static type = 'rival';

  constructor(scene, def) {
    this.scene = scene;
    this.def = def;
    this.brain = new RivalBrain(def.params);
    // the "presented your work" penalty is charged once per level, not after every respawn
    this.charged = false;
  }

  build() {
    const scene = this.scene;
    this.sprite = scene.add.image(this.brain.x, 0, 'npc_rival', 'idle0').setOrigin(0.5, 1).setScale(BASE).setDepth(DEPTH.player - 1);
    this.bubble = scene.add
      .text(0, 0, '', { fontFamily: UI_FONT, fontSize: '9px', color: '#111827', backgroundColor: '#ede9fe', padding: { x: 4, y: 2 }, resolution: TEXT_RESOLUTION * 2, wordWrap: { width: 160 } })
      .setOrigin(0.5, 1)
      .setDepth(DEPTH.fx)
      .setVisible(false);
    this.reset();
  }

  reset() {
    this.brain.reset();
    this.scene.player.lockInput('rival', false);
    this.stunLeft = 0;
    this.bubbleLeft = 0;
    this.bubble.setVisible(false);
    this.t = 0;
    this.bounceSaid = false;
    this.place();
  }

  cancelCall() {
    this.scene.player.lockInput('rival', false);
  }

  delegateTarget() {
    return null;
  }

  say(text, ms = 1600) {
    this.bubble.setText(text).setVisible(true);
    this.bubbleLeft = ms;
  }

  // Floor under x near his current height (overhead ledges are ignored).
  floorAt(x) {
    const tiles = this.scene.levelTiles;
    const col = Math.floor(x / TILE);
    const ref = this.lastFloor ?? (this.def.y + 1) * TILE;
    const from = Math.max(2, Math.floor(ref / TILE) - 1);
    for (let y = from; y < tiles.length; y++) if (tiles[y][col] !== -1) return y * TILE;
    return null;
  }

  place() {
    const x = this.brain.x;
    const floor = this.floorAt(x);
    // over a pit he hops (scripted, like the team): no physics, never falls
    const y = floor ?? (this.lastFloor ?? 15 * TILE) - 20;
    if (floor !== null) this.lastFloor = floor;
    this.sprite.setPosition(x, y);
    this.bubble.setPosition(x, y - 40);
    return y;
  }

  update(dt) {
    const scene = this.scene;
    const player = scene.player;
    const body = player.body;
    this.t += dt;
    const rivalTop = this.sprite.y - 36;
    const dx = body.center.x - this.brain.x;
    const onHead = body.velocity.y > 0 && Math.abs(dx) < 14 && body.bottom >= rivalTop - 6 && body.bottom <= rivalTop + 10;
    // he only leapfrogs a player standing on the floor: never a stop in mid-air over a pit
    const overlapping = player.grounded && Math.abs(dx) < 12 && Math.abs(body.bottom - this.sprite.y) < 10;
    const coffees = scene.pickups.map((p) => ({ x: p.sprite.x, taken: p.collected, ref: p }));
    const firstFollowerX = scene.team?.followers[0]?.sprite.x ?? null;
    const actions = this.brain.update(dt, { player: { x: body.center.x, onHead, overlapping }, coffees, firstFollowerX });
    for (const a of actions) this.handle(a);

    const y = this.place();
    const running = this.brain.state === 'running';
    this.sprite.setFrame(running ? `run${Math.floor(this.t / 70) % 4}` : `idle${Math.floor(this.t / 400) % 2}`);
    if (this.leapLeft > 0) {
      this.leapLeft -= dt;
      this.sprite.setY(y - Math.sin((1 - this.leapLeft / 400) * Math.PI) * 40);
    }
    if (this.stunLeft > 0) {
      this.stunLeft -= dt;
      if (this.stunLeft <= 0) player.lockInput('rival', false);
    }
    if (this.bubbleLeft > 0) {
      this.bubbleLeft -= dt;
      if (this.bubbleLeft <= 0) this.bubble.setVisible(false);
    }
  }

  handle(a) {
    const scene = this.scene;
    const player = scene.player;
    switch (a.type) {
      case 'start':
        this.say(this.def.params.atGoal ? 'Il cliente lo vedo io, ok?' : 'Arrivo! Se vi fermate, mi prendo qualcuno del team.');
        scene.narrate('rivalStart');
        break;
      case 'takeCoffee':
        if (a.coffee.ref.collect()) this.say('Grazie del caffè!');
        break;
      case 'stealJunior': {
        const m = scene.team?.followers[0];
        if (!m) break;
        scene.team.lose(m, true);
        this.say('Questo te lo prendo in prestito, ok?');
        scene.narrate('rivalSteal');
        break;
      }
      case 'headBounce':
        player.body.setVelocityY(-PLAYER.jumpVelocity * 0.95);
        if (!this.bounceSaid) {
          this.bounceSaid = true;
          this.say('Ehi! Il mio completo!');
        }
        break;
      case 'leapfrog':
        this.leapLeft = 400;
        player.lockInput('rival', true);
        player.stopMotion();
        this.stunLeft = STUN_MS;
        this.say('Permesso, permesso!');
        break;
      case 'arrived':
        if (scene.ended || !this.def.params.atGoal || this.charged) {
          if (!scene.ended && !this.def.params.atGoal) this.say('Io aspetto qui. Ho le mie conoscenze.');
          break;
        }
        this.charged = true;
        this.say("Il cliente ha già visto il lavoro. L'ho presentato io.", 3000);
        scene.narrate('rivalGoal');
        scene.spendGu(GOAL_COST, 'rival');
        break;
      default:
        break;
    }
  }
}

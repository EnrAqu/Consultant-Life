import { TILE, DEPTH, TEXTURE_SCALE, TEXT_RESOLUTION, UI_FONT } from '../../config/constants.js';
import SycophantBrain from '../../core/SycophantBrain.js';

const BASE = 1 / TEXTURE_SCALE;
const BUBBLE_MS = 2200;

// View + side effects of the sycophant (ITERATION_5 §4); decisions live in SycophantBrain (pure, tested).
// Not delegable, never blocks you. On a mat ("Prego, Partner") he bows and his back sends you 5 rows up.
export default class Sycophant {
  constructor(scene, mats) {
    this.scene = scene;
    this.mats = mats.map((m) => ({ x: m.x * TILE + 16, feetY: (m.y + 1) * TILE }));
    this.brain = new SycophantBrain();
    this.sprite = scene.add.image(0, 0, 'npc_sycophant', 'idle0').setOrigin(0.5, 1).setScale(BASE).setDepth(DEPTH.player - 1);
    this.bubble = scene.add
      .text(0, 0, '', { fontFamily: UI_FONT, fontSize: '9px', color: '#111827', backgroundColor: '#ede9fe', padding: { x: 4, y: 2 }, resolution: TEXT_RESOLUTION * 2, wordWrap: { width: 150 } })
      .setOrigin(0.5, 1)
      .setDepth(DEPTH.fx)
      .setVisible(false);
    this.bubbleLeft = 0;
    this.t = 0;
    this.bows = 0;
    this.bounces = 0;
    this.placeNearPlayer();
  }

  placeNearPlayer() {
    const b = this.scene.player.body;
    this.brain.placeAt(b.center.x - 40, b.bottom);
    this.sync();
  }

  say(text) {
    this.bubble.setText(text).setVisible(true);
    this.bubbleLeft = BUBBLE_MS;
  }

  update(dt) {
    const scene = this.scene;
    const player = scene.player;
    const b = player.body;
    this.t += dt;
    const input = { x: b.center.x, feetY: b.bottom, facing: player.flipX ? -1 : 1, vy: b.velocity.y, grounded: player.grounded };
    const prevX = this.brain.x;
    for (const a of this.brain.update(dt, { player: input, mats: this.mats })) {
      if (a.type === 'flatter' && this.brain.state !== 'bowing') this.say(a.text);
      if (a.type === 'bow') {
        this.say('Si appoggi pure, Partner!');
        if (this.bows === 0) scene.narrate('sycophantBow');
        this.bows += 1;
      }
      if (a.type === 'bounce' && !player.inputLocked) {
        // fixed height: feet snapped to his back, no fall gravity, and releasing the jump key does not cut it short
        b.y = a.feetY - b.height;
        b.setVelocityY(a.vy);
        b.setGravityY(0);
        player.jumpCutApplied = true;
        player.coyoteTimer = 0;
        scene.playerView.dust.explode(6, b.center.x, b.bottom);
        if (this.bounces === 0) this.say('Per lei, questo e altro!');
        this.bounces += 1;
      }
    }
    const moving = Math.abs(this.brain.x - prevX) > 0.1;
    this.walking = moving ? this.walking + dt : 0;
    this.sync(moving);
    if (this.bubbleLeft > 0) {
      this.bubbleLeft -= dt;
      if (this.bubbleLeft <= 0) this.bubble.setVisible(false);
    }
  }

  sync(moving = false) {
    const br = this.brain;
    const bowing = br.state === 'bowing';
    const px = this.scene.player.body.center.x;
    this.sprite.setPosition(br.x, br.feetY);
    this.sprite.setFlipX(bowing ? false : px < br.x);
    // bowing: bent down to backHeight, right on the mat
    this.sprite.setScale(BASE, bowing ? BASE * (br.p.backHeight / 40) : BASE);
    this.sprite.setFrame(bowing ? 'freeze' : moving ? `run${Math.floor(this.t / 90) % 4}` : 'idle0');
    this.bubble.setPosition(br.x, br.feetY - (bowing ? 28 : 46));
  }

  onRespawn() {
    this.placeNearPlayer();
  }
}

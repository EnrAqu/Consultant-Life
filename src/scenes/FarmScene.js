import Phaser from 'phaser';
import { TILE, DEPTH, FARM, FADE_MS as FARM_FADE_MS, TEXT_RESOLUTION, TEXTURE_SCALE, WORLD_ZOOM, UI_FONT, CAMERA_LERP, CAMERA_LOOK_AHEAD } from '../config/constants.js';
import { parseLevel, TILE_SOLID } from '../core/LevelParser.js';
import FarmDay, { progress, skyColor, sunsetColor } from '../core/FarmDay.js';
import { PHONE_MESSAGES, FINAL_MESSAGE } from '../data/farm.js';
import farm from '../levels/farm.js';
import Player from '../objects/Player.js';
import PlayerView from '../objects/PlayerView.js';
import { fadeIn, fadeTo, buildTileLayers } from './sceneUtils.js';
import { touch } from '../input/TouchControls.js';

const BASE = 1 / TEXTURE_SCALE;
const SUN_HIGH = 0.22;
const SUN_LOW = 0.62;
const label = (scene, x, y, str, size, color, extra = {}) =>
  scene.add.text(x, y, str, { fontFamily: UI_FONT, fontSize: `${size}px`, color, resolution: TEXT_RESOLUTION * 2, ...extra });

// The farm (docs/FARM.md): the extra level after a 100% burnout. No GU, standup, burnout, traps or deaths:
// chores, chickens, a phone that keeps buzzing, a pond to throw it in, a bench at sunset. Then the burnout ending.
export default class FarmScene extends Phaser.Scene {
  constructor() {
    super('FarmScene');
  }

  init(data) {
    // where the campaign ended (for the ending screen)
    this.from = data?.from ?? { levelId: 'level5', run: { deaths: 0, timeMs: 0 }, gu: 0, guMax: 0 };
  }

  create() {
    const level = parseLevel(farm);
    this.worldW = level.width * TILE;
    this.worldH = level.height * TILE;
    this.physics.world.setBounds(0, 0, this.worldW, this.worldH);
    this.physics.world.setBoundsCollision(true, true, false, false);
    // the office HUD sleeps here (GameScene wakes it up again)
    if (this.scene.isActive('UIScene')) this.scene.sleep('UIScene');

    this.layer = buildTileLayers(this, level.tiles, 'tilesFarmHD', (t, x, y, tiles) => {
      if (t !== TILE_SOLID) return -1;
      // hay above the ground line; grass on the ground's top row (under the bales too), dirt below
      if (y < 15) return 2;
      return y === 15 ? 1 : 0;
    });
    this.skyFromX = farm.skyFrom * TILE + 16;
    this.skyToX = farm.skyTo * TILE + 16;
    this.buildSky();

    const ents = farm.entities;
    this.day = new FarmDay({
      eggsTotal: ents.filter((e) => e.type === 'egg').length,
      vegTotal: ents.filter((e) => e.type === 'veg').length,
      messages: PHONE_MESSAGES,
      firstMs: FARM.phoneFirstMs,
      intervalMs: FARM.phoneIntervalMs,
      finalMessage: FINAL_MESSAGE,
    });
    this.buildProps(ents);

    this.player = new Player(this, level.spawn.x * TILE + 16, (level.spawn.y + 1) * TILE - 16);
    this.playerView = new PlayerView(this, this.player, 'farmer');
    this.physics.add.collider(this.player, this.layer);
    this.buildChores(ents);
    this.bench = this.physics.add.staticImage(level.goal.x * TILE + 16, (level.goal.y + 1) * TILE - 12, 'bench').setScale(BASE).setDepth(DEPTH.objects).refreshBody();
    this.physics.add.overlap(this.player, this.bench, () => this.sitDown());

    const cam = this.cameras.main;
    cam.setZoom(WORLD_ZOOM);
    cam.setBounds(0, 0, this.worldW, this.worldH);
    cam.startFollow(this.player, false, CAMERA_LERP, CAMERA_LERP);
    cam.setDeadzone(60, 70);
    this.lookAhead = 0;
    fadeIn(this);
    this.lastDelta = 16;
    const syncView = () => {
      this.playerView.update(this.lastDelta, false);
      this.updateCamera(this.lastDelta);
    };
    this.events.on('postupdate', syncView);

    this.keys = this.input.keyboard.addKeys('LEFT,RIGHT,UP,A,D,W,Z,SPACE,E,SHIFT');
    this.throwQueued = false;
    const queueThrow = () => {
      this.throwQueued = true;
    };
    this.input.keyboard.on('keydown-E', queueThrow);
    this.input.keyboard.on('keydown-SHIFT', queueThrow);

    // what the HUD reads (pull model, FarmHudScene)
    this.notification = null;
    this.inPondZone = false;
    this.ending = false;
    this.endLine = '';
    touch.setVisible(true);
    touch.setDelegateReady(false);
    this.scene.launch('FarmHudScene');
    this.events.once('shutdown', () => {
      this.events.off('postupdate', syncView);
      touch.setDelegateReady(false);
      touch.setVisible(false);
      this.scene.stop('FarmHudScene');
    });
  }

  // ---------- building ----------

  buildSky() {
    this.cameras.main.setBackgroundColor(skyColor(0));
    // the sun stays on screen (scroll factor 0): placed in canvas coordinates through the camera zoom
    this.sun = this.add.image(0, 0, 'sun').setScale(BASE * 1.6).setScrollFactor(0).setDepth(DEPTH.background);
    this.sunT = 0;
    this.placeSun(SUN_HIGH);
    const hillsH = 90;
    this.add
      .tileSprite(0, 15 * TILE - hillsH + 8, this.worldW, hillsH, 'bgHills')
      .setOrigin(0, 0)
      .setScrollFactor(0.3, 1)
      .setTileScale(BASE)
      .setDepth(DEPTH.background + 1);
  }

  // `yRatio` of the view height (0 = top); the sun sits at 72% of the view width
  placeSun(yRatio) {
    const cam = this.cameras.main;
    const z = cam.zoom || WORLD_ZOOM;
    const toWorld = (screen, size) => (screen - size / 2) / z + size / 2;
    this.sun.setPosition(toWorld(cam.width * 0.72, cam.width), toWorld(cam.height * yRatio, cam.height));
  }

  buildProps(ents) {
    for (const e of ents) {
      const fx = e.x * TILE + 16;
      const floor = (e.y + 1) * TILE;
      if (e.type === 'sign') {
        label(this, e.x * TILE, floor - 40, e.text, 12, '#111827', { backgroundColor: '#fef3c7', padding: { x: 6, y: 4 } })
          .setOrigin(0, 1)
          .setDepth(DEPTH.objects);
      }
      if (e.type === 'coop') this.add.image(fx, floor, 'coop').setOrigin(0.5, 1).setScale(BASE).setDepth(DEPTH.objects - 1);
      if (e.type === 'scarecrow') {
        // the scarecrow wears the Partner's clothes (and the straw shows)
        this.add.image(fx, floor, 'pole').setOrigin(0.5, 1).setScale(BASE).setDepth(DEPTH.objects);
        this.add.image(fx, floor - 14, 'player_partner', 'idle0').setOrigin(0.5, 1).setScale(BASE).setDepth(DEPTH.objects);
        this.add.image(fx, floor - 14 - 36, 'tilesFarmHD', 'hay').setScale(BASE * 0.3).setDepth(DEPTH.objects + 1);
      }
      if (e.type === 'pond') {
        const left = e.x * TILE;
        const w = e.params.w * TILE;
        const g = this.add.graphics().setDepth(DEPTH.tiles + 1);
        g.fillStyle(0x0369a1, 1).fillEllipse(left + w / 2, floor + 4, w, 14);
        g.fillStyle(0x38bdf8, 1).fillEllipse(left + w / 2, floor + 3, w - 10, 9);
        g.fillStyle(0xe0f2fe, 0.7).fillRect(left + w * 0.3, floor + 1, 14, 1.5).fillRect(left + w * 0.6, floor + 4, 10, 1.5);
        this.pond = { cx: left + w / 2, cy: floor + 3, zoneFrom: e.params.zoneFrom * TILE, zoneTo: (e.params.zoneTo + 1) * TILE };
        this.pondPrompt = label(this, left + w / 2, floor - 70, '', 12, '#fef3c7', { fontStyle: 'bold', backgroundColor: '#0c4a6e', padding: { x: 6, y: 3 } })
          .setOrigin(0.5, 1)
          .setDepth(DEPTH.fx)
          .setVisible(false);
      }
    }
    // chickens: deterministic back-and-forth, no body
    this.chickens = ents
      .filter((e) => e.type === 'chicken')
      .map((e) => ({
        x0: e.x * TILE + 16,
        ...e.params,
        sprite: this.add.image(e.x * TILE + 16, (e.y + 1) * TILE, 'chicken', 'walk').setOrigin(0.5, 1).setScale(BASE).setDepth(DEPTH.objects),
      }));
    this.t = 0;
  }

  buildChores(ents) {
    this.chores = ents
      .filter((e) => e.type === 'egg' || e.type === 'veg')
      .map((e) => {
        const key = e.type === 'egg' ? 'egg' : e.params.kind;
        const baseY = (e.y + 1) * TILE - 10;
        const sprite = this.physics.add.staticImage(e.x * TILE + 16, baseY, key).setScale(BASE).setDepth(DEPTH.objects).refreshBody();
        const chore = { type: e.type, sprite, baseY, phase: e.x };
        this.physics.add.overlap(this.player, sprite, () => this.collect(chore));
        return chore;
      });
  }

  // ---------- actions ----------

  collect(chore) {
    if (chore.taken || this.ending) return;
    chore.taken = true;
    chore.sprite.disableBody(true, true);
    this.day.collect(chore.type);
    this.floatText(chore.type === 'egg' ? '+1 uovo' : '+1 ortaggio', chore.sprite.x, chore.sprite.y - 12, '#fef3c7');
  }

  throwPhone() {
    if (!this.day.throwPhone()) return;
    this.notification = null;
    touch.setDelegateReady(false);
    this.pondPrompt?.setVisible(false);
    const phone = this.add.image(this.player.x, this.player.y - 10, 'phone').setScale(BASE).setDepth(DEPTH.fx);
    const { cx, cy } = this.pond;
    const x0 = phone.x;
    const y0 = phone.y;
    // a little arc into the middle of the pond (cosmetic)
    this.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 700,
      onUpdate: (tw) => {
        const k = tw.getValue();
        phone.setPosition(x0 + (cx - x0) * k, y0 + (cy - y0) * k - Math.sin(k * Math.PI) * 60).setAngle(k * 540);
      },
      onComplete: () => {
        phone.destroy();
        const splash = this.add.particles(cx, cy, 'dust', { speed: { min: 40, max: 110 }, angle: { min: 230, max: 310 }, lifespan: 350, gravityY: 300, scale: { start: BASE, end: 0 }, tint: 0x7dd3fc, emitting: false }).setDepth(DEPTH.fx);
        splash.explode(14);
        this.time.delayedCall(800, () => splash.destroy());
        this.floatText('blub.', cx, cy - 20, '#e0f2fe', 1400);
      },
    });
  }

  sitDown() {
    if (this.ending) return;
    this.ending = true;
    const p = this.player;
    // with the phone still in your pocket you read its last message (phone pose); without it, you just watch the sunset
    if (!this.day.phoneThrown) p.lockInput('bench', true);
    p.stopMotion();
    p.setFlipX(false);
    this.summary = this.day.finish();
    this.notification = this.summary.lastMessage ? { ...this.summary.lastMessage, leftMs: FARM.notificationMs } : null;
    this.pondPrompt?.setVisible(false);
    touch.setDelegateReady(false);
    this.endLine = 'Fine giornata.';
    const cam = this.cameras.main;
    const sunFrom = this.sunT;
    this.tweens.addCounter({
      from: 0,
      to: 1,
      duration: FARM.sunsetMs,
      onUpdate: (tw) => {
        const k = tw.getValue();
        cam.setBackgroundColor(sunsetColor(k));
        this.placeSun(sunFrom + (1.05 - sunFrom) * k);
      },
      onComplete: () => {
        this.scene.get('FarmHudScene')?.cameras.main.fadeOut(FARM_FADE_MS, 0, 0, 0);
        fadeTo(this, 'EndingScene', { ending: 'burnout', ...this.from, farm: this.summary });
      },
    });
  }

  floatText(str, x, y, color, ms = 900) {
    // outlined: readable on the light sky and over the signs
    const fx = label(this, x, y, str, 11, color, { fontStyle: 'bold', stroke: '#1f2937', strokeThickness: 3 }).setOrigin(0.5).setDepth(DEPTH.fx + 1);
    this.tweens.add({ targets: fx, y: y - 14, alpha: 0, duration: ms, onComplete: () => fx.destroy() });
  }

  // ---------- loop ----------

  readInput() {
    const k = this.keys;
    const JD = Phaser.Input.Keyboard.JustDown;
    const t = touch.state;
    const jumpPressed = JD(k.SPACE) | JD(k.UP) | JD(k.W) | JD(k.Z) | touch.take('jump');
    // nothing to restart here: the ↺ button is simply ignored
    touch.take('restart');
    return {
      left: k.LEFT.isDown || k.A.isDown || t.left,
      right: k.RIGHT.isDown || k.D.isDown || t.right,
      jumpPressed: Boolean(jumpPressed),
      jumpHeld: k.SPACE.isDown || k.UP.isDown || k.W.isDown || k.Z.isDown || t.jumpHeld,
      throwPhone: this.throwQueued || touch.take('delegate'),
    };
  }

  update(_, delta) {
    const dt = Math.min(delta, 50);
    this.lastDelta = dt;
    this.t += dt;
    for (const c of this.chickens) {
      const a = (this.t / c.periodMs) * Math.PI * 2 + c.phase;
      c.sprite.x = c.x0 + Math.sin(a) * c.range * TILE;
      c.sprite.setFlipX(Math.cos(a) < 0);
      // a peck now and then, at the turning points
      c.sprite.setFrame(Math.abs(Math.cos(a)) < 0.25 ? 'peck' : 'walk');
    }
    for (const c of this.chores) if (!c.taken) c.sprite.y = c.baseY + Math.sin((this.t / 900) * Math.PI * 2 + c.phase) * 1.5;
    if (this.notification) {
      this.notification.leftMs -= dt;
      if (this.notification.leftMs <= 0) this.notification = null;
    }

    const input = this.readInput();
    this.throwQueued = false;
    if (this.ending) {
      this.player.update(dt, { left: false, right: false, jumpPressed: false, jumpHeld: false });
      return;
    }
    if (!this.day.started && (input.left || input.right || input.jumpPressed)) this.day.start();
    this.player.update(dt, input);

    const message = this.day.update(dt);
    if (message) {
      this.notification = { ...message, leftMs: FARM.notificationMs };
      this.floatText('bzz bzz', this.player.x, this.player.y - 26, '#f8fafc', 700);
    }

    const px = this.player.body.center.x;
    this.inPondZone = !this.day.phoneThrown && px >= this.pond.zoneFrom && px < this.pond.zoneTo;
    touch.setDelegateReady(this.inPondZone);
    this.pondPrompt.setText(touch.enabled ? 'Tocca E: butta il telefono' : 'E: butta il telefono nello stagno').setVisible(this.inPondZone);
    if (input.throwPhone && this.inPondZone) this.throwPhone();

    // the sky turns golden and the sun goes down as you walk towards the bench
    this.sunT = SUN_HIGH + (SUN_LOW - SUN_HIGH) * progress(px, this.skyFromX, this.skyToX);
    this.cameras.main.setBackgroundColor(skyColor(progress(px, this.skyFromX, this.skyToX)));
    this.placeSun(this.sunT);
  }

  updateCamera(dt) {
    const cam = this.cameras.main;
    const k = 1 - Math.pow(1 - CAMERA_LERP, dt / (1000 / 60));
    cam.setLerp(k, k);
    const vx = this.player.body.velocity.x;
    const target = Math.abs(vx) > 40 ? Math.sign(vx) * CAMERA_LOOK_AHEAD : this.lookAhead;
    this.lookAhead += (target - this.lookAhead) * Math.min(1, dt / 400);
    cam.setFollowOffset(-this.lookAhead, 0);
  }
}

import Phaser from 'phaser';
import { TILE, DEPTH, BUDGET, STANDUP, DEATH_FREEZE_MS, LEVEL_COMPLETE_DELAY_MS, IDLE_MS, TEXT_RESOLUTION, TEXTURE_SCALE, WORLD_ZOOM, UI_FONT } from '../config/constants.js';
import { DEBUG } from '../config/debug.js';
import { LEVELS, nextLevel } from '../levels/index.js';
import { parseLevel, TILE_ONEWAY, TILE_SOLID } from '../core/LevelParser.js';
import { resolveLevel } from '../core/pivot.js';
import Budget from '../core/Budget.js';
import StandupSchedule from '../core/StandupSchedule.js';
import { formatGu } from '../core/format.js';
import { CAUSES } from '../data/causes.js';
import { bus, EV, listen } from '../events/EventBus.js';
import { stats, narrator, leaderboard } from '../state.js';
import Player from '../objects/Player.js';
import PlayerView from '../objects/PlayerView.js';
import { OUTFITS } from '../data/outfits.js';
import { fadeIn, fadeTo } from './sceneUtils.js';
import Pickup from '../objects/Pickup.js';
import Checkpoint from '../objects/Checkpoint.js';
import { TRAP_CLASSES } from '../objects/traps/index.js';
import { NPC_CLASSES } from '../objects/npc/index.js';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  init(data) {
    this.levelId = data?.levelId ?? 'level1';
    this.pivotCause = data?.pivotCause ?? null;
    this.stats = stats;
    this.debugMode = DEBUG.debug;
  }

  create() {
    const def = resolveLevel(LEVELS[this.levelId], this.pivotCause);
    const level = parseLevel(def);
    this.def = def;
    this.worldW = level.width * TILE;
    this.worldH = level.height * TILE;
    this.physics.world.setBounds(0, 0, this.worldW, this.worldH);
    this.physics.world.setBoundsCollision(true, true, false, false);

    this.buildTilemap(level);
    this.buildObjects(level);
    this.buildTraps(def);

    this.spawnPoint = { x: level.spawn.x * TILE + 16, y: (level.spawn.y + 1) * TILE - 16 };
    const cp = this.checkpoints.find((c) => c.id === DEBUG.cp);
    if (cp) {
      cp.activate();
      this.spawnPoint = cp.spawn;
    }
    this.player = new Player(this, this.spawnPoint.x, this.spawnPoint.y);
    this.outfit = OUTFITS[DEBUG.outfit] ? DEBUG.outfit : def.career ?? 'junior';
    this.playerView = new PlayerView(this, this.player, this.outfit);
    this.buildNpcs(def, level);
    this.registerColliders();

    const cam = this.cameras.main;
    cam.setZoom(WORLD_ZOOM);
    cam.setBounds(0, 0, this.worldW, this.worldH);
    cam.startFollow(this.player, false, 0.12, 0.12);
    cam.setDeadzone(120, 80);
    fadeIn(this);
    this.lastDelta = 16;
    const syncView = () => this.playerView.update(this.lastDelta, this.pauseReasons.size > 0);
    this.events.on('postupdate', syncView);
    this.events.once('shutdown', () => this.events.off('postupdate', syncView));

    this.keys = this.input.keyboard.addKeys('LEFT,RIGHT,UP,A,D,W,Z,SPACE,R');

    this.budget = new Budget(DEBUG.gu ?? def.startGu);
    this.schedule = new StandupSchedule(STANDUP, {
      startMinutes: DEBUG.clock ?? STANDUP.clockStart,
      speed: DEBUG.clockSpeed,
      enabled: !DEBUG.standupOff,
    });
    this.stats.startRun(this.levelId);
    this.pauseReasons = new Set();
    this.ended = false;
    this.budgetLowSaid = false;
    this.idleMs = 0;
    this.idleSaid = false;
    this.firstMoveSent = false;
    this.lastNarration = null;


    listen(this, { [EV.UI_READY]: () => this.emitSnapshot() });
    this.emitSnapshot();
    this.narrate(this.pivotCause ? 'levelStartPivot' : 'levelStart', { pivotLabel: CAUSES[this.pivotCause]?.label });
  }

  // ---------- building ----------

  buildTilemap(level) {
    const map = this.make.tilemap({ data: level.tiles, tileWidth: TILE, tileHeight: TILE });
    const tileset = map.addTilesetImage('tiles', 'tiles', TILE, TILE, 0, 0);
    // collision only: the visible tiles are drawn in HD by a blitter
    this.layer = map.createLayer(0, tileset, 0, 0).setVisible(false);
    this.layer.setCollision([0, TILE_ONEWAY]);
    this.layer.forEachTile((tile) => {
      if (tile.index === TILE_ONEWAY) tile.setCollision(false, false, true, false);
    });

    const bg = this.add.tileSprite(0, 0, this.worldW, this.worldH, 'bgWindows').setOrigin(0, 0).setScrollFactor(0.3, 1);
    bg.setTileScale(1 / TEXTURE_SCALE).setDepth(DEPTH.background);
    // HD visual layer: a second tilemap with big tiles, scaled down to the logical grid
    const visual = level.tiles.map((row, y) =>
      row.map((t, x) => {
        if (t === TILE_SOLID) return y > 0 && level.tiles[y - 1][x] === TILE_SOLID ? 0 : 1;
        return t === TILE_ONEWAY ? 2 : -1;
      }),
    );
    const hd = TILE * TEXTURE_SCALE;
    const vmap = this.make.tilemap({ data: visual, tileWidth: hd, tileHeight: hd });
    const vset = vmap.addTilesetImage('tilesHD', 'tilesHD', hd, hd, 0, 0);
    vmap.createLayer(0, vset, 0, 0).setScale(1 / TEXTURE_SCALE).setDepth(DEPTH.tiles);
  }

  buildObjects(level) {
    this.spikes = this.physics.add.staticGroup();
    for (const s of level.spikes) {
      this.add.image(s.x * TILE + 16, s.y * TILE + 16, 'spike').setScale(1 / TEXTURE_SCALE).setDepth(DEPTH.objects);
      // hitbox 28×12 at the base of the tile
      const zone = this.add.zone(s.x * TILE + 16, s.y * TILE + 26, 28, 12);
      this.physics.add.existing(zone, true);
      this.spikes.add(zone);
    }
    // plants: hiding spots from the micromanager, drawn in front of the player
    for (const pl of level.plants) {
      this.add.image(pl.x * TILE + 16, (pl.y + 1) * TILE, 'plant').setOrigin(0.5, 1).setScale(1 / TEXTURE_SCALE).setDepth(DEPTH.player + 1);
    }
    this.pickups = level.pickups.map((p) => new Pickup(this, p.x, p.y));
    this.checkpoints = level.checkpoints.map((c) => new Checkpoint(this, c));
    this.goal = this.physics.add.staticImage(level.goal.x * TILE + 16, (level.goal.y + 1) * TILE - 32, 'goal').setScale(1 / TEXTURE_SCALE).setDepth(DEPTH.objects).refreshBody();
    this.add
      .text(level.goal.x * TILE + 16, (level.goal.y + 1) * TILE - 80, 'Consegna al cliente', { fontFamily: UI_FONT, fontSize: '12px', color: '#e5e7eb', resolution: TEXT_RESOLUTION * 2 })
      .setOrigin(0.5)
      .setDepth(DEPTH.objects);
    for (const e of level.entities.filter((en) => en.type === 'sign')) {
      const t = this.add
        .text(e.x * TILE, e.y * TILE, e.text, { fontFamily: UI_FONT, fontSize: '12px', color: '#111827', backgroundColor: '#f8fafc', padding: { x: 6, y: 4 }, resolution: TEXT_RESOLUTION * 2 })
        .setOrigin(0, 1)
        .setDepth(DEPTH.objects);
      t.setY((e.y + 1) * TILE - 40);
    }
  }

  buildNpcs(def, level) {
    this.npcs = def.entities
      .filter((e) => NPC_CLASSES[e.type])
      .map((e) => {
        const npc = new NPC_CLASSES[e.type](this, e, e.mode, level);
        npc.build();
        return npc;
      });
  }

  buildTraps(def) {
    this.traps = def.entities
      .filter((e) => TRAP_CLASSES[e.type])
      .map((e) => {
        const trap = new TRAP_CLASSES[e.type](this, e, e.mode);
        trap.build();
        return trap;
      });
  }

  registerColliders() {
    const player = this.player;
    this.physics.add.collider(player, this.layer);
    this.physics.add.overlap(player, this.spikes, () => this.die('spike'));
    for (const p of this.pickups) {
      this.physics.add.overlap(player, p.sprite, () => {
        if (!p.collect()) return;
        this.stats.recordPickup('coffee');
        this.gainGu(BUDGET.coffeeBonus, 'coffee');
        bus.emit(EV.TOAST, { text: `Caffè: +${formatGu(BUDGET.coffeeBonus)} GU`, durationMs: 1200 });
      });
    }
    for (const c of this.checkpoints) {
      this.physics.add.overlap(player, c.sprite, () => {
        if (!c.activate()) return;
        this.spawnPoint = c.spawn;
        bus.emit(EV.TOAST, { text: 'Checkpoint: pausa caffè registrata', durationMs: 2000 });
        this.narrate('checkpoint');
      });
    }
    this.physics.add.overlap(player, this.goal, () => this.completeLevel());

    for (const trap of this.traps) {
      const objects = trap.objectGroup;
      this.physics.add.collider(player, objects, null, (_, obj) => obj.getData('state') === 'landed');
      this.physics.add.overlap(player, objects, () => this.die(trap.type), (_, obj) => obj.getData('lethal') && obj.getData('state') === 'falling');
      for (const solid of trap.solids) this.physics.add.collider(player, solid, () => trap.onSolidContact());
      for (const zone of trap.triggers) this.physics.add.overlap(player, zone, () => !player.isDead && trap.onTrigger(player));
      for (const kz of trap.killZones) {
        this.physics.add.overlap(player, kz.zone, () => {
          const cause = kz.check();
          if (cause) this.die(cause);
        });
      }
    }
  }

  // ---------- state helpers ----------

  emitSnapshot() {
    bus.emit(EV.LEVEL_START, { levelId: this.levelId, name: this.def.name, career: OUTFITS[this.outfit].title, startGu: this.budget.max, pivotCause: this.pivotCause });
    bus.emit(EV.GU_CHANGED, { gu: this.budget.gu, max: this.budget.max, delta: 0, reason: 'snapshot' });
    bus.emit(EV.CLOCK_TICK, { label: this.schedule.clockLabel, warning: this.schedule.isWarning });
    if (this.lastNarration) bus.emit(EV.NARRATE, this.lastNarration);
  }

  narrate(event, ctx = {}) {
    const run = this.stats.getRun();
    const line = narrator.pick(event, {
      levelId: this.levelId,
      runDeaths: run.deaths,
      totalDeaths: this.stats.getPersistent().totalDeaths,
      gu: formatGu(this.budget?.gu ?? 0),
      guMax: this.budget?.max,
      ...ctx,
    });
    if (!line) return;
    this.lastNarration = { ...line, event, durationMs: 3000 };
    bus.emit(EV.NARRATE, this.lastNarration);
  }

  // Single entry point for GU losses (plan §14.1). Returns true if the budget is over.
  spendGu(amount, cause) {
    if (DEBUG.god) return false;
    const delta = this.budget.spend(amount);
    this.stats.recordGuLoss(cause, amount);
    bus.emit(EV.GU_CHANGED, { gu: this.budget.gu, max: this.budget.max, delta, reason: cause });
    if (!this.budgetLowSaid && this.budget.ratio() <= 0.25 && !this.budget.isOver()) {
      this.budgetLowSaid = true;
      this.narrate('budgetLow');
    }
    if (this.budget.isOver()) {
      this.budgetOver();
      return true;
    }
    return false;
  }

  gainGu(amount, reason) {
    const delta = this.budget.gain(amount);
    bus.emit(EV.GU_CHANGED, { gu: this.budget.gu, max: this.budget.max, delta, reason });
  }

  addPause(reason) {
    this.pauseReasons.add(reason);
    this.physics.pause();
  }

  removePause(reason) {
    this.pauseReasons.delete(reason);
    if (this.pauseReasons.size === 0 && !this.ended) this.physics.resume();
  }

  // ---------- loop ----------

  readInput() {
    const k = this.keys;
    const JD = Phaser.Input.Keyboard.JustDown;
    const jumpPressed = JD(k.SPACE) || JD(k.UP) || JD(k.W) || JD(k.Z);
    return {
      left: k.LEFT.isDown || k.A.isDown,
      right: k.RIGHT.isDown || k.D.isDown,
      jumpPressed,
      jumpHeld: k.SPACE.isDown || k.UP.isDown || k.W.isDown || k.Z.isDown,
      restart: JD(k.R),
    };
  }

  update(_, delta) {
    const dt = Math.min(delta, 50);
    this.lastDelta = dt;
    if (this.ended) return;

    for (const ev of this.schedule.update(dt)) this.handleSchedule(ev);

    const input = this.readInput();
    if (this.pauseReasons.size > 0) return;

    if (input.restart) {
      this.die('selfRestart');
      return;
    }
    if (!this.firstMoveSent && (input.left || input.right || input.jumpPressed)) {
      this.firstMoveSent = true;
      bus.emit(EV.FIRST_MOVE);
    }

    this.player.update(dt, input);
    for (const trap of this.traps) trap.update(dt);
    for (const npc of this.npcs) npc.update(dt);
    for (const p of this.pickups) p.update(dt);

    if (this.player.y > this.worldH + 64) this.die('pit');

    this.idleMs = input.left || input.right ? 0 : this.idleMs + dt;
    if (this.idleMs >= IDLE_MS && !this.idleSaid) {
      this.idleSaid = true;
      this.narrate('idle');
    }
    this.stats.addTime(dt);

    if (this.debugMode) {
      const b = this.player.body;
      bus.emit(
        EV.DEBUG,
        `fps ${Math.round(this.game.loop.actualFps)}  grounded ${this.player.grounded}  coyote ${Math.max(0, Math.round(this.player.coyoteTimer))}  buffer ${Math.max(0, Math.round(this.player.jumpBufferTimer))}\n` +
          `v ${Math.round(b.velocity.x)},${Math.round(b.velocity.y)}  tile ${Math.floor(this.player.x / TILE)},${Math.floor(this.player.y / TILE)}  anim ${this.playerView.anim}`,
      );
    }
  }

  handleSchedule(ev) {
    if (ev.type === 'tick') bus.emit(EV.CLOCK_TICK, { label: ev.label, warning: ev.warning });
    if (ev.type === 'warning') {
      bus.emit(EV.STANDUP_WARNING, ev);
      bus.emit(EV.TOAST, {
        text: ev.overrun ? '[Calendario] Daily standup tra 3 minuti (si è aggiunto il cliente)' : '[Calendario] Daily standup tra 3 minuti',
        durationMs: 2500,
        color: '#f97316',
      });
    }
    if (ev.type === 'start') {
      this.addPause('standup');
      bus.emit(EV.STANDUP_START, ev);
      this.narrate(ev.overrun ? 'standupOverrun' : 'standupStart');
    }
    if (ev.type === 'end') {
      this.player.stopMotion();
      this.input.keyboard.resetKeys();
      bus.emit(EV.STANDUP_END, ev);
      this.removePause('standup');
    }
  }

  // ---------- death / respawn / end ----------

  die(cause) {
    if (this.player.isDead || this.ended) return;
    if (DEBUG.god) {
      if (cause === 'pit' || cause === 'selfRestart') this.player.respawnAt(this.spawnPoint.x, this.spawnPoint.y);
      return;
    }
    const player = this.player;
    player.isDead = true;
    for (const trap of this.traps) trap.cancelCall();
    for (const npc of this.npcs) npc.cancelCall();
    this.playerView.onDeath();
    this.cameras.main.shake(120, 0.006);
    const fx = this.add
      .text(player.x, player.y - 24, `-${formatGu(BUDGET.deathCost)} GU`, { fontFamily: UI_FONT, fontStyle: 'bold', fontSize: '12px', color: '#f87171', resolution: TEXT_RESOLUTION * 2 })
      .setOrigin(0.5)
      .setDepth(DEPTH.fx);
    this.time.delayedCall(700, () => fx.destroy());
    this.addPause('death');

    const r = this.stats.recordDeath({ cause, x: player.x, y: Math.min(player.y, this.worldH) });
    bus.emit(EV.PLAYER_DIED, { cause, ...r });
    this.narrate('death', { cause, causeLabel: CAUSES[cause]?.label, spotCount: r.spotCount, causeDeaths: r.causeDeaths, runDeaths: r.deathsThisRun, totalDeaths: r.totalDeaths });
    if (this.spendGu(BUDGET.deathCost, cause)) return;
    this.time.delayedCall(DEATH_FREEZE_MS, () => this.respawn());
  }

  respawn() {
    if (this.ended) return;
    for (const trap of this.traps) trap.reset();
    for (const npc of this.npcs) npc.reset();
    this.player.respawnAt(this.spawnPoint.x, this.spawnPoint.y);
    this.playerView.onRespawn();
    this.cameras.main.centerOn(this.player.x, this.player.y);
    this.input.keyboard.resetKeys();
    this.idleMs = 0;
    this.idleSaid = false;
    this.removePause('death');
  }

  endLevel() {
    this.ended = true;
    this.physics.pause();
    for (const trap of this.traps) trap.cancelCall();
    for (const npc of this.npcs) npc.cancelCall();
  }

  budgetOver() {
    if (this.ended) return;
    this.endLevel();
    this.stats.failRun();
    this.narrate('budgetOver');
    const runStats = { ...this.stats.getRun(), dominant: this.stats.dominantPivotCause() };
    bus.emit(EV.BUDGET_OVER, { levelId: this.levelId, runStats });
    this.time.delayedCall(600, () => fadeTo(this, 'BudgetOverScene', { levelId: this.levelId, pivotCause: this.pivotCause, runStats }));
  }

  completeLevel() {
    if (this.player.isDead || this.ended) return;
    this.endLevel();
    this.stats.completeRun();
    this.narrate('levelComplete');
    const run = this.stats.getRun();
    // debug runs (checkpoints, god mode, custom budget…) never enter the leaderboard
    const ranks = DEBUG.anyOverride ? null : leaderboard.record({ levelId: this.levelId, timeMs: Math.round(run.timeMs), deaths: run.deaths, guLeft: this.budget.gu });
    const next = nextLevel(this.levelId);
    const payload = { levelId: this.levelId, next, run, ranks, dominant: this.stats.dominantPivotCause(), gu: this.budget.gu, guMax: this.budget.max };
    bus.emit(EV.LEVEL_COMPLETE, payload);
    this.time.delayedCall(LEVEL_COMPLETE_DELAY_MS, () => {
      fadeTo(this, next ? 'LessonsLearnedScene' : 'MvpEndScene', payload);
    });
  }
}

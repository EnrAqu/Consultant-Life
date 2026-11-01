import Phaser from 'phaser';
import { TILE, DEPTH, BUDGET, BURNOUT, STANDUP, DEATH_FREEZE_MS, LEVEL_COMPLETE_DELAY_MS, IDLE_MS, TEXT_RESOLUTION, TEXTURE_SCALE, WORLD_ZOOM, UI_FONT, CAMERA_LERP, CAMERA_LOOK_AHEAD, CAMERA_LOOK_UP, CAMERA_LOOK_DOWN } from '../config/constants.js';
import { DEBUG } from '../config/debug.js';
import { LEVELS, nextLevel, LEVEL_ORDER } from '../levels/index.js';
import { parseLevel, TILE_ONEWAY, TILE_SOLID } from '../core/LevelParser.js';
import { resolveLevel } from '../core/pivot.js';
import Budget from '../core/Budget.js';
import Burnout from '../core/Burnout.js';
import StandupSchedule from '../core/StandupSchedule.js';
import { formatGu } from '../core/format.js';
import { CAUSES } from '../data/causes.js';
import { bus, EV, listen } from '../events/EventBus.js';
import { stats, narrator, leaderboard, session } from '../state.js';
import Player from '../objects/Player.js';
import PlayerView from '../objects/PlayerView.js';
import { OUTFITS } from '../data/outfits.js';
import { fadeIn, fadeTo } from './sceneUtils.js';
import Pickup from '../objects/Pickup.js';
import Deal from '../objects/Deal.js';
import Checkpoint from '../objects/Checkpoint.js';
import Goal from '../objects/Goal.js';
import Team from '../objects/team/Team.js';
import Escalation from '../objects/Escalation.js';
import Sycophant from '../objects/npc/Sycophant.js';
import { TRAP_CLASSES } from '../objects/traps/index.js';
import { NPC_CLASSES } from '../objects/npc/index.js';
import { touch } from '../input/TouchControls.js';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  init(data) {
    this.levelId = data?.levelId ?? 'level1';
    this.pivotCause = data?.pivotCause ?? null;
    // retry after "Budget sforato": same level, the campaign goes on (docs/BURNOUT.md §3)
    this.retry = data?.retry === true;
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
    // index of the active checkpoint: only a later one (further right, or higher up) can replace it
    this.cpIndex = -1;
    const cp = this.checkpoints.find((c) => c.id === DEBUG.cp);
    if (cp) {
      cp.activate();
      this.cpIndex = this.checkpoints.indexOf(cp);
      this.spawnPoint = cp.spawn;
    }
    this.player = new Player(this, this.spawnPoint.x, this.spawnPoint.y);
    // the Partner ending dresses the next campaign as a Partner (until the page is reloaded)
    this.outfit = OUTFITS[DEBUG.outfit] ? DEBUG.outfit : OUTFITS[session.outfitOverride] ? session.outfitOverride : def.career ?? 'junior';
    this.playerView = new PlayerView(this, this.player, this.outfit);
    this.levelTiles = level.tiles;
    // a new campaign starts with a fresh team and no burnout (retrying level 1 is not a new campaign)
    const newCampaign = this.levelId === LEVEL_ORDER[0] && !this.retry;
    if (newCampaign) session.team = null;
    this.startBurnout(newCampaign);
    // team of juniors from level 3 on; lost juniors stay lost across levels (minimum 1)
    this.teamAtStart = def.team ? Math.max(1, session.team ?? def.team.size) : 0;
    this.team = def.team ? new Team(this, this.teamAtStart) : null;
    this.buildNpcs(def, level);
    this.registerColliders();
    this.escalation = def.escalation && !DEBUG.escalationOff ? new Escalation(this, def.escalation) : null;
    this.sycophant = def.sycophant ? new Sycophant(this, level.mats) : null;

    const cam = this.cameras.main;
    cam.setZoom(WORLD_ZOOM);
    cam.setBounds(0, 0, this.worldW, this.worldH);
    cam.startFollow(this.player, false, CAMERA_LERP, CAMERA_LERP);
    cam.setDeadzone(60, def.vertical ? 40 : 70);
    this.lookAhead = 0;
    this.lookY = 0;
    fadeIn(this);
    this.lastDelta = 16;
    const syncView = () => {
      this.playerView.update(this.lastDelta, this.pauseReasons.size > 0);
      this.updateCamera(this.lastDelta);
    };
    this.events.on('postupdate', syncView);
    this.events.once('shutdown', () => this.events.off('postupdate', syncView));

    this.keys = this.input.keyboard.addKeys('LEFT,RIGHT,UP,A,D,W,Z,SPACE,R,E,SHIFT');
    // delegation listens to the keydown event: a very quick tap (down + up in one frame) is never lost
    this.delegateQueued = false;
    const queueDelegate = () => {
      this.delegateQueued = true;
    };
    this.input.keyboard.on('keydown-E', queueDelegate);
    this.input.keyboard.on('keydown-SHIFT', queueDelegate);

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


    listen(this, {
      [EV.UI_READY]: () => this.emitSnapshot(),
      [EV.TEAM_CHANGED]: ({ canDelegate }) => touch.setDelegateReady(canDelegate),
    });
    // on-screen controls only while playing (not on the Lessons Learned or ending screens)
    touch.setVisible(true);
    this.events.once('shutdown', () => touch.setVisible(false));
    this.emitSnapshot();
    this.narrate(this.pivotCause ? 'levelStartPivot' : 'levelStart', { pivotLabel: CAUSES[this.pivotCause]?.label });
    this.playerView.setTier(this.burnout.tier);
    // entering a level already cooked: say it once, after the level's opening line
    if (this.burnout.tier === 2) this.time.delayedCall(3500, () => !this.ended && this.sayBurnoutHigh());
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
    // bow mats: where the sycophant bows and becomes a trampoline (ITERATION_5 §4)
    for (const m of level.mats) {
      this.add.image(m.x * TILE + 16, (m.y + 1) * TILE, 'mat').setOrigin(0.5, 1).setScale(1 / TEXTURE_SCALE).setDepth(DEPTH.objects);
      this.add
        .text(m.x * TILE + 16, (m.y + 1) * TILE + 4, 'Prego, Partner', { fontFamily: UI_FONT, fontSize: '7px', color: '#fde68a', resolution: TEXT_RESOLUTION * 2 })
        .setOrigin(0.5, 0)
        .setDepth(DEPTH.objects);
    }
    this.pickups = level.pickups.map((p) => new Pickup(this, p.x, p.y));
    this.deals = level.deals.map((d) => new Deal(this, d.x, d.y));
    this.dealsRequired = this.def.goal?.requiresDeals ?? 0;
    this.dealCount = Math.min(this.dealsRequired, DEBUG.deals ?? 0);
    this.checkpoints = level.checkpoints.map((c) => new Checkpoint(this, c));
    this.goal = new Goal(this, level.goal.x, level.goal.y, this.def.goal);
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
        this.relieveBurnout('coffee');
        bus.emit(EV.TOAST, { text: `Caffè: +${formatGu(BUDGET.coffeeBonus)} GU`, durationMs: 1200 });
      });
    }
    for (const d of this.deals) {
      this.physics.add.overlap(player, d.sprite, () => {
        if (!d.collect()) return;
        // (debug deals=3 already fills the pipeline)
        this.dealCount = Math.min(this.dealsRequired, this.dealCount + 1);
        this.stats.recordPickup('deal');
        bus.emit(EV.TOAST, { text: `Opportunità chiusa! Pipeline ${this.dealCount}/${this.dealsRequired}`, durationMs: 1800, color: '#fbbf24' });
        bus.emit(EV.DEALS_CHANGED, { count: this.dealCount, required: this.dealsRequired });
        this.narrate(this.dealCount >= this.dealsRequired ? 'pipelineFull' : 'deal');
      });
    }
    for (const c of this.checkpoints) {
      this.physics.add.overlap(player, c.sprite, () => {
        const index = this.checkpoints.indexOf(c);
        if (index <= this.cpIndex || !c.activate()) return;
        this.cpIndex = index;
        this.sycophant?.placeNearPlayer();
        this.spawnPoint = c.spawn;
        if (this.chargeTeamLosses()) return;
        this.team?.snapshot();
        bus.emit(EV.TOAST, { text: 'Checkpoint: pausa caffè registrata', durationMs: 2000 });
        this.narrate('checkpoint');
      });
    }
    this.physics.add.overlap(player, this.goal.sprite, () => !player.isDead && this.goal.onTouch());

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

  // Phaser's follow lerp is per frame: at 30 fps the camera would trail twice as far behind.
  // Scale it by the frame time, and lead the view a little in the running direction.
  // In a tower it also looks up (where you are going), or down while you fall.
  updateCamera(dt) {
    const cam = this.cameras.main;
    const k = 1 - Math.pow(1 - CAMERA_LERP, dt / (1000 / 60));
    cam.setLerp(k, k);
    const vx = this.player.body.velocity.x;
    const target = Math.abs(vx) > 40 ? Math.sign(vx) * CAMERA_LOOK_AHEAD : this.lookAhead;
    this.lookAhead += (target - this.lookAhead) * Math.min(1, dt / 400);
    const targetY = !this.def.vertical ? 0 : this.player.body.velocity.y > 350 ? CAMERA_LOOK_DOWN : CAMERA_LOOK_UP;
    this.lookY += (targetY - this.lookY) * Math.min(1, dt / 400);
    cam.setFollowOffset(-this.lookAhead, this.lookY);
  }

  // ---------- burnout (docs/BURNOUT.md) ----------

  startBurnout(newCampaign) {
    // first level of the page (also ?level=…): the debug value applies once, then the session carries it;
    // a later new campaign (after an ending) starts rested
    if (session.burnout === null) session.burnout = DEBUG.burnout ?? 0;
    else if (newCampaign) {
      session.burnout = 0;
      session.burnoutCleanBonus = false;
    }
    this.burnout = new Burnout(session.burnout);
    this.burnout.startLevel(LEVEL_ORDER.indexOf(this.levelId), BURNOUT.levelMin);
    if (session.burnoutCleanBonus && !this.retry) this.burnout.relieve('cleanLevel', BURNOUT.relief.cleanLevel);
    session.burnoutCleanBonus = false;
    session.burnout = this.burnout.value;
    // one-shot reliefs (the real KT) that a respawn must not hand out again
    this.relievedOnce = new Set();
    this.burnoutHighSaid = false;
  }

  // Single entry point for burnout gains. Returns true if it ended the campaign.
  addBurnout(cause, amount = BURNOUT.gain[cause]) {
    if (DEBUG.god || this.ended) return false;
    const tierBefore = this.burnout.tier;
    const r = this.burnout.add(cause, amount);
    if (r.delta === 0) return false;
    session.burnout = r.value;
    bus.emit(EV.BURNOUT_CHANGED, { value: r.value, delta: r.delta, reason: cause, tier: this.burnout.tier });
    if (r.over) {
      this.burnoutOver();
      return true;
    }
    if (this.burnout.tier !== tierBefore) this.playerView.setTier(this.burnout.tier);
    if (this.burnout.tier === 2) this.sayBurnoutHigh();
    return false;
  }

  // `once`: given at most once per level (respawns reset the traps that hand it out)
  relieveBurnout(reason, { once = false } = {}) {
    if (this.ended || (once && this.relievedOnce.has(reason))) return;
    if (once) this.relievedOnce.add(reason);
    const r = this.burnout.relieve(reason, BURNOUT.relief[reason]);
    if (r.delta === 0) return;
    session.burnout = r.value;
    bus.emit(EV.BURNOUT_CHANGED, { value: r.value, delta: r.delta, reason, tier: this.burnout.tier });
    this.playerView.setTier(this.burnout.tier);
  }

  sayBurnoutHigh() {
    if (this.burnoutHighSaid) return;
    this.burnoutHighSaid = true;
    this.narrate('burnoutHigh');
  }

  // juniors lost since the last checkpoint (or the level start); the ones a respawn gives back never count
  chargeTeamLosses() {
    const lost = this.team?.netLoss() ?? 0;
    return lost > 0 ? this.addBurnout('teamLoss', lost * BURNOUT.gain.teamLoss) : false;
  }

  burnoutOver() {
    if (this.ended) return;
    this.endLevel();
    this.narrate('burnoutOver');
    const run = this.stats.getRun();
    bus.emit(EV.BURNOUT_OVER, { levelId: this.levelId, run });
    this.time.delayedCall(600, () => fadeTo(this, 'EndingScene', { ending: 'burnout', levelId: this.levelId, run, gu: this.budget.gu, guMax: this.budget.max }));
  }

  // ---------- state helpers ----------

  emitSnapshot() {
    bus.emit(EV.LEVEL_START, { levelId: this.levelId, name: this.def.name, career: OUTFITS[this.outfit].title, startGu: this.budget.max, pivotCause: this.pivotCause, team: this.team ? this.team.count : null });
    bus.emit(EV.GU_CHANGED, { gu: this.budget.gu, max: this.budget.max, delta: 0, reason: 'snapshot' });
    bus.emit(EV.CLOCK_TICK, { label: this.schedule.clockLabel, warning: this.schedule.isWarning });
    bus.emit(EV.BURNOUT_CHANGED, { value: this.burnout.value, delta: 0, reason: 'snapshot', tier: this.burnout.tier });
    if (this.lastNarration) bus.emit(EV.NARRATE, this.lastNarration);
    if (this.dealsRequired) bus.emit(EV.DEALS_CHANGED, { count: this.dealCount, required: this.dealsRequired });
    if (this.escalation) {
      this.escalation.lastHud = null;
      this.escalation.emitHud();
    }
  }

  floatText(str, x, y, color = '#f87171') {
    const fx = this.add
      .text(x, y, str, { fontFamily: UI_FONT, fontStyle: 'bold', fontSize: '12px', color, resolution: TEXT_RESOLUTION * 2 })
      .setOrigin(0.5)
      .setDepth(DEPTH.fx);
    this.time.delayedCall(700, () => fx.destroy());
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
    const t = touch.state;
    // keyboard and on-screen controls together (docs/MOBILE.md); a JustDown must be read every frame, hence `|` not `||`
    const jumpPressed = JD(k.SPACE) | JD(k.UP) | JD(k.W) | JD(k.Z) | touch.take('jump');
    return {
      left: k.LEFT.isDown || k.A.isDown || t.left,
      right: k.RIGHT.isDown || k.D.isDown || t.right,
      jumpPressed: Boolean(jumpPressed),
      jumpHeld: k.SPACE.isDown || k.UP.isDown || k.W.isDown || k.Z.isDown || t.jumpHeld,
      restart: Boolean(JD(k.R) | touch.take('restart')),
      delegate: this.delegateQueued || touch.take('delegate'),
    };
  }

  update(_, delta) {
    const dt = Math.min(delta, 50);
    this.lastDelta = dt;
    if (this.ended) return;

    for (const ev of this.schedule.update(dt)) this.handleSchedule(ev);

    const input = this.readInput();
    this.delegateQueued = false;
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
    this.goal.update(dt);
    this.escalation?.update(dt);
    this.sycophant?.update(dt);
    this.team?.update(dt, input.delegate);
    for (const p of this.pickups) p.update(dt);
    for (const d of this.deals) d.update(dt);

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
      if (ev.overrun) this.addBurnout('standupOverrun');
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
      if (cause === 'pit' || cause === 'selfRestart') {
        this.player.respawnAt(this.spawnPoint.x, this.spawnPoint.y);
        this.escalation?.onRespawn();
        this.sycophant?.onRespawn();
      }
      return;
    }
    const player = this.player;
    player.isDead = true;
    for (const trap of this.traps) trap.cancelCall();
    for (const npc of this.npcs) npc.cancelCall();
    this.goal.cancelCall();
    this.escalation?.cancelCall();
    this.playerView.onDeath();
    this.cameras.main.shake(120, 0.006);
    this.addPause('death');

    const r = this.stats.recordDeath({ cause, x: player.x, y: Math.min(player.y, this.worldH) });
    bus.emit(EV.PLAYER_DIED, { cause, ...r });
    // the burnout comes first: if it ends the campaign, it wins over the budget
    if (this.addBurnout('death')) return;
    this.floatText(`-${formatGu(BUDGET.deathCost)} GU`, player.x, player.y - 24);
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
    this.escalation?.onRespawn();
    this.sycophant?.onRespawn();
    this.team?.restore();
    for (const o of [...this.traps, ...this.npcs]) o.delegateReserved = false;
    this.cameras.main.centerOn(this.player.x + this.lookAhead, this.player.y - this.lookY);
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
    this.goal.cancelCall();
    this.escalation?.cancelCall();
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

  completeLevel(narration = 'levelComplete') {
    if (this.player.isDead || this.ended) return;
    if (this.chargeTeamLosses()) return;
    const next = nextLevel(this.levelId);
    // a level without deaths: -5% on where the next one starts (docs/BURNOUT.md §4, review #12)
    const clean = this.stats.getRun().deaths === 0 && next !== null;
    session.burnoutCleanBonus = clean;
    this.endLevel();
    this.stats.completeRun();
    this.narrate(narration);
    const run = this.stats.getRun();
    // debug runs (checkpoints, god mode, custom budget…) never enter the leaderboard
    const ranks = DEBUG.anyOverride ? null : leaderboard.record({ levelId: this.levelId, timeMs: Math.round(run.timeMs), deaths: run.deaths, guLeft: this.budget.gu });
    const team = this.team ? { count: this.team.count, size: this.teamAtStart } : null;
    if (team) session.team = Math.max(1, team.count);
    const payload = { levelId: this.levelId, next, run, ranks, team, dominant: this.stats.dominantPivotCause(), gu: this.budget.gu, guMax: this.budget.max, burnout: this.burnout.value, clean };
    bus.emit(EV.LEVEL_COMPLETE, payload);
    this.time.delayedCall(LEVEL_COMPLETE_DELAY_MS, () => {
      fadeTo(this, next ? 'LessonsLearnedScene' : 'EndingScene', { ending: 'partner', ...payload });
    });
  }
}

import { TILE, DEPTH, TEXTURE_SCALE, TEXT_RESOLUTION, UI_FONT } from '../../config/constants.js';
import TeamTrail from '../../core/TeamTrail.js';
import { pickDelegateTarget } from '../../core/DelegateTargeting.js';
import { bus, EV } from '../../events/EventBus.js';

const SCALE = (1 / TEXTURE_SCALE) * 0.85;
const RUN_SPEED = 320;
const BUBBLE_MS = 1400;

// Your team of juniors (ITERATION_4 §4): they replay your path a few hundred ms behind you,
// get hit by the traps you only just escaped, and can be delegated (E) to face a trap in your place.
export default class Team {
  constructor(scene, count) {
    this.scene = scene;
    this.trail = new TeamTrail({ delayMs: 300 });
    this.members = [];
    this.bubble = scene.add
      .text(0, 0, '', { fontFamily: UI_FONT, fontSize: '9px', color: '#111827', backgroundColor: '#f8fafc', padding: { x: 4, y: 2 }, resolution: TEXT_RESOLUTION * 2 })
      .setOrigin(0.5, 1)
      .setDepth(DEPTH.fx)
      .setVisible(false);
    this.bubbleLeft = 0;
    this.savedCount = count;
    this.setCount(count);
    this.resetTrail();
  }

  get followers() {
    return this.members.filter((m) => m.state === 'follow');
  }

  get count() {
    return this.followers.length;
  }

  setCount(n) {
    for (const m of this.members) m.sprite.destroy();
    this.members = Array.from({ length: n }, () => this.makeMember());
    this.emit();
  }

  makeMember() {
    const sprite = this.scene.add.image(0, 0, 'player_junior', 'idle0').setOrigin(0.5, 1).setScale(SCALE).setDepth(DEPTH.player - 2);
    return { sprite, state: 'follow' };
  }

  add(n = 1) {
    for (let i = 0; i < n; i++) this.members.push(this.makeMember());
    this.emit();
  }

  emit() {
    bus.emit(EV.TEAM_CHANGED, { count: this.count, canDelegate: Boolean(this.canDelegate) });
  }

  resetTrail() {
    const p = this.scene.player;
    this.trail.reset({ x: p.body.center.x, y: p.body.bottom, flipX: false, frame: 'idle0' });
  }

  // checkpoint reached: this is the team you get back after a death
  snapshot() {
    this.savedCount = this.count;
  }

  // juniors lost since the last checkpoint (or the level start): what the burnout charges for
  netLoss() {
    return Math.max(0, this.savedCount - this.count);
  }

  restore() {
    this.setCount(this.savedCount);
    this.resetTrail();
    this.bubble.setVisible(false);
  }

  say(text, x, y) {
    this.bubble.setText(text).setPosition(x, y - 34).setVisible(true);
    this.bubbleLeft = BUBBLE_MS;
  }

  lose(member, quiet = false) {
    member.state = 'gone';
    this.scene.playerView.paper.explode(6, member.sprite.x, member.sprite.y - 12);
    member.sprite.setVisible(false);
    if (!quiet) this.scene.narrate('teamLoss');
    this.emit();
  }

  update(dt, delegatePressed) {
    const scene = this.scene;
    const player = scene.player;
    const view = scene.playerView;
    // the trail stops with you while you are frozen (KT call, micromanager, colleague…)
    if (!player.inputLocked) this.trail.push(dt, { x: player.body.center.x, y: player.body.bottom, flipX: player.flipX, frame: view.frameName() });

    this.followers.forEach((m, i) => {
      const s = this.trail.positionFor(i);
      m.sprite.setPosition(s.x, s.y).setFlipX(s.flipX).setFrame(s.frame).setVisible(true);
    });

    this.hitByTraps();

    for (const m of this.members) {
      if (m.state === 'going') this.updateGoing(m, dt);
      if (m.state === 'staying' && m.stayLeft !== undefined) {
        m.stayLeft -= dt;
        if (m.stayLeft <= 0) {
          m.state = 'gone';
          m.sprite.setVisible(false);
        }
      }
    }

    if (this.bubbleLeft > 0) {
      this.bubbleLeft -= dt;
      if (this.bubbleLeft <= 0) this.bubble.setVisible(false);
    }

    if (delegatePressed) this.delegate();

    // HUD hint: "E" lights up when there is something to delegate
    const can = this.count > 0 && this.findTarget() !== null;
    if (can !== this.canDelegate) {
      this.canDelegate = can;
      this.emit();
    }
  }

  findTarget() {
    const scene = this.scene;
    const player = scene.player;
    const owners = [...scene.traps, ...scene.npcs].filter((o) => !o.delegateReserved);
    const targets = owners.map((o) => {
      const t = o.delegateTarget?.();
      // feet height of the thing to face (its row's floor), so a target two floors up is out of reach
      const row = o.ty ?? o.def?.y;
      return t && { y: row !== undefined ? (row + 1) * TILE : undefined, ...t, owner: o };
    });
    // a closed "Approvazione richiesta" gate is a wall for juniors too
    const blockers = scene.traps.filter((tr) => tr.type === 'approvalGate' && !tr.open).map((tr) => tr.tx * TILE + 16);
    // in a tower, only targets on your floor (review 5 #5: horizontal levels keep delegating from a raised platform)
    return pickDelegateTarget(player.body.center.x, player.flipX ? -1 : 1, targets, 10, { blockers, playerY: scene.def.vertical ? player.body.bottom : null });
  }

  // Juniors replaying your path get hit by the falling emails/slides you only just escaped.
  hitByTraps() {
    for (const m of this.followers) {
      const x = m.sprite.x;
      const y = m.sprite.y;
      for (const trap of this.scene.traps) {
        for (const obj of trap.objectGroup.getChildren()) {
          if (!obj.active || !obj.getData('lethal') || obj.getData('state') !== 'falling') continue;
          const b = obj.body;
          if (x + 6 > b.left && x - 6 < b.right && y > b.top && y - 24 < b.bottom) {
            this.lose(m);
            break;
          }
        }
        if (m.state !== 'follow') break;
      }
    }
  }

  delegate() {
    const scene = this.scene;
    const player = scene.player;
    const first = this.followers[0];
    if (!first) {
      bus.emit(EV.TOAST, { text: 'Nessuno a cui delegare. Assumi uno stagista.', durationMs: 1800 });
      return;
    }
    const pick = this.findTarget();
    if (!pick) {
      this.say('Su cosa, di preciso?', first.sprite.x, first.sprite.y);
      return;
    }
    pick.owner.delegateReserved = true;
    first.state = 'going';
    first.target = pick;
    first.fromX = first.sprite.x;
    first.fromY = first.sprite.y;
    first.t = 0;
    first.duration = (Math.abs(pick.x - first.fromX) / RUN_SPEED) * 1000;
    this.say('Ci penso io!', first.sprite.x, first.sprite.y);
    scene.narrate('delegate');
    this.emit();
  }

  updateGoing(m, dt) {
    m.t += dt;
    const k = m.duration > 0 ? Math.min(1, m.t / m.duration) : 1;
    const x = m.fromX + (m.target.x - m.fromX) * k;
    // a hop every tile or so: they get there whatever the floor looks like
    // the target's floor (it may be up to 3 rows above in a tower), else the junior's own
    const refY = m.target.y ?? m.fromY;
    const floorY = this.floorAt(x, refY) ?? m.fromY;
    m.sprite.setPosition(x, floorY - Math.abs(Math.sin(k * Math.PI * Math.max(1, m.duration / 300))) * 18);
    m.sprite.setFlipX(m.target.x < m.fromX).setFrame(`run${Math.floor(m.t / 80) % 4}`);
    if (k < 1) return;
    m.sprite.setPosition(m.target.x, this.floorAt(m.target.x, refY) ?? m.fromY).setFrame('freeze');
    const owner = m.target.owner;
    owner.delegateReserved = false;
    // things may have changed while the junior was running (it already fired, it caught you…): re-check
    if (!owner.delegateTarget?.()) {
      m.state = 'follow';
      this.say('Ah, è già stato fatto?', m.sprite.x, m.sprite.y);
      this.emit();
      return;
    }
    owner.delegateReserved = true;
    const result = owner.onDelegate(m) ?? {};
    if (result.stay) {
      m.state = 'staying';
      m.stayLeft = result.staySeconds ? result.staySeconds * 1000 : undefined;
      m.sprite.setFrame('idle0');
    } else {
      // the trap gets them (or they get stuck in a call): lost for good
      m.state = 'doomed';
      this.scene.time.delayedCall(450, () => {
        if (m.state === 'doomed' && this.members.includes(m)) this.lose(m, true);
      });
    }
  }

  // Floor under x near height refY (feet): searched from one tile above refY downwards, so overhead ledges are ignored.
  floorAt(x, refY) {
    const col = Math.floor(x / TILE);
    const tiles = this.scene.levelTiles;
    if (!tiles || col < 0 || col >= tiles[0].length) return null;
    const from = Math.max(2, Math.floor(refY / TILE) - 1);
    for (let y = from; y < tiles.length; y++) if (tiles[y][col] !== -1) return y * TILE;
    return null;
  }

  destroy() {
    for (const m of this.members) m.sprite.destroy();
    this.bubble.destroy();
  }
}

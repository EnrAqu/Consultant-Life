import { TILE, DEPTH, TEXTURE_SCALE, TEXT_RESOLUTION, UI_FONT } from '../../config/constants.js';
import StaffingBrain from '../../core/StaffingBrain.js';
import { bus, EV } from '../../events/EventBus.js';

const BASE = 1 / TEXTURE_SCALE;
const BUBBLE_MS = 2200;

// "Mi presti una risorsa?" (docs/PM_LINKEDIN.md §8), level 4 slot with cause `pm`. The PM sits at his desk (a solid
// tile in the map) with the sign "Cercasi risorse – urgente"; the floor tiles either side of it are his "area
// risorse" (yellow carpet). Step on it and he takes the last junior in your line: burnout +10% on the spot (the loss
// included: Team.lose(..., prepaid)). Counter: jump over his desk from before the carpet, or stop on the desk.
// Pivoted ("il PM ripianifica a tuo favore"): he lends you one of his juniors. He asks once per level.
export default class PmStaffing {
  static type = 'pmStaffing';

  constructor(scene, def, mode) {
    this.scene = scene;
    this.def = def;
    this.mode = mode;
    this.p = def.params;
    this.brain = new StaffingBrain({ reach: this.p.reach }, mode);
    this.x = def.x * TILE + 16;
    this.floorY = (def.y + 1) * TILE;
  }

  get pivoted() {
    return this.mode === 'pivoted';
  }

  build() {
    const scene = this.scene;
    const [a, b] = this.p.reach;
    // the carpet on the floor tiles of his area (not on the desk)
    const g = scene.add.graphics().setDepth(DEPTH.objects);
    for (let c = a; c <= b; c++) {
      if (c === this.def.x) continue;
      g.fillStyle(this.pivoted ? 0x86efac : 0xfacc15, 0.9).fillRect(c * TILE + 1, this.floorY - 4, TILE - 2, 4);
    }
    // the PM stands behind his desk (the desk tile is drawn by the map)
    scene.add.image(this.x + 6, this.floorY - TILE, 'npc_pm', 'idle0').setOrigin(0.5, 1).setScale(BASE).setFlipX(true).setDepth(DEPTH.objects - 1);
    const style = (size, color, extra = {}) => ({ fontFamily: UI_FONT, fontSize: `${size}px`, color, resolution: TEXT_RESOLUTION * 2, ...extra });
    scene.add
      .text(this.x, this.floorY - 2 * TILE - 30, this.pivoted ? 'Risorse disponibili: chiedi pure' : 'Cercasi risorse – urgente', style(10, '#111827', { fontStyle: 'bold', backgroundColor: this.pivoted ? '#bbf7d0' : '#fde68a', padding: { x: 5, y: 3 } }))
      .setOrigin(0.5, 1)
      .setDepth(DEPTH.objects);
    this.bubble = scene.add
      .text(this.x, this.floorY - 2 * TILE - 54, '', style(9, '#111827', { backgroundColor: '#f8fafc', padding: { x: 4, y: 2 }, wordWrap: { width: 170 } }))
      .setOrigin(0.5, 1)
      .setDepth(DEPTH.fx)
      .setVisible(false);
    this.reset();
  }

  say(text) {
    this.bubble.setText(text).setVisible(true);
    this.bubbleLeft = BUBBLE_MS;
  }

  // Once per level (review B#1): after a death you get the junior back and he does not ask again (each life +10% made
  // a few failed runs cost ~40%). The pivoted gift re-arms: the respawn takes the lent junior back too.
  reset() {
    if (this.pivoted || !this.built) this.brain.reset();
    this.built = true;
    this.bubbleLeft = 0;
    this.bubble.setVisible(false);
  }

  cancelCall() {}

  delegateTarget() {
    return null;
  }

  update(dt) {
    const scene = this.scene;
    const team = scene.team;
    const body = scene.player.body;
    if (team && !scene.player.isDead) {
      const onFloor = scene.player.grounded && Math.abs(body.bottom - this.floorY) <= 2;
      const ev = this.brain.update({ col: Math.floor(body.center.x / TILE), onFloor, teamCount: team.count });
      if (ev === 'take') this.take(team);
      if (ev === 'empty') this.say('Niente risorse? Allora ripianifico. Te.');
      if (ev === 'gift') {
        team.add(1);
        this.say('Ripianifico io: ti presto il mio junior.');
        bus.emit(EV.TOAST, { text: 'Il PM ti presta un junior: +1 nel team', durationMs: 1800, color: '#86efac' });
        scene.narrate('pmGift');
      }
    }
    if (this.bubbleLeft > 0) {
      this.bubbleLeft -= dt;
      if (this.bubbleLeft <= 0) this.bubble.setVisible(false);
    }
  }

  take(team) {
    const scene = this.scene;
    const followers = team.followers;
    const last = followers[followers.length - 1];
    this.say('Mi presti una risorsa? Due settimane, giuro.');
    scene.stats.recordIncident('pm');
    team.lose(last, true, true);
    scene.floatText('-1 junior', last.sprite.x, last.sprite.y - 30);
    bus.emit(EV.TOAST, { text: 'Il PM si è preso un junior "per due settimane"', durationMs: 2000, color: '#fde68a' });
    if (scene.addBurnout('pmResource')) return;
    scene.narrate('pmSteal');
  }
}

import { TILE, DEPTH, TEXTURE_SCALE, TEXT_RESOLUTION, UI_FONT } from '../../config/constants.js';
import RecruiterBrain from '../../core/RecruiterBrain.js';
import { bus, EV } from '../../events/EventBus.js';

const BASE = 1 / TEXTURE_SCALE;
const BUBBLE_MS = 2200;

// The LinkedIn recruiter (docs/PM_LINKEDIN.md §9), level 4 slot with cause `linkedin`. His "#OpenToWork" zone
// (columns zoneFrom..zoneTo, green band on the floor, banner overhead): a junior following you who stays `poachMs` in
// a row inside it accepts "un'opportunità imperdibile" and resigns (a team loss: +5% burnout at the checkpoint, as
// always). A red bar over the most exposed junior shows the clock. Counter: cross without stopping; the trail stops
// while you are frozen, so being hooked inside the zone costs you the team.
// Pivoted ("hai evitato un'opportunità, errore" — now you take it): the first time you walk in he hires one for you.
export default class Recruiter {
  static type = 'recruiter';

  constructor(scene, def, mode) {
    this.scene = scene;
    this.def = def;
    this.mode = mode;
    this.p = def.params;
    this.brain = new RecruiterBrain({ poachMs: this.p.poachMs ?? 1500 }, mode);
    this.floorY = (def.y + 1) * TILE;
    this.x0 = this.p.zoneFrom * TILE;
    this.x1 = (this.p.zoneTo + 1) * TILE;
  }

  build() {
    const scene = this.scene;
    const pivoted = this.mode === 'pivoted';
    const g = scene.add.graphics().setDepth(DEPTH.objects);
    g.fillStyle(pivoted ? 0x0a66c2 : 0x16a34a, 0.85).fillRect(this.x0, this.floorY - 4, this.x1 - this.x0, 4);
    const style = (size, color, extra = {}) => ({ fontFamily: UI_FONT, fontSize: `${size}px`, color, resolution: TEXT_RESOLUTION * 2, ...extra });
    scene.add
      .text((this.x0 + this.x1) / 2, this.floorY - 4 * TILE, pivoted ? 'LinkedIn — #Hiring: ti trovo un junior' : 'LinkedIn — #OpenToWork: opportunità imperdibili', style(11, '#ffffff', { fontStyle: 'bold', backgroundColor: pivoted ? '#0a66c2' : '#15803d', padding: { x: 6, y: 3 } }))
      .setOrigin(0.5, 1)
      .setDepth(DEPTH.objects);
    scene.add.image(this.def.x * TILE + 16, this.floorY, 'npc_recruiter', 'idle0').setOrigin(0.5, 1).setScale(BASE).setFlipX(true).setDepth(DEPTH.objects);
    this.bubble = scene.add
      .text(this.def.x * TILE + 16, this.floorY - 48, '', style(9, '#111827', { backgroundColor: '#dbeafe', padding: { x: 4, y: 2 }, wordWrap: { width: 170 } }))
      .setOrigin(0.5, 1)
      .setDepth(DEPTH.fx)
      .setVisible(false);
    this.bar = scene.add.graphics().setDepth(DEPTH.fx);
    this.reset();
  }

  say(text) {
    this.bubble.setText(text).setVisible(true);
    this.bubbleLeft = BUBBLE_MS;
  }

  reset() {
    this.brain.reset();
    // one incident per life, however many juniors resign (review B#2: 3 per hook made linkedin the lesson every time)
    this.incidentSaid = false;
    this.bubbleLeft = 0;
    this.bubble.setVisible(false);
    this.bar.clear();
  }

  cancelCall() {}

  delegateTarget() {
    return null;
  }

  inZone(x) {
    return x >= this.x0 && x < this.x1;
  }

  update(dt) {
    const scene = this.scene;
    const team = scene.team;
    this.bar.clear();
    if (team && !scene.player.isDead) {
      const members = team.followers.map((m) => ({ key: m, inZone: this.inZone(m.sprite.x) }));
      const out = this.brain.update(dt, { playerInZone: this.inZone(scene.player.body.center.x), members });
      for (const m of out.poached) this.poach(team, m);
      if (out.gift) {
        team.add(1);
        this.say('Ti ho trovato un junior. Ha scritto "appassionato" tre volte nel profilo.');
        bus.emit(EV.TOAST, { text: 'Assunto da LinkedIn: +1 nel team', durationMs: 1800, color: '#93c5fd' });
        scene.narrate('recruiterGift');
      }
      const d = this.brain.danger();
      if (d && d.key.state === 'follow') {
        const x = d.key.sprite.x;
        const y = d.key.sprite.y - 34;
        this.bar.fillStyle(0x111827, 0.8).fillRect(x - 11, y, 22, 4);
        this.bar.fillStyle(0xef4444, 1).fillRect(x - 10, y + 1, 20 * d.ratio, 2);
      }
    }
    if (this.bubbleLeft > 0) {
      this.bubbleLeft -= dt;
      if (this.bubbleLeft <= 0) this.bubble.setVisible(false);
    }
  }

  poach(team, member) {
    if (member.state !== 'follow') return;
    const scene = this.scene;
    if (!this.incidentSaid) scene.stats.recordIncident('linkedin');
    this.incidentSaid = true;
    scene.floatText('#OpenToWork → assunto', member.sprite.x, member.sprite.y - 30, '#86efac');
    team.lose(member, true);
    this.say('Ha accettato un\'opportunità imperdibile. Preavviso: zero.');
    scene.narrate('recruiterPoach');
  }
}

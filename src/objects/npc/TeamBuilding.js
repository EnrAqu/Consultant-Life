import { TILE, DEPTH, TEXT_RESOLUTION, UI_FONT } from '../../config/constants.js';
import TeamBuildingBrain from '../../core/TeamBuildingBrain.js';

// HR: mandatory team building (docs/IT_HR_EXTERNAL.md §3.1), level 3. A junior following you who walks into the zone
// is taken to the escape room for 8 s, then comes back (state `away`: not a loss, no burnout). Tell: the purple band and
// the banner. Counter: wait for them, or open the IT ticket yourself. Incident `hr` only when you try to delegate with
// everyone away (Team.delegate).
export default class TeamBuilding {
  static type = 'teamBuilding';

  constructor(scene, def, mode) {
    this.scene = scene;
    this.def = def;
    this.mode = mode;
    this.p = def.params;
    this.brain = new TeamBuildingBrain({ awayMs: this.p.awayMs ?? 8000 });
    this.floorY = (def.y + 1) * TILE;
    this.x0 = this.p.zoneFrom * TILE;
    this.x1 = (this.p.zoneTo + 1) * TILE;
  }

  build() {
    const scene = this.scene;
    scene.add.graphics().setDepth(DEPTH.objects).fillStyle(0xa855f7, 0.85).fillRect(this.x0, this.floorY - 4, this.x1 - this.x0, 4);
    scene.add
      .text((this.x0 + this.x1) / 2, this.floorY - 4 * TILE, 'HR — Team building obbligatorio: escape room', { fontFamily: UI_FONT, fontStyle: 'bold', fontSize: '11px', color: '#ffffff', backgroundColor: '#7e22ce', padding: { x: 6, y: 3 }, resolution: TEXT_RESOLUTION * 2 })
      .setOrigin(0.5, 1)
      .setDepth(DEPTH.objects);
    this.reset();
  }

  reset() {
    this.brain.reset();
  }

  cancelCall() {}

  delegateTarget() {
    return null;
  }

  update(dt) {
    const team = this.scene.team;
    if (!team || this.scene.player.isDead) return;
    const members = team.followers.map((m) => ({ key: m, inZone: m.sprite.x >= this.x0 && m.sprite.x < this.x1 }));
    const out = this.brain.update(dt, members);
    for (const m of out.taken) {
      this.scene.floatText('Escape room!', m.sprite.x, m.sprite.y - 30, '#d8b4fe');
      team.sendAway(m);
    }
    for (const m of out.back) team.comeBack(m);
    if (out.taken.length) this.scene.narrate('teamBuilding');
  }
}

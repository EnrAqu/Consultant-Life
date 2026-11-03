// HR: mandatory team building (docs/IT_HR_EXTERNAL.md §3.1). A junior following you who enters the zone is taken
// for `awayMs`, then comes back. Pure logic; juniors are opaque keys.
export default class TeamBuildingBrain {
  constructor({ awayMs = 8000 } = {}) {
    this.awayMs = awayMs;
    this.reset();
  }

  reset() {
    this.away = new Map();
  }

  // members: [{ key, inZone }] (the juniors following you). Returns { taken: [keys], back: [keys] }.
  update(dt, members) {
    const out = { taken: [], back: [] };
    for (const [key, left] of this.away) {
      const l = left - dt;
      if (l <= 0) {
        this.away.delete(key);
        out.back.push(key);
      } else this.away.set(key, l);
    }
    for (const m of members) {
      if (m.inZone && !this.away.has(m.key)) {
        this.away.set(m.key, this.awayMs);
        out.taken.push(m.key);
      }
    }
    return out;
  }

  get anyAway() {
    return this.away.size > 0;
  }
}

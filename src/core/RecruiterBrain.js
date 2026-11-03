// The LinkedIn recruiter (docs/PM_LINKEDIN.md §9): a junior who stays `poachMs` in a row inside the "#OpenToWork" zone
// accepts an offer and resigns. Leaving the zone resets that junior's clock. Pivoted: the first time you walk in, the
// recruiter hires one for you. Pure logic; juniors are opaque keys.
export default class RecruiterBrain {
  constructor({ poachMs = 1500 } = {}, mode = 'normal') {
    this.poachMs = poachMs;
    this.pivoted = mode === 'pivoted';
    this.reset();
  }

  reset() {
    this.timers = new Map();
    this.gifted = false;
  }

  // members: [{ key, inZone }] (only the juniors following you). Returns { poached: [keys], gift: bool }.
  update(dt, { playerInZone, members }) {
    const out = { poached: [], gift: false };
    if (this.pivoted) {
      if (playerInZone && !this.gifted) {
        this.gifted = true;
        out.gift = true;
      }
      return out;
    }
    const present = new Set();
    for (const m of members) {
      if (!m.inZone) continue;
      present.add(m.key);
      const t = (this.timers.get(m.key) ?? 0) + dt;
      this.timers.set(m.key, t);
      if (t >= this.poachMs) out.poached.push(m.key);
    }
    for (const key of [...this.timers.keys()]) if (!present.has(key) || out.poached.includes(key)) this.timers.delete(key);
    return out;
  }

  // 0..1: how close the most exposed junior is to resigning (for the bar over their head)
  danger() {
    let worst = null;
    for (const [key, t] of this.timers) if (!worst || t > worst.t) worst = { key, t };
    return worst ? { key: worst.key, ratio: Math.min(1, worst.t / this.poachMs) } : null;
  }
}

// The PM asks for a resource (docs/PM_LINKEDIN.md §8): step on his "area risorse" (columns reach[0]..reach[1], on the
// floor; his desk in the middle is safe) and he takes the last junior in line — or, pivoted, lends you one.
// Fires once per life (reset on respawn). Pure logic.
export default class StaffingBrain {
  constructor({ reach }, mode = 'normal') {
    this.reach = reach;
    this.pivoted = mode === 'pivoted';
    this.reset();
  }

  reset() {
    this.fired = false;
  }

  // col: the player's column; onFloor: feet on the floor row (not on the desk, not in the air)
  // Returns 'take' | 'empty' (nobody left to take) | 'gift' (pivoted) | null.
  update({ col, onFloor, teamCount }) {
    if (this.fired || !onFloor || col < this.reach[0] || col > this.reach[1]) return null;
    this.fired = true;
    if (this.pivoted) return 'gift';
    return teamCount > 0 ? 'take' : 'empty';
  }
}

// Pure logic of the "Consegna al cliente" sign (ITERATION_4 §3).
// Trolling signs face the client's side (right): reaching them from the left makes the client change
// their mind once; reaching them from the right always wins.
// The Board door of level 5 (ITERATION_5 §5) stays shut until the pipeline has requiresDeals deals.
export default class GoalBrain {
  constructor({ trolls = false, carryCols = 14, requiresDeals = 0 } = {}) {
    this.trolls = trolls;
    this.carryCols = carryCols;
    this.requiresDeals = requiresDeals;
    this.trolled = false; // once per level: not reset on respawn
  }

  // playerX / signX in px; deals: opportunities collected. Returns 'win', 'winRight', 'troll' or 'locked'.
  touch(playerX, signX, deals = 0) {
    if (deals < this.requiresDeals) return 'locked';
    const fromSide = playerX > signX ? 'right' : 'left';
    if (this.trolls && !this.trolled && fromSide === 'left') {
      this.trolled = true;
      return 'troll';
    }
    return fromSide === 'right' && this.trolls ? 'winRight' : 'win';
  }
}

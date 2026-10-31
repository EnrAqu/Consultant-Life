// Pure logic of the "Consegna al cliente" sign (ITERATION_4 §3).
// Trolling signs face the client's side (right): reaching them from the left makes the client change
// their mind once; reaching them from the right always wins.
export default class GoalBrain {
  constructor({ trolls = false, carryCols = 14 } = {}) {
    this.trolls = trolls;
    this.carryCols = carryCols;
    this.trolled = false; // once per level: not reset on respawn
  }

  // playerX / signX in px; returns 'win' or 'troll'
  touch(playerX, signX) {
    const fromSide = playerX > signX ? 'right' : 'left';
    if (this.trolls && !this.trolled && fromSide === 'left') {
      this.trolled = true;
      return 'troll';
    }
    return fromSide === 'right' && this.trolls ? 'winRight' : 'win';
  }
}

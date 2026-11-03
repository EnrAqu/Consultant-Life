// The junior who stops (docs/JUNIOR_QUESTION.md, levels 3–5). When the last junior in line crosses the stall column
// (either way, feet within `rowTol` rows of `row`) he stops with a question. Go back to him: you explain for
// `explainMs` (the scene charges 0.5 GU) and he rejoins. Leave him and he is a lost junior. Once per life. Pure logic.
// Review JUNIOR_STALL #1: "exactly on col/col+1 and on the exact row" missed jumps and whole routes (level 5).
export default class StallBrain {
  constructor({ col, row, explainMs = 1800, rowTol = 1 }) {
    this.col = col;
    this.row = row;
    this.explainMs = explainMs;
    this.rowTol = rowTol;
    this.reset();
  }

  reset() {
    this.state = 'idle';
    this.key = null;
    this.timer = 0;
    this.prev = null;
  }

  // last: the last junior following you ({ key, col, row }) or null; playerNear: you are next to the stalled junior.
  // Returns 'stall' | 'ask' | 'resume' | null.
  update(dt, { last, playerNear }) {
    if (this.state === 'idle') {
      if (!last) {
        this.prev = null;
        return null;
      }
      const prev = this.prev && this.prev.key === last.key ? this.prev.col : null;
      this.prev = { key: last.key, col: last.col };
      // crossing the boundary on the left of the stall column, either way (a respawn past it never crosses it)
      // …walking or jumping: a jump of more than 3 columns in one step is a respawn or a teleport (on its first frame a
      // new junior sprite is still at x = 0), never a crossing
      const crossed = prev !== null && Math.abs(last.col - prev) <= 3 && (prev < this.col) !== (last.col < this.col);
      if (crossed && Math.abs(last.row - this.row) <= this.rowTol) {
        this.state = 'stalled';
        this.key = last.key;
        return 'stall';
      }
      return null;
    }
    if (this.state === 'stalled' && playerNear) {
      this.state = 'asking';
      this.timer = 0;
      return 'ask';
    }
    if (this.state === 'asking') {
      this.timer += dt;
      if (this.timer >= this.explainMs) {
        this.state = 'done';
        return 'resume';
      }
    }
    return null;
  }
}

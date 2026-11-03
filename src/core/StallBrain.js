// The junior who stops (docs/JUNIOR_QUESTION.md, levels 3–5). When the last junior in line reaches the stall point
// (column `col`, feet on row `row`) he stops with a question. Go back to him: you explain for `explainMs`
// (the scene charges 0.5 GU) and he rejoins. Leave him and he is a lost junior. Once per life. Pure logic.
export default class StallBrain {
  constructor({ col, row, explainMs = 1800 }) {
    this.col = col;
    this.row = row;
    this.explainMs = explainMs;
    this.reset();
  }

  reset() {
    this.state = 'idle';
    this.key = null;
    this.timer = 0;
  }

  // last: the last junior following you ({ key, col, row }) or null; playerNear: you are next to the stalled junior.
  // Returns 'stall' | 'ask' | 'resume' | null.
  update(dt, { last, playerNear }) {
    if (this.state === 'idle') {
      // crossing the point (col or the next one), not being past it: a respawn beyond it must not trigger it
      if (last && (last.col === this.col || last.col === this.col + 1) && last.row === this.row) {
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

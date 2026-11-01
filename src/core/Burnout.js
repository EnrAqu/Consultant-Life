// Pure logic of the burnout bar (docs/BURNOUT.md): what the job costs *you*, next to the project's GU.
// 0..100, carried between levels; every level has a minimum to start from. No Phaser.
export const BURNOUT_MAX = 100;
export const BURNOUT_TIERS = [50, 80];

// values move in steps of 0.25 (a death): round to 2 decimals so the sums never drift
const clamp = (v) => Math.round(Math.min(BURNOUT_MAX, Math.max(0, v)) * 100) / 100;

const levelMinimum = (levelIndex, minimums) => (levelIndex < 0 ? 0 : (minimums[levelIndex] ?? minimums[minimums.length - 1] ?? 0));

export default class Burnout {
  constructor(value = 0) {
    this._value = clamp(value);
  }

  get value() {
    return this._value;
  }

  get isOver() {
    return this._value >= BURNOUT_MAX;
  }

  // 0 fresh, 1 tired (eye bags), 2 cooked (hunched, shaking)
  get tier() {
    return BURNOUT_TIERS.filter((t) => this._value >= t).length;
  }

  // `cause` and `reason` only label the change: the amount is the caller's (BURNOUT table in constants)
  add(cause, amount) {
    const before = this._value;
    if (amount > 0) this._value = clamp(before + amount);
    return { delta: this._value - before, value: this._value, over: this.isOver };
  }

  relieve(reason, amount) {
    const before = this._value;
    if (amount > 0) this._value = clamp(before - amount);
    return { delta: this._value - before, value: this._value };
  }

  startLevel(levelIndex, minimums) {
    const before = this._value;
    this._value = clamp(Math.max(before, levelMinimum(levelIndex, minimums)));
    return { value: this._value, raisedBy: this._value - before };
  }
}

// Where the next level starts, and why (Lessons Learned): the same rules GameScene applies on create.
export function nextStart(value, levelIndex, minimums, cleanBonus = 0) {
  const b = new Burnout(value);
  const { raisedBy } = b.startLevel(levelIndex, minimums);
  const relieved = b.relieve('cleanLevel', cleanBonus).delta;
  return { value: b.value, reason: relieved < 0 ? 'clean' : raisedBy > 0 ? 'minimum' : 'carried' };
}

// Pure choice of what a delegated team member goes to face (ITERATION_4 §4.2):
// the nearest available target in front of the player (facing direction) within rangeCols columns;
// if there is none, the nearest one just behind (behindCols). Targets beyond a closed gate are unreachable.
const T = 32;

export function pickDelegateTarget(playerX, facing, targets, rangeCols = 10, { blockers = [], behindCols = 6 } = {}) {
  const reachable = (x) => !blockers.some((b) => (b > playerX && b < x) || (b < playerX && b > x));
  let ahead = null;
  let behind = null;
  for (const t of targets) {
    if (!t || t.available === false || !reachable(t.x)) continue;
    const d = (t.x - playerX) * facing;
    if (d >= -T / 2 && d <= rangeCols * T) {
      if (!ahead || d < ahead.d) ahead = { ...t, d };
    } else if (d < 0 && -d <= behindCols * T) {
      if (!behind || -d < -behind.d) behind = { ...t, d };
    }
  }
  return ahead ?? behind;
}

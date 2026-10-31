// Pure choice of what a delegated team member goes to face (ITERATION_4 §4.2):
// the nearest available target in front of the player (facing direction), within rangeCols columns.
const T = 32;

export function pickDelegateTarget(playerX, facing, targets, rangeCols = 10) {
  let best = null;
  for (const t of targets) {
    if (!t || t.available === false) continue;
    const d = (t.x - playerX) * facing;
    if (d < -T / 2 || d > rangeCols * T) continue;
    if (!best || d < best.d) best = { ...t, d };
  }
  return best;
}

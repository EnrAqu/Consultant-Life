// Pure "torch" test shared by the micromanager's flashlight and the Partner's gaze (ITERATION_5 §3).
// viewer: { x, feetY, facing (+1 right / -1 left), grounded }; target: { x, feetY }. Pixels.
// reach: how far in front (px); above / below: how much higher or lower the target's feet may be (px).
export function inTorch(viewer, target, { reach, above = 0, below = 0, requireGround = false, behind = 8 }) {
  if (requireGround && !viewer.grounded) return false;
  const rise = viewer.feetY - target.feetY;
  if (rise > above || -rise > below) return false;
  const d = (target.x - viewer.x) * viewer.facing;
  return d >= -behind && d <= reach;
}

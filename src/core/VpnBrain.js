// IT: a VPN platform (docs/IT_HR_EXTERNAL.md §2.2). Fixed cycle on the level clock: connected for `onMs`, disconnected
// for `offMs`, shifted by `phaseMs`; three dots go out one by one in the last `warnMs` of "connected". Pivoted: always on.
export default class VpnBrain {
  constructor({ onMs = 2000, offMs = 1200, phaseMs = 0, warnMs = 600 } = {}, pivoted = false) {
    this.onMs = onMs;
    this.offMs = offMs;
    this.phaseMs = phaseMs;
    this.warnMs = warnMs;
    this.pivoted = pivoted;
  }

  local(t) {
    const cycle = this.onMs + this.offMs;
    return (((t - this.phaseMs) % cycle) + cycle) % cycle;
  }

  isOn(t) {
    return this.pivoted || this.local(t) < this.onMs;
  }

  // dots still lit while connected: 3, then 3 → 0 in the last warnMs; null when off (or pivoted)
  dots(t) {
    if (this.pivoted) return 3;
    const l = this.local(t);
    if (l >= this.onMs) return null;
    const left = this.onMs - l;
    return left >= this.warnMs ? 3 : Math.ceil((left / this.warnMs) * 3);
  }
}

// Pure trail of the player's recent positions (ITERATION_4 §4.1): team member i replays where the
// player was (i + 1) × delayMs ago. Only advanced while the game runs, so it pauses with everything else.
export default class TeamTrail {
  constructor({ delayMs = 300, maxMembers = 6 } = {}) {
    this.delayMs = delayMs;
    this.keepMs = (maxMembers + 1) * delayMs + 200;
    this.reset({ x: 0, y: 0 });
  }

  reset(sample) {
    this.t = 0;
    this.samples = [{ t: 0, ...sample }];
  }

  push(dt, sample) {
    this.t += dt;
    this.samples.push({ t: this.t, ...sample });
    const oldest = this.t - this.keepMs;
    while (this.samples.length > 2 && this.samples[1].t <= oldest) this.samples.shift();
  }

  // Sample for the i-th follower (0 = closest to the player).
  positionFor(i) {
    const target = this.t - (i + 1) * this.delayMs;
    let best = this.samples[0];
    for (const s of this.samples) {
      if (s.t > target) break;
      best = s;
    }
    return best;
  }
}

// External resources: the contractor (docs/IT_HR_EXTERNAL.md §4). Hire him (E at his desk, paid by the scene): after
// `delayMs` he builds "come da specifica" — everything but the last piece; report the defect (E again) and after
// `fixMs` the last piece comes too. Once per level: a death does not undo it.
export default class ContractorBrain {
  constructor({ delayMs = 4000, fixMs = 2000 } = {}) {
    this.delayMs = delayMs;
    this.fixMs = fixMs;
    this.state = 'idle';
    this.timer = 0;
  }

  // the action key at his desk: 'hire' | 'report' | null (nothing to do)
  act() {
    if (this.state === 'idle') {
      this.state = 'hired';
      this.timer = 0;
      return 'hire';
    }
    if (this.state === 'built') {
      this.state = 'fixing';
      this.timer = 0;
      return 'report';
    }
    return null;
  }

  // Returns 'build' (all but the last piece) | 'fix' (the last piece) | null.
  update(dt) {
    if (this.state === 'hired' || this.state === 'fixing') {
      this.timer += dt;
      const fixing = this.state === 'fixing';
      if (this.timer >= (fixing ? this.fixMs : this.delayMs)) {
        this.state = fixing ? 'complete' : 'built';
        return fixing ? 'fix' : 'build';
      }
    }
    return null;
  }
}

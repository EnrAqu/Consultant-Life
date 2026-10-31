const round = (x) => Math.round(x * 2) / 2;

export default class Budget {
  constructor(max) {
    this._max = max;
    this._gu = max;
  }

  get gu() {
    return Math.max(0, this._gu);
  }

  get max() {
    return this._max;
  }

  spend(amount) {
    const before = this._gu;
    this._gu = round(this._gu - amount);
    return this._gu - before;
  }

  gain(amount) {
    const before = this._gu;
    this._gu = Math.min(this._max, round(this._gu + amount));
    return this._gu - before;
  }

  isOver() {
    return this._gu <= 0;
  }

  ratio() {
    return this.gu / this._max;
  }
}

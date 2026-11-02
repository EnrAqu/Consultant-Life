// The farm's day (docs/FARM.md §4): chores, the phone that buzzes at fixed times, the summary for the ending.
// Pure logic, no Phaser.
export default class FarmDay {
  constructor({ eggsTotal, vegTotal, messages, firstMs, intervalMs, finalMessage = null }) {
    this.eggsTotal = eggsTotal;
    this.vegTotal = vegTotal;
    this.messages = messages;
    this.firstMs = firstMs;
    this.intervalMs = intervalMs;
    this.finalMessage = finalMessage;
    this.eggs = 0;
    this.veg = 0;
    this.started = false;
    this.elapsed = 0;
    this.received = 0;
    this.phoneThrown = false;
    this.ended = false;
  }

  // the phone's clock starts with the first move (the opening card is never interrupted)
  start() {
    this.started = true;
  }

  // Returns the message arriving now, or null. One per call: a long frame never skips one.
  update(dt) {
    if (!this.started || this.ended || this.phoneThrown || this.messages.length === 0) return null;
    this.elapsed += dt;
    if (this.elapsed < this.firstMs + this.received * this.intervalMs) return null;
    const message = this.messages[this.received % this.messages.length];
    this.received += 1;
    return message;
  }

  collect(kind) {
    if (this.ended) return;
    if (kind === 'egg') this.eggs = Math.min(this.eggsTotal, this.eggs + 1);
    if (kind === 'veg') this.veg = Math.min(this.vegTotal, this.veg + 1);
  }

  // true only the first time
  throwPhone() {
    if (this.phoneThrown || this.ended) return false;
    this.phoneThrown = true;
    return true;
  }

  // The end of the day. With the phone still in your pocket, one last message arrives on the bench.
  finish() {
    if (!this.ended) {
      this.ended = true;
      this.lastMessage = !this.phoneThrown && this.finalMessage ? this.finalMessage : null;
      if (this.lastMessage) this.received += 1;
    }
    return { eggs: this.eggs, eggsTotal: this.eggsTotal, veg: this.veg, vegTotal: this.vegTotal, received: this.received, phoneThrown: this.phoneThrown, lastMessage: this.lastMessage };
  }
}

// 0..1 along the way from `from` to `to`, clamped
export function progress(x, from, to) {
  if (to <= from) return 1;
  return Math.min(1, Math.max(0, (x - from) / (to - from)));
}

function lerpColor(a, b, t) {
  const ch = (shift) => Math.round(((a >> shift) & 0xff) + (((b >> shift) & 0xff) - ((a >> shift) & 0xff)) * t);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}

// The afternoon sky turns golden as you walk; the sunset on the bench goes on from there.
export const SKY = { afternoon: 0x7dd3fc, golden: 0xfdba74, sunset: 0x7c3aed, night: 0x1e1b4b };
export function skyColor(t) {
  return lerpColor(SKY.afternoon, SKY.golden, Math.min(1, Math.max(0, t)));
}
export function sunsetColor(t) {
  const k = Math.min(1, Math.max(0, t));
  return k < 0.5 ? lerpColor(SKY.golden, SKY.sunset, k * 2) : lerpColor(SKY.sunset, SKY.night, (k - 0.5) * 2);
}

// Texts of the burnout ending (EndingScene). Without a summary (debug ?ending=burnout) only the first line.
export function farmEndingText(summary) {
  const first = 'Hai mollato tutto. Ora fai il contadino.';
  if (!summary) return { after: first, stats: '' };
  const phone = summary.phoneThrown ? 'Il telefono è nello stagno. Le rane non fanno call.' : 'Il telefono è ancora in tasca. Vibra.';
  const stats =
    `Uova: ${summary.eggs}/${summary.eggsTotal} · Ortaggi: ${summary.veg}/${summary.vegTotal} · Notifiche ignorate: ${summary.received}` +
    (summary.phoneThrown ? ' · Telefono: nello stagno' : '');
  return { after: `${first}\n${phone}`, stats };
}

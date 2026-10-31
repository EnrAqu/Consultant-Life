export function formatGu(value) {
  return Math.max(0, value).toFixed(1).replace('.', ',');
}

export function formatClock(minutes) {
  const total = Math.floor(minutes);
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function formatDuration(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function parseClock(label) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(label ?? '');
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

import { parseClock } from '../core/format.js';

const PIVOTS = ['replyAll', 'scopeCreep', 'deckCollapse', 'fakeKT', 'micromanager', 'fiveMinutes'];

function readParams() {
  try {
    return new URLSearchParams(globalThis.location?.search ?? '');
  } catch {
    return new URLSearchParams('');
  }
}

const q = readParams();
const num = (key) => {
  const v = Number(q.get(key));
  return q.has(key) && Number.isFinite(v) && v > 0 ? v : null;
};

export const DEBUG = {
  debug: q.get('debug') === '1',
  level: ['level1', 'level2', 'level3'].includes(q.get('level')) ? q.get('level') : null,
  pivot: PIVOTS.includes(q.get('pivot')) ? q.get('pivot') : null,
  standupOff: q.get('standup') === 'off',
  resetStats: q.get('resetStats') === '1',
  gu: num('gu'),
  clock: parseClock(q.get('clock')),
  clockSpeed: num('clockSpeed') ?? 1,
  cp: q.get('cp'),
  god: q.get('god') === '1',
  outfit: q.get('outfit'),
};

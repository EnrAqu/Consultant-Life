import { createGrid } from './builder.js';

const W = 110;
const g = createGrid(W);

g.ground(0, 35).put(2, 14, 'P');
// slotA — corridor 10–19, unreachable ledge (+5) with coffee
g.fill(20, 26, 10, 10, '#').put(23, 9, 'o');
// slotB — ledge 30–35, pit 36–46 with a single pillar at 41, landing 47+
g.ground(41, 41).ground(47, 84).put(52, 14, 'C');
// slotC — deck corridor 60–65 (pivoted: the floor becomes a pit via tile override)
// slotD — spike pit 85–94 with a 2-wide pillar at 89–90 (jumps of 4)
g.ground(85, 94);
for (let x = 85; x <= 94; x++) if (x !== 89 && x !== 90) g.put(x, 14, '^');
g.ground(89, 90, 14).ground(95, 109);
g.put(106, 14, 'G');

const replyAllNormal = { triggerDx: -5, triggerWidth: 2, startDelayMs: 0, count: 10, intervalMs: 120, columns: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], spawnHeight: 6, fallSpeed: 9, restRow: 14 };

export default {
  id: 'level2',
  name: 'Progetto 2 — La rivincita',
  career: 'consultant',
  startGu: 15,
  map: g.toMap(),
  entities: [
    {
      id: 'slotA', type: 'replyAll', x: 10, y: 14, slot: true,
      params: {
        normal: replyAllNormal,
        pivoted: { triggerDx: -5, triggerWidth: 2, startDelayMs: 200, count: 12, intervalMs: 300, columns: [7, 7, 8, 8, 8, 8, 9, 9, 9, 9, 9, 9], spawnHeight: 6, fallSpeed: 9, restRow: 14, stayMs: 8000 },
      },
    },
    {
      id: 'slotB', type: 'scopeCreep', x: 30, y: 14, slot: true,
      params: {
        normal: { direction: 'right', baseLength: 1, maxLength: 6, triggerDx: 1, triggerWidth: 3, armDelayMs: 450, extendSpeed: 5, pitRect: { dx: 6, dy: 1, w: 11, h: 2 } },
        pivoted: { direction: 'right', dy: 1, baseLength: 1, maxLength: 17, triggerDx: 0, triggerWidth: 3, armDelayMs: 300, extendSpeed: 8 },
      },
    },
    {
      id: 'slotC', type: 'deckCollapse', x: 60, y: 14, slot: true,
      params: {
        normal: {
          slideCount: 6, stackRow: 9, triggerDx: 0, triggerWidth: 1, corridorWidth: 6, wobbleMs: 350, dropIntervalMs: 120, fallSpeed: 14,
          targets: [{ dx: 4, row: 14 }, { dx: 2, row: 14 }, { dx: 0, row: 14 }, { dx: 4, row: 13 }, { dx: 2, row: 13 }, { dx: 0, row: 13 }],
        },
        pivoted: {
          slideCount: 3, stackRow: 8, triggerDx: -8, triggerWidth: 2, wobbleMs: 0, dropIntervalMs: 100, fallSpeed: 20,
          targets: [{ dx: 0, row: 15 }, { dx: 2, row: 15 }, { dx: 4, row: 15 }],
          tiles: [{ dx: 0, dy: 1, w: 6, h: 2, char: '.' }],
        },
      },
    },
    {
      id: 'slotD', type: 'fakeKT', x: 83, y: 11, slot: true,
      params: {
        normal: { callMs: 4000 },
        pivoted: { callMs: 800, hiddenPlatforms: [{ dx: 3, dy: 2, w: 2, h: 1 }, { dx: 6, dy: 2, w: 2, h: 1 }, { dx: 9, dy: 2, w: 2, h: 1 }] },
      },
    },
  ],
};

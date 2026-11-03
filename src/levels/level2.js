import { createGrid } from './builder.js';

const W = 125;
const g = createGrid(W);

g.ground(0, 35).put(2, 14, 'P');
// slotA — corridor 10–19, unreachable ledge (+5) with coffee
g.fill(20, 26, 10, 10, '#').put(23, 9, 'o');
// slotB — ledge 30–35, pit 36–46 with a single pillar at 41, landing 47+
g.ground(41, 41).ground(47, 84).put(52, 14, 'C');
// the PM (docs/PM_LINKEDIN.md): pit 67–72 right after the micromanager, crossed only on his Gantt bar (68–70, one up);
// then two tiles (73–74) before the two spikes 75–76 (review #5: one tile was a 34 px window at full speed)
g.fill(67, 72, 15, 16, '.');
g.put(75, 14, '^').put(76, 14, '^');
// micromanager zone 54–66 (starts after the checkpoint, so you never respawn in his light);
// the plant at 57 blocks his light: wait for the deck behind it
g.put(57, 14, 'p');
// slotC — deck corridor 60–65 (pivoted: the floor becomes a pit via tile override)
// slotD — spike pit 85–94 with a 2-wide pillar at 89–90 (jumps of 4)
g.ground(85, 94);
for (let x = 85; x <= 94; x++) if (x !== 89 && x !== 90) g.put(x, 14, '^');
g.ground(89, 90, 14).ground(95, 96).ground(104, 110);
// LinkedIn: pit 97–103 before the delivery (95–96 to land after the KT pit, review #5), two posts (98–99 one up,
// the sponsored 101–102 three up: from it you can jump straight over the sign, 102 → 107)
g.put(106, 14, 'G');
// beyond the betraying goal: a fast CR on a step over a pit, then where the sign gets carried (col 120)
g.ground(111, 114, 13).ground(118, W - 1);

const replyAllNormal = { triggerDx: -3, triggerWidth: 2, startDelayMs: 0, count: 10, intervalMs: 120, columns: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], spawnHeight: 6, fallSpeed: 14, restRow: 14 };

export default {
  id: 'level2',
  name: 'Progetto 2 — La rivincita',
  career: 'consultant',
  goal: { trolls: true, carryCols: 14 },
  startGu: 15,
  map: g.toMap(),
  entities: [
    {
      id: 'scEnd', type: 'scopeCreep', x: 111, y: 12,
      params: { direction: 'right', baseLength: 1, maxLength: 4, triggerDx: 1, triggerWidth: 2, armDelayMs: 250, extendSpeed: 12, pitRect: { dx: 4, dy: 1, w: 3, h: 4 } },
    },
    {
      id: 'pm1', type: 'pm', x: 68, y: 14,
      params: { width: 3, shift: -3, speed: 6, delayMs: 450, returnDelayMs: 1200, pmDx: -2, label: 'Go-live (da ripianificare)', pitRect: { dx: -1, dy: 1, w: 6, h: 2 } },
    },
    { id: 'li1', type: 'linkedin', x: 98, y: 13, params: { width: 2, likes: 3, likeMs: 350, text: 'Sono felice di annunciare…', pitRect: { dx: -1, dy: 2, w: 7, h: 2 } } },
    { id: 'li2', type: 'linkedin', x: 101, y: 11, params: { width: 2, likes: 1, likeMs: 300, text: 'Cosa mi ha insegnato il burnout sul B2B', pitRect: { dx: -4, dy: 4, w: 7, h: 2 } } },
    {
      id: 'mm1', type: 'micromanager', x: 54, y: 14,
      params: { zoneFrom: 54, zoneTo: 66, floorRow: 14, demoJump: null },
    },
    {
      id: 'slotA', type: 'replyAll', x: 10, y: 14, slot: true,
      params: {
        normal: replyAllNormal,
        pivoted: { triggerDx: -5, triggerWidth: 2, startDelayMs: 200, count: 12, intervalMs: 300, columns: [7, 7, 8, 8, 8, 8, 9, 9, 9, 9, 9, 9], spawnHeight: 6, fallSpeed: 14, restRow: 14, stayMs: 8000 },
      },
    },
    {
      id: 'slotB', type: 'scopeCreep', x: 30, y: 14, slot: true,
      params: {
        normal: { direction: 'right', baseLength: 1, maxLength: 6, triggerDx: 1, triggerWidth: 3, armDelayMs: 250, extendSpeed: 12, pitRect: { dx: 6, dy: 1, w: 11, h: 2 } },
        pivoted: { direction: 'right', dy: 1, baseLength: 1, maxLength: 17, triggerDx: 0, triggerWidth: 3, armDelayMs: 300, extendSpeed: 14 },
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

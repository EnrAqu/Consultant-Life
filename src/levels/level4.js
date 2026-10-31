import { createGrid } from './builder.js';

const W = 200;
const g = createGrid(W);

// S0 — spawn
g.ground(0, 33).put(2, 14, 'P');
// S1 — the arrivista starts behind you; two coffees he would love to take; pit 34–36
g.put(18, 14, 'o').put(27, 14, 'o');
// S2 — "hai 5 minuti?" door (46), reply-all slot corridor 52–61, ledge (+5) for the pivoted stair
g.ground(37, 87).fill(62, 68, 10, 10, '#').put(65, 9, 'o');
// S3 — intern desk (69) and approval gate (76, plate 72)
// S4 — AI chip (82, floating) over a wide pit 88–101 with two 2-wide pillars (normal route: jumps of 4)
g.ground(92, 93).ground(98, 99).ground(102, 129).put(106, 14, 'C');
// S5 — deck slot corridor 112–117; scope creep slot: ledge 124–129, pit 130–139 with a pillar at 134–135
g.ground(134, 135).ground(140, 183);
// S6 — intern (147), gate (156, plate 152); a second arrivista sprints to the goal, a short avalanche in the way
g.put(172, 14, 'o');
// S7 — betraying goal at 176 (client side 177–179), then spikes 180–181, pit 184–186, the sign is carried to 190
g.put(176, 14, 'G').put(180, 14, '^').put(181, 14, '^').ground(187, W - 1);

const replyAllNormal = { triggerDx: -3, triggerWidth: 2, startDelayMs: 0, count: 10, intervalMs: 120, columns: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], spawnHeight: 6, fallSpeed: 14, restRow: 14 };
const deckNormal = {
  slideCount: 6, stackRow: 9, triggerDx: 0, triggerWidth: 1, corridorWidth: 6, wobbleMs: 350, dropIntervalMs: 120, fallSpeed: 14,
  targets: [{ dx: 4, row: 14 }, { dx: 2, row: 14 }, { dx: 0, row: 14 }, { dx: 4, row: 13 }, { dx: 2, row: 13 }, { dx: 0, row: 13 }],
};

export default {
  id: 'level4',
  name: 'Progetto 4 — Il cliente strategico',
  career: 'seniorManager',
  team: { size: 3 },
  goal: { trolls: true, carryCols: 14 },
  startGu: 15,
  map: g.toMap(),
  entities: [
    { id: 'sign1', type: 'sign', x: 3, y: 13, text: 'Senior Manager: ora il cliente ti chiama per nome. Purtroppo.' },
    { id: 'rival1', type: 'rival', x: 6, y: 14, params: { startCol: 6, triggerCol: 9, stopCol: 75 } },
    { id: 'five1', type: 'fiveMinutes', x: 46, y: 14, slot: true, params: { normal: {}, pivoted: { shortcutTo: { col: 70, row: 14 } } } },
    {
      id: 'slotA', type: 'replyAll', x: 52, y: 14, slot: true,
      params: {
        normal: replyAllNormal,
        pivoted: { triggerDx: -3, triggerWidth: 2, startDelayMs: 200, count: 12, intervalMs: 300, columns: [7, 7, 8, 8, 8, 8, 9, 9, 9, 9, 9, 9], spawnHeight: 6, fallSpeed: 14, restRow: 14, stayMs: 8000 },
      },
    },
    { id: 'intern1', type: 'intern', x: 69, y: 14 },
    { id: 'gate1', type: 'approvalGate', x: 76, y: 14, params: { plateDx: -4 } },
    {
      id: 'ai1', type: 'aiDraft', x: 82, y: 11,
      params: {
        platforms: [
          { dx: 5, dy: 1, w: 3, fake: false },
          { dx: 9, dy: 1, w: 3, fake: true },
          { dx: 13, dy: 1, w: 3, fake: false },
          { dx: 17, dy: 1, w: 3, fake: true },
          { dx: 21, dy: 1, w: 2, fake: false },
        ],
      },
    },
    { id: 'slotC', type: 'deckCollapse', x: 112, y: 14, slot: true,
      params: {
        normal: deckNormal,
        pivoted: {
          slideCount: 3, stackRow: 8, triggerDx: -8, triggerWidth: 2, wobbleMs: 0, dropIntervalMs: 100, fallSpeed: 20,
          targets: [{ dx: 0, row: 15 }, { dx: 2, row: 15 }, { dx: 4, row: 15 }],
          tiles: [{ dx: 0, dy: 1, w: 6, h: 2, char: '.' }],
        },
      },
    },
    {
      id: 'slotB', type: 'scopeCreep', x: 124, y: 14, slot: true,
      params: {
        normal: { direction: 'right', baseLength: 1, maxLength: 6, triggerDx: 1, triggerWidth: 3, armDelayMs: 250, extendSpeed: 12, pitRect: { dx: 6, dy: 1, w: 10, h: 2 } },
        pivoted: { direction: 'right', dy: 1, baseLength: 1, maxLength: 16, triggerDx: 0, triggerWidth: 3, armDelayMs: 300, extendSpeed: 14 },
      },
    },
    { id: 'intern2', type: 'intern', x: 147, y: 14 },
    { id: 'gate2', type: 'approvalGate', x: 156, y: 14, params: { plateDx: -4 } },
    { id: 'rival2', type: 'rival', x: 158, y: 14, params: { startCol: 158, triggerCol: 160, stopCol: 176, atGoal: true } },
    {
      id: 'raEnd', type: 'replyAll', x: 166, y: 14,
      params: { triggerDx: -3, triggerWidth: 2, startDelayMs: 0, count: 5, intervalMs: 120, columns: [0, 1, 2, 3, 4], spawnHeight: 6, fallSpeed: 14, restRow: 14 },
    },
  ],
};

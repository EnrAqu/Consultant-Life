import { createGrid } from './builder.js';

const W = 180;
const g = createGrid(W);

// S0 — spawn
g.ground(0, 26).put(2, 14, 'P');
// S1 — micromanager zone A (16–40), plants at 20 and 33, pit 27–29 = his demo jump
g.put(20, 14, 'p').ground(30, 123).put(33, 14, 'p');
// S2 — two "hai 5 minuti?" doors (47, 56) on a flat corridor
// S3 — slot replyAll corridor 66–75, unreachable ledge (+5) with coffee, door at the exit (84)
g.fill(76, 82, 10, 10, '#').put(79, 9, 'o');
// S4 — micromanager zone B (86–110) with the deck slot corridor 96–101, plant at 93
g.put(93, 14, 'p').put(112, 14, 'C');
// S5 — slot scopeCreep: ledge 118–123, pit 124–133 with a 2-wide pillar at 128–129, then a door (140) before a gap of 4
g.ground(128, 129).ground(134, 144).ground(149, 165);
// S6 — micromanager slot zone 150–165, KT slot over a spike pit 166–173 (pillar 169–170), goal
g.ground(166, 173);
for (let x = 166; x <= 173; x++) if (x !== 169 && x !== 170) g.put(x, 14, '^');
g.ground(169, 170, 14).ground(174, W - 1).put(176, 14, 'G');

const replyAllNormal = { triggerDx: -3, triggerWidth: 2, startDelayMs: 0, count: 10, intervalMs: 120, columns: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], spawnHeight: 6, fallSpeed: 14, restRow: 14 };
const deckNormal = {
  slideCount: 6, stackRow: 9, triggerDx: 0, triggerWidth: 1, corridorWidth: 6, wobbleMs: 350, dropIntervalMs: 120, fallSpeed: 14,
  targets: [{ dx: 4, row: 14 }, { dx: 2, row: 14 }, { dx: 0, row: 14 }, { dx: 4, row: 13 }, { dx: 2, row: 13 }, { dx: 0, row: 13 }],
};

export default {
  id: 'level3',
  name: 'Progetto 3 — Il primo team',
  career: 'manager',
  team: { size: 3 },
  startGu: 15,
  map: g.toMap(),
  entities: [
    { id: 'sign1', type: 'sign', x: 3, y: 13, text: 'Promosso Manager! Ora hai un team. E un capo in più.' },
    // first delegation: the gate needs someone on the plate (col 8) — press E
    { id: 'intern1', type: 'intern', x: 5, y: 14 },
    { id: 'gate1', type: 'approvalGate', x: 12, y: 14, params: { plateDx: -4 } },
    { id: 'sign2', type: 'sign', x: 7, y: 9, text: 'E = delega a un junior' },
    {
      id: 'mmA', type: 'micromanager', x: 16, y: 14, slot: true,
      params: {
        normal: { zoneFrom: 16, zoneTo: 40, floorRow: 14, demoJump: { fromCol: 26, toCol: 30 } },
        pivoted: { zoneFrom: 16, zoneTo: 40, floorRow: 14, demoJump: { fromCol: 26, toCol: 30 } },
      },
    },
    { id: 'five1', type: 'fiveMinutes', x: 47, y: 14, params: {} },
    { id: 'five2', type: 'fiveMinutes', x: 56, y: 14, params: {} },
    {
      id: 'slotA', type: 'replyAll', x: 66, y: 14, slot: true,
      params: {
        normal: replyAllNormal,
        pivoted: { triggerDx: -5, triggerWidth: 2, startDelayMs: 200, count: 12, intervalMs: 300, columns: [7, 7, 8, 8, 8, 8, 9, 9, 9, 9, 9, 9], spawnHeight: 6, fallSpeed: 14, restRow: 14, stayMs: 8000 },
      },
    },
    { id: 'five3', type: 'fiveMinutes', x: 84, y: 14, params: {} },
    {
      id: 'mmB', type: 'micromanager', x: 86, y: 14, slot: true,
      params: {
        normal: { zoneFrom: 86, zoneTo: 110, floorRow: 14, demoJump: null },
        pivoted: { zoneFrom: 86, zoneTo: 110, floorRow: 14, demoJump: null },
      },
    },
    {
      id: 'slotC', type: 'deckCollapse', x: 96, y: 14, slot: true,
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
      id: 'slotB', type: 'scopeCreep', x: 118, y: 14, slot: true,
      params: {
        normal: { direction: 'right', baseLength: 1, maxLength: 6, triggerDx: 1, triggerWidth: 3, armDelayMs: 250, extendSpeed: 12, pitRect: { dx: 6, dy: 1, w: 10, h: 2 } },
        pivoted: { direction: 'right', dy: 1, baseLength: 1, maxLength: 16, triggerDx: 0, triggerWidth: 3, armDelayMs: 300, extendSpeed: 14 },
      },
    },
    { id: 'five4', type: 'fiveMinutes', x: 140, y: 14, slot: true, params: { normal: {}, pivoted: { shortcutTo: { col: 152, row: 14 } } } },
    {
      id: 'slotMM', type: 'micromanager', x: 150, y: 14, slot: true,
      params: {
        normal: { zoneFrom: 150, zoneTo: 165, floorRow: 14, demoJump: null },
        pivoted: { zoneFrom: 150, zoneTo: 165, floorRow: 14, demoJump: null },
      },
    },
    {
      id: 'slotD', type: 'fakeKT', x: 164, y: 11, slot: true,
      params: {
        normal: { callMs: 4000 },
        pivoted: { callMs: 800, hiddenPlatforms: [{ dx: 3, dy: 2, w: 2, h: 1 }, { dx: 6, dy: 2, w: 2, h: 1 }, { dx: 9, dy: 2, w: 2, h: 1 }] },
      },
    },
  ],
};

import { createGrid } from './builder.js';

// Level 5 "La Partnership" (ITERATION_5 §7): a tower. You climb from the lobby to the Board while the
// escalation rises from below. Floors are one-way slabs (land on them, jump through them from below).
// Rows: standing row = the row above a platform. Lobby 87–96, floor 1 62–85, floor 2 38–61, floor 3 14–37, Board 1–13.
// Every slab above floor 1 has a stairwell (2 empty columns) right above the floor's deal: a deal you skipped can
// always be fetched by dropping back down (review 5 #1).
const W = 32;
const H = 100;
const g = createGrid(W, H);
const shelf = (x1, x2, row) => g.fill(x1, x2, row, row, '=');

// tower walls and ceiling
g.fill(0, 0, 0, H - 1, '#').fill(W - 1, W - 1, 0, H - 1, '#').fill(1, W - 2, 0, 0, '#');

// Lobby — spawn; the sycophant's mat is the only way up (rise 5), then one step to floor 1
g.ground(1, W - 2, 97).put(3, 96, 'P').put(20, 96, 'b');
shelf(19, 22, 92);
shelf(24, 26, 89);

// Floor 1 "Delivery" (slab A, standing 85) — worker 1 builds the scaffolding on the left (you arrive from the right,
// looking at him: turn around). Deal on a ledge next to the last plank. Shelf S1 (standing 67): reply-all slot,
// then worker 2 builds the last plank up to floor 2.
shelf(1, W - 2, 86);
shelf(1, 2, 71);
g.put(1, 70, '$');
shelf(3, 24, 68);
g.put(3, 67, 'C');

// Floor 2 (slab B, standing 61) — "5 minuti" door; two steps up to shelf T (standing 52) with the deck corridor;
// deal on a ledge at the end of T; four steps up to floor 3.
shelf(3, W - 2, 62);
shelf(9, 11, 59);
shelf(5, 7, 56);
shelf(2, 28, 53);
g.put(4, 52, 'C');
shelf(29, 30, 50);
g.put(30, 49, '$');
shelf(22, 24, 50);
shelf(18, 20, 47);
shelf(22, 24, 44);
shelf(18, 20, 41);

// Floor 3 (slab C, standing 37) — mat to bounce onto shelf U (standing 32); deal ledge on the left;
// scope creep slot at the end of U over a pit with a pillar; worker 3 on U2, then three steps to the Board.
shelf(1, W - 4, 38);
g.put(14, 37, 'C').put(8, 37, 'b');
shelf(6, 15, 33);
shelf(3, 4, 30);
g.put(3, 29, '$');
shelf(20, 21, 33);
shelf(26, 30, 33);
shelf(21, 23, 22);
shelf(25, 27, 19);
shelf(21, 23, 16);

// Board (slab D, standing 13) — the escalation stops here; the Board door wants the full pipeline
shelf(1, W - 4, 14);
g.put(22, 13, 'C').put(12, 13, 'o').put(4, 13, 'G');

const replyAllNormal = { triggerDx: -3, triggerWidth: 2, startDelayMs: 0, count: 10, intervalMs: 120, columns: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], spawnHeight: 6, fallSpeed: 14, restRow: 67 };
const deckNormal = {
  slideCount: 6, stackRow: 47, triggerDx: 0, triggerWidth: 1, corridorWidth: 6, wobbleMs: 350, dropIntervalMs: 120, fallSpeed: 14,
  targets: [{ dx: 4, row: 52 }, { dx: 2, row: 52 }, { dx: 0, row: 52 }, { dx: 4, row: 51 }, { dx: 2, row: 51 }, { dx: 0, row: 51 }],
};

export default {
  id: 'level5',
  name: 'Progetto 5 — La Partnership',
  career: 'partner',
  vertical: true,
  rows: H,
  team: { size: 3 },
  sycophant: true,
  escalation: { startRow: 86, stopRow: 13, floorRow: 96 },
  goal: { requiresDeals: 3, label: 'Board dei Partner' },
  startGu: 15,
  map: g.toMap(),
  entities: [
    { id: 'sign1', type: 'sign', x: 5, y: 96, text: "Partner: finalmente puoi chiedere tu \"hai 5 minuti?\"" },
    { id: 'sign2', type: 'sign', x: 6, y: 13, text: 'Board dei Partner — solo con la pipeline piena' },
    { id: 'sign3', type: 'sign', x: 8, y: 92, text: 'Il Board riceve solo con 3 opportunità in pipeline' },
    // stairwells: the gap at the end of the slab (walk off the edge); `stairs` marks the edge and the gap
    { id: 'stairs1', type: 'sign', x: 5, y: 61, text: '← Scale (cadi giù)', stairs: { edgeCol: 3, gapCol: 1.5 } },
    { id: 'stairs2', type: 'sign', x: 23, y: 37, text: 'Scale (cadi giù) →', stairs: { edgeCol: 28, gapCol: 29.5 } },
    { id: 'stairs3', type: 'sign', x: 23, y: 13, text: 'Scale (cadi giù) →', stairs: { edgeCol: 28, gapCol: 29.5 } },
    // floor 1
    {
      id: 'worker1', type: 'worker', x: 14, y: 85,
      params: { cells: [{ dx: -3, dy: -2 }, { dx: -6, dy: -5 }, { dx: -3, dy: -8 }, { dx: -6, dy: -11 }, { dx: -9, dy: -14 }] },
    },
    {
      id: 'slotA', type: 'replyAll', x: 10, y: 67, slot: true,
      params: {
        normal: replyAllNormal,
        // pivoted: the emails pile up into a staircase towards floor 2
        pivoted: { ...replyAllNormal, startDelayMs: 200, count: 12, intervalMs: 300, columns: [7, 7, 8, 8, 8, 8, 9, 9, 9, 9, 9, 9], stayMs: 8000 },
      },
    },
    { id: 'worker2', type: 'worker', x: 22, y: 67, params: { cells: [{ dx: 3, dy: -2 }] } },
    // floor 2
    { id: 'five1', type: 'fiveMinutes', x: 18, y: 61, slot: true, params: { normal: {}, pivoted: { shortcutTo: { col: 19, row: 46 } } } },
    {
      id: 'slotC', type: 'deckCollapse', x: 12, y: 52, slot: true,
      params: {
        normal: deckNormal,
        pivoted: {
          slideCount: 3, stackRow: 46, triggerDx: -8, triggerWidth: 2, wobbleMs: 0, dropIntervalMs: 100, fallSpeed: 20,
          targets: [{ dx: 0, row: 53 }, { dx: 2, row: 53 }, { dx: 4, row: 53 }],
          tiles: [{ dx: 0, dy: 1, w: 6, h: 2, char: '.' }],
        },
      },
    },
    // floor 3
    {
      id: 'slotB', type: 'scopeCreep', x: 10, y: 32, slot: true,
      params: {
        normal: { direction: 'right', baseLength: 1, maxLength: 6, triggerDx: 1, triggerWidth: 3, armDelayMs: 250, extendSpeed: 12, pitRect: { dx: 6, dy: 1, w: 10, h: 2 } },
        pivoted: { direction: 'right', dy: 1, baseLength: 1, maxLength: 16, triggerDx: 0, triggerWidth: 3, armDelayMs: 300, extendSpeed: 14 },
      },
    },
    { id: 'worker3', type: 'worker', x: 29, y: 32, params: { cells: [{ dx: -4, dy: -2 }, { dx: -7, dy: -5 }, { dx: -4, dy: -8 }] } },
  ],
};

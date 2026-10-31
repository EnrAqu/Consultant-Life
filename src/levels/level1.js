import { createGrid } from './builder.js';

const W = 220;
const g = createGrid(W);

// S0 — spawn, flat
g.ground(0, 17).put(2, 14, 'P');
// S1 — gaps 2 and 3, step +2, three spikes, coffee
g.ground(20, 23).ground(27, 29).ground(30, 37, 13);
g.put(32, 12, '^').put(33, 12, '^').put(34, 12, '^').put(36, 12, 'o');
// S2 — ReplyAll #1 corridor (cols 42–51)
g.ground(38, 54);
// S3 — ScopeCreep right: ledge 55–60, pit 61–64, landing 65–72
g.ground(55, 60, 13).ground(65, 72, 13);
// S4 — respite: coffees on desks, fake KT next to the third coffee, checkpoint
g.ground(73, 131).ground(138, 146);
g.fill(78, 80, 12, 12, '=').put(79, 11, 'o');
g.fill(86, 88, 12, 12, '=').put(87, 11, 'o');
g.fill(94, 98, 12, 12, '=').put(94, 11, 'o');
g.put(108, 14, 'C');
// S5 — CollapsingDeck corridor (cols 114–119)
// S6a — escalation bridge: pit 132–137 (6, not jumpable) filled by falling emails, then spikes
g.put(140, 14, '^').put(141, 14, '^').put(142, 14, '^');
// S6b — ScopeCreep left: pit 147–150, ledge 151–157, wall 158–160
g.ground(151, 157).ground(158, 160, 12);
// S7 — final run: gap of 4 over a pit, ramp, goal
g.ground(161, 175).put(170, 14, 'o').ground(180, 190).ground(191, 219, 13);
g.put(214, 12, 'G');

export default {
  id: 'level1',
  name: 'Progetto 1 — Primo giorno',
  career: 'junior',
  startGu: 20,
  map: g.toMap(),
  entities: [
    { id: 'sign1', type: 'sign', x: 5, y: 13, text: 'Primo giorno! Benvenuto in azienda.' },
    {
      id: 'ra1', type: 'replyAll', x: 42, y: 14,
      params: { triggerDx: -5, triggerWidth: 2, startDelayMs: 0, count: 10, intervalMs: 120, columns: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], spawnHeight: 6, fallSpeed: 9, restRow: 14 },
    },
    {
      id: 'sc1', type: 'scopeCreep', x: 55, y: 12,
      params: { direction: 'right', baseLength: 1, maxLength: 6, triggerDx: 1, triggerWidth: 3, armDelayMs: 450, extendSpeed: 5, pitRect: { dx: 6, dy: 1, w: 4, h: 4 } },
    },
    { id: 'kt1', type: 'fakeKT', x: 97, y: 11, params: { callMs: 4000 } },
    {
      id: 'dk1', type: 'deckCollapse', x: 114, y: 14,
      params: {
        slideCount: 6, stackRow: 9, triggerDx: 0, triggerWidth: 1, corridorWidth: 6, wobbleMs: 350, dropIntervalMs: 120, fallSpeed: 14,
        targets: [{ dx: 4, row: 14 }, { dx: 2, row: 14 }, { dx: 0, row: 14 }, { dx: 4, row: 13 }, { dx: 2, row: 13 }, { dx: 0, row: 13 }],
      },
    },
    {
      id: 'ra2', type: 'replyAll', x: 132, y: 14,
      params: { triggerDx: -6, triggerWidth: 2, startDelayMs: 0, count: 12, intervalMs: 150, columns: [0, 1, 2, 3, 4, 5], spawnHeight: 7, fallSpeed: 9, restRow: 15, landing: 'solid' },
    },
    { id: 'sign2', type: 'sign', x: 122, y: 13, text: 'In attesa di riscontro dal cliente...' },
    {
      id: 'sc2', type: 'scopeCreep', x: 157, y: 14,
      params: { direction: 'left', baseLength: 1, maxLength: 7, triggerDx: -4, triggerWidth: 3, armDelayMs: 450, extendSpeed: 5, pitRect: { dx: -10, dy: 1, w: 4, h: 2 } },
    },
  ],
};

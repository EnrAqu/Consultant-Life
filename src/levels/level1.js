import { createGrid } from './builder.js';

const W = 195;
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
// S4 — short respite: two coffees on desks, fake KT next to the second one, checkpoint
g.ground(73, 117).ground(124, 132);
g.fill(78, 80, 12, 12, '=').put(79, 11, 'o');
g.fill(85, 89, 12, 12, '=').put(85, 11, 'o');
g.put(95, 14, 'C');
// S5 — CollapsingDeck corridor (cols 100–105)
// S6a — escalation bridge: pit 118–123 (6, not jumpable) filled by falling emails, then spikes
g.put(126, 14, '^').put(127, 14, '^').put(128, 14, '^');
// S6b — ScopeCreep left: pit 133–136, ledge 137–143, wall 144–146
g.ground(137, 143).ground(144, 146, 12);
// S7 — "one last round of comments": gap of 4, fast CR on a step over a pit, mini avalanche, goal
g.ground(147, 160).put(150, 14, 'o').ground(165, 172).ground(173, 178, 13).ground(182, W - 1);
g.put(191, 14, 'G');

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
      params: { triggerDx: -3, triggerWidth: 2, startDelayMs: 0, count: 10, intervalMs: 120, columns: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], spawnHeight: 6, fallSpeed: 14, restRow: 14 },
    },
    {
      id: 'sc1', type: 'scopeCreep', x: 55, y: 12,
      params: { direction: 'right', baseLength: 1, maxLength: 6, triggerDx: 1, triggerWidth: 3, armDelayMs: 250, extendSpeed: 12, pitRect: { dx: 6, dy: 1, w: 4, h: 4 } },
    },
    { id: 'kt1', type: 'fakeKT', x: 88, y: 11, params: { callMs: 4000 } },
    {
      id: 'dk1', type: 'deckCollapse', x: 100, y: 14,
      params: {
        slideCount: 6, stackRow: 9, triggerDx: 0, triggerWidth: 1, corridorWidth: 6, wobbleMs: 350, dropIntervalMs: 120, fallSpeed: 14,
        targets: [{ dx: 4, row: 14 }, { dx: 2, row: 14 }, { dx: 0, row: 14 }, { dx: 4, row: 13 }, { dx: 2, row: 13 }, { dx: 0, row: 13 }],
      },
    },
    {
      id: 'ra2', type: 'replyAll', x: 118, y: 14,
      params: { triggerDx: -6, triggerWidth: 2, startDelayMs: 0, count: 12, intervalMs: 100, columns: [0, 1, 2, 3, 4, 5], spawnHeight: 7, fallSpeed: 14, restRow: 15, landing: 'solid' },
    },
    { id: 'sign2', type: 'sign', x: 108, y: 13, text: 'In attesa di riscontro dal cliente...' },
    {
      id: 'sc2', type: 'scopeCreep', x: 143, y: 14,
      params: { direction: 'left', baseLength: 1, maxLength: 7, triggerDx: -4, triggerWidth: 3, armDelayMs: 250, extendSpeed: 12, pitRect: { dx: -10, dy: 1, w: 4, h: 2 } },
    },
    {
      id: 'sc3', type: 'scopeCreep', x: 173, y: 12,
      params: { direction: 'right', baseLength: 1, maxLength: 6, triggerDx: 1, triggerWidth: 3, armDelayMs: 250, extendSpeed: 12, pitRect: { dx: 6, dy: 1, w: 3, h: 4 } },
    },
    {
      id: 'ra3', type: 'replyAll', x: 184, y: 14,
      params: { triggerDx: -3, triggerWidth: 2, startDelayMs: 0, count: 5, intervalMs: 120, columns: [0, 1, 2, 3, 4], spawnHeight: 6, fallSpeed: 14, restRow: 14 },
    },
  ],
};

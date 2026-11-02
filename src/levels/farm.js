import { createGrid } from './builder.js';

// The farm (docs/FARM.md §3): reached only through a 100% burnout. Not in LEVELS / LEVEL_ORDER: no lessons, no
// leaderboard, no pivots. Continuous ground on every column (you cannot fall), hay stacks at most 2 tiles high.
const W = 130;
const g = createGrid(W);

g.ground(0, W - 1).put(2, 14, 'P');
// S1 pollaio (15–41): hay bales with eggs on top
g.fill(24, 25, 13, 14, '#');
g.fill(30, 30, 14, 14, '#');
g.fill(37, 38, 14, 14, '#');
// S2 orto (42–75): a raised bed and a stack with a step
g.fill(56, 58, 14, 14, '#');
g.fill(68, 69, 13, 14, '#').fill(70, 70, 14, 14, '#');
// S3 sentiero (76–100)
g.fill(90, 91, 14, 14, '#');
// S5 the bench
g.put(124, 14, 'G');

export default {
  id: 'farm',
  name: 'Il contadino',
  map: g.toMap(),
  // the sky turns golden from the spawn to the bench
  skyFrom: 2,
  skyTo: 124,
  entities: [
    { id: 'signHome', type: 'sign', x: 4, y: 14, text: 'Cascina. Wi-Fi: assente.\nRiunioni in calendario: 0.' },
    { id: 'signCoop', type: 'sign', x: 15, y: 14, text: 'Pollaio. Le galline non fanno standup.' },
    { id: 'coop', type: 'coop', x: 41, y: 14 },
    { id: 'ch1', type: 'chicken', x: 20, y: 14, params: { range: 2, periodMs: 5000, phase: 0 } },
    { id: 'ch2', type: 'chicken', x: 27, y: 14, params: { range: 1.5, periodMs: 4200, phase: 2 } },
    { id: 'ch3', type: 'chicken', x: 35, y: 14, params: { range: 1.5, periodMs: 6000, phase: 4 } },
    { id: 'e1', type: 'egg', x: 18, y: 14 },
    { id: 'e2', type: 'egg', x: 24, y: 12 },
    { id: 'e3', type: 'egg', x: 30, y: 13 },
    { id: 'e4', type: 'egg', x: 34, y: 14 },
    { id: 'e5', type: 'egg', x: 38, y: 13 },
    { id: 'signGarden', type: 'sign', x: 43, y: 14, text: 'Orto. Nessun KPI. Cresce lo stesso.' },
    { id: 'v1', type: 'veg', x: 46, y: 14, params: { kind: 'tomato' } },
    { id: 'v2', type: 'veg', x: 51, y: 14, params: { kind: 'carrot' } },
    { id: 'v3', type: 'veg', x: 57, y: 13, params: { kind: 'zucchina' } },
    { id: 'v4', type: 'veg', x: 68, y: 12, params: { kind: 'tomato' } },
    { id: 'scarecrow', type: 'scarecrow', x: 84, y: 14 },
    { id: 'signScarecrow', type: 'sign', x: 79, y: 14, text: 'Spaventapasseri. Ex Partner.\nSpaventa ancora.' },
    { id: 'signPond', type: 'sign', x: 98, y: 14, text: 'Stagno. Profondo quanto basta\nper un telefono.' },
    { id: 'pond', type: 'pond', x: 103, y: 14, params: { w: 7, zoneFrom: 101, zoneTo: 111 } },
    { id: 'signBench', type: 'sign', x: 117, y: 14, text: 'Panchina. Prenotabile senza Outlook.' },
  ],
};

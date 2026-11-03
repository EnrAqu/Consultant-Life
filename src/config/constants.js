// Logical view size: every scene lays out in these coordinates.
export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;
// HD rendering: the canvas is RENDER_SCALE× bigger, cameras zoom in, textures are drawn at RENDER_SCALE.
export const RENDER_SCALE = 2;
// Textures are drawn at TEXTURE_SCALE and shown at 1 / TEXTURE_SCALE (world sizes stay logical).
export const TEXTURE_SCALE = 3;
// The world camera zooms in more than the HUD: a bigger, closer view of the action (768×432 world px).
export const WORLD_ZOOM = 2.5;
export const CANVAS_WIDTH = GAME_WIDTH * RENDER_SCALE;
export const CANVAS_HEIGHT = GAME_HEIGHT * RENDER_SCALE;
export const PHYSICS_FPS = 120;
export const FADE_MS = 180;
// Camera follow: fraction of the distance covered per 60 Hz frame (made frame-rate independent in GameScene),
// and how far ahead (world px) it looks in the running direction.
export const CAMERA_LERP = 0.18;
export const CAMERA_LOOK_AHEAD = 70;
// Vertical levels: look up while climbing, down while falling fast (world px; + = up).
export const CAMERA_LOOK_UP = 60;
export const CAMERA_LOOK_DOWN = -50;
export const UI_FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
export const TILE = 32;
export const LEVEL_ROWS = 17;
export const GRAVITY = 1800;

export const PLAYER = {
  maxRunSpeed: 260,
  groundAccel: 2400,
  groundDecel: 3000,
  airAccel: 1700,
  airDecel: 900,
  turnMultiplier: 1.6,
  jumpVelocity: 620,
  jumpCutMultiplier: 0.45,
  fallGravityExtra: 700,
  maxFallSpeed: 900,
  coyoteTimeMs: 90,
  jumpBufferMs: 110,
  width: 24,
  height: 32,
  bodyWidth: 18,
  bodyHeight: 28,
};

export const DEATH_FREEZE_MS = 250;
export const LEVEL_COMPLETE_DELAY_MS = 800;
export const IDLE_MS = 10000;

export const BUDGET = {
  deathCost: 0.5,
  fakeKtCost: 3,
  realKtBonus: 1,
  coffeeBonus: 0.5,
};

// Burnout (docs/BURNOUT.md): what the job costs *you*, in %. Max and character tiers live in core/Burnout.js.
// "Non è morire che ti brucia, è come lavori": a death is 3%, the social events 5% (user, 2026-11-02:
// with +1% the GU always ran out before 100%).
export const BURNOUT = {
  levelMin: [0, 15, 30, 45, 60],
  // pmResource: the level 4 PM takes a junior (the loss included); hrCourse: the level 4 HR course. User, 2026-11-03:
  // first +10% each, then 10% → 6% with every 5% → 4%
  // user, 2026-11-03: "lo stai facendo crescere un pochino troppo": every 5% → 4%, every 10% → 6% (death stays 3%)
  gain: { death: 3, escalation: 4, teamLoss: 4, micromanager: 4, fiveMinutes: 4, standupOverrun: 4, fakeKT: 4, clientSwitch: 4, pmResource: 6, hrCourse: 6 },
  relief: { coffee: 2, realKT: 3, cleanLevel: 5 },
};

export const STANDUP = {
  clockStart: 9 * 60,
  minutesPerRealSecond: 1,
  firstAt: 9 * 60 + 20,
  // user, 2026-11-03: longer breaks between standups (20 → 30 game minutes = 30 s)
  interval: 30,
  warningLeadMinutes: 3,
  durationMs: 3000,
  overrunEvery: 3,
};

export const COLORS = {
  bg: '#1b1f2a',
  navy: 0x1e3a8a,
  skin: 0xf1c27d,
  white: 0xffffff,
  red: 0xdc2626,
  wall: 0x4b5563,
  wallEdge: 0x6b7280,
  carpet: 0x334155,
  desk: 0x92400e,
  spike: 0xef4444,
  postit: 0xfacc15,
  postitEdge: 0xca8a04,
  slideBar: 0x2563eb,
  gold: 0xfbbf24,
  green: 0x22c55e,
  coffee: 0x78350f,
  orange: 0xf97316,
  grey: 0x94a3b8,
};

export const DEPTH = {
  background: 0,
  tiles: 10,
  objects: 20,
  traps: 30,
  player: 40,
  fx: 50,
};

export const TEXT_RESOLUTION = 2;

// The farm (docs/FARM.md): the extra level after a 100% burnout. The phone buzzes at fixed times from the first move.
export const FARM = {
  // the farm takes ~15 s straight to the bench, ~30 s with the chores (review #2): the messages must keep up
  phoneFirstMs: 2500,
  phoneIntervalMs: 4500,
  notificationMs: 3500,
  sunsetMs: 3200,
};

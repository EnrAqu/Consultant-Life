import { COLORS, TEXTURE_SCALE as S, PLAYER } from '../config/constants.js';
import { OUTFITS, PLAYER_FRAMES, PLAYER_FRAME_W, PLAYER_FRAME_H } from '../data/outfits.js';

// All textures are drawn at TEXTURE_SCALE and displayed at 1 / TEXTURE_SCALE, so world sizes stay logical.
// `p` is a small proxy over Graphics that takes logical coordinates and scales them.
function pen(g, ox = 0, oy = 0) {
  const p = {
    fill(color, alpha = 1) {
      g.fillStyle(color, alpha);
      return p;
    },
    line(width, color, alpha = 1) {
      g.lineStyle(width * S, color, alpha);
      return p;
    },
    rect(x, y, w, h) {
      g.fillRect((ox + x) * S, (oy + y) * S, w * S, h * S);
      return p;
    },
    round(x, y, w, h, r) {
      g.fillRoundedRect((ox + x) * S, (oy + y) * S, w * S, h * S, r * S);
      return p;
    },
    strokeRect(x, y, w, h) {
      g.strokeRect((ox + x) * S, (oy + y) * S, w * S, h * S);
      return p;
    },
    strokeRound(x, y, w, h, r) {
      g.strokeRoundedRect((ox + x) * S, (oy + y) * S, w * S, h * S, r * S);
      return p;
    },
    circle(x, y, r) {
      g.fillCircle((ox + x) * S, (oy + y) * S, r * S);
      return p;
    },
    strokeCircle(x, y, r) {
      g.strokeCircle((ox + x) * S, (oy + y) * S, r * S);
      return p;
    },
    ellipse(x, y, w, h) {
      g.fillEllipse((ox + x) * S, (oy + y) * S, w * S, h * S);
      return p;
    },
    tri(x1, y1, x2, y2, x3, y3) {
      g.fillTriangle((ox + x1) * S, (oy + y1) * S, (ox + x2) * S, (oy + y2) * S, (ox + x3) * S, (oy + y3) * S);
      return p;
    },
    seg(x1, y1, x2, y2) {
      g.lineBetween((ox + x1) * S, (oy + y1) * S, (ox + x2) * S, (oy + y2) * S);
      return p;
    },
  };
  return p;
}

function make(scene, key, w, h, draw) {
  const g = scene.make.graphics({ add: false });
  draw(pen(g), g);
  g.generateTexture(key, w * S, h * S);
  g.destroy();
}

// Texture with baked-in text: background graphics + text objects, drawn into a DynamicTexture.
function makeWithText(scene, key, w, h, draw, texts) {
  const g = scene.make.graphics({ add: false });
  draw(pen(g));
  const dt = scene.textures.addDynamicTexture(key, w * S, h * S);
  dt.draw(g);
  for (const t of texts) {
    const obj = scene.make.text(
      { x: 0, y: 0, text: t.text, style: { fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif', fontStyle: 'bold', fontSize: `${t.size * S}px`, color: t.color } },
      false,
    );
    dt.draw(obj, t.x * S, t.y * S);
    obj.destroy();
  }
  g.destroy();
}

// ---------- player ----------

const POSES = {
  idle0: { legL: 0, legR: 0, armL: 0, armR: 0, bob: 0 },
  idle1: { legL: 0, legR: 0, armL: 0, armR: 0, bob: 1 },
  run0: { legL: -4, legR: 4, armL: 3, armR: -3, bob: 0 },
  run1: { legL: 0, legR: 0, armL: 0, armR: 0, bob: -1 },
  run2: { legL: 4, legR: -4, armL: -3, armR: 3, bob: 0 },
  run3: { legL: 0, legR: 0, armL: 0, armR: 0, bob: -1 },
  jump: { legL: -3, legR: 2, armL: -6, armR: -6, bob: -1, tuck: 3 },
  fall: { legL: 2, legR: -2, armL: -8, armR: -8, bob: 0 },
  freeze: { legL: 0, legR: 0, armL: 0, armR: 0, bob: 0, phone: true },
};

function drawPerson(p, o, pose) {
  const b = pose.bob;
  const tuck = pose.tuck ?? 0;
  const hipY = 27 + b;

  // backpack (behind)
  if (o.backpack) p.fill(o.backpack).round(4, 15 + b, 7, 12, 2);
  // sweater tied on shoulders (behind)
  if (o.sweaterOnShoulders) p.fill(o.sweaterOnShoulders).round(8, 14 + b, 16, 4, 2);

  // legs
  const legTop = hipY;
  const legLen = 10 - tuck;
  const leg = (x, dx) => {
    if (o.legs === 'shorts') {
      p.fill(o.pants).rect(x + dx * 0.3, legTop, 5, 5);
      p.fill(o.skin).rect(x + dx, legTop + 5, 4, legLen - 5);
    } else {
      p.fill(o.pants).rect(x + dx * 0.5, legTop, 5, 3).rect(x + dx, legTop + 2, 5, legLen - 2);
    }
    p.fill(o.shoes).round(x + dx - 1, legTop + legLen - 1, 7, 3, 1);
  };
  leg(11, pose.legL);
  leg(16, pose.legR);

  // torso
  p.fill(o.top).round(9, 14 + b, 14, 14, 3);
  if (o.plaid) {
    p.fill(o.topDark);
    for (let x = 11; x < 22; x += 4) p.rect(x, 14 + b, 1, 14);
    for (let y = 17; y < 28; y += 4) p.rect(9, y + b, 14, 1);
  }
  if (o.hood) p.fill(o.topDark).round(10, 12 + b, 12, 4, 2);
  if (o.shirtV) {
    p.fill(o.shirtV).tri(13, 14 + b, 19, 14 + b, 16, 20 + b);
  }
  if (o.tie) p.fill(o.tie).rect(15, 15 + b, 2, 8);
  if (o.pocketSquare) p.fill(0xffffff).rect(19, 18 + b, 2, 1);
  if (o.overalls) {
    p.fill(o.overalls).round(10, 20 + b, 12, 9, 2).rect(11, 14 + b, 2, 7).rect(19, 14 + b, 2, 7);
    p.fill(0xfbbf24).circle(12, 20 + b, 0.8).circle(20, 20 + b, 0.8);
  }
  if (o.badge) {
    p.line(0.6, COLORS.red).seg(13, 14 + b, 16, 20 + b).seg(19, 14 + b, 16, 20 + b);
    p.fill(0xffffff).rect(15, 20 + b, 3, 4);
  }
  if (o.headphones) {
    p.fill(0x111827).round(10, 13 + b, 12, 2, 1).circle(10, 14 + b, 1.6).circle(22, 14 + b, 1.6);
  }

  // arms
  const arm = (x, dy) => {
    const armColor = o.sleeves === 'short' || o.sleeves === 'rolled' ? o.skin : o.top;
    p.fill(o.top).round(x, 15 + b + dy, 3, o.sleeves === 'short' ? 4 : 6, 1);
    p.fill(armColor).round(x, 15 + b + dy + (o.sleeves === 'long' ? 0 : 4), 3, o.sleeves === 'long' ? 10 : 6, 1);
    p.fill(o.skin).circle(x + 1.5, 26 + b + dy, 1.6);
  };
  if (pose.phone) {
    arm(7, pose.armL);
    p.fill(o.top).round(21, 9 + b, 3, 8, 1);
    p.fill(0x111827).round(21, 5 + b, 3, 5, 1);
  } else {
    arm(7, pose.armL);
    arm(22, pose.armR);
  }
  if (o.mug) {
    p.fill(0xffffff).round(23, 22 + b + pose.armR, 5, 6, 1);
    p.line(1, 0xffffff).strokeRound(27, 23 + b + pose.armR, 2, 3, 1);
    p.fill(0x78350f).rect(23.5, 22.5 + b + pose.armR, 4, 1.5);
  }

  // head
  p.fill(o.skin).circle(16, 8 + b, 6);
  p.fill(o.hair).round(10, 2 + b, 12, 4, 2);
  if (o.messyHair) p.fill(o.hair).tri(11, 3 + b, 13, -1 + b, 15, 3 + b).tri(15, 3 + b, 18, 0 + b, 20, 3 + b);
  p.fill(0x111827).circle(18, 8 + b, 0.9).circle(21, 8 + b, 0.9);
  // burnout (docs/BURNOUT.md §6): eye bags at 50%, darker and with heavy eyelids at 80%
  if (o.eyebags) {
    // the right eye sits near the edge of the face: its bag and eyelid are narrower
    p.fill(0x6b21a8, o.eyebags === 2 ? 0.75 : 0.45).round(16.9, 9.3 + b, 2.4, 1.1, 0.5).round(19.9, 9.3 + b, 1.7, 1.1, 0.5);
    if (o.eyebags === 2) p.fill(o.skin).rect(16.9, 6.6 + b, 2.4, 1.1).rect(19.9, 6.6 + b, 1.8, 1.1);
  }
  if (o.sunglasses) p.fill(0x111827).round(16, 6.5 + b, 7, 2.5, 1);
  if (o.strawHat) p.fill(0xfacc15).round(7, 2 + b, 18, 2, 1).round(11, -2 + b, 10, 5, 2);
}

function makePlayerSheet(scene, id, o, key = `player_${id}`) {
  make(scene, key, PLAYER_FRAME_W * PLAYER_FRAMES.length, PLAYER_FRAME_H, (_, g) => {
    PLAYER_FRAMES.forEach((name, i) => drawPerson(pen(g, i * PLAYER_FRAME_W, 1), o, POSES[name]));
  });
  const tex = scene.textures.get(key);
  PLAYER_FRAMES.forEach((name, i) => tex.add(name, 0, i * PLAYER_FRAME_W * S, 0, PLAYER_FRAME_W * S, PLAYER_FRAME_H * S));
}

// ---------- world ----------

export const EMAIL_W = 54;
function emailCard(p, bar) {
  p.fill(0x000000, 0.25).round(1, 2, EMAIL_W - 2, 23, 3);
  p.fill(0xffffff).round(0, 0, EMAIL_W - 2, 23, 3);
  p.fill(bar).round(0, 0, EMAIL_W - 2, 9, 3);
  p.fill(bar).rect(0, 4, EMAIL_W - 2, 5);
  p.fill(0xcbd5e1).rect(4, 14, 34, 2).rect(4, 18, 24, 2);
}

const EMAIL_VARIANTS = [
  { key: 'email_0', bar: COLORS.red, title: 'URGENTE !', color: '#ffffff' },
  { key: 'email_1', bar: 0x475569, title: 'RE: RE: FW:', color: '#ffffff' },
  { key: 'email_2', bar: 0x2563eb, title: 'Rispondi a tutti', color: '#ffffff' },
  { key: 'email_3', bar: COLORS.orange, title: 'ASAP!!!', color: '#ffffff' },
  { key: 'email_4', bar: 0xcbd5e1, title: 'Per conoscenza', color: '#334155' },
];
export const EMAIL_KEYS = EMAIL_VARIANTS.map((v) => v.key);

function ktCoin(p, base, rim) {
  p.fill(base).circle(14, 14, 13);
  p.line(2, rim).strokeCircle(14, 14, 12);
  p.fill(0xffffff, 0.35).circle(10, 9, 4);
  p.fill(0xffffff);
  // "K"
  p.rect(6, 8, 3, 12);
  p.line(3, 0xffffff).seg(8.5, 14, 13, 8.5).seg(8.5, 14, 13, 19.5);
  // "T"
  p.rect(14.5, 8, 9, 3).rect(17.5, 11, 3, 9);
}

export function generateAll(scene) {
  for (const [id, o] of Object.entries(OUTFITS)) {
    makePlayerSheet(scene, id, o);
    // tired variants for the burnout tiers
    makePlayerSheet(scene, id, { ...o, eyebags: 1 }, `player_${id}_t1`);
    makePlayerSheet(scene, id, { ...o, eyebags: 2 }, `player_${id}_t2`);
  }
  // NPCs reuse the character drawing: the micromanager (manager + mug) and the "5 minutes" colleague
  makePlayerSheet(scene, 'micromanager', { ...OUTFITS.manager, hair: 0x6b7280, mug: true }, 'npc_micromanager');
  makePlayerSheet(scene, 'rival', { ...OUTFITS.manager, top: 0x7c3aed, topDark: 0x5b21b6, shirtV: 0xffffff, tie: 0xfacc15, hair: 0x111827 }, 'npc_rival');
  makePlayerSheet(scene, 'sycophant', { ...OUTFITS.manager, top: 0x7c3aed, topDark: 0x5b21b6, shirtV: 0xffffff, tie: 0xfacc15, hair: 0x111827, pocketSquare: true }, 'npc_sycophant');
  makePlayerSheet(scene, 'colleague', { ...OUTFITS.consultant, top: 0xfde68a, topDark: 0xfcd34d, mug: true }, 'npc_colleague');

  make(scene, 'plant', 24, 48, (p) => {
    p.fill(0x166534).ellipse(12, 14, 20, 22).ellipse(6, 22, 12, 14).ellipse(18, 22, 12, 14);
    p.fill(0x22c55e).ellipse(10, 12, 10, 12).ellipse(16, 18, 8, 10);
    p.fill(0x92400e).round(5, 32, 14, 16, 2);
    p.fill(0xb45309).rect(4, 32, 16, 3);
  });
  const door = (p, ajar) => {
    p.fill(0x1f2937).rect(0, 0, 32, 56);
    p.fill(ajar ? 0x0b0d12 : 0x7c5a3a).rect(3, 3, 26, 53);
    if (ajar) p.fill(0x7c5a3a).rect(3, 3, 18, 53).fill(0x000000, 0.4).ellipse(24, 30, 6, 16);
    p.fill(0xfbbf24).circle(ajar ? 18 : 25, 30, 1.5);
    p.fill(0xffffff, 0.8).round(8, 10, 14, 6, 1);
  };
  make(scene, 'door', 32, 56, (p) => door(p, false));
  make(scene, 'doorAjar', 32, 56, (p) => door(p, true));

  // invisible physics holder for the player body (logical size, not HD)
  const hb = scene.make.graphics({ add: false });
  hb.fillStyle(0xffffff).fillRect(0, 0, PLAYER.width, PLAYER.height);
  hb.generateTexture('playerBody', PLAYER.width, PLAYER.height);
  hb.destroy();

  // tiles (64 px HD frames): solid, solid with top edge, desk
  make(scene, 'tilesHD', 96, 32, (p) => {
    p.fill(0x3b4252).rect(0, 0, 32, 32);
    p.fill(0x434c5e).rect(1, 1, 30, 30);
    p.fill(0x3b4252).rect(0, 15, 32, 1).rect(15, 0, 1, 15).rect(7, 16, 1, 16).rect(23, 16, 1, 16);
    p.fill(0x3b4252).rect(32, 0, 32, 32);
    p.fill(0x434c5e).rect(33, 1, 30, 30);
    p.fill(0x3b4252).rect(32, 15, 32, 1).rect(47, 0, 1, 15).rect(39, 16, 1, 16).rect(55, 16, 1, 16);
    p.fill(0x64748b).rect(32, 0, 32, 4);
    p.fill(0x94a3b8).rect(32, 0, 32, 1.5);
    p.fill(0xb45309).round(64, 0, 32, 6, 1.5);
    p.fill(0xd97706).rect(64, 0, 32, 1.5);
    p.fill(0x78350f).rect(67, 6, 3, 12).rect(90, 6, 3, 12);
  });
  const tiles = scene.textures.get('tilesHD');
  tiles.add('solid', 0, 0, 0, 32 * S, 32 * S);
  tiles.add('top', 0, 32 * S, 0, 32 * S, 32 * S);
  tiles.add('desk', 0, 64 * S, 0, 32 * S, 32 * S);
  // low-res tileset for the invisible collision layer
  const lt = scene.make.graphics({ add: false });
  lt.fillStyle(0x4b5563).fillRect(0, 0, 96, 32);
  lt.generateTexture('tiles', 96, 32);
  lt.destroy();

  make(scene, 'bgWindows', 160, 200, (p) => {
    p.fill(0x1e293b, 0.6).rect(20, 40, 50, 80).rect(90, 40, 50, 80);
    p.fill(0x334155, 0.5).rect(22, 42, 46, 76).rect(92, 42, 46, 76);
    p.fill(0xfde68a, 0.12).rect(24, 44, 20, 30).rect(116, 84, 20, 30);
    p.fill(0x1e293b, 0.6).rect(44, 42, 2, 76).rect(22, 78, 46, 2).rect(114, 42, 2, 76).rect(92, 78, 46, 2);
  });

  make(scene, 'spike', 32, 32, (p) => {
    for (let i = 0; i < 3; i++) {
      p.fill(0xb91c1c).tri(1 + i * 10, 32, 6 + i * 10, 17, 11 + i * 10, 32);
      p.fill(0xef4444).tri(3 + i * 10, 32, 6 + i * 10, 19, 6 + i * 10, 32);
    }
  });

  for (const v of EMAIL_VARIANTS) {
    makeWithText(scene, v.key, EMAIL_W, 25, (p) => emailCard(p, v.bar), [{ text: v.title, size: 6, color: v.color, x: 3, y: 0.8 }]);
  }
  make(scene, 'emailGreen', 32, 16, (p) => {
    p.fill(0xffffff).round(0, 0, 32, 16, 2);
    p.line(1.5, COLORS.green).strokeRound(0.75, 0.75, 30.5, 14.5, 2);
    p.line(1, COLORS.green).seg(1, 1, 16, 9).seg(31, 1, 16, 9);
  });
  make(scene, 'emailShadow', 36, 8, (p) => p.fill(0x000000, 0.35).ellipse(18, 4, 36, 8));
  makeWithText(
    scene,
    'inboxBadge',
    40,
    32,
    (p) => {
      p.fill(0xffffff).round(0, 8, 34, 22, 3);
      p.line(1.5, 0x64748b).seg(1, 9, 17, 21).seg(33, 9, 17, 21);
      p.fill(COLORS.red).circle(32, 9, 8);
    },
    [],
  );

  make(scene, 'scopeBlock', 32, 32, (p) => {
    p.fill(0xeab308).rect(0, 0, 32, 32);
    p.fill(COLORS.postit).rect(0, 0, 32, 29);
    p.fill(0xfde047).tri(24, 29, 32, 29, 32, 21);
    p.fill(0xca8a04).rect(5, 9, 22, 1.5).rect(5, 15, 18, 1.5).rect(5, 21, 14, 1.5);
  });

  const slide = (p, bar) => {
    p.fill(0x000000, 0.2).rect(2, 2, 64, 36);
    p.fill(0xffffff).rect(0, 0, 64, 36);
    p.fill(bar).rect(0, 0, 64, 8);
    p.fill(0xcbd5e1).rect(6, 14, 30, 2.5).rect(6, 20, 24, 2.5).rect(6, 26, 28, 2.5);
    p.fill(0x93c5fd).rect(42, 14, 5, 16).rect(49, 20, 5, 10);
    p.fill(0xfca5a5).rect(56, 10, 5, 20);
  };
  make(scene, 'slide', 66, 38, (p) => slide(p, COLORS.slideBar));
  make(scene, 'slideGreen', 66, 38, (p) => slide(p, COLORS.green));

  make(scene, 'kt', 28, 28, (p) => {
    ktCoin(p, 0xdc2626, 0x7f1d1d);
    p.fill(0xffffff).rect(19.5, 19.5, 7, 7);
    p.fill(0x7f1d1d).rect(19.5, 19.5, 7, 2);
  });
  make(scene, 'ktReal', 28, 28, (p) => ktCoin(p, 0x16a34a, 0x14532d));

  make(scene, 'coffee', 16, 20, (p) => {
    p.fill(0xffffff, 0.7).round(4, 0, 2, 5, 1).round(9, 1, 2, 4, 1);
    p.fill(0xffffff).round(1, 7, 12, 13, 2);
    p.fill(COLORS.coffee).rect(2, 8, 10, 3);
    p.line(2, 0xffffff).strokeRound(12, 10, 3.5, 6, 1.5);
    p.fill(0xdc2626).rect(1, 14, 12, 2);
  });

  const machine = (p, light) => {
    p.fill(0x1f2937).round(0, 0, 24, 40, 3);
    p.fill(0x374151).round(2, 2, 20, 36, 2);
    p.fill(0x0f172a).round(4, 5, 16, 9, 1);
    p.fill(light).circle(18, 20, 2.5);
    p.fill(0x9ca3af).rect(6, 26, 12, 9);
    p.fill(0xffffff).round(9, 29, 6, 6, 1);
  };
  make(scene, 'checkpoint', 24, 40, (p) => machine(p, COLORS.red));
  make(scene, 'checkpointOn', 24, 40, (p) => machine(p, COLORS.green));

  make(scene, 'goal', 32, 64, (p) => {
    p.fill(0x9ca3af).rect(14, 18, 4, 46);
    p.fill(0xffffff).round(0, 0, 32, 22, 3);
    p.line(2, COLORS.green).strokeRound(1, 1, 30, 20, 3);
    p.line(3, COLORS.green).seg(8, 11, 13, 16).seg(13, 16, 24, 5);
  });

  // betraying sign: the board faces the client (right); from the left you see its grey back
  make(scene, 'goalTroll', 32, 64, (p) => {
    p.fill(0x9ca3af).rect(14, 18, 4, 46);
    p.fill(0x6b7280).round(0, 0, 32, 22, 3);
    p.fill(0x4b5563).rect(3, 3, 26, 2).rect(3, 8, 20, 2).rect(3, 13, 24, 2);
    p.fill(0xffffff).round(27, 1, 5, 20, 2);
    p.line(1.5, COLORS.green).seg(28, 11, 29.5, 13).seg(29.5, 13, 31.5, 8);
  });

  // "Approvazione richiesta": a glass barrier tile, the pressure plate, the intern hiring desk
  make(scene, 'gateTile', 32, 32, (p) => {
    p.fill(0x93c5fd, 0.35).rect(2, 0, 28, 32);
    p.fill(0xbfdbfe, 0.6).rect(2, 0, 2, 32).rect(28, 0, 2, 32);
    p.fill(0xffffff, 0.35).rect(8, 4, 3, 24);
  });
  make(scene, 'plate', 32, 8, (p) => {
    p.fill(0x374151).round(0, 2, 32, 6, 2);
    p.fill(0xfacc15).round(4, 0, 24, 4, 1);
  });
  make(scene, 'aiChip', 24, 24, (p) => {
    p.fill(0x4c1d95).round(2, 2, 20, 20, 3);
    p.fill(0xa78bfa).round(5, 5, 14, 14, 2);
    p.fill(0x4c1d95).rect(0, 6, 2, 2).rect(0, 12, 2, 2).rect(22, 6, 2, 2).rect(22, 12, 2, 2).rect(6, 0, 2, 2).rect(12, 0, 2, 2).rect(6, 22, 2, 2).rect(12, 22, 2, 2);
    p.fill(0xffffff).rect(8, 8, 2, 8).rect(8, 8, 4, 2).rect(11, 8, 2, 8).rect(8, 12, 4, 2).rect(15, 8, 2, 8);
  });
  make(scene, 'internDesk', 32, 40, (p) => {
    p.fill(0x1f2937).round(0, 14, 32, 26, 3);
    p.fill(0x22c55e).round(4, 18, 24, 8, 2);
    p.fill(0xffffff).round(8, 0, 16, 12, 2);
    p.fill(0x22c55e).rect(14, 3, 4, 6).rect(13, 5, 6, 2);
  });

  make(scene, 'glow', 32, 32, (p) => {
    for (let r = 16; r > 0; r -= 1.5) p.fill(0xffffff, 0.06).circle(16, 16, r);
  });
  make(scene, 'dust', 8, 8, (p) => p.fill(0xe5e7eb).circle(4, 4, 4));
  make(scene, 'paper', 10, 12, (p) => {
    p.fill(0xffffff).rect(0, 0, 10, 12);
    p.fill(0x94a3b8).rect(2, 3, 6, 1).rect(2, 6, 5, 1).rect(2, 9, 6, 1);
  });
  make(scene, 'pixel', 4, 4, (p) => p.fill(0xffffff).rect(0, 0, 4, 4));

  // Level 5 (ITERATION_5): worker scaffolding plank, crossed eye (you are watching), deal briefcase, bow mat, Board door
  make(scene, 'scaffold', 32, 10, (p) => {
    p.fill(0x92400e).rect(0, 2, 32, 8);
    p.fill(0xb45309).rect(0, 2, 32, 2);
    p.fill(COLORS.postit).rect(0, 0, 32, 2);
    p.fill(0x111827).tri(4, 0, 8, 0, 6, 2).tri(14, 0, 18, 0, 16, 2).tri(24, 0, 28, 0, 26, 2);
    p.fill(0x78350f).rect(15, 2, 2, 8);
  });
  make(scene, 'eyeOff', 16, 12, (p) => {
    p.fill(0xffffff).ellipse(8, 6, 14, 9);
    p.fill(0x1f2937).circle(8, 6, 2.5);
    p.line(2, COLORS.red).seg(2, 11, 14, 1);
  });
  make(scene, 'deal', 24, 20, (p) => {
    p.fill(0x78350f).round(8, 0, 8, 5, 1.5);
    p.fill(0x92400e).round(0, 4, 24, 16, 2.5);
    p.fill(0xb45309).rect(0, 10, 24, 2);
    p.fill(COLORS.gold).rect(10, 9, 4, 4);
    p.fill(COLORS.skin).round(4, 13, 7, 4, 1.5).round(13, 13, 7, 4, 1.5);
  });
  make(scene, 'mat', 32, 6, (p) => {
    p.fill(0x991b1b).round(0, 0, 32, 6, 2);
    p.fill(COLORS.gold).rect(2, 1, 28, 1).rect(2, 4, 28, 1);
  });
  make(scene, 'boardDoor', 40, 64, (p) => {
    p.fill(0x1f2937).rect(0, 0, 40, 64);
    p.fill(0x451a03).rect(3, 3, 34, 61);
    p.fill(0x78350f).rect(6, 6, 13, 26).rect(21, 6, 13, 26).rect(6, 35, 13, 26).rect(21, 35, 13, 26);
    p.fill(COLORS.gold).circle(31, 36, 2);
  });
}

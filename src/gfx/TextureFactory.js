import { COLORS } from '../config/constants.js';

function make(scene, key, w, h, draw) {
  const g = scene.make.graphics({ add: false });
  draw(g);
  g.generateTexture(key, w, h);
  g.destroy();
}

function emailIcon(g, border) {
  g.fillStyle(COLORS.white).fillRect(0, 0, 24, 16);
  g.lineStyle(2, border).strokeRect(1, 1, 22, 14);
  g.lineBetween(1, 1, 12, 9).lineBetween(23, 1, 12, 9);
}

function ktCoin(g, rim) {
  g.fillStyle(COLORS.gold).fillCircle(14, 14, 13);
  g.lineStyle(2, rim).strokeCircle(14, 14, 13);
  g.fillStyle(0x92400e);
  // "K"
  g.fillRect(6, 8, 3, 12).fillRect(9, 12, 3, 3).fillRect(12, 8, 3, 4).fillRect(12, 15, 3, 5);
  // "T"
  g.fillRect(15, 8, 9, 3).fillRect(18, 11, 3, 9);
}

export function generateAll(scene) {
  make(scene, 'player', 24, 32, (g) => {
    g.fillStyle(COLORS.navy).fillRect(2, 10, 20, 22);
    g.fillStyle(COLORS.skin).fillRect(6, 0, 12, 10);
    g.fillStyle(COLORS.white).fillRect(10, 10, 4, 10);
    g.fillStyle(COLORS.red).fillRect(11, 11, 2, 8);
    g.fillStyle(0x111827).fillRect(4, 28, 7, 4).fillRect(13, 28, 7, 4);
  });

  make(scene, 'tiles', 96, 32, (g) => {
    g.fillStyle(COLORS.wall).fillRect(0, 0, 32, 32);
    g.lineStyle(2, COLORS.wallEdge).strokeRect(1, 1, 30, 30);
    g.fillStyle(COLORS.carpet).fillRect(32, 0, 32, 32);
    g.fillStyle(COLORS.desk).fillRect(64, 0, 32, 6);
    g.fillStyle(0x78350f).fillRect(66, 6, 3, 10).fillRect(91, 6, 3, 10);
  });

  make(scene, 'spike', 32, 32, (g) => {
    g.fillStyle(COLORS.spike);
    for (let i = 0; i < 3; i++) g.fillTriangle(1 + i * 10, 32, 6 + i * 10, 18, 11 + i * 10, 32);
  });

  make(scene, 'email', 24, 16, (g) => emailIcon(g, COLORS.grey));
  make(scene, 'emailGreen', 24, 16, (g) => emailIcon(g, COLORS.green));
  make(scene, 'emailShadow', 24, 6, (g) => g.fillStyle(0x000000, 0.35).fillEllipse(12, 3, 24, 6));
  make(scene, 'inboxBadge', 28, 24, (g) => {
    emailIcon(g, COLORS.grey);
    g.fillStyle(COLORS.red).fillCircle(22, 6, 6);
  });

  make(scene, 'scopeBlock', 32, 32, (g) => {
    g.fillStyle(COLORS.postit).fillRect(0, 0, 32, 32);
    g.lineStyle(2, COLORS.postitEdge).strokeRect(1, 1, 30, 30);
    g.fillStyle(COLORS.postitEdge).fillRect(5, 9, 22, 2).fillRect(5, 15, 18, 2).fillRect(5, 21, 20, 2);
  });

  make(scene, 'slide', 64, 36, (g) => {
    g.fillStyle(COLORS.white).fillRect(0, 0, 64, 36);
    g.fillStyle(COLORS.slideBar).fillRect(0, 0, 64, 8);
    g.fillStyle(0x9ca3af).fillRect(6, 14, 46, 3).fillRect(6, 21, 38, 3).fillRect(6, 28, 42, 3);
    g.lineStyle(1, 0x6b7280).strokeRect(0, 0, 64, 36);
  });
  make(scene, 'slideGreen', 64, 36, (g) => {
    g.fillStyle(COLORS.white).fillRect(0, 0, 64, 36);
    g.fillStyle(COLORS.green).fillRect(0, 0, 64, 8);
    g.fillStyle(0x9ca3af).fillRect(6, 14, 46, 3).fillRect(6, 21, 38, 3).fillRect(6, 28, 42, 3);
    g.lineStyle(1, 0x6b7280).strokeRect(0, 0, 64, 36);
  });

  make(scene, 'kt', 28, 28, (g) => {
    ktCoin(g, 0xb45309);
    // the tell: a tiny calendar grid, bottom right
    g.fillStyle(COLORS.white).fillRect(20, 20, 7, 7);
    g.fillStyle(COLORS.red).fillRect(20, 20, 7, 2);
    g.fillStyle(0x111827).fillRect(21, 23, 1, 1).fillRect(23, 23, 1, 1).fillRect(25, 23, 1, 1).fillRect(21, 25, 1, 1).fillRect(23, 25, 1, 1);
  });
  make(scene, 'ktReal', 28, 28, (g) => ktCoin(g, COLORS.green));

  make(scene, 'coffee', 16, 20, (g) => {
    g.fillStyle(COLORS.white, 0.8).fillRect(4, 0, 2, 5).fillRect(9, 1, 2, 4);
    g.fillStyle(COLORS.coffee).fillRect(1, 7, 12, 13);
    g.lineStyle(2, COLORS.coffee).strokeRect(12, 10, 3, 6);
  });

  const machine = (g, light) => {
    g.fillStyle(0x374151).fillRect(0, 0, 24, 40);
    g.fillStyle(0x111827).fillRect(4, 6, 16, 10);
    g.fillStyle(light).fillCircle(18, 22, 3);
    g.fillStyle(0x9ca3af).fillRect(6, 28, 12, 8);
  };
  make(scene, 'checkpoint', 24, 40, (g) => machine(g, COLORS.red));
  make(scene, 'checkpointOn', 24, 40, (g) => machine(g, COLORS.green));

  make(scene, 'goal', 32, 64, (g) => {
    g.fillStyle(0x9ca3af).fillRect(14, 16, 4, 48);
    g.fillStyle(COLORS.white).fillRect(0, 0, 32, 20);
    g.lineStyle(2, COLORS.green).strokeRect(1, 1, 30, 18);
    g.fillStyle(COLORS.green).fillRect(6, 9, 4, 4).fillRect(10, 12, 4, 4).fillRect(14, 5, 4, 8).fillRect(18, 4, 4, 4);
  });

  make(scene, 'glow', 32, 32, (g) => {
    for (let r = 16; r > 0; r -= 2) g.fillStyle(COLORS.white, 0.08).fillCircle(16, 16, r);
  });
  make(scene, 'pixel', 4, 4, (g) => g.fillStyle(COLORS.white).fillRect(0, 0, 4, 4));
}

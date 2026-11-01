import { TILE, DEPTH, TEXTURE_SCALE, TEXT_RESOLUTION, UI_FONT } from '../config/constants.js';
import GoalBrain from '../core/GoalBrain.js';

const BASE = 1 / TEXTURE_SCALE;
const TROLL_FREEZE_MS = 1500;
const CARRY_MS = 1200;
const CLIENT_COST = 5;

// "Consegna al cliente". Honest in levels 1 and 3; in levels 2 and 4 (`goal.trolls`) it faces the client's side:
// reach it from the left and the client gives the project to another supplier (-5 GU, the sign is carried away once);
// jump over it and touch it from the right to win straight away.
export default class Goal {
  constructor(scene, tx, ty, params = {}) {
    this.scene = scene;
    this.brain = new GoalBrain(params);
    this.floorY = (ty + 1) * TILE;
    this.x = tx * TILE + 16;
    this.targetX = (tx + this.brain.carryCols) * TILE + 16;
    const key = this.brain.requiresDeals ? 'boardDoor' : this.brain.trolls ? 'goalTroll' : 'goal';
    this.sprite = scene.physics.add.staticImage(this.x, this.floorY - 32, key).setScale(BASE).setDepth(DEPTH.objects).refreshBody();
    this.label = scene.add
      .text(this.x, this.floorY - 80, params.label ?? 'Consegna al cliente', { fontFamily: UI_FONT, fontSize: '12px', color: '#e5e7eb', resolution: TEXT_RESOLUTION * 2 })
      .setOrigin(0.5)
      .setDepth(DEPTH.objects);
    if (this.brain.trolls) {
      this.plate = scene.add
        .text(this.x, this.floorY - 6, 'Ingresso clienti →', { fontFamily: UI_FONT, fontSize: '7px', color: '#9ca3af', resolution: TEXT_RESOLUTION * 2 })
        .setOrigin(0.5, 1)
        .setDepth(DEPTH.objects + 1);
    }
    this.bubble = scene.add
      .text(this.x, this.floorY - 100, '', { fontFamily: UI_FONT, fontSize: '9px', color: '#111827', backgroundColor: '#fde68a', padding: { x: 4, y: 2 }, resolution: TEXT_RESOLUTION * 2, wordWrap: { width: 170 } })
      .setOrigin(0.5, 1)
      .setDepth(DEPTH.fx)
      .setVisible(false);
    this.carriers = [-14, 14].map((dx) =>
      scene.add.image(this.x + dx, this.floorY, 'npc_colleague', 'idle0').setOrigin(0.5, 1).setScale(BASE).setTint(0x9ca3af).setDepth(DEPTH.objects + 1).setVisible(false),
    );
    this.state = 'idle';
    this.timer = 0;
    // "locked" message once per approach: it re-arms when you step away from the door
    this.lockedArmed = true;
  }

  onTouch() {
    if (this.state !== 'idle') return;
    const scene = this.scene;
    const result = this.brain.touch(scene.player.body.center.x, this.x, scene.dealCount ?? 0);
    if (result === 'locked') {
      if (!this.lockedArmed) return;
      this.lockedArmed = false;
      const n = scene.dealCount ?? 0;
      this.bubble.setText(`Il Board vuole vedere la pipeline. ${n}/${this.brain.requiresDeals} non è una pipeline, è un auspicio.`).setVisible(true);
      scene.narrate('boardClosed');
      return;
    }
    if (result !== 'troll') {
      scene.completeLevel(result === 'winRight' ? 'goalRight' : 'levelComplete');
      return;
    }
    this.state = 'troll';
    this.timer = 0;
    scene.player.lockInput('goal', true);
    scene.player.stopMotion();
    this.bubble.setText('Cliente: "Ci abbiamo ripensato. Lo affidiamo a un altro fornitore."').setVisible(true);
    scene.stats.recordIncident('clientSwitch');
    if (scene.spendGu(CLIENT_COST, 'clientSwitch')) return;
    scene.narrate('goalTroll');
  }

  // Runs in GameScene.update (frozen during standup/death like everything else).
  update(dt) {
    if (!this.lockedArmed && Math.abs(this.scene.player.body.center.x - this.x) > 3 * TILE) {
      this.lockedArmed = true;
      this.bubble.setVisible(false);
    }
    if (this.state === 'idle') return;
    const scene = this.scene;
    this.timer += dt;
    if (this.state === 'troll' && this.timer >= TROLL_FREEZE_MS) {
      scene.player.lockInput('goal', false);
      scene.input.keyboard.resetKeys();
      this.state = 'carry';
      this.timer = 0;
      this.fromX = this.x;
      for (const c of this.carriers) c.setVisible(true);
      scene.narrate('goalTrollHint');
    }
    if (this.state === 'carry') {
      const k = Math.min(1, this.timer / CARRY_MS);
      this.moveTo(this.fromX + (this.targetX - this.fromX) * k, Math.sin(k * Math.PI * 6) * 2);
      if (k >= 1) {
        this.state = 'idle';
        this.bubble.setVisible(false);
        for (const c of this.carriers) c.setVisible(false);
        this.sprite.refreshBody();
      }
    }
  }

  moveTo(x, bob = 0) {
    this.x = x;
    this.sprite.setPosition(x, this.floorY - 32 - Math.abs(bob));
    this.label.setPosition(x, this.floorY - 80);
    this.plate?.setPosition(x, this.floorY - 6);
    this.bubble.setPosition(x, this.floorY - 100);
    this.carriers[0].setPosition(x - 14, this.floorY).setFlipX(false);
    this.carriers[1].setPosition(x + 14, this.floorY);
  }

  // A death during the 1.5 s freeze must not leave the player locked.
  cancelCall() {
    this.scene.player.lockInput('goal', false);
  }
}

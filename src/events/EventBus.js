import Phaser from 'phaser';

export const bus = new Phaser.Events.EventEmitter();

export const EV = {
  UI_READY: 'ui-ready',
  LEVEL_START: 'level-start',
  PLAYER_DIED: 'player-died',
  GU_CHANGED: 'gu-changed',
  CLOCK_TICK: 'clock-tick',
  STANDUP_WARNING: 'standup-warning',
  STANDUP_START: 'standup-start',
  STANDUP_END: 'standup-end',
  KT_CALL_START: 'kt-call-start',
  KT_CALL_END: 'kt-call-end',
  CHECKPOINT: 'checkpoint',
  LEVEL_COMPLETE: 'level-complete',
  BUDGET_OVER: 'budget-over',
  NARRATE: 'narrate',
  TOAST: 'toast',
  FIRST_MOVE: 'first-move',
  DEBUG: 'debug',
  TEAM_CHANGED: 'team-changed',
};

// Subscribe for the lifetime of a scene: listeners are removed on shutdown.
export function listen(scene, map) {
  for (const [event, fn] of Object.entries(map)) bus.on(event, fn, scene);
  scene.events.once('shutdown', () => {
    for (const [event, fn] of Object.entries(map)) bus.off(event, fn, scene);
  });
}

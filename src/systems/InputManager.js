import Phaser from 'phaser';
import { NUM_LANES, LANE_KEYS } from '../constants.js';

/**
 * Unified touch + keyboard input.
 * Emits:
 *   'lane-tap'     (laneIndex) — finger/key down
 *   'lane-release' (laneIndex) — finger/key up
 *   'lane-flash'   (laneIndex) — visual flash only
 */
export default class InputManager {
  constructor(scene) {
    this.scene = scene;
    this.activeTouches = new Map(); // pointerId -> laneIndex
    this._setupKeyboard();
    this._setupTouch();
  }

  _setupKeyboard() {
    LANE_KEYS.forEach((keyName, laneIndex) => {
      const key = this.scene.input.keyboard.addKey(keyName);
      key.on('down', () => {
        this.scene.events.emit('lane-tap', laneIndex);
        this.scene.events.emit('lane-flash', laneIndex);
      });
      key.on('up', () => {
        this.scene.events.emit('lane-release', laneIndex);
      });
    });
  }

  _setupTouch() {
    this.scene.input.on('pointerdown', (pointer) => {
      const lane = this._pointerToLane(pointer);
      if (lane !== -1) {
        this.activeTouches.set(pointer.id, lane);
        this.scene.events.emit('lane-tap', lane);
        this.scene.events.emit('lane-flash', lane);
      }
    });

    this.scene.input.on('pointerup', (pointer) => {
      const lane = this.activeTouches.get(pointer.id);
      if (lane !== undefined) {
        this.scene.events.emit('lane-release', lane);
        this.activeTouches.delete(pointer.id);
      }
    });
  }

  _pointerToLane(pointer) {
    const laneWidth = this.scene.scale.width / NUM_LANES;
    const lane = Math.floor(pointer.x / laneWidth);
    return (lane >= 0 && lane < NUM_LANES) ? lane : -1;
  }

  destroy() {
    this.scene.input.off('pointerdown');
    this.scene.input.off('pointerup');
  }
}

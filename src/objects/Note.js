import Phaser from 'phaser';
import { NOTE_RADIUS, LANE_COLORS_HEX, SCROLL_SPEED } from '../constants.js';
import { getLaneX } from '../utils/responsive.js';

export default class Note extends Phaser.GameObjects.Container {
  constructor(scene) {
    super(scene, 0, -100);

    this.circle    = scene.add.graphics();
    this.highlight = scene.add.graphics();
    this.add(this.circle);
    this.add(this.highlight);

    this.active      = false;
    this.hitTime     = 0;
    this.lane        = 0;
    this.scored      = false;
    this._scrollSpeed = SCROLL_SPEED;

    scene.add.existing(this);
    this.setVisible(false);
  }

  spawn(lane, hitTime, hitZoneY, scrollSpeed = SCROLL_SPEED) {
    this.lane         = lane;
    this.hitTime      = hitTime;
    this.scored       = false;
    this.active       = true;
    this._hitZoneY    = hitZoneY;
    this._scrollSpeed = scrollSpeed;

    const x     = getLaneX(lane);
    const color = LANE_COLORS_HEX[lane];

    this.circle.clear();
    this.circle.fillStyle(color, 1);
    this.circle.fillCircle(0, 0, NOTE_RADIUS);
    this.circle.lineStyle(2, 0xffffff, 0.3);
    this.circle.strokeCircle(0, 0, NOTE_RADIUS);

    this.highlight.clear();
    this.highlight.fillStyle(0xffffff, 0.25);
    this.highlight.fillCircle(-NOTE_RADIUS * 0.3, -NOTE_RADIUS * 0.3, NOTE_RADIUS * 0.35);

    this.setPosition(x, -NOTE_RADIUS);
    this.setVisible(true);
    this.setScale(1);
    this.setAlpha(1);
  }

  updatePosition(songTime) {
    if (!this.active) return;
    const deltaTime = this.hitTime - songTime;
    const y = this._hitZoneY - deltaTime * this._scrollSpeed;

    // Scale 0.8 → 1.0 over last 0.3s before hit zone
    const approachT = 1 - Math.min(1, Math.max(0, deltaTime / 0.3));
    this.setScale(0.8 + approachT * 0.2);
    this.setPosition(this.x, y);
  }

  recycle() {
    this.active = false;
    this.scored = false;
    this.setVisible(false);
    this.setPosition(0, -100);
  }
}

import Phaser from 'phaser';
import { LANE_COLORS_HEX, DESIGN_HEIGHT, NOTE_RADIUS } from '../constants.js';
import { getLaneX, getLaneWidth } from '../utils/responsive.js';

export default class Lane extends Phaser.GameObjects.Container {

  constructor(scene, laneIndex, hitZoneY) {
    super(scene, 0, 0);

    this.laneIndex = laneIndex;
    this.hitZoneY = hitZoneY;
    const x = getLaneX(laneIndex);
    const laneW = getLaneWidth();
    const color = LANE_COLORS_HEX[laneIndex];

    // Lane background
    this.bg = scene.add.graphics();
    this.bg.fillStyle(color, 0.06);
    this.bg.fillRect(laneIndex * laneW, 0, laneW, DESIGN_HEIGHT);
    this.add(this.bg);

    // Separator line (right edge)
    if (laneIndex < 3) {
      this.separator = scene.add.graphics();
      this.separator.lineStyle(1, 0xffffff, 0.08);
      this.separator.lineBetween((laneIndex + 1) * laneW, 0, (laneIndex + 1) * laneW, DESIGN_HEIGHT);
      this.add(this.separator);
    }

    // Hit zone target circle
    this.target = scene.add.graphics();
    this._drawTarget(color, 0.5);
    this.add(this.target);

    // Flash overlay
    this.flash = scene.add.graphics();
    this.flash.fillStyle(color, 0);
    this.flash.fillRect(laneIndex * laneW, 0, laneW, DESIGN_HEIGHT);
    this.add(this.flash);

    scene.add.existing(this);
  }

  _drawTarget(color, alpha) {
    const x = getLaneX(this.laneIndex);
    this.target.clear();
    // Outer ring
    this.target.lineStyle(3, 0xffffff, alpha * 0.5);
    this.target.strokeCircle(x, this.hitZoneY, NOTE_RADIUS + 4);
    // Inner fill
    this.target.fillStyle(color, alpha * 0.15);
    this.target.fillCircle(x, this.hitZoneY, NOTE_RADIUS + 4);
  }

  flashOnTap(scene) {
    const laneW = getLaneWidth();
    const color = LANE_COLORS_HEX[this.laneIndex];

    scene.tweens.add({
      targets: this.flash,
      alpha: { from: 0.18, to: 0 },
      duration: 150,
      ease: 'Quad.Out',
      onStart: () => {
        this.flash.clear();
        this.flash.fillStyle(color, 0.18);
        this.flash.fillRect(this.laneIndex * laneW, 0, laneW, DESIGN_HEIGHT);
        this.flash.setAlpha(1);
      }
    });
  }
}

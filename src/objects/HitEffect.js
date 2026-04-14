import { LANE_COLORS_HEX, NOTE_RADIUS } from '../constants.js';
import { getLaneX } from '../utils/responsive.js';

const JUDGMENT_COLORS = {
  perfect: 0xffffff,
  great:   0xFFD700,
  good:    0x4ECDC4,
  miss:    0x888888
};

const JUDGMENT_LABELS = {
  perfect: 'PERFECT',
  great:   'GREAT',
  good:    'GOOD',
  miss:    'MISS'
};

export default class HitEffect {
  constructor(scene, hitZoneY) {
    this.scene = scene;
    this.hitZoneY = hitZoneY;
    this._pool = [];
    this._active = new Set();
    this._maxSimultaneous = 3;
  }

  spawn(lane, judgment) {
    if (this._active.size >= this._maxSimultaneous) return;

    const x = getLaneX(lane);
    const y = this.hitZoneY;
    const color = JUDGMENT_COLORS[judgment];
    const laneColor = LANE_COLORS_HEX[lane];

    // Ring
    const ring = this.scene.add.graphics();
    ring.lineStyle(3, judgment === 'perfect' ? 0xffffff : laneColor, 1);
    ring.strokeCircle(x, y, NOTE_RADIUS + 6);
    ring.setDepth(10);
    this._active.add(ring);

    this.scene.tweens.add({
      targets: ring,
      scaleX: { from: 1, to: 2.2 },
      scaleY: { from: 1, to: 2.2 },
      alpha: { from: 1, to: 0 },
      duration: 380,
      ease: 'Quad.Out',
      onComplete: () => {
        ring.destroy();
        this._active.delete(ring);
      }
    });

    // Judgment text (only non-miss shows big text)
    if (judgment !== 'miss') {
      const text = this.scene.add.text(x, y - NOTE_RADIUS - 18, JUDGMENT_LABELS[judgment], {
        fontSize: judgment === 'perfect' ? '20px' : '16px',
        fontFamily: 'Arial Black, Arial',
        color: judgment === 'perfect' ? '#ffffff' : '#FFD700',
        stroke: '#000000',
        strokeThickness: 3,
        align: 'center'
      }).setOrigin(0.5, 1).setDepth(11);

      this.scene.tweens.add({
        targets: text,
        y: y - NOTE_RADIUS - 50,
        alpha: { from: 1, to: 0 },
        scaleX: { from: 1.1, to: 0.9 },
        scaleY: { from: 1.1, to: 0.9 },
        duration: 500,
        ease: 'Quad.Out',
        onComplete: () => text.destroy()
      });

      // White flash on perfect
      if (judgment === 'perfect') {
        const flash = this.scene.add.graphics();
        flash.fillStyle(0xffffff, 0.3);
        flash.fillCircle(x, y, NOTE_RADIUS * 2.5);
        flash.setDepth(9);
        this.scene.tweens.add({
          targets: flash,
          alpha: 0,
          duration: 200,
          onComplete: () => flash.destroy()
        });
      }
    }
  }
}

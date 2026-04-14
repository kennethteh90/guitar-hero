import { NOTE_RADIUS, LANE_COLORS_HEX, SCROLL_SPEED, HOLD_BODY_WIDTH } from '../constants.js';
import { getLaneX } from '../utils/responsive.js';

/**
 * A hold note: tap the head when it reaches the hit zone, then keep holding
 * until the tail passes. The head sticks at the hit zone while held.
 *
 * Uses two Graphics objects (body + head) redrawn each frame — avoids
 * the complexity of managing a Container with moving children.
 */
export default class HoldNote {
  constructor(scene) {
    this.scene    = scene;
    this.bodyGfx  = scene.add.graphics().setDepth(3);
    this.headGfx  = scene.add.graphics().setDepth(5);

    this.active      = false;
    this.scored      = false;  // head has been judged
    this.holdScored  = false;  // tail completed
    this.isHeld      = false;
    this.hitTime     = 0;
    this.endTime     = 0;
    this.lane        = 0;
    this.headY       = 0;
    this.tailY       = 0;
    this._hitZoneY   = 0;
    this._scrollSpeed = SCROLL_SPEED;

    this._setVisible(false);
  }

  _setVisible(v) {
    this.bodyGfx.setVisible(v);
    this.headGfx.setVisible(v);
  }

  spawn(lane, hitTime, endTime, hitZoneY, scrollSpeed) {
    this.lane        = lane;
    this.hitTime     = hitTime;
    this.endTime     = endTime;
    this.scored      = false;
    this.holdScored  = false;
    this.isHeld      = false;
    this.active      = true;
    this._hitZoneY   = hitZoneY;
    this._scrollSpeed = scrollSpeed;
    this._setVisible(true);
  }

  updatePosition(songTime) {
    if (!this.active) return;

    const rawHeadY = this._hitZoneY - (this.hitTime - songTime) * this._scrollSpeed;
    // Clamp head to hit zone once held — it "sticks" there while the tail approaches
    this.headY = this.isHeld ? Math.max(rawHeadY, this._hitZoneY) : rawHeadY;
    this.tailY = this._hitZoneY - (this.endTime - songTime) * this._scrollSpeed;

    const laneX = getLaneX(this.lane);
    const color  = LANE_COLORS_HEX[this.lane];
    const bw     = HOLD_BODY_WIDTH;
    const r      = bw / 2;

    // ---- Body ----
    this.bodyGfx.clear();
    const bodyTop    = Math.min(this.tailY, this.headY);
    const bodyBottom = Math.max(this.tailY, this.headY);
    const bodyH      = bodyBottom - bodyTop;

    if (bodyH > 2) {
      if (this.isHeld) {
        // Bright, glowing state
        this.bodyGfx.fillStyle(color, 0.85);
        this.bodyGfx.fillRoundedRect(laneX - r, bodyTop, bw, bodyH, r);
        this.bodyGfx.fillStyle(0xffffff, 0.2);
        this.bodyGfx.fillRoundedRect(laneX - r * 0.4, bodyTop + 4, bw * 0.4, bodyH - 8, r * 0.4);
      } else if (this.scored) {
        // Head missed / released early — dim the body
        this.bodyGfx.fillStyle(color, 0.18);
        this.bodyGfx.fillRoundedRect(laneX - r, bodyTop, bw, bodyH, r);
      } else {
        // Approaching
        this.bodyGfx.fillStyle(color, 0.55);
        this.bodyGfx.fillRoundedRect(laneX - r, bodyTop, bw, bodyH, r);
        this.bodyGfx.lineStyle(2, color, 0.7);
        this.bodyGfx.strokeRoundedRect(laneX - r, bodyTop, bw, bodyH, r);
      }
    }

    // ---- Head circle ----
    this.headGfx.clear();
    if (!this.scored) {
      // Full head + outer ring (distinguishes from tap note)
      this.headGfx.fillStyle(color, 1);
      this.headGfx.fillCircle(laneX, this.headY, NOTE_RADIUS);
      this.headGfx.lineStyle(2, 0xffffff, 0.35);
      this.headGfx.strokeCircle(laneX, this.headY, NOTE_RADIUS);
      this.headGfx.lineStyle(2, color, 0.5);
      this.headGfx.strokeCircle(laneX, this.headY, NOTE_RADIUS + 7);
    } else if (this.isHeld) {
      // Pulsing ring at the hit zone while held
      this.headGfx.fillStyle(color, 0.25);
      this.headGfx.fillCircle(laneX, this.headY, NOTE_RADIUS);
      this.headGfx.lineStyle(3, color, 0.9);
      this.headGfx.strokeCircle(laneX, this.headY, NOTE_RADIUS);
    }
  }

  recycle() {
    this.active     = false;
    this.scored     = false;
    this.holdScored = false;
    this.isHeld     = false;
    this.bodyGfx.clear();
    this.headGfx.clear();
    this._setVisible(false);
  }

  destroy() {
    this.bodyGfx.destroy();
    this.headGfx.destroy();
  }
}

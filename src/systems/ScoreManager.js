import { TIMING, SCORE, MAX_MULTIPLIER, COMBO_MULTIPLIER_STEP, GRADES, HOLD_BONUS_SCORE } from '../constants.js';

export default class ScoreManager {
  constructor() {
    this.timingWindows = { ...TIMING }; // can be overridden for difficulty
    this.reset();
  }

  reset() {
    this.score      = 0;
    this.combo      = 0;
    this.maxCombo   = 0;
    this.multiplier = 1;
    this.judgments  = { perfect: 0, great: 0, good: 0, miss: 0 };
    this.totalNotes = 0;
  }

  setTimingWindows(windows) {
    this.timingWindows = { ...windows };
  }

  judge(deltaMs) {
    const abs = Math.abs(deltaMs);
    const tw  = this.timingWindows;
    let judgment;

    if      (abs <= tw.PERFECT) judgment = 'perfect';
    else if (abs <= tw.GREAT)   judgment = 'great';
    else if (abs <= tw.GOOD)    judgment = 'good';
    else                        judgment = 'miss';

    this.judgments[judgment]++;
    this.totalNotes++;

    if (judgment === 'miss') {
      this.combo      = 0;
      this.multiplier = 1;
    } else {
      this.combo++;
      if (this.combo > this.maxCombo) this.maxCombo = this.combo;
      this.multiplier = Math.min(MAX_MULTIPLIER, 1 + Math.floor(this.combo / COMBO_MULTIPLIER_STEP));
      this.score += SCORE[judgment.toUpperCase()] * this.multiplier;
    }

    return { judgment, score: this.score, combo: this.combo, multiplier: this.multiplier };
  }

  registerMiss() {
    return this.judge(999);
  }

  registerGhostTap() {
    // Penalise tapping when no note is present: lose combo, break multiplier, deduct points
    const penalty = 50;
    this.combo = 0;
    this.multiplier = 1;
    this.score = Math.max(0, this.score - penalty);
    this.judgments.miss++;
    return { judgment: 'ghost', score: this.score, combo: 0, multiplier: 1 };
  }

  scoreHoldBonus() {
    const bonus = HOLD_BONUS_SCORE * this.multiplier;
    this.score += bonus;
    return bonus;
  }

  getGrade() {
    const total = this.judgments.perfect + this.judgments.great + this.judgments.good + this.judgments.miss;
    if (total === 0) return 'D';
    const accuracy = (this.judgments.perfect * SCORE.PERFECT + this.judgments.great * SCORE.GREAT + this.judgments.good * SCORE.GOOD) /
                     (total * SCORE.PERFECT);
    for (const { min, grade } of GRADES) {
      if (accuracy >= min) return grade;
    }
    return 'D';
  }
}

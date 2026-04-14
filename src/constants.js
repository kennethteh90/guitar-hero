// Design resolution
export const DESIGN_WIDTH = 390;
export const DESIGN_HEIGHT = 844;

// Lanes
export const NUM_LANES = 4;
export const LANE_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A'];
export const LANE_COLORS_HEX = [0xFF6B6B, 0x4ECDC4, 0x45B7D1, 0xFFA07A];
export const LANE_KEYS = ['D', 'F', 'J', 'K'];

// Timing windows (ms)
export const TIMING = {
  PERFECT: 40,
  GREAT: 80,
  GOOD: 120,
  MISS: 160
};

// Scoring
export const SCORE = {
  PERFECT: 300,
  GREAT: 200,
  GOOD: 100,
  MISS: 0
};
export const MAX_MULTIPLIER = 4;
export const COMBO_MULTIPLIER_STEP = 10;

// Gameplay
export const SCROLL_SPEED = 600; // px/s
export const HIT_ZONE_RATIO = 0.85; // fraction from top
export const NOTE_SPAWN_LEAD = 2.0; // seconds ahead
export const NOTE_RADIUS = 22;
export const NOTE_POOL_SIZE = 60;

// Hit zone
export const HIT_ZONE_HEIGHT = 8;
export const HIT_ZONE_ALPHA = 0.6;

// Hold notes
export const HOLD_BODY_WIDTH = 28;        // px width of the hold body bar
export const HOLD_BONUS_SCORE = 150;      // bonus per completed hold (× multiplier)
export const HOLD_NOTE_POOL_SIZE = 20;
export const HOLD_COMPLETE_WINDOW = 0.08; // seconds before endTime to auto-complete

// Effects
export const HIT_EFFECT_DURATION = 400; // ms
export const COMBO_MILESTONE = 50;

// Difficulty
export const DIFFICULTIES = {
  easy: {
    key: 'easy',
    label: 'EASY',
    color: '#4ECDC4',
    colorHex: 0x4ECDC4,
    scrollMult: 0.75,   // slower scroll
    timingMult: 1.5,    // wider hit windows
    description: 'Relaxed pace, fewer notes'
  },
  normal: {
    key: 'normal',
    label: 'NORMAL',
    color: '#FFD700',
    colorHex: 0xFFD700,
    scrollMult: 1.0,
    timingMult: 1.0,
    description: 'Standard experience'
  },
  hard: {
    key: 'hard',
    label: 'HARD',
    color: '#FF6B6B',
    colorHex: 0xFF6B6B,
    scrollMult: 1.35,   // faster scroll
    timingMult: 0.65,   // tighter hit windows
    description: 'Fast scroll, tight timing, denser notes'
  }
};
export const DEFAULT_DIFFICULTY = 'normal';

// Grades
export const GRADES = [
  { min: 0.95, grade: 'S' },
  { min: 0.85, grade: 'A' },
  { min: 0.70, grade: 'B' },
  { min: 0.50, grade: 'C' },
  { min: 0,    grade: 'D' }
];

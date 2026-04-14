import Phaser from 'phaser';
import { DESIGN_WIDTH, DESIGN_HEIGHT, LANE_COLORS, LANE_COLORS_HEX, DIFFICULTIES, DEFAULT_DIFFICULTY } from '../constants.js';

const GRADE_COLORS = {
  S: '#FFD700',
  A: '#4ECDC4',
  B: '#45B7D1',
  C: '#FFA07A',
  D: '#FF6B6B'
};

export default class ResultsScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ResultsScene' });
  }

  init(data) {
    this.data_score      = data.score      || 0;
    this.data_maxCombo   = data.maxCombo   || 0;
    this.data_judgments  = data.judgments  || { perfect: 0, great: 0, good: 0, miss: 0 };
    this.data_grade      = data.grade      || 'D';
    this.data_title      = data.title      || 'Unknown';
    this.data_difficulty = data.difficulty || DEFAULT_DIFFICULTY;
    this.data_songKey    = data.songKey    || null;
    this.data_chartKey   = data.chartKey   || null;
  }

  create() {
    const cx = DESIGN_WIDTH / 2;

    // Background
    const bg = this.add.graphics();
    bg.fillStyle(0x0a0a1a, 1);
    bg.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);

    // Bottom color bars
    LANE_COLORS.forEach((color, i) => {
      const hex = parseInt(color.replace('#', ''), 16);
      const bar = this.add.graphics();
      bar.fillStyle(hex, 0.1);
      bar.fillRect(i * (DESIGN_WIDTH / 4), DESIGN_HEIGHT - 80, DESIGN_WIDTH / 4, 80);
    });

    // Title
    this.add.text(cx, 40, 'RESULTS', {
      fontSize: '28px',
      fontFamily: 'Arial Black, Arial',
      color: '#888888',
      letterSpacing: 6
    }).setOrigin(0.5);

    this.add.text(cx, 70, this.data_title, {
      fontSize: '16px', fontFamily: 'Arial', color: '#555555', align: 'center'
    }).setOrigin(0.5);

    // Difficulty badge
    const diff = DIFFICULTIES[this.data_difficulty] || DIFFICULTIES[DEFAULT_DIFFICULTY];
    this.add.text(cx, 94, diff.label, {
      fontSize: '12px', fontFamily: 'Arial Black, Arial',
      color: diff.color, letterSpacing: 3, align: 'center'
    }).setOrigin(0.5);

    // Grade (big)
    const gradeColor = GRADE_COLORS[this.data_grade] || '#ffffff';
    const gradeText = this.add.text(cx, 170, this.data_grade, {
      fontSize: '120px',
      fontFamily: 'Arial Black, Arial',
      color: gradeColor,
      stroke: '#000000',
      strokeThickness: 6
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({
      targets: gradeText,
      alpha: 1,
      scaleX: { from: 1.5, to: 1 },
      scaleY: { from: 1.5, to: 1 },
      duration: 500,
      ease: 'Back.Out',
      delay: 200
    });

    // Score
    this.add.text(cx, 280, 'SCORE', {
      fontSize: '13px',
      fontFamily: 'Arial',
      color: '#888888',
      letterSpacing: 3
    }).setOrigin(0.5);

    const scoreDisplay = this.add.text(cx, 310, '0', {
      fontSize: '48px',
      fontFamily: 'Arial Black, Arial',
      color: '#ffffff'
    }).setOrigin(0.5);

    // Animate score count up
    const targetScore = this.data_score;
    this.tweens.addCounter({
      from: 0,
      to: targetScore,
      duration: 800,
      ease: 'Quad.Out',
      delay: 400,
      onUpdate: (tween) => {
        scoreDisplay.setText(Math.floor(tween.getValue()).toLocaleString());
      }
    });

    // Divider
    const div = this.add.graphics();
    div.lineStyle(1, 0x333333, 1);
    div.lineBetween(40, 375, DESIGN_WIDTH - 40, 375);

    // Stats grid
    const stats = [
      { label: 'MAX COMBO', value: `${this.data_maxCombo}x` },
      { label: 'PERFECT',   value: this.data_judgments.perfect,  color: '#ffffff' },
      { label: 'GREAT',     value: this.data_judgments.great,    color: '#FFD700' },
      { label: 'GOOD',      value: this.data_judgments.good,     color: '#4ECDC4' },
      { label: 'MISS',      value: this.data_judgments.miss,     color: '#FF6B6B' }
    ];

    stats.forEach((stat, i) => {
      const row = 400 + i * 52;
      this.add.text(60, row, stat.label, {
        fontSize: '13px',
        fontFamily: 'Arial',
        color: '#888888',
        letterSpacing: 2
      }).setOrigin(0, 0.5);

      this.add.text(DESIGN_WIDTH - 60, row, stat.value.toString(), {
        fontSize: '22px',
        fontFamily: 'Arial Black, Arial',
        color: stat.color || '#ffffff'
      }).setOrigin(1, 0.5);
    });

    const div2 = this.add.graphics();
    div2.lineStyle(1, 0x333333, 1);
    div2.lineBetween(40, 668, DESIGN_WIDTH - 40, 668);

    // Buttons
    const retryBtn = this._makeButton(cx - 75, 720, 'RETRY', LANE_COLORS_HEX[0], () => {
      if (this.data_songKey === '__uploaded__' && this.registry.get('uploadedSong')) {
        this.scene.start('GameplayScene', { songKey: '__uploaded__', difficulty: this.data_difficulty });
      } else if (this.data_songKey) {
        this.scene.start('GameplayScene', { songKey: this.data_songKey, chartKey: this.data_chartKey, difficulty: this.data_difficulty });
      } else {
        this.scene.start('SongSelectScene');
      }
    });

    const menuBtn = this._makeButton(cx + 75, 720, 'MENU', LANE_COLORS_HEX[2], () => {
      this.scene.start('SongSelectScene');
    });
  }

  _makeButton(x, y, label, color, callback) {
    const w = 120;
    const h = 48;

    const btn = this.add.graphics();
    btn.fillStyle(color, 0.15);
    btn.fillRoundedRect(x - w / 2, y - h / 2, w, h, 8);
    btn.lineStyle(2, color, 0.8);
    btn.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 8);

    const txt = this.add.text(x, y, label, {
      fontSize: '18px',
      fontFamily: 'Arial Black, Arial',
      color: '#ffffff',
      align: 'center'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    txt.on('pointerdown', callback);
    txt.on('pointerover', () => {
      btn.clear();
      btn.fillStyle(color, 0.35);
      btn.fillRoundedRect(x - w / 2, y - h / 2, w, h, 8);
      btn.lineStyle(2, color, 1);
      btn.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 8);
    });
    txt.on('pointerout', () => {
      btn.clear();
      btn.fillStyle(color, 0.15);
      btn.fillRoundedRect(x - w / 2, y - h / 2, w, h, 8);
      btn.lineStyle(2, color, 0.8);
      btn.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 8);
    });

    return { btn, txt };
  }
}

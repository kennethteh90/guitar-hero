import Phaser from 'phaser';
import {
  DESIGN_WIDTH, DESIGN_HEIGHT, NUM_LANES, LANE_COLORS_HEX,
  SCROLL_SPEED, HIT_ZONE_RATIO, NOTE_SPAWN_LEAD, NOTE_POOL_SIZE,
  TIMING, NOTE_RADIUS, COMBO_MILESTONE, DIFFICULTIES, DEFAULT_DIFFICULTY,
  HOLD_NOTE_POOL_SIZE, HOLD_COMPLETE_WINDOW
} from '../constants.js';
import { applyDifficulty } from '../utils/difficultyFilter.js';
import { getLaneX } from '../utils/responsive.js';
import Note from '../objects/Note.js';
import HoldNote from '../objects/HoldNote.js';
import Lane from '../objects/Lane.js';
import HitEffect from '../objects/HitEffect.js';
import InputManager from '../systems/InputManager.js';
import AudioSyncManager from '../systems/AudioSyncManager.js';
import ChartManager from '../systems/ChartManager.js';
import ScoreManager from '../systems/ScoreManager.js';

export default class GameplayScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameplayScene' });
  }

  init(data) {
    this.songKey    = data.songKey    || null;
    this.chartKey   = data.chartKey   || null;
    this.difficulty = data.difficulty || DEFAULT_DIFFICULTY;
    this._playing = false;
    this._paused  = false;
    this._ended   = false;
    this._demoMode = false;
    this._preRollStartTime = null;  // performance.now() when visual pre-roll begins
    this._audioStarted     = false; // true once audioSync.play() has been called

    const diff = DIFFICULTIES[this.difficulty] || DIFFICULTIES[DEFAULT_DIFFICULTY];
    // Effective values used throughout the scene
    this._scrollSpeed   = SCROLL_SPEED * diff.scrollMult;
    this._timingWindows = {
      PERFECT: Math.round(TIMING.PERFECT * diff.timingMult),
      GREAT:   Math.round(TIMING.GREAT   * diff.timingMult),
      GOOD:    Math.round(TIMING.GOOD    * diff.timingMult),
      MISS:    Math.round(TIMING.MISS    * diff.timingMult),
    };
    this._diffConfig = diff;
  }

  // create() must be synchronous — Phaser does not await its return value.
  // Async loading for uploaded songs is handled via Phaser's loader + events.
  create() {
    this.hitZoneY = DESIGN_HEIGHT * HIT_ZONE_RATIO;

    // Managers
    this.chartManager = new ChartManager();
    this.scoreManager = new ScoreManager();
    this.scoreManager.setTimingWindows(this._timingWindows);
    this.audioSync = new AudioSyncManager(this);

    // Background
    const bg = this.add.graphics();
    bg.fillStyle(0x0a0a12, 1);
    bg.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);

    this._createTopFade();

    // Lanes
    this.lanes = [];
    for (let i = 0; i < NUM_LANES; i++) {
      this.lanes.push(new Lane(this, i, this.hitZoneY));
    }

    // Tap note pool
    this.notePool = [];
    this.activeNotes = [];
    for (let i = 0; i < NOTE_POOL_SIZE; i++) {
      const note = new Note(this);
      note.setDepth(5);
      this.notePool.push(note);
    }

    // Hold note pool
    this.holdNotePool = [];
    this.activeHoldNotes = [];
    this.heldNotes = new Array(NUM_LANES).fill(null); // currently-held note per lane
    for (let i = 0; i < HOLD_NOTE_POOL_SIZE; i++) {
      this.holdNotePool.push(new HoldNote(this));
    }

    this.hitEffect = new HitEffect(this, this.hitZoneY);
    this._createHUD();
    this._createProgressBar();

    // Input
    this.inputManager = new InputManager(this);
    this.events.on('lane-tap',     this._onLaneTap,     this);
    this.events.on('lane-release', this._onLaneRelease, this);
    this.events.on('lane-flash',   (lane) => this.lanes[lane].flashOnTap(this), this);

    // Load content — synchronous for demo/pre-loaded songs,
    // uses Phaser loader + callback for uploaded audio.
    this._loadContent();
  }

  _loadContent() {
    if (this.songKey === '__uploaded__') {
      const data = this.registry.get('uploadedSong');
      if (!data) { this._loadDemoChart(); this._startCountdown(); return; }

      this.chartManager.loadFromObject(applyDifficulty(data.chart, this.difficulty));
      this.chartDuration = data.chart.duration;
      this.chartTitle = data.chart.title;

      // Check if already in cache from SongSelectScene's loader
      if (this.cache.audio.has('__uploaded_audio__')) {
        this.audioSync.load('__uploaded_audio__');
        this.scoreManager.reset();
        this._startCountdown();
      } else {
        // Load via Phaser loader and wait for completion
        this._showLoadingText('Loading audio...');
        this.load.audio('__uploaded_audio__', data.url);
        this.load.once('complete', () => {
          this._hideLoadingText();
          this.audioSync.load('__uploaded_audio__');
          this.scoreManager.reset();
          this._startCountdown();
        });
        this.load.start();
      }
    } else {
      // Pre-loaded demo song
      const chart = this.cache.json.get(this.chartKey);
      if (chart) {
        this.chartManager.loadFromObject(applyDifficulty(chart, this.difficulty));
        this.chartDuration = chart.duration;
        this.chartTitle = chart.title || 'Unknown';

        // Only load audio if it was successfully preloaded
        if (this.cache.audio.has(this.songKey)) {
          this.audioSync.load(this.songKey);
        } else {
          // Chart exists but no audio — run in demo (no-audio) mode
          this._demoMode = true;
        }
      } else {
        this._loadDemoChart();
      }
      this.scoreManager.reset();
      this._startCountdown();
    }
  }

  _loadDemoChart() {
    const notes = [];
    const bpm = 120;
    const beatInterval = 60 / bpm;
    for (let beat = 0; beat < 64; beat++) {
      const time = 2 + beat * beatInterval;
      const lane = beat % 4;
      notes.push({ time, lane });
      if (beat % 8 === 0) notes.push({ time, lane: (lane + 2) % 4 });
    }
    this.chartManager.loadFromObject({
      title: 'Demo', artist: 'Test', bpm, duration: 40, notes
    });
    this.chartDuration = 40;
    this.chartTitle = 'Demo';
    this._demoMode = true;
  }

  _showLoadingText(msg) {
    this._loadingText = this.add.text(DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2, msg, {
      fontSize: '20px', fontFamily: 'Arial', color: '#ffffff', align: 'center'
    }).setOrigin(0.5).setDepth(30);
  }

  _hideLoadingText() {
    if (this._loadingText) { this._loadingText.destroy(); this._loadingText = null; }
  }

  _createTopFade() {
    const grad = this.add.graphics();
    grad.fillGradientStyle(0x0a0a12, 0x0a0a12, 0x0a0a12, 0x0a0a12, 1, 1, 0, 0);
    grad.fillRect(0, 0, DESIGN_WIDTH, 80);
    grad.setDepth(8);
  }

  _createHUD() {
    const hudDepth = 15;

    this.add.text(16, 16, 'SCORE', {
      fontSize: '11px', fontFamily: 'Arial', color: '#888888', letterSpacing: 2
    }).setDepth(hudDepth);

    this.scoreText = this.add.text(16, 28, '0', {
      fontSize: '32px', fontFamily: 'Arial Black, Arial', color: '#ffffff'
    }).setDepth(hudDepth);

    this.comboText = this.add.text(DESIGN_WIDTH / 2, 24, '', {
      fontSize: '28px', fontFamily: 'Arial Black, Arial', color: '#FFD700',
      stroke: '#000000', strokeThickness: 3, align: 'center'
    }).setOrigin(0.5, 0).setDepth(hudDepth);

    this.multText = this.add.text(DESIGN_WIDTH - 16, 16, '', {
      fontSize: '14px', fontFamily: 'Arial Black, Arial', color: '#FF6B6B', align: 'right'
    }).setOrigin(1, 0).setDepth(hudDepth);

    this.titleText = this.add.text(DESIGN_WIDTH / 2, DESIGN_HEIGHT * 0.1, '', {
      fontSize: '13px', fontFamily: 'Arial', color: '#666666', align: 'center'
    }).setOrigin(0.5).setDepth(hudDepth);

    // Difficulty badge (top-right, above pause)
    const diff = this._diffConfig;
    this.add.text(DESIGN_WIDTH - 16, 16, diff.label, {
      fontSize: '11px', fontFamily: 'Arial Black, Arial',
      color: diff.color, letterSpacing: 2
    }).setOrigin(1, 0).setDepth(hudDepth);

    const pauseBtn = this.add.text(DESIGN_WIDTH - 16, 34, '⏸', {
      fontSize: '20px', color: '#555555'
    }).setOrigin(1, 0).setDepth(hudDepth).setInteractive({ useHandCursor: true });
    pauseBtn.on('pointerdown', () => this._togglePause());
  }

  _createProgressBar() {
    const bg = this.add.graphics().setDepth(16);
    bg.fillStyle(0x222222, 1);
    bg.fillRect(0, 0, DESIGN_WIDTH, 3);
    this.progressBar = this.add.graphics().setDepth(17);
  }

  _updateProgressBar(progress) {
    this.progressBar.clear();
    this.progressBar.fillStyle(0x4ECDC4, 1);
    this.progressBar.fillRect(0, 0, DESIGN_WIDTH * Math.min(1, progress), 3);
  }

  _startCountdown() {
    if (this.titleText) {
      this.titleText.setText(this.chartTitle || '');
      this.time.delayedCall(1500, () => {
        this.tweens.add({ targets: this.titleText, alpha: { from: 1, to: 0 }, duration: 800 });
      });
    }

    let count = 3;
    const countText = this.add.text(DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2, '', {
      fontSize: '96px', fontFamily: 'Arial Black, Arial', color: '#ffffff',
      stroke: '#000000', strokeThickness: 6, align: 'center'
    }).setOrigin(0.5).setDepth(20).setAlpha(0);

    const doCount = () => {
      countText.setText(count > 0 ? count.toString() : 'GO!');
      countText.setAlpha(1).setScale(1.2);
      this.tweens.add({
        targets: countText,
        scaleX: 0.8, scaleY: 0.8,
        alpha: count > 0 ? 0.4 : 0,
        duration: 700, ease: 'Quad.Out'
      });
      if (count === 0) {
        this.time.delayedCall(400, () => { countText.destroy(); this._startPlay(); });
      } else {
        count--;
        this.time.delayedCall(800, doCount);
      }
    };
    this.time.delayedCall(300, doCount);

    // Pre-roll: start the visual update loop NOTE_SPAWN_LEAD seconds before audio
    // so notes scroll in during the countdown and arrive at the hit zone on beat.
    // Total countdown = 300 + 800×3 + 400 = 3100 ms.  Pre-roll at 1100 ms (on "2").
    const COUNTDOWN_MS   = 300 + 800 * 3 + 400;
    const preRollDelayMs = Math.max(0, COUNTDOWN_MS - NOTE_SPAWN_LEAD * 1000);
    this.time.delayedCall(preRollDelayMs, () => {
      if (this._ended) return;
      this.chartManager.reset();
      this._preRollStartTime = performance.now();
      this._playing = true;
    });
  }

  _startPlay() {
    this._paused = false;

    if (this._demoMode) {
      // Demo mode has no pre-roll — just start the wall-clock timer from zero.
      this.chartManager.reset();
      this._playing = true;
      this._demoStartTime = performance.now();
    } else {
      // Pre-roll already has _playing = true and chartManager advancing.
      // Simply start the audio — the visual timeline seamlessly hands off.
      this._audioStarted = true;
      this.audioSync.play(0);
    }
  }

  _togglePause() {
    if (!this._playing || !this._audioStarted) return;

    if (this._paused) {
      this._paused = false;
      if (this._demoMode) {
        this._demoStartTime = performance.now() - this._pausedAt * 1000;
      } else {
        this._rewindChartToTime(this._pausedAt);
        // Seek to _pausedAt + latency so that currentTime (seek − latency)
        // resumes exactly at the visual position we paused at.
        this.audioSync.play(this._pausedAt + this.audioSync.audioLatency);
      }
    } else {
      this._paused = true;
      this._pausedAt = this._getSongTime();
      if (!this._demoMode) this.audioSync.stop();
      // Release all active holds on pause
      for (let lane = 0; lane < NUM_LANES; lane++) {
        const hn = this.heldNotes[lane];
        if (hn) { hn.isHeld = false; this.heldNotes[lane] = null; }
      }

      const overlay = this.add.graphics().setDepth(25);
      overlay.fillStyle(0x000000, 0.7);
      overlay.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);

      const pauseLabel = this.add.text(DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2 - 40, 'PAUSED', {
        fontSize: '48px', fontFamily: 'Arial Black, Arial', color: '#ffffff'
      }).setOrigin(0.5).setDepth(26);

      const resumeBtn = this.add.text(DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2 + 40, 'RESUME', {
        fontSize: '24px', fontFamily: 'Arial', color: '#4ECDC4'
      }).setOrigin(0.5).setDepth(26).setInteractive({ useHandCursor: true });

      resumeBtn.on('pointerup', () => {
        overlay.destroy(); pauseLabel.destroy(); resumeBtn.destroy(); quitBtn.destroy();
        this._togglePause();
      });

      const quitBtn = this.add.text(DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2 + 90, 'QUIT', {
        fontSize: '20px', fontFamily: 'Arial', color: '#FF6B6B'
      }).setOrigin(0.5).setDepth(26).setInteractive({ useHandCursor: true });
      quitBtn.on('pointerup', () => this.scene.start('SongSelectScene'));
    }
  }

  _rewindChartToTime(time) {
    this.chartManager.noteIndex = 0;
    const notes = this.chartManager.chart.notes;
    while (
      this.chartManager.noteIndex < notes.length &&
      notes[this.chartManager.noteIndex].time <= time
    ) {
      this.chartManager.noteIndex++;
    }
  }

  _getSongTime() {
    if (this._demoMode) {
      return (performance.now() - this._demoStartTime) / 1000;
    }
    if (this._audioStarted) {
      // Audio is playing — use the audio clock (most accurate).
      return this.audioSync.currentTime;
    }
    // Pre-roll phase: visual time starts at -NOTE_SPAWN_LEAD and rises to 0
    // over the NOTE_SPAWN_LEAD seconds before audio begins.
    if (this._preRollStartTime !== null) {
      return (performance.now() - this._preRollStartTime) / 1000 - NOTE_SPAWN_LEAD;
    }
    return 0;
  }

  update(time, delta) {
    if (!this._playing || this._paused) return;

    const songTime = this._getSongTime();
    const missWindow = this._timingWindows.MISS / 1000;

    // Spawn from chart
    const toSpawn = this.chartManager.getNotesInWindow(songTime, NOTE_SPAWN_LEAD);
    toSpawn.forEach(noteData => this._spawnNote(noteData));

    // --- Tap notes ---
    for (let i = this.activeNotes.length - 1; i >= 0; i--) {
      const note = this.activeNotes[i];
      note.updatePosition(songTime);

      if (!note.scored && note.hitTime < songTime - missWindow) {
        note.scored = true;
        this._updateHUD(this.scoreManager.registerMiss());
        this._recycleNote(note, i);
      } else if (note.y > DESIGN_HEIGHT + NOTE_RADIUS * 2) {
        this._recycleNote(note, i);
      }
    }

    // --- Hold notes ---
    for (let i = this.activeHoldNotes.length - 1; i >= 0; i--) {
      const hn = this.activeHoldNotes[i];
      hn.updatePosition(songTime);

      // Auto-miss the head if it scrolls past the miss window untapped
      if (!hn.scored && hn.hitTime < songTime - missWindow) {
        hn.scored = true;
        hn.isHeld = false;
        this._updateHUD(this.scoreManager.registerMiss());
        // Don't recycle yet — body still needs to scroll off
      }

      // Complete hold when tail reaches hit zone (player still holding)
      if (hn.isHeld && !hn.holdScored && songTime >= hn.endTime - HOLD_COMPLETE_WINDOW) {
        hn.isHeld = false;
        hn.holdScored = true;
        this.heldNotes[hn.lane] = null;
        this.scoreManager.scoreHoldBonus();
        this.hitEffect.spawn(hn.lane, 'perfect');
        this._updateHUD(null);
      }

      // Recycle once tail scrolls below screen
      if (hn.tailY > DESIGN_HEIGHT + NOTE_RADIUS * 2) {
        // If somehow still held at this point, complete it
        if (hn.isHeld && !hn.holdScored) {
          this.heldNotes[hn.lane] = null;
          hn.isHeld = false;
          hn.holdScored = true;
          this.scoreManager.scoreHoldBonus();
        }
        this._recycleHoldNote(hn, i);
      }
    }

    this._updateHUD(null);
    this._updateProgressBar(Math.max(0, songTime) / (this.chartDuration || 60));

    if (songTime >= (this.chartDuration || 60) + 2) {
      this._endSong();
    }
  }

  _spawnNote(noteData) {
    if (noteData.duration > 0) {
      const hn = this.holdNotePool.pop();
      if (!hn) return;
      hn.spawn(noteData.lane, noteData.time, noteData.time + noteData.duration, this.hitZoneY, this._scrollSpeed);
      this.activeHoldNotes.push(hn);
    } else {
      const note = this.notePool.pop();
      if (!note) return;
      note.spawn(noteData.lane, noteData.time, this.hitZoneY, this._scrollSpeed);
      this.activeNotes.push(note);
    }
  }

  _recycleNote(note, index) {
    note.recycle();
    this.activeNotes.splice(index, 1);
    this.notePool.push(note);
  }

  _recycleHoldNote(hn, index) {
    hn.recycle();
    this.activeHoldNotes.splice(index, 1);
    this.holdNotePool.push(hn);
  }

  _onLaneTap(lane) {
    if (!this._playing || this._paused) return;

    const songTime = this._getSongTime();
    const missMs   = this._timingWindows.MISS;

    // 1. Check hold note heads first
    let closestHold  = null;
    let closestHoldD = Infinity;
    for (const hn of this.activeHoldNotes) {
      if (hn.lane !== lane || hn.scored) continue;
      const deltaMs = (songTime - hn.hitTime) * 1000;
      const absMs   = Math.abs(deltaMs);
      if (absMs <= missMs && absMs < Math.abs(closestHoldD)) {
        closestHold  = hn;
        closestHoldD = deltaMs;
      }
    }
    if (closestHold) {
      closestHold.scored = true;
      closestHold.isHeld = true;
      this.heldNotes[lane] = closestHold;
      const result = this.scoreManager.judge(closestHoldD);
      this.hitEffect.spawn(lane, result.judgment);
      this._updateHUD(result);
      this._checkComboMilestone(result.combo);
      return;
    }

    // 2. Check tap notes
    let closest = null;
    let closestDelta = Infinity;
    for (const note of this.activeNotes) {
      if (note.lane !== lane || note.scored) continue;
      const deltaMs = (songTime - note.hitTime) * 1000;
      const absMs   = Math.abs(deltaMs);
      if (absMs <= missMs && absMs < Math.abs(closestDelta)) {
        closest      = note;
        closestDelta = deltaMs;
      }
    }
    if (closest) {
      closest.scored = true;
      const result = this.scoreManager.judge(closestDelta);
      this.hitEffect.spawn(lane, result.judgment);
      this._updateHUD(result);
      this._checkComboMilestone(result.combo);
      this.time.delayedCall(80, () => {
        const idx = this.activeNotes.indexOf(closest);
        if (idx !== -1) this._recycleNote(closest, idx);
      });
      return;
    }

    // Ghost tap — no note in window
    const result = this.scoreManager.registerGhostTap();
    this._updateHUD(result);
    this._showGhostTapFeedback(lane);
  }

  _showGhostTapFeedback(lane) {
    const x = getLaneX(lane);
    const y = this.hitZoneY - 30;
    const text = this.add.text(x, y, 'MISS', {
      fontSize: '18px', fontFamily: 'Arial Black, Arial',
      color: '#FF4444', stroke: '#000000', strokeThickness: 2, align: 'center'
    }).setOrigin(0.5).setDepth(12);
    this.tweens.add({
      targets: text,
      y: y - 40, alpha: { from: 1, to: 0 },
      duration: 500, ease: 'Quad.Out',
      onComplete: () => text.destroy()
    });
  }

  _onLaneRelease(lane) {
    const hn = this.heldNotes[lane];
    if (hn && hn.isHeld) {
      hn.isHeld = false;
      this.heldNotes[lane] = null;
      // No penalty for early release — player just misses the hold bonus
    }
  }

  _updateHUD(result) {
    const { score, combo, multiplier } = this.scoreManager;
    this.scoreText.setText(score.toLocaleString());
    this.comboText.setText(combo >= 3 ? `${combo}x` : '');
    if (combo >= 3) this.comboText.setAlpha(1);
    this.multText.setText(multiplier > 1 ? `×${multiplier}` : '');
  }

  _checkComboMilestone(combo) {
    if (combo > 0 && combo % COMBO_MILESTONE === 0) {
      this.cameras.main.shake(200, 0.006);

      const text = this.add.text(DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2, `${combo} COMBO!`, {
        fontSize: '36px', fontFamily: 'Arial Black, Arial', color: '#FFD700',
        stroke: '#000000', strokeThickness: 4, align: 'center'
      }).setOrigin(0.5).setDepth(18);

      this.tweens.add({
        targets: text,
        y: DESIGN_HEIGHT / 2 - 80,
        alpha: { from: 1, to: 0 },
        scaleX: { from: 1.2, to: 0.9 }, scaleY: { from: 1.2, to: 0.9 },
        duration: 1200, ease: 'Quad.Out',
        onComplete: () => text.destroy()
      });

      this.tweens.add({
        targets: this.comboText,
        scaleX: { from: 1.4, to: 1 }, scaleY: { from: 1.4, to: 1 },
        duration: 300, ease: 'Back.Out'
      });
    }
  }

  _endSong() {
    if (this._ended) return;
    this._ended = true;
    this._playing = false;
    if (!this._demoMode) this.audioSync.stop();

    this.time.delayedCall(1500, () => {
      this.scene.start('ResultsScene', {
        score:      this.scoreManager.score,
        maxCombo:   this.scoreManager.maxCombo,
        judgments:  { ...this.scoreManager.judgments },
        grade:      this.scoreManager.getGrade(),
        title:      this.chartTitle,
        difficulty: this.difficulty,
        songKey:    this.songKey,
        chartKey:   this.chartKey
      });
    });
  }

  shutdown() {
    this.events.off('lane-tap',     this._onLaneTap,     this);
    this.events.off('lane-release', this._onLaneRelease, this);
    this.events.off('lane-flash');
    // Release all held notes
    if (this.heldNotes) this.heldNotes.fill(null);
    if (this.inputManager) this.inputManager.destroy();
    if (this.audioSync) this.audioSync.destroy();
    // Destroy hold note graphics
    if (this.holdNotePool)    this.holdNotePool.forEach(hn => hn.destroy());
    if (this.activeHoldNotes) this.activeHoldNotes.forEach(hn => hn.destroy());
  }
}

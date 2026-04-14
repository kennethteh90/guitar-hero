import Phaser from 'phaser';
import { DESIGN_WIDTH, DESIGN_HEIGHT, LANE_COLORS, LANE_COLORS_HEX, DIFFICULTIES, DEFAULT_DIFFICULTY } from '../constants.js';
import BeatDetector from '../systems/BeatDetector.js';
import { generateChart } from '../utils/chartGenerator.js';

export default class SongSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: 'SongSelectScene' });
    this._processing = false;
  }

  create() {
    const cx = DESIGN_WIDTH / 2;

    const bg = this.add.graphics();
    bg.fillStyle(0x0a0a1a, 1);
    bg.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);

    this.add.text(cx, 48, 'SELECT SONG', {
      fontSize: '28px', fontFamily: 'Arial Black, Arial', color: '#ffffff'
    }).setOrigin(0.5);

    this.add.text(cx, 80, '─────────────────', {
      fontSize: '14px', color: '#333333'
    }).setOrigin(0.5);

    const songs = this._buildSongList();
    songs.forEach((song, i) => this._createSongCard(song, i));
    this._createUploadButton(songs.length);

    const backBtn = this.add.text(24, 24, '← BACK', {
      fontSize: '16px', fontFamily: 'Arial', color: '#aaaaaa'
    }).setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => this.scene.start('MenuScene'));
    backBtn.on('pointerover', () => backBtn.setColor('#ffffff'));
    backBtn.on('pointerout',  () => backBtn.setColor('#aaaaaa'));

    this.statusText = this.add.text(cx, DESIGN_HEIGHT - 30, '', {
      fontSize: '14px', fontFamily: 'Arial', color: '#FFD700', align: 'center'
    }).setOrigin(0.5).setDepth(20);
  }

  _buildSongList() {
    const songs = [];
    const demo1Chart = this.cache.json.get('chart-demo1');
    if (demo1Chart) {
      songs.push({ key: 'demo1', chartKey: 'chart-demo1', title: demo1Chart.title || 'Demo Song 1', artist: demo1Chart.artist || 'Demo Artist', color: LANE_COLORS_HEX[0] });
    }
    const demo2Chart = this.cache.json.get('chart-demo2');
    if (demo2Chart) {
      songs.push({ key: 'demo2', chartKey: 'chart-demo2', title: demo2Chart.title || 'Demo Song 2', artist: demo2Chart.artist || 'Demo Artist', color: LANE_COLORS_HEX[1] });
    }
    return songs;
  }

  _createSongCard(song, index) {
    const cx = DESIGN_WIDTH / 2;
    const cardY = 130 + index * 100;
    const cardW = DESIGN_WIDTH - 40;
    const cardH = 80;

    const card = this.add.graphics();
    card.fillStyle(0x1a1a2e, 1);
    card.fillRoundedRect(20, cardY, cardW, cardH, 10);
    card.lineStyle(2, song.color, 0.6);
    card.strokeRoundedRect(20, cardY, cardW, cardH, 10);

    const accent = this.add.graphics();
    accent.fillStyle(song.color, 0.8);
    accent.fillRoundedRect(20, cardY, 6, cardH, { tl: 10, bl: 10, tr: 0, br: 0 });

    this.add.text(44, cardY + 20, song.title,  { fontSize: '18px', fontFamily: 'Arial Black, Arial', color: '#ffffff' });
    this.add.text(44, cardY + 48, song.artist, { fontSize: '13px', fontFamily: 'Arial',              color: '#888888' });

    const zone = this.add.zone(20, cardY, cardW, cardH).setOrigin(0).setInteractive({ useHandCursor: true });
    zone.on('pointerdown', () => this._showDifficultyModal(song.title, (diff) => this._startSong(song, diff)));
    zone.on('pointerover', () => {
      card.clear();
      card.fillStyle(0x2a2a4e, 1);
      card.fillRoundedRect(20, cardY, cardW, cardH, 10);
      card.lineStyle(2, song.color, 1);
      card.strokeRoundedRect(20, cardY, cardW, cardH, 10);
    });
    zone.on('pointerout', () => {
      card.clear();
      card.fillStyle(0x1a1a2e, 1);
      card.fillRoundedRect(20, cardY, cardW, cardH, 10);
      card.lineStyle(2, song.color, 0.6);
      card.strokeRoundedRect(20, cardY, cardW, cardH, 10);
    });
  }

  _createUploadButton(songCount) {
    const cx = DESIGN_WIDTH / 2;
    const btnY = 130 + songCount * 100;
    const btnW = DESIGN_WIDTH - 40;
    const btnH = 80;

    const btn = this.add.graphics();
    btn.fillStyle(0x1a1a2e, 1);
    btn.fillRoundedRect(20, btnY, btnW, btnH, 10);
    btn.lineStyle(2, 0x555555, 0.8);
    btn.strokeRoundedRect(20, btnY, btnW, btnH, 10);

    this.add.text(cx, btnY + 40, '+ UPLOAD YOUR SONG', {
      fontSize: '18px', fontFamily: 'Arial Black, Arial', color: '#888888', align: 'center'
    }).setOrigin(0.5);
    this.add.text(cx, btnY + 62, 'mp3, wav, ogg supported', {
      fontSize: '12px', fontFamily: 'Arial', color: '#555555', align: 'center'
    }).setOrigin(0.5);

    const zone = this.add.zone(20, btnY, btnW, btnH).setOrigin(0).setInteractive({ useHandCursor: true });
    zone.on('pointerdown', () => { if (!this._processing) this._triggerUpload(); });
    zone.on('pointerover', () => {
      btn.clear();
      btn.fillStyle(0x2a2a3e, 1);
      btn.fillRoundedRect(20, btnY, btnW, btnH, 10);
      btn.lineStyle(2, 0xFFD700, 0.8);
      btn.strokeRoundedRect(20, btnY, btnW, btnH, 10);
    });
    zone.on('pointerout', () => {
      btn.clear();
      btn.fillStyle(0x1a1a2e, 1);
      btn.fillRoundedRect(20, btnY, btnW, btnH, 10);
      btn.lineStyle(2, 0x555555, 0.8);
      btn.strokeRoundedRect(20, btnY, btnW, btnH, 10);
    });
  }

  // ---------- Difficulty modal ----------

  _showDifficultyModal(songTitle, onSelect) {
    const cx = DESIGN_WIDTH / 2;
    const modalW = DESIGN_WIDTH - 60;
    const modalH = 280;
    const modalX = 30;
    const modalY = DESIGN_HEIGHT / 2 - modalH / 2;
    const depth = 50;

    // Dim overlay
    const overlay = this.add.graphics().setDepth(depth);
    overlay.fillStyle(0x000000, 0.75);
    overlay.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);

    // Modal panel
    const panel = this.add.graphics().setDepth(depth + 1);
    panel.fillStyle(0x12122a, 1);
    panel.fillRoundedRect(modalX, modalY, modalW, modalH, 14);
    panel.lineStyle(2, 0x333366, 1);
    panel.strokeRoundedRect(modalX, modalY, modalW, modalH, 14);

    // Song name
    this.add.text(cx, modalY + 28, songTitle, {
      fontSize: '16px', fontFamily: 'Arial Black, Arial', color: '#888888', align: 'center'
    }).setOrigin(0.5).setDepth(depth + 2);

    this.add.text(cx, modalY + 52, 'SELECT DIFFICULTY', {
      fontSize: '20px', fontFamily: 'Arial Black, Arial', color: '#ffffff', align: 'center'
    }).setOrigin(0.5).setDepth(depth + 2);

    // Three difficulty buttons
    const diffKeys = ['easy', 'normal', 'hard'];
    const btnW = 90;
    const btnH = 68;
    const spacing = 108;
    const rowY = modalY + 110;

    const modalObjects = [overlay, panel];

    diffKeys.forEach((key, i) => {
      const diff = DIFFICULTIES[key];
      const bx = cx + (i - 1) * spacing;

      const btnGfx = this.add.graphics().setDepth(depth + 2);
      btnGfx.fillStyle(diff.colorHex, 0.15);
      btnGfx.fillRoundedRect(bx - btnW / 2, rowY, btnW, btnH, 10);
      btnGfx.lineStyle(2, diff.colorHex, 0.7);
      btnGfx.strokeRoundedRect(bx - btnW / 2, rowY, btnW, btnH, 10);

      const label = this.add.text(bx, rowY + 22, diff.label, {
        fontSize: '15px', fontFamily: 'Arial Black, Arial', color: diff.color, align: 'center'
      }).setOrigin(0.5).setDepth(depth + 3);

      const dots = this._difficultyDots(bx, rowY + 50, key, depth + 3);

      const hitZone = this.add.zone(bx - btnW / 2, rowY, btnW, btnH)
        .setOrigin(0).setDepth(depth + 4).setInteractive({ useHandCursor: true });

      hitZone.on('pointerover', () => {
        btnGfx.clear();
        btnGfx.fillStyle(diff.colorHex, 0.35);
        btnGfx.fillRoundedRect(bx - btnW / 2, rowY, btnW, btnH, 10);
        btnGfx.lineStyle(2, diff.colorHex, 1);
        btnGfx.strokeRoundedRect(bx - btnW / 2, rowY, btnW, btnH, 10);
      });
      hitZone.on('pointerout', () => {
        btnGfx.clear();
        btnGfx.fillStyle(diff.colorHex, 0.15);
        btnGfx.fillRoundedRect(bx - btnW / 2, rowY, btnW, btnH, 10);
        btnGfx.lineStyle(2, diff.colorHex, 0.7);
        btnGfx.strokeRoundedRect(bx - btnW / 2, rowY, btnW, btnH, 10);
      });
      hitZone.on('pointerdown', () => {
        modalObjects.forEach(o => o.destroy());
        allModalObjects.forEach(o => o.destroy());
        onSelect(key);
      });

      modalObjects.push(btnGfx, label, hitZone, ...dots);
    });

    // Description text (updates on hover — static for simplicity)
    const descText = this.add.text(cx, rowY + btnH + 20, DIFFICULTIES[DEFAULT_DIFFICULTY].description, {
      fontSize: '12px', fontFamily: 'Arial', color: '#666666', align: 'center'
    }).setOrigin(0.5).setDepth(depth + 2);

    // Cancel
    const cancelBtn = this.add.text(cx, modalY + modalH - 28, 'CANCEL', {
      fontSize: '14px', fontFamily: 'Arial', color: '#555555', align: 'center'
    }).setOrigin(0.5).setDepth(depth + 3).setInteractive({ useHandCursor: true });

    cancelBtn.on('pointerover', () => cancelBtn.setColor('#aaaaaa'));
    cancelBtn.on('pointerout',  () => cancelBtn.setColor('#555555'));
    cancelBtn.on('pointerdown', () => {
      modalObjects.forEach(o => o.destroy());
      allModalObjects.forEach(o => o.destroy());
    });

    const allModalObjects = [descText, cancelBtn];
  }

  _difficultyDots(cx, y, diffKey, depth) {
    const filled = diffKey === 'easy' ? 1 : diffKey === 'normal' ? 2 : 3;
    const diff = DIFFICULTIES[diffKey];
    const dots = [];
    for (let i = 0; i < 3; i++) {
      const gfx = this.add.graphics().setDepth(depth);
      const dx = cx + (i - 1) * 12;
      if (i < filled) {
        gfx.fillStyle(diff.colorHex, 1);
        gfx.fillCircle(dx, y, 4);
      } else {
        gfx.lineStyle(1.5, diff.colorHex, 0.35);
        gfx.strokeCircle(dx, y, 4);
      }
      dots.push(gfx);
    }
    return dots;
  }

  // ---------- Upload ----------

  _triggerUpload() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'audio/*';
    input.style.display = 'none';
    document.body.appendChild(input);

    input.onchange = async (e) => {
      const file = e.target.files[0];
      document.body.removeChild(input);
      if (!file) return;

      this._processing = true;
      this.statusText.setText('Analyzing beats...');

      try {
        const arrayBuffer = await file.arrayBuffer();
        const { beats, audioBuffer } = await BeatDetector.detect(arrayBuffer);
        this.statusText.setText(`Found ${beats.length} beats. Generating chart...`);

        const chart = generateChart(beats, audioBuffer, file.name.replace(/\.[^/.]+$/, ''), 'Your Upload');
        const blob = new Blob([await file.arrayBuffer()], { type: file.type });
        const url = URL.createObjectURL(blob);

        this.registry.set('uploadedSong', { url, chart, audioBuffer, isUploaded: true });
        this._processing = false;
        this.statusText.setText('Ready! Choose difficulty...');

        this._showDifficultyModal(chart.title, (diff) => {
          this.statusText.setText('');
          this.scene.start('GameplayScene', { songKey: '__uploaded__', difficulty: diff });
        });
      } catch (err) {
        console.error('Upload failed:', err);
        this.statusText.setText('Error processing file. Try another.');
        this._processing = false;
      }
    };

    input.click();
  }

  _startSong(song, difficulty) {
    this.scene.start('GameplayScene', { songKey: song.key, chartKey: song.chartKey, difficulty });
  }
}

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

    // Background
    const bg = this.add.graphics();
    bg.fillStyle(0x0a0a1a, 1);
    bg.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);

    // Fixed header (depth 10 so it floats above scroll container)
    this.add.text(cx, 48, 'SELECT SONG', {
      fontSize: '28px', fontFamily: 'Arial Black, Arial', color: '#ffffff'
    }).setOrigin(0.5).setDepth(10);

    // Header fade overlay
    const headerMask = this.add.graphics().setDepth(9);
    headerMask.fillStyle(0x0a0a1a, 1);
    headerMask.fillRect(0, 0, DESIGN_WIDTH, 100);

    // --- Scrollable container ---
    const SCROLL_TOP = 100;         // y where scroll area begins
    const SCROLL_BOTTOM = DESIGN_HEIGHT - 50;
    const SCROLL_H = SCROLL_BOTTOM - SCROLL_TOP;
    const CARD_H = 88;
    const CARD_GAP = 8;
    const CARD_STRIDE = CARD_H + CARD_GAP;

    this._scrollContainer = this.add.container(0, SCROLL_TOP);

    const songs = this._buildSongList();
    songs.forEach((song, i) => this._createSongCard(song, i, CARD_STRIDE));
    this._createUploadButton(songs.length, CARD_STRIDE);

    const totalContentH = (songs.length + 1) * CARD_STRIDE + 20;
    const maxScroll = Math.max(0, totalContentH - SCROLL_H);

    // Clip scrollable area
    const maskGfx = this.make.graphics({ x: 0, y: 0, add: false });
    maskGfx.fillRect(0, SCROLL_TOP, DESIGN_WIDTH, SCROLL_H);
    this._scrollContainer.setMask(maskGfx.createGeometryMask());

    // Bottom fade overlay
    const botFade = this.add.graphics().setDepth(9);
    botFade.fillGradientStyle(0x0a0a1a, 0x0a0a1a, 0x0a0a1a, 0x0a0a1a, 0, 0, 1, 1);
    botFade.fillRect(0, SCROLL_BOTTOM - 40, DESIGN_WIDTH, 40);

    // Drag-to-scroll
    let dragStartY = 0;
    let containerStartY = 0;
    let isDragging = false;
    let dragMoved = false;

    this.input.on('pointerdown', (p) => {
      if (this._modalOpen) return;
      if (p.y < SCROLL_TOP || p.y > SCROLL_BOTTOM) return;
      isDragging = true;
      dragMoved  = false;
      dragStartY = p.y;
      containerStartY = this._scrollContainer.y;
    });

    this.input.on('pointermove', (p) => {
      if (!isDragging || this._modalOpen) return;
      const dy = p.y - dragStartY;
      if (Math.abs(dy) > 10) dragMoved = true;  // 10px threshold — forgiving on mobile
      if (dragMoved) {
        const newY = Phaser.Math.Clamp(containerStartY + dy, SCROLL_TOP - maxScroll, SCROLL_TOP);
        this._scrollContainer.y = newY;
      }
    });

    this.input.on('pointerup', () => { isDragging = false; });

    // Expose dragMoved so card tap handlers can ignore drags
    this._dragMoved   = () => dragMoved;
    this._modalOpen   = false;

    // Fixed UI
    const backBtn = this.add.text(24, 24, '← BACK', {
      fontSize: '16px', fontFamily: 'Arial', color: '#aaaaaa'
    }).setDepth(10).setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => this.scene.start('MenuScene'));
    backBtn.on('pointerover', () => backBtn.setColor('#ffffff'));
    backBtn.on('pointerout',  () => backBtn.setColor('#aaaaaa'));

    this.statusText = this.add.text(cx, DESIGN_HEIGHT - 20, '', {
      fontSize: '14px', fontFamily: 'Arial', color: '#FFD700', align: 'center'
    }).setOrigin(0.5).setDepth(20);

    // NCS attribution (CC BY 3.0) — some tracks courtesy of NoCopyrightSounds
    this.add.text(cx, DESIGN_HEIGHT - 6, 'Some music: NoCopyrightSounds (CC BY 3.0) · ncs.io', {
      fontSize: '9px', fontFamily: 'Arial', color: '#333355', align: 'center'
    }).setOrigin(0.5).setDepth(20);
  }

  _buildSongList() {
    const keys = ['demo3','demo4','demo5','demo6','demo7','demo8',
                  'demo9','demo10','demo11','demo12','demo13','demo14','demo15',
                  'demo16','demo17','demo18','demo19','demo20','demo21'];
    const songs = [];
    keys.forEach((key, i) => {
      const chart = this.cache.json.get(`chart-${key}`);
      if (chart) {
        songs.push({
          key,
          chartKey: `chart-${key}`,
          title:  chart.title  || key,
          artist: chart.artist || 'Unknown',
          color:  LANE_COLORS_HEX[i % LANE_COLORS_HEX.length]
        });
      }
    });
    return songs;
  }

  _createSongCard(song, index, stride) {
    const cx = DESIGN_WIDTH / 2;
    const cardY = index * stride;
    const cardW = DESIGN_WIDTH - 40;
    const cardH = stride - 8;

    const card = this.add.graphics();
    card.fillStyle(0x1a1a2e, 1);
    card.fillRoundedRect(20, cardY, cardW, cardH, 10);
    card.lineStyle(2, song.color, 0.6);
    card.strokeRoundedRect(20, cardY, cardW, cardH, 10);

    const accent = this.add.graphics();
    accent.fillStyle(song.color, 0.8);
    accent.fillRoundedRect(20, cardY, 6, cardH, { tl: 10, bl: 10, tr: 0, br: 0 });

    const titleTxt  = this.add.text(44, cardY + 18, song.title,  { fontSize: '17px', fontFamily: 'Arial Black, Arial', color: '#ffffff' });
    const artistTxt = this.add.text(44, cardY + 44, song.artist, { fontSize: '13px', fontFamily: 'Arial',              color: '#888888' });

    this._scrollContainer.add([card, accent, titleTxt, artistTxt]);

    const zone = this.add.zone(20, cardY, cardW, cardH).setOrigin(0).setInteractive({ useHandCursor: true });
    this._scrollContainer.add(zone);

    zone.on('pointerup', () => {
      if (this._modalOpen) return;
      if (this._dragMoved && this._dragMoved()) return;
      this._showDifficultyModal(song.title, (diff) => this._startSong(song, diff));
    });
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

  _createUploadButton(songCount, stride) {
    const cx = DESIGN_WIDTH / 2;
    const btnY = songCount * stride + 8;
    const btnW = DESIGN_WIDTH - 40;
    const btnH = 80;

    const btn = this.add.graphics();
    btn.fillStyle(0x1a1a2e, 1);
    btn.fillRoundedRect(20, btnY, btnW, btnH, 10);
    btn.lineStyle(2, 0x555555, 0.8);
    btn.strokeRoundedRect(20, btnY, btnW, btnH, 10);

    const lbl1 = this.add.text(cx, btnY + 28, '+ UPLOAD YOUR SONG', {
      fontSize: '18px', fontFamily: 'Arial Black, Arial', color: '#888888', align: 'center'
    }).setOrigin(0.5);
    const lbl2 = this.add.text(cx, btnY + 52, 'mp3, wav, ogg supported', {
      fontSize: '12px', fontFamily: 'Arial', color: '#555555', align: 'center'
    }).setOrigin(0.5);

    this._scrollContainer.add([btn, lbl1, lbl2]);

    const zone = this.add.zone(20, btnY, btnW, btnH).setOrigin(0).setInteractive({ useHandCursor: true });
    this._scrollContainer.add(zone);

    zone.on('pointerup', () => {
      if (this._modalOpen) return;
      if (this._dragMoved && this._dragMoved()) return;
      if (!this._processing) this._triggerUpload();
    });
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
    if (this._modalOpen) return;
    this._modalOpen = true;

    const cx = DESIGN_WIDTH / 2;
    const modalW = DESIGN_WIDTH - 60;
    const modalH = 280;
    const modalX = 30;
    const modalY = DESIGN_HEIGHT / 2 - modalH / 2;
    const depth = 50;

    const closeModal = () => {
      this._modalOpen = false;
      allObjects.forEach(o => { if (o && o.destroy) o.destroy(); });
    };

    // Full-screen input blocker — sits at depth 50, absorbs all taps that
    // miss the buttons so they cannot reach the card zones underneath.
    const blocker = this.add.zone(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT)
      .setOrigin(0).setDepth(depth).setInteractive();
    blocker.on('pointerup', () => { /* absorb — do nothing */ });

    // Dim overlay (visual only)
    const overlay = this.add.graphics().setDepth(depth);
    overlay.fillStyle(0x000000, 0.75);
    overlay.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);

    // Modal panel
    const panel = this.add.graphics().setDepth(depth + 1);
    panel.fillStyle(0x12122a, 1);
    panel.fillRoundedRect(modalX, modalY, modalW, modalH, 14);
    panel.lineStyle(2, 0x333366, 1);
    panel.strokeRoundedRect(modalX, modalY, modalW, modalH, 14);

    const songNameTxt = this.add.text(cx, modalY + 28, songTitle, {
      fontSize: '16px', fontFamily: 'Arial Black, Arial', color: '#888888', align: 'center'
    }).setOrigin(0.5).setDepth(depth + 2);

    const titleTxt = this.add.text(cx, modalY + 52, 'SELECT DIFFICULTY', {
      fontSize: '20px', fontFamily: 'Arial Black, Arial', color: '#ffffff', align: 'center'
    }).setOrigin(0.5).setDepth(depth + 2);

    // Three difficulty buttons
    const diffKeys = ['easy', 'normal', 'hard'];
    const btnW = 90;
    const btnH = 68;
    const spacing = 108;
    const rowY = modalY + 110;

    const allObjects = [blocker, overlay, panel, songNameTxt, titleTxt];

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

      // Buttons use pointerup so the tap-open-modal pointerup doesn't bleed through
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
      hitZone.on('pointerup', () => {
        closeModal();
        onSelect(key);
      });

      allObjects.push(btnGfx, label, hitZone, ...dots);
    });

    const descText = this.add.text(cx, rowY + btnH + 20, DIFFICULTIES[DEFAULT_DIFFICULTY].description, {
      fontSize: '12px', fontFamily: 'Arial', color: '#666666', align: 'center'
    }).setOrigin(0.5).setDepth(depth + 2);

    const cancelBtn = this.add.text(cx, modalY + modalH - 28, 'CANCEL', {
      fontSize: '14px', fontFamily: 'Arial', color: '#555555', align: 'center'
    }).setOrigin(0.5).setDepth(depth + 3).setInteractive({ useHandCursor: true });

    cancelBtn.on('pointerover', () => cancelBtn.setColor('#aaaaaa'));
    cancelBtn.on('pointerout',  () => cancelBtn.setColor('#555555'));
    cancelBtn.on('pointerup', () => closeModal());

    allObjects.push(descText, cancelBtn);
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

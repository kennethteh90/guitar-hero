import Phaser from 'phaser';
import { DESIGN_WIDTH, DESIGN_HEIGHT, LANE_COLORS } from '../constants.js';

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create() {
    const cx = DESIGN_WIDTH / 2;

    // Background gradient
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0a0a1a, 0x0a0a1a, 0x111128, 0x111128, 1);
    bg.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);

    // Lane decoration lines
    for (let i = 1; i < 4; i++) {
      const x = (DESIGN_WIDTH / 4) * i;
      const line = this.add.graphics();
      line.lineStyle(1, 0xffffff, 0.05);
      line.lineBetween(x, 0, x, DESIGN_HEIGHT);
    }

    // Animated lane color bars at bottom
    const barH = 120;
    LANE_COLORS.forEach((color, i) => {
      const hex = parseInt(color.replace('#', ''), 16);
      const bar = this.add.graphics();
      bar.fillStyle(hex, 0.15);
      bar.fillRect(i * (DESIGN_WIDTH / 4), DESIGN_HEIGHT - barH, DESIGN_WIDTH / 4, barH);

      this.tweens.add({
        targets: bar,
        alpha: { from: 0.1, to: 0.25 },
        yoyo: true,
        repeat: -1,
        duration: 800 + i * 200,
        ease: 'Sine.InOut'
      });
    });

    // Title
    this.add.text(cx, DESIGN_HEIGHT * 0.32, 'TAP', {
      fontSize: '72px',
      fontFamily: 'Arial Black, Arial',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5);

    this.add.text(cx, DESIGN_HEIGHT * 0.32 + 80, 'HERO', {
      fontSize: '72px',
      fontFamily: 'Arial Black, Arial',
      color: '#FF6B6B',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5);

    // Tap to start — pulsing
    const tapText = this.add.text(cx, DESIGN_HEIGHT * 0.65, 'TAP TO START', {
      fontSize: '22px',
      fontFamily: 'Arial',
      color: '#cccccc',
      letterSpacing: 4
    }).setOrigin(0.5);

    this.tweens.add({
      targets: tapText,
      alpha: { from: 1, to: 0.2 },
      yoyo: true,
      repeat: -1,
      duration: 900,
      ease: 'Sine.InOut'
    });

    // Version
    this.add.text(cx, DESIGN_HEIGHT - 20, 'v1.0', {
      fontSize: '12px',
      fontFamily: 'Arial',
      color: '#444444'
    }).setOrigin(0.5);

    this.input.once('pointerdown', () => {
      this.scene.start('SongSelectScene');
    });

    const enter = this.input.keyboard.addKey('ENTER');
    enter.once('down', () => this.scene.start('SongSelectScene'));
    const space = this.input.keyboard.addKey('SPACE');
    space.once('down', () => this.scene.start('SongSelectScene'));
  }
}

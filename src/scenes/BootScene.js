import Phaser from 'phaser';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    // Load demo songs if they exist
    // We use a try-catch approach via error handlers
    this.load.on('filecomplete', (key) => {
      console.log('Loaded:', key);
    });

    this.load.on('loaderror', (file) => {
      console.warn('Failed to load:', file.key, '— will skip');
    });

    // Attempt to load demo audio + charts
    this.load.audio('demo1', ['songs/demo1/track.mp3', 'songs/demo1/track.ogg']);
    this.load.json('chart-demo1', 'songs/demo1/chart.json');

    this.load.audio('demo2', ['songs/demo2/track.mp3', 'songs/demo2/track.ogg']);
    this.load.json('chart-demo2', 'songs/demo2/chart.json');
  }

  create() {
    this.scene.start('MenuScene');
  }
}

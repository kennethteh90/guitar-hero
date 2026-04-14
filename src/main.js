import Phaser from 'phaser';
import { DESIGN_WIDTH, DESIGN_HEIGHT } from './constants.js';
import BootScene from './scenes/BootScene.js';
import MenuScene from './scenes/MenuScene.js';
import SongSelectScene from './scenes/SongSelectScene.js';
import GameplayScene from './scenes/GameplayScene.js';
import ResultsScene from './scenes/ResultsScene.js';

const config = {
  type: Phaser.AUTO,
  width: DESIGN_WIDTH,
  height: DESIGN_HEIGHT,
  backgroundColor: '#0a0a0a',
  parent: 'game-container',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [BootScene, MenuScene, SongSelectScene, GameplayScene, ResultsScene],
  input: {
    activePointers: 4  // support multi-touch up to 4 fingers
  },
  audio: {
    disableWebAudio: false
  },
  render: {
    antialias: true,
    powerPreference: 'high-performance'
  }
};

const game = new Phaser.Game(config);

// Prevent default touch behaviors on the canvas
document.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });

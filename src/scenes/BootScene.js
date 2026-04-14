import Phaser from 'phaser';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    this.load.on('loaderror', (file) => {
      console.warn('Failed to load:', file.key, '— will skip');
    });

    const songs = [
      { key: 'demo3',  path: 'songs/demo3'  },
      { key: 'demo4',  path: 'songs/demo4'  },
      { key: 'demo5',  path: 'songs/demo5'  },
      { key: 'demo6',  path: 'songs/demo6'  },
      { key: 'demo7',  path: 'songs/demo7'  },
      { key: 'demo8',  path: 'songs/demo8'  },
      { key: 'demo9',  path: 'songs/demo9'  },
      { key: 'demo10', path: 'songs/demo10' },
      { key: 'demo11', path: 'songs/demo11' },
      { key: 'demo12', path: 'songs/demo12' },
      { key: 'demo13', path: 'songs/demo13' },
      { key: 'demo14', path: 'songs/demo14' },
      { key: 'demo15', path: 'songs/demo15' },
    ];

    for (const s of songs) {
      this.load.audio(s.key, [`${s.path}/track.mp3`]);
      this.load.json(`chart-${s.key}`, `${s.path}/chart.json`);
    }
  }

  create() {
    this.scene.start('MenuScene');
  }
}

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
      { key: 'demo16', path: 'songs/demo16' },
      { key: 'demo17', path: 'songs/demo17' },
      { key: 'demo18', path: 'songs/demo18' },
      { key: 'demo19', path: 'songs/demo19' },
      { key: 'demo20', path: 'songs/demo20' },
      { key: 'demo21', path: 'songs/demo21' },
      { key: 'demo22', path: 'songs/demo22' },
      { key: 'demo23', path: 'songs/demo23' },
      { key: 'demo24', path: 'songs/demo24' },
      { key: 'demo25', path: 'songs/demo25' },
      { key: 'demo26', path: 'songs/demo26' },
      { key: 'demo27', path: 'songs/demo27' },
      { key: 'demo28', path: 'songs/demo28' },
      { key: 'demo29', path: 'songs/demo29' },
      { key: 'demo30', path: 'songs/demo30' },
      { key: 'demo31', path: 'songs/demo31' },
    ];

    for (const s of songs) {
      this.load.json(`chart-${s.key}`, `${s.path}/chart.json`);
    }
  }

  create() {
    this.scene.start('MenuScene');
  }
}

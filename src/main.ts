import Phaser from 'phaser';
import MainScene from './scenes/MainScene';
import MainScene2 from './scenes/MainScene2';
import MainScene3 from './scenes/MainScene3';
import MainScene4 from './scenes/MainScene4';


const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'app',
  backgroundColor: '#1c1f24',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 960,
    height: 600
  },
  scene: [MainScene, MainScene2, MainScene3, MainScene4]
};

new Phaser.Game(config);

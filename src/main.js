import { GameScene } from './scenes/GameScene.js';
import { GalleryScene } from './scenes/GalleryScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { VictoryScene } from './scenes/VictoryScene.js';

const params = new URLSearchParams(location.search);
const gallery = params.has('gallery');
// ?play / ?debug skip the start screen (dev + automated tests); ?tester goes through it into tester mode.
const skipMenu = params.has('play') || params.has('debug');

// Canvas text can't use a web font until it's loaded, so wait for both (max ~2 s, then start anyway).
await Promise.race([
  Promise.all([document.fonts.load('32px MetalMania'), document.fonts.load('16px PressStart')]),
  new Promise((resolve) => setTimeout(resolve, 2000)),
]).catch(() => {});

// Exposed on window for debugging from the browser console.
window.game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#0d0d10',
  pixelArt: true,
  audio: { noAudio: true }, // our own WebAudio engine (src/audio/) handles all sound
  scale: {
    mode: Phaser.Scale.RESIZE,
    width: '100%',
    height: '100%',
  },
  physics: {
    default: 'arcade',
    arcade: { debug: false },
  },
  scene: gallery ? [GalleryScene] : skipMenu ? [GameScene, MenuScene, VictoryScene] : [MenuScene, GameScene, VictoryScene],
});

// Startup watchdog (see index.html): if no scene is running after 15 s, show where it's stuck.
window.__larsBooted = true;
setTimeout(() => {
  const scenes = window.game?.scene?.scenes || [];
  if (!scenes.some((s) => s.sys.isActive())) {
    const states = scenes.map((s) => `${s.sys.settings.key}: status ${s.sys.settings.status}`).join(', ');
    window.__larsError?.(`Keine Szene läuft nach 15 s. Szenen: ${states || 'keine'}`);
  }
}, 15000);

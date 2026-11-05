import { DEPTH } from '../data/config.js';
import { FAMILY_LABELS } from '../data/enemies.js';
import { Hero } from '../systems/Hero.js';
import { Save } from '../systems/SaveSystem.js';
import { Leaderboard } from './Leaderboard.js';

const DEBUG = new URLSearchParams(location.search).has('debug');



export function showGameOver(scene, stats) {
  const { width, height } = scene.scale;
  scene.add.rectangle(0, 0, width, height, 0x000000, 0.72).setOrigin(0).setScrollFactor(0).setDepth(DEPTH.ui + 300);

  let done = false;
  const restart = () => {
    if (done) return;
    done = true;
    scene.scene.restart();
  };
  const board = new Leaderboard({
    run: {
      hero: Hero.id,
      survived: Math.floor(stats.elapsed),
      kills: stats.kills,
      beers: stats.beers,
      joints: stats.joints,
      pfand: stats.pfandCents,
    },
    killLine: killLine(stats),
    // Debug keys and tester mode (no damage, time jumps) don't count.
    canSubmit: !DEBUG && !scene.tester && !Save.testMode,
    onAgain: restart,
  });
  scene.events.once('shutdown', () => board.destroy());

  // Short delay so a key still held from playing doesn't instantly restart. Keys typed into the name field
  // never get here (the overlay stops them).
  scene.time.delayedCall(700, () => {
    scene.input.keyboard.once('keydown-R', restart);
    scene.input.keyboard.once('keydown-ENTER', restart);
    scene.input.keyboard.once('keydown-SPACE', restart);
  });
}

// "Skeletons 12 · Goblins 40 · ... · Skinheads verjagt 3" (only families with kills).
function killLine(stats) {
  const parts = [];
  for (const [family, label] of Object.entries(FAMILY_LABELS)) {
    const n = stats.killsByType[family];
    if (n) parts.push(`${label} ${n}`);
  }
  if (stats.chasedOff) parts.push(`Skinheads verjagt ${stats.chasedOff}`);
  return parts.join(' · ');
}

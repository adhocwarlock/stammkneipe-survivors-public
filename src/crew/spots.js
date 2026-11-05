import { CREW } from '../data/champions.js';

// Free, reachable ground spot about `dist` px from (x, y), starting at `angle` (radians) and trying
// further around the circle (and closer in). Falls back to (x, y). Result is written into `out`.
export function freeSpot(town, x, y, dist, angle, out) {
  const tries = CREW.spotTries;
  for (let k = 0; k < tries; k++) {
    const a = angle + k * 2.399; // golden angle: spreads the tries around the circle
    const r = dist * (1 - (k / tries) * 0.6);
    const sx = x + Math.cos(a) * r;
    const sy = y + Math.sin(a) * r;
    if (town.grid.isReachable(sx, sy) && !town.isBlocked(sx, sy, CREW.spotPadding)) {
      out.x = sx;
      out.y = sy;
      return out;
    }
  }
  out.x = x;
  out.y = y;
  return out;
}

// Where a champion runs in from: just off the screen edge on a reachable street, on the side Lars is
// facing first (enemy spawn rules), or next to Lars if nothing was found.
export function entrySpot(scene, enemies, player, out) {
  const v = scene.cameras.main.worldView;
  const m = CREW.entryMargin;
  for (let k = 0; k < CREW.spotTries; k++) {
    const side = k < 4 ? (player.facing.x < 0 ? 2 : 3) : Phaser.Math.Between(0, 3);
    let x;
    let y;
    if (side === 0) { x = Phaser.Math.Between(v.x, v.right); y = v.y - m; }
    else if (side === 1) { x = Phaser.Math.Between(v.x, v.right); y = v.bottom + m; }
    else if (side === 2) { x = v.x - m; y = Phaser.Math.Between(v.y, v.bottom); }
    else { x = v.right + m; y = Phaser.Math.Between(v.y, v.bottom); }
    if (enemies.trySpawnAt(x, y)) {
      out.x = x;
      out.y = y;
      return out;
    }
  }
  out.x = player.x - 200;
  out.y = player.y;
  return out;
}

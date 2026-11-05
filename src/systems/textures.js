import { PLAYER, GOBLIN } from '../data/config.js';

// Fallback shapes ("ph_*") used when a pixel-art sprite doesn't exist yet.
export function createPlaceholderTextures(scene) {
  const g = scene.make.graphics({ x: 0, y: 0, add: false });

  circle(scene, g, 'ph_lars', PLAYER.radius, 0x2b2b2b, 0xe0c090);
  circle(scene, g, 'ph_goblin', GOBLIN.radius, 0x4caf50, 0x1b5e20);
  circle(scene, g, 'ph_fist', 6, 0xe0c090, 0x7a5c3a);

  if (!scene.textures.exists('ph_bottle')) {
    g.clear();
    g.fillStyle(0x6b3e12).fillRect(2, 4, 6, 12);
    g.fillStyle(0x6b3e12).fillRect(3, 0, 4, 5);
    g.fillStyle(0xd4af37).fillRect(3, 0, 4, 2);
    g.generateTexture('ph_bottle', 10, 16);
  }
  g.destroy();
}

function circle(scene, g, key, r, fill, outline) {
  if (scene.textures.exists(key)) return;
  g.clear();
  g.fillStyle(fill).fillCircle(r, r, r);
  g.lineStyle(2, outline).strokeCircle(r, r, r - 1);
  g.generateTexture(key, r * 2, r * 2);
}

// First existing texture key from a list of candidates.
export function firstTexture(scene, ...keys) {
  return keys.find((k) => scene.textures.exists(k));
}

import { ART } from '../data/config.js';

// Static map layers are drawn at art resolution (1 px per art px) into canvas textures and shown scaled up
// by ART.scale with nearest filtering: looks identical to drawing at 3x, uses 9x less memory.

// Canvas texture `key` of w x h art px: created, or reused and cleared (scene restarts keep textures).
export function artCanvas(scene, key, w, h) {
  let tex = scene.textures.exists(key) ? scene.textures.get(key) : null;
  if (tex && (tex.width !== w || tex.height !== h)) {
    scene.textures.remove(key);
    tex = null;
  }
  if (!tex) tex = scene.textures.createCanvas(key, w, h);
  const ctx = tex.getContext();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.clearRect(0, 0, w, h);
  ctx.imageSmoothingEnabled = false;
  return { tex, ctx };
}

// Draws frame `frame` of texture `key` (registered at ART.scale) at art px (dx, dy). False if missing.
export function blitFrame(scene, ctx, key, frame, dx, dy) {
  if (!key || !scene.textures.exists(key)) return false;
  const tex = scene.textures.get(key);
  if (!tex.has(frame)) return false;
  const f = tex.get(frame);
  const s = ART.scale;
  ctx.drawImage(f.source.image, f.cutX, f.cutY, f.cutWidth, f.cutHeight, dx, dy, f.cutWidth / s, f.cutHeight / s);
  return true;
}

export function fillArt(ctx, color, x, y, w, h, alpha = 1) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = typeof color === 'number' ? `#${color.toString(16).padStart(6, '0')}` : color;
  ctx.fillRect(x, y, w, h);
  ctx.globalAlpha = 1;
}

// Image showing a canvas texture at world px (x, y), scaled to screen size.
export function showArt(scene, tex, x, y, depth) {
  tex.refresh();
  return scene.add.image(x, y, tex.key).setOrigin(0).setScale(ART.scale).setDepth(depth);
}

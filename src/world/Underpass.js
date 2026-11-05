import { ART, DEPTH, UNDERPASS } from '../data/config.js';
import { artCanvas, blitFrame, fillArt, showArt } from './canvasArt.js';
import { placeholderTexture } from './Decorations.js';

// Tunnels under the railway cut. The ground chunks show the tunnel floor; this layer draws the cut (ballast,
// walls) + the portal parts inside the cut over it, above characters. The portal parts that reach out over
// the side lanes are ordinary images at the portal's top edge depth, so the lanes stay clear.
// While Lars is inside, a round feathered hole is erased around him, so he and nearby goblins show
// "through the stone". Works the same in WebGL and Canvas
// (plain 2D-canvas 'destination-out' into a small texture); UNDERPASS.mode = 'fade' just fades the layer.
export class Underpass {
  constructor(scene, town, ground, list) {
    this.scene = scene;
    this.town = town;
    this.layers = list.map((u, i) => this.build(u, i, ground));
    this.hole = this.layers.length ? makeHole() : null;
  }

  build(u, i, ground) {
    const { scene } = this;
    const T = ART.tile;
    const s = ART.scale;
    const [ux, uy, uw, uh] = u.rect;
    // Region in art px: exactly the tunnel band.
    const x0 = ux * T;
    const y0 = uy * T;
    const x1 = (ux + uw) * T;
    const y1 = (uy + uh) * T;
    const portals = [];
    for (const [name, tx, ty, opts = {}] of u.portals || []) {
      const found = this.town.deco.info(name);
      if (!found) continue;
      const { def, real } = found;
      const [w, h] = def.size;
      const origin = def.origin || [0.5, 1];
      const [ax, ay] = this.town.deco.anchor(tx, ty, opts, origin);
      const left = Math.round(ax / s - w * origin[0]);
      const top = Math.round(ay / s - h * origin[1]);
      const p = { name, real, def, left, top, anim: opts.anim || Object.keys(def.anims || { default: 0 })[0] };
      portals.push(p);
      if (left < x0) this.portalPiece(p, left, Math.min(left + w, x0));
      if (left + w > x1) this.portalPiece(p, Math.max(left, x1), left + w);
    }
    const w = x1 - x0;
    const h = y1 - y0;

    const src = document.createElement('canvas');
    src.width = w;
    src.height = h;
    const sctx = src.getContext('2d');
    sctx.imageSmoothingEnabled = false;
    for (let ty = uy; ty < uy + uh; ty++) {
      for (let tx = ux; tx < ux + uw; tx++) ground.drawTile(sctx, tx, ty, tx * T - x0, ty * T - y0, false);
    }
    for (const p of portals) {
      if (!p.real || !blitFrame(scene, sctx, p.name, `${p.anim}_0`, p.left - x0, p.top - y0)) {
        fillArt(sctx, p.def.color || '#6a3a30', p.left - x0, p.top - y0, p.def.size[0], p.def.size[1], 0.8);
      }
    }

    const { tex, ctx } = artCanvas(scene, `underpass_${i}`, w, h);
    ctx.drawImage(src, 0, 0);
    const img = showArt(scene, tex, x0 * s, y0 * s, DEPTH.above);
    const zone = new Phaser.Geom.Rectangle(x0 * s, y0 * s, w * s, h * s);
    return { src, tex, ctx, img, zone, x0, y0, k: 0, drawn: -1, hx: 0, hy: 0 };
  }

  // Part [from, to) (art px, world x) of a portal sprite outside the cut, as a normal image.
  portalPiece(p, from, to) {
    const s = ART.scale;
    const img = p.real
      ? this.scene.add.image(p.left * s, p.top * s, p.name, `${p.anim}_0`)
      : this.scene.add.image(p.left * s, p.top * s, placeholderTexture(this.scene, p.name, p.def));
    img.setOrigin(0).setCrop((from - p.left) * s, 0, (to - from) * s, p.def.size[1] * s).setDepth(p.top * s);
  }

  update(dt, player) {
    if (!this.layers.length) return;
    const s = ART.scale;
    const step = UNDERPASS.growSeconds > 0 ? dt / UNDERPASS.growSeconds : 1;
    for (const L of this.layers) {
      const inside = L.zone.contains(player.x, player.y);
      L.k = Phaser.Math.Clamp(L.k + (inside ? step : -step), 0, 1);
      if (UNDERPASS.mode === 'fade') {
        L.img.setAlpha(1 - (1 - UNDERPASS.fadeAlpha) * L.k);
        continue;
      }
      const hx = Math.round(player.x / s) - L.x0;
      const hy = Math.round(player.y / s) + UNDERPASS.holeOffsetY - L.y0;
      if (L.k === L.drawn && (L.k === 0 || (hx === L.hx && hy === L.hy))) continue;
      L.drawn = L.k;
      L.hx = hx;
      L.hy = hy;
      const ctx = L.ctx;
      ctx.globalCompositeOperation = 'copy';
      ctx.drawImage(L.src, 0, 0);
      if (L.k > 0) {
        const r = UNDERPASS.holeRadius * L.k;
        const ry = r / UNDERPASS.holeSquashY;
        ctx.globalCompositeOperation = 'destination-out';
        ctx.drawImage(this.hole, Math.round(hx - r), Math.round(hy - ry), Math.round(2 * r), Math.round(2 * ry));
      }
      ctx.globalCompositeOperation = 'source-over';
      L.tex.refresh();
    }
  }
}

// Round alpha mask (art px): opaque core, feather in a few hard alpha steps so it stays pixel-art.
function makeHole() {
  const R = UNDERPASS.holeRadius;
  const F = Math.max(1, UNDERPASS.holeFeather);
  const bands = Math.max(1, UNDERPASS.holeBands);
  const size = R * 2;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x + 0.5 - R, y + 0.5 - R);
      let a = 0;
      if (d < R - F) a = 1;
      else if (d < R) a = Math.ceil((1 - (d - (R - F)) / F) ** 1.2 * bands) / bands;
      img.data[(y * size + x) * 4 + 3] = Math.round(a * 255);
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

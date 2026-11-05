import { ART, MAP_RENDER } from '../data/config.js';
import { GROUND_TYPES } from '../data/map/index.js';
import { artCanvas, blitFrame, fillArt, showArt } from './canvasArt.js';

// Shore frame by which sides of a water tile touch land: key = n s w e (1 = land).
const SHORE = {
  1010: 'shore_tl', 1001: 'shore_tr', '0110': 'shore_bl', '0101': 'shore_br',
  1000: 'shore_t', '0100': 'shore_b', '0010': 'shore_l', '0001': 'shore_r',
};



export class Ground {
  constructor(scene, map) {
    this.scene = scene;
    this.map = map;
    this.cols = map.cols;
    this.rows = map.rows;
    const n = this.cols * this.rows;
    this.type = new Array(n).fill(map.defaultGround);
    this.entry = new Array(n).fill(null);
    for (const g of map.ground) {
      const [x, y, w, h] = g.rect;
      for (let ty = Math.max(0, y); ty < Math.min(this.rows, y + h); ty++) {
        for (let tx = Math.max(0, x); tx < Math.min(this.cols, x + w); tx++) {
          this.type[ty * this.cols + tx] = g.type;
          this.entry[ty * this.cols + tx] = g;
        }
      }
    }
    // Tunnel tiles show their own floor/walls underneath; the cut is drawn over them by Underpass.
    this.under = new Map();
    for (const u of map.underpasses) {
      const [x, y, w] = u.rect;
      (u.rows || []).forEach((t, i) => { for (let k = 0; k < w; k++) this.under.set((y + i) * this.cols + x + k, t); });
    }
  }

  typeAt(tx, ty) {
    return this.type[ty * this.cols + tx];
  }

  group(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= this.cols || ty >= this.rows) return null;
    return GROUND_TYPES[this.type[ty * this.cols + tx]]?.group || null;
  }

  // [type, sprite, anim] of a tile; useUnder = false gives what lies on top of a tunnel.
  frameAt(tx, ty, useUnder = true) {
    const i = ty * this.cols + tx;
    const t = (useUnder && this.under.get(i)) || this.type[i];
    const spec = GROUND_TYPES[t] || {};
    const frames = spec.frames || [];
    if (spec.auto === 'shore') return [t, spec.sprite, this.shoreFrame(tx, ty, frames)];
    if (spec.auto === 'cut') {
      const g = this.entry[i];
      const col = tx - g.rect[0];
      if (col === 0) return [t, spec.sprite, 'wall_w'];
      if (col === g.rect[2] - 1) return [t, spec.sprite, 'wall_e'];
      if ((g.tracks || []).includes(col)) return [t, spec.sprite, frames[tileHash(tx, ty, frames.length)]];
      return [t, spec.sprite, spec.plain || frames[0]];
    }
    return [t, spec.sprite, frames.length ? frames[tileHash(tx, ty, frames.length)] : null];
  }

  shoreFrame(tx, ty, frames) {
    const land = (dx, dy) => {
      const x = tx + dx;
      const y = ty + dy;
      if (x < 0 || y < 0 || x >= this.cols || y >= this.rows) return 0;
      return this.group(x, y) === 'water' ? 0 : 1;
    };
    const key = `${land(0, -1)}${land(0, 1)}${land(-1, 0)}${land(1, 0)}`;
    if (key !== '0000') return SHORE[key] || 'shore_t'; 
    if (land(-1, -1)) return 'shore_itl';
    if (land(1, -1)) return 'shore_itr';
    if (land(-1, 1)) return 'shore_ibl';
    if (land(1, 1)) return 'shore_ibr';
    return frames[tileHash(tx, ty, frames.length)];
  }

  // Draws tile (tx, ty) at art px (dx, dy); falls back to the type's flat colour.
  drawTile(ctx, tx, ty, dx, dy, useUnder = true) {
    const [t, sprite, anim] = this.frameAt(tx, ty, useUnder);
    if (anim && blitFrame(this.scene, ctx, sprite, `${anim}_0`, dx, dy)) return;
    fillArt(ctx, GROUND_TYPES[t]?.color || '#ff00ff', dx, dy, ART.tile, ART.tile);
  }

  // getRoofTiles() -> Map tileIndex -> [textureKey, frame, detailFrame|null] (rooftop fillers, see Houses.roofTiles);
  // only called if a chunk actually has to be drawn.
  draw(getRoofTiles) {
    let roofTiles = null;
    const { scene, cols, rows } = this;
    const T = ART.tile;
    const n = MAP_RENDER.chunkTiles;
    const px = T * ART.scale;
    for (let cy = 0; cy * n < rows; cy++) {
      for (let cx = 0; cx * n < cols; cx++) {
        const w = Math.min(n, cols - cx * n);
        const h = Math.min(n, rows - cy * n);
        const key = `ground_chunk_${cx}_${cy}`;
        if (scene.textures.exists(key)) {
          // The ground never changes: on a scene restart just show the chunk drawn last time.
          scene.add.image(cx * n * px, cy * n * px, key).setOrigin(0).setScale(ART.scale).setDepth(-10);
          continue;
        }
        roofTiles = roofTiles || getRoofTiles();
        const { tex, ctx } = artCanvas(scene, key, w * T, h * T);
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const tx = cx * n + x;
            const ty = cy * n + y;
            const roof = roofTiles.get(ty * cols + tx);
            if (roof) {
              if (!blitFrame(scene, ctx, roof[0], `${roof[1]}_0`, x * T, y * T)) fillArt(ctx, 0x7a3a30, x * T, y * T, T, T);
              if (roof[2]) blitFrame(scene, ctx, 'roof_detail', `${roof[2]}_0`, x * T, y * T);
            } else {
              this.drawTile(ctx, tx, ty, x * T, y * T);
            }
          }
        }
        showArt(scene, tex, cx * n * px, cy * n * px, -10);
      }
    }
    if (!scene.textures.exists('ground')) {
      // Without art, show a tile grid so movement is still readable.
      const grid = scene.add.grid(0, 0, cols * px, rows * px, px, px).setOrigin(0).setDepth(-9);
      grid.setOutlineStyle(0x3a3a44, 0.5);
    }
  }
}

// Stable per-tile pseudo-random index in [0, n).
export function tileHash(tx, ty, n) {
  let h = Math.imul(tx, 73856093) ^ Math.imul(ty, 19349663);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) % n;
}

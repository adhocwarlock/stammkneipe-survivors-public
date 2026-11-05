import { ART, DEPTH, HOUSE_LIGHTS } from '../data/config.js';
import { artCanvas, blitFrame, fillArt, showArt } from './canvasArt.js';
import { inRect } from './MapGrid.js';

const FACADES = ['', 'rose', 'sage', 'cream', 'bluegrey', 'sandstone'];
const ROOFS = ['', '', '', 'brown', 'slate']; // mostly red clay tiles
const FILLER_ROOFS = ['', '', '', '', 'brown', 'brown', 'slate'];
const SHOPS = ['bakery', 'kiosk', 'kneipe', 'doener', 'metal', 'cafe'];
const WINDOWS = ['old', 'shutters', 'modern'];
const DETAILS = ['chimney', 'chimney', 'dormer_lit', 'dormer_dark', 'skylight'];

// House blocks: each block is split into houses of 3-5 tiles (stores are 4) and drawn once into a canvas,
// y-sorted by its bottom edge. The random calls happen in exactly the old order, so with the same seed the
// Altstadt looks like before; tiles inside the district's `openings` are just not drawn.
export class Houses {
  constructor(scene, town) {
    this.scene = scene;
    this.town = town;
    this.px = town.px;
    this.hasArt = scene.textures.exists('facade') && scene.textures.exists('roof');
    this.hasRoofDetail = scene.textures.exists('roof_detail');
    this.count = 0;
  }

  buildDistrict(d, rng) {
    this.rng = rng;
    this.district = d;
    for (const b of d.blocks) this.buildBlock(...b);
  }

  buildBlock(bx, by, bw, bh) {
    const { scene, px, rng } = this;
    const T = ART.tile;
    const openings = this.district.openings;
    this.hole = (col, row) => openings.length > 0 && openings.some((r) => inRect(bx + col, by + row, r));
    const { tex, ctx } = artCanvas(scene, `block_${this.count++}`, bw * T, bh * T);
    this.ctx = ctx;

    // Stores in this block (x relative to the block), always 4 tiles wide.
    const stores = this.district.stores
      .filter(([, tx, ty]) => ty === by && tx >= bx && tx + 4 <= bx + bw)
      .map(([id, tx]) => ({ id, x: tx - bx }))
      .sort((a, b) => a.x - b.x);

    let x = 0;
    while (x < bw) {
      const store = stores.find((st) => st.x === x);
      if (store) {
        if (this.hasArt) this.drawStore(x, bh, bx, by, store.id);
        else this.drawHouseFallback(x, 4, bh);
        if (!this.hole(x, bh - 1)) this.town.addDoor(store.id, `store_${store.id}`, bx + x, by + bh);
        x += 4;
        continue;
      }
      const limit = (stores.find((st) => st.x > x)?.x ?? bw) - x; // room until the next store / block end
      let w = Math.min(limit, rng.between(3, 5));
      if (limit - w > 0 && limit - w < 3) w = limit; // don't leave a sliver
      if (this.hasArt) this.drawHouse(x, w, bh, bx, by);
      else this.drawHouseFallback(x, w, bh);
      x += w;
    }
    showArt(scene, tex, bx * px, by * px, (by + bh) * px); // y-sort by the bottom edge
  }

  tile(key, frame, col, row) {
    if (!this.hole(col, row)) blitFrame(this.scene, this.ctx, key, frame, col * ART.tile, row * ART.tile);
  }

  glow(col, row, x, y, scale, color, alpha, depth) {
    if (!this.hole(col, row)) this.town.addGlow(x, y, scale, color, alpha, depth);
  }

  // A store: normal roof on top, the store façade sprite over the 3 façade rows.
  drawStore(hx, bh, bx, by, id) {
    const { px } = this;
    const key = `store_${id}`;
    if (!this.scene.textures.exists(key)) {
      this.drawHouse(hx, 4, bh, bx, by);
      return;
    }
    const roofKey = this.town.variantKey('roof', 'slate');
    const roofRows = Math.max(2, bh - 3);
    for (let row = 0; row < roofRows; row++) {
      const v = row === 0 ? 't' : row === roofRows - 1 ? 'b' : '';
      for (let col = 0; col < 4; col++) {
        const name = (v + (col === 0 ? 'l' : col === 3 ? 'r' : '')) || 'm';
        this.tile(roofKey, `${name}_0`, hx + col, row);
      }
    }
    if (!this.hole(hx, roofRows)) blitFrame(this.scene, this.ctx, key, 'default_0', hx * ART.tile, roofRows * ART.tile);
    const g = HOUSE_LIGHTS.store;
    this.glow(hx, bh - 1, (bx + hx + 2) * px, (by + bh - g.rowOffset) * px, g.scale, g.color, g.alpha, -5); // onto the street
  }

  drawHouse(hx, hw, bh, bx, by) {
    const { px, rng } = this;
    const facadeKey = this.town.variantKey('facade', rng.pick(FACADES));
    const roofKey = this.town.variantKey('roof', rng.pick(ROOFS));
    const roofRows = Math.max(2, bh - 3);
    const facadeRows = bh - roofRows;
    const edge = (col, l, m, r) => (col === 0 ? l : col === hw - 1 ? r : m);

    for (let row = 0; row < roofRows; row++) {
      const v = row === 0 ? 't' : row === roofRows - 1 ? 'b' : '';
      for (let col = 0; col < hw; col++) {
        const h = edge(col, 'l', '', 'r');
        const name = (v + h) || 'm';
        this.tile(roofKey, `${name}_0`, hx + col, row);
        // Occasional chimney/dormer/skylight on inner roof tiles.
        if (this.hasRoofDetail && row > 0 && row < roofRows - 1 && col > 0 && col < hw - 1 && rng.frac() < 0.3) {
          this.tile('roof_detail', `${rng.pick(DETAILS)}_0`, hx + col, row);
        }
      }
      if (this.hasRoofDetail && roofRows === 2 && rng.frac() < 0.5) {
        this.tile('roof_detail', 'chimney_0', hx + rng.between(0, hw - 1), 0);
      }
    }

    const shopCol = hw >= 3 && rng.frac() < 0.7 ? rng.between(0, hw - 2) : -1;
    const shop = rng.pick(SHOPS);
    const windowStyle = rng.pick(WINDOWS);
    for (let f = 0; f < facadeRows; f++) {
      const row = roofRows + f;
      const ground = f === facadeRows - 1;
      for (let col = 0; col < hw; col++) {
        const tile = ground ? edge(col, 'base_l', 'base', 'base_r') : edge(col, 'wall_l', 'wall', 'wall_r');
        this.tile(facadeKey, `${tile}_0`, hx + col, row);
        if (!ground) {
          const lit = rng.frac() < 0.55;
          const r = rng.frac();
          // Modern-day touches: some TV-lit rooms, a rare neon bar sign.
          const win = lit && r < 0.12 ? 'tv_lit' : lit && r < 0.16 ? 'neon_lit' : `${windowStyle}_${lit ? 'lit' : 'dark'}`;
          this.tile('window', `${win}_0`, hx + col, row);
          const wg = HOUSE_LIGHTS.window;
          if (lit) this.glow(hx + col, row, (bx + hx + col + 0.5) * px, (by + row + 0.5) * px, wg.scale, wg.color, wg.alpha, DEPTH.fx - 50);
        }
      }
      if (ground) {
        if (shopCol >= 0) {
          this.tile('shopfront', `${shop}_0`, hx + shopCol, row);
          const sg = HOUSE_LIGHTS.shopfront;
          this.glow(hx + shopCol, row, (bx + hx + shopCol + 1) * px, (by + row + 1) * px, sg.scale, sg.color, sg.alpha, -5);
          const doorCol = shopCol + 2 < hw ? shopCol + 2 : shopCol - 1;
          if (doorCol >= 0) this.tile('door', 'wood_0', hx + doorCol, row);
        } else {
          this.tile('door', `${rng.frac() < 0.5 ? 'wood' : 'glass'}_0`, hx + Math.floor(hw / 2), row);
        }
      }
    }
  }

  drawHouseFallback(hx, hw, bh) {
    const { rng } = this;
    const T = ART.tile;
    const colors = [0xb08850, 0xc0a860, 0xb07868, 0x7088a0, 0xa8a8a0, 0x9a5048, 0x708860];
    const roofRows = Math.max(2, bh - 3);
    fillArt(this.ctx, 0x7a3a30, hx * T, 0, hw * T, roofRows * T);
    fillArt(this.ctx, rng.pick(colors), hx * T, roofRows * T, hw * T, (bh - roofRows) * T);
    fillArt(this.ctx, 0x000000, hx * T, 0, 1, bh * T, 0.5);
  }
}

// Rooftop fillers (`roofs` rects): split into roofs of 3-5 x 3-5 tiles. They are fully solid and never overlap
// characters, so they are painted straight into the ground chunks. Returns Map tileIndex -> [key, frame, detail].
export function roofTiles(scene, map, variantKey) {
  const out = new Map();
  const hasDetail = scene.textures.exists('roof_detail');
  for (const d of map.districts) {
    d.roofs.forEach(([rx, ry, rw, rh], i) => {
      const rng = new Phaser.Math.RandomDataGenerator([d.seed, 'roofs', String(i)]);
      for (let y = 0; y < rh;) {
        let h = Math.min(rh - y, rng.between(3, 5));
        if (rh - y - h > 0 && rh - y - h < 3) h = rh - y;
        for (let x = 0; x < rw;) {
          let w = Math.min(rw - x, rng.between(3, 5));
          if (rw - x - w > 0 && rw - x - w < 3) w = rw - x;
          const key = variantKey('roof', rng.pick(FILLER_ROOFS));
          for (let r = 0; r < h; r++) {
            for (let c = 0; c < w; c++) {
              const tx = rx + x + c;
              const ty = ry + y + r;
              if (tx < 0 || ty < 0 || tx >= map.cols || ty >= map.rows) continue;
              const v = r === 0 ? 't' : r === h - 1 ? 'b' : '';
              const e = c === 0 ? 'l' : c === w - 1 ? 'r' : '';
              const inner = r > 0 && r < h - 1 && c > 0 && c < w - 1;
              const detail = hasDetail && inner && rng.frac() < 0.15 ? rng.pick(DETAILS) : null;
              out.set(ty * map.cols + tx, [key, (v + e) || 'm', detail]);
            }
          }
          x += w;
        }
        y += h;
      }
    });
  }
  return out;
}

// Tile grids of the merged map + all collision.
// `solid` is what the flow field, spawns and line of sight use: houses, rooftops and solid zones (railway cut,
// water, landmark footprints) minus `walkable` overrides (bridge deck, pontoon, tunnel).
// Physics walls are the solid tiles merged into as few rectangles as possible, except a house block's top row
// stays open where the tile above is walkable (Lars can step "behind" the roof edge, as before).
// Small extra rects (decoration feet, bridge deck edges) are bucketed per tile so isBlocked stays O(1).
export class MapGrid {
  constructor(scene, map, px, walls) {
    this.scene = scene;
    this.px = px;
    this.walls = walls;
    this.cols = map.cols;
    this.rows = map.rows;
    const n = this.cols * this.rows;
    this.solid = new Uint8Array(n);
    this.house = new Uint8Array(n); // houses/rooftops: decorations may not stand here
    this.over = new Uint8Array(n); // walkable override over a solid zone
    this.reach = new Uint8Array(n); // reachable from the start (filled by flood())
    this.buckets = new Array(n).fill(null);
    const topRow = new Uint8Array(n); // block top-row tiles (open for physics if the tile above is walkable)

    for (const d of map.districts) {
      const open = (x, y) => d.openings.some((r) => inRect(x, y, r));
      for (const b of d.blocks) {
        this.fill(b, (i, x, y) => {
          if (open(x, y)) return;
          this.solid[i] = 1;
          this.house[i] = 1;
          if (y === b[1] && b[3] > 2) topRow[i] = 1;
        });
      }
      for (const r of d.roofs) this.fill(r, (i, x, y) => { if (!open(x, y)) { this.solid[i] = 1; this.house[i] = 1; } });
    }
    for (const r of map.solids) this.fill(r, (i) => { this.solid[i] = 1; });
    for (const r of map.walkable) this.fill(r, (i) => { this.solid[i] = 0; this.over[i] = 1; });

    const phys = this.solid.slice();
    for (let i = 0; i < n; i++) {
      if (topRow[i] && i >= this.cols && !this.solid[i - this.cols]) phys[i] = 0;
    }
    this.buildWalls(phys);
  }

  fill([x, y, w, h], fn) {
    for (let ty = Math.max(0, y); ty < Math.min(this.rows, y + h); ty++) {
      for (let tx = Math.max(0, x); tx < Math.min(this.cols, x + w); tx++) fn(ty * this.cols + tx, tx, ty);
    }
  }

  // Greedy merge: grow each unused solid tile right, then down while the whole run stays solid.
  buildWalls(phys) {
    const { cols, rows, px } = this;
    const used = new Uint8Array(cols * rows);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const i = y * cols + x;
        if (!phys[i] || used[i]) continue;
        let w = 1;
        while (x + w < cols && phys[i + w] && !used[i + w]) w++;
        let h = 1;
        for (;;) {
          if (y + h >= rows) break;
          let ok = true;
          for (let k = 0; k < w && ok; k++) {
            const j = (y + h) * cols + x + k;
            ok = phys[j] && !used[j];
          }
          if (!ok) break;
          h++;
        }
        for (let dy = 0; dy < h; dy++) for (let k = 0; k < w; k++) used[(y + dy) * cols + x + k] = 1;
        this.addBody(x * px, y * px, w * px, h * px);
      }
    }
  }

  addBody(x, y, w, h) {
    this.walls.add(this.scene.add.rectangle(x + w / 2, y + h / 2, w, h).setVisible(false));
  }

  // Extra solid rect in world px (decoration footprint etc.).
  addRect(x, y, w, h) {
    if (w <= 0 || h <= 0) return;
    this.addBody(x, y, w, h);
    const r = new Phaser.Geom.Rectangle(x, y, w, h);
    const { px, cols, rows } = this;
    const x0 = Math.max(0, Math.floor(x / px));
    const x1 = Math.min(cols - 1, Math.floor((x + w) / px));
    const y0 = Math.max(0, Math.floor(y / px));
    const y1 = Math.min(rows - 1, Math.floor((y + h) / px));
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const i = ty * cols + tx;
        (this.buckets[i] || (this.buckets[i] = [])).push(r);
      }
    }
  }

  inside(tx, ty) {
    return tx >= 0 && ty >= 0 && tx < this.cols && ty < this.rows;
  }

  isSolidTile(tx, ty) {
    return !this.inside(tx, ty) || this.solid[ty * this.cols + tx] === 1;
  }

  isHouseTile(tx, ty) {
    return !this.inside(tx, ty) || this.house[ty * this.cols + tx] === 1;
  }

  isReachable(x, y) {
    const tx = Math.floor(x / this.px);
    const ty = Math.floor(y / this.px);
    return this.inside(tx, ty) && this.reach[ty * this.cols + tx] === 1;
  }

  // True if a circle of radius `padding` at world (x, y) touches anything solid (tile grid first, then small rects).
  isBlocked(x, y, padding) {
    const { px, cols } = this;
    if (x < 0 || y < 0 || x >= cols * px || y >= this.rows * px) return true;
    const x0 = Math.floor((x - padding) / px);
    const x1 = Math.floor((x + padding) / px);
    const y0 = Math.floor((y - padding) / px);
    const y1 = Math.floor((y + padding) / px);
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        if (this.isSolidTile(tx, ty)) return true;
        const list = this.buckets[ty * cols + tx];
        if (!list) continue;
        for (let k = 0; k < list.length; k++) {
          const r = list[k];
          if (x > r.x - padding && x < r.right + padding && y > r.y - padding && y < r.bottom + padding) return true;
        }
      }
    }
    return false;
  }

  // Marks every tile reachable from (tx, ty) over the solid grid (4-neighbour flood fill).
  flood(tx, ty) {
    const { cols, rows, solid, reach } = this;
    reach.fill(0);
    if (this.isSolidTile(tx, ty)) {
      console.warn(`start tile ${tx},${ty} is solid`);
      return;
    }
    const queue = new Int32Array(cols * rows);
    let head = 0;
    let tail = 0;
    queue[tail++] = ty * cols + tx;
    reach[ty * cols + tx] = 1;
    while (head < tail) {
      const cur = queue[head++];
      const cx = cur % cols;
      const cy = (cur / cols) | 0;
      if (cx > 0) tail = this.visit(cur - 1, queue, tail);
      if (cx < cols - 1) tail = this.visit(cur + 1, queue, tail);
      if (cy > 0) tail = this.visit(cur - cols, queue, tail);
      if (cy < rows - 1) tail = this.visit(cur + cols, queue, tail);
    }
    let lost = 0;
    for (let i = 0; i < solid.length; i++) if (!solid[i] && !reach[i]) lost++;
    if (lost) console.warn(`${lost} walkable tiles are not reachable from the start`);
  }

  visit(i, queue, tail) {
    if (this.solid[i] || this.reach[i]) return tail;
    this.reach[i] = 1;
    queue[tail] = i;
    return tail + 1;
  }
}

export function inRect(x, y, [rx, ry, rw, rh]) {
  return x >= rx && x < rx + rw && y >= ry && y < ry + rh;
}

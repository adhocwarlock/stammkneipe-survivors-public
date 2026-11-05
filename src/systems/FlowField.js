// Cheap pathfinding for hundreds of goblins: a breadth-first search from Lars' tile over the
// walkable tiles gives every tile a direction to its neighbour that's one step closer.
// Enemies just look up the direction of the tile they stand on (O(1) per enemy).
// Recomputed a few times per second, and only when Lars changes tile (~22k tiles on the big map: well
// under a millisecond, no allocations).
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

export class FlowField {
  // grid: MapGrid (flat `solid` Uint8Array, cols, rows).
  constructor(grid, tilePx) {
    this.solid = grid.solid;
    this.px = tilePx;
    this.cols = grid.cols;
    this.rows = grid.rows;
    const n = this.cols * this.rows;
    this.dist = new Int32Array(n);
    this.dirX = new Float32Array(n);
    this.dirY = new Float32Array(n);
    this.queue = new Int32Array(n);
    this.targetTile = -1;
  }

  update(x, y) {
    const tx = Phaser.Math.Clamp(Math.floor(x / this.px), 0, this.cols - 1);
    const ty = Phaser.Math.Clamp(Math.floor(y / this.px), 0, this.rows - 1);
    const t = ty * this.cols + tx;
    if (t === this.targetTile) return;
    this.targetTile = t;

    const { cols, rows, solid, dist, queue } = this;
    dist.fill(-1);
    dist[t] = 0;
    let head = 0;
    let tail = 0;
    queue[tail++] = t;
    while (head < tail) {
      const cur = queue[head++];
      const cx = cur % cols;
      const cy = (cur / cols) | 0;
      for (let d = 0; d < 4; d++) {
        const nx = cx + DIRS[d][0];
        const ny = cy + DIRS[d][1];
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
        const ni = ny * cols + nx;
        if (solid[ni]) continue;
        if (dist[ni] !== -1) continue;
        dist[ni] = dist[cur] + 1;
        queue[tail++] = ni;
      }
    }

    // Each tile points to its lowest-distance neighbour; diagonals only if both sides are open,
    // so goblins don't try to cut through house corners.
    for (let i = 0; i < cols * rows; i++) {
      this.dirX[i] = 0;
      this.dirY[i] = 0;
      if (dist[i] <= 0) continue;
      const cx = i % cols;
      const cy = (i / cols) | 0;
      let best = dist[i];
      for (let d = 0; d < 8; d++) {
        const nx = cx + DIRS[d][0];
        const ny = cy + DIRS[d][1];
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
        const ni = ny * cols + nx;
        if (dist[ni] < 0 || dist[ni] >= best) continue;
        if (d >= 4 && (solid[cy * cols + nx] || solid[ny * cols + cx])) continue;
        best = dist[ni];
        const len = d >= 4 ? Math.SQRT2 : 1;
        this.dirX[i] = DIRS[d][0] / len;
        this.dirY[i] = DIRS[d][1] / len;
      }
    }
  }

  // Writes the direction for world position (x, y) into out; returns false if there's no path info
  // (same tile as Lars, or unreachable), in which case the caller should chase directly.
  directionAt(x, y, out) {
    const tx = Math.floor(x / this.px);
    const ty = Math.floor(y / this.px);
    if (tx < 0 || ty < 0 || tx >= this.cols || ty >= this.rows) return false;
    const i = ty * this.cols + tx;
    if (this.dist[i] <= 1) return false; // close enough: go straight for him
    out.x = this.dirX[i];
    out.y = this.dirY[i];
    return out.x !== 0 || out.y !== 0;
  }
}

import { CREW } from '../data/champions.js';

// Ally movement: a beeline to the goal while the street line to it is clear (tile raycast); when a wall is
// in the way, follow the enemies' flow field, which leads back to Lars (the crew always fights near him).
// The line check is only redone every CREW.losRecheck seconds per ally, so allies don't flip-flop.
export class Steering {
  constructor(town, flow) {
    this.grid = town.grid;
    this.px = town.px;
    this.flow = flow;
    this.dir = { x: 0, y: 0 };
  }

  // True if no solid tile lies on the segment (sampled every CREW.losStep px).
  clear(x0, y0, x1, y1) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const n = Math.ceil(Math.hypot(dx, dy) / CREW.losStep);
    const grid = this.grid;
    const px = this.px;
    for (let i = 1; i < n; i++) {
      const f = i / n;
      if (grid.isSolidTile(Math.floor((x0 + dx * f) / px), Math.floor((y0 + dy * f) / px))) return false;
    }
    return true;
  }

  // Sets the ally's velocity toward (x, y). Returns true once it's there.
  steer(a, x, y, speed, dt) {
    const sp = a.sprite;
    const cx = sp.body.center.x;
    const cy = sp.body.center.y;
    const dx = x - cx;
    const dy = y - cy;
    const d = Math.hypot(dx, dy);
    if (d < CREW.arriveDist) {
      sp.setVelocity(0, 0);
      return true;
    }
    a.losT -= dt;
    if (a.losT <= 0) {
      a.losT = CREW.losRecheck;
      a.blocked = !this.clear(cx, cy, x, y);
    }
    const dir = this.dir;
    if (a.blocked && this.flow.directionAt(cx, cy, dir)) sp.setVelocity(dir.x * speed, dir.y * speed);
    else sp.setVelocity((dx / d) * speed, (dy / d) * speed);
    return false;
  }
}

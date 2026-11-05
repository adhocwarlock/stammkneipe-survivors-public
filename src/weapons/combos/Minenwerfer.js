import { NEUTRAL_MODS } from '../common.js';
import { Claymore } from '../Claymore.js';
import { sfx } from '../../audio/Sfx.js';

const MINE_SPIN = 9; // rad/s while flying

// Combo Claymore + Minigun: mines are lobbed (parabola) onto the densest crowd within `range` instead of being
// dropped at Lars' feet. They land armed and blow up on contact, or after a short fuse.
export class Minenwerfer extends Claymore {
  constructor(scene, player, enemies, sparks, stats) {
    super(scene, player, enemies, sparks, stats);
    this.cand = new Array(stats.crowdSamples).fill(null); // preallocated candidate list
  }

  update(dt, mods = NEUTRAL_MODS) {
    this.time += dt;
    this.blasts.update(dt);
    this.updateMines(dt);
    this.drawRings(dt);
    this.cooldown -= dt;
    if (this.cooldown > 0) return;
    const st = this.stats;
    const p = this.player;
    const target = this.densest(p.x, p.y);
    if (!target) return;
    const m = this.freeMine();
    if (!m) return;
    this.cooldown = st.cooldown * mods.cooldownMul;
    this.drop(m, p.x, p.y, st.damage * mods.damageMul);
    m.flying = true;
    m.flight = 0;
    m.ox = p.x;
    m.oy = p.y;
    m.tx = target.body.center.x;
    m.ty = target.body.center.y;
    m.setAlpha(1);
    sfx.weapon(st, p.x);
  }

  // Of the first `crowdSamples` enemies within range, the one with the most others within `crowdRadius`.
  densest(px, py) {
    const st = this.stats;
    const list = this.enemies.group.getChildren();
    let n = 0;
    for (let i = 0; i < list.length && n < this.cand.length; i++) {
      const e = list[i];
      if (e.active && Math.hypot(e.body.center.x - px, e.body.center.y - py) <= st.range) this.cand[n++] = e;
    }
    let best = null;
    let bestCount = -1;
    const r2 = st.crowdRadius * st.crowdRadius;
    for (let c = 0; c < n; c++) {
      const a = this.cand[c];
      let count = 0;
      for (let i = 0; i < list.length; i++) {
        const e = list[i];
        if (!e.active) continue;
        const dx = e.body.center.x - a.body.center.x;
        const dy = e.body.center.y - a.body.center.y;
        if (dx * dx + dy * dy <= r2) count++;
      }
      if (count > bestCount) {
        best = a;
        bestCount = count;
      }
      this.cand[c] = null;
    }
    return best;
  }

  fly(m, dt) {
    const st = this.stats;
    m.flight += dt;
    const t = Math.min(1, m.flight / st.flightSeconds);
    const gx = m.ox + (m.tx - m.ox) * t;
    const gy = m.oy + (m.ty - m.oy) * t;
    const lift = 4 * st.arcHeight * t * (1 - t);
    m.setPosition(gx, gy - lift).setDepth(gy);
    m.rotation += MINE_SPIN * dt;
    if (t < 1) return;
    m.flying = false;
    m.rotation = 0;
    m.age = 0;
    m.setPosition(m.tx, m.ty).setDepth(m.ty - 2);
  }
}

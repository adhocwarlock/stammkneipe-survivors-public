import { DEPTH } from '../data/config.js';
import { WEAPONS } from '../data/weapons.js';
import { NEUTRAL_MODS, ENEMY_BODY_Y, PLAYER_CHEST_Y } from './common.js';
import { FxPool } from './FxPool.js';
import { sfx } from '../audio/Sfx.js';

const BOLT_FADE = 0.12; // seconds
const BOLT_SUBDIV = 6; // jagged pieces per bolt segment
const BOLT_JITTER = 0.18; // max sideways offset as a fraction of the segment length (capped below)
const BOLT_JITTER_MAX = 22; // px

// Chain lightning. Mjölnir isn't thrown: it strikes the nearest enemy and the bolt jumps on from there.
export class Mjolnir {
  constructor(scene, player, enemies, sparks, stats = WEAPONS.mjolnir) {
    this.scene = scene;
    this.player = player;
    this.enemies = enemies;
    this.sparks = sparks;
    this.stats = stats;
    this.cooldown = 0;
    this.zaps = new FxPool(scene, 'fx_zap', 12);
    this.g = scene.add.graphics().setDepth(DEPTH.fx - 40).setVisible(false);
    this.fade = 0;
    this.alloc(stats.chains + 1);
  }

  // Preallocated per-strike buffers: hit enemies, their positions, and the jagged bolt points.
  alloc(maxHits) {
    this.maxHits = maxHits;
    this.hits = new Array(maxHits).fill(null);
    this.hx = new Float32Array(maxHits + 1); // index 0 = the hammer (Lars), then one per hit
    this.hy = new Float32Array(maxHits + 1);
    this.pts = new Float32Array((BOLT_SUBDIV + 1) * 2);
  }

  update(dt, mods = NEUTRAL_MODS) {
    this.zaps.update(dt);
    if (this.fade > 0) {
      this.fade -= dt;
      this.g.setAlpha(Math.max(0, this.fade / BOLT_FADE));
      if (this.fade <= 0) this.g.setVisible(false);
    }

    this.cooldown -= dt;
    if (this.cooldown > 0) return;
    const p = this.player;
    const first = this.enemies.findNearest(p.x, p.y, this.stats.range);
    if (!first) return;
    this.cooldown = this.stats.cooldown * mods.cooldownMul;
    this.strike(first, this.stats.damage * mods.damageMul);
    sfx.weapon(this.stats, p.x);
  }

  // Chain algorithm:
  // 1. hit[0] = the nearest enemy within `range` of Lars (found by the caller).
  // 2. From the last hit enemy, look for the nearest *active* enemy within `chainRange` that isn't in hit[] yet.
  // 3. Repeat step 2 up to `chains` times; stop early when nobody is in reach.
  // Positions are recorded before any damage is dealt, so kills mid-chain can't break the bolt geometry.
  strike(first, damage) {
    const st = this.stats;
    if (st.chains + 1 > this.maxHits) this.alloc(st.chains + 1);
    const hits = this.hits;
    const p = this.player;
    this.hx[0] = p.x;
    this.hy[0] = p.y - PLAYER_CHEST_Y - 20; // the raised hammer above Lars' head
    let n = 0;
    let cur = first;
    while (cur && n < this.maxHits) {
      hits[n] = cur;
      this.hx[n + 1] = cur.body.center.x;
      this.hy[n + 1] = cur.body.center.y - ENEMY_BODY_Y;
      n++;
      cur = n <= st.chains ? this.nearestUnhit(cur.body.center.x, cur.body.center.y, st.chainRange, n) : null;
    }

    this.drawBolts(n);
    for (let i = 0; i < n; i++) {
      const e = hits[i];
      const x = this.hx[i + 1];
      const y = this.hy[i + 1];
      if (!this.zaps.play(x, y)) this.sparks.play(x, y + 6);
      if (e.active) this.enemies.damage(e, damage, this.hx[i], this.hy[i] + ENEMY_BODY_Y, st.knockback, st.knockbackTime);
      hits[i] = null;
    }
  }

  nearestUnhit(x, y, range, hitCount) {
    let best = null;
    let bestDist = Infinity;
    const list = this.enemies.group.getChildren();
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (!e.active || this.isHit(e, hitCount)) continue;
      const d = Math.hypot(e.body.center.x - x, e.body.center.y - y) - e.body.halfWidth;
      if (d <= range && d < bestDist) {
        best = e;
        bestDist = d;
      }
    }
    return best;
  }

  isHit(e, hitCount) {
    for (let i = 0; i < hitCount; i++) if (this.hits[i] === e) return true;
    return false;
  }

  // One jagged bolt per chain segment: a wide cyan glow + a thin white core over the same points.
  drawBolts(n) {
    const g = this.g;
    g.clear();
    for (let i = 0; i < n; i++) {
      this.jag(this.hx[i], this.hy[i], this.hx[i + 1], this.hy[i + 1]);
      this.strokePts(7, 0x39d7ff, 0.35);
      this.strokePts(3.5, 0x9ff0ff, 0.9);
      this.strokePts(1.5, 0xffffff, 1);
    }
    g.setAlpha(1).setVisible(true);
    this.fade = BOLT_FADE;
  }

  // Fills this.pts with a straight line from a to b whose inner points are pushed sideways at random.
  jag(ax, ay, bx, by) {
    const pts = this.pts;
    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len; // unit normal
    const ny = dx / len;
    const amp = Math.min(BOLT_JITTER_MAX, len * BOLT_JITTER);
    for (let k = 0; k <= BOLT_SUBDIV; k++) {
      const t = k / BOLT_SUBDIV;
      const off = k === 0 || k === BOLT_SUBDIV ? 0 : (Math.random() * 2 - 1) * amp;
      pts[k * 2] = ax + dx * t + nx * off;
      pts[k * 2 + 1] = ay + dy * t + ny * off;
    }
  }

  strokePts(width, color, alpha) {
    const g = this.g;
    const pts = this.pts;
    g.lineStyle(width, color, alpha);
    g.beginPath();
    g.moveTo(pts[0], pts[1]);
    for (let k = 1; k <= BOLT_SUBDIV; k++) g.lineTo(pts[k * 2], pts[k * 2 + 1]);
    g.strokePath();
  }

  destroy() {
    this.zaps.destroy();
    this.g.destroy();
  }
}

import { DEPTH } from '../data/config.js';
import { NEUTRAL_MODS, ENEMY_BODY_Y, aimAt, applyArt, takeSprite } from './common.js';
import { sfx } from '../audio/Sfx.js';

const POOL_MAX = 16;

// Homing magic missiles: a fanned volley of `count`, each curving (at most `turnDegPerSec`) toward its own
// target; the second missile prefers a different enemy than the first. One hit each, `lifeSeconds` max.
export class Zauberstab {
  constructor(scene, player, enemies, sparks, stats) {
    this.scene = scene;
    this.player = player;
    this.enemies = enemies;
    this.sparks = sparks;
    this.stats = stats;
    this.key = stats.projectile;
    this.cooldown = 0;
    this.dir = { x: 1, y: 0 };
    this.pool = [];
    this.turn = Phaser.Math.DegToRad(stats.turnDegPerSec);
    this.spread = Phaser.Math.DegToRad(stats.spreadDeg);
  }

  update(dt, mods = NEUTRAL_MODS) {
    this.move(dt);
    this.cooldown -= dt;
    if (this.cooldown > 0) return;
    const st = this.stats;
    const p = this.player;
    const first = this.enemies.findNearest(p.x, p.y, st.range);
    if (!first) return;
    this.cooldown = st.cooldown * mods.cooldownMul;
    const base = aimAt(p, first, this.dir);
    const second = this.nearestExcept(p.x, p.y, st.range, first) || first;
    const n = st.count;
    for (let i = 0; i < n; i++) {
      const offset = n > 1 ? (i / (n - 1) - 0.5) * this.spread : 0;
      this.launch(base + offset, i % 2 === 0 ? first : second, st.damage * mods.damageMul);
    }
    sfx.weapon(st, p.x);
  }

  launch(angle, target, damage) {
    const s = takeSprite(this.scene, this.pool, POOL_MAX, this.key);
    if (!s) return;
    applyArt(s, this.key);
    s.setBlendMode(Phaser.BlendModes.ADD); // glows: additive, drawn above the night tint (see place)
    const p = this.player;
    s.gx = p.x;
    s.gy = p.y;
    s.angle0 = angle; // heading in radians (not Phaser's `angle`, which is degrees)
    s.target = target;
    s.age = 0;
    s.damage = damage;
    s.setActive(true).setVisible(true);
    this.place(s);
  }

  place(s) {
    s.setPosition(s.gx, s.gy - ENEMY_BODY_Y).setDepth(DEPTH.fx - 40).setRotation(s.angle0);
  }

  move(dt) {
    const st = this.stats;
    for (let i = 0; i < this.pool.length; i++) {
      const s = this.pool[i];
      if (!s.active) continue;
      s.age += dt;
      if (s.age >= st.lifeSeconds) {
        this.kill(s);
        continue;
      }
      if (!s.target || !s.target.active) s.target = this.enemies.findNearest(s.gx, s.gy, st.retargetRange);
      if (s.target) {
        // Turn toward the target by at most turn*dt (shortest way round).
        const want = Math.atan2(s.target.body.center.y - s.gy, s.target.body.center.x - s.gx);
        const diff = Phaser.Math.Angle.Wrap(want - s.angle0);
        const max = this.turn * dt;
        s.angle0 += diff > max ? max : diff < -max ? -max : diff;
      }
      s.gx += Math.cos(s.angle0) * st.speed * dt;
      s.gy += Math.sin(s.angle0) * st.speed * dt;
      this.place(s);
      const hit = this.enemies.findNearest(s.gx, s.gy, st.hitRadius);
      if (hit) {
        this.sparks.play(hit.body.center.x, hit.body.center.y - ENEMY_BODY_Y + 6);
        this.enemies.damage(hit, s.damage, s.gx, s.gy, st.knockback, st.knockbackTime);
        this.kill(s);
      }
    }
  }

  nearestExcept(x, y, range, skip) {
    let best = null;
    let bestDist = Infinity;
    const list = this.enemies.group.getChildren();
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (!e.active || e === skip) continue;
      const d = Math.hypot(e.body.center.x - x, e.body.center.y - y) - e.body.halfWidth;
      if (d <= range && d < bestDist) {
        best = e;
        bestDist = d;
      }
    }
    return best;
  }

  kill(s) {
    s.setActive(false).setVisible(false);
    s.anims.stop();
    s.target = null;
  }

  destroy() {
    for (let i = 0; i < this.pool.length; i++) this.pool[i].destroy();
    this.pool.length = 0;
  }
}

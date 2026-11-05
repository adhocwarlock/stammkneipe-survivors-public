import { NEUTRAL_MODS, ENEMY_BODY_Y, aimAt, applyArt, takeSprite } from './common.js';
import { sfx } from '../audio/Sfx.js';

// Thrown toward the nearest enemy: flies out `range` px (easing to a stop after `outSeconds`), then comes back
// to wherever Lars is now at `returnSpeed`. Pierces everything; each enemy at most once per `hitInterval`.
export class Bumerang {
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
    this.spinRad = Phaser.Math.DegToRad(stats.spinDegPerSec);
  }

  update(dt, mods = NEUTRAL_MODS) {
    this.move(dt);
    this.cooldown -= dt;
    if (this.cooldown > 0) return;
    const st = this.stats;
    const p = this.player;
    const target = this.enemies.findNearest(p.x, p.y, st.range);
    if (!target) return;
    this.cooldown = st.cooldown * mods.cooldownMul;
    aimAt(p, target, this.dir);
    this.launch(st.damage * mods.damageMul);
    sfx.weapon(st, p.x);
  }

  launch(damage) {
    const s = takeSprite(this.scene, this.pool, this.stats.poolMax, this.key);
    if (!s) return;
    if (!s.lastHit) s.lastHit = new Map(); // enemy -> age when this boomerang last hit it
    applyArt(s, this.key);
    const p = this.player;
    s.ox = p.x;
    s.oy = p.y;
    s.dx = this.dir.x;
    s.dy = this.dir.y;
    s.gx = p.x;
    s.gy = p.y;
    s.age = 0;
    s.back = false;
    s.damage = damage;
    s.setActive(true).setVisible(true);
    this.place(s);
  }

  place(s) {
    s.setPosition(s.gx, s.gy - ENEMY_BODY_Y).setDepth(s.gy + 1);
  }

  move(dt) {
    const st = this.stats;
    const p = this.player;
    for (let i = 0; i < this.pool.length; i++) {
      const s = this.pool[i];
      if (!s.active) continue;
      s.age += dt;
      if (!s.back) {
        // Ease-out: fast at the throw, standing still at the turning point.
        const t = Math.min(1, s.age / st.outSeconds);
        const d = st.range * Math.sin(t * Math.PI / 2);
        s.gx = s.ox + s.dx * d;
        s.gy = s.oy + s.dy * d;
        if (t >= 1) s.back = true;
      } else {
        const dx = p.x - s.gx;
        const dy = p.y - s.gy;
        const len = Math.hypot(dx, dy);
        if (len < st.catchRadius || s.age > st.outSeconds + st.maxReturnSeconds) {
          this.kill(s);
          continue;
        }
        const step = Math.min(len, st.returnSpeed * dt);
        s.gx += (dx / len) * step;
        s.gy += (dy / len) * step;
      }
      if (!s.anims.isPlaying) s.rotation += this.spinRad * dt; // the art has the spin drawn in
      this.place(s);
      this.hit(s);
    }
  }

  hit(s) {
    const st = this.stats;
    const list = this.enemies.group.getChildren();
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (!e.active) continue;
      const cx = e.body.center.x;
      const cy = e.body.center.y;
      if (Math.hypot(cx - s.gx, cy - s.gy) - e.body.halfWidth > st.radius) continue;
      const last = s.lastHit.get(e);
      if (last !== undefined && s.age - last < st.hitInterval) continue;
      s.lastHit.set(e, s.age);
      this.sparks.play(cx, cy - ENEMY_BODY_Y + 6);
      this.enemies.damage(e, s.damage, s.gx, s.gy, st.knockback, st.knockbackTime);
    }
  }

  kill(s) {
    s.setActive(false).setVisible(false);
    s.anims.stop();
    s.lastHit.clear();
  }

  destroy() {
    for (let i = 0; i < this.pool.length; i++) this.pool[i].destroy();
    this.pool.length = 0;
  }
}

import { NEUTRAL_MODS, ENEMY_BODY_Y, aimAt, applyArt, takeSprite } from './common.js';
import { sfx } from '../audio/Sfx.js';

const BOTTLE_POOL = 4;
const CLOUD_ALPHA = 0.75;
const CLOUD_FADE = 0.4; // seconds of fade-out at the end
const BOTTLE_SPIN = 12; // rad/s

// Pfeffi: a green bottle lobbed (parabola, `flightSeconds`) at the nearest enemy. Where it lands a mint cloud
// hangs for `cloudSeconds` and hits everything inside for `tickDamage` every `tickSeconds` (area denial).
export class Pfeffi {
  constructor(scene, player, enemies, sparks, stats) {
    this.scene = scene;
    this.player = player;
    this.enemies = enemies;
    this.sparks = sparks;
    this.stats = stats;
    this.cooldown = 0;
    this.dir = { x: 1, y: 0 };
    this.bottles = [];
    this.clouds = [];
  }

  update(dt, mods = NEUTRAL_MODS) {
    this.moveBottles(dt);
    this.updateClouds(dt);
    this.cooldown -= dt;
    if (this.cooldown > 0) return;
    const st = this.stats;
    const p = this.player;
    const target = this.enemies.findNearest(p.x, p.y, st.range);
    if (!target) return;
    this.cooldown = st.cooldown * mods.cooldownMul;
    aimAt(p, target, this.dir);
    this.throwAt(target.body.center.x, target.body.center.y, st.tickDamage * mods.damageMul);
    sfx.weapon(st, p.x);
  }

  throwAt(tx, ty, damage) {
    const s = takeSprite(this.scene, this.bottles, BOTTLE_POOL, this.stats.projectile);
    if (!s) return;
    applyArt(s, this.stats.projectile);
    const p = this.player;
    s.ox = p.x;
    s.oy = p.y;
    s.tx = tx;
    s.ty = ty;
    s.age = 0;
    s.damage = damage;
    s.rotation = 0;
    s.setActive(true).setVisible(true);
  }

  moveBottles(dt) {
    const st = this.stats;
    for (let i = 0; i < this.bottles.length; i++) {
      const s = this.bottles[i];
      if (!s.active) continue;
      s.age += dt;
      const t = Math.min(1, s.age / st.flightSeconds);
      const gx = s.ox + (s.tx - s.ox) * t;
      const gy = s.oy + (s.ty - s.oy) * t;
      const lift = 4 * st.arcHeight * t * (1 - t); // parabola: 0 at both ends, arcHeight in the middle
      s.setPosition(gx, gy - ENEMY_BODY_Y - lift).setDepth(gy + 1);
      s.rotation += BOTTLE_SPIN * dt;
      if (t >= 1) {
        s.setActive(false).setVisible(false);
        s.anims.stop();
        this.spawnCloud(s.tx, s.ty, s.damage);
      }
    }
  }

  spawnCloud(x, y, damage) {
    const st = this.stats;
    const c = takeSprite(this.scene, this.clouds, st.maxClouds, st.fx);
    if (!c) return;
    applyArt(c, st.fx);
    const w = c.frame.width || 1;
    const h = c.frame.height || 1;
    c.setScale((st.radius * 2) / w, (st.radius * 2 * st.cloudYSquash) / h);
    c.setPosition(x, y).setDepth(y - 1).setAlpha(CLOUD_ALPHA).setActive(true).setVisible(true);
    c.gx = x;
    c.gy = y;
    c.left = st.cloudSeconds;
    c.tick = 0; // first tick right away
    c.damage = damage;
    sfx.play('w_pfeffi_splash', x);
  }

  updateClouds(dt) {
    const st = this.stats;
    for (let i = 0; i < this.clouds.length; i++) {
      const c = this.clouds[i];
      if (!c.active) continue;
      c.left -= dt;
      if (c.left <= 0) {
        c.setActive(false).setVisible(false);
        c.anims.stop();
        continue;
      }
      if (c.left < CLOUD_FADE) c.setAlpha(CLOUD_ALPHA * (c.left / CLOUD_FADE));
      c.tick -= dt;
      if (c.tick > 0) continue;
      c.tick += st.tickSeconds;
      this.poison(c);
    }
  }

  // Everyone whose feet are inside the ellipse takes a quiet tick (no knockback, no hurt frame, no tint).
  poison(c) {
    const rx = this.stats.radius;
    const ry = rx * this.stats.cloudYSquash;
    const list = this.enemies.group.getChildren();
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (!e.active) continue;
      const r = e.body.halfWidth;
      const dx = (e.body.center.x - c.gx) / (rx + r);
      const dy = (e.body.center.y - c.gy) / (ry + r);
      if (dx * dx + dy * dy > 1) continue;
      this.enemies.damageQuiet(e, c.damage, false); // no orange burn tint for mint
    }
  }

  destroy() {
    for (let i = 0; i < this.bottles.length; i++) this.bottles[i].destroy();
    for (let i = 0; i < this.clouds.length; i++) this.clouds[i].destroy();
    this.bottles.length = 0;
    this.clouds.length = 0;
  }
}

import { NEUTRAL_MODS, ENEMY_BODY_Y, aimAt, applyArt, takeSprite } from './common.js';
import { FxPool } from './FxPool.js';
import { HeldWeapon } from './HeldWeapon.js';
import { sfx } from '../audio/Sfx.js';

const MAX_STEP = 14; // px per hit test; faster shots are sub-stepped so they can't tunnel through goblins
const POOL_MAX = 48;
const PLACEHOLDER_SPIN = 20; // rad/s for spinning placeholders
const MUZZLE_OUT = 22; // px in front of Lars (without a held weapon)
const FIRE_ANIM_HOLD = 0.15; // s after the last shot before the held gun goes back to its idle anim

// Straight pooled shots toward the nearest enemy (Ninja Stars, Mercedes-Sterne, Bogen, Minigun).
// Stats: damage, cooldown, range, speed, knockback(Time), optional pierce (enemies it passes through),
// spreadDeg (random aim jitter), orient (rotate to the flight direction instead of spinning),
// projectile (art name, else `sprite`; `fallback` art if that doesn't exist), muzzle (one-shot FX at Lars),
// directions (N shots evenly around the aim per volley: Shuriken-Sturm). Moved and hit-tested by hand.
export class Shooter {
  constructor(scene, player, enemies, sparks, stats, ctx = {}) {
    this.scene = scene;
    this.player = player;
    this.enemies = enemies;
    this.sparks = sparks;
    this.stats = stats;
    this.ctx = ctx;
    this.key = stats.projectile || stats.sprite;
    if (stats.fallback && !scene.textures.exists(this.key)) this.key = stats.fallback;
    this.maxHits = (stats.pierce || 0) + 1;
    this.spread = Phaser.Math.DegToRad(stats.spreadDeg || 0);
    this.cooldown = 0;
    this.dir = { x: 1, y: 0 };
    this.pool = [];
    this.muzzle = stats.muzzle ? new FxPool(scene, stats.muzzle, 4) : null;
    this.held = stats.held ? new HeldWeapon(scene, player, stats.held) : null; // minigun in Lars' hands
    this.sinceShot = 0;
    this.tip = { x: 0, y: 0 };
  }

  update(dt, mods = NEUTRAL_MODS) {
    if (this.muzzle) this.muzzle.update(dt);
    this.moveShots(dt);
    if (this.held) {
      this.sinceShot += dt;
      if (this.sinceShot > FIRE_ANIM_HOLD && this.held.sprite.visible) this.held.play('idle');
      this.held.update(dt);
    }

    this.cooldown -= dt;
    if (this.cooldown > 0) return;
    const st = this.stats;
    const p = this.player;
    const target = this.enemies.findNearest(p.x, p.y, st.range);
    if (!target) {
      this.cooldown = 0;
      return;
    }
    // += keeps the minigun's 0.08 s rhythm on low frame rates (one shot per frame at most).
    this.cooldown = Math.max(0, this.cooldown + st.cooldown * mods.cooldownMul);
    let angle = aimAt(p, target, this.dir);
    if (this.spread > 0) angle += (Math.random() - 0.5) * this.spread;
    // Muzzle point (drawn at body height): the held gun's tip, else a bit in front of Lars.
    const tip = this.tip;
    if (this.held) {
      this.held.aim(angle, 'fire', st.heldHideSeconds);
      this.held.tipWorld(tip);
      this.sinceShot = 0;
    } else {
      tip.x = p.x + this.dir.x * MUZZLE_OUT;
      tip.y = p.y - ENEMY_BODY_Y + this.dir.y * MUZZLE_OUT;
    }
    // Shots fly at ENEMY_BODY_Y above their gameplay (ground) position.
    const gx = this.held ? tip.x : p.x;
    const gy = this.held ? tip.y + ENEMY_BODY_Y : p.y;
    const n = st.directions || 1;
    for (let k = 0; k < n; k++) {
      const a = angle + (k * Math.PI * 2) / n;
      this.launch(gx, gy, Math.cos(a), Math.sin(a), st.damage * mods.damageMul);
    }
    sfx.weapon(st, p.x);
    if (this.muzzle) {
      const fx = this.muzzle.play(tip.x, tip.y, angle);
      if (fx) fx.setBlendMode(Phaser.BlendModes.ADD); // FxPool draws above the night tint already
    }
  }

  launch(x, y, dx, dy, damage) {
    const s = takeSprite(this.scene, this.pool, POOL_MAX, this.key);
    if (!s) return;
    if (!s.hits) s.hits = new Array(this.maxHits).fill(null); // enemies this shot already went through
    s.nHits = 0;
    applyArt(s, this.key);
    s.animated = s.anims.isPlaying;
    s.gx = x; // gameplay position = ground level, drawn at body height
    s.gy = y;
    s.vx = dx * this.stats.speed;
    s.vy = dy * this.stats.speed;
    s.travelled = 0;
    s.damage = damage;
    s.rotation = this.stats.orient ? Math.atan2(dy, dx) : 0;
    s.setActive(true).setVisible(true);
    this.place(s);
  }

  place(s) {
    s.setPosition(s.gx, s.gy - ENEMY_BODY_Y).setDepth(s.gy + 1);
  }

  moveShots(dt) {
    const st = this.stats;
    const dist = st.speed * dt;
    const steps = Math.max(1, Math.ceil(dist / MAX_STEP));
    const sdt = dt / steps;
    for (let i = 0; i < this.pool.length; i++) {
      const s = this.pool[i];
      if (!s.active) continue;
      for (let k = 0; k < steps && s.active; k++) {
        s.gx += s.vx * sdt;
        s.gy += s.vy * sdt;
        s.travelled += dist / steps;
        this.hitTest(s);
        if (s.active && s.travelled >= st.range) this.kill(s);
      }
      if (!s.active) continue;
      if (!st.orient && !s.animated) s.rotation += PLACEHOLDER_SPIN * dt;
      this.place(s);
    }
  }

  // At most one new enemy per sub-step; enemies already pierced are skipped.
  hitTest(s) {
    const list = this.enemies.group.getChildren();
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (!e.active || this.alreadyHit(s, e)) continue;
      const d = Math.hypot(e.body.center.x - s.gx, e.body.center.y - s.gy) - e.body.halfWidth;
      if (d > this.stats.hitRadius) continue;
      const st = this.stats;
      this.sparks.play(e.body.center.x, e.body.center.y - ENEMY_BODY_Y + 6);
      this.enemies.damage(e, s.damage, s.gx - s.vx, s.gy - s.vy, st.knockback, st.knockbackTime);
      this.onShotHit(e, s);
      s.hits[s.nHits++] = e;
      if (s.nHits >= this.maxHits) this.kill(s);
      return;
    }
  }

  // Hook for subclasses (Firestorm sets enemies on fire).
  onShotHit() {}

  alreadyHit(s, e) {
    for (let i = 0; i < s.nHits; i++) if (s.hits[i] === e) return true;
    return false;
  }

  kill(s) {
    s.setActive(false).setVisible(false);
    s.anims.stop();
    for (let i = 0; i < s.nHits; i++) s.hits[i] = null;
    s.nHits = 0;
  }

  destroy() {
    for (let i = 0; i < this.pool.length; i++) this.pool[i].destroy();
    this.pool.length = 0;
    if (this.muzzle) this.muzzle.destroy();
    if (this.held) this.held.destroy();
  }
}

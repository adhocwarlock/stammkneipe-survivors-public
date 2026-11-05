import { CREW } from '../data/champions.js';
import { DEPTH } from '../data/config.js';
import { FxPool } from '../weapons/FxPool.js';
import { Mjolnir } from '../weapons/Mjolnir.js';
import { shake } from '../weapons/shake.js';
import { PLAYER_CHEST_Y } from '../weapons/common.js';

const RING_SECONDS = 0.35;
const FLAME = 0;
const RAVEN = 1;

// Thor's chain lightning = Mjölnir's strike + bolt drawing, fired by the ally AI instead of its own timer.
class GodLightning extends Mjolnir {
  update(dt) {
    this.cooldown = Infinity; // never auto-fires; the base update then only fades the bolts
    super.update(dt);
  }
}

// Pooled crew effects: explosions, slashes, shockwave rings, projectiles (flames, ravens), lightning.
export class CrewFx {
  constructor(scene, enemies, area, sparks) {
    this.scene = scene;
    this.enemies = enemies;
    this.area = area;
    this.explosions = new FxPool(scene, 'fx_explosion', CREW.maxExplosions);
    this.slashes = new FxPool(scene, 'fx_slash', 8);
    this.rings = [];
    for (let i = 0; i < CREW.maxRings; i++) this.rings.push({ life: 0, x: 0, y: 0, r: 0, color: 0 });
    this.ringG = scene.add.graphics().setDepth(DEPTH.fx - 42);
    this.shots = [];
    this.proxy = { x: 0, y: 0, facing: null, sprite: { flipX: false } }; // "player" stand-in for lightning
    this.lightning = new GodLightning(scene, this.proxy, enemies, sparks, { chains: 6, chainRange: 190, range: 0, cooldown: 1 });
  }

  explode(x, y, scale = 1) {
    if (!this.explosions.play(x, y, 0, scale)) this.ring(x, y, 60 * scale, 0xffa040);
  }

  slash(x, y, ux, uy, range) {
    if (!this.slashes.available) return;
    const size = this.scene.textures.get('fx_slash').get('default_0').width || 96;
    this.slashes.play(x + ux * range * 0.45, y + uy * range * 0.45, Math.atan2(uy, ux), (range * 1.1) / size, ux < 0);
  }

  ring(x, y, radius, color = 0xffffff) {
    let best = this.rings[0];
    for (let i = 0; i < this.rings.length; i++) {
      if (this.rings[i].life <= 0) { best = this.rings[i]; break; }
      if (this.rings[i].life < best.life) best = this.rings[i];
    }
    best.life = RING_SECONDS;
    best.x = x;
    best.y = y;
    best.r = radius;
    best.color = color;
  }

  // Ground-shaking area hit: damage + ring + camera shake.
  slam(x, y, atk) {
    this.area.circle(x, y, atk.radius, atk);
    this.ring(x, y, atk.radius, atk.ring ?? 0xffffff);
    if (atk.shake) shake(this.scene, atk.shake, atk.shakeMs);
  }

  // The bolt starts at (x, y) on screen (e.g. Thor's hammer head). A normal crew attack: full damage on
  // everyone (only mapClear attacks are reduced on bosses/elites, see AreaDamage).
  strikeLightning(x, y, target, atk) {
    const l = this.lightning;
    l.stats = atk;
    this.proxy.x = x;
    this.proxy.y = y + PLAYER_CHEST_Y + 20; // Mjolnir draws its bolt from this far above its "player"
    l.strike(target, atk.damage);
  }

  // ---- projectiles ----

  takeShot(key) {
    let s = null;
    for (let i = 0; i < this.shots.length; i++) {
      if (!this.shots[i].active) { s = this.shots[i]; break; }
    }
    if (!s) {
      if (this.shots.length >= CREW.maxShots) return null;
      s = this.scene.add.sprite(0, 0, key, firstFrame(this.scene, key));
      this.shots.push(s);
    }
    if (s.texture.key !== key) s.setTexture(key, firstFrame(this.scene, key));
    s.setActive(true).setVisible(true).setAlpha(1).setScale(1).setRotation(0).setFlipX(false).setFlipY(false);
    return s;
  }

  // Flamethrower particle from (x, y) on the ground, drawn `height` px up; atk: speed, life, radius, damage, burn.
  flame(x, y, height, angle, atk) {
    const s = this.takeShot('fx_flame');
    if (!s) return;
    if (this.scene.anims.exists('fx_flame_default')) s.play('fx_flame_default'); // the art's own repeat (once)
    s.kind = FLAME;
    s.setBlendMode(Phaser.BlendModes.ADD);
    this.launch(s, x, y, height, Math.cos(angle), Math.sin(angle), atk.speed, atk.speed * atk.life, atk);
    s.setRotation(angle).setDepth(DEPTH.above - 1); // under the bridge's "above" layer
  }

  // Odin's ravens: a fan of `count` toward the target, from (x, y) on the ground, drawn `height` px up.
  ravens(x, y, height, target, atk) {
    const base = Math.atan2(target.body.center.y - y, target.body.center.x - x);
    const spread = Phaser.Math.DegToRad(atk.spreadDeg);
    for (let k = 0; k < atk.count; k++) {
      const s = this.takeShot('raven');
      if (!s) return;
      if (this.scene.anims.exists('raven_fly')) s.play({ key: 'raven_fly', repeat: -1 }, true);
      const a = base + (atk.count > 1 ? (k / (atk.count - 1) - 0.5) * spread : 0);
      s.kind = RAVEN;
      s.setBlendMode(Phaser.BlendModes.NORMAL);
      this.launch(s, x, y, height, Math.cos(a), Math.sin(a), atk.speed, atk.travel, atk);
      s.setRotation(a).setFlipY(Math.cos(a) < 0); // art flies right: rotate, and don't fly upside down
    }
  }

  launch(s, x, y, height, ux, uy, speed, travel, atk) {
    s.gx = x;
    s.gy = y;
    s.h = height;
    s.vx = ux * speed;
    s.vy = uy * speed;
    s.left = travel;
    s.total = travel;
    s.atk = atk;
    s.setPosition(x, y - height);
  }

  updateShots(dt) {
    for (let i = 0; i < this.shots.length; i++) {
      const s = this.shots[i];
      if (!s.active) continue;
      s.gx += s.vx * dt;
      s.gy += s.vy * dt;
      s.left -= Math.hypot(s.vx, s.vy) * dt;
      const t = 1 - s.left / s.total; // 0 -> 1 over the flight
      if (s.kind === FLAME) {
        s.setScale(1 + t * 1.4).setAlpha(1 - t * 0.7);
        s.h *= 1 - dt * 1.5; // flames sink towards the ground
      } else {
        s.setDepth(s.gy);
      }
      s.setPosition(s.gx, s.gy - s.h);
      const hit = this.enemies.findNearest(s.gx, s.gy, s.atk.radius);
      if (hit) {
        this.area.hit(hit, s.atk, s.gx - s.vx * 0.05, s.gy - s.vy * 0.05);
        this.killShot(s);
      } else if (s.left <= 0) {
        this.killShot(s);
      }
    }
  }

  pauseAnims() {
    for (let i = 0; i < this.shots.length; i++) this.shots[i].anims.pause();
  }

  killShot(s) {
    s.setActive(false).setVisible(false);
    s.anims.stop();
  }

  update(dt) {
    this.explosions.update(dt);
    this.slashes.update(dt);
    this.lightning.update(dt);
    this.updateShots(dt);
    const g = this.ringG;
    g.clear();
    for (let i = 0; i < this.rings.length; i++) {
      const r = this.rings[i];
      if (r.life <= 0) continue;
      r.life -= dt;
      const t = 1 - Math.max(0, r.life) / RING_SECONDS;
      g.lineStyle(6 * (1 - t) + 2, r.color, 0.8 * (1 - t));
      // Squashed ellipse = a ring lying on the ground.
      g.strokeEllipse(r.x, r.y, r.r * 2 * (0.4 + 0.6 * t), r.r * (0.4 + 0.6 * t));
    }
  }
}

// 'default_0' for one-anim sprites, else the texture's first frame (e.g. 'fly_0').
export function firstFrame(scene, key) {
  const tex = scene.textures.get(key);
  if (tex.has('default_0')) return 'default_0';
  const names = tex.getFrameNames();
  return names.length ? names[0] : undefined;
}

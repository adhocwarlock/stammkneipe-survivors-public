import { ART, DEPTH } from '../data/config.js';
import { NEUTRAL_MODS, PLAYER_CHEST_Y, ENEMY_BODY_Y, aimAt } from './common.js';
import { FxPool } from './FxPool.js';
import { HeldWeapon } from './HeldWeapon.js';
import { sfx } from '../audio/Sfx.js';

const FALLBACK_FADE = 0.12; // seconds the drawn placeholder arc stays visible

// Melee arc toward the nearest enemy in range; hits every enemy inside the arc (angle + distance test).
// Metzgerbeil and Eimer are both this, with different stats and FX.
export class SweepWeapon {
  constructor(scene, player, enemies, sparks, stats, fxKey = stats.fx) {
    this.scene = scene;
    this.player = player;
    this.enemies = enemies;
    this.sparks = sparks;
    this.stats = stats;
    this.cooldown = 0;
    this.dir = { x: 1, y: 0 };
    this.fx = new FxPool(scene, fxKey, 2);
    this.g = scene.add.graphics().setDepth(DEPTH.fx - 40).setVisible(false);
    this.fade = 0;
    this.trailColor = 0xdfe6f0; // placeholder arc colours (subclasses recolour them)
    this.coreColor = 0xffffff;
    this.blend = stats.glow ? Phaser.BlendModes.ADD : null;
    this.held = stats.held ? new HeldWeapon(scene, player, stats.held) : null; // swung in the hand
  }

  update(dt, mods = NEUTRAL_MODS) {
    this.fx.update(dt);
    if (this.held) this.held.update(dt);
    if (this.fade > 0) {
      this.fade -= dt;
      this.g.setAlpha(Math.max(0, this.fade / FALLBACK_FADE));
      if (this.fade <= 0) this.g.setVisible(false);
    }

    this.cooldown -= dt;
    if (this.cooldown > 0) return;

    const st = this.stats;
    const p = this.player;
    const target = this.enemies.findNearest(p.x, p.y, st.range);
    if (!target) return;
    this.cooldown = st.cooldown * mods.cooldownMul;

    const angle = aimAt(p, target, this.dir);
    this.showSwing(angle);
    if (this.held) this.held.swing(angle, st.arcDeg, st.heldSwingSeconds);
    this.hitArc(st.damage * mods.damageMul);
    this.onSwing();
    sfx.weapon(st, p.x);
  }

  // Hooks for subclasses (camera shake, setting enemies on fire...).
  onSwing() {}
  onHit() {}

  hitArc(damage) {
    const st = this.stats;
    const p = this.player;
    const px = p.x;
    const py = p.y;
    const ax = this.dir.x;
    const ay = this.dir.y;
    // Inside the arc <=> the angle to the enemy is within arc/2 of the aim, i.e. cos(angle) >= cos(arc/2).
    // Works for arcs > 180° too (the threshold just goes negative).
    const cosHalf = Math.cos(Phaser.Math.DegToRad(st.arcDeg) / 2);
    const list = this.enemies.group.getChildren();
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (!e.active) continue;
      const dx = e.body.center.x - px;
      const dy = e.body.center.y - py;
      const len = Math.hypot(dx, dy);
      const r = e.body.halfWidth;
      if (len - r > st.range) continue;
      // Enemies overlapping Lars always count, their angle is meaningless.
      if (len > r * 2 && (dx * ax + dy * ay) / len < cosHalf) continue;
      this.sparks.play(e.body.center.x, e.body.center.y - ENEMY_BODY_Y + 6);
      this.enemies.damage(e, damage, px, py, st.knockback, st.knockbackTime);
      this.onHit(e);
    }
  }

  showSwing(angle) {
    const st = this.stats;
    const p = this.player;
    const cx = p.x;
    const cy = p.y - PLAYER_CHEST_Y;
    const left = this.dir.x < 0; // mirror so the trail doesn't swing upside down
    if (this.fx.available) {
      // The crescent sprite points right; centre it half-way out and scale it to the weapon range.
      const size = (this.scene.textures.get(this.fx.key).get('default_0').width) || 32 * ART.scale;
      const scale = (st.range * 1.1) / size;
      const s = this.fx.play(cx + this.dir.x * st.range * 0.45, cy + this.dir.y * st.range * 0.45, angle, scale, left);
      if (s && this.blend !== null) s.setBlendMode(this.blend);
      return;
    }
    const half = Phaser.Math.DegToRad(st.arcDeg) / 2;
    const g = this.g;
    g.clear();
    g.lineStyle(10, this.trailColor, 0.35);
    g.beginPath();
    g.arc(cx, cy, st.range * 0.8, angle - half, angle + half, false);
    g.strokePath();
    g.lineStyle(4, this.coreColor, 0.9);
    g.beginPath();
    g.arc(cx, cy, st.range * 0.85, angle - half, angle + half, false);
    g.strokePath();
    g.setAlpha(1).setVisible(true);
    this.fade = FALLBACK_FADE;
  }

  destroy() {
    if (this.held) this.held.destroy();
    this.fx.destroy();
    this.g.destroy();
  }
}

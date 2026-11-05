import { CREW } from '../data/champions.js';
import { ENEMY_BODY_Y } from '../weapons/common.js';

// Damage shapes for the crew. `atk` is an attack from data/champions.js (damage, knockback, burn...).
// Only map-clearing attacks (atk.mapClear: Mike's explosions, Hans' screen ignite) are reduced on bosses/elites
// (CREW.toughDamageMul, damage and burn); everything else does full damage. Functions return the hit count.
export class AreaDamage {
  constructor(scene, enemies, burn, sparks) {
    this.scene = scene;
    this.enemies = enemies;
    this.burn = burn;
    this.sparks = sparks;
  }

  hit(e, atk, fromX, fromY, damage = atk.damage) {
    if (!e.active) return;
    const mul = atk.mapClear && this.enemies.isTough(e) ? CREW.toughDamageMul : 1;
    const dmg = damage * mul;
    const cx = e.body.center.x;
    const cy = e.body.center.y;
    if (dmg > 0) {
      this.sparks.play(cx, cy - ENEMY_BODY_Y + 6);
      this.enemies.damage(e, dmg, fromX, fromY, atk.knockback || 0, atk.knockbackTime || 0.08);
    }
    if (e.active && atk.burnDps) this.burn.ignite(e, atk.burnDps * mul, atk.burnSeconds);
  }

  circle(x, y, radius, atk, damage = atk.damage) {
    const list = this.enemies.group.getChildren();
    let n = 0;
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (!e.active) continue;
      const dx = e.body.center.x - x;
      const dy = e.body.center.y - y;
      const r = radius + e.body.halfWidth;
      if (dx * dx + dy * dy > r * r) continue;
      this.hit(e, atk, x, y, damage);
      n++;
    }
    return n;
  }

  // Cone of `arcDeg` around the unit direction (ux, uy), like SweepWeapon.hitArc.
  arc(x, y, ux, uy, radius, arcDeg, atk) {
    const cosHalf = Math.cos(Phaser.Math.DegToRad(arcDeg) / 2);
    const list = this.enemies.group.getChildren();
    let n = 0;
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (!e.active) continue;
      const dx = e.body.center.x - x;
      const dy = e.body.center.y - y;
      const len = Math.hypot(dx, dy);
      const r = e.body.halfWidth;
      if (len - r > radius) continue;
      if (len > r * 2 && (dx * ux + dy * uy) / len < cosHalf) continue;
      this.hit(e, atk, x, y);
      n++;
    }
    return n;
  }

  // Everything within width/2 of the segment (x0,y0)-(x1,y1). Knockback pushes away from the line's start.
  line(x0, y0, x1, y1, width, atk) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len2 = dx * dx + dy * dy || 1;
    const list = this.enemies.group.getChildren();
    let n = 0;
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (!e.active) continue;
      const ex = e.body.center.x;
      const ey = e.body.center.y;
      const t = Phaser.Math.Clamp(((ex - x0) * dx + (ey - y0) * dy) / len2, 0, 1);
      const px = x0 + dx * t;
      const py = y0 + dy * t;
      const r = width / 2 + e.body.halfWidth;
      if ((ex - px) * (ex - px) + (ey - py) * (ey - py) > r * r) continue;
      // Push sideways off the line and a bit forward, so the crowd parts.
      this.hit(e, atk, px - dx * 0.05, py - dy * 0.05);
      n++;
    }
    return n;
  }

  // Map-clear: every enemy on screen (camera view + CREW.screenMargin).
  screen(atk, fromX, fromY) {
    const v = this.scene.cameras.main.worldView;
    const m = CREW.screenMargin;
    const list = this.enemies.group.getChildren();
    let n = 0;
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (!e.active) continue;
      const x = e.body.center.x;
      const y = e.body.center.y;
      if (x < v.x - m || x > v.right + m || y < v.y - m || y > v.bottom + m) continue;
      this.hit(e, atk, fromX, fromY);
      n++;
    }
    return n;
  }
}

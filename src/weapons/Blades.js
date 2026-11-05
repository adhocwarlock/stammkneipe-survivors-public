import { ART } from '../data/config.js';
import { PLAYER_CHEST_Y, ENEMY_BODY_Y } from './common.js';
import { SweepWeapon } from './SweepWeapon.js';
import { shake } from './shake.js';

// Placeholder arc colours [trail, core] until the slash art exists (visual only).
const FALLBACK_COLORS = {
  fx_guitar_chop: [0xb03030, 0xffe0a0],
  fx_katana_slash: [0xc8d8ff, 0xffffff],
  fx_saber_slash: [0x40ff70, 0xd8ffe0],
};

// Melee arcs with their own FX (stats.fx): Harley Benton (huge 180° chop + shake), Samurai-Schwert (fast, small),
// Lichtschwert (stronger katana, glowing additive slash).
export class ArcWeapon extends SweepWeapon {
  constructor(scene, player, enemies, sparks, stats) {
    super(scene, player, enemies, sparks, stats, stats.fx);
    const c = FALLBACK_COLORS[stats.fx];
    if (c) [this.trailColor, this.coreColor] = c;
  }

  onSwing() {
    if (this.stats.shake) shake(this.scene, this.stats.shake, this.stats.shakeMs);
  }
}

// Ruder: a long straight whack (a line `range` long and `width` wide) with a big shove.
export class Ruder extends SweepWeapon {
  constructor(scene, player, enemies, sparks, stats) {
    super(scene, player, enemies, sparks, stats, stats.fx);
  }

  hitArc(damage) {
    const st = this.stats;
    const p = this.player;
    const px = p.x;
    const py = p.y;
    const ax = this.dir.x;
    const ay = this.dir.y;
    const half = st.width / 2;
    const list = this.enemies.group.getChildren();
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (!e.active) continue;
      const dx = e.body.center.x - px;
      const dy = e.body.center.y - py;
      const r = e.body.halfWidth;
      const along = dx * ax + dy * ay; // distance along the oar
      const side = Math.abs(dx * ay - dy * ax); // distance from the oar's centre line
      const touching = dx * dx + dy * dy < 4 * r * r;
      if (!touching && (along < -r || along - r > st.range || side > half + r)) continue;
      this.sparks.play(e.body.center.x, e.body.center.y - ENEMY_BODY_Y + 6);
      this.enemies.damage(e, damage, px, py, st.knockback, st.knockbackTime);
    }
  }

  // The oar art points right, its handle at the left edge: centred half-way out, stretched to the range.
  showSwing(angle) {
    const st = this.stats;
    const p = this.player;
    const cx = p.x;
    const cy = p.y - PLAYER_CHEST_Y;
    if (this.fx.available) {
      const w = this.scene.textures.get(this.fx.key).get('default_0').width || 56 * ART.scale;
      this.fx.play(cx + this.dir.x * st.range * 0.5, cy + this.dir.y * st.range * 0.5, angle, st.range / w, this.dir.x < 0);
      return;
    }
    const ex = cx + this.dir.x * st.range;
    const ey = cy + this.dir.y * st.range;
    const g = this.g;
    g.clear();
    g.lineStyle(6, 0x8a5a2c, 1);
    g.lineBetween(cx, cy, ex, ey);
    g.lineStyle(st.width * 0.5, 0xb07a40, 1);
    g.lineBetween(cx + this.dir.x * st.range * 0.7, cy + this.dir.y * st.range * 0.7, ex, ey);
    g.setAlpha(1).setVisible(true);
    this.fade = 0.15;
  }
}

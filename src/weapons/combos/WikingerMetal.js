import { DEPTH } from '../../data/config.js';
import { NEUTRAL_MODS, PLAYER_CHEST_Y } from '../common.js';
import { ArcWeapon } from '../Blades.js';
import { Mjolnir } from '../Mjolnir.js';

const WAVE_FADE = 0.18; // seconds the chord's soundwave stays visible
const WAVE_POINTS = 16; // points per wave segment
const WAVE_CYCLES = 3; // sine periods per segment
const WAVE_AMP = 9; // px
const GOLD = 0xd4af37;
const PURPLE = 0x9a4aff;

// The power chord: Mjölnir's chain rules (nearest enemy, then on from there), drawn as a gold sine soundwave
// instead of a jagged bolt. Only fired by WikingerMetal (never on its own cooldown).
class Soundwave extends Mjolnir {
  constructor(scene, player, enemies, sparks, stats) {
    super(scene, player, enemies, sparks, stats);
    this.wave = new Float32Array((WAVE_POINTS + 1) * 2);
    this.phase = 0;
  }

  // Only the fade (and the zap pool) runs every frame.
  tick(dt) {
    this.zaps.update(dt);
    this.phase += dt * 30;
    if (this.fade <= 0) return;
    this.fade -= dt;
    this.g.setAlpha(Math.max(0, this.fade / WAVE_FADE));
    if (this.fade <= 0) this.g.setVisible(false);
  }

  drawBolts(n) {
    const g = this.g;
    g.clear();
    for (let i = 0; i < n; i++) {
      this.sine(this.hx[i], this.hy[i], this.hx[i + 1], this.hy[i + 1]);
      this.strokeWave(9, PURPLE, 0.3);
      this.strokeWave(4, GOLD, 0.85);
      this.strokeWave(1.5, 0xfff4c0, 1);
    }
    g.setAlpha(1).setVisible(true);
    this.fade = WAVE_FADE;
  }

  sine(ax, ay, bx, by) {
    const w = this.wave;
    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    for (let k = 0; k <= WAVE_POINTS; k++) {
      const t = k / WAVE_POINTS;
      const off = Math.sin(t * Math.PI * 2 * WAVE_CYCLES + this.phase) * WAVE_AMP * Math.sin(t * Math.PI);
      w[k * 2] = ax + dx * t + nx * off;
      w[k * 2 + 1] = ay + dy * t + ny * off;
    }
  }

  strokeWave(width, color, alpha) {
    const g = this.g;
    const w = this.wave;
    g.lineStyle(width, color, alpha);
    g.beginPath();
    g.moveTo(w[0], w[1]);
    for (let k = 1; k <= WAVE_POINTS; k++) g.lineTo(w[k * 2], w[k * 2 + 1]);
    g.strokePath();
  }
}

// Combo Harley Benton + Mjölnir: the guitar chop, and every swing plays a power chord: a ring of sound around Lars
// plus a soundwave that jumps from enemy to enemy (`chains` times, `chainRange` apart, starting within `chordRange`).
export class WikingerMetal extends ArcWeapon {
  constructor(scene, player, enemies, sparks, stats) {
    super(scene, player, enemies, sparks, stats);
    this.chord = new Soundwave(scene, player, enemies, sparks, {
      ...stats, damage: stats.chainDamage, range: stats.chordRange, knockback: 0, knockbackTime: 0.12,
    });
    this.ring = scene.add.graphics().setDepth(DEPTH.fx - 41).setBlendMode(Phaser.BlendModes.ADD);
    this.ringLife = 0;
    this.damageMul = 1;
  }

  update(dt, mods = NEUTRAL_MODS) {
    this.damageMul = mods.damageMul;
    super.update(dt, mods);
    this.chord.tick(dt);
    this.drawRing(dt);
  }

  onSwing() {
    super.onSwing();
    const st = this.stats;
    const p = this.player;
    this.ringLife = st.waveSeconds;
    const first = this.enemies.findNearest(p.x, p.y, st.chordRange);
    if (first) this.chord.strike(first, st.chainDamage * this.damageMul);
  }

  // Two expanding, fading rings (gold inside purple), centred on Lars' chest.
  drawRing(dt) {
    const g = this.ring;
    g.clear();
    if (this.ringLife <= 0) return;
    this.ringLife -= dt;
    const st = this.stats;
    const k = 1 - Math.max(0, this.ringLife) / st.waveSeconds; // 0 -> 1
    const p = this.player;
    const cx = p.x;
    const cy = p.y - PLAYER_CHEST_Y;
    const r = st.waveRadius * (0.25 + 0.75 * k);
    g.lineStyle(10, PURPLE, 0.35 * (1 - k));
    g.strokeEllipse(cx, cy, r * 2, r * 1.3);
    g.lineStyle(4, GOLD, 0.8 * (1 - k));
    g.strokeEllipse(cx, cy, r * 1.6, r * 1.04);
  }

  destroy() {
    super.destroy();
    this.chord.destroy();
    this.ring.destroy();
  }
}

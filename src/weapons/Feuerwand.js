import { DEPTH } from '../data/config.js';
import { NEUTRAL_MODS, aimAt, applyArt } from './common.js';
import { sfx } from '../audio/Sfx.js';

const MAX_SEGMENTS = 8;
const END_FADE = 0.5; // seconds of fade-out
const FLICKER_HZ = 11; // placeholder flame flicker (rad/s factor)

// Feuerwand: every `cooldown` a straight wall of fire (`length` px, across the aim) is placed `distance` px toward
// the nearest enemy (or the facing direction). It burns for `duration`; a recast replaces the old wall.
// Every `tickSeconds` everyone touching it takes dps*tick and is set burning (BurnSystem).
export class Feuerwand {
  constructor(scene, player, enemies, sparks, stats, ctx = {}) {
    this.scene = scene;
    this.player = player;
    this.enemies = enemies;
    this.sparks = sparks;
    this.stats = stats;
    this.burn = ctx.burn || null;
    this.cooldown = 0;
    this.dir = { x: 1, y: 0 };
    this.left = 0; // seconds the current wall still burns (0 = no wall)
    this.time = 0;
    this.tick = 0;
    this.damage = 0;
    // Wall = segment from (ax, ay) to (bx, by) on the ground.
    this.ax = 0;
    this.ay = 0;
    this.bx = 0;
    this.by = 0;
    this.segs = [];
    for (let i = 0; i < MAX_SEGMENTS; i++) {
      // Additive and above the night tint so the fire reads at night (no y-sorting with the crowd).
      this.segs.push(scene.add.sprite(0, 0, `ph_${stats.fx}`).setOrigin(0.5, 1).setVisible(false)
        .setBlendMode(Phaser.BlendModes.ADD));
    }
  }

  update(dt, mods = NEUTRAL_MODS) {
    this.time += dt;
    if (this.left > 0) this.burnWall(dt);
    this.cooldown -= dt;
    if (this.cooldown > 0) return;
    const st = this.stats;
    const p = this.player;
    const target = this.enemies.findNearest(p.x, p.y, st.range);
    if (!target) return;
    this.cooldown = st.cooldown * mods.cooldownMul;
    aimAt(p, target, this.dir);
    this.place(st.dps * mods.damageMul);
    sfx.weapon(st, p.x);
  }

  place(dps) {
    const st = this.stats;
    const p = this.player;
    const cx = p.x + this.dir.x * st.distance;
    const cy = p.y + this.dir.y * st.distance;
    const nx = -this.dir.y; // across the aim
    const ny = this.dir.x;
    const half = st.length / 2;
    this.ax = cx - nx * half;
    this.ay = cy - ny * half;
    this.bx = cx + nx * half;
    this.by = cy + ny * half;
    this.damage = dps * st.tickSeconds;
    this.left = st.duration;
    this.tick = 0;

    // Segments tile edge to edge at the art width (seamless art; overlaps would double up under ADD),
    // as many as best fill the wall length. The hit line is always the full `length`.
    const first = this.segs[0];
    const art = applyArt(first, st.fx);
    const segW = first.frame.width || 48;
    const n = Math.max(1, Math.min(MAX_SEGMENTS, Math.round(st.length / segW)));
    const spacing = segW;
    const start = -(n * segW) / 2;
    for (let i = 0; i < MAX_SEGMENTS; i++) {
      const s = this.segs[i];
      if (i >= n) {
        s.setVisible(false).anims.stop();
        continue;
      }
      if (i > 0) applyArt(s, st.fx);
      if (art && s.anims.isPlaying) s.anims.setProgress((i * 0.37) % 1); // so the flames don't move in lockstep
      const off = start + spacing * (i + 0.5);
      s.setPosition(cx + nx * off, cy + ny * off).setDepth(DEPTH.fx - 45).setAlpha(1).setScale(1).setVisible(true);
      s.phase = i * 1.7;
    }
  }

  burnWall(dt) {
    const st = this.stats;
    this.left -= dt;
    if (this.left <= 0) {
      this.left = 0;
      for (let i = 0; i < MAX_SEGMENTS; i++) this.segs[i].setVisible(false).anims.stop();
      return;
    }
    const alpha = this.left < END_FADE ? this.left / END_FADE : 1;
    for (let i = 0; i < MAX_SEGMENTS; i++) {
      const s = this.segs[i];
      if (!s.visible) continue;
      s.setAlpha(alpha);
      if (!s.anims.isPlaying) s.setScale(1, 0.85 + 0.15 * Math.sin(this.time * FLICKER_HZ + s.phase));
    }
    this.tick -= dt;
    if (this.tick > 0) return;
    this.tick += st.tickSeconds;
    this.scorch();
  }

  // Distance from each enemy to the wall segment (clamped projection) against thickness/2 + its radius.
  scorch() {
    const st = this.stats;
    const wx = this.bx - this.ax;
    const wy = this.by - this.ay;
    const len2 = wx * wx + wy * wy || 1;
    const reach = st.thickness / 2;
    const list = this.enemies.group.getChildren();
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (!e.active) continue;
      const ex = e.body.center.x;
      const ey = e.body.center.y;
      let t = ((ex - this.ax) * wx + (ey - this.ay) * wy) / len2;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const dx = ex - (this.ax + wx * t);
      const dy = ey - (this.ay + wy * t);
      const r = reach + e.body.halfWidth;
      if (dx * dx + dy * dy > r * r) continue;
      this.enemies.damageQuiet(e, this.damage);
      if (this.burn && e.active) this.burn.ignite(e, st.burnDps, st.burnSeconds);
    }
  }

  destroy() {
    for (let i = 0; i < this.segs.length; i++) this.segs[i].destroy();
    this.segs.length = 0;
  }
}

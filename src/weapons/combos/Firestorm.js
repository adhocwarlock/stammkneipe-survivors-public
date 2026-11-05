import { DEPTH } from '../../data/config.js';
import { NEUTRAL_MODS } from '../common.js';
import { Shooter } from '../Shooter.js';

const TRAIL_FADE = 0.35; // seconds of fade-out at the end of a trail flame
const TRAIL_SCALE = 2.4; // fx_flame is 16x8 art px
const FALLBACK_COLOR = 0xff8a30;

// Combo Dönerspieß + Feuerwand: flaming Dönerspieße shot in a straight line through the crowd. Every enemy hit
// starts burning, and the spit drops a short-lived fire trail (`trailEvery` px) that burns whoever walks through.
export class Firestorm extends Shooter {
  constructor(scene, player, enemies, sparks, stats, ctx = {}) {
    super(scene, player, enemies, sparks, stats, ctx);
    this.burn = ctx.burn || null;
    this.flameArt = scene.textures.exists(stats.trailFx);
    this.flameAnim = `${stats.trailFx}_default`;
    this.trail = [];
    for (let i = 0; i < stats.trailMax; i++) {
      const s = scene.add.sprite(0, 0, this.flameArt ? stats.trailFx : '__WHITE')
        .setBlendMode(Phaser.BlendModes.ADD).setOrigin(0.5, 1).setVisible(false);
      if (!this.flameArt) s.setTint(FALLBACK_COLOR);
      s.life = 0;
      s.tick = 0;
      this.trail.push(s);
    }
    this.next = 0;
    this.trailDamage = 0;
  }

  update(dt, mods = NEUTRAL_MODS) {
    const st = this.stats;
    this.trailDamage = st.trailDps * st.trailTick * mods.damageMul;
    super.update(dt, mods);
    this.updateTrail(dt);
  }

  onShotHit(e) {
    if (this.burn && e.active) this.burn.ignite(e, this.stats.burnDps, this.stats.burnSeconds);
  }

  // Called every frame per flying spit: lay a flame every `trailEvery` px. (travelled restarts at 0 per launch.)
  place(s) {
    super.place(s);
    if (!(s.lastTrail <= s.travelled)) s.lastTrail = 0;
    if (s.travelled - s.lastTrail < this.stats.trailEvery) return;
    s.lastTrail = s.travelled;
    this.dropFlame(s.gx, s.gy);
  }

  // Oldest flame is reused when all are burning (ring buffer).
  dropFlame(x, y) {
    const st = this.stats;
    const f = this.trail[this.next];
    this.next = (this.next + 1) % this.trail.length;
    f.life = st.trailSeconds;
    f.tick = 0;
    f.gx = x;
    f.gy = y;
    f.setPosition(x, y).setDepth(DEPTH.fx - 45).setAlpha(1).setVisible(true);
    if (this.flameArt) {
      f.setScale(TRAIL_SCALE);
      if (this.scene.anims.exists(this.flameAnim)) f.play({ key: this.flameAnim, repeat: -1 }, true);
    } else {
      f.setDisplaySize(18, 30);
    }
  }

  updateTrail(dt) {
    const st = this.stats;
    const r = st.trailRadius;
    const list = this.enemies.group.getChildren();
    for (let i = 0; i < this.trail.length; i++) {
      const f = this.trail[i];
      if (f.life <= 0) continue;
      f.life -= dt;
      if (f.life <= 0) {
        f.setVisible(false).anims.stop();
        continue;
      }
      if (f.life < TRAIL_FADE) f.setAlpha(f.life / TRAIL_FADE);
      f.tick -= dt;
      if (f.tick > 0) continue;
      f.tick += st.trailTick;
      for (let k = 0; k < list.length; k++) {
        const e = list[k];
        if (!e.active) continue;
        if (Math.hypot(e.body.center.x - f.gx, e.body.center.y - f.gy) - e.body.halfWidth > r) continue;
        this.enemies.damageQuiet(e, this.trailDamage);
        if (this.burn && e.active) this.burn.ignite(e, st.burnDps, st.burnSeconds);
      }
    }
  }

  destroy() {
    super.destroy();
    for (let i = 0; i < this.trail.length; i++) this.trail[i].destroy();
    this.trail.length = 0;
  }
}

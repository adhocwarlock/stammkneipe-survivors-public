import { NEUTRAL_MODS } from '../common.js';
import { Eimer } from '../Eimer.js';
import { Pfeffi } from '../Pfeffi.js';

// Combo Pfeffi + EIMER: the full EIMER swing, and the swung arc leaves `clouds` lingering mint clouds.
// The clouds are a Pfeffi instance that never throws (only its cloud pool and ticks are used).
export class PfeffiEimer extends Eimer {
  constructor(scene, player, enemies, sparks, stats) {
    super(scene, player, enemies, sparks, stats);
    this.mint = new Pfeffi(scene, player, enemies, sparks, stats);
    this.cloudDamage = stats.tickDamage;
  }

  update(dt, mods = NEUTRAL_MODS) {
    this.cloudDamage = this.stats.tickDamage * mods.damageMul;
    super.update(dt, mods);
    this.mint.updateClouds(dt);
  }

  onSwing() {
    super.onSwing();
    const st = this.stats;
    const p = this.player;
    const aim = Math.atan2(this.dir.y, this.dir.x);
    const arc = Phaser.Math.DegToRad(st.arcDeg);
    const dist = st.range * st.cloudDist;
    for (let k = 0; k < st.clouds; k++) {
      const a = aim - arc / 2 + ((k + 0.5) * arc) / st.clouds;
      this.mint.spawnCloud(p.x + Math.cos(a) * dist, p.y + Math.sin(a) * dist, this.cloudDamage);
    }
  }

  destroy() {
    super.destroy();
    this.mint.destroy();
  }
}

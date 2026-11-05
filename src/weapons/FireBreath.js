import { FIRE_BREATH } from '../data/drinks.js';
import { spriteDef } from '../art/render.js';
import { SweepWeapon } from './SweepWeapon.js';

// Mexikaner: replaces the fists while the drink lasts. A short cone from Lars' mouth (same hit test as the
// Metzgerbeil sweep) that sets every enemy it hits burning.
export class FireBreath extends SweepWeapon {
  constructor(scene, player, enemies, sparks, burn, stats = FIRE_BREATH) {
    super(scene, player, enemies, sparks, stats, stats.fx);
    this.burn = burn;
  }

  onHit(e) {
    if (e.active) this.burn.ignite(e, this.stats.burnDps, this.stats.burnSeconds);
  }

  // The cone art points right; its origin (art: [0, 0.5]) is the mouth. Stretched to the range.
  showSwing(angle) {
    const st = this.stats;
    const p = this.player;
    if (!this.fx.available) {
      super.showSwing(angle);
      return;
    }
    const w = this.scene.textures.get(this.fx.key).get('default_0').width || 120;
    const mx = p.x + this.dir.x * 10;
    const my = p.y - st.mouthY;
    const [ox, oy] = spriteDef(this.fx.key)?.origin || [0, 0.5];
    const s = this.fx.play(mx + this.dir.x * st.range * ox, my + this.dir.y * st.range * ox, angle, st.range / w, this.dir.x < 0);
    if (s) s.setOrigin(ox, oy).setBlendMode(Phaser.BlendModes.ADD);
  }
}

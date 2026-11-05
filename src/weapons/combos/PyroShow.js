import { DEPTH } from '../../data/config.js';
import { NEUTRAL_MODS, ENEMY_BODY_Y } from '../common.js';
import { ArcWeapon } from '../Blades.js';
import { shake } from '../shake.js';
import { sfx } from '../../audio/Sfx.js';

const JET_SCALE_X = 3; // fx_flame (16x8 art px) stretched into a tall column
const JET_SCALE_Y = 8;
const FALLBACK_COLOR = 0xff7a20;

// Combo Harley Benton + Feuerwand: the guitar chop, and every swing fires `jets` flame columns along the arc
// (damage + burning, like the fire jets at a metal show). Every `finaleEvery`th swing: a ring of columns around Lars.
export class PyroShow extends ArcWeapon {
  constructor(scene, player, enemies, sparks, stats, ctx = {}) {
    super(scene, player, enemies, sparks, stats);
    this.burn = ctx.burn || null;
    this.art = scene.textures.exists(stats.jetFx);
    this.anim = `${stats.jetFx}_default`;
    this.jetPool = [];
    for (let i = 0; i < stats.finaleJets + stats.jets * 2; i++) {
      const s = scene.add.sprite(0, 0, this.art ? stats.jetFx : '__WHITE').setOrigin(0.5, 1)
        .setBlendMode(Phaser.BlendModes.ADD).setVisible(false);
      if (!this.art) s.setTint(FALLBACK_COLOR);
      s.life = 0;
      this.jetPool.push(s);
    }
    this.swings = 0;
    this.damageMul = 1;
  }

  update(dt, mods = NEUTRAL_MODS) {
    this.damageMul = mods.damageMul;
    super.update(dt, mods);
    this.updateJets(dt);
  }

  onSwing() {
    super.onSwing();
    const st = this.stats;
    const p = this.player;
    this.swings++;
    const aim = Math.atan2(this.dir.y, this.dir.x);
    const arc = Phaser.Math.DegToRad(st.arcDeg);
    const dist = st.range * st.jetDist;
    for (let k = 0; k < st.jets; k++) {
      const a = aim - arc / 2 + ((k + 0.5) * arc) / st.jets;
      this.jet(p.x + Math.cos(a) * dist, p.y + Math.sin(a) * dist, st.jetDamage);
    }
    if (this.swings % st.finaleEvery !== 0) return;
    for (let k = 0; k < st.finaleJets; k++) {
      const a = (k * Math.PI * 2) / st.finaleJets;
      this.jet(p.x + Math.cos(a) * st.finaleRadius, p.y + Math.sin(a) * st.finaleRadius, st.finaleDamage);
    }
    shake(this.scene, st.finaleShake, st.finaleShakeMs);
    sfx.play('w_firewall', p.x);
  }

  jet(x, y, damage) {
    const st = this.stats;
    const s = this.jetPool.find((j) => j.life <= 0);
    if (s) {
      s.life = st.jetSeconds;
      s.setPosition(x, y).setDepth(DEPTH.fx - 45).setAlpha(1).setVisible(true);
      if (this.art) {
        s.setScale(JET_SCALE_X, JET_SCALE_Y);
        if (this.scene.anims.exists(this.anim)) s.play({ key: this.anim, repeat: -1 }, true);
      } else {
        s.setDisplaySize(16, 90);
      }
    }
    const list = this.enemies.group.getChildren();
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (!e.active) continue;
      if (Math.hypot(e.body.center.x - x, e.body.center.y - y) - e.body.halfWidth > st.jetRadius) continue;
      this.sparks.play(e.body.center.x, e.body.center.y - ENEMY_BODY_Y + 6);
      this.enemies.damage(e, damage * this.damageMul, x, y, st.knockback * 0.3, st.knockbackTime);
      if (this.burn && e.active) this.burn.ignite(e, st.burnDps, st.burnSeconds);
    }
  }

  // Columns shoot up fast, then sink and fade.
  updateJets(dt) {
    const st = this.stats;
    for (let i = 0; i < this.jetPool.length; i++) {
      const s = this.jetPool[i];
      if (s.life <= 0) continue;
      s.life -= dt;
      if (s.life <= 0) {
        s.setVisible(false).anims.stop();
        continue;
      }
      const k = s.life / st.jetSeconds; // 1 -> 0
      s.setAlpha(Math.min(1, k * 2));
      if (this.art) s.scaleY = JET_SCALE_Y * Math.min(1, (1 - k) * 4) * (0.6 + 0.4 * k);
    }
  }

  destroy() {
    super.destroy();
    for (let i = 0; i < this.jetPool.length; i++) this.jetPool[i].destroy();
    this.jetPool.length = 0;
  }
}

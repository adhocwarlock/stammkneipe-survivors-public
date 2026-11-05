import { PLAYER_AFFLICTIONS as PA } from '../../data/enemies.js';
import { sfx } from '../../audio/Sfx.js';

// What monsters do to Lars besides plain damage: frost slow (wizard) and burning (horned demon, dragon).
// The slow multiplies the status mods after StatusSystem computed them; burning ticks damage through `dot`
// (no invulnerability frames, so it doesn't make Lars immune to contact hits) and shows a small flame on him.
export class PlayerAfflictions {
  constructor(scene, player, dot) {
    this.scene = scene;
    this.player = player;
    this.dot = dot; // (damage) => void
    this.slowLeft = 0;
    this.slowMul = 1;
    this.tinted = false;
    this.burnLeft = 0;
    this.burnDps = 0;
    this.burnTick = 0;
    this.flame = null;
  }

  // Speed x mul for `seconds` (the stronger slow wins, the longer time wins).
  slow(mul, seconds) {
    this.slowMul = this.slowLeft > 0 ? Math.min(this.slowMul, mul) : mul;
    this.slowLeft = Math.max(this.slowLeft, seconds);
  }

  ignite(dps, seconds) {
    if (this.burnLeft <= 0) {
      this.burnTick = PA.burnTick;
      sfx.play('player_burn');
    }
    this.burnDps = this.burnLeft > 0 ? Math.max(this.burnDps, dps) : dps;
    this.burnLeft = Math.max(this.burnLeft, seconds);
  }

  // After StatusSystem.update: mods are rebuilt from scratch every frame, so this never stacks up.
  apply(mods) {
    if (this.slowLeft > 0) mods.speedMul *= this.slowMul;
  }

  update(dt) {
    const sp = this.player.sprite;
    if (this.slowLeft > 0) {
      this.slowLeft -= dt;
      if (!this.tinted) {
        sp.setTint(PA.slowTint);
        this.tinted = true;
      }
    }
    if (this.slowLeft <= 0 && this.tinted) {
      sp.clearTint();
      this.tinted = false;
    }
    if (this.burnLeft > 0) {
      this.burnLeft -= dt;
      this.burnTick -= dt;
      if (this.burnTick <= 0) {
        this.burnTick += PA.burnTick;
        this.dot(this.burnDps * PA.burnTick);
      }
      const f = this.takeFlame();
      if (f) f.setVisible(this.burnLeft > 0).setPosition(this.player.x, this.player.y - PA.flameY).setDepth(sp.depth + 0.3);
    } else if (this.flame) {
      this.flame.setVisible(false);
    }
  }

  takeFlame() {
    if (this.flame || !this.scene.textures.exists('fx_burn')) return this.flame;
    this.flame = this.scene.add.sprite(0, 0, 'fx_burn', 'default_0').setOrigin(0.5, 1).setScale(PA.flameScale)
      .setBlendMode(Phaser.BlendModes.ADD).setVisible(false);
    if (this.scene.anims.exists('fx_burn_default')) this.flame.play({ key: 'fx_burn_default', repeat: -1 });
    return this.flame;
  }

  // Run over: no more ticks, no blue tint on the dead body.
  clear() {
    this.slowLeft = 0;
    this.burnLeft = 0;
    if (this.tinted) this.player.sprite.clearTint();
    this.tinted = false;
    if (this.flame) this.flame.setVisible(false);
  }
}

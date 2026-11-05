import { BURN } from '../data/champions.js';
import { DEPTH } from '../data/config.js';

// Enemy status "burning": damage over time + a small pooled flame (fx_burn) on the enemy.
// Burning enemies are kept in a flat list (swap-remove); state lives on the enemy object itself.
export class BurnSystem {
  constructor(scene, enemies) {
    this.scene = scene;
    this.enemies = enemies;
    this.list = [];
    this.flames = [];
    this.anim = scene.anims.exists('fx_burn_default') ? 'fx_burn_default' : null;
  }

  // Re-igniting a burning enemy refreshes the time and keeps the stronger flame. Full damage on everyone;
  // map-clearing sources pass in an already reduced dps for bosses/elites (AreaDamage).
  ignite(e, dps, seconds) {
    if (!e.active || dps <= 0 || seconds <= 0) return;
    const d = dps;
    if (e.burning && e.burnLeft > 0) {
      e.burnLeft = Math.max(e.burnLeft, seconds);
      e.burnDps = Math.max(e.burnDps, d);
      return;
    }
    e.burnLeft = seconds;
    e.burnDps = d;
    e.burnTick = BURN.tickSeconds;
    if (!e.burning) {
      e.burning = true;
      e.burnFx = this.takeFlame();
      this.list.push(e);
    }
  }

  takeFlame() {
    for (let i = 0; i < this.flames.length; i++) {
      if (!this.flames[i].visible) return this.flames[i].setVisible(true);
    }
    if (this.flames.length >= BURN.maxFlames || !this.scene.textures.exists('fx_burn')) return null;
    // Just under the "above" map layers (bridge truss), so flames don't show through them.
    const f = this.scene.add.sprite(0, 0, 'fx_burn', 'default_0').setOrigin(0.5, 1).setDepth(DEPTH.above - 1)
      .setBlendMode(Phaser.BlendModes.ADD);
    if (this.anim) f.play({ key: this.anim, repeat: -1, startFrame: this.flames.length % 4 });
    this.flames.push(f);
    return f;
  }

  update(dt) {
    const list = this.list;
    for (let i = list.length - 1; i >= 0; i--) {
      const e = list[i];
      // Dead, or a pooled enemy that was re-spawned (spawn resets burnLeft): stop burning.
      if (e.active && e.burnLeft > 0) {
        e.burnLeft -= dt;
        e.burnTick -= dt;
        if (e.burnTick <= 0) {
          e.burnTick += BURN.tickSeconds;
          this.enemies.damageQuiet(e, e.burnDps * BURN.tickSeconds);
        }
      }
      if (!e.active || e.burnLeft <= 0) {
        this.extinguish(e);
        list[i] = list[list.length - 1];
        list.pop();
        continue;
      }
      if (e.burnFx) e.burnFx.setPosition(e.body.center.x, e.body.center.y - BURN.flameY);
    }
  }

  pauseAnims() {
    for (let i = 0; i < this.flames.length; i++) this.flames[i].anims.pause();
  }

  extinguish(e) {
    e.burning = false;
    e.burnLeft = 0;
    if (e.burnFx) e.burnFx.setVisible(false);
    e.burnFx = null;
  }
}

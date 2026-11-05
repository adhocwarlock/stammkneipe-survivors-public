import { WEAPONS } from '../data/weapons.js';
import { NEUTRAL_MODS, ENEMY_BODY_Y } from './common.js';
import { sfx } from '../audio/Sfx.js';

// Always-on starting weapon: auto-punches the nearest goblin in short range.
export class Fists {
  constructor(scene, player, enemies, sparks, stats = WEAPONS.fists) {
    this.scene = scene;
    this.player = player;
    this.enemies = enemies;
    this.sparks = sparks;
    this.stats = stats;
    this.cooldown = 0;
    const art = scene.textures.exists(stats.sprite);
    this.fist = scene.add.image(0, 0, art ? stats.sprite : 'ph_fist', art ? 'default_0' : undefined).setVisible(false);
    this.fistTimer = 0;
  }

  update(dt, mods = NEUTRAL_MODS) {
    if (this.fistTimer > 0) {
      this.fistTimer -= dt;
      if (this.fistTimer <= 0) this.fist.setVisible(false);
    }

    this.cooldown -= dt;
    if (this.cooldown > 0) return;

    const st = this.stats;
    const p = this.player;
    const target = this.enemies.findNearest(p.x, p.y, st.range);
    if (!target) return;

    this.cooldown = st.cooldown * mods.cooldownMul;

    // Show a fist between Lars and the target for a moment, at roughly chest height.
    const tx = target.body.center.x;
    const ty = target.body.center.y;
    const dx = tx - p.x;
    const dy = ty - p.y;
    const len = Math.hypot(dx, dy) || 1;
    const reach = Math.min(len, 30);
    this.fist.setPosition(p.x + (dx / len) * reach, p.y - 24 + (dy / len) * reach)
      .setDepth(Math.max(p.sprite.depth, target.depth) + 1).setVisible(true);
    this.fistTimer = 0.1;
    this.sparks.play(tx, ty - ENEMY_BODY_Y + 6);
    sfx.weapon(st, p.x);

    this.enemies.damage(target, st.damage * mods.damageMul, p.x, p.y, st.knockback, st.knockbackTime);
  }

  destroy() {
    this.fist.destroy();
  }
}

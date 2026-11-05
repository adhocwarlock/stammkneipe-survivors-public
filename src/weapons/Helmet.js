import { NEUTRAL_MODS, ENEMY_BODY_Y } from './common.js';
import { sfx } from '../audio/Sfx.js';

// Equipped helmet. Accurate helmet = permanent armor. Horned helmet = goblins touching Lars get hurt and pushed away,
// each goblin at most once per `contactInterval`. (Drawing it on Lars' head is Player.setHelmet.)
export class Helmet {
  constructor(scene, player, enemies, sparks, stats) {
    this.scene = scene;
    this.player = player;
    this.enemies = enemies;
    this.sparks = sparks;
    this.stats = stats;
    this.time = 0;
    this.mods = NEUTRAL_MODS;
    this.lastHit = stats.contactDamage ? new Map() : null; // enemy -> this.time of its last horn hit
  }

  armor() {
    return this.stats.armor || 0;
  }

  update(dt, mods = NEUTRAL_MODS) {
    this.time += dt;
    this.mods = mods;
  }

  onPlayerTouched(e) {
    if (!this.lastHit || !e.active) return;
    const st = this.stats;
    const last = this.lastHit.get(e);
    if (last !== undefined && this.time - last < st.contactInterval) return;
    this.lastHit.set(e, this.time);
    const p = this.player;
    this.sparks.play(e.body.center.x, e.body.center.y - ENEMY_BODY_Y + 6);
    sfx.weapon(st, p.x);
    this.enemies.damage(e, st.contactDamage * this.mods.damageMul, p.x, p.y, st.knockback, st.knockbackTime);
  }

  destroy() {
    if (this.lastHit) this.lastHit.clear();
  }
}

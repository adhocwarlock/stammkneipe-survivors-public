import { WEAPONS } from '../data/weapons.js';
import { SweepWeapon } from './SweepWeapon.js';
import { shake } from './shake.js';

// DER EIMER: a huge, heavy sweep with a short camera shake.
export class Eimer extends SweepWeapon {
  constructor(scene, player, enemies, sparks, stats = WEAPONS.eimer) {
    super(scene, player, enemies, sparks, stats, 'fx_slash_big');
  }

  onSwing() {
    shake(this.scene, this.stats.shake, this.stats.shakeMs);
  }
}

import { WEAPONS } from '../data/weapons.js';
import { SweepWeapon } from './SweepWeapon.js';

// Butcher's cleaver: wide melee arc toward the nearest enemy, hits everything inside it.
export class Metzgerbeil extends SweepWeapon {
  constructor(scene, player, enemies, sparks, stats = WEAPONS.metzgerbeil) {
    super(scene, player, enemies, sparks, stats, 'fx_slash');
  }
}

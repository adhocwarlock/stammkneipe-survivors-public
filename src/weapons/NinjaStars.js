import { WEAPONS } from '../data/weapons.js';
import { Shooter } from './Shooter.js';

// Fast pooled shuriken toward the nearest enemy; each one hits a single target.
// The Mercedes-Sterne, Bogen and Minigun are the same Shooter with other stats (pierce, spread, orient).
export class NinjaStars extends Shooter {
  constructor(scene, player, enemies, sparks, stats = WEAPONS.ninja_stars) {
    super(scene, player, enemies, sparks, stats);
  }
}

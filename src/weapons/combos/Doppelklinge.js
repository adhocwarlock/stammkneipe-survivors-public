import { ArcWeapon } from '../Blades.js';

// Combo Samurai-Schwert + Lichtschwert: a full 360° slash (arcDeg 360 hits all around; SweepWeapon's arc test
// handles that). Drawn as two saber crescents back to back.
export class Doppelklinge extends ArcWeapon {
  constructor(scene, player, enemies, sparks, stats) {
    super(scene, player, enemies, sparks, stats);
    this.fx.max = 4;
  }

  showSwing(angle) {
    super.showSwing(angle);
    const { x, y } = this.dir;
    this.dir.x = -x;
    this.dir.y = -y;
    super.showSwing(angle + Math.PI);
    this.dir.x = x;
    this.dir.y = y;
  }
}

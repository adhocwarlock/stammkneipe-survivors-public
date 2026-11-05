import { crewDef } from '../placeholders.js';
import { freeSpot } from '../spots.js';
import { shake } from '../../weapons/shake.js';
import { Sequence } from './Sequence.js';
import { sfx } from '../../audio/Sfx.js';

// Hannah: runs in, "Hannahbolika!!", injects herself and turns into an ogre-sized muscle form
// (real face stays on). Then fights: ground-shaking floor punch + a lunge that drives through a line.
export class Hannah extends Sequence {
  begin() {
    const d = this.data;
    const { allies, player, town } = this.ctx;
    this.hannah = this.spawnChampion(d.body, { speed: d.runSpeed, leave: 'run' });
    if (!this.hannah) {
      this.finish();
      return;
    }
    const b = this.hannah.sprite.body;
    const toEntry = Math.atan2(b.center.y - player.y, b.center.x - player.x);
    freeSpot(town, player.x, player.y, d.meetDist, toEntry, this.spot2);
    allies.goto(this.hannah, this.spot2.x, this.spot2.y, d.runSpeed);
    this.go('runIn');
  }

  tick() {
    const d = this.data;
    const { allies, fx, scene } = this.ctx;
    const a = this.hannah;
    if (!a.active) {
      this.finish();
      return;
    }
    switch (this.phase) {
      case 'runIn':
        if (!a.arrived) return;
        allies.hold(a);
        a.sprite.setFlipX(a.sprite.x > this.ctx.player.x);
        this.banner(d.banner);
        this.injectT = Math.max(d.injectSeconds, allies.playOnce(a, 'inject'));
        sfx.play('crew_inject', a.sprite.x);
        this.go('inject');
        return;
      case 'inject': {
        if (this.t < this.injectT) return;
        // The hulk sprite may bring its own head scale (meta.headScale); otherwise use the data value.
        const headScale = crewDef(d.hulkBody)?.meta?.headScale ? 1 : d.headScale;
        allies.setBody(a, d.hulkBody, headScale);
        const b = a.sprite.body;
        const tr = d.transform;
        fx.explode(b.center.x, b.center.y - 30, tr.fxScale);
        fx.ring(b.center.x, b.center.y, tr.ringRadius, 0xffd0a0);
        shake(scene, tr.shake, tr.shakeMs);
        sfx.play('crew_hulk_roar', b.center.x);
        a.speed = d.speed;
        allies.setAttacks(a, d.attacks);
        allies.fight(a, d.duration);
        this.go('fight');
        return;
      }
      default:
    }
  }
}

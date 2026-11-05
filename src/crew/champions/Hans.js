import { ART } from '../../data/config.js';
import { freeSpot } from '../spots.js';
import { Sequence } from './Sequence.js';
import { sfx } from '../../audio/Sfx.js';

// Hans: Lars says "Get ze Flammenwerfer!", Hans runs in ("The Hans have arrived") and races around Lars
// like a madman, whirling fire streams that set everything burning. When he leaves, the screen is on fire.
export class Hans extends Sequence {
  begin() {
    const { bubble, player } = this.ctx;
    bubble.say(player, this.data.speech);
    this.go('speech');
  }

  tick(dt) {
    const d = this.data;
    const { allies } = this.ctx;
    switch (this.phase) {
      case 'speech':
        if (this.t < d.speechLead) return;
        this.hans = this.spawnChampion(d.body, { speed: d.runSpeed, life: d.duration + 5, leave: 'run' });
        if (!this.hans) {
          this.finish();
          return;
        }
        allies.playLoop(this.hans, 'fire');
        this.banner(d.banner);
        this.angle = Math.random() * Math.PI * 2;
        this.emit = 0;
        this.wander = 0;
        this.go('rampage');
        return;
      case 'rampage':
        if (!this.hans.active) {
          this.finish();
          return;
        }
        this.rampage(dt);
        sfx.loop('crew_flame', dt, this.hans.sprite.x);
        if (this.t >= d.duration) {
          this.ctx.area.screen(d.finale, this.ctx.player.x, this.ctx.player.y);
          sfx.play('crew_fire_finale');
          allies.leave(this.hans);
          this.go('leave');
        }
        return;
      case 'leave':
        if (!this.hans.active) this.finish();
        return;
      default:
    }
  }

  // Random free spot around Lars that Hans can run to in a straight line (else the last one tried).
  pickWanderPoint() {
    const d = this.data;
    const { allies, player, town } = this.ctx;
    const b = this.hans.sprite.body;
    for (let k = 0; k < d.wanderTries; k++) {
      const r = d.wanderRadius * (0.4 + Math.random() * 0.6);
      freeSpot(town, player.x, player.y, r, Math.random() * Math.PI * 2, this.spot2);
      if (allies.lineClear(b.center.x, b.center.y, this.spot2.x, this.spot2.y)) {
        this.hans.blocked = false; // known clear: beeline right away
        return;
      }
    }
    this.hans.losT = 0; // re-check now
  }

  rampage(dt) {
    const d = this.data;
    const { allies, fx } = this.ctx;
    const a = this.hans;
    this.wander -= dt;
    if (this.wander <= 0) {
      this.wander = d.wanderEvery * (0.6 + Math.random() * 0.8);
      this.pickWanderPoint();
    }
    if (allies.steer(a, this.spot2.x, this.spot2.y, d.runSpeed, dt)) this.wander = 0;

    // Flame streams from the nozzle, whirling around.
    const f = d.flame;
    this.angle += Phaser.Math.DegToRad(f.whirlDegPerSec) * dt;
    const sp = a.sprite;
    const def = a.def;
    const [w, h] = def.size;
    const nz = def.meta?.nozzle || { x: w, y: h / 2 };
    const s = ART.scale;
    const nx = sp.x + ((sp.flipX ? w - nz.x : nz.x) - w * sp.originX) * s;
    const ny = sp.y + (nz.y - h * sp.originY) * s;
    const feetY = sp.body.center.y;
    this.emit -= dt;
    while (this.emit <= 0) {
      this.emit += f.interval;
      for (let k = 0; k < f.streams; k++) {
        const ang = this.angle + (k * Math.PI * 2) / f.streams + Phaser.Math.DegToRad((Math.random() * 2 - 1) * f.jitterDeg);
        fx.flame(nx, feetY, feetY - ny, ang, f);
      }
    }
  }
}

import { freeSpot } from '../spots.js';
import { shake } from '../../weapons/shake.js';
import { DiscoBall } from '../DiscoBall.js';
import { Sequence } from './Sequence.js';
import { sfx } from '../../audio/Sfx.js';

// Lars as a crew member (when you play someone else): runs in singing "I wanna take you to a gay bar",
// "gay bar", "gay bar" (one bubble after another) while a disco ball comes down. "Schubsentanz!!", the
// screen shakes and the monsters on screen ram each other (MoshPit). Lars only dances around in the middle
// (he hurts nobody) and drops a few free beers. At the end the ball goes back up.
export class Lars extends Sequence {
  constructor(ctx, id, data) {
    super(ctx, id, data);
    const self = this;
    // Speech bubble speaker = Lars' feet.
    this.speaker = {
      get x() { return self.lars ? self.lars.sprite.body.center.x : ctx.player.x; },
      get y() { return self.lars ? self.lars.sprite.body.center.y : ctx.player.y; },
    };
    this.disco = null;
  }

  begin() {
    const d = this.data;
    const { allies, player, town, scene } = this.ctx;
    this.lars = this.spawnChampion(d.body, { speed: d.runSpeed, leave: 'run' });
    if (!this.lars) {
      this.finish();
      return;
    }
    if (!this.disco) this.disco = new DiscoBall(scene, d.disco);
    this.disco.descend();
    sfx.play('crew_disco');
    const b = this.lars.sprite.body;
    freeSpot(town, player.x, player.y, d.meetDist, Math.atan2(b.center.y - player.y, b.center.x - player.x), this.spot2);
    allies.goto(this.lars, this.spot2.x, this.spot2.y, d.runSpeed);
    this.line = 0;
    this.lineT = 0;
    this.go('sing');
  }

  tick(dt) {
    const d = this.data;
    const { bubble, fx, scene, mosh } = this.ctx;
    const a = this.lars;
    this.disco.update(dt);
    switch (this.phase) {
      case 'sing':
        this.lineT -= dt;
        if (this.lineT <= 0 && this.line < d.song.length) {
          bubble.say(this.speaker, d.song[this.line++], d.lineSeconds);
          this.lineT = d.lineSeconds;
        }
        if (this.line < d.song.length || this.lineT > 0 || (a.active && !a.arrived)) return;
        this.banner(d.banner);
        shake(scene, d.shake, d.shakeMs);
        sfx.play('crew_crowd');
        this.cx = a.sprite.body.center.x;
        this.cy = a.sprite.body.center.y;
        fx.ring(this.cx, this.cy, d.dance.radius, 0xffffff);
        mosh.start(d.mosh, d.duration);
        this.wander = 0;
        this.beers = 0;
        this.go('mosh');
        return;
      case 'mosh':
        this.dance(dt);
        if (mosh.active) return;
        this.disco.rise();
        this.ctx.allies.leave(a);
        this.go('outro');
        return;
      case 'outro':
        if (a.active || this.disco.visible) return;
        this.finish();
        return;
      default:
    }
  }

  // Runs between random spots around the pit (cosmetic shoving), dropping free beers now and then.
  dance(dt) {
    const d = this.data;
    const { allies, town, pickups } = this.ctx;
    const a = this.lars;
    if (!a.active) return;
    this.wander -= dt;
    if (this.wander <= 0) {
      this.wander = d.dance.every * (0.6 + Math.random() * 0.8);
      freeSpot(town, this.cx, this.cy, d.dance.radius * (0.3 + Math.random() * 0.7), Math.random() * Math.PI * 2, this.spot2);
    }
    if (allies.steer(a, this.spot2.x, this.spot2.y, d.dance.speed, dt)) this.wander = 0;
    // Beers spread evenly over the pit time.
    const due = Math.floor((this.t / d.duration) * (d.beers + 1));
    if (this.beers < d.beers && due > this.beers) {
      this.beers++;
      if (pickups) pickups.dropBeer(a.sprite.body.center.x, a.sprite.body.center.y + 10);
    }
  }

  finish() {
    if (this.disco && this.disco.visible) this.disco.hide();
    super.finish();
  }
}

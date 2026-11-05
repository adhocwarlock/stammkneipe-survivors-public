import { CREW } from '../data/champions.js';
import { SPAWN } from '../data/config.js';
import { shake } from '../weapons/shake.js';
import { sfx } from '../audio/Sfx.js';

const WAIT = 0;
const BACKOFF = 1;
const CHARGE = 2;

// Lars' crew call: the monsters on screen are paired up and ram each other. Each one backs off a few steps
// (visible run-up), then both charge straight at each other; the crash hits both and everything close by
// (map-clear damage: bosses/elites reduced) with a ground ring + a small camera shake. Pairs start staggered,
// new arrivals are paired on the next rescan, and when the pit ends everything still on screen takes the
// finale hit (like the other screen-clearing crew calls). State lives on the enemies; no per-frame allocations.
export class MoshPit {
  constructor(scene, enemies, area, fx) {
    this.scene = scene;
    this.enemies = enemies;
    this.area = area;
    this.fx = fx;
    this.active = false;
    this.left = 0;
    this.scanT = 0;
    this.d = null;
    this.cand = new Array(SPAWN.hardCap).fill(null); // reused candidate list for pairing
  }

  start(data, seconds) {
    this.active = true;
    this.d = data;
    this.left = seconds;
    this.scanT = 0;
  }

  update(dt) {
    if (!this.active) return;
    this.left -= dt;
    this.scanT -= dt;
    if (this.scanT <= 0 && this.left > this.d.minPairTime) {
      this.scanT = this.d.rescan;
      this.pairUp();
    }
    if (this.left <= 0) this.end();
  }

  // On-screen, non-boss enemies that aren't ramming yet, paired by their order in the pool (spread over the
  // screen, so run-ups cross the pit). Each pair starts a bit later than the previous one.
  pairUp() {
    const v = this.scene.cameras.main.worldView;
    const m = CREW.screenMargin;
    const list = this.enemies.group.getChildren();
    const cand = this.cand;
    let n = 0;
    for (let i = 0; i < list.length && n < cand.length; i++) {
      const e = list[i];
      if (!e.active || e.boss || e.moshT > 0) continue;
      const x = e.body.center.x;
      const y = e.body.center.y;
      if (x < v.x - m || x > v.right + m || y < v.y - m || y > v.bottom + m) continue;
      cand[n++] = e;
    }
    const d = this.d;
    const pairs = Math.min(Math.floor(n / 2), d.maxPairsPerScan);
    for (let p = 0; p < pairs; p++) {
      // First half vs second half of the list: partners are usually far apart = long, readable charges.
      const a = cand[p];
      const b = cand[n - 1 - p];
      const delay = p * d.pairStagger;
      this.engage(a, b, delay);
      this.engage(b, a, delay);
    }
    for (let i = 0; i < n; i++) cand[i] = null;
  }

  engage(e, partner, delay) {
    e.moshT = this.left + 1; // EnemySystem hands steering to steer() while > 0
    e.ramPartner = partner;
    e.ramState = WAIT;
    e.ramT = delay;
  }

  release(e) {
    e.moshT = 0;
    e.ramPartner = null;
  }

  end() {
    this.active = false;
    const list = this.enemies.group.getChildren();
    for (let i = 0; i < list.length; i++) if (list[i].moshT > 0) this.release(list[i]);
    const p = this.scene.cameras.main.midPoint;
    this.area.screen(this.d.finale, p.x, p.y);
    sfx.play('crew_explosion');
  }

  // Called by EnemySystem instead of its normal steering while e.moshT > 0.
  steer(e, dt) {
    const d = this.d;
    const p = e.ramPartner;
    e.moshT -= dt;
    if (!this.active || !p || !p.active || p.ramPartner !== e || e.moshT <= 0) {
      this.release(e);
      e.setVelocity(0, 0);
      return;
    }
    const dx = p.body.center.x - e.body.center.x;
    const dy = p.body.center.y - e.body.center.y;
    const dist = Math.hypot(dx, dy) || 1;
    const ux = dx / dist;
    const uy = dy / dist;
    e.setFlipX(ux < 0); // always facing the partner: the run-up reads as "squaring up"
    e.ramT -= dt;
    if (e.ramState === WAIT) {
      e.setVelocity(0, 0);
      if (e.ramT <= 0) {
        e.ramState = BACKOFF;
        e.ramT = d.backoffSeconds;
      }
    } else if (e.ramState === BACKOFF) {
      const v = e.speed * d.backoffSpeedMul;
      e.setVelocity(-ux * v, -uy * v);
      if (e.ramT <= 0) {
        e.ramState = CHARGE;
        e.ramT = d.chargeMax;
      }
    } else {
      const v = e.speed * d.chargeSpeedMul;
      e.setVelocity(ux * v, uy * v);
      // Crash when they meet (or give up the long way round and crash where it is).
      if (dist <= e.body.halfWidth + p.body.halfWidth + d.crashSlack || e.ramT <= 0) this.crash(e, p);
    }
  }

  crash(a, b) {
    const c = this.d.crash;
    const x = (a.body.center.x + b.body.center.x) / 2;
    const y = (a.body.center.y + b.body.center.y) / 2;
    this.release(a);
    this.release(b);
    this.area.circle(x, y, c.radius, c); // both + anyone close
    this.fx.ring(x, y, c.ringRadius, c.ring);
    this.fx.explode(x, y - 20, c.fxScale);
    sfx.play('crew_crash', x);
    shake(this.scene, c.shake, c.shakeMs);
  }
}

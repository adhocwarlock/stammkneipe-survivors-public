import { CREW, championHead, championPhotoKey } from '../../data/champions.js';
import { entrySpot } from '../spots.js';
import { sfx } from '../../audio/Sfx.js';

// Base for a champion's ability: a small phase machine driven by update(dt) (no tweens/timers, so the
// game's pause and shop freeze it too). Subclasses implement begin() and tick(dt) and call finish().
export class Sequence {
  constructor(ctx, id, data) {
    this.ctx = ctx; // { scene, player, enemies, town, allies, fx, area, burn, popup, bubble, mosh, pickups }
    this.id = id;
    this.data = data;
    this.running = false;
    this.phase = '';
    this.t = 0;
    this.spot = { x: 0, y: 0 };
    this.spot2 = { x: 0, y: 0 };
  }

  start() {
    this.running = true;
    this.phase = '';
    this.t = 0;
    this.begin();
  }

  go(phase) {
    this.phase = phase;
    this.t = 0;
  }

  // Returns false once the ability is over.
  update(dt) {
    if (!this.running) return false;
    this.t += dt;
    this.tick(dt);
    return this.running;
  }

  finish() {
    this.running = false;
  }

  banner(text) {
    this.ctx.popup.showBanner(text, CREW.bannerSeconds);
    sfx.crewVoice(this.id, text === this.data.banner2 ? 1 : 0);
  }

  // The champion (with their photo head) appears just off-screen.
  spawnChampion(key, cfg) {
    const { scene, enemies, player, allies } = this.ctx;
    entrySpot(scene, enemies, player, this.spot);
    return allies.spawn(key, this.spot.x, this.spot.y, { photo: championPhotoKey(this.id), head: championHead(this.id), ...cfg });
  }

  begin() {}
  tick() {}
}

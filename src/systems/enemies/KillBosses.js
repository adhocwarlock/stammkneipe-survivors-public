import { KILL_BOSSES } from '../../data/killBosses.js';
import { JOINT } from '../../data/beers.js';
import { formatEuro } from '../../utils/format.js';
import { sfx } from '../../audio/Sfx.js';

// Kill-count bosses: every N kills of a family (goblins, skeletons...) its boss arrives off-screen.
// Repeats with more HP. The progress hint text is rebuilt only when a counter changes.
export class KillBosses {
  constructor(sys) {
    this.sys = sys;
    this.entries = KILL_BOSSES.list.map((b) => ({ ...b, count: 0, next: b.every, round: 0, pending: false, boss: null, serial: 0 }));
    this.byFamily = {};
    for (const en of this.entries) this.byFamily[en.family] = en;
    this.hintText = '';
    this.debugIdx = 0;
  }

  onKill(family) {
    const en = this.byFamily[family];
    if (!en) return;
    en.count++;
    if (en.count >= en.next) en.pending = true;
    this.dirty = true; // hint text is rebuilt once per frame at most (update)
  }

  update(minutes) {
    if (this.dirty) {
      this.dirty = false;
      this.buildHints();
    }
    for (let i = 0; i < this.entries.length; i++) {
      const en = this.entries[i];
      if (!en.pending || this.alive(en)) continue;
      if (this.spawn(en, minutes, null)) {
        en.pending = false;
        en.next += en.every;
        this.dirty = true;
      }
    }
  }

  alive(en) {
    return !!en.boss && en.boss.active && en.boss.serial === en.serial;
  }

  // pos: fixed point (debug: doesn't count as a round), else a spawn point just off-screen.
  spawn(en, minutes, pos) {
    const sys = this.sys;
    const p = pos || sys.findSpawnPoint();
    if (!p) return false;
    const e = sys.spawn(minutes, en.boss, p, 1 + en.round * KILL_BOSSES.repeatHpAdd);
    if (!e) return false;
    if (!pos) en.round++;
    en.boss = e;
    en.serial = e.serial;
    e.killBoss = en;
    return true;
  }

  // Debug: the next boss in the list, right at (x, y), counters untouched.
  spawnNext(minutes, pos) {
    const en = this.entries[this.debugIdx++ % this.entries.length];
    this.spawn(en, minutes, pos);
    return en;
  }

  onBossKilled(e, x, y) {
    const en = e.killBoss;
    e.killBoss = null;
    const h = this.sys.hooks;
    h.onPfand(en.rewardCents);
    sfx.play('pfand_big', x);
    h.popup?.show(x, y, { title: 'PFAND!!', label: `+${formatEuro(en.rewardCents)}`, bad: false, iconKey: null });
    if (en.joint) h.pickups?.spawn(x, y, 'joint', 'joint', JOINT.sprite);
  }

  // "Goblins 73/100" for the closest counters past KILL_BOSSES.hintFrom (not while their boss is due/alive).
  // Runs on kills only, not per frame.
  buildHints() {
    const list = this.entries.filter((en) => !en.pending && this.progress(en) >= KILL_BOSSES.hintFrom);
    list.sort((a, b) => this.progress(b) - this.progress(a));
    this.hintText = list.slice(0, KILL_BOSSES.maxHints).map((en) => `${en.label} ${en.count}/${en.next}`).join('\n');
  }

  progress(en) {
    return (en.count - (en.next - en.every)) / en.every;
  }
}

import { NEUTRAL_MODS, ENEMY_BODY_Y, PLAYER_CHEST_Y, aimAt, applyArt } from './common.js';
import { sfx } from '../audio/Sfx.js';

const HOLD_OUT = 34; // px from Lars to the middle of the saw art (motor at Lars, bar pointing out)
const SPARK_EVERY = 3; // sparks on every 3rd tick only (it ticks 10x per second)

// Kettensäge: while an enemy is in reach, the saw is held toward it and shreds everything in a short cone
// every `hitInterval`. Shredded enemies walk at `slowFactor` speed for `slowSeconds` (EnemySystem.slow).
export class Kettensaege {
  constructor(scene, player, enemies, sparks, stats) {
    this.scene = scene;
    this.player = player;
    this.enemies = enemies;
    this.sparks = sparks;
    this.stats = stats;
    this.tick = 0;
    this.ticks = 0;
    this.dir = { x: 1, y: 0 };
    this.cosHalf = Math.cos(Phaser.Math.DegToRad(stats.arcDeg) / 2);
    this.saw = scene.add.sprite(0, 0, `ph_${stats.fx}`).setVisible(false);
    this.saw.setActive(false);
  }

  update(dt, mods = NEUTRAL_MODS) {
    const st = this.stats;
    const p = this.player;
    const target = this.enemies.findNearest(p.x, p.y, st.range);
    if (!target) {
      if (this.saw.visible) this.saw.setVisible(false).anims.stop();
      this.tick = 0;
      return;
    }
    const angle = aimAt(p, target, this.dir);
    this.showSaw(angle);
    this.tick -= dt;
    if (this.tick > 0) return;
    this.tick = st.hitInterval * mods.cooldownMul;
    this.shred(st.damage * mods.damageMul);
    sfx.weapon(st, p.x);
  }

  showSaw(angle) {
    const s = this.saw;
    if (!s.visible) {
      applyArt(s, this.stats.fx);
      s.setVisible(true);
    }
    const p = this.player;
    const left = this.dir.x < 0;
    s.setPosition(p.x + this.dir.x * HOLD_OUT, p.y - PLAYER_CHEST_Y + 10 + this.dir.y * HOLD_OUT)
      .setRotation(angle).setFlipY(left).setDepth(p.y + (this.dir.y > -0.3 ? 2 : -2));
    if (!s.anims.isPlaying) s.y += (this.ticks & 1) ? 1 : -1; // placeholder rattle
  }

  shred(damage) {
    const st = this.stats;
    const p = this.player;
    const px = p.x;
    const py = p.y;
    this.ticks++;
    let sparked = this.ticks % SPARK_EVERY !== 0;
    const list = this.enemies.group.getChildren();
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (!e.active) continue;
      const dx = e.body.center.x - px;
      const dy = e.body.center.y - py;
      const len = Math.hypot(dx, dy);
      const r = e.body.halfWidth;
      if (len - r > st.range) continue;
      if (len > r * 2 && (dx * this.dir.x + dy * this.dir.y) / len < this.cosHalf) continue;
      if (!sparked) {
        this.sparks.play(e.body.center.x, e.body.center.y - ENEMY_BODY_Y + 6);
        sparked = true;
      }
      this.enemies.damage(e, damage, px, py, 0, 0);
      this.enemies.slow(e, st.slowFactor, st.slowSeconds); // ignores dead enemies and bosses
    }
  }

  destroy() {
    this.saw.destroy();
  }
}

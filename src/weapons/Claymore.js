import { DEPTH } from '../data/config.js';
import { NEUTRAL_MODS, ENEMY_BODY_Y, applyArt, loopAnimOf } from './common.js';
import { FxPool } from './FxPool.js';
import { shake } from './shake.js';
import { sfx } from '../audio/Sfx.js';

const BLINK = 0.25; // seconds per blink half-period once armed (placeholder)
const UNARMED_ALPHA = 0.6;
const RING_LIFE = 0.3; // placeholder explosion ring

// Claymore: while enemies are around, a mine is dropped at Lars' feet every `cooldown` (at most `maxMines` lying).
// It arms after `armSeconds`, then blows up when an enemy steps within `triggerRadius`, or anyway once it is
// `fuseSeconds` old: `damage` to everyone within `radius`, with a big shove. Lars is never hurt by it.
export class Claymore {
  constructor(scene, player, enemies, sparks, stats) {
    this.scene = scene;
    this.player = player;
    this.enemies = enemies;
    this.sparks = sparks;
    this.stats = stats;
    this.key = stats.projectile;
    this.cooldown = 0;
    this.time = 0;
    this.mines = [];
    for (let i = 0; i < stats.maxMines; i++) {
      const m = scene.add.sprite(0, 0, `ph_${this.key}`).setVisible(false).setActive(false);
      m.age = 0;
      m.armed = false;
      m.damage = 0;
      this.mines.push(m);
    }
    this.blasts = new FxPool(scene, stats.fx, stats.maxMines);
    this.rings = [];
    for (let i = 0; i < stats.maxMines; i++) this.rings.push({ life: 0, x: 0, y: 0 });
    this.ringG = scene.add.graphics().setDepth(DEPTH.fx - 42);
  }

  update(dt, mods = NEUTRAL_MODS) {
    this.time += dt;
    this.blasts.update(dt);
    this.updateMines(dt);
    this.drawRings(dt);
    this.cooldown -= dt;
    if (this.cooldown > 0) return;
    const st = this.stats;
    const p = this.player;
    if (!this.enemies.findNearest(p.x, p.y, st.range)) return;
    const m = this.freeMine();
    if (!m) return;
    this.cooldown = st.cooldown * mods.cooldownMul;
    this.drop(m, p.x, p.y, st.damage * mods.damageMul);
    sfx.weapon(st, p.x);
  }

  freeMine() {
    for (let i = 0; i < this.mines.length; i++) if (!this.mines[i].active) return this.mines[i];
    return null;
  }

  drop(m, x, y, damage) {
    const art = applyArt(m, this.key);
    m.anims.stop(); // the (blinking) animation only starts once armed
    if (art) m.setFrame('default_0'); // LED off while arming
    m.age = 0;
    m.armed = false;
    m.flying = false;
    m.damage = damage;
    m.clearTint();
    m.setPosition(x, y).setDepth(y - 2).setAlpha(UNARMED_ALPHA).setActive(true).setVisible(true);
  }

  updateMines(dt) {
    const st = this.stats;
    for (let i = 0; i < this.mines.length; i++) {
      const m = this.mines[i];
      if (!m.active) continue;
      if (m.flying) {
        this.fly(m, dt); // Minenwerfer: still in the air
        continue;
      }
      m.age += dt;
      if (!m.armed) {
        if (m.age < st.armSeconds) continue;
        m.armed = true;
        sfx.play('w_claymore_beep', m.x);
        m.setAlpha(1);
        const anim = this.scene.textures.exists(this.key) ? loopAnimOf(this.scene, this.key) : null;
        if (anim) m.play({ key: anim, repeat: -1 });
      }
      if (!m.anims.isPlaying) {
        if (Math.floor(m.age / BLINK) % 2 === 0) m.setTint(0xff4040);
        else m.clearTint();
      }
      if (m.age >= st.fuseSeconds || this.enemies.findNearest(m.x, m.y, st.triggerRadius)) this.explode(m);
    }
  }

  // Hook: Minenwerfer lobs its mines (sets m.flying); a plain Claymore never flies.
  fly() {}

  explode(m) {
    const st = this.stats;
    const x = m.x;
    const y = m.y;
    m.setActive(false).setVisible(false);
    m.anims.stop();
    const fxSize = this.blasts.available ? (this.scene.textures.get(this.blasts.key).get('default_0').width || 96) : 96;
    if (!this.blasts.play(x, y - ENEMY_BODY_Y * 0.5, 0, (st.radius * 2) / fxSize)) this.ring(x, y);
    shake(this.scene, st.shake, st.shakeMs);
    sfx.play('w_claymore_boom', x);
    const list = this.enemies.group.getChildren();
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (!e.active) continue;
      if (Math.hypot(e.body.center.x - x, e.body.center.y - y) - e.body.halfWidth > st.radius) continue;
      this.enemies.damage(e, m.damage, x, y, st.knockback, st.knockbackTime);
    }
  }

  ring(x, y) {
    for (let i = 0; i < this.rings.length; i++) {
      const r = this.rings[i];
      if (r.life > 0) continue;
      r.life = RING_LIFE;
      r.x = x;
      r.y = y;
      return;
    }
  }

  drawRings(dt) {
    const g = this.ringG;
    g.clear();
    for (let i = 0; i < this.rings.length; i++) {
      const r = this.rings[i];
      if (r.life <= 0) continue;
      r.life -= dt;
      const k = 1 - Math.max(0, r.life) / RING_LIFE;
      g.fillStyle(0xffa040, 0.5 * (1 - k));
      g.fillCircle(r.x, r.y - ENEMY_BODY_Y * 0.5, this.stats.radius * (0.4 + 0.6 * k));
    }
  }

  destroy() {
    for (let i = 0; i < this.mines.length; i++) this.mines[i].destroy();
    this.mines.length = 0;
    this.blasts.destroy();
    this.ringG.destroy();
  }
}

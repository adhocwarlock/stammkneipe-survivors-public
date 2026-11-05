import { WEAPONS } from '../data/weapons.js';
import { NEUTRAL_MODS, ENEMY_BODY_Y, aimAt } from './common.js';
import { sfx } from '../audio/Sfx.js';

const POOL_MAX = 4; // duration < cooldown, so normally only one or two are alive

// The whole Dönerspieß, launched spinning toward the nearest enemy. It flies through the crowd and grinds
// every goblin it touches, each at most once per `hitInterval`. Moved and hit-tested by hand (no physics body).
export class DoenerSpiess {
  constructor(scene, player, enemies, sparks, stats = WEAPONS.doener_spiess) {
    this.scene = scene;
    this.player = player;
    this.enemies = enemies;
    this.sparks = sparks;
    this.stats = stats;
    this.cooldown = 0;
    this.dir = { x: 1, y: 0 };
    this.pool = [];
    this.spinRad = Phaser.Math.DegToRad(stats.spinDegPerSec);
  }

  update(dt, mods = NEUTRAL_MODS) {
    this.moveSpits(dt);

    this.cooldown -= dt;
    if (this.cooldown > 0) return;
    const st = this.stats;
    const p = this.player;
    // Aim at the nearest enemy it can actually reach; with nobody around it's thrown in the facing direction.
    const target = this.enemies.findNearest(p.x, p.y, st.speed * st.duration);
    this.cooldown = st.cooldown * mods.cooldownMul;
    aimAt(p, target, this.dir);
    this.launch(p.x, p.y, this.dir.x, this.dir.y, st.damage * mods.damageMul);
    sfx.weapon(st, p.x);
  }

  launch(x, y, dx, dy, damage) {
    let s = null;
    for (let i = 0; i < this.pool.length; i++) {
      if (!this.pool[i].active) { s = this.pool[i]; break; }
    }
    if (!s) {
      if (this.pool.length >= POOL_MAX) return;
      s = this.scene.add.sprite(0, 0, 'ph_doener');
      s.lastHit = new Map(); // enemy -> age (s) of this spit when it last hit that enemy
      this.pool.push(s);
    }
    const key = this.stats.sprite;
    if (this.scene.textures.exists(key)) {
      if (s.texture.key !== key) s.setTexture(key, 'default_0');
      if (this.scene.anims.exists(`${key}_spin`)) s.play({ key: `${key}_spin`, repeat: -1 }, true);
    }
    s.gx = x; // gameplay position = ground level, drawn at body height
    s.gy = y;
    s.vx = dx * this.stats.speed;
    s.vy = dy * this.stats.speed;
    s.age = 0;
    s.damage = damage;
    s.rotation = 0;
    s.setActive(true).setVisible(true);
    this.place(s);
  }

  place(s) {
    s.setPosition(s.gx, s.gy - ENEMY_BODY_Y).setDepth(s.gy + 1);
  }

  moveSpits(dt) {
    for (let i = 0; i < this.pool.length; i++) {
      const s = this.pool[i];
      if (!s.active) continue;
      s.age += dt;
      if (s.age >= this.stats.duration) {
        this.kill(s);
        continue;
      }
      s.gx += s.vx * dt;
      s.gy += s.vy * dt;
      s.rotation += this.spinRad * dt;
      this.place(s);
      this.grind(s);
    }
  }

  // Damages every active enemy whose edge is inside `radius`, unless this spit hit it less than `hitInterval` ago.
  grind(s) {
    const st = this.stats;
    const list = this.enemies.group.getChildren();
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (!e.active) continue;
      const cx = e.body.center.x;
      const cy = e.body.center.y;
      if (Math.hypot(cx - s.gx, cy - s.gy) - e.body.halfWidth > st.radius) continue;
      const last = s.lastHit.get(e);
      if (last !== undefined && s.age - last < st.hitInterval) continue;
      s.lastHit.set(e, s.age);
      this.sparks.play(cx, cy - ENEMY_BODY_Y + 6);
      this.enemies.damage(e, s.damage, s.gx, s.gy, st.knockback, st.knockbackTime);
    }
  }

  kill(s) {
    s.setActive(false).setVisible(false);
    s.anims.stop();
    s.lastHit.clear();
  }

  destroy() {
    for (let i = 0; i < this.pool.length; i++) this.pool[i].destroy();
    this.pool.length = 0;
  }
}

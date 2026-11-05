import { NEUTRAL_MODS, ENEMY_BODY_Y } from '../common.js';
import { Bumerang } from '../Bumerang.js';
import { shake } from '../shake.js';
import { sfx } from '../../audio/Sfx.js';

const BOARD_Y = 6; // px below the feet centre (same as Gear's board)
const LAND_SHAKE = 0.006;
const LAND_SHAKE_MS = 120;

// Combo Bumerang + Skateboard: every `cooldown` (with enemies within `range`) Lars ollies over the crowd. In the
// air (`airSeconds`, up to `jumpHeight` px) he can't be hit (Player.lift); the board does a kickflip under him.
// Landing: a small shockwave and `burst` boomerangs in all directions (a Bumerang instance that never aims itself).
export class Ollie {
  constructor(scene, player, enemies, sparks, stats, ctx = {}) {
    this.scene = scene;
    this.player = player;
    this.enemies = enemies;
    this.sparks = sparks;
    this.stats = stats;
    this.weapons = ctx.weapons || null;
    this.boom = new Bumerang(scene, player, enemies, sparks, { ...stats, range: stats.boomRange });
    const key = scene.textures.exists(stats.board) ? stats.board : null;
    this.board = key ? scene.add.image(0, 0, key, 'default_0').setVisible(false) : null;
    this.cooldown = 1;
    this.air = 0;
    this.damageMul = 1;
  }

  update(dt, mods = NEUTRAL_MODS) {
    const st = this.stats;
    const p = this.player;
    this.damageMul = mods.damageMul;
    this.boom.move(dt);
    if (this.air > 0) {
      this.air -= dt;
      const t = Math.min(1, 1 - this.air / st.airSeconds);
      p.setLift(this.air > 0 ? 4 * st.jumpHeight * t * (1 - t) : 0);
      if (this.air <= 0) this.land();
    } else {
      this.cooldown -= dt;
      if (this.cooldown <= 0 && !p.dead && this.enemies.findNearest(p.x, p.y, st.range)) {
        this.cooldown = st.cooldown * mods.cooldownMul;
        this.air = st.airSeconds;
        sfx.play('w_boomerang', p.x);
      }
    }
    this.drawBoard();
  }

  land() {
    const st = this.stats;
    const p = this.player;
    shake(this.scene, LAND_SHAKE, LAND_SHAKE_MS);
    const list = this.enemies.group.getChildren();
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (!e.active) continue;
      if (Math.hypot(e.body.center.x - p.x, e.body.center.y - p.y) - e.body.halfWidth > st.landRadius) continue;
      this.sparks.play(e.body.center.x, e.body.center.y - ENEMY_BODY_Y + 6);
      this.enemies.damage(e, st.landDamage * this.damageMul, p.x, p.y, st.landKnockback, st.landKnockbackTime);
    }
    const dir = this.boom.dir;
    for (let k = 0; k < st.burst; k++) {
      const a = (k * Math.PI * 2) / st.burst;
      dir.x = Math.cos(a);
      dir.y = Math.sin(a);
      this.boom.launch(st.damage * this.damageMul);
    }
    sfx.weapon(st, p.x);
  }

  // The board under Lars (unless the Skateboard gear is worn too: that one draws its own). Kickflip in the air.
  drawBoard() {
    const b = this.board;
    if (!b) return;
    const p = this.player;
    const sp = p.sprite;
    const show = sp.visible && !p.dead && this.weapons?.gearId !== 'skateboard';
    b.setVisible(show);
    if (!show) return;
    const st = this.stats;
    const t = this.air > 0 ? 1 - this.air / st.airSeconds : 0;
    b.setPosition(p.x, p.y + BOARD_Y - p.lift).setDepth(sp.depth - 0.5).setFlipX(sp.flipX)
      .setScale(1, this.air > 0 ? Math.cos(t * Math.PI * 2) : 1);
  }

  destroy() {
    this.player.setLift?.(0);
    this.boom.destroy();
    if (this.board) this.board.destroy();
  }
}

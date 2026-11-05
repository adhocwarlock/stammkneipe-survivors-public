import { EIGENBEDARF, ENEMY_SPAWN, ENEMY_FX } from '../data/enemies.js';
import { ART } from '../data/config.js';
import { CREW } from '../data/champions.js';
import { crewDef } from '../crew/placeholders.js';
import { hitInfo } from '../crew/allyArt.js';
import { hitFrameOf } from '../crew/allyAttacks.js';
import { shake } from '../weapons/shake.js';
import { formatEuro } from '../utils/format.js';
import { sfx } from '../audio/Sfx.js';

const MAX_ATTACKS = 4;

// The Eimer's "Eigenbedarf!!!": walking in has a small chance to spawn a boss instead of opening the shop.
// The boss is a normal enemy (weapons hit it, it walks via the flow field) whose attacks run here: like hulk
// Hannah's (slam + lunge, same data shape and hit-frame timing as the crew), but they hit Lars.
// While it lives the Eimer stays shut; beating it drops a lot of Pfand.
export class EigenbedarfEvent {
  constructor(scene, { enemies, player, pickups, popup, floatingText, crewFx, hurtPlayer, onPfand }) {
    this.scene = scene;
    this.enemies = enemies;
    this.player = player;
    this.pickups = pickups;
    this.popup = popup;
    this.floatingText = floatingText;
    this.fx = crewFx;
    this.hurtPlayer = hurtPlayer; // (damage) => void
    this.onPfand = onPfand; // (cents) => void
    this.boss = null;
    this.cds = new Float32Array(MAX_ATTACKS);
    this.a = { def: null }; // shape hitFrameOf() expects
    this.lastX = 0;
    this.lastY = 0;
  }

  get active() {
    return !!this.boss;
  }

  // Walking into the Eimer door. True = the event takes over (no shop).
  onEimerDoor(doorX, doorY, minutes) {
    if (this.boss) {
      this.floatingText.show(this.player.x, this.player.y - 120, EIGENBEDARF.closedText, '#e05050');
      return true;
    }
    if (Math.random() >= EIGENBEDARF.chance) return false;
    return this.start(doorX, doorY + EIGENBEDARF.spawnBelowDoor, minutes);
  }

  start(x, y, minutes) {
    if (this.boss) return true;
    const e = this.enemies.spawn(minutes, 'eigenbedarf_boss', { x, y });
    if (!e) return false;
    this.boss = e;
    this.a.def = crewDef(e.visual.texture.split('__')[0]) || { size: [64, 72], origin: [0.5, 1], meta: {} };
    this.dmgMul = 1 + minutes * ENEMY_SPAWN.damageGrowthPerMinute;
    for (let k = 0; k < MAX_ATTACKS; k++) this.cds[k] = 1 + k;
    this.lock = 0;
    this.windup = 0;
    this.dash = 0;
    this.atk = null;
    this.popup.showBanner(EIGENBEDARF.banner, CREW.bannerSeconds);
    shake(this.scene, EIGENBEDARF.startShake, EIGENBEDARF.startShakeMs);
    return true;
  }

  update(dt) {
    const e = this.boss;
    if (!e) return;
    if (!e.active) {
      this.defeated();
      return;
    }
    this.lastX = e.body.center.x;
    this.lastY = e.body.center.y;
    const list = EIGENBEDARF.attacks;
    for (let k = 0; k < list.length; k++) this.cds[k] -= dt;
    if (this.lock > 0) {
      this.lock -= dt;
      if (this.windup > 0) {
        this.windup -= dt;
        this.telegraph(e);
        if (this.windup <= 0) this.execute();
      }
      if (this.dash > 0) this.dash -= dt;
      else if (e.knockback <= 0) e.setVelocity(0, 0);
      if (this.lock <= 0) {
        e.scripted = false;
        if (e.visual.walkAnim) e.play(e.visual.walkAnim);
      }
      return;
    }
    const p = this.player;
    const dx = p.x - this.lastX;
    const dy = p.y - this.lastY;
    const dist = Math.hypot(dx, dy) || 1;
    for (let k = 0; k < list.length; k++) {
      const atk = list[k];
      if (this.cds[k] > 0 || dist - e.body.halfWidth > atk.range) continue;
      this.startAttack(k, dx / dist, dy / dist);
      return;
    }
  }

  startAttack(k, ux, uy) {
    const e = this.boss;
    const atk = EIGENBEDARF.attacks[k];
    this.cds[k] = atk.cooldown;
    this.atk = atk;
    this.ux = ux;
    this.uy = uy;
    const key = `${e.visual.texture}_${atk.anim}`;
    const anim = this.scene.anims.exists(key) ? key : null;
    const frame = anim ? hitFrameOf(this.a, atk) : null;
    // Stands still while the telegraph shows, at least ENEMY_FX.minWindup; the anim is stretched so the art's
    // hit frame lands exactly then.
    this.windup = Math.max(ENEMY_FX.minWindup, atk.windup);
    this.windupTotal = this.windup;
    this.lock = this.windup + atk.recover;
    this.dash = 0;
    e.scripted = true; // EnemySystem stops steering it meanwhile
    sfx.ability(e.family, atk.kind, 'warn', e.x);
    e.setVelocity(0, 0);
    e.setFlipX(ux < 0);
    if (anim && frame) e.play({ key: anim, repeat: 0, frameRate: frame / this.windup });
    else if (anim) e.play({ key: anim, repeat: 0 });
    this.sx = e.body.center.x;
    this.sy = e.body.center.y;
  }

  // Wind-up warning: the lunge line / the slam circle (EnemySystem's telegraph layer).
  telegraph(e) {
    const atk = this.atk;
    const fx = this.enemies.fx;
    const p = 1 - Math.max(0, this.windup) / (this.windupTotal || 1);
    if (atk.kind === 'line') {
      fx.aimLine(this.sx, this.sy, this.sx + this.ux * atk.length, this.sy + this.uy * atk.length, p);
    } else {
      const reach = this.slamReach(atk);
      fx.slamCircle(e.body.center.x + this.ux * reach, e.body.center.y + this.uy * reach, atk.radius, p, atk.ring);
    }
  }

  slamReach(atk) {
    const hit = hitInfo(this.a.def, atk.anim);
    return hit.x !== null ? Math.abs(hit.x - this.a.def.size[0] / 2) * ART.scale : atk.offset;
  }

  execute() {
    const e = this.boss;
    const atk = this.atk;
    const cx = e.body.center.x;
    const cy = e.body.center.y;
    const p = this.player;
    const dmg = atk.damage * this.dmgMul;
    sfx.ability(e.family, atk.kind, 'hit', cx);
    if (atk.kind === 'circle') {
      // Impact in front of it (art point if the sprite has one).
      const reach = this.slamReach(atk);
      const x = cx + this.ux * reach;
      const y = cy + this.uy * reach;
      this.fx.ring(x, y, atk.radius, atk.ring);
      if (Math.hypot(p.x - x, p.y - y) <= atk.radius) this.hurtPlayer(dmg);
    } else if (atk.kind === 'line') {
      // The telegraphed line: hit if Lars is still on it, then he dashes along it.
      const x1 = this.sx + this.ux * atk.length;
      const y1 = this.sy + this.uy * atk.length;
      if (distToSegment(p.x, p.y, this.sx, this.sy, x1, y1) <= atk.width / 2) this.hurtPlayer(dmg);
      if (atk.dash) {
        const v = atk.length / atk.dashSeconds;
        this.dash = atk.dashSeconds;
        this.lock = Math.max(this.lock, atk.dashSeconds);
        e.setVelocity(this.ux * v, this.uy * v);
      }
      this.fx.ring(cx, cy, 50, 0xffffff);
    }
    if (atk.shake) shake(this.scene, atk.shake, atk.shakeMs);
  }

  // Beaten: big Pfand drop + bottles, the Eimer opens again.
  defeated() {
    this.boss = null;
    const ev = EIGENBEDARF;
    const x = this.lastX;
    const y = this.lastY;
    this.onPfand(ev.rewardCents);
    sfx.play('pfand_big', x);
    this.popup.show(x, y, { title: 'PFAND!!', label: `+${formatEuro(ev.rewardCents)}`, bad: false, iconKey: null });
    for (let i = 0; i < ev.rewardBottles; i++) {
      const a = (i / ev.rewardBottles) * Math.PI * 2;
      this.pickups.dropBeer(x + Math.cos(a) * ev.rewardSpread, y + Math.sin(a) * ev.rewardSpread * 0.6);
    }
    shake(this.scene, ev.rewardShake, ev.rewardShakeMs);
  }
}

function distToSegment(px, py, x0, y0, x1, y1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const t = Phaser.Math.Clamp(((px - x0) * dx + (py - y0) * dy) / (dx * dx + dy * dy || 1), 0, 1);
  return Math.hypot(px - (x0 + dx * t), py - (y0 + dy * t));
}

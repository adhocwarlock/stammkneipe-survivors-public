import { ENEMY_FX } from '../../data/enemies.js';
import { shake } from '../../weapons/shake.js';
import { toWorld } from '../../crew/allyArt.js';
import { sfx } from '../../audio/Sfx.js';

const MAX_ABILITIES = 4;
const WINDUP = 0;
const ACTIVE = 1;
const RECOVER = 2;
const DEG = Math.PI / 180;
const HOLD_FPS = 8; // frames per second for meta.<anim>Frames loops

// Telegraphed monster attacks (data: ENEMY_TYPES.*.abilities). One runs at a time per enemy; state lives on
// the enemy (ab* fields). Phases: wind-up (stands still, telegraph drawn) -> active (dash, burst, breath) ->
// recover. Damage goes through sys.hooks (the scene), so armour, invulnerability and tester mode apply.
export class Abilities {
  constructor(sys) {
    this.sys = sys;
    this.fx = sys.fx;
    this.scene = sys.scene;
    this.pt = { x: 0, y: 0 };
    this.src = { x: 0, y: 0 };
  }

  // Where ability k of e starts on screen: the art point (wizard muzzle, dragon mouth), mirrored with the
  // sprite; else `fromY` px above the feet circle. Written into this.src.
  source(e, k, ab, cx, cy) {
    const pt = e.visual.abPoint?.[k];
    if (pt) return toWorld(e, e.visual.def, pt, this.src);
    this.src.x = cx + e.abUx * 16;
    this.src.y = cy - (ab.fromY ?? ENEMY_FX.bodyY) * e.scaleY;
    return this.src;
  }

  // Ground distance from the body centre to the hit (art meta point if there is one, else ab.offset).
  reach(e, k, ab) {
    return (e.visual.abReach?.[k] ?? ab.offset) * e.scaleX;
  }

  // Fresh spawn: cooldowns start at firstDelay (or a random part of the cooldown, so groups don't sync).
  init(e) {
    if (!e.abCd) e.abCd = new Float32Array(MAX_ABILITIES);
    e.abIdx = -1;
    e.abOnce = 0;
    const list = e.abilities;
    if (!list) return;
    for (let k = 0; k < list.length && k < MAX_ABILITIES; k++) {
      const ab = list[k];
      e.abCd[k] = ab.firstDelay ?? ab.cooldown * (0.3 + Math.random() * 0.7);
    }
  }

  cool(e, dt) {
    const n = Math.min(e.abilities.length, MAX_ABILITIES);
    for (let k = 0; k < n; k++) if (e.abCd[k] > 0) e.abCd[k] -= dt;
  }

  // Starts the first ready ability whose range fits. True = it's running now (no normal steering).
  tryStart(e, player, cx, cy) {
    const list = e.abilities;
    const dx = player.x - cx;
    const dy = player.y - cy;
    const dist = Math.hypot(dx, dy) || 1;
    const n = Math.min(list.length, MAX_ABILITIES);
    for (let k = 0; k < n; k++) {
      const ab = list[k];
      if (e.abCd[k] > 0 || (e.abOnce & (1 << k))) continue;
      if (dist > ab.range || dist < (ab.minRange || 0)) continue;
      if (ab.kind === 'summon' && e.minions >= ab.maxMinions) continue;
      if (ab.los && !this.sys.lineOfSight(cx, cy, player.x, player.y)) {
        e.abCd[k] = 0.3; // look again shortly
        continue;
      }
      this.start(e, k, ab, dx / dist, dy / dist, player, cx, cy);
      return true;
    }
    return false;
  }

  start(e, k, ab, ux, uy, player, cx, cy) {
    e.abIdx = k;
    e.abPhase = WINDUP;
    e.abWindup = Math.max(ab.windup, ENEMY_FX.minWindup);
    e.abT = e.abWindup;
    e.abUx = ux;
    e.abUy = uy;
    e.abTx = player.x; // locked target (dodge by moving during the wind-up)
    e.abTy = player.y;
    e.abN = 0;
    e.abTick = 0;
    e.abCd[k] = ab.cooldown;
    if (ab.once) e.abOnce |= 1 << k;
    e.setVelocity(0, 0);
    e.setFlipX(ux < 0);
    const anim = e.visual.abAnims?.[k];
    // With art: stretch the anim so its hit frame lands exactly when the wind-up ends.
    const hitFrame = e.visual.abHit?.[k];
    if (anim && hitFrame) e.play({ key: anim, repeat: 0, frameRate: hitFrame / e.abWindup });
    else if (anim) e.play({ key: anim, repeat: ab.kind === 'burst' ? -1 : 0 }); // minigun keeps spinning
    if (ab.kind === 'summon' && ab.circleFx) this.fx.circle(cx, cy, e.abWindup, e.scaleX);
    sfx.ability(e.family, ab.kind, 'warn', cx);
  }

  // Ends the running ability (also used on recycle).
  stop(e) {
    if (e.abIdx < 0) return;
    e.abIdx = -1;
    e.breathing = false;
    if (e.active && e.visual.walkAnim) e.play(e.visual.walkAnim);
  }

  tick(e, dt, player) {
    const ab = e.abilities[e.abIdx];
    const cx = e.body.center.x;
    const cy = e.body.center.y;
    const free = e.knockback <= 0;
    e.abT -= dt;
    if (e.abPhase === WINDUP) {
      if (free) e.setVelocity(0, 0);
      this.telegraph(e, ab, cx, cy, 1 - Math.max(0, e.abT) / e.abWindup);
      if (e.abT <= 0) this.execute(e, ab, cx, cy, player);
      return;
    }
    if (e.abPhase === ACTIVE) {
      this.active(e, ab, cx, cy, player, dt, free);
      return;
    }
    if (free) e.setVelocity(0, 0);
    if (e.abT <= 0) this.stop(e);
  }

  recover(e, ab) {
    e.breathing = false;
    e.abPhase = RECOVER;
    e.abT = ab.recover ?? 0.2;
  }

  // ---- wind-up telegraphs ----

  telegraph(e, ab, cx, cy, p) {
    const fx = this.fx;
    const k = e.abIdx;
    switch (ab.kind) {
      case 'lunge': {
        const len = ab.dashSpeed * ab.dashSeconds;
        fx.aimLine(cx, cy, cx + e.abUx * len, cy + e.abUy * len, p);
        break;
      }
      case 'beam':
      case 'burst': {
        const s = this.source(e, k, ab, cx, cy);
        this.aimEnd(s.x, s.y, e.abTx, e.abTy - ENEMY_FX.playerChestY, ab.range);
        fx.aimLine(s.x, s.y, this.pt.x, this.pt.y, p, ab.color ?? ENEMY_FX.aimColor);
        if (ab.kind === 'burst') fx.flash(s.x + e.abUx * 14, s.y, 4 + p * 4, ENEMY_FX.spinFlashColor);
        break;
      }
      case 'zap': {
        const s = this.source(e, k, ab, cx, cy);
        fx.flash(s.x, s.y, 3 + p * 5, ab.color);
        break;
      }
      case 'fan': {
        const base = Math.atan2(e.abUy, e.abUx);
        const spread = ab.spreadDeg * DEG;
        for (let i = 0; i < ab.count; i++) {
          const a = base + (ab.count > 1 ? (i / (ab.count - 1) - 0.5) * spread : 0);
          fx.aimLine(cx, cy, cx + Math.cos(a) * ab.range * 0.5, cy + Math.sin(a) * ab.range * 0.5, p);
        }
        break;
      }
      case 'slam': {
        const off = this.reach(e, k, ab);
        fx.slamCircle(cx + e.abUx * off, cy + e.abUy * off, ab.radius, p, ab.color);
        break;
      }
      case 'cone':
        fx.cone(cx, cy, Math.atan2(e.abUy, e.abUx), ab.halfAngleDeg * DEG, ab.length, ENEMY_FX.coneAlpha * (0.4 + p));
        break;
      case 'howl':
        fx.slamCircle(cx, cy, ab.radius * p, 1, ab.color);
        break;
      default:
        break;
    }
  }

  // Point at distance `range` from (x0, y0) through (x1, y1) (screen space), into this.pt.
  aimEnd(x0, y0, x1, y1, range) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len = Math.hypot(dx, dy) || 1;
    this.pt.x = x0 + (dx / len) * range;
    this.pt.y = y0 + (dy / len) * range;
  }

  // ---- the hit ----

  execute(e, ab, cx, cy, player) {
    const sys = this.sys;
    const hooks = sys.hooks;
    const dmg = (ab.damage || 0) * e.dmgMul;
    const k = e.abIdx;
    sfx.ability(e.family, ab.kind, 'hit', cx);
    switch (ab.kind) {
      case 'lunge':
      case 'burst':
      case 'cone':
        e.abPhase = ACTIVE;
        e.abT = ab.kind === 'lunge' ? ab.dashSeconds : ab.kind === 'cone' ? ab.duration : ab.shots * ab.every + 0.05;
        e.abTick = 0;
        e.abN = 0;
        if (ab.kind === 'cone') e.breathing = true;
        return;
      case 'beam': {
        // Ground line along the locked direction, cut at the first wall; Lars is hit if he's still on it.
        const len = this.wallClip(cx, cy, e.abUx, e.abUy, ab.range);
        const x1 = cx + e.abUx * len;
        const y1 = cy + e.abUy * len;
        const hit = distToSegment(player.x, player.y, cx, cy, x1, y1) <= ab.width / 2 + player.sprite.body.halfWidth;
        const s = this.source(e, k, ab, cx, cy);
        this.aimEnd(s.x, s.y, e.abTx, e.abTy - ENEMY_FX.playerChestY, len);
        this.fx.beam(ab.fx, s.x, s.y, this.pt.x, this.pt.y, ab.showSeconds);
        if (hit) {
          hooks.hurtPlayer(dmg);
          if (ab.slow) hooks.slowPlayer(ab.slow.mul, ab.slow.seconds);
          this.fx.hit(ab.hitFx, player.x, player.y - ENEMY_FX.playerChestY);
        }
        break;
      }
      case 'zap': {
        const reach = Math.hypot(player.x - cx, player.y - cy) - player.sprite.body.halfWidth;
        const s = this.source(e, k, ab, cx, cy);
        const sx = s.x;
        const sy = s.y;
        if (reach <= ab.reach) {
          this.fx.bolt(sx, sy, player.x, player.y - ENEMY_FX.playerChestY, ab.color);
          hooks.hurtPlayer(dmg);
        } else {
          this.fx.bolt(sx, sy, sx + e.abUx * ab.reach * 0.5, sy + e.abUy * ab.reach * 0.5, ab.color); // fizzles
        }
        break;
      }
      case 'slam': {
        const off = this.reach(e, k, ab);
        const x = cx + e.abUx * off;
        const y = cy + e.abUy * off;
        this.fx.ring(x, y, ab.radius, ab.color);
        if (Math.hypot(player.x - x, player.y - y) <= ab.radius) hooks.hurtPlayer(dmg);
        if (ab.shake) shake(this.scene, ab.shake, ab.shakeMs);
        break;
      }
      case 'fan': {
        const base = Math.atan2(e.abUy, e.abUx);
        const spread = ab.spreadDeg * DEG;
        const shotDmg = Math.round(dmg);
        for (let i = 0; i < ab.count; i++) {
          const a = base + (ab.count > 1 ? (i / (ab.count - 1) - 0.5) * spread : 0);
          sys.projectiles.fire(ab.projectile, cx, cy, cx + Math.cos(a) * 100, cy + Math.sin(a) * 100, shotDmg, ab.speed);
        }
        break;
      }
      case 'summon':
        sys.summon(e, ab, cx, cy);
        break;
      case 'howl':
        this.fx.ring(cx, cy, ab.radius, ab.color);
        sys.buffFamily(ab.family, cx, cy, ab.radius, ab.speedMul, ab.seconds);
        break;
      default:
        break;
    }
    this.recover(e, ab);
  }

  // ---- abilities with a duration ----

  active(e, ab, cx, cy, player, dt, free) {
    const sys = this.sys;
    // Art frames to loop while it runs (dragon meta.breathFrames).
    const hold = e.visual.abHold?.[e.abIdx];
    if (hold) {
      e.abHoldT = (e.abHoldT || 0) + dt;
      e.anims.stop();
      e.setFrame(hold[Math.floor(e.abHoldT * HOLD_FPS) % hold.length]);
    }
    if (ab.kind === 'lunge') {
      if (free) e.setVelocity(e.abUx * ab.dashSpeed, e.abUy * ab.dashSpeed);
    } else if (free) {
      e.setVelocity(0, 0);
    }
    if (ab.kind === 'burst') {
      e.abTick -= dt;
      if (e.abTick <= 0 && e.abN < ab.shots) {
        e.abTick += ab.every;
        e.abN++;
        const a = Math.atan2(player.y - cy, player.x - cx) + (Math.random() * 2 - 1) * ab.spreadDeg * DEG;
        e.setFlipX(Math.cos(a) < 0);
        const s = this.source(e, e.abIdx, ab, cx, cy);
        // EnemyProjectiles draws shots shotHeight above their ground point: start at the gun, roughly.
        sys.projectiles.fire(ab.projectile, cx + Math.cos(a) * 24, cy + Math.sin(a) * 24,
          cx + Math.cos(a) * 200, cy + Math.sin(a) * 200, Math.round(ab.damage * e.dmgMul), ab.speed);
        this.fx.flash(s.x + Math.cos(a) * 10, s.y, 6, ENEMY_FX.spinFlashColor);
      }
    } else if (ab.kind === 'cone') {
      const angle = Math.atan2(e.abUy, e.abUx);
      const half = ab.halfAngleDeg * DEG;
      this.fx.cone(cx, cy, angle, half, ab.length, ENEMY_FX.coneAlpha * 0.6);
      e.abN -= dt;
      if (e.abN <= 0) {
        e.abN = ENEMY_FX.flameEvery;
        const a = angle + (Math.random() * 2 - 1) * half * 0.8;
        if (e.visual.abPoint?.[e.abIdx]) {
          const m = this.source(e, e.abIdx, ab, cx, cy); // the art's mouth: flames start there, sink to the ground
          this.fx.flame(m.x, cy, Math.max(0, cy - m.y), Math.cos(a), Math.sin(a));
        } else {
          const mx = cx + e.abUx * (ab.mouthX ?? 0) * e.scaleX;
          this.fx.flame(mx, cy, (ab.mouthY ?? ENEMY_FX.bodyY) * e.scaleY, Math.cos(a), Math.sin(a));
        }
      }
      e.abTick -= dt;
      if (e.abTick <= 0) {
        e.abTick = ab.tick;
        if (inCone(player.x - cx, player.y - cy, angle, half, ab.length)) {
          sys.hooks.hurtPlayer(ab.damage * e.dmgMul);
          if (ab.burn) sys.hooks.ignitePlayer(ab.burn.dps * e.dmgMul, ab.burn.seconds);
        }
      }
    }
    if (e.abT <= 0) this.recover(e, ab);
  }

  // How far a straight line from (x, y) along (ux, uy) gets before a wall (tile steps), max `range`.
  wallClip(x, y, ux, uy, range) {
    const town = this.sys.town;
    const grid = town.grid;
    const step = town.px / 2;
    for (let d = step; d < range; d += step) {
      const tx = Math.floor((x + ux * d) / town.px);
      const ty = Math.floor((y + uy * d) / town.px);
      if (!grid.inside(tx, ty) || grid.isSolidTile(tx, ty)) return d;
    }
    return range;
  }
}

function inCone(dx, dy, angle, half, length) {
  const d = Math.hypot(dx, dy);
  if (d > length) return false;
  if (d < ENEMY_FX.coneMinRadius) return true;
  let diff = Math.atan2(dy, dx) - angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return Math.abs(diff) <= half;
}

export function distToSegment(px, py, x0, y0, x1, y1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const t = Phaser.Math.Clamp(((px - x0) * dx + (py - y0) * dy) / (dx * dx + dy * dy || 1), 0, 1);
  return Math.hypot(px - (x0 + dx * t), py - (y0 + dy * t));
}

import { DEPTH } from '../../data/config.js';
import { ENEMY_FX } from '../../data/enemies.js';
import { enemyDef } from './placeholders.js';

// Monster telegraphs and effects, all pooled:
// - telegraphs (aim lines, cones, slam circles, spin-up flashes) are redrawn every frame into one Graphics;
// - beams (frost ray, laser) = rows of segment images; bolts + rings = small fixed arrays drawn into a Graphics;
// - flames (dragon breath), wizard shields, summon circles, hit sparks = pooled sprites.
export class EnemyFx {
  constructor(scene) {
    this.scene = scene;
    this.tg = scene.add.graphics().setDepth(DEPTH.above - 3);
    this.g = scene.add.graphics().setDepth(DEPTH.above - 2);
    this.time = 0;

    this.beams = [];
    for (let i = 0; i < ENEMY_FX.maxBeams; i++) this.beams.push({ life: 0, segs: [], frames: 1, frameT: 0, frame: 0, key: null });

    const n = ENEMY_FX.boltSegments + 1;
    this.bolts = [];
    for (let i = 0; i < ENEMY_FX.maxBolts; i++) this.bolts.push({ life: 0, color: 0, pts: new Float32Array(n * 2) });
    this.rings = [];
    for (let i = 0; i < ENEMY_FX.maxRings; i++) this.rings.push({ life: 0, x: 0, y: 0, r: 0, color: 0 });

    this.flames = [];
    this.flameAnim = scene.anims.exists('fx_flame_default') ? 'fx_flame_default' : null;
    this.shields = [];
    this.circles = [];
    this.circleOrigin = enemyDef('fx_summon_circle')?.origin || [0.5, 0.5];
    this.hits = [];
  }

  // ---- telegraphs (call every frame while winding up; cleared in beginFrame) ----

  beginFrame(dt) {
    this.time += dt;
    this.tg.clear();
  }

  // Pulsing red aim line; progress 0..1 makes it thicker towards the shot.
  aimLine(x0, y0, x1, y1, progress, color = ENEMY_FX.aimColor) {
    const pulse = 0.6 + 0.4 * Math.sin(this.time * ENEMY_FX.aimPulseHz * Math.PI * 2);
    this.tg.lineStyle(ENEMY_FX.aimWidth + progress * 2, color, ENEMY_FX.aimAlpha * pulse);
    this.tg.lineBetween(x0, y0, x1, y1);
  }

  // Filled cone on the ground (dragon breath). angle = direction, half = half-angle (rad).
  cone(x, y, angle, half, length, alpha) {
    const tg = this.tg;
    tg.fillStyle(ENEMY_FX.coneColor, alpha);
    tg.beginPath();
    tg.moveTo(x, y);
    const steps = 6;
    for (let k = 0; k <= steps; k++) {
      const a = angle - half + (2 * half * k) / steps;
      tg.lineTo(x + Math.cos(a) * length, y + Math.sin(a) * length);
    }
    tg.closePath();
    tg.fillPath();
  }

  // Slam warning: outline + a filling disc as the hit comes closer.
  slamCircle(x, y, r, progress, color) {
    this.tg.lineStyle(2, color, 0.7);
    this.tg.strokeCircle(x, y, r);
    this.tg.fillStyle(color, ENEMY_FX.slamAlpha);
    this.tg.fillCircle(x, y, r * progress);
  }

  // Flashing dot (minigun spin-up, staff glow).
  flash(x, y, r, color) {
    const on = Math.sin(this.time * 30) > 0;
    this.tg.fillStyle(color, on ? 0.9 : 0.35);
    this.tg.fillCircle(x, y, r);
  }

  // ---- timed effects ----

  ring(x, y, radius, color) {
    const ring = oldest(this.rings);
    ring.life = ENEMY_FX.ringSeconds;
    ring.x = x;
    ring.y = y;
    ring.r = radius;
    ring.color = color;
  }

  // Jagged lightning from (x0, y0) to (x1, y1).
  bolt(x0, y0, x1, y1, color) {
    const b = oldest(this.bolts);
    b.life = ENEMY_FX.boltSeconds;
    b.color = color;
    const n = ENEMY_FX.boltSegments;
    const j = ENEMY_FX.boltJitter;
    for (let k = 0; k <= n; k++) {
      const f = k / n;
      const off = k === 0 || k === n ? 0 : (Math.random() * 2 - 1) * j;
      b.pts[k * 2] = x0 + (x1 - x0) * f + off;
      b.pts[k * 2 + 1] = y0 + (y1 - y0) * f + off;
    }
  }

  // A beam of tiled segments of texture `key` (frames default_0..n) from (x0, y0) to (x1, y1).
  beam(key, x0, y0, x1, y1, seconds) {
    if (!this.scene.textures.exists(key)) return;
    const b = oldest(this.beams);
    const tex = this.scene.textures.get(key);
    if (!tex.has('default_0')) return;
    const fw = tex.get('default_0').width;
    const len = Math.hypot(x1 - x0, y1 - y0);
    const n = Math.max(1, Math.ceil(len / fw));
    const ux = (x1 - x0) / (len || 1);
    const uy = (y1 - y0) / (len || 1);
    const angle = Math.atan2(uy, ux);
    while (b.segs.length < n) b.segs.push(this.scene.add.image(0, 0, key, 'default_0').setOrigin(0, 0.5));
    b.key = key;
    b.names = this.frameNames(key);
    b.frames = b.names.length;
    b.frame = 0;
    b.frameT = 0;
    b.life = seconds;
    for (let k = 0; k < b.segs.length; k++) {
      const s = b.segs[k];
      if (k >= n) {
        s.setVisible(false);
        continue;
      }
      const rest = Math.min(fw, len - k * fw);
      s.setTexture(key, 'default_0').setPosition(x0 + ux * k * fw, y0 + uy * k * fw).setRotation(angle)
        .setScale(rest / fw, 1).setDepth(DEPTH.above - 1).setAlpha(1).setVisible(true)
        .setBlendMode(Phaser.BlendModes.ADD);
    }
  }

  // ['default_0', 'default_1', ...] of a texture, cached (no strings built per frame).
  frameNames(key) {
    this.names = this.names || {};
    if (!this.names[key]) {
      const tex = this.scene.textures.get(key);
      const list = [];
      while (tex.has(`default_${list.length}`)) list.push(`default_${list.length}`);
      this.names[key] = list;
    }
    return this.names[key];
  }

  // One-shot hit sprite (fx_frost_hit...) at (x, y).
  hit(key, x, y) {
    if (!key || !this.scene.textures.exists(key)) return;
    const s = takeSprite(this.scene, this.hits, key, ENEMY_FX.maxBeams);
    if (!s) return;
    if (s.texture.key !== key) s.setTexture(key, firstFrame(this.scene, key));
    s.setPosition(x, y).setDepth(DEPTH.above - 1).setOrigin(0.5).setBlendMode(Phaser.BlendModes.ADD);
    s.life = 0.3;
    const anim = `${key}_default`;
    if (this.scene.anims.exists(anim)) s.play({ key: anim, repeat: 0 });
  }

  // Dragon flame: flies along (ux, uy) from ground point (x, y), drawn `height` px up, sinking to the ground.
  flame(x, y, height, ux, uy) {
    if (!this.scene.textures.exists('fx_flame')) return;
    const s = takeSprite(this.scene, this.flames, 'fx_flame', ENEMY_FX.maxFlames);
    if (!s) return;
    s.gx = x;
    s.gy = y;
    s.h0 = height;
    s.vx = ux * ENEMY_FX.flameSpeed;
    s.vy = uy * ENEMY_FX.flameSpeed;
    s.life = ENEMY_FX.flameLife;
    s.setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.above - 1).setRotation(Math.atan2(uy, ux)).setScale(1.5);
    if (this.flameAnim) s.play({ key: this.flameAnim, repeat: -1 });
  }

  // Summoning circle under a necromancer, for `seconds`.
  circle(x, y, seconds, scale) {
    if (!this.scene.textures.exists('fx_summon_circle')) return;
    const s = takeSprite(this.scene, this.circles, 'fx_summon_circle', ENEMY_FX.maxCircles);
    if (!s) return;
    s.setPosition(x, y).setDepth(y - 1).setScale(scale).setOrigin(this.circleOrigin[0], this.circleOrigin[1]);
    s.life = seconds;
    if (this.scene.anims.exists('fx_summon_circle_default')) s.play({ key: 'fx_summon_circle_default', repeat: -1 });
  }

  // ---- wizard shield bubble (follows its owner, stage = hits left) ----

  attachShield(e) {
    if (!this.scene.textures.exists('fx_magic_shield')) return;
    const s = takeSprite(this.scene, this.shields, 'fx_magic_shield', ENEMY_FX.maxShields);
    if (!s) return;
    s.owner = e;
    s.serial = e.serial;
    s.breaking = false;
    s.life = Infinity;
    s.setOrigin(0.5, 1).setAlpha(0.8).setBlendMode(Phaser.BlendModes.ADD);
    e.shieldFx = s;
    this.setShieldStage(e);
  }

  setShieldStage(e) {
    const s = e.shieldFx;
    if (!s) return;
    const full = e.shieldMax;
    const left = e.shield;
    if (left <= 0) {
      s.breaking = true;
      s.life = 0.4;
      e.shieldFx = null;
      if (this.scene.anims.exists('fx_magic_shield_break')) s.play({ key: 'fx_magic_shield_break', repeat: 0 });
      else s.setFrame(s.texture.has('break_0') ? 'break_0' : 'full_0');
      return;
    }
    const lost = full - left;
    const stage = lost <= 0 ? 'full' : lost === 1 ? 'crack1' : 'crack2';
    const anim = `fx_magic_shield_${stage}`; // per hit only, not per frame
    if (this.scene.anims.exists(anim)) {
      s.play({ key: anim, repeat: -1 });
    } else {
      s.anims.stop();
      s.setFrame(s.texture.has(`${stage}_0`) ? `${stage}_0` : 'full_0');
    }
  }

  update(dt) {
    for (let i = 0; i < this.beams.length; i++) {
      const b = this.beams[i];
      if (b.life <= 0) continue;
      b.life -= dt;
      b.frameT += dt;
      const fade = b.life <= 0;
      if (b.frameT >= ENEMY_FX.beamFrameSeconds && b.frames > 1) {
        b.frameT = 0;
        b.frame = (b.frame + 1) % b.frames;
      }
      for (let k = 0; k < b.segs.length; k++) {
        const s = b.segs[k];
        if (!s.visible) continue;
        if (fade) s.setVisible(false);
        else s.setFrame(b.names[b.frame]);
      }
    }
    for (let i = 0; i < this.flames.length; i++) {
      const s = this.flames[i];
      if (!s.visible) continue;
      s.life -= dt;
      if (s.life <= 0) {
        s.setVisible(false);
        s.anims.stop();
        continue;
      }
      s.gx += s.vx * dt;
      s.gy += s.vy * dt;
      const f = s.life / ENEMY_FX.flameLife; // 1 -> 0
      s.setPosition(s.gx, s.gy - s.h0 * f).setAlpha(Math.min(1, f * 2)).setScale(1.5 + (1 - f) * 1.5);
    }
    tickLife(this.hits, dt);
    tickLife(this.circles, dt);
    for (let i = 0; i < this.shields.length; i++) {
      const s = this.shields[i];
      if (!s.visible) continue;
      const o = s.owner;
      if (s.breaking) {
        s.life -= dt;
        if (s.life <= 0) s.setVisible(false);
      } else if (!o.active || o.serial !== s.serial) {
        s.setVisible(false);
        if (o.shieldFx === s) o.shieldFx = null;
        continue;
      }
      s.setPosition(o.x, o.y + 2).setScale(o.scaleX).setDepth(o.depth + 0.5);
    }

    const g = this.g;
    g.clear();
    for (let i = 0; i < this.rings.length; i++) {
      const r = this.rings[i];
      if (r.life <= 0) continue;
      r.life -= dt;
      const t = 1 - r.life / ENEMY_FX.ringSeconds;
      g.lineStyle(4 * (1 - t) + 1, r.color, 1 - t);
      g.strokeEllipse(r.x, r.y, r.r * 2 * (0.4 + 0.6 * t), r.r * 1.5 * (0.4 + 0.6 * t));
    }
    const n = ENEMY_FX.boltSegments;
    for (let i = 0; i < this.bolts.length; i++) {
      const b = this.bolts[i];
      if (b.life <= 0) continue;
      b.life -= dt;
      const a = Math.max(0, b.life / ENEMY_FX.boltSeconds);
      g.lineStyle(5, b.color, a * 0.4);
      for (let k = 0; k < n; k++) g.lineBetween(b.pts[k * 2], b.pts[k * 2 + 1], b.pts[k * 2 + 2], b.pts[k * 2 + 3]);
      g.lineStyle(2, 0xffffff, a);
      for (let k = 0; k < n; k++) g.lineBetween(b.pts[k * 2], b.pts[k * 2 + 1], b.pts[k * 2 + 2], b.pts[k * 2 + 3]);
    }
  }

  pauseAnims() {
    for (const list of [this.flames, this.shields, this.circles, this.hits]) {
      for (let i = 0; i < list.length; i++) list[i].anims.pause();
    }
  }
}

function oldest(list) {
  let best = list[0];
  for (let i = 0; i < list.length; i++) {
    if (list[i].life <= 0) return list[i];
    if (list[i].life < best.life) best = list[i];
  }
  return best;
}

function takeSprite(scene, list, key, max) {
  for (let i = 0; i < list.length; i++) {
    if (!list[i].visible) return list[i].setVisible(true).setAlpha(1);
  }
  if (list.length >= max) return null;
  const s = scene.add.sprite(0, 0, key, firstFrame(scene, key));
  list.push(s);
  return s;
}

function firstFrame(scene, key) {
  const tex = scene.textures.get(key);
  for (const f of ['default_0', 'full_0', 'walk_0']) if (tex.has(f)) return f;
  return undefined;
}

function tickLife(list, dt) {
  for (let i = 0; i < list.length; i++) {
    const s = list[i];
    if (!s.visible) continue;
    s.life -= dt;
    if (s.life <= 0) {
      s.setVisible(false);
      s.anims.stop();
    }
  }
}

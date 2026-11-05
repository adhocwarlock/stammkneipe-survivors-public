import { ART } from '../data/config.js';
import { CREW } from '../data/champions.js';
import { PhotoHead, frameInfo } from '../entities/PhotoHead.js';
import { shake } from '../weapons/shake.js';
import { crewDef } from './placeholders.js';
import { firstFrame } from './CrewFx.js';
import { AllyLights } from './allyArt.js';
import { executeAttack, hitFrameOf } from './allyAttacks.js';
import { Steering } from './Steering.js';
import { sfx } from '../audio/Sfx.js';

const MAX_ATTACKS = 4;
const STILL = 'still'; // "animation" for sprites without an idle/walk anim: just the first walk frame

// Pooled allies (champions + summons). They're invulnerable; enemies ignore them.
// States: 'script' (a champion sequence moves it), 'goto' (run to a point), 'fight' (AI), 'leave'.
// Fight AI: find the nearest enemy, run at it, use the first ready attack whose range fits (data-driven,
// see data/champions.js), otherwise stay near Lars. After `life` seconds it leaves.
export class AllySystem {
  constructor(scene, { player, enemies, town, area, fx }) {
    this.scene = scene;
    this.player = player;
    this.enemies = enemies;
    this.area = area;
    this.fx = fx;
    this.steering = new Steering(town, enemies.flow);
    this.group = scene.physics.add.group();
    this.allies = [];
    const hasShadow = scene.textures.exists('shadow');
    for (let i = 0; i < CREW.maxAllies; i++) {
      const sprite = this.group.create(0, 0, '__DEFAULT');
      sprite.disableBody(true, true);
      this.allies.push({
        sprite,
        head: new PhotoHead(scene),
        shadow: hasShadow ? scene.add.image(0, 0, 'shadow').setDepth(-1).setVisible(false) : null,
        lights: new AllyLights(scene),
        active: false,
        cds: new Float32Array(MAX_ATTACKS),
        attacks: [],
      });
    }
    scene.physics.add.collider(this.group, town.walls);
  }

  // cfg: { photo (texture key, null = no photo head), head (size/anchor, data championHead), headScale, speed,
  //        attacks, life, shadowScale, halo,
  //        leave ('run' | 'fade' | 'sink'), stepShake/stepShakeMs (ground shakes while walking: on the walk
  //        frames listed in meta.shakeFrames.walk, else every stepEvery seconds) }
  spawn(key, x, y, cfg) {
    let a = null;
    for (let i = 0; i < this.allies.length && !a; i++) if (!this.allies[i].active) a = this.allies[i];
    if (!a) return null;
    a.active = true;
    a.cfg = cfg;
    a.sprite.enableBody(true, x, y, true, true);
    a.sprite.setAlpha(1).setFlipX(x > this.player.x).clearTint();
    this.setBody(a, key, cfg.headScale ?? 1, cfg.photo ?? null);
    this.setAttacks(a, cfg.attacks);
    a.speed = cfg.speed ?? CREW.defaultSpeed;
    a.life = cfg.life ?? CREW.allyLife;
    a.state = 'script';
    a.target = null;
    a.retarget = 0;
    a.lock = 0;
    a.windup = 0;
    a.dash = 0;
    a.atk = null;
    a.ux = 1;
    a.uy = 0;
    a.leaveT = 0;
    a.stepT = 0;
    a.arrived = false;
    a.gotoT = 0;
    a.gotoMax = 0;
    a.animLock = 0;
    a.losT = 0;
    a.blocked = false;
    if (a.shadow) a.shadow.setAlpha(1).setVisible(true);
    this.sync(a, 0);
    return a;
  }

  // Swap the body sprite (Johnny's shirt comes off, Hannah turns into the hulk form).
  setBody(a, key, headScale = 1, photo = undefined) {
    const sp = a.sprite;
    const def = crewDef(key) || { size: [24, 22], origin: [0.5, 1], meta: {} };
    a.key = key;
    a.def = def;
    const [w, h] = def.size;
    const [ox, oy] = def.origin || [0.5, 1];
    sp.anims.stop(); // the old texture's animation must not keep running on the new one
    sp.setTexture(key, firstFrame(this.scene, key)).setOrigin(ox, oy);
    const s = ART.scale;
    const collide = def.meta?.collide?.[0] ?? 10;
    const r = (collide * s) / 2;
    sp.body.setCircle(r, (w * s) / 2 - r, h * s - 2 * r - s);
    sp.body.updateFromGameObject();
    a.walkAnim = this.animKey(key, 'walk');
    a.idleAnim = this.animKey(key, 'idle');
    a.walkFrame = sp.texture.has('walk_0') ? 'walk_0' : firstFrame(this.scene, key);
    a.current = null;
    if (photo !== undefined) a.photo = photo;
    a.headOn = !!a.photo && !!def.meta?.neck;
    if (a.headOn) a.head.setPhoto(a.photo, (def.meta.headScale ?? 1) * headScale, a.cfg?.head || null);
    a.head.setVisible(a.headOn);
    a.lights.set(def, a.cfg?.halo || null);
    a.shakeFrames = def.meta?.shakeFrames?.walk || null;
    a.lastFrame = null;
    // Big forms (hulk, demon) get a big shadow.
    if (a.shadow) a.shadow.setScale(a.cfg?.shadowScale ?? Math.max(1, collide / CREW.shadowCollideRef));
  }

  setAttacks(a, attacks) {
    a.attacks = attacks || [];
    const [lo, hi] = CREW.firstAttackDelay;
    for (let k = 0; k < MAX_ATTACKS; k++) a.cds[k] = lo + Math.random() * (hi - lo);
  }

  animKey(key, name) {
    const k = `${key}_${name}`;
    return this.scene.anims.exists(k) ? k : null;
  }

  // One-shot animation by name (e.g. 'rip'); returns its duration in seconds (0 if missing).
  playOnce(a, name) {
    const k = this.animKey(a.key, name);
    if (!k) return 0;
    a.sprite.play({ key: k, repeat: 0 });
    a.current = k;
    const anim = this.scene.anims.get(k);
    a.animLock = (anim.duration || 300) / 1000;
    return a.animLock;
  }

  playLoop(a, name) {
    const k = this.animKey(a.key, name);
    if (k) a.sprite.play({ key: k, repeat: -1 }, true);
    a.current = k;
    a.animLock = Infinity; // scripted loop: stays until the script changes it
  }

  goto(a, x, y, speed = a.speed) {
    a.state = 'goto';
    a.goalX = x;
    a.goalY = y;
    a.gotoSpeed = speed;
    a.arrived = false;
    a.gotoT = 0;
    const b = a.sprite.body;
    a.gotoMax = Math.hypot(x - b.center.x, y - b.center.y) / Math.max(1, speed) + CREW.runInSlack;
    a.losT = 0;
  }

  fight(a, life = a.life) {
    a.state = 'fight';
    a.life = life;
    a.animLock = 0;
  }

  leave(a) {
    if (!a.active || a.state === 'leave') return;
    a.state = 'leave';
    a.leaveT = CREW.leaveSeconds;
    a.animLock = 0;
  }

  // Script control: stand still.
  hold(a) {
    a.state = 'script';
    a.sprite.setVelocity(0, 0);
  }

  release(a) {
    a.active = false;
    a.sprite.disableBody(true, true);
    a.head.setVisible(false);
    if (a.shadow) a.shadow.setVisible(false);
    a.lights.hide();
    a.target = null;
  }

  releaseAll() {
    for (let i = 0; i < this.allies.length; i++) if (this.allies[i].active) this.release(this.allies[i]);
  }

  // Game over: freeze like the enemies.
  pauseAnims() {
    for (let i = 0; i < this.allies.length; i++) if (this.allies[i].active) this.allies[i].sprite.anims.pause();
  }

  steer(a, x, y, speed, dt) {
    return this.steering.steer(a, x, y, speed, dt);
  }

  lineClear(x0, y0, x1, y1) {
    return this.steering.clear(x0, y0, x1, y1);
  }

  update(dt) {
    for (let i = 0; i < this.allies.length; i++) {
      const a = this.allies[i];
      if (!a.active) continue;
      if (a.animLock > 0 && a.animLock !== Infinity) a.animLock -= dt;
      if (a.state === 'goto') this.updateGoto(a, dt);
      else if (a.state === 'fight') this.updateFight(a, dt);
      else if (a.state === 'leave' && this.updateLeave(a, dt)) continue;
      this.sync(a, dt);
    }
  }

  updateGoto(a, dt) {
    a.gotoT += dt;
    if (this.steer(a, a.goalX, a.goalY, a.gotoSpeed, dt)) {
      a.arrived = true;
      a.state = 'script';
    } else if (a.gotoT > a.gotoMax) {
      // Stuck behind something: just pop to the goal.
      a.sprite.body.reset(a.goalX, a.goalY);
      a.arrived = true;
      a.state = 'script';
    }
  }

  updateFight(a, dt) {
    const sp = a.sprite;
    const b = sp.body;
    for (let k = 0; k < a.attacks.length; k++) a.cds[k] -= dt;
    a.life -= dt;
    if (a.life <= 0 && a.lock <= 0) {
      this.leave(a);
      return;
    }
    if (a.lock > 0) {
      a.lock -= dt;
      if (a.windup > 0) {
        a.windup -= dt;
        if (a.windup <= 0) executeAttack(this, a);
      }
      if (a.dash > 0) a.dash -= dt;
      else sp.setVelocity(0, 0);
      return;
    }

    const cx = b.center.x;
    const cy = b.center.y;
    const p = this.player;
    const lx = p.x - cx;
    const ly = p.y - cy;
    const tooFar = lx * lx + ly * ly > CREW.leashDist * CREW.leashDist;
    a.retarget -= dt;
    if (tooFar) a.target = null;
    else if (a.retarget <= 0 || !a.target || !a.target.active) {
      a.retarget = CREW.retargetSeconds;
      a.target = this.enemies.findNearest(cx, cy, CREW.aggroRange);
    }
    const t = a.target;
    if (!t) {
      // Nothing to hit: stay close to Lars.
      if (lx * lx + ly * ly > CREW.followDist * CREW.followDist) this.steer(a, p.x, p.y, a.speed, dt);
      else sp.setVelocity(0, 0);
      return;
    }
    const tx = t.body.center.x;
    const ty = t.body.center.y;
    const dx = tx - cx;
    const dy = ty - cy;
    const len = Math.hypot(dx, dy) || 1;
    const d = len - t.body.halfWidth;
    let minRange = Infinity;
    for (let k = 0; k < a.attacks.length; k++) {
      const atk = a.attacks[k];
      if (atk.range < minRange) minRange = atk.range;
      if (a.cds[k] > 0 || d > atk.range) continue;
      this.startAttack(a, k, dx / len, dy / len);
      return;
    }
    if (d > minRange * 0.7) this.steer(a, tx, ty, a.speed, dt);
    else sp.setVelocity(0, 0);
    if (Math.abs(dx) > 4) sp.setFlipX(dx < 0);
  }

  startAttack(a, k, ux, uy) {
    const atk = a.attacks[k];
    a.cds[k] = atk.cooldown;
    a.atk = atk;
    a.ux = ux;
    a.uy = uy;
    // The hit lands on the sprite's hit frame if known (art meta, else data hitFrame), else after windup.
    let windup = atk.windup ?? 0.1;
    const anim = atk.anim ? this.animKey(a.key, atk.anim) : null;
    const frame = anim ? hitFrameOf(a, atk) : null;
    if (frame !== null) windup = frame / (this.scene.anims.get(anim).frameRate || 8);
    a.windup = Math.max(0.001, windup);
    a.lock = a.windup + (atk.recover ?? 0.2);
    a.sprite.setVelocity(0, 0);
    if (Math.abs(ux) > 0.1) a.sprite.setFlipX(ux < 0);
    if (atk.anim) this.playOnce(a, atk.anim);
  }

  // Returns true once the ally is gone.
  updateLeave(a, dt) {
    a.leaveT -= dt;
    const mode = a.cfg.leave || 'run';
    const sp = a.sprite;
    if (mode === 'run') {
      const b = sp.body;
      const dx = b.center.x - this.player.x;
      const dy = b.center.y - this.player.y;
      const d = Math.hypot(dx, dy) || 1;
      const v = a.speed * CREW.leaveSpeedMul;
      sp.setVelocity((dx / d) * v, (dy / d) * v);
    } else {
      sp.setVelocity(0, mode === 'sink' ? CREW.sinkSpeed : 0);
    }
    sp.setAlpha(Math.min(1, Math.max(0, a.leaveT / (CREW.leaveSeconds * 0.6))));
    if (a.leaveT > 0) return false;
    this.release(a);
    return true;
  }

  // Animation, depth, head and shadow follow the body.
  sync(a, dt) {
    const sp = a.sprite;
    const b = sp.body;
    const moving = b.velocity.x * b.velocity.x + b.velocity.y * b.velocity.y > 400;
    if (moving && Math.abs(b.velocity.x) > 20 && a.dash <= 0) sp.setFlipX(b.velocity.x < 0);
    if (a.animLock <= 0) {
      const k = (moving ? a.walkAnim : a.idleAnim) || STILL;
      if (a.current !== k) {
        if (k !== STILL) sp.play({ key: k, repeat: -1 });
        else {
          sp.anims.stop();
          sp.setFrame(a.walkFrame);
        }
        a.current = k;
      }
    }
    const cfg = a.cfg;
    if (cfg.stepShake && moving && a.state !== 'leave') {
      if (a.shakeFrames) {
        // Tremor on the walk frames where a foot lands.
        if (sp.frame !== a.lastFrame) {
          a.lastFrame = sp.frame;
          const fi = frameInfo(sp.frame);
          if (fi.anim === 'walk' && a.shakeFrames.indexOf(fi.idx) >= 0) {
            shake(this.scene, cfg.stepShake, cfg.stepShakeMs);
            sfx.play('crew_stomp', sp.x);
          }
        }
      } else if (cfg.stepEvery) {
        a.stepT -= dt;
        if (a.stepT <= 0) {
          a.stepT = cfg.stepEvery;
          shake(this.scene, cfg.stepShake, cfg.stepShakeMs);
          sfx.play('crew_stomp', sp.x);
        }
      }
    }
    sp.setDepth(sp.y);
    if (a.headOn) a.head.follow(sp, a.def);
    if (a.shadow) a.shadow.setPosition(b.center.x, b.center.y + 2).setAlpha(sp.alpha);
    a.lights.sync(sp, a.def);
  }
}

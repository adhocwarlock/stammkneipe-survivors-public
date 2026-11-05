import { ART, PLAYER, FACES, HEAD } from '../data/config.js';
import { PROMILLE } from '../data/beers.js';
import { WEAPONS } from '../data/weapons.js';
import { spriteDef } from '../art/render.js';
import { firstTexture } from '../systems/textures.js';
import { Hero } from '../systems/Hero.js';
import { DEAD_FALLBACK } from '../data/heroes.js';
import { PhotoHead } from './PhotoHead.js';
import { sfx } from '../audio/Sfx.js';

const FACE_SIZE = 14; 


const TINTS = { hurt: 0xff7070, lowhp: 0xffc8c8, dead: 0x9a9aa0, meh: 0xd8d8ff };

// The hero (Lars, or whoever the secret hero select picked) = pixel body + photo head + helmet + shadow.
// Photo-head mode (headless body + photo): the REAL photo is the whole head, on purpose not pixel art,
// anchored at the neck (Lars: so the beard hangs over the chest).
// Fallback: the old pixel head with a small face window. Last resort: a blob.
export class Player {
  constructor(scene, x, y) {
    this.scene = scene;
    const hero = Hero.data;
    const body = firstTexture(scene, ...hero.bodies);
    this.photoKey = Hero.photoKey;
    this.isLars = Hero.id === 'lars';
    this.headMode = !!body && scene.textures.exists('photo_normal');
    this.bodyKey = this.headMode ? body : 'lars';
    // Missing dead body for this hero: Lars' one, tinted.
    this.deadKey = this.headMode ? (firstTexture(scene, ...hero.dead) || DEAD_FALLBACK.key) : 'lars_dead';
    this.deadTint = this.headMode && !firstTexture(scene, ...hero.dead) && !this.isLars ? DEAD_FALLBACK.tint : null;
    this.def = spriteDef(this.bodyKey);
    this.deadDef = spriteDef(this.deadKey);
    this.hasArt = !!this.def && scene.textures.exists(this.bodyKey);
    const s = ART.scale;

    if (this.hasArt) {
      const [w, h] = this.def.size;
      const [ox, oy] = this.def.origin || [0.5, 1];
      this.sprite = scene.physics.add.sprite(x, y, this.bodyKey, 'idle_0').setOrigin(ox, oy);
      this.resolveAnims();
      const r = (this.def.meta?.collide?.[0] ?? 10) * s / 2;
      // Collision circle at the feet (offsets are in texture px from the top-left).
      this.sprite.body.setCircle(r, (w * s) / 2 - r, h * s - 2 * r - s);
      if (this.headMode) {
        // Photo head: fixed width, height from the photo's aspect; origin = the chin/neck point.
        this.head = new PhotoHead(scene, this.photoKey, 1, this.isLars ? null : Hero.head);
        this.face = this.head.image.setVisible(true);
        this.headW = this.head.w;
        this.headH = this.head.h;
      } else {
        this.face = scene.add.image(x, y, 'face_placeholder').setVisible(false);
      }
      this.expression = null;
      this.faceHidden = new Set(this.def.meta?.faceHidden || []);
    } else {
      this.sprite = scene.physics.add.sprite(x, y, 'ph_lars');
      this.sprite.body.setCircle(PLAYER.radius);
    }
    this.helmet = scene.add.image(x, y, '__DEFAULT').setOrigin(0.5, 1).setVisible(false);
    this.shadow = scene.textures.exists('shadow') ? scene.add.image(x, y, 'shadow').setDepth(-1) : null;
    this.sprite.setCollideWorldBounds(true);

    this.maxHp = PLAYER.maxHp;
    this.hp = this.maxHp;
    this.invuln = 0;
    this.lift = 0; // px drawn above the ground (Ollie jump); > 0 = in the air, can't be hit
    this.hurtTimer = 0;
    this.happyTimer = 0;
    this.mehTimer = 0;
    this.dead = false;
    this.facing = { x: 1, y: 0 };
    this.backView = false;
    this.time = 0;
  }

  // Anim keys once (no per-frame strings). Heroes without back-view/hurt anims fall back to walk/idle.
  resolveAnims() {
    const k = this.bodyKey;
    const has = (n) => (this.scene.anims.exists(`${k}_${n}`) ? `${k}_${n}` : null);
    this.animWalk = has('walk');
    this.animIdle = has('idle') || this.animWalk;
    this.animWalkUp = has('walk_up') || this.animWalk;
    this.animIdleUp = has('idle_up') || this.animIdle;
    this.hurtFrame = this.sprite.texture.has('hurt_0') ? 'hurt_0' : 'idle_0';
  }

  // Max HP changes (Eimer drinks): current HP scales along. 0 = back to normal.
  applyMaxHp(target) {
    const max = target > 0 ? target : PLAYER.maxHp;
    if (max === this.maxHp || this.dead) return;
    this.hp = Math.max(1, (this.hp * max) / this.maxHp);
    this.maxHp = max;
  }

  // Gameplay position = centre of the feet circle.
  get x() { return this.sprite.body.center.x; }
  get y() { return this.sprite.body.center.y; }

  // move: input vector (0..1 length). status: StatusSystem (promille, mods, dicht).
  update(dt, move, status) {
    const sp = this.sprite;
    const body = sp.body;
    this.time += dt;

    
    
    
    
    this.applyMaxHp(status.mods.maxHp);
    const speed = PLAYER.speed * status.mods.speedMul;
    const inertia = PROMILLE.inertiaSober + status.promille * PROMILLE.inertiaPerPromille;
    const blend = 1 - Math.exp(-dt / inertia); // frame-rate independent smoothing
    body.velocity.x += (move.x * speed - body.velocity.x) * blend;
    body.velocity.y += (move.y * speed - body.velocity.y) * blend;

    const moving = move.lengthSq() > 0.01;
    if (moving) {
      this.facing.x = move.x;
      this.facing.y = move.y;
      if (move.x < -0.1) sp.setFlipX(true);
      else if (move.x > 0.1) sp.setFlipX(false);
      // Back view when walking mostly away from the camera.
      this.backView = move.y < -0.5 && Math.abs(move.x) < 0.6;
      if (Math.abs(move.x) > 0.3 || move.y > 0.3) this.backView = false;
    }

    if (this.invuln > 0) {
      this.invuln -= dt;
      sp.setAlpha(this.invuln > 0 && Math.floor(this.invuln * 20) % 2 === 0 ? 0.5 : 1);
    }
    this.hurtTimer -= dt;
    this.happyTimer -= dt;
    sfx.heartbeat(dt, this.hp / this.maxHp);
    this.mehTimer -= dt;

    if (this.hasArt) {
      const up = this.backView;
      const anim = moving ? (up ? this.animWalkUp : this.animWalk) : (up ? this.animIdleUp : this.animIdle);
      if (this.hurtTimer > 0) this.showFrame(this.hurtFrame);
      else if (anim) sp.play(anim, true);
      this.setExpression(this.pickExpression(status));
    }
    this.syncAttachments();
  }

  showFrame(frame) {
    this.sprite.anims.stop();
    this.sprite.setFrame(frame);
  }

  pickExpression(status) {
    if (this.dead) return 'dead';
    if (this.hurtTimer > 0) return 'hurt';
    if (status.dicht) return 'dicht';
    if (this.mehTimer > 0) return 'meh';
    if (this.happyTimer > 0) return 'happy';
    if (this.hp / this.maxHp < FACES.lowHpBelow) return 'lowhp';
    if (status.promille >= FACES.drunkFrom) return 'drunk';
    return 'normal';
  }

  setExpression(expr) {
    if (expr === this.expression) return;
    this.expression = expr;
    if (this.headMode) {
      // Lars: an expression photo if one exists, otherwise tint the normal one. Other heroes: tint only.
      const base = this.head.key;
      const key = this.isLars ? firstTexture(this.scene, `photo_${expr}`, base) : base;
      if (this.face.texture.key !== key) this.face.setTexture(key).setDisplaySize(this.headW, this.headH);
      if (key === base && TINTS[expr]) this.face.setTint(TINTS[expr]);
      else this.face.clearTint();
      return;
    }
    const photo = firstTexture(this.scene, `photo_${expr}`, 'photo_normal');
    const key = photo || firstTexture(this.scene, `face_${expr}`, 'face_placeholder');
    if (!key) {
      this.face.setVisible(false);
      return;
    }
    this.face.setTexture(key).setVisible(true);
    const size = (photo ? FACES.photoArtPx : FACE_SIZE) * ART.scale;
    this.face.setDisplaySize(size, size);
  }

  setHelmet(id) {
    const sprite = id && WEAPONS[id]?.sprite;
    if (sprite && this.scene.textures.exists(sprite)) this.helmet.setTexture(sprite, 'default_0').setVisible(true);
    else this.helmet.setVisible(false);
  }

  // Keeps head, helmet and shadow glued to the body, y-sorted by the feet.
  syncAttachments() {
    const sp = this.sprite;
    sp.setDepth(sp.y);
    if (this.shadow) this.shadow.setPosition(this.x, this.y + 2);
    if (!this.hasArt) return;
    if (this.headMode) this.syncPhotoHead();
    else this.syncPixelFace();
  }

  syncPhotoHead() {
    const sp = this.sprite;
    const dead = this.dead && sp.texture.key === this.deadKey;
    const def = dead ? this.deadDef : this.def;
    const meta = def.meta || {};
    this.head.locate(sp, def, !dead);
    const x = this.head.x;
    let y = this.head.y;
    // A little life: happy bounce, dicht/drunk sway.
    let angle = dead ? (meta.rotate ?? -90) : 0;
    if (!dead && this.happyTimer > 0) y -= Math.abs(Math.sin(this.time * 14)) * 4;
    if (!dead && this.expression === 'dicht') angle += Math.sin(this.time * 2.2) * 6;
    else if (!dead && this.expression === 'drunk') angle += Math.sin(this.time * 1.6) * 4;
    if (sp.flipX) angle = -angle;

    // Walking away still shows the same (front) photo: it's funnier (user's call), drawn in front like always.
    this.face
      .setPosition(x, y)
      .setFlipX(sp.flipX)
      .setAngle(angle)
      .setDepth(sp.depth + 0.1)
      .setAlpha(sp.alpha);

    // Helmet sits on top of the photo head, rotated with it.
    const rad = Phaser.Math.DegToRad(angle);
    // Distance from the neck up to the helmet's bottom edge; HEAD.helmetDrop moves it down by a fraction of its height.
    const up = this.headH * (this.head.anchorY - HEAD.helmetY) - HEAD.helmetDrop * this.helmet.displayHeight;
    this.helmet
      .setPosition(x + Math.sin(rad) * up, y - Math.cos(rad) * up)
      .setScale(HEAD.helmetScale)
      .setFlipX(sp.flipX)
      .setAngle(angle)
      .setDepth(sp.depth + 0.2)
      .setAlpha(sp.alpha);
  }

  syncPixelFace() {
    const sp = this.sprite;
    const s = ART.scale;
    const dead = this.dead && sp.texture.key === this.deadKey;
    const def = dead ? this.deadDef : this.def;
    const [w, h] = def.size;
    const meta = def.meta || {};
    if (!meta.face) return;
    const [anim, idx] = String(sp.frame.name).split(/_(?=\d+$)/);
    const bob = dead ? 0 : (meta.faceBob?.[anim]?.[Number(idx)] ?? 0);
    const fx = sp.flipX ? w - meta.face.x - FACE_SIZE : meta.face.x;
    const left = sp.x - w * s * sp.originX;
    const top = sp.y - h * s * sp.originY;
    const cx = left + (fx + FACE_SIZE / 2) * s;
    const cy = top + (meta.face.y + bob + FACE_SIZE / 2) * s;
    const hidden = this.faceHidden.has(anim);

    this.face
      .setPosition(cx, cy)
      .setFlipX(sp.flipX)
      .setAngle(dead ? (meta.face.rotate || 0) : 0)
      .setDepth(sp.depth + 0.1)
      .setAlpha(sp.alpha)
      .setVisible(!hidden && this.face.texture.key !== '__DEFAULT');
    this.helmet
      .setPosition(cx, cy - (FACE_SIZE / 2 - 4) * s)
      .setFlipX(sp.flipX)
      .setAngle(dead ? (meta.face.rotate || 0) : 0)
      .setDepth(sp.depth + 0.2)
      .setAlpha(sp.alpha);
  }

  // Returns true if this hit killed Lars. armor: 0..1 damage reduction.
  takeDamage(amount, armor = 0) {
    if (this.invuln > 0 || this.hp <= 0 || this.lift > 0) return false;
    this.hp = Math.max(0, this.hp - amount * (1 - armor));
    this.invuln = PLAYER.invulnSeconds;
    this.hurtTimer = FACES.hurtSeconds;
    if (this.hp > 0) sfx.play('player_hurt');
    return this.hp === 0;
  }

  heal(amount) {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  cheer() {
    this.happyTimer = FACES.happySeconds;
  }

  disappointed() {
    this.mehTimer = FACES.mehSeconds;
  }

  // Ollie: draws the hero `px` higher without moving the physics body (feet circle and shadow stay on the
  // ground). The origin moves up by the same amount as the body offset, so the body doesn't shift; the photo
  // head follows because it is placed from the origin too. Held weapons / the board read `lift` themselves.
  setLift(px) {
    const sp = this.sprite;
    const d = (px - this.lift) / (sp.scaleY || 1);
    if (Math.abs(d) < 0.01) return;
    sp.setOrigin(sp.originX, sp.originY + d / sp.frame.height);
    sp.body.setOffset(sp.body.offset.x, sp.body.offset.y + d);
    this.lift = px;
  }

  die() {
    this.setLift(0);
    this.dead = true;
    sfx.play('player_death');
    this.sprite.setVelocity(0, 0).setAlpha(1);
    if (!this.hasArt) {
      this.sprite.setTint(0xff0000);
      return;
    }
    this.sprite.anims.stop();
    if (this.deadDef && this.scene.textures.exists(this.deadKey)) {
      const [ox, oy] = this.deadDef.origin || [0.5, 1];
      this.sprite.setTexture(this.deadKey, 'default_0').setOrigin(ox, oy);
      if (this.deadTint !== null) this.sprite.setTint(this.deadTint);
    } else {
      this.sprite.setFrame('dead_0');
    }
    this.setExpression('dead');
    this.syncAttachments();
  }
}

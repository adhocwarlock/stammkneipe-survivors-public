// Shared helpers for the weapons. Visual-only constants live here; balance numbers are in src/data/weapons.js.

export const NEUTRAL_MODS = { damageMul: 1, cooldownMul: 1, speedMul: 1, armor: 0, fireBreath: false };

// Gameplay positions are feet centres; hits/FX are drawn roughly at body height above them.
export const ENEMY_BODY_Y = 30;
export const PLAYER_CHEST_Y = 40;

// Unit vector from the player to the target (or the facing direction) written into `out`. Returns the angle.
export function aimAt(player, target, out) {
  let dx;
  let dy;
  if (target) {
    dx = target.body.center.x - player.x;
    dy = target.body.center.y - player.y;
  } else {
    const f = player.facing;
    dx = f && (f.x || f.y) ? f.x : (player.sprite.flipX ? -1 : 1);
    dy = f && (f.x || f.y) ? f.y : 0;
  }
  const len = Math.hypot(dx, dy);
  if (len < 0.0001) {
    dx = player.sprite.flipX ? -1 : 1;
    dy = 0;
  } else {
    dx /= len;
    dy /= len;
  }
  out.x = dx;
  out.y = dy;
  return Math.atan2(dy, dx);
}

// Plays `animKey` once on `sprite` if it exists, otherwise just shows the frame `default_0`.
export function playOnce(sprite, animKey) {
  if (sprite.scene.anims.exists(animKey)) sprite.play({ key: animKey, repeat: 0 });
  else sprite.anims.stop();
}

// Loops `animKey` if it exists (ignoreIfPlaying).
export function playLoop(sprite, animKey) {
  if (sprite.scene.anims.exists(animKey)) sprite.play({ key: animKey, repeat: -1 }, true);
}

// First looping animation an art sprite has, in this order of preference (art names differ per sprite).
const LOOP_ANIMS = ['default', 'spin', 'fly', 'loop', 'idle', 'armed', 'blink'];
const loopCache = new Map(); // art key -> anim key | null

export function loopAnimOf(scene, key) {
  if (loopCache.has(key)) return loopCache.get(key);
  let found = null;
  for (let i = 0; i < LOOP_ANIMS.length && !found; i++) {
    if (scene.anims.exists(`${key}_${LOOP_ANIMS[i]}`)) found = `${key}_${LOOP_ANIMS[i]}`;
  }
  // Only cache once the art exists (textures are registered in create, before any weapon fires).
  if (scene.textures.exists(key)) loopCache.set(key, found);
  return found;
}

// Gives a pooled sprite the art texture `key` (looping its animation) or the placeholder `ph_<key>`.
// Returns true when the art (not the placeholder) is used.
export function applyArt(sprite, key) {
  const scene = sprite.scene;
  if (scene.textures.exists(key)) {
    if (sprite.texture.key !== key) sprite.setTexture(key, 'default_0');
    const anim = loopAnimOf(scene, key);
    if (anim) sprite.play({ key: anim, repeat: -1 }, true);
    return true;
  }
  sprite.anims.stop();
  if (sprite.texture.key !== `ph_${key}`) sprite.setTexture(`ph_${key}`);
  return false;
}

// Returns the first inactive sprite of `pool`, or a new one (up to `max`), or null. New sprites start as `ph_<key>`.
export function takeSprite(scene, pool, max, key) {
  for (let i = 0; i < pool.length; i++) if (!pool[i].active) return pool[i];
  if (pool.length >= max) return null;
  const s = scene.add.sprite(0, 0, `ph_${key}`);
  pool.push(s);
  return s;
}

// 'default_0' if the art has it, else its first named frame (sprites whose anims are e.g. front/back or idle/fire).
export function firstFrameOf(scene, key) {
  const tex = scene.textures.get(key);
  if (tex.has('default_0')) return 'default_0';
  const names = tex.getFrameNames();
  return names.length ? names[0] : undefined;
}

import { ART, DEPTH, LIGHTS } from '../data/config.js';

const MAX_LIGHTS = 3;
const cache = new WeakMap();

// Optional hit data on crew sprites, in the formats the artists use:
//   meta[anim] = { frame, x, y } or [x, y]      (hannah_hulk_body.slam, flame_demon.slam)
//   meta[anim + 'Hit'] = { frame, x, y }          (champ_danny_body.swingHit)
//   meta[anim + 'HitFrame'] = n                   (flame_demon.whipHitFrame)
//   meta[anim + 'Reach'] = [x, y]                 (flame_demon.whipReach)
// Returns { frame, x, y } (null where unknown); x/y are art px in the sprite frame (it faces right).
export function hitInfo(def, anim) {
  let byAnim = cache.get(def);
  if (!byAnim) cache.set(def, (byAnim = {}));
  if (byAnim[anim]) return byAnim[anim];
  const m = def.meta || {};
  const info = { frame: null, x: null, y: null };
  for (const v of [m[anim], m[`${anim}Hit`], m[`${anim}Reach`]]) {
    if (Array.isArray(v)) {
      info.x ??= v[0];
      info.y ??= v[1];
    } else if (v && typeof v === 'object') {
      info.frame ??= Number.isFinite(v.frame) ? v.frame : null;
      info.x ??= v.x ?? null;
      info.y ??= v.y ?? null;
    }
  }
  if (Number.isFinite(m[`${anim}HitFrame`])) info.frame ??= m[`${anim}HitFrame`];
  byAnim[anim] = info;
  return info;
}

// A named meta point (art px, sprite faces right) for `anim` frame `frame`, written into out; null if missing.
// Formats: { x, y } | [x, y] | { <anim>: { x, y } | [{ x, y }, ...per frame] } (god_thor.hammer).
export function metaPoint(def, name, anim, frame, out) {
  let v = def?.meta?.[name];
  if (v && !Array.isArray(v) && v.x === undefined) v = v[anim] ?? v.idle;
  if (Array.isArray(v) && typeof v[0] === 'object') v = v[Math.min(frame, v.length - 1)];
  if (Array.isArray(v)) {
    out.x = v[0];
    out.y = v[1];
    return out;
  }
  if (v && Number.isFinite(v.x)) {
    out.x = v.x;
    out.y = v.y;
    return out;
  }
  return null;
}

// Art point -> world px on a sprite (mirrored with flipX, scaled with the sprite).
export function toWorld(sp, def, pt, out) {
  const [w, h] = def.size;
  const sx = ART.scale * sp.scaleX;
  const sy = ART.scale * sp.scaleY;
  out.x = sp.x + ((sp.flipX ? w - pt.x : pt.x) - w * sp.originX) * sx;
  out.y = sp.y + (pt.y - h * sp.originY) * sy;
  return out;
}

// Halos for glowing allies: one per sprite light (meta.lights, mirrored with the sprite) + an optional
// warm body halo (cfg.halo). ADD blend above the night tint, so fire still glows at night.
export class AllyLights {
  constructor(scene) {
    this.imgs = [];
    this.lights = [];
    this.halo = null;
    if (!scene.textures.exists('fx_glow')) return; // made by Town for the street lights
    for (let i = 0; i < MAX_LIGHTS + 1; i++) {
      this.imgs.push(scene.add.image(0, 0, 'fx_glow').setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(DEPTH.fx - 50).setVisible(false));
    }
  }

  // def: sprite definition; halo: { color, scale, alpha, y } or null.
  set(def, halo) {
    this.lights.length = 0;
    this.halo = null;
    if (!this.imgs.length) return;
    const list = def.meta?.lights || [];
    for (let i = 0; i < list.length && i < MAX_LIGHTS; i++) {
      const l = list[i];
      const r = ((l.radius || LIGHTS.defaultRadius) * ART.scale) / LIGHTS.radiusUnit;
      const color = Phaser.Display.Color.HexStringToColor(l.color || LIGHTS.defaultColor).color;
      this.imgs[i].setTint(color).setScale(r * LIGHTS.haloScale * 2);
      this.imgs[i].baseAlpha = LIGHTS.haloAlpha;
      this.lights.push(l);
    }
    if (halo) {
      const img = this.imgs[MAX_LIGHTS];
      img.setTint(halo.color).setScale(halo.scale);
      img.baseAlpha = halo.alpha;
      this.halo = halo;
    }
    for (let i = 0; i < this.imgs.length; i++) {
      this.imgs[i].setVisible(i < this.lights.length || (i === MAX_LIGHTS && !!this.halo));
    }
  }

  sync(sp, def) {
    if (!this.imgs.length) return;
    const sx = ART.scale * sp.scaleX;
    const sy = ART.scale * sp.scaleY;
    const [w, h] = def.size;
    const left = sp.x - w * sx * sp.originX;
    const top = sp.y - h * sy * sp.originY;
    for (let i = 0; i < this.lights.length; i++) {
      const l = this.lights[i];
      const lx = sp.flipX ? w - l.x : l.x;
      const img = this.imgs[i];
      img.setPosition(left + lx * sx, top + l.y * sy).setAlpha(img.baseAlpha * sp.alpha);
    }
    if (this.halo) {
      const img = this.imgs[MAX_LIGHTS];
      img.setPosition(sp.x, sp.y - this.halo.y).setAlpha(img.baseAlpha * sp.alpha);
    }
  }

  hide() {
    this.lights.length = 0;
    this.halo = null;
    for (let i = 0; i < this.imgs.length; i++) this.imgs[i].setVisible(false);
  }
}

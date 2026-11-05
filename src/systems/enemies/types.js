import { ART, GOBLIN } from '../../data/config.js';
import { ENEMY_DEFAULTS } from '../../data/enemies.js';
import { enemyDef } from './placeholders.js';
import { hitInfo, metaPoint } from '../../crew/allyArt.js';

const SHOOT_ANIMS = ['shoot', 'throw', 'attack']; // first one the sprite has is played while aiming

// Stats + which texture/anims/body a type actually uses (art, palette variant, tinted fallback, placeholder).
export function resolveType(scene, id, def, index) {
  const t = { ...ENEMY_DEFAULTS, ...def, id, index };
  t.family = def.family || id.split('__')[0];
  t.abilities = def.abilities || null;
  const has = (k) => scene.textures.exists(k) && !!enemyDef(k.split('__')[0]);
  const visuals = [];
  for (const key of def.looks || [def.look || def.sprite]) {
    const base = key.split('__')[0];
    if (has(key)) visuals.push(artVisual(scene, key, t, null, t.artScale ?? 1));
    else if (has(base)) visuals.push(artVisual(scene, base, t, t.tint ?? null, t.artScale ?? 1)); // variant not drawn yet
  }
  if (!visuals.length && def.fallbackSprite && has(def.fallbackSprite)) {
    visuals.push(artVisual(scene, def.fallbackSprite, t, null, t.artScale ?? 1));
  }
  if (!visuals.length && has('goblin')) visuals.push(artVisual(scene, 'goblin', t, t.tint ?? null, t.fallbackScale));
  if (!visuals.length) {
    visuals.push({
      texture: 'ph_goblin', frame: undefined, originX: 0.5, originY: 0.5, scale: t.fallbackScale * t.scale,
      tint: def.tint ?? null, r: GOBLIN.radius, ox: 0, oy: 0, walkAnim: null, fleeAnim: null, hurtFrame: null,
      contactAnim: null, contactAnimSec: 0, shootAnim: null, ...abilityArt(scene, null, null, t),
    });
  }
  t.visuals = visuals;
  return t;
}

// Texture key `key` (a sprite or one of its palette variants "name__variant").
function artVisual(scene, key, t, tint, scale) {
  const def = enemyDef(key.split('__')[0]);
  const tex = scene.textures.get(key);
  const s = ART.scale;
  const [w, h] = def.size;
  const [originX, originY] = def.origin || [0.5, 1];
  const r = (def.meta?.collide?.[0] ?? 10) * s / 2;
  const animKey = (name) => (name && scene.anims.exists(`${key}_${name}`) ? `${key}_${name}` : null);
  const contactAnim = animKey(t.contactAnim);
  let shootAnim = null;
  for (const name of SHOOT_ANIMS) shootAnim = shootAnim || animKey(name);
  let frame;
  if (tex.has('walk_0')) frame = 'walk_0';
  else if (tex.has('default_0')) frame = 'default_0';
  return {
    texture: key,
    def,
    frame,
    originX,
    originY,
    scale: scale * t.scale, // the physics body scales along with the sprite
    tint,
    r,
    ox: (w * s) / 2 - r,
    oy: h * s - 2 * r - s,
    walkAnim: animKey('walk'),
    fleeAnim: animKey('flee') || animKey('walk'),
    hurtFrame: tex.has('hurt_0') ? 'hurt_0' : null,
    contactAnim,
    contactAnimSec: contactAnim ? (scene.anims.get(contactAnim).duration || 500) / 1000 : 0,
    shootAnim,
    ...abilityArt(scene, key, def, t),
  };
}

// Per ability (same order as t.abilities): anim key, hit frame, reach of the hit point (px at scale 1),
// source point (meta[ab.point], art px) and frames to hold while it runs (meta[anim + 'Frames']).
function abilityArt(scene, key, def, t) {
  if (!t.abilities) return { abAnims: null, abHit: null, abReach: null, abPoint: null, abHold: null };
  const out = { abAnims: [], abHit: [], abReach: [], abPoint: [], abHold: [] };
  for (const ab of t.abilities) {
    const anim = key && ab.anim && scene.anims.exists(`${key}_${ab.anim}`) ? `${key}_${ab.anim}` : null;
    const hit = def && ab.anim ? hitInfo(def, ab.anim) : null;
    // Hit frame: meta.<anim> {frame} / meta.<anim>HitFrame (hitInfo), or meta.<anim>Frame (necromancer summonFrame).
    const frame = hit?.frame ?? (Number.isFinite(def?.meta?.[`${ab.anim}Frame`]) ? def.meta[`${ab.anim}Frame`] : null);
    const pt = def && ab.point ? metaPoint(def, ab.point, ab.anim, frame ?? 0, { x: 0, y: 0 }) : null;
    const hold = def?.meta?.[`${ab.anim}Frames`];
    out.abAnims.push(anim);
    out.abHit.push(anim && frame > 0 ? frame : null);
    out.abReach.push(hit && hit.x !== null ? Math.abs(hit.x - def.size[0] * (def.origin?.[0] ?? 0.5)) * ART.scale : null);
    out.abPoint.push(pt);
    out.abHold.push(anim && Array.isArray(hold) ? hold.map((i) => `${ab.anim}_${i}`) : null);
  }
  return out;
}

import { ART } from '../data/config.js';
import { shake } from '../weapons/shake.js';
import { hitInfo, metaPoint, toWorld } from './allyArt.js';
import { sfx } from '../audio/Sfx.js';

const BODY_Y = 30; // px above the feet where melee FX are drawn without an art point
const pt = { x: 0, y: 0 };
const world = { x: 0, y: 0 };

// The hit frame of an attack: sprite meta first, then the data's hitFrame (null = use windup).
export function hitFrameOf(a, atk) {
  if (!atk.anim) return null;
  return hitInfo(a.def, atk.anim).frame ?? atk.hitFrame ?? null;
}

// Executes ally `a`'s current attack (a.atk) in direction (a.ux, a.uy). sys = AllySystem (area, fx, scene).
export function executeAttack(sys, a) {
  const atk = a.atk;
  const sp = a.sprite;
  const cx = sp.body.center.x;
  const cy = sp.body.center.y;
  const ux = a.ux;
  const uy = a.uy;
  const t = a.target && a.target.active ? a.target : null;

  // Where the hit comes from in the art (fist, spear tip, hammer...), in world px; else body height.
  let px = cx + ux * 20;
  let py = cy - BODY_Y;
  let reach = atk.offset || 0; // distance in front of the feet
  const hit = atk.anim ? hitInfo(a.def, atk.anim) : null;
  const frame = hitFrameOf(a, atk) ?? 0;
  let p = atk.point ? metaPoint(a.def, atk.point, atk.anim, frame, pt) : null;
  if (!p && hit && hit.x !== null) {
    pt.x = hit.x;
    pt.y = hit.y ?? a.def.size[1];
    p = pt;
  }
  if (p) {
    toWorld(sp, a.def, p, world);
    px = world.x;
    py = world.y;
    reach = Math.abs(p.x - a.def.size[0] * sp.originX) * ART.scale;
  }

  switch (atk.kind) {
    case 'arc':
      sys.area.arc(cx, cy, ux, uy, atk.radius, atk.arcDeg, atk);
      sys.fx.slash(cx, py, ux, uy, atk.radius);
      break;
    case 'circle':
      sys.fx.slam(cx + ux * reach, cy + uy * reach, atk);
      break;
    case 'line': {
      // Spear stabs start at the tip's reach; dashes start at the feet and carry the ally along.
      const x0 = atk.dash ? cx : cx + ux * reach * 0.5;
      const y0 = atk.dash ? cy : cy + uy * reach * 0.5;
      sys.area.line(x0, y0, x0 + ux * atk.length, y0 + uy * atk.length, atk.width, atk);
      if (atk.dash) {
        const v = atk.length / atk.dashSeconds;
        a.dash = atk.dashSeconds;
        a.lock = Math.max(a.lock, atk.dashSeconds); // the anim holds its last frame meanwhile
        sp.setVelocity(ux * v, uy * v);
        sys.fx.ring(cx, cy, 40, 0xffffff);
      } else {
        sys.fx.slash(cx, py, ux, uy, atk.length);
      }
      break;
    }
    case 'single':
      if (t) {
        sys.area.hit(t, atk, cx, cy);
        sys.area.sparks.play(px, py);
      }
      break;
    case 'lightning':
      if (t) sys.fx.strikeLightning(px, py, t, atk);
      break;
    case 'ravens':
      if (t) sys.fx.ravens(px, cy, cy - py, t, atk);
      break;
    default:
      break;
  }
  if (atk.shake && atk.kind !== 'circle') shake(sys.scene, atk.shake, atk.shakeMs);
  sfx.ally(atk, cx);
}

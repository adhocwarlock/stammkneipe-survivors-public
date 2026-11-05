import { ART } from '../../data/config.js';
import { spriteDef } from '../../art/render.js';
import { crewDef } from '../../crew/placeholders.js';






const DARK = '#141325';
const EYE = '#ffd27a';

// Generic monster figure. c = colours (+ c.extra(p, anim, i, g) for hats, weapons...), g = geometry.
function figure(c) {
  return (p, anim, i, W, H) => {
    const cx = Math.floor(W / 2);
    const walk = anim === 'walk';
    const step = walk ? [1, 0, -1, 0][i % 4] : 0;
    const hurt = anim === 'hurt';
    const lean = hurt ? -1 : 0;
    const legH = Math.round(H * (c.legs ?? 0.3));
    const headH = Math.round(H * (c.head ?? 0.24));
    const tw = Math.round(W * (c.width ?? 0.5));
    const legY = H - legH;
    const top = Math.round(H * (c.top ?? 0.1));
    const torsoY = top + headH;
    const torsoH = legY - torsoY + 1;
    const g = { cx, top, headH, torsoY, torsoH, legY, legH, tw, W, H, lean, step };
    if (!c.robe) {
      p.r(cx - Math.ceil(tw / 2) + 1, legY, Math.max(2, Math.floor(tw / 2) - 1), legH - 1 - Math.max(0, step), c.legsC || DARK);
      p.r(cx + 1, legY, Math.max(2, Math.floor(tw / 2) - 1), legH - 1 - Math.max(0, -step), c.legsC || DARK);
      p.r(cx - Math.ceil(tw / 2), H - 2 - Math.max(0, step), Math.floor(tw / 2), 2, c.feet || DARK);
      p.r(cx + 1, H - 2 - Math.max(0, -step), Math.floor(tw / 2), 2, c.feet || DARK);
    } else {
      p.r(cx - Math.ceil(tw / 2) - 1, legY, tw + 2, legH - 1, c.robe); // robe to the ground
      p.r(cx - Math.ceil(tw / 2) - 1 + (i % 2), H - 2, tw + 2, 1, c.robeD || DARK);
    }
    p.r(cx - Math.ceil(tw / 2) + lean, torsoY, tw, torsoH, c.body); // torso
    if (c.belt) p.r(cx - Math.ceil(tw / 2) + lean, legY - 2, tw, 2, c.belt);
    // Arms: hang down, or reach forward (right) during attacks.
    const atk = !walk && !hurt && anim !== 'idle';
    const reach = atk ? [1, 5, 3, 2][i % 4] : 0;
    const armW = Math.max(2, Math.round(W * 0.12));
    p.r(cx - Math.ceil(tw / 2) - armW + lean, torsoY + 1, armW, Math.round(torsoH * 0.8), c.arms || c.body);
    if (c.armsForward || atk) p.r(cx + Math.floor(tw / 2) + lean, torsoY + 2, armW + 3 + reach, armW, c.arms || c.body);
    else p.r(cx + Math.floor(tw / 2) + lean, torsoY + 1, armW, Math.round(torsoH * 0.8), c.arms || c.body);
    const hw = Math.round(tw * (c.headW ?? 0.8));
    p.r(cx - Math.ceil(hw / 2) + lean, top, hw, headH, c.skin); // head
    p.r(cx + 1 + lean, top + Math.floor(headH * 0.4), 2, 1, c.eye || DARK); // eye (faces right)
    if (c.extra) c.extra(p, anim, i, g, atk, reach);
  };
}

const hat = (color, band) => (p, anim, i, g) => {
  p.r(g.cx - 5 + g.lean, g.top, 10, 2, color); // brim
  p.r(g.cx - 3 + g.lean, g.top - 4, 6, 4, color);
  p.r(g.cx - 2 + g.lean, g.top - 7, 4, 3, color);
  p.r(g.cx - 1 + g.lean, g.top - 9, 2, 2, color);
  if (band) p.r(g.cx - 3 + g.lean, g.top - 1, 6, 1, band);
};
const staff = (p, g, color, tip, glow) => {
  p.r(g.cx + Math.floor(g.tw / 2) + 3, g.top - 2, 1, g.H - g.top, color);
  p.r(g.cx + Math.floor(g.tw / 2) + 2, g.top - 4, 3, 3, glow ? '#ffffff' : tip);
};

const zombieExtra = (p, anim, i, g) => {
  p.r(g.cx - 2, g.torsoY + 2, 2, 2, '#4a2a2a'); // torn shirt
  p.r(g.cx - 3 + g.lean, g.top, 6, 1, g.hair || '#3a3a2a');
};
const wolfExtra = (p, anim, i, g, atk, reach) => {
  p.r(g.cx - 3 + g.lean, g.top - 2, 2, 3, '#3a2a1a'); // ears
  p.r(g.cx + 2 + g.lean, g.top - 2, 2, 3, '#3a2a1a');
  p.r(g.cx + 3 + g.lean, g.top + 3, 4, 3, '#6a5a4a'); // snout
  if (atk) p.r(g.cx + Math.floor(g.tw / 2) + 3 + reach, g.torsoY + 1, 2, 4, '#f0f0e0'); // claws
};
const knightExtra = (p, anim, i, g, atk, reach) => {
  p.r(g.cx - Math.ceil(g.tw / 2) - 3, g.torsoY, 4, 8, '#7a3030'); // shield
  p.r(g.cx - Math.ceil(g.tw / 2) - 2, g.torsoY + 2, 2, 3, '#d4af37');
  p.r(g.cx + 1, g.top + 2, 4, 1, DARK); // visor
  const up = atk ? [-6, 0, 2, 2][i % 4] : 0;
  p.r(g.cx + Math.floor(g.tw / 2) + 3 + reach, g.torsoY - 6 + up, 1, 10, '#d0d8e8'); // sword
};
const wizardExtra = (p, anim, i, g, atk) => {
  hat('#4a3aa0', '#d4af37')(p, anim, i, g);
  p.r(g.cx - 2, g.top + g.headH - 2, 5, 3, '#e8e8f0'); // beard
  staff(p, g, '#7a4a2a', '#9ad8ff', atk && i % 2);
};
const mageExtra = (p, anim, i, g, atk) => {
  hat('#2a3a6a', '#bfd0e0')(p, anim, i, g);
  p.r(g.cx - Math.ceil(g.tw / 2), g.torsoY, g.tw, 2, '#bfd0e0'); // pauldrons
  staff(p, g, '#5a4a3a', '#ffe060', atk && i % 2);
};
const demonExtra = (p, anim, i, g, atk, reach) => {
  p.r(g.cx - 5 + g.lean, g.top - 3, 2, 4, '#e8d8b0'); // horns
  p.r(g.cx + 3 + g.lean, g.top - 3, 2, 4, '#e8d8b0');
  p.r(g.cx - 2, g.torsoY + 3, 4, 2, '#ff9a30'); // glowing cracks
  if (atk) p.r(g.cx + Math.floor(g.tw / 2) + 5 + reach, g.torsoY, 2, 5, '#f0f0e0');
};
const necroExtra = (p, anim, i, g, atk) => {
  p.r(g.cx - 4 + g.lean, g.top - 1, 8, 3, '#2a2030'); // hood
  p.r(g.cx - 4 + g.lean, g.top, 2, g.headH, '#2a2030');
  staff(p, g, '#3a3030', '#7cff7a', atk && i % 2);
  p.r(g.cx + Math.floor(g.tw / 2) + 2, g.top - 4, 3, 2, '#e8e8e0'); // skull
};
const monopolyExtra = (p, anim, i, g, atk, reach) => {
  p.r(g.cx - 4 + g.lean, g.top - 1, 8, 1, '#141418'); // top hat brim
  p.r(g.cx - 3 + g.lean, g.top - 6, 6, 5, '#141418');
  p.r(g.cx - 3 + g.lean, g.top - 2, 6, 1, '#7a3030');
  p.r(g.cx - 1 + g.lean, g.top + g.headH - 3, 5, 1, '#f0f0f0'); // moustache
  p.r(g.cx + 2 + g.lean, g.top + 2, 2, 2, '#d4af37'); // monocle
  p.r(g.cx - 1, g.torsoY + 1, 2, g.torsoH - 2, '#f0f0f0'); // shirt front
  const ang = atk ? reach : 0;
  p.r(g.cx + Math.floor(g.tw / 2) + 2 + ang, g.torsoY + 2, 1, 10 - ang, '#2a1a10'); // cane
  p.r(g.cx + Math.floor(g.tw / 2) + 1 + ang, g.torsoY + 1, 3, 1, '#d4af37');
};
const golemExtra = (rivet) => (p, anim, i, g, atk, reach) => {
  const up = anim === 'slam' ? [-6, -8, 4, 2][i % 4] : 0;
  p.r(g.cx + Math.floor(g.tw / 2) + reach, g.torsoY + 4 + up, 8, 10, rivet ? '#7a8090' : '#8a5a34'); // big fist
  for (let k = 0; k < 4; k++) p.r(g.cx - 6 + k * 4, g.torsoY + 4 + (k % 2) * 5, 2, 2, rivet ? '#d0d8e0' : '#5a3a20');
  p.r(g.cx + 2, g.top + 3, 3, 2, rivet ? '#ff6040' : '#ffd27a'); // eyes
};
const robotExtra = (gun) => (p, anim, i, g, atk, reach) => {
  p.r(g.cx + 2 + g.lean, g.top + 3, 2, 2, anim === 'laser' && i % 2 ? '#ffffff' : '#ff2020'); // red eye
  for (let k = 0; k < 3; k++) p.r(g.cx - 3, g.torsoY + 2 + k * 3, 6, 1, '#3a3a40'); // ribs
  if (gun) {
    const spin = anim === 'minigun' ? i % 2 : 0;
    p.r(g.cx + Math.floor(g.tw / 2), g.torsoY + 4, 9, 3, '#3a3a44');
    p.r(g.cx + Math.floor(g.tw / 2) + 9, g.torsoY + 4 + spin, 3, 2, '#9aa0b0');
    if (anim === 'minigun' && i >= 2) p.r(g.cx + Math.floor(g.tw / 2) + 12, g.torsoY + 3, 3, 4, '#ffe080');
  }
};

// The dragon: big body, wings, long neck to the right, tail to the left.
function dragon(c) {
  return (p, anim, i, W, H) => {
    const cx = W / 2;
    const step = anim === 'walk' ? [2, 0, -2, 0][i % 4] : 0;
    const flap = anim === 'walk' ? [0, -2, -4, -2][i % 4] : -4;
    p.r(4, 40, 16, 6, c.body); // tail
    p.r(0, 36, 6, 5, c.body);
    p.r(cx - 14, 46, 8, 24 - Math.max(0, step), c.dark); // legs
    p.r(cx + 6, 46, 8, 24 - Math.max(0, -step), c.dark);
    p.r(cx - 18, 28, 36, 22, c.body); // body
    p.r(cx - 12, 36, 24, 12, c.belly);
    p.r(cx - 16, 8 + flap, 20, 20, c.wing); // wing
    p.r(cx - 22, 4 + flap, 8, 12, c.wing);
    const breath = anim === 'breath';
    const claw = anim === 'claw' ? [0, 6, 3][i % 3] : 0;
    p.r(cx + 12, 18, 8, 14, c.body); // neck
    p.r(cx + 16, 12 - (breath ? 2 : 0), 14, 9, c.body); // head
    p.r(cx + 24, 14, 2, 2, EYE);
    p.r(cx + 26, 19, 6, breath ? 4 : 2, c.dark); // jaw
    if (breath && i > 0) p.r(cx + 30, 18, 2, 3, '#ffb040');
    p.r(cx + 16, 9, 2, 4, '#e8d8b0'); // horns
    p.r(cx + 20, 8, 2, 4, '#e8d8b0');
    p.r(cx + 14 + claw, 40, 8, 4, c.dark); // front claw
    p.r(cx + 20 + claw, 42, 3, 2, '#f0f0e0');
  };
}

// ---- FX ----
function ellipseRing(p, w, h, color, gaps) {
  const rx = w / 2 - 0.5;
  const ry = h / 2 - 0.5;
  for (let y = 0; y < h; y++) {
    const dy = (y + 0.5 - h / 2) / ry;
    const half = Math.sqrt(Math.max(0, 1 - dy * dy)) * rx;
    const x0 = Math.round(w / 2 - half);
    const x1 = Math.round(w / 2 + half) - 1;
    if (gaps && gaps.includes(y)) continue;
    p.r(x0, y, 1, 1, color);
    p.r(x1, y, 1, 1, color);
  }
}
function shield(p, anim, i, W, H) {
  if (anim === 'break' && i >= 2) {
    for (let k = 0; k < 6; k++) p.r(2 + k * 4, 6 + ((k * 7) % 18), 2, 2, '#bfe8ff');
    return;
  }
  ellipseRing(p, W, H, '#9ad8ff', anim === 'break' ? [6, 7, 14, 20, 21] : null);
  p.r(6, 5, 3, 1, '#ffffff'); // shine (light top-left)
  p.r(5, 6, 1, 3, '#ffffff');
  const cracks = anim === 'crack1' ? 1 : anim === 'crack2' ? 2 : anim === 'break' ? 3 : 0;
  if (cracks >= 1) { p.r(16, 6, 1, 3, '#ffffff'); p.r(17, 9, 1, 3, '#ffffff'); p.r(15, 12, 1, 2, '#ffffff'); }
  if (cracks >= 2) { p.r(6, 18, 3, 1, '#ffffff'); p.r(9, 19, 1, 3, '#ffffff'); p.r(10, 22, 2, 1, '#ffffff'); }
}
function frostRay(p, anim, i, W, H) {
  p.r(0, 1, W, H - 2, '#5ab0f0');
  p.r(0, 2, W, H - 4, '#bfe8ff');
  for (let k = 0; k < 4; k++) p.r((k * 5 + i * 3) % W, (k % 2) ? 0 : H - 1, 2, 1, '#ffffff');
}
function frostHit(p, anim, i, W) {
  const r = 2 + i * 2;
  const c = W / 2;
  p.r(c - r, c, r * 2, 1, '#bfe8ff');
  p.r(c, c - r, 1, r * 2, '#bfe8ff');
  p.r(c - 1, c - 1, 3, 3, '#ffffff');
}
function laser(p, anim, i, W, H) {
  p.r(0, 0, W, H, '#c01818');
  p.r(0, 1, W, H - 2, i % 2 ? '#ff8080' : '#ff4040');
}
function summonCircle(p, anim, i, W, H) {
  ellipseRing(p, W, H, '#5aff6a', null);
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + i * 0.6;
    p.r(W / 2 + Math.cos(a) * (W / 2 - 4), H / 2 + Math.sin(a) * (H / 2 - 2), 2, 1, '#c0ffc0');
  }
}

const A = (frames, fps = 8, repeat) => ({ frames, fps, ...(repeat !== undefined ? { repeat } : {}) });
const walkHurt = (extra) => ({ walk: A(4, 8), ...extra, hurt: A(1) });

export const ENEMY_PLACEHOLDERS = {
  zombie: { size: [16, 22], meta: { collide: [10, 6] }, anims: walkHurt({ attack: A(3, 8, 0) }),
    c: { skin: '#8aa070', body: '#5a4a3a', legsC: '#3a3a4a', arms: '#8aa070', armsForward: true, extra: zombieExtra },
    variants: { wasserleiche: { skin: '#6aa0a0', arms: '#6aa0a0', body: '#2a4a5a' }, opa: { body: '#7a7a5a', skin: '#a0a888', arms: '#a0a888' } } },
  werewolf: { size: [22, 26], meta: { collide: [12, 6] }, anims: walkHurt({ claw: A(3, 10, 0) }),
    c: { skin: '#7a6a5a', body: '#6a5a4a', arms: '#7a6a5a', legsC: '#5a4a3a', width: 0.55, extra: wolfExtra },
    variants: { blutmond: { skin: '#8a4a3a', body: '#7a3a2a', arms: '#8a4a3a', legsC: '#5a2a1a' },
      alpha: { skin: '#b8c0c8', body: '#a0a8b0', arms: '#b8c0c8', legsC: '#808890' } } },
  knight: { size: [20, 28], meta: { collide: [12, 6] }, anims: walkHurt({ attack: A(4, 10, 0) }),
    c: { skin: '#a0a8b8', body: '#8890a0', arms: '#a0a8b8', legsC: '#606878', belt: '#5a3a2a', extra: knightExtra },
    variants: { schwarz: { skin: '#40404c', body: '#30303a', arms: '#40404c', legsC: '#24242c' } } },
  wizard: { size: [18, 28], meta: { collide: [10, 6] }, anims: walkHurt({ cast: A(4, 8, 0) }),
    c: { skin: '#e3a582', body: '#5a4ab0', robe: '#5a4ab0', arms: '#5a4ab0', top: 0.3, head: 0.18, extra: wizardExtra } },
  battlemage: { size: [20, 30], meta: { collide: [12, 6] }, anims: walkHurt({ attack: A(4, 10, 0) }),
    c: { skin: '#e3a582', body: '#5a6a8a', arms: '#8890a0', legsC: '#3a4a6a', top: 0.3, head: 0.18, extra: mageExtra } },
  horned_demon: { size: [28, 34], meta: { collide: [16, 8] }, anims: walkHurt({ claw: A(3, 10, 0) }),
    c: { skin: '#b03020', body: '#902818', arms: '#b03020', legsC: '#601810', width: 0.55, top: 0.12, extra: demonExtra } },
  necromancer: { size: [18, 30], meta: { collide: [10, 6] }, anims: walkHurt({ summon: A(4, 6, 0) }),
    c: { skin: '#c8c0b0', body: '#2a2030', robe: '#2a2030', arms: '#2a2030', top: 0.2, head: 0.18, extra: necroExtra } },
  monopoly_man: { size: [18, 28], meta: { collide: [10, 6] }, anims: walkHurt({ cane: A(3, 10, 0) }),
    c: { skin: '#f0c8a0', body: '#1a1a20', arms: '#1a1a20', legsC: '#1a1a20', top: 0.25, head: 0.2, extra: monopolyExtra } },
  clay_golem: { size: [40, 48], meta: { collide: [24, 10] }, anims: walkHurt({ slam: A(4, 6, 0) }),
    c: { skin: '#a8703e', body: '#a06838', arms: '#b07a48', legsC: '#8a5a30', feet: '#6a4020', width: 0.6, headW: 0.5,
      head: 0.18, extra: golemExtra(false) } },
  iron_golem: { size: [44, 52], meta: { collide: [26, 10] }, anims: walkHurt({ slam: A(4, 6, 0) }),
    c: { skin: '#9098a8', body: '#808898', arms: '#a0a8b8', legsC: '#606878', feet: '#404858', width: 0.6, headW: 0.5,
      head: 0.18, extra: golemExtra(true) } },
  dragon: { size: [64, 72], meta: { collide: [34, 12] }, anims: walkHurt({ claw: A(3, 8, 0), breath: A(3, 8, 0) }),
    c: { body: '#3a7a3a', belly: '#9ab060', wing: '#2a5a3a', dark: '#1e3e24' }, draw: dragon },
  terminator: { size: [22, 32], meta: { collide: [12, 6] }, anims: walkHurt({ punch: A(3, 10, 0), laser: A(3, 8, 0) }),
    c: { skin: '#b0b8c0', body: '#9aa0a8', arms: '#b0b8c0', legsC: '#808890', feet: '#505860', extra: robotExtra(false) } },
  terminator_elite: { size: [24, 32], meta: { collide: [12, 6] }, anims: walkHurt({ punch: A(3, 10, 0), minigun: A(4, 14, 0) }),
    c: { skin: '#808890', body: '#606870', arms: '#808890', legsC: '#505860', feet: '#383e44', extra: robotExtra(true) } },

  fx_magic_shield: { size: [24, 30], origin: [0.5, 1], anims: { full: A(1), crack1: A(1), crack2: A(1), break: A(3, 10, 0) }, draw: shield },
  fx_frost_ray: { size: [16, 6], origin: [0, 0.5], anims: { default: A(3, 14) }, draw: frostRay },
  fx_frost_hit: { size: [12, 12], origin: [0.5, 0.5], anims: { default: A(3, 14, 0) }, draw: frostHit },
  fx_laser: { size: [16, 4], origin: [0, 0.5], anims: { default: A(2, 16) }, draw: laser },
  fx_summon_circle: { size: [32, 12], origin: [0.5, 0.5], anims: { default: A(4, 8) }, draw: summonCircle },
};

// Sprite definition (size/origin/meta) for an enemy sprite: art first, then these placeholders, then crew ones.
export function enemyDef(name) {
  return spriteDef(name) || ENEMY_PLACEHOLDERS[name] || crewDef(name);
}

export function createEnemyPlaceholders(scene) {
  for (const [name, d] of Object.entries(ENEMY_PLACEHOLDERS)) {
    if (scene.textures.exists(name)) continue; // real art (variants then fall back to a tint)
    const draw = d.draw ? (d.c ? d.draw(d.c) : d.draw) : figure(d.c);
    make(scene, name, d, draw);
    for (const [variant, over] of Object.entries(d.variants || {})) {
      const c = { ...d.c, ...over };
      make(scene, `${name}__${variant}`, d, d.draw ? d.draw(c) : figure(c));
    }
  }
}

function make(scene, key, d, draw) {
  if (scene.textures.exists(key)) return;
  const s = ART.scale;
  const [w, h] = d.size;
  const frames = [];
  for (const anim of Object.keys(d.anims)) for (let i = 0; i < d.anims[anim].frames; i++) frames.push([anim, i]);
  const tex = scene.textures.createCanvas(key, frames.length * w * s, h * s);
  const ctx = tex.getContext();
  frames.forEach(([anim, i], fi) => {
    const ox = fi * w * s;
    ctx.save();
    ctx.beginPath();
    ctx.rect(ox, 0, w * s, h * s);
    ctx.clip();
    draw(painter(ctx, ox, s), anim, i, w, h);
    ctx.restore();
  });
  tex.refresh();
  frames.forEach(([anim, i], fi) => tex.add(`${anim}_${i}`, 0, fi * w * s, 0, w * s, h * s));
  for (const anim of Object.keys(d.anims)) {
    const a = d.anims[anim];
    const animKey = `${key}_${anim}`;
    if (a.frames < 2 || scene.anims.exists(animKey)) continue;
    const list = [];
    for (let i = 0; i < a.frames; i++) list.push({ key, frame: `${anim}_${i}` });
    scene.anims.create({ key: animKey, frames: list, frameRate: a.fps || 8, repeat: a.repeat ?? -1 });
  }
}

function painter(ctx, ox, s) {
  return {
    r(x, y, w, h, color) {
      if (w <= 0 || h <= 0) return;
      ctx.fillStyle = color;
      ctx.fillRect(ox + Math.round(x) * s, Math.round(y) * s, Math.round(w) * s, Math.round(h) * s);
    },
  };
}

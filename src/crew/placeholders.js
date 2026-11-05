import { ART } from '../data/config.js';
import { spriteDef } from '../art/render.js';






const SKIN = '#e3a582';
const SKIN_D = '#b86e58';
const DARK = '#141325';

// Humanoid headless body (photo head goes on meta.neck). c = colours, extra(p, anim, i, bob) = props.
function body(c, extra) {
  return (p, anim, i, W, bob) => {
    const cx = W / 2;
    const step = anim === 'walk' ? [1, 0, -1, 0][i % 4] : 0;
    p.r(cx - 4, 15, 3, 6 - Math.max(0, step), c.pants);
    p.r(cx + 1, 15, 3, 6 - Math.max(0, -step), c.pants);
    p.r(cx - 5, 20 - Math.max(0, step), 4, 2, c.shoes || DARK);
    p.r(cx + 1, 20 - Math.max(0, -step), 4, 2, c.shoes || DARK);
    if (c.coat) p.r(cx - 6, 2 + bob, 12, 16, c.coat);
    p.r(cx - 5, 2 + bob, 10, 13, c.shirt);
    if (c.check) for (let y = 3; y < 14; y += 3) p.r(cx - 5, y + bob, 10, 1, c.check);
    p.r(cx - 7, 3 + bob, 2, 9, c.arms || c.shirt);
    p.r(cx + 5, 3 + bob, 2, 9, c.arms || c.shirt);
    p.r(cx - 1, 1 + bob, 2, 2, SKIN);
    if (extra) extra(p, anim, i, cx, bob);
  };
}

const flamethrower = (p, anim, i, cx, bob) => {
  p.r(cx - 9, 6 + bob, 3, 7, '#a8483d'); // tank
  p.r(cx - 4, 11 + bob, 16, 2, '#656b80'); // wand pointing right
  if (anim === 'fire') p.r(cx + 12, 10 + bob - (i % 2), 3, 4, i % 2 ? '#ffd27a' : '#f5a043');
};
const syringe = (p, anim, i, cx, bob) => {
  if (anim !== 'inject') return;
  p.r(cx + 3, 4 + bob + i, 6, 1, '#bfd0e0');
  p.r(cx + 8, 4 + bob + i, 2, 1, '#7ccf6a');
};
const pickaxe = (p, anim, i, cx, bob) => {
  const up = anim === 'swing' ? [0, -4, 2, 4][i % 4] : anim === 'dig' ? [0, 3, 5][i % 3] : 0;
  p.r(cx + 6, 4 + bob + up, 2, 12, '#7a4a2a');
  p.r(cx + 3, 3 + bob + up, 9, 2, '#9aa0b0');
};
const ripShirt = (p, anim, i, cx, bob) => {
  if (anim !== 'rip') return;
  p.r(cx - 5, 2 + bob, 10, Math.min(13, i * 4), SKIN); // shirt comes off top-down
  if (i >= 2) p.r(cx + 6, 1 + bob - i, 4, 3, '#6a4a3a'); // shirt rag flying away
};
const mma = (p, anim, i, cx, bob) => {
  p.r(cx - 5, 12 + bob, 10, 4, DARK); // shorts
  if (anim === 'punch' && i % 2 === 1) p.r(cx + 5, 6 + bob, 7, 2, SKIN);
  if (anim === 'kick' && i % 2 === 1) p.r(cx + 3, 13, 8, 3, SKIN);
};

// Pure pixel-art god with a head: c.head(p, cx, top) draws hair/helmet/beard.
function god(c) {
  return (p, anim, i, W, bob, H) => {
    const cx = W / 2;
    const step = anim === 'walk' ? [1, 0, -1, 0][i % 4] : 0;
    const top = H - 40;
    p.r(cx - 5, top + 28, 4, 10 - Math.max(0, step), c.pants);
    p.r(cx + 1, top + 28, 4, 10 - Math.max(0, -step), c.pants);
    const bigBoot = c.bigBoot ? 4 : 0;
    p.r(cx - 6 - bigBoot, top + 36 - Math.max(0, step), 6 + bigBoot, 4, c.boots);
    p.r(cx + 1, top + 37 - Math.max(0, -step), 5, 3, c.boots);
    p.r(cx - 7, top + 12 + bob, 14, 17, c.tunic);
    if (c.cloak) p.r(cx - 8, top + 11 + bob, 3, 20, c.cloak);
    p.r(cx - 10, top + 13 + bob, 3, 12, c.arms);
    p.r(cx + 7, top + 13 + bob, 3, 12, c.arms);
    p.r(cx - 4, top + 3 + bob, 8, 9, SKIN); // face
    p.r(cx + 1, top + 6 + bob, 2, 1, DARK); // eye
    if (!c.eyepatch) p.r(cx - 3, top + 6 + bob, 2, 1, DARK);
    else p.r(cx - 4, top + 5 + bob, 3, 2, DARK);
    c.head(p, cx, top + bob, anim, i);
    c.weapon(p, cx, top + bob, anim, i);
  };
}

const thorHead = (p, cx, t) => {
  p.r(cx - 4, t + 9, 8, 5, '#c0402a'); // red beard
  p.r(cx - 5, t, 10, 4, '#9aa0b0'); // helmet
  p.r(cx - 8, t - 2, 3, 4, '#e8e8f0'); // wings
  p.r(cx + 5, t - 2, 3, 4, '#e8e8f0');
};
const thorHammer = (p, cx, t, anim, i) => {
  const up = anim === 'smash' ? [-8, -10, 4][i % 3] : 0;
  p.r(cx + 9, t + 14 + up, 2, 10, '#7a4a2a');
  p.r(cx + 6, t + 10 + up, 8, 5, '#8b92a6');
};
const odinHead = (p, cx, t) => {
  p.r(cx - 4, t + 9, 8, 7, '#e8e8f0'); // white beard
  p.r(cx - 7, t + 1, 14, 2, '#3a3a50'); // hat brim
  p.r(cx - 4, t - 3, 8, 4, '#3a3a50');
};
const odinSpear = (p, cx, t, anim, i) => {
  const fwd = anim === 'stab' ? [0, 6, 2][i % 3] : 0;
  p.r(cx + 9 + fwd, t + 2, 1, 30, '#7a4a2a');
  p.r(cx + 8 + fwd, t - 1, 3, 4, '#bfd0e0');
  if (anim === 'cast') p.r(cx - 13, t + 10 - i * 2, 3, 3, '#141325'); // a raven taking off
};
const vidarHead = (p, cx, t) => {
  p.r(cx - 5, t, 10, 4, '#8a5a2a'); // hair
  p.r(cx - 4, t + 10, 8, 3, '#8a5a2a');
};
const vidarKick = (p, cx, t, anim, i) => {
  if (anim === 'flykick' || (anim === 'dropkick' && i % 2 === 1)) p.r(cx + 4, t + 30, 12, 6, '#5a3a1a');
};

function demon(p, anim, i, W, bob, H) {
  const cx = W / 2;
  const step = anim === 'walk' ? [2, 0, -2, 0][i % 4] : 0;
  const rise = anim === 'emerge' ? Math.max(0, 40 - i * 8) : 0; // emerge frames climb out of the frame bottom
  const t = rise;
  p.r(cx - 22, t + 14, 44, 30, '#ff7a20'); // flame aura
  p.r(cx - 18, t + 8, 36, 40, '#2a0a0a'); // body
  p.r(cx - 30, t + 10, 12, 22, '#3a0e0e'); // wings
  p.r(cx + 18, t + 10, 12, 22, '#3a0e0e');
  p.r(cx - 14, t + 48, 10, 22 - Math.max(0, step), '#2a0a0a'); // legs
  p.r(cx + 4, t + 48, 10, 22 - Math.max(0, -step), '#2a0a0a');
  p.r(cx - 8, t, 16, 12, '#3a0e0e'); // head
  p.r(cx - 12, t - 4, 4, 8, '#d8c8a0'); // horns
  p.r(cx + 8, t - 4, 4, 8, '#d8c8a0');
  p.r(cx - 5, t + 4, 3, 2, '#ffd27a'); // eyes
  p.r(cx + 2, t + 4, 3, 2, '#ffd27a');
  for (let k = 0; k < 5; k++) p.r(cx - 12 + k * 6, t + 18 + ((k * 7 + i) % 20), 3, 2, '#ff9a30'); // lava cracks
  const swordUp = anim === 'slam' ? [-20, -26, 6, 10][i % 4] : 0;
  p.r(cx + 20, t + 4 + swordUp, 4, 34, '#ffb040'); // flame sword
  p.r(cx + 18, t + 36 + swordUp, 8, 3, '#7a3033');
  if (anim === 'whip') p.r(cx - 30 - i * 6, t + 30 + (i % 2) * 4, 18 + i * 6, 2, '#ff9a30');
}

function hulk(p, anim, i, W, bob) {
  const cx = W / 2;
  const step = anim === 'walk' ? [1, 0, -1, 0][i % 4] : 0;
  p.r(cx - 7, 28, 5, 11 - Math.max(0, step), '#1a1a2a');
  p.r(cx + 2, 28, 5, 11 - Math.max(0, -step), '#1a1a2a');
  p.r(cx - 9, 8 + bob, 18, 21, '#5a2a7a'); // emo top
  for (let y = 10; y < 28; y += 4) p.r(cx - 9, y + bob, 18, 1, '#141325');
  const up = anim === 'slam' ? [-8, -10, 6][i % 3] : 0;
  const fwd = anim === 'lunge' ? [2, 8, 4][i % 3] : 0;
  p.r(cx - 19, 8 + bob + up, 10, 18, SKIN); // giant arms
  p.r(cx + 9 + fwd, 8 + bob + up, 10, 18, SKIN);
  p.r(cx - 20, 24 + bob + up, 12, 7, SKIN_D); // fists
  p.r(cx + 8 + fwd, 24 + bob + up, 12, 7, SKIN_D);
  p.r(cx - 2, 5 + bob, 4, 4, SKIN); // neck
}

// --- FX / items ---
function raven(p, anim, i) {
  p.r(3, 4, 6, 3, '#141325');
  p.r(9, 4, 2, 2, '#141325');
  p.r(11, 5, 1, 1, '#d4af37');
  const wy = [0, 3, 6][i % 3];
  p.r(4, wy, 4, 3, '#2e2848');
}
function bifrost(p, anim, i) {
  const cols = ['#ff4040', '#ffa040', '#ffe040', '#60e060', '#40a0ff', '#a060ff'];
  for (let y = 0; y < 96; y += 4) {
    for (let k = 0; k < 6; k++) p.r(k * 4, y, 4, 4, cols[(k + Math.floor(y / 8) + i) % 6]);
  }
}
function hole(p, anim, i) {
  p.r(2, 4, 28, 10, '#3a2a1a');
  p.r(5, 6, 22, 7, '#140808');
  p.r(9, 8, 14, 3, i % 2 ? '#ff7a20' : '#c84a10');
}
function flame(p, anim, i) {
  p.r(2, 2, 10 + i, 4, '#f5a043');
  p.r(4, 3, 6, 2, '#ffd27a');
  p.r(12 + i, 3, 3, 2, '#d0692a');
}
function burn(p, anim, i) {
  const h = [8, 10, 9, 11][i % 4];
  p.r(1, 12 - h, 6, h, '#e05a20');
  p.r(2, 13 - h + 2, 4, h - 3, '#f5a043');
  p.r(3, 12 - Math.floor(h / 2), 2, Math.floor(h / 2) - 1, '#ffd27a');
}
function shot(p) {
  p.r(1, 1, 6, 11, '#e8e8f0');
  p.r(2, 4, 4, 7, '#d23a3a');
  p.r(2, 4, 4, 2, '#ff8a6a');
}
const glass = (liquid, foam) => (p) => {
  p.r(1, 2, 6, 10, '#d8e8f0');
  p.r(2, 4, 4, 7, liquid);
  if (foam) p.r(2, 3, 4, 1, foam);
};
function tallGlass(p) {
  p.r(2, 0, 4, 12, '#d8e8f0');
  p.r(3, 2, 2, 9, '#a0602a');
  p.r(5, 0, 1, 3, '#7ccf6a'); // straw
}
function plate(p) {
  p.r(0, 6, 12, 2, '#e8e8f0');
  p.r(1, 3, 5, 3, '#6a4020'); // rye bread
  p.r(6, 3, 5, 3, '#d88080'); // Jagdwurst
  p.r(7, 4, 1, 1, '#f0c0c0');
}

// Eigenbedarf boss: a huge bouncer-ish brute (placeholder).
function boss(p, anim, i, W) {
  const cx = W / 2;
  const step = anim === 'walk' ? [2, 0, -2, 0][i % 4] : 0;
  const up = anim === 'slam' ? [-10, -14, 6, 4][i % 4] : 0;
  const fwd = anim === 'lunge' ? [0, 14, 8][i % 3] : 0;
  p.r(cx - 12, 50, 10, 22 - Math.max(0, step), '#2a2a34');
  p.r(cx + 2, 50, 10, 22 - Math.max(0, -step), '#2a2a34');
  p.r(cx - 16, 16, 32, 36, '#7a2a2a'); // red pub shirt
  p.r(cx - 16, 26, 32, 4, '#d4af37'); // EIMER band
  p.r(cx - 30, 16 + up, 14, 26, '#c88a6a'); // giant arms
  p.r(cx + 16 + fwd, 16 + up, 14, 26, '#c88a6a');
  p.r(cx - 32, 40 + up, 16, 10, '#a86a4a'); // fists
  p.r(cx + 16 + fwd, 40 + up, 16, 10, '#a86a4a');
  p.r(cx - 8, 2, 16, 14, '#c88a6a'); // bald head
  p.r(cx - 5, 7, 3, 2, '#141325');
  p.r(cx + 2, 7, 3, 2, '#141325');
  p.r(cx - 5, 12, 10, 2, '#5a2a1a'); // grim mouth
}

// Disco ball hanging from a string (origin = top of the string); facets shift per frame = spin.
function discoBall(p, anim, i) {
  p.r(11, 0, 2, 9, '#8b92a6'); // string
  const cols = ['#e8e8f0', '#9aa0b0', '#c8d0e0', '#6a7080'];
  for (let y = 9; y < 28; y += 2) {
    for (let x = 2; x < 22; x += 2) {
      const dx = x + 1 - 12;
      const dy = y + 1 - 18.5;
      if (dx * dx + dy * dy > 90) continue;
      p.r(x, y, 2, 2, cols[(x / 2 + y / 2 + i) % 4]);
    }
  }
  p.r(7 + i, 12, 2, 2, '#ffffff'); // highlight
}

function firebreath(p, anim, i) {
  const len = 16 + i * 8;
  for (let x = 0; x < len; x += 2) {
    const half = 1 + Math.floor((x / 40) * 11);
    p.r(x, 12 - half, 2, half * 2, x < len * 0.4 ? '#ffd27a' : x < len * 0.75 ? '#f5a043' : '#e05a20');
  }
}

const humanAnims = (extra) => ({ idle: { frames: 2, fps: 2 }, walk: { frames: 4, fps: 8 }, ...extra });
const bob2 = { idle: [0, 1], walk: [1, 0, 1, 0] };

export const CREW_PLACEHOLDERS = {
  champ_hans_body: { size: [24, 22], origin: [0.5, 1], meta: { neck: { x: 12, y: 1 }, neckBob: bob2, collide: [10, 6], nozzle: { x: 24, y: 12 } },
    anims: humanAnims({ fire: { frames: 3, fps: 12 } }), draw: body({ coat: '#141418', shirt: '#2a2a30', pants: '#202024' }, flamethrower) },
  champ_hannah_body: { size: [24, 22], origin: [0.5, 1], meta: { neck: { x: 12, y: 1 }, neckBob: bob2, collide: [10, 6] },
    anims: humanAnims({ inject: { frames: 4, fps: 6, repeat: 0 } }), draw: body({ shirt: '#5a2a7a', check: '#141325', pants: '#1a1a2a', arms: SKIN }, syringe) },
  champ_danny_body: { size: [24, 22], origin: [0.5, 1], meta: { neck: { x: 12, y: 1 }, neckBob: bob2, collide: [10, 6] },
    anims: humanAnims({ swing: { frames: 4, fps: 12, repeat: 0 }, dig: { frames: 3, fps: 8 } }), draw: body({ shirt: '#18181c', pants: '#2e3a5e', arms: SKIN }, pickaxe) },
  champ_mike_body: { size: [24, 22], origin: [0.5, 1], meta: { neck: { x: 12, y: 1 }, neckBob: bob2, collide: [10, 6] },
    anims: humanAnims(), draw: body({ shirt: '#2e6a2e', check: '#163a16', pants: '#2e3a5e' }) },
  champ_johnny_body: { size: [24, 22], origin: [0.5, 1], meta: { neck: { x: 12, y: 1 }, neckBob: bob2, collide: [10, 6] },
    anims: humanAnims({ rip: { frames: 4, fps: 5, repeat: 0 } }), draw: body({ shirt: '#6a4a3a', check: '#5a3a2a', pants: '#141418' }, ripShirt) },
  champ_johnny_bare_body: { size: [24, 22], origin: [0.5, 1], meta: { neck: { x: 12, y: 1 }, neckBob: bob2, collide: [10, 6] },
    anims: humanAnims({ punch: { frames: 2, fps: 12, repeat: 0 }, kick: { frames: 2, fps: 8, repeat: 0 } }), draw: body({ shirt: SKIN, pants: '#141418', arms: SKIN }, mma) },
  hannah_hulk_body: { size: [40, 40], origin: [0.5, 1], meta: { neck: { x: 20, y: 6 }, neckBob: { walk: [1, 0, 1, 0] }, collide: [18, 8], headScale: 1.5 },
    anims: { walk: { frames: 4, fps: 8 }, slam: { frames: 3, fps: 8, repeat: 0 }, lunge: { frames: 3, fps: 10, repeat: 0 } }, draw: hulk },
  god_thor: { size: [28, 40], origin: [0.5, 1], meta: { collide: [12, 6] },
    anims: humanAnims({ smash: { frames: 3, fps: 8, repeat: 0 } }),
    draw: god({ tunic: '#8a2a2a', pants: '#3a3a50', boots: '#5a3a1a', arms: SKIN, head: thorHead, weapon: thorHammer }) },
  god_odin: { size: [28, 42], origin: [0.5, 1], meta: { collide: [12, 6] },
    anims: humanAnims({ stab: { frames: 3, fps: 10, repeat: 0 }, cast: { frames: 3, fps: 8, repeat: 0 } }),
    draw: god({ tunic: '#4a5a7a', cloak: '#2e3a5e', pants: '#3a3a50', boots: '#3a2a1a', arms: '#4a5a7a', eyepatch: true, head: odinHead, weapon: odinSpear }) },
  god_vidar: { size: [28, 40], origin: [0.5, 1], meta: { collide: [12, 6] },
    anims: humanAnims({ dropkick: { frames: 2, fps: 6, repeat: 0 }, flykick: { frames: 2, fps: 8, repeat: 0 } }),
    draw: god({ tunic: '#3a5a2a', pants: '#4a3a2a', boots: '#5a3a1a', arms: SKIN, bigBoot: true, head: vidarHead, weapon: vidarKick }) },
  flame_demon: { size: [64, 72], origin: [0.5, 1], meta: { collide: [30, 10] },
    anims: { emerge: { frames: 6, fps: 4, repeat: 0 }, walk: { frames: 4, fps: 4 }, whip: { frames: 3, fps: 8, repeat: 0 }, slam: { frames: 4, fps: 8, repeat: 0 } },
    draw: demon },
  raven: { size: [12, 10], origin: [0.5, 0.5], anims: { fly: { frames: 3, fps: 12 } }, draw: raven },
  fx_bifrost: { size: [24, 96], origin: [0.5, 1], anims: { default: { frames: 4, fps: 8 } }, draw: bifrost },
  dig_hole: { size: [32, 16], origin: [0.5, 0.5], anims: { default: { frames: 2, fps: 4 } }, draw: hole },
  fx_flame: { size: [16, 8], origin: [0.5, 0.5], anims: { default: { frames: 3, fps: 12, repeat: 0 } }, draw: flame },
  fx_burn: { size: [8, 12], origin: [0.5, 1], anims: { default: { frames: 4, fps: 10 } }, draw: burn },
  drink_mexikaner: { size: [8, 12], origin: [0.5, 1], anims: { default: { frames: 1 } }, draw: shot },
  drink_jackie_cola: { size: [8, 12], origin: [0.5, 1], anims: { default: { frames: 1 } }, draw: glass('#5a2a10', '#c8a080') },
  drink_long_eimer_ice_tea: { size: [8, 12], origin: [0.5, 1], anims: { default: { frames: 1 } }, draw: tallGlass },
  drink_radler: { size: [8, 12], origin: [0.5, 1], anims: { default: { frames: 1 } }, draw: glass('#e8c040', '#ffffff') },
  drink_berliner_luft: { size: [8, 12], origin: [0.5, 1], anims: { default: { frames: 1 } }, draw: glass('#a8e8d0', null) },
  drink_taktisches_zwiwa: { size: [8, 12], origin: [0.5, 1], anims: { default: { frames: 1 } }, draw: glass('#e8d860', '#ffffff') },
  food_brotzeitteller: { size: [12, 8], origin: [0.5, 1], anims: { default: { frames: 1 } }, draw: plate },
  eigenbedarf_boss: { size: [64, 72], origin: [0.5, 1],
    meta: { collide: [30, 10], slam: { frame: 2, x: 48, y: 70 }, lunge: { frame: 1, x: 62, y: 44 } },
    anims: { walk: { frames: 4, fps: 4 }, slam: { frames: 4, fps: 5, repeat: 0 }, lunge: { frames: 3, fps: 5, repeat: 0 } },
    draw: boss },
  fx_disco_ball: { size: [24, 28], origin: [0.5, 0], anims: { spin: { frames: 4, fps: 6 } }, draw: discoBall },
  fx_firebreath: { size: [40, 24], origin: [0, 0.5], anims: { default: { frames: 4, fps: 14, repeat: 0 } }, draw: firebreath },
};

// Sprite definition (size/origin/meta) of a crew sprite: the art's if it exists, else the placeholder's.
export function crewDef(name) {
  return spriteDef(name) || CREW_PLACEHOLDERS[name] || null;
}

export function createCrewPlaceholders(scene) {
  const s = ART.scale;
  for (const name of Object.keys(CREW_PLACEHOLDERS)) {
    if (scene.textures.exists(name)) continue;
    const d = CREW_PLACEHOLDERS[name];
    const [w, h] = d.size;
    const frames = [];
    for (const anim of Object.keys(d.anims)) for (let i = 0; i < d.anims[anim].frames; i++) frames.push([anim, i]);
    const tex = scene.textures.createCanvas(name, frames.length * w * s, h * s);
    const ctx = tex.getContext();
    frames.forEach(([anim, i], fi) => {
      const ox = fi * w * s;
      ctx.save();
      ctx.beginPath();
      ctx.rect(ox, 0, w * s, h * s);
      ctx.clip();
      const bob = d.meta?.neckBob?.[anim]?.[i] ?? 0;
      d.draw(painter(ctx, ox, s), anim, i, w, bob, h);
      ctx.restore();
    });
    tex.refresh();
    frames.forEach(([anim, i], fi) => tex.add(`${anim}_${i}`, 0, fi * w * s, 0, w * s, h * s));
    for (const anim of Object.keys(d.anims)) {
      const a = d.anims[anim];
      const key = `${name}_${anim}`;
      if (a.frames < 2 || scene.anims.exists(key)) continue;
      const list = [];
      for (let i = 0; i < a.frames; i++) list.push({ key: name, frame: `${anim}_${i}` });
      scene.anims.create({ key, frames: list, frameRate: a.fps || 8, repeat: a.repeat ?? -1 });
    }
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

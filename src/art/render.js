import { SPRITES } from './index.js';
import { ART } from '../data/config.js';



export function registerSprites(scene) {
  const s = ART.scale;
  for (const def of SPRITES) {
    const variants = [['', {}], ...Object.entries(def.paletteVariants || {})];
    for (const [variant, override] of variants) {
      const key = variant ? `${def.name}__${variant}` : def.name;
      if (scene.textures.exists(key)) continue;
      registerOne(scene, key, def, { ...def.palette, ...override }, s);
    }
  }
}

function registerOne(scene, key, def, palette, s) {
  const [w, h] = def.size;
  const frames = [];
  for (const [anim, data] of Object.entries(def.anims)) {
    data.frames.forEach((rows, i) => frames.push({ anim, i, rows }));
  }

  const tex = scene.textures.createCanvas(key, frames.length * w * s, h * s);
  const ctx = tex.getContext();
  frames.forEach((f, fi) => {
    const ox = fi * w * s;
    for (let y = 0; y < h; y++) {
      const row = f.rows[y];
      for (let x = 0; x < w; x++) {
        const c = row[x];
        if (c === '.') continue;
        ctx.fillStyle = palette[c];
        ctx.fillRect(ox + x * s, y * s, s, s);
      }
    }
  });
  tex.refresh();
  frames.forEach((f, fi) => tex.add(`${f.anim}_${f.i}`, 0, fi * w * s, 0, w * s, h * s));

  for (const [anim, data] of Object.entries(def.anims)) {
    if (data.frames.length < 2) continue;
    scene.anims.create({
      key: `${key}_${anim}`,
      frames: data.frames.map((_, i) => ({ key, frame: `${anim}_${i}` })),
      frameRate: data.fps || 8,
      repeat: data.repeat ?? -1,
    });
  }
}

// Sprite definition lookup (for origin/meta) by name.
export function spriteDef(name) {
  return SPRITES.find((d) => d.name === name);
}

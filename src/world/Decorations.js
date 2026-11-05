import { ART, DEPTH, LIGHTS } from '../data/config.js';
import { PLACEHOLDERS } from '../data/map/index.js';
import { spriteDef } from '../art/render.js';

// Hand-placed props, landmarks and street lamps: [name, tileX, tileY, opts].
// Position: bottom-centre of the tile (4 px up, as always) for normal sprites, top-left for origin [0,0] tiles.
// opts (all optional): ox/oy = offset in art px (oy given = measured from the tile's exact bottom edge),
// variant, anim, flip, layer ("above" = over characters, "ground" = flat decal), repeat + step (n copies, each
// step [dx, dy] tiles further; default [1, 0]), door (door zone id), street (street-sign name, data only).
// Missing art -> a flat placeholder box from data/map/placeholders.js with the same size/collision.
export class Decorations {
  constructor(scene, town) {
    this.scene = scene;
    this.town = town;
    this.px = town.px;
    this.byName = new Map(); // name -> placed objects (setAnim)
  }

  placeDistrict(d, rng) {
    this.rng = rng;
    this.masts = [];
    this.wireSprite = d.wires?.sprite || null;
    const list = [...d.decorations];
    // Lamps keep a one-tile distance from hand-placed decorations.
    const taken = new Set();
    for (const [, tx, ty] of list) {
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) taken.add(`${tx + dx},${ty + dy}`);
    }
    for (const [x0, y0, x1, y1, step] of d.lampLines) {
      const n = Math.floor(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) / step);
      for (let i = 0; i <= n; i++) {
        const tx = x0 + Math.sign(x1 - x0) * i * step;
        const ty = y0 + Math.sign(y1 - y0) * i * step;
        if (d.lampClear.some(([cx, cy, cw, ch]) => tx >= cx && tx < cx + cw && ty >= cy && ty < cy + ch)) continue;
        if (taken.has(`${tx},${ty}`)) continue;
        list.push([d.lampSprite, tx, ty, {}]);
      }
    }
    list.push(...d.extraDecorations); // after the lamps, so older placements keep their random variants
    for (const [name, tx0, ty0, opts = {}] of list) {
      const [sx, sy] = opts.step || [1, 0];
      for (let k = 0; k < (opts.repeat || 1); k++) {
        const tx = tx0 + k * sx;
        const ty = ty0 + k * sy;
        if (this.town.grid.isHouseTile(tx, ty)) {
          console.warn(`decoration ${name} at ${tx},${ty} is inside a building or off-map`);
          continue;
        }
        this.add(name, tx, ty, opts);
      }
    }
    if (d.wires) this.drawWires(d.wires);
  }

  // Sprite info: the real def if its texture exists, else the placeholder entry (or null).
  info(name) {
    const def = spriteDef(name);
    if (def && this.scene.textures.exists(name)) return { def, real: true };
    const ph = PLACEHOLDERS[name];
    return ph && typeof ph === 'object' ? { def: ph, real: false } : null;
  }

  // Anchor point in world px for a placement (see the class comment).
  anchor(tx, ty, opts, origin) {
    const { px } = this;
    const s = ART.scale;
    const ox = (opts.ox || 0) * s;
    if (origin[0] === 0 && origin[1] === 0) return [tx * px + ox, ty * px + (opts.oy || 0) * s];
    const y = opts.oy !== undefined ? (ty + 1) * px + opts.oy * s : (ty + 1) * px - 4;
    return [(tx + 0.5) * px + ox, y];
  }

  add(name, tx, ty, opts) {
    const { scene } = this;
    const found = this.info(name);
    if (!found) {
      const f = LIGHTS.lampFallback;
      if (name === 'lamp') this.town.addGlow((tx + 0.5) * this.px, (ty + 1) * this.px - f.offsetY, f.scale, f.color, f.alpha, -5);
      return;
    }
    const { def, real } = found;
    const s = ART.scale;
    const [w, h] = def.size;
    const origin = def.origin || [0.5, 1];
    const [x, y] = this.anchor(tx, ty, opts, origin);
    const left = x - w * s * origin[0];
    const top = y - h * s * origin[1];
    const bottom = top + h * s;
    const meta = def.meta || {};

    let obj;
    let anim = null;
    if (real) {
      // Random colour variant (e.g. bikes), if the sprite has any; an explicit variant wins.
      const variants = Object.keys(def.paletteVariants || {});
      const pick = this.rng.between(0, variants.length);
      let key = pick < variants.length ? `${name}__${variants[pick]}` : name;
      if (opts.variant && scene.textures.exists(`${name}__${opts.variant}`)) key = `${name}__${opts.variant}`;
      anim = opts.anim && def.anims[opts.anim] ? opts.anim : Object.keys(def.anims)[0];
      if (scene.anims.exists(`${key}_${anim}`)) obj = scene.add.sprite(x, y, key).play(`${key}_${anim}`);
      else obj = scene.add.image(x, y, key, `${anim}_0`);
    } else {
      obj = scene.add.image(x, y, placeholderTexture(scene, name, def));
    }
    obj.setOrigin(origin[0], origin[1]);
    if (!this.byName.has(name)) this.byName.set(name, []);
    this.byName.get(name).push(obj);
    if (opts.flip) obj.setFlipX(true);
    const layer = opts.layer || meta.layer;
    if (layer === 'above') obj.setDepth(DEPTH.above + bottom / 10000);
    else if (layer === 'ground') obj.setDepth(-8);
    else obj.setDepth(bottom);

    this.addSolids(meta, left, top, bottom, w);
    this.addLights(meta, anim, left, top, bottom);
    if (meta.door) this.town.addDoorZone(opts.door || name, left + meta.door.x * s, bottom, meta.door.w * s);
    // Extra doors with their own id (the Hauptbahnhof's 24/7 shop next to the main hall).
    for (const d of meta.shopDoors || []) this.town.addDoorZone(d.id, left + d.x * s, bottom, d.w * s);
    if (this.wireSprite === name) this.masts.push([x, top]);
  }

  // Switches every placed `name` decoration to its art anim `anim` (e.g. the Eimer's 'nobucket').
  // Does nothing for placeholders or art without that anim.
  setAnim(name, anim) {
    const list = this.byName.get(name);
    if (!list) return;
    for (const obj of list) {
      const key = obj.texture.key;
      if (obj.anims && this.scene.anims.exists(`${key}_${anim}`)) obj.play(`${key}_${anim}`, true);
      else if (obj.texture.has(`${anim}_0`)) {
        obj.anims?.stop();
        obj.setFrame(`${anim}_0`);
      }
    }
  }

  addSolids(meta, left, top, bottom, w) {
    const s = ART.scale;
    const grid = this.town.grid;
    if (meta.solids) {
      for (const [rx, ry, rw, rh] of meta.solids) grid.addRect(left + rx * s, top + ry * s, rw * s, rh * s);
      return;
    }
    const [cw, ch] = meta.collide || [0, 0];
    if (cw <= 0 || ch <= 0) return;
    const cl = left + (w * s - cw * s) / 2; // footprint at the bottom centre
    if (meta.arch) {
      // Gate: solid left and right of the walkable arch.
      grid.addRect(cl, bottom - ch * s, meta.arch.x * s, ch * s);
      const ax = cl + (meta.arch.x + meta.arch.w) * s;
      grid.addRect(ax, bottom - ch * s, (cw - meta.arch.x - meta.arch.w) * s, ch * s);
    } else {
      grid.addRect(cl, bottom - ch * s, cw * s, ch * s);
    }
  }

  addLights(meta, anim, left, top, bottom) {
    const s = ART.scale;
    const animKey = anim ? `lights${anim[0].toUpperCase()}${anim.slice(1)}` : null; // e.g. lightsGreen
    const lights = (animKey && meta[animKey]) || meta.lights || (meta.light ? [meta.light] : []);
    for (const l of lights) {
      const lx = left + l.x * s;
      const ly = top + l.y * s;
      const color = Phaser.Display.Color.HexStringToColor(l.color || LIGHTS.defaultColor).color;
      const r = l.radius || LIGHTS.defaultRadius;
      const indicator = r < LIGHTS.indicatorBelow;
      const radius = ((indicator ? r : Math.max(r, LIGHTS.minRadius)) * s) / LIGHTS.radiusUnit;
      if (!indicator) this.town.addGlow(lx, bottom - 6, radius * LIGHTS.poolScale, color, LIGHTS.poolAlpha, -5); // ground pool
      this.town.addGlow(lx, ly, radius * LIGHTS.haloScale, color, LIGHTS.haloAlpha, DEPTH.fx - 50); // halo at the light
    }
  }

  // Catenary wires: 1 art px lines N-S between the heads of masts in the same column.
  drawWires(wires) {
    if (this.masts.length < 2) return;
    const s = ART.scale;
    const g = this.scene.add.graphics().setDepth(-6);
    g.lineStyle(s, Phaser.Display.Color.HexStringToColor(wires.color || '#2e3a5e').color, 1);
    const sorted = [...this.masts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    for (let i = 1; i < sorted.length; i++) {
      const [x0, y0] = sorted[i - 1];
      const [x1, y1] = sorted[i];
      if (x0 !== x1 || y1 - y0 > (wires.maxGap || 14) * this.px) continue;
      g.lineBetween(x0, y0 + 2 * s, x1, y1 + 2 * s);
    }
  }
}

export function placeholderTexture(scene, name, def) {
  const key = `ph_${name}`;
  if (scene.textures.exists(key)) return key;
  const s = ART.scale;
  const [w, h] = def.size;
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  g.fillStyle(Phaser.Display.Color.HexStringToColor(def.color || '#ff00ff').color, def.alpha ?? 0.85);
  g.fillRect(0, 0, w * s, h * s);
  g.lineStyle(s, 0xffffff, 0.6);
  g.strokeRect(s / 2, s / 2, w * s - s, h * s - s);
  g.generateTexture(key, w * s, h * s);
  g.destroy();
  return key;
}

import { ART, DOORS, FX, DEPTH, WORLD } from '../data/config.js';
import { MAP } from '../data/map/index.js';
import { spriteDef } from '../art/render.js';
import { MapGrid } from './MapGrid.js';
import { Ground } from './Ground.js';
import { Houses, roofTiles } from './Houses.js';
import { Decorations } from './Decorations.js';
import { Underpass } from './Underpass.js';

// Builds the Freiburg map from src/data/map/: collision grid, ground chunks, houses, decorations, lights,
// bridge edges, underpass. Everything static is drawn once. Characters are y-sorted against houses/decorations
// via depth = bottom edge y (see Player/EnemySystem).
export class Town {
  constructor(scene) {
    this.scene = scene;
    this.px = ART.tile * ART.scale; // screen px per tile
    this.walls = scene.physics.add.staticGroup();
    this.doors = []; // { id, rect } door zones: store ids open shops, other ids (eimer) are reserved
    WORLD.width = MAP.cols * this.px;
    WORLD.height = MAP.rows * this.px;
    scene.physics.world.setBounds(0, 0, WORLD.width, WORLD.height);

    this.grid = new MapGrid(scene, MAP, this.px, this.walls);
    this.ground = new Ground(scene, MAP);
    this.ground.draw(() => roofTiles(scene, MAP, (base, v) => this.variantKey(base, v)));
    this.addDeckEdges();

    this.houses = new Houses(scene, this);
    this.deco = new Decorations(scene, this);
    for (const d of MAP.districts) {
      // One random sequence per district; rngSkip replays the old map's random use (see altstadt.js).
      const rng = new Phaser.Math.RandomDataGenerator([d.seed]);
      for (let i = 0; i < d.rngSkip; i++) rng.frac();
      this.houses.buildDistrict(d, rng);
      this.deco.placeDistrict(d, rng);
    }
    this.underpass = new Underpass(scene, this, this.ground, MAP.underpasses);
    this.grid.flood(Math.floor(MAP.start[0]), Math.floor(MAP.start[1]));

    // Night: darken/cool the whole world. Light halos are drawn above this (DEPTH.fx - 50) so they stay bright.
    scene.add.rectangle(0, 0, WORLD.width, WORLD.height, FX.nightTint).setOrigin(0)
      .setBlendMode(Phaser.BlendModes.MULTIPLY).setDepth(DEPTH.fx - 100);
  }

  get startX() { return MAP.start[0] * this.px; }
  get startY() { return MAP.start[1] * this.px; }
  get spawnHotspots() { return MAP.spawnHotspots; }

  update(dt, player) {
    this.underpass.update(dt, player);
  }

  // Bridge deck edge tiles over a solid zone get their thin solid strip (sprite meta.solidEdge, art px).
  addDeckEdges() {
    const { grid, ground, px } = this;
    const s = ART.scale;
    for (let ty = 0; ty < MAP.rows; ty++) {
      for (let tx = 0; tx < MAP.cols; tx++) {
        if (!grid.over[ty * MAP.cols + tx]) continue;
        const [, sprite, anim] = ground.frameAt(tx, ty);
        const edge = sprite && spriteDef(sprite)?.meta?.solidEdge?.[anim];
        if (edge) grid.addRect(tx * px + edge[0] * s, ty * px + edge[1] * s, edge[2] * s, edge[3] * s);
      }
    }
  }

  // Door zone at the bottom edge of a store façade (tile coords). GameScene opens the shop on walking in upwards.
  addDoor(id, spriteName, tileX, bottomTileY) {
    const door = spriteDef(spriteName)?.meta?.door || DOORS.defaultDoor;
    this.addDoorZone(id, tileX * this.px + door.x * ART.scale, bottomTileY * this.px, door.w * ART.scale);
  }

  addDoorZone(id, x, bottomY, w) {
    this.doors.push({ id, rect: new Phaser.Geom.Rectangle(x, bottomY - DOORS.zoneAbove, w, DOORS.zoneHeight) });
  }

  variantKey(base, variant) {
    const key = variant ? `${base}__${variant}` : base;
    return this.scene.textures.exists(key) ? key : base;
  }

  addGlow(x, y, scale, color, alpha, depth) {
    ensureGlowTexture(this.scene);
    this.scene.add.image(x, y, 'fx_glow').setScale(scale).setTint(color).setAlpha(alpha)
      .setBlendMode(Phaser.BlendModes.ADD).setDepth(depth);
  }

  isBlocked(x, y, padding) {
    return this.grid.isBlocked(x, y, padding);
  }
}

function ensureGlowTexture(scene) {
  if (scene.textures.exists('fx_glow')) return;
  const size = 128;
  const t = scene.textures.createCanvas('fx_glow', size, size);
  const c = t.getContext();
  const g = c.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.4, 'rgba(255,255,255,0.45)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g;
  c.fillRect(0, 0, size, size);
  t.refresh();
}

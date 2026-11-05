import { DEPTH, MINIMAP } from '../data/config.js';
import { SHOPS, SPECIAL_SHOPS } from '../data/shops.js';

const BASE_KEY = 'minimap_base';

// Translucent pixel-art radar, bottom-right: the map at 1 tile = 1 pixel (built once from the collision grid
// and ground types), a window of it around Lars, plus dots for monsters, shops and the camera view.
// Redrawn at MINIMAP.refreshHz, not every frame. On/off from the pause menu (saved).
export class Minimap {
  constructor(scene, { town, enemies, player }) {
    this.scene = scene;
    this.town = town;
    this.enemies = enemies;
    this.player = player;
    buildBaseTexture(scene, town);

    const fixed = (o) => o.setScrollFactor(0);
    this.frame = fixed(scene.add.graphics().setDepth(DEPTH.ui - 3));
    this.img = fixed(scene.add.image(0, 0, BASE_KEY).setOrigin(0).setDepth(DEPTH.ui - 2).setAlpha(MINIMAP.alpha));
    this.dots = fixed(scene.add.graphics().setDepth(DEPTH.ui - 1));
    this.parts = [this.frame, this.img, this.dots];
    // Shop door markers in tile coords (static).
    this.shops = town.doors
      .filter((d) => SHOPS[d.id] || SPECIAL_SHOPS[d.id])
      .map((d) => ({ tx: d.rect.centerX / town.px, ty: d.rect.centerY / town.px, eimer: !!SPECIAL_SHOPS[d.id] }));

    this.on = true;
    this.timer = 0;
    this.layout();
    scene.scale.on('resize', this.layout, this);
    scene.events.once('shutdown', () => scene.scale.off('resize', this.layout, this));
  }

  layout() {
    const { width, height } = this.scene.scale;
    const narrow = Math.min(width, height) < MINIMAP.narrowBelow;
    this.s = narrow ? MINIMAP.scaleNarrow : MINIMAP.scale;
    [this.vw, this.vh] = MINIMAP.viewTiles;
    this.w = this.vw * this.s;
    this.h = this.vh * this.s;
    this.x = width - MINIMAP.margin - this.w;
    this.y = height - MINIMAP.margin - this.h;
    this.img.setScale(this.s);
    this.dots.setPosition(this.x, this.y);
    this.drawFrame();
    this.timer = 0; // redraw at the new spot
  }

  // Dark translucent backing + gold pixel border with notched corners.
  drawFrame() {
    const g = this.frame;
    const { x, y, w, h } = this;
    const b = this.s; // border = one minimap pixel
    const c = MINIMAP.colors;
    g.clear();
    g.fillStyle(c.backing, MINIMAP.alpha * 0.6);
    g.fillRect(x, y, w, h);
    g.fillStyle(c.frame, 0.85);
    g.fillRect(x, y - b, w, b);
    g.fillRect(x, y + h, w, b);
    g.fillRect(x - b, y, b, h);
    g.fillRect(x + w, y, b, h);
  }

  setOn(on) {
    this.on = on;
    this.timer = 0;
    this.update(0); // also while paused (toggled from the pause menu)
  }

  setVisible(v) {
    for (const p of this.parts) p.setVisible(v);
  }

  update(dt) {
    this.setVisible(this.on);
    if (!this.on) return;
    this.timer -= dt;
    if (this.timer > 0) return;
    this.timer = 1 / MINIMAP.refreshHz;

    const { town, s, vw, vh } = this;
    const px = town.px;
    const cols = town.grid.cols;
    const rows = town.grid.rows;
    const ptx = this.player.x / px;
    const pty = this.player.y / px;
    const ox = Math.max(0, Math.min(cols - vw, Math.round(ptx - vw / 2)));
    const oy = Math.max(0, Math.min(rows - vh, Math.round(pty - vh / 2)));
    this.img.setCrop(ox, oy, vw, vh).setPosition(this.x - ox * s, this.y - oy * s);

    const g = this.dots;
    const c = MINIMAP.colors;
    g.clear();
    // Camera view (follows the zoom).
    const v = this.scene.cameras.main.worldView;
    const vx = Math.max(0, v.x / px - ox);
    const vy = Math.max(0, v.y / px - oy);
    const vx2 = Math.min(vw, (v.right) / px - ox);
    const vy2 = Math.min(vh, (v.bottom) / px - oy);
    if (vx2 > vx && vy2 > vy) {
      g.lineStyle(1, 0xffffff, 0.3);
      g.strokeRect(Math.round(vx * s) + 0.5, Math.round(vy * s) + 0.5, Math.round((vx2 - vx) * s) - 1, Math.round((vy2 - vy) * s) - 1);
    }
    for (const shop of this.shops) {
      const tx = Math.floor(shop.tx - ox);
      const ty = Math.floor(shop.ty - oy);
      if (tx < 0 || ty < 0 || tx >= vw - 1 || ty >= vh - 1) continue;
      g.fillStyle(shop.eimer ? c.eimer : c.shop, 1);
      g.fillRect(tx * s, ty * s, 2 * s, 2 * s);
    }
    const list = this.enemies.group.getChildren();
    let n = 0;
    for (let i = 0; i < list.length && n < MINIMAP.maxEnemyDots; i++) {
      const e = list[i];
      if (!e.active) continue;
      const tx = Math.floor(e.x / px - ox);
      const ty = Math.floor(e.y / px - oy);
      if (tx < 0 || ty < 0 || tx >= vw || ty >= vh) continue;
      n++;
      if (e.boss) {
        g.fillStyle(c.boss, 1);
        g.fillRect((tx - 1) * s, (ty - 1) * s, 3 * s, 3 * s);
      } else {
        g.fillStyle(c.enemy, 0.95);
        g.fillRect(tx * s, ty * s, s, s);
      }
    }
    // Lars: white plus with a dark outline, always on top.
    const lx = Math.floor(ptx - ox);
    const ly = Math.floor(pty - oy);
    g.fillStyle(c.playerEdge, 1);
    g.fillRect((lx - 1) * s - 1, (ly - 1) * s - 1, 3 * s + 2, 3 * s + 2);
    g.fillStyle(c.player, 1);
    g.fillRect((lx - 1) * s, ly * s, 3 * s, s);
    g.fillRect(lx * s, (ly - 1) * s, s, 3 * s);
  }
}

// The whole map as a cols x rows canvas texture (same map every run, so it survives restarts).
function buildBaseTexture(scene, town) {
  if (scene.textures.exists(BASE_KEY)) return;
  const { grid, ground } = town;
  const { cols, rows } = grid;
  const tex = scene.textures.createCanvas(BASE_KEY, cols, rows);
  const ctx = tex.getContext();
  const data = ctx.createImageData(cols, rows);
  const c = MINIMAP.colors;
  const rgb = {};
  for (const k of ['house', 'houseEdge', 'solid', 'street', 'grass', 'water', 'rail', 'unreachable']) {
    const h = c[k].replace('#', '');
    rgb[k] = [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  for (let ty = 0; ty < rows; ty++) {
    for (let tx = 0; tx < cols; tx++) {
      const i = ty * cols + tx;
      const type = ground.type[i];
      let key;
      if (grid.house[i] && !grid.over[i]) {
        // Bottom row of a house block (the façade) a shade darker, so streets read as outlined.
        key = ty + 1 < rows && grid.house[i + cols] ? 'house' : 'houseEdge';
      } else if (grid.solid[i]) {
        key = type === 'water' ? 'water' : 'solid';
      } else {
        key = MINIMAP.groundColor[type] || 'street';
        if (!grid.reach[i] && key === 'street') key = 'unreachable';
      }
      const [r, gg, b] = rgb[key];
      data.data[i * 4] = r;
      data.data[i * 4 + 1] = gg;
      data.data[i * 4 + 2] = b;
      data.data[i * 4 + 3] = 255;
    }
  }
  ctx.putImageData(data, 0, 0);
  tex.refresh();
}

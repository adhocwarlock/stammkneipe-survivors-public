import { SPRITES } from '../art/index.js';
import { registerSprites } from '../art/render.js';

// Art review page: open the game with ?gallery. Shows every sprite, variant and animation.
// Drag or scroll to move around.
export class GalleryScene extends Phaser.Scene {
  constructor() {
    super('GalleryScene');
  }

  create() {
    registerSprites(this);
    this.cameras.main.setBackgroundColor('#20202a');
    const label = { fontFamily: 'monospace', fontSize: '12px', color: '#d4af37' };
    let x = 20;
    let y = 20;
    let rowH = 0;
    const maxW = Math.max(900, this.scale.width - 40);

    for (const def of SPRITES) {
      const keys = [def.name, ...Object.keys(def.paletteVariants || {}).map((v) => `${def.name}__${v}`)];
      for (const key of keys) {
        for (const [anim, data] of Object.entries(def.anims)) {
          const tex = this.textures.get(key).get(`${anim}_0`);
          const w = Math.max(tex.width, 90);
          const h = tex.height + 18;
          if (x + w > maxW) {
            x = 20;
            y += rowH + 16;
            rowH = 0;
          }
          const spr = this.add.sprite(x, y + 16, key, `${anim}_0`).setOrigin(0);
          if (data.frames.length > 1) spr.play(`${key}_${anim}`);
          this.add.text(x, y, `${key}:${anim}`, label);
          x += w + 16;
          rowH = Math.max(rowH, h);
        }
      }
    }
    this.add.text(20, y + rowH + 30, `${SPRITES.length} sprites`, { ...label, fontSize: '16px' });

    const cam = this.cameras.main;
    this.input.on('pointermove', (p) => {
      if (!p.isDown) return;
      cam.scrollX -= (p.x - p.prevPosition.x);
      cam.scrollY -= (p.y - p.prevPosition.y);
    });
    this.input.on('wheel', (_p, _o, dx, dy) => {
      cam.scrollX += dx;
      cam.scrollY += dy;
    });
  }
}

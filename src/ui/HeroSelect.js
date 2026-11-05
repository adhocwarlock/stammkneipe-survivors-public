import { FONTS } from '../data/config.js';
import { HEROES, HERO_ORDER } from '../data/heroes.js';
import { championPhotoKey } from '../data/champions.js';
import { firstTexture } from '../systems/textures.js';

const DEPTH = 20000; // above the menu's buttons
const GOLD = 0xd4af37;

// Secret hero select on the start screen (Alt+click / Alt+Enter on SPIELEN). Deliberately no explanation.
// Photo + name per hero; tap/click or arrows + Enter, Esc to cancel.
export class HeroSelect {
  constructor(scene, onPick, onCancel) {
    this.scene = scene;
    this.onPick = onPick;
    this.onCancel = onCancel;
    this.sel = 0;
    this.objects = [];
    const add = (o) => {
      this.objects.push(o.setDepth(DEPTH));
      return o;
    };
    this.dim = add(scene.add.rectangle(0, 0, 10, 10, 0x000000, 0.85).setOrigin(0).setInteractive());
    this.title = add(scene.add.text(0, 0, 'WER?', {
      fontFamily: FONTS.metal, fontSize: '56px', color: '#d4af37', stroke: '#000', strokeThickness: 8,
    }).setOrigin(0.5));
    this.cards = HERO_ORDER.map((id, i) => {
      const box = add(scene.add.rectangle(0, 0, 10, 10, 0x1a1a1f, 1).setOrigin(0.5).setStrokeStyle(2, 0x555560));
      box.setInteractive({ useHandCursor: true });
      box.on('pointerover', () => this.select(i));
      box.on('pointerup', () => this.pick(i));
      const key = firstTexture(scene, championPhotoKey(id), 'photo_normal');
      const face = key ? add(scene.add.image(0, 0, key)) : null;
      const name = add(scene.add.text(0, 0, HEROES[id].name.toUpperCase(), {
        fontFamily: FONTS.pixel, fontSize: '11px', color: '#eeeeee', stroke: '#000', strokeThickness: 3,
      }).setOrigin(0.5, 0));
      return { id, box, face, name };
    });
    this.onKey = (e) => {
      const cols = this.cols;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') this.select(this.sel + 1);
      else if (e.code === 'ArrowLeft' || e.code === 'KeyA') this.select(this.sel - 1);
      else if (e.code === 'ArrowDown' || e.code === 'KeyS') this.select(this.sel + cols);
      else if (e.code === 'ArrowUp' || e.code === 'KeyW') this.select(this.sel - cols);
      else if (e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Space') this.pick(this.sel);
      else if (e.code === 'Escape') this.cancel();
      else return;
      e.preventDefault?.();
    };
    // Next tick, so the Enter that opened it doesn't pick right away.
    scene.time.delayedCall(0, () => scene.input.keyboard?.on('keydown', this.onKey));
    scene.scale.on('resize', this.layout, this);
    this.layout();
    this.select(0);
  }

  layout() {
    const { width, height } = this.scene.scale;
    this.dim.setSize(width, height);
    this.dim.input.hitArea.setSize(width, height);
    this.cols = width < 520 ? 2 : 3;
    const rows = Math.ceil(this.cards.length / this.cols);
    const cw = Math.min(150, (width - 40) / this.cols - 12);
    const ch = Math.min(170, (height - 160) / rows - 12);
    const x0 = width / 2 - ((this.cols - 1) * (cw + 12)) / 2;
    const y0 = Math.max(110, height / 2 - ((rows - 1) * (ch + 12)) / 2);
    this.title.setPosition(width / 2, y0 - ch / 2 - 40).setFontSize(width < 520 ? 40 : 56);
    this.cards.forEach((c, i) => {
      const x = x0 + (i % this.cols) * (cw + 12);
      const y = y0 + Math.floor(i / this.cols) * (ch + 12);
      c.box.setPosition(x, y).setSize(cw, ch);
      c.box.setDisplayOrigin(cw / 2, ch / 2);
      c.box.input.hitArea.setSize(cw, ch);
      if (c.face) {
        const f = c.face.frame;
        const h = ch * 0.68;
        const w = Math.min(cw * 0.9, h * (f.width / f.height));
        c.face.setDisplaySize(w, w * (f.height / f.width)).setPosition(x, y - ch * 0.1);
      }
      c.name.setPosition(x, y + ch / 2 - 22);
    });
  }

  select(i) {
    this.sel = Phaser.Math.Wrap(i, 0, this.cards.length);
    this.cards.forEach((c, k) => {
      const on = k === this.sel;
      c.box.setStrokeStyle(on ? 4 : 2, on ? GOLD : 0x555560).setFillStyle(on ? 0x3a3526 : 0x1a1a1f, 1);
    });
  }

  pick(i) {
    const id = this.cards[i].id;
    this.destroy();
    this.onPick(id);
  }

  cancel() {
    this.destroy();
    this.onCancel?.();
  }

  destroy() {
    this.scene.input.keyboard?.off('keydown', this.onKey);
    this.scene.scale.off('resize', this.layout, this);
    for (const o of this.objects) o.destroy();
    this.objects.length = 0;
  }
}

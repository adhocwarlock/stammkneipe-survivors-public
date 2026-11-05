import { championPhotoKey } from '../data/champions.js';
import { DEPTH, FONTS } from '../data/config.js';
import { firstTexture } from '../systems/textures.js';

const R = 26; // button radius (px)
const TOP_WIDE = 24; // top edge on wide screens: between the HP bars and the Pfand text
const TOP_NARROW = 92; // phones: below the HUD text columns (they meet in the middle there)
const WIDE_FROM = 560; // px screen width
const GOLD = 0xd4af37;

// The equipped champion's ability: face icon top-centre, radial cooldown sweep, click/tap (or E) to use.
// It's an interactive object, so presses on it never grab the joystick.
export class AbilityButton {
  constructor(scene, onPress) {
    this.scene = scene;
    const fixed = (o) => o.setScrollFactor(0).setDepth(DEPTH.ui + 5);
    this.bg = fixed(scene.add.circle(0, 0, R, 0x141418, 0.85).setStrokeStyle(3, GOLD));
    this.face = fixed(scene.add.image(0, 0, '__DEFAULT'));
    this.sweep = fixed(scene.add.graphics());
    this.glow = fixed(scene.add.circle(0, 0, R + 4).setStrokeStyle(2, 0xfff0a0, 1));
    this.secs = fixed(scene.add.text(0, 0, '', {
      fontFamily: FONTS.pixel, fontSize: '12px', color: '#ffffff', stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5));
    this.key = fixed(scene.add.text(0, 0, 'E', {
      fontFamily: FONTS.pixel, fontSize: '8px', color: '#d4af37', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5));
    this.parts = [this.bg, this.face, this.sweep, this.glow, this.secs, this.key];
    this.bg.setInteractive({ useHandCursor: true });
    this.bg.on('pointerdown', () => onPress());

    this.shownId = undefined;
    this.lastFrac = -1;
    this.lastSecs = -1;
    this.time = 0;
    this.layout();
    scene.scale.on('resize', this.layout, this);
    scene.events.once('shutdown', () => scene.scale.off('resize', this.layout, this));
    this.setVisible(false);
  }

  layout() {
    const { width } = this.scene.scale;
    this.x = Math.round(width / 2);
    this.y = (width >= WIDE_FROM ? TOP_WIDE : TOP_NARROW) + R;
    for (const p of this.parts) p.setPosition(this.x, this.y);
    this.key.setPosition(this.x + R * 0.75, this.y + R * 0.75);
    this.lastFrac = -1; // redraw the sweep at the new spot
  }

  setVisible(v) {
    if (this.visible === v) return;
    this.visible = v;
    for (const p of this.parts) p.setVisible(v);
    if (v) this.bg.setInteractive();
    else this.bg.disableInteractive();
  }

  setChampion(id) {
    this.shownId = id;
    if (!id) return;
    const key = firstTexture(this.scene, championPhotoKey(id), 'photo_normal');
    if (!key) {
      this.face.setVisible(false);
      return;
    }
    this.face.setTexture(key);
    const f = this.face.frame;
    const w = R * 1.7;
    this.face.setDisplaySize(w, w * (f.height / f.width));
  }

  // crew: CrewSystem
  update(dt, crew) {
    const id = crew.equipped;
    if (id !== this.shownId) this.setChampion(id);
    this.setVisible(!!id);
    if (!id) return;
    this.time += dt;
    const frac = crew.cooldownFraction;
    const ready = crew.ready;
    if (Math.abs(frac - this.lastFrac) > 0.002 || (frac === 0 && this.lastFrac !== 0)) {
      this.lastFrac = frac;
      const g = this.sweep;
      g.clear();
      if (frac > 0) {
        // Dark pie for the part that is still recharging; it shrinks clockwise from 12 o'clock.
        g.fillStyle(0x000000, 0.62);
        g.slice(0, 0, R, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2, false);
        g.fillPath();
      }
    }
    const secs = frac > 0 ? Math.ceil(crew.cooldown) : 0;
    if (secs !== this.lastSecs) {
      this.lastSecs = secs;
      this.secs.setText(secs > 0 ? String(secs) : '');
    }
    if (ready) this.face.clearTint();
    else this.face.setTint(0x8a8a90);
    this.glow.setVisible(ready);
    if (ready) this.glow.setScale(1 + Math.sin(this.time * 5) * 0.06).setAlpha(0.6 + Math.sin(this.time * 5) * 0.3);
  }
}

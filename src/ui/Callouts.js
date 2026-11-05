import { DEPTH, FONTS } from '../data/config.js';

const LIFE = 1.6;
const POOL = 5;
const GOOD = '#9be36a';
const BAD = '#ff6a6a';

// Pickup feedback at the pickup spot: beer icon + "AUGUSTINER!!" in metal letters + what it does.
// Plus a screen-centre banner for big moments ("LARS IST DICHT").
export class Popup {
  constructor(scene) {
    this.scene = scene;
    this.pool = [];
    for (let i = 0; i < POOL; i++) {
      const icon = scene.add.image(0, 0, '__DEFAULT').setScale(2);
      const title = scene.add.text(0, 0, '', {
        fontFamily: FONTS.metal, fontSize: '30px', color: '#f2d27a', stroke: '#140c0c', strokeThickness: 6,
      }).setOrigin(0.5, 1);
      const label = scene.add.text(0, 0, '', {
        fontFamily: FONTS.pixel, fontSize: '10px', color: GOOD, stroke: '#000', strokeThickness: 4,
      }).setOrigin(0.5, 0);
      const c = scene.add.container(0, 0, [icon, title, label]).setDepth(DEPTH.floatText + 1).setVisible(false);
      c.icon = icon;
      c.title = title;
      c.label = label;
      c.life = 0;
      this.pool.push(c);
    }

    this.banner = scene.add.text(0, 0, '', {
      fontFamily: FONTS.metal, fontSize: '64px', color: '#b6ff5a', stroke: '#1a0a22', strokeThickness: 10, align: 'center',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.ui - 10).setVisible(false);
    this.bannerLife = 0;
  }

  // title: big text, label: effect text, bad: red instead of green, iconKey: texture to show above.
  show(x, y, { title, label, bad, iconKey }) {
    const c = this.pool.find((p) => p.life <= 0) || this.pool.reduce((a, b) => (a.life < b.life ? a : b));
    // Stack above pop-ups that are still fresh nearby, so quick double pickups stay readable.
    let stackY = y - 40;
    for (const o of this.pool) {
      if (o !== c && o.life > LIFE * 0.4 && Math.abs(o.x - x) < 160 && o.y - stackY < 100) stackY = Math.min(stackY, o.y - 100);
    }
    c.setPosition(x, stackY).setVisible(true).setAlpha(1).setScale(0.6);
    const hasIcon = iconKey && this.scene.textures.exists(iconKey);
    c.icon.setVisible(!!hasIcon);
    if (hasIcon) c.icon.setTexture(iconKey, 'default_0').setPosition(0, -62);
    c.title.setText(title).setColor(bad ? '#d9a0a0' : '#f2d27a').setPosition(0, -8);
    c.label.setText(label || '').setColor(bad ? BAD : GOOD).setPosition(0, -2);
    c.life = LIFE;
  }

  showBanner(text, seconds = 2.5) {
    const { width, height } = this.scene.scale;
    const size = Math.max(36, Math.min(84, width / 9));
    // Long crew lines ("The Hans have arrived") wrap on phones instead of running off the screen.
    this.banner.setWordWrapWidth(width * 0.92).setText(text).setFontSize(size).setPosition(width / 2, height * 0.3)
      .setVisible(true).setAlpha(1);
    this.bannerLife = seconds;
    this.bannerTotal = seconds;
  }

  update(dt) {
    for (const c of this.pool) {
      if (c.life <= 0) continue;
      c.life -= dt;
      const t = 1 - c.life / LIFE; // 0 → 1
      // Pop in quickly, drift up, fade in the last third.
      c.setScale(t < 0.12 ? 0.6 + (t / 0.12) * 0.5 : 1.1 - Math.min(0.1, (t - 0.12)));
      c.y -= 22 * dt;
      c.setAlpha(t > 0.66 ? (1 - t) / 0.34 : 1);
      if (c.life <= 0) c.setVisible(false);
    }
    if (this.bannerLife > 0) {
      this.bannerLife -= dt;
      const t = 1 - this.bannerLife / this.bannerTotal;
      this.banner.setScale(1 + Math.sin(t * Math.PI) * 0.08);
      this.banner.setAlpha(t > 0.75 ? (1 - t) / 0.25 : 1);
      if (this.bannerLife <= 0) this.banner.setVisible(false);
    }
  }
}

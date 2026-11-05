import { DEPTH } from '../data/config.js';
import { playOnce } from './common.js';

// Pooled one-shot FX sprites (fx_slash, fx_zap, ...). Only used when the texture + animation exist.
export class FxPool {
  constructor(scene, key, max = 16) {
    this.scene = scene;
    this.key = key;
    this.anim = `${key}_default`;
    this.max = max;
    this.pool = [];
  }

  get available() {
    return this.scene.textures.exists(this.key);
  }

  // Returns the sprite (already playing) or null when there's no art / the pool is exhausted.
  play(x, y, rotation = 0, scale = 1, flipY = false) {
    if (!this.available) return null;
    let s = null;
    for (let i = 0; i < this.pool.length; i++) {
      if (!this.pool[i].visible) { s = this.pool[i]; break; }
    }
    if (!s) {
      if (this.pool.length >= this.max) return null;
      s = this.scene.add.sprite(0, 0, this.key, 'default_0').setOrigin(0.5, 0.5);
      // Without an animation the sprite hides itself after a short timer (see update).
      s.on('animationcomplete', () => s.setVisible(false));
      this.pool.push(s);
    }
    s.life = this.scene.anims.exists(this.anim) ? Infinity : 0.12;
    s.setPosition(x, y).setRotation(rotation).setScale(scale).setFlipY(flipY)
      .setDepth(DEPTH.fx - 40).setAlpha(1).setVisible(true);
    s.setFrame('default_0');
    playOnce(s, this.anim);
    return s;
  }

  update(dt) {
    for (let i = 0; i < this.pool.length; i++) {
      const s = this.pool[i];
      if (!s.visible || s.life === Infinity) continue;
      s.life -= dt;
      if (s.life <= 0) s.setVisible(false);
    }
  }

  destroy() {
    for (let i = 0; i < this.pool.length; i++) this.pool[i].destroy();
    this.pool.length = 0;
  }
}

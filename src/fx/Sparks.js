import { DEPTH } from '../data/config.js';

// Pooled one-shot impact sparks (the hit_spark sprite animation).
export class Sparks {
  constructor(scene) {
    this.scene = scene;
    this.enabled = scene.anims.exists('hit_spark_default');
    this.pool = [];
  }

  play(x, y) {
    if (!this.enabled) return;
    let s = this.pool.find((p) => !p.visible);
    if (!s) {
      if (this.pool.length >= 24) return;
      s = this.scene.add.sprite(0, 0, 'hit_spark').setOrigin(0.5, 0.5);
      s.on('animationcomplete', () => s.setVisible(false));
      this.pool.push(s);
    }
    s.setPosition(x, y).setDepth(DEPTH.floatText - 1).setVisible(true).play('hit_spark_default');
  }
}

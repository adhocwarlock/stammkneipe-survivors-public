// Pooled "+€0.08"-style texts that rise and fade.
const LIFETIME = 0.9;
const POOL_SIZE = 20;

export class FloatingText {
  constructor(scene) {
    this.pool = [];
    for (let i = 0; i < POOL_SIZE; i++) {
      const t = scene.add.text(0, 0, '', {
        fontFamily: 'monospace', fontSize: '14px', fontStyle: 'bold', stroke: '#000', strokeThickness: 3,
      }).setOrigin(0.5).setDepth(9500).setVisible(false);
      t.life = 0;
      this.pool.push(t);
    }
  }

  show(x, y, message, color) {
    const t = this.pool.find((p) => p.life <= 0) || this.pool[0];
    t.setText(message).setColor(color).setPosition(x, y).setAlpha(1).setVisible(true);
    t.life = LIFETIME;
  }

  update(dt) {
    for (const t of this.pool) {
      if (t.life <= 0) continue;
      t.life -= dt;
      t.y -= 30 * dt;
      t.setAlpha(Math.max(0, t.life / LIFETIME));
      if (t.life <= 0) t.setVisible(false);
    }
  }
}

// Simple screen-fixed button that works with touch, mouse and pen.
export class Button {
  constructor(scene, label, onClick, { width = 220, height = 52, fontSize = 22, depth = 10210 } = {}) {
    this.rect = scene.add.rectangle(0, 0, width, height, 0x1a1a1f, 0.9)
      .setStrokeStyle(2, 0xd4af37).setScrollFactor(0).setDepth(depth);
    this.text = scene.add.text(0, 0, label, {
      fontFamily: 'monospace', fontSize: `${fontSize}px`, fontStyle: 'bold', color: '#eeeeee',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(depth + 1);

    this.rect.setInteractive({ useHandCursor: true });
    this.rect.on('pointerover', () => this.rect.setFillStyle(0x33332a, 0.95));
    this.rect.on('pointerout', () => this.rect.setFillStyle(0x1a1a1f, 0.9));
    this.rect.on('pointerup', onClick);
  }

  setPosition(x, y) {
    this.rect.setPosition(x, y);
    this.text.setPosition(x, y);
    return this;
  }

  setVisible(visible) {
    this.rect.setVisible(visible);
    this.text.setVisible(visible);
    // Hidden buttons must not swallow clicks meant for the joystick.
    if (visible) this.rect.setInteractive();
    else this.rect.disableInteractive();
    return this;
  }

  setAlpha(a) {
    this.rect.setAlpha(a);
    this.text.setAlpha(a);
    return this;
  }
}

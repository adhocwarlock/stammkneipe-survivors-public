import { CONTROLS } from '../data/config.js';

const MARGIN = 24;

// Translucent analog stick, shared by touch, mouse and pen (Phaser pointers cover all three).
// It rests bottom-left; pressing anywhere in the left part of the screen moves the stick
// under your finger (a "floating" stick), which is much easier to hit on phones.
// Releasing snaps it back home.
export class VirtualJoystick {
  constructor(scene) {
    this.scene = scene;
    this.vector = new Phaser.Math.Vector2();
    this.pointerId = null;
    this.enabled = true;

    scene.input.addPointer(2); // allow joystick + a button press at the same time
    scene.input.mouse?.disableContextMenu();

    const fixed = (o) => o.setScrollFactor(0).setDepth(10150);
    this.base = fixed(scene.add.circle(0, 0, 60, 0xffffff, 0.08).setStrokeStyle(2, 0xffffff, 0.8));
    this.thumb = fixed(scene.add.circle(0, 0, 26, 0xffffff, 0.4).setStrokeStyle(2, 0xffffff, 0.9));
    this.setAlpha(CONTROLS.joystickIdleAlpha);

    scene.input.on('pointerdown', this.onDown, this);
    scene.input.on('pointermove', this.onMove, this);
    scene.input.on('pointerup', this.onUp, this);
    scene.input.on('pointerupoutside', this.onUp, this);
    scene.scale.on('resize', this.layout, this);
    scene.events.once('shutdown', () => scene.scale.off('resize', this.layout, this));
    this.layout();
  }

  layout() {
    const { width, height } = this.scene.scale;
    this.radius = Phaser.Math.Clamp(Math.min(width, height) * 0.12, 45, 75);
    this.base.setRadius(this.radius);
    this.thumb.setRadius(this.radius * 0.45);
    this.homeX = MARGIN + this.radius;
    this.homeY = height - MARGIN - this.radius;
    if (this.pointerId === null) this.moveTo(this.homeX, this.homeY);
  }

  moveTo(x, y) {
    this.base.setPosition(x, y);
    this.thumb.setPosition(x, y);
  }

  setAlpha(a) {
    this.base.setAlpha(a);
    this.thumb.setAlpha(a);
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) this.release();
  }

  onDown(pointer, currentlyOver) {
    if (!this.enabled || this.pointerId !== null) return;
    if (currentlyOver.length > 0) return; // pressed a UI button instead
    const { width, height } = this.scene.scale;
    if (pointer.x > width * CONTROLS.joystickZone) return;

    this.pointerId = pointer.id;
    const r = this.radius;
    this.moveTo(Phaser.Math.Clamp(pointer.x, r + 8, width - r - 8), Phaser.Math.Clamp(pointer.y, r + 8, height - r - 8));
    this.setAlpha(CONTROLS.joystickActiveAlpha);
    this.onMove(pointer);
  }

  onMove(pointer) {
    if (pointer.id !== this.pointerId) return;
    let dx = pointer.x - this.base.x;
    let dy = pointer.y - this.base.y;
    const len = Math.hypot(dx, dy);
    if (len > this.radius) {
      dx = (dx / len) * this.radius;
      dy = (dy / len) * this.radius;
    }
    this.thumb.setPosition(this.base.x + dx, this.base.y + dy);

    // Magnitude 0..1, rescaled so it starts at 0 right at the dead-zone edge (no jump).
    const mag = Math.min(len / this.radius, 1);
    const dead = CONTROLS.joystickDeadZone;
    if (mag <= dead) {
      this.vector.set(0, 0);
    } else {
      const scaled = (mag - dead) / (1 - dead);
      this.vector.set(dx, dy).normalize().scale(scaled);
    }
  }

  onUp(pointer) {
    if (pointer.id === this.pointerId) this.release();
  }

  release() {
    this.pointerId = null;
    this.vector.set(0, 0);
    this.moveTo(this.homeX, this.homeY);
    this.setAlpha(CONTROLS.joystickIdleAlpha);
  }
}

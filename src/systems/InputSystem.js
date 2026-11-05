// Combines all movement inputs into one vector (length 0..1).
// The joystick wins while it's being used; otherwise keyboard.
export class InputSystem {
  constructor(scene, joystick) {
    this.joystick = joystick;
    this.cursors = scene.input.keyboard.createCursorKeys();
    this.wasd = scene.input.keyboard.addKeys('W,A,S,D');
    this.move = new Phaser.Math.Vector2();
  }

  getMove() {
    if (this.joystick.pointerId !== null) return this.move.copy(this.joystick.vector);
    const k = this.wasd;
    const c = this.cursors;
    const x = (k.D.isDown || c.right.isDown ? 1 : 0) - (k.A.isDown || c.left.isDown ? 1 : 0);
    const y = (k.S.isDown || c.down.isDown ? 1 : 0) - (k.W.isDown || c.up.isDown ? 1 : 0);
    return this.move.set(x, y).normalize();
  }
}

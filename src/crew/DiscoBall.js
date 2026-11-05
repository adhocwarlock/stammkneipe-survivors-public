import { DEPTH } from '../data/config.js';
import { firstFrame } from './CrewFx.js';

const HIDDEN = 0;
const DOWN = 1;
const ON = 2;
const UP = 3;
const DEPTH_BALL = DEPTH.floatText - 5; 





export class DiscoBall {
  constructor(scene, data) {
    this.scene = scene;
    this.d = data;
    this.state = HIDDEN;
    this.t = 0;
    this.k = 0; // 0 = up and away, 1 = fully down / lights on
    const fixed = (o) => o.setScrollFactor(0).setVisible(false);
    const key = scene.textures.exists('fx_disco_ball') ? 'fx_disco_ball' : '__WHITE';
    this.ball = fixed(scene.add.sprite(0, 0, key, key === '__WHITE' ? undefined : firstFrame(scene, key)))
      .setOrigin(0.5, 0).setScale(data.scale).setDepth(DEPTH_BALL);
    this.anim = scene.anims.exists('fx_disco_ball_spin') ? 'fx_disco_ball_spin' : null;
    this.beams = [];
    this.spots = [];
    const glow = scene.textures.exists('fx_glow') ? 'fx_glow' : '__WHITE';
    for (let i = 0; i < data.spots; i++) {
      const color = data.colors[i % data.colors.length];
      this.beams.push(fixed(scene.add.image(0, 0, '__WHITE')).setOrigin(0, 0.5).setTint(color)
        .setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH_BALL - 2));
      this.spots.push(fixed(scene.add.image(0, 0, glow)).setTint(color).setScale(data.spotScale)
        .setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH_BALL - 1));
    }
  }

  get visible() {
    return this.state !== HIDDEN;
  }

  descend() {
    this.state = DOWN;
    this.t = 0;
    this.ball.setVisible(true);
    if (this.anim) this.ball.play({ key: this.anim, repeat: -1 }, true);
  }

  rise() {
    if (this.state === HIDDEN) return;
    this.state = UP;
  }

  hide() {
    this.state = HIDDEN;
    this.k = 0;
    this.ball.setVisible(false).anims.stop();
    for (let i = 0; i < this.spots.length; i++) {
      this.spots[i].setVisible(false);
      this.beams[i].setVisible(false);
    }
  }

  update(dt) {
    if (this.state === HIDDEN) return;
    const d = this.d;
    this.t += dt;
    if (this.state === DOWN) {
      this.k = Math.min(1, this.k + dt / d.descendSeconds);
      if (this.k >= 1) this.state = ON;
    } else if (this.state === UP) {
      this.k = Math.max(0, this.k - dt / d.riseSeconds);
      if (this.k <= 0) {
        this.hide();
        return;
      }
    }
    const { width, height } = this.scene.scale;
    const ball = this.ball;
    const h = ball.displayHeight;
    const ease = this.k * this.k * (3 - 2 * this.k); // smoothstep
    ball.setPosition(width / 2, -h + (h + d.top) * ease);
    if (!this.anim) ball.setRotation(Math.sin(this.t * 2) * 0.1); // placeholder sway
    const cx = width / 2;
    const cy = ball.y + h * d.ballCentre;

    // Each spot travels a slow Lissajous path; alpha only follows k (fade in/out, never blinks).
    const alpha = ease;
    for (let i = 0; i < this.spots.length; i++) {
      const ph = this.t * d.sweepSpeed + (i * Math.PI * 2) / this.spots.length;
      const sx = cx + Math.cos(ph) * width * 0.45;
      const sy = height * (0.55 + 0.35 * Math.sin(ph * 0.73 + i));
      const dx = sx - cx;
      const dy = sy - cy;
      this.spots[i].setPosition(sx, sy).setAlpha(d.spotAlpha * alpha).setVisible(true);
      this.beams[i].setPosition(cx, cy).setRotation(Math.atan2(dy, dx))
        .setDisplaySize(Math.hypot(dx, dy), d.beamWidth).setAlpha(d.beamAlpha * alpha).setVisible(true);
    }
  }
}

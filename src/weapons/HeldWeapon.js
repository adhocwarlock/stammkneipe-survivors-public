import { ART, PLAYER } from '../data/config.js';
import { HELD } from '../data/weapons.js';
import { spriteDef } from '../art/render.js';
import { firstFrameOf } from './common.js';

// Placeholder grip/tip (art px) when the held art doesn't exist yet: grip at the left middle, tip at the right.
const PH_SIZE = { held_harley_benton: [30, 10], held_katana: [26, 4], held_minigun: [22, 8] };

// Where on the hero's body a HELD anchor sits, in world px, written into `out`.
// side = +1 toward the right of the screen, -1 toward the left. Works for every hero body (size from its def).
export function bodyPoint(player, anchor, side, out) {
  const s = ART.scale;
  const sp = player.sprite;
  const h = player.def?.size?.[1] ?? 22;
  const feetY = (player.hasArt ? sp.y : player.y + PLAYER.radius) - (player.lift || 0);
  out.x = sp.x + anchor.x * s * side;
  out.y = feetY - anchor.y * h * s;
  return out;
}

// A weapon drawn in the hero's hand, rotating around its `meta.grip` (art points RIGHT, tip = `meta.tip`).
// swing(): sweeps through an arc over `seconds` (top to bottom on either side), then hides.
// aim(): holds it pointed at an angle (minigun) until hide() / the auto-hide timer.
export class HeldWeapon {
  constructor(scene, player, key) {
    this.scene = scene;
    this.player = player;
    this.key = key;
    const art = scene.textures.exists(key);
    if (!art) makePlaceholder(scene, key);
    this.sprite = scene.add.sprite(0, 0, art ? key : `ph_${key}`, art ? firstFrameOf(scene, key) : undefined).setVisible(false);
    const def = art ? spriteDef(key) : null;
    const [w, h] = def?.size || PH_SIZE[key] || [20, 6];
    const grip = def?.meta?.grip || { x: 1, y: h / 2 };
    const tip = def?.meta?.tip || { x: w - 1, y: h / 2 };
    this.sprite.setOrigin(grip.x / w, grip.y / h);
    // Tip relative to the grip in screen px (unrotated, unflipped).
    this.tipX = (tip.x - grip.x) * ART.scale;
    this.tipY = (tip.y - grip.y) * ART.scale;
    this.hand = { x: 0, y: 0 };
    this.side = 1;
    this.angle = 0;
    this.from = 0;
    this.to = 0;
    this.t = 0;
    this.dur = 0; // > 0 while swinging
    this.hideIn = 0;
    this.animKey = null;
  }

  swing(aimAngle, arcDeg, seconds) {
    this.side = Math.cos(aimAngle) < 0 ? -1 : 1;
    // Screen y points down, so +angle turns clockwise: right side sweeps -half -> +half, left side the reverse.
    const half = Phaser.Math.DegToRad(arcDeg) / 2;
    this.from = aimAngle - half * this.side;
    this.to = aimAngle + half * this.side;
    this.t = 0;
    this.dur = Math.max(0.01, seconds);
    this.hideIn = seconds + HELD.swingVisibleAfter;
    this.angle = this.from;
    this.play(null);
    this.sprite.setVisible(true);
    this.place();
  }

  // Hold pointed at `angle`; plays `anim` (e.g. 'fire', falling back to 'idle') and hides after `hideAfter` s.
  aim(angle, anim, hideAfter) {
    this.side = Math.cos(angle) < 0 ? -1 : 1;
    this.angle = angle;
    this.dur = 0;
    this.hideIn = hideAfter;
    this.play(anim);
    this.sprite.setVisible(true);
    this.place();
  }

  // World position of the tip right now (bullets/muzzle flash start there).
  tipWorld(out) {
    const c = Math.cos(this.angle);
    const s = Math.sin(this.angle);
    const ty = this.tipY * this.side; // flipY mirrors the art across its length
    out.x = this.hand.x + this.tipX * c - ty * s;
    out.y = this.hand.y + this.tipX * s + ty * c;
    return out;
  }

  play(anim) {
    const sp = this.sprite;
    let k = null;
    if (anim && this.scene.anims.exists(`${this.key}_${anim}`)) k = `${this.key}_${anim}`;
    else if (this.scene.anims.exists(`${this.key}_idle`)) k = `${this.key}_idle`;
    if (k === this.animKey && (k === null || sp.anims.isPlaying)) return;
    this.animKey = k;
    if (k) sp.play({ key: k, repeat: -1 }, true);
    else sp.anims.stop();
  }

  update(dt) {
    const sp = this.sprite;
    if (!sp.visible) return;
    if (this.dur > 0) {
      this.t += dt;
      const k = Math.min(1, this.t / this.dur);
      this.angle = this.from + (this.to - this.from) * (1 - (1 - k) * (1 - k)); // ease-out
    }
    this.hideIn -= dt;
    if (this.hideIn <= 0 || this.player.dead) {
      this.hide();
      return;
    }
    this.place();
  }

  place() {
    const p = this.player;
    bodyPoint(p, HELD.hand, this.side, this.hand);
    // Pointing up (away from the camera): behind the body. Otherwise in front of it, but under the head (+0.1).
    const behind = Math.sin(this.angle) < -0.6;
    this.sprite.setPosition(this.hand.x, this.hand.y).setRotation(this.angle).setFlipY(this.side < 0)
      .setDepth(p.sprite.depth + (behind ? -0.05 : 0.05));
  }

  hide() {
    this.sprite.setVisible(false);
    this.sprite.anims.stop();
    this.animKey = null;
    this.dur = 0;
  }

  destroy() {
    this.sprite.destroy();
  }
}

function makePlaceholder(scene, key) {
  const phKey = `ph_${key}`;
  if (scene.textures.exists(phKey)) return;
  const [w, h] = PH_SIZE[key] || [20, 6];
  const s = ART.scale;
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  g.fillStyle(0x5a3a20).fillRect(0, (h / 2 - 1) * s, 6 * s, 2 * s); // handle
  g.fillStyle(key === 'held_harley_benton' ? 0xc03030 : 0xc8d0dc).fillRect(6 * s, 0, (w - 6) * s, h * s);
  g.generateTexture(phKey, w * s, h * s);
  g.destroy();
}

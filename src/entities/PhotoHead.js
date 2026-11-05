import { ART, HEAD } from '../data/config.js';
import { firstTexture } from '../systems/textures.js';





export class PhotoHead {
  constructor(scene, photoKey = null, headScale = 1, opts = null) {
    this.scene = scene;
    this.image = scene.add.image(0, 0, '__DEFAULT').setOrigin(0.5, HEAD.anchorY).setVisible(false);
    this.key = null;
    this.w = 0;
    this.h = 0;
    this.anchorY = HEAD.anchorY;
    this.x = 0; // neck point in world px (after locate)
    this.y = 0;
    if (photoKey) this.setPhoto(photoKey, headScale, opts);
  }

  // Returns false if neither the photo nor Lars' fallback exists.
  setPhoto(photoKey, headScale = 1, opts = null) {
    const key = firstTexture(this.scene, photoKey, 'photo_normal');
    this.key = key || null;
    if (!key) return false;
    if (this.image.texture.key !== key) this.image.setTexture(key);
    // Lars' fallback photo keeps Lars' own head layout.
    this.opts = key === photoKey ? opts : null;
    this.setHeadScale(headScale);
    return true;
  }

  setHeadScale(headScale) {
    headSize(this.image.frame, this.opts, headScale, this);
    this.image.setDisplaySize(this.w, this.h).setOrigin(0.5, this.anchorY);
  }

  // Writes the neck point of `sprite` (drawn with sprite definition `def`) into this.x / this.y.
  locate(sprite, def, withBob = true) {
    const s = ART.scale;
    const [w, h] = def.size;
    const meta = def.meta || {};
    const neck = meta.neck || { x: w / 2, y: 0 };
    let bob = 0;
    if (withBob && meta.neckBob) {
      const info = frameInfo(sprite.frame);
      bob = meta.neckBob[info.anim]?.[info.idx] ?? 0;
    }
    const nx = sprite.flipX ? w - neck.x : neck.x;
    const sx = sprite.scaleX;
    const sy = sprite.scaleY;
    this.x = sprite.x + (nx - w * sprite.originX) * s * sx;
    this.y = sprite.y + (neck.y + bob - h * sprite.originY) * s * sy;
  }

  // Glue the head to a body sprite (allies): position, mirroring, depth and alpha follow the body.
  follow(sprite, def, angle = 0) {
    this.locate(sprite, def, true);
    this.image
      .setPosition(this.x, this.y)
      .setFlipX(sprite.flipX)
      .setAngle(sprite.flipX ? -angle : angle)
      .setDepth(sprite.depth + 0.1)
      .setAlpha(sprite.alpha)
      .setVisible(sprite.visible && !!this.key);
  }

  setVisible(v) {
    this.image.setVisible(v && !!this.key);
    return this;
  }

  destroy() {
    this.image.destroy();
  }
}

// Display size of a photo head (screen px) written into out.w/out.h/out.anchorY.
// opts: { heightArt | widthArt, anchorY } (null = Lars' HEAD layout).
export function headSize(frame, opts, headScale, out) {
  const s = ART.scale;
  const aspect = frame.height / frame.width;
  if (opts?.heightArt) {
    out.h = opts.heightArt * s * headScale;
    out.w = out.h / aspect;
  } else {
    out.w = (opts?.widthArt ?? HEAD.widthArt) * s * headScale;
    out.h = out.w * aspect;
  }
  out.anchorY = opts?.anchorY ?? HEAD.anchorY;
  return out;
}

// Frame names are "<anim>_<i>"; parsed once per frame object (no per-frame string work).
export function frameInfo(frame) {
  if (frame._crewAnim === undefined) {
    const m = /^(.*)_(\d+)$/.exec(String(frame.name));
    frame._crewAnim = m ? m[1] : '';
    frame._crewIdx = m ? Number(m[2]) : 0;
  }
  info.anim = frame._crewAnim;
  info.idx = frame._crewIdx;
  return info;
}
const info = { anim: '', idx: 0 };

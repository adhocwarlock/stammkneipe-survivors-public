import { ART, DEPTH, HEAD } from '../../data/config.js';
import { championPhotoKey } from '../../data/champions.js';
import { PhotoHead } from '../../entities/PhotoHead.js';
import { shake } from '../../weapons/shake.js';
import { firstFrame } from '../CrewFx.js';
import { crewDef } from '../placeholders.js';
import { Sequence } from './Sequence.js';
import { sfx } from '../../audio/Sfx.js';

const HIDDEN = 0;
const FALLING = 1;
const ARMED = 2;
const GONE = 3;

// Mike: "Danger Close!!" An A-10 (Mike's face in the cockpit) makes a few passes in alternating directions,
// each carpet-dropping microphones over one band of the visible map. Short pause, "Mike Drop!!", and the
// mics explode one after another (explosion + small shake each), which clears the screen.
export class Mike extends Sequence {
  constructor(ctx, id, data) {
    super(ctx, id, data);
    const n = data.maxMics;
    this.mx = new Float32Array(n); // target (ground) position
    this.my = new Float32Array(n);
    this.sx = new Float32Array(n); // where it left the bomb bay
    this.sy = new Float32Array(n);
    this.ft = new Float32Array(n); // fall time
    this.band = new Uint8Array(n);
    this.state = new Uint8Array(n);
    this.order = new Uint16Array(n);
    this.mics = [];
    this.count = 0;
  }

  begin() {
    this.makePlane();
    this.count = 0;
    this.radius = this.data.explosion.radius;
    this.banner(this.data.banner);
    this.pass = 0;
    this.startPass();
    this.go('pass');
  }

  makePlane() {
    if (this.plane) return;
    const { scene } = this.ctx;
    const d = this.data;
    const key = d.plane;
    const frame = scene.textures.exists(key) ? firstFrame(scene, key) : undefined;
    this.plane = scene.add.sprite(0, 0, scene.textures.exists(key) ? key : '__DEFAULT', frame)
      .setScale(d.planeScale).setDepth(DEPTH.fx - 20).setVisible(false);
    // Dark copy of the plane on the ground below it.
    this.shadow = scene.add.sprite(0, 0, this.plane.texture.key, frame).setScale(d.planeScale)
      .setTintFill(0x000000).setAlpha(d.shadowAlpha).setDepth(DEPTH.above + 10).setVisible(false);
    this.face = new PhotoHead(scene, championPhotoKey(this.id), (d.cockpitFaceArt / HEAD.widthArt) * d.planeScale);
    this.face.image.setOrigin(0.5, 0.6).setDepth(DEPTH.fx - 19);
    if (scene.anims.exists(`${key}_fly`)) this.plane.play({ key: `${key}_fly`, repeat: -1 });
  }

  // Jittered grid over this pass' band (1/passes of the CURRENT camera view, so it follows Lars).
  layoutBand(v) {
    const d = this.data;
    const perPass = Math.floor(d.maxMics / d.passes);
    const bandH = v.height / d.passes;
    const spacing = Math.max(d.micSpacing, Math.sqrt((v.width * bandH) / perPass));
    const cols = Math.max(1, Math.floor(v.width / spacing));
    const rows = Math.max(1, Math.floor(bandH / spacing));
    const cw = v.width / cols;
    const rh = bandH / rows;
    const top = v.y + bandH * this.pass;
    let n = this.count;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols && n < d.maxMics; c++) {
        this.mx[n] = v.x + (c + 0.5) * cw + (Math.random() * 2 - 1) * d.micJitter;
        this.my[n] = top + (r + 0.5) * rh + (Math.random() * 2 - 1) * d.micJitter;
        this.band[n] = this.pass;
        this.state[n] = HIDDEN;
        n++;
      }
    }
    this.count = n;
    this.planeY = top + bandH / 2 - d.planeHeight;
    // Big enough explosions that the grid has no gaps.
    this.radius = Math.max(this.radius, Math.hypot(cw, rh) * 0.6);
  }

  startPass() {
    const v = this.ctx.scene.cameras.main.worldView;
    this.layoutBand(v);
    this.dirX = this.pass % 2 === 0 ? 1 : -1;
    const w = this.plane.displayWidth;
    this.x0 = this.dirX > 0 ? v.x - w : v.right + w;
    this.x1 = this.dirX > 0 ? v.right + w : v.x - w;
    this.plane.setFlipX(this.dirX < 0).setVisible(true);
    this.shadow.setFlipX(this.dirX < 0).setVisible(true);
    this.face.setVisible(true);
    this.placePlane(this.x0);
    sfx.play('crew_jet');
  }

  placePlane(x) {
    const d = this.data;
    const p = this.plane;
    p.setPosition(x, this.planeY);
    this.shadow.setPosition(x + d.shadowOffset * 0.3, this.planeY + d.shadowOffset);
    const pt = this.planePoint('cockpit');
    this.face.image.setPosition(pt.x, pt.y).setFlipX(p.flipX);
  }

  // World position of a meta point (cockpit / bombBay) on the plane sprite.
  planePoint(name) {
    const p = this.plane;
    const def = crewDef(this.data.plane);
    const pt = this.spot2;
    const [w, h] = def ? def.size : [96, 40];
    const m = def?.meta?.[name] || { x: w / 2, y: h / 2 };
    const k = ART.scale * this.data.planeScale;
    const mx = p.flipX ? w - m.x : m.x;
    pt.x = p.x + (mx - w * p.originX) * k;
    pt.y = p.y + (m.y - h * p.originY) * k;
    return pt;
  }

  tick(dt) {
    const d = this.data;
    this.updateMics(dt);
    switch (this.phase) {
      case 'pass': {
        const k = Math.min(1, this.t / d.passSeconds);
        const x = this.x0 + (this.x1 - this.x0) * k;
        this.placePlane(x);
        this.dropUnder(x);
        if (k >= 1) {
          this.hidePlane();
          this.pass++;
          this.go(this.pass < d.passes ? 'gap' : 'pause');
        }
        return;
      }
      case 'gap':
        if (this.t < d.passGap) return;
        this.startPass();
        this.go('pass');
        return;
      case 'pause':
        if (this.t < d.pauseSeconds) return;
        this.banner(d.banner2);
        this.shuffle();
        this.next = 0;
        this.go('boom');
        return;
      case 'boom': {
        const every = d.explodeSeconds / Math.max(1, this.count);
        while (this.next < this.count && this.t >= this.next * every) this.explode(this.order[this.next++]);
        if (this.next >= this.count && this.t >= d.explodeSeconds + 0.4) this.finish();
        return;
      }
      default:
    }
  }

  // Mics of the current band leave the bomb bay as the plane passes over their x.
  dropUnder(x) {
    const bay = this.planePoint('bombBay');
    for (let i = 0; i < this.count; i++) {
      if (this.state[i] !== HIDDEN || this.band[i] !== this.pass) continue;
      if (this.dirX > 0 ? x < this.mx[i] : x > this.mx[i]) continue;
      const s = this.micSprite(i);
      if (!s) continue;
      this.state[i] = FALLING;
      this.sx[i] = bay.x;
      this.sy[i] = bay.y;
      this.ft[i] = 0;
      s.setPosition(bay.x, bay.y).setVisible(true).setRotation(0);
      this.playMic(s, 'fall');
      sfx.play('crew_bomb_whistle', this.mx[i]);
    }
  }

  micSprite(i) {
    const { scene } = this.ctx;
    if (!scene.textures.exists('mic_bomb')) return null;
    while (this.mics.length <= i) {
      this.mics.push(scene.add.sprite(0, 0, 'mic_bomb', firstFrame(scene, 'mic_bomb')).setOrigin(0.5, 1).setVisible(false));
    }
    return this.mics[i];
  }

  playMic(s, anim) {
    const k = `mic_bomb_${anim}`;
    if (this.ctx.scene.anims.exists(k)) s.play({ key: k, repeat: -1 });
  }

  updateMics(dt) {
    const fall = this.data.fallSeconds;
    for (let i = 0; i < this.count; i++) {
      if (this.state[i] !== FALLING) continue;
      const s = this.mics[i];
      this.ft[i] += dt;
      const k = Math.min(1, this.ft[i] / fall);
      // Falls with a slight forward drift (it left a moving plane) and tumbles.
      s.setPosition(this.sx[i] + (this.mx[i] - this.sx[i]) * k, this.sy[i] + (this.my[i] - this.sy[i]) * k * k);
      s.setRotation(k * 6 * (this.dirX || 1)).setDepth(DEPTH.above + 5);
      if (k >= 1) {
        this.state[i] = ARMED;
        s.setRotation(0).setDepth(this.my[i]);
        this.playMic(s, 'armed');
      }
    }
  }

  shuffle() {
    const o = this.order;
    for (let i = 0; i < this.count; i++) o[i] = i;
    for (let i = this.count - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = o[i];
      o[i] = o[j];
      o[j] = t;
    }
  }

  explode(i) {
    const st = this.state[i];
    if (st === GONE) return;
    this.state[i] = GONE;
    const s = this.mics[i];
    if (s) s.setVisible(false).anims.stop();
    const ex = this.data.explosion;
    const x = this.mx[i];
    const y = this.my[i];
    this.ctx.fx.explode(x, y - 20, ex.fxScale);
    sfx.play('crew_explosion', x);
    this.ctx.area.circle(x, y, this.radius, ex);
    shake(this.ctx.scene, ex.shake, ex.shakeMs);
  }

  hidePlane() {
    this.plane.setVisible(false);
    this.shadow.setVisible(false);
    this.face.setVisible(false);
  }

  finish() {
    this.hidePlane();
    for (let i = 0; i < this.mics.length; i++) this.mics[i].setVisible(false);
    super.finish();
  }
}

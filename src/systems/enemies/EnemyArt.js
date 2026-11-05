import { ENEMY_FX } from '../../data/enemies.js';
import { AllyLights } from '../../crew/allyArt.js';
import { shake } from '../../weapons/shake.js';

// Sprite-meta extras for big monsters: glowing lights (meta.lights, meta.breathLights while breathing fire)
// and ground shakes on the walk frames in meta.shakeFrames.walk (only while on screen).
// Light sets are pooled (only a few big monsters are ever alive at once).
export class EnemyArt {
  constructor(scene) {
    this.scene = scene;
    this.pool = [];
    this.breathDefs = new WeakMap();
  }

  attach(e, t) {
    e.artFx = false;
    e.lightSet = null;
    e.shakeWalk = null;
    e.breathing = false;
    e.lightsBreath = false;
    const def = e.visual.def;
    const meta = def?.meta;
    if (!meta) return;
    if (meta.lights && (t.boss || t.maxAlive)) {
      e.lightSet = this.take();
      if (e.lightSet) e.lightSet.set(def, null);
    }
    e.shakeWalk = meta.shakeFrames?.walk || null;
    e.lastStep = -1;
    e.artFx = !!(e.lightSet || e.shakeWalk);
  }

  take() {
    for (let i = 0; i < this.pool.length; i++) if (!this.pool[i].inUse) return this.use(this.pool[i]);
    if (this.pool.length >= ENEMY_FX.maxLightSets) return null;
    const l = new AllyLights(this.scene);
    this.pool.push(l);
    return this.use(l);
  }

  use(l) {
    l.inUse = true;
    return l;
  }

  sync(e) {
    const def = e.visual.def;
    if (e.lightSet) {
      if (e.breathing !== e.lightsBreath) {
        e.lightsBreath = e.breathing;
        e.lightSet.set(e.breathing ? this.breathDef(def) : def, null);
      }
      e.lightSet.sync(e, def);
    }
    if (e.shakeWalk && e.anims.isPlaying && e.anims.currentAnim?.key === e.visual.walkAnim) {
      const idx = e.anims.currentFrame.index - 1; // Phaser frame indices are 1-based
      if (idx !== e.lastStep) {
        e.lastStep = idx;
        if (e.shakeWalk.indexOf(idx) >= 0 && this.scene.cameras.main.worldView.contains(e.x, e.y)) {
          shake(this.scene, ENEMY_FX.stepShake, ENEMY_FX.stepShakeMs);
        }
      }
    }
  }

  // Same sprite def, but with meta.breathLights as its lights (cached per def).
  breathDef(def) {
    let d = this.breathDefs.get(def);
    if (!d) {
      d = { size: def.size, origin: def.origin, meta: { lights: def.meta.breathLights || def.meta.lights } };
      this.breathDefs.set(def, d);
    }
    return d;
  }

  release(e) {
    if (e.lightSet) {
      e.lightSet.hide();
      e.lightSet.inUse = false;
      e.lightSet = null;
    }
    e.artFx = false;
  }
}

import { ART } from '../../data/config.js';
import { freeSpot } from '../spots.js';
import { shake } from '../../weapons/shake.js';
import { firstFrame } from '../CrewFx.js';
import { crewDef } from '../placeholders.js';
import { AllyLights, hitInfo } from '../allyArt.js';
import { Sequence } from './Sequence.js';
import { sfx } from '../../audio/Sfx.js';

const HOLE_FADE = 0.8;
const HOLE_DEPTH = -2; // ground decal: under shadows and characters

// Danny: runs in with his pickaxe, "Grabi Grabi Loch!!", digs a hole, "Too Deep!!!" and a huge flame demon
// climbs out of it (slow, whip = area, sword slam = ground shake + fire, the ground shakes as he walks).
// Danny keeps swinging the pickaxe; both fight for a while, then the demon sinks away.
export class Danny extends Sequence {
  begin() {
    const d = this.data;
    const { allies, player, town, scene } = this.ctx;
    this.demon = null;
    this.danny = this.spawnChampion(d.body, { speed: d.runSpeed, leave: 'run' });
    if (!this.danny) {
      this.finish();
      return;
    }
    const b = this.danny.sprite.body;
    const toEntry = Math.atan2(b.center.y - player.y, b.center.x - player.x);
    freeSpot(town, player.x, player.y, d.holeDist, toEntry, this.spot2);
    this.holeX = this.spot2.x;
    this.holeY = this.spot2.y;
    // Danny stands left of the hole and digs to his right (sprite faces right): pickaxe tip (meta.digHit)
    // on the inner half of the hole.
    const def = crewDef(d.body);
    const w = def?.size[0] ?? 24;
    const tip = ((hitInfo(def, 'dig').x ?? w) - w / 2) * ART.scale;
    const holeHalf = ((crewDef('dig_hole')?.size[0] ?? 32) * ART.scale * d.holeScale) / 2;
    allies.goto(this.danny, this.holeX - holeHalf * 0.5 - tip, this.holeY, d.runSpeed);
    if (!this.hole) {
      this.hole = scene.add.sprite(0, 0, 'dig_hole', firstFrame(scene, 'dig_hole')).setDepth(HOLE_DEPTH).setVisible(false);
      this.holeLights = new AllyLights(scene);
    }
    this.go('runIn');
  }

  tick(dt) {
    const d = this.data;
    const { allies, scene } = this.ctx;
    const a = this.danny;
    switch (this.phase) {
      case 'runIn':
        if (a.active && !a.arrived) return;
        allies.hold(a);
        a.sprite.setFlipX(false);
        this.banner(d.banner);
        allies.playLoop(a, 'dig');
        this.openHole();
        this.go('dig');
        return;
      case 'dig':
        this.syncHole(Math.min(1, this.t / d.digSeconds));
        sfx.loop('crew_dig', dt, this.holeX);
        if (this.t < d.digSeconds) return;
        this.loopHole();
        this.banner(d.banner2);
        shake(scene, d.holeOpen.shake, d.holeOpen.shakeMs);
        sfx.play('crew_hole_open', this.holeX);
        allies.setAttacks(a, d.attacks);
        a.speed = d.speed;
        allies.fight(a, d.duration);
        this.spawnDemon();
        this.go('emerge');
        return;
      case 'emerge': {
        const m = this.demon;
        this.syncHole(1);
        if (m) m.sprite.setAlpha(Math.min(1, this.t * 4));
        if (!m || this.t >= this.emergeT) {
          if (m) allies.fight(m, d.duration);
          this.go('fight');
        }
        return;
      }
      case 'fight': {
        this.syncHole(1);
        const m = this.demon;
        if ((m && m.active) || a.active) return;
        this.go('close');
        return;
      }
      case 'close':
        this.syncHole(Math.max(0, 1 - this.t / HOLE_FADE));
        if (this.t >= HOLE_FADE) {
          this.hole.setVisible(false);
          this.holeLights.hide();
          this.finish();
        }
        return;
      default:
    }
  }

  // The hole opens while Danny digs ('open' once), then glows ('default' loop).
  openHole() {
    const { scene } = this.ctx;
    const h = this.hole;
    h.setPosition(this.holeX, this.holeY).setScale(this.data.holeScale).setAlpha(0).setVisible(true);
    if (scene.anims.exists('dig_hole_open')) h.play({ key: 'dig_hole_open', repeat: 0 });
    else h.anims.stop();
    this.holeLights.set(crewDef('dig_hole'), null);
  }

  loopHole() {
    const { scene } = this.ctx;
    if (scene.anims.exists('dig_hole_default')) this.hole.play({ key: 'dig_hole_default', repeat: -1 });
    this.ctx.fx.explode(this.holeX, this.holeY - 10, this.data.holeOpen.fxScale);
  }

  syncHole(alpha) {
    this.hole.setAlpha(alpha);
    this.holeLights.sync(this.hole, crewDef('dig_hole'));
  }

  // The demon's feet go on the hole's mouth (meta.mouth); its 'emerge' anim climbs out.
  spawnDemon() {
    const d = this.data.demon;
    const { allies } = this.ctx;
    const def = crewDef('dig_hole');
    const mouth = def?.meta?.mouth || { x: 16, y: 8 };
    const k = ART.scale * this.data.holeScale;
    const x = this.holeX + (mouth.x - def.size[0] / 2) * k;
    const y = this.holeY + (mouth.y - def.size[1] / 2) * k;
    const m = allies.spawn(d.body, x, y, {
      photo: null, speed: d.speed, attacks: d.attacks, life: this.data.duration, shadowScale: d.shadowScale,
      halo: d.halo, leave: 'sink', stepEvery: d.stepEvery, stepShake: d.stepShake, stepShakeMs: d.stepShakeMs,
    });
    this.demon = m;
    sfx.play('crew_demon_roar', x);
    this.emergeT = this.data.emergeSeconds;
    if (!m) return;
    allies.hold(m);
    m.sprite.setFlipX(m.sprite.x > this.ctx.player.x).setAlpha(0);
    this.emergeT = Math.max(this.emergeT, allies.playOnce(m, 'emerge'));
  }
}

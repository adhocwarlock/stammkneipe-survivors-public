import { ART, LIGHTS } from '../../data/config.js';
import { freeSpot } from '../spots.js';
import { firstFrame } from '../CrewFx.js';
import { crewDef } from '../placeholders.js';
import { toWorld } from '../allyArt.js';
import { Sequence } from './Sequence.js';
import { sfx } from '../../audio/Sfx.js';

const PILLAR_IN = 0.4; // s pillar fade-in
const PILLAR_OUT = 1.0;
const GOD_FADE = 0.4;

// Johnny ("Loki"): runs in, tears his shirt off, "Bifröst!": rainbow pillars around Lars, each one
// summons a Norse god (name pops up at the pillar). "Schubsentanz!!" and they all brawl for a while.
export class Johnny extends Sequence {
  constructor(ctx, id, data) {
    super(ctx, id, data);
    this.pillars = [];
    this.gods = [];
    this.px = new Float32Array(data.gods.length);
    this.py = new Float32Array(data.gods.length);
  }

  begin() {
    const d = this.data;
    const { allies, player, town } = this.ctx;
    this.gods.length = 0;
    this.johnny = this.spawnChampion(d.body, { speed: d.runSpeed, leave: 'run' });
    if (!this.johnny) {
      this.finish();
      return;
    }
    const b = this.johnny.sprite.body;
    freeSpot(town, player.x, player.y, d.meetDist, Math.atan2(b.center.y - player.y, b.center.x - player.x), this.spot2);
    allies.goto(this.johnny, this.spot2.x, this.spot2.y, d.runSpeed);
    this.go('runIn');
  }

  tick() {
    const d = this.data;
    const { allies } = this.ctx;
    const a = this.johnny;
    switch (this.phase) {
      case 'runIn':
        if (a.active && !a.arrived) return;
        allies.hold(a);
        a.sprite.setFlipX(a.sprite.x > this.ctx.player.x);
        this.ripT = Math.max(d.ripSeconds, allies.playOnce(a, 'rip'));
        this.go('rip');
        return;
      case 'rip':
        if (this.t < this.ripT) return;
        allies.setBody(a, d.bareBody);
        this.banner(d.banner);
        this.openPillars();
        sfx.play('crew_bifrost');
        this.spawned = 0;
        this.go('pillars');
        return;
      case 'pillars':
        this.fadePillars(Math.min(1, this.t / PILLAR_IN));
        while (this.spawned < d.gods.length && this.t >= d.pillarSeconds + this.spawned * d.godEvery) {
          this.summon(this.spawned++);
        }
        this.fadeInGods();
        if (this.spawned >= d.gods.length && this.t >= d.pillarSeconds + (d.gods.length - 1) * d.godEvery + d.fightDelay) {
          this.banner(d.banner2);
          sfx.play('crew_crowd');
          allies.setAttacks(a, d.attacks);
          a.speed = d.speed;
          allies.fight(a, d.duration);
          for (let i = 0; i < this.gods.length; i++) {
            if (this.gods[i]?.active) {
              this.gods[i].sprite.setAlpha(1);
              allies.fight(this.gods[i], d.duration);
            }
          }
          this.go('fight');
        }
        return;
      case 'fight': {
        this.fadePillars(Math.max(0, 1 - this.t / PILLAR_OUT));
        if (a.active) return;
        for (let i = 0; i < this.gods.length; i++) if (this.gods[i]?.active) return;
        this.fadePillars(0);
        this.finish();
        return;
      }
      default:
    }
  }

  openPillars() {
    const { scene, player, town } = this.ctx;
    const d = this.data;
    const n = d.gods.length;
    for (let i = 0; i < n; i++) {
      freeSpot(town, player.x, player.y, d.pillarDist, -Math.PI / 2 + (i * Math.PI * 2) / n, this.spot2);
      this.px[i] = this.spot2.x;
      this.py[i] = this.spot2.y;
      if (!this.pillars[i]) this.pillars[i] = this.makePillar(i);
      const p = this.pillars[i];
      // y-sorted just behind the god who steps out of it (and under the map's "above" layers).
      p.s.setPosition(this.px[i], this.py[i] + 6).setDepth(this.py[i] - 1).setVisible(true).setAlpha(0);
      if (p.glow) {
        toWorld(p.s, crewDef('fx_bifrost'), p.light, this.spot2);
        p.glow.setPosition(this.spot2.x, this.spot2.y).setDepth(this.py[i] - 2).setVisible(true).setAlpha(0);
      }
    }
  }

  // Rainbow beam (ADD) + its ground light (sprite meta.light, drawn ADD as well).
  makePillar(i) {
    const { scene } = this.ctx;
    const s = scene.add.sprite(0, 0, 'fx_bifrost', firstFrame(scene, 'fx_bifrost')).setOrigin(0.5, 1)
      .setBlendMode(Phaser.BlendModes.ADD);
    if (scene.anims.exists('fx_bifrost_default')) s.play({ key: 'fx_bifrost_default', repeat: -1, startFrame: i });
    const def = crewDef('fx_bifrost');
    const light = def?.meta?.light || { x: def.size[0] / 2, y: def.size[1] - 4, radius: LIGHTS.defaultRadius, color: '#ffffff' };
    let glow = null;
    if (scene.textures.exists('fx_glow')) {
      const r = ((light.radius || LIGHTS.defaultRadius) * ART.scale) / LIGHTS.radiusUnit;
      glow = scene.add.image(0, 0, 'fx_glow').setBlendMode(Phaser.BlendModes.ADD).setScale(r * LIGHTS.poolScale)
        .setTint(Phaser.Display.Color.HexStringToColor(light.color || LIGHTS.defaultColor).color);
    }
    return { s, glow, light };
  }

  fadePillars(k) {
    for (let i = 0; i < this.pillars.length; i++) {
      const p = this.pillars[i];
      p.s.setAlpha(0.85 * k).setVisible(k > 0);
      if (p.glow) p.glow.setAlpha(0.5 * k).setVisible(k > 0);
    }
  }

  summon(i) {
    const g = this.data.gods[i];
    const { allies, popup, fx } = this.ctx;
    const x = this.px[i];
    const y = this.py[i];
    const god = allies.spawn(g.body, x, y, { photo: null, speed: g.speed, attacks: g.attacks, leave: 'fade' });
    this.gods[i] = god;
    if (god) {
      allies.hold(god);
      god.sprite.setAlpha(0);
      god.bornAt = this.t;
    }
    fx.ring(x, y, 70, 0xffffff);
    sfx.play('crew_god', x);
    popup.show(x, y - 120, { title: g.title, label: g.label, bad: false, iconKey: null });
  }

  fadeInGods() {
    for (let i = 0; i < this.gods.length; i++) {
      const g = this.gods[i];
      if (g?.active) g.sprite.setAlpha(Math.min(1, (this.t - g.bornAt) / GOD_FADE));
    }
  }
}

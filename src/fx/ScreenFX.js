import { FX } from '../data/config.js';
import { Audio } from '../audio/AudioEngine.js';






export class ScreenFX {
  constructor(scene) {
    this.scene = scene;
    createFxTextures(scene);
    const fixed = (o) => o.setScrollFactor(0).setOrigin(0).setDepth(9000);

    this.grime = fixed(scene.add.image(0, 0, 'fx_grime'));
    this.red = fixed(scene.add.image(0, 0, 'fx_vignette').setTint(0xa01010).setAlpha(0));
    this.dark = fixed(scene.add.image(0, 0, 'fx_vignette').setTint(0x000000));

    this.time = 0;
    this.dichtLeft = 0;
    this.webgl = scene.game.renderer.type === Phaser.WEBGL;
    this.ghosts = [];
    this.ghostTimer = 0;

    this.layout();
    scene.scale.on('resize', this.layout, this);
    scene.events.once('shutdown', () => scene.scale.off('resize', this.layout, this));
  }

  layout() {
    const { width, height } = this.scene.scale;
    for (const img of [this.grime, this.red, this.dark]) img.setDisplaySize(width, height);
  }

  startDicht(seconds) {
    this.dichtLeft = seconds;
    Audio.onDicht(true);
    if (this.webgl && !this.colorFx) {
      const cam = this.scene.cameras.main;
      this.colorFx = cam.postFX.addColorMatrix();
      this.barrelFx = cam.postFX.addBarrel(1);
    }
  }

  stopDicht() {
    this.dichtLeft = 0;
    Audio.onDicht(false);
    if (this.colorFx) {
      // On scene shutdown the camera may already be destroyed: removing its FX then would throw and kill the restart.
      const cam = this.scene.cameras?.main;
      if (cam?.postFX) {
        cam.postFX.remove(this.colorFx);
        cam.postFX.remove(this.barrelFx);
      }
      this.colorFx = null;
      this.barrelFx = null;
    }
    for (const g of this.ghosts) g.setVisible(false);
  }

  get isDicht() {
    return this.dichtLeft > 0;
  }

  update(dt, hpRatio, playerSprite) {
    this.time += dt;
    const hurt = 1 - hpRatio; // 0 = full HP, 1 = dead

    this.grime.setAlpha(FX.grimeBase + hurt * FX.grimeFromDamage);
    this.dark.setAlpha(FX.vignetteBase + hurt * FX.vignetteFromDamage);
    if (hpRatio < FX.lowHpThreshold) {
      // ~1 pulse per second: noticeable but not a flash.
      const pulse = 0.5 + 0.5 * Math.sin(this.time * Math.PI * 2 * FX.lowHpPulseHz);
      const strength = 1 - hpRatio / FX.lowHpThreshold;
      this.red.setAlpha((0.25 + 0.45 * pulse) * strength);
    } else {
      this.red.setAlpha(0);
    }

    if (this.dichtLeft > 0) {
      this.dichtLeft -= dt;
      this.updateDicht(dt, playerSprite);
      if (this.dichtLeft <= 0) this.stopDicht();
    }
  }

  updateDicht(dt, playerSprite) {
    const fade = Math.min(1, this.dichtLeft / 2); // ease out over the last 2 seconds
    if (this.colorFx) {
      this.colorFx.hue(this.time * FX.dichtHueDegPerSec);
      this.colorFx.saturate(0.4 * fade, true);
      this.barrelFx.amount = 1 + Math.sin(this.time * 1.3) * FX.dichtWobble * fade;
    }

    // Afterimages: pooled copies of Lars' current frame, fading out in rainbow tints.
    this.ghostTimer -= dt;
    if (this.ghostTimer <= 0 && playerSprite) {
      this.ghostTimer = FX.dichtGhostInterval;
      const g = this.nextGhost(playerSprite);
      g.setTexture(playerSprite.texture.key, playerSprite.frame.name)
        .setPosition(playerSprite.x, playerSprite.y)
        .setOrigin(playerSprite.originX, playerSprite.originY)
        .setFlipX(playerSprite.flipX)
        .setDepth(playerSprite.depth - 1)
        .setTint(Phaser.Display.Color.HSVToRGB((this.time * 0.4) % 1, 0.8, 1).color)
        .setAlpha(0.45 * fade)
        .setVisible(true);
    }
    for (const g of this.ghosts) {
      if (!g.visible) continue;
      g.alpha -= dt * 1.2;
      if (g.alpha <= 0) g.setVisible(false);
    }
  }

  nextGhost(src) {
    let g = this.ghosts.find((x) => !x.visible);
    if (!g) {
      if (this.ghosts.length >= FX.dichtGhostMax) g = this.ghosts[0];
      else {
        g = this.scene.add.image(0, 0, src.texture.key).setBlendMode(Phaser.BlendModes.ADD);
        this.ghosts.push(g);
      }
    }
    return g;
  }
}


function createFxTextures(scene) {
  if (scene.textures.exists('fx_vignette')) return;
  const size = 256;

  const v = scene.textures.createCanvas('fx_vignette', size, size);
  const vc = v.getContext();
  const grad = vc.createRadialGradient(size / 2, size / 2, size * 0.25, size / 2, size / 2, size * 0.72);
  grad.addColorStop(0, 'rgba(255,255,255,0)');
  grad.addColorStop(1, 'rgba(255,255,255,1)');
  vc.fillStyle = grad;
  vc.fillRect(0, 0, size, size);
  v.refresh();

  // Grime: dark specks and smudges hugging the screen edges (centre stays clean). Fixed seed, no flicker.
  const gs = 512;
  const g = scene.textures.createCanvas('fx_grime', gs, gs);
  const gc = g.getContext();
  const rng = new Phaser.Math.RandomDataGenerator(['grime']);
  for (let i = 0; i < 5000; i++) {
    const x = rng.between(0, gs);
    const y = rng.between(0, gs);
    const edge = Math.max(Math.abs(x - gs / 2), Math.abs(y - gs / 2)) / (gs / 2); // 0 centre, 1 edge
    if (edge < 0.6 || rng.frac() > ((edge - 0.6) / 0.4) ** 2) continue;
    const r = rng.frac() < 0.08 ? rng.between(3, 6) : rng.between(1, 2);
    gc.fillStyle = `rgba(${rng.between(10, 30)},${rng.between(8, 20)},${rng.between(5, 15)},${0.2 + rng.frac() * 0.5})`;
    gc.beginPath();
    gc.arc(x, y, r, 0, Math.PI * 2);
    gc.fill();
  }
  g.refresh();
}

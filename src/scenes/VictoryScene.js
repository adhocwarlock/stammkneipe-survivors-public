import { ART, FONTS } from '../data/config.js';
import { HEROES, HERO_ORDER } from '../data/heroes.js';
import { championHead, championPhotoKey } from '../data/champions.js';
import { CREDITS } from '../data/credits.js';
import { FACE_PHOTOS } from '../data/faces.js';
import { Save } from '../systems/SaveSystem.js';
import { registerSprites, spriteDef } from '../art/render.js';
import { Hero } from '../systems/Hero.js';
import { loadCrewPhotos, smoothCrewPhotos } from '../systems/photos.js';
import { firstTexture } from '../systems/textures.js';
import { PhotoHead } from '../entities/PhotoHead.js';
import { Audio } from '../audio/AudioEngine.js';



const TABLEAU_SLOT_ART = 36; // art px per hero in the line-up (the photo heads are wider than the bodies)
const TABLEAU_MAX_SCALE = 1.5;
const TABLEAU_TWO_ROWS_BELOW = 700; // px screen width
const TABLEAU_BACK_ROW_SCALE = 0.85;
const TABLEAU_BACK_ROW_RAISE = 0.9; // x slot width
export class VictoryScene extends Phaser.Scene {
  constructor() {
    super('VictoryScene');
  }

  preload() {
    for (const expr of FACE_PHOTOS) {
      if (!this.textures.exists(`photo_${expr}`)) this.load.image(`photo_${expr}`, `assets/faces/${expr}.png`);
    }
    loadCrewPhotos(this);
  }

  create() {
    registerSprites(this);
    this.textures.get('photo_normal')?.setFilter(Phaser.Textures.FilterMode.LINEAR);
    smoothCrewPhotos(this);
    this.cameras.main.setBackgroundColor('#07060c').fadeIn(1200);
    Audio.init();
    Audio.music.play('victory');
    const { width, height } = this.scale;

    // Stage (or a simple glow if the art is missing).
    const stageScale = Math.max(1, Math.min(3, width / 480));
    if (this.textures.exists('festival_stage')) {
      const st = this.add.sprite(width / 2, height * 0.78, 'festival_stage').setOrigin(0.5, 1).setScale(stageScale);
      if (this.anims.exists('festival_stage_default')) st.play('festival_stage_default');
    } else {
      this.add.rectangle(width / 2, height * 0.78, width * 0.8, height * 0.35, 0x1a1020).setOrigin(0.5, 1);
    }

    // The hero in front of the stage, walking in.
    const lx = width / 2;
    const ly = height * 0.9;
    const bodyKey = firstTexture(this, ...Hero.data.bodies) || 'lars';
    const def = spriteDef(bodyKey);
    const lars = this.add.sprite(lx - width * 0.35, ly, bodyKey, 'walk_0').setOrigin(0.5, 1).setScale(1.5);
    if (this.anims.exists(`${bodyKey}_walk`)) lars.play(`${bodyKey}_walk`);
    let head = null;
    if (def?.meta?.neck && this.textures.exists('photo_normal')) {
      head = new PhotoHead(this, Hero.photoKey, 1.5, Hero.id === 'lars' ? null : Hero.head);
    }
    const crew = this.buildTableau(width, ly);
    const placeHead = () => {
      if (head) head.follow(lars, def);
      for (const c of crew) if (c.head) c.head.follow(c.sprite, c.def);
    };
    this.tweens.add({
      targets: lars, x: lx, duration: 2600, ease: 'Sine.easeOut',
      onUpdate: placeHead,
      onComplete: () => {
        if (this.anims.exists(`${bodyKey}_idle`)) lars.play(`${bodyKey}_idle`);
        this.time.addEvent({ delay: 16, loop: true, callback: placeHead });
      },
    });

    // Headline.
    const size = Math.min(72, width / 11);
    const title = this.add.text(width / 2, height * 0.12, `${Hero.NAME} FÄHRT AUFS\nSUMMER BREEZE`, {
      fontFamily: FONTS.metal, fontSize: `${size}px`, color: '#ffb347', stroke: '#1a0505', strokeThickness: 10,
      align: 'center', lineSpacing: -size * 0.15,
    }).setOrigin(0.5, 0).setAlpha(0);
    this.tweens.add({ targets: title, alpha: 1, duration: 1400, delay: 600 });
    this.tweens.add({ targets: title, scale: 1.04, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: 2000 });

    // Lifetime stats.
    const st = Save.data.stats;
    this.add.text(width / 2, height * 0.12 + size * 2.1, `Runs: ${st.runs || 0}   ·   Kills: ${st.kills || 0}   ·   Gezecht: ${st.beers || 0}`, {
      fontFamily: FONTS.pixel, fontSize: `${width < 500 ? 9 : 12}px`, color: '#d4af37',
    }).setOrigin(0.5, 0);

    // Scrolling credits after a moment.
    const credits = this.add.text(width / 2, height + 40, CREDITS.join('\n'), {
      fontFamily: FONTS.pixel, fontSize: `${width < 500 ? 10 : 14}px`, color: '#eeeeee', align: 'center', lineSpacing: 14,
      stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5, 0).setDepth(10);
    this.tweens.add({
      targets: credits, y: -credits.height - 40, duration: 22000, delay: 5000,
      // Final tableau: the buyer steps back into the line-up of all heroes.
      onComplete: () => {
        this.tweens.add({ targets: lars, alpha: 0, duration: 600 });
        this.tweens.add({ targets: crew.map((c) => c.sprite), alpha: 1, duration: 1200, delay: 400 });
      },
    });

    const hint = this.add.text(width / 2, height - 14, 'Enter / Tippen: zurück zum Start', {
      fontFamily: FONTS.pixel, fontSize: '9px', color: '#77778a',
    }).setOrigin(0.5, 1).setAlpha(0);
    this.time.delayedCall(4000, () => {
      hint.setAlpha(1);
      const back = () => this.scene.start('MenuScene');
      this.input.keyboard.once('keydown-ENTER', back);
      this.input.once('pointerdown', back);
    });
  }

  // All playable heroes (hidden until the credits are through). Wide screens: one row. Narrow screens: two rows
  // (back row raised and a bit smaller) so the figures don't shrink to nothing. The buyer stands front and centre.
  buildTableau(width, y) {
    const n = HERO_ORDER.length;
    const rows = width < TABLEAU_TWO_ROWS_BELOW ? 2 : 1;
    const perRow = Math.ceil(n / rows);
    const slot = Math.min(width * 0.94 / perRow, TABLEAU_SLOT_ART * ART.scale * TABLEAU_MAX_SCALE);
    const scale = slot / (TABLEAU_SLOT_ART * ART.scale);
    // The buyer stands in the middle of the front (last) row; the others fill the rows in HERO_ORDER.
    const others = HERO_ORDER.filter((id) => id !== Hero.id);
    const front = rows === 2 ? others.splice(0, perRow - 1) : others.splice(0);
    front.splice(Math.floor(front.length / 2), 0, Hero.id);
    const lineup = rows === 2 ? [others, front] : [front];
    const out = [];
    lineup.forEach((ids, r) => {
      const back = rows === 2 && r === 0;
      const rowScale = back ? scale * TABLEAU_BACK_ROW_SCALE : scale;
      const rowY = back ? y - slot * TABLEAU_BACK_ROW_RAISE : y;
      const x0 = width / 2 - ((ids.length - 1) * slot) / 2;
      ids.forEach((id, i) => {
        const body = firstTexture(this, ...HEROES[id].bodies);
        const def = body && spriteDef(body);
        if (!def) return;
        const buyer = id === Hero.id;
        const s = this.add.sprite(x0 + i * slot, rowY + (buyer ? 6 : 0), body, 'idle_0').setOrigin(0.5, 1)
          .setScale(buyer ? rowScale * 1.1 : rowScale).setDepth((back ? 1 : 3) + (buyer ? 1 : 0)).setAlpha(0);
        if (this.anims.exists(`${body}_idle`)) s.play({ key: `${body}_idle`, startFrame: i % 2 });
        const head = def.meta?.neck && this.textures.exists('photo_normal')
          ? new PhotoHead(this, championPhotoKey(id), s.scaleX, id === 'lars' ? null : championHead(id))
          : null;
        if (head) head.follow(s, def);
        out.push({ sprite: s, head, def });
      });
    });
    return out;
  }
}

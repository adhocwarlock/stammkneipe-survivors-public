import { FONTS, TESTER } from '../data/config.js';
import { Save } from '../systems/SaveSystem.js';
import { formatEuro } from '../utils/format.js';
import { Button } from '../ui/Button.js';
import { HeroSelect } from '../ui/HeroSelect.js';
import { FACE_PHOTOS } from '../data/faces.js';
import { Hero } from '../systems/Hero.js';
import { loadCrewPhotos, smoothCrewPhotos } from '../systems/photos.js';
import { Audio } from '../audio/AudioEngine.js';

// Start screen. SPIELEN (click / Enter) opens the "WER?" hero select, then starts the run.
// Secret, deliberately not shown on screen: Shift + click / Enter = tester mode (no damage, €999,999 in a
// throwaway wallet, test keys), also through the hero select.
export class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  preload() {
    for (const expr of FACE_PHOTOS) {
      if (!this.textures.exists(`photo_${expr}`)) this.load.image(`photo_${expr}`, `assets/faces/${expr}.png`);
    }
    loadCrewPhotos(this); // for the hero select
  }

  create() {
    this.started = false; // the scene instance is reused when coming back from the victory screen
    this.selecting = null;
    smoothCrewPhotos(this);
    this.textures.get('photo_normal')?.setFilter(Phaser.Textures.FilterMode.LINEAR);
    this.cameras.main.setBackgroundColor('#0d0d10');
    this.title = this.add.text(0, 0, 'STAMMKNEIPE', {
      fontFamily: FONTS.metal, fontSize: '76px', color: '#d4af37', stroke: '#1a0a0a', strokeThickness: 10,
    }).setOrigin(0.5);
    this.subtitle = this.add.text(0, 0, 'SURVIVORS', {
      fontFamily: FONTS.metal, fontSize: '44px', color: '#c62828', stroke: '#000', strokeThickness: 6,
    }).setOrigin(0.5);
    this.pfand = this.add.text(0, 0, `PFAND: ${formatEuro(Save.data.pfandCents)}`, {
      fontFamily: FONTS.pixel, fontSize: '14px', color: '#d4af37',
    }).setOrigin(0.5);
    this.play = new Button(this, 'SPIELEN', () => {}, { width: 260, height: 60, fontSize: 26 });
    this.play.rect.off('pointerup');
    this.play.rect.on('pointerup', (pointer) => this.start(pointer.event?.shiftKey));
    this.hint = this.add.text(0, 0, 'Enter / Klick: spielen · M: Ton an/aus', {
      fontFamily: FONTS.pixel, fontSize: '10px', color: '#77778a', align: 'center',
    }).setOrigin(0.5);

    this.input.keyboard.on('keydown-ENTER', (e) => this.start(e.shiftKey));
    this.input.keyboard.on('keydown-SPACE', (e) => this.start(e.shiftKey));

    // The menu theme starts with the first click/key (browsers allow no sound before a gesture).
    Audio.init();
    Audio.music.play('menu');

    this.layout();
    this.scale.on('resize', this.layout, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.layout, this));

    if (new URLSearchParams(location.search).has('tester')) this.start(true);
  }

  layout() {
    const { width, height } = this.scale;
    const s = Math.min(1, width / 520);
    this.title.setPosition(width / 2, height * 0.3).setScale(s);
    this.subtitle.setPosition(width / 2, height * 0.3 + 80 * s).setScale(s);
    this.pfand.setPosition(width / 2, height * 0.3 + 130 * s);
    this.play.setPosition(width / 2, height * 0.66);
    this.hint.setPosition(width / 2, height * 0.66 + 60).setWordWrapWidth(width - 40);
  }

  // Always through the hero select (Esc closes it again).
  start(tester) {
    if (this.started || this.selecting) return;
    this.selecting = new HeroSelect(this, (id) => {
      this.selecting = null;
      this.launch(tester, id);
    }, () => {
      this.selecting = null;
    });
  }

  launch(tester, heroId) {
    Hero.set(heroId);
    this.started = true;
    if (tester) Save.beginTestSession(TESTER.pfandCents);
    this.scene.start('GameScene', { tester: !!tester });
  }
}

import { Button } from './Button.js';
import { VolumeRow } from './VolumeRow.js';
import { Audio } from '../audio/AudioEngine.js';
import { AUDIO } from '../data/audio.js';
import { VIEW } from '../data/config.js';
import { Save } from '../systems/SaveSystem.js';

const ROW_H = 46; // button height: two rows of these still fit a landscape phone (360 px)

// Pause button (top-right, always visible during a run) plus the pause overlay
// (resume, restart, sound settings, world zoom, minimap on/off). Zoom + minimap are saved.
export class PauseMenu {
  static BUTTON_SIZE = 44;

  constructor(scene, { onToggle, onRestart, onZoom, onMinimap }) {
    this.scene = scene;
    const s = PauseMenu.BUTTON_SIZE;

    this.pauseButton = new Button(scene, 'II', onToggle, { width: s, height: s, fontSize: 18, depth: 10160 });
    this.pauseButton.setAlpha(0.6);

    this.dim = scene.add.rectangle(0, 0, 10, 10, 0x000000, 0.65).setOrigin(0).setScrollFactor(0).setDepth(10200);
    this.title = scene.add.text(0, 0, 'PAUSE', {
      fontFamily: 'monospace', fontSize: '44px', fontStyle: 'bold', color: '#d4af37', stroke: '#000', strokeThickness: 6,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(10201);
    this.resumeButton = new Button(scene, 'WEITER', onToggle, { height: ROW_H });
    this.restartButton = new Button(scene, 'NEUSTART', onRestart, { height: ROW_H });
    const step = AUDIO.volumeStep;
    this.musicRow = new VolumeRow(scene, 'MUSIK', {
      step, get: () => Audio.volumes.music, set: (v) => Audio.setVolumes({ music: v }),
    });
    this.sfxRow = new VolumeRow(scene, 'EFFEKTE', {
      step, get: () => Audio.volumes.sfx, set: (v) => Audio.setVolumes({ sfx: v }),
    });
    this.zoomRow = new VolumeRow(scene, 'ZOOM', {
      steps: VIEW.zoomSteps,
      get: () => Save.data.settings.zoom,
      set: (z) => {
        Save.setSetting('zoom', z);
        onZoom(z);
      },
    });
    const half = (VolumeRow.width - 8) / 2;
    this.muteButton = new Button(scene, '', () => Audio.toggleMute(), { width: half, height: 44, fontSize: 15 });
    this.minimapButton = new Button(scene, '', () => {
      Save.setSetting('minimap', !Save.data.settings.minimap);
      onMinimap(Save.data.settings.minimap);
      this.refreshMinimap();
    }, { width: half, height: 44, fontSize: 15 });
    this.parts = [this.dim, this.title, this.resumeButton, this.restartButton, this.musicRow, this.sfxRow, this.zoomRow,
      this.muteButton, this.minimapButton];
    this.refreshSound();
    this.refreshMinimap();
    const off = Audio.onChange(() => this.refreshSound());

    this.setOpen(false);
    this.layout();
    scene.scale.on('resize', this.layout, this);
    scene.events.once('shutdown', () => {
      scene.scale.off('resize', this.layout, this);
      off();
    });
  }

  refreshSound() {
    this.muteButton.text.setText(Audio.muted ? 'TON: AUS (M)' : 'TON: AN (M)');
    this.musicRow.refresh();
    this.sfxRow.refresh();
  }

  refreshMinimap() {
    this.minimapButton.text.setText(Save.data.settings.minimap ? 'KARTE: AN' : 'KARTE: AUS');
  }

  layout() {
    const { width, height } = this.scene.scale;
    const s = PauseMenu.BUTTON_SIZE;
    this.pauseButton.setPosition(width - 16 - s / 2, 16 + s / 2);
    this.dim.setSize(width, height);
    // Title + seven rows; the spacing shrinks on short (landscape phone) screens.
    const u = Math.max(ROW_H + 2, Math.min(64, (height - 24) / 7.4));
    const cx = width / 2;
    const top = height / 2 - 3.3 * u;
    this.title.setPosition(cx, top).setFontSize(u < 56 ? 34 : 44);
    this.resumeButton.setPosition(cx, top + 1.05 * u);
    this.restartButton.setPosition(cx, top + 2.05 * u);
    this.musicRow.setPosition(cx, top + 3.1 * u);
    this.sfxRow.setPosition(cx, top + 4.05 * u);
    this.zoomRow.setPosition(cx, top + 5 * u);
    const dx = (VolumeRow.width + 8) / 4;
    this.muteButton.setPosition(cx - dx, top + 6.05 * u);
    this.minimapButton.setPosition(cx + dx, top + 6.05 * u);
  }

  setOpen(open) {
    for (const p of this.parts) p.setVisible(open);
    if (open) {
      this.refreshSound();
      this.refreshMinimap();
      this.zoomRow.refresh();
    }
  }

  hidePauseButton() {
    this.pauseButton.setVisible(false);
  }
}

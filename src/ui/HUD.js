import { DEPTH } from '../data/config.js';
import { BEERS, JOINT, PROMILLE } from '../data/beers.js';
import { DRINKS } from '../data/drinks.js';
import { formatEuro, formatTime } from '../utils/format.js';
import { PauseMenu } from './PauseMenu.js';

const MARGIN = 16;
const BAR_H = 14;
const ICON = 26; // px per active-effect slot
const MAX_EFFECTS = 10;
const TEXT_STYLE = { fontFamily: 'monospace', fontSize: '16px', color: '#eeeeee', stroke: '#000', strokeThickness: 3 };

// Screen-fixed HUD. Top-left: HP, Promille, active beer effects (icon + countdown bar,
// green = buff, red = debuff). Top-right (left of the pause button): Pfand, time, kills.
export class HUD {
  constructor(scene) {
    this.scene = scene;
    const fixed = (o) => o.setScrollFactor(0).setDepth(DEPTH.ui);

    this.hpBg = fixed(scene.add.rectangle(MARGIN, MARGIN, 10, BAR_H, 0x000000, 0.6).setOrigin(0).setStrokeStyle(1, 0x888888));
    this.hpFill = fixed(scene.add.rectangle(MARGIN + 1, MARGIN + 1, 10, BAR_H - 2, 0xc62828).setOrigin(0));
    this.hpText = fixed(scene.add.text(MARGIN, MARGIN + BAR_H + 2, '', TEXT_STYLE));

    const py = MARGIN + BAR_H + 24;
    this.prBg = fixed(scene.add.rectangle(MARGIN, py, 10, BAR_H - 4, 0x000000, 0.6).setOrigin(0).setStrokeStyle(1, 0x888888));
    this.prFill = fixed(scene.add.rectangle(MARGIN + 1, py + 1, 10, BAR_H - 6, 0xd4af37).setOrigin(0));
    this.prText = fixed(scene.add.text(MARGIN, py + BAR_H - 2, '', { ...TEXT_STYLE, fontSize: '13px', color: '#e8cf7a' }));

    // Effect icons sit in their own row under the Promille text (top-aligned), a timer bar under each.
    this.effectsY = py + BAR_H + 20;
    this.slots = [];
    for (let i = 0; i < MAX_EFFECTS; i++) {
      const x = MARGIN + i * ICON + ICON / 2;
      const icon = fixed(scene.add.image(x, this.effectsY, '__DEFAULT').setOrigin(0.5, 0).setVisible(false));
      const bar = fixed(scene.add.rectangle(x - ICON / 2 + 3, this.effectsY + 32, ICON - 6, 4, 0x6ad35a).setOrigin(0).setVisible(false));
      this.slots.push({ icon, bar });
    }

    this.pfandText = fixed(scene.add.text(0, MARGIN, '', { ...TEXT_STYLE, color: '#d4af37' }).setOrigin(1, 0));
    this.timeText = fixed(scene.add.text(0, MARGIN + 22, '', TEXT_STYLE).setOrigin(1, 0));
    this.killText = fixed(scene.add.text(0, MARGIN + 44, '', TEXT_STYLE).setOrigin(1, 0));

    this.layout();
    scene.scale.on('resize', this.layout, this);
    scene.events.once('shutdown', () => scene.scale.off('resize', this.layout, this));
  }

  layout() {
    const width = this.scene.scale.width;
    // Narrow phones (320px) need a shorter bar so it doesn't collide with the Pfand text.
    this.barW = Math.round(Phaser.Math.Clamp(width * 0.35, 100, 160));
    this.hpBg.setSize(this.barW, BAR_H);
    this.hpFill.setSize(this.barW - 2, BAR_H - 2);
    this.prBg.setSize(this.barW, BAR_H - 4);
    this.prFill.setSize(this.barW - 2, BAR_H - 6);

    const right = width - MARGIN - PauseMenu.BUTTON_SIZE - 12;
    this.pfandText.x = right;
    this.timeText.x = right;
    this.killText.x = right;
  }

  // walletCents: total Pfand you can spend (saved + this run).
  update(player, stats, status, walletCents) {
    this.hpFill.scaleX = player.hp / player.maxHp;
    this.hpText.setText(`HP ${Math.ceil(player.hp)}/${player.maxHp}`);

    
    const pr = status.promille;
    this.prFill.scaleX = Math.min(1, pr / PROMILLE.max);
    this.prFill.fillColor = pr < 2 ? 0xd4af37 : pr < 8 ? 0xe08a2a : pr < 14 ? 0xd0402a : 0x9a2ad0;
    this.prText.setText(`PROMILLE ${pr.toFixed(1)} ‰`);

    let i = 0;
    for (const [id, e] of status.effects) {
      if (i >= MAX_EFFECTS) break;
      const slot = this.slots[i++];
      const sprite = id === 'joint' ? JOINT.sprite : (BEERS[id] || DRINKS[id])?.sprite;
      if (sprite && this.scene.textures.exists(sprite)) slot.icon.setTexture(sprite, 'default_0').setScale(0.6).setVisible(true);
      else slot.icon.setVisible(false);
      slot.bar.setVisible(true).setFillStyle(e.bad ? 0xd0402a : 0x6ad35a);
      slot.bar.scaleX = Math.max(0, e.remaining / e.duration);
    }
    for (; i < MAX_EFFECTS; i++) {
      this.slots[i].icon.setVisible(false);
      this.slots[i].bar.setVisible(false);
    }

    this.pfandText.setText(`PFAND ${formatEuro(walletCents)}`);
    this.timeText.setText(formatTime(stats.elapsed));
    this.killText.setText(`Kills ${stats.kills}`);
  }
}

import { DEPTH, FONTS } from '../data/config.js';

const SLOTS = 2;
const BAR_H = 10;
const SLOT_H = 26; // name + bar + gap
const MAX_W = 360;
const SIDE = 16;
const WIDE_FROM = 900; // px: the HUD columns leave the top centre free
// Top edge: wide screens = top (or under the ability button), narrower = under the HUD columns/effect icons.
const TOP_WIDE = 18;
const TOP_WIDE_ABILITY = 84;
const TOP_NARROW = 130;
const TOP_NARROW_ABILITY = 152;

// Boss health bars, top centre: name + bar, up to 2 stacked (dragon, kill-count bosses, Eigenbedarf without
// a name). Below them: the kill-count hint ("Goblins 73/100", text from KillBosses).
export class BossBar {
  constructor(scene) {
    this.scene = scene;
    const fixed = (o) => o.setScrollFactor(0).setDepth(DEPTH.ui + 2);
    this.slots = [];
    for (let i = 0; i < SLOTS; i++) {
      const name = fixed(scene.add.text(0, 0, '', {
        fontFamily: FONTS.pixel, fontSize: '9px', color: '#f2d27a', stroke: '#000', strokeThickness: 3,
      }).setOrigin(0.5, 0));
      const bg = fixed(scene.add.rectangle(0, 0, 10, BAR_H, 0x000000, 0.65).setOrigin(0).setStrokeStyle(1, 0xd4af37));
      const fill = fixed(scene.add.rectangle(0, 0, 10, BAR_H - 2, 0xb02020).setOrigin(0));
      this.slots.push({ e: null, serial: 0, name, bg, fill, frac: -1 });
    }
    this.hint = fixed(scene.add.text(0, 0, '', {
      fontFamily: FONTS.pixel, fontSize: '8px', color: '#c8c8c8', stroke: '#000', strokeThickness: 3, align: 'center',
    }).setOrigin(0.5, 0));
    this.hintText = '';
    this.queue = []; // bosses waiting for a free slot: { e, serial, name }
    this.abilityShown = null;
    this.hideSlots();
    this.layout();
    scene.scale.on('resize', this.layout, this);
    scene.events.once('shutdown', () => scene.scale.off('resize', this.layout, this));
  }

  // Shows enemy e's HP; name null = bar only. A third boss waits in the queue until a slot frees up.
  track(e, name) {
    const slot = this.slots.find((s) => !this.live(s));
    if (!slot) {
      this.queue.push({ e, serial: e.serial, name });
      return;
    }
    this.assign(slot, e, e.serial, name);
  }

  assign(slot, e, serial, name) {
    slot.e = e;
    slot.serial = serial;
    slot.frac = -1;
    slot.name.setText(name || '').setVisible(!!name);
    slot.bg.setVisible(true);
    slot.fill.setVisible(true);
    this.layout();
  }

  // Next queued boss that is still alive goes into slot s.
  fromQueue(s) {
    while (this.queue.length) {
      const q = this.queue.shift();
      if (q.e.active && q.e.serial === q.serial) {
        this.assign(s, q.e, q.serial, q.name);
        return;
      }
    }
  }

  live(s) {
    return !!s.e && s.e.active && s.e.serial === s.serial;
  }

  hideSlots() {
    for (const s of this.slots) {
      s.name.setVisible(false);
      s.bg.setVisible(false);
      s.fill.setVisible(false);
    }
  }

  layout() {
    const { width } = this.scene.scale;
    const wide = width >= WIDE_FROM;
    const ability = !!this.scene.abilityButton?.visible;
    this.abilityShown = ability;
    let top = wide ? (ability ? TOP_WIDE_ABILITY : TOP_WIDE) : (ability ? TOP_NARROW_ABILITY : TOP_NARROW);
    const w = Math.min(MAX_W, width - SIDE * 2);
    const x = Math.round((width - w) / 2);
    let y = top;
    for (const s of this.slots) {
      if (!this.live(s)) continue; // live bars stack from the top, no gaps
      s.name.setPosition(width / 2, y);
      const by = y + (s.name.visible ? 12 : 0);
      s.bg.setPosition(x, by).setSize(w, BAR_H);
      s.fill.setPosition(x + 1, by + 1).setSize(w - 2, BAR_H - 2);
      y += s.name.visible ? SLOT_H : BAR_H + 6;
    }
    this.hint.setPosition(width / 2, y + 2);
  }

  // hintText: kill-count progress (only rebuilt on kills, compared here so setText runs only on change).
  update(hintText) {
    if (!!this.scene.abilityButton?.visible !== this.abilityShown) this.layout();
    let relayout = false;
    for (const s of this.slots) {
      if (!s.e) continue;
      if (!this.live(s)) {
        s.e = null;
        s.name.setVisible(false);
        s.bg.setVisible(false);
        s.fill.setVisible(false);
        relayout = true;
        this.fromQueue(s);
        if (!s.e) continue;
      }
      const frac = Math.max(0, s.e.hp / s.e.maxHp);
      if (Math.abs(frac - s.frac) > 0.001) {
        s.frac = frac;
        s.fill.scaleX = frac;
      }
    }
    if (relayout) this.layout();
    if (hintText !== this.hintText) {
      this.hintText = hintText;
      this.hint.setText(hintText);
    }
  }
}

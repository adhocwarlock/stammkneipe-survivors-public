import { SHOPS, DEBUG_SHOP } from '../data/shops.js';
import { WEAPONS, LOADOUT, PRICING } from '../data/weapons.js';
import { COMBO, COMBOS } from '../data/combos.js';
import { DEPTH, FONTS } from '../data/config.js';
import { Save } from '../systems/SaveSystem.js';
import { formatEuro } from '../utils/format.js';
import { Button } from './Button.js';
import { sfx } from '../audio/Sfx.js';

// Layout/colour constants (UI only, no balance values).
export const GOLD = 0xd4af37;
export const GOLD_CSS = '#d4af37';
export const TEXT_CSS = '#eeeeee';
export const DIM_CSS = '#9a9a9a';
export const OK_CSS = '#7ccf6a';
export const BAD_CSS = '#e05050';
export const PANEL = 0x141418;
const ROW = 0x1e1e24;
const ROW_SEL = 0x3a3526;
const DRAG_THRESHOLD = 8; // px of pointer movement before a press becomes a scroll instead of a tap
const WHEEL_FACTOR = 0.5;
const HINT = 'Tippen / Enter: kaufen · an/ablegen';

// Shop overlay. The scene pauses itself; this only draws the menu and edits the save.
export class ShopMenu {
  constructor(scene) {
    this.scene = scene;
    this.isOpen = false;
    this.objects = [];
    this.rows = [];
  }

  open(shopId, callbacks = {}) {
    const { onClose, onLoadoutChanged, onTicket } = callbacks;
    if (this.isOpen) this.close();
    const shop = this.getShop(shopId);
    if (!shop) return;
    this.shop = shop;
    this.callbacks = callbacks;
    this.onClose = onClose;
    this.onLoadoutChanged = onLoadoutChanged;
    this.onTicket = onTicket;
    this.isOpen = true;
    this.selected = 0;
    this.scroll = 0;
    this.press = null;
    this.build();
    this.layout();
    sfx.play('shop_open');

    const { scene } = this;
    scene.scale.on('resize', this.layout, this);
    scene.input.on('pointerdown', this.onPointerDown, this);
    scene.input.on('pointermove', this.onPointerMove, this);
    scene.input.on('pointerup', this.onPointerUp, this);
    scene.input.on('wheel', this.onWheel, this);
    scene.input.keyboard?.on('keydown', this.onKey, this);
    scene.events.once('shutdown', this.destroy, this);
  }

  getShop(id) {
    if (id === 'debug') return { ...DEBUG_SHOP, items: Object.keys(WEAPONS).filter((k) => PRICING.inflatedSlots.includes(WEAPONS[k].slot)) };
    return SHOPS[id];
  }

  close() {
    if (!this.isOpen) return;
    const cb = this.onClose;
    this.destroy();
    if (cb) cb();
  }

  // Removes everything without calling onClose (also used on scene shutdown).
  destroy() {
    if (!this.isOpen) return;
    this.isOpen = false;
    const { scene } = this;
    scene.scale.off('resize', this.layout, this);
    scene.input.off('pointerdown', this.onPointerDown, this);
    scene.input.off('pointermove', this.onPointerMove, this);
    scene.input.off('pointerup', this.onPointerUp, this);
    scene.input.off('wheel', this.onWheel, this);
    scene.input.keyboard?.off('keydown', this.onKey, this);
    scene.events.off('shutdown', this.destroy, this);
    for (const o of this.objects) o.destroy();
    this.objects.length = 0;
    this.rows.length = 0;
    this.button = null;
    this.onClose = null;
    this.onLoadoutChanged = null;
    this.callbacks = null;
  }

  // ---------- building ----------

  add(obj, depthOffset) {
    obj.setScrollFactor(0).setDepth(DEPTH.ui + 300 + depthOffset);
    this.objects.push(obj);
    return obj;
  }

  text(depthOffset, font, color, str = '') {
    return this.add(this.scene.add.text(0, 0, str, { fontFamily: font, fontSize: '12px', color }), depthOffset);
  }

  build() {
    const { scene, shop } = this;
    // Depth offsets: 0 dim, 1 panel, 2..6 rows, 10+ header/footer covers that hide rows scrolled under them.
    this.dim = this.add(scene.add.rectangle(0, 0, 10, 10, 0x000000, 0.7).setOrigin(0), 0);
    this.dim.setInteractive(); // swallows taps so nothing behind the menu reacts
    this.panel = this.add(scene.add.rectangle(0, 0, 10, 10, PANEL, 1).setOrigin(0).setStrokeStyle(3, GOLD), 1);

    this.buildRows();

    this.headCover = this.add(scene.add.rectangle(0, 0, 10, 10, PANEL, 1).setOrigin(0), 10);
    this.footCover = this.add(scene.add.rectangle(0, 0, 10, 10, PANEL, 1).setOrigin(0), 10);
    this.headLine = this.add(scene.add.rectangle(0, 0, 10, 2, GOLD, 0.8).setOrigin(0), 11);
    this.footLine = this.add(scene.add.rectangle(0, 0, 10, 2, GOLD, 0.8).setOrigin(0), 11);
    this.title = this.text(11, FONTS.metal, GOLD_CSS, shop.name).setOrigin(0.5, 0).setStroke('#000', 6);
    this.greeting = this.text(11, FONTS.pixel, TEXT_CSS, `„${shop.greeting}“`).setOrigin(0.5, 0).setAlign('center');
    this.info = this.text(11, FONTS.pixel, GOLD_CSS).setOrigin(0.5, 0).setAlign('center');
    this.feedback = this.text(11, FONTS.pixel, DIM_CSS, this.hint()).setOrigin(0.5, 0).setAlign('center');
    this.buildHeaderExtra();

    const depth = DEPTH.ui + 300 + 12;
    this.button = new Button(scene, 'RAUS', () => this.close(), { depth });
    this.button.text.setFontFamily(FONTS.metal).setFontStyle('');
    this.objects.push(this.button.rect, this.button.text);

    this.refresh();
  }

  // Unlocked combo weapons first (every shop has them, they're owned), then cheapest to most expensive
  // (the Summer Breeze ticket at the bottom). Combos are never for sale.
  buildRows() {
    const { shop } = this;
    const combos = Object.keys(COMBOS).filter((id) => Save.isUnlocked(id));
    const items = shop.items.filter((id) => WEAPONS[id] && !WEAPONS[id].combo).sort((a, b) => WEAPONS[a].price - WEAPONS[b].price);
    for (const id of [...combos, ...items]) {
      const w = WEAPONS[id];
      const row = this.makeRow(w.name, this.describe(id, w), this.makeIcon(w), shop.bio && !w.combo);
      row.id = id;
      row.w = w;
      row.price = Save.price(id, shop.priceMul);
      this.rows.push(row);
    }
  }

  // Description + combo hints: once a combo is discovered, both of its parts say what they go with and how far it is.
  describe(id, w) {
    const lines = [w.desc];
    for (const cid of Object.keys(COMBOS)) {
      const c = COMBOS[cid];
      if ((c.base !== id && c.partner !== id) || !Save.isComboDiscovered(cid)) continue;
      const other = WEAPONS[c.base === id ? c.partner : c.base].name;
      const name = WEAPONS[cid].name.toUpperCase();
      const state = Save.isUnlocked(cid) ? 'freigeschaltet' : `${Save.comboProgress(cid)}/${COMBO.kills} Kills mit ${WEAPONS[c.base].name}`;
      lines.push(`Passt gut zu ${other}: ${name} ${state}`);
    }
    return lines.join('\n');
  }

  // Row objects: background, icon, name, description, status (+ BIO badge).
  makeRow(name, desc, icon, bio = false) {
    const { scene } = this;
    const row = {};
    row.bg = this.add(scene.add.rectangle(0, 0, 10, 10, ROW, 1).setOrigin(0), 2);
    row.icon = icon;
    row.name = this.text(4, FONTS.pixel, TEXT_CSS, name);
    row.desc = this.text(4, FONTS.pixel, DIM_CSS, desc);
    row.status = this.text(4, FONTS.pixel, GOLD_CSS);
    row.badge = bio ? this.makeBioBadge() : null;
    return row;
  }

  // Hooks for special shops (the Eimer has tabs).
  buildHeaderExtra() {}

  layoutHeaderExtra(y) {
    return y;
  }

  hint() {
    return HINT;
  }

  // Weapon art if the texture exists, else a placeholder box with the first letter.
  makeIcon(w) {
    const { scene } = this;
    if (w.sprite && scene.textures.exists(w.sprite)) {
      const img = this.add(scene.add.image(0, 0, w.sprite, firstFrame(scene, w.sprite)), 3);
      img.baseW = img.frame.width;
      img.baseH = img.frame.height;
      return img;
    }
    const box = this.add(scene.add.rectangle(0, 0, 10, 10, 0x2c2c34, 1).setStrokeStyle(2, 0x777777), 3);
    box.letter = this.text(4, FONTS.pixel, DIM_CSS, w.name[0]).setOrigin(0.5);
    return box;
  }

  makeBioBadge() {
    const { scene } = this;
    if (scene.textures.exists('bio_label')) {
      const img = this.add(scene.add.image(0, 0, 'bio_label', firstFrame(scene, 'bio_label')).setOrigin(1, 1), 5);
      img.baseW = img.frame.width;
      img.baseH = img.frame.height;
      return img;
    }
    const bg = this.add(scene.add.rectangle(0, 0, 10, 10, 0x2e7d32, 1).setOrigin(1, 1).setStrokeStyle(1, 0xc8e6c9), 5);
    bg.label = this.text(6, FONTS.pixel, '#ffffff', 'BIO').setOrigin(0.5);
    return bg;
  }

  // ---------- layout ----------

  layout() {
    if (!this.isOpen) return;
    const { width: W, height: H } = this.scene.scale;
    const narrow = W < 560;
    const short = H < 520;
    const margin = narrow || short ? 8 : 24;
    const pad = narrow ? 10 : 18;
    const pw = Math.min(W - 2 * margin, 780);
    const ph = Math.min(H - 2 * margin, 900);
    const px = Math.round((W - pw) / 2);
    const py = Math.round((H - ph) / 2);
    this.narrow = narrow;

    this.dim.setSize(W, H);
    this.dim.input.hitArea.setSize(W, H);
    this.panel.setPosition(px, py).setSize(pw, ph);

    // Header
    const cx = px + pw / 2;
    this.title.setFontSize(short ? 28 : narrow ? 36 : 56).setPosition(cx, py + pad * 0.6);
    let y = this.title.y + this.title.height;
    this.greeting.setFontSize(narrow || short ? 8 : 11).setWordWrapWidth(pw - 2 * pad).setLineSpacing(4).setPosition(cx, y);
    y += this.greeting.height + 8;
    this.info.setFontSize(narrow || short ? 9 : 13).setPosition(cx, y);
    y += this.info.height + pad * 0.7;
    y = this.layoutHeaderExtra(y, cx, pw, pad);
    this.listTop = Math.round(y);
    this.headCover.setPosition(px + 2, py + 2).setSize(pw - 4, this.listTop - py - 2);
    this.headLine.setPosition(px + pad, this.listTop - 4).setSize(pw - 2 * pad, 2);

    // Footer (bottom up): button, feedback line
    const bh = short ? 40 : narrow ? 48 : 56;
    const bw = Math.min(pw - 2 * pad, 300);
    const by = py + ph - pad * 0.7 - bh / 2;
    this.button.rect.setSize(bw, bh);
    this.button.rect.input.hitArea.setSize(bw, bh);
    this.button.text.setFontSize(short ? 24 : 32);
    this.button.setPosition(cx, by);
    this.feedback.setFontSize(narrow || short ? 8 : 11).setWordWrapWidth(pw - 2 * pad);
    this.feedback.setPosition(cx, by - bh / 2 - 8 - this.feedback.height);
    this.listBottom = Math.round(this.feedback.y - 8);
    this.footCover.setPosition(px + 2, this.listBottom).setSize(pw - 4, py + ph - 2 - this.listBottom);
    this.footLine.setPosition(px + pad, this.listBottom + 2).setSize(pw - 2 * pad, 2);

    // Rows: icon | name + desc (+ status below on narrow) | status column on wide screens
    this.rowX = px + pad;
    this.rowW = pw - 2 * pad;
    const icon = narrow || short ? 40 : 56;
    const rp = narrow ? 8 : 10;
    const gap = narrow ? 6 : 10;
    const statusW = narrow ? 0 : 180;
    const textX = rp + icon + gap * 1.5;
    const textW = this.rowW - textX - rp - (statusW ? statusW + gap : 0);
    let top = 0;
    for (const r of this.rows) {
      r.name.setFontSize(narrow ? 9 : 13).setWordWrapWidth(textW).setLineSpacing(3);
      r.desc.setFontSize(narrow ? 8 : 10).setWordWrapWidth(textW).setLineSpacing(3);
      r.status.setFontSize(narrow ? 9 : 13);
      let textH = r.name.height + 6 + r.desc.height;
      if (narrow) textH += 6 + r.status.height;
      r.h = Math.round(Math.max(icon, textH) + 2 * rp);
      r.top = top;
      r.iconSize = icon;
      r.rp = rp;
      r.textX = textX;
      top += r.h + gap;
    }
    this.contentH = Math.max(0, top - gap);
    this.setScroll(this.scroll);
    this.ensureVisible(this.selected);
  }

  setScroll(v) {
    const listH = this.listBottom - this.listTop;
    this.scroll = Phaser.Math.Clamp(v, 0, Math.max(0, this.contentH - listH));
    this.positionRows();
  }

  positionRows() {
    const panelTop = this.panel.y;
    const panelBottom = this.panel.y + this.panel.height;
    for (const r of this.rows) {
      const x = this.rowX;
      const y = Math.round(this.listTop + r.top - this.scroll);
      // Rows partly under the header/footer are covered by them; rows sticking out of the panel are hidden.
      const vis = y >= panelTop && y + r.h <= panelBottom;
      r.bg.setPosition(x, y).setSize(this.rowW, r.h).setVisible(vis);

      const s = r.iconSize;
      const ix = x + r.rp + s / 2;
      const iy = y + r.h / 2;
      if (r.icon.baseW) {
        r.icon.setPosition(ix, iy).setScale(Math.min(s / r.icon.baseW, s / r.icon.baseH)).setVisible(vis);
      } else {
        r.icon.setPosition(ix, iy).setSize(s, s).setVisible(vis);
        r.icon.letter.setFontSize(Math.round(s * 0.45)).setPosition(ix, iy).setVisible(vis);
        // Rectangle origin is 0.5, but setSize doesn't move the display origin; keep it centred.
        r.icon.setDisplayOrigin(s / 2, s / 2);
      }
      if (r.badge) this.placeBadge(r.badge, ix + s / 2 + 6, iy + s / 2 + 4, vis);

      const tx = x + r.textX;
      const ty = y + r.rp;
      r.name.setPosition(tx, ty).setVisible(vis);
      r.desc.setPosition(tx, ty + r.name.height + 6).setVisible(vis);
      if (this.narrow) r.status.setOrigin(0, 0).setPosition(tx, r.desc.y + r.desc.height + 6);
      else r.status.setOrigin(1, 0.5).setPosition(x + this.rowW - r.rp, iy);
      r.status.setVisible(vis);
    }
  }

  placeBadge(b, x, y, vis) {
    if (b.baseW) {
      b.setPosition(x, y).setScale(Math.max(1, Math.round(18 / b.baseH))).setVisible(vis);
      return;
    }
    const size = this.narrow ? 7 : 9;
    b.label.setFontSize(size);
    const w = b.label.width + 8;
    const h = b.label.height + 6;
    b.setSize(w, h).setDisplayOrigin(w, h).setPosition(x, y).setVisible(vis);
    b.label.setPosition(x - w / 2, y - h / 2).setVisible(vis);
  }

  ensureVisible(i) {
    const r = this.rows[i];
    if (!r) return;
    const listH = this.listBottom - this.listTop;
    if (r.top < this.scroll) this.setScroll(r.top);
    else if (r.top + r.h > this.scroll + listH) this.setScroll(r.top + r.h - listH);
  }

  // ---------- state ----------

  // Updates balance, statuses and the selection highlight (no re-layout needed: text heights don't change).
  refresh() {
    this.info.setText(this.infoText()).setLineSpacing(6);
    this.rows.forEach((r, i) => {
      if (r.w) r.price = Save.price(r.id, this.shop.priceMul); // inflation: buying one makes the rest dearer
      const sel = i === this.selected;
      r.bg.setFillStyle(sel ? ROW_SEL : ROW, 1).setStrokeStyle(sel ? 3 : 1, sel ? GOLD : 0x3a3a44);
      const [label, color] = this.rowStatus(r);
      r.status.setText(label).setColor(color);
    });
  }

  infoText() {
    const eq = Save.data.equipped;
    const pfand = `PFAND ${formatEuro(Save.data.pfandCents)}`;
    const load = `WAFFEN ${eq.weapons.length}/${LOADOUT.maxWeapons} · HELM ${eq.helmet ? 'JA' : '-'} · GEAR ${eq.gear ? 'JA' : '-'}`;
    const pct = Math.round(((1 + PRICING.perPurchase) ** Save.purchaseCount() - 1) * 100);
    return pct > 0 ? `${pfand} · PREISE +${pct}%\n${load}` : `${pfand}\n${load}`;
  }

  // [label, css colour] for the status column.
  rowStatus(r) {
    if (r.w.slot === 'always') return ['IMMER DABEI', DIM_CSS];
    if (Save.isEquipped(r.id)) return ['AUSGERÜSTET', OK_CSS];
    if (r.w.combo) return Save.isUnlocked(r.id) ? ['COMBO', GOLD_CSS] : ['GESPERRT', DIM_CSS];
    if (Save.isUnlocked(r.id)) return ['GEKAUFT', TEXT_CSS];
    return [formatEuro(r.price), r.price <= Save.data.pfandCents ? GOLD_CSS : BAD_CSS];
  }

  say(msg, color = TEXT_CSS) {
    this.feedback.setText(msg).setColor(color);
    // The footer height depends on the feedback line; only re-layout if it wrapped differently.
    const bottom = this.feedback.y + this.feedback.height;
    const expected = this.button.rect.y - this.button.rect.height / 2 - 8;
    if (Math.abs(bottom - expected) > 1) this.layout();
  }

  select(i) {
    if (!this.rows.length) return;
    if (this.selected !== Phaser.Math.Wrap(i, 0, this.rows.length)) sfx.play('ui_move');
    this.selected = Phaser.Math.Wrap(i, 0, this.rows.length);
    this.refresh();
    this.ensureVisible(this.selected);
  }

  // Buy if not owned, otherwise toggle equipped.
  activate(i) {
    const r = this.rows[i];
    if (!r || r.w.slot === 'always') return;
    if (r.w.combo && !Save.isUnlocked(r.id)) return; // combos can't be bought
    if (!Save.isUnlocked(r.id)) {
      if (!Save.spend(r.price)) {
        this.say('Zu wenig Pfand!', BAD_CSS);
        this.scene.cameras.main.shake(80, 0.004);
        sfx.play('shop_deny');
        return;
      }
      sfx.play('shop_buy');
      if (r.w.slot === 'ticket') {
        Save.unlock(r.id);
        Save.data.summerBreezePurchased = true;
        Save.persist();
        const done = this.onTicket;
        this.close();
        done?.();
        return;
      }
      const autoEquip = Save.hasFreeSlot(r.id);
      Save.unlock(r.id);
      if (autoEquip) Save.equip(r.id);
      this.say(autoEquip ? `${r.w.name} gekauft und ausgerüstet!` : `${r.w.name} gekauft!`, OK_CSS);
    } else if (Save.isEquipped(r.id)) {
      Save.unequip(r.id);
      sfx.play('shop_equip');
      this.say(`${r.w.name} abgelegt.`);
    } else {
      const res = Save.equip(r.id);
      if (res === 'full') {
        this.say(`Max. ${LOADOUT.maxWeapons} Waffen! Erst eine ablegen.`, BAD_CSS);
        sfx.play('shop_deny');
        return;
      }
      this.say(`${r.w.name} ausgerüstet!`, OK_CSS);
      sfx.play('shop_equip');
    }
    this.refresh();
    const eq = Save.data.equipped;
    if (this.onLoadoutChanged) this.onLoadoutChanged(eq.weapons.slice(), eq.helmet, eq.gear);
  }

  // ---------- input ----------

  rowAt(x, y) {
    if (y < this.listTop || y > this.listBottom || x < this.rowX || x > this.rowX + this.rowW) return -1;
    const cy = y - this.listTop + this.scroll;
    return this.rows.findIndex((r) => cy >= r.top && cy <= r.top + r.h);
  }

  onPointerDown(p) {
    // Only presses that start inside the list can tap/drag it (a finger still held from the joystick can't).
    if (p.y < this.listTop || p.y > this.listBottom) return;
    this.press = { id: p.id, y: p.y, scroll: this.scroll, dragging: false };
  }

  onPointerMove(p) {
    const pr = this.press;
    if (pr && pr.id === p.id && p.isDown) {
      if (!pr.dragging && Math.abs(p.y - pr.y) > DRAG_THRESHOLD) pr.dragging = true;
      if (pr.dragging) this.setScroll(pr.scroll - (p.y - pr.y));
      return;
    }
    // Mouse hover moves the selection.
    if (!p.isDown && !p.wasTouch) {
      const i = this.rowAt(p.x, p.y);
      if (i >= 0 && i !== this.selected) {
        this.selected = i;
        this.refresh();
      }
    }
  }

  onPointerUp(p) {
    const pr = this.press;
    if (!pr || pr.id !== p.id) return;
    this.press = null;
    if (pr.dragging) return;
    const i = this.rowAt(p.x, p.y);
    if (i < 0) return;
    this.selected = i;
    this.activate(i);
    this.refresh();
  }

  onWheel(p, over, dx, dy) {
    this.setScroll(this.scroll + dy * WHEEL_FACTOR);
  }

  onKey(e) {
    if (e.repeat && !(e.code === 'ArrowUp' || e.code === 'ArrowDown')) return; // held W/S from walking must not scroll
    switch (e.code) {
      case 'ArrowUp':
      case 'KeyW':
        this.select(this.selected - 1);
        break;
      case 'ArrowDown':
      case 'KeyS':
        this.select(this.selected + 1);
        break;
      case 'Enter':
      case 'NumpadEnter':
      case 'Space':
        this.activate(this.selected);
        break;
      case 'Escape':
      case 'Backspace':
        this.close();
        break;
      default:
        return;
    }
    e.preventDefault?.();
  }
}

// 'default_0' is the first frame of art sprites; fall back to the texture's first real frame.
export function firstFrame(scene, key) {
  const tex = scene.textures.get(key);
  if (tex.has('default_0')) return 'default_0';
  const names = tex.getFrameNames();
  return names.length ? names[0] : undefined;
}

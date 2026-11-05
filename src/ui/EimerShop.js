import { ART, FONTS } from '../data/config.js';
import { SPECIAL_SHOPS } from '../data/shops.js';
import { DRINKS } from '../data/drinks.js';
import { CHAMPIONS, CHAMPION_ORDER, championHead, championPhotoKey } from '../data/champions.js';
import { Save } from '../systems/SaveSystem.js';
import { Hero } from '../systems/Hero.js';
import { firstTexture } from '../systems/textures.js';
import { crewDef } from '../crew/placeholders.js';
import { inCrew } from '../crew/CrewSystem.js';
import { headSize } from '../entities/PhotoHead.js';
import { formatEuro } from '../utils/format.js';
import { ShopMenu, firstFrame, GOLD, GOLD_CSS, TEXT_CSS, DIM_CSS, OK_CSS, BAD_CSS, PANEL } from './ShopMenu.js';
import { sfx } from '../audio/Sfx.js';

const TABS = ['drinks', 'crew'];
const TAB_LABEL = { drinks: 'GETRÄNKE', crew: 'CREW' };
const HINT = '◀ ▶ / Tippen: Tab wechseln · Enter: kaufen / wählen';
const TAB_KEYS = { ArrowLeft: -1, KeyA: -1, ArrowRight: 1, KeyD: 1, Tab: 1, KeyQ: -1 };

// The Eimer: same look and controls as the street shops, plus two tabs.
// GETRÄNKE: in-run drinks for Pfand (callbacks.onDrink). CREW: equip one champion for free (callbacks.onChampion).
export class EimerShop extends ShopMenu {
  constructor(scene) {
    super(scene);
    this.tab = 'drinks';
  }

  // The greeting addresses whoever you play ("Na, {name}?").
  getShop(id) {
    const shop = SPECIAL_SHOPS[id];
    return shop && { ...shop, greeting: shop.greeting.replace('{name}', Hero.name) };
  }

  hint() {
    return HINT;
  }

  destroy() {
    super.destroy();
    this.allRows = null;
    this.tabs = null;
  }

  buildRows() {
    this.allRows = [];
    for (const id of Object.keys(DRINKS)) {
      const d = DRINKS[id];
      const row = this.makeRow(d.name, d.desc, this.makeIcon({ sprite: d.sprite, name: d.name }));
      Object.assign(row, { tab: 'drinks', id, d, price: d.price });
      this.allRows.push(row);
    }
    // Crew: sprite with face + name only, no explanation (owner: you find out by trying).
    for (const id of CHAMPION_ORDER) {
      if (!inCrew(id)) continue;
      const c = CHAMPIONS[id];
      const row = this.makeRow(c.name, '', this.makeChampionIcon(id, c));
      Object.assign(row, { tab: 'crew', id, c });
      this.allRows.push(row);
    }
    this.pickRows();
  }

  pickRows() {
    this.rows = this.allRows.filter((r) => r.tab === this.tab);
    for (const r of this.allRows) if (r.tab !== this.tab) hideRow(r);
  }

  // Body sprite with the champion's photo head (Lars' face until their photo exists), centred on (0, 0).
  makeChampionIcon(id, c) {
    const { scene } = this;
    const def = crewDef(c.body);
    const photo = firstTexture(scene, championPhotoKey(id), 'photo_normal');
    if (!def || !scene.textures.exists(c.body)) return this.makeIcon({ sprite: photo, name: c.name });
    const s = ART.scale;
    const [w, h] = def.size;
    const frame = scene.textures.get(c.body).has('idle_0') ? 'idle_0' : firstFrame(scene, c.body);
    const body = scene.add.image(0, 0, c.body, frame).setOrigin(0.5, 1);
    const parts = [body];
    let top = -h * s;
    let width = w * s;
    if (photo) {
      const neck = def.meta?.neck || { x: w / 2, y: 0 };
      const head = scene.add.image((neck.x - w / 2) * s, (neck.y - h) * s, photo);
      const size = headSize(head.frame, photo === championPhotoKey(id) ? championHead(id) : null, 1, {});
      head.setDisplaySize(size.w, size.h).setOrigin(0.5, size.anchorY);
      top = Math.min(top, head.y - size.h * size.anchorY);
      width = Math.max(width, size.w);
      parts.push(head);
    }
    const mid = top / 2;
    for (const p of parts) p.y -= mid;
    const box = scene.add.container(0, 0, parts).setScrollFactor(0, 0, true);
    this.add(box, 3);
    box.baseW = width;
    box.baseH = -top;
    return box;
  }

  // ---- tabs ----

  buildHeaderExtra() {
    const { scene } = this;
    this.tabs = TABS.map((id) => {
      const rect = this.add(scene.add.rectangle(0, 0, 10, 10, PANEL, 1).setOrigin(0).setStrokeStyle(2, GOLD), 11);
      rect.setInteractive({ useHandCursor: true });
      rect.on('pointerup', () => this.setTab(id));
      const label = this.text(12, FONTS.pixel, TEXT_CSS, TAB_LABEL[id]).setOrigin(0.5);
      return { id, rect, label };
    });
    this.styleTabs();
  }

  layoutHeaderExtra(y, cx, pw, pad) {
    const th = this.narrow ? 28 : 36;
    const gap = 8;
    const tw = Math.min((pw - 2 * pad - gap) / 2, 220);
    this.tabs.forEach((t, i) => {
      const x = Math.round(cx - tw - gap / 2 + i * (tw + gap));
      t.rect.setPosition(x, Math.round(y)).setSize(tw, th);
      t.rect.input.hitArea.setSize(tw, th);
      t.label.setFontSize(this.narrow ? 9 : 12).setPosition(x + tw / 2, Math.round(y + th / 2));
    });
    return y + th + pad * 0.6;
  }

  styleTabs() {
    for (const t of this.tabs) {
      const on = t.id === this.tab;
      t.rect.setFillStyle(on ? 0x3a3526 : PANEL, 1).setStrokeStyle(on ? 3 : 1, on ? GOLD : 0x55555f);
      t.label.setColor(on ? GOLD_CSS : DIM_CSS);
    }
  }

  setTab(id) {
    if (!this.isOpen || id === this.tab) return;
    this.tab = id;
    this.selected = 0;
    this.scroll = 0;
    this.pickRows();
    this.styleTabs();
    this.say(HINT, DIM_CSS);
    this.layout();
    this.refresh();
  }

  onKey(e) {
    const step = TAB_KEYS[e.code];
    if (step) {
      if (e.repeat) return;
      const i = Phaser.Math.Wrap(TABS.indexOf(this.tab) + step, 0, TABS.length);
      this.setTab(TABS[i]);
      e.preventDefault?.();
      return;
    }
    super.onKey(e);
  }

  // ---- state ----

  infoText() {
    const pfand = `PFAND ${formatEuro(Save.data.pfandCents)}`;
    if (this.tab === 'drinks') return `${pfand}\nGILT NUR FÜR DIESEN RUN`;
    const c = inCrew(Save.data.champion) ? CHAMPIONS[Save.data.champion] : null;
    return `${pfand}\nCREW: ${c ? c.name.toUpperCase() : '-'}`;
  }

  rowStatus(r) {
    if (r.tab === 'drinks') {
      const left = this.callbacks?.drinkLeft?.(r.id) || 0;
      if (left > 0) return [`AKTIV ${Math.ceil(left)} s`, OK_CSS];
      return [formatEuro(r.price), r.price <= Save.data.pfandCents ? GOLD_CSS : BAD_CSS];
    }
    return Save.data.champion === r.id ? ['DABEI', OK_CSS] : ['GRATIS', GOLD_CSS];
  }

  activate(i) {
    const r = this.rows[i];
    if (!r) return;
    if (r.tab === 'drinks') {
      if (!Save.spend(r.price)) {
        this.say('Zu wenig Pfand!', BAD_CSS);
        this.scene.cameras.main.shake(80, 0.004);
        sfx.play('shop_deny');
        return;
      }
      sfx.play('shop_buy');
      this.callbacks?.onDrink?.(r.id);
      this.say(`${r.d.name}! Prost! (${r.d.label})`, OK_CSS);
    } else if (Save.data.champion === r.id) {
      sfx.play('shop_equip');
      this.callbacks?.onChampion?.(null);
      this.say(`${r.c.name} bleibt an der Theke.`);
    } else {
      sfx.play('shop_equip');
      this.callbacks?.onChampion?.(r.id);
      this.say(`${r.c.name} ist dabei! Fähigkeit: Gesicht oben antippen oder E.`, OK_CSS);
    }
    this.refresh();
  }
}

function hideRow(r) {
  r.bg.setVisible(false);
  r.icon.setVisible(false);
  r.icon.letter?.setVisible(false);
  r.name.setVisible(false);
  r.desc.setVisible(false);
  r.status.setVisible(false);
  r.badge?.setVisible(false);
  r.badge?.label?.setVisible(false);
}

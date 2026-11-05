import { COMBO, COMBOS } from '../data/combos.js';
import { WEAPONS } from '../data/weapons.js';
import { Save } from './SaveSystem.js';
import { sfx } from '../audio/Sfx.js';

const COMBO_IDS = Object.keys(COMBOS);




export class ComboSystem {
  constructor(scene, { popup, floatingText, player, applyLoadout }) {
    this.scene = scene;
    this.popup = popup;
    this.floatingText = floatingText;
    this.player = player;
    this.applyLoadout = applyLoadout;
    this.active = []; // combo ids whose parts are both equipped right now (and not unlocked yet)
    this.unsaved = 0;
    this.pending = null; // reached the kill count this frame; unlocked in update()
    this.refresh();
  }

  // Call after every loadout change. Equipping both parts once is what "discovers" a combo (shop hints).
  refresh() {
    this.active.length = 0;
    for (const id of COMBO_IDS) {
      const c = COMBOS[id];
      if (Save.isUnlocked(id) || !Save.isEquipped(c.base) || !Save.isEquipped(c.partner)) continue;
      this.active.push(id);
      Save.discoverCombo(id);
      // Reached the count but the run ended before the swap: unlock on the next frame.
      if (!this.pending && Save.comboProgress(id) >= COMBO.kills) this.pending = id;
    }
  }

  // byWeaponId: what EnemySystem says made the kill (null = crew, events, unknown).
  // Runs inside the killing weapon's own update, so the loadout swap waits for update() (after all weapons ran).
  onKill(byWeaponId) {
    if (!byWeaponId || this.pending || !this.active.length) return;
    for (let i = 0; i < this.active.length; i++) {
      const id = this.active[i];
      if (COMBOS[id].base !== byWeaponId) continue;
      if (Save.addComboKill(id) >= COMBO.kills) {
        this.pending = id;
        return;
      }
      if (++this.unsaved >= COMBO.persistEvery) this.save();
    }
  }

  // GameScene calls this every frame after the weapons updated.
  update() {
    if (!this.pending) return;
    const id = this.pending;
    this.pending = null;
    this.unlock(id);
  }

  save() {
    this.unsaved = 0;
    Save.persist();
  }

  unlock(id) {
    const c = COMBOS[id];
    Save.unlock(id);
    Save.unequip(c.base);
    Save.unequip(c.partner);
    Save.equip(id);
    this.save();
    const eq = Save.data.equipped;
    this.applyLoadout(eq.weapons.slice(), eq.helmet, eq.gear); // also calls refresh()
    const name = WEAPONS[id].name;
    this.popup.showBanner(COMBO.banner.replace('{name}', name.toUpperCase()), COMBO.bannerSeconds);
    this.popup.show(this.player.x, this.player.y, { title: `${name}!!`, label: 'COMBO-WAFFE', bad: false, iconKey: WEAPONS[id].sprite });
    this.scene.cameras.main.shake(COMBO.shakeMs, COMBO.shake);
    sfx.play('banner');
    this.player.cheer();
  }

  // ?debug Y: finish the first active combo right now. Returns its id (or null).
  debugFinish() {
    const id = this.active[0] || null;
    if (id) this.unlock(id);
    return id;
  }
}

import { WEAPONS, LOADOUT } from '../data/weapons.js';
import { NEUTRAL_MODS } from './common.js';
import { createWeaponPlaceholders } from './placeholders.js';
import { Fists } from './Fists.js';
import { Metzgerbeil } from './Metzgerbeil.js';
import { NinjaStars } from './NinjaStars.js';
import { Mjolnir } from './Mjolnir.js';
import { DoenerSpiess } from './DoenerSpiess.js';
import { Eimer } from './Eimer.js';
import { FireBreath } from './FireBreath.js';
import { Helmet } from './Helmet.js';
import { Gear } from './Gear.js';
import { Shooter } from './Shooter.js';
import { ArcWeapon, Ruder } from './Blades.js';
import { Kettensaege } from './Kettensaege.js';
import { Bumerang } from './Bumerang.js';
import { Zauberstab } from './Zauberstab.js';
import { Pfeffi } from './Pfeffi.js';
import { Feuerwand } from './Feuerwand.js';
import { Claymore } from './Claymore.js';
import { Firestorm } from './combos/Firestorm.js';
import { PfeffiEimer } from './combos/PfeffiEimer.js';
import { Doppelklinge } from './combos/Doppelklinge.js';
import { Minenwerfer } from './combos/Minenwerfer.js';
import { Ollie } from './combos/Ollie.js';
import { PyroShow } from './combos/PyroShow.js';
import { WikingerMetal } from './combos/WikingerMetal.js';

// Every class is built as new Cls(scene, player, enemies, sparks, WEAPONS[id], { burn }).
const WEAPON_CLASSES = {
  metzgerbeil: Metzgerbeil,
  ninja_stars: NinjaStars,
  mjolnir: Mjolnir,
  doener_spiess: DoenerSpiess,
  eimer: Eimer,
  bogen: Shooter,
  mercedes_sterne: Shooter,
  minigun: Shooter,
  samurai_schwert: ArcWeapon,
  lichtschwert: ArcWeapon,
  harley_benton: ArcWeapon,
  ruder: Ruder,
  kettensaege: Kettensaege,
  bumerang: Bumerang,
  zauberstab: Zauberstab,
  pfeffi: Pfeffi,
  feuerwand: Feuerwand,
  claymore: Claymore,
  
  combo_firestorm: Firestorm,
  combo_pfeffi_eimer: PfeffiEimer,
  combo_shuriken_sturm: Shooter,
  combo_doppelklinge: Doppelklinge,
  combo_minenwerfer: Minenwerfer,
  combo_metzgerei_wurf: Bumerang,
  combo_ollie: Ollie,
  combo_pyro_show: PyroShow,
  combo_wikinger_metal: WikingerMetal,
};

// Owns Lars' fists (always on; the Mexikaner's fire breath replaces them while it lasts),
// up to LOADOUT.maxWeapons extra weapons, the helmet and the gear item.
export class WeaponSystem {
  constructor(scene, { player, enemies, sparks, burn }) {
    this.scene = scene;
    this.player = player;
    this.enemies = enemies;
    this.sparks = sparks;
    this.ctx = { burn: burn || null, weapons: this };
    createWeaponPlaceholders(scene);
    this.fists = new Fists(scene, player, enemies, sparks);
    this.breath = burn ? new FireBreath(scene, player, enemies, sparks, burn) : null;
    this.weapons = []; // [{ id, weapon }] in loadout order
    this.helmetId = null;
    this.helmet = null;
    this.gearId = null;
    this.gear = null;
  }

  // Can be called any time (e.g. after buying mid-run). Weapons that stay equipped keep their instance
  // (and cooldown); removed ones are destroyed. Unknown ids, duplicates and non-weapon ids are ignored.
  setLoadout(weaponIds = [], helmetId = null, gearId = null) {
    const next = [];
    for (let i = 0; i < weaponIds.length && next.length < LOADOUT.maxWeapons; i++) {
      const id = weaponIds[i];
      if (!WEAPON_CLASSES[id] || WEAPONS[id]?.slot !== 'weapon' || next.some((w) => w.id === id)) continue;
      const kept = this.weapons.find((w) => w.id === id);
      next.push(kept || { id, weapon: new WEAPON_CLASSES[id](this.scene, this.player, this.enemies, this.sparks, WEAPONS[id], this.ctx) });
    }
    for (const w of this.weapons) if (!next.includes(w)) w.weapon.destroy();
    this.weapons = next;

    const helmet = helmetId && WEAPONS[helmetId]?.slot === 'helmet' ? helmetId : null;
    if (helmet !== this.helmetId) {
      if (this.helmet) this.helmet.destroy();
      this.helmet = helmet ? new Helmet(this.scene, this.player, this.enemies, this.sparks, WEAPONS[helmet]) : null;
      this.helmetId = helmet;
    }
    if (this.player.setHelmet) this.player.setHelmet(this.helmetId);

    const gear = gearId && WEAPONS[gearId]?.slot === 'gear' ? gearId : null;
    if (gear !== this.gearId) {
      if (this.gear) this.gear.destroy();
      this.gear = gear ? new Gear(this.scene, this.player, WEAPONS[gear]) : null;
      this.gearId = gear;
    }
  }

  update(dt, mods = NEUTRAL_MODS) {
    const en = this.enemies;
    en.source = 'fists';
    if (mods.fireBreath && this.breath) {
      this.fists.fist.setVisible(false);
      this.breath.update(dt, mods);
    } else {
      this.fists.update(dt, mods);
    }
    const list = this.weapons;
    for (let i = 0; i < list.length; i++) {
      en.source = list[i].id; // kill attribution for combo progress (EnemySystem.kill)
      list[i].weapon.update(dt, mods);
    }
    en.source = this.helmetId;
    if (this.helmet) this.helmet.update(dt, mods);
    en.source = null;
    if (this.gear) this.gear.update(dt);
  }

  // Call on every player-enemy overlap, BEFORE applying the goblin's contact damage (the horns may kill it).
  onPlayerTouched(enemy) {
    this.enemies.source = this.helmetId;
    if (this.helmet) this.helmet.onPlayerTouched(enemy);
    this.enemies.source = null;
  }

  // Damage-taken reduction from helmet + gear (added up; StatusSystem caps the total).
  armor() {
    return (this.helmet ? this.helmet.armor() : 0) + (this.gear ? this.gear.armor() : 0);
  }

  // Extra move speed from gear (+0.25 = +25%), added to the beer/joint speed effects.
  speedBonus() {
    return this.gear ? this.gear.speed() : 0;
  }

  destroy() {
    this.fists.destroy();
    if (this.breath) this.breath.destroy();
    for (const w of this.weapons) w.weapon.destroy();
    this.weapons = [];
    if (this.helmet) this.helmet.destroy();
    this.helmet = null;
    this.helmetId = null;
    if (this.gear) this.gear.destroy();
    this.gear = null;
    this.gearId = null;
  }
}

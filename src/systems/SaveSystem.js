import { WEAPONS, LOADOUT, PRICING } from '../data/weapons.js';
import { CHAMPIONS } from '../data/champions.js';
import { VIEW, LEADERBOARD } from '../data/config.js';
import { COMBOS } from '../data/combos.js';


const KEY = 'lars-pfand-survival';
const VERSION = 6;

function defaults() {
  return {
    version: VERSION,
    pfandCents: 0,
    unlocked: ['fists'],
    equipped: { weapons: [], helmet: null, gear: null },
    summerBreezePurchased: false,
    champion: null, // equipped crew member (Eimer shop), null = none
    stats: { beers: 0, kills: 0, runs: 0 },
    settings: { masterVolume: 1, musicVolume: 0.7, sfxVolume: 0.8, muted: false, zoom: VIEW.defaultZoom, minimap: true },
    playerName: '', // last name typed into the leaderboard
    combos: { progress: {}, discovered: [] }, 
  };
}

// Upgrades raw data from older save versions to the current shape, one version step at a time.
// Add a `case n:` for every future format change (fall-through is intentional).
function migrate(raw) {
  const v = Number.isInteger(raw.version) ? raw.version : 0;
  switch (v) {
    case 0:
      
      if (!Array.isArray(raw.unlocked)) {
        raw.unlocked = [].concat(
          Array.isArray(raw.unlockedWeapons) ? raw.unlockedWeapons : [],
          Array.isArray(raw.unlockedEquipment) ? raw.unlockedEquipment : [],
        );
      }
      // falls through
    case 1:
      // v2 added `champion` (none equipped by default); nothing to convert.
      // falls through
    case 2:
      // v3 added `equipped.gear` (Wikingerschild / Skateboard, none by default); nothing to convert.
      // falls through
    case 3:
      // v4 added `settings.muted` (M key, false by default); nothing to convert.
      // falls through
    case 4:
      // v5 added `settings.zoom`, `settings.minimap` and `playerName`; nothing to convert.
      // falls through
    case 5:
      
      
    default:
      break;
  }
  raw.version = VERSION;
  return raw;
}

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
// Own-property check, so ids like 'constructor' or '__proto__' from a tampered save don't count as weapons.
const isItem = (id) => typeof id === 'string' && Object.prototype.hasOwnProperty.call(WEAPONS, id);
const cents = (v, d) => (Number.isFinite(v) && v >= 0 ? Math.min(Math.floor(v), Number.MAX_SAFE_INTEGER) : d);
const count = cents;
// Leaderboard name: collapsed whitespace, max length (the server checks the characters again).
export const cleanName = (s) => String(s).normalize('NFC').replace(/\s+/g, ' ').trim().slice(0, LEADERBOARD.nameMax);
const unit = (v, d) => (Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : d);

// Builds a clean save from untrusted data, taking each field only if it has the right type.
function sanitize(raw) {
  const d = defaults();
  if (!isObj(raw)) return d;
  raw = migrate(raw);

  d.pfandCents = cents(raw.pfandCents, d.pfandCents);
  if (Array.isArray(raw.unlocked)) {
    for (const id of raw.unlocked) {
      if (isItem(id) && !d.unlocked.includes(id)) d.unlocked.push(id);
    }
  }

  if (isObj(raw.equipped)) {
    const eq = raw.equipped;
    if (Array.isArray(eq.weapons)) {
      for (const id of eq.weapons) {
        if (d.equipped.weapons.length >= LOADOUT.maxWeapons) break;
        if (isItem(id) && d.unlocked.includes(id) && WEAPONS[id].slot === 'weapon' && !d.equipped.weapons.includes(id)) {
          d.equipped.weapons.push(id);
        }
      }
    }
    if (isItem(eq.helmet) && d.unlocked.includes(eq.helmet) && WEAPONS[eq.helmet].slot === 'helmet') {
      d.equipped.helmet = eq.helmet;
    }
    if (isItem(eq.gear) && d.unlocked.includes(eq.gear) && WEAPONS[eq.gear].slot === 'gear') {
      d.equipped.gear = eq.gear;
    }
  }

  if (typeof raw.summerBreezePurchased === 'boolean') d.summerBreezePurchased = raw.summerBreezePurchased;
  if (typeof raw.champion === 'string' && Object.prototype.hasOwnProperty.call(CHAMPIONS, raw.champion)) {
    d.champion = raw.champion;
  }
  if (isObj(raw.stats)) {
    for (const k of Object.keys(d.stats)) d.stats[k] = count(raw.stats[k], d.stats[k]);
  }
  if (isObj(raw.settings)) {
    for (const k of Object.keys(d.settings)) {
      if (k === 'zoom') continue;
      d.settings[k] = typeof d.settings[k] === 'boolean'
        ? (typeof raw.settings[k] === 'boolean' ? raw.settings[k] : d.settings[k])
        : unit(raw.settings[k], d.settings[k]);
    }
    if (VIEW.zoomSteps.includes(raw.settings.zoom)) d.settings.zoom = raw.settings.zoom;
  }
  if (typeof raw.playerName === 'string') d.playerName = cleanName(raw.playerName);
  if (isObj(raw.combos)) {
    const isCombo = (id) => typeof id === 'string' && Object.prototype.hasOwnProperty.call(COMBOS, id);
    if (isObj(raw.combos.progress)) {
      for (const id of Object.keys(raw.combos.progress)) {
        if (isCombo(id)) d.combos.progress[id] = count(raw.combos.progress[id], 0);
      }
    }
    if (Array.isArray(raw.combos.discovered)) {
      for (const id of raw.combos.discovered) if (isCombo(id) && !d.combos.discovered.includes(id)) d.combos.discovered.push(id);
    }
  }
  return d;
}

// localStorage can be missing or throw (private mode, disabled storage, quota); then we just keep it in memory.
function storage() {
  try {
    const s = window.localStorage;
    const probe = `${KEY}__probe`;
    s.setItem(probe, '1');
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
}

function load(store) {
  if (!store) return defaults();
  try {
    const text = store.getItem(KEY);
    return text ? sanitize(JSON.parse(text)) : defaults();
  } catch {
    return defaults();
  }
}

const store = storage();

export const Save = {
  data: load(store),
  inMemoryOnly: !store,
  testMode: false,

  // Tester mode: play on a throwaway copy with lots of money. Nothing is written to localStorage,
  // so the real save stays untouched. Ends with a page reload.
  beginTestSession(pfandCents) {
    this.testMode = true;
    this.data = sanitize(JSON.parse(JSON.stringify(this.data)));
    this.data.pfandCents = pfandCents;
  },

  persist() {
    if (!store || this.testMode) return false;
    try {
      store.setItem(KEY, JSON.stringify(this.data));
      return true;
    } catch {
      return false;
    }
  },

  addPfand(amountCents) {
    const c = Math.floor(amountCents);
    if (!Number.isFinite(c) || c <= 0) return;
    this.data.pfandCents += c;
    this.persist();
  },

  // Takes up to `amountCents` (never below 0), persists, returns the cents actually taken (Monopoly man).
  takePfand(amountCents) {
    const c = Math.floor(amountCents);
    if (!Number.isFinite(c) || c <= 0) return 0;
    const taken = Math.min(c, this.data.pfandCents);
    if (taken <= 0) return 0;
    this.data.pfandCents -= taken;
    this.persist();
    return taken;
  },

  spend(amountCents) {
    const c = Math.floor(amountCents);
    if (!Number.isFinite(c) || c < 0 || c > this.data.pfandCents) return false;
    this.data.pfandCents -= c;
    this.persist();
    return true;
  },

  // Weapons/helmets/gear bought so far (fists and the ticket don't count): drives the price inflation.
  purchaseCount() {
    let n = 0;
    for (const id of this.data.unlocked) {
      if (isItem(id) && !WEAPONS[id].combo && PRICING.inflatedSlots.includes(WEAPONS[id].slot)) n++; // combos aren't bought
    }
    return n;
  },

  // Current price in cents: base * (1 + perPurchase)^purchases, rounded to roundCents, then * priceMul (Alnatura).
  // The ticket and other non-inflated slots keep base * priceMul.
  price(id, priceMul = 1) {
    if (!isItem(id)) return 0;
    const w = WEAPONS[id];
    if (!PRICING.inflatedSlots.includes(w.slot)) return Math.round(w.price * priceMul);
    const r = PRICING.roundCents;
    const inflated = Math.round((w.price * (1 + PRICING.perPurchase) ** this.purchaseCount()) / r) * r;
    return Math.round(inflated * priceMul);
  },

  isUnlocked(id) {
    return this.data.unlocked.includes(id);
  },

  unlock(id) {
    if (!isItem(id) || this.isUnlocked(id)) return;
    this.data.unlocked.push(id);
    this.persist();
  },

  isEquipped(id) {
    const eq = this.data.equipped;
    return eq.helmet === id || eq.gear === id || eq.weapons.includes(id);
  },

  // Would equipping `id` fit without removing something? (A helmet / gear always fits: it swaps.)
  hasFreeSlot(id) {
    if (!isItem(id)) return false;
    const slot = WEAPONS[id].slot;
    if (slot === 'helmet') return this.data.equipped.helmet === null;
    if (slot === 'gear') return this.data.equipped.gear === null;
    return slot === 'weapon' && this.data.equipped.weapons.length < LOADOUT.maxWeapons;
  },

  // Returns 'ok', 'full' (all weapon slots taken), 'locked' (not owned) or 'invalid' (unknown id / fists).
  // A second helmet / gear item replaces the current one.
  equip(id) {
    if (!isItem(id)) return 'invalid';
    if (!this.isUnlocked(id)) return 'locked';
    const eq = this.data.equipped;
    const slot = WEAPONS[id].slot;
    if (slot === 'helmet') {
      eq.helmet = id;
    } else if (slot === 'gear') {
      eq.gear = id;
    } else if (slot === 'weapon') {
      if (!eq.weapons.includes(id)) {
        if (eq.weapons.length >= LOADOUT.maxWeapons) return 'full';
        eq.weapons.push(id);
      }
    } else {
      return 'invalid';
    }
    this.persist();
    return 'ok';
  },

  unequip(id) {
    const eq = this.data.equipped;
    if (eq.helmet === id) eq.helmet = null;
    if (eq.gear === id) eq.gear = null;
    const i = eq.weapons.indexOf(id);
    if (i >= 0) eq.weapons.splice(i, 1);
    this.persist();
  },

  // Equip one crew member (free) or none (null).
  setChampion(id) {
    this.data.champion = typeof id === 'string' && Object.prototype.hasOwnProperty.call(CHAMPIONS, id) ? id : null;
    this.persist();
  },

  // ?debug: own every weapon/helmet/gear for testing. Switches to test mode first so the real save is never
  // written with it (the rest of the session isn't saved; reload to get back to normal).
  unlockAllForTest() {
    if (!this.testMode) this.beginTestSession(this.data.pfandCents);
    for (const id of Object.keys(WEAPONS)) {
      if (WEAPONS[id].slot !== 'ticket' && !this.data.unlocked.includes(id)) this.data.unlocked.push(id);
    }
  },

  
  comboProgress(id) {
    return this.data.combos.progress[id] || 0;
  },

  addComboKill(id) {
    const n = this.comboProgress(id) + 1;
    this.data.combos.progress[id] = n;
    return n;
  },

  isComboDiscovered(id) {
    return this.data.combos.discovered.includes(id) || this.isUnlocked(id);
  },

  discoverCombo(id) {
    if (this.data.combos.discovered.includes(id)) return;
    this.data.combos.discovered.push(id);
    this.persist();
  },

  // Pause menu settings (zoom, minimap): saved right away.
  setSetting(key, value) {
    this.data.settings[key] = value;
    this.persist();
  },

  setPlayerName(name) {
    this.data.playerName = cleanName(name);
    this.persist();
  },

  // Wipes progress (debug / "new game").
  reset() {
    this.data = defaults();
    this.persist();
  },
};

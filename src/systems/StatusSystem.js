import { BEERS, JOINT, PROMILLE } from '../data/beers.js';
import { DRINKS } from '../data/drinks.js';
import { PLAYER } from '../data/config.js';
import { sfx } from '../audio/Sfx.js';

// Temporary buffs/debuffs from beer + the joint, and the Promille level.
// Only the LAST beer counts: a new beer replaces any previous beer effect (balance, playtest feedback).
// The joint and Eimer drinks (Mexikaner) are separate effects and stack with the current beer.
export class StatusSystem {
  constructor() {
    this.effects = new Map(); // beerId | 'joint' -> { effect, magnitude, remaining, duration, bad }
    this.promille = 0;
    this.mods = { damageMul: 1, cooldownMul: 1, speedMul: 1, armor: 0, fireBreath: false, maxHp: 0, regen: 0 };
    this.promilleCap = 1; // fraction of PROMILLE.max Promille can reach (Taktisches Zwi-Wa)
  }

  drink(beerId) {
    const b = BEERS[beerId];
    sfx.play(b.magnitude < 0 ? 'beer_bad' : 'beer_good');
    this.promille = Math.min(PROMILLE.max * this.promilleCap, this.promille + b.promille);
    for (const id of this.effects.keys()) if (BEERS[id]) this.effects.delete(id);
    if (b.duration > 0) {
      this.effects.set(beerId, {
        effect: b.effect, magnitude: b.magnitude, remaining: b.duration, duration: b.duration, bad: b.magnitude < 0,
      });
    }
  }

  // Eimer drink: its own effect slot, buying it again restarts the timer. Instant drinks (duration 0,
  // e.g. the Brotzeitteller's full heal) are applied by the scene and leave no effect.
  drinkSpecial(drinkId) {
    const d = DRINKS[drinkId];
    if (d) sfx.play('drink_special');
    if (!d || !(d.duration > 0)) return;
    this.effects.set(drinkId, {
      effect: d.effect, magnitude: d.magnitude ?? 1, remaining: d.duration, duration: d.duration, bad: false,
    });
  }

  smoke() {
    sfx.play('joint_dicht');
    this.effects.set('joint', { effect: 'joint', magnitude: 1, remaining: JOINT.duration, duration: JOINT.duration, bad: false });
  }

  get dicht() {
    return this.effects.has('joint');
  }

  // 0 = sober, 1 = the 20 ‰ limit.
  get drunkenness() {
    return this.promille / PROMILLE.max;
  }

  // extraArmor / extraSpeed: permanent bonuses from helmet + gear (WeaponSystem.armor / speedBonus).
  update(dt, extraArmor = 0, extraSpeed = 0) {
    this.promille = Math.max(0, this.promille - PROMILLE.decayPerSecond * dt);
    let damage = 0;
    let speed = extraSpeed;
    let attackSpeed = 0;
    let armor = extraArmor;
    let fireBreath = false;
    let maxHp = 0;
    let regen = 0; // HP per second (Brotzeitteller)
    let cap = 1;
    let drinkDamage = 1; // Eimer drinks multiply on top of everything else (beer + joint)
    let drinkCooldown = 1;
    for (const [id, e] of this.effects) {
      e.remaining -= dt;
      if (e.remaining <= 0) {
        this.effects.delete(id);
        continue;
      }
      if (e.effect === 'damage') damage += e.magnitude;
      else if (e.effect === 'speed') speed += e.magnitude;
      else if (e.effect === 'attackSpeed') attackSpeed += e.magnitude;
      else if (e.effect === 'armor') armor += e.magnitude;
      else if (e.effect === 'fireBreath') fireBreath = true;
      else if (e.effect === 'maxHp') maxHp = Math.max(maxHp, e.magnitude);
      else if (e.effect === 'regen') regen += e.magnitude;
      else if (e.effect === 'promilleCap') cap = Math.min(cap, e.magnitude);
      else if (e.effect === 'damageMul') drinkDamage *= e.magnitude;
      else if (e.effect === 'cooldownMul') drinkCooldown *= e.magnitude;
      else if (e.effect === 'joint') {
        speed += JOINT.speed;
        attackSpeed += JOINT.attackSpeed;
      }
    }
    const m = this.mods;
    m.damageMul = Math.max(0.2, 1 + damage) * (this.dicht ? JOINT.damageFactor : 1) * drinkDamage;
    m.speedMul = Math.max(0.3, 1 + speed);
    // +25% attack speed = cooldowns / 1.25; -25% = cooldowns * 1.25.
    m.cooldownMul = ((attackSpeed >= 0 ? 1 / (1 + attackSpeed) : 1 - attackSpeed) / PLAYER.attackSpeed) * drinkCooldown;
    m.armor = Math.min(0.9, Math.max(0, armor));
    m.fireBreath = fireBreath;
    m.maxHp = maxHp; // 0 = normal
    m.regen = regen;
    this.promilleCap = cap;
    this.promille = Math.min(this.promille, PROMILLE.max * cap);
    return m;
  }
}

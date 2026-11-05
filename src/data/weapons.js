

export const WEAPONS = {
  fists: {
    name: 'Fäuste', desc: 'Immer dabei.', price: 0, slot: 'always',
    sprite: 'fist', cooldown: 0.45, damage: 12, range: 55, knockback: 280, knockbackTime: 0.12,
  },
  metzgerbeil: {
    name: 'Metzgerbeil', desc: 'Breiter Hieb, trifft mehrere.', price: 240, slot: 'weapon',
    sprite: 'weapon_metzgerbeil', cooldown: 1.1, damage: 30, range: 95, arcDeg: 120, knockback: 220, knockbackTime: 0.15,
  },
  ninja_stars: {
    name: 'Ninja Stars', desc: 'Schnelle Wurfsterne.', price: 480, slot: 'weapon',
    sprite: 'ninja_star', cooldown: 0.35, damage: 8, range: 420, speed: 650, knockback: 60, knockbackTime: 0.04,
    hitRadius: 6, // px around the shot's centre (all Shooter weapons)
  },
  mjolnir: {
    name: 'Mjölnir', desc: 'Kettenblitz. Kein Wurfhammer.', price: 960, slot: 'weapon',
    sprite: 'weapon_mjolnir', cooldown: 2.2, damage: 18, range: 320, chains: 4, chainRange: 170,
    knockback: 0, knockbackTime: 0.12, // no push, just a short stun
  },
  doener_spiess: {
    name: 'Dönerspieß', desc: 'Der ganze Spieß. Rotierend.', price: 1280, slot: 'weapon',
    sprite: 'weapon_doener', cooldown: 3.5, damage: 14, hitInterval: 0.15, speed: 260, duration: 2.5, radius: 40,
    knockback: 140, knockbackTime: 0.06, spinDegPerSec: 900,
  },
  eimer: {
    name: 'EIMER', desc: '„Der Eimer.“', price: 2400, slot: 'weapon',
    sprite: 'weapon_eimer', cooldown: 2.6, damage: 110, range: 185, arcDeg: 200, knockback: 950, knockbackTime: 0.4, shake: 0.022, shakeMs: 240, // big oomph
    landmark: 'eimer', landmarkAnim: 'nobucket', // equipped: the bucket on the Eimer pub is gone
  },
  // The goal of the game: buying it ends the game with the victory screen.
  summer_breeze_ticket: {
    name: 'SUMMER BREEZE TICKET', desc: 'Das Ziel. Dinkelsbühl wartet.', price: 26997, slot: 'ticket',
    sprite: 'ticket_summer_breeze',
  },
  helmet_accurate: {
    name: 'Historically Accurate Viking Helmet™', desc: 'Keine Hörner. 15% weniger Schaden.', price: 640, slot: 'helmet',
    sprite: 'helmet_accurate', armor: 0.15,
  },
  helmet_horned: {
    name: 'Wikingerhelm mit Hörnern', desc: 'Historisch falsch. Wer dich berührt, kriegt Schaden.', price: 720, slot: 'helmet',
    sprite: 'helmet_horned', contactDamage: 12, contactInterval: 0.4, knockback: 200, knockbackTime: 0.1,
  },

  
  
  bogen: {
    name: 'Bogen', desc: 'Pfeile, die durch einen durchgehen.', price: 320, slot: 'weapon',
    sprite: 'weapon_bogen', projectile: 'arrow', orient: true,
    cooldown: 0.8, damage: 10, range: 500, speed: 700, pierce: 1, knockback: 120, knockbackTime: 0.06, hitRadius: 6,
  },
  samurai_schwert: {
    name: 'Samurai-Schwert', desc: 'Schnell und scharf. Kleiner Bogen.', price: 400, slot: 'weapon',
    sprite: 'weapon_samurai_schwert', fx: 'fx_katana_slash', held: 'held_katana', heldSwingSeconds: 0.12,
    cooldown: 0.5, damage: 14, range: 80, arcDeg: 90, knockback: 160, knockbackTime: 0.08,
  },
  bumerang: {
    name: 'Bumerang', desc: 'Fliegt hin und zurück. Durch alle durch.', price: 550, slot: 'weapon',
    sprite: 'weapon_bumerang', projectile: 'proj_bumerang',
    cooldown: 1.6, damage: 12, range: 260, outSeconds: 0.55, returnSpeed: 520, radius: 18,
    hitInterval: 0.3, // the same enemy can be hit again on the way back
    knockback: 120, knockbackTime: 0.08, spinDegPerSec: 1080,
    catchRadius: 20, // px: back at Lars = caught
    maxReturnSeconds: 4, // safety net if it can never catch up
    poolMax: 8, // worst case in flight: (outSeconds + maxReturnSeconds) / fastest buffed cooldown (~0.9 s) = 5
  },
  pfeffi: {
    name: 'Pfeffi', desc: 'Pfefferminzschnaps. Die Wolke bleibt.', price: 650, slot: 'weapon',
    sprite: 'weapon_pfeffi', projectile: 'pfeffi_bottle', fx: 'fx_mint_cloud',
    cooldown: 3.5, range: 300, flightSeconds: 0.6, arcHeight: 80,
    cloudSeconds: 3, tickSeconds: 0.25, tickDamage: 6, radius: 70, maxClouds: 4,
    cloudYSquash: 0.6, // the cloud is an ellipse on the ground: vertical radius = radius * this
  },
  ruder: {
    name: 'Ruder', desc: 'Langer Hebel, großer Schubs.', price: 750, slot: 'weapon',
    sprite: 'weapon_ruder', fx: 'fx_oar_whack',
    cooldown: 1.4, damage: 26, range: 160, width: 40, knockback: 700, knockbackTime: 0.3,
  },
  mercedes_sterne: {
    name: 'Mercedes-Sterne', desc: 'Wie Ninja Stars, nur mit Stern. Gehen durch zwei durch.', price: 900, slot: 'weapon',
    sprite: 'weapon_mercedes_sterne', projectile: 'mercedes_star',
    cooldown: 0.45, damage: 14, range: 420, speed: 650, pierce: 2, knockback: 70, knockbackTime: 0.04, hitRadius: 6,
  },
  zauberstab: {
    name: 'Zauberstab', desc: 'Magische Geschosse, die selbst zielen.', price: 1100, slot: 'weapon',
    sprite: 'weapon_zauberstab', projectile: 'magic_missile',
    cooldown: 1.0, damage: 12, count: 2, range: 380, speed: 360, turnDegPerSec: 420, lifeSeconds: 2.2,
    spreadDeg: 50, // the volley fans out, then each missile curves to its target
    hitRadius: 7, retargetRange: 260, // a missile whose target died looks for a new one this far around itself
    knockback: 80, knockbackTime: 0.06,
  },
  kettensaege: {
    name: 'Kettensäge', desc: 'Dauerfeuer aus nächster Nähe. Bremst alles.', price: 1200, slot: 'weapon',
    sprite: 'weapon_kettensaege', fx: 'fx_chainsaw',
    hitInterval: 0.1, damage: 6, range: 60, arcDeg: 70,
    slowFactor: 0.35, slowSeconds: 0.15, // shredded enemies keep walking at 35% speed (bosses ignore it)
  },
  claymore: {
    name: 'Claymore', desc: 'Minen legen. Nicht drauftreten. Also du nicht.', price: 1400, slot: 'weapon',
    sprite: 'weapon_claymore', projectile: 'claymore_mine', fx: 'fx_explosion',
    cooldown: 3, range: 250, maxMines: 4, armSeconds: 1, fuseSeconds: 4, triggerRadius: 22, // only drops mines with enemies in range
    damage: 80, radius: 90, knockback: 500, knockbackTime: 0.25, shake: 0.006, shakeMs: 120,
  },
  feuerwand: {
    name: 'Feuerwand', desc: 'Eine Wand aus Feuer. Neue ersetzt die alte.', price: 1600, slot: 'weapon',
    sprite: 'weapon_feuerwand', fx: 'fx_firewall',
    cooldown: 9, range: 320, distance: 90, length: 160, thickness: 28, duration: 8,
    dps: 10, tickSeconds: 0.25, burnDps: 6, burnSeconds: 2,
  },
  harley_benton: {
    name: 'Harley Benton', desc: 'Eine Axt.', price: 1800, slot: 'weapon',
    sprite: 'weapon_harley_benton', fx: 'fx_guitar_chop', held: 'held_harley_benton', heldSwingSeconds: 0.18,
    cooldown: 1.8, damage: 70, range: 140, arcDeg: 180, knockback: 600, knockbackTime: 0.25, shake: 0.008, shakeMs: 120,
  },
  minigun: {
    name: 'Minigun', desc: 'Brrrrrrt.', price: 2800, slot: 'weapon',
    sprite: 'weapon_minigun', projectile: 'bullet', muzzle: 'fx_muzzle', orient: true,
    held: 'held_minigun', heldHideSeconds: 0.4, // shown while firing; bullets leave from its meta.tip
    cooldown: 0.08, damage: 4, range: 450, speed: 950, spreadDeg: 10, knockback: 30, knockbackTime: 0.03, hitRadius: 6,
  },
  lichtschwert: {
    name: 'Lichtschwert', desc: 'Das Samurai-Schwert, aber aus Licht.', price: 4500, slot: 'weapon',
    sprite: 'weapon_lichtschwert', fx: 'fx_saber_slash', glow: true,
    cooldown: 0.6, damage: 40, range: 100, arcDeg: 140, knockback: 260, knockbackTime: 0.12,
  },

  // ---- Gear: one slot, next to the helmet.
  wikingerschild: {
    name: 'Wikingerschild', desc: '20% weniger Schaden.', price: 800, slot: 'gear',
    sprite: 'gear_wikingerschild', armor: 0.2, worn: 'worn_wikingerschild', // anims front / back
  },
  skateboard: {
    name: 'Skateboard', desc: '25% schneller unterwegs.', price: 600, slot: 'gear',
    sprite: 'gear_skateboard', under: 'skateboard_under', speed: 0.25,
  },

  
  
  combo_firestorm: {
    name: 'Firestorm', desc: 'Combo: Dönerspieß + Feuerwand. Brennende Spieße, quer durch alles.', price: 0, slot: 'weapon',
    combo: true, sprite: 'combo_firestorm', projectile: 'proj_firestorm', fallback: 'weapon_doener', sfx: 'weapon_doener',
    orient: true, cooldown: 1.6, damage: 32, range: 560, speed: 480, pierce: 60, hitRadius: 22,
    knockback: 120, knockbackTime: 0.06, burnDps: 12, burnSeconds: 3,
    trailFx: 'fx_flame', trailEvery: 40, trailSeconds: 1.2, trailRadius: 26, trailDps: 10, trailTick: 0.25, trailMax: 48,
  },
  combo_pfeffi_eimer: {
    name: 'Pfeffi-Eimer', desc: 'Combo: Pfeffi + EIMER. Wo der Eimer war, hängt die Wolke.', price: 0, slot: 'weapon',
    combo: true, sprite: 'combo_pfeffi_eimer', sfx: 'weapon_eimer',
    cooldown: 2.4, damage: 120, range: 190, arcDeg: 200, knockback: 900, knockbackTime: 0.4, shake: 0.022, shakeMs: 240,
    landmark: 'eimer', landmarkAnim: 'nobucket',
    clouds: 3, cloudDist: 0.65, // clouds per swing, spread over the arc at this fraction of the range
    fx: 'fx_mint_cloud', cloudSeconds: 4, tickSeconds: 0.25, tickDamage: 8, radius: 75, maxClouds: 9, cloudYSquash: 0.6,
  },
  combo_shuriken_sturm: {
    name: 'Shuriken-Sturm', desc: 'Combo: Ninja Stars + Mercedes-Sterne. In alle acht Richtungen.', price: 0, slot: 'weapon',
    combo: true, sprite: 'combo_shuriken_sturm', projectile: 'ninja_star', sfx: 'ninja_star',
    directions: 8, cooldown: 0.4, damage: 14, range: 440, speed: 680, pierce: 99, knockback: 60, knockbackTime: 0.04, hitRadius: 7,
  },
  combo_doppelklinge: {
    name: 'Doppelklinge', desc: 'Combo: Samurai-Schwert + Lichtschwert. Rundum.', price: 0, slot: 'weapon',
    combo: true, sprite: 'combo_doppelklinge', fx: 'fx_saber_slash', glow: true, sfx: 'weapon_lichtschwert',
    cooldown: 0.55, damage: 48, range: 115, arcDeg: 360, knockback: 260, knockbackTime: 0.12,
  },
  combo_minenwerfer: {
    name: 'Minenwerfer', desc: 'Combo: Claymore + Minigun. Minen direkt in die Menge.', price: 0, slot: 'weapon',
    combo: true, sprite: 'combo_minenwerfer', projectile: 'claymore_mine', fx: 'fx_explosion', sfx: 'weapon_claymore',
    cooldown: 1.1, range: 460, maxMines: 6, armSeconds: 0, fuseSeconds: 1, triggerRadius: 30,
    damage: 110, radius: 110, knockback: 500, knockbackTime: 0.25, shake: 0.007, shakeMs: 120,
    flightSeconds: 0.55, arcHeight: 140, crowdRadius: 110, crowdSamples: 24, // aims at the densest of N nearby enemies
  },
  combo_metzgerei_wurf: {
    name: 'Metzgerei Wurf', desc: 'Combo: Metzgerbeil + Bogen. Fliegt hin, kommt zurück, schneidet alles.', price: 0, slot: 'weapon',
    combo: true, sprite: 'combo_metzgerei_wurf', projectile: 'weapon_metzgerbeil', sfx: 'weapon_metzgerbeil',
    cooldown: 0.8, damage: 42, range: 360, outSeconds: 0.4, returnSpeed: 760, radius: 28, hitInterval: 0.25,
    knockback: 200, knockbackTime: 0.1, spinDegPerSec: 1440, catchRadius: 24, maxReturnSeconds: 3, poolMax: 8,
  },
  combo_ollie: {
    name: 'Ollie', desc: 'Combo: Bumerang + Skateboard. Sprung über die Menge, Landung mit Bumerangs.', price: 0, slot: 'weapon',
    combo: true, sprite: 'combo_ollie', projectile: 'proj_bumerang', board: 'skateboard_under', sfx: 'weapon_bumerang',
    cooldown: 3, range: 300, airSeconds: 0.65, jumpHeight: 70, // invulnerable while in the air
    landRadius: 90, landDamage: 25, landKnockback: 400, landKnockbackTime: 0.15, burst: 8,
    // the landing boomerangs (Bumerang stats)
    damage: 22, outSeconds: 0.5, returnSpeed: 560, radius: 20, hitInterval: 0.3, knockback: 140, knockbackTime: 0.08,
    spinDegPerSec: 1080, catchRadius: 24, maxReturnSeconds: 4, poolMax: 24, boomRange: 240,
  },
  combo_pyro_show: {
    name: 'Pyro-Show', desc: 'Combo: Harley Benton + Feuerwand. Jeder Anschlag mit Feuersäulen.', price: 0, slot: 'weapon',
    combo: true, sprite: 'combo_pyro_show', fx: 'fx_guitar_chop', held: 'held_harley_benton', heldSwingSeconds: 0.18,
    sfx: 'weapon_harley_benton',
    cooldown: 1.6, damage: 75, range: 140, arcDeg: 180, knockback: 600, knockbackTime: 0.25, shake: 0.008, shakeMs: 120,
    jetFx: 'fx_flame', jets: 3, jetDist: 0.8, jetRadius: 48, jetDamage: 40, jetSeconds: 0.45, burnDps: 12, burnSeconds: 3,
    finaleEvery: 4, finaleJets: 10, finaleRadius: 150, finaleDamage: 80, finaleShake: 0.016, finaleShakeMs: 300,
  },
  combo_wikinger_metal: {
    name: 'Wikinger Metal', desc: 'Combo: Harley Benton + Mjölnir. Power Chord, der von Gegner zu Gegner springt.', price: 0,
    slot: 'weapon', combo: true, sprite: 'combo_wikinger_metal', fx: 'fx_guitar_chop', held: 'held_harley_benton',
    heldSwingSeconds: 0.18, sfx: 'weapon_harley_benton',
    cooldown: 1.6, damage: 75, range: 140, arcDeg: 180, knockback: 600, knockbackTime: 0.25, shake: 0.008, shakeMs: 120,
    chordRange: 380, chains: 6, chainRange: 210, chainDamage: 40, // the soundwave chain (Mjölnir rules)
    waveRadius: 170, waveSeconds: 0.35, // the ring around Lars on every chord (visual)
  },
};

// VS-style mild inflation: every weapon / helmet / gear bought makes all other weapons, helmets and gear
// `perPurchase` dearer (compounding). The ticket (slot 'ticket') is never affected.
// Helmets count on purpose (owner: you can't wear many at once anyway, so buying both is a real choice).
// The count is simply the owned items in the save (Save.purchaseCount), so old saves inflate right away.
export const PRICING = {
  perPurchase: 0.03,
  roundCents: 10,
  inflatedSlots: ['weapon', 'helmet', 'gear'],
};

// Weapons drawn on the hero (HeldWeapon / Gear). x in art px from the body's centre line (toward the facing side),
// y as a fraction of the body height above the feet, so it fits every playable hero's body.
export const HELD = {
  hand: { x: 6, y: 0.42 }, // where held weapons are gripped
  worn: { x: 5, y: 0.45 }, // shield: front view on the arm (facing side); back view centred on the back (x ignored)
  swingVisibleAfter: 0.06, // seconds the held weapon stays at the end of a swing
};

export const LOADOUT = {
  maxWeapons: 3, // besides the fists, which are always on
};

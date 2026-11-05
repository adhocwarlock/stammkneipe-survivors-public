




export const BEERS = {
  stoertebeker: { name: 'Störtebeker', sprite: 'beer_stoertebeker', pfandCents: 8, promille: 0.6, weight: 10,
    effect: 'damage', magnitude: 0.6, duration: 30, label: 'SCHADEN +60%' },
  augustiner: { name: 'Augustiner', sprite: 'beer_augustiner', pfandCents: 8, promille: 0.6, weight: 10,
    effect: 'speed', magnitude: 0.4, duration: 30, label: 'TEMPO +40%' },
  tannenzaepfle: { name: 'Tannenzäpfle', sprite: 'beer_tannenzaepfle', pfandCents: 8, promille: 0.5, weight: 10,
    effect: 'attackSpeed', magnitude: 0.5, duration: 30, label: 'ANGRIFFSTEMPO +50%' },
  rothaus: { name: 'Rothaus', sprite: 'beer_rothaus', pfandCents: 8, promille: 0.6, weight: 10,
    effect: 'crewCooldown', magnitude: 20, duration: 0, label: 'CREW −20 s' }, // was +50 HP; healing is the Ibu now
  erdinger: { name: 'Erdinger', sprite: 'beer_erdinger', pfandCents: 8, promille: 0.7, weight: 8,
    effect: 'armor', magnitude: 0.6, duration: 30, label: 'RÜSTUNG +60%' },
  freiburger: { name: 'Freiburger Pilsner', sprite: 'beer_freiburger', pfandCents: 8, promille: 0.6, weight: 8,
    effect: 'speed', magnitude: -0.2, duration: 20, label: 'TEMPO −20%', popup: 'FREIBURGER PILSNER...' }, // halved (owner)
  oettinger: { name: 'Oettinger', sprite: 'beer_oettinger', pfandCents: 8, promille: 0.6, weight: 8,
    effect: 'attackSpeed', magnitude: -0.5, duration: 20, label: 'ANGRIFFSTEMPO −50%' },
  turmbraeu: { name: 'Turmbräu', sprite: 'beer_turmbraeu', pfandCents: 8, promille: 0.6, weight: 8,
    effect: 'damage', magnitude: -0.5, duration: 20, label: 'SCHADEN −50%' },
  fuenfnull: { name: '5,0 Original', sprite: 'beer_fuenfnull', pfandCents: 25, promille: 0.8, weight: 6,
    effect: 'damage', magnitude: -0.6, duration: 20, label: 'SCHADEN −60%  ·  PFAND €0.25' },
};

export const JOINT = {
  sprite: 'joint',
  beerDropsPerJoint: 50, // after every 50 dropped beers, one joint drops (halved again: owner round 2)
  duration: 25,
  damageFactor: 2, // dicht = your damage ×2, multiplied on top of everything else
  speed: 0.8,
  attackSpeed: 1.0,
  title: 'DÜBEL!!',
  label: 'SCHADEN ×2  ·  TEMPO +80%  ·  ANGRIFF +100%',
};

// Ibuprofen capsule: dropped by slain monsters (own roll, on top of the beer drop). The only HP pickup.
// Heals as much as the Rothaus used to (+50) but drops 2x as often (Rothaus was 0.3 x 10/78 per kill = 3.85%).
export const IBU = {
  sprite: 'ibu',
  heal: 50,
  dropChance: 0.077, // per kill
  title: 'IBU!!',
  label: '+50 HP',
};

export const PROMILLE = {
  
  
  decayPerSecond: 0.02,
  max: 20,
  // Movement inertia = time (s) the body takes to catch up with the input. Sober: nearly instant.
  inertiaSober: 0.055,
  inertiaPerPromille: 0.065, // extra inertia per ‰ (2 ‰ ≈ same feel as before; 20 ‰ = extremely slippery)
};

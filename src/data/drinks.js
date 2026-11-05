

export const DRINKS = {
  mexikaner: {
    name: 'Mexikaner', desc: 'Scharfer Schnaps. 60 s Feueratem statt Fäusten, zündet Gegner an.',
    price: 200, duration: 60, sprite: 'drink_mexikaner', effect: 'fireBreath',
    popup: 'MEXIKANER!!', label: 'FEUERATEM 60 s',
  },
  // effect 'maxHp': max HP becomes `magnitude` while it lasts (current HP scales with it); the bigger one wins.
  jackie_cola: {
    name: 'Jackie Cola', desc: '5 Minuten: max. HP 200.', price: 300, duration: 300, sprite: 'drink_jackie_cola',
    effect: 'maxHp', magnitude: 200, popup: 'JACKIE COLA!!', label: 'MAX HP 200 · 5 MIN',
  },
  long_eimer_ice_tea: {
    name: 'Long Eimer Ice Tea', desc: '5 Minuten: max. HP 500.', price: 600, duration: 300,
    sprite: 'drink_long_eimer_ice_tea', effect: 'maxHp', magnitude: 500, popup: 'LONG EIMER ICE TEA!!',
    label: 'MAX HP 500 · 5 MIN',
  },
  // effect 'promilleCap': Promille can only reach `magnitude` x PROMILLE.max while it lasts.
  taktisches_zwiwa: {
    name: 'Taktisches Zwi-Wa', desc: '5 Minuten: Promille max. 10%.', price: 250, duration: 300,
    sprite: 'drink_taktisches_zwiwa', effect: 'promilleCap', magnitude: 0.1, popup: 'TAKTISCHES ZWI-WA!!',
    label: 'PROMILLE MAX 10% · 5 MIN',
  },
  // effect 'damageMul' / 'cooldownMul': multiplies Lars' weapon damage / cooldowns (fists, fire breath and
  // bought weapons; not the crew). Multiplies on top of beers and the joint; one instance per drink.
  radler: {
    name: 'Radler', desc: '5 Minuten: doppelter Schaden.', price: 400, duration: 300, sprite: 'drink_radler',
    effect: 'damageMul', magnitude: 2, popup: 'RADLER!!', label: 'SCHADEN ×2',
  },
  berliner_luft: {
    name: 'Berliner Luft', desc: '5 Minuten: doppeltes Angriffstempo.', price: 500, duration: 300,
    sprite: 'drink_berliner_luft', effect: 'cooldownMul', magnitude: 0.5, popup: 'BERLINER LUFT!!', label: 'TEMPO ×2',
  },
  // 'regen': magnitude = HP per second while it lasts (0.5 = 1 HP every 2 s). Was an instant full heal
  // (duration 0, 'fullHeal' still works) until Ibu drops made that redundant.
  brotzeitteller: {
    name: 'Brotzeitteller', desc: 'Roggenbrot und Jagdwurst. 5 Minuten: 1 HP alle 2 Sekunden.', price: 150, duration: 300,
    sprite: 'food_brotzeitteller', effect: 'regen', magnitude: 0.5, popup: 'BROTZEIT!!', label: '+1 HP / 2 s',
  },
};

// The Mexikaner's fire breath: a short cone like the Metzgerbeil sweep, weaker, but it sets enemies burning.
export const FIRE_BREATH = {
  fx: 'fx_firebreath',
  cooldown: 0.5,
  damage: 9,
  range: 115,
  arcDeg: 70,
  knockback: 60,
  knockbackTime: 0.05,
  burnDps: 10,
  burnSeconds: 3,
  mouthY: 72, // px above Lars' feet where the cone starts (the photo head's mouth)
};

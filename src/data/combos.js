


export const COMBO = {
  kills: 100,
  banner: 'COMBO!! {name}',
  bannerSeconds: 3,
  shake: 0.012,
  shakeMs: 400,
  persistEvery: 10, // save the progress every N counted kills (and on unlock / run end)
};

// id = the combo weapon's id in WEAPONS. partner may be a weapon, helmet or gear item.
export const COMBOS = {
  combo_firestorm: { base: 'doener_spiess', partner: 'feuerwand' },
  combo_pfeffi_eimer: { base: 'pfeffi', partner: 'eimer' },
  combo_shuriken_sturm: { base: 'ninja_stars', partner: 'mercedes_sterne' },
  combo_doppelklinge: { base: 'samurai_schwert', partner: 'lichtschwert' },
  combo_minenwerfer: { base: 'claymore', partner: 'minigun' },
  combo_metzgerei_wurf: { base: 'metzgerbeil', partner: 'bogen' },
  combo_ollie: { base: 'bumerang', partner: 'skateboard' },
  combo_pyro_show: { base: 'harley_benton', partner: 'feuerwand' },
  combo_wikinger_metal: { base: 'harley_benton', partner: 'mjolnir' },
};

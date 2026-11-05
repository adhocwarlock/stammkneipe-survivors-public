// Street shops. Walk into the door from below to open the shop menu (game pauses).
// Prices: WEAPONS[id].price, +3% per weapon/helmet/gear already bought (PRICING in data/weapons.js), then * priceMul.
// Every shop sells every weapon, helmet and gear item (owner decision 2026-10-03); Alnatura costs x2,
// the 24/7 shop at the Hauptbahnhof x4 (double Alnatura, and not even bio).
const ALL = ['summer_breeze_ticket', 'helmet_accurate', 'helmet_horned', 'wikingerschild', 'skateboard',
  'metzgerbeil', 'ninja_stars', 'mjolnir', 'doener_spiess', 'eimer', 'bogen', 'samurai_schwert', 'bumerang', 'pfeffi',
  'ruder', 'mercedes_sterne', 'zauberstab', 'kettensaege', 'claymore', 'feuerwand', 'harley_benton', 'minigun', 'lichtschwert'];

export const SHOPS = {
  dm: {
    name: 'dm', greeting: 'Hier bin ich Mensch, hier kauf ich ein.', priceMul: 1,
    items: ALL,
  },
  lidl: {
    name: 'LIDL', greeting: 'Lidl lohnt sich.', priceMul: 1,
    items: ALL,
  },
  aldi: {
    name: 'ALDI SÜD', greeting: 'Einfach ist mehr.', priceMul: 1,
    items: ALL,
  },
  alnatura: {
    name: 'Alnatura', greeting: 'Sinnvoll für Mensch und Erde. Und teuer.', priceMul: 2, bio: true,
    items: ALL,
  },
  // Door: meta.shopDoors of the hauptbahnhof sprite (left of the main hall).
  hbf_kiosk: {
    name: '24/7 HBF', greeting: 'Rund um die Uhr offen. Rund um die Uhr teuer. Bio? Nee.', priceMul: 4,
    items: ALL,
  },
};

// ?debug key U: everything, at normal prices (only reachable in debug / tester mode, no door has this id).
export const DEBUG_SHOP = {
  name: 'ALLES', greeting: 'Debug-Laden. Alles freigeschaltet, nichts wird gespeichert.', priceMul: 1,
  items: null, // = every weapon, helmet and gear item in WEAPONS (filled in by ShopMenu.getShop)
};

// Special shops behind other door ids. The Eimer (pub): GETRÄNKE (data/drinks.js) + CREW (data/champions.js).
export const SPECIAL_SHOPS = {
  eimer: {
    name: 'EIMER', greeting: 'Na, {name}? Ein Mexikaner geht immer. Und deine Leute sitzen hinten.',
  },
};

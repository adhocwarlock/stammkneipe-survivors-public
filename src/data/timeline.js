










export const TIMELINE = [
  // ---- Chapter 1 "Feierabend": skeletons, zombies, goblins
  { at: 0, cap: [12, 20], every: [3.5, 2.6], batch: 1, w: { skeleton: 3, zombie: 0.3 } },
  { at: 1, cap: [20, 30], every: [2.6, 2.0], batch: 1, w: { skeleton: 3, zombie: 0.6, goblin: 0.5 } },
  { at: 2, cap: [30, 42], every: [2.0, 1.6], batch: 2, w: { skeleton: 3, zombie: 1.2, goblin: 1.5, monopoly_man: 0.05 },
    min: { skeleton: 4 } },
  { at: 3, cap: [42, 55], every: [1.6, 1.3], batch: 2, w: { skeleton: 3, zombie: 1.2, goblin: 3, monopoly_man: 0.05 },
    min: { zombie: 5 } },
  { at: 4, cap: [55, 70], every: [1.3, 1.1], batch: 2,
    w: { skeleton: 3, zombie: 1.2, goblin: 6, ogre: 0.3, monopoly_man: 0.05 }, min: { goblin: 6 }, arrive: { ogre: 1 } },

  // ---- Chapter 2 "Altstadt": dip, then ninjas + werewolves; skeletons/zombies retire
  { at: 5, cap: [40, 50], every: [1.6, 1.3], batch: 2,
    w: { skeleton: 1, zombie: 0.6, goblin: 6, ogre: 1, ninja: 1, monopoly_man: 0.05 } },
  { at: 6, cap: [50, 70], every: [1.3, 1.0], batch: 2,
    w: { skeleton: 0.5, zombie: 0.6, goblin: 6, ogre: 2, ninja: 2, monopoly_man: 0.05 } },
  { at: 7, cap: [70, 85], every: [1.0, 0.9], batch: 3,
    w: { zombie: 0.6, goblin: 6, ogre: 3, ninja: 3, werewolf: 1, clay_golem: 0.1, monopoly_man: 0.05 }, min: { ogre: 2 } },
  { at: 8, cap: [85, 100], every: [0.9, 0.8], batch: 3,
    w: { goblin: 4, ogre: 3, ninja: 5, werewolf: 2, clay_golem: 0.1, monopoly_man: 0.05 } },
  { at: 9, cap: [100, 115], every: [0.8, 0.7], batch: 3,
    w: { goblin: 3, ogre: 3, ninja: 6, werewolf: 3, clay_golem: 0.1, knight: 1, necromancer: 0.15, monopoly_man: 0.05 },
    min: { ninja: 6 } },

  // ---- Chapter 3 "Magie": DRAGON!!, wizards, battlemages, horned demons; goblins retire
  { at: 10, cap: [55, 70], every: [1.0, 0.8], batch: 3, arrive: { dragon: 1 },
    w: { ogre: 3, ninja: 3, werewolf: 3, clay_golem: 0.1, knight: 3, necromancer: 0.2, wizard: 1, monopoly_man: 0.05 } },
  { at: 11, cap: [70, 95], every: [0.8, 0.7], batch: 3,
    w: { ogre: 3, ninja: 3, werewolf: 5, clay_golem: 0.1, knight: 3, necromancer: 0.2, wizard: 2, monopoly_man: 0.05 } },
  { at: 12, cap: [95, 115], every: [0.7, 0.6], batch: 3,
    w: { ogre: 3, ninja: 3, werewolf: 6, clay_golem: 0.1, knight: 3, necromancer: 0.2, wizard: 3, battlemage: 1,
      horned_demon: 1, iron_golem: 0.08, monopoly_man: 0.05 }, min: { werewolf: 5 } },
  { at: 13, cap: [115, 130], every: [0.6, 0.55], batch: 3,
    w: { ogre: 2, ninja: 2, werewolf: 6, clay_golem: 0.1, knight: 3, necromancer: 0.2, wizard: 3, battlemage: 3,
      horned_demon: 3, iron_golem: 0.08, monopoly_man: 0.05 } },
  { at: 14, cap: [130, 140], every: [0.55, 0.5], batch: 4,
    w: { ogre: 1, goblin__dark: 3, werewolf: 6, clay_golem: 0.1, knight: 3, necromancer: 0.2, wizard: 3, battlemage: 3,
      horned_demon: 3, iron_golem: 0.08, terminator: 1, dragon: 0.03, monopoly_man: 0.05 } },

  // ---- Chapter 4 "Endzeit": terminators + the early monsters back as tougher recolours
  { at: 15, cap: [75, 95], every: [0.8, 0.6], batch: 3, arrive: { dragon: 1 },
    w: { skeleton__knochenritter: 3, zombie__wasserleiche: 1.2, goblin__dark: 3, ogre__elite: 3, werewolf: 3, knight: 3,
      necromancer: 0.2, wizard: 3, battlemage: 3, horned_demon: 3, iron_golem: 0.08, clay_golem: 0.1, terminator: 3,
      terminator_elite: 1, monopoly_man: 0.05 }, min: { skeleton__knochenritter: 6 } },
  { at: 16, cap: [95, 120], every: [0.6, 0.5], batch: 4,
    w: { skeleton__knochenritter: 3, zombie__wasserleiche: 1.2, goblin__dark: 3, ogre__elite: 3, werewolf: 3, knight: 3,
      necromancer: 0.2, wizard: 3, battlemage: 3, horned_demon: 4, iron_golem: 0.08, clay_golem: 0.1, terminator: 3,
      terminator_elite: 2, dragon: 0.03, monopoly_man: 0.05 } },
  { at: 17, cap: [120, 135], every: [0.5, 0.45], batch: 4,
    w: { skeleton__knochenritter: 3, zombie__wasserleiche: 1.2, goblin__dark: 3, ogre__elite: 3, ninja__shadow: 3,
      werewolf: 3, knight: 3, necromancer: 0.2, wizard: 3, battlemage: 3, horned_demon: 6, iron_golem: 0.08,
      clay_golem: 0.1, terminator: 3, terminator_elite: 3, dragon: 0.03, monopoly_man: 0.05 } },
  { at: 18, cap: [135, 145], every: [0.45, 0.4], batch: 5,
    w: { skeleton__knochenritter: 3, zombie__wasserleiche: 1.2, goblin__dark: 3, ogre__elite: 3, ninja__shadow: 3,
      werewolf: 3, knight: 3, necromancer: 0.2, wizard: 3, battlemage: 3, horned_demon: 6, iron_golem: 0.08,
      clay_golem: 0.1, terminator: 3, terminator_elite: 3, dragon: 0.03, monopoly_man: 0.05 } },
  { at: 19, cap: [145, 150], every: [0.4, 0.35], batch: 5,
    w: { skeleton__knochenritter: 3, zombie__wasserleiche: 1.2, goblin__dark: 3, ogre__elite: 3, ninja__shadow: 3,
      werewolf__blutmond: 3, knight: 3, necromancer: 0.2, wizard: 3, battlemage: 3, horned_demon: 6, iron_golem: 0.08,
      clay_golem: 0.1, terminator: 3, terminator_elite: 3, dragon: 0.03, monopoly_man: 0.05 } },
  // The last row holds forever (ENDLESS creeps it up).
  { at: 20, cap: 150, every: 0.35, batch: 5,
    w: { skeleton__knochenritter: 3, zombie__wasserleiche: 1.2, goblin__dark: 3, ogre__elite: 3, ninja__shadow: 3,
      werewolf__blutmond: 3, knight: 3, necromancer: 0.2, wizard: 3, battlemage: 3, horned_demon: 6, iron_golem: 0.08,
      clay_golem: 0.1, terminator: 3, terminator_elite: 3, dragon: 0.03, monopoly_man: 0.05 } },
];

// After the last row's `at`: slowly more and faster (the run never ends, you just die eventually).
export const ENDLESS = {
  capPerMinute: 3, // up to ENEMY_SPAWN.aliveCap
  intervalShrinkPerMinute: 0.03, // every = last / (1 + minutes * this)
  minInterval: 0.25,
  batchPerMinute: 0.2,
  maxBatch: 8,
};

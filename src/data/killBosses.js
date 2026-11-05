

export const KILL_BOSSES = {
  hintFrom: 0.5, // the HUD progress hint ("Goblins 73/100") only shows from this fraction on
  repeatHpAdd: 0.5, // every repeat of the same boss: +50% HP (on top of the first one's)
  maxHints: 2, // hint lines shown at once (the closest ones)
  list: [
    { family: 'goblin', every: 100, boss: 'goblin__koenig', label: 'Goblins', rewardCents: 150, joint: true },
    { family: 'skeleton', every: 150, boss: 'skeleton__fuerst', label: 'Skeletons', rewardCents: 150 },
    { family: 'zombie', every: 100, boss: 'zombie__opa', label: 'Zombies', rewardCents: 150 },
    { family: 'ninja', every: 60, boss: 'ninja__meister', label: 'Ninjas', rewardCents: 200 },
    { family: 'werewolf', every: 40, boss: 'werewolf__alpha', label: 'Werewolves', rewardCents: 200 },
    { family: 'ogre', every: 25, boss: 'ogre__haeuptling', label: 'Ogres', rewardCents: 300 },
    { family: 'knight', every: 30, boss: 'knight__schwarz', label: 'Knights', rewardCents: 300 },
  ],
};

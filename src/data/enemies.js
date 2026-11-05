























export const ENEMY_TYPES = {
  // Early enemy, NOT in the timeline: spawns at a steady rate that never increases (see `steady`).
  // Better than a skeleton, worse than a goblin. Once hit, he whines and runs away.
  skinhead: {
    sprite: 'skinhead',
    artScale: 0.7, // drawn as tall as Lars; shown 30% smaller (playtest)
    tint: 0xe8b8a0, // pinkish (fallback only)
    hp: 24,
    contactDamage: 8,
    speed: 95,
    steady: { interval: 6, maxAlive: 5 }, // one every 6 s, never more than 5 around
    flees: {
      speedMul: 1.4,
      despawnDist: 1100, // runs off and is gone (no kill, no drop) once this far from Lars
      whineEvery: 2.2,
      lines: ['Aua!', 'Mamaaa!', 'Nicht ins Gesicht!', 'Das war unfair!', 'Ich hol meinen Anwalt!',
        "Ich sag's meiner Mutti!", 'Wääh!', 'Du Opfer... aua!'],
    },
  },
  skeleton: {
    sprite: 'skeleton',
    tint: 0xd8d8d0,
    hp: 16,
    contactDamage: 6,
    speed: 95,
    variants: [{ type: 'skeleton_archer', chance: 0.2 }],
  },
  skeleton_archer: {
    sprite: 'skeleton_archer',
    fallbackSprite: 'skeleton',
    family: 'skeleton',
    tint: 0xbfb49a,
    hp: 16,
    contactDamage: 6,
    speed: 95,
    ranged: {
      projectile: 'arrow',
      damage: 6,
      speed: 340,
      range: 420, // only shoots when Lars is closer than this and in line of sight
      cooldown: 2.2,
      cooldownJitter: 0.15, // +-15% so a group of archers doesn't fire in sync
      firstShotDelay: 1.0,
      aimPause: 0.3, // stands still this long before releasing (telegraph)
      preferredDist: 260, // walks in until this distance...
      holdBand: 50, // ...and holds position within preferredDist +- holdBand
      minDist: 180, // backs off when Lars gets closer than this
      strafeMul: 0.55, // strafe speed = speed x this
      retreatMul: 0.9,
      strafeFlipMin: 1.2, // strafe direction flips every min..max seconds (or when blocked)
      strafeFlipMax: 2.8,
    },
  },
  zombie: {
    sprite: 'zombie',
    tint: 0x8ab070,
    hp: 20,
    contactDamage: 7,
    speed: 60,
    clump: [4, 6],
    contactAnim: 'attack',
  },
  goblin: {
    sprite: 'goblin',
    looks: ['goblin', 'goblin__hoodie_rose', 'goblin__hoodie_blue'],
    hp: 24,
    contactDamage: 10,
    speed: 92,
  },
  ogre: {
    sprite: 'ogre',
    tint: 0x9a6a3a,
    fallbackScale: 1.5,
    hp: 110,
    contactDamage: 22,
    speed: 50,
    mass: 4, // shoves smaller enemies aside instead of being pushed around
    knockbackMul: 0.3,
    contactAnim: 'smash', // cosmetic, plays when touching Lars
    elite: true, // map-clearing crew attacks deal reduced damage (CREW.toughDamageMul)
  },
  ninja: {
    sprite: 'ninja',
    tint: 0x3a4a8a,
    hp: 40,
    contactDamage: 14,
    speed: 96,
    contactAnim: 'slash',
    variants: [{ type: 'ninja_thrower', chance: 0.25 }],
  },
  ninja_thrower: {
    sprite: 'ninja_thrower',
    fallbackSprite: 'ninja',
    family: 'ninja',
    tint: 0x5a3a8a,
    hp: 40,
    contactDamage: 14,
    speed: 96,
    contactAnim: 'slash',
    ranged: {
      projectile: 'ninja_star',
      damage: 8,
      speed: 420,
      range: 420,
      cooldown: 2.0,
      cooldownJitter: 0.15,
      firstShotDelay: 0.8,
      aimPause: 0.2,
      preferredDist: 250,
      holdBand: 50,
      minDist: 170,
      strafeMul: 0.7,
      retreatMul: 1,
      strafeFlipMin: 0.9,
      strafeFlipMax: 2.2,
    },
  },
  werewolf: {
    sprite: 'werewolf',
    tint: 0x8a7a6a,
    hp: 55,
    contactDamage: 14,
    speed: 150,
    contactAnim: 'claw',
    abilities: [
      // Crouches (aim line), then leaps a short way; the hit is the normal contact damage.
      { kind: 'lunge', range: 170, minRange: 50, cooldown: 2.6, windup: 0.45, dashSpeed: 520, dashSeconds: 0.28,
        recover: 0.3, anim: 'claw' },
    ],
  },
  knight: {
    sprite: 'knight',
    tint: 0xa0a8b8,
    hp: 160,
    contactDamage: 16,
    speed: 70,
    mass: 3,
    knockbackMul: 0.15, // shield up: hardly knocked back
    contactAnim: 'attack',
    elite: true,
  },
  wizard: {
    sprite: 'wizard',
    tint: 0x6a5ad0,
    hp: 18,
    contactDamage: 4,
    speed: 85,
    shield: 3, // the first 3 hits only crack the bubble
    ranged: {
      preferredDist: 300, holdBand: 60, minDist: 200, strafeMul: 0.6, retreatMul: 1,
      strafeFlipMin: 1.2, strafeFlipMax: 2.6,
    },
    abilities: [
      { kind: 'beam', fx: 'fx_frost_ray', hitFx: 'fx_frost_hit', color: 0x9ad8ff, range: 380, cooldown: 4.5,
        firstDelay: 1.5, windup: 0.6, damage: 8, width: 22, showSeconds: 0.3, point: 'muzzle', slow: { mul: 0.6, seconds: 2 },
        anim: 'cast', los: true },
    ],
  },
  battlemage: {
    sprite: 'battlemage',
    tint: 0x5a6ab0,
    hp: 140,
    contactDamage: 16,
    speed: 75,
    mass: 2,
    knockbackMul: 0.5,
    elite: true,
    abilities: [
      // Staff hit with lightning: the staff glows, then a short bolt jumps to Lars if he's still close.
      { kind: 'zap', range: 120, reach: 160, cooldown: 2.8, windup: 0.5, damage: 16, color: 0xbfe0ff, point: 'attack', anim: 'attack' },
    ],
  },
  horned_demon: {
    sprite: 'horned_demon',
    tint: 0xb03020,
    hp: 220,
    contactDamage: 24,
    speed: 85,
    mass: 3,
    knockbackMul: 0.35,
    contactAnim: 'claw',
    ignite: { dps: 3, seconds: 3 }, // claws set Lars on fire
    elite: true,
  },
  necromancer: {
    sprite: 'necromancer',
    tint: 0x4a3a5a,
    hp: 45,
    contactDamage: 0, // never attacks himself
    speed: 80,
    maxAlive: 2,
    ranged: {
      preferredDist: 340, holdBand: 60, minDist: 240, strafeMul: 0.5, retreatMul: 1.1,
      strafeFlipMin: 1.5, strafeFlipMax: 3,
    },
    abilities: [
      // His skeletons crumble when he dies.
      { kind: 'summon', type: 'skeleton', count: 3, maxMinions: 12, range: 700, cooldown: 6, firstDelay: 1.5,
        windup: 0.9, spread: 50, anim: 'summon', circleFx: 'fx_summon_circle' },
    ],
  },
  monopoly_man: {
    sprite: 'monopoly_man',
    tint: 0xd0d0d0,
    hp: 60,
    contactDamage: 4,
    speed: 100,
    maxAlive: 1,
    minGap: 60,
    contactAnim: 'cane',
    steal: { cents: 50, cooldown: 1.2, bonusCents: 200 },
    lines: ['Miete fällig!', 'Gehen Sie nicht über Los!', 'Danke für die Spende!'],
  },
  clay_golem: {
    sprite: 'clay_golem',
    tint: 0xb07a4a,
    hp: 900,
    contactDamage: 26,
    speed: 35,
    mass: 12, // shoves everything else aside
    knockbackMul: 0.05,
    maxAlive: 1,
    minGap: 45,
    elite: true,
    banner: 'CLAY GOLEM!',
    abilities: [
      { kind: 'slam', range: 110, offset: 40, radius: 110, cooldown: 4, windup: 0.8, recover: 0.5, damage: 26,
        anim: 'slam', color: 0xd09050, shake: 0.008, shakeMs: 160 },
    ],
  },
  iron_golem: {
    sprite: 'iron_golem',
    tint: 0x9098a8,
    hp: 2500,
    contactDamage: 34,
    speed: 30,
    mass: 20,
    knockbackMul: 0.02,
    maxAlive: 1,
    minGap: 60,
    elite: true,
    banner: 'IRON GOLEM!',
    abilities: [
      { kind: 'slam', range: 120, offset: 44, radius: 130, cooldown: 4, windup: 0.9, recover: 0.6, damage: 34,
        anim: 'slam', color: 0xc0c8e0, shake: 0.012, shakeMs: 200 },
    ],
  },
  terminator: {
    sprite: 'terminator',
    tint: 0x9aa0a8,
    hp: 300,
    contactDamage: 26,
    speed: 70,
    mass: 4,
    knockbackMul: 0.25,
    contactAnim: 'punch',
    elite: true,
    abilities: [
      { kind: 'beam', fx: 'fx_laser', hitFx: 'fx_laser_hit', color: 0xff3030, range: 420, minRange: 90, cooldown: 6,
        firstDelay: 2, windup: 0.6, damage: 20, width: 18, showSeconds: 0.25, point: 'eye', anim: 'laser', los: true },
    ],
  },
  terminator_elite: {
    sprite: 'terminator_elite',
    fallbackSprite: 'terminator',
    tint: 0x707880,
    hp: 450,
    contactDamage: 26,
    speed: 70,
    mass: 4,
    knockbackMul: 0.25,
    contactAnim: 'punch',
    elite: true,
    abilities: [
      // Spin-up (flash + aim line), then a burst of bullets aimed at Lars with a little spread.
      { kind: 'burst', projectile: 'bullet', range: 440, minRange: 80, cooldown: 5, firstDelay: 2, windup: 0.7,
        shots: 10, every: 0.08, damage: 4, speed: 560, spreadDeg: 7, point: 'muzzle', recover: 0.3, anim: 'minigun', los: true },
    ],
  },
  dragon: {
    sprite: 'dragon',
    tint: 0x3a8a3a,
    hp: 4000,
    contactDamage: 40,
    speed: 55,
    mass: 30,
    knockbackMul: 0.02,
    maxAlive: 1,
    minGap: 120,
    boss: true, // never recycled, reduced damage from map-clearing crew attacks
    banner: 'DRAGON!!',
    bar: true,
    barName: 'DRAGON',
    reward: { cents: 300, bottles: 8, spread: 90 }, // Pfand + a ring of beer bottles when it dies
    abilities: [
      { kind: 'cone', range: 260, length: 280, halfAngleDeg: 28, cooldown: 7, firstDelay: 3, windup: 0.8,
        duration: 1.4, tick: 0.35, damage: 14, burn: { dps: 4, seconds: 3 }, anim: 'breath', point: 'mouth', mouthY: 150, mouthX: 70 },
      { kind: 'slam', range: 120, offset: 60, radius: 120, cooldown: 3, windup: 0.6, recover: 0.5, damage: 40,
        anim: 'claw', color: 0xff8040, shake: 0.01, shakeMs: 160 },
    ],
  },
};

const T = ENEMY_TYPES;

// Recolour tier: the same monster back later with better stats (palette variant "base__variant").
function tier(base, variant, stats) {
  return { ...T[base], variants: undefined, look: `${base}__${variant}`, family: base, ...stats };
}

// Kill-count boss (data/killBosses.js): same sprite, boss palette, scaled up, ~15x HP, health bar with name.
function boss(base, variant, name, { scale, hpMul = 15, ...rest }) {
  const b = T[base];
  return {
    ...b, variants: undefined, clump: undefined, look: `${base}__${variant}`, family: base,
    boss: true, bar: true, barName: name, banner: `${name.toUpperCase()}!!`, scale, hp: b.hp * hpMul,
    contactDamage: Math.round(b.contactDamage * 1.5), mass: 10, knockbackMul: 0.15, ...rest,
  };
}

Object.assign(ENEMY_TYPES, {
  skeleton__knochenritter: tier('skeleton', 'knochenritter', { hp: 60, contactDamage: 12, speed: 100, tint: 0xc0b090 }),
  zombie__wasserleiche: tier('zombie', 'wasserleiche', { hp: 70, contactDamage: 14, speed: 70, tint: 0x60a0a0 }),
  goblin__dark: tier('goblin', 'dark', { looks: undefined, hp: 80, contactDamage: 16, speed: 105, tint: 0x506040 }),
  ogre__elite: tier('ogre', 'elite', { hp: 400, contactDamage: 32, speed: 58, tint: 0xc05040 }),
  ninja__shadow: tier('ninja', 'shadow', { hp: 120, contactDamage: 22, speed: 120, tint: 0x303040 }),
  werewolf__blutmond: tier('werewolf', 'blutmond', { hp: 160, contactDamage: 22, speed: 165, tint: 0xa05040 }),

  goblin__koenig: boss('goblin', 'koenig', 'Goblin King', { looks: undefined, scale: 1.5, tint: 0xffd040 }),
  skeleton__fuerst: boss('skeleton', 'fuerst', 'Skeleton Lord', {
    scale: 1.5, tint: 0xa080c0,
    abilities: [{ kind: 'summon', type: 'skeleton_archer', count: 4, maxMinions: 4, once: true, range: 450,
      cooldown: 0, firstDelay: 1, windup: 0.9, spread: 70, anim: 'attack', circleFx: 'fx_summon_circle' }],
  }),
  zombie__opa: boss('zombie', 'opa', 'Zombie Grandpa', { scale: 1.6, speed: 45, tint: 0xa0a080,
    deathSpawn: { type: 'zombie', count: 6, radius: 40 } }),
  ninja__meister: boss('ninja', 'meister', 'Ninja Master', {
    scale: 1.4, tint: 0xd03030,
    abilities: [
      { kind: 'lunge', range: 260, minRange: 60, cooldown: 3.5, windup: 0.45, dashSpeed: 700, dashSeconds: 0.32,
        recover: 0.3, anim: 'slash' },
      { kind: 'fan', projectile: 'ninja_star', count: 5, spreadDeg: 50, damage: 8, speed: 420, range: 420,
        minRange: 100, cooldown: 4, firstDelay: 1.5, windup: 0.45, recover: 0.2, anim: 'slash', los: true },
    ],
  }),
  werewolf__alpha: boss('werewolf', 'alpha', 'Alpha Werewolf', {
    scale: 1.5, tint: 0xd0d8e0,
    abilities: [
      { kind: 'howl', family: 'werewolf', radius: 320, speedMul: 1.35, seconds: 5, range: 600, cooldown: 9,
        firstDelay: 1, windup: 0.7, recover: 0.3, anim: 'claw', color: 0xd0d8ff },
      { ...T.werewolf.abilities[0], dashSpeed: 600 },
    ],
  }),
  ogre__haeuptling: boss('ogre', 'haeuptling', 'Ogre Chieftain', {
    scale: 1.6, tint: 0xc08050,
    abilities: [{ kind: 'slam', range: 120, offset: 50, radius: 140, cooldown: 3.5, windup: 0.8, recover: 0.5,
      damage: 30, anim: 'smash', color: 0xff6040, shake: 0.012, shakeMs: 200 }],
  }),
  knight__schwarz: boss('knight', 'schwarz', 'Black Knight', { scale: 1.4, tint: 0x404050, knockbackMul: 0.05 }),
});

// The Eimer's "Eigenbedarf!!!" boss (data/EIGENBEDARF). Not in the timeline: spawned by the event only.
// Fights like hulk Hannah (slam + lunge, see EIGENBEDARF.attacks) but slower, stronger, much tankier.
ENEMY_TYPES.eigenbedarf_boss = {
  sprite: 'eigenbedarf_boss',
  tint: 0x8a3030,
  fallbackScale: 2.5,
  boss: true,
  bar: true,
  barName: null, // health bar without a name
  hp: 2600,
  contactDamage: 30,
  speed: 55,
  mass: 20,
  knockbackMul: 0.05,
};

// Kill list on the game-over screen (families, in this order; only ones with kills are shown).
export const FAMILY_LABELS = {
  skeleton: 'Skeletons', zombie: 'Zombies', goblin: 'Goblins', skinhead: 'Skinheads', ogre: 'Ogres', ninja: 'Ninjas',
  werewolf: 'Werewolves', knight: 'Knights', wizard: 'Wizards', battlemage: 'Battlemages', horned_demon: 'Horned Demons',
  necromancer: 'Necromancers', monopoly_man: 'Monopoly Men', clay_golem: 'Clay Golems', iron_golem: 'Iron Golems',
  terminator: 'Terminators', terminator_elite: 'Elite Terminators', dragon: 'Dragons', eigenbedarf_boss: 'Eigenbedarf',
};

export const ENEMY_DEFAULTS = {
  mass: 1,
  knockbackMul: 1,
  fallbackScale: 1,
  scale: 1,
  contactAnimCooldown: 0.9, // min seconds between two cosmetic contact animations
  contactSlack: 6, // px: "touching" for the cosmetic contact animation
  losSamples: 6, // tile samples along the line to Lars for the ranged line-of-sight check
};

// Spawn pacing that isn't per timeline row. Pool size (hardCap) and spawn distance stay in config.SPAWN.
export const ENEMY_SPAWN = {
  graceSeconds: 1, // nothing spawns right at the start
  bossRecycleDist: 1400, // px: bosses/dragon left this far behind...
  bossRecycleSeconds: 6, // ...for this long come back near Lars (same HP)
  aliveCap: 180, // timeline caps never go above this (pool hard cap in config.SPAWN is higher: summons, bosses)
  minFillPerTick: 4, // at most this many extra spawns per tick to reach a row's minimum counts
  clumpSpacing: 26,
  hpGrowthPerMinute: 0.04, // small: tougher tiers do most of the work
  damageGrowthPerMinute: 0.04, // contact AND projectile/ability damage
  flowRefreshSeconds: 0.2,
};

// Entering the Eimer: chance of "Eigenbedarf!!!" instead of the shop. The boss blocks the Eimer until beaten.
export const EIGENBEDARF = {
  chance: 0.01,
  banner: 'Eigenbedarf!!!',
  closedText: 'Eigenbedarf! Zu!',
  spawnBelowDoor: 140, // px below the Eimer door
  rewardCents: 2000, // big Pfand drop when it's beaten
  rewardBottles: 12, // + this many beer bottles scattered around (normal drops)
  rewardSpread: 90,
  startShake: 0.012, startShakeMs: 260,
  rewardShake: 0.01, rewardShakeMs: 200,
  // Attacks hit Lars. Same shape fields as crew attacks (data/champions.js); hit frames from its sprite meta.
  attacks: [
    { kind: 'line', dash: true, range: 260, length: 300, width: 70, dashSeconds: 0.4, damage: 45, cooldown: 4.5,
      windup: 0.7, recover: 0.6, anim: 'lunge', shake: 0.01, shakeMs: 160 },
    { kind: 'circle', range: 90, offset: 30, radius: 170, damage: 60, cooldown: 3.5, windup: 0.9, recover: 0.7,
      anim: 'slam', shake: 0.02, shakeMs: 240, ring: 0xff6040 },
  ],
};

// Enemy projectiles. Arrow/bullet art is assumed to point right (angle 0).
export const ENEMY_PROJECTILES = {
  poolSize: 160, // elite terminator bursts: 10 bullets each
  shotHeight: 30, // drawn this far above the ground-level hit circle (roughly chest height)
  kinds: {
    arrow: { sprite: 'arrow', radius: 5, maxRange: 520, spin: 0 },
    ninja_star: { sprite: 'ninja_star', radius: 6, maxRange: 520, spin: 16 }, // spin in rad/s
    bullet: { sprite: 'bullet', radius: 4, maxRange: 560, spin: 0 },
  },
};

// Telegraphs + monster FX (systems/enemies/EnemyFx.js).
export const ENEMY_FX = {
  aimColor: 0xff3030,
  aimAlpha: 0.55,
  aimWidth: 2,
  aimPulseHz: 8,
  coneColor: 0xff8a30,
  coneAlpha: 0.22,
  slamAlpha: 0.25,
  spinFlashColor: 0xffe080,
  maxBeams: 10,
  maxBolts: 8,
  boltSeconds: 0.18,
  boltSegments: 6,
  boltJitter: 12,
  maxRings: 12,
  ringSeconds: 0.35,
  maxFlames: 40,
  flameEvery: 0.05,
  flameSpeed: 320,
  flameLife: 0.6,
  maxShields: 24, // wizards with a bubble at once
  maxCircles: 4,
  maxLightSets: 6, // big monsters with meta.lights glowing at once
  stepShake: 0.002, // camera shake on the walk frames in meta.shakeFrames.walk (golems, dragon...)
  stepShakeMs: 70,
  beamFrameSeconds: 0.06,
  minWindup: 0.45, // no telegraphed enemy attack (incl. Eigenbedarf) winds up faster than this, whatever the art
  coneMinRadius: 20, // px: this close to the dragon's mouth counts as inside the flame cone
  bodyY: 36, // px above the feet circle where shots/beams/bolts start (chest height) unless an ability sets fromY
  playerChestY: 40, // aim lines/beams/bolts end at Lars' chest
};

// Status effects monsters put on Lars (systems/enemies/PlayerAfflictions.js).
export const PLAYER_AFFLICTIONS = {
  burnTick: 0.5,
  flameY: 18, // px above Lars' feet circle: bottom of the flame
  flameScale: 1.2,
  slowTint: 0x9ad8ff,
  stealColor: '#ff6a6a',
  textY: 120, // floating texts this far above Lars
};

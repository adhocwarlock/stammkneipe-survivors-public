













export const CREW = {
  defaultCooldown: 90,
  maxAllies: 8,
  allyLife: 20, // seconds an ally fights before leaving
  leaveSeconds: 1.2, // run off / fade out
  leaveSpeedMul: 1.3,
  retargetSeconds: 0.25,
  aggroRange: 520, // allies look for enemies this far around themselves
  followDist: 120, // without a target they stay this close to Lars
  leashDist: 650, // farther than this from Lars: run back (flow field)
  arriveDist: 24,
  runInSlack: 1, // scripted run-ins teleport to the goal after (distance / speed + this) seconds
  defaultSpeed: 250,
  firstAttackDelay: [0.2, 0.6], // random delay before an ally's first attacks (not all at once on arrival)
  sinkSpeed: 30, // px/s the flame demon sinks while fading out
  // Steering: beeline to the goal while the street line to it is clear; when blocked, follow the
  // flow field (it leads to Lars) to get back near him. Re-checked this often (hysteresis against twitching):
  losRecheck: 0.3,
  losStep: 16, // px between line-of-sight samples
  shadowCollideRef: 10, // shadow scale = collide width / this (big forms get big shadows)
  spotTries: 12, // tries to find a free spot for holes / pillars / run-in goals
  spotPadding: 20,
  entryMargin: 40, // champions run in from this far outside the screen edge
  // Map-clearing attacks (mapClear): bosses and elite enemies (ENEMY_TYPES.*.elite) take this fraction.
  toughDamageMul: 0.3,
  screenMargin: 60, // "on screen" for map-clear attacks = camera view + this
  bannerSeconds: 2.2,
  speechSeconds: 2.2,
  maxShots: 96, // pooled crew projectiles (flames, ravens)
  maxRings: 12, // pooled shockwave rings
  maxExplosions: 48,
  // Photo heads of the crew (real photos, 320 px tall cut-outs): sized by HEIGHT so wide photos (hair, hats)
  // don't shrink the face; anchorY = fraction down the photo that sits on the neck. Per champion: `head`.
  head: { heightArt: 33, anchorY: 0.86 },
};

export const BURN = {
  tickSeconds: 0.25,
  maxFlames: 70, // burning enemies beyond this still burn, just without their own flame sprite
  flameY: 18, // px above the enemy's feet circle = bottom of the flame (lower torso)
};

export const CHAMPIONS = {
  // Lars is only in the crew when you play someone else (secret hero select).
  lars: {
    name: 'Lars', ability: 'Schubsentanz!!', cooldown: 100, body: 'lars_body',
    photo: 'photo_normal', head: { widthArt: 19, anchorY: 0.68 }, // his usual head (data/config HEAD)
    runSpeed: 380,
    meetDist: 70,
    song: ['I wanna take you to a gay bar', 'gay bar', 'gay bar'], // Electric Six, one bubble after another
    lineSeconds: 1.1,
    banner: 'Schubsentanz!!',
    shake: 0.014, shakeMs: 320,
    duration: 10, // the moshpit
    beers: 6, // free beers Lars drops while dancing, spread over the pit
    // Lars only dances/shoves around the pit centre (cosmetic, he hurts nobody).
    dance: { radius: 130, every: 0.7, speed: 300 },
    // Monsters on screen are paired and ram each other (crew/MoshPit.js).
    mosh: {
      rescan: 1.2, // s: new arrivals get paired up
      minPairTime: 2, // no new pairs in the last seconds (they couldn't finish their run-up)
      maxPairsPerScan: 40,
      pairStagger: 0.12, // s between pairs starting: crashes come one after another
      backoffSeconds: 0.45, backoffSpeedMul: 0.9, // the visible run-up (backing off from the partner)
      chargeSpeedMul: 3.4, // then straight at each other
      chargeMax: 2.5, // s: still not met = crash where it is
      crashSlack: 14, // px
      // Each crash: both + everyone close. Map-clear numbers like Mike's mics (bosses/elites reduced).
      crash: {
        radius: 85, damage: 600, knockback: 520, knockbackTime: 0.3, mapClear: true,
        ringRadius: 120, ring: 0xffe080, fxScale: 1.1, shake: 0.004, shakeMs: 70,
      },
      finale: { damage: 600, mapClear: true }, // end of the pit: everything still on screen
    },
    // Disco ball (screen space, top centre) while he sings and during the pit. Slow sweeps, no flashing.
    disco: {
      scale: 1.5, // x ART.scale (fx_disco_ball is 24x28 art px)
      top: 0, // px from the top edge when fully down
      ballCentre: 0.59, // fraction down the sprite where the ball itself is (beams start here)
      descendSeconds: 1.4, riseSeconds: 1.2,
      spots: 6, spotScale: 1.6, spotAlpha: 0.22, beamAlpha: 0.08, beamWidth: 16,
      sweepSpeed: 0.35, // rad/s
      colors: [0xff5a8a, 0x5ad0ff, 0xffe05a, 0x8aff7a, 0xc07aff, 0xff9a40],
    },
  },
  hans: {
    name: 'Hans', ability: 'The Hans have arrived', desc: 'Flammenwerfer. Rennt wie irre herum und brennt alles nieder.',
    cooldown: 90, body: 'champ_hans_body', head: { heightArt: 34, anchorY: 0.87 },
    speech: 'Get ze Flammenwerfer!',
    speechLead: 1.3, // Lars' line, then Hans runs in
    banner: 'The Hans have arrived',
    runSpeed: 420,
    duration: 16,
    wanderRadius: 260, // runs between random points this far around Lars
    wanderEvery: 0.8,
    flame: {
      interval: 0.035, streams: 2, whirlDegPerSec: 520, jitterDeg: 10,
      speed: 470, life: 0.42, radius: 20, damage: 8, burnDps: 45, burnSeconds: 4,
    },
    wanderTries: 6, // random wander points tried until one has a clear line from Hans
    finale: { damage: 0, burnDps: 70, burnSeconds: 3, mapClear: true }, // when he leaves, the screen burns
  },

  hannah: {
    name: 'Hannah', ability: 'Hannahbolika!!', desc: 'Eine Spritze, riesige Arme. Bodenschlag und Durchbruch-Punch.',
    cooldown: 90, body: 'champ_hannah_body', hulkBody: 'hannah_hulk_body',
    head: { heightArt: 44, anchorY: 0.9 }, // small face under a big horned helmet + pineapple: drawn bigger
    banner: 'Hannahbolika!!',
    runSpeed: 360,
    meetDist: 90, // she runs up to this far from Lars
    injectSeconds: 1.3, // at least; longer if the 'inject' anim is longer
    transform: { shake: 0.008, shakeMs: 140, ringRadius: 110, fxScale: 1.2 },
    duration: 20,
    speed: 330, // hulk form, fast
    headScale: 1.5, // used when the hulk sprite has no meta.headScale
    attacks: [
      { kind: 'line', dash: true, range: 240, length: 270, width: 56, dashSeconds: 0.22, damage: 80, cooldown: 3,
        windup: 0.15, recover: 0.15, anim: 'lunge', knockback: 420, knockbackTime: 0.25 },
      { kind: 'circle', range: 60, offset: 30, radius: 150, damage: 95, cooldown: 2.2, windup: 0.3, recover: 0.3,
        anim: 'slam', knockback: 520, knockbackTime: 0.3, shake: 0.012, shakeMs: 160, ring: 0xffd0a0 },
    ],
  },

  danny: {
    name: 'Danny', ability: 'Grabi Grabi Loch!!', desc: 'Gräbt ein Loch. Zu tief. Etwas Großes kommt raus.',
    cooldown: 95, body: 'champ_danny_body', head: { heightArt: 33, anchorY: 0.87 },
    banner: 'Grabi Grabi Loch!!',
    banner2: 'Too Deep!!!',
    runSpeed: 380,
    holeDist: 110, // dig spot distance from Lars
    holeScale: 2, // dig_hole drawn bigger, the demon is huge
    digSeconds: 1.6,
    holeOpen: { shake: 0.006, shakeMs: 160, fxScale: 0.8 }, // "Too Deep!!!"
    emergeSeconds: 1.2, // at least; the art's 'emerge' anim decides if longer
    duration: 22,
    speed: 340, // Danny himself
    attacks: [
      { kind: 'arc', range: 55, radius: 80, arcDeg: 150, damage: 30, cooldown: 0.55, windup: 0.08, recover: 0.12,
        anim: 'swing', knockback: 260, knockbackTime: 0.12 },
    ],
    demon: {
      body: 'flame_demon',
      speed: 70, // slow
      // The ground shakes as he walks: on the art's meta.shakeFrames.walk frames, else every stepEvery s.
      stepEvery: 0.6, stepShake: 0.0025, stepShakeMs: 90,
      shadowScale: 3,
      halo: { color: 0xff8a30, scale: 3.5, alpha: 0.3, y: 110 }, // warm ADD glow so his fire shows at night
      attacks: [
        { kind: 'circle', range: 90, offset: 60, radius: 200, damage: 160, cooldown: 3.2, windup: 0.5, recover: 0.4,
          anim: 'slam', knockback: 750, knockbackTime: 0.35, shake: 0.02, shakeMs: 240, burnDps: 35, burnSeconds: 4,
          ring: 0xff7a20 },
        { kind: 'arc', range: 190, radius: 230, arcDeg: 150, damage: 55, cooldown: 1.6, windup: 0.3, recover: 0.3,
          anim: 'whip', knockback: 320, knockbackTime: 0.2, burnDps: 25, burnSeconds: 3 },
      ],
    },
  },

  mike: {
    name: 'Mike', ability: 'Danger Close!!', desc: 'A-10 Warthog. Teppich aus Mikrofonen. Mike Drop.',
    cooldown: 110, body: 'champ_mike_body', plane: 'a10', head: { heightArt: 33, anchorY: 0.85 },
    banner: 'Danger Close!!',
    banner2: 'Mike Drop!!',
    passes: 3, // alternating directions, one band of the screen each
    passSeconds: 1.5,
    passGap: 0.3,
    planeScale: 2, // x ART.scale: drawn big, it's a fly-over
    planeHeight: 90, // px the plane flies "above" the band it bombs (drawn higher up on screen)
    shadowOffset: 110, // px its dark ground shadow sits below it
    shadowAlpha: 0.28,
    cockpitFaceArt: 9, // width of Mike's face in the canopy, in a10 art px
    micSpacing: 120, // px between mics (grid over the visible map, jittered)
    micJitter: 35,
    maxMics: 110, // spacing grows on huge screens so the count stays below this
    fallSeconds: 0.45,
    pauseSeconds: 1.0, // after the last pass, before "Mike Drop!!"
    explodeSeconds: 2.2, // all mics go off staggered within this time
    explosion: { radius: 120, damage: 600, knockback: 500, knockbackTime: 0.3, shake: 0.005, shakeMs: 80, fxScale: 1.4,
      mapClear: true },
  },

  johnny: {
    name: 'Johnny', ability: 'Bifröst!', desc: '„Loki“. MMA. Reißt sich das Shirt runter und ruft die Götter.',
    cooldown: 120, body: 'champ_johnny_body', bareBody: 'champ_johnny_bare_body', head: { heightArt: 33, anchorY: 0.88 },
    banner: 'Bifröst!',
    banner2: 'Cage Fight!!',
    runSpeed: 380,
    meetDist: 80,
    ripSeconds: 1.1, // at least; longer if the 'rip' anim is longer
    pillarDist: 170, // pillars around Lars
    pillarSeconds: 1.0, // pillar shimmer before the first god steps out
    godEvery: 0.45, // stagger between the gods
    fightDelay: 0.7, // after the last god: "Schubsentanz!!"
    duration: 22,
    speed: 330,
    attacks: [
      { kind: 'single', range: 60, damage: 120, cooldown: 4, windup: 0.25, recover: 0.35, anim: 'kick', hitFrame: 1,
        point: 'foot', knockback: 600, knockbackTime: 0.35, shake: 0.006, shakeMs: 90, name: 'takedown' },
      { kind: 'arc', range: 60, radius: 85, arcDeg: 130, damage: 32, cooldown: 1.1, windup: 0.12, recover: 0.15,
        anim: 'kick', hitFrame: 1, point: 'foot', knockback: 320, knockbackTime: 0.15 },
      { kind: 'single', range: 45, damage: 16, cooldown: 0.28, windup: 0.05, recover: 0.08, anim: 'punch', hitFrame: 1,
        point: 'fist', knockback: 150, knockbackTime: 0.08 },
    ],
    gods: [
      {
        id: 'thor', body: 'god_thor', title: 'THOR', label: 'GOTT DES DONNERS', speed: 230,
        attacks: [
          { kind: 'lightning', range: 360, damage: 45, chains: 6, chainRange: 190, cooldown: 1.6, windup: 0.2,
            recover: 0.2, anim: 'smash', hitFrame: 1, point: 'hammer', knockback: 0, knockbackTime: 0.12 },
          { kind: 'circle', range: 60, offset: 30, radius: 130, damage: 70, cooldown: 1.8, windup: 0.3, recover: 0.25,
            anim: 'smash', hitFrame: 1, point: 'hammer', knockback: 450, knockbackTime: 0.25, shake: 0.008, shakeMs: 120, ring: 0x9ff0ff },
        ],
      },
      {
        id: 'odin', body: 'god_odin', title: 'ODIN', label: 'ALLVATER', speed: 210,
        attacks: [
          { kind: 'ravens', range: 420, count: 3, spreadDeg: 30, speed: 520, travel: 520, radius: 16, damage: 35,
            cooldown: 1.8, windup: 0.25, recover: 0.2, anim: 'cast', hitFrame: 1, point: 'castHand', knockback: 120, knockbackTime: 0.08 },
          { kind: 'line', range: 80, length: 120, width: 34, damage: 55, cooldown: 0.9, windup: 0.15, recover: 0.15,
            anim: 'stab', hitFrame: 1, point: 'spearTip', knockback: 300, knockbackTime: 0.15 },
        ],
      },
      {
        id: 'vidar', body: 'god_vidar', title: 'DER ANDERE SOHN', label: '...VON ODIN', speed: 260,
        attacks: [
          { kind: 'line', dash: true, range: 280, length: 320, width: 56, dashSeconds: 0.28, damage: 85, cooldown: 3.4,
            windup: 0.2, recover: 0.2, anim: 'flykick', hitFrame: 1, point: 'bootSole', knockback: 450, knockbackTime: 0.25 },
          { kind: 'circle', range: 70, offset: 20, radius: 160, damage: 95, cooldown: 2.6, windup: 0.4, recover: 0.3,
            anim: 'dropkick', hitFrame: 1, knockback: 600, knockbackTime: 0.3, shake: 0.014, shakeMs: 180, ring: 0xc89a60 },
        ],
      },
    ],
  },
};

// Shop order in the CREW tab, and the ?debug cycle order. The hero you play is left out.
export const CHAMPION_ORDER = ['lars', 'hans', 'hannah', 'danny', 'mike', 'johnny'];

// Real photo of a champion (assets/faces/champions/<id>.png, or `photo`); falls back to Lars' photo.
export const championPhotoKey = (id) => CHAMPIONS[id]?.photo || `photo_champ_${id}`;

// Photo head size/anchor of a champion (see CREW.head).
export const championHead = (id) => CHAMPIONS[id]?.head || CREW.head;

// All tuning values live here. Times in seconds, speeds in px/s, money in cents.

export const DEPTH = {
  // World objects use their feet y as depth (0..~5400 on the big map); everything screen-space sits above that.
  above: 8000, // map layers drawn over characters (south bridge truss, railway cut over the underpass)
  fx: 9000,
  floatText: 9500,
  ui: 10000,
};

export const FACES = {
  
  hurtSeconds: 0.35,
  happySeconds: 1.0,
  mehSeconds: 1.8, // after a bad beer (Freiburger Pilsner...)
  lowHpBelow: 0.35,
  drunkFrom: 1.2, // Promille
  photoArtPx: 17, // photo face size in art px (the pixel window is 14; the photo sticks out a bit on purpose)
};

export const HEAD = {
  // Photo-head mode: the real photo of Lars (assets/faces/normal.png) IS the head.
  widthArt: 19, // head width in art px (x ART.scale on screen); height follows the photo
  anchorY: 0.68, // fraction down the photo that sits on the body's neck point (bobblehead on the shoulders)
  helmetY: 0.2, // fraction down the photo where the helmet's bottom edge sits (forehead)
  helmetScale: 0.99, // 10% smaller after playtest
  helmetDrop: 0.2, // sits 20% of its own height lower (playtest)
};

export const TESTER = {
  // Shift+click (or Shift+Enter) SPIELEN on the start screen, or open the game with ?tester
  pfandCents: 99999900, // €999,999
};

export const FONTS = {
  metal: 'MetalMania, serif', // big headlines / pop-ups
  pixel: 'PressStart, monospace', // small labels
};

export const ART = {
  scale: 3, // every art pixel is drawn as scale x scale screen pixels
  tile: 16, // art px per tile
};

export const CONTROLS = {
  joystickDeadZone: 0.15, // fraction of the ring radius that counts as "no input"
  joystickIdleAlpha: 0.25,
  joystickActiveAlpha: 0.6,
  joystickZone: 0.5, // touches/clicks in the left X fraction of the screen grab the stick
};

export const WORLD = {
  width: 0, // set from the map size by Town
  height: 0,
};

// Secret harder start: tap/click the screen `taps` times within `windowSeconds` -> run clock jumps ahead.
export const DIFFICULTY_TAPS = {
  taps: 10,
  windowSeconds: 3,
  jumpMinutes: 5,
  banner: '+{min} MINUTEN!!',
};

export const PLAYER = {
  radius: 14, // only for the placeholder blob; with art the feet circle comes from the sprite meta
  speed: 242, // +15% after playtest (was 210)
  attackSpeed: 1.15, // base attack speed: all weapon cooldowns are divided by this (+15% after playtest)
  maxHp: 100,
  invulnSeconds: 0.5,
};

export const GOBLIN = {
  radius: 12,
  speed: 115,
  hp: 24, // 2 punches
  contactDamage: 10,
};

export const FISTS = {
  cooldown: 0.45,
  range: 55, // from Lars' center to the enemy's edge
  damage: 12,
  knockbackSpeed: 280,
  knockbackSeconds: 0.12,
};

export const SPAWN = {
  // Spawn pacing is in data/enemies.js (ENEMY_SPAWN) + data/timeline.js.
  hardCap: 300, // enemy pool size (timeline alive cap is lower: room for summons and bosses)
  offscreenMargin: 60, // px outside the camera view where enemies appear
};

export const DROPS = {
  bottleChance: 0.3,
  bottlePfandCents: 8,
  
  bottleSprites: ['beer_stoertebeker', 'beer_augustiner', 'beer_tannenzaepfle', 'beer_rothaus', 'beer_erdinger',
    'beer_freiburger', 'beer_oettinger', 'beer_turmbraeu'],
};

export const FX = {
  nightTint: 0x9aa4d0, // multiplied over the whole world (style guide: art is authored for this)
  grimeBase: 0.3, // grime/vignette are always faintly there (night mood)
  grimeFromDamage: 0.55,
  vignetteBase: 0.35,
  vignetteFromDamage: 0.45,
  lowHpThreshold: 0.35, // red edge pulse below this HP fraction
  lowHpPulseHz: 1,
  dichtHueDegPerSec: 40, // slow on purpose: no fast flashing
  dichtWobble: 0.06,
  dichtGhostInterval: 0.06,
  dichtGhostMax: 12,
};

export const VIEW = {
  // World camera zoom levels (pause menu ZOOM - / +). Picked so an art pixel stays a whole number of screen
  // pixels where possible (x ART.scale = 1.5, 2, 3, 4, 5, 6 px). The HUD never zooms (own camera).
  zoomSteps: [0.5, 2 / 3, 1, 4 / 3, 5 / 3, 2],
  defaultZoom: 1,
};

export const MINIMAP = {
  // Bottom-right radar: 1 map tile = 1 minimap pixel, drawn `scale` screen px big (pixel look).
  viewTiles: [64, 40], // tiles shown around Lars (w, h)
  scale: 3, // screen px per tile on wide screens
  scaleNarrow: 2, // phones
  narrowBelow: 500, // px: screens whose shorter side is below this (phones) use scaleNarrow
  margin: 16,
  alpha: 0.72, // whole minimap is translucent
  refreshHz: 10, // dots are redrawn this often (not every frame)
  maxEnemyDots: 300,
  colors: {
    frame: 0xd4af37,
    backing: 0x0d0d10,
    house: '#7a4636', // roofs
    houseEdge: '#4a2a24',
    solid: '#1e1e26', // railway cut, landmark footprints
    street: '#5c5a66',
    grass: '#2c4a3a',
    water: '#2a4f8a',
    rail: '#4a4a56',
    unreachable: '#33323a',
    player: 0xffffff,
    playerEdge: 0x000000,
    enemy: 0xe04040,
    boss: 0xff9a2a,
    shop: 0xd4af37,
    eimer: 0x5ad0ff,
  },
  groundColor: { // ground type -> colour key above (anything else = street)
    grass: 'grass', water: 'water', pontoon_ns: 'street', pontoon_ew: 'street', rail_h: 'rail', rail_v: 'rail',
    railcut: 'rail', tunnel_floor: 'rail',
  },
};

export const LEADERBOARD = {
  api: 'api/scores', // relative: served by the Cloudflare Worker (cloudflare/worker.mjs), or tools/serve.py locally
  size: 10, // server keeps the top 10 by Überlebt
  nameMax: 12,
  timeoutMs: 6000,
};

export const MAP_RENDER = {
  chunkTiles: 32, // ground is drawn in chunks of N x N tiles (one huge texture breaks on phones)
};

export const LIGHTS = {
  // Sprite lights (meta.light/lights): a soft pool on the ground + a halo at the light itself.
  radiusUnit: 64, // meta radius / radiusUnit * ART.scale = glow scale
  defaultRadius: 40,
  defaultColor: '#ffb050',
  poolScale: 1.6,
  poolAlpha: 0.28,
  haloScale: 0.5,
  haloAlpha: 0.45,
  lampFallback: { offsetY: 24, scale: 2.5, color: 0xffb050, alpha: 0.35 }, // 'lamp' without art: just a glow
  minRadius: 32, // sprite light radii below this (meta units, lamp = 60) are raised so small lights still read
  indicatorBelow: 12, // ...except tiny indicator lights (rail signal): those keep their size and cast no pool
};

export const UNDERPASS = {
  mode: 'hole', // 'hole' = round see-through hole around Lars; 'fade' = just fade the whole layer (fallback)
  holeRadius: 40, // art px, incl. the feather
  holeFeather: 12, // art px of soft edge
  holeBands: 4, // alpha steps in the feather (pixel look)
  holeSquashY: 1.15, // >1 = slightly flatter ellipse
  holeOffsetY: -12, // art px from Lars' feet circle to the hole centre
  growSeconds: 0.2, // hole opens/closes over this time
  fadeAlpha: 0.35, // 'fade' mode: layer alpha while Lars is inside
};


export const MAP_SPAWN = {
  attempts: 24, // tries per spawn to find a free, reachable spot just off-screen (big map = many roofs)
  hotspotReach: 900, // px: a spawn hot spot counts while it is this close to the camera view
  hotspotAttempts: 8,
  wallPadding: 24, // px: a spawn point must be this far from any wall
  recycleDist: 4000, // px (~2 screen diagonals): enemies left this far behind are moved to a fresh spawn point
  recyclePerFrame: 4, // at most this many per frame (each one searches a spawn point)
};

export const DOORS = {
  zoneAbove: 6, // px the door trigger reaches up into the façade
  zoneHeight: 34, // px total height (mostly the pavement in front of the door)
  defaultDoor: { x: 24, w: 16 }, // art px, for store façades without meta.door
};

export const HOUSE_LIGHTS = {
  window: { scale: 0.6, color: 0xffc870, alpha: 0.22 }, // halo per lit window
  shopfront: { scale: 1.6, color: 0xffd08a, alpha: 0.22 }, // pool in front of a small shop
  store: { scale: 2.2, color: 0xfff0c0, alpha: 0.28, rowOffset: 0.6 }, // big street-shop light (dm, LIDL...)
};

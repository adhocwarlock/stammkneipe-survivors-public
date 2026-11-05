








export const SFX_CONFIG = {
  sampleRate: 32000, // buffers are rendered at this rate (WebAudio resamples on playback)
  lp: 9000, // default low-pass on every layer, Hz (takes the fizz off square waves)
  dc: 2, // default decay curve exponent
  fadeSec: 0.004, // fade at the end of every buffer (no clicks)
  maxVoices: 22, // all effects at once; categories with prio steal the oldest voice when full
  panSteps: 5, // pre-built stereo panners; a sound uses the one nearest its screen x
  maxPan: 0.55,
  warmBudgetMs: 4, // pre-rendering after the audio unlock: at most this much per idle tick (then yield)
  // Rendered first (most frequent), the rest follow in data order.
  warmFirst: ['w_fist', 'e_hit', 'e_death', 'pickup_bottle', 'player_hurt', 'beer_good', 'beer_bad', 'e_goblin_hurt',
    'e_goblin_death', 'e_skel_hurt', 'e_skel_death', 'e_zombie_hurt', 'e_zombie_death', 'shop_open', 'shop_buy'],
  maxFailures: 5, // audio errors in play() before sound effects switch themselves off for the session
  pitch: 0.5, // default random detune, ± semitones
  heartbeat: { below: 0.3, slowSec: 1.05, fastSec: 0.55 }, // HP fraction; beat interval at the threshold / near 0
  loops: { crew_dig: 0.4, crew_flame: 0.45 }, // sfx.loop(): seconds between repeats (Danny digs, Hans' flamethrower)
};

// Peak = normalised peak level of every sound in the category (quiet for frequent ones, loud for rare ones).
// max = voices of the whole category at once; gap = default min interval of each sound in it.
export const SFX_CATS = {
  tiny: { peak: 0.17, max: 5, gap: 0.05 }, // fists, minigun, stars, chainsaw: many per second
  hurt: { peak: 0.2, max: 4, gap: 0.04 }, // monster hit sounds (180 monsters!)
  death: { peak: 0.28, max: 5, gap: 0.04 },
  weapon: { peak: 0.32, max: 6, gap: 0.06 },
  heavy: { peak: 0.5, max: 3, gap: 0.08 },
  warn: { peak: 0.4, max: 4, gap: 0.12 }, // telegraphs: must be heard (fairness)
  attack: { peak: 0.42, max: 4, gap: 0.06 },
  pickup: { peak: 0.4, max: 4, gap: 0.04 },
  ui: { peak: 0.36, max: 3, gap: 0.04 },
  player: { peak: 0.55, max: 3, gap: 0.1, prio: 1 },
  big: { peak: 0.7, max: 6, gap: 0.05, prio: 1 }, // rare: bosses, crew calls, explosions
};

export const SFX = {
  // ---------------------------------------------------------------- weapons
  w_fist: { cat: 'tiny', max: 3, gap: 0.07, layers: [
    { wave: 'sine', f: [180, 55], a: 0.001, s: 0.015, d: 0.07 },
    { wave: 'noise', f: 6000, a: 0.001, d: 0.03, lp: 2500, vol: 0.5 },
  ] },
  w_cleaver: { cat: 'weapon', layers: [
    { wave: 'noise', f: 12000, a: 0.03, s: 0.02, d: 0.12, lp: [800, 3500], hp: 300 },
    { wave: 'triangle', f: 1800, a: 0.001, d: 0.08, delay: 0.06, vol: 0.25 },
  ] },
  w_ninja_star: { cat: 'tiny', gap: 0.08, layers: [
    { wave: 'square', f: [1200, 1700], duty: 0.25, a: 0.001, d: 0.05, lp: 4000, vol: 0.5 },
    { wave: 'noise', f: 10000, a: 0.005, d: 0.05, hp: 2000, lp: 7000, vol: 0.5 },
  ] },
  w_mjolnir: { cat: 'weapon', gain: 1.2, layers: [
    { wave: 'saw', f: [900, 200], vib: [40, 3], a: 0.002, s: 0.05, d: 0.18, crush: 6, lp: 4000, vol: 0.7 },
    { wave: 'noise', f: 5000, a: 0.001, s: 0.03, d: 0.2, lp: [6000, 1500], vol: 0.6 },
  ] },
  w_doener: { cat: 'weapon', layers: [
    { wave: 'noise', f: 9000, a: 0.05, s: 0.2, d: 0.2, lp: [600, 1400], trem: [14, 0.8] },
    { wave: 'triangle', f: [220, 330], a: 0.05, s: 0.2, d: 0.2, trem: [14, 0.6], vol: 0.3 },
  ] },
  w_eimer: { cat: 'heavy', layers: [
    { wave: 'square', f: 523, duty: 0.3, a: 0.001, d: 0.5, lp: 3000, vol: 0.45 },
    { wave: 'square', f: 741, duty: 0.4, a: 0.001, d: 0.35, lp: 3000, vol: 0.35 },
    { wave: 'triangle', f: 1180, a: 0.001, d: 0.25, vol: 0.3 },
    { wave: 'sine', f: [140, 45], a: 0.001, s: 0.02, d: 0.2 },
    { wave: 'noise', f: 8000, a: 0.001, d: 0.05, lp: 4000, vol: 0.5 },
  ] },
  w_katana: { cat: 'weapon', layers: [
    { wave: 'noise', f: 16000, a: 0.02, d: 0.09, hp: 1500, lp: [2500, 7000] },
  ] },
  w_saber: { cat: 'weapon', layers: [
    { wave: 'saw', f: [110, 160], fc: 0.5, vib: [7, 0.5], a: 0.02, s: 0.12, d: 0.2, lp: 900 },
    { wave: 'saw', f: [113, 165], fc: 0.5, a: 0.02, s: 0.12, d: 0.2, lp: 900, vol: 0.8 },
    { wave: 'noise', f: 12000, a: 0.03, d: 0.12, hp: 2000, lp: 5000, vol: 0.3 },
  ] },
  w_guitar: { cat: 'heavy', layers: [
    { wave: 'saw', f: 82.4, a: 0.002, s: 0.05, d: 0.6, drive: 4, lp: [3000, 900], vol: 0.6 },
    { wave: 'saw', f: 123.5, a: 0.002, s: 0.05, d: 0.6, drive: 4, lp: [3000, 900], vol: 0.5 },
    { wave: 'saw', f: 164.8, a: 0.002, s: 0.05, d: 0.5, drive: 4, lp: [3000, 900], vol: 0.4 },
    { wave: 'noise', f: 9000, a: 0.001, d: 0.03, hp: 1000, vol: 0.4 },
  ] },
  w_minigun: { cat: 'tiny', max: 2, gap: 0.06, layers: [
    { wave: 'noise', f: 7000, a: 0.001, d: 0.035, lp: 2500 },
    { wave: 'square', f: [220, 90], a: 0.001, d: 0.03, lp: 1500, vol: 0.4 },
  ] },
  w_chainsaw: { cat: 'tiny', gain: 1.2, max: 1, gap: 0.09, pitch: 0.3, layers: [
    { wave: 'saw', f: [80, 95], a: 0.005, s: 0.08, d: 0.04, trem: [45, 0.7], drive: 2, lp: 1800 },
    { wave: 'noise', f: 4000, a: 0.005, s: 0.08, d: 0.04, trem: [45, 0.7], lp: 2000, vol: 0.4 },
  ] },
  w_boomerang: { cat: 'weapon', gain: 0.8, layers: [
    { wave: 'triangle', f: [500, 300], a: 0.05, s: 0.15, d: 0.2, trem: [16, 0.9], vol: 0.7 },
    { wave: 'noise', f: 10000, a: 0.05, s: 0.15, d: 0.2, trem: [16, 0.9], lp: 2000, vol: 0.5 },
  ] },
  w_pfeffi_throw: { cat: 'weapon', gain: 0.6, layers: [
    { wave: 'noise', f: 12000, a: 0.01, d: 0.08, lp: [1500, 4000], hp: 500 },
  ] },
  w_pfeffi_splash: { cat: 'weapon', layers: [
    { wave: 'square', f: 2600, duty: 0.3, a: 0.001, d: 0.08, lp: 6000, vol: 0.4 },
    { wave: 'square', f: 3700, a: 0.001, d: 0.06, delay: 0.02, lp: 6000, vol: 0.3 },
    { wave: 'triangle', f: 3100, a: 0.001, d: 0.12, delay: 0.04, vol: 0.25 },
    { wave: 'noise', f: 14000, a: 0.001, d: 0.06, hp: 2500, vol: 0.5 },
    { wave: 'noise', f: 6000, a: 0.04, s: 0.1, d: 0.3, delay: 0.03, lp: [1500, 400], vol: 0.6 },
  ] },
  w_bow: { cat: 'weapon', layers: [
    { wave: 'triangle', f: [210, 170], vib: [30, 0.7], a: 0.001, s: 0.02, d: 0.2 },
    { wave: 'noise', f: 8000, a: 0.001, d: 0.02, lp: 3000, vol: 0.4 },
  ] },
  w_firewall: { cat: 'heavy', layers: [
    { wave: 'noise', f: 3000, a: 0.06, s: 0.25, d: 0.45, lp: [400, 1200], trem: [9, 0.4] },
    { wave: 'noise', f: 800, a: 0.05, s: 0.3, d: 0.4, lp: 300, vol: 0.8 },
  ] },
  w_claymore_drop: { cat: 'tiny', gain: 1.3, layers: [
    { wave: 'square', f: 400, a: 0.001, d: 0.04, lp: 1500, vol: 0.6 },
    { wave: 'noise', f: 5000, a: 0.001, d: 0.02, lp: 3000, vol: 0.5 },
  ] },
  w_claymore_beep: { cat: 'tiny', gain: 1, pitch: 0, layers: [
    { wave: 'square', f: 1320, a: 0.001, s: 0.04, d: 0.02, lp: 3500, vol: 0.6 },
    { wave: 'square', f: 1320, a: 0.001, s: 0.04, d: 0.02, delay: 0.1, lp: 3500, vol: 0.6 },
  ] },
  w_claymore_boom: { cat: 'heavy', max: 2, gap: 0.06, layers: [
    { wave: 'noise', f: 6000, a: 0.002, s: 0.05, d: 0.5, lp: [3000, 250] },
    { wave: 'sine', f: [110, 35], a: 0.002, s: 0.05, d: 0.4 },
    { wave: 'noise', f: 400, a: 0.002, d: 0.6, lp: 200, vol: 0.6 },
  ] },
  w_mercedes: { cat: 'weapon', gain: 0.65, layers: [
    { wave: 'square', f: 880, duty: 0.25, arp: [[0.04, 1.5]], a: 0.001, s: 0.03, d: 0.08, lp: 4000, vol: 0.6 },
    { wave: 'triangle', f: [1500, 2000], a: 0.001, d: 0.1, vol: 0.3 },
  ] },
  w_wand: { cat: 'weapon', gain: 0.8, layers: [
    { wave: 'triangle', f: [600, 1200], vib: [18, 0.8], a: 0.01, s: 0.05, d: 0.15, vol: 0.7 },
    { wave: 'square', f: [1200, 2400], duty: 0.125, a: 0.01, d: 0.1, lp: 3000, vol: 0.3 },
  ] },
  w_oar: { cat: 'weapon', layers: [
    { wave: 'sine', f: [170, 60], a: 0.001, s: 0.02, d: 0.12 },
    { wave: 'noise', f: 5000, a: 0.001, d: 0.05, lp: 2500, vol: 0.7 },
    { wave: 'square', f: [300, 200], a: 0.001, d: 0.06, lp: 1200, vol: 0.3 },
  ] },
  w_firebreath: { cat: 'weapon', layers: [
    { wave: 'noise', f: 4000, a: 0.03, s: 0.12, d: 0.25, lp: [700, 1600], trem: [11, 0.3] },
    { wave: 'noise', f: 900, a: 0.03, s: 0.1, d: 0.25, lp: 350, vol: 0.6 },
  ] },
  w_horns: { cat: 'tiny', gain: 1.3, layers: [
    { wave: 'sine', f: [260, 120], a: 0.001, d: 0.08 },
    { wave: 'noise', f: 5000, a: 0.001, d: 0.03, lp: 2500, vol: 0.4 },
  ] },

  // ---------------------------------------------------------------- monsters
  e_hit: { cat: 'hurt', layers: [
    { wave: 'square', f: [300, 150], a: 0.001, d: 0.04, lp: 1500, vol: 0.6 },
    { wave: 'noise', f: 3000, a: 0.001, d: 0.03, lp: 2000, vol: 0.4 },
  ] },
  e_death: { cat: 'death', layers: [
    { wave: 'noise', f: 3000, a: 0.002, s: 0.02, d: 0.18, lp: [2500, 400], vol: 0.8 },
    { wave: 'square', f: [400, 100], a: 0.001, d: 0.15, lp: 1500, vol: 0.4 },
  ] },
  e_skel_hurt: { cat: 'hurt', gain: 1.4, layers: [
    { wave: 'noise', f: 9000, a: 0.001, d: 0.02, hp: 1500, lp: 5000, vol: 0.8 },
    { wave: 'noise', f: 9000, a: 0.001, d: 0.02, delay: 0.035, hp: 1500, lp: 5000, vol: 0.7, seed: 7 },
    { wave: 'triangle', f: 900, a: 0.001, d: 0.03, vol: 0.3 },
  ] },
  e_skel_death: { cat: 'death', layers: [
    { wave: 'noise', f: 9000, a: 0.001, s: 0.15, d: 0.1, hp: 1200, lp: 5000, trem: [28, 1], vol: 0.8 },
    { wave: 'triangle', f: [800, 400], a: 0.001, s: 0.15, d: 0.1, trem: [28, 1], vol: 0.3 },
  ] },
  e_goblin_hurt: { cat: 'hurt', layers: [
    { wave: 'square', f: [700, 1050], duty: 0.25, a: 0.002, d: 0.07, lp: 3000, vol: 0.7 },
  ] },
  e_goblin_death: { cat: 'death', gain: 0.7, layers: [
    { wave: 'square', f: [1100, 280], duty: 0.25, vib: [25, 1], a: 0.002, s: 0.04, d: 0.18, lp: 3000, vol: 0.7 },
  ] },
  e_zombie_hurt: { cat: 'hurt', layers: [
    { wave: 'saw', f: [130, 105], vib: [6, 0.5], a: 0.02, s: 0.05, d: 0.15, lp: 700, drive: 1.5 },
  ] },
  e_zombie_death: { cat: 'death', layers: [
    { wave: 'saw', f: [120, 70], vib: [5, 0.8], a: 0.03, s: 0.2, d: 0.35, lp: [900, 400], drive: 1.5 },
    { wave: 'noise', f: 2000, a: 0.03, s: 0.2, d: 0.3, lp: 400, vol: 0.3 },
  ] },
  e_ogre_hurt: { cat: 'hurt', gain: 1.2, layers: [
    { wave: 'saw', f: [95, 70], a: 0.005, s: 0.04, d: 0.12, lp: 600, drive: 3 },
    { wave: 'sine', f: [90, 50], a: 0.005, d: 0.12, vol: 0.6 },
  ] },
  e_ogre_death: { cat: 'death', gain: 1.2, layers: [
    { wave: 'saw', f: [100, 45], vib: [8, 0.6], a: 0.01, s: 0.15, d: 0.4, lp: [800, 300], drive: 3 },
  ] },
  e_wolf_howl: { cat: 'big', gain: 0.6, max: 1, gap: 2, pitch: 1, layers: [
    { wave: 'square', f: [380, 640], fc: 0.4, duty: 0.3, vib: [5.5, 0.35], a: 0.12, s: 0.5, d: 0.45, lp: 1800 },
    { wave: 'triangle', f: [760, 1280], fc: 0.4, vib: [5.5, 0.35], a: 0.12, s: 0.5, d: 0.45, vol: 0.3 },
  ] },
  e_wolf_hurt: { cat: 'hurt', layers: [
    { wave: 'square', f: [900, 600], duty: 0.3, a: 0.002, d: 0.08, lp: 2500, vol: 0.7 },
  ] },
  e_wolf_death: { cat: 'death', gain: 0.75, layers: [
    { wave: 'square', f: [800, 250], duty: 0.3, vib: [12, 0.6], a: 0.005, s: 0.05, d: 0.3, lp: 2500, vol: 0.7 },
  ] },
  e_golem_spawn: { cat: 'big', gain: 0.8, max: 1, gap: 2, layers: [
    { wave: 'noise', f: 600, a: 0.15, s: 0.5, d: 0.6, lp: 160, trem: [7, 0.5] },
    { wave: 'sine', f: [55, 40], a: 0.15, s: 0.5, d: 0.6, trem: [7, 0.5], vol: 0.8 },
  ] },
  e_golem_hurt: { cat: 'hurt', gain: 1.2, layers: [
    { wave: 'sine', f: [120, 60], a: 0.001, d: 0.08 },
    { wave: 'noise', f: 2000, a: 0.001, d: 0.05, lp: 900, vol: 0.6 },
  ] },
  e_golem_death: { cat: 'death', gain: 1.4, layers: [
    { wave: 'noise', f: 1500, a: 0.01, s: 0.3, d: 0.5, lp: [1200, 200], trem: [18, 0.7] },
    { wave: 'sine', f: [80, 30], a: 0.01, d: 0.5, vol: 0.7 },
  ] },
  e_servo: { cat: 'hurt', gain: 0.75, layers: [
    { wave: 'square', f: [380, 560], a: 0.005, s: 0.06, d: 0.05, lp: 1800, trem: [60, 0.5], vol: 0.7 },
  ] },
  e_term_death: { cat: 'death', gain: 1.2, layers: [
    { wave: 'square', f: [600, 120], a: 0.005, s: 0.1, d: 0.3, lp: 1800, trem: [40, 0.6], vol: 0.6 },
    { wave: 'noise', f: 4000, a: 0.001, d: 0.2, lp: 2500, vol: 0.6 },
  ] },
  e_shield_hit: { cat: 'hurt', gain: 1.2, layers: [
    { wave: 'triangle', f: 2100, a: 0.001, d: 0.12, vol: 0.6 },
    { wave: 'triangle', f: 3150, a: 0.001, d: 0.08, vol: 0.3 },
  ] },
  e_wizard_death: { cat: 'death', layers: [
    { wave: 'triangle', f: [1400, 300], vib: [20, 1], a: 0.005, s: 0.05, d: 0.35, vol: 0.6 },
    { wave: 'noise', f: 12000, a: 0.005, d: 0.2, hp: 3000, vol: 0.3 },
  ] },
  e_knight_hurt: { cat: 'hurt', layers: [
    { wave: 'square', f: 620, duty: 0.35, a: 0.001, d: 0.07, lp: 3000, vol: 0.5 },
    { wave: 'square', f: 930, a: 0.001, d: 0.05, lp: 3000, vol: 0.3 },
    { wave: 'noise', f: 7000, a: 0.001, d: 0.03, lp: 4000, vol: 0.4 },
  ] },
  e_knight_death: { cat: 'death', gain: 1.2, layers: [
    { wave: 'square', f: 620, duty: 0.35, a: 0.001, d: 0.3, lp: 3000, vol: 0.5 },
    { wave: 'square', f: 930, a: 0.001, d: 0.2, lp: 3000, vol: 0.3 },
    { wave: 'sine', f: [100, 40], a: 0.002, d: 0.2, delay: 0.1 },
  ] },
  e_ninja_hurt: { cat: 'hurt', layers: [
    { wave: 'triangle', f: [500, 380], a: 0.003, d: 0.06, vol: 0.7 },
    { wave: 'noise', f: 9000, a: 0.001, d: 0.03, hp: 1500, vol: 0.3 },
  ] },
  e_demon_hurt: { cat: 'hurt', layers: [
    { wave: 'saw', f: [140, 110], a: 0.005, d: 0.1, drive: 2, lp: 900 },
  ] },
  e_demon_death: { cat: 'death', gain: 1.2, layers: [
    { wave: 'saw', f: [180, 60], vib: [9, 1], a: 0.005, s: 0.1, d: 0.4, drive: 3, lp: 1000 },
  ] },
  e_big_hurt: { cat: 'hurt', gain: 1.4, layers: [
    { wave: 'sine', f: [100, 45], a: 0.001, d: 0.12 },
    { wave: 'saw', f: [85, 65], a: 0.002, d: 0.1, drive: 3, lp: 600, vol: 0.7 },
  ] },
  e_coin_steal: { cat: 'pickup', gain: 0.9, pitch: 0, layers: [
    { wave: 'square', f: 1568, arp: [[0.06, 0.75], [0.12, 0.75], [0.18, 0.75]], a: 0.001, s: 0.22, d: 0.1, lp: 4000, vol: 0.6 },
    { wave: 'triangle', f: 784, arp: [[0.06, 0.75], [0.12, 0.75], [0.18, 0.75]], a: 0.001, s: 0.22, d: 0.1, vol: 0.4 },
  ] },
  e_dragon_roar: { cat: 'big', gap: 3, max: 1, layers: [
    { wave: 'saw', f: [180, 90], fc: 0.7, vib: [9, 1.2], a: 0.08, s: 0.5, d: 0.6, drive: 5, lp: [1400, 600] },
    { wave: 'saw', f: [184, 92], fc: 0.7, a: 0.08, s: 0.5, d: 0.6, drive: 5, lp: [1400, 600], vol: 0.7 },
    { wave: 'noise', f: 2500, a: 0.08, s: 0.5, d: 0.6, lp: 900, vol: 0.6 },
  ] },
  e_dragon_death: { cat: 'big', layers: [
    { wave: 'saw', f: [160, 40], fc: 0.8, vib: [7, 1.5], a: 0.05, s: 0.4, d: 0.9, drive: 5, lp: [1200, 300] },
    { wave: 'noise', f: 3000, a: 0.01, s: 0.3, d: 0.9, lp: [2500, 200], vol: 0.8 },
  ] },
  e_boss_death: { cat: 'big', gain: 0.9, layers: [
    { wave: 'noise', f: 5000, a: 0.002, s: 0.1, d: 0.7, lp: [3500, 200] },
    { wave: 'square', f: [400, 50], fc: 0.7, a: 0.005, s: 0.2, d: 0.6, lp: 1500, vol: 0.5 },
    { wave: 'sine', f: [90, 30], a: 0.002, s: 0.1, d: 0.6, vol: 0.9 },
  ] },
  boss_arrive: { cat: 'big', gap: 1, max: 1, pitch: 0, layers: [
    { wave: 'square', f: 147, arp: [[0.24, 0.84]], a: 0.02, s: 0.35, d: 0.5, lp: 1400, drive: 1.5, vol: 0.55 },
    { wave: 'square', f: 155.6, arp: [[0.24, 0.84]], a: 0.02, s: 0.35, d: 0.5, lp: 1400, vol: 0.35 },
    { wave: 'sine', f: [70, 45], a: 0.002, d: 0.6 },
    { wave: 'noise', f: 9000, a: 0.002, d: 0.6, hp: 3000, vol: 0.25 },
  ] },
  // Monster shots.
  e_arrow: { cat: 'tiny', layers: [
    { wave: 'triangle', f: [250, 200], vib: [30, 0.5], a: 0.001, d: 0.12, vol: 0.7 },
    { wave: 'noise', f: 8000, a: 0.001, d: 0.02, lp: 3000, vol: 0.4 },
  ] },
  e_star: { cat: 'tiny', layers: [
    { wave: 'square', f: [900, 1300], duty: 0.25, a: 0.001, d: 0.05, lp: 3500, vol: 0.5 },
    { wave: 'noise', f: 10000, a: 0.005, d: 0.05, hp: 2000, lp: 6000, vol: 0.5 },
  ] },
  e_bullet: { cat: 'tiny', max: 2, layers: [
    { wave: 'noise', f: 6000, a: 0.001, d: 0.04, lp: 2200 },
    { wave: 'square', f: [180, 80], a: 0.001, d: 0.035, lp: 1400, vol: 0.4 },
  ] },

  // ---------------------------------------------------------------- telegraphs (wind-up warnings) + their hits
  t_lunge: { cat: 'warn', gain: 0.75, layers: [
    { wave: 'square', f: [250, 700], fc: 1.5, duty: 0.25, a: 0.3, s: 0.05, d: 0.08, lp: 2500, vol: 0.6 },
  ] },
  t_laser: { cat: 'warn', layers: [
    { wave: 'saw', f: [300, 1400], fc: 2, a: 0.5, s: 0.05, d: 0.05, lp: 2500, trem: [20, 0.3], vol: 0.5 },
  ] },
  t_frost: { cat: 'warn', layers: [
    { wave: 'triangle', f: [800, 1800], vib: [14, 0.5], a: 0.5, s: 0.05, d: 0.05, vol: 0.6 },
    { wave: 'noise', f: 14000, a: 0.5, d: 0.05, hp: 4000, lp: 8000, vol: 0.2 },
  ] },
  t_minigun_spin: { cat: 'warn', layers: [
    { wave: 'saw', f: [60, 260], fc: 1.5, a: 0.6, s: 0.05, d: 0.05, trem: [30, 0.6], lp: 1500, vol: 0.8 },
  ] },
  t_zap: { cat: 'warn', layers: [
    { wave: 'noise', f: 3000, a: 0.4, s: 0.05, d: 0.05, lp: 3000, trem: [25, 0.9], vol: 0.5 },
    { wave: 'saw', f: [200, 500], a: 0.4, s: 0.05, d: 0.05, lp: 1500, vol: 0.25 },
  ] },
  t_fan: { cat: 'warn', layers: [
    { wave: 'square', f: [600, 1100], duty: 0.125, a: 0.35, d: 0.1, lp: 3000, vol: 0.4 },
  ] },
  t_slam: { cat: 'warn', layers: [
    { wave: 'noise', f: 800, a: 0.7, s: 0.05, d: 0.1, lp: [150, 500] },
    { wave: 'sine', f: [40, 70], a: 0.7, s: 0.05, d: 0.1, vol: 0.6 },
  ] },
  t_dragon_inhale: { cat: 'warn', gain: 1.2, layers: [
    { wave: 'noise', f: 6000, a: 0.7, s: 0.05, d: 0.1, lp: [400, 2500], vol: 0.8 },
  ] },
  t_summon: { cat: 'warn', layers: [
    { wave: 'triangle', f: 220, arp: [[0.15, 1.19], [0.3, 1.19], [0.45, 1.19]], vib: [6, 0.3], a: 0.05, s: 0.6, d: 0.2, vol: 0.6 },
    { wave: 'square', f: 110, duty: 0.125, a: 0.1, s: 0.6, d: 0.2, lp: 800, vol: 0.3 },
  ] },
  a_dash: { cat: 'attack', layers: [
    { wave: 'noise', f: 10000, a: 0.01, d: 0.2, lp: [2000, 600], hp: 200 },
  ] },
  a_laser: { cat: 'attack', layers: [
    { wave: 'square', f: [1400, 500], duty: 0.25, a: 0.002, s: 0.05, d: 0.2, lp: 4000, vol: 0.6 },
    { wave: 'saw', f: [700, 250], a: 0.002, s: 0.05, d: 0.2, lp: 2500, vol: 0.5 },
  ] },
  a_frost: { cat: 'attack', layers: [
    { wave: 'noise', f: 12000, a: 0.002, s: 0.05, d: 0.25, hp: 3000, lp: 9000, vol: 0.6 },
    { wave: 'triangle', f: [2400, 900], a: 0.002, s: 0.05, d: 0.25, vol: 0.5 },
  ] },
  a_zap: { cat: 'attack', layers: [
    { wave: 'saw', f: [1200, 300], vib: [50, 4], crush: 5, a: 0.002, s: 0.03, d: 0.15, lp: 4000, vol: 0.6 },
    { wave: 'noise', f: 6000, a: 0.002, d: 0.15, lp: 5000, vol: 0.5 },
  ] },
  a_fan: { cat: 'attack', layers: [
    { wave: 'noise', f: 12000, a: 0.005, d: 0.12, hp: 1500, lp: 6000, vol: 0.7 },
    { wave: 'noise', f: 12000, a: 0.005, d: 0.12, delay: 0.03, hp: 1500, lp: 6000, vol: 0.6, seed: 5 },
    { wave: 'noise', f: 12000, a: 0.005, d: 0.12, delay: 0.06, hp: 1500, lp: 6000, vol: 0.5, seed: 9 },
  ] },
  a_slam: { cat: 'attack', gain: 1.2, layers: [
    { wave: 'sine', f: [120, 35], a: 0.002, s: 0.04, d: 0.35 },
    { wave: 'noise', f: 3000, a: 0.002, d: 0.3, lp: [2000, 200], vol: 0.7 },
  ] },
  a_dragon_fire: { cat: 'big', gain: 0.8, max: 1, gap: 0.5, layers: [
    { wave: 'noise', f: 3500, a: 0.05, s: 0.9, d: 0.45, lp: [900, 1800], trem: [12, 0.3] },
    { wave: 'noise', f: 700, a: 0.05, s: 0.9, d: 0.45, lp: 300, vol: 0.8 },
  ] },
  a_summon: { cat: 'attack', layers: [
    { wave: 'noise', f: 3000, a: 0.05, s: 0.1, d: 0.3, lp: [300, 1500], vol: 0.7 },
    { wave: 'triangle', f: [200, 600], vib: [8, 0.5], a: 0.02, s: 0.1, d: 0.3, vol: 0.6 },
  ] },

  // ---------------------------------------------------------------- pickups, drinks, shops, banners
  pickup_bottle: { cat: 'pickup', layers: [
    { wave: 'triangle', f: 2093, a: 0.001, d: 0.1, vol: 0.5 },
    { wave: 'triangle', f: 2637, a: 0.001, d: 0.08, delay: 0.015, vol: 0.35 },
    { wave: 'square', f: 988, arp: [[0.06, 1.335]], a: 0.001, s: 0.06, d: 0.12, delay: 0.05, lp: 4000, vol: 0.4 },
  ] },
  beer_good: { cat: 'pickup', pitch: 0, layers: [
    { wave: 'square', f: 523, arp: [[0.08, 1.26], [0.16, 1.19]], a: 0.002, s: 0.25, d: 0.15, lp: 3000, vol: 0.5 },
    { wave: 'triangle', f: 261.6, arp: [[0.08, 1.26], [0.16, 1.19]], a: 0.002, s: 0.25, d: 0.15, vol: 0.5 },
  ] },
  beer_bad: { cat: 'pickup', pitch: 0, layers: [
    { wave: 'square', f: 392, arp: [[0.12, 0.944], [0.24, 0.944]], vib: [5, 0.4], a: 0.005, s: 0.35, d: 0.2, lp: 1500, vol: 0.6 },
    { wave: 'triangle', f: 196, arp: [[0.12, 0.944], [0.24, 0.944]], a: 0.005, s: 0.35, d: 0.2, vol: 0.4 },
  ] },
  joint_dicht: { cat: 'pickup', gain: 1.2, pitch: 0, layers: [
    { wave: 'square', f: [200, 800], fc: 0.5, duty: 0.25, vib: [4, 2], a: 0.1, s: 0.5, d: 0.6, lp: [800, 2500], vol: 0.5 },
    { wave: 'triangle', f: [400, 1600], fc: 0.5, vib: [6, 3], a: 0.1, s: 0.5, d: 0.6, vol: 0.4 },
  ] },
  drink_special: { cat: 'pickup', pitch: 0, layers: [
    { wave: 'sine', f: [300, 200], a: 0.01, s: 0.25, d: 0.05, trem: [12, 1], vol: 0.7 },
    { wave: 'square', f: 659, arp: [[0.1, 1.335]], a: 0.002, s: 0.12, d: 0.2, delay: 0.3, lp: 3000, vol: 0.5 },
  ] },
  pfand_big: { cat: 'pickup', gain: 1.3, pitch: 0, gap: 0.2, layers: [
    { wave: 'noise', f: 9000, a: 0.001, d: 0.05, hp: 2000, vol: 0.4 },
    { wave: 'square', f: 1319, a: 0.001, s: 0.05, d: 0.3, delay: 0.06, lp: 5000, vol: 0.5 },
    { wave: 'square', f: 1760, a: 0.001, d: 0.4, delay: 0.12, lp: 5000, vol: 0.5 },
    { wave: 'triangle', f: 2637, a: 0.001, d: 0.4, delay: 0.12, vol: 0.3 },
  ] },
  shop_open: { cat: 'ui', pitch: 0, layers: [
    { wave: 'triangle', f: 1319, a: 0.001, d: 0.4, vol: 0.6 },
    { wave: 'triangle', f: 988, a: 0.001, d: 0.5, delay: 0.12, vol: 0.6 },
  ] },
  shop_buy: { cat: 'ui', gain: 1.3, pitch: 0, layers: [
    { wave: 'noise', f: 9000, a: 0.001, d: 0.05, hp: 2000, vol: 0.4 },
    { wave: 'square', f: 1319, a: 0.001, s: 0.05, d: 0.3, delay: 0.06, lp: 5000, vol: 0.5 },
    { wave: 'square', f: 1760, a: 0.001, d: 0.4, delay: 0.12, lp: 5000, vol: 0.5 },
    { wave: 'triangle', f: 2637, a: 0.001, d: 0.4, delay: 0.12, vol: 0.3 },
  ] },
  shop_deny: { cat: 'ui', gain: 0.7, pitch: 0, layers: [
    { wave: 'square', f: 110, a: 0.005, s: 0.18, d: 0.05, lp: 1200, vol: 0.7 },
    { wave: 'square', f: 116, a: 0.005, s: 0.18, d: 0.05, lp: 1200, vol: 0.5 },
  ] },
  shop_equip: { cat: 'ui', pitch: 0, layers: [
    { wave: 'square', f: 880, a: 0.001, d: 0.05, lp: 3000, vol: 0.5 },
    { wave: 'square', f: 1320, a: 0.001, d: 0.05, delay: 0.04, lp: 3000, vol: 0.4 },
  ] },
  ui_move: { cat: 'ui', gain: 0.6, pitch: 0, layers: [
    { wave: 'square', f: 1200, a: 0.001, d: 0.025, lp: 3000, vol: 0.5 },
  ] },
  banner: { cat: 'ui', gain: 1.2, pitch: 0, gap: 0.5, layers: [
    { wave: 'noise', f: 9000, a: 0.08, d: 0.25, lp: [800, 4000], hp: 300, vol: 0.6 },
    { wave: 'square', f: 220, arp: [[0.1, 1.5]], a: 0.002, s: 0.1, d: 0.2, lp: 2000, vol: 0.5 },
  ] },

  // ---------------------------------------------------------------- player
  player_hurt: { cat: 'player', gap: 0.15, layers: [
    { wave: 'square', f: [440, 180], a: 0.002, s: 0.03, d: 0.12, lp: 2200, vol: 0.7 },
    { wave: 'noise', f: 4000, a: 0.001, d: 0.06, lp: 2500, vol: 0.5 },
    { wave: 'sine', f: [150, 60], a: 0.001, d: 0.1, vol: 0.7 },
  ] },
  player_death: { cat: 'player', pitch: 0, layers: [
    { wave: 'square', f: [523, 65], fc: 0.6, vib: [6, 0.5], a: 0.01, s: 0.3, d: 0.9, lp: [2500, 600], vol: 0.7 },
    { wave: 'sine', f: [130, 40], a: 0.01, s: 0.3, d: 0.8, vol: 0.6 },
    { wave: 'noise', f: 2000, a: 0.01, d: 0.6, lp: 600, vol: 0.3 },
  ] },
  heartbeat: { cat: 'player', gain: 0.8, gap: 0.3, pitch: 0, layers: [
    { wave: 'sine', f: [70, 45], a: 0.003, d: 0.12 },
    { wave: 'sine', f: [65, 42], a: 0.003, d: 0.14, delay: 0.16, vol: 0.8 },
  ] },
  player_burn: { cat: 'player', gain: 0.6, gap: 1, layers: [
    { wave: 'noise', f: 4000, a: 0.02, d: 0.3, lp: [800, 2000], vol: 0.7 },
  ] },

  // ---------------------------------------------------------------- crew calls
  crew_jet: { cat: 'big', gain: 0.9, max: 1, gap: 0.5, pitch: 0.3, layers: [
    { wave: 'noise', f: 10000, a: 0.5, s: 0.3, d: 0.8, lp: [900, 2500], hp: 300 },
    { wave: 'noise', f: 1500, a: 0.5, s: 0.3, d: 0.8, lp: 400, vol: 0.8 },
    { wave: 'saw', f: [520, 380], a: 0.5, s: 0.3, d: 0.8, lp: 1200, vol: 0.15 },
  ] },
  crew_bomb_whistle: { cat: 'big', gain: 0.35, max: 2, gap: 0.12, layers: [
    { wave: 'sine', f: [1700, 700], a: 0.02, s: 0.3, d: 0.15, vol: 0.8 },
  ] },
  crew_explosion: { cat: 'big', gain: 0.85, max: 4, gap: 0.07, pitch: 1.5, layers: [
    { wave: 'noise', f: 6000, a: 0.002, s: 0.08, d: 0.7, lp: [3500, 200] },
    { wave: 'sine', f: [100, 30], a: 0.002, s: 0.06, d: 0.6 },
    { wave: 'noise', f: 2500, a: 0.002, d: 0.8, lp: 900, vol: 0.6 },
  ] },
  crew_bifrost: { cat: 'big', gain: 0.8, pitch: 0, layers: [
    { wave: 'triangle', f: 523, arp: [[0.1, 1.26], [0.2, 1.19], [0.3, 1.335], [0.4, 1.26], [0.5, 1.19]], vib: [7, 0.2], a: 0.01, s: 0.7, d: 0.5, vol: 0.6 },
    { wave: 'square', f: 1046, duty: 0.125, arp: [[0.1, 1.26], [0.2, 1.19], [0.3, 1.335], [0.4, 1.26], [0.5, 1.19]], a: 0.01, s: 0.7, d: 0.5, lp: 4000, vol: 0.25 },
    { wave: 'noise', f: 16000, a: 0.3, s: 0.4, d: 0.5, hp: 6000, vol: 0.15 },
  ] },
  crew_god: { cat: 'big', gain: 0.7, layers: [
    { wave: 'noise', f: 2000, a: 0.005, s: 0.1, d: 0.6, lp: [3000, 300] },
    { wave: 'triangle', f: [880, 440], a: 0.005, d: 0.3, vol: 0.3 },
  ] },
  crew_dig: { cat: 'attack', gain: 0.8, gap: 0.2, layers: [
    { wave: 'noise', f: 3000, a: 0.002, d: 0.09, lp: 1800 },
    { wave: 'square', f: [300, 150], a: 0.001, d: 0.04, lp: 1200, vol: 0.5 },
    { wave: 'noise', f: 800, a: 0.002, d: 0.1, delay: 0.03, lp: 500, vol: 0.6 },
  ] },
  crew_hole_open: { cat: 'big', layers: [
    { wave: 'noise', f: 1000, a: 0.01, s: 0.2, d: 0.7, lp: [1500, 150] },
    { wave: 'sine', f: [70, 30], a: 0.01, s: 0.2, d: 0.6, vol: 0.8 },
  ] },
  crew_demon_roar: { cat: 'big', pitch: 0, layers: [
    { wave: 'saw', f: [90, 70], fc: 0.5, vib: [7, 1.5], a: 0.1, s: 0.6, d: 0.6, drive: 6, lp: [700, 1400] },
    { wave: 'saw', f: [92.5, 71], fc: 0.5, a: 0.1, s: 0.6, d: 0.6, drive: 6, lp: [700, 1400], vol: 0.8 },
    { wave: 'noise', f: 1500, a: 0.1, s: 0.6, d: 0.6, lp: 600, vol: 0.5 },
  ] },
  crew_stomp: { cat: 'attack', gain: 0.8, gap: 0.2, layers: [
    { wave: 'sine', f: [70, 35], a: 0.002, d: 0.2 },
    { wave: 'noise', f: 800, a: 0.002, d: 0.15, lp: 300, vol: 0.5 },
  ] },
  crew_flame: { cat: 'big', gain: 0.5, max: 2, gap: 0.3, layers: [
    { wave: 'noise', f: 4000, a: 0.1, s: 0.35, d: 0.25, lp: [800, 1500], trem: [13, 0.35] },
    { wave: 'noise', f: 700, a: 0.1, s: 0.35, d: 0.25, lp: 300, vol: 0.7 },
  ] },
  crew_fire_finale: { cat: 'big', pitch: 0, layers: [
    { wave: 'noise', f: 5000, a: 0.05, s: 0.2, d: 0.9, lp: [500, 2500] },
    { wave: 'noise', f: 600, a: 0.02, s: 0.2, d: 0.8, lp: 300, vol: 0.8 },
  ] },
  crew_inject: { cat: 'attack', pitch: 0, layers: [
    { wave: 'noise', f: 12000, a: 0.005, s: 0.1, d: 0.1, hp: 4000, vol: 0.5 },
    { wave: 'square', f: [200, 900], fc: 0.5, duty: 0.25, a: 0.01, s: 0.1, d: 0.2, delay: 0.2, lp: 2000, vol: 0.5 },
  ] },
  crew_hulk_roar: { cat: 'big', pitch: 0, layers: [
    { wave: 'saw', f: [150, 95], fc: 0.6, vib: [8, 2], a: 0.05, s: 0.5, d: 0.5, drive: 7, lp: 1600 },
    { wave: 'saw', f: [75, 48], fc: 0.6, a: 0.05, s: 0.5, d: 0.5, drive: 5, lp: 700, vol: 0.8 },
    { wave: 'noise', f: 3000, a: 0.05, s: 0.5, d: 0.5, lp: 1200, vol: 0.4 },
  ] },
  crew_disco: { cat: 'big', gain: 0.6, pitch: 0, layers: [
    { wave: 'square', f: 1046, duty: 0.125, arp: [[0.08, 1.122], [0.16, 1.122], [0.24, 1.06], [0.32, 1.122], [0.4, 1.122], [0.48, 1.122]], a: 0.01, s: 0.5, d: 0.3, lp: 4000, vol: 0.4 },
    { wave: 'triangle', f: 523, arp: [[0.08, 1.122], [0.16, 1.122], [0.24, 1.06], [0.32, 1.122], [0.4, 1.122], [0.48, 1.122]], a: 0.01, s: 0.5, d: 0.3, vol: 0.4 },
    { wave: 'noise', f: 16000, a: 0.01, s: 0.5, d: 0.3, hp: 6000, trem: [8, 1], vol: 0.15 },
  ] },
  crew_crowd: { cat: 'big', gain: 0.55, max: 1, gap: 1, pitch: 0, layers: [
    { wave: 'noise', f: 5000, a: 0.3, s: 0.6, d: 0.9, lp: [1200, 2500], hp: 300, trem: [6, 0.3] },
    { wave: 'noise', f: 900, a: 0.3, s: 0.6, d: 0.9, lp: 600, trem: [4.7, 0.3], vol: 0.6 },
  ] },
  crew_crash: { cat: 'attack', max: 3, gap: 0.08, layers: [
    { wave: 'sine', f: [140, 50], a: 0.001, d: 0.15 },
    { wave: 'noise', f: 4000, a: 0.001, d: 0.12, lp: 2500, vol: 0.8 },
    { wave: 'square', f: [250, 120], a: 0.001, d: 0.08, lp: 1200, vol: 0.4 },
  ] },
  crew_swing: { cat: 'attack', gain: 0.7, layers: [
    { wave: 'noise', f: 12000, a: 0.02, d: 0.12, hp: 600, lp: [1500, 4500] },
    { wave: 'sine', f: [110, 60], a: 0.002, d: 0.06, vol: 0.5 },
  ] },
  crew_punch: { cat: 'attack', gain: 0.7, layers: [
    { wave: 'sine', f: [180, 55], a: 0.001, s: 0.015, d: 0.08 },
    { wave: 'noise', f: 6000, a: 0.001, d: 0.03, lp: 2500, vol: 0.5 },
  ] },
  crew_slam: { cat: 'attack', gain: 1.2, layers: [
    { wave: 'sine', f: [110, 30], a: 0.002, s: 0.05, d: 0.4 },
    { wave: 'noise', f: 3000, a: 0.002, d: 0.35, lp: [2500, 200], vol: 0.8 },
  ] },
  crew_dash: { cat: 'attack', layers: [
    { wave: 'noise', f: 10000, a: 0.01, d: 0.22, lp: [2500, 700], hp: 200 },
    { wave: 'sine', f: [90, 50], a: 0.002, d: 0.1, vol: 0.5 },
  ] },
  crew_lightning: { cat: 'attack', gain: 1.2, layers: [
    { wave: 'noise', f: 9000, a: 0.001, s: 0.02, d: 0.4, lp: [7000, 600] },
    { wave: 'saw', f: [1500, 200], vib: [60, 5], crush: 5, a: 0.001, d: 0.15, vol: 0.5 },
  ] },
  crew_ravens: { cat: 'attack', gain: 0.7, layers: [
    { wave: 'saw', f: [700, 520], vib: [30, 1.5], a: 0.01, s: 0.06, d: 0.1, lp: 2200, drive: 2 },
    { wave: 'saw', f: [650, 480], vib: [30, 1.5], a: 0.01, s: 0.06, d: 0.1, delay: 0.17, lp: 2200, drive: 2, vol: 0.8 },
  ] },
};

// Which sound each weapon makes when it fires/swings, keyed by its art name (WEAPONS[id].sprite; the
// Mexikaner's fire breath has no sprite, so its fx key).
export const WEAPON_SFX = {
  fist: 'w_fist',
  weapon_metzgerbeil: 'w_cleaver',
  ninja_star: 'w_ninja_star',
  weapon_mjolnir: 'w_mjolnir',
  weapon_doener: 'w_doener',
  weapon_eimer: 'w_eimer',
  weapon_bogen: 'w_bow',
  weapon_samurai_schwert: 'w_katana',
  weapon_lichtschwert: 'w_saber',
  weapon_harley_benton: 'w_guitar',
  weapon_minigun: 'w_minigun',
  weapon_kettensaege: 'w_chainsaw',
  weapon_bumerang: 'w_boomerang',
  weapon_pfeffi: 'w_pfeffi_throw',
  weapon_ruder: 'w_oar',
  weapon_mercedes_sterne: 'w_mercedes',
  weapon_zauberstab: 'w_wand',
  weapon_feuerwand: 'w_firewall',
  weapon_claymore: 'w_claymore_drop',
  helmet_horned: 'w_horns',
  fx_firebreath: 'w_firebreath',
};

// Per monster family: hurt (weapon hit), death, spawn (big/rare ones only). Missing = ENEMY_SFX.default.
// Bosses of a family use BOSS_SFX for hurt/death unless the family is marked own (its sounds are boss-sized).
export const ENEMY_SFX = {
  default: { hurt: 'e_hit', death: 'e_death' },
  skeleton: { hurt: 'e_skel_hurt', death: 'e_skel_death' },
  goblin: { hurt: 'e_goblin_hurt', death: 'e_goblin_death' },
  zombie: { hurt: 'e_zombie_hurt', death: 'e_zombie_death' },
  ogre: { hurt: 'e_ogre_hurt', death: 'e_ogre_death' },
  werewolf: { hurt: 'e_wolf_hurt', death: 'e_wolf_death', spawn: 'e_wolf_howl' },
  clay_golem: { hurt: 'e_golem_hurt', death: 'e_golem_death', spawn: 'e_golem_spawn' },
  iron_golem: { hurt: 'e_golem_hurt', death: 'e_golem_death', spawn: 'e_golem_spawn' },
  terminator: { hurt: 'e_servo', death: 'e_term_death' },
  terminator_elite: { hurt: 'e_servo', death: 'e_term_death' },
  wizard: { hurt: 'e_hit', death: 'e_wizard_death' },
  battlemage: { hurt: 'e_hit', death: 'e_wizard_death' },
  necromancer: { hurt: 'e_hit', death: 'e_wizard_death' },
  knight: { hurt: 'e_knight_hurt', death: 'e_knight_death' },
  ninja: { hurt: 'e_ninja_hurt', death: 'e_death' },
  horned_demon: { hurt: 'e_demon_hurt', death: 'e_demon_death' },
  dragon: { hurt: 'e_big_hurt', death: 'e_dragon_death', spawn: 'e_dragon_roar', own: true },
  skinhead: { hurt: 'e_hit', death: 'e_death' },
  monopoly_man: { hurt: 'e_hit', death: 'e_death', steal: 'e_coin_steal' },
  eigenbedarf_boss: { hurt: 'e_big_hurt', death: 'e_boss_death', own: true },
};

// Kill-count bosses: these on top of their family (spawn: only if the family has no spawn sound).
export const BOSS_SFX = { hurt: 'e_big_hurt', death: 'e_boss_death', spawn: 'boss_arrive' };

// Monster abilities (Abilities.js): warn = when the wind-up telegraph starts, hit = when it goes off.
// ABILITY_SFX_FAMILY overrides per family (same shape).
export const ABILITY_SFX = {
  lunge: { warn: 't_lunge', hit: 'a_dash' },
  beam: { warn: 't_laser', hit: 'a_laser' },
  burst: { warn: 't_minigun_spin', hit: null }, // each bullet plays e_bullet
  zap: { warn: 't_zap', hit: 'a_zap' },
  fan: { warn: 't_fan', hit: 'a_fan' },
  slam: { warn: 't_slam', hit: 'a_slam' },
  cone: { warn: 't_dragon_inhale', hit: 'a_dragon_fire' },
  summon: { warn: 't_summon', hit: 'a_summon' },
  howl: { warn: null, hit: 'e_wolf_howl' },
  // Eigenbedarf boss attacks (data/enemies.js EIGENBEDARF.attacks kinds).
  line: { warn: 't_lunge', hit: 'a_dash' },
  circle: { warn: 't_slam', hit: 'a_slam' },
};
export const ABILITY_SFX_FAMILY = {
  wizard: { beam: { warn: 't_frost', hit: 'a_frost' } },
  werewolf: { howl: { warn: 'e_wolf_howl', hit: null } },
};

// Monster projectiles by kind (EnemyProjectiles.fire).
export const SHOT_SFX = { arrow: 'e_arrow', ninja_star: 'e_star', bullet: 'e_bullet' };

// Crew ally attacks by kind (allyAttacks.js; 'circle' plays in CrewFx.slam).
export const ALLY_ATTACK_SFX = {
  arc: 'crew_swing', circle: 'crew_slam', line: 'crew_swing', dash: 'crew_dash', single: 'crew_punch',
  lightning: 'crew_lightning', ravens: 'crew_ravens',
};

// Announcer voice lines (assets/audio/voice/<id>.wav) per champion: [first banner, banner2].
export const CREW_VOICES = {
  mike: ['danger_close', 'mike_drop'],
  johnny: ['bifrost', 'cage_fight'],
  danny: [null, 'too_deep'],
  hannah: ['hannabolika', null],
  hans: ['huns_arrived', null],
  lars: ['schubsentanz', null],
};

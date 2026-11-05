import { Audio } from './AudioEngine.js';
import { renderPreset } from './sfxSynth.js';
import {
  SFX, SFX_CATS, SFX_CONFIG, WEAPON_SFX, ENEMY_SFX, BOSS_SFX, ABILITY_SFX, ABILITY_SFX_FAMILY, CREW_VOICES, SHOT_SFX,
  ALLY_ATTACK_SFX,
} from '../data/sfx.js';

const IDS = Object.keys(SFX);
// Warm-up order: the most frequent sounds first.
const WARM_ORDER = [...new Set([...SFX_CONFIG.warmFirst.filter((id) => SFX[id]), ...IDS])];

// Procedural sound effects: every preset (data/sfx.js) is rendered once into an AudioBuffer (lazily, and
// pre-warmed in small chunks after the audio unlock) and played as a one-shot AudioBufferSourceNode into
// Audio.sfxBus through one of a few pre-built stereo panners. Voice limits per sound, per category and in
// total (+ a min interval per sound) keep 180 monsters from turning into noise soup.
// Everything is a no-op while Audio.ctx is null (before the first click, or no WebAudio).
class SfxPlayer {
  constructor() {
    this.ctx = null;
    this.cam = null;
    this.buffers = {};
    this.panners = [];
    this.sounds = {}; // id -> { preset, cat, ends: Float64Array, last, gap, pitch }
    this.cats = {}; // cat -> { ends, prio }
    for (const [name, c] of Object.entries(SFX_CATS)) this.cats[name] = { ends: new Float64Array(c.max), prio: c.prio || 0 };
    for (const id of IDS) {
      const p = SFX[id];
      const c = SFX_CATS[p.cat];
      this.sounds[id] = {
        preset: p,
        peak: c.peak * (p.gain ?? 1),
        cat: this.cats[p.cat],
        ends: new Float64Array(p.max ?? c.max),
        last: -Infinity,
        gap: p.gap ?? c.gap,
        pitch: p.pitch ?? SFX_CONFIG.pitch,
      };
    }
    this.ends = new Float64Array(SFX_CONFIG.maxVoices); // all voices
    this.srcs = new Array(SFX_CONFIG.maxVoices).fill(null);
    // Per global voice: which sound + its own/category slot, so a stolen voice frees those too.
    this.slotSound = new Array(SFX_CONFIG.maxVoices).fill(null);
    this.slotOwn = new Int16Array(SFX_CONFIG.maxVoices);
    this.slotCat = new Int16Array(SFX_CONFIG.maxVoices);
    this.failures = 0;
    this.disabled = false;
    this.beatT = 0;
    this.loopT = {}; // sfx.loop timers by id
    this.warmIdx = 0;
  }

  // The camera whose view decides the stereo position (GameScene.create).
  attach(camera) {
    this.cam = camera;
  }

  // Plays sound `id`; x = world x of the source (optional, pans left/right on screen).
  // Never throws into game code: after SFX_CONFIG.maxFailures errors, effects stay off for the session.
  play(id, x) {
    if (!id || this.disabled || !Audio.ctx) return;
    try {
      this.start(id, x);
    } catch (e) {
      if (++this.failures >= SFX_CONFIG.maxFailures) this.disabled = true;
      console.warn('sfx', id, e);
    }
  }

  start(id, x) {
    const ctx = Audio.ctx;
    if (ctx !== this.ctx && !this.bind(ctx)) return;
    const s = this.sounds[id];
    if (!s) return;
    const now = ctx.currentTime;
    if (now - s.last < s.gap) return;
    const own = freeSlot(s.ends, now);
    const cat = freeSlot(s.cat.ends, now);
    if (own < 0 || cat < 0) return;
    let slot = freeSlot(this.ends, now);
    if (slot < 0) {
      if (!s.cat.prio) return;
      slot = oldest(this.ends);
      this.steal(slot, now);
    }
    const buf = this.buffers[id] || this.render(id);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const rate = s.pitch > 0 ? Math.pow(2, ((Math.random() * 2 - 1) * s.pitch) / 12) : 1;
    src.playbackRate.value = rate;
    src.connect(this.panner(x));
    src.start(now);
    const end = now + buf.duration / rate;
    s.last = now;
    s.ends[own] = end;
    s.cat.ends[cat] = end;
    this.ends[slot] = end;
    this.srcs[slot] = src;
    this.slotSound[slot] = s;
    this.slotOwn[slot] = own;
    this.slotCat[slot] = cat;
  }

  // Stops the voice in global slot `slot` and frees its per-sound and per-category slots (if they still
  // belong to it: same end time).
  steal(slot, now) {
    const end = this.ends[slot];
    try { this.srcs[slot]?.stop(); } catch (e) { /* already ended */ }
    const s = this.slotSound[slot];
    if (s) {
      if (s.ends[this.slotOwn[slot]] === end) s.ends[this.slotOwn[slot]] = now;
      if (s.cat.ends[this.slotCat[slot]] === end) s.cat.ends[this.slotCat[slot]] = now;
    }
    this.ends[slot] = now;
    this.srcs[slot] = null;
    this.slotSound[slot] = null;
  }

  // ---- helpers for the call sites (lookups in data/sfx.js) ----

  weapon(stats, x) {
    this.play(WEAPON_SFX[stats.sfx || stats.sprite || stats.fx], x);
  }

  // event: 'hurt' | 'death' | 'spawn' | 'steal' (data: ENEMY_SFX, BOSS_SFX).
  enemy(family, event, x, boss = false) {
    if (!Audio.ctx) return;
    const t = ENEMY_SFX[family];
    let id = t?.[event];
    if (boss && (event === 'spawn' ? !id : !t?.own)) id = BOSS_SFX[event];
    this.play(id || ENEMY_SFX.default[event], x);
  }

  // Ability sound: phase 'warn' (telegraph starts) or 'hit'.
  ability(family, kind, phase, x) {
    if (!Audio.ctx) return;
    const fam = ABILITY_SFX_FAMILY[family]?.[kind];
    this.play((fam || ABILITY_SFX[kind])?.[phase], x);
  }

  // Monster projectile fired (EnemyProjectiles kinds).
  shot(kind, x) {
    this.play(SHOT_SFX[kind], x);
  }

  // Crew ally attack (data/champions.js attack shapes).
  ally(atk, x) {
    this.play(ALLY_ATTACK_SFX[atk.dash ? 'dash' : atk.kind], x);
  }

  // Call every frame while something continuous runs: replays `id` every SFX_CONFIG.loops[id] seconds.
  loop(id, dt, x) {
    const t = (this.loopT[id] || 0) - dt;
    if (t > 0) {
      this.loopT[id] = t;
      return;
    }
    this.loopT[id] = SFX_CONFIG.loops[id] || 0.5;
    this.play(id, x);
  }

  // Low-HP heartbeat; call every frame with the HP fraction (faster the lower it gets).
  heartbeat(dt, hpFrac) {
    const hb = SFX_CONFIG.heartbeat;
    if (hpFrac <= 0 || hpFrac >= hb.below) {
      this.beatT = 0;
      return;
    }
    this.beatT -= dt;
    if (this.beatT > 0) return;
    const k = hpFrac / hb.below;
    this.beatT = hb.fastSec + (hb.slowSec - hb.fastSec) * k;
    this.play('heartbeat');
  }

  // Announcer line for champion `champ`'s banner (0 = first, 1 = banner2), see CREW_VOICES.
  crewVoice(champ, which) {
    const id = CREW_VOICES[champ]?.[which];
    if (id && Audio.ctx && Audio.voice) Audio.voice.play(id);
  }

  // ---- internals ----

  bind(ctx) {
    const bus = Audio.sfxBus;
    if (!bus) return false;
    this.ctx = ctx;
    this.buffers = {};
    this.ends.fill(0);
    this.srcs.fill(null);
    this.slotSound.fill(null);
    for (const id of IDS) {
      this.sounds[id].ends.fill(0);
      this.sounds[id].last = -Infinity;
    }
    for (const c of Object.values(this.cats)) c.ends.fill(0);
    this.panners.length = 0;
    const n = SFX_CONFIG.panSteps;
    if (typeof ctx.createStereoPanner === 'function' && n > 1) {
      for (let i = 0; i < n; i++) {
        const p = ctx.createStereoPanner();
        p.pan.value = (i / (n - 1) * 2 - 1) * SFX_CONFIG.maxPan;
        p.connect(bus);
        this.panners.push(p);
      }
    }
    this.bus = bus;
    this.warmIdx = 0;
    this.warm();
    return true;
  }

  // Renders the remaining presets (most frequent first) within a small time budget per idle tick, so the
  // first use of a sound doesn't hitch and phones don't stutter. One preset is the smallest unit.
  warm() {
    if (!this.ctx || this.disabled || this.warmIdx >= WARM_ORDER.length) return;
    const ctx = this.ctx;
    const until = clockMs() + SFX_CONFIG.warmBudgetMs;
    try {
      while (this.warmIdx < WARM_ORDER.length && clockMs() < until) {
        const id = WARM_ORDER[this.warmIdx++];
        if (!this.buffers[id]) this.render(id);
      }
    } catch (e) {
      this.disabled = true; // can't create buffers at all: no effects this session
      console.warn('sfx warm-up', e);
      return;
    }
    const next = () => { if (this.ctx === ctx) this.warm(); };
    if (typeof requestIdleCallback === 'function') requestIdleCallback(next, { timeout: 200 });
    else setTimeout(next, 0);
  }

  render(id) {
    const sr = SFX_CONFIG.sampleRate;
    const s = this.sounds[id];
    const data = renderPreset(s.preset, sr, s.peak, SFX_CONFIG);
    const buf = this.ctx.createBuffer(1, data.length, sr);
    buf.getChannelData(0).set(data); // copyToChannel is missing in old Safari
    this.buffers[id] = buf;
    return buf;
  }

  panner(x) {
    const ps = this.panners;
    if (!ps.length) return this.bus;
    const v = this.cam?.worldView;
    if (x === undefined || !v || !(v.width > 0)) return ps[ps.length >> 1];
    let rel = (x - v.centerX) / (v.width / 2);
    rel = rel < -1 ? -1 : rel > 1 ? 1 : rel;
    return ps[Math.round(((rel + 1) / 2) * (ps.length - 1))];
  }
}

const clockMs = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

function freeSlot(ends, t) {
  for (let i = 0; i < ends.length; i++) if (ends[i] <= t) return i;
  return -1;
}

function oldest(ends) {
  let best = 0;
  for (let i = 1; i < ends.length; i++) if (ends[i] < ends[best]) best = i;
  return best;
}

export const sfx = new SfxPlayer();

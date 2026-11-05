import { AUDIO } from '../data/audio.js';




const NOTE_RE = /^([A-G])([#b]?)(-?\d)$/;
const SEMI = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const DRUM_IDS = new Set(Object.keys(AUDIO.drums));

export function noteToMidi(tok) {
  const m = NOTE_RE.exec(tok);
  if (!m) return null;
  return 12 * (Number(m[3]) + 1) + SEMI[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
}

const midiToHz = (m) => 440 * 2 ** ((m - 69) / 12);

// Freeze an AudioParam at its current value before scheduling a new ramp (no jump back mid-ramp).
export function holdParam(param, now) {
  if (param.cancelAndHoldAtTime) {
    param.cancelAndHoldAtTime(now);
  } else {
    param.cancelScheduledValues(now);
    param.setValueAtTime(param.value, now);
  }
}
const num = (v, d) => (Number.isFinite(v) ? v : d);

function tokens(pattern) {
  return typeof pattern === 'string' ? pattern.replace(/\|/g, ' ').split(/\s+/).filter(Boolean) : [];
}

// Melodic track: event at the step a note/chord starts, { freqs, steps }. '-' holds, '.' rests.
function compileMelodic(toks, semis, warn) {
  const out = new Array(toks.length).fill(null);
  let cur = null;
  toks.forEach((tok, i) => {
    if (tok === '-') {
      if (cur) cur.steps++;
      return;
    }
    cur = null;
    if (tok === '.') return;
    const freqs = [];
    for (const part of tok.split('+')) {
      const m = noteToMidi(part);
      if (m === null) warn(`bad note "${part}"`);
      else freqs.push(midiToHz(m + semis));
    }
    if (freqs.length) cur = out[i] = { freqs, steps: 1 };
  });
  return out;
}

function compileDrums(toks, warn) {
  return toks.map((tok) => {
    if (tok === '.' || tok === '-') return null;
    const hits = tok.split('+').filter((h) => {
      if (DRUM_IDS.has(h)) return true;
      warn(`bad drum "${h}"`);
      return false;
    });
    return hits.length ? { hits } : null;
  });
}



export function compileSong(data) {
  if (!data || typeof data !== 'object' || !data.channels || !data.sections) return null;
  const id = data.id || '?';
  const warn = (msg) => console.warn(`[audio] ${id}: ${msg}`);
  const bpm = Math.max(1, num(data.bpm, 120));
  const spb = Math.max(1, num(data.stepsPerBeat, 4));
  const transpose = num(data.transpose, 0);

  const channels = [];
  for (const [name, c] of Object.entries(data.channels)) {
    const preset = AUDIO.instruments[c?.inst];
    if (!preset) {
      warn(`channel ${name}: unknown instrument "${c?.inst}"`);
      continue;
    }
    channels.push({
      name, inst: c.inst, preset, vol: num(c.vol, 0.5),
      octave: num(c.octave, 0), vibrato: num(c.vibrato, 0), echo: num(c.echo, 0),
    });
  }

  const sections = {};
  for (const [sid, sec] of Object.entries(data.sections)) {
    if (!sec || typeof sec !== 'object') continue;
    let steps = 0;
    const tracks = channels.map((ch) => {
      const toks = tokens(sec[ch.name]);
      if (!toks.length) return null;
      steps = Math.max(steps, toks.length);
      const w = (msg) => warn(`${sid}.${ch.name}: ${msg}`);
      return ch.preset.wave === 'drums' ? compileDrums(toks, w) : compileMelodic(toks, transpose + 12 * ch.octave, w);
    });
    if (steps > 0) sections[sid] = { steps, tracks };
  }
  const order = (Array.isArray(data.order) ? data.order : []).map((s) => sections[s]).filter(Boolean);
  if (!order.length) return null;
  return {
    id, channels, order, bpm,
    stepDur: 60 / bpm / spb,
    swing: Math.min(1, Math.max(0, num(data.swing, 0))),
    loop: data.loop !== false,
    volume: num(data.volume, 1),
  };
}

// One running song: its channel strips, output gain (for crossfades) and play position.
export class SongPlayer {
  constructor(synth, song, dest, mods, { once = false } = {}) {
    const ctx = synth.ctx;
    this.synth = synth;
    this.song = song;
    this.loop = song.loop && !once;
    this.out = ctx.createGain();
    this.out.gain.value = 0;
    this.out.connect(dest);
    this.strips = song.channels.map((ch) => synth.createStrip(ch, song.bpm, this.out, mods));
    this.orderIdx = 0;
    this.step = 0;
    this.nextTime = 0;
    this.done = false;
    this.endTime = Infinity;
    this.disposeAt = Infinity; // set when fading out
  }

  start(t, fadeSec) {
    this.nextTime = t;
    const g = this.out.gain;
    const level = this.song.volume * AUDIO.music.level;
    g.setValueAtTime(0, t);
    g.linearRampToValueAtTime(level, t + Math.max(0.01, fadeSec));
  }

  fadeOut(now, sec) {
    const g = this.out.gain;
    holdParam(g, now);
    g.linearRampToValueAtTime(0, now + sec);
    this.disposeAt = now + sec + 0.05;
  }

  // Continue after a pause: don't try to catch up on the steps that were skipped.
  resync(t) {
    if (this.nextTime < t) this.nextTime = t;
  }

  // Schedules every step that starts before `until`. After a main-thread stall (now well past nextTime) the
  // overdue steps are skipped, keeping the song position, instead of all firing at once.
  advance(now, until, extraSwing) {
    const song = this.song;
    while (!this.done && now - this.nextTime > song.stepDur) this.nextStep(song);
    const gate = song.stepDur * AUDIO.music.gateFraction;
    const swing = Math.min(1, song.swing + extraSwing) * AUDIO.music.swingMax * song.stepDur;
    while (!this.done && this.nextTime < until) {
      const sec = song.order[this.orderIdx];
      const t = this.nextTime + (this.step & 1 ? swing : 0);
      for (let c = 0; c < sec.tracks.length; c++) {
        const ev = sec.tracks[c] && sec.tracks[c][this.step];
        if (!ev) continue;
        const strip = this.strips[c];
        if (ev.hits) {
          for (let h = 0; h < ev.hits.length; h++) this.synth.drum(strip, ev.hits[h], t);
        } else {
          const dur = ev.steps * song.stepDur - song.stepDur + gate;
          for (let n = 0; n < ev.freqs.length; n++) this.synth.note(strip, ev.freqs[n], t, dur);
        }
      }
      this.nextStep(song);
    }
  }

  nextStep(song) {
    this.nextTime += song.stepDur;
    if (++this.step < song.order[this.orderIdx].steps) return;
    this.step = 0;
    if (++this.orderIdx < song.order.length) return;
    if (this.loop) {
      this.orderIdx = 0;
    } else {
      this.done = true;
      this.endTime = this.nextTime;
    }
  }

  dispose() {
    for (const s of this.strips) this.synth.disposeStrip(s);
    this.out.disconnect();
  }
}

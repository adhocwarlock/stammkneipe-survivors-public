import { AUDIO } from '../data/audio.js';

// Chiptune voices for the music. A "strip" is one song channel: notes connect into strip.input, which runs
// through the channel's insert effects (drive/lowpass, wah on the lead, echo) into the song's output.
// Oscillators are one-shot in WebAudio, so each note creates its source + envelope gain; everything shared
// (waveforms, noise, distortion curves, filters, LFOs) is created once per context or per strip.
export class Synth {
  constructor(ctx) {
    this.ctx = ctx;
    this.pulseWaves = new Map();
    this.curves = new Map();
    this.noise = makeNoise(ctx, AUDIO.noiseBufferSec);
  }

  // Band-limited pulse wave with the given duty cycle (Fourier series, cached).
  pulseWave(duty) {
    let w = this.pulseWaves.get(duty);
    if (!w) {
      const n = 64;
      const real = new Float32Array(n);
      const imag = new Float32Array(n);
      for (let i = 1; i < n; i++) real[i] = Math.sin(Math.PI * i * duty) / i;
      w = this.ctx.createPeriodicWave(real, imag);
      this.pulseWaves.set(duty, w);
    }
    return w;
  }

  driveCurve(k) {
    let c = this.curves.get(k);
    if (!c) {
      c = new Float32Array(1024);
      const norm = Math.tanh(k);
      for (let i = 0; i < c.length; i++) c[i] = Math.tanh(k * ((i / (c.length - 1)) * 2 - 1)) / norm;
      this.curves.set(k, c);
    }
    return c;
  }

  // ch = compiled channel ({ name, inst, preset, vol, vibrato, echo }); mods = Music's global dicht modulators.
  createStrip(ch, bpm, out, mods) {
    const ctx = this.ctx;
    const p = ch.preset;
    const nodes = [];
    const add = (n) => { nodes.push(n); return n; };
    const strip = { preset: p, drums: p.wave === 'drums', input: add(ctx.createGain()), nodes, lfo: null, drumHp: null };
    let tail = strip.input;
    const link = (n) => { tail.connect(n); tail = n; return n; };

    if (p.drive) {
      const sh = link(add(ctx.createWaveShaper()));
      sh.curve = this.driveCurve(p.drive);
      sh.oversample = '2x';
    }
    if (p.lowpassHz) {
      const lp = link(add(ctx.createBiquadFilter()));
      lp.type = 'lowpass';
      lp.frequency.value = p.lowpassHz;
    }
    if (p.outGain !== undefined) link(add(ctx.createGain())).gain.value = p.outGain;
    if (ch.name === 'lead' && mods) {
      // Dicht wah: a peaking filter at 0 dB (transparent) whose gain and centre the global dicht LFOs drive.
      const wah = link(add(ctx.createBiquadFilter()));
      wah.type = 'peaking';
      wah.frequency.value = AUDIO.dicht.wahCenterHz;
      wah.Q.value = AUDIO.dicht.wahQ;
      wah.gain.value = 0;
      mods.wahFreq.connect(wah.frequency);
      if (mods.wahGain) mods.wahGain.connect(wah.gain);
      strip.wah = wah;
    }
    const vol = link(add(ctx.createGain()));
    vol.gain.value = ch.vol;
    vol.connect(out);

    if (ch.echo > 0) {
      const d = add(ctx.createDelay(2));
      d.delayTime.value = Math.min(1.9, (AUDIO.echo.beats * 60) / bpm);
      const fb = add(ctx.createGain());
      fb.gain.value = AUDIO.echo.feedback;
      const wet = add(ctx.createGain());
      wet.gain.value = Math.min(AUDIO.echo.maxWet, ch.echo);
      vol.connect(d);
      d.connect(fb);
      fb.connect(d);
      d.connect(wet);
      wet.connect(out);
    }

    // Pitch modulation (cents) shared by every note of the channel: vibrato + dicht drift.
    strip.pitchMod = add(ctx.createGain());
    if (ch.vibrato > 0) {
      const lfo = ctx.createOscillator();
      lfo.frequency.value = AUDIO.vibrato.rateHz;
      const depth = add(ctx.createGain());
      depth.gain.value = ch.vibrato * AUDIO.vibrato.maxCents;
      lfo.connect(depth);
      depth.connect(strip.pitchMod);
      lfo.start();
      strip.lfo = lfo;
    }
    if (mods) mods.pitch.connect(strip.pitchMod);

    if (strip.drums) {
      strip.drumHp = {};
      for (const [id, d] of Object.entries(AUDIO.drums)) {
        if (!d.noise) continue;
        const hp = add(ctx.createBiquadFilter());
        hp.type = 'highpass';
        hp.frequency.value = d.noise.hp;
        hp.connect(strip.input);
        strip.drumHp[id] = hp;
      }
    }
    strip.mods = mods;
    return strip;
  }

  disposeStrip(strip) {
    if (strip.lfo) {
      try { strip.lfo.stop(); } catch { /* already stopped */ }
      strip.lfo.disconnect();
    }
    if (strip.mods) {
      strip.mods.pitch.disconnect(strip.pitchMod);
      if (strip.wah) {
        strip.mods.wahFreq.disconnect(strip.wah.frequency);
        if (strip.mods.wahGain) strip.mods.wahGain.disconnect(strip.wah.gain);
      }
    }
    for (const n of strip.nodes) n.disconnect();
  }

  // One melodic note (freq in Hz) from time t for dur seconds.
  note(strip, freq, t, dur) {
    const ctx = this.ctx;
    const p = strip.preset;
    const g = ctx.createGain();
    const end = t + Math.max(dur, p.attack + 0.005);
    envelope(g.gain, t, end, p, p.gain);
    g.connect(strip.input);
    const stopAt = end + p.release * 1.5 + 0.02;
    if (p.wave === 'noise') {
      const src = this.noiseSource(t, stopAt);
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = freq;
      bp.Q.value = p.bandQ;
      src.connect(bp);
      bp.connect(g);
      return;
    }
    const voices = p.unison || 1;
    for (let i = 0; i < voices; i++) {
      const o = ctx.createOscillator();
      if (p.wave === 'pulse') o.setPeriodicWave(this.pulseWave(p.duty));
      else o.type = p.wave;
      o.frequency.value = freq;
      if (voices > 1) o.detune.value = (i / (voices - 1) - 0.5) * 2 * p.unisonCents;
      strip.pitchMod.connect(o.detune);
      o.pitchMod = strip.pitchMod;
      o.onended = releaseOsc;
      o.connect(g);
      o.start(t);
      o.stop(stopAt);
    }
  }

  // One drum hit (k s h o c t T) at time t.
  drum(strip, id, t) {
    const d = AUDIO.drums[id];
    if (!d) return;
    const ctx = this.ctx;
    const level = strip.preset.gain;
    if (d.tone) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.setValueAtTime(d.tone.startHz, t);
      o.frequency.exponentialRampToValueAtTime(d.tone.endHz, t + d.tone.sweepSec);
      g.gain.setValueAtTime(d.tone.gain * level, t);
      g.gain.setTargetAtTime(0, t, d.tone.decay / 4);
      o.connect(g);
      g.connect(strip.input);
      o.start(t);
      o.stop(t + d.tone.decay * 1.3);
    }
    if (d.noise) {
      const end = t + d.noise.decay * 1.3;
      const src = this.noiseSource(t, end);
      const g = ctx.createGain();
      g.gain.setValueAtTime(d.noise.gain * level, t);
      g.gain.setTargetAtTime(0, t, d.noise.decay / 4);
      src.connect(g);
      g.connect(strip.drumHp[id]);
    }
  }

  noiseSource(t, stopAt) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    src.start(t, Math.random() * this.noise.duration);
    src.stop(stopAt);
    return src;
  }
}

// Attack ramp, decay to sustain, release from `end`. setTargetAtTime starts from whatever the value is then.
function envelope(param, t, end, p, peak) {
  param.setValueAtTime(0, t);
  param.linearRampToValueAtTime(peak, t + p.attack);
  param.setTargetAtTime(peak * p.sustain, t + p.attack, p.decay / 3);
  param.setTargetAtTime(0, end, p.release / 4);
}

// Shared onended handler (no closure per note): drop the pitch-mod connection so the oscillator can be freed.
function releaseOsc(e) {
  const o = e.target;
  try { o.pitchMod.disconnect(o.detune); } catch { /* strip already disposed */ }
  o.disconnect();
}

function makeNoise(ctx, seconds) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

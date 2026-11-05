import { AUDIO } from '../data/audio.js';
import { loadSong, SONG_IDS } from '../data/music/index.js';
import { compileSong, SongPlayer, holdParam } from './Sequencer.js';

// Music director: one main track (crossfaded on change), one jingle over it (main ducks), pause/shop states
// and the dicht effect chain. Works before unlock by remembering what should play; all calls are safe no-ops
// without an AudioContext.
//
// Graph: main players -> jingleDuck -\
//        jingle player -------------- mix -> dicht lowpass -> dry + chorus -> shop lowpass -> shopGain
//        -> voiceDuck -> pauseGain -> Audio.musicBus
export class Music {
  constructor() {
    this.ctx = null;
    this.wanted = null; // id requested while still locked
    this.currentId = null;
    this.current = null;
    this.jinglePlayer = null;
    this.fading = [];
    this.compiled = new Map();
    this.token = 0;
    this.jingleToken = 0;
    this.paused = false;
    this.muffled = false;
    this.dicht = false;
    this.voiceUntil = 0;
    this.timer = 0;
    this.tick = this.tick.bind(this);
  }

  attach(ctx, synth, bus) {
    this.ctx = ctx;
    this.synth = synth;
    const touch = typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0;
    this.aheadSec = touch ? AUDIO.scheduler.aheadSecTouch : AUDIO.scheduler.aheadSec;
    const g = (v = 1) => { const n = ctx.createGain(); n.gain.value = v; return n; };
    const D = AUDIO.dicht;
    const nyquist = ctx.sampleRate / 2;

    this.mainIn = g();
    this.jingleDuck = g();
    this.mix = g();
    this.mainIn.connect(this.jingleDuck);
    this.jingleDuck.connect(this.mix);

    this.dichtLp = ctx.createBiquadFilter();
    this.dichtLp.type = 'lowpass';
    this.dichtLp.frequency.value = nyquist;
    this.dichtLp.Q.value = 0.7;
    this.sweepDepth = g(0);
    lfo(ctx, D.sweepHz).connect(this.sweepDepth);
    this.sweepDepth.connect(this.dichtLp.frequency);
    this.mix.connect(this.dichtLp);

    const dry = g();
    this.chorusWet = g(0);
    const chorus = ctx.createDelay(0.1);
    chorus.delayTime.value = D.chorusDelaySec;
    const chorusDepth = g(D.chorusDepthSec);
    lfo(ctx, D.chorusRateHz).connect(chorusDepth);
    chorusDepth.connect(chorus.delayTime);
    this.dichtLp.connect(dry);
    this.dichtLp.connect(chorus);
    chorus.connect(this.chorusWet);

    this.shopLp = ctx.createBiquadFilter();
    this.shopLp.type = 'lowpass';
    this.shopLp.frequency.value = nyquist;
    dry.connect(this.shopLp);
    this.chorusWet.connect(this.shopLp);
    this.shopGain = g();
    this.voiceDuck = g();
    this.pauseGain = g(this.paused ? 0 : 1);
    this.shopLp.connect(this.shopGain);
    this.shopGain.connect(this.voiceDuck);
    this.voiceDuck.connect(this.pauseGain);
    this.pauseGain.connect(bus);

    // Global modulators every channel strip connects to (see Synth.createStrip).
    const pitch = g(0);
    lfo(ctx, D.detuneRateHz).connect(pitch);
    const wahFreq = g(D.wahDepthHz);
    lfo(ctx, D.wahRateHz).connect(wahFreq);
    let wahGain = null;
    if (ctx.createConstantSource) {
      wahGain = ctx.createConstantSource();
      wahGain.offset.value = 0;
      wahGain.start();
    }
    this.mods = { pitch, wahFreq, wahGain };

    this.setDicht(this.dicht, true);
    this.setMuffled(this.muffled, true);
    for (const id of SONG_IDS) loadSong(id); // all small: fetch now so track changes start instantly
    if (this.wanted) {
      const id = this.wanted;
      this.currentId = null;
      this.play(id);
    }
  }

  // Main track by id (crossfade). Same id again just keeps it playing; also lifts pause/shop states.
  play(id) {
    this.wanted = id;
    this.setPaused(false);
    this.setMuffled(false);
    if (!this.ctx || id === this.currentId) return;
    this.currentId = id;
    const token = ++this.token;
    this.cutJingle();
    this.fadeOutCurrent(AUDIO.music.crossfadeSec);
    this.song(id).then((song) => {
      if (!song || token !== this.token) return;
      const now = this.ctx.currentTime;
      const p = new SongPlayer(this.synth, song, this.mainIn, this.mods);
      p.start(now + AUDIO.scheduler.startDelaySec, AUDIO.music.crossfadeSec);
      this.current = p;
      this.ensureTimer();
    });
  }

  // Fade the main track out (e.g. leaving to a silent screen).
  stop() {
    this.wanted = null;
    this.currentId = null;
    this.token++;
    if (!this.ctx) return;
    this.cutJingle();
    this.fadeOutCurrent(AUDIO.music.stopFadeSec);
  }

  // Track change / stop: a running (or still loading) jingle and voice line must not carry over.
  cutJingle() {
    this.jingleToken++;
    const now = this.ctx.currentTime;
    if (this.jinglePlayer) {
      this.retire(this.jinglePlayer, 0.1);
      this.jinglePlayer = null;
    }
    ramp(this.jingleDuck.gain, 1, now, AUDIO.duck.jingleReleaseSec);
    if (this.voice) this.voice.stop();
    this.voiceUntil = 0;
    ramp(this.voiceDuck.gain, 1, now, AUDIO.duck.voiceReleaseSec);
  }

  // Plays a song once over the ducked main track, then the main track comes back.
  jingle(id) {
    if (!this.ctx) return;
    const token = ++this.jingleToken;
    this.song(id).then((song) => {
      if (!song || token !== this.jingleToken) return;
      const now = this.ctx.currentTime;
      if (this.jinglePlayer) this.retire(this.jinglePlayer, 0.1);
      const p = new SongPlayer(this.synth, song, this.mix, this.mods, { once: true });
      p.start(now + AUDIO.scheduler.startDelaySec, 0.02);
      this.jinglePlayer = p;
      ramp(this.jingleDuck.gain, AUDIO.duck.jingleLevel, now, AUDIO.duck.jingleAttackSec);
      this.ensureTimer();
    });
  }

  // Voice line of `seconds` length: duck all music meanwhile.
  duckForVoice(seconds) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const d = AUDIO.duck;
    this.voiceUntil = Math.max(this.voiceUntil, now + seconds);
    const p = this.voiceDuck.gain;
    holdParam(p, now);
    p.setTargetAtTime(d.voiceLevel, now, d.voiceAttackSec / 3);
    p.setTargetAtTime(1, this.voiceUntil, d.voiceReleaseSec / 3);
  }

  // Pause menu: music fades out and stops advancing; resumes where it was.
  setPaused(on) {
    on = !!on;
    if (on === this.paused) return;
    this.paused = on;
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    ramp(this.pauseGain.gain, on ? 0 : 1, now, AUDIO.music.pauseFadeSec);
    if (!on) {
      const t = now + AUDIO.scheduler.startDelaySec;
      if (this.current) this.current.resync(t);
      if (this.jinglePlayer) this.jinglePlayer.resync(t);
      this.ensureTimer();
    }
  }

  // Shop: the music keeps playing, quieter and muffled ("through the shop door").
  setMuffled(on, force = false) {
    on = !!on;
    if (on === this.muffled && !force) return;
    this.muffled = on;
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const d = AUDIO.duck;
    ramp(this.shopGain.gain, on ? d.shopLevel : 1, now, d.shopFadeSec);
    rampExp(this.shopLp.frequency, on ? d.shopLowpassHz : this.ctx.sampleRate / 2, now, d.shopFadeSec);
  }

  // Dicht mode: lowpass sweep, chorus, pitch drift, wah on the lead, extra swing.
  setDicht(on, force = false) {
    on = !!on;
    if (on === this.dicht && !force) return;
    this.dicht = on;
    if (!this.ctx) return;
    const D = AUDIO.dicht;
    const now = this.ctx.currentTime;
    const f = D.fadeSec;
    rampExp(this.dichtLp.frequency, on ? D.lowpassCenterHz : this.ctx.sampleRate / 2, now, f);
    ramp(this.dichtLp.Q, on ? D.lowpassQ : 0.7, now, f);
    ramp(this.sweepDepth.gain, on ? D.lowpassDepthHz : 0, now, f);
    ramp(this.chorusWet.gain, on ? D.chorusWet : 0, now, f);
    ramp(this.mods.pitch.gain, on ? D.detuneCents : 0, now, f);
    if (this.mods.wahGain) ramp(this.mods.wahGain.offset, on ? D.wahGainDb : 0, now, f);
  }

  // Compiled song (cached), or null if missing/broken.
  song(id) {
    if (this.compiled.has(id)) return Promise.resolve(this.compiled.get(id));
    return loadSong(id).then((data) => {
      let song = null;
      try {
        song = compileSong(data);
      } catch (e) {
        console.warn(`[audio] ${id}: ${e.message}`);
      }
      this.compiled.set(id, song);
      return song;
    });
  }

  fadeOutCurrent(sec) {
    if (this.current) this.retire(this.current, sec);
    this.current = null;
  }

  retire(p, sec) {
    p.fadeOut(this.ctx.currentTime, sec);
    this.fading.push(p);
    this.ensureTimer();
  }

  ensureTimer() {
    if (!this.timer) this.timer = setTimeout(this.tick, 0);
  }

  // Lookahead scheduler; runs only while something is playing or fading.
  tick() {
    this.timer = 0;
    const ctx = this.ctx;
    if (!ctx) return;
    const now = ctx.currentTime;
    const until = now + this.aheadSec;
    const swing = this.dicht ? AUDIO.dicht.swing : 0;
    const tail = AUDIO.music.endTailSec;
    if (!this.paused) {
      if (this.current) {
        this.current.advance(now, until, swing);
        if (this.current.done && now > this.current.endTime + tail) {
          this.current.dispose();
          this.current = null;
        }
      }
      const j = this.jinglePlayer;
      if (j) {
        j.advance(now, until, swing);
        if (j.done && now > j.endTime) {
          this.jinglePlayer = null;
          this.retire(j, tail);
          ramp(this.jingleDuck.gain, 1, now, AUDIO.duck.jingleReleaseSec);
        }
      }
    }
    for (let i = this.fading.length - 1; i >= 0; i--) {
      const p = this.fading[i];
      if (now >= p.disposeAt) {
        p.dispose();
        this.fading.splice(i, 1);
      } else if (!p.done) {
        p.advance(now, until, swing);
      }
    }
    if (this.current || this.jinglePlayer || this.fading.length) {
      this.timer = setTimeout(this.tick, AUDIO.scheduler.intervalMs);
    }
  }
}

function lfo(ctx, hz) {
  const o = ctx.createOscillator();
  o.frequency.value = hz;
  o.start();
  return o;
}

function ramp(param, value, now, sec) {
  holdParam(param, now);
  param.setTargetAtTime(value, now, Math.max(0.005, sec / 3));
}

// Filter sweeps sound even on a log scale, so frequencies get an exponential ramp from the current value.
function rampExp(param, value, now, sec) {
  holdParam(param, now);
  param.exponentialRampToValueAtTime(Math.max(1, value), now + Math.max(0.01, sec));
}

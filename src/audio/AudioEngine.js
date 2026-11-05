import { AUDIO } from '../data/audio.js';
import { Save } from '../systems/SaveSystem.js';
import { Synth } from './Synth.js';
import { Music } from './Music.js';
import { Voice } from './Voice.js';




const AudioCtor = typeof window !== 'undefined' ? window.AudioContext || window.webkitAudioContext : undefined;
const curve = (v) => Math.max(0, Math.min(1, v)) ** AUDIO.volumeCurve;
const GESTURES = ['pointerdown', 'pointerup', 'keydown', 'touchend'];
const ignore = () => {};
const pageVisible = () => typeof document === 'undefined' || !document.hidden;

export const Audio = {
  ctx: null,
  master: null,
  musicBus: null,
  sfxBus: null,
  voiceBus: null,
  muted: false,
  volumes: { master: 1, music: 0.7, sfx: 0.8 },
  music: new Music(),
  voice: new Voice(),
  supported: !!AudioCtor,
  listeners: new Set(),
  initDone: false,

  // Reads the saved settings and hooks the global gesture (unlock), M (mute) and tab-visibility listeners.
  // Idempotent; call from every scene's create().
  init() {
    if (this.initDone) return;
    this.initDone = true;
    const s = Save.data.settings || {};
    this.volumes.master = s.masterVolume ?? this.volumes.master;
    this.volumes.music = s.musicVolume ?? this.volumes.music;
    this.volumes.sfx = s.sfxVolume ?? this.volumes.sfx;
    this.muted = !!s.muted;
    if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') return;
    this.addGestureListeners();
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyM' && !e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey) this.toggleMute();
    });
    document.addEventListener?.('visibilitychange', () => {
      if (!this.ctx) return;
      if (document.hidden) {
        this.ctx.suspend?.()?.catch(ignore);
      } else {
        this.resume();
        // iOS refuses resume() without a gesture after an interruption: let the next tap/key do it.
        if (this.ctx.state !== 'running') this.addGestureListeners();
      }
    });
  },

  // Creates/resumes the context. Must run inside a user gesture; idempotent.
  unlock() {
    if (!AudioCtor) return;
    if (this.ctx) {
      if (this.ctx.state !== 'running') this.resume();
      else this.dropGestureListeners();
      return;
    }
    // iOS: play even with the silent switch on (like a video, not like a ringtone).
    try {
      if (typeof navigator !== 'undefined' && navigator.audioSession) navigator.audioSession.type = 'playback';
    } catch { /* unsupported */ }
    let ctx;
    try {
      ctx = new AudioCtor();
    } catch {
      return;
    }
    this.ctx = ctx;
    const L = AUDIO.limiter;
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = L.threshold;
    limiter.knee.value = L.knee;
    limiter.ratio.value = L.ratio;
    limiter.attack.value = L.attack;
    limiter.release.value = L.release;
    limiter.connect(ctx.destination);
    this.master = ctx.createGain();
    this.master.connect(limiter);
    this.musicBus = ctx.createGain();
    this.sfxBus = ctx.createGain();
    this.voiceBus = ctx.createGain();
    for (const b of [this.musicBus, this.sfxBus, this.voiceBus]) b.connect(this.master);
    this.applyGains(true);
    // An interruption (call, Siri, app switch) suspends the context behind our back; resuming then needs a
    // fresh gesture, so listen for one again. Running again -> listeners go away.
    ctx.onstatechange = () => {
      if (ctx.state === 'running') this.dropGestureListeners();
      else if (pageVisible()) this.addGestureListeners();
    };
    this.resume();
    const synth = new Synth(ctx);
    this.music.attach(ctx, synth, this.musicBus);
    this.voice.attach(ctx, this.voiceBus, this.music);
    if (ctx.state === 'running') this.dropGestureListeners();
  },

  get unlocked() {
    return !!this.ctx;
  },

  resume() {
    this.ctx?.resume?.()?.catch(ignore);
  },

  addGestureListeners() {
    if (this.onGesture || typeof window === 'undefined' || typeof window.addEventListener !== 'function') return;
    this.onGesture = () => this.unlock();
    for (const ev of GESTURES) window.addEventListener(ev, this.onGesture, true);
  },

  dropGestureListeners() {
    if (!this.onGesture) return;
    for (const ev of GESTURES) window.removeEventListener(ev, this.onGesture, true);
    this.onGesture = null;
  },

  // Any of master / music / sfx (0..1); saved.
  setVolumes(v = {}) {
    for (const k of ['master', 'music', 'sfx']) {
      if (Number.isFinite(v[k])) this.volumes[k] = Math.max(0, Math.min(1, v[k]));
    }
    this.applyGains();
    this.save();
  },

  toggleMute() {
    this.muted = !this.muted;
    this.applyGains();
    this.save();
  },

  // Joint effect on/off (ScreenFX.startDicht / stopDicht).
  onDicht(on) {
    this.music.setDicht(on);
  },

  // UI hook: fn() after any volume/mute change. Returns an unsubscribe function.
  onChange(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  },

  applyGains(instant = false) {
    if (this.ctx) {
      const now = this.ctx.currentTime;
      const set = (param, value) => {
        if (instant) param.value = value;
        else param.setTargetAtTime(value, now, 0.02);
      };
      set(this.master.gain, this.muted ? 0 : curve(this.volumes.master));
      set(this.musicBus.gain, curve(this.volumes.music));
      set(this.sfxBus.gain, curve(this.volumes.sfx));
      set(this.voiceBus.gain, curve(this.volumes.sfx) * AUDIO.voice.gain);
    }
    for (const fn of this.listeners) fn();
  },

  save() {
    const s = Save.data.settings;
    s.masterVolume = this.volumes.master;
    s.musicVolume = this.volumes.music;
    s.sfxVolume = this.volumes.sfx;
    s.muted = this.muted;
    Save.persist();
  },
};

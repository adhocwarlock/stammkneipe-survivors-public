import { AUDIO } from '../data/audio.js';

// Announcer voice lines: WAVs decoded once after unlock. Missing/undecodable files are skipped silently.
// One line at a time (a new one cuts the old); the music ducks while it plays.
export class Voice {
  constructor() {
    this.ctx = null;
    this.buffers = new Map();
    this.current = null;
  }

  attach(ctx, bus, music) {
    this.ctx = ctx;
    this.bus = bus;
    this.music = music;
    music.voice = this; // so a track change can cut the line
    if (typeof fetch !== 'function') return;
    for (const id of AUDIO.voice.ids) {
      fetch(`${AUDIO.voice.path}${id}.wav`)
        .then((r) => (r.ok ? r.arrayBuffer() : null))
        .then((ab) => ab && decode(ctx, ab))
        .then((buf) => { if (buf) this.buffers.set(id, buf); })
        .catch(() => {});
    }
  }

  has(id) {
    return this.buffers.has(id);
  }

  stop() {
    if (!this.current) return;
    try { this.current.stop(); } catch { /* already ended */ }
    this.current = null;
  }

  play(id) {
    const buf = this.ctx && this.buffers.get(id);
    if (!buf) return;
    this.stop();
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.connect(this.bus);
    src.onended = () => {
      src.disconnect();
      if (this.current === src) this.current = null;
    };
    src.start();
    this.current = src;
    this.music.duckForVoice(buf.duration);
  }
}

// Promise form (current browsers) with the callback form as fallback (old Safari returns undefined).
function decode(ctx, ab) {
  return new Promise((res, rej) => {
    const p = ctx.decodeAudioData(ab, res, rej);
    if (p && typeof p.then === 'function') p.then(res, rej);
  });
}

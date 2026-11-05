


export const AUDIO = {
  // Lookahead scheduler: a timer wakes every intervalMs and schedules everything due within aheadSec.
  // Touch devices (phones) get a longer lookahead: their main thread stalls more.
  scheduler: { intervalMs: 25, aheadSec: 0.12, aheadSecTouch: 0.2, startDelaySec: 0.06 },
  // Volume settings 0..1 are mapped to gain as v^curve (more control at the quiet end).
  volumeCurve: 2,
  // Pause-menu volume buttons move in these steps.
  volumeStep: 0.1,
  // Safety limiter on the master output (many SFX + music at once).
  limiter: { threshold: -6, knee: 6, ratio: 8, attack: 0.003, release: 0.2 },
  music: {
    level: 0.45, // overall music level before the music volume setting
    crossfadeSec: 1.2,
    stopFadeSec: 0.6,
    pauseFadeSec: 0.25,
    gateFraction: 0.92, // a note sounds for this share of its length (articulation)
    swingMax: 0.5, // swing 1 delays every second step by half a step
    endTailSec: 0.8, // non-looping songs: time after the last step before the player is released
  },
  // Music under jingles / voice lines / the shop.
  duck: {
    jingleLevel: 0.25, jingleAttackSec: 0.15, jingleReleaseSec: 0.8,
    voiceLevel: 0.35, voiceAttackSec: 0.08, voiceReleaseSec: 0.6,
    shopLevel: 0.45, shopLowpassHz: 900, shopFadeSec: 0.3,
  },
  vibrato: { rateHz: 5.5, maxCents: 45 },
  echo: { beats: 0.75, feedback: 0.35, maxWet: 0.8 },
  // Dicht mode (joint): everything ramps in/out over fadeSec.
  dicht: {
    fadeSec: 1.5,
    sweepHz: 0.12, // lowpass LFO
    lowpassCenterHz: 1600, lowpassDepthHz: 1200, lowpassQ: 6,
    chorusDelaySec: 0.018, chorusDepthSec: 0.006, chorusRateHz: 0.8, chorusWet: 0.6,
    detuneCents: 18, detuneRateHz: 0.35, // slow whole-band pitch drift
    wahRateHz: 2.2, wahCenterHz: 1100, wahDepthHz: 800, wahGainDb: 14, wahQ: 3, // peaking filter on the lead channel
    swing: 0.35, // added to the song's own swing
  },
  // Instrument presets. wave: square | pulse | triangle | sawtooth | noise. Envelope times in seconds,
  // sustain 0..1, gain = level of one note. drive = waveshaper amount (0 = clean; driven channels saturate, so
  // their loudness is set by outGain after the shaper), lowpassHz on the channel.
  instruments: {
    square: { wave: 'square', attack: 0.004, decay: 0.12, sustain: 0.65, release: 0.06, gain: 0.9 },
    pulse25: { wave: 'pulse', duty: 0.25, attack: 0.004, decay: 0.1, sustain: 0.6, release: 0.06, gain: 0.9 },
    pulse12: { wave: 'pulse', duty: 0.125, attack: 0.003, decay: 0.08, sustain: 0.55, release: 0.05, gain: 0.9 },
    triangle: { wave: 'triangle', attack: 0.003, decay: 0.1, sustain: 0.85, release: 0.04, gain: 0.8 },
    saw: { wave: 'sawtooth', attack: 0.006, decay: 0.15, sustain: 0.6, release: 0.08, gain: 0.7 },
    distgtr: {
      wave: 'sawtooth', unison: 2, unisonCents: 9, attack: 0.002, decay: 0.2, sustain: 0.75, release: 0.05,
      gain: 0.22, drive: 8, lowpassHz: 3400, outGain: 0.7,
    },
    bassgtr: {
      wave: 'sawtooth', unison: 1, attack: 0.003, decay: 0.15, sustain: 0.7, release: 0.05, gain: 0.45,
      drive: 2.5, lowpassHz: 1100, outGain: 0.8,
    },
    noise: { wave: 'noise', attack: 0.002, decay: 0.08, sustain: 0.3, release: 0.05, gain: 0.4, bandQ: 4 },
    drums: { wave: 'drums', gain: 0.6 },
  },
  // Drum kit. Tone drums: sine sweep startHz -> endHz over sweepSec, amplitude decay. Noise drums: filtered noise.
  drums: {
    k: { tone: { startHz: 160, endHz: 42, sweepSec: 0.07, decay: 0.28, gain: 1 }, noise: { hp: 2000, decay: 0.012, gain: 0.25 } },
    s: { tone: { startHz: 220, endHz: 170, sweepSec: 0.04, decay: 0.08, gain: 0.45 }, noise: { hp: 1200, decay: 0.16, gain: 0.6 } },
    h: { noise: { hp: 7500, decay: 0.035, gain: 0.25 } },
    o: { noise: { hp: 6500, decay: 0.25, gain: 0.22 } },
    c: { noise: { hp: 3500, decay: 1.1, gain: 0.32 } },
    t: { tone: { startHz: 130, endHz: 85, sweepSec: 0.12, decay: 0.3, gain: 0.7 } },
    T: { tone: { startHz: 210, endHz: 150, sweepSec: 0.1, decay: 0.24, gain: 0.6 } },
  },
  noiseBufferSec: 1.5,
  // Announcer voice lines (assets/audio/voice/<id>.wav), decoded on unlock; missing files are skipped.
  voice: {
    path: 'assets/audio/voice/',
    ids: ['mike_drop', 'cage_fight', 'too_deep', 'hannabolika', 'huns_arrived', 'schubsentanz', 'danger_close', 'bifrost'],
    gain: 1,
  },
};

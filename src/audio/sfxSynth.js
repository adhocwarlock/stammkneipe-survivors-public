













const TAU = Math.PI * 2;

function pair(v, d) {
  if (v === undefined || v === null) return [d, d];
  return Array.isArray(v) ? v : [v, v];
}

function renderLayer(L, idx, sr, defaults, out) {
  const a = L.a ?? 0.002;
  const s = L.s ?? 0;
  const d = L.d ?? 0.1;
  const dur = a + s + d;
  const start = Math.round((L.delay ?? 0) * sr);
  const n = Math.ceil(dur * sr);
  const [f0, f1] = pair(L.f, 440);
  const fc = L.fc ?? 1;
  const [du0, du1] = pair(L.duty, 0.5);
  const [lp0, lp1] = pair(L.lp, defaults.lp);
  const hp = L.hp ?? 0;
  const punch = L.punch ?? 0;
  const dc = L.dc ?? defaults.dc;
  const vib = L.vib || null;
  const arp = L.arp || null;
  const trem = L.trem || null;
  const drive = L.drive ?? 0;
  const driveNorm = drive > 0 ? Math.tanh(drive) : 1;
  const crush = L.crush ?? 0;
  const vol = L.vol ?? 1;
  const wave = L.wave;
  let seed = (L.seed ?? idx + 1) | 0;
  if (seed === 0) seed = 1;
  let phase = 0;
  let hold = 0;
  let lpA = 0;
  let lpB = 0;
  let hpY = 0;
  let hpX = 0;
  const hpK = hp > 0 ? 1 / (1 + (TAU * hp) / sr) : 0;
  // Constant low-pass: its coefficient is computed once (only sweeps need it per sample).
  const lpSweep = lp0 !== lp1;
  const lpOn = lpSweep || (lp0 > 0 && lp0 < sr / 2);
  const lpK0 = lpSweep ? 0 : 1 - Math.exp((-TAU * lp0) / sr);
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const u = dur > 0 ? Math.min(1, t / dur) : 1;
    let f = f0 === f1 ? f0 : f0 * Math.pow(f1 / f0, Math.pow(u, fc));
    if (vib) f *= Math.pow(2, (vib[1] * Math.sin(TAU * vib[0] * t)) / 12);
    if (arp) for (let k = 0; k < arp.length; k++) if (t >= arp[k][0]) f *= arp[k][1];
    phase += f / sr;
    let x;
    if (wave === 'noise') {
      if (phase >= 1 || i === 0) {
        seed ^= seed << 13;
        seed ^= seed >>> 17;
        seed ^= seed << 5;
        hold = ((seed >>> 0) / 4294967296) * 2 - 1;
      }
      phase -= Math.floor(phase);
      x = hold;
    } else {
      phase -= Math.floor(phase);
      if (wave === 'square') x = phase < du0 + (du1 - du0) * u ? 1 : -1;
      else if (wave === 'saw') x = 2 * phase - 1;
      else if (wave === 'triangle') x = 1 - 4 * Math.abs(phase - 0.5);
      else x = Math.sin(TAU * phase);
    }
    if (drive > 0) x = Math.tanh(drive * x) / driveNorm;
    if (crush > 0) x = Math.round(x * crush) / crush;
    // Envelope.
    let e;
    if (t < a) e = t / a;
    else if (t < a + s) e = 1 + punch * (1 - (t - a) / s);
    else {
      const r = 1 - (t - a - s) / d;
      e = r > 0 ? Math.pow(r, dc) : 0;
    }
    if (trem) e *= 1 - trem[1] * (0.5 - 0.5 * Math.cos(TAU * trem[0] * t));
    x *= e;
    // Filters: high-pass, then a two-stage one-pole low-pass (softens square edges: less shrill).
    if (hp > 0) {
      hpY = hpK * (hpY + x - hpX);
      hpX = x;
      x = hpY;
    }
    let k = lpK0;
    if (lpSweep) {
      const lp = lp0 * Math.pow(lp1 / lp0, u);
      k = lp > 0 && lp < sr / 2 ? 1 - Math.exp((-TAU * lp) / sr) : -1;
    }
    if (lpOn && k >= 0) {
      lpA += k * (x - lpA);
      lpB += k * (lpA - lpB);
      x = lpB;
    }
    out[start + i] += x * vol;
  }
}

// Length in samples of a preset at sample rate sr.
export function presetLength(preset, sr) {
  let len = 1;
  const layers = preset.layers;
  for (let k = 0; k < layers.length; k++) {
    const L = layers[k];
    const dur = (L.a ?? 0.002) + (L.s ?? 0) + (L.d ?? 0.1);
    len = Math.max(len, Math.round((L.delay ?? 0) * sr) + Math.ceil(dur * sr));
  }
  return len;
}

// Renders a preset, peak-normalised to `peak`, with a short fade at the end against clicks.
// defaults: { lp, dc, fadeSec }.
export function renderPreset(preset, sr, peak, defaults) {
  const out = new Float32Array(presetLength(preset, sr));
  const layers = preset.layers;
  for (let k = 0; k < layers.length; k++) renderLayer(layers[k], k, sr, defaults, out);
  let max = 0;
  for (let i = 0; i < out.length; i++) {
    const v = Math.abs(out[i]);
    if (v > max) max = v;
  }
  const g = max > 0 ? peak / max : 0;
  const fade = Math.min(out.length, Math.round(defaults.fadeSec * sr));
  for (let i = 0; i < out.length; i++) {
    const tail = out.length - i;
    out[i] *= tail < fade ? g * (tail / fade) : g;
  }
  return out;
}

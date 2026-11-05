import { ENEMY_SPAWN } from '../../data/enemies.js';
import { TIMELINE, ENDLESS } from '../../data/timeline.js';

// Runs the minute timeline (data/timeline.js): spawn ticks, alive caps, weighted picks, minimum counts,
// one-off arrivals. Rows are compiled once into flat arrays indexed by type index (no per-tick objects).
export class Spawner {
  constructor(sys) {
    this.sys = sys;
    const n = sys.typeList.length;
    this.rows = TIMELINE.map((r) => compileRow(r, sys));
    this.timer = ENEMY_SPAWN.graceSeconds;
    this.arrived = -1; // last row entered (its arrivals are queued in arriveLeft)
    this.arriveLeft = new Int16Array(n); // arrivals still owed per type (retried until they spawn)
    this.lastSpawn = new Float64Array(n).fill(-1e9); // run seconds of the last spawn per type (minGap)
    this.allowed = new Uint8Array(n);
  }

  rowIndex(minutes) {
    let i = 0;
    while (i + 1 < this.rows.length && minutes >= this.rows[i + 1].at) i++;
    return i;
  }

  update(dt, minutes, elapsed) {
    const ri = this.rowIndex(minutes);
    if (this.arrived < ri) {
      this.arrived = ri; // after a debug time jump only the current row's arrivals happen
      const row = this.rows[ri];
      for (let k = 0; k < row.arriveIdx.length; k++) this.arriveLeft[row.arriveIdx[k]] += row.arriveN[k];
      this.arrivePending = row.arriveIdx.length > 0;
    }
    if (this.arrivePending) this.arrive(minutes, elapsed);
    this.timer -= dt;
    if (this.timer > 0) return;

    const row = this.rows[ri];
    const next = this.rows[ri + 1];
    let cap;
    let every;
    let batch = row.batch;
    if (next) {
      const f = Math.min(1, Math.max(0, (minutes - row.at) / (next.at - row.at)));
      cap = row.cap0 + (row.cap1 - row.cap0) * f;
      every = row.every0 + (row.every1 - row.every0) * f;
    } else {
      const over = minutes - row.at; // endless: the last row creeps up
      cap = row.cap1 + over * ENDLESS.capPerMinute;
      every = Math.max(ENDLESS.minInterval, row.every1 / (1 + over * ENDLESS.intervalShrinkPerMinute));
      batch = Math.min(ENDLESS.maxBatch, Math.floor(batch + over * ENDLESS.batchPerMinute));
    }
    cap = Math.min(ENEMY_SPAWN.aliveCap, Math.round(cap));
    this.timer = every;

    const sys = this.sys;
    sys.countAlive();
    // Top up the row's minimum counts first.
    let fill = ENEMY_SPAWN.minFillPerTick;
    for (let k = 0; k < row.minIdx.length && fill > 0; k++) {
      const idx = row.minIdx[k];
      while (fill > 0 && sys.alive[idx] < row.minN[k] && sys.aliveTotal < cap && this.canSpawn(idx, elapsed)) {
        const got = this.spawnType(idx, minutes, elapsed);
        if (!got) break;
        fill--;
      }
    }
    for (let b = 0; b < batch && sys.aliveTotal < cap; b++) {
      const idx = this.pick(row, elapsed);
      if (idx < 0 || !this.spawnType(idx, minutes, elapsed)) break;
    }
  }

  canSpawn(idx, elapsed) {
    const t = this.sys.typeList[idx];
    if (t.maxAlive && this.sys.alive[idx] >= t.maxAlive) return false;
    return !t.minGap || elapsed - this.lastSpawn[idx] >= t.minGap;
  }

  // Weighted pick among the row's types that aren't at their per-type cap. -1 = nothing allowed.
  pick(row, elapsed) {
    const w = row.weights;
    let total = 0;
    for (let i = 0; i < w.length; i++) {
      this.allowed[i] = w[i] > 0 && this.canSpawn(i, elapsed) ? 1 : 0;
      if (this.allowed[i]) total += w[i];
    }
    if (total <= 0) return -1;
    let roll = Math.random() * total;
    let last = -1;
    for (let i = 0; i < w.length; i++) {
      if (!this.allowed[i]) continue;
      last = i;
      roll -= w[i];
      if (roll < 0) return i;
    }
    return last;
  }

  spawnType(idx, minutes, elapsed) {
    const n = this.sys.spawnPicked(idx, minutes);
    if (n > 0) this.lastSpawn[idx] = elapsed;
    return n;
  }

  // Owed arrivals: one try per type per frame until it works (no free spawn point = try next frame).
  // A type already at its maxAlive (a dragon still around) counts as arrived.
  arrive(minutes, elapsed) {
    const sys = this.sys;
    sys.countAlive();
    let left = false;
    for (let idx = 0; idx < this.arriveLeft.length; idx++) {
      if (this.arriveLeft[idx] <= 0) continue;
      const t = sys.typeList[idx];
      if (t.maxAlive && sys.alive[idx] >= t.maxAlive) this.arriveLeft[idx] = 0;
      else if (this.spawnType(idx, minutes, elapsed)) this.arriveLeft[idx]--; // spawnPicked keeps sys.alive up to date
      if (this.arriveLeft[idx] > 0) left = true;
    }
    this.arrivePending = left;
  }
}

function compileRow(r, sys) {
  const n = sys.typeList.length;
  const weights = new Float32Array(n);
  for (const [id, w] of Object.entries(r.w || {})) weights[indexOf(sys, id)] = w;
  const [cap0, cap1] = Array.isArray(r.cap) ? r.cap : [r.cap, r.cap];
  const [every0, every1] = Array.isArray(r.every) ? r.every : [r.every, r.every];
  const min = Object.entries(r.min || {});
  const arrive = Object.entries(r.arrive || {});
  return {
    at: r.at, cap0, cap1, every0, every1, batch: r.batch || 1, weights,
    minIdx: min.map(([id]) => indexOf(sys, id)), minN: min.map(([, v]) => v),
    arriveIdx: arrive.map(([id]) => indexOf(sys, id)), arriveN: arrive.map(([, v]) => v),
  };
}

function indexOf(sys, id) {
  const t = sys.types[id];
  if (!t) throw new Error(`timeline: unknown enemy type "${id}"`);
  return t.index;
}

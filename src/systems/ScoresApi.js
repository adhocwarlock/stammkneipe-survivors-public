import { LEADERBOARD } from '../data/config.js';

// Global top-10 (cloudflare/worker.mjs; tools/serve.py fakes it locally). Same ordering everywhere:
// Überlebt (seconds) desc, then kills desc; an older entry stays ahead of a new tie.
// Entry: { name, hero, survived, kills, beers, joints, pfand }  (pfand in cents, survived in whole seconds)

async function call(method, body) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), LEADERBOARD.timeoutMs);
  try {
    const res = await fetch(LEADERBOARD.api, {
      method,
      headers: body ? { 'content-type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store',
      signal: ctrl.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: data.error || `http${res.status}` };
    return data;
  } catch {
    return { error: 'offline' };
  } finally {
    clearTimeout(t);
  }
}

export const better = (a, b) => a.survived > b.survived || (a.survived === b.survived && a.kills > b.kills);

export const Scores = {
  // -> { scores } or { error }
  top() {
    return call('GET');
  },
  // -> { scores, rank } (rank 1..10, or null if it didn't make it) or { error: 'name' | 'rude' | ... }
  submit(entry) {
    return call('POST', entry);
  },
  // Would this run make the list?
  qualifies(entry, scores) {
    return scores.length < LEADERBOARD.size || better(entry, scores[scores.length - 1]);
  },
};

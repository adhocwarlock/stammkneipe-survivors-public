


export const SONG_IDS = [
  'menu', 'victory', 'gameover',
  'theme_lars', 'theme_johnny', 'theme_danny', 'theme_hannah', 'theme_mike', 'theme_hans',
  'jingle_mike', 'jingle_johnny', 'jingle_danny', 'jingle_hannah', 'jingle_hans', 'jingle_lars',
  'example',
];

const cache = new Map(); // id -> Promise<song data | null>

// Resolves to the song object, or null if the file is missing/broken (logged once).
export function loadSong(id) {
  if (!cache.has(id)) {
    const p = SONG_IDS.includes(id)
      ? import(`./${id}.js`).then((m) => m.default || null).catch(() => {
        console.info(`[audio] song "${id}" not available`);
        return null;
      })
      : Promise.resolve(null);
    cache.set(id, p);
  }
  return cache.get(id);
}

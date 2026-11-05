import { HEROES } from '../data/heroes.js';
import { championHead, championPhotoKey } from '../data/champions.js';

// Who is being played this session (set on the start screen; survives restarts, not saved on purpose).
let current = 'lars';

export const Hero = {
  get id() {
    return current;
  },
  set(id) {
    current = HEROES[id] ? id : 'lars';
  },
  get data() {
    return HEROES[current];
  },
  get name() {
    return HEROES[current].name;
  },
  // For banners: "LARS IST DICHT" -> "MIKE IST DICHT".
  get NAME() {
    return HEROES[current].name.toUpperCase();
  },
  get photoKey() {
    return championPhotoKey(current);
  },
  get head() {
    return championHead(current);
  },
};

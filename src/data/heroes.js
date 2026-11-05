// Playable heroes (secret hero select: Alt+click / Alt+Enter on SPIELEN; Shift+Alt = tester + select).
// Everyone fights with the fists (+ bought weapons). Bodies need the lars_body anim set (idle, walk, hurt,
// idle_up, walk_up) + a dead body; missing anims fall back (Player). `bodies`/`dead` = first existing wins.
// The photo head comes from the champion data (championPhotoKey / championHead), Lars uses HEAD.
export const HEROES = {
  lars: { name: 'Lars', bodies: ['lars_body'], dead: ['lars_body_dead'] },
  mike: { name: 'Mike', bodies: ['champ_mike_body'], dead: ['champ_mike_body_dead'] },
  johnny: { name: 'Johnny', bodies: ['champ_johnny_body'], dead: ['champ_johnny_body_dead'] }, // pink tee
  danny: { name: 'Danny', bodies: ['champ_danny_play_body', 'champ_danny_body'], dead: ['champ_danny_body_dead'] }, // no pickaxe
  hans: { name: 'Hans', bodies: ['champ_hans_play_body', 'champ_hans_body'], dead: ['champ_hans_body_dead'] },
  hannah: { name: 'Hannah', bodies: ['champ_hannah_body'], dead: ['champ_hannah_body_dead'] },
};

export const HERO_ORDER = ['lars', 'mike', 'johnny', 'danny', 'hans', 'hannah'];

// Missing dead body: Lars' dead body with this tint.
export const DEAD_FALLBACK = { key: 'lars_body_dead', tint: 0xc8c0d8 };

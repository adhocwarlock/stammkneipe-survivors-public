import { CHAMPIONS, championPhotoKey } from '../data/champions.js';



const missing = new Set();
function onError(file) {
  missing.add(file.key);
}

export function loadCrewPhotos(scene) {
  for (const id of Object.keys(CHAMPIONS)) {
    if (CHAMPIONS[id].photo) continue; // uses another texture (Lars: photo_normal)
    const key = championPhotoKey(id);
    if (!scene.textures.exists(key) && !missing.has(key)) scene.load.image(key, `assets/faces/champions/${id}.png`);
  }
  scene.load.off('loaderror', onError);
  scene.load.on('loaderror', onError);
}

// Photos are scaled smoothly, unlike the pixel art (pixelArt: true sets nearest-neighbour).
export function smoothCrewPhotos(scene) {
  for (const id of Object.keys(CHAMPIONS)) {
    const key = championPhotoKey(id);
    if (scene.textures.exists(key)) scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.LINEAR);
  }
}

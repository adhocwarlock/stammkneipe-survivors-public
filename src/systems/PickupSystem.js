import { DROPS } from '../data/config.js';
import { BEERS, JOINT, IBU } from '../data/beers.js';
import { sfx } from '../audio/Sfx.js';

const BEER_IDS = Object.keys(BEERS);
const TOTAL_WEIGHT = BEER_IDS.reduce((s, id) => s + BEERS[id].weight, 0);

// Beers, joints and Ibu capsules dropped by monsters. Walking over one collects it; the scene applies the effect.
export class PickupSystem {
  constructor(scene, onCollect) {
    this.scene = scene;
    this.onCollect = onCollect; // (kind: 'beer' | 'joint' | 'ibu', id, x, y)
    this.group = scene.physics.add.group({ maxSize: 200 });
    this.beerDrops = 0;
    this.serial = 0;
  }

  oldest() {
    let best = null;
    for (const c of this.group.getChildren()) if (!best || c.spawnSerial < best.spawnSerial) best = c;
    return best;
  }

  tryDrop(x, y) {
    // Ibu: its own roll, so beer/joint drop rates stay as they were. Offset so both stay visible.
    const ibu = Math.random() < IBU.dropChance;
    if (ibu) this.spawn(x + 14, y + 6, 'ibu', 'ibu', IBU.sprite);
    if (Math.random() >= DROPS.bottleChance) return;
    this.beerDrops++;
    // Every Nth beer drop is a joint instead.
    if (this.beerDrops % JOINT.beerDropsPerJoint === 0) {
      this.spawn(x, y, 'joint', 'joint', JOINT.sprite);
      return;
    }
    const id = pickWeighted();
    this.spawn(x, y, 'beer', id, BEERS[id].sprite);
  }

  spawn(x, y, kind, id, sprite) {
    const hasArt = this.scene.textures.exists(sprite);
    const key = hasArt ? sprite : 'ph_bottle';
    // Pool full (pickups never expire on the big map): reuse the oldest one instead of dropping nothing.
    const b = this.group.get(x, y, key) || this.oldest();
    if (!b) return;
    b.spawnSerial = ++this.serial;
    b.enableBody(true, x, y, true, true);
    b.setTexture(key, hasArt ? 'default_0' : undefined).setOrigin(0.5, 1).setDepth(y);
    b.body.setSize(b.width * 1.4, b.height * 0.8); // a bit generous, pickups should feel easy
    if (this.scene.anims.exists(`${key}_glint`)) b.play(`${key}_glint`);
    else b.anims?.stop();
    b.kind = kind;
    b.itemId = id;
  }

  // A random beer, always (event rewards).
  dropBeer(x, y) {
    const id = pickWeighted();
    this.spawn(x, y, 'beer', id, BEERS[id].sprite);
  }

  collect(b) {
    if (!b.active) return;
    b.disableBody(true, true);
    if (b.kind === 'beer' || b.kind === 'ibu') sfx.play('pickup_bottle', b.x);
    this.onCollect(b.kind, b.itemId, b.x, b.y);
  }
}

function pickWeighted() {
  let r = Math.random() * TOTAL_WEIGHT;
  for (const id of BEER_IDS) {
    r -= BEERS[id].weight;
    if (r <= 0) return id;
  }
  return BEER_IDS[0];
}

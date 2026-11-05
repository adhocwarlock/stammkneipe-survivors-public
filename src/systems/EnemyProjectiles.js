import { ENEMY_PROJECTILES } from '../data/enemies.js';
import { sfx } from '../audio/Sfx.js';

// Pooled enemy shots (arrows, ninja stars, minigun bullets). Each one carries `damage`; the scene overlaps `group` with Lars.
// The hit circle sits at ground level (feet, like every other body); the sprite is drawn `shotHeight` above it.
export class EnemyProjectiles {
  constructor(scene, town) {
    this.scene = scene;
    this.town = town;
    this.group = scene.physics.add.group({ maxSize: ENEMY_PROJECTILES.poolSize, allowGravity: false });
    this.kinds = {};
    for (const [id, k] of Object.entries(ENEMY_PROJECTILES.kinds)) this.kinds[id] = this.resolveKind(id, k);
    scene.physics.add.overlap(this.group, town.walls, (a, b) => this.hit(a.enemyShot ? a : b));
  }

  resolveKind(id, k) {
    const scene = this.scene;
    if (scene.textures.exists(k.sprite)) {
      const tex = scene.textures.get(k.sprite);
      return { ...k, texture: k.sprite, frame: tex.has('default_0') ? 'default_0' : undefined };
    }
    const key = `ph_enemy_${id}`;
    if (!scene.textures.exists(key)) {
      const g = scene.make.graphics({ x: 0, y: 0, add: false });
      if (id === 'arrow') {
        g.fillStyle(0x8a5a2a).fillRect(0, 2, 16, 2); // shaft, pointing right
        g.fillStyle(0xd0d0d0).fillTriangle(15, 0, 21, 3, 15, 6);
        g.fillStyle(0xe8e0d0).fillRect(0, 0, 3, 2).fillRect(0, 4, 3, 2); // fletching
        g.generateTexture(key, 22, 6);
      } else if (id === 'bullet') {
        g.fillStyle(0xffe080).fillRect(0, 1, 14, 4); // minigun tracer, pointing right
        g.fillStyle(0xffffff).fillRect(9, 2, 5, 2);
        g.generateTexture(key, 14, 6);
      } else {
        g.fillStyle(0xb0b8c8);
        g.fillTriangle(7, 0, 5, 7, 9, 7).fillTriangle(7, 14, 5, 7, 9, 7);
        g.fillTriangle(0, 7, 7, 5, 7, 9).fillTriangle(14, 7, 7, 5, 7, 9);
        g.fillStyle(0x303640).fillCircle(7, 7, 1.5);
        g.generateTexture(key, 14, 14);
      }
      g.destroy();
    }
    return { ...k, texture: key, frame: undefined };
  }

  // Shoots from ground position (x, y) towards ground position (targetX, targetY).
  fire(kind, x, y, targetX, targetY, damage, speed) {
    const k = this.kinds[kind];
    if (!k) return null;
    const h = ENEMY_PROJECTILES.shotHeight;
    const p = this.group.get(x, y - h, k.texture, k.frame);
    if (!p) return null; // pool is full
    if (p.texture.key !== k.texture) p.setTexture(k.texture, k.frame);
    p.setOrigin(0.5, 0.5);
    p.enableBody(true, x, y - h, true, true);
    const r = k.radius;
    p.body.setAllowGravity(false);
    p.body.setCircle(r, p.displayOriginX - r, p.displayOriginY + h - r);
    p.body.updateFromGameObject();

    let dx = targetX - x;
    let dy = targetY - y;
    const len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;
    p.body.setVelocity(dx * speed, dy * speed);
    p.setRotation(k.spin ? Math.random() * Math.PI : Math.atan2(dy, dx));
    p.enemyShot = true;
    p.kind = kind;
    p.damage = damage;
    p.spin = k.spin;
    p.life = k.maxRange / speed;
    sfx.shot(kind, x);
    p.setDepth(y + 1);
    return p;
  }

  update(dt) {
    const h = ENEMY_PROJECTILES.shotHeight;
    const list = this.group.getChildren();
    for (let i = 0; i < list.length; i++) {
      const p = list[i];
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        this.hit(p);
        continue;
      }
      if (p.spin) p.rotation += p.spin * dt;
      p.setDepth(p.y + h + 1);
    }
  }

  // Removes a projectile (hit Lars, a wall, or flew too far).
  hit(p) {
    if (!p.active) return;
    p.disableBody(true, true);
  }
}

import { MAP_SPAWN, SPAWN, WORLD } from '../data/config.js';
import { ENEMY_TYPES, ENEMY_DEFAULTS, ENEMY_SPAWN, PLAYER_AFFLICTIONS } from '../data/enemies.js';
import { formatEuro } from '../utils/format.js';
import { FlowField } from './FlowField.js';
import { EnemyProjectiles } from './EnemyProjectiles.js';
import { resolveType } from './enemies/types.js';
import { Spawner } from './enemies/Spawner.js';
import { Abilities } from './enemies/Abilities.js';
import { EnemyFx } from './enemies/EnemyFx.js';
import { EnemyArt } from './enemies/EnemyArt.js';
import { KillBosses } from './enemies/KillBosses.js';
import { sfx } from '../audio/Sfx.js';

// What the enemies need from the scene (set with attach()). Defaults do nothing.
const NO_HOOKS = {
  hurtPlayer() {}, // (damage) armour + invulnerability apply
  slowPlayer() {}, // (speedMul, seconds)
  ignitePlayer() {}, // (dps, seconds)
  stealPfand() { return 0; }, // (cents) => cents actually taken from the save
  returnPfand() {}, // (cents) stolen money back (not counted as run earnings)
  onPfand() {}, // (cents) reward: run earnings + save
  onChasedOff() {}, // (typeId) a fleeing enemy (skinhead) got away
  popup: null,
  floatingText: null,
  pickups: null,
  bossBar: null,
};

// Spawns enemies off-screen by the minute timeline (data/timeline.js), steers melee types through the
// streets via the flow field, keeps ranged types at a distance, runs their telegraphed attacks
// (enemies/Abilities.js), handles damage/death and the kill-count bosses.
export class EnemySystem {
  constructor(scene, town, onKilled) {
    this.scene = scene;
    this.town = town;
    this.onKilled = onKilled; // (x, y, typeId, byWeaponId | null)
    // Kill attribution (combo progress): WeaponSystem sets the id of the weapon whose update is running; enemies
    // remember the last weapon that hit them, so burn / cloud kills later still count for it. 'crew' = not Lars.
    this.source = null;
    this.group = scene.physics.add.group({ maxSize: SPAWN.hardCap });
    this.projectiles = new EnemyProjectiles(scene, town);
    this.flow = new FlowField(town.grid, town.px);
    this.flowTimer = 0;
    this.dir = { x: 0, y: 0 };
    this.mosh = null; // MoshPit (crew), set by CrewSystem
    this.hooks = NO_HOOKS;
    this.player = null;
    this.minutes = 0;
    this.serial = 0; // every spawn gets a new serial, so references can tell a pooled sprite was reused

    this.types = {};
    this.typeList = [];
    for (const [id, def] of Object.entries(ENEMY_TYPES)) {
      const t = resolveType(scene, id, def, this.typeList.length);
      this.types[id] = t;
      this.typeList.push(t);
    }
    this.alive = new Int16Array(this.typeList.length);
    this.aliveTotal = 0;
    this.fx = new EnemyFx(scene);
    this.art = new EnemyArt(scene);
    this.abilities = new Abilities(this);
    this.spawner = new Spawner(this);
    this.killBosses = new KillBosses(this);
    // Types with a steady spawn rate (skinheads) run on their own timers, outside the timeline.
    this.steady = this.typeList.filter((t) => t.steady).map((t) => ({ t, timer: t.steady.interval }));
  }

  attach(hooks) {
    this.hooks = { ...NO_HOOKS, ...hooks };
  }

  // skeleton_archer -> skeleton, zombie__wasserleiche -> zombie, horned_demon -> horned_demon.
  familyOf(typeId) {
    return this.types[typeId]?.family ?? typeId;
  }

  // ---- per frame -------------------------------------------------------------------------------

  update(dt, player, elapsed) {
    const minutes = elapsed / 60;
    this.minutes = minutes;
    this.player = player;

    this.flowTimer -= dt;
    if (this.flowTimer <= 0) {
      this.flowTimer = ENEMY_SPAWN.flowRefreshSeconds;
      this.flow.update(player.x, player.y);
    }
    this.fx.beginFrame(dt);
    this.spawner.update(dt, minutes, elapsed);
    for (const st of this.steady) {
      st.timer -= dt;
      if (st.timer > 0) continue;
      st.timer = st.t.steady.interval;
      if (this.countType(st.t.id) < st.t.steady.maxAlive) this.spawn(minutes, st.t.id);
    }
    this.killBosses.update(minutes);

    const playerR = player.sprite.body.halfWidth;
    const recycle2 = MAP_SPAWN.recycleDist * MAP_SPAWN.recycleDist;
    const bossFar2 = ENEMY_SPAWN.bossRecycleDist * ENEMY_SPAWN.bossRecycleDist;
    let recycles = 0;
    const enemies = this.group.getChildren();
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (!e.active) continue;
      // Left far behind on the big map: move it to a fresh spot near Lars instead of wasting a slot.
      // Bosses (dragon, kill-count bosses) only after a while, keeping their HP.
      if (recycles < MAP_SPAWN.recyclePerFrame && !e.fleeing && !e.scripted) {
        const rx = e.x - player.x;
        const ry = e.y - player.y;
        const d2 = rx * rx + ry * ry;
        if (e.boss) {
          e.farT = d2 > bossFar2 ? e.farT + dt : 0;
          if (e.farT >= ENEMY_SPAWN.bossRecycleSeconds) {
            recycles++;
            e.farT = 0;
            if (this.recycle(e)) continue;
          }
        } else if (d2 > recycle2) {
          recycles++;
          if (this.recycle(e)) continue;
        }
      }
      e.setDepth(e.y);

      if (e.flash > 0) {
        e.flash -= dt;
        if (e.flash <= 0) this.restoreTint(e);
      }
      if (e.attackCd > 0) e.attackCd -= dt;
      if (e.stealCd > 0) e.stealCd -= dt;
      if (e.buffT > 0 || e.slowT > 0) this.tickSpeed(e, dt);
      if (e.attackTimer > 0) {
        e.attackTimer -= dt;
        if (e.attackTimer <= 0 && e.knockback <= 0 && e.abIdx < 0 && e.visual.walkAnim) e.play(e.visual.walkAnim);
      }
      if (e.abilities) this.abilities.cool(e, dt);
      if (e.artFx) this.art.sync(e);
      if (e.knockback > 0) {
        e.knockback -= dt; // keep the knockback velocity until it runs out
        if (e.abIdx >= 0) this.abilities.tick(e, dt, player); // timers go on, no steering meanwhile
        else if (e.knockback <= 0 && e.visual.walkAnim) e.play(e.visual.walkAnim);
        continue;
      }
      if (e.scripted) continue; // moved by an event (Eigenbedarf boss attacks)
      const cx = e.body.center.x;
      const cy = e.body.center.y;
      if (e.moshT > 0 && this.mosh) {
        if (e.abIdx >= 0) this.abilities.stop(e);
        this.mosh.steer(e, dt); // Lars' crew call: enemies on screen mosh into each other
        continue;
      }
      if (e.abIdx >= 0) {
        this.abilities.tick(e, dt, player);
        continue;
      }
      if (e.abilities && !e.fleeing && this.abilities.tryStart(e, player, cx, cy)) continue;
      if (e.visual.contactAnim && e.attackCd <= 0) this.checkContactAnim(e, player, cx, cy, playerR);
      if (e.fleeing) this.steerFlee(e, player, dt, cx, cy);
      else if (e.ranged) this.steerRanged(e, player, dt, cx, cy);
      else this.steerMelee(e, player, cx, cy);
    }

    this.projectiles.update(dt);
    this.fx.update(dt);
  }

  steerMelee(e, player, cx, cy) {
    const dir = this.dir;
    if (!this.flow.directionAt(cx, cy, dir)) {
      const dx = player.x - cx;
      const dy = player.y - cy;
      const len = Math.hypot(dx, dy) || 1;
      dir.x = dx / len;
      dir.y = dy / len;
    }
    e.setVelocity(dir.x * e.speed, dir.y * e.speed);
    if (dir.x < -0.1) e.setFlipX(true);
    else if (dir.x > 0.1) e.setFlipX(false);
  }

  countType(id) {
    let n = 0;
    const enemies = this.group.getChildren();
    for (let i = 0; i < enemies.length; i++) if (enemies[i].active && enemies[i].enemyType === id) n++;
    return n;
  }

  // Alive count per type index + total (spawn ticks only, a few times per second).
  countAlive() {
    this.alive.fill(0);
    let total = 0;
    const enemies = this.group.getChildren();
    for (let i = 0; i < enemies.length; i++) {
      if (!enemies[i].active) continue;
      this.alive[enemies[i].typeIndex]++;
      total++;
    }
    this.aliveTotal = total;
  }

  // Hit once: runs straight away from Lars, whining, and disappears when far enough (no kill, no drop).
  steerFlee(e, player, dt, cx, cy) {
    const f = e.flees;
    const dx = cx - player.x;
    const dy = cy - player.y;
    const dist = Math.hypot(dx, dy) || 1;
    if (dist > f.despawnDist) {
      this.hooks.onChasedOff(e.enemyType);
      this.despawn(e);
      return;
    }
    e.setVelocity((dx / dist) * e.speed * f.speedMul, (dy / dist) * e.speed * f.speedMul);
    e.setFlipX(dx < 0);
    if (e.visual.fleeAnim && e.anims.currentAnim?.key !== e.visual.fleeAnim) e.play(e.visual.fleeAnim);
    e.whineTimer -= dt;
    if (e.whineTimer <= 0) this.whine(e);
  }

  whine(e) {
    e.whineTimer = e.flees.whineEvery;
    this.scene.events.emit('enemy-whine', e.body.center.x, e.body.center.y, Phaser.Utils.Array.GetRandom(e.flees.lines));
  }

  // Walk in until roughly preferredDist, then strafe sideways; back off when Lars is too close.
  // Types with a projectile only shoot with a clear line through the streets (walking in is the counter);
  // the others (wizard, necromancer) just keep their distance and use their abilities.
  steerRanged(e, player, dt, cx, cy) {
    const r = e.ranged;
    const dx = player.x - cx;
    const dy = player.y - cy;
    const dist = Math.hypot(dx, dy) || 1;
    const ux = dx / dist;
    const uy = dy / dist;

    if (e.windup > 0) {
      e.setVelocity(0, 0);
      e.setFlipX(ux < 0);
      e.windup -= dt;
      if (e.windup <= 0) {
        this.projectiles.fire(r.projectile, cx, cy, player.x, player.y, e.shotDamage, r.speed);
        e.shotTimer = r.cooldown * (1 + (Math.random() * 2 - 1) * r.cooldownJitter);
        if (e.visual.walkAnim) e.play(e.visual.walkAnim);
      }
      return;
    }

    const inRange = dist <= (r.range || r.preferredDist + r.holdBand);
    const los = inRange && this.lineOfSight(cx, cy, player.x, player.y);
    if (r.projectile) {
      e.shotTimer -= dt;
      if (los && e.shotTimer <= 0) {
        e.windup = r.aimPause;
        e.setVelocity(0, 0);
        e.setFlipX(ux < 0);
        if (e.visual.shootAnim) e.play({ key: e.visual.shootAnim, repeat: 0 });
        return;
      }
    }
    if (!los || dist > r.preferredDist + r.holdBand) {
      this.steerMelee(e, player, cx, cy);
      return;
    }

    e.strafeTimer -= dt;
    e.strafeHeld += dt;
    // Flip when the timer runs out or a wall stops the strafe (but not every frame while pressed against it).
    if (e.strafeTimer <= 0 || (!e.body.blocked.none && e.strafeHeld > 0.4)) {
      e.strafeSign = -e.strafeSign;
      e.strafeTimer = Phaser.Math.FloatBetween(r.strafeFlipMin, r.strafeFlipMax);
      e.strafeHeld = 0;
    }
    let vx = -uy * e.strafeSign * r.strafeMul;
    let vy = ux * e.strafeSign * r.strafeMul;
    if (dist < r.minDist) {
      vx -= ux * r.retreatMul;
      vy -= uy * r.retreatMul;
    } else {
      // Drift back towards the preferred distance.
      const radial = Phaser.Math.Clamp((dist - r.preferredDist) / r.holdBand, -1, 1) * 0.5;
      vx += ux * radial;
      vy += uy * radial;
    }
    e.setVelocity(vx * e.speed, vy * e.speed);
    e.setFlipX(ux < 0);
  }

  // Cheap sampled check along the segment against the town's solid tiles.
  lineOfSight(x0, y0, x1, y1) {
    const grid = this.town.grid;
    const px = this.town.px;
    const n = ENEMY_DEFAULTS.losSamples;
    for (let i = 1; i <= n; i++) {
      const f = i / (n + 1);
      const tx = Math.floor((x0 + (x1 - x0) * f) / px);
      const ty = Math.floor((y0 + (y1 - y0) * f) / px);
      if (grid.inside(tx, ty) && grid.isSolidTile(tx, ty)) return false;
    }
    return true;
  }

  // Cosmetic: ogre smash / ninja slash when touching Lars (damage itself is the scene's overlap).
  checkContactAnim(e, player, cx, cy, playerR) {
    const reach = e.body.halfWidth + playerR + e.contactSlack;
    const dx = player.x - cx;
    const dy = player.y - cy;
    if (dx * dx + dy * dy > reach * reach) return;
    e.play({ key: e.visual.contactAnim, repeat: 0 });
    e.attackTimer = e.visual.contactAnimSec;
    e.attackCd = Math.max(e.contactAnimCooldown, e.visual.contactAnimSec);
  }

  // ---- speed changes ---------------------------------------------------------------------------

  // Slows enemy `e` to speed x mul for `seconds` (weapons: Kettensäge...). Bosses and scripted ones ignore it.
  // No flash, no hurt frame. The stronger slow wins, the longer time wins.
  slow(e, mul, seconds) {
    if (!e.active || e.boss || e.scripted) return;
    e.slowMul = e.slowT > 0 ? Math.min(e.slowMul, mul) : mul;
    e.slowT = Math.max(e.slowT, seconds);
    this.applySpeed(e);
  }

  // Alpha-Werwolf howl: same-family enemies nearby run faster for a while.
  buffFamily(family, x, y, radius, mul, seconds) {
    const r2 = radius * radius;
    const enemies = this.group.getChildren();
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (!e.active || e.family !== family) continue;
      const dx = e.body.center.x - x;
      const dy = e.body.center.y - y;
      if (dx * dx + dy * dy > r2) continue;
      e.buffT = seconds;
      e.buffMul = mul;
      this.applySpeed(e);
    }
  }

  tickSpeed(e, dt) {
    const had = (e.buffT > 0) + (e.slowT > 0);
    if (e.buffT > 0) e.buffT -= dt;
    if (e.slowT > 0) e.slowT -= dt;
    if ((e.buffT > 0) + (e.slowT > 0) !== had) this.applySpeed(e);
  }

  applySpeed(e) {
    e.speed = e.baseSpeed * (e.buffT > 0 ? e.buffMul : 1) * (e.slowT > 0 ? e.slowMul : 1);
  }

  // ---- spawning --------------------------------------------------------------------------------

  // A timeline pick: rolls the type's variants (archer, thrower), spawns zombies as a clump.
  // Returns how many spawned.
  spawnPicked(idx, minutes) {
    const t = this.typeList[idx];
    const pos = this.findSpawnPoint();
    if (!pos) return 0;
    let id = t.id;
    const variants = t.variants;
    if (variants) {
      for (let i = 0; i < variants.length; i++) {
        if (Math.random() < variants[i].chance) {
          id = variants[i].type;
          break;
        }
      }
    }
    if (!t.clump) return this.spawn(minutes, id, pos) ? 1 : 0;
    const bx = pos.x;
    const by = pos.y;
    const n = Phaser.Math.Between(t.clump[0], t.clump[1]);
    let count = 0;
    for (let k = 0; k < n && this.aliveTotal < ENEMY_SPAWN.aliveCap; k++) {
      const a = k * 2.4; // golden-angle-ish spiral: a tight, natural-looking group
      const r = ENEMY_SPAWN.clumpSpacing * Math.sqrt(k);
      if (k > 0 && !this.trySpawnAt(bx + Math.cos(a) * r, by + Math.sin(a) * r)) continue;
      if (k === 0) this.trySpawnAt(bx, by);
      if (this.spawn(minutes, id, this.spawnPoint)) count++;
    }
    return count;
  }

  // pos: fixed spawn point (events), else a free spot just off-screen. hpMul: kill-count boss repeats.
  // Returns the enemy (or undefined).
  spawn(minutes, typeId, pos = this.findSpawnPoint(), hpMul = 1) {
    if (!pos) return undefined;
    const t = this.types[typeId];
    if (!t) return undefined;
    const v = t.visuals[Phaser.Math.Between(0, t.visuals.length - 1)];

    const e = this.group.get(pos.x, pos.y, v.texture, v.frame);
    if (!e) return undefined; // pool is full
    e.setTexture(v.texture, v.frame);
    e.setOrigin(v.originX, v.originY);
    e.setScale(v.scale);
    e.enableBody(true, pos.x, pos.y, true, true); // reset also picks up the new scale
    e.body.setCircle(v.r, v.ox, v.oy);
    e.body.updateFromGameObject();
    e.body.mass = t.mass;
    if (!e.initialized) {
      e.setCollideWorldBounds(true);
      e.initialized = true;
    }
    if (v.walkAnim) e.play(v.walkAnim);
    else e.anims.stop();

    e.serial = ++this.serial;
    e.visual = v;
    e.enemyType = t.id; // not `type`: that's Phaser's own GameObject.type
    e.typeIndex = t.index;
    e.family = t.family;
    e.boss = !!t.boss; // bosses are never recycled when left behind
    e.lastSource = null;
    e.elite = !!t.elite; // bosses + elites take reduced damage from map-clearing crew attacks
    e.burnLeft = 0; // BurnSystem drops pooled enemies that come back (see BurnSystem.update)
    e.moshT = 0;
    e.scripted = false;
    e.hp = t.hp * (1 + minutes * ENEMY_SPAWN.hpGrowthPerMinute) * hpMul;
    e.maxHp = e.hp;
    e.dmgMul = 1 + minutes * ENEMY_SPAWN.damageGrowthPerMinute;
    e.contactDamage = Math.round(t.contactDamage * e.dmgMul);
    e.speed = t.speed;
    e.baseSpeed = t.speed;
    e.buffT = 0;
    e.buffMul = 1;
    e.slowT = 0;
    e.slowMul = 1;
    e.knockbackMul = t.knockbackMul;
    e.contactSlack = t.contactSlack;
    e.contactAnimCooldown = t.contactAnimCooldown;
    e.knockback = 0;
    e.flash = 0;
    e.attackTimer = 0;
    e.attackCd = 0;
    e.flees = t.flees || null;
    e.fleeing = false;
    e.whineTimer = 0;
    e.ranged = t.ranged || null;
    e.windup = 0;
    if (e.ranged?.projectile) {
      e.shotDamage = Math.round(e.ranged.damage * e.dmgMul);
      e.shotTimer = e.ranged.firstShotDelay;
    }
    if (e.ranged) {
      e.strafeSign = Math.random() < 0.5 ? -1 : 1;
      e.strafeTimer = Phaser.Math.FloatBetween(e.ranged.strafeFlipMin, e.ranged.strafeFlipMax);
      e.strafeHeld = 0;
    }
    e.abilities = t.abilities;
    this.abilities.init(e);
    e.shield = t.shield || 0;
    e.shieldMax = e.shield;
    e.shieldFx = null;
    if (e.shield) this.fx.attachShield(e);
    e.steal = t.steal || null;
    e.stealCd = 0;
    e.stolen = 0;
    e.ignite = t.ignite || null;
    e.deathSpawn = t.deathSpawn || null;
    e.minions = 0;
    e.master = null;
    e.masterSerial = 0;
    e.killBoss = null;
    e.farT = 0;
    this.art.attach(e, t);
    this.restoreTint(e);
    this.alive[t.index]++;
    this.aliveTotal++;
    if (t.bar) this.hooks.bossBar?.track(e, t.barName);
    if (t.banner) this.hooks.popup?.showBanner(t.banner, 2.5);
    sfx.enemy(t.family, 'spawn', pos.x, e.boss);
    return e;
  }

  restoreTint(e) {
    if (e.visual.tint !== null) e.setTint(e.visual.tint);
    else e.clearTint();
  }

  // Necromancer: raises skeletons around himself (they crumble when he dies).
  summon(master, ab, cx, cy) {
    const n = Math.min(ab.count, ab.maxMinions - master.minions);
    for (let k = 0; k < n; k++) {
      const a = Math.random() * Math.PI * 2;
      if (!this.trySpawnAt(cx + Math.cos(a) * ab.spread, cy + Math.sin(a) * ab.spread)) continue;
      const m = this.spawn(this.minutes, ab.type, this.spawnPoint);
      if (!m) break;
      m.master = master;
      m.masterSerial = master.serial;
      master.minions++;
      this.fx.ring(m.body.center.x, m.body.center.y, 30, 0x7cff7a);
    }
  }

  // Debug: a monster of `typeId` near (x, y).
  spawnNear(typeId, x, y) {
    for (let k = 0; k < 12; k++) {
      const a = Math.random() * Math.PI * 2;
      const d = 220 + k * 20;
      if (this.trySpawnAt(x + Math.cos(a) * d, y + Math.sin(a) * d)) return this.spawn(this.minutes, typeId, this.spawnPoint);
    }
    return undefined;
  }

  // Picks a point just outside the visible camera area: free (no wall), and reachable from the start, so
  // nothing spawns in water, the railway cut, houses or sealed-off spots. Spawn hot spots from the map data
  // (Kirchplatz) near the view get a share of the spawns by their weight (the normal ring counts as 1).
  findSpawnPoint() {
    const view = this.scene.cameras.main.worldView;
    const hot = this.pickHotspot(view);
    if (hot && this.spawnInHotspot(hot, view)) return this.spawnPoint;
    const m = SPAWN.offscreenMargin;
    for (let attempt = 0; attempt < MAP_SPAWN.attempts; attempt++) {
      let x;
      let y;
      switch (Phaser.Math.Between(0, 3)) {
        case 0: x = Phaser.Math.Between(view.x - m, view.right + m); y = view.y - m; break;
        case 1: x = Phaser.Math.Between(view.x - m, view.right + m); y = view.bottom + m; break;
        case 2: x = view.x - m; y = Phaser.Math.Between(view.y - m, view.bottom + m); break;
        default: x = view.right + m; y = Phaser.Math.Between(view.y - m, view.bottom + m); break;
      }
      if (this.trySpawnAt(x, y)) return this.spawnPoint;
    }
    return null;
  }

  // Same enemy (type, HP, look) at a new spawn point; false if no free spot was found this time.
  recycle(e) {
    const pos = this.findSpawnPoint();
    if (!pos) return false;
    e.enableBody(true, pos.x, pos.y, true, true);
    e.setVelocity(0, 0);
    e.knockback = 0;
    e.windup = 0;
    e.attackTimer = 0;
    if (e.abIdx >= 0) this.abilities.stop(e);
    if (e.visual.walkAnim) e.play(e.visual.walkAnim);
    return true;
  }

  trySpawnAt(x, y) {
    const pad = MAP_SPAWN.wallPadding;
    if (x < pad || y < pad || x > WORLD.width - pad || y > WORLD.height - pad) return false;
    if (!this.town.grid.isReachable(x, y) || this.town.isBlocked(x, y, pad)) return false;
    this.spawnPoint = this.spawnPoint || { x: 0, y: 0 };
    this.spawnPoint.x = x;
    this.spawnPoint.y = y;
    return true;
  }

  // Weighted pick among the hot spots near the view (null = use the normal ring).
  pickHotspot(view) {
    const spots = this.town.spawnHotspots;
    if (!spots.length) return null;
    const px = this.town.px;
    const reach = MAP_SPAWN.hotspotReach;
    let total = 1;
    for (let i = 0; i < spots.length; i++) if (this.hotspotNear(spots[i], view, px, reach)) total += spots[i].weight;
    if (total === 1) return null;
    let roll = Math.random() * total - 1; // [-1, 0) = the normal ring
    if (roll < 0) return null;
    for (let i = 0; i < spots.length; i++) {
      if (!this.hotspotNear(spots[i], view, px, reach)) continue;
      roll -= spots[i].weight;
      if (roll < 0) return spots[i];
    }
    return null;
  }

  hotspotNear(h, view, px, reach) {
    const [x, y, w, hh] = h.rect;
    return x * px < view.right + reach && (x + w) * px > view.x - reach
      && y * px < view.bottom + reach && (y + hh) * px > view.y - reach;
  }

  spawnInHotspot(h, view) {
    const px = this.town.px;
    const m = SPAWN.offscreenMargin;
    const [hx, hy, hw, hh] = h.rect;
    for (let attempt = 0; attempt < MAP_SPAWN.hotspotAttempts; attempt++) {
      const x = (hx + Math.random() * hw) * px;
      const y = (hy + Math.random() * hh) * px;
      if (x > view.x - m && x < view.right + m && y > view.y - m && y < view.bottom + m) continue; // visible
      if (this.trySpawnAt(x, y)) return true;
    }
    return false;
  }

  // ---- damage ----------------------------------------------------------------------------------

  // Deals damage and knocks the enemy away from (fromX, fromY) (heavy types resist via knockbackMul).
  // A wizard's shield takes the hit instead (one crack per hit, whatever the damage).
  damage(e, amount, fromX, fromY, knockbackSpeed, knockbackSeconds) {
    if (e.shield > 0) {
      e.shield--;
      this.fx.setShieldStage(e);
      e.setTintFill(0x9ad8ff);
      e.flash = 0.06;
      sfx.play('e_shield_hit', e.x);
      return;
    }
    if (this.source) e.lastSource = this.source;
    e.hp -= amount;
    e.setTintFill(0xffffff);
    e.flash = 0.08;
    if (e.hp <= 0) {
      this.kill(e);
      return;
    }
    sfx.enemy(e.family, 'hurt', e.x, e.boss);
    const dx = e.body.center.x - fromX;
    const dy = e.body.center.y - fromY;
    const len = Math.hypot(dx, dy) || 1;
    const speed = knockbackSpeed * e.knockbackMul;
    e.setVelocity((dx / len) * speed, (dy / len) * speed);
    e.knockback = knockbackSeconds;
    if (e.flees && !e.fleeing) {
      e.fleeing = true;
      this.whine(e);
    }
    if (e.visual.hurtFrame && e.abIdx < 0) {
      e.anims.stop();
      e.setFrame(e.visual.hurtFrame);
    }
  }

  // Damage over time (burning, mint cloud): no knockback, no hurt frame, just a short flash.
  // tint = false (or { tint: false }): no flash at all. Shielded wizards are immune while the bubble holds.
  damageQuiet(e, amount, tint = true) {
    if (e.shield > 0) return;
    if (this.source) e.lastSource = this.source;
    e.hp -= amount;
    if (e.hp <= 0) {
      this.kill(e);
      return;
    }
    if (tint !== false && tint?.tint !== false && e.flash <= 0) {
      e.setTintFill(0xffb060);
      e.flash = 0.05;
    }
    if (e.flees && !e.fleeing) {
      e.fleeing = true;
      this.whine(e);
    }
  }

  isTough(e) {
    return e.boss || e.elite;
  }

  // The scene's contact damage on Lars landed: the Monopoly man's cane steals, horned demon claws burn.
  onHitPlayer(e) {
    const p = this.player;
    if (e.steal && e.stealCd <= 0 && p) {
      e.stealCd = e.steal.cooldown;
      const got = this.hooks.stealPfand(e.steal.cents) || 0;
      sfx.enemy(e.family, 'steal', p.x);
      e.stolen += got;
      const ft = this.hooks.floatingText;
      if (ft) {
        ft.show(p.x, p.y - PLAYER_AFFLICTIONS.textY, got > 0 ? `−${formatEuro(got)}` : 'Pleite!', PLAYER_AFFLICTIONS.stealColor);
        const lines = this.types[e.enemyType].lines;
        if (lines) ft.show(e.body.center.x, e.body.center.y - 90, Phaser.Utils.Array.GetRandom(lines), '#e0e0e0');
      }
    }
    if (e.ignite) this.hooks.ignitePlayer(e.ignite.dps * e.dmgMul, e.ignite.seconds);
  }

  kill(e) {
    const x = e.body.center.x;
    const y = e.body.center.y;
    // Everything that reads `e` happens before anything new spawns: the burst below can reuse this pool slot.
    const typeId = e.enemyType;
    const by = this.source || e.lastSource;
    const deathSpawn = e.deathSpawn;
    const reward = this.types[typeId].reward;
    sfx.enemy(e.family, 'death', x, e.boss);
    this.despawn(e);
    if (e.master && e.master.serial === e.masterSerial) e.master.minions--;
    if (e.minions > 0) this.crumbleMinions(e);
    if (e.steal) this.payBack(e, x, y);
    if (e.killBoss) this.killBosses.onBossKilled(e, x, y);
    else if (!e.boss) this.killBosses.onKill(e.family);
    if (reward) this.payReward(reward, x, y);
    this.onKilled(x, y, typeId, by === 'crew' ? null : by);
    if (deathSpawn) this.burst(deathSpawn, x, y);
  }

  // Dragon: Pfand + a ring of beer bottles.
  payReward(r, x, y) {
    const h = this.hooks;
    sfx.play('pfand_big', x);
    if (r.cents) {
      h.onPfand(r.cents);
      h.popup?.show(x, y, { title: 'PFAND!!', label: `+${formatEuro(r.cents)}`, bad: false, iconKey: null });
    }
    for (let i = 0; i < (r.bottles || 0); i++) {
      const a = (i / r.bottles) * Math.PI * 2;
      h.pickups?.dropBeer(x + Math.cos(a) * r.spread, y + Math.sin(a) * r.spread * 0.6);
    }
  }

  // Gone without a kill (fled, crumbled) or the first step of a kill.
  despawn(e) {
    e.clearTint();
    e.disableBody(true, true);
    e.abIdx = -1;
    this.art.release(e);
  }

  // A dead necromancer's skeletons fall apart: no kill, no drop.
  crumbleMinions(master) {
    const enemies = this.group.getChildren();
    for (let i = 0; i < enemies.length; i++) {
      const m = enemies[i];
      if (!m.active || m.master !== master || m.masterSerial !== master.serial) continue;
      this.fx.ring(m.body.center.x, m.body.center.y, 24, 0xd8d8d0);
      m.master = null;
      this.despawn(m);
    }
    master.minions = 0;
  }

  // Monopoly man beaten: everything he stole back + a bonus.
  payBack(e, x, y) {
    const back = e.stolen;
    const bonus = e.steal.bonusCents;
    e.stolen = 0;
    if (back > 0) this.hooks.returnPfand(back);
    sfx.play('pfand_big', x);
    this.hooks.onPfand(bonus);
    this.hooks.popup?.show(x, y, { title: 'PFAND ZURÜCK!!', label: `+${formatEuro(back + bonus)}`, bad: false, iconKey: null });
  }

  // Zombie-Opa bursts into zombies.
  burst(ds, x, y) {
    for (let k = 0; k < ds.count; k++) {
      const a = (k / ds.count) * Math.PI * 2;
      if (this.trySpawnAt(x + Math.cos(a) * ds.radius, y + Math.sin(a) * ds.radius)) this.spawn(this.minutes, ds.type, this.spawnPoint);
    }
  }

  pauseAnims() {
    this.fx.pauseAnims();
  }

  // Nearest living enemy whose edge is within `range` of (x, y), or null.
  findNearest(x, y, range) {
    let best = null;
    let bestDist = Infinity;
    const enemies = this.group.getChildren();
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (!e.active) continue;
      const d = Math.hypot(e.body.center.x - x, e.body.center.y - y) - e.body.halfWidth;
      if (d <= range && d < bestDist) {
        best = e;
        bestDist = d;
      }
    }
    return best;
  }
}

import { createPlaceholderTextures } from '../systems/textures.js';
import { registerSprites } from '../art/render.js';
import { Town } from '../world/Town.js';
import { InputSystem } from '../systems/InputSystem.js';
import { EnemySystem } from '../systems/EnemySystem.js';
import { PickupSystem } from '../systems/PickupSystem.js';
import { StatusSystem } from '../systems/StatusSystem.js';
import { Save } from '../systems/SaveSystem.js';
import { DIFFICULTY_TAPS } from '../data/config.js';
import { Player } from '../entities/Player.js';
import { WeaponSystem } from '../weapons/WeaponSystem.js';
import { HUD } from '../ui/HUD.js';
import { FloatingText } from '../ui/FloatingText.js';
import { Popup } from '../ui/Callouts.js';
import { ShopMenu } from '../ui/ShopMenu.js';
import { EimerShop } from '../ui/EimerShop.js';
import { SpeechBubble } from '../ui/SpeechBubble.js';
import { AbilityButton } from '../ui/AbilityButton.js';
import { BurnSystem } from '../systems/BurnSystem.js';
import { CrewSystem } from '../crew/CrewSystem.js';
import { createCrewPlaceholders } from '../crew/placeholders.js';
import { EigenbedarfEvent } from '../systems/EigenbedarfEvent.js';
import { createEnemyPlaceholders } from '../systems/enemies/placeholders.js';
import { PlayerAfflictions } from '../systems/enemies/PlayerAfflictions.js';
import { BossBar } from '../ui/BossBar.js';
import { ENEMY_TYPES, EIGENBEDARF } from '../data/enemies.js';
import { WEAPONS } from '../data/weapons.js';
import { Hero } from '../systems/Hero.js';
import { loadCrewPhotos, smoothCrewPhotos } from '../systems/photos.js';
import { showGameOver } from '../ui/RunOverScreen.js';
import { VirtualJoystick } from '../ui/VirtualJoystick.js';
import { PauseMenu } from '../ui/PauseMenu.js';
import { Minimap } from '../ui/Minimap.js';
import { CameraLayers } from '../systems/CameraLayers.js';
import { ComboSystem } from '../systems/ComboSystem.js';
import { ScreenFX } from '../fx/ScreenFX.js';
import { Sparks } from '../fx/Sparks.js';
import { BEERS, JOINT, IBU } from '../data/beers.js';
import { FACE_PHOTOS } from '../data/faces.js';
import { SHOPS, SPECIAL_SHOPS } from '../data/shops.js';
import { DRINKS } from '../data/drinks.js';
import { CHAMPIONS } from '../data/champions.js';
import { formatEuro } from '../utils/format.js';
import { Audio } from '../audio/AudioEngine.js';
import { sfx } from '../audio/Sfx.js';

const DEBUG = new URLSearchParams(location.search).has('debug');

// Wires the systems together; gameplay logic lives in the systems themselves.
export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  init(data) {
    this.tester = !!data?.tester; // no damage, huge test wallet (see MenuScene / Save.beginTestSession)
    // ?debug&hero=mike: play another hero without the (secret) start-screen select.
    const hero = new URLSearchParams(location.search).get('hero');
    if (DEBUG && hero) Hero.set(hero);
  }

  preload() {
    
    for (const expr of FACE_PHOTOS) this.load.image(`photo_${expr}`, `assets/faces/${expr}.png`);
    loadCrewPhotos(this); // crew + hero photos; missing ones fall back to Lars' face
  }

  create() {
    registerSprites(this);
    createPlaceholderTextures(this);
    createCrewPlaceholders(this);
    createEnemyPlaceholders(this);
    // Photos must be smoothly scaled, unlike the pixel art (pixelArt: true sets nearest-neighbour).
    for (const expr of FACE_PHOTOS) this.textures.get(`photo_${expr}`)?.setFilter(Phaser.Textures.FilterMode.LINEAR);
    smoothCrewPhotos(this);

    this.stats = { elapsed: 0, kills: 0, killsByType: {}, chasedOff: 0, beers: 0, joints: 0, pfandCents: 0 };
    this.isOver = false;
    this.paused = false;
    this.inShop = false;
    this.doorArmed = true; // must leave a door zone before it can open the shop again

    this.town = new Town(this);
    this.joystick = new VirtualJoystick(this);
    this.controls = new InputSystem(this, this.joystick);
    this.status = new StatusSystem();
    this.player = new Player(this, this.town.startX, this.town.startY);
    this.floatingText = new FloatingText(this);
    this.popup = new Popup(this);
    this.sparks = new Sparks(this);
    this.pickups = new PickupSystem(this, (kind, id, x, y) => this.onCollect(kind, id, x, y));
    this.enemies = new EnemySystem(this, this.town, (x, y, type, by) => {
      this.stats.kills++;
      this.combos?.onKill(by); 
      const family = this.enemies.familyOf(type); // skeleton_archer -> skeleton, zombie__wasserleiche -> zombie
      this.stats.killsByType[family] = (this.stats.killsByType[family] || 0) + 1;
      this.pickups.tryDrop(x, y);
    });
    this.burn = new BurnSystem(this, this.enemies);
    this.weapons = new WeaponSystem(this, { player: this.player, enemies: this.enemies, sparks: this.sparks, burn: this.burn });
    this.bubble = new SpeechBubble(this);
    this.crew = new CrewSystem(this, {
      player: this.player, enemies: this.enemies, town: this.town, burn: this.burn, sparks: this.sparks,
      popup: this.popup, bubble: this.bubble, pickups: this.pickups,
    });
    this.eigenbedarf = new EigenbedarfEvent(this, {
      enemies: this.enemies, player: this.player, pickups: this.pickups, popup: this.popup,
      floatingText: this.floatingText, crewFx: this.crew.fx,
      hurtPlayer: (dmg) => this.hurtPlayer(dmg),
      onPfand: (cents) => {
        this.stats.pfandCents += cents;
        Save.addPfand(cents);
      },
    });
    this.combos = new ComboSystem(this, {
      popup: this.popup, floatingText: this.floatingText, player: this.player,
      applyLoadout: (w, h, g) => this.applyLoadout(w, h, g),
    });
    this.applyLoadout(Save.data.equipped.weapons, Save.data.equipped.helmet, Save.data.equipped.gear);
    this.fx = new ScreenFX(this);
    this.hud = new HUD(this);
    this.abilityButton = new AbilityButton(this, () => this.useAbility());
    this.setupMonsters();
    this.shop = new ShopMenu(this);
    this.eimerShop = new EimerShop(this);
    this.minimap = new Minimap(this, { town: this.town, enemies: this.enemies, player: this.player });
    this.pauseMenu = new PauseMenu(this, {
      onToggle: () => this.togglePause(),
      onRestart: () => this.scene.restart(),
      onZoom: (z) => this.layers.setZoom(z),
      onMinimap: (on) => this.minimap.setOn(on),
    });

    // Fleeing skinheads whine.
    this.events.on('enemy-whine', (x, y, text) => this.floatingText.show(x, y - 60, text, '#9ad0ff'));
    this.setupKeys();
    this.setupDifficultyTaps();
    const p = this.player.sprite;
    this.physics.add.collider(p, this.town.walls);
    this.physics.add.collider(this.enemies.group, this.town.walls);
    this.physics.add.collider(this.enemies.group, this.enemies.group); // goblins don't stack into one pixel
    this.physics.add.overlap(p, this.enemies.group, (_p, enemy) => this.onPlayerTouched(enemy));
    this.physics.add.overlap(p, this.pickups.group, (_p, item) => this.pickups.collect(item));
    this.physics.add.overlap(p, this.enemies.projectiles.group, (_p, shot) => this.onPlayerShot(shot));

    const cam = this.cameras.main;
    const bounds = this.physics.world.bounds;
    cam.setBounds(0, 0, bounds.width, bounds.height);
    cam.setRoundPixels(true);
    cam.startFollow(p, true, 0.15, 0.15, 0, 40);
    sfx.attach(cam); // stereo position of sound effects
    this.layers = new CameraLayers(this, Save.data.settings.zoom); // world zoom (pause menu), HUD unzoomed
    this.minimap.setOn(Save.data.settings.minimap);
    this.setupAudio();
  }

  // Hero theme for the run (restarting the run keeps it going); M feedback next to the player.
  setupAudio() {
    Audio.init();
    Audio.music.play(`theme_${Hero.id}`);
    let muted = Audio.muted;
    const off = Audio.onChange(() => {
      if (Audio.muted === muted) return;
      muted = Audio.muted;
      this.floatingText.show(this.player.x, this.player.y - 120, muted ? 'TON AUS' : 'TON AN', '#9a9a9a');
    });
    this.events.once('shutdown', off);
  }

  setupKeys() {
    const kb = this.input.keyboard;
    kb.on('keydown-ESC', () => this.togglePause());
    kb.on('keydown-ENTER', () => { if (this.paused) this.togglePause(); });
    kb.on('keydown-SPACE', () => { if (this.paused) this.togglePause(); });
    kb.on('keydown-E', () => this.useAbility());
    this.altKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.ALT); // captured, so Alt doesn't focus the browser menu
    // Test keys: in ?debug and in tester mode (Shift+click SPIELEN).
    if (DEBUG || this.tester) {
      kb.on('keydown-J', () => this.onCollect('joint', 'joint', this.player.x, this.player.y));
      kb.on('keydown-B', () => {
        const ids = Object.keys(BEERS);
        this.onCollect('beer', ids[Phaser.Math.Between(0, ids.length - 1)], this.player.x, this.player.y);
      });
      kb.on('keydown-P', () => Save.addPfand(1000)); 
      
      kb.on('keydown-C', () => {
        const id = this.crew.cycleChampion();
        this.floatingText.show(this.player.x, this.player.y - 120, id ? CHAMPIONS[id].name : 'keine Crew', '#d4af37');
      });
      kb.on('keydown-V', () => this.crew.resetCooldown());
      kb.on('keydown-K', () => { if (!this.inShop && !this.paused && !this.isOver) this.openShop('eimer'); });
      kb.on('keydown-X', () => this.onDrink('mexikaner'));
      // Y = finish the active combo now (both parts must be equipped).
      kb.on('keydown-Y', () => {
        if (this.inShop || this.paused || this.isOver) return;
        const id = this.combos.debugFinish();
        if (!id) this.floatingText.show(this.player.x, this.player.y - 120, 'keine Combo aktiv', '#9a9a9a');
      });
      // G = Eigenbedarf boss right now (next to Lars instead of at the Eimer).
      this.setupWeaponDebugKeys(kb);
      kb.on('keydown-G', () => {
        if (!this.isOver) this.eigenbedarf.start(this.player.x + 260, this.player.y, this.stats.elapsed / 60);
      });
      this.setupMonsterDebugKeys(kb);
    }
    // Auto-pause when the tab/window loses focus (phone call, alt-tab...).
    const autoPause = () => { if (!this.paused && !this.inShop) this.togglePause(); };
    this.game.events.on('blur', autoPause);
    this.game.events.on('hidden', autoPause);
    this.events.once('shutdown', () => {
      this.events.off('enemy-whine'); // the scene's emitter survives a restart
      this.game.events.off('blur', autoPause);
      this.game.events.off('hidden', autoPause);
      this.fx.stopDicht();
      this.weapons.destroy();
    });
  }

  
  setupMonsters() {
    this.bossBar = new BossBar(this);
    this.afflictions = new PlayerAfflictions(this, this.player, (dmg) => this.dotPlayer(dmg));
    this.enemies.attach({
      hurtPlayer: (dmg) => this.hurtPlayer(dmg),
      slowPlayer: (mul, seconds) => { if (!this.tester) this.afflictions.slow(mul, seconds); },
      ignitePlayer: (dps, seconds) => { if (!this.tester) this.afflictions.ignite(dps, seconds); },
      stealPfand: (cents) => this.stealPfand(cents),
      returnPfand: (cents) => Save.addPfand(cents),
      onChasedOff: () => { this.stats.chasedOff++; },
      onPfand: (cents) => {
        this.stats.pfandCents += cents;
        Save.addPfand(cents);
      },
      popup: this.popup,
      floatingText: this.floatingText,
      pickups: this.pickups,
      bossBar: this.bossBar,
    });
  }

  // Monopoly man: takes real saved Pfand (never below 0). Returns the cents actually taken.
  stealPfand(cents) {
    if (typeof Save.takePfand === 'function') return Save.takePfand(cents);
    const c = Math.min(cents, Save.data.pfandCents);
    return c > 0 && Save.spend(c) ? c : 0;
  }

  // Secret: DIFFICULTY_TAPS.taps quick taps/clicks anywhere jump the run clock ahead (harder from the start).
  // Timestamps go into a small ring buffer, so nothing is allocated per tap.
  setupDifficultyTaps() {
    const cfg = DIFFICULTY_TAPS;
    const taps = new Array(cfg.taps).fill(-Infinity);
    let i = 0;
    this.input.on('pointerdown', (pointer) => {
      if (this.isOver || this.paused || this.inShop) return;
      const now = pointer.downTime || this.time.now;
      taps[i] = now;
      i = (i + 1) % cfg.taps;
      // taps[i] is now the oldest of the last `taps` taps.
      if (now - taps[i] > cfg.windowSeconds * 1000) return;
      taps.fill(-Infinity);
      this.stats.elapsed += cfg.jumpMinutes * 60;
      this.popup.showBanner(cfg.banner.replace('{min}', cfg.jumpMinutes));
      sfx.play('banner');
      this.cameras.main.shake(250, 0.006);
    });
  }

  // Burning on Lars: damage over time, no invulnerability frames (so contact hits still land), armour applies.
  dotPlayer(amount) {
    if (this.isOver || this.inShop || this.tester) return;
    this.player.hp = Math.max(0, this.player.hp - amount * (1 - this.status.mods.armor));
    if (this.player.hp <= 0) this.endRun();
  }

  // ?debug: T = run clock +1 min, N = choose monster type, H = spawn it here, O = next kill-count boss here.
  setupMonsterDebugKeys(kb) {
    const ids = Object.keys(ENEMY_TYPES).filter((id) => !ENEMY_TYPES[id].steady);
    this.debugMonster = Math.max(0, ids.indexOf(new URLSearchParams(location.search).get('monster')));
    const say = (text) => this.floatingText.show(this.player.x, this.player.y - 120, text, '#ff9a5a');
    const busy = () => this.isOver || this.inShop || this.paused;
    kb.on('keydown-T', () => {
      if (busy()) return;
      this.stats.elapsed += 60;
      say(`Minute ${Math.floor(this.stats.elapsed / 60)}`);
    });
    kb.on('keydown-N', (ev) => {
      if (busy()) return;
      this.debugMonster = (this.debugMonster + (ev.shiftKey ? ids.length - 1 : 1)) % ids.length;
      say(ids[this.debugMonster]);
    });
    kb.on('keydown-H', () => {
      if (!busy()) this.enemies.spawnNear(ids[this.debugMonster], this.player.x, this.player.y);
    });
    kb.on('keydown-O', () => {
      if (busy()) return;
      const p = { x: this.player.x + 260, y: this.player.y };
      if (!this.enemies.trySpawnAt(p.x, p.y)) p.x -= 520;
      const en = this.enemies.killBosses.spawnNext(this.stats.elapsed / 60, p);
      say(en.boss);
    });
  }

  applyLoadout(weaponIds, helmetId, gearId) {
    this.weapons.setLoadout(weaponIds || [], helmetId || null, gearId || null);
    this.player.setHelmet(helmetId || null);
    this.updateEimerBucket(weaponIds || []);
    this.combos?.refresh();
  }

  // With the EIMER (or the Pfeffi-Eimer combo) equipped, the bucket hanging on the Eimer pub is gone (Lars took it).
  updateEimerBucket(weaponIds) {
    const { landmark, landmarkAnim } = WEAPONS.eimer;
    const taken = weaponIds.some((id) => WEAPONS[id]?.landmark === landmark);
    this.town.deco.setAnim(landmark, taken ? landmarkAnim : 'default');
  }

  // Secret: holding Alt while walking into the Eimer door always summons the Eigenbedarf boss.
  // Returns true when the door was handled by the event (boss started, or the pub is shut while it lives).
  eimerDoorEvent(door) {
    const minutes = this.stats.elapsed / 60;
    const x = door.rect.centerX;
    const y = door.rect.bottom;
    if (this.altKey?.isDown && !this.eigenbedarf.boss) {
      return this.eigenbedarf.start(x, y + EIGENBEDARF.spawnBelowDoor, minutes);
    }
    return this.eigenbedarf.onEimerDoor(x, y, minutes);
  }

  
  setupWeaponDebugKeys(kb) {
    kb.on('keydown-U', () => {
      if (this.inShop || this.paused || this.isOver) return;
      Save.unlockAllForTest();
      this.openShop('debug');
    });
  }

  // Eimer drink (bought in the shop, or ?debug M).
  onDrink(id) {
    const d = DRINKS[id];
    if (!d) return;
    this.status.drinkSpecial(id);
    if (d.effect === 'fullHeal') this.player.heal(this.player.maxHp);
    this.popup.show(this.player.x, this.player.y, { title: d.popup, label: d.label, bad: false, iconKey: d.sprite });
    this.player.cheer();
  }

  // Champion ability (button, tap or E).
  useAbility() {
    if (this.isOver || this.paused || this.inShop) return;
    const crew = this.crew;
    if (crew.activate() || !crew.equipped) return;
    if (crew.cooldown > 0) {
      this.floatingText.show(this.player.x, this.player.y - 120, `Noch ${Math.ceil(crew.cooldown)} s`, '#9a9a9a');
    }
  }

  // A beer, joint or Ibu was picked up at (x, y).
  onCollect(kind, id, x, y) {
    if (kind === 'ibu') {
      this.player.heal(IBU.heal);
      this.popup.show(x, y, { title: IBU.title, label: IBU.label, bad: false, iconKey: IBU.sprite });
      this.player.cheer();
      return;
    }
    if (kind === 'joint') {
      this.stats.joints++;
      this.status.smoke();
      this.fx.startDicht(JOINT.duration);
      this.popup.showBanner(`${Hero.NAME} IST DICHT`, 3);
      this.popup.show(x, y, { title: JOINT.title, label: JOINT.label, bad: false, iconKey: JOINT.sprite });
      this.player.cheer();
      return;
    }
    const b = BEERS[id];
    this.stats.beers++;
    this.stats.pfandCents += b.pfandCents;
    Save.addPfand(b.pfandCents);
    this.status.drink(id);
    if (b.effect === 'crewCooldown') this.crew.reduceCooldown(b.magnitude);
    const bad = b.magnitude < 0;
    this.popup.show(x, y, { title: b.popup || `${b.name.toUpperCase()}!!`, label: b.label, bad, iconKey: b.sprite });
    this.floatingText.show(x, y + 8, `+${formatEuro(b.pfandCents)}`, '#d4af37');
    if (bad) this.player.disappointed();
    else this.player.cheer();
  }

  onPlayerTouched(enemy) {
    if (this.isOver || this.inShop || !enemy.active || enemy.moshT > 0) return; // moshers are busy
    this.weapons.onPlayerTouched(enemy);
    if (!enemy.active || this.tester || enemy.contactDamage <= 0) return; // horns got it / tester / necromancer
    const hpBefore = this.player.hp;
    if (this.player.takeDamage(enemy.contactDamage, this.status.mods.armor)) {
      this.endRun();
    } else if (this.player.hp < hpBefore) {
      this.cameras.main.flash(80, 120, 0, 0);
      this.enemies.onHitPlayer(enemy); // Pfand theft, fire
    }
  }

  // Arrows / ninja stars. A shot is used up even if Lars is currently invulnerable.
  onPlayerShot(shot) {
    if (this.isOver || this.inShop || !shot.active) return;
    this.enemies.projectiles.hit(shot);
    this.hurtPlayer(shot.damage);
  }

  // Damage from shots and boss attacks (armor applies, tester takes none).
  hurtPlayer(amount) {
    if (this.isOver || this.inShop || this.tester) return;
    const hpBefore = this.player.hp;
    if (this.player.takeDamage(amount, this.status.mods.armor)) this.endRun();
    else if (this.player.hp < hpBefore) this.cameras.main.flash(80, 120, 0, 0);
  }

  togglePause() {
    if (this.isOver || this.inShop) return;
    this.paused = !this.paused;
    if (this.paused) Save.persist(); // combo progress is only written now and then; pausing/tabbing away saves it
    if (this.paused) this.physics.pause();
    else this.physics.resume();
    this.joystick.setEnabled(!this.paused);
    this.pauseMenu.setOpen(this.paused);
    Audio.music.setPaused(this.paused);
  }

  // Walking into a store door (moving upwards) opens its shop; the game pauses meanwhile.
  // Street shops (SHOPS) sell weapons; the Eimer (SPECIAL_SHOPS) sells drinks and hosts the crew.
  checkStoreDoors(move) {
    const px = this.player.x;
    const py = this.player.y;
    const doors = this.town.doors;
    let door = null;
    for (let i = 0; i < doors.length && !door; i++) if (doors[i].rect.contains(px, py)) door = doors[i];
    if (!door || !(SHOPS[door.id] || SPECIAL_SHOPS[door.id])) {
      this.doorArmed = true;
      return;
    }
    if (!this.doorArmed || move.y > -0.3) return;
    this.doorArmed = false;
    // The Eimer: small chance of "Eigenbedarf!!!" (boss) instead; shut while the boss lives.
    if (door.id === 'eimer' && this.eimerDoorEvent(door)) return;
    this.openShop(door.id);
  }

  openShop(id) {
    this.inShop = true;
    this.physics.pause();
    this.joystick.setEnabled(false);
    this.player.sprite.setVelocity(0, 0);
    Audio.music.setMuffled(true);
    const menu = SPECIAL_SHOPS[id] ? this.eimerShop : this.shop;
    menu.open(id, {
      onClose: () => {
        this.inShop = false;
        Audio.music.setMuffled(false);
        this.physics.resume();
        this.joystick.setEnabled(true);
        this.player.invuln = 1; // grace period when stepping back out
      },
      onLoadoutChanged: (weaponIds, helmetId, gearId) => this.applyLoadout(weaponIds, helmetId, gearId),
      onTicket: () => this.winGame(),
      onDrink: (drinkId) => this.onDrink(drinkId),
      onChampion: (champId) => this.crew.setChampion(champId),
      drinkLeft: (drinkId) => this.status.effects.get(drinkId)?.remaining || 0,
    });
  }

  // Bought the Summer Breeze ticket: the game is won.
  winGame() {
    this.isOver = true;
    this.inShop = false;
    this.fx.stopDicht();
    const s = Save.data.stats;
    s.runs = (s.runs || 0) + 1;
    s.kills = (s.kills || 0) + this.stats.kills;
    s.beers = (s.beers || 0) + this.stats.beers;
    Save.persist();
    this.layers.fadeOut(900);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('VictoryScene', { run: this.stats }));
  }

  endRun() {
    if (this.isOver) return; // e.g. burn tick + contact hit in the same frame
    this.isOver = true;
    this.fx.stopDicht(); // end the trip while the camera still exists
    this.physics.pause();
    this.joystick.setEnabled(false);
    this.pauseMenu.hidePauseButton();
    this.minimap.setOn(false);
    this.afflictions.clear();
    Audio.music.play('gameover');
    this.player.die();
    this.enemies.group.getChildren().forEach((e) => e.anims?.pause());
    this.enemies.pauseAnims();
    this.crew.pauseAnims();
    this.burn.pauseAnims();
    const s = Save.data.stats;
    s.runs = (s.runs || 0) + 1;
    s.kills = (s.kills || 0) + this.stats.kills;
    s.beers = (s.beers || 0) + this.stats.beers;
    Save.persist();
    this.fx.update(0, 0, this.player.sprite);
    this.hud.update(this.player, this.stats, this.status, Save.data.pfandCents);
    showGameOver(this, this.stats);
  }

  update(_time, delta) {
    const dt = Math.min(delta, 50) / 1000; // avoid huge jumps after tab switching
    this.popup.update(this.paused || this.inShop ? 0 : dt);
    if (this.isOver || this.paused || this.inShop) return;

    this.stats.elapsed += dt;
    const move = this.controls.getMove();
    const mods = this.status.update(dt, this.weapons.armor(), this.weapons.speedBonus());
    this.afflictions.apply(mods); // frost slow
    if (mods.regen > 0) this.player.heal(mods.regen * dt);
    this.player.update(dt, move, this.status);
    this.afflictions.update(dt);
    this.checkStoreDoors(move);
    this.town.update(dt, this.player);
    this.enemies.update(dt, this.player, this.stats.elapsed);
    this.weapons.update(dt, mods);
    this.combos.update(); // a combo that just reached its kill count swaps the loadout here
    this.crew.update(dt);
    this.eigenbedarf.update(dt);
    this.burn.update(dt);
    this.floatingText.update(dt);
    this.bubble.update(dt);
    this.fx.update(dt, this.player.hp / this.player.maxHp, this.player.sprite);
    this.hud.update(this.player, this.stats, this.status, Save.data.pfandCents);
    this.abilityButton.update(dt, this.crew);
    this.minimap.update(dt);
    this.bossBar.update(this.enemies.killBosses.hintText);
  }
}

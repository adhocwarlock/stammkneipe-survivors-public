import { CHAMPIONS, CHAMPION_ORDER, CREW } from '../data/champions.js';
import { Save } from '../systems/SaveSystem.js';
import { Hero } from '../systems/Hero.js';
import { Audio } from '../audio/AudioEngine.js';
import { MoshPit } from './MoshPit.js';
import { AllySystem } from './AllySystem.js';
import { AreaDamage } from './AreaDamage.js';
import { CrewFx } from './CrewFx.js';
import { Hans } from './champions/Hans.js';
import { Hannah } from './champions/Hannah.js';
import { Danny } from './champions/Danny.js';
import { Mike } from './champions/Mike.js';
import { Johnny } from './champions/Johnny.js';
import { Lars } from './champions/Lars.js';

const SEQUENCES = { lars: Lars, hans: Hans, hannah: Hannah, danny: Danny, mike: Mike, johnny: Johnny };

// The hero you play can't also be in your crew (Lars joins the crew when you play someone else).
export const inCrew = (id) => !!id && Object.prototype.hasOwnProperty.call(CHAMPIONS, id) && id !== Hero.id;

// The equipped champion (saved), the ability cooldown, and the running ability sequence.
// The cooldown is ready at run start and starts again when the ability is used; switching
// champions keeps it running (no free reset by swapping). Needs createCrewPlaceholders() to have run.
export class CrewSystem {
  constructor(scene, { player, enemies, town, burn, sparks, popup, bubble, pickups }) {
    this.scene = scene;
    this.area = new AreaDamage(scene, enemies, burn, sparks);
    this.fx = new CrewFx(scene, enemies, this.area, sparks);
    this.allies = new AllySystem(scene, { player, enemies, town, area: this.area, fx: this.fx });
    this.mosh = new MoshPit(scene, enemies, this.area, this.fx);
    enemies.mosh = this.mosh;
    this.ctx = {
      scene, player, enemies, town, burn, popup, bubble, pickups, allies: this.allies, fx: this.fx, area: this.area,
      mosh: this.mosh,
    };
    this.sequences = {};
    for (const id of Object.keys(SEQUENCES)) this.sequences[id] = new SEQUENCES[id](this.ctx, id, CHAMPIONS[id]);
    this.equipped = inCrew(Save.data.champion) ? Save.data.champion : null;
    this.cooldown = 0;
    this.cooldownTotal = 1;
    this.active = null;
  }

  get champion() {
    return this.equipped ? CHAMPIONS[this.equipped] : null;
  }

  get ready() {
    return !!this.equipped && this.cooldown <= 0 && !this.active;
  }

  // 1 = just used, 0 = ready.
  get cooldownFraction() {
    return this.cooldown > 0 ? this.cooldown / this.cooldownTotal : 0;
  }

  setChampion(id) {
    this.equipped = inCrew(id) ? id : null;
    Save.setChampion(this.equipped);
  }

  // ?debug: none -> (lars) -> hans -> ... -> johnny -> none, skipping the hero being played.
  cycleChampion() {
    let i = this.equipped ? CHAMPION_ORDER.indexOf(this.equipped) : -1;
    do i++; while (i < CHAMPION_ORDER.length && !inCrew(CHAMPION_ORDER[i]));
    this.setChampion(i < CHAMPION_ORDER.length ? CHAMPION_ORDER[i] : null);
    return this.equipped;
  }

  activate() {
    if (!this.ready) return false;
    const c = this.champion;
    this.active = this.sequences[this.equipped];
    this.cooldownTotal = c.cooldown ?? CREW.defaultCooldown;
    this.cooldown = this.cooldownTotal;
    this.active.start();
    Audio.music.jingle(`jingle_${this.equipped}`);
    return true;
  }

  // Game over: freeze allies and crew projectiles like the enemies.
  pauseAnims() {
    this.allies.pauseAnims();
    this.fx.pauseAnims();
  }

  resetCooldown() {
    this.cooldown = 0;
  }

  // Rothaus: the next crew call comes `seconds` sooner. Returns the seconds actually taken off.
  reduceCooldown(seconds) {
    const cut = Math.min(this.cooldown, seconds);
    this.cooldown -= cut;
    return cut;
  }

  update(dt) {
    this.ctx.enemies.source = 'crew'; // crew kills never count for Lars' combo progress
    this.updateCrew(dt);
    this.ctx.enemies.source = null;
  }

  updateCrew(dt) {
    if (this.cooldown > 0) this.cooldown = Math.max(0, this.cooldown - dt);
    if (this.active && !this.active.update(dt)) this.active = null;
    this.mosh.update(dt);
    this.allies.update(dt);
    this.fx.update(dt);
  }
}

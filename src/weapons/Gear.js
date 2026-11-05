import { ART } from '../data/config.js';
import { HELD } from '../data/weapons.js';
import { bodyPoint } from './HeldWeapon.js';
import { firstFrameOf } from './common.js';

const UNDER_Y = 6; // px below the feet centre where the board sits
const PH_SHIELD = 'ph_worn_wikingerschild';

// The one gear item: passive stats (armor = damage taken reduction, speed = +move speed) plus its look on the hero:
// - skateboard: optional board sprite (`under`) just below the feet (no art = no board, the bonus still works)
// - Wikingerschild: `worn`. Front view: on his arm, on the side he faces (anim `front`);
//   back view (idle_up / walk_up): flat on his back, centred (anim `back`). Always under the photo head (+0.1).
export class Gear {
  constructor(scene, player, stats) {
    this.scene = scene;
    this.player = player;
    this.stats = stats;
    this.board = stats.under && scene.textures.exists(stats.under)
      ? scene.add.image(0, 0, stats.under, 'default_0').setOrigin(0.5, 0.5)
      : null;
    this.worn = stats.worn ? this.makeWorn(stats.worn) : null;
    this.wornView = null;
    this.pt = { x: 0, y: 0 };
    this.backAnchor = { x: 0, y: HELD.worn.y }; // back view: centred on the body
  }

  makeWorn(key) {
    const scene = this.scene;
    if (scene.textures.exists(key)) return scene.add.sprite(0, 0, key, firstFrameOf(scene, key));
    if (!scene.textures.exists(PH_SHIELD)) {
      const s = ART.scale;
      const g = scene.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(0x8a5a2c).fillCircle(6 * s, 6 * s, 6 * s);
      g.lineStyle(s, 0x8b92a6).strokeCircle(6 * s, 6 * s, 5.5 * s);
      g.fillStyle(0x8b92a6).fillCircle(6 * s, 6 * s, 1.5 * s);
      g.generateTexture(PH_SHIELD, 12 * s, 12 * s);
      g.destroy();
    }
    return scene.add.sprite(0, 0, PH_SHIELD);
  }

  armor() {
    return this.stats.armor || 0;
  }

  speed() {
    return this.stats.speed || 0;
  }

  update() {
    const p = this.player;
    const sp = p.sprite;
    const show = sp.visible && !p.dead;
    if (this.board) {
      this.board.setPosition(p.x, p.y + UNDER_Y - (p.lift || 0)).setDepth(sp.depth - 0.5).setFlipX(sp.flipX).setVisible(show);
    }
    if (this.worn) this.updateWorn(show);
  }

  updateWorn(show) {
    const p = this.player;
    const sp = p.sprite;
    const back = !!p.backView;
    const view = back ? 'back' : 'front';
    if (view !== this.wornView) {
      this.wornView = view;
      const k = `${this.stats.worn}_${view}`;
      if (this.scene.anims.exists(k)) this.worn.play({ key: k, repeat: -1 });
      else if (this.worn.texture.has(`${view}_0`)) this.worn.setFrame(`${view}_0`);
    }
    const facing = sp.flipX ? -1 : 1;
    bodyPoint(p, back ? this.backAnchor : HELD.worn, facing, this.pt);
    // Over the body, just under a held weapon (+0.05) and the photo head (+0.1).
    this.worn.setPosition(this.pt.x, this.pt.y).setFlipX(sp.flipX).setDepth(sp.depth + 0.04).setVisible(show);
  }

  destroy() {
    if (this.board) this.board.destroy();
    if (this.worn) this.worn.destroy();
    this.board = null;
    this.worn = null;
  }
}


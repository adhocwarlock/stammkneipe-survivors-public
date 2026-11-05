import { VIEW } from '../data/config.js';

// Two cameras so the world can zoom while the HUD stays put: Phaser zooms screen-fixed objects
// (scrollFactor 0) with their camera too. The main camera draws the world, a second unzoomed camera on top
// draws everything with scrollFactor 0. Objects are sorted into the two before every render, so code that
// creates UI never has to know about it. (Input hit-tests respect the same filter.)
export class CameraLayers {
  constructor(scene, zoom = VIEW.defaultZoom) {
    this.scene = scene;
    this.main = scene.cameras.main;
    this.ui = scene.cameras.add(0, 0, scene.scale.width, scene.scale.height).setName('ui').setRoundPixels(true);
    this.setZoom(zoom);
    scene.events.on('prerender', this.sort, this);
    scene.scale.on('resize', this.layout, this);
    scene.events.once('shutdown', () => {
      scene.events.off('prerender', this.sort, this);
      scene.scale.off('resize', this.layout, this);
    });
  }

  layout(gameSize) {
    this.ui.setSize(gameSize.width, gameSize.height);
  }

  setZoom(z) {
    this.main.setZoom(z);
  }

  // cameraFilter = bit mask of the cameras that must NOT draw the object.
  sort() {
    const hideFromMain = this.main.id;
    const hideFromUi = this.ui.id;
    const list = this.scene.children.list;
    for (let i = 0; i < list.length; i++) {
      const o = list[i];
      o.cameraFilter = o.scrollFactorX === 0 ? hideFromMain : hideFromUi;
    }
  }

  // Run end / victory: fade both layers together.
  fadeOut(ms) {
    this.main.fadeOut(ms, 0, 0, 0);
    this.ui.fadeOut(ms, 0, 0, 0);
  }
}

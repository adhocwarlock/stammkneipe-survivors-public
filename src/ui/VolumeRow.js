import { Button } from './Button.js';

const SIDE = 44; // touch-friendly - / + buttons
const LABEL_W = 120;
const VALUE_W = 72;

// "MUSIK  [-] 70% [+]" for the pause menu. get() / set(v) read and write a 0..1 value; step = change per press.
// With `steps` (sorted list) the value instead moves to the previous/next entry (zoom levels).
export class VolumeRow {
  constructor(scene, label, { get, set, step, steps = null, depth = 10210 }) {
    this.get = get;
    this.set = set;
    this.step = step;
    this.steps = steps;
    const style = { fontFamily: 'monospace', fontSize: '18px', fontStyle: 'bold', color: '#eeeeee' };
    this.label = scene.add.text(0, 0, label, style).setOrigin(0, 0.5).setScrollFactor(0).setDepth(depth + 1);
    this.value = scene.add.text(0, 0, '', style).setOrigin(0.5).setScrollFactor(0).setDepth(depth + 1);
    this.minus = new Button(scene, '-', () => this.change(-1), { width: SIDE, height: SIDE, fontSize: 22, depth });
    this.plus = new Button(scene, '+', () => this.change(1), { width: SIDE, height: SIDE, fontSize: 22, depth });
    this.refresh();
  }

  static get width() {
    return LABEL_W + SIDE + VALUE_W + SIDE;
  }

  change(dir) {
    if (this.steps) {
      const cur = this.get();
      let i = 0;
      for (let k = 1; k < this.steps.length; k++) if (Math.abs(this.steps[k] - cur) < Math.abs(this.steps[i] - cur)) i = k;
      this.set(this.steps[Math.max(0, Math.min(this.steps.length - 1, i + dir))]);
      this.refresh();
      return;
    }
    // Snap to the step grid so 0.7 - 0.1 - 0.1 ... lands exactly on 0.
    const v = Math.round((this.get() + dir * this.step) / this.step) * this.step;
    this.set(Math.max(0, Math.min(1, v)));
    this.refresh();
  }

  refresh() {
    this.value.setText(`${Math.round(this.get() * 100)}%`);
  }

  setPosition(cx, y) {
    const x0 = cx - VolumeRow.width / 2;
    this.label.setPosition(x0, y);
    this.minus.setPosition(x0 + LABEL_W + SIDE / 2, y);
    this.value.setPosition(x0 + LABEL_W + SIDE + VALUE_W / 2, y);
    this.plus.setPosition(x0 + LABEL_W + SIDE + VALUE_W + SIDE / 2, y);
  }

  setVisible(v) {
    this.label.setVisible(v);
    this.value.setVisible(v);
    this.minus.setVisible(v);
    this.plus.setVisible(v);
  }
}

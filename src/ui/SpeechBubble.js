import { CREW } from '../data/champions.js';
import { DEPTH, FONTS } from '../data/config.js';

const ABOVE = 118; // px above the speaker's feet (over Lars' photo head)
const PAD = 6;
const TAIL = 8;

// One small speech bubble that follows a speaker (anything with x/y feet coordinates, e.g. the player).
// For lines that aren't big banners: "Get ze Flammenwerfer!"
export class SpeechBubble {
  constructor(scene) {
    this.scene = scene;
    this.g = scene.add.graphics().setDepth(DEPTH.floatText + 2).setVisible(false);
    this.text = scene.add.text(0, 0, '', {
      fontFamily: FONTS.pixel, fontSize: '10px', color: '#141418', align: 'center', wordWrap: { width: 220 },
    }).setOrigin(0.5, 1).setDepth(DEPTH.floatText + 3).setVisible(false);
    this.life = 0;
    this.speaker = null;
  }

  say(speaker, line, seconds = CREW.speechSeconds) {
    this.speaker = speaker;
    this.life = seconds;
    this.text.setText(line).setVisible(true).setAlpha(1);
    this.drawBox();
    this.g.setVisible(true).setAlpha(1);
    this.place();
  }

  // The box is drawn once per line around (0, 0) = the tail tip; the graphics object is then just moved.
  drawBox() {
    const w = this.text.width + PAD * 2;
    const h = this.text.height + PAD * 2;
    const g = this.g;
    g.clear();
    g.fillStyle(0xffffff, 0.95).lineStyle(2, 0x141418, 1);
    g.fillRoundedRect(-w / 2, -TAIL - h, w, h, 6);
    g.strokeRoundedRect(-w / 2, -TAIL - h, w, h, 6);
    g.fillTriangle(-6, -TAIL - 1, 6, -TAIL - 1, 0, 0);
    g.lineBetween(-6, -TAIL, 0, 0);
    g.lineBetween(6, -TAIL, 0, 0);
  }

  place() {
    const s = this.speaker;
    const x = Math.round(s.x);
    const y = Math.round(s.y - ABOVE);
    this.g.setPosition(x, y);
    this.text.setPosition(x, y - TAIL - PAD);
  }

  update(dt) {
    if (this.life <= 0) return;
    this.life -= dt;
    this.place();
    const a = Math.min(1, this.life / 0.3);
    this.g.setAlpha(a);
    this.text.setAlpha(a);
    if (this.life <= 0) {
      this.g.setVisible(false);
      this.text.setVisible(false);
    }
  }
}

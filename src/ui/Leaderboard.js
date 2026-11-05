import { LEADERBOARD } from '../data/config.js';
import { HEROES } from '../data/heroes.js';
import { formatEuro, formatTime } from '../utils/format.js';
import { Scores } from '../systems/ScoresApi.js';
import { Save } from '../systems/SaveSystem.js';

// Columns after the character + name. `short` is used on narrow (phone portrait) screens.
const COLUMNS = [
  { key: 'survived', label: 'ÜBERLEBT', short: 'ZEIT', fmt: formatTime },
  { key: 'kills', label: 'KILLS', short: 'KILLS', fmt: String },
  { key: 'beers', label: 'GEZECHT', short: 'BIER', fmt: String },
  { key: 'joints', label: 'GEKIFFT', short: 'DÜBEL', fmt: String },
  { key: 'pfand', label: 'PFAND', short: 'PFAND', fmt: formatEuro },
];

const MESSAGES = {
  name: 'Name: 1–12 Buchstaben/Zahlen (auch . _ - \')',
  rude: 'Netter Versuch. Anderer Name bitte.',
  offline: 'Bestenliste gerade nicht erreichbar.',
};

// Character icon = the hero's photo face (assets/, same files the game loads).
const photoUrl = (hero) => (hero === 'lars' || !HEROES[hero] ? 'assets/faces/normal.png' : `assets/faces/champions/${hero}.png`);

// HTML overlay on top of the canvas (real <input> so phones show their keyboard; sortable table).
// Keys typed in here never reach Phaser or the M-mute listener (stopPropagation on the root).
export class Leaderboard {
  constructor({ run, killLine, canSubmit, onAgain }) {
    injectStyle();
    this.run = run; // entry shape, see ScoresApi
    this.scores = null;
    this.mine = null; // our row object once submitted
    this.sort = { key: 'survived', dir: -1 };
    this.onAgain = onAgain;

    const root = (this.root = el('div', 'lb-overlay'));
    for (const ev of ['keydown', 'keyup', 'keypress']) root.addEventListener(ev, (e) => e.stopPropagation());
    const panel = el('div', 'lb-panel', root);
    el('h1', 'lb-title', panel).textContent = 'RUN OVER';

    const you = el('div', 'lb-you', panel);
    const face = el('img', 'lb-face', you);
    face.src = photoUrl(run.hero);
    face.alt = '';
    const chips = el('div', 'lb-chips', you);
    for (const c of COLUMNS) {
      const chip = el('span', 'lb-chip', chips);
      el('b', '', chip).textContent = c.label;
      el('span', '', chip).textContent = c.fmt(run[c.key]);
    }
    if (killLine) el('div', 'lb-kills', panel).textContent = killLine;

    this.form = el('form', 'lb-entry', panel);
    this.form.hidden = true;
    el('label', 'lb-entry-label', this.form).textContent = 'TOP 10! Dein Name:';
    this.input = el('input', 'lb-input', this.form);
    Object.assign(this.input, { maxLength: LEADERBOARD.nameMax, value: Save.data.playerName || '', autocomplete: 'off' });
    this.input.setAttribute('enterkeyhint', 'done');
    this.submitBtn = el('button', 'lb-btn', this.form);
    this.submitBtn.type = 'submit';
    this.submitBtn.textContent = 'EINTRAGEN';
    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.submit();
    });

    this.msg = el('div', 'lb-msg', panel);
    this.table = el('table', 'lb-table', panel);
    const again = el('button', 'lb-btn lb-again', panel);
    again.textContent = 'NOCHMAL (R)';
    again.addEventListener('click', () => this.onAgain());

    document.body.appendChild(root);
    this.msg.textContent = canSubmit ? 'Bestenliste lädt…' : 'Testmodus: zählt nicht für die Bestenliste.';
    this.load(canSubmit);
  }

  async load(canSubmit) {
    const res = await Scores.top();
    if (!this.root) return; // closed meanwhile
    if (res.error) {
      this.msg.textContent = MESSAGES.offline;
      return;
    }
    this.scores = res.scores || [];
    this.renderTable();
    if (!canSubmit) return;
    if (Scores.qualifies(this.run, this.scores)) {
      this.msg.textContent = '';
      this.form.hidden = false;
      // Desktop: type right away. Touch: wait for a tap (the keyboard would cover the list).
      if (window.matchMedia?.('(pointer: fine)').matches) this.input.focus();
    } else {
      const last = this.scores[this.scores.length - 1];
      this.msg.textContent = `Nicht in den Top 10. Platz 10 hat ${formatTime(last.survived)} überlebt.`;
    }
  }

  async submit() {
    const name = this.input.value.normalize('NFC').replace(/\s+/g, ' ').trim();
    if (!name) {
      this.msg.textContent = MESSAGES.name;
      return;
    }
    this.submitBtn.disabled = true;
    this.msg.textContent = 'Wird eingetragen…';
    const res = await Scores.submit({ ...this.run, name });
    if (!this.root) return;
    if (res.error) {
      this.submitBtn.disabled = false;
      this.msg.textContent = MESSAGES[res.error] || MESSAGES.offline;
      return;
    }
    Save.setPlayerName(name);
    this.form.hidden = true;
    this.input.blur();
    this.scores = res.scores || [];
    this.mine = res.rank ? this.scores[res.rank - 1] : null;
    this.msg.textContent = res.rank ? `PLATZ ${res.rank}!` : 'Knapp verpasst: jemand war schneller.';
    this.renderTable();
  }

  renderTable() {
    const t = this.table;
    t.textContent = '';
    const head = el('tr', '', el('thead', '', t));
    el('th', 'lb-c-face', head);
    this.headCell(head, { key: 'name', label: 'NAME', short: 'NAME' });
    for (const c of COLUMNS) this.headCell(head, c);
    const body = el('tbody', '', t);
    if (!this.scores.length) {
      const td = el('td', 'lb-empty', el('tr', '', body));
      td.colSpan = COLUMNS.length + 2;
      td.textContent = 'Noch leer. Sei der Erste!';
      return;
    }
    const { key, dir } = this.sort;
    // Stable sort on the server order (Überlebt), so ties keep their rank order.
    const rows = this.scores.map((s, i) => [s, i]).sort(([a, ia], [b, ib]) => {
      const va = a[key];
      const vb = b[key];
      const d = typeof va === 'string' ? va.localeCompare(vb, 'de') : va - vb;
      return d * dir || ia - ib;
    });
    for (const [s] of rows) {
      const tr = el('tr', s === this.mine ? 'lb-mine' : '', body);
      const img = el('img', 'lb-row-face', el('td', 'lb-c-face', tr));
      img.src = photoUrl(s.hero);
      img.alt = HEROES[s.hero]?.name || '';
      img.title = img.alt;
      el('td', 'lb-c-name', tr).textContent = s.name;
      for (const c of COLUMNS) el('td', 'lb-c-num', tr).textContent = c.fmt(s[c.key]);
    }
  }

  headCell(row, c) {
    const th = el('th', c.key === 'name' ? 'lb-c-name' : 'lb-c-num', row);
    const active = this.sort.key === c.key;
    if (active) th.classList.add('lb-active');
    el('span', 'lb-long', th).textContent = c.label;
    el('span', 'lb-short', th).textContent = c.short;
    if (active) el('span', 'lb-arrow', th).textContent = this.sort.dir < 0 ? '▼' : '▲';
    th.addEventListener('click', () => {
      // Same column again flips the order; a new column starts with the best (or A-Z for names) on top.
      if (this.sort.key === c.key) this.sort.dir = -this.sort.dir;
      else this.sort = { key: c.key, dir: c.key === 'name' ? 1 : -1 };
      this.renderTable();
    });
  }

  get typing() {
    return document.activeElement === this.input;
  }

  destroy() {
    this.root?.remove();
    this.root = null;
  }
}

function el(tag, cls, parent) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  parent?.appendChild(e);
  return e;
}

function injectStyle() {
  if (document.getElementById('lb-style')) return;
  const s = document.createElement('style');
  s.id = 'lb-style';
  s.textContent = `
.lb-overlay { position: fixed; inset: 0; z-index: 50; display: flex; justify-content: center; align-items: flex-start;
  overflow-y: auto; padding: 12px 6px; box-sizing: border-box; font-family: PressStart, monospace; color: #eee;
  font-size: clamp(7px, 2.1vw, 12px); -webkit-user-select: text; user-select: text; }
.lb-panel { margin: auto; width: min(760px, 100%); background: rgba(13,13,16,.82); border: 3px solid #d4af37;
  box-shadow: 0 0 0 3px #000, 6px 6px 0 3px rgba(0,0,0,.6); padding: 1.2em 1em 1.4em; box-sizing: border-box; text-align: center; }
.lb-title { font-family: MetalMania, serif; font-weight: normal; color: #c62828; margin: 0 0 .3em; line-height: 1;
  font-size: clamp(34px, 9vw, 72px); text-shadow: 3px 3px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000; }
.lb-you { display: flex; align-items: center; justify-content: center; gap: .9em; flex-wrap: wrap; margin-bottom: .6em; }
.lb-face { width: 4.2em; height: 4.2em; object-fit: cover; border: 2px solid #d4af37; background: #222; image-rendering: auto; }
.lb-chips { display: flex; flex-wrap: wrap; gap: .5em; justify-content: center; }
.lb-chip { display: flex; flex-direction: column; gap: .45em; padding: .55em .7em; background: #1a1a1f; border: 2px solid #444; }
.lb-chip b { color: #d4af37; font-weight: normal; font-size: .8em; }
.lb-kills { color: #9a9aa8; font-size: .8em; line-height: 1.7; margin: .2em 0 .6em; }
.lb-entry { display: flex; gap: .6em; justify-content: center; align-items: center; flex-wrap: wrap; margin: .8em 0 .4em; }
.lb-entry[hidden] { display: none; }
.lb-entry-label { color: #6ad35a; }
.lb-input { font: inherit; font-size: max(16px, 1em); width: 13ch; padding: .45em .5em; background: #0d0d10; color: #fff;
  border: 2px solid #d4af37; outline: none; border-radius: 0; }
.lb-btn { font: inherit; color: #eee; background: #1a1a1f; border: 2px solid #d4af37; padding: .7em 1em; cursor: pointer; border-radius: 0; }
.lb-btn:hover { background: #33332a; } .lb-btn:disabled { opacity: .5; cursor: default; }
.lb-msg { min-height: 1.4em; margin: .5em 0; color: #d4af37; line-height: 1.5; }
.lb-table { width: 100%; border-collapse: collapse; margin: .3em 0 1em; }
.lb-table th { color: #d4af37; font-weight: normal; padding: .7em .35em; border-bottom: 2px solid #d4af37; cursor: pointer;
  white-space: nowrap; font-size: .85em; }
.lb-table th:hover, .lb-table th.lb-active { color: #fff0a0; }
.lb-table td { padding: .35em; border-bottom: 1px solid #2a2a33; white-space: nowrap; }
.lb-table tbody tr:nth-child(odd) { background: rgba(255,255,255,.03); }
.lb-c-name { text-align: left; max-width: 12ch; overflow: hidden; text-overflow: ellipsis; }
.lb-c-num { text-align: right; } .lb-c-face { width: 2.6em; }
.lb-row-face { width: 2.2em; height: 2.2em; object-fit: cover; display: block; border: 1px solid #555; background: #222; }
.lb-mine td { background: rgba(212,175,55,.22); color: #fff0a0; }
.lb-empty { text-align: center; color: #9a9aa8; padding: 1.2em; }
.lb-arrow { margin-left: .3em; } .lb-short { display: none; }
@media (max-width: 560px) { .lb-long { display: none; } .lb-short { display: inline; } }
`;
  document.head.appendChild(s);
}

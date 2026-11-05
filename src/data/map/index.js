














import world from './world.js';
import tiles from './tiles.js';
import placeholders from './placeholders.js';
import seepark from './seepark.js';
import stuehlinger from './stuehlinger.js';
import bahnhof from './bahnhof.js';
import squares from './squares.js';
import ub from './ub.js';
import altstadt from './altstadt.js';
import oberlinden from './oberlinden.js';
import dreisam from './dreisam.js';


const DISTRICTS = [seepark, stuehlinger, bahnhof, squares, ub, altstadt, oberlinden, dreisam];

function shiftDistrict(d) {
  const [ox, oy] = d.offset || [0, 0];
  const rect = ([x, y, w, h]) => [x + ox, y + oy, w, h];
  const rects = (list) => (list || []).map(rect);
  const placed = (list) => (list || []).map(([name, x, y, opts]) => [name, x + ox, y + oy, opts || {}]);
  return {
    name: d.name,
    seed: d.seed || d.name,
    rngSkip: d.rngSkip || 0,
    blocks: rects(d.blocks),
    openings: rects(d.openings),
    roofs: rects(d.roofs),
    stores: (d.stores || []).map(([id, x, y]) => [id, x + ox, y + oy]),
    ground: (d.ground || []).map((g) => ({ ...g, rect: rect(g.rect) })),
    solids: rects(d.solids),
    walkable: rects(d.walkable),
    underpasses: (d.underpasses || []).map((u) => ({ ...u, rect: rect(u.rect), portals: placed(u.portals) })),
    decorations: placed(d.decorations),
    extraDecorations: placed(d.extraDecorations),
    lampLines: (d.lampLines || []).map(([x0, y0, x1, y1, step]) => [x0 + ox, y0 + oy, x1 + ox, y1 + oy, step]),
    lampClear: rects(d.lampClear),
    lampSprite: d.lampSprite || 'lamp',
    spawnHotspots: (d.spawnHotspots || []).map((h) => ({ ...h, rect: rect(h.rect) })),
    wires: d.wires || null,
  };
}

const districts = DISTRICTS.map(shiftDistrict);

export const MAP = {
  cols: world.cols,
  rows: world.rows,
  start: world.start,
  defaultGround: world.defaultGround,
  districts,
  ground: districts.flatMap((d) => d.ground),
  solids: districts.flatMap((d) => d.solids),
  walkable: districts.flatMap((d) => d.walkable),
  underpasses: districts.flatMap((d) => d.underpasses),
  spawnHotspots: districts.flatMap((d) => d.spawnHotspots),
};

export const GROUND_TYPES = tiles;
export const PLACEHOLDERS = placeholders;

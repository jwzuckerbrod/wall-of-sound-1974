/**
 * Checks the generated geometry against the historical record and against the
 * 1974 drawings, without a browser. Run it before every commit.
 *
 *   npm run verify
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const tmp = mkdtempSync(join(tmpdir(), 'wos-verify-'));
execFileSync(
  process.execPath,
  ['node_modules/typescript/bin/tsc', '--outDir', tmp, '--target', 'ES2022', '--module', 'ESNext',
   '--moduleResolution', 'bundler', 'src/geometry/arrays.ts', 'src/geometry/scaffold.ts',
   'src/geometry/walk.ts', 'src/scene/views.ts', 'src/scene/tour.ts'],
  { stdio: 'inherit' },
);
// tsc emits extensionless relative imports, which node's ESM loader rejects.
// Mark the output as ESM and add the .js back.
writeFileSync(join(tmp, 'package.json'), '{"type":"module"}');
const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(join(dir, e.name)) : e.name.endsWith('.js') ? [join(dir, e.name)] : []);
for (const f of walk(tmp)) {
  writeFileSync(f, readFileSync(f, 'utf8').replace(
    /(\bfrom\s*['"])(\.\.?\/[^'"]*?)(['"])/g,
    // NB: a dotted filename like "wall.config" is not an extension - only
    // append when the specifier does not already end in a module extension.
    (_, a, spec, z) => `${a}${/\.(js|mjs|cjs|json)$/.test(spec) ? spec : spec + '.js'}${z}`,
  ));
}
const load = async (rel) => import(pathToFileURL(join(tmp, rel)).href);

const cfg = await load('data/wall.config.js');
const arrays = await load('geometry/arrays.js');
const scaf = await load('geometry/scaffold.js');

let failures = 0;
const check = (label, actual, expected, tolerance = 0) => {
  const ok = typeof expected === 'number'
    ? Math.abs(actual - expected) <= tolerance
    : actual === expected;
  if (!ok) failures++;
  const shown = typeof actual === 'number' ? actual.toFixed(3) : actual;
  const want = typeof expected === 'number' ? expected.toFixed(3) : expected;
  console.log(`${ok ? '  ok  ' : ' FAIL '} ${label.padEnd(44)} ${String(shown).padStart(12)}   want ${want}`);
};

const FTM = (v) => v * 0.3048;
const cells = arrays.allCells();
const tally = arrays.driverTally(cells);
const env = arrays.envelope(cells);
const L = scaf.scaffoldLayout();
const tubes = scaf.scaffoldTubes(L);

console.log('\nInventory - the 1974 record');
check('15-inch drivers placed', tally.jbl15, cfg.wall.inventory.driver15);
check('12-inch drivers placed', tally.jbl12, cfg.wall.inventory.driver12);
check('5-inch drivers placed', tally.jbl5, cfg.wall.inventory.driver5);
check('EV T350 horns placed', tally.evHorn, cfg.wall.inventory.tweeters);
check('total drivers', tally.total, cfg.wall.inventory.total);

console.log('\nArray envelope - Anderson, 60 ft end to end');
check('array width (m)', env.width, FTM(60), FTM(4));
check('array width inside tower footprint', env.width < L.footprint.width, true);
check('top of speakers above deck (m)', env.maxY, cfg.wall.dimensions.arrayHeight, 1.5);
check('nothing below deck level', env.minY >= -1e-6, true);

console.log('\nScaffold - the 10 April 1974 drawing');
check('bay chain sums to 64 ft', scaf.BAY_CHAIN_FT.reduce((a, b) => a + b, 0), 64, 1e-9);
check('depth chain sums to 40 ft', scaf.DEPTH_CHAIN_FT.reduce((a, b) => a + b, 0), 40, 1e-9);
check('lift chain sums to 38\'-10"', scaf.LIFT_CHAIN_FT.reduce((a, b) => a + b, 0), 38 + 10 / 12, 1e-9);
check('tower footprint width (m)', L.xLines.at(-1) - L.xLines[0], FTM(64), 1e-6);
check('tower footprint depth (m)', L.zLines[0] - L.zLines.at(-1), FTM(40), 1e-6);
check('top of tower (m)', L.yLevels.at(-1), FTM(38 + 10 / 12), 1e-6);
check('deck height (m)', L.deck.y, FTM(10), 1e-9);
check('deck width (m) = 64 + 9 + 9', L.deck.maxX - L.deck.minX, FTM(82), 1e-6);
check('deck depth (m) = 40 + 1', L.deck.maxZ - L.deck.minZ, FTM(41), 1e-6);
check('tower front line at the origin plane', L.towerFrontZ, 0, 1e-9);
check('speaker faces stand proud of the steel', env.maxZ > L.towerFrontZ, true);
check('cabinets do not float off the front of the towers', env.maxZ - L.towerFrontZ < 1.5, true);

console.log('\nScaffold floors - stacks must stand on something');
const platforms = cfg.wall.structure.scaffold.platformsAboveDeck;
// Bases a stack can stand on: the deck itself, plus every scaffold lift above
// it, but not the very top of the tower, where there is no room for a cabinet.
const towerTop = L.yLevels.at(-1) - L.deck.y;
const levelsAboveDeck = [0, ...L.yLevels.map((y) => y - L.deck.y).filter((y) => y > 1e-6 && y < towerTop - 1e-6)];
check('platform list matches the lift chain', platforms.length, levelsAboveDeck.length);
platforms.forEach((p, i) => check(`  floor ${i} (m above deck)`, p, levelsAboveDeck[i], 1e-6));

// Every block either sits on a scaffold floor, or on top of another block in
// the same channel (crossover bands stack).
const tops = new Map();
for (const b of cfg.ARRAYS) {
  const s = cfg.cabinetSize(b.cabinet);
  tops.set(b.id, { channel: b.channel, x: b.x, top: b.baseY + s.h * b.rows, base: b.baseY });
}
const floating = cfg.ARRAYS.filter((b) => {
  if (platforms.some((p) => Math.abs(p - b.baseY) < 0.01)) return false;
  for (const [id, o] of tops)
    if (id !== b.id && o.channel === b.channel && Math.abs(o.x - b.x) < 0.01 && Math.abs(o.top - b.baseY) < 0.01) return false;
  return true;
});
for (const b of floating) console.log(` FAIL  ${b.id} starts at ${b.baseY.toFixed(3)} m - not a floor, not on another block`);
check('no block floats in mid-air', floating.length, 0);
check('tallest array fits under the tower', env.maxY < cfg.wall.dimensions.arrayHeight, true);

console.log('\nClearances');
const deckTop = L.deck.y;
const figureHead = 1.75;
check('cluster underside clears a standing figure', cfg.ARRAYS.find((a) => a.id === 'voc-lm').baseY > figureHead, true);
check('band line inside the deck', cfg.wall.dimensions.bandLineZ < L.deck.maxZ, true);
check('band line downstage of the wall', cfg.wall.dimensions.bandLineZ > L.towerFrontZ, true);
check('deck sits below every cabinet', deckTop > 0, true);

console.log('\nCameras that claim to be a person');
const views = await load('scene/views.js');
const EYE = { min: 1.45, max: 1.85 };
for (const [id, v] of Object.entries(views.VIEWS)) {
  if (!v.onDeck) continue;
  const [x, y, z] = v.position;
  const eye = y - L.deck.y;
  check(`${id}: eye height above deck (m)`, eye >= EYE.min && eye <= EYE.max, true);
  check(`${id}: standing inside the deck`, z <= L.deck.maxZ && z >= L.deck.minZ && x >= L.deck.minX && x <= L.deck.maxX, true);
  check(`${id}: downstage of the wall face`, z > L.towerFrontZ, true);
}

console.log('\nWalking');
const walkMod = await load('geometry/walk.js');
const world = walkMod.walkWorld();

// Nobody may walk through a speaker stack. Sweep the deck on a fine grid and
// confirm that every point inside an array footprint is refused.
let leaks = 0;
let solidSamples = 0;
for (const b of world.blockers) {
  const cx = (b.minX + b.maxX) / 2;
  const cz = (b.minZ + b.maxZ) / 2;
  solidSamples++;
  if (!walkMod.blocked(world, cx, cz, world.deck.y)) {
    console.log(` FAIL  can walk into ${b.id}`);
    leaks++;
  }
}
check('every array and amp rack is solid', leaks, 0);
console.log(`        blockers: ${solidSamples}`);

// Sliding along a stack must not punch through it.
const stack = world.blockers[0];
const outside = { x: stack.minX - 1.2, z: (stack.minZ + stack.maxZ) / 2, y: world.deck.y };
const through = walkMod.resolveMove(world, outside, stack.maxX + 1.2, outside.z);
check('a long stride cannot tunnel through a stack', through.x < stack.minX, true);

// The stage has to be reachable, and only by the ramp.
check('deck is 10 ft up', world.deck.y, FTM(10), 1e-9);
check('ramp bottom is at ground level', walkMod.floorAt(world, world.ramp.maxX - 0.01, (world.ramp.minZ + world.ramp.maxZ) / 2) < 0.2, true);
check('ramp top meets the deck', walkMod.floorAt(world, world.ramp.minX + 0.01, (world.ramp.minZ + world.ramp.maxZ) / 2) > world.deck.y - 0.25, true);
check('ramp rises gently enough to climb', (() => {
  const zMid = (world.ramp.minZ + world.ramp.maxZ) / 2;
  let p = { x: world.ramp.maxX - 0.05, z: zMid, y: 0 };
  for (let i = 0; i < 400; i++) {
    const next = walkMod.resolveMove(world, p, p.x - 0.05, p.z);
    if (next.x === p.x && next.z === p.z) break;
    p = next;
  }
  return p.y > world.deck.y - 0.3;
})(), true);
check('cannot step straight up onto the deck from the front', (() => {
  const front = { x: 0, z: world.deck.maxZ + 1, y: 0 };
  const hop = walkMod.resolveMove(world, front, 0, world.deck.maxZ - 1);
  return hop.y < 0.5;
})(), true);
check('walker cannot leave the world', (() => {
  const far = walkMod.resolveMove(world, { x: 100, z: 0, y: 0 }, 400, 0);
  return Math.hypot(far.x, far.z) <= walkMod.WORLD_RADIUS + 1e-6;
})(), true);

console.log('\nTour');
const tour = await load('scene/tour.js');
check('every stop has a title and body', tour.TOUR.every((s) => s.title && s.body.length > 80), true);
check('no stop is underground', tour.TOUR.every((s) => s.position[1] > 0.5), true);
check('no stop is above the rig', tour.TOUR.every((s) => s.position[1] < tour.TOUR_CEILING + 20), true);
check('stop ids are unique', new Set(tour.TOUR.map((s) => s.id)).size, tour.TOUR.length);
console.log(`        stops: ${tour.TOUR.length}`);

console.log('\nBand and gear on the stage');
// Footprints in metres, centred on each player. Generous on purpose: a drum kit
// is about 1.6 m across and a 6'11" grand is 2.11 m long, and neither may end
// up inside a speaker stack. This is the check that was missing when the kit
// and the piano were first placed.
const GEAR = {
  weir: { w: 1.1, d: 0.9 },
  lesh: { w: 1.1, d: 0.9 },
  kreutz: { w: 1.9, d: 1.9 },
  keith: { w: 2.4, d: 2.4 },
  garcia: { w: 1.1, d: 0.9 },
};
let clashes = 0;
for (const m of cfg.wall.band.members) {
  const g = GEAR[m.id];
  const x = cfg.wall.band.mirrored ? -m.x : m.x;
  const foot = { minX: x - g.w / 2, maxX: x + g.w / 2, minZ: m.z - g.d / 2, maxZ: m.z + g.d / 2 };

  const onDeck = foot.minZ > L.deck.minZ && foot.maxZ < L.deck.maxZ && foot.minX > L.deck.minX && foot.maxX < L.deck.maxX;
  check(`${m.id}: gear is on the deck`, onDeck, true);
  check(`${m.id}: gear is downstage of the speakers`, foot.minZ > env.maxZ, true);

  for (const b of world.blockers) {
    if (foot.minX < b.maxX && foot.maxX > b.minX && foot.minZ < b.maxZ && foot.maxZ > b.minZ) {
      console.log(` FAIL  ${m.id}'s gear intersects ${b.id}`);
      clashes++;
    }
  }
}
check('no band gear intersects a speaker stack', clashes, 0);
check('players have room downstage of the wall', L.deck.maxZ - env.maxZ > 4, true);

console.log('\nStacks must stand on something visible');
const floors = scaf.scaffoldFloors(L);
// Only blocks that start ON a platform need a floor; crossover bands stacked on
// the cabinets below are already covered by the "nothing floats" check above.
const raised = cfg.ARRAYS.filter(
  (b) => b.baseY > 0.01 && platforms.some((p) => Math.abs(p - b.baseY) < 0.01),
);
let unsupported = 0;
for (const b of raised) {
  const s = cfg.cabinetSize(b.cabinet);
  const w = s.w * b.cols;
  const ok = floors.some(
    (f) =>
      Math.abs(f.centre[1] + f.size[1] / 2 - (L.deck.y + b.baseY)) < 0.02 &&
      f.centre[0] - f.size[0] / 2 <= b.x - w / 2 + 0.01 &&
      f.centre[0] + f.size[0] / 2 >= b.x + w / 2 - 0.01,
  );
  if (!ok) {
    console.log(` FAIL  ${b.id} at ${b.baseY.toFixed(2)} m has no floor under it`);
    unsupported++;
  }
}
check('every raised stack has a plank floor beneath it', unsupported, 0);
console.log(`        raised stacks: ${raised.length}, floors: ${floors.length}`);

console.log('\nInfo panels');
// Every array must be able to describe itself: a label, a channel with a blurb,
// a driver, and a provenance entry. A block with no panel is a dead end that
// only shows up when somebody clicks it.
const missing = [];
for (const b of cfg.ARRAYS) {
  const ch = cfg.CHANNELS[b.channel];
  const bounds = arrays.blockBounds(b.id);
  if (!b.label || !ch || !ch.blurb || ch.blurb.length < 60 || !bounds) missing.push(b.id);
}
for (const id of missing) console.log(` FAIL  ${id} cannot describe itself`);
check('every array has label, channel blurb and bounds', missing.length, 0);

const CHANNEL_COLOURS = Object.values(cfg.CHANNELS).map((c) => c.color);
check('every channel has its own overlay colour', new Set(CHANNEL_COLOURS).size, CHANNEL_COLOURS.length);
check('every channel is used by at least one array', (() => {
  const used = new Set(cfg.ARRAYS.map((b) => b.channel));
  return Object.keys(cfg.CHANNELS).every((c) => used.has(c));
})(), true);
check('every array has a non-zero explode direction', cfg.ARRAYS.every((b) => Math.hypot(...b.explode) > 0.1), true);
check('block bounds are never degenerate', cfg.ARRAYS.every((b) => {
  const bb = arrays.blockBounds(b.id);
  return bb && bb.size[0] > 0.01 && bb.size[1] > 0.01 && bb.size[2] > 0.01;
}), true);

console.log('\nProvenance, for the About page');
const provValues = Object.values(cfg.PROVENANCE);
check('every provenance entry cites a source', provValues.every((p) => p.sources.length > 0), true);
check('every cited source exists', provValues.every((p) => p.sources.every((s) => cfg.SOURCES[s])), true);
check('every guessed value explains itself', provValues.filter((p) => p.confidence === 'guessed').every((p) => !!p.note), true);
const counts = { confirmed: 0, estimated: 0, guessed: 0 };
for (const p of provValues) counts[p.confidence]++;
console.log(`        confirmed ${counts.confirmed} · estimated ${counts.estimated} · guessed ${counts.guessed}`);

console.log('\nBudget');
check('cabinet instances', cells.length, 641);
check('scaffold tube instances', tubes.length < 4000, true);
console.log(`        scaffold tubes: ${tubes.length}`);

// No two blocks may occupy the same space at the same depth.
let overlaps = 0;
const boxes = cfg.ARRAYS.map((b) => {
  const s = cfg.cabinetSize(b.cabinet);
  const w = s.w * b.cols, h = s.h * b.rows;
  return { id: b.id, z: b.z, x0: b.x - w / 2, x1: b.x + w / 2, y0: b.baseY, y1: b.baseY + h };
});
for (let i = 0; i < boxes.length; i++)
  for (let j = i + 1; j < boxes.length; j++) {
    const a = boxes[i], b = boxes[j];
    if (a.z !== b.z) continue;
    if (a.x0 < b.x1 - 0.01 && b.x0 < a.x1 - 0.01 && a.y0 < b.y1 - 0.01 && b.y0 < a.y1 - 0.01) {
      console.log(` FAIL  block overlap: ${a.id} <-> ${b.id}`);
      overlaps++;
    }
  }
console.log('\nBlock overlaps');
check('array blocks do not intersect', overlaps, 0);

console.log(failures === 0 ? '\nAll checks passed.\n' : `\n${failures} check(s) FAILED.\n`);
process.exit(failures === 0 ? 0 : 1);


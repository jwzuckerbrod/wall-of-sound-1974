/**
 * Writes the whole generated scene to blender/scene.json for blender/build_scene.py.
 *
 * Compiles the same geometry modules the app and verify.mjs use, so Blender
 * gets exactly what the browser draws: every cabinet, every scaffold tube,
 * every floor and slab. Nothing is modelled by hand on the Blender side.
 *
 *   npm run export:scene
 *
 * Coordinates are the scene frame (metres, +Y up, +Z toward the audience,
 * origin at the centre of the deck on the wall face). The Blender script
 * converts to Z-up.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const tmp = mkdtempSync(join(tmpdir(), 'wos-export-'));
execFileSync(
  process.execPath,
  ['node_modules/typescript/bin/tsc', '--outDir', tmp, '--target', 'ES2022', '--module', 'ESNext',
   '--moduleResolution', 'bundler', 'src/geometry/arrays.ts', 'src/geometry/scaffold.ts', 'src/geometry/logo.ts'],
  { stdio: 'inherit' },
);
// tsc emits extensionless relative imports, which node's ESM loader rejects.
// Mark the output as ESM and add the .js back (same as verify.mjs).
writeFileSync(join(tmp, 'package.json'), '{"type":"module"}');
const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(join(dir, e.name)) : e.name.endsWith('.js') ? [join(dir, e.name)] : []);
for (const f of walk(tmp)) {
  writeFileSync(f, readFileSync(f, 'utf8').replace(
    /(\bfrom\s*['"])(\.\.?\/[^'"]*?)(['"])/g,
    (_, a, spec, z) => `${a}${/\.(js|mjs|cjs|json)$/.test(spec) ? spec : spec + '.js'}${z}`,
  ));
}
const load = (p) => import(pathToFileURL(join(tmp, p)).href);
const cfg = await load('data/wall.config.js');
const arrays = await load('geometry/arrays.js');
const scaf = await load('geometry/scaffold.js');
const logo = await load('geometry/logo.js');

const { wall, DRIVERS, CABINETS, ARRAYS, cabinetSize, IN } = cfg;
const L = scaf.scaffoldLayout();
const deckY = L.deck.y;
const r4 = (v) => Math.round(v * 1e4) / 1e4;
const v3 = (a) => a.map(r4);

// Cells are deck-relative; everything written here is world height.
const cells = arrays.allCells().map((c) => ({
  p: v3([c.position[0], c.position[1] + deckY, c.position[2]]),
  ry: r4(c.rotationY),
  cabinet: c.cabinet,
  channel: c.channel,
  block: c.block,
  row: c.row,
  rows: ARRAYS.find((b) => b.id === c.block).rows,
}));

const cabinets = Object.fromEntries(
  Object.keys(CABINETS).map((id) => {
    const s = cabinetSize(id);
    const c = CABINETS[id];
    return [id, { kind: c.kind, driver: c.driver, w: r4(s.w), h: r4(s.h), d: r4(s.d), shell: r4(c.shellThickness), inset: r4(c.baffleInset), driverY: r4(c.driverOffsetY ?? 0) }];
  }),
);

// Speaker runs, as the app draws them (src/scene/Structure.tsx, Cabling).
const cable = [];
for (const b of ARRAYS) {
  const s = cabinetSize(b.cabinet);
  const top = b.baseY + s.h * b.rows;
  const w = s.w * b.cols;
  for (const sx of [-0.32, 0.32])
    cable.push({ a: v3([b.x + w * sx, deckY + top - 0.2, b.z - 0.75]), b: v3([b.x + w * sx, deckY + 0.06, b.z - 0.75]) });
}
cable.push({ a: v3([L.deck.minX + 2, deckY + 0.09, -1.1]), b: v3([L.deck.maxX - 2, deckY + 0.09, -1.1]) });

// Amp racks (src/scene/Amps.tsx): twelve racks of four, spread across the tower.
const amps = [];
{
  const { rackCount, perRack, z, size } = wall.structure.amps;
  const span = L.footprint.width * 0.82;
  const gap = IN(0.5);
  for (let r = 0; r < rackCount; r++) {
    const x = -span / 2 + (span / (rackCount - 1)) * r;
    for (let a = 0; a < perRack; a++) amps.push(v3([x, deckY + IN(3) + (size.h + gap) * (a + 0.5), z]));
  }
}

const scene = {
  generatedFrom: 'src/data/wall.config.ts',
  deck: { y: r4(deckY), minX: r4(L.deck.minX), maxX: r4(L.deck.maxX), minZ: r4(L.deck.minZ), maxZ: r4(L.deck.maxZ), thickness: r4(L.deck.thickness) },
  drivers: Object.fromEntries(Object.entries(DRIVERS).map(([k, d]) => [k, {
    frameDia: r4(d.frameDia), coneDia: r4(d.coneDia), coneDepth: r4(d.coneDepth),
    dustCapDia: r4(d.dustCapDia), dustCapRise: r4(d.dustCapRise), surroundWidth: r4(d.surroundWidth),
  }])),
  cabinets,
  cells,
  tubes: scaf.scaffoldTubes(L).map((t) => ({ a: v3(t.a), b: v3(t.b), kind: t.kind })),
  tubeRadius: r4(scaf.TUBE_RADIUS),
  floors: scaf.scaffoldFloors(L).map((s) => ({ c: v3(s.centre), s: v3(s.size) })),
  slabs: scaf.stageSlabs(L).map((s) => ({ c: v3(s.centre), s: v3(s.size), kind: s.kind })),
  cable,
  cableRadius: r4(wall.structure.cabling.runDiameter / 2),
  amps,
  ampSize: v3([wall.structure.amps.size.w, wall.structure.amps.size.h, wall.structure.amps.size.d]),
  ampsPerRack: wall.structure.amps.perRack,
  caseNames: wall.structure.amps.caseNames,
  stickers: wall.structure.amps.stickers,
  // Stage dressing (src/scene/BandGear.tsx): feet in world height.
  cases: scaf.stageCases(L).map((c) => ({ p: v3([c.pos[0], c.pos[1] + deckY, c.pos[2]]), s: v3(c.size), ry: r4(c.rot) })),
  // The 1969 mark (src/geometry/logo.ts): field-radius units, y down.
  bolt: logo.BOLT.map(v3),
  boltBottom: logo.BOLT_BOTTOM,
  boltDiameter: r4(wall.band.logo.diameter),
  // The players' marks (scene frame, metres): blender/stage_review.py stands the instruments on them.
  band: Object.fromEntries(wall.band.members.map((m) => [m.id, [r4(wall.band.mirrored ? -m.x : m.x), r4(m.z)]])),
};

mkdirSync('blender', { recursive: true });
writeFileSync('blender/scene.json', JSON.stringify(scene));
console.log(`blender/scene.json — ${cells.length} cabinets, ${scene.tubes.length} tubes, ${scene.floors.length} floors, ${amps.length} amps`);

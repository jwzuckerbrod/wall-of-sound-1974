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
   '--moduleResolution', 'bundler', 'src/geometry/arrays.ts', 'src/geometry/scaffold.ts', 'src/geometry/logo.ts', 'src/geometry/roadgear.ts', 'src/geometry/bowl.ts'],
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
const gear = await load('geometry/roadgear.js');
const bowl = await load('geometry/bowl.js');
const scaf = await load('geometry/scaffold.js');
const logo = await load('geometry/logo.js');

const { wall, DRIVERS, CABINETS, ARRAYS, CHANNELS, PROVENANCE, CONFIDENCE_COLOURS, cabinetSize, IN } = cfg;
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
  col: c.col,
  // How it's built and how it's finished, decided once in src/geometry/arrays.ts.
  variant: c.variant,
  finish: c.finish,
}));

const cabinets = Object.fromEntries(
  Object.keys(CABINETS).map((id) => {
    const s = cabinetSize(id);
    const c = CABINETS[id];
    return [id, { kind: c.kind, driver: c.driver, w: r4(s.w), h: r4(s.h), d: r4(s.d), shell: r4(c.shellThickness), inset: r4(c.baffleInset), driverY: r4(c.driverOffsetY ?? 0), strip: c.strip ?? 0 }];
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
    horn: d.horn ? { w: r4(d.horn.w), h: r4(d.horn.h), depth: r4(d.horn.depth) } : null,
  }])),
  // Colours, roughness and metalness (wall.materials), for the surfaces both renderers share.
  materials: Object.fromEntries(
    ['plywoodBlack', 'baffle', 'cone', 'hornFrame', 'hornThroat', 'stripAluminium', 'steel', 'cable']
      .map((k) => [k, wall.materials[k]]),
  ),
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
  // Stage-lighting bars (structure.lightBars).
  lights: (() => {
    const r = scaf.lightRig(L);
    return {
      pipes: r.pipes.map((t) => ({ a: v3(t.a), b: v3(t.b), indoor: t.indoor })),
      lamps: r.lamps.map((l) => ({ at: v3(l.at), aim: v3(l.aim), indoor: l.indoor })),
      dia: r4(wall.structure.lightBars.lampDiameter),
      len: r4(wall.structure.lightBars.lampLength),
    };
  })(),
  // The road gear: every case, label and sticker, decided once (src/geometry/roadgear.ts).
  gear: (() => {
    const C = wall.structure.roadCases;
    const Z = C.zeroSize;
    return {
      casterHeight: C.casterHeight, wall: C.wall, rackSetback: C.rackSetback, slotGap: r4(C.slotGap),
      zeroSize: v3([Z.w, Z.h, Z.d]),
      colours: C.colours,
      panel: wall.structure.amps.panel,
      plan: gear.roadGearPlan(L),
    };
  })(),
  // Stage dressing (src/scene/BandGear.tsx): feet in world height.
  cases: scaf.stageCases(L).map((c) => ({ p: v3([c.pos[0], c.pos[1] + deckY, c.pos[2]]), s: v3(c.size), ry: r4(c.rot) })),
  // The 1969 mark (src/geometry/logo.ts): field-radius units, y down.
  bolt: logo.BOLT.map(v3),
  boltBottom: logo.BOLT_BOTTOM,
  boltDiameter: r4(wall.band.logo.diameter),
  // How the instruments stand on the marks (band.instruments).
  instruments: wall.band.instruments,
  // The paired vocal microphones (src/scene/BandGear.tsx): foot of each stand, and its parts.
  mics: { at: scaf.vocalMics(L).map(v3), ...scaf.MIC },
  crewAloft: wall.structure.crewAloft,
  // Courtenay Pollock's tie-dyes (structure.tieDyes): top centre of each, outdoors only.
  tieDyes: scaf.tieDyePanels(L).map((t) => ({ top: v3(t.top), w: t.width, h: t.height, palette: wall.structure.tieDyes.palettes[t.palette] })),
  // The Hollywood Bowl (venues.hollywoodBowl, src/geometry/bowl.ts).
  bowl: (() => {
    const V = wall.venues.hollywoodBowl;
    return {
      stageDrop: V.stageDrop, poolRadius: V.poolRadius, seating: V.seating, shell: V.shell,
      beamTubes: V.beamTubes, beamLength: V.beamLength, crownPanels: V.crownPanels, sun: V.sun, colours: V.colours,
      sonotubes: bowl.sonotubes().map((t) => ({ x: r4(t.x), z: r4(t.z), height: r4(t.height) })),
      sonotubeDiameter: V.sonotubes.diameter,
      panels: bowl.crownPanels(bowl.bowlFrame(L)).map(v3),
    };
  })(),
  // Each channel's system and overlay colour (CHANNELS): the story's colour-by-system render.
  channels: Object.fromEntries(Object.values(CHANNELS).map((c) => [c.id, { system: c.system, color: c.color }])),
  // How sure we are of each part of the Wall (PROVENANCE): the story's evidence render.
  // The deck takes the Bowl's confidence, not the drawing's: the 10 April drawing is
  // firm, but the Bowl photograph shows no sign of a 10 ft deck there (qa-findings §19).
  evidence: {
    colours: CONFIDENCE_COLOURS,
    parts: {
      scaffold: PROVENANCE['structure.scaffold'].confidence,
      deck: PROVENANCE['venues.hollywoodBowl'].confidence,
      speakers: PROVENANCE['arrays.positions'].confidence,
      kick: PROVENANCE['arrays.kickPosition'].confidence,
      lights: PROVENANCE['structure.lightBars'].confidence,
      tieDyes: PROVENANCE['structure.tieDyes'].confidence,
    },
  },
  // The players' marks (scene frame, metres): blender/stage_review.py stands the instruments on them.
  band: Object.fromEntries(wall.band.members.map((m) => [m.id, [r4(wall.band.mirrored ? -m.x : m.x), r4(m.z)]])),
};

mkdirSync('blender', { recursive: true });
writeFileSync('blender/scene.json', JSON.stringify(scene));
console.log(`blender/scene.json — ${cells.length} cabinets, ${scene.tubes.length} tubes, ${scene.floors.length} floors, ${amps.length} amps`);

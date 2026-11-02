/**
 * The scaffold and stage, built bay by bay from the 10 April 1974 drawing
 * (Julien's lot 71: top view, stage left view, tower and stage requirements).
 *
 * Nothing here is styled — it emits tube segments and slabs. See
 * docs/reconstruction-spec.md §10 for the transcribed requirements.
 */
import { ARRAYS, cabinetSize, FT, IN, wall, standoffOf } from '../data/wall.config';

/** A length of scaffold tube, as a pair of endpoints. */
export interface Tube {
  a: [number, number, number];
  b: [number, number, number];
  kind: 'standard' | 'ledger' | 'brace' | 'post';
}

/**
 * Bay chain across the width, in feet, straight off the top view:
 *   9" | 5'-0" | 7'-0" ×3 | 3'-6" | 7'-0" ×4 | 5'-0" | 9"   = 64'-0"
 *
 * It is asymmetric by one 7 ft bay — the drawing is hand-dimensioned and the
 * closer does not land on the footprint centre. The chain is reproduced as
 * drawn, then the whole run is centred on x = 0 so the arrays sit on the
 * centreline. Sums to exactly 64.0 ft, which is what the drawing's overall
 * dimension says, so the chain is read correctly even where it looks odd.
 */
export const BAY_CHAIN_FT = [0.75, 5, 7, 7, 7, 3.5, 7, 7, 7, 7, 5, 0.75] as const;

/**
 * Depth chain, downstage → upstage, in feet, off the same view:
 *   1' | 5' | 5' ‖ 5' | 5' | 5' | 5' ‖ 4' | 5'   = 40'-0"
 *
 * The middle four bays are the X-braced band — stage requirements note 4:
 * "'X' areas in drawing show location of towers which continue up after deck
 * is down." So that band is where the wall rises; the bands either side carry
 * the deck only.
 */
export const DEPTH_CHAIN_FT = [1, 5, 5, 5, 5, 5, 5, 4, 5] as const;
/**
 * Index into DEPTH_CHAIN_FT where the tower band starts and ends.
 *
 * The towers sit at the UPSTAGE end. An earlier version put them in the middle
 * of the forty feet, which left the band eleven feet of stage to stand on — not
 * enough for a drum kit and a seven-foot grand, and both ended up inside the
 * speaker stacks. Upstage gives the players twenty-one feet, which is what the
 * photographs show.
 */
export const TOWER_BAND = { first: 5, last: 8 } as const;

/**
 * Lift heights, deck → top, off the stage left view:
 *   7'-0" + 5'-10" + 6'-6" ×4 = 38'-10"
 *
 * Measured up from the stage deck, not the ground. The drawing gives the chain
 * but not where it starts; the first reading hung it from the ground, which
 * buried the bottom ten feet in the stage and left 28'-10" of tower above the
 * deck. Pechner's 17 May 1974 photograph, scaled off the 64 ft footprint, shows
 * 38.8 ft of scaffold above the deck — the whole chain. See
 * docs/qa-findings.md §6.
 */
export const LIFT_CHAIN_FT = [7, 5 + 10 / 12, 6.5, 6.5, 6.5, 6.5] as const;

const cumulative = (chain: readonly number[]) =>
  chain.reduce<number[]>((acc, v) => [...acc, acc[acc.length - 1] + v], [0]);

export interface ScaffoldLayout {
  /** Grid line positions in metres. */
  xLines: number[];
  zLines: number[];
  yLevels: number[];
  /** z of the tower band's downstage and upstage faces. */
  towerFrontZ: number;
  towerBackZ: number;
  deck: { y: number; minX: number; maxX: number; minZ: number; maxZ: number; thickness: number };
  footprint: { width: number; depth: number; height: number };
}

export function scaffoldLayout(): ScaffoldLayout {
  const d = wall.dimensions;

  const xCum = cumulative(BAY_CHAIN_FT);
  const totalX = xCum[xCum.length - 1];
  const xLines = xCum.map((v) => FT(v - totalX / 2));

  // z = 0 is the wall's front face, which is the downstage face of the tower band.
  const zCum = cumulative(DEPTH_CHAIN_FT);
  const towerFrontFt = zCum[TOWER_BAND.first];
  const zLines = zCum.map((v) => FT(towerFrontFt - v)); // downstage positive

  const yLevels = cumulative(LIFT_CHAIN_FT).map((v) => d.stageDeckHeight + FT(v));

  const deckHalfW = d.scaffoldFootprint.width / 2 + d.deckOverhang.side;
  return {
    xLines,
    zLines,
    yLevels,
    towerFrontZ: zLines[TOWER_BAND.first],
    towerBackZ: zLines[TOWER_BAND.last + 1],
    deck: {
      y: d.stageDeckHeight,
      minX: -deckHalfW,
      maxX: deckHalfW,
      minZ: zLines[zLines.length - 1],
      maxZ: zLines[0] + d.deckOverhang.downstage,
      thickness: d.stageDeckThickness,
    },
    footprint: { width: d.scaffoldFootprint.width, depth: d.scaffoldFootprint.depth, height: d.totalHeight },
  };
}

/** Every tube in the tower and the stage substructure. */
export function scaffoldTubes(L = scaffoldLayout()): Tube[] {
  const tubes: Tube[] = [];
  const deckY = L.deck.y;

  // Tower band z-lines only — towers rise from the X-braced bays.
  const towerZ = L.zLines.slice(TOWER_BAND.first, TOWER_BAND.last + 2);
  // Every bay runs to the full height. An earlier pass stepped each bay down to
  // one lift above its stack; Pechner's photograph shows a continuous top rail
  // across the whole width with crew working along it.
  const top = L.yLevels[L.yLevels.length - 1];

  // Standards, ground to top.
  L.xLines.forEach((x) => {
    for (const z of towerZ) tubes.push({ a: [x, 0, z], b: [x, top, z], kind: 'standard' });
  });

  // The centre cluster projects forward of the front plane (clusterStandoff),
  // so front ledgers and braces stop at its edges rather than run through it.
  const cluster = ARRAYS.filter((b) => b.curveRadius > 0).map((b) => {
    const s = cabinetSize(b.cabinet);
    return { x0: b.x - (s.w * b.cols) / 2, x1: b.x + (s.w * b.cols) / 2, y0: deckY + b.baseY, y1: deckY + b.baseY + s.h * b.rows };
  });
  const behindCluster = (xa: number, xb: number, ya: number, yb: number) =>
    cluster.some((c) => Math.min(xa, xb) < c.x1 && Math.max(xa, xb) > c.x0 && Math.min(ya, yb) < c.y1 && Math.max(ya, yb) > c.y0);

  // Ledgers along the run, and transoms across the depth, at every lift.
  // Transoms are skipped on the front line: the stacks stand between the
  // front two lines, and a tube across the depth would run through them.
  for (const y of L.yLevels) {
    for (const z of towerZ)
      for (let i = 0; i < L.xLines.length - 1; i++) {
        if (z === towerZ[0] && behindCluster(L.xLines[i], L.xLines[i + 1], y, y)) continue;
        tubes.push({ a: [L.xLines[i], y, z], b: [L.xLines[i + 1], y, z], kind: 'ledger' });
      }
    L.xLines.forEach((x) => {
      for (let j = 1; j < towerZ.length - 1; j++)
        tubes.push({ a: [x, y, towerZ[j]], b: [x, y, towerZ[j + 1]], kind: 'ledger' });
    });
  }

  // X-braces on the front line, the second and the upstage face. The
  // photographs show the front braces crossing in front of the speaker faces,
  // which stand just behind them (dimensions.arrayStandoff); only the
  // cluster, which stands proud, is clear of them.
  for (const z of [towerZ[0], towerZ[1], towerZ[towerZ.length - 1]])
    for (let li = 0; li < L.yLevels.length - 1; li++) {
      const y0 = L.yLevels[li];
      const y1 = L.yLevels[li + 1];
      for (let i = 0; i < L.xLines.length - 1; i++) {
        const x0 = L.xLines[i];
        const x1 = L.xLines[i + 1];
        if (z === towerZ[0] && behindCluster(x0, x1, y0, y1)) continue;
        tubes.push({ a: [x0, y0, z], b: [x1, y1, z], kind: 'brace' });
        tubes.push({ a: [x1, y0, z], b: [x0, y1, z], kind: 'brace' });
      }
    }

  // Stage substructure: 5' x 5' frames under the deck, on a 10 ft grid for the
  // grey-box (the drawing specifies 5 ft; every 5 ft is visually solid mush at
  // this scale and adds nothing to a massing check).
  const step = FT(10);
  for (let x = L.deck.minX + step / 2; x < L.deck.maxX; x += step)
    for (let z = L.deck.minZ + step / 2; z < L.deck.maxZ; z += step) {
      const insideTower = z <= L.towerFrontZ && z >= L.towerBackZ && Math.abs(x) <= L.footprint.width / 2;
      if (insideTower) continue;
      tubes.push({ a: [x, 0, z], b: [x, deckY, z], kind: 'post' });
    }

  return tubes;
}

/**
 * Plank floors under every raised stack.
 *
 * The tower requirements list "40 2x10x16 planks used as floors" — nowhere near
 * enough to deck out a 64 x 40 ft tower, so the floors were partial and put
 * where they were needed. The winter sheet says as much: "floor in back only,
 * 2nd level", "omit floor in 5' bay, 3rd level".
 *
 * Without these the raised arrays hang in mid-air, which is exactly how the
 * first build looked.
 */
export function scaffoldFloors(L = scaffoldLayout()): Slab[] {
  const out: Slab[] = [];
  const seen = new Set<string>();
  const thickness = PLANK.thickness;

  const platforms = wall.structure.scaffold.platformsAboveDeck;

  for (const b of ARRAYS) {
    if (b.baseY <= 0.01) continue;
    // Only the bottom band of a tower needs a floor. The crossover bands above
    // it stand on the cabinets below, so giving them their own floor would
    // slice a plank through the middle of a stack.
    if (!platforms.some((p) => Math.abs(p - b.baseY) < 0.01)) continue;

    const s = cabinetSize(b.cabinet);
    const width = s.w * b.cols;
    const key = `${b.x.toFixed(2)}:${b.baseY.toFixed(2)}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const depth = FT(10);
    const z = standoffOf(b) - depth / 2 + s.d / 2;
    out.push({
      centre: [b.x, L.deck.y + b.baseY - thickness / 2, z],
      size: [width + FT(1), thickness, depth],
      kind: 'floor',
    });
  }
  return out;
}

/** Deck slab plus the 5/8" plywood facing across the front and 16 ft back each side. */
export interface Slab {
  centre: [number, number, number];
  size: [number, number, number];
  kind: 'deck' | 'facing' | 'floor';
}

export function stageSlabs(L = scaffoldLayout()): Slab[] {
  const d = wall.dimensions;
  const w = L.deck.maxX - L.deck.minX;
  const dep = L.deck.maxZ - L.deck.minZ;
  const t = L.deck.thickness;
  const faceT = d.deck.facingThickness;
  const faceH = L.deck.y;

  return [
    { centre: [0, L.deck.y - t / 2, (L.deck.minZ + L.deck.maxZ) / 2], size: [w, t, dep], kind: 'deck' },
    // Front facing, full width.
    { centre: [0, faceH / 2, L.deck.maxZ + faceT / 2], size: [w, faceH, faceT], kind: 'facing' },
    // Side returns, 16 ft back from the downstage edge.
    { centre: [L.deck.minX - faceT / 2, faceH / 2, L.deck.maxZ - d.deck.facingReturn / 2], size: [faceT, faceH, d.deck.facingReturn], kind: 'facing' },
    { centre: [L.deck.maxX + faceT / 2, faceH / 2, L.deck.maxZ - d.deck.facingReturn / 2], size: [faceT, faceH, d.deck.facingReturn], kind: 'facing' },
  ];
}

/** A road case on the deck: its foot centre (deck-relative y), size and turn about y. */
export interface StageCase {
  pos: [number, number, number];
  size: [number, number, number];
  rot: number;
}

/**
 * Cases stacked along the upstage edge, out of the playing area, with a second
 * case on about half of them. Where they stood is not documented; this is
 * stage dressing, shared by the browser and the Blender scene.
 */
export function stageCases(L = scaffoldLayout()): StageCase[] {
  const backZ = L.towerFrontZ + FT(3);
  const out: StageCase[] = [];
  const spots = [-22, -14, -6, 7, 15, 23];
  spots.forEach((ft, i) => {
    const big = i % 2 === 0;
    const w = big ? FT(3.6) : FT(2.6);
    const h = big ? FT(2.4) : FT(1.8);
    const d = FT(2.2);
    out.push({ pos: [FT(ft), 0, backZ + (i % 3) * 0.25], size: [w, h, d], rot: (i % 2 ? 1 : -1) * 0.12 });
    if (i % 3 === 0)
      out.push({ pos: [FT(ft) + 0.12, h, backZ + (i % 3) * 0.25], size: [w * 0.8, FT(1.4), d * 0.9], rot: 0.05 });
  });
  return out;
}

/** A stage-lighting can: where it hangs and the point it is aimed at. */
export interface Lamp {
  at: [number, number, number];
  aim: [number, number, number];
  indoor: boolean;
}

/**
 * The light bars on both upper corners (structure.lightBars), as pipes and
 * the lamps hung from them, aimed down at the band's line.
 */
export function lightRig(L = scaffoldLayout()): { pipes: (Tube & { indoor: boolean })[]; lamps: Lamp[] } {
  const rig = wall.structure.lightBars;
  const pipes: (Tube & { indoor: boolean })[] = [];
  const lamps: Lamp[] = [];
  const y = (v: number) => L.deck.y + v;
  for (const side of [1, -1])
    for (const bar of rig.bars) {
      const [ax, ay] = bar.from;
      const [bx, by] = bar.to;
      pipes.push({ a: [ax * side, y(ay), rig.z], b: [bx * side, y(by), rig.z], kind: 'ledger', indoor: !!bar.indoor });
      for (let k = 0; k < bar.lamps; k++) {
        const t = (k + 0.5) / bar.lamps;
        const x = (ax + (bx - ax) * t) * side;
        const at: [number, number, number] = [x, y(ay + (by - ay) * t) - 0.18, rig.z + 0.05];
        lamps.push({ at, aim: [x * 0.45, L.deck.y + 1.2, wall.dimensions.bandLineZ], indoor: !!bar.indoor });
      }
    }
  return { pipes, lamps };
}

export const TUBE_RADIUS = wall.structure.scaffold.tubeDiameter / 2;
export const PLANK = { width: IN(10), thickness: IN(2) };

/**
 * Where the tie-dyes hang (structure.tieDyes): the top centre of each, on the
 * front of the scaffold, from the second-highest lift. Read off the tubes the
 * way blender/venue.py used to: the highest tubes give the front face, the
 * horizontal ones the lifts.
 */
export function tieDyePanels(L = scaffoldLayout()): { top: [number, number, number]; width: number; height: number; palette: number }[] {
  const T = wall.structure.tieDyes;
  const tubes = scaffoldTubes(L);
  const top = Math.max(...tubes.map((t) => Math.max(t.a[1], t.b[1])));
  const front = Math.max(...tubes.filter((t) => Math.max(t.a[1], t.b[1]) > top - 0.05).flatMap((t) => [t.a[2], t.b[2]]));
  const lifts = [...new Set(tubes.filter((t) => Math.abs(t.a[1] - t.b[1]) < 1e-3 && t.a[1] > L.deck.y + 0.1).map((t) => Math.round(t.a[1] * 100) / 100))].sort((a, b) => a - b);
  const hang = lifts.length >= 2 ? lifts[lifts.length - 2] : top;
  return T.x.map((x, k) => ({ top: [x, hang, front + T.standoff], width: T.width, height: T.height, palette: k % T.palettes.length }));
}

/**
 * The paired vocal microphones: one stand in front of each player but the
 * drummer, 0.3 m downstage of the mark, the two capsules 60 mm apart. Drawn
 * by src/scene/BandGear.tsx and, via scene.json, by blender/build_scene.py.
 */
export const MIC = { standHeight: 1.44, standRadius: 0.016, baseRadius: 0.17, capsuleRadius: 0.019, capsuleLength: 0.05, capsuleY: 1.46, spacing: 0.06 };

export function vocalMics(L = scaffoldLayout()): [number, number, number][] {
  return wall.band.members
    .filter((m) => m.id !== 'kreutz')
    .map((m) => {
      // Keith's mark is the middle of the grand; he sat at its keyboard end
      // (band.instruments), so his stand is there, beside the keys, not
      // through the lid.
      const x = m.id === 'keith' ? m.x + wall.band.instruments.pianoKeyboardOffset + 0.1 : m.x;
      const z = m.id === 'keith' ? m.z + 0.55 : m.z + 0.3;
      return [wall.band.mirrored ? -x : x, L.deck.y, z];
    });
}

/**
 * The scaffold and stage, built bay by bay from the 10 April 1974 drawing
 * (Julien's lot 71: top view, stage left view, tower and stage requirements).
 *
 * Nothing here is styled — it emits tube segments and slabs. See
 * docs/reconstruction-spec.md §10 for the transcribed requirements.
 */
import { FT, IN, wall } from '../data/wall.config';

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
/** Index into DEPTH_CHAIN_FT where the tower band starts and ends. */
export const TOWER_BAND = { first: 3, last: 6 } as const;

/**
 * Lift heights, ground → top, off the stage left view:
 *   7'-0" + 5'-10" + 6'-6" ×4 = 38'-10"
 * The bottom two are made up on screwjacks; the rest are standard frames.
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

  const yLevels = cumulative(LIFT_CHAIN_FT).map(FT);

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
  const top = L.yLevels[L.yLevels.length - 1];
  const deckY = L.deck.y;

  // Tower band z-lines only — towers rise from the X-braced bays.
  const towerZ = L.zLines.slice(TOWER_BAND.first, TOWER_BAND.last + 2);

  // Standards: full height at every tower-band intersection.
  for (const x of L.xLines)
    for (const z of towerZ) tubes.push({ a: [x, 0, z], b: [x, top, z], kind: 'standard' });

  // Ledgers along the run, and across the depth, at every lift.
  for (const y of L.yLevels) {
    for (const z of towerZ)
      for (let i = 0; i < L.xLines.length - 1; i++)
        tubes.push({ a: [L.xLines[i], y, z], b: [L.xLines[i + 1], y, z], kind: 'ledger' });
    for (const x of L.xLines)
      for (let i = 0; i < towerZ.length - 1; i++)
        tubes.push({ a: [x, y, towerZ[i]], b: [x, y, towerZ[i + 1]], kind: 'ledger' });
  }

  // X-braces on the SECOND z-line and the upstage face — never on the front
  // line, because the front line is the speaker face. Bracing drawn there would
  // cross the cabinets, which is both wrong and unreadable.
  for (const z of [towerZ[1], towerZ[towerZ.length - 1]])
    for (let li = 0; li < L.yLevels.length - 1; li++) {
      const y0 = L.yLevels[li];
      const y1 = L.yLevels[li + 1];
      for (let i = 0; i < L.xLines.length - 1; i++) {
        const x0 = L.xLines[i];
        const x1 = L.xLines[i + 1];
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

/** Deck slab plus the 5/8" plywood facing across the front and 16 ft back each side. */
export interface Slab {
  centre: [number, number, number];
  size: [number, number, number];
  kind: 'deck' | 'facing';
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

export const TUBE_RADIUS = wall.structure.scaffold.tubeDiameter / 2;
export const PLANK = { width: IN(10), thickness: IN(2) };

/**
 * The Hollywood Bowl, 21 July 1974, laid out in the scene frame (metres, +y
 * up, +z toward the audience): the canyon's ground, the seating, the 1929
 * shell, Gehry's Sonotubes and the crown panels. Pure: the explorer builds
 * meshes from it (src/scene/Bowl.tsx) and scripts/export-scene.mjs hands the
 * same numbers to Blender (blender/hollywood_bowl.py).
 *
 * Ported from hollywood_bowl.py, whose frame is Blender's: (x, -z, y) here.
 * Values from wall.venues.hollywoodBowl; see PROVENANCE['venues.hollywoodBowl'].
 */
import { wall } from '../data/wall.config';
import { generator } from './random';
import { scaffoldLayout } from './scaffold';

const V = wall.venues.hollywoodBowl;

export interface BowlFrame {
  deck: number;
  /** The paving in front of the stage. */
  floor: number;
  /** The stage front's z: everything in the bowl is measured from its centre. */
  front: number;
}

export function bowlFrame(L = scaffoldLayout()): BowlFrame {
  return { deck: L.deck.y, floor: L.deck.y - V.stageDrop, front: L.deck.maxZ };
}

/** Height of the seating at radius r from the stage front: gentle in the boxes, steeper up the hill. */
export function seatHeight(r: number, f: BowlFrame) {
  const t = Math.max(0, r - V.seating.firstRow);
  return f.floor + V.seating.rise * t + V.seating.steepen * t * t;
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** The canyon: seats in the fan, hills beside and behind, the stage flat. */
export function terrainHeight(x: number, z: number, f: BowlFrame) {
  // Blender's frame: y = -z, and the stage front's centre line at -front.
  const y = -z;
  const dx = x;
  const dy = y + f.front;
  const r = Math.hypot(dx, dy);
  const ang = Math.atan2(Math.abs(dx), -dy); // 0 toward the crowd, pi behind the stage
  const n = (Math.sin(x * 0.037 + 1.3) * Math.cos(y * 0.029 - 0.7) + 0.5 * Math.sin(x * 0.11 + y * 0.083)) * 4.0;
  const S = V.seating;
  // Beyond the top row the hill flattens out (the bowl's rim, then Highland Avenue's side).
  const seats = seatHeight(Math.min(r, S.lastRow), f) - 0.4 + Math.min(25, 0.15 * Math.max(0, r - S.lastRow));
  const hill = seats + (4 + 0.25 * Math.min(r, 170)) * smooth(8, 70, r) + n * smooth(10, 40, r);
  const rb = Math.hypot(dx, dy - 10);
  const behind = f.deck - 0.3 + Math.max(0, rb - 20) * 0.55 + n * smooth(20, 40, rb);
  if (r < V.poolRadius) return f.floor - 0.05;
  if (ang < S.halfAngle) return seats;
  const side = seats + (hill - seats) * smooth(S.halfAngle, (80 * Math.PI) / 180, ang);
  if (ang < (100 * Math.PI) / 180) return side;
  const full = hill;
  return full + (behind - full) * smooth((100 * Math.PI) / 180, (125 * Math.PI) / 180, ang);
}

/** One of the shell's arches at radius R, `back` upstage: a half circle springing from the stage, with feet. */
export function shellArc(R: number, back: number, f: BowlFrame, seg = 48): [number, number, number][] {
  const zc = f.deck + V.shell.spring;
  const cx = V.shell.centreX;
  const pts: [number, number, number][] = [[cx - R, f.deck, -back]];
  for (let k = 0; k <= seg; k++) {
    const a = (Math.PI * k) / seg;
    pts.push([cx - Math.cos(a) * R, zc + Math.sin(a) * R, -back]);
  }
  pts.push([cx + R, f.deck, -back]);
  return pts;
}

/** The bank of upright Sonotubes round the sides and back of the Wall, each its own height. */
export function sonotubes(): { x: number; z: number; height: number }[] {
  const T = V.sonotubes;
  const rng = generator(T.seed);
  const path: [number, number][] = [];
  // Either side of the Wall at ±sideX (measured, §19), and a row behind it.
  const x0 = -T.sideX;
  for (let k = 0; k <= Math.floor((T.back - T.front) / T.spacing); k++) path.push([x0, T.front + T.spacing * k]);
  for (let k = 0; k <= Math.floor((2 * T.sideX) / T.spacing); k++) path.push([x0 + T.spacing * k, T.back]);
  for (let k = 1; k <= Math.floor((T.back - T.front) / T.spacing); k++) path.push([T.sideX, T.back - T.spacing * k]);
  return path.map(([x, back]) => ({ x, z: -back, height: rng.uniform(T.minHeight, T.maxHeight) }));
}

/** The tall white panels across the shell's crown: centres along a shallow curve, highest in the middle. */
export function crownPanels(f: BowlFrame): [number, number, number][] {
  const P = V.crownPanels;
  const mid = (P.left + P.right) / 2;
  const half = (P.right - P.left) / 2;
  return Array.from({ length: P.count }, (_, k) => {
    const x = P.left + ((P.right - P.left) * k) / (P.count - 1);
    const t = (x - mid) / half;
    return [x, f.deck + P.rise - P.sag * t * t, -P.back];
  });
}

/** Where the canyon's trees stand, in clumps, off the seating and clear of the stage. Explorer only: Blender plants Poly Haven's. */
export function treePoints(f: BowlFrame): { small: [number, number, number][]; large: [number, number, number][] } {
  const rng = generator(1922);
  const out = { small: [] as [number, number, number][], large: [] as [number, number, number][] };
  const S = V.seating;
  for (let i = 0; i < 12000; i++) {
    const x = rng.uniform(-260, 260);
    const y = rng.uniform(-230, 330);
    const dy = y + f.front;
    const r = Math.hypot(x, dy);
    const ang = Math.atan2(Math.abs(x), -dy);
    if (r < 24 || (ang < S.halfAngle + (4 * Math.PI) / 180 && r < S.lastRow + 6)) continue;
    if (Math.abs(x) < 17 && -2 < y && y < 22) continue;
    if (Math.sin(x * 0.05 + 2.1) * Math.cos(y * 0.043 + 0.4) + 0.4 * Math.sin(x * 0.17 - y * 0.13) < -0.1) continue;
    const z = -y;
    const h = terrainHeight(x, z, f) - 0.4;
    (rng.random() < 0.15 ? out.large : out.small).push([x, h, z]);
  }
  return out;
}

/** Where to stand in the seats: seated eye height, `back` metres from the stage front. */
export function seatEye(x: number, back: number, f: BowlFrame): [number, number, number] {
  return [x, seatHeight(back, f) + 1.15, f.front + back];
}

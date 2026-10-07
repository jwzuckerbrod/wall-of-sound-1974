/**
 * Builds one cabinet, once, per cabinet family — carcass, inset black baffle,
 * and the driver sitting in it.
 *
 * Geometry is grouped by MATERIAL ROLE rather than by part, so a family becomes
 * four merged geometries that four InstancedMeshes can draw with the same set
 * of per-instance matrices. 641 cabinets cost 20 draw calls, not 641.
 *
 * Local frame: origin at the cabinet centre, front face at +Z.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { CABINETS, DRIVERS, cabinetSize, type CabinetId, type Driver } from '../data/wall.config';
import type { Variant } from './arrays';

/** trim: the horns' grey frames. throat: the horns' black throats. */
export type Role = 'shell' | 'baffle' | 'cone' | 'metal' | 'trim' | 'throat';
export type CabinetGeometry = Record<Role, THREE.BufferGeometry | null>;

/** Texture density: one texture tile per this many metres of surface. */
const UV_PER_METRE = 1.6;

function scaleUv(geo: THREE.BufferGeometry, sx: number, sy: number) {
  const uv = geo.getAttribute('uv');
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * sx, uv.getY(i) * sy);
  uv.needsUpdate = true;
  return geo;
}

function panel(w: number, h: number, d: number, x: number, y: number, z: number) {
  const g = new THREE.BoxGeometry(w, h, d);
  scaleUv(g, Math.max(w, d) * UV_PER_METRE, Math.max(h, d) * UV_PER_METRE);
  g.translate(x, y, z);
  return g;
}

/**
 * A baffle board with the driver cutouts actually cut out.
 *
 * This matters more than it sounds: with a solid board the cones sit behind an
 * opaque panel and the whole wall renders as blank dark rectangles. The holes
 * are what makes it a speaker.
 */
type Hole = { x: number; y: number; r: number } | { x: number; y: number; w: number; h: number };

function drilledBaffle(w: number, h: number, thickness: number, holes: Hole[]): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2, -h / 2);
  shape.lineTo(w / 2, -h / 2);
  shape.lineTo(w / 2, h / 2);
  shape.lineTo(-w / 2, h / 2);
  shape.closePath();

  for (const hole of holes) {
    const path = new THREE.Path();
    if ('r' in hole) path.absarc(hole.x, hole.y, hole.r, 0, Math.PI * 2, true);
    else {
      // Clockwise, as a hole must be.
      path.moveTo(hole.x - hole.w / 2, hole.y - hole.h / 2);
      path.lineTo(hole.x - hole.w / 2, hole.y + hole.h / 2);
      path.lineTo(hole.x + hole.w / 2, hole.y + hole.h / 2);
      path.lineTo(hole.x + hole.w / 2, hole.y - hole.h / 2);
      path.closePath();
    }
    shape.holes.push(path);
  }

  const g = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false, curveSegments: 16 });
  g.translate(0, 0, -thickness / 2);
  scaleUv(g, UV_PER_METRE, UV_PER_METRE);
  return g;
}

interface Boards {
  top: boolean;
  bottom: boolean;
  left: boolean;
  right: boolean;
  back: boolean;
}

/** Which boards a cell keeps, by variant. Built the same way as blender/build_scene.py. */
function boardsOf(variant: Variant): Boards {
  switch (variant) {
    case 'lower': return { top: false, bottom: true, left: true, right: true, back: true };
    case 'upper': return { top: true, bottom: false, left: true, right: true, back: true };
    case 'first': return { top: true, bottom: true, left: true, right: false, back: false };
    case 'mid': return { top: true, bottom: true, left: false, right: false, back: false };
    case 'last': return { top: true, bottom: true, left: false, right: true, back: false };
    case 'single': return { top: true, bottom: true, left: true, right: true, back: false };
    default: return { top: true, bottom: true, left: true, right: true, back: true };
  }
}

/** An open-fronted box, with whichever boards the variant keeps. The front is the baffle. */
function carcass(w: number, h: number, d: number, t: number, b: Boards): THREE.BufferGeometry {
  const tt = b.top ? t : 0;
  const tb = b.bottom ? t : 0;
  const parts: THREE.BufferGeometry[] = [];
  if (b.left) parts.push(panel(t, h, d, -w / 2 + t / 2, 0, 0));
  if (b.right) parts.push(panel(t, h, d, w / 2 - t / 2, 0, 0));
  if (b.top) parts.push(panel(w - 2 * t, t, d, 0, h / 2 - t / 2, 0));
  if (b.bottom) parts.push(panel(w - 2 * t, t, d, 0, -h / 2 + t / 2, 0));
  if (b.back) parts.push(panel(w - 2 * t, h - tt - tb, t, 0, (tb - tt) / 2, -d / 2 + t / 2));
  const merged = mergeGeometries(parts, false);
  if (!merged) throw new Error('carcass: mergeGeometries returned null');
  return merged;
}

interface DriverParts {
  baffle: THREE.BufferGeometry[];
  cone: THREE.BufferGeometry[];
  metal: THREE.BufferGeometry[];
  trim: THREE.BufferGeometry[];
  throat: THREE.BufferGeometry[];
}

/** Width of the T350's cast frame round its mouth. Read off the lot 72 photograph. */
const HORN_RIM = 0.009;

/**
 * A driver mounted in a baffle at z = frontZ.
 *
 * The aluminium dust cap is modelled separately from the paper cone on purpose:
 * it is the only specular element on the whole face, and it is why the Wall
 * photographs as hundreds of points of light rather than a dark mass.
 */
function driver(d: Driver, x: number, y: number, frontZ: number, detail: 'full' | 'low'): DriverParts {
  const seg = detail === 'full' ? 20 : 10;
  const out: DriverParts = { baffle: [], cone: [], metal: [], trim: [], throat: [] };

  const coneR = d.coneDia / 2;
  const capR = d.dustCapDia / 2;

  if (d.horn) {
    // The T350 (lot 72): a rectangular horn, mouth flush with the baffle,
    // narrowing to its throat behind it, in a grey cast frame.
    const { w, h, depth } = d.horn;
    const mw = w - 2 * HORN_RIM;
    const mh = h - 2 * HORN_RIM;
    // A four-sided cylinder turned 45° is a square of side r·√2; scale it to the mouth.
    const flare = new THREE.CylinderGeometry(Math.SQRT1_2, Math.SQRT1_2 / 3.2, depth, 4, 1, true);
    flare.rotateY(Math.PI / 4);
    flare.rotateX(-Math.PI / 2);
    flare.scale(mw, mh, 1);
    flare.translate(x, y, frontZ - depth / 2);
    out.throat.push(flare);
    const rim = new THREE.Shape();
    rim.moveTo(-w / 2, -h / 2);
    rim.lineTo(w / 2, -h / 2);
    rim.lineTo(w / 2, h / 2);
    rim.lineTo(-w / 2, h / 2);
    rim.closePath();
    const mouth = new THREE.Path();
    mouth.moveTo(-mw / 2, -mh / 2);
    mouth.lineTo(-mw / 2, mh / 2);
    mouth.lineTo(mw / 2, mh / 2);
    mouth.lineTo(mw / 2, -mh / 2);
    mouth.closePath();
    rim.holes.push(mouth);
    const frame = new THREE.ExtrudeGeometry(rim, { depth: 0.006, bevelEnabled: false });
    frame.translate(x, y, frontZ);
    out.trim.push(frame);
    return out;
  }

  // Mounting flange, black: an annulus from the surround out to the frame edge.
  const flange = new THREE.RingGeometry(coneR + d.surroundWidth * 0.9, d.frameDia / 2, seg);
  flange.translate(x, y, frontZ + 0.001);
  out.baffle.push(flange);

  // Paper cone: mouth at the baffle, neck receding into the box.
  const cone = new THREE.CylinderGeometry(coneR, capR * 1.15, d.coneDepth, seg, 1, true);
  cone.rotateX(Math.PI / 2);
  cone.translate(x, y, frontZ - d.coneDepth / 2);
  out.cone.push(cone);

  if (detail === 'full') {
    // Half-roll surround around the cone mouth.
    const surround = new THREE.TorusGeometry(coneR + d.surroundWidth / 2, d.surroundWidth / 2, 6, seg);
    surround.translate(x, y, frontZ);
    out.cone.push(surround);
  }

  // Aluminium dust cap: a flattened dome at the neck.
  const cap = new THREE.SphereGeometry(capR, seg, Math.max(4, seg / 3), 0, Math.PI * 2, 0, Math.PI / 2);
  cap.rotateX(Math.PI / 2);
  cap.scale(1, 1, d.dustCapRise / capR);
  cap.translate(x, y, frontZ - d.coneDepth);
  out.metal.push(cap);

  return out;
}

/** Where the drivers sit on a given cabinet's face. */
function driverLayout(id: CabinetId): { driver: Driver; x: number; y: number }[] {
  const { w, h } = cabinetSize(id);
  const d = DRIVERS[CABINETS[id].driver];

  if (id === 'cab12x2') {
    // The measured cabinet: two 12s side by side, two small drivers above.
    const small = DRIVERS.jbl5;
    const gap = w / 4;
    return [
      { driver: d, x: -gap, y: -h * 0.12 },
      { driver: d, x: gap, y: -h * 0.12 },
      { driver: small, x: -small.frameDia * 0.7, y: h * 0.33 },
      { driver: small, x: small.frameDia * 0.7, y: h * 0.33 },
    ];
  }
  return [{ driver: d, x: 0, y: CABINETS[id].driverOffsetY ?? 0 }];
}

const built = new Map<string, CabinetGeometry>();

export function cabinetGeometry(id: CabinetId, variant: Variant = 'whole'): CabinetGeometry {
  const key = `${id}:${variant}`;
  const hit = built.get(key);
  if (hit) return hit;

  const cab = CABINETS[id];
  const { w, h, d } = cabinetSize(id);
  const t = cab.shellThickness;
  const boards = boardsOf(variant);
  const tt = boards.top ? t : 0;
  const tb = boards.bottom ? t : 0;
  const detail: 'full' | 'low' = cab.driver === 'jbl15' || cab.driver === 'jbl12' ? 'full' : 'low';

  const parts: Record<Role, THREE.BufferGeometry[]> = { shell: [], baffle: [], cone: [], metal: [], trim: [], throat: [] };

  const slots = driverLayout(id);
  const frontZ = d / 2 - cab.baffleInset;
  // Cutouts a shade smaller than the driver frame, so the flange has something
  // to sit on — which is how a driver is actually mounted. A horn's is its mouth.
  const holes: Hole[] = slots.map((s) =>
    s.driver.horn
      ? { x: s.x, y: s.y, w: s.driver.horn.w - 2 * HORN_RIM, h: s.driver.horn.h - 2 * HORN_RIM }
      : { x: s.x, y: s.y, r: s.driver.frameDia * 0.46 },
  );

  parts.shell.push(carcass(w, h, d, t, boards));
  // The baffle spans the full height wherever a board is left off, so a
  // paired box reads as one face holding two drivers.
  const board = drilledBaffle(w - t * 2, h - tt - tb, Math.min(t, 0.019), holes.map((o) => ({ ...o, y: o.y - (tb - tt) / 2 })));
  board.translate(0, (tb - tt) / 2, frontZ);
  parts.baffle.push(board);

  for (const slot of slots) {
    const dp = driver(slot.driver, slot.x, slot.y, frontZ, detail);
    for (const r of Object.keys(dp) as (keyof DriverParts)[]) parts[r].push(...dp[r]);
  }

  /**
   * mergeGeometries refuses to mix indexed and non-indexed inputs and returns
   * null when it does — silently, which cost an hour: ExtrudeGeometry (the
   * drilled baffle) is non-indexed while RingGeometry (the driver flange) is
   * indexed, so every baffle board in the wall quietly vanished and the bare
   * carcass showed through. Normalise first, then refuse to continue on null.
   */
  const merge = (parts: THREE.BufferGeometry[]) => {
    if (!parts.length) return null;
    const flat = parts.map((p) => (p.getIndex() ? p.toNonIndexed() : p));
    const merged = mergeGeometries(flat, false);
    if (!merged) throw new Error(`cabinetGeometry(${id}): mergeGeometries returned null`);
    return merged;
  };
  const geo: CabinetGeometry = {
    shell: merge(parts.shell),
    baffle: merge(parts.baffle),
    cone: merge(parts.cone),
    metal: merge(parts.metal),
    trim: merge(parts.trim),
    throat: merge(parts.throat),
  };
  built.set(key, geo);
  return geo;
}

/** Triangles per cabinet, for the performance readout. */
export function cabinetTriangles(id: CabinetId): number {
  const g = cabinetGeometry(id);
  return (Object.values(g) as (THREE.BufferGeometry | null)[]).reduce((sum, part) => {
    if (!part) return sum;
    const index = part.getIndex();
    return sum + (index ? index.count : part.getAttribute('position').count) / 3;
  }, 0);
}

export function disposeCabinets() {
  for (const g of built.values())
    for (const part of Object.values(g) as (THREE.BufferGeometry | null)[]) part?.dispose();
  built.clear();
}

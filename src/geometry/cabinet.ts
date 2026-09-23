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

export type Role = 'shell' | 'baffle' | 'cone' | 'metal';
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
function drilledBaffle(
  w: number,
  h: number,
  thickness: number,
  holes: { x: number; y: number; r: number }[],
): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2, -h / 2);
  shape.lineTo(w / 2, -h / 2);
  shape.lineTo(w / 2, h / 2);
  shape.lineTo(-w / 2, h / 2);
  shape.closePath();

  for (const hole of holes) {
    const path = new THREE.Path();
    path.absarc(hole.x, hole.y, hole.r, 0, Math.PI * 2, true);
    shape.holes.push(path);
  }

  const g = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false, curveSegments: 16 });
  g.translate(0, 0, -thickness / 2);
  scaleUv(g, UV_PER_METRE, UV_PER_METRE);
  return g;
}

/** An open-fronted box: two sides, top, bottom, back. The front is the baffle. */
function carcass(w: number, h: number, d: number, t: number): THREE.BufferGeometry {
  const parts = [
    panel(w, t, d, 0, h / 2 - t / 2, 0),
    panel(w, t, d, 0, -h / 2 + t / 2, 0),
    panel(t, h - 2 * t, d, -w / 2 + t / 2, 0, 0),
    panel(t, h - 2 * t, d, w / 2 - t / 2, 0, 0),
    panel(w - 2 * t, h - 2 * t, t, 0, 0, -d / 2 + t / 2),
  ];
  const merged = mergeGeometries(parts, false);
  if (!merged) throw new Error('carcass: mergeGeometries returned null');
  return merged;
}

interface DriverParts {
  baffle: THREE.BufferGeometry[];
  cone: THREE.BufferGeometry[];
  metal: THREE.BufferGeometry[];
}

/**
 * A driver mounted in a baffle at z = frontZ.
 *
 * The aluminium dust cap is modelled separately from the paper cone on purpose:
 * it is the only specular element on the whole face, and it is why the Wall
 * photographs as hundreds of points of light rather than a dark mass.
 */
function driver(d: Driver, x: number, y: number, frontZ: number, detail: 'full' | 'low'): DriverParts {
  const seg = detail === 'full' ? 20 : 10;
  const out: DriverParts = { baffle: [], cone: [], metal: [] };

  const coneR = d.coneDia / 2;
  const capR = d.dustCapDia / 2;

  // Mounting flange, black: an annulus from the surround out to the frame edge.
  const flange = new THREE.RingGeometry(coneR + d.surroundWidth * 0.9, d.frameDia / 2, seg);
  flange.translate(x, y, frontZ + 0.001);
  out.baffle.push(flange);

  if (d.id === 'evHorn') {
    // A horn, not a cone: a shallow rectangular flare with a throat behind it.
    const mouth = new THREE.CylinderGeometry(d.frameDia / 2, d.frameDia / 2.9, Math.abs(d.coneDepth), 4, 1, true);
    mouth.rotateX(Math.PI / 2);
    mouth.rotateZ(Math.PI / 4);
    mouth.translate(x, y, frontZ + Math.abs(d.coneDepth) / 2);
    out.metal.push(mouth);
    return out;
  }

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
  return [{ driver: d, x: 0, y: 0 }];
}

const built = new Map<CabinetId, CabinetGeometry>();

export function cabinetGeometry(id: CabinetId): CabinetGeometry {
  const hit = built.get(id);
  if (hit) return hit;

  const cab = CABINETS[id];
  const { w, h, d } = cabinetSize(id);
  const t = cab.shellThickness;
  const isPanel = cab.kind === 'panel';
  const detail: 'full' | 'low' = cab.driver === 'jbl15' || cab.driver === 'jbl12' ? 'full' : 'low';

  const shellParts: THREE.BufferGeometry[] = [];
  const baffleParts: THREE.BufferGeometry[] = [];
  const coneParts: THREE.BufferGeometry[] = [];
  const metalParts: THREE.BufferGeometry[] = [];

  const slots = driverLayout(id);
  const frontZ = d / 2 - cab.baffleInset - (isPanel ? 0 : t / 2);
  // Cutouts a shade smaller than the driver frame, so the flange has something
  // to sit on — which is how a driver is actually mounted.
  const holes = slots.map((s) => ({ x: s.x, y: s.y, r: s.driver.frameDia * 0.46 }));

  if (isPanel) {
    // A cell of a shared baffle board, not a box: one continuous black face
    // with drilled cutouts, which is what the close-up photographs show.
    const board = drilledBaffle(w, h, cab.baffleInset * 2, holes);
    board.translate(0, 0, frontZ);
    baffleParts.push(board);
    shellParts.push(panel(w, h, Math.max(0.02, d - cab.baffleInset * 2), 0, 0, -cab.baffleInset));
  } else {
    shellParts.push(carcass(w, h, d, t));
    const board = drilledBaffle(w - t * 2, h - t * 2, t, holes);
    board.translate(0, 0, frontZ);
    baffleParts.push(board);
  }

  for (const slot of slots) {
    const parts = driver(slot.driver, slot.x, slot.y, frontZ, detail);
    baffleParts.push(...parts.baffle);
    coneParts.push(...parts.cone);
    metalParts.push(...parts.metal);
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
    shell: merge(shellParts),
    baffle: merge(baffleParts),
    cone: merge(coneParts),
    metal: merge(metalParts),
  };
  built.set(id, geo);
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

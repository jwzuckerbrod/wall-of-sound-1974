/**
 * Road cases and the MC 2300, as geometry grouped by material, ported from
 * blender/roadgear.py (anvil, zero_case, mc2300) so both renderers build the
 * same objects. Everything on the deck stands still, so each part is placed
 * in world space and merged: the whole of the road gear is a handful of draw
 * calls.
 *
 * Local frame of a case: origin at the center of its foot, front at +z,
 * y up. (Blender's frame is front at -y, z up; sizes here are already turned.)
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { IN, wall } from '../data/wall.config';
import type { CaseStyle } from './roadgear';

/** paint carries vertex colors, so every case style shares one material. */
export type GearRole = 'paint' | 'alu' | 'steel' | 'rubber' | 'dark' | 'rust' | 'interior' | 'black' | 'gold' | 'knob' | 'red';

export class GearBuilder {
  parts: Partial<Record<GearRole, THREE.BufferGeometry[]>> = {};
  private colour = new THREE.Color();

  add(role: GearRole, g: THREE.BufferGeometry, m: THREE.Matrix4, paint?: string) {
    const geo = (g.index ? g.toNonIndexed() : g).applyMatrix4(m);
    for (const k of Object.keys(geo.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') geo.deleteAttribute(k);
    if (!geo.getAttribute('uv')) geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(geo.getAttribute('position').count * 2), 2));
    if (role === 'paint') {
      this.colour.set(paint ?? '#808080');
      const n = geo.getAttribute('position').count;
      const c = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) c.set([this.colour.r, this.colour.g, this.colour.b], i * 3);
      geo.setAttribute('color', new THREE.BufferAttribute(c, 3));
    }
    (this.parts[role] ??= []).push(geo);
  }

  merged(): Partial<Record<GearRole, THREE.BufferGeometry>> {
    const out: Partial<Record<GearRole, THREE.BufferGeometry>> = {};
    for (const [role, list] of Object.entries(this.parts) as [GearRole, THREE.BufferGeometry[]][]) {
      const g = mergeGeometries(list, false);
      if (!g) throw new Error(`GearBuilder: could not merge ${role}`);
      out[role] = g;
    }
    return out;
  }
}

const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);
const at = (base: THREE.Matrix4, x: number, y: number, z: number, rot?: THREE.Euler) =>
  base.clone().multiply(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(rot ?? new THREE.Euler()), new THREE.Vector3(1, 1, 1)));
const cylX = (r: number, len: number, seg = 16) => new THREE.CylinderGeometry(r, r, len, seg).rotateZ(Math.PI / 2);
const cylZ = (r: number, len: number, seg = 16) => new THREE.CylinderGeometry(r, r, len, seg).rotateX(Math.PI / 2);
const ball = (r: number) => new THREE.SphereGeometry(r, 10, 6);

export function caseColour(style: CaseStyle | 'zeroOrange' | 'zeroPurple') {
  return wall.structure.roadCases.colours[style];
}

/**
 * An Anvil case (blender/roadgear.py anvil()): laminate, aluminum angle on
 * all twelve edges, ball corners (orange, white) or folded rusted corners
 * (black, as Budman's), rivets, a lid seam with two latches (or an open rack
 * front with rails), recessed end handles, casters.
 */
export function anvil(B: GearBuilder, base: THREE.Matrix4, w: number, h: number, d: number, style: CaseStyle, openFront = false) {
  const C = wall.structure.roadCases;
  const paint = caseColour(style);
  const z0 = C.casterHeight;
  const z1 = h;
  const hb = z1 - z0;
  const T = C.wall;
  const corner: GearRole = style === 'black' ? 'rust' : 'alu';
  const dish: GearRole = style === 'black' ? 'rust' : 'steel';

  // Casters: plate, fork, wheel.
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      const cx = sx * (w / 2 - 0.065);
      const cz = sz * (d / 2 - 0.065);
      B.add('steel', box(0.095, 0.006, 0.095), at(base, cx, z0 - 0.003, cz));
      B.add('steel', box(0.06, 0.022, 0.05), at(base, cx, z0 - 0.017, cz));
      for (const fx of [-1, 1]) B.add('steel', box(0.005, 0.07, 0.05), at(base, cx + fx * 0.024, z0 - 0.045, cz));
      B.add('rubber', cylX(0.046, 0.036, 14), at(base, cx, 0.046, cz));
    }

  if (openFront) {
    B.add('paint', box(T, hb, d), at(base, -w / 2 + T / 2, z0 + hb / 2, 0), paint);
    B.add('paint', box(T, hb, d), at(base, w / 2 - T / 2, z0 + hb / 2, 0), paint);
    B.add('paint', box(w, T, d), at(base, 0, z1 - T / 2, 0), paint);
    B.add('paint', box(w, T, d), at(base, 0, z0 + T / 2, 0), paint);
    B.add('paint', box(w, hb, T), at(base, 0, z0 + hb / 2, -d / 2 + T / 2), paint);
    B.add('interior', box(w - 2 * T, hb - 2 * T, 0.002), at(base, 0, z0 + hb / 2, -d / 2 + T + 0.001));
    for (const sx of [-1, 1])
      B.add('black', box(0.022, hb - 2 * T, 0.012), at(base, sx * (w / 2 - T - 0.011), z0 + hb / 2, d / 2 - C.rackSetback - 0.006));
  } else {
    B.add('paint', box(w, hb, d), at(base, 0, z0 + hb / 2, 0), paint);
  }

  // Aluminum angle along all twelve edges.
  const e = 0.022;
  const inset = (sz: number) => sz - Math.sign(sz - z0 - hb / 2) * (e / 2 - 0.002);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) B.add('alu', box(e, hb, e), at(base, sx * (w / 2 - e / 2 + 0.002), z0 + hb / 2, sz * (d / 2 - e / 2 + 0.002)));
    for (const y of [z0, z1]) B.add('alu', box(e, e, d), at(base, sx * (w / 2 - e / 2 + 0.002), inset(y), 0));
  }
  for (const sz of [-1, 1]) for (const y of [z0, z1]) B.add('alu', box(w, e, e), at(base, 0, inset(y), sz * (d / 2 - e / 2 + 0.002)));

  // Corners: ball corners, or Budman's folded steel plates.
  for (const sx of [-1, 1])
    for (const sz of [-1, 1])
      for (const y of [z0, z1]) {
        if (style === 'black') {
          const q = 0.075;
          const t = 0.004;
          const up = y === z1 ? 1 : -1;
          B.add(corner, box(q, t, q), at(base, sx * (w / 2 - q / 2 + 0.004), y + up * 0.002, sz * (d / 2 - q / 2 + 0.004)));
          B.add(corner, box(t, q, q), at(base, sx * (w / 2 + 0.003), y - up * (q / 2 - 0.004), sz * (d / 2 - q / 2 + 0.004)));
          B.add(corner, box(q, q, t), at(base, sx * (w / 2 - q / 2 + 0.004), y - up * (q / 2 - 0.004), sz * (d / 2 + 0.003)));
        } else B.add(corner, ball(0.026), at(base, sx * w / 2, y, sz * d / 2));
      }

  // Rivets down the front edging.
  const n = Math.max(2, Math.floor(hb / 0.075));
  for (const sx of [-1, 1]) for (let k = 1; k < n; k++) B.add('alu', ball(0.0035), at(base, sx * (w / 2 - 0.009), z0 + (hb * k) / n, d / 2 + 0.001));

  // The lid seam, its latches; Budman's piano hinge.
  const seam = z0 + hb * 0.78;
  if (!openFront) {
    for (const sz of [-1, 1]) B.add('alu', box(w + 0.004, 0.026, 0.006), at(base, 0, seam, sz * (d / 2 + 0.001)));
    for (const sx of [-1, 1]) B.add('alu', box(0.006, 0.026, d + 0.004), at(base, sx * (w / 2 + 0.001), seam, 0));
    for (const lx of [-0.3, 0.3]) {
      B.add(dish, box(0.13, 0.155, 0.006), at(base, lx * w, seam, d / 2 + 0.002));
      B.add('alu', box(0.065, 0.08, 0.014), at(base, lx * w, seam - 0.01, d / 2 + 0.008));
      B.add('alu', cylZ(0.014, 0.014, 12), at(base, lx * w, seam, d / 2 + 0.018));
    }
    const m = Math.max(2, Math.floor(w / 0.07));
    for (let k = 1; k < m; k++)
      for (const dy of [0.009, -0.009]) B.add('alu', ball(0.0035), at(base, -w / 2 + (w * k) / m, seam + dy, d / 2 + 0.004));
    if (style === 'black') {
      B.add('alu', box(w * 0.82, 0.05, 0.006), at(base, 0, seam, -d / 2 - 0.003));
      B.add('alu', cylX(0.006, w * 0.82, 10), at(base, 0, seam, -d / 2 - 0.006));
    }
  }

  // Recessed handles in both ends.
  for (const sx of [-1, 1]) {
    B.add('steel', box(0.006, 0.1, 0.17), at(base, sx * (w / 2 + 0.002), z0 + hb * 0.55, 0));
    B.add('dark', box(0.006, 0.05, 0.13), at(base, sx * (w / 2 + 0.004), z0 + hb * 0.55, 0));
  }
}

/**
 * A ZERO metal case for one amplifier (blender/roadgear.py zero_case(); lots
 * 34-35): a painted aluminum cube with rounded edges, a lip where the lid
 * meets the base, draw latches on all four sides, a handle in each end.
 */
export function zeroCase(B: GearBuilder, base: THREE.Matrix4, colour: 'orange' | 'purple') {
  const { w, h, d } = wall.structure.roadCases.zeroSize;
  B.add('paint', new RoundedBoxGeometry(w, h, d, 3, 0.025), at(base, 0, h / 2, 0), caseColour(colour === 'orange' ? 'zeroOrange' : 'zeroPurple'));
  const seam = h * 0.36;
  B.add('alu', box(w + 0.004, 0.012, d + 0.004), at(base, 0, seam, 0));
  const sides: [number, number, number][] = [[0, 1, w], [0, -1, w], [-1, 0, d], [1, 0, d]];
  for (const [nx, nz, span] of sides) {
    for (const f of [-0.32, 0.32]) {
      const x = nx * (w / 2 + 0.006) + (nz ? f * span : 0);
      const z = nz * (d / 2 + 0.006) + (nx ? f * span : 0);
      B.add('steel', box(nx ? 0.012 : 0.045, 0.07, nx ? 0.045 : 0.012), at(base, x, seam, z));
    }
    if (nx) B.add('steel', box(0.015, 0.035, 0.12), at(base, nx * (w / 2 + 0.01), h * 0.68, 0));
  }
}

/**
 * The parts of an MC 2300 that stand off its panel (blender/roadgear.py
 * mc2300()): knurled knobs, the red rocker, rack handles; the panel itself
 * and the chassis. The panel's print, meters and badge are a texture
 * (src/materials/gearTextures.ts). Origin at the middle of the panel's front
 * face, facing +z.
 */
export function mc2300(B: GearBuilder, base: THREE.Matrix4) {
  const A = wall.structure.amps;
  const { w, h, d } = A.size;
  const P = A.panel;
  const t = 0.006;
  // The panel's front face carries the texture: a plane, its edges and back a thin box behind it.
  const face = new THREE.PlaneGeometry(w, h);
  B.add('gold', face, at(base, 0, 0, 0.0002));
  B.add('black', box(w, h, t), at(base, 0, 0, -t / 2));
  B.add('black', box(P.chassisWidth, h - IN(0.3), d - t), at(base, 0, 0, -t - (d - t) / 2));
  const sz = -h / 2 + P.stripHeight / 2;
  for (const x of [-5.7, -1.7, 2.6]) B.add('knob', new THREE.CylinderGeometry(IN(0.6), IN(0.6), IN(0.65), 28).rotateX(Math.PI / 2), at(base, IN(x), sz - IN(0.1), IN(0.325)));
  B.add('red', box(IN(0.6), IN(1.15), IN(0.3)), at(base, IN(5.9), sz - IN(0.1), IN(0.15)));
  for (const sx of [-1, 1]) {
    const hx = sx * IN(8.75);
    for (const z of [3.1, -1.3]) B.add('alu', box(IN(0.55), IN(0.5), IN(1.2)), at(base, hx, IN(z), IN(0.6)));
    B.add('alu', box(IN(0.55), IN(4.9), IN(0.45)), at(base, hx, IN(0.9), IN(1.2)));
  }
}

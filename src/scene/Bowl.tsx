import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { wall } from '../data/wall.config';
import { bowlFrame, crownPanels, seatHeight, shellArc, sonotubes, terrainHeight, treePoints, type BowlFrame } from '../geometry/bowl';

/**
 * The Hollywood Bowl, 21 July 1974, around the Wall: the canyon, the seating,
 * the 1929 shell, Frank Gehry's Sonotubes and the panels in the shell's
 * crown, from the same layout Blender builds (src/geometry/bowl.ts). No
 * crowd: that is the renders' (blender/make_people.py), and far too heavy for
 * a browser. The trees are simple shapes where Blender plants Poly Haven's.
 */

const V = wall.venues.hollywoodBowl;
const C = V.colours;

const mat = (color: string, roughness: number, extra: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness, ...extra });

/** A strip of quads between two polylines of equal length. */
function strip(a: [number, number, number][], b: [number, number, number][]) {
  const pos: number[] = [];
  for (let k = 0; k < a.length - 1; k++) {
    const q = [a[k], a[k + 1], b[k + 1], a[k], b[k + 1], b[k]];
    for (const p of q) pos.push(...p);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

function shellGeometry(f: BowlFrame) {
  const S = V.shell;
  const soffits: THREE.BufferGeometry[] = [];
  const faces: THREE.BufferGeometry[] = [];
  for (let i = 0; i < S.rings; i++) {
    const R = S.outerRadius - S.ringStep * i;
    const Rn = R - S.ringStep;
    const a = S.frontBack + S.ringDepth * i;
    const b = a + S.ringDepth;
    soffits.push(strip(shellArc(R, a, f), shellArc(R, b, f)));
    faces.push(strip(shellArc(R, b, f), shellArc(Rn, b, f)));
  }
  // The hood: the front arch's face, and its back over the hill.
  faces.push(strip(shellArc(S.outerRadius + S.hood, S.frontBack, f), shellArc(S.outerRadius, S.frontBack, f)));
  faces.push(strip(shellArc(S.outerRadius + S.hood, S.frontBack, f), shellArc(S.outerRadius + S.hood, S.frontBack + S.ringDepth * S.rings + 1.5, f)));
  // The back wall, closing the last ring.
  const last = shellArc(S.outerRadius - S.ringStep * S.rings, S.frontBack + S.ringDepth * S.rings, f);
  const wallShape = new THREE.Shape(last.map(([x, y]) => new THREE.Vector2(x, y)));
  const back = new THREE.ShapeGeometry(wallShape).translate(0, 0, last[0][2]);
  back.deleteAttribute('uv');
  soffits.push(back);
  const merge = (list: THREE.BufferGeometry[]) => {
    const g = mergeGeometries(list.map((x) => (x.index ? x.toNonIndexed() : x)), false);
    if (!g) throw new Error('Bowl: could not merge the shell');
    return g;
  };
  return { white: merge(faces), inside: merge(soffits) };
}

function terrainGeometry(f: BowlFrame) {
  const size = 700;
  const n = 180;
  const g = new THREE.PlaneGeometry(size, size, n, n).rotateX(-Math.PI / 2).translate(0, 0, -120);
  const pos = g.getAttribute('position');
  const col = new Float32Array(pos.count * 3);
  const dry = new THREE.Color('#8a7a52');
  const green = new THREE.Color('#4f5530');
  const dark = new THREE.Color('#2f4024');
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    pos.setY(i, terrainHeight(x, z, f));
    // Chaparral: dry grass and scrub in patches, darker in the hollows.
    const n1 = 0.5 + 0.5 * Math.sin(x * 0.06 + 1.1) * Math.cos(z * 0.05 - 0.4);
    const n2 = 0.5 + 0.5 * Math.sin(x * 0.21 - z * 0.17);
    c.copy(green).lerp(dark, n1 * 0.6).lerp(dry, n2 * 0.45);
    col.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}

/** Concentric rows up the hill: a riser and a tread each, and a bench on it. */
function seatingGeometry(f: BowlFrame) {
  const S = V.seating;
  const seg = 72;
  const concrete: number[] = [];
  const bench: number[] = [];
  const quad = (out: number[], p: number[][]) => out.push(...p[0], ...p[1], ...p[2], ...p[0], ...p[2], ...p[3]);
  const at = (a: number, r: number, y: number) => [Math.sin(a) * r, y, f.front + Math.cos(a) * r];
  for (let r = S.firstRow; r < S.lastRow; r += S.rowDepth) {
    const y0 = seatHeight(r, f);
    const y1 = seatHeight(r + S.rowDepth, f);
    const rb = r + S.rowDepth * 0.55;
    for (let k = 0; k < seg; k++) {
      const a = -S.halfAngle + (2 * S.halfAngle * k) / seg;
      const b = -S.halfAngle + (2 * S.halfAngle * (k + 1)) / seg;
      quad(concrete, [at(a, r, y0), at(b, r, y0), at(b, r, y1), at(a, r, y1)]);
      quad(concrete, [at(a, r, y1), at(b, r, y1), at(b, r + S.rowDepth, y1), at(a, r + S.rowDepth, y1)]);
      quad(bench, [at(a, rb, y1 + 0.42), at(b, rb, y1 + 0.42), at(b, rb + 0.3, y1 + 0.42), at(a, rb + 0.3, y1 + 0.42)]);
    }
  }
  const make = (p: number[]) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    g.computeVertexNormals();
    return g;
  };
  // The pool circle's paving.
  const pool = new THREE.CircleGeometry(V.poolRadius, 64, 0, Math.PI).rotateX(-Math.PI / 2).rotateY(Math.PI).translate(0, f.floor + 0.01, f.front);
  return { concrete: make(concrete), bench: make(bench), pool };
}

function tubesGeometry(f: BowlFrame) {
  const parts: THREE.BufferGeometry[] = [];
  const L = 2 * (V.shell.outerRadius + 0.4);
  for (const t of V.beamTubes) {
    parts.push(new THREE.CylinderGeometry(t.radius, t.radius, L, 32, 1, true).rotateZ(Math.PI / 2).translate(0, f.deck + t.height, -t.back));
    for (const sx of [-1, 1]) parts.push(new THREE.SphereGeometry(t.radius, 20, 10).translate((sx * L) / 2, f.deck + t.height, -t.back));
  }
  const d = V.sonotubes.diameter;
  for (const t of sonotubes()) parts.push(new THREE.CylinderGeometry(d / 2, d / 2, t.height, 20).translate(t.x, f.deck + t.height / 2, t.z));
  return mergeGeometries(parts.map((g) => g.toNonIndexed()), false)!;
}

function panelsGeometry(f: BowlFrame) {
  const P = V.crownPanels;
  return mergeGeometries(crownPanels(f).map(([x, y, z]) => new THREE.BoxGeometry(P.width, P.height, 0.06).translate(x, y, z)), false)!;
}

/** Oaks and chaparral, as squashed lumpy spheres, coloured each its own shade of green. */
function Trees({ f }: { f: BowlFrame }) {
  const pts = useMemo(() => treePoints(f), [f]);
  const small = useRef<THREE.InstancedMesh>(null);
  const large = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => {
    const make = (rad: number, squash: number) => {
      const g = mergeVertices(new THREE.IcosahedronGeometry(rad, 2).deleteAttribute('normal').deleteAttribute('uv'));
      const p = g.getAttribute('position');
      for (let i = 0; i < p.count; i++) {
        const k = 0.82 + 0.3 * (0.5 + 0.5 * Math.sin(i * 12.9898));
        p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * squash + rad * squash * 0.6, p.getZ(i) * k);
      }
      g.computeVertexNormals();
      return g;
    };
    return { small: make(0.9, 0.75), large: make(2.6, 0.8) };
  }, []);
  const material = useMemo(() => mat('#ffffff', 0.9), []);
  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const c = new THREE.Color();
    const a = new THREE.Color('#26361c');
    const b = new THREE.Color('#5d6234');
    for (const [ref, list] of [[small, pts.small], [large, pts.large]] as const) {
      const mesh = ref.current;
      if (!mesh) continue;
      list.forEach((p, i) => {
        const s = 0.8 + 0.5 * (0.5 + 0.5 * Math.sin(i * 78.233));
        m.makeRotationY(i * 2.39).scale(new THREE.Vector3(s, s, s)).setPosition(...p);
        mesh.setMatrixAt(i, m);
        mesh.setColorAt(i, c.copy(a).lerp(b, 0.5 + 0.5 * Math.sin(i * 3.7)));
      });
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.computeBoundingSphere();
    }
  }, [pts]);
  return (
    <>
      <instancedMesh ref={small} args={[geo.small, material, pts.small.length]} receiveShadow />
      <instancedMesh ref={large} args={[geo.large, material, pts.large.length]} receiveShadow />
    </>
  );
}

export function Bowl({ shadows }: { shadows: boolean }) {
  const f = useMemo(() => bowlFrame(), []);
  const g = useMemo(
    () => ({ shell: shellGeometry(f), terrain: terrainGeometry(f), seating: seatingGeometry(f), tubes: tubesGeometry(f), panels: panelsGeometry(f) }),
    [f],
  );
  const m = useMemo(
    () => ({
      shell: mat(C.shell, 0.55, { side: THREE.DoubleSide }),
      inside: mat(C.shellInside, 0.7, { side: THREE.DoubleSide }),
      terrain: mat('#ffffff', 0.95, { vertexColors: true }),
      concrete: mat(C.concrete, 0.9, { side: THREE.DoubleSide }),
      bench: mat(C.bench, 0.85, { side: THREE.DoubleSide }),
      paving: mat(C.paving, 0.85),
      tube: mat(C.sonotube, 0.75),
      panel: mat(C.panel, 0.5),
      stage: mat(C.stage, 0.8),
    }),
    [],
  );
  // The stage floor under the shell, behind the Wall's own deck.
  const R0 = V.shell.outerRadius;
  const backWall = V.shell.frontBack + V.shell.ringDepth * V.shell.rings;
  return (
    <group name="hollywood-bowl">
      <mesh geometry={g.terrain} material={m.terrain} receiveShadow={shadows} />
      <mesh geometry={g.seating.concrete} material={m.concrete} receiveShadow={shadows} />
      <mesh geometry={g.seating.bench} material={m.bench} receiveShadow={shadows} />
      <mesh geometry={g.seating.pool} material={m.paving} receiveShadow={shadows} />
      <mesh geometry={g.shell.white} material={m.shell} receiveShadow={shadows} castShadow={shadows} />
      <mesh geometry={g.shell.inside} material={m.inside} receiveShadow={shadows} castShadow={shadows} />
      <mesh geometry={g.tubes} material={m.tube} receiveShadow={shadows} castShadow={shadows} />
      <mesh geometry={g.panels} material={m.panel} receiveShadow={shadows} castShadow={shadows} />
      <mesh position={[0, f.deck - 0.15, -(backWall + 5.6) / 2]} material={m.stage} receiveShadow={shadows}>
        <boxGeometry args={[2 * R0 + 2, 0.3, backWall - 5.6]} />
      </mesh>
      <Trees f={f} />
    </group>
  );
}

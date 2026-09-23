import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { ARRAYS, cabinetSize, FT, wall } from '../data/wall.config';
import { scaffoldLayout, scaffoldTubes, stageSlabs, TUBE_RADIUS, type Tube } from '../geometry/scaffold';
import { wallMaterials } from '../materials';

interface Scratch {
  a: THREE.Vector3; b: THREE.Vector3; d: THREE.Vector3;
  mid: THREE.Vector3; q: THREE.Quaternion; s: THREE.Vector3; up: THREE.Vector3;
}

const scratch = (): Scratch => ({
  a: new THREE.Vector3(), b: new THREE.Vector3(), d: new THREE.Vector3(),
  mid: new THREE.Vector3(), q: new THREE.Quaternion(), s: new THREE.Vector3(),
  up: new THREE.Vector3(0, 1, 0),
});

/** Places a unit-height cylinder along a segment. */
function aimTube(t: Tube, m: THREE.Matrix4, tmp: Scratch) {
  tmp.a.set(...t.a);
  tmp.b.set(...t.b);
  tmp.d.subVectors(tmp.b, tmp.a);
  const len = tmp.d.length();
  tmp.mid.addVectors(tmp.a, tmp.b).multiplyScalar(0.5);
  tmp.q.setFromUnitVectors(tmp.up, tmp.d.normalize());
  tmp.s.set(1, len, 1);
  m.compose(tmp.mid, tmp.q, tmp.s);
}

function useTubeInstances(tubes: Tube[]) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const tmp = scratch();
    tubes.forEach((t, i) => {
      aimTube(t, m, tmp);
      mesh.setMatrixAt(i, m);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [tubes]);
  return ref;
}

export function Scaffold({ shadows }: { shadows: boolean }) {
  const materials = wallMaterials();
  const tubes = useMemo(() => scaffoldTubes(), []);
  const ref = useTubeInstances(tubes);

  return (
    <instancedMesh
      ref={ref}
      args={[undefined, materials.steel, tubes.length]}
      castShadow={shadows}
      receiveShadow={shadows}
    >
      <cylinderGeometry args={[TUBE_RADIUS, TUBE_RADIUS, 1, 7]} />
    </instancedMesh>
  );
}

/**
 * Speaker runs. Arm-thick military-surplus cable, originally made for
 * connecting docked ships to shore power: nothing lighter would carry the
 * current. At 50 mm a run these are a visual feature, not a detail, so they
 * are modelled rather than implied.
 */
export function Cabling({ shadows }: { shadows: boolean }) {
  const materials = wallMaterials();
  const L = useMemo(() => scaffoldLayout(), []);
  const runs = useMemo(() => {
    const out: Tube[] = [];
    const backZ = -0.75;
    for (const b of ARRAYS) {
      const s = cabinetSize(b.cabinet);
      const top = b.baseY + s.h * b.rows;
      const w = s.w * b.cols;
      // A pair of drops per block, down the back, to the deck.
      for (const sx of [-0.32, 0.32])
        out.push({
          a: [b.x + w * sx, top - 0.2, b.z + backZ],
          b: [b.x + w * sx, 0.06, b.z + backZ],
          kind: 'ledger',
        });
    }
    // Gathered into a bundle along the back of the stage.
    out.push({ a: [L.deck.minX + 2, 0.09, -1.1], b: [L.deck.maxX - 2, 0.09, -1.1], kind: 'ledger' });
    return out;
  }, [L]);

  const ref = useTubeInstances(runs);
  const r = wall.structure.cabling.runDiameter / 2;

  return (
    <group position={[0, wall.dimensions.stageDeckHeight, 0]}>
      <instancedMesh ref={ref} args={[undefined, materials.cable, runs.length]} castShadow={shadows}>
        <cylinderGeometry args={[r, r, 1, 6]} />
      </instancedMesh>
    </group>
  );
}

/**
 * Courtenay Pollock's tie-dyed fabric, hung on the structure.
 *
 * Documented, and unmistakable in the photographs: big mandalas stretched
 * across the scaffolding behind and beside the arrays. NOT over the 12s and
 * 15s, which ran bare. See docs/reconstruction-spec.md section 9.
 */
export function TieDye() {
  const materials = wallMaterials();
  const L = useMemo(() => scaffoldLayout(), []);
  const panels = useMemo(() => {
    const back = L.towerBackZ - 0.06;
    const h = FT(11);
    const w = FT(11);
    const y = L.deck.y + FT(15);
    const mid = (L.towerFrontZ + L.towerBackZ) / 2;
    const out: { pos: [number, number, number]; rot: [number, number, number]; size: [number, number] }[] = [];
    // Three across the back wall, two on the returns. Sparse on purpose: these
    // are fabric panels hung on a structure, not wallpaper.
    for (const x of [-FT(17), 0, FT(17)]) out.push({ pos: [x, y, back], rot: [0, 0, 0], size: [w, h] });
    out.push({ pos: [-L.footprint.width / 2 - 0.05, y, mid], rot: [0, Math.PI / 2, 0], size: [FT(14), h] });
    out.push({ pos: [L.footprint.width / 2 + 0.05, y, mid], rot: [0, -Math.PI / 2, 0], size: [FT(14), h] });
    return out;
  }, [L]);

  return (
    <group name="tie-dye">
      {panels.map((p, i) => (
        <mesh key={i} position={p.pos} rotation={p.rot} material={materials.tieDye}>
          <planeGeometry args={p.size} />
        </mesh>
      ))}
    </group>
  );
}

export function Stage({ shadows }: { shadows: boolean }) {
  const materials = wallMaterials();
  const slabs = useMemo(() => stageSlabs(), []);
  return (
    <group name="stage">
      {slabs.map((s, i) => (
        <mesh
          key={i}
          position={s.centre}
          castShadow={shadows}
          receiveShadow={shadows}
          material={s.kind === 'deck' ? materials.deck : materials.facing}
        >
          <boxGeometry args={s.size} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * A 1.75 m human proxy, broken into head, torso and legs.
 *
 * This started as a single capsule and read as much bigger than it was: a
 * featureless pill has no internal proportions, so the eye has nothing to
 * measure it against and defaults to "large blob". Head over torso over legs
 * carries its own scale, which is the entire point of putting a figure in.
 */
const FIGURE = {
  headR: 0.105,
  shoulderW: 0.42,
  torsoH: 0.62,
  torsoD: 0.22,
  legH: 0.88,
  legW: 0.13,
  stance: 0.17,
};

function Figure({ facing = 0, shadows }: { facing?: number; shadows: boolean }) {
  const materials = wallMaterials();
  const f = FIGURE;
  const legTop = f.legH;
  const torsoTop = legTop + f.torsoH;
  return (
    <group rotation={[0, facing, 0]}>
      {[-f.stance / 2, f.stance / 2].map((x, i) => (
        <mesh key={i} position={[x, f.legH / 2, 0]} castShadow={shadows} material={materials.figure}>
          <boxGeometry args={[f.legW, f.legH, f.legW * 1.3]} />
        </mesh>
      ))}
      <mesh position={[0, legTop + f.torsoH / 2, 0]} castShadow={shadows} material={materials.figure}>
        <boxGeometry args={[f.shoulderW, f.torsoH, f.torsoD]} />
      </mesh>
      <mesh position={[0, torsoTop + f.headR + 0.02, 0]} castShadow={shadows} material={materials.figure}>
        <sphereGeometry args={[f.headR, 12, 10]} />
      </mesh>
    </group>
  );
}

export function ScaleFigures({ shadows }: { shadows: boolean }) {
  const L = useMemo(() => scaffoldLayout(), []);
  return (
    <group position={[0, L.deck.y, 0]}>
      {wall.band.members.map((m) => (
        <group key={m.id} position={[wall.band.mirrored ? -m.x : m.x, 0, m.z]}>
          {/* Facing the audience, backs to the Wall: the whole idea of the system. */}
          <Figure facing={Math.PI} shadows={shadows} />
        </group>
      ))}
    </group>
  );
}

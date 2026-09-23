import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { wall } from '../data/wall.config';
import { scaffoldLayout, scaffoldTubes, stageSlabs, TUBE_RADIUS, type Tube } from '../geometry/scaffold';

const TUBE_COLOR: Record<Tube['kind'], string> = {
  standard: '#767c84',
  ledger: '#6d737a',
  brace: '#5f656c',
  post: '#5a6067',
};

/** One InstancedMesh for every tube in the rig. A unit cylinder, scaled and aimed. */
function Tubes({ tubes }: { tubes: Tube[] }) {
  const ref = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    const dir = new THREE.Vector3();
    const mid = new THREE.Vector3();
    const q = new THREE.Quaternion();
    const yAxis = new THREE.Vector3(0, 1, 0);
    const scale = new THREE.Vector3();
    const color = new THREE.Color();

    tubes.forEach((t, i) => {
      a.set(...t.a);
      b.set(...t.b);
      dir.subVectors(b, a);
      const len = dir.length();
      mid.addVectors(a, b).multiplyScalar(0.5);
      q.setFromUnitVectors(yAxis, dir.normalize());
      scale.set(1, len, 1);
      m.compose(mid, q, scale);
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, color.set(TUBE_COLOR[t.kind]));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [tubes]);

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, tubes.length]} castShadow>
      {/* Unit-height cylinder; instance scale sets the length. */}
      <cylinderGeometry args={[TUBE_RADIUS, TUBE_RADIUS, 1, 6]} />
      <meshStandardMaterial roughness={0.55} metalness={0.7} />
    </instancedMesh>
  );
}

export function Scaffold() {
  const tubes = useMemo(() => scaffoldTubes(), []);
  return <Tubes tubes={tubes} />;
}

export function Stage() {
  const slabs = useMemo(() => stageSlabs(), []);
  return (
    <group>
      {slabs.map((s, i) => (
        <mesh key={i} position={s.centre} castShadow receiveShadow>
          <boxGeometry args={s.size} />
          <meshStandardMaterial color={s.kind === 'deck' ? '#7b7166' : '#4a4642'} roughness={0.9} />
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
 * measure it against and defaults to "large blob". Head-over-torso-over-legs
 * carries its own scale, which is the entire point of putting a figure in a
 * grey-box.
 */
const FIGURE = {
  total: 1.75,
  headR: 0.105,
  shoulderW: 0.42,
  torsoH: 0.62,
  torsoD: 0.22,
  legH: 0.88,
  legW: 0.13,
  stance: 0.17,
};

function Figure({ facing = 0 }: { facing?: number }) {
  const f = FIGURE;
  const legTop = f.legH;
  const torsoTop = legTop + f.torsoH;
  return (
    <group rotation={[0, facing, 0]}>
      <mesh position={[-f.stance / 2, f.legH / 2, 0]} castShadow>
        <boxGeometry args={[f.legW, f.legH, f.legW * 1.3]} />
        <meshStandardMaterial color="#8d8a84" roughness={0.9} />
      </mesh>
      <mesh position={[f.stance / 2, f.legH / 2, 0]} castShadow>
        <boxGeometry args={[f.legW, f.legH, f.legW * 1.3]} />
        <meshStandardMaterial color="#8d8a84" roughness={0.9} />
      </mesh>
      <mesh position={[0, legTop + f.torsoH / 2, 0]} castShadow>
        <boxGeometry args={[f.shoulderW, f.torsoH, f.torsoD]} />
        <meshStandardMaterial color="#c9c5bd" roughness={0.85} />
      </mesh>
      <mesh position={[0, torsoTop + f.headR + 0.02, 0]} castShadow>
        <sphereGeometry args={[f.headR, 12, 10]} />
        <meshStandardMaterial color="#d8d4cd" roughness={0.8} />
      </mesh>
    </group>
  );
}

/** Figures on the deck — the only honest way to read scale in a grey-box. */
export function ScaleFigures() {
  const L = useMemo(() => scaffoldLayout(), []);
  return (
    <group position={[0, L.deck.y, 0]}>
      {wall.band.members.map((m) => {
        const x = wall.band.mirrored ? -m.x : m.x;
        return (
          <group key={m.id} position={[x, 0, m.z]}>
            {/* Facing the audience, backs to the Wall — the whole idea of the system. */}
            <Figure facing={Math.PI} />
          </group>
        );
      })}
    </group>
  );
}

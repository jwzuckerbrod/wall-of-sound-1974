import { useMemo } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { deckCables, kitRiser } from '../geometry/deckdressing';
import { MIC, scaffoldLayout, vocalMics } from '../geometry/scaffold';
import { wallMaterials } from '../materials';

/**
 * What is on the stage besides the PA.
 *
 * The instruments were removed after a QA pass: a first attempt at the Wolf,
 * the 335, the Alembic, a grand and a kit came out as generic primitive shapes
 * that cost the piece more credibility than they added. The Wall is the
 * subject; an honest empty stage reads better than bad instruments, and
 * docs/qa-findings.md records the decision.
 *
 * What stays here is the paired vocal microphones, the cables on the floor and
 * the riser at the Bowl. The road cases and the amps are in RoadGear.tsx.
 */

/**
 * The paired vocal microphones: two matched capsules sixty millimeters apart on
 * one stand, wired in reverse polarity. This is the detail that let the band
 * sing three meters in front of twenty-six kilowatts without feedback, so it is
 * worth modeling even at this size.
 */
function VocalMic() {
  const m = wallMaterials();
  return (
    <group>
      <mesh position={[0, MIC.standHeight / 2, 0]} material={m.chrome} castShadow>
        <cylinderGeometry args={[MIC.standRadius, MIC.standRadius, MIC.standHeight, 8]} />
      </mesh>
      <mesh position={[0, 0.02, 0]} material={m.caseBody}>
        <cylinderGeometry args={[MIC.baseRadius - 0.02, MIC.baseRadius, 0.04, 12]} />
      </mesh>
      {[0, MIC.spacing].map((dy, i) => (
        <mesh key={i} position={[0, MIC.capsuleY + dy, 0.02]} rotation={[Math.PI / 2, 0, 0]} material={m.caseBody}>
          <capsuleGeometry args={[MIC.capsuleRadius, MIC.capsuleLength, 3, 8]} />
        </mesh>
      ))}
    </group>
  );
}

const CABLE_RADIUS = 0.008;

/** All the floor cables as one mesh: about 400 triangles each, one draw call. */
function DeckCables() {
  const m = wallMaterials();
  const geometry = useMemo(() => {
    const L = scaffoldLayout();
    const y = L.deck.y + CABLE_RADIUS;
    const parts = deckCables(L).map((pts) => {
      const curve = new THREE.CatmullRomCurve3(pts.map(([x, z]) => new THREE.Vector3(x, y, z)));
      return new THREE.TubeGeometry(curve, 48, CABLE_RADIUS, 4, false);
    });
    return mergeGeometries(parts, false);
  }, []);
  return <mesh geometry={geometry} material={m.cable} />;
}

/**
 * The kit's riser at the Bowl: pale timber rails round an open frame, boards on
 * top. Only the rails and top show on the photograph; the posts are assumed.
 */
function KitRiser() {
  const { geometry, material } = useMemo(() => {
    const { pos, size } = kitRiser();
    const { w, d, h } = size;
    const rail = 0.14;
    const top = 0.04;
    const box = (sx: number, sy: number, sz: number, x: number, y: number, z: number) =>
      new THREE.BoxGeometry(sx, sy, sz).translate(pos[0] + x, pos[1] + y, pos[2] + z);
    const parts = [
      box(w, top, d, 0, h - top / 2, 0),
      // Rails, front and back, then the ends.
      box(w, rail, 0.05, 0, h - top - rail / 2, d / 2 - 0.025),
      box(w, rail, 0.05, 0, h - top - rail / 2, -d / 2 + 0.025),
      box(0.05, rail, d, -w / 2 + 0.025, h - top - rail / 2, 0),
      box(0.05, rail, d, w / 2 - 0.025, h - top - rail / 2, 0),
    ];
    for (const sx of [-1, 0, 1])
      for (const sz of [-1, 1]) parts.push(box(0.09, h - top, 0.09, sx * (w / 2 - 0.05), (h - top) / 2, sz * (d / 2 - 0.05)));
    return {
      geometry: mergeGeometries(parts, false),
      material: new THREE.MeshStandardMaterial({ color: '#b39b78', roughness: 0.85 }),
    };
  }, []);
  return <mesh geometry={geometry} material={material} castShadow receiveShadow />;
}

export function BandGear({ outdoor }: { outdoor: boolean }) {
  const mics = useMemo(() => vocalMics(), []);
  return (
    <group name="stage-furniture">
      {mics.map((p, i) => (
        <group key={i} position={p}>
          <VocalMic />
        </group>
      ))}
      <DeckCables />
      {outdoor && <KitRiser />}
    </group>
  );
}

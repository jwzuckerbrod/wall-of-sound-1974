import { useMemo } from 'react';
import { wall } from '../data/wall.config';
import { scaffoldLayout } from '../geometry/scaffold';
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
 * What stays here is the paired vocal microphones. The road cases and the
 * amps are in RoadGear.tsx.
 */

/**
 * The paired vocal microphones: two matched capsules sixty millimetres apart on
 * one stand, wired in reverse polarity. This is the detail that let the band
 * sing three metres in front of twenty-six kilowatts without feedback, so it is
 * worth modelling even at this size.
 */
function VocalMic() {
  const m = wallMaterials();
  return (
    <group>
      <mesh position={[0, 0.72, 0]} material={m.chrome} castShadow>
        <cylinderGeometry args={[0.016, 0.016, 1.44, 8]} />
      </mesh>
      <mesh position={[0, 0.02, 0]} material={m.caseBody}>
        <cylinderGeometry args={[0.15, 0.17, 0.04, 12]} />
      </mesh>
      {[0, 0.06].map((dy, i) => (
        <mesh key={i} position={[0, 1.46 + dy, 0.02]} rotation={[Math.PI / 2, 0, 0]} material={m.caseBody}>
          <capsuleGeometry args={[0.019, 0.05, 3, 8]} />
        </mesh>
      ))}
    </group>
  );
}

export function BandGear({ shadows }: { shadows: boolean }) {
  const L = useMemo(() => scaffoldLayout(), []);

  const mics = wall.band.members
    .filter((m) => m.id !== 'kreutz')
    .map((m) => ({ id: m.id, x: wall.band.mirrored ? -m.x : m.x, z: m.z }));

  return (
    <group name="stage-furniture" position={[0, L.deck.y, 0]}>
      {mics.map((m) => (
        <group key={m.id} position={[m.x, 0, m.z + 0.3]}>
          <VocalMic />
        </group>
      ))}
      {shadows ? null : null}
    </group>
  );
}

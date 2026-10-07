import { useMemo } from 'react';
import { MIC, vocalMics } from '../geometry/scaffold';
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

export function BandGear({ shadows }: { shadows: boolean }) {
  const mics = useMemo(() => vocalMics(), []);
  return (
    <group name="stage-furniture">
      {mics.map((p, i) => (
        <group key={i} position={p}>
          <VocalMic />
        </group>
      ))}
      {shadows ? null : null}
    </group>
  );
}

import { useMemo } from 'react';
import { FT, wall } from '../data/wall.config';
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
 * What stays is the stage furniture that is both documented and legible at
 * this scale: the paired vocal microphones, and the road cases carrying the
 * 1969 equipment stencil.
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

/**
 * A flight case with the skull and 13-point bolt stencilled on the lid.
 *
 * Owsley Stanley and Bob Thomas made that design in 1969 precisely to mark the
 * band's touring equipment, so this is its correct and only use in the scene.
 */
function RoadCase({ w, h, d }: { w: number; h: number; d: number }) {
  const m = wallMaterials();
  return (
    <group>
      <mesh position={[0, h / 2, 0]} material={m.caseBody} castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
      </mesh>
      {/* Stencil on the long face, a little proud so it never z-fights. */}
      <mesh position={[0, h * 0.52, d / 2 + 0.004]} material={m.caseStencil}>
        <planeGeometry args={[Math.min(w, h) * 0.72, Math.min(w, h) * 0.72]} />
      </mesh>
      {/* Corner caps and a pair of latches. */}
      {[-1, 1].map((sx) =>
        [-1, 1].map((sz) => (
          <mesh key={`${sx}${sz}`} position={[(sx * w) / 2, h - 0.03, (sz * d) / 2]} material={m.chrome}>
            <boxGeometry args={[0.07, 0.07, 0.07]} />
          </mesh>
        )),
      )}
    </group>
  );
}

export function BandGear({ shadows }: { shadows: boolean }) {
  const L = useMemo(() => scaffoldLayout(), []);

  const mics = wall.band.members
    .filter((m) => m.id !== 'kreutz')
    .map((m) => ({ id: m.id, x: wall.band.mirrored ? -m.x : m.x, z: m.z }));

  /** Cases stacked along the upstage edge, out of the playing area. */
  const cases = useMemo(() => {
    const backZ = L.towerFrontZ + FT(3);
    const out: { pos: [number, number, number]; size: [number, number, number]; rot: number }[] = [];
    const spots = [-22, -14, -6, 7, 15, 23];
    spots.forEach((ft, i) => {
      const big = i % 2 === 0;
      const w = big ? FT(3.6) : FT(2.6);
      const h = big ? FT(2.4) : FT(1.8);
      const d = FT(2.2);
      out.push({ pos: [FT(ft), 0, backZ + (i % 3) * 0.25], size: [w, h, d], rot: (i % 2 ? 1 : -1) * 0.12 });
      // A second case stacked on about half of them.
      if (i % 3 === 0)
        out.push({ pos: [FT(ft) + 0.12, h, backZ + (i % 3) * 0.25], size: [w * 0.8, FT(1.4), d * 0.9], rot: 0.05 });
    });
    return out;
  }, [L]);

  return (
    <group name="stage-furniture" position={[0, L.deck.y, 0]}>
      {mics.map((m) => (
        <group key={m.id} position={[m.x, 0, m.z + 0.3]}>
          <VocalMic />
        </group>
      ))}
      {cases.map((c, i) => (
        <group key={i} position={c.pos} rotation={[0, c.rot, 0]}>
          <RoadCase w={c.size[0]} h={c.size[1]} d={c.size[2]} />
        </group>
      ))}
      {shadows ? null : null}
    </group>
  );
}

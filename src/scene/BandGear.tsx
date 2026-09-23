import { useMemo } from 'react';
import * as THREE from 'three';
import { IN, wall } from '../data/wall.config';
import { scaffoldLayout } from '../geometry/scaffold';
import { wallMaterials } from '../materials';

/**
 * The band's instruments, at true size.
 *
 * These are honest silhouettes, not replicas. The outlines and dimensions are
 * right — a Grateful Dead stage in 1974 had a 6' 11" grand, a 22-inch kick, a
 * solid-body with a 25.5-inch scale — but nobody should mistake these for
 * models of the actual instruments. At the distances this page is looked at,
 * the silhouette and the scale are what carry, and inventing detail we do not
 * have would be worse than leaving it out.
 *
 * What is 1974-correct, per docs/reconstruction-spec.md section 11:
 *   Garcia   "Wolf", the Doug Irwin custom, in use from late 1973
 *   Weir     Gibson ES-335
 *   Lesh     Alembic quadraphonic bass
 *   Godchaux grand piano with five Countryman pickups, one per frame division
 *   Kreutzmann  drum kit, centre, upstage
 */

/** Outline of a solid-body electric, in metres, origin at the body centre. */
function bodyShape(width: number, length: number): THREE.Shape {
  const w = width / 2;
  const l = length / 2;
  const s = new THREE.Shape();
  // Lower bout, waist, upper bout, drawn as one closed curve.
  s.moveTo(0, -l);
  s.bezierCurveTo(w * 1.05, -l, w * 1.15, -l * 0.25, w * 0.42, l * 0.05);
  s.bezierCurveTo(w * 1.0, l * 0.45, w * 0.75, l, 0, l * 0.82);
  s.bezierCurveTo(-w * 0.75, l, -w * 1.0, l * 0.45, -w * 0.42, l * 0.05);
  s.bezierCurveTo(-w * 1.15, -l * 0.25, -w * 1.05, -l, 0, -l);
  return s;
}

function Guitar({
  scale = 1,
  bodyColor = 'light',
  /** Overall length, nut to strap button. Bass guitars are longer. */
  length = 1.0,
}: {
  scale?: number;
  bodyColor?: 'light' | 'dark' | 'black';
  length?: number;
}) {
  const m = wallMaterials();
  const body = useMemo(() => {
    const g = new THREE.ExtrudeGeometry(bodyShape(0.33, 0.46), {
      depth: 0.045,
      bevelEnabled: true,
      bevelThickness: 0.008,
      bevelSize: 0.008,
      bevelSegments: 2,
      curveSegments: 10,
    });
    g.center();
    return g;
  }, []);

  const wood = bodyColor === 'dark' ? m.instrumentDark : bodyColor === 'black' ? m.instrumentBlack : m.instrumentLight;
  const neckLength = length * 0.62;

  return (
    <group scale={scale}>
      <mesh geometry={body} material={wood} castShadow />
      {/* Neck and fretboard, running up from the body. */}
      <mesh position={[0, 0.23 + neckLength / 2, 0.004]} material={wood} castShadow>
        <boxGeometry args={[0.058, neckLength, 0.022]} />
      </mesh>
      <mesh position={[0, 0.23 + neckLength / 2, 0.017]} material={m.fretboard}>
        <boxGeometry args={[0.056, neckLength, 0.007]} />
      </mesh>
      {/* Headstock, kicked back a few degrees like a real one. */}
      <mesh position={[0, 0.23 + neckLength + 0.07, -0.004]} rotation={[0.22, 0, 0]} material={wood} castShadow>
        <boxGeometry args={[0.072, 0.16, 0.014]} />
      </mesh>
      {/* Pickups and bridge. */}
      <mesh position={[0, 0.02, 0.026]} material={m.chrome}>
        <boxGeometry args={[0.09, 0.02, 0.012]} />
      </mesh>
      <mesh position={[0, -0.09, 0.026]} material={m.chrome}>
        <boxGeometry args={[0.09, 0.02, 0.012]} />
      </mesh>
      <mesh position={[0, -0.17, 0.026]} material={m.chrome}>
        <boxGeometry args={[0.075, 0.03, 0.014]} />
      </mesh>
    </group>
  );
}

/** A grand, roughly a Steinway B at 6' 11" long. */
function GrandPiano() {
  const m = wallMaterials();
  const LENGTH = 2.11;
  const WIDTH = 1.48;
  const HEIGHT = 1.0;

  const plan = useMemo(() => {
    const w = WIDTH / 2;
    const s = new THREE.Shape();
    s.moveTo(-w, 0);
    s.lineTo(w, 0);
    s.lineTo(w, LENGTH * 0.42);
    // The bent side: long curve down the treble flank.
    s.bezierCurveTo(w, LENGTH * 0.82, w * 0.55, LENGTH, -w * 0.1, LENGTH);
    s.lineTo(-w, LENGTH * 0.86);
    s.lineTo(-w, 0);
    return s;
  }, []);

  const caseGeometry = useMemo(() => {
    const g = new THREE.ExtrudeGeometry(plan, { depth: 0.26, bevelEnabled: false, curveSegments: 14 });
    g.rotateX(-Math.PI / 2);
    return g;
  }, [plan]);

  const lidGeometry = useMemo(() => {
    const g = new THREE.ExtrudeGeometry(plan, { depth: 0.022, bevelEnabled: false, curveSegments: 14 });
    g.rotateX(-Math.PI / 2);
    return g;
  }, [plan]);

  return (
    <group>
      <mesh geometry={caseGeometry} position={[0, HEIGHT - 0.26, 0]} material={m.instrumentBlack} castShadow receiveShadow />
      {/* Lid, propped open on the long stick — the shape everyone recognises. */}
      <group position={[-WIDTH / 2, HEIGHT, 0]} rotation={[0, 0, 0.62]}>
        <mesh geometry={lidGeometry} position={[WIDTH / 2, 0, 0]} material={m.instrumentBlack} castShadow />
      </group>
      {/* Keyboard end. */}
      <mesh position={[0, HEIGHT - 0.3, -0.11]} material={m.instrumentBlack} castShadow>
        <boxGeometry args={[WIDTH * 0.92, 0.1, 0.22]} />
      </mesh>
      <mesh position={[0, HEIGHT - 0.26, -0.12]} material={m.drumHead}>
        <boxGeometry args={[WIDTH * 0.78, 0.02, 0.16]} />
      </mesh>
      {/* Three legs and the pedal lyre. */}
      {[
        [-WIDTH / 2 + 0.16, 0.06],
        [WIDTH / 2 - 0.16, 0.06],
        [WIDTH / 2 - 0.3, LENGTH - 0.28],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, (HEIGHT - 0.26) / 2, z]} material={m.instrumentBlack} castShadow>
          <boxGeometry args={[0.09, HEIGHT - 0.26, 0.09]} />
        </mesh>
      ))}
      <mesh position={[0, 0.12, 0.34]} material={m.chrome}>
        <boxGeometry args={[0.2, 0.03, 0.06]} />
      </mesh>
    </group>
  );
}

const drum = (diameterIn: number, depthIn: number) =>
  ({ r: IN(diameterIn) / 2, d: IN(depthIn) }) as const;

function DrumKit() {
  const m = wallMaterials();
  const kick = drum(24, 14);
  const rack1 = drum(12, 9);
  const rack2 = drum(13, 10);
  const floor = drum(16, 16);
  const snare = drum(14, 5.5);

  const Shell = ({
    spec,
    position,
    rotation,
  }: {
    spec: { r: number; d: number };
    position: [number, number, number];
    rotation?: [number, number, number];
  }) => (
    <group position={position} rotation={rotation}>
      <mesh material={m.drumShell} castShadow>
        <cylinderGeometry args={[spec.r, spec.r, spec.d, 20, 1, true]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[0, (spec.d / 2) * s, 0]} rotation={[s > 0 ? 0 : Math.PI, 0, 0]} material={m.drumHead}>
          <circleGeometry args={[spec.r, 20]} />
        </mesh>
      ))}
    </group>
  );

  const Cymbal = ({ position, radius }: { position: [number, number, number]; radius: number }) => (
    <group position={position}>
      <mesh rotation={[0.18, 0, 0]} material={m.cymbal} castShadow>
        <cylinderGeometry args={[radius, radius, 0.004, 24]} />
      </mesh>
      <mesh position={[0, -position[1] / 2, 0]} material={m.chrome}>
        <cylinderGeometry args={[0.012, 0.012, position[1], 8]} />
      </mesh>
    </group>
  );

  return (
    <group>
      {/* Kick on the floor, lying on its side. */}
      <Shell spec={kick} position={[0, kick.r, 0]} rotation={[Math.PI / 2, 0, 0]} />
      <Shell spec={rack1} position={[-0.22, 0.92, -0.16]} rotation={[0.26, 0, 0]} />
      <Shell spec={rack2} position={[0.2, 0.94, -0.18]} rotation={[0.26, 0, 0]} />
      <Shell spec={floor} position={[0.62, floor.r + 0.16, 0.12]} />
      <Shell spec={snare} position={[-0.46, 0.66, 0.18]} rotation={[0.1, 0, 0]} />
      <Cymbal position={[-0.82, 1.42, -0.1]} radius={IN(18) / 2} />
      <Cymbal position={[0.86, 1.3, -0.24]} radius={IN(20) / 2} />
      <Cymbal position={[-0.7, 0.8, 0.3]} radius={IN(14) / 2} />
    </group>
  );
}

/**
 * The paired vocal microphones: two capsules 60 mm apart on one stand, wired in
 * reverse polarity. The detail that let the band sing in front of 26 kilowatts.
 */
function VocalMic() {
  const m = wallMaterials();
  return (
    <group>
      <mesh position={[0, 0.72, 0]} material={m.chrome}>
        <cylinderGeometry args={[0.016, 0.016, 1.44, 8]} />
      </mesh>
      <mesh position={[0, 0.02, 0]} material={m.instrumentBlack}>
        <cylinderGeometry args={[0.15, 0.17, 0.04, 12]} />
      </mesh>
      {[0, 0.06].map((dy, i) => (
        <mesh key={i} position={[0, 1.46 + dy, 0.02]} rotation={[Math.PI / 2, 0, 0]} material={m.instrumentBlack}>
          <capsuleGeometry args={[0.019, 0.05, 3, 8]} />
        </mesh>
      ))}
    </group>
  );
}

export function BandGear({ shadows }: { shadows: boolean }) {
  const L = useMemo(() => scaffoldLayout(), []);
  const members = wall.band.members;
  const at = (id: string) => {
    const mm = members.find((x) => x.id === id)!;
    return { x: wall.band.mirrored ? -mm.x : mm.x, z: mm.z };
  };

  const garcia = at('garcia');
  const weir = at('weir');
  const lesh = at('lesh');
  const keith = at('keith');
  const kreutz = at('kreutz');

  // Held across the body, angled the way a strap hangs.
  const heldGuitar = (pos: { x: number; z: number }, kind: 'light' | 'dark', length: number) => (
    <group position={[pos.x, 1.02, pos.z + 0.2]} rotation={[0.12, Math.PI, -0.38]}>
      <Guitar bodyColor={kind} length={length} />
    </group>
  );

  return (
    <group name="band-gear" position={[0, L.deck.y, 0]}>
      {/* Garcia: "Wolf", the Doug Irwin custom. Natural hardwood. */}
      {heldGuitar(garcia, 'light', 1.0)}
      <group position={[garcia.x - 0.35, 0, garcia.z + 0.35]}>
        <VocalMic />
      </group>

      {/* Weir: Gibson ES-335, cherry. */}
      {heldGuitar(weir, 'dark', 1.0)}
      <group position={[weir.x - 0.35, 0, weir.z + 0.35]}>
        <VocalMic />
      </group>

      {/* Lesh: the Alembic quadraphonic bass. Longer scale. */}
      {heldGuitar(lesh, 'light', 1.18)}
      <group position={[lesh.x - 0.35, 0, lesh.z + 0.35]}>
        <VocalMic />
      </group>

      {/* Godchaux: grand piano, turned so the keyboard faces stage centre. */}
      <group position={[keith.x + 0.9, 0, keith.z - 0.6]} rotation={[0, -Math.PI / 2.4, 0]}>
        <GrandPiano />
      </group>

      {/* Kreutzmann: kit, centre and upstage, facing the audience. */}
      <group position={[kreutz.x, 0, kreutz.z - 0.3]} rotation={[0, Math.PI, 0]}>
        <DrumKit />
      </group>

      {shadows ? null : null}
    </group>
  );
}

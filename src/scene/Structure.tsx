import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { ARRAYS, cabinetSize, wall } from '../data/wall.config';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  scaffoldFloors,
  scaffoldLayout,
  scaffoldTubes,
  stageSlabs,
  TUBE_RADIUS,
  type Tube,
  lightRig,
  tieDyePanels,
} from '../geometry/scaffold';
import { wallMaterials } from '../materials';
import { tieDyeTexture } from '../materials/textures';

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
/**
 * The stage-lighting bars on the upper corners (structure.lightBars): pipes,
 * and on each lamp a clamp, a yoke and a black can aimed down at the band,
 * built as blender/build_scene.py build_light_rig() builds them. Unlit
 * hardware. Outdoors the ladders are gone: the tie-dyes hang there.
 */
const LAMP = {
  body: new THREE.MeshStandardMaterial({ color: '#121212', roughness: 0.5, metalness: 0.3 }),
  lens: new THREE.MeshStandardMaterial({ color: '#2b2a27', roughness: 0.08 }),
  frame: new THREE.MeshStandardMaterial({ color: '#1b1b1d', roughness: 0.45, metalness: 0.6 }),
};

function lampGeometries() {
  const { lampDiameter, lampLength: L } = wall.structure.lightBars;
  const r = lampDiameter / 2;
  // The can along -Z (the aim) from its pivot at the origin: wide at the front.
  const body = new THREE.CylinderGeometry(r * 0.92, r, L, 20).rotateX(Math.PI / 2).translate(0, 0, -L / 2 + 0.06);
  const lip = new THREE.CylinderGeometry(r * 1.08, r * 1.08, 0.03, 20, 1, true).rotateX(Math.PI / 2).translate(0, 0, -L + 0.07);
  const can = mergeGeometries([body.toNonIndexed(), lip.toNonIndexed()], false)!;
  const lens = new THREE.CircleGeometry(r * 0.8, 20).rotateY(Math.PI).translate(0, 0, -L + 0.075);
  // The yoke's arms either side of the can, turning with it.
  const arms = mergeGeometries([-1, 1].map((sx) => new THREE.BoxGeometry(0.012, 0.04, 0.2).translate(sx * (r + 0.015), 0, 0.03)), false)!;
  // The bar above and the pipe clamp: these only turn about the vertical.
  const yoke = mergeGeometries(
    [new THREE.BoxGeometry(2 * r + 0.05, 0.014, 0.04).translate(0, 0.13, 0), new THREE.BoxGeometry(0.05, 0.06, 0.06).translate(0, 0.18, 0)],
    false,
  )!;
  return { can, lens, arms, yoke };
}

export function LightBars({ shadows, outdoor }: { shadows: boolean; outdoor: boolean }) {
  const materials = wallMaterials();
  const rig = useMemo(() => {
    const r = lightRig();
    const keep = <T extends { indoor: boolean }>(x: T) => !outdoor || !x.indoor;
    return { pipes: r.pipes.filter(keep), lamps: r.lamps.filter(keep) };
  }, [outdoor]);
  const geo = useMemo(lampGeometries, []);
  const pipeRef = useTubeInstances(rig.pipes);
  const refs = { can: useRef<THREE.InstancedMesh>(null), lens: useRef<THREE.InstancedMesh>(null), arms: useRef<THREE.InstancedMesh>(null), yoke: useRef<THREE.InstancedMesh>(null) };
  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const y = new THREE.Matrix4();
    const up = new THREE.Vector3(0, 1, 0);
    const at = new THREE.Vector3();
    const aim = new THREE.Vector3();
    rig.lamps.forEach((l, i) => {
      at.set(...l.at);
      aim.set(...l.aim);
      // -Z toward the aim, the can's top kept up, as Blender's track-to does.
      m.lookAt(at, aim, up).setPosition(at);
      const d = aim.clone().sub(at);
      y.makeRotationY(Math.atan2(d.x, d.z)).setPosition(at);
      for (const k of ['can', 'lens', 'arms'] as const) refs[k].current?.setMatrixAt(i, m);
      refs.yoke.current?.setMatrixAt(i, y);
    });
    for (const ref of Object.values(refs)) {
      const mesh = ref.current;
      if (!mesh) continue;
      mesh.count = rig.lamps.length;
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rig]);
  const n = rig.lamps.length;
  return (
    <group name="light-bars">
      <instancedMesh key={`pipes-${rig.pipes.length}`} ref={pipeRef} args={[undefined, materials.steel, rig.pipes.length]} castShadow={shadows}>
        <cylinderGeometry args={[0.024, 0.024, 1, 7]} />
      </instancedMesh>
      <instancedMesh key={`can-${n}`} ref={refs.can} args={[geo.can, LAMP.body, n]} castShadow={shadows} />
      <instancedMesh key={`lens-${n}`} ref={refs.lens} args={[geo.lens, LAMP.lens, n]} />
      <instancedMesh key={`arms-${n}`} ref={refs.arms} args={[geo.arms, LAMP.frame, n]} castShadow={shadows} />
      <instancedMesh key={`yoke-${n}`} ref={refs.yoke} args={[geo.yoke, LAMP.frame, n]} castShadow={shadows} />
    </group>
  );
}

/**
 * Courtenay Pollock's tie-dyes (structure.tieDyes), outdoors only: cloth hung
 * from its top edge, with gentle vertical folds and a slight sway, as
 * blender/venue.py cloth_panel() hangs it.
 */
function clothGeometry(width: number, height: number, seed: number) {
  const g = new THREE.PlaneGeometry(width, height, 24, 40);
  const pos = g.getAttribute('position');
  const h = (i: number) => {
    const n = Math.sin((seed + i) * 127.1) * 43758.5453;
    return n - Math.floor(n);
  };
  for (let i = 0; i < pos.count; i++) {
    const a = pos.getX(i) / width + 0.5;
    const t = 0.5 - pos.getY(i) / height; // 0 at the top, 1 at the hem
    let fold = 0.035 * Math.sin(2 * Math.PI * a * 3 + h(0) * 6) * (0.2 + t);
    fold += 0.012 * Math.sin(2 * Math.PI * a * 9 + h(1) * 6) * t;
    const sway = 0.05 * t * t * (h(2) - 0.5);
    pos.setZ(i, fold + sway);
  }
  g.translate(0, -height / 2, 0);
  g.computeVertexNormals();
  return g;
}

export function TieDye() {
  const panels = useMemo(
    () =>
      tieDyePanels().map((p, k) => ({
        ...p,
        geometry: clothGeometry(p.width, p.height, 31 + k),
        material: new THREE.MeshStandardMaterial({
          map: tieDyeTexture(k, wall.structure.tieDyes.palettes[p.palette], p.width / p.height),
          roughness: 0.85,
          side: THREE.DoubleSide,
        }),
      })),
    [],
  );
  return (
    <group name="tie-dye">
      {panels.map((p, i) => (
        <mesh key={i} position={p.top} geometry={p.geometry} material={p.material} castShadow receiveShadow />
      ))}
    </group>
  );
}

/** The plank floors the raised stacks actually stand on. */
export function ScaffoldFloors({ shadows }: { shadows: boolean }) {
  const materials = wallMaterials();
  const floors = useMemo(() => scaffoldFloors(), []);
  return (
    <group name="scaffold-floors">
      {floors.map((s, i) => (
        <mesh key={i} position={s.centre} castShadow={shadows} receiveShadow={shadows} material={materials.deck}>
          <boxGeometry args={s.size} />
        </mesh>
      ))}
    </group>
  );
}

export function Stage({ shadows, outdoor }: { shadows: boolean; outdoor: boolean }) {
  const materials = wallMaterials();
  // In full sun the floor is pale, weathered board on the Bowl's band photograph,
  // not the brown it is under stage light. The grain map is dark, so white here.
  const deck = useMemo(() => {
    if (!outdoor) return materials.deck;
    const m = materials.deck.clone();
    m.color.set('#ffffff');
    return m;
  }, [outdoor, materials.deck]);
  const slabs = useMemo(() => stageSlabs(), []);
  return (
    <group name="stage">
      {slabs.map((s, i) => (
        <mesh
          key={i}
          position={s.centre}
          castShadow={shadows}
          receiveShadow={shadows}
          material={s.kind === 'deck' ? deck : materials.facing}
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

import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { wall } from '../data/wall.config';
import { GearBuilder, anvil, mc2300, zeroCase, type GearRole } from '../geometry/cases';
import { roadGearPlan, type Decal } from '../geometry/roadgear';
import { decalAtlas, decalSize, mc2300Panel, type Marks } from '../materials/gearTextures';

/**
 * The road gear on the deck: forty-eight MC 2300s in their Anvil rack cases,
 * the loose cases and the amps' empty ZERO cases, and every label, name,
 * sticker and strip of tape on them. All of it from one plan
 * (src/geometry/roadgear.ts) that Blender builds from too.
 *
 * Static, so it is merged: one mesh per material, plus one for every decal
 * on the deck, drawn from a single atlas.
 */

const C = wall.structure.roadCases;
const A = wall.structure.amps;

/** A face to put decals on: its origin, and its right, up and outward directions. */
interface Face {
  o: THREE.Vector3;
  r: THREE.Vector3;
  u: THREE.Vector3;
  n: THREE.Vector3;
  decals: Decal[];
}

const UP = new THREE.Vector3(0, 1, 0);

/** The face looking out along `n` (horizontal): right is the viewer's right. */
function face(o: THREE.Vector3, n: THREE.Vector3, decals: Decal[]): Face {
  const r = new THREE.Vector3().crossVectors(n.clone().negate(), UP);
  return { o, r, u: UP.clone(), n, decals };
}

function useMarks(): Marks | null {
  const [marks, setMarks] = useState<Marks | null>(null);
  useEffect(() => {
    // The skull trace is 267 KB of outline: fetched after the scene is up.
    let live = true;
    Promise.all([import('../../blender/marks/steal_your_face.json'), import('../../blender/marks/grateful_dead_stencil.json')]).then(
      ([syf, word]) => live && setMarks({ skull: syf.layers as Marks['skull'], word: word.layers.paint as Marks['word'] }),
    );
    return () => {
      live = false;
    };
  }, []);
  return marks;
}

function buildGear() {
  const plan = roadGearPlan();
  const B = new GearBuilder();
  const faces: Face[] = [];
  const m = new THREE.Matrix4();

  for (const r of plan.racks) {
    const [rw, , rd] = r.size;
    const [fx, deck, fz] = r.front;
    // The amps' fronts on the plan's front plane; the case behind them.
    const cz = fz + C.rackSetback - rd / 2;
    anvil(B, m.clone().makeTranslation(fx, deck, cz), rw, r.size[1], rd, r.style, true);
    for (const a of r.amps) {
      // Origin at the panel's front face, 6 mm proud of the amp's front plane.
      const o = new THREE.Vector3(fx, deck + a.y, fz + 0.006);
      mc2300(B, m.clone().makeTranslation(o.x, o.y, o.z));
      if (a.decals.length) faces.push(face(o.clone(), new THREE.Vector3(0, 0, 1), a.decals));
    }
    for (const e of r.ends) {
      if (!e.decals.length) continue;
      faces.push(face(new THREE.Vector3(fx + e.side * (rw / 2), deck, cz), new THREE.Vector3(e.side, 0, 0), e.decals));
    }
  }

  const Z = C.zeroSize;
  for (const z of plan.zeros) {
    const base = new THREE.Matrix4().compose(new THREE.Vector3(...z.pos), new THREE.Quaternion().setFromAxisAngle(UP, z.rot), new THREE.Vector3(1, 1, 1));
    zeroCase(B, base, z.colour);
    if (z.decals.length) {
      const n = new THREE.Vector3(Math.sin(z.rot), 0, Math.cos(z.rot));
      faces.push(face(new THREE.Vector3(...z.pos).addScaledVector(n, Z.d / 2), n, z.decals));
    }
  }

  for (const c of plan.cases) {
    const [w, h, d] = c.size;
    const base = new THREE.Matrix4().compose(new THREE.Vector3(...c.pos), new THREE.Quaternion().setFromAxisAngle(UP, c.rot), new THREE.Vector3(1, 1, 1));
    anvil(B, base, w, h, d, c.style);
    const n = new THREE.Vector3(Math.sin(c.rot), 0, Math.cos(c.rot));
    faces.push(face(new THREE.Vector3(...c.pos).addScaledVector(n, d / 2), n, c.front));
  }

  return { parts: B.merged(), faces };
}

/** One quad per decal, laid on its face, stepping outward so later marks sit on earlier ones. */
function decalGeometry(faces: Face[], marks: Marks) {
  const all = faces.flatMap((f) => f.decals);
  const { texture, cells } = decalAtlas(all, marks);
  const pos: number[] = [];
  const uv: number[] = [];
  const nrm: number[] = [];
  let k = 0;
  const p = new THREE.Vector3();
  for (const f of faces)
    f.decals.forEach((d, i) => {
      const [w, h] = decalSize(d, marks);
      const a = d.kind === 'tape' ? d.angle : 0;
      const r = f.r.clone().multiplyScalar(Math.cos(a)).addScaledVector(f.u, Math.sin(a));
      const u = f.u.clone().multiplyScalar(Math.cos(a)).addScaledVector(f.r, -Math.sin(a));
      const c = f.o.clone().addScaledVector(f.r, d.at[0]).addScaledVector(f.u, d.at[1]).addScaledVector(f.n, 0.0015 + 0.0004 * i);
      const [u0, v0, u1, v1] = cells[k++].uv;
      const corner = (sx: number, sy: number) => {
        p.copy(c).addScaledVector(r, (sx * w) / 2).addScaledVector(u, (sy * h) / 2);
        pos.push(p.x, p.y, p.z);
        nrm.push(f.n.x, f.n.y, f.n.z);
        uv.push(sx < 0 ? u0 : u1, sy < 0 ? v0 : v1);
      };
      for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, -1], [1, 1], [-1, 1]]) corner(sx, sy);
    });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  return { geometry: g, texture };
}

function gearMaterials(): Record<GearRole, THREE.Material> {
  const panel = mc2300Panel();
  const std = (color: string, roughness: number, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
  return {
    // The case colors are per vertex, as photographed; the material's color
    // only sets how much light they return (render.explorerLook.caseLight).
    paint: new THREE.MeshStandardMaterial({
      vertexColors: true,
      color: new THREE.Color().setScalar(wall.render.explorerLook.caseLight),
      roughness: 0.62,
      metalness: 0.05,
    }),
    alu: std('#a6aaad', 0.4, 0.85),
    steel: std('#7c7e80', 0.5, 0.7),
    rubber: std('#161515', 0.85),
    dark: std('#0a0909', 0.7),
    rust: std('#6e4127', 0.85, 0.3),
    interior: std('#1c1814', 0.9),
    black: std('#0b0b0b', 0.5, 0.3),
    // The panel's gold, print and meters are its texture; the meters glow.
    gold: new THREE.MeshStandardMaterial({
      map: panel.map,
      emissiveMap: panel.emissive,
      emissive: new THREE.Color(A.meterColor),
      emissiveIntensity: A.meterEmissiveIntensity,
      roughness: 0.42,
      metalness: 0.55,
    }),
    knob: std('#c4c6c8', 0.35, 0.9),
    red: std('#b81c18', 0.3),
  };
}

export function RoadGear({ shadows }: { shadows: boolean }) {
  const gear = useMemo(buildGear, []);
  const materials = useMemo(gearMaterials, []);
  const marks = useMarks();
  const decals = useMemo(() => (marks ? decalGeometry(gear.faces, marks) : null), [gear, marks]);
  const decalMaterial = useMemo(
    () =>
      decals &&
      new THREE.MeshStandardMaterial({
        map: decals.texture,
        alphaTest: 0.5,
        roughness: 0.7,
        polygonOffset: true,
        polygonOffsetFactor: -2,
      }),
    [decals],
  );

  useEffect(
    () => () => {
      for (const g of Object.values(gear.parts)) g?.dispose();
      for (const m of Object.values(materials)) m.dispose();
    },
    [gear, materials],
  );

  return (
    <group name="road-gear">
      {(Object.entries(gear.parts) as [GearRole, THREE.BufferGeometry][]).map(([role, g]) => (
        <mesh key={role} geometry={g} material={materials[role]} castShadow={shadows} receiveShadow={shadows} />
      ))}
      {decals && decalMaterial && <mesh geometry={decals.geometry} material={decalMaterial} receiveShadow={shadows} />}
    </group>
  );
}

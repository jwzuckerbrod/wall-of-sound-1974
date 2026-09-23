import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { IN, wall } from '../data/wall.config';
import { scaffoldLayout } from '../geometry/scaffold';
import { wallMaterials } from '../materials';

/**
 * Forty-eight McIntosh MC-2300s, racked at deck level behind the arrays.
 *
 * Black glass front, gold lettering, and two blue illuminated meters each —
 * which is the detail everyone who saw the Wall in the dark remembers, and the
 * only thing in the scene the bloom pass is really for.
 *
 * Exact distribution of the 48 across the rig is not documented; photographs
 * put them at the base of the wall. See PROVENANCE['structure.ampPlacement'].
 */
const AMP = wall.structure.amps.size;
const RACK_GAP = IN(0.75);

function ampGeometries() {
  const body = new THREE.BoxGeometry(AMP.w, AMP.h, AMP.d);
  body.translate(0, 0, -AMP.d / 2);

  // Front panel, proud of the chassis.
  const glass = new THREE.BoxGeometry(AMP.w * 1.02, AMP.h * 0.96, IN(0.4));
  glass.translate(0, 0, IN(0.2));

  // Two meters, side by side, upper half of the panel.
  const meters: THREE.BufferGeometry[] = [];
  for (const sx of [-1, 1]) {
    const m = new THREE.BoxGeometry(AMP.w * 0.3, AMP.h * 0.42, IN(0.12));
    m.translate(sx * AMP.w * 0.19, AMP.h * 0.15, IN(0.44));
    meters.push(m);
  }

  // Four knobs along the bottom.
  const knobs: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 4; i++) {
    const k = new THREE.CylinderGeometry(IN(0.42), IN(0.42), IN(0.5), 8);
    k.rotateX(Math.PI / 2);
    k.translate((i - 1.5) * AMP.w * 0.16, -AMP.h * 0.3, IN(0.5));
    knobs.push(k);
  }

  return {
    body: mergeGeometries([body, ...knobs], false)!,
    glass,
    meter: mergeGeometries(meters, false)!,
  };
}

export function Amps({ shadows }: { shadows: boolean }) {
  const materials = wallMaterials();
  const geo = useMemo(ampGeometries, []);

  const transforms = useMemo(() => {
    const L = scaffoldLayout();
    const { rackCount, perRack, z } = wall.structure.amps;
    const out: THREE.Matrix4[] = [];
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const one = new THREE.Vector3(1, 1, 1);
    const pos = new THREE.Vector3();

    // Racks spread evenly across the width of the tower, on the deck.
    const span = L.footprint.width * 0.82;
    for (let r = 0; r < rackCount; r++) {
      const x = -span / 2 + (span / (rackCount - 1)) * r;
      for (let a = 0; a < perRack; a++) {
        const y = L.deck.y + IN(3) + (AMP.h + RACK_GAP) * (a + 0.5);
        pos.set(x, y, z);
        m.compose(pos, q, one);
        out.push(m.clone());
      }
    }
    return out;
  }, []);

  const refs = {
    body: useRef<THREE.InstancedMesh>(null),
    glass: useRef<THREE.InstancedMesh>(null),
    meter: useRef<THREE.InstancedMesh>(null),
  };

  useLayoutEffect(() => {
    for (const ref of Object.values(refs)) {
      const mesh = ref.current;
      if (!mesh) continue;
      transforms.forEach((t, i) => mesh.setMatrixAt(i, t));
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    }
  }, [transforms, refs.body, refs.glass, refs.meter]);

  const count = transforms.length;
  return (
    <group name="amps">
      <instancedMesh ref={refs.body} args={[geo.body, materials.ampBody, count]} castShadow={shadows} receiveShadow={shadows} />
      <instancedMesh ref={refs.glass} args={[geo.glass, materials.ampGlass, count]} />
      <instancedMesh ref={refs.meter} args={[geo.meter, materials.ampMeter, count]} />
    </group>
  );
}

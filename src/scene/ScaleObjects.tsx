import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { wall } from '../data/wall.config';
import { busRow, planePlace } from '../geometry/scale';
import { bowlFrame } from '../geometry/bowl';
import { gltfLoader } from './Instruments';
import type { Venue } from './Scene';

/**
 * Something of known size beside the Wall, one at a time: four 1974 Volkswagen
 * buses along the stage front, or a Boeing 737-200 beside it (indoors only: at
 * the Bowl the shell and the hill are in its way). For comparing sizes, not part
 * of the stage, and off by default. Each model is fetched only when asked for.
 * See PROVENANCE['scale.vwBus'] and ['scale.b737'].
 */
export type CompareId = 'bus' | 'b737' | null;

const cache = new Map<string, Promise<THREE.Group>>();
const load = (name: string) => {
  let p = cache.get(name);
  if (!p) {
    p = gltfLoader()
      .loadAsync(`${import.meta.env.BASE_URL}models/${name}.glb`)
      .then((g) => g.scene);
    cache.set(name, p);
  }
  return p;
};

function useModel(name: string) {
  const [model, setModel] = useState<THREE.Group | null>(null);
  useEffect(() => {
    let live = true;
    load(name)
      .then((g) => live && setModel(g))
      .catch((e) => console.warn(`${name}:`, e));
    return () => {
      live = false;
    };
  }, [name]);
  return model;
}

function Buses({ venue, shadows }: { venue: Venue; shadows: boolean }) {
  const model = useModel('vwbus');
  const buses = useMemo(() => {
    if (!model) return [];
    const ground = wall.venues[venue].outdoor ? bowlFrame().floor : 0;
    return busRow(ground).map((b) => {
      const o = model.clone(true);
      o.traverse((n) => {
        const mesh = n as THREE.Mesh;
        if (!mesh.isMesh) return;
        mesh.castShadow = shadows;
        mesh.receiveShadow = shadows;
        const m = mesh.material as THREE.MeshStandardMaterial;
        if (m.name === 'paint') {
          const paint = m.clone();
          paint.color.set(b.colour);
          mesh.material = paint;
        }
      });
      o.position.set(...b.pos);
      return o;
    });
  }, [model, venue, shadows]);
  return (
    <>
      {buses.map((o, i) => (
        <primitive key={i} object={o} />
      ))}
    </>
  );
}

function Plane({ shadows }: { shadows: boolean }) {
  const model = useModel('b737');
  const placed = useMemo(() => {
    if (!model) return null;
    const o = model.clone(true);
    const p = planePlace();
    o.traverse((n) => {
      const mesh = n as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = shadows;
        mesh.receiveShadow = shadows;
      }
    });
    o.position.set(...p.pos);
    o.rotation.y = p.turn;
    return o;
  }, [model, shadows]);
  return placed && <primitive object={placed} />;
}

export function ScaleObjects({ compare, venue, shadows }: { compare: CompareId; venue: Venue; shadows: boolean }) {
  return (
    <group name="scale-objects">
      {compare === 'bus' && <Buses venue={venue} shadows={shadows} />}
      {compare === 'b737' && !wall.venues[venue].outdoor && <Plane shadows={shadows} />}
    </group>
  );
}

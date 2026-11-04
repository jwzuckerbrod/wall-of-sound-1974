import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { wall } from '../data/wall.config';
import { busRow } from '../geometry/scale';
import { bowlFrame } from '../geometry/bowl';
import { gltfLoader } from './Instruments';
import type { Venue } from './Scene';

/**
 * Four 1974 Volkswagen buses, end to end along the stage front, as long as the
 * run of speakers above them. For comparing sizes, not part of the stage, and
 * off by default. Fetched only when asked for. See PROVENANCE['scale.vwBus'].
 */
let bus: Promise<THREE.Group> | null = null;
const loadBus = () =>
  (bus ??= gltfLoader()
    .loadAsync(`${import.meta.env.BASE_URL}models/vwbus.glb`)
    .then((g) => g.scene));

export function ScaleObjects({ venue, shadows }: { venue: Venue; shadows: boolean }) {
  const [model, setModel] = useState<THREE.Group | null>(null);
  useEffect(() => {
    let live = true;
    loadBus()
      .then((g) => live && setModel(g))
      .catch((e) => console.warn('vwbus:', e));
    return () => {
      live = false;
    };
  }, []);

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
    <group name="scale-objects">
      {buses.map((o, i) => (
        <primitive key={i} object={o} />
      ))}
    </group>
  );
}

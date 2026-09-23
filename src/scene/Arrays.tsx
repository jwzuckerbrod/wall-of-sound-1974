import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { CHANNELS, type CabinetId } from '../data/wall.config';
import { allCells, cellsByCabinet, type Cell } from '../geometry/arrays';

export type ColorMode = 'grey' | 'channel';

/** Grey-box tones, one per cabinet family, so the massing still reads. */
const GREY: Record<CabinetId, string> = {
  cab15: '#8d9299',
  cab12: '#9aa0a7',
  cab12x2: '#9aa0a7',
  panel5: '#aeb4bb',
  panelHF: '#c2c7cd',
};

function CabinetGroup({ cabinet, cells, colorMode }: { cabinet: CabinetId; cells: Cell[]; colorMode: ColorMode }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const { w, h, d } = cells[0].size;

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    const scale = new THREE.Vector3(1, 1, 1);
    const pos = new THREE.Vector3();
    const color = new THREE.Color();

    cells.forEach((c, i) => {
      pos.set(c.position[0], c.position[1], c.position[2]);
      q.setFromAxisAngle(up, c.rotationY);
      m.compose(pos, q, scale);
      mesh.setMatrixAt(i, m);
      color.set(colorMode === 'channel' ? CHANNELS[c.channel].color : GREY[cabinet]);
      // A touch of per-instance variation stops the wall reading as one flat slab.
      color.offsetHSL(0, 0, ((i * 2654435761) % 97) / 97 / 28 - 0.018);
      mesh.setColorAt(i, color);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [cells, cabinet, colorMode]);

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, cells.length]} castShadow receiveShadow>
      <boxGeometry args={[w, h, d]} />
      <meshStandardMaterial roughness={0.85} metalness={0.02} />
    </instancedMesh>
  );
}

export function Arrays({ colorMode }: { colorMode: ColorMode }) {
  const groups = useMemo(() => [...cellsByCabinet(allCells()).entries()], []);
  return (
    <group>
      {groups.map(([cabinet, cells]) => (
        <CabinetGroup key={cabinet} cabinet={cabinet} cells={cells} colorMode={colorMode} />
      ))}
    </group>
  );
}

import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { CHANNELS, type CabinetId } from '../data/wall.config';
import { allCells, cellsByCabinet, type Cell } from '../geometry/arrays';
import { cabinetGeometry, type Role } from '../geometry/cabinet';
import { shellColor, wallMaterials } from '../materials';

export type ColorMode = 'material' | 'channel';

/** Roles drawn for every cabinet, in the order they are added to the scene. */
const ROLES: Role[] = ['shell', 'baffle', 'cone', 'metal'];

/**
 * One InstancedMesh per (cabinet family × material role), all sharing the same
 * per-instance matrices. Four draw calls per family instead of one per cabinet.
 */
function RoleMesh({
  role,
  cabinet,
  cells,
  colorMode,
  castShadow,
}: {
  role: Role;
  cabinet: CabinetId;
  cells: Cell[];
  colorMode: ColorMode;
  castShadow: boolean;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const materials = wallMaterials();
  const geometry = cabinetGeometry(cabinet)[role];

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh || !geometry) return;

    const matrix = new THREE.Matrix4();
    const quat = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    const one = new THREE.Vector3(1, 1, 1);
    const pos = new THREE.Vector3();
    const color = new THREE.Color();

    cells.forEach((c, i) => {
      pos.set(c.position[0], c.position[1], c.position[2]);
      quat.setFromAxisAngle(up, c.rotationY);
      matrix.compose(pos, quat, one);
      mesh.setMatrixAt(i, matrix);

      if (colorMode === 'channel') {
        // Channel view tints everything, including the cones, so a subsystem
        // reads as one object at a glance.
        color.set(CHANNELS[c.channel].color);
        if (role === 'baffle') color.multiplyScalar(0.28);
        if (role === 'cone') color.multiplyScalar(0.62);
      } else if (role === 'shell') {
        shellColor(i + cabinet.length * 31, color, cabinet);
      } else {
        color.setRGB(1, 1, 1);
      }
      mesh.setColorAt(i, color);
    });

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [cells, cabinet, colorMode, geometry]);

  if (!geometry) return null;

  return (
    <instancedMesh
      ref={ref}
      args={[geometry, materials[role], cells.length]}
      castShadow={castShadow && role === 'shell'}
      receiveShadow={castShadow}
      frustumCulled
    />
  );
}

export function Arrays({ colorMode, shadows }: { colorMode: ColorMode; shadows: boolean }) {
  const groups = useMemo(() => [...cellsByCabinet(allCells()).entries()], []);
  return (
    <group name="arrays">
      {groups.map(([cabinet, cells]) =>
        ROLES.map((role) => (
          <RoleMesh
            key={`${cabinet}:${role}`}
            role={role}
            cabinet={cabinet}
            cells={cells}
            colorMode={colorMode}
            castShadow={shadows}
          />
        )),
      )}
    </group>
  );
}

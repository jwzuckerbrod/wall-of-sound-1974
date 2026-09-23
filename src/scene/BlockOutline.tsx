import { useMemo } from 'react';
import * as THREE from 'three';
import { allCells, blockBounds } from '../geometry/arrays';

/**
 * A box around the array under the cursor.
 *
 * Tinting the cabinets alone is not enough to say "this group, these ones" —
 * the wall is 641 near-identical objects and a colour shift reads as lighting.
 * An explicit edge says where the subsystem starts and stops.
 */
export function BlockOutline({ blockId, strong }: { blockId: string | null; strong?: boolean }) {
  const cells = useMemo(() => allCells(), []);
  const bounds = useMemo(() => (blockId ? blockBounds(blockId, cells) : null), [blockId, cells]);
  const geometry = useMemo(() => {
    if (!bounds) return null;
    const pad = 0.06;
    return new THREE.BoxGeometry(bounds.size[0] + pad, bounds.size[1] + pad, bounds.size[2] + pad);
  }, [bounds]);

  if (!bounds || !geometry) return null;

  return (
    <group position={bounds.centre}>
      <lineSegments>
        <edgesGeometry args={[geometry]} />
        <lineBasicMaterial
          color={strong ? '#ffd9a0' : '#9fc6ff'}
          transparent
          opacity={strong ? 0.95 : 0.55}
          depthTest={false}
        />
      </lineSegments>
      {strong && (
        <mesh geometry={geometry}>
          <meshBasicMaterial color="#ffd9a0" transparent opacity={0.05} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}

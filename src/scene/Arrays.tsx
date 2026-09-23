import type { ThreeEvent } from '@react-three/fiber';
import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { CHANNELS, type CabinetId, type ChannelId } from '../data/wall.config';
import { allCells, cellsByCabinet, type Cell } from '../geometry/arrays';
import { cabinetGeometry, type Role } from '../geometry/cabinet';
import { shellColor, wallMaterials } from '../materials';

export type ColorMode = 'material' | 'channel';

export interface ArrayInteraction {
  hovered: string | null;
  selected: string | null;
  /** Null shows every channel; otherwise everything else is dimmed right back. */
  isolated: ChannelId | null;
  /** 0 assembled, 1 fully apart. */
  explode: number;
  onHover: (blockId: string | null) => void;
  onSelect: (blockId: string | null) => void;
}

/** Roles drawn for every cabinet, in the order they are added to the scene. */
const ROLES: Role[] = ['shell', 'baffle', 'cone', 'metal'];

/** How far the exploded view throws a block along its own direction. */
const EXPLODE_DISTANCE = 2.6;

const HIGHLIGHT = new THREE.Color('#ffd9a0');
const scratchColor = new THREE.Color();

function RoleMesh({
  role,
  cabinet,
  cells,
  colorMode,
  castShadow,
  interaction,
}: {
  role: Role;
  cabinet: CabinetId;
  cells: Cell[];
  colorMode: ColorMode;
  castShadow: boolean;
  interaction: ArrayInteraction;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const materials = wallMaterials();
  const geometry = cabinetGeometry(cabinet)[role];

  // Only the outer shell is pickable. Raycasting four overlapping instanced
  // meshes per cabinet would be four times the work for the same answer.
  const pickable = role === 'shell';

  // Animated separately from React state so dragging the slider does not
  // re-render the tree 60 times a second.
  const explodeNow = useRef(interaction.explode);

  const writeMatrices = (amount: number) => {
    const mesh = ref.current;
    if (!mesh || !geometry) return;
    const matrix = new THREE.Matrix4();
    const quat = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    const one = new THREE.Vector3(1, 1, 1);
    const pos = new THREE.Vector3();

    cells.forEach((c, i) => {
      const k = amount * EXPLODE_DISTANCE;
      pos.set(
        c.position[0] + c.explode[0] * k,
        c.position[1] + c.explode[1] * k,
        c.position[2] + c.explode[2] * k,
      );
      quat.setFromAxisAngle(up, c.rotationY);
      matrix.compose(pos, quat, one);
      mesh.setMatrixAt(i, matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  };

  const writeColours = () => {
    const mesh = ref.current;
    if (!mesh || !geometry) return;
    const { hovered, selected, isolated } = interaction;

    cells.forEach((c, i) => {
      const colour = scratchColor;
      if (colorMode === 'channel') {
        colour.set(CHANNELS[c.channel].color);
        if (role === 'baffle') colour.multiplyScalar(0.28);
        if (role === 'cone') colour.multiplyScalar(0.62);
      } else if (role === 'shell') {
        shellColor(i + cabinet.length * 31, colour, cabinet);
      } else {
        colour.setRGB(1, 1, 1);
      }

      if (isolated && c.channel !== isolated) colour.multiplyScalar(0.12);
      if (c.block === selected) colour.lerp(HIGHLIGHT, 0.45);
      else if (c.block === hovered) colour.lerp(HIGHLIGHT, 0.22);

      mesh.setColorAt(i, colour);
    });
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  };

  useLayoutEffect(() => {
    writeMatrices(explodeNow.current);
    writeColours();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cells, cabinet, geometry]);

  useLayoutEffect(() => {
    writeColours();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colorMode, interaction.hovered, interaction.selected, interaction.isolated]);

  useFrame((_, dt) => {
    const target = interaction.explode;
    const now = explodeNow.current;
    if (Math.abs(target - now) < 0.001) return;
    explodeNow.current = now + (target - now) * Math.min(1, dt * 4);
    writeMatrices(explodeNow.current);
  });

  if (!geometry) return null;

  // Pointer and click events carry different native event types; only the
  // instanceId matters here.
  const blockOf = (e: ThreeEvent<PointerEvent | MouseEvent>) =>
    e.instanceId != null ? cells[e.instanceId]?.block ?? null : null;

  return (
    <instancedMesh
      ref={ref}
      args={[geometry, materials[role], cells.length]}
      castShadow={castShadow && role === 'shell'}
      receiveShadow={castShadow}
      frustumCulled
      raycast={pickable ? undefined : () => null}
      onPointerMove={
        pickable
          ? (e) => {
              e.stopPropagation();
              interaction.onHover(blockOf(e));
            }
          : undefined
      }
      onPointerOut={pickable ? () => interaction.onHover(null) : undefined}
      onClick={
        pickable
          ? (e) => {
              e.stopPropagation();
              interaction.onSelect(blockOf(e));
            }
          : undefined
      }
    />
  );
}

export function Arrays({
  colorMode,
  shadows,
  interaction,
}: {
  colorMode: ColorMode;
  shadows: boolean;
  interaction: ArrayInteraction;
}) {
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
            interaction={interaction}
          />
        )),
      )}
    </group>
  );
}

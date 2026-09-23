import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import * as THREE from 'three';
import { wall } from '../data/wall.config';
import { envelope } from '../geometry/arrays';
import type { View } from './views';

/**
 * Pulls the camera back along its own view direction until the whole rig fits
 * the viewport, in both axes, with a margin. Re-runs on resize, so a phone in
 * portrait sees the same thing a laptop does, just further away.
 */
export function FitCamera({ view, margin = 1.02 }: { view: View; margin?: number }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  const controls = useThree((s) => s.controls) as { target: THREE.Vector3; update: () => void } | null;

  useEffect(() => {
    if (!view.fit) return;

    const env = envelope();
    const deck = wall.dimensions.stageDeckHeight;
    const target = new THREE.Vector3(...view.target);

    // Fit a sphere around the rig CENTRED ON THE CONTROLS TARGET, not on the
    // rig's own centre. OrbitControls recomputes the camera from its target and
    // would undo any fit that assumed a different pivot.
    const box = new THREE.Box3(
      new THREE.Vector3(env.minX, deck, env.minZ),
      new THREE.Vector3(env.maxX, deck + wall.dimensions.arrayHeight, env.maxZ),
    );
    let radius = 0;
    for (const cx of [box.min.x, box.max.x])
      for (const cy of [box.min.y, box.max.y])
        for (const cz of [box.min.z, box.max.z])
          radius = Math.max(radius, target.distanceTo(new THREE.Vector3(cx, cy, cz)));

    const vFov = THREE.MathUtils.degToRad(camera.fov);
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
    const dist = (radius * margin) / Math.sin(Math.min(vFov, hFov) / 2);

    const dir = new THREE.Vector3(...view.position).sub(target).normalize();
    camera.position.copy(target).addScaledVector(dir, dist);
    camera.lookAt(target);
    camera.updateProjectionMatrix();

    if (controls) {
      controls.target.copy(target);
      controls.update();
    }
  }, [camera, controls, size.width, size.height, view, margin]);

  return null;
}

import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import * as THREE from 'three';
import { scaffoldLayout } from '../geometry/scaffold';
import type { View } from './views';

/**
 * Pulls the camera back along its own view direction until the whole rig fits
 * the viewport, in both axes, with a margin. Re-runs on resize, so a phone in
 * portrait sees the same thing a laptop does, just further away.
 */
export function FitCamera({ view, margin = 1.04 }: { view: View; margin?: number }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  const controls = useThree((s) => s.controls) as { target: THREE.Vector3; update: () => void } | null;

  useEffect(() => {
    const target = new THREE.Vector3(...view.target);

    // Views that declare an exact eye position just use it.
    if (!view.fit) {
      camera.position.set(...view.position);
      camera.lookAt(target);
      camera.updateProjectionMatrix();
      if (controls) {
        controls.target.copy(target);
        controls.update();
      }
      return;
    }

    // What has to be in frame: the steel, top rail to ground, from the back of
    // the tower to the stage's front edge. The deck's wings, 9 ft past the steel
    // each side, may run off a narrow window: they are empty, and fitting them
    // left a phone with a Wall half the width of its screen (qa-findings §22).
    const L = scaffoldLayout();
    const halfW = L.footprint.width / 2;
    const top = L.yLevels[L.yLevels.length - 1];

    // Projects each corner of that box rather than fitting a sphere round it,
    // which left a third of the frame empty. For a point p relative to the
    // target, on axes (right, up, back toward the camera), it is in frame when
    // |p.right| <= tan(hFov / 2) * (dist - p.back), and likewise for up.
    const dir = new THREE.Vector3(...view.position).sub(target).normalize();
    const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), dir).normalize();
    const up = new THREE.Vector3().crossVectors(dir, right);
    const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) / margin;
    const tanH = tanV * camera.aspect;
    const p = new THREE.Vector3();
    let dist = 0;
    for (const x of [-halfW, halfW])
      for (const y of [0, top])
        for (const z of [L.deck.minZ, L.deck.maxZ]) {
          p.set(x, y, z).sub(target);
          const back = p.dot(dir);
          dist = Math.max(dist, back + Math.abs(p.dot(right)) / tanH, back + Math.abs(p.dot(up)) / tanV);
        }

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

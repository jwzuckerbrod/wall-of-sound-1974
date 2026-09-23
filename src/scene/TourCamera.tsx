import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { TourStop } from './tour';

const DURATION = 1.7;
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

interface OrbitLike {
  target: THREE.Vector3;
  enabled: boolean;
  update: () => void;
}

/**
 * Glides the camera to a tour stop, then hands control back to OrbitControls so
 * the visitor can look around before moving on.
 *
 * Honours prefers-reduced-motion by cutting straight to the pose: a long
 * sweeping camera move is exactly the kind of thing that setting exists for.
 */
export function TourCamera({ stop, active }: { stop: TourStop; active: boolean }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const controls = useThree((s) => s.controls) as OrbitLike | null;

  const tween = useRef<{
    t: number;
    from: THREE.Vector3;
    to: THREE.Vector3;
    fromTarget: THREE.Vector3;
    toTarget: THREE.Vector3;
    fromFov: number;
    toFov: number;
  } | null>(null);

  useEffect(() => {
    if (!active) return;

    const to = new THREE.Vector3(...stop.position);
    const toTarget = new THREE.Vector3(...stop.target);
    const toFov = stop.fov ?? camera.fov;

    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    if (reduced) {
      camera.position.copy(to);
      camera.fov = toFov;
      camera.updateProjectionMatrix();
      camera.lookAt(toTarget);
      if (controls) {
        controls.target.copy(toTarget);
        controls.update();
      }
      tween.current = null;
      return;
    }

    tween.current = {
      t: 0,
      from: camera.position.clone(),
      to,
      fromTarget: controls ? controls.target.clone() : new THREE.Vector3(),
      toTarget,
      fromFov: camera.fov,
      toFov,
    };
    if (controls) controls.enabled = false;
  }, [stop, active, camera, controls]);

  // Never leave the controls disabled if the tour is exited mid-flight.
  useEffect(() => {
    if (!active && controls) controls.enabled = true;
  }, [active, controls]);

  useFrame((_, rawDt) => {
    const tw = tween.current;
    if (!tw || !active) return;

    tw.t = Math.min(1, tw.t + Math.min(rawDt, 0.1) / DURATION);
    const e = easeInOutCubic(tw.t);

    camera.position.lerpVectors(tw.from, tw.to, e);
    camera.fov = THREE.MathUtils.lerp(tw.fromFov, tw.toFov, e);
    camera.updateProjectionMatrix();

    const look = new THREE.Vector3().lerpVectors(tw.fromTarget, tw.toTarget, e);
    camera.lookAt(look);
    if (controls) controls.target.copy(look);

    if (tw.t >= 1) {
      tween.current = null;
      if (controls) {
        controls.enabled = true;
        controls.update();
      }
    }
  });

  return null;
}

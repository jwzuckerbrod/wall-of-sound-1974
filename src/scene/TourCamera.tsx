import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
/** Where to put the camera: a tour stop, or a viewpoint. */
export interface Pose {
  position: [number, number, number];
  target: [number, number, number];
  fov?: number;
}

// A move's length sets its time, as a camera operator would: a small reframe is quick, a flight across
// the Bowl takes longer. Seconds = 0.9 + 0.2·√meters, kept between 1.2 and 2.6 (about 2 m → 1.2 s,
// 30 m → 2.0 s, 70 m → 2.6 s). Every move used to take 1.7 s.
const MIN_S = 1.2;
const MAX_S = 2.6;
const secondsFor = (meters: number) => THREE.MathUtils.clamp(0.9 + 0.2 * Math.sqrt(meters), MIN_S, MAX_S);
// Long moves rise in a gentle arc, like a crane shot, instead of sliding in a straight line: the camera
// peaks a tenth of the distance above the straight path (at most 5 m), only on moves longer than 6 m.
const ARC_FROM_M = 6;
const ARC_PEAK = 0.1;
const ARC_MAX_M = 5;
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

interface OrbitLike {
  target: THREE.Vector3;
  enabled: boolean;
  update: () => void;
  maxPolarAngle: number;
  minDistance: number;
}

/**
 * Some poses sit outside OrbitControls' limits: the camera lower than the point it looks at (looking up at
 * Garcia's columns), or closer than its minimum distance (the vocal microphones). Handed back as they are, the
 * controls snapped the camera inside the limits the moment a move ended, a visible jump. So the limits are
 * opened just enough to hold the pose, then closed again as the visitor moves back inside them: orbiting
 * sideways keeps the camera at the same height, so it can't reach the ground this way.
 */
function holdPose(camera: THREE.Camera, controls: OrbitLike, limits: { polar: number; minDistance: number }) {
  const offset = camera.position.clone().sub(controls.target);
  const d = offset.length();
  const polar = Math.acos(THREE.MathUtils.clamp(offset.y / (d || 1), -1, 1));
  controls.maxPolarAngle = Math.max(limits.polar, polar + 1e-4);
  controls.minDistance = Math.min(limits.minDistance, d - 1e-4);
}

/** Closes opened limits back toward the scene's own, never past where the camera is now. */
function tighten(camera: THREE.Camera, controls: OrbitLike, limits: { polar: number; minDistance: number }) {
  if (controls.maxPolarAngle <= limits.polar && controls.minDistance >= limits.minDistance) return;
  const offset = camera.position.clone().sub(controls.target);
  const d = offset.length();
  const polar = Math.acos(THREE.MathUtils.clamp(offset.y / (d || 1), -1, 1));
  controls.maxPolarAngle = Math.max(limits.polar, Math.min(controls.maxPolarAngle, polar + 1e-4));
  controls.minDistance = Math.min(limits.minDistance, Math.max(controls.minDistance, d - 1e-4));
}

/**
 * Glides the camera to a tour stop (timed by distance, arcing on long moves), then hands control back to OrbitControls so
 * the visitor can look around before moving on.
 *
 * Honors prefers-reduced-motion by cutting straight to the pose: a long
 * sweeping camera move is exactly the kind of thing that setting exists for.
 */
export function TourCamera({ stop, active }: { stop: Pose; active: boolean }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const controls = useThree((s) => s.controls) as OrbitLike | null;

  // The scene's own limits, read once, before any pose opens them
  const limits = useRef<{ polar: number; minDistance: number } | null>(null);
  if (controls && !limits.current) limits.current = { polar: controls.maxPolarAngle, minDistance: controls.minDistance };

  const tween = useRef<{
    t: number;
    from: THREE.Vector3;
    to: THREE.Vector3;
    fromTarget: THREE.Vector3;
    toTarget: THREE.Vector3;
    fromFov: number;
    toFov: number;
    /** The arc's control point (a quadratic Bézier between from and to), or null for a straight move. */
    via: THREE.Vector3 | null;
    seconds: number;
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
        if (limits.current) holdPose(camera, controls, limits.current);
        controls.update();
      }
      tween.current = null;
      return;
    }

    const from = camera.position.clone();
    const fromTarget = controls ? controls.target.clone() : new THREE.Vector3();
    // How far the shot travels: where the camera goes, plus half of how far its aim swings
    const meters = from.distanceTo(to) + 0.5 * fromTarget.distanceTo(toTarget);
    const travel = from.distanceTo(to);
    let via: THREE.Vector3 | null = null;
    if (travel > ARC_FROM_M) {
      // A Bézier peaks at half its control point's offset, so the control point sits twice as high
      const peak = Math.min(ARC_PEAK * travel, ARC_MAX_M);
      via = from.clone().lerp(to, 0.5).add(new THREE.Vector3(0, 2 * peak, 0));
    }

    tween.current = { t: 0, from, to, fromTarget, toTarget, fromFov: camera.fov, toFov, via, seconds: secondsFor(meters) };
    if (controls) controls.enabled = false;
  }, [stop, active, camera, controls]);

  // Never leave the controls disabled, or their limits opened, once the tour is exited.
  useEffect(() => {
    if (!active && controls) controls.enabled = true;
  }, [active, controls]);
  useEffect(
    () => () => {
      if (controls && limits.current) {
        controls.maxPolarAngle = limits.current.polar;
        controls.minDistance = limits.current.minDistance;
      }
    },
    [controls],
  );

  useFrame((_, rawDt) => {
    const tw = tween.current;
    if (!tw) {
      if (active && controls && limits.current) tighten(camera, controls, limits.current);
      return;
    }
    if (!active) return;

    tw.t = Math.min(1, tw.t + Math.min(rawDt, 0.1) / tw.seconds);
    const e = easeInOutCubic(tw.t);

    if (tw.via) {
      const u = 1 - e;
      camera.position
        .copy(tw.from)
        .multiplyScalar(u * u)
        .addScaledVector(tw.via, 2 * u * e)
        .addScaledVector(tw.to, e * e);
    } else {
      camera.position.lerpVectors(tw.from, tw.to, e);
    }
    camera.fov = THREE.MathUtils.lerp(tw.fromFov, tw.toFov, e);
    camera.updateProjectionMatrix();

    const look = new THREE.Vector3().lerpVectors(tw.fromTarget, tw.toTarget, e);
    camera.lookAt(look);
    if (controls) controls.target.copy(look);

    if (tw.t >= 1) {
      tween.current = null;
      if (controls) {
        if (limits.current) holdPose(camera, controls, limits.current);
        controls.enabled = true;
        controls.update();
      }
    }
  });

  return null;
}

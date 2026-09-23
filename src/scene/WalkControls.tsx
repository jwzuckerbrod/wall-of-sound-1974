import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { EYE_HEIGHT, floorAt, resolveMove, walkWorld, type Move } from '../geometry/walk';

/**
 * First-person walking.
 *
 * Deliberately NOT pointer-lock. Pointer lock hides the cursor, hijacks Escape,
 * breaks on touch entirely and is hostile in an embedded page — none of which
 * suits something a visitor might open for ninety seconds. Dragging to look is
 * slower but works with a mouse, a trackpad, a finger and a keyboard alike.
 */
export interface WalkState {
  position: THREE.Vector3;
  yaw: number;
  pitch: number;
}

const SPEED = 3.2;
const RUN_MULTIPLIER = 2.4;
const LOOK_SENSITIVITY = 0.0032;
const PITCH_LIMIT = Math.PI / 2 - 0.08;

export function WalkControls({
  enabled,
  start,
  onMove,
}: {
  enabled: boolean;
  start: { x: number; z: number; yaw: number };
  onMove?: (s: WalkState) => void;
}) {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const world = useMemo(() => walkWorld(), []);

  const keys = useRef(new Set<string>());
  const look = useRef({ yaw: start.yaw, pitch: -0.05 });
  const pos = useRef<Move>({ x: start.x, z: start.z, y: floorAt(world, start.x, start.z) });
  // Touch: one pointer to steer, one to move, whichever arrives first.
  const pointers = useRef(new Map<number, { x: number; y: number; role: 'look' | 'move' }>());
  const moveAxis = useRef({ x: 0, y: 0 });

  // Reset to the start pose whenever walk mode is entered.
  useEffect(() => {
    if (!enabled) return;
    look.current = { yaw: start.yaw, pitch: -0.05 };
    pos.current = { x: start.x, z: start.z, y: floorAt(world, start.x, start.z) };
    keys.current.clear();
    moveAxis.current = { x: 0, y: 0 };
  }, [enabled, start.x, start.z, start.yaw, world]);

  useEffect(() => {
    if (!enabled) return;
    const el = gl.domElement;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (MOVE_KEYS.has(k)) {
        // Arrow keys would otherwise scroll the page out from under the canvas.
        e.preventDefault();
        keys.current.add(k);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase());
    const onBlur = () => keys.current.clear();

    const onPointerDown = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      // On touch, the left third of the screen drives movement and the rest
      // steers — the usual arrangement, and it leaves most of the frame for
      // actually looking at the thing.
      const isMoveZone = e.pointerType === 'touch' && e.clientX - rect.left < rect.width * 0.34;
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY, role: isMoveZone ? 'move' : 'look' });
      el.setPointerCapture(e.pointerId);
    };
    const onPointerMove = (e: PointerEvent) => {
      const p = pointers.current.get(e.pointerId);
      if (!p) return;
      const dx = e.clientX - p.x;
      const dy = e.clientY - p.y;
      if (p.role === 'look') {
        look.current.yaw -= dx * LOOK_SENSITIVITY;
        look.current.pitch = THREE.MathUtils.clamp(look.current.pitch - dy * LOOK_SENSITIVITY, -PITCH_LIMIT, PITCH_LIMIT);
        p.x = e.clientX;
        p.y = e.clientY;
      } else {
        // Virtual stick: offset from where the finger went down.
        moveAxis.current = {
          x: THREE.MathUtils.clamp(dx / 70, -1, 1),
          y: THREE.MathUtils.clamp(dy / 70, -1, 1),
        };
      }
    };
    const onPointerUp = (e: PointerEvent) => {
      const p = pointers.current.get(e.pointerId);
      if (p?.role === 'move') moveAxis.current = { x: 0, y: 0 };
      pointers.current.delete(e.pointerId);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', onPointerUp);
    el.addEventListener('pointercancel', onPointerUp);
    el.style.cursor = 'grab';

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', onPointerUp);
      el.removeEventListener('pointercancel', onPointerUp);
      el.style.cursor = '';
      pointers.current.clear();
    };
  }, [enabled, gl]);

  useFrame((_, rawDt) => {
    if (!enabled) return;
    // A tab that has been backgrounded returns one enormous delta; without a
    // clamp the visitor is teleported across the arena on their way back.
    const dt = Math.min(rawDt, 0.1);
    const k = keys.current;

    const held = (...names: string[]) => names.some((n) => k.has(n));
    let forward = (held('w', 'arrowup') ? 1 : 0) - (held('s', 'arrowdown') ? 1 : 0);
    let strafe = (held('d') ? 1 : 0) - (held('a') ? 1 : 0);
    const turn = (held('arrowleft', 'q') ? 1 : 0) - (held('arrowright', 'e') ? 1 : 0);

    forward -= moveAxis.current.y;
    strafe += moveAxis.current.x;

    look.current.yaw += turn * 1.9 * dt;

    const speed = SPEED * (held('shift') ? RUN_MULTIPLIER : 1) * dt;
    const len = Math.hypot(forward, strafe);
    if (len > 0) {
      const f = forward / Math.max(1, len);
      const s = strafe / Math.max(1, len);
      const sin = Math.sin(look.current.yaw);
      const cos = Math.cos(look.current.yaw);
      // Camera looks down -Z at yaw 0, so forward is (-sin, -cos).
      const dx = (-sin * f + cos * s) * speed;
      const dz = (-cos * f - sin * s) * speed;
      pos.current = resolveMove(world, pos.current, pos.current.x + dx, pos.current.z + dz);
    }

    // Settle onto the floor rather than snapping, so the ramp feels like a ramp.
    const targetY = floorAt(world, pos.current.x, pos.current.z);
    pos.current.y += (targetY - pos.current.y) * Math.min(1, dt * 12);

    camera.position.set(pos.current.x, pos.current.y + EYE_HEIGHT, pos.current.z);
    camera.rotation.set(look.current.pitch, look.current.yaw, 0, 'YXZ');

    if (import.meta.env.DEV)
      (window as unknown as Record<string, unknown>).__walk = {
        x: +pos.current.x.toFixed(2),
        z: +pos.current.z.toFixed(2),
        floor: +pos.current.y.toFixed(2),
        yaw: +look.current.yaw.toFixed(2),
        keys: [...keys.current],
      };

    onMove?.({ position: camera.position.clone(), yaw: look.current.yaw, pitch: look.current.pitch });
  });

  return null;
}

const MOVE_KEYS = new Set([
  'w', 'a', 's', 'd', 'q', 'e', 'shift',
  'arrowup', 'arrowdown', 'arrowleft', 'arrowright',
]);

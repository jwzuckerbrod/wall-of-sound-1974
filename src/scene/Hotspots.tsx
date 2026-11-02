import { Html } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { TOUR } from './tour';

/**
 * The dots on the model: one per tour stop that has an anchor, numbered in
 * tour order. Clicking one flies there and opens its card. Real buttons in
 * the page (drei's Html), so they take focus, read out their label, and stay
 * crisp at any size.
 *
 * Hidden while the Wall is pulled apart: the anchors belong to the assembled
 * Wall, and dots floating over empty space would point at nothing.
 */
export function Hotspots({
  active,
  onPick,
  hidden,
}: {
  /** The open stop's index, or null. */
  active: number | null;
  onPick: (i: number) => void;
  hidden: boolean;
}) {
  if (hidden) return null;
  return (
    <group name="hotspots">
      {TOUR.map((s, i) =>
        s.anchor ? (
          <Html key={s.id} position={s.anchor} center zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}>
            <button
              className="dot"
              aria-current={active === i}
              aria-label={s.title}
              onClick={() => onPick(i)}
              style={{ pointerEvents: 'auto' }}
            >
              <span className="dot-label">{s.title}</span>
            </button>
          </Html>
        ) : null,
      )}
    </group>
  );
}

/**
 * Makes room for an open card, so it sits beside the Wall instead of over it.
 *
 * On a wide screen the whole picture the camera had is fitted into the space
 * left of the card: a view offset that scales the frustum, so nothing is
 * cropped and orbiting still turns about the same point. On a phone, where
 * shrinking would leave the Wall tiny, the picture just slides up out of the
 * sheet by `up` pixels. Eased, so it glides.
 */
export function ViewOffset({ room, up }: { room: number; up: number }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  const cur = useRef({ room: 0, up: 0 });
  useFrame((_, dt) => {
    const k = Math.min(1, dt * 6);
    const c = cur.current;
    c.room += (room - c.room) * k;
    c.up += (up - c.up) * k;
    if (room === 0 && up === 0 && c.room < 0.5 && Math.abs(c.up) < 0.5) {
      if (camera.view?.enabled) camera.clearViewOffset();
      return;
    }
    const W = size.width;
    const H = size.height;
    // s < 1 widens the frustum: the old frame then fills the left s of the screen, centred vertically.
    const s = Math.max(0.3, (W - c.room) / W);
    camera.setViewOffset(W * s, H * s, 0, -((1 - s) * H) / 2 + c.up * s, W, H);
  });
  return null;
}

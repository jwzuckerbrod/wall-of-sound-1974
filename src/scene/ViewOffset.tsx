import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';

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
    // s < 1 widens the frustum: the old frame then fills the left s of the screen, centered vertically.
    const s = Math.max(0.3, (W - c.room) / W);
    camera.setViewOffset(W * s, H * s, 0, -((1 - s) * H) / 2 + c.up * s, W, H);
  });
  return null;
}

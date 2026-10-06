/**
 * The plan footprint of everything solid on the deck: every speaker stack and
 * every amp rack.
 *
 * Pure functions over the config — no three.js — so scripts/verify.mjs can
 * check headlessly that nothing else on the stage, such as a player's spot,
 * has been put inside a stack.
 */
import { ARRAYS, cabinetSize, wall, standoffOf } from '../data/wall.config';
import { scaffoldLayout } from './scaffold';

export interface Box2 {
  id: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export function stageBlockers(): Box2[] {
  const L = scaffoldLayout();
  const blockers: Box2[] = [];

  // Every array block, at its true footprint.
  for (const b of ARRAYS) {
    const s = cabinetSize(b.cabinet);
    const w = s.w * b.cols;
    const z = b.z + standoffOf(b);
    // Curved blocks bulge upstage at the ends; a straight box over the whole
    // arc is close enough and errs toward solid.
    const depth = b.curveRadius > 0 ? s.d + b.curveRadius * 0.16 : s.d;
    blockers.push({
      id: b.id,
      minX: b.x - w / 2,
      maxX: b.x + w / 2,
      minZ: z - depth,
      maxZ: z,
    });
  }

  // Amp racks along the back.
  const amps = wall.structure.amps;
  const span = L.footprint.width * 0.82;
  for (let r = 0; r < amps.rackCount; r++) {
    const x = -span / 2 + (span / (amps.rackCount - 1)) * r;
    blockers.push({
      id: `amp-${r}`,
      minX: x - amps.size.w / 2,
      maxX: x + amps.size.w / 2,
      minZ: amps.z - amps.size.d,
      maxZ: amps.z,
    });
  }

  return blockers;
}

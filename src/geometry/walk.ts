/**
 * Where a visitor can stand, and what stops them.
 *
 * Pure functions over the config — no three.js — so the walkable world can be
 * checked headlessly in scripts/verify.mjs. A first-person mode that lets you
 * stroll through a stack of 15-inch cabinets is worse than no first-person
 * mode at all, and that is a thing to test rather than to eyeball.
 */
import { ARRAYS, cabinetSize, FT, wall } from '../data/wall.config';
import { scaffoldLayout } from './scaffold';

export interface Box2 {
  id: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

/** Person-sized clearance kept around every solid thing. */
export const WALKER_RADIUS = 0.34;
export const EYE_HEIGHT = 1.65;
/** The biggest height change a stride can absorb. Anything more needs the ramp. */
export const MAX_STEP = 0.45;
/** Nobody needs to wander further than this into the dark. */
export const WORLD_RADIUS = 110;

export interface WalkWorld {
  deck: { minX: number; maxX: number; minZ: number; maxZ: number; y: number };
  /** Wedge from ground level up to the deck, stage left. */
  ramp: { minX: number; maxX: number; minZ: number; maxZ: number; y: number };
  blockers: Box2[];
}

export function walkWorld(): WalkWorld {
  const L = scaffoldLayout();
  const deck = { minX: L.deck.minX, maxX: L.deck.maxX, minZ: L.deck.minZ, maxZ: L.deck.maxZ, y: L.deck.y };

  // Stage-left ramp, running out from the side of the deck. Not documented —
  // a way on and off the stage that a visitor can find and use.
  const ramp = {
    minX: deck.maxX,
    maxX: deck.maxX + FT(24),
    minZ: deck.maxZ - FT(20),
    maxZ: deck.maxZ - FT(3),
    y: deck.y,
  };

  const blockers: Box2[] = [];

  // Every array block, at its true footprint.
  for (const b of ARRAYS) {
    const s = cabinetSize(b.cabinet);
    const w = s.w * b.cols;
    const z = b.z + wall.dimensions.arrayStandoff;
    // Curved blocks bulge upstage at the ends; a straight box over the whole
    // arc is close enough for collision and errs toward solid.
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

  return { deck, ramp, blockers };
}

const inside = (b: { minX: number; maxX: number; minZ: number; maxZ: number }, x: number, z: number) =>
  x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ;

/** Floor height under a point: ground, deck, or part-way up the ramp. */
export function floorAt(world: WalkWorld, x: number, z: number): number {
  if (inside(world.deck, x, z)) return world.deck.y;
  if (inside(world.ramp, x, z)) {
    const t = 1 - (x - world.ramp.minX) / (world.ramp.maxX - world.ramp.minX);
    return world.ramp.y * Math.max(0, Math.min(1, t));
  }
  return 0;
}

/** True when a person of WALKER_RADIUS at (x, z) would be inside something solid. */
export function blocked(world: WalkWorld, x: number, z: number, y: number): boolean {
  // Blockers are the speaker stacks and amp racks, which all stand on the deck.
  // Down on the ground you can walk right underneath them.
  if (y < world.deck.y - 0.2) return false;
  for (const b of world.blockers)
    if (
      x > b.minX - WALKER_RADIUS &&
      x < b.maxX + WALKER_RADIUS &&
      z > b.minZ - WALKER_RADIUS &&
      z < b.maxZ + WALKER_RADIUS
    )
      return true;
  return false;
}

export interface Move {
  x: number;
  z: number;
  y: number;
}

/**
 * Resolves a step. Refuses to walk into solids or to climb more than a stride,
 * and slides along a surface rather than stopping dead when you graze it.
 */
export function resolveMove(world: WalkWorld, from: Move, toX: number, toZ: number): Move {
  const attempt = (x: number, z: number): Move | null => {
    const r = Math.hypot(x, z);
    if (r > WORLD_RADIUS) return null;
    const y = floorAt(world, x, z);
    if (y - from.y > MAX_STEP) return null;
    if (blocked(world, x, z, y)) return null;
    return { x, z, y };
  };

  return (
    attempt(toX, toZ) ??
    // Slide: keep whichever axis is still legal.
    attempt(toX, from.z) ??
    attempt(from.x, toZ) ?? { ...from }
  );
}

/**
 * What lies on the stage floor, besides the gear: the cables, and at the Bowl
 * the riser under the kit. Pure, so verify.mjs can check it. Drawn by the
 * explorer only (src/scene/BandGear.tsx); Blender doesn't read it yet.
 *
 * See PROVENANCE['structure.deckCables'] and ['band.bowlKitRiser'].
 */
import { wall } from '../data/wall.config';
import { generator } from './random';
import { rackFronts } from './roadgear';
import { scaffoldLayout, vocalMics } from './scaffold';

export interface KitRiser {
  /** Center of the riser's footprint; y is the deck. */
  pos: [number, number, number];
  size: { w: number; d: number; h: number };
}

/** Under the kit, centered on where the kit stands (band.instruments.kitBack). */
export function kitRiser(L = scaffoldLayout()): KitRiser {
  const k = wall.band.members.find((m) => m.id === 'kreutz')!;
  return {
    pos: [k.x, L.deck.y, k.z - wall.band.instruments.kitBack],
    size: wall.band.instruments.bowlKitRiser,
  };
}

/** Nudges a point out of the riser's footprint, sideways, so no cable runs through it. */
function clearOfRiser(p: [number, number], R: KitRiser): [number, number] {
  const gap = 0.12;
  const hx = R.size.w / 2 + gap;
  const hz = R.size.d / 2 + gap;
  const dx = p[0] - R.pos[0];
  if (Math.abs(dx) >= hx || Math.abs(p[1] - R.pos[2]) >= hz) return p;
  return [R.pos[0] + (dx < 0 ? -hx : hx), p[1]];
}

/**
 * One cable from each vocal stand and each player's mark, wandering upstage to
 * the nearest amp rack, in the slack loops the photographs show. The routes
 * are this generator's: only that they lay loose across the floor is evidence.
 * Control points as (x, z); the renderer smooths them and lays them on the deck.
 */
export function deckCables(L = scaffoldLayout()): [number, number][][] {
  const rng = generator(1974_0721);
  const R = kitRiser(L);
  const racks = rackFronts(L);
  const nearestRack = (x: number) => racks.reduce((a, b) => (Math.abs(b[0] - x) < Math.abs(a[0] - x) ? b : a));

  const starts: [number, number][] = vocalMics(L).map(([x, , z]) => [x, z]);
  // The two guitars and the bass, from the player's mark.
  for (const m of wall.band.members)
    if (m.id === 'garcia' || m.id === 'weir' || m.id === 'lesh') starts.push([m.x + 0.22, m.z - 0.1]);

  return starts.map(([x, z]) => {
    const sideOfKit = x < R.pos[0] ? -1 : 1;
    const rack = nearestRack(x + sideOfKit * 0.8);
    const endZ = rack[2] + 0.1;
    const pts: [number, number][] = [[x, z]];
    // First a slack loop sideways and downstage of the stand, as cable left lying does.
    pts.push([x + sideOfKit * rng.uniform(0.25, 0.7), Math.min(z + rng.uniform(0.15, 0.5), L.deck.maxZ - 0.4)]);
    const steps = 3;
    for (let i = 1; i <= steps; i++) {
      const t = i / (steps + 1);
      const wander = rng.uniform(-0.55, 0.55);
      pts.push(clearOfRiser([x + (rack[0] - x) * t + sideOfKit * 0.4 + wander, z + (endZ - z) * t], R));
    }
    pts.push([rack[0], endZ]);
    return pts;
  });
}

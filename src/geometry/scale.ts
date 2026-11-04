/**
 * Things of known size to stand beside the Wall. Pure, shared by the explorer
 * and verify.mjs. See PROVENANCE['scale.vwBus'].
 */
import { wall } from '../data/wall.config';
import { scaffoldLayout } from './scaffold';

export interface BusPlace {
  /** Centre of the bus, on the ground. Side-on, its side toward the audience. */
  pos: [number, number, number];
  colour: string;
}

/**
 * Four buses end to end on the ground, along the stage front and centred on it,
 * as long as the run of speakers above them. `ground` is the height of the
 * floor at the venue (0 indoors).
 */
export function busRow(ground: number, L = scaffoldLayout()): BusPlace[] {
  const B = wall.scale.vwBus;
  const z = L.deck.maxZ + B.setback + B.width / 2;
  return B.colours.map((colour, i) => ({
    pos: [(i - (B.colours.length - 1) / 2) * B.length, ground, z],
    colour,
  }));
}

/** Where the 737 stands. Only beside it do the two heights compare fairly. */
export type PlaneAt = 'beside' | 'behind' | 'front';
export const PLANE_POSITIONS: PlaneAt[] = ['beside', 'behind', 'front'];

/**
 * The 737, on the ground, side-on. Beside the stage at the audience's left, at the
 * depth of the speakers' face, nose pointing away and its tail nearest the Wall.
 * Or centred behind the stage, or in front of it, its near wing clear of the stage.
 */
export function planePlace(at: PlaneAt = 'beside', L = scaffoldLayout()): { pos: [number, number, number]; turn: number } {
  const P = wall.scale.b737;
  if (at === 'behind') return { pos: [0, 0, L.deck.minZ - P.span / 2 - P.setback], turn: 0 };
  if (at === 'front') return { pos: [0, 0, L.deck.maxZ + P.span / 2 + P.setback], turn: 0 };
  return { pos: [L.deck.minX - P.setback - P.length / 2, 0, 0], turn: Math.PI };
}

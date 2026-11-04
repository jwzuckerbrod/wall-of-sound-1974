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

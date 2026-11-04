/**
 * Where the sound comes from, seen from a seat at the Hollywood Bowl: the
 * story's seat diagram. Plan view, metres, scene frame (x across, -x the
 * audience's left; +z toward the audience). Pure.
 *
 * When one sound arrives from two places, you hear one sound (the precedence
 * effect, thresholds from Wikipedia): under 2 ms apart, somewhere between the
 * two; beyond that, at whichever reached you first; beyond about 50 ms (for
 * speech), the later one is heard as an echo. A rule of thumb in a plan view:
 * it leaves out level, height, reflections and the sound off the stage itself.
 * See PROVENANCE['comparison.localization'].
 */
import { CHANNELS, wall, type ChannelId } from '../data/wall.config';
import { allCells } from './arrays';
import { bowlFrame } from './bowl';
import { scaffoldLayout } from './scaffold';

export interface Point { x: number; z: number }
export type Seat = Point;

/** One sound: where it leaves the speakers. More than one emitter means the same signal from each. */
export interface Sound { id: string; color: string; label: string; emitters: Point[] }

const SPEED_OF_SOUND = 343; // m/s, at about 20 °C
export const SUMMING_MS = 2;
export const ECHO_MS = 50;

const mean = (ps: Point[]): Point => ({
  x: ps.reduce((a, p) => a + p.x, 0) / ps.length,
  z: ps.reduce((a, p) => a + p.z, 0) / ps.length,
});

const L = scaffoldLayout();
export const STAGE = { minX: L.deck.minX, maxX: L.deck.maxX, minZ: L.deck.minZ, front: bowlFrame(L).front };
export const SEATING = wall.venues.hollywoodBowl.seating;

/** The typical PA's two stacks, at the stage's front corners (the 1974 report's "front corners"). */
export const STACKS: Point[] = [
  { x: STAGE.minX, z: STAGE.front },
  { x: STAGE.maxX, z: STAGE.front },
];

/** The Wall: each channel from its own speakers. Garcia's main column and its extension carry one signal. */
export function wallSounds(): Sound[] {
  const cells = allCells();
  const at = (f: (c: (typeof cells)[number]) => boolean) =>
    mean(cells.filter(f).map((c) => ({ x: c.position[0], z: c.position[2] })));
  return (Object.keys(CHANNELS) as ChannelId[]).map((id) => ({
    id,
    color: CHANNELS[id].color,
    label: CHANNELS[id].label,
    emitters:
      id === 'leadGuitar'
        ? [at((c) => c.block === 'garcia'), at((c) => c.block === 'garcia-x')]
        : [at((c) => c.channel === id)],
  }));
}

/** The typical PA: the six systems, one mix, both stacks. */
export function paSounds(): Sound[] {
  const six: ChannelId[] = ['vocals', 'leadGuitar', 'rhythmGuitar', 'piano', 'drumsL', 'bass2'];
  return six.map((id) => ({ id, color: CHANNELS[id].color, label: CHANNELS[id].label, emitters: STACKS }));
}

/** A seat from its distance off the stage front and its angle off the centre line (radians, negative to the left). */
export function seatAt(r: number, angle: number): Seat {
  return { x: r * Math.sin(angle), z: STAGE.front + r * Math.cos(angle) };
}

/** The nearest seat to a point: inside the fan of the seating. */
export function clampSeat(p: Point): Seat {
  const dz = p.z - STAGE.front;
  const r = Math.min(SEATING.lastRow, Math.max(SEATING.firstRow, Math.hypot(p.x, dz)));
  const a = Math.max(-SEATING.halfAngle, Math.min(SEATING.halfAngle, Math.atan2(p.x, Math.max(dz, 0.001))));
  return seatAt(r, a);
}

/** Bearing of a point from the seat, radians: 0 straight up the plan toward the stage, negative to the left. */
const bearing = (s: Seat, p: Point) => Math.atan2(p.x - s.x, s.z - p.z);

/** How much of the seat's view the stage's width fills, degrees. */
export function stageSpanDeg(seat: Seat) {
  const left = bearing(seat, { x: STAGE.minX, z: STAGE.front });
  const right = bearing(seat, { x: STAGE.maxX, z: STAGE.front });
  return Math.abs(right - left) * (180 / Math.PI);
}

export interface Heard {
  /** Bearing the sound seems to come from. */
  angle: number;
  /** How far across the stage that is, as seen from the seat: 0 its left edge, 1 its right. */
  across: number;
  /** Milliseconds between the first and last arrival of this sound. */
  gapMs: number;
}

/** Where one sound seems to come from at a seat. */
export function heardFrom(seat: Seat, sound: Sound): Heard {
  const arrivals = sound.emitters
    .map((p) => ({ p, ms: (Math.hypot(p.x - seat.x, p.z - seat.z) / SPEED_OF_SOUND) * 1000 }))
    .sort((a, b) => a.ms - b.ms);
  const first = arrivals[0];
  const last = arrivals[arrivals.length - 1];
  const gapMs = last.ms - first.ms;
  let angle = bearing(seat, first.p);
  if (arrivals.length > 1 && gapMs < SUMMING_MS) {
    // Summing: from midway between them at no gap, to the first at 2 ms.
    const mid = (bearing(seat, first.p) + bearing(seat, last.p)) / 2;
    angle = mid + (bearing(seat, first.p) - mid) * (gapMs / SUMMING_MS);
  }
  const left = bearing(seat, { x: STAGE.minX, z: STAGE.front });
  const right = bearing(seat, { x: STAGE.maxX, z: STAGE.front });
  return { angle, across: Math.max(0, Math.min(1, (angle - left) / (right - left))), gapMs };
}

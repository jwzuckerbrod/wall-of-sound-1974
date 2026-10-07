import { wall } from '../data/wall.config';
import { bowlFrame, seatEye } from '../geometry/bowl';
/**
 * Named camera positions, so a screenshot can be reproduced exactly rather
 * than hand-orbited. Append ?view=oblique (and &hud=0) to the URL.
 *
 * Positions are metres in the scene frame: +Y up, +Z toward the audience,
 * origin at the centre of the stage deck on the wall's front face.
 */
export interface View {
  label: string;
  position: [number, number, number];
  target: [number, number, number];
  fov?: number;
  /**
   * Pull the camera back along its own view direction until the whole rig fits,
   * given the current aspect ratio. The declared position then only sets the
   * direction and the eye height. Without this, a portrait window crops the
   * ends off a 60-foot wall.
   */
  fit?: boolean;
  /**
   * This view claims to be a person standing on the stage. verify.mjs checks
   * that the eye really is inside the deck footprint and at human eye height,
   * so a view cannot silently drift off the front of the stage.
   */
  onDeck?: boolean;
}

export const VIEWS = {
  front: {
    label: 'Front, house centre',
    position: [0, 9, 38],
    target: [0, 7.5, -1],
    fov: 40,
    fit: true,
  },
  oblique: {
    label: 'Three-quarter, house left',
    position: [27, 13, 29],
    target: [0, 7, -2],
    fov: 40,
    fit: true,
  },
  close: {
    label: 'Close — the vocal cluster',
    position: [1.5, 6.2, 11],
    target: [0, 8.5, -1],
    fov: 46,
  },
  deck: {
    // Lesh's spot, eye height above the deck, looking back up at the Wall.
    // An earlier version put this at z = 6.4, which is past the downstage edge
    // — it was hovering over the crowd, not standing on the stage.
    // scripts/verify.mjs now enforces onDeck.
    label: 'On the deck, where the band stood',
    position: [-2.4, 4.67, 3.1],
    target: [0.4, 7.2, -2],
    fov: 66,
    onDeck: true,
  },
  aerial: {
    label: 'Above, showing the 64 × 40 footprint',
    position: [4, 33, 30],
    target: [0, 4, -4],
    fov: 38,
  },
  ground: {
    label: 'From the crowd',
    position: [0, 1.7, 52],
    target: [0, 8, 0],
    fov: 46,
    fit: true,
  },
} satisfies Record<string, View>;

export type ViewId = keyof typeof VIEWS;

export function viewFromSearch(search: string): { view: View; id: ViewId; hud: boolean } {
  const p = new URLSearchParams(search);
  const raw = p.get('view') ?? 'front';
  const id = (raw in VIEWS ? raw : 'front') as ViewId;
  return { view: VIEWS[id], id, hud: p.get('hud') !== '0' };
}

/**
 * A view as it stands at a venue. At the Hollywood Bowl the ground rises
 * toward the seats, so a view from the crowd is lifted to a seated eye in the
 * row it stands in, rather than left under the hill.
 */
export function viewIn(id: ViewId, venue: 'arena' | 'hollywoodBowl'): View {
  const v: View = VIEWS[id];
  if (venue !== 'hollywoodBowl') return v;
  const f = bowlFrame();
  const back = v.position[2] - f.front;
  if (back < V_FIRST_ROW) return v;
  const [x, y] = seatEye(v.position[0], back, f);
  return { ...v, position: [x, Math.max(v.position[1], y), v.position[2]] };
}

const V_FIRST_ROW = wall.venues.hollywoodBowl.seating.firstRow;

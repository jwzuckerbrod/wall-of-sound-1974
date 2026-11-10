/**
 * The guided tour: each stop a camera pose, a short piece of text, and (for
 * most) a dot on the model at `anchor` that flies there when clicked. The
 * first stop is the overview the page opens on; Next and Back walk the rest.
 *
 * The text is the accessible alternative as well as the caption — it is written
 * to stand on its own for somebody who cannot see the scene at all, which means
 * describing what is there rather than pointing at it ("to your left").
 */
import { FT, wall, type ChannelId } from '../data/wall.config';
import { allCells, blockBounds } from '../geometry/arrays';
import { rackFronts } from '../geometry/roadgear';

export interface TourStop {
  id: string;
  title: string;
  /** Read aloud and shown. Complete without the picture. */
  body: string;
  position: [number, number, number];
  target: [number, number, number];
  fov?: number;
  /** Where the stop's dot sits on the model, world frame. None: no dot (the overview, the close). */
  anchor?: [number, number, number];
  /** The sound system this stop is about, for "show only this system". */
  channel?: ChannelId;
}

const DECK = wall.dimensions.stageDeckHeight;

/** The middle of a speaker block's face, world frame: where its dot goes. */
function faceOf(blockId: string, lift = 0): [number, number, number] {
  const b = blockBounds(blockId, allCells());
  if (!b) return [0, DECK, 0];
  return [b.centre[0], DECK + b.centre[1] + lift, b.centre[2] + b.size[2] / 2 + 0.1];
}

const member = (id: string) => wall.band.members.find((m) => m.id === id)!;
const KEITH = member('keith');
const WEIR = member('weir');
/** Keith's bench: just past the grand's keyboard end, at a seated eye height. */
const BENCH_X = KEITH.x + wall.band.instruments.pianoKeyboardOffset + 0.45;

export const TOUR: TourStop[] = [
  {
    id: 'whole',
    title: 'The Wall of Sound',
    body:
      "In 1974 the Grateful Dead toured the largest sound system anyone had built: 641 speakers and 48 McIntosh amplifiers on a scaffold tower 38 feet 10 inches above the stage. It was six independent systems, not one PA, each carrying a single voice or instrument, so nothing was mixed together until it reached the air. It stood behind the band rather than in front of it, with no monitor speakers at all, and its singers sang into paired microphones that canceled the Wall's own sound. It played 37 shows between March 23 and October 20, 1974, and then it was taken apart. This is a reconstruction of it, built from photographs, the scaffolding drawings and the equipment that survives.",
    position: [0, DECK + 12, 52],
    target: [0, DECK + 6.5, -1],
    fov: 42,
  },
  {
    id: 'behind',
    title: 'Behind the band, not in front of it',
    body:
      'This is the idea the whole system exists for. The PA stands behind the musicians and they play with their backs to it, so the band hears exactly what the audience hears. There are no wedge monitors anywhere on this stage, because the Wall is the monitoring. The lower half fed the players; the upper half threw to the crowd.',
    position: [-2.4, DECK + 1.62, 3.1],
    target: [0.4, DECK + 4.2, -2],
    fov: 66,
    anchor: faceOf('weir', 1.2),
  },
  {
    id: 'mics',
    title: 'Singing in front of the Wall',
    body:
      'A microphone in front of twenty-six kilowatts of speakers should howl. These didn\'t. Each singer sang into a matched pair of microphones sixty millimeters apart, wired in opposite polarity. The voice reached the nearer one first and loudest, so it came through; the Wall\'s sound arrived at both equally, and canceled itself out.',
    // Close on the two capsules at the top of Weir's stand.
    position: [WEIR.x + 0.75, DECK + 1.62, WEIR.z + 1.15],
    target: [WEIR.x, DECK + 1.49, WEIR.z + 0.32],
    fov: 32,
    anchor: [WEIR.x, DECK + 1.62, WEIR.z + 0.32],
    channel: 'vocals',
  },
  {
    id: 'vocals',
    title: 'The vocal cluster',
    body:
      'Three hundred and seventy-two of the 641 drivers carried vocals alone — more than half the system. The center cluster curves toward the audience to spread the sound across roughly 140 to 180 degrees. Singers stood directly in front of twenty-six kilowatts without feedback, because each vocal microphone was a matched pair sixty millimeters apart wired in reverse polarity: the voice reached the near capsule first and survived, and everything arriving equally at both canceled.',
    position: [1.8, DECK + 4.4, 9.5],
    target: [0, DECK + 4.6, 0],
    anchor: faceOf('voc-um'),
    channel: 'vocals',
    fov: 50,
  },
  {
    id: 'bass',
    title: 'One bass, four channels',
    body:
      "Phil Lesh's bass ran quadraphonic — four independent channels, eight fifteen-inch speakers each, sixteen cabinets a side. Popular accounts say each of the four strings had its own channel and its own speakers. The 1974 spec sheet describes something subtler: three pickups into a quadraphonic encoder with sixteen selectable spatial arrangements. Four separate bass channels are certain; per-string routing is one plausible reading of them.",
    position: [12.5, DECK + 4.8, 8.5],
    target: [7.2, DECK + 4.4, -0.5],
    anchor: faceOf('bass4'),
    channel: 'bass1',
    fov: 52,
  },
  {
    id: 'kick',
    title: 'Sixteen fifteens for one kick drum',
    body:
      'Sixteen fifteen-inch speakers, in a single column at deck level beneath the vocal cluster, carrying nothing but the bass drum. That was the principle: no two things ever went through the same speaker, so nothing intermodulated with anything else. Snare, toms and cymbals ran separately again, in stereo, through their own three-way crossover.',
    position: [0, DECK + 1.9, 7.2],
    target: [0, DECK + 1.1, -1],
    anchor: faceOf('kick'),
    channel: 'kick',
    fov: 56,
  },
  {
    id: 'amps',
    title: 'Forty-eight McIntoshes',
    body:
      'Forty-eight McIntosh MC-2300 power amplifiers, racked at deck level behind the arrays, at 128 pounds each. Six hundred watts apiece: 28,800 watts installed, with the 1974 press sheet quoting 26,400 driven. They were named rather than numbered — Budman, M-14, Ketchup, Mustard — and the blue meters on their faces are what everyone who stood in front of this in the dark remembers.',
    position: [-6.5, DECK + 2.2, 6.0],
    target: [-1.5, DECK + 1.0, -1.6],
    // On the fifth rack from the left, the one in the shot.
    anchor: [rackFronts()[4][0], DECK + 1.2, wall.structure.amps.z + 0.3],
    fov: 54,
  },
  {
    id: 'structure',
    title: 'Two crews, leapfrogging',
    body:
      'Built with six-foot-six by five-foot end frames on seven-foot bays, from a drawing dated the tenth of April 1974. One hundred tubelocks, 275 couplers, six twenty-two-foot trusses, forty planks. There was one sound system and two identical scaffolding sets, so that the second crew had the frame standing before the first arrived with the PA — which is also why the band was often paying rent on two venues at once.',
    position: [10, DECK + 26, 30],
    target: [0, DECK + 2, -4],
    anchor: [FT(29), DECK + wall.dimensions.arrayHeight - 0.4, 0.3],
    fov: 40,
  },
  {
    id: 'piano',
    title: "At Keith's piano",
    body:
      "Keith Godchaux's seat, at the keyboard end of the grand, with the band and the Wall beside him. The piano had a system of its own: five Countryman pickups inside the grand into nine fifteen-inch speakers for the lows, twelve twelves for the mids and thirty-six five-inch speakers for the highs, in its own columns just behind him.",
    // Seated at the keys, looking along the grand toward the band, the Wall rising behind them.
    position: [BENCH_X, DECK + 1.2, KEITH.z + 0.05],
    target: [KEITH.x - 3.2, DECK + 1.35, KEITH.z - 0.4],
    fov: 64,
    anchor: [KEITH.x, DECK + 1.15, KEITH.z],
    channel: 'piano',
  },
  {
    id: 'cost',
    title: 'Seventy-five tons',
    body:
      'Seventy-five tons complete, four semi-trailers, a crew of twenty-one, and about four hours to build the sound system on top of four for the stage. It cost over 350,000 dollars in 1974, plus 100,000 a month to move and staff. It played thirty-seven shows between March twenty-third and October twentieth, 1974, and then it was taken apart.',
    position: [0, 1.7, 58],
    target: [0, DECK + 5, 0],
    fov: 46,
  },
];

export const tourStopIndex = (id: string) => Math.max(0, TOUR.findIndex((s) => s.id === id));

/** Height of the tallest thing, for framing sanity checks. */
export const TOUR_CEILING = wall.dimensions.totalHeight + FT(4);

/**
 * A camera pose for each instrument, for when it is clicked: a couple of
 * meters downstage of it, a little above, looking at it.
 */
export function instrumentPose(id: string): { position: [number, number, number]; target: [number, number, number]; fov: number } {
  const I = wall.band.instruments;
  const markOf = (m: string) => member(m);
  let x: number;
  let z: number;
  let h = 0.9;
  if (id === 'piano') ({ x, z } = markOf('keith'));
  else if (id === 'rhodes') {
    const k = markOf('keith');
    x = k.x + I.pianoKeyboardOffset + I.rhodesFromKeys[0];
    z = k.z - I.rhodesFromKeys[1];
  } else if (id === 'drums') {
    const d = markOf('kreutz');
    x = d.x;
    z = d.z - I.kitBack;
    h = 0.8;
  } else {
    ({ x, z } = markOf(id));
    h = 0.75;
  }
  const near = id === 'piano' ? 4.2 : 2.6;
  return { position: [x + 0.6, DECK + h + 0.9, z + near], target: [x, DECK + h, z], fov: 40 };
}

/**
 * The guided tour: eight stops, each a camera pose and a short piece of text.
 *
 * The text is the accessible alternative as well as the caption — it is written
 * to stand on its own for somebody who cannot see the scene at all, which means
 * describing what is there rather than pointing at it ("to your left").
 */
import { FT, wall } from '../data/wall.config';

export interface TourStop {
  id: string;
  title: string;
  /** Read aloud and shown. Complete without the picture. */
  body: string;
  position: [number, number, number];
  target: [number, number, number];
  fov?: number;
}

const DECK = wall.dimensions.stageDeckHeight;

export const TOUR: TourStop[] = [
  {
    id: 'whole',
    title: 'Sixty feet of speakers',
    body:
      'The Wall of Sound, as it stood in the summer of 1974. Six hundred and forty-one drivers across sixty feet, on a scaffold tower sixty-four feet wide and forty deep, thirty-eight feet ten inches to the top. The stage deck is ten feet off the ground, and the five figures on it are 1.75 metres tall.',
    position: [0, DECK + 10, 46],
    target: [0, DECK + 5, -1],
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
  },
  {
    id: 'vocals',
    title: 'The vocal cluster',
    body:
      'Three hundred and seventy-two of the 641 drivers carried vocals alone — more than half the system. The centre cluster curves toward the audience to spread the sound across roughly 140 to 180 degrees. Singers stood directly in front of twenty-six kilowatts without feedback, because each vocal microphone was a matched pair sixty millimetres apart wired in reverse polarity: the voice reached the near capsule first and survived, and everything arriving equally at both cancelled.',
    position: [1.8, DECK + 5.2, 9.5],
    target: [0, DECK + 5.4, 0],
    fov: 50,
  },
  {
    id: 'bass',
    title: 'One bass, four channels',
    body:
      "Phil Lesh's bass ran quadraphonic — four independent channels, eight fifteen-inch speakers each, sixteen cabinets a side. Popular accounts say each of the four strings had its own channel and its own speakers. The 1974 spec sheet describes something subtler: three pickups into a quadraphonic encoder with sixteen selectable spatial arrangements. Four separate bass channels are certain; per-string routing is one plausible reading of them.",
    position: [12.5, DECK + 3.4, 7.5],
    target: [7.2, DECK + 2.6, -0.5],
    fov: 52,
  },
  {
    id: 'kick',
    title: 'Sixteen fifteens for one kick drum',
    body:
      'Sixteen fifteen-inch speakers, in a single column at deck level beneath the vocal cluster, carrying nothing but the bass drum. That was the principle: no two things ever went through the same speaker, so nothing intermodulated with anything else. Snare, toms and cymbals ran separately again, in stereo, through their own three-way crossover.',
    position: [0, DECK + 1.9, 7.2],
    target: [0, DECK + 1.1, -1],
    fov: 56,
  },
  {
    id: 'amps',
    title: 'Forty-eight McIntoshes',
    body:
      'Forty-eight McIntosh MC-2300 power amplifiers, racked at deck level behind the arrays, at 128 pounds each. Six hundred watts apiece: 28,800 watts installed, with the 1974 press sheet quoting 26,400 driven. They were named rather than numbered — Budman, M-14, Ketchup, Mustard — and the blue meters on their faces are what everyone who stood in front of this in the dark remembers.',
    position: [-6.5, DECK + 2.2, 6.0],
    target: [-1.5, DECK + 1.0, -1.6],
    fov: 54,
  },
  {
    id: 'structure',
    title: 'Two crews, leapfrogging',
    body:
      'Built with six-foot-six by five-foot end frames on seven-foot bays, from a drawing dated the tenth of April 1974. One hundred tubelocks, 275 couplers, six twenty-two-foot trusses, forty planks. There was one sound system and two identical scaffolding sets, so that the second crew had the frame standing before the first arrived with the PA — which is also why the band was often paying rent on two venues at once.',
    position: [10, DECK + 26, 30],
    target: [0, DECK + 2, -4],
    fov: 40,
  },
  {
    id: 'cost',
    title: 'Seventy-five tons',
    body:
      'Seventy-five tons complete, four semi-trailers, a crew of twenty-one, and about four hours to build the sound system on top of four for the stage. It cost over 350,000 dollars in 1974, plus 100,000 a month to move and staff. It played thirty-seven shows between the twenty-third of March and the twentieth of October 1974, and then it was taken apart.',
    position: [0, 1.7, 58],
    target: [0, DECK + 5, 0],
    fov: 46,
  },
];

export const tourStopIndex = (id: string) => Math.max(0, TOUR.findIndex((s) => s.id === id));

/** Height of the tallest thing, for framing sanity checks. */
export const TOUR_CEILING = wall.dimensions.totalHeight + FT(4);

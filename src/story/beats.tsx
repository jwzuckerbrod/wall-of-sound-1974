import type { ReactNode } from 'react';
import { wall, CHANNELS, type SourceId } from '../data/wall.config';
import { IMAGES, type StoryImage } from './images';

/**
 * The story's eight beats (docs/story.md). Every figure is read from the
 * config, so the story can't drift from the model; every beat lists the
 * sources its facts come from.
 */

export type Motion =
  | 'hold'
  /** The second image fades in over the first as the reader scrolls. */
  | 'crossfade'
  /** A slow push in. */
  | 'push'
  /** The paired-microphone diagram draws itself over the image. */
  | 'diagram';

export interface Beat {
  id: string;
  /** One or two images; two only for a crossfade. */
  images: StoryImage[];
  motion: Motion;
  /** Each entry is one card that scrolls past over the image. */
  cards: ReactNode[];
  sources: SourceId[];
}

const S = wall.system;
const ft = (m: number) => {
  const inches = Math.round(m / 0.0254);
  return `${Math.floor(inches / 12)} feet ${inches % 12} inches`;
};
const day = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });

/** Beat 3's colour key: each system and its channels' colours, as the systems render paints them. */
const KEY: [string, string[]][] = [
  ['Vocals', [CHANNELS.vocals.color]],
  ["Garcia's guitar", [CHANNELS.leadGuitar.color]],
  ["Weir's guitar", [CHANNELS.rhythmGuitar.color]],
  ['Piano', [CHANNELS.piano.color]],
  ['Drums', [CHANNELS.kick.color, CHANNELS.drumsL.color, CHANNELS.drumsR.color]],
  ["Lesh's bass, four channels", [CHANNELS.bass1.color, CHANNELS.bass2.color, CHANNELS.bass3.color, CHANNELS.bass4.color]],
];

export const BEATS: Beat[] = [
  {
    id: 'real',
    images: [IMAGES.photoBowl, IMAGES.bowlPhotoMatch],
    motion: 'crossfade',
    sources: ['photos'],
    cards: [
      <>
        <p className="kicker">Sunday, 21 July 1974. The Hollywood Bowl.</p>
        <p>
          The Grateful Dead have brought the largest sound system anyone had built: a wall of speakers four storeys
          high, standing in front of the Bowl's shell.
        </p>
        <p>This is a photograph of it that afternoon.</p>
      </>,
      <>
        <p>This is our reconstruction, from the same seat.</p>
        <p className="aside">
          Built from scaffolding drawings, surviving equipment and every photograph we could date. Nothing here is
          from a film or a recording.
        </p>
      </>,
    ],
  },
  {
    id: 'whole',
    images: [IMAGES.bowlHero],
    motion: 'push',
    sources: ['wiki', 'deadsources22', 'blueprints', 'anderson'],
    cards: [
      <>
        <p className="figure">
          {wall.inventory.total} speakers. {S.amplifierCount} McIntosh amplifiers.
        </p>
        <p>
          A scaffold tower {ft(wall.dimensions.arrayHeight)} above a stage that stood ten feet off the ground.{' '}
          {S.weightTonsComplete} tons on the road, {S.weightTonsAudioOnly} of them the sound system alone.
        </p>
      </>,
      <>
        <p>
          It went up and came down at every show from {day(wall.meta.debut.date)} to {day(wall.meta.retired.date)}{' '}
          1974, and then never again.
        </p>
      </>,
    ],
  },
  {
    id: 'systems',
    images: [IMAGES.bowl, IMAGES.bowlSystems],
    motion: 'crossfade',
    sources: ['wiki', 'mcintosh', 'deadsources74'],
    cards: [
      <>
        <p className="figure">Six systems, not one.</p>
        <p>
          Each carried one thing: the vocals, Garcia's guitar, Weir's guitar, the piano, the drums, and Lesh's bass,
          which had four channels of its own.
        </p>
      </>,
      <>
        <ul className="key">
          {KEY.map(([label, colours]) => (
            <li key={label}>
              <span className="key-dots">
                {colours.map((c) => (
                  <i key={c} style={{ background: c }} />
                ))}
              </span>
              {label}
            </li>
          ))}
        </ul>
        <p>Nothing was mixed together until it reached the air. That is why it sounded so clear.</p>
        <p className="aside">
          How Lesh's four bass channels were split is disputed: one per string, or a quadraphonic mix of three
          pickups. The explorer shows both.
        </p>
      </>,
    ],
  },
  {
    id: 'monitor',
    images: [IMAGES.garcia],
    motion: 'hold',
    sources: ['wiki', 'deadsources74'],
    cards: [
      <>
        <p className="figure">Each player's own wall.</p>
        <p>
          There were no monitor speakers. The Wall was the monitor: each player stood in front of their own stack,
          its lower half playing to the band and its upper half throwing to the crowd.
        </p>
      </>,
      <>
        <p>Jerry Garcia's guitar came out of the columns behind him.</p>
      </>,
    ],
  },
  {
    id: 'singing',
    images: [IMAGES.clusterUp],
    motion: 'diagram',
    sources: ['wiki', 'mcintosh', 'deadsources74'],
    cards: [
      <>
        <p className="figure">The singing problem.</p>
        <p>
          A microphone in front of {Math.round(S.wattsQuoted1974 / 1000)} kilowatts of speakers should howl.
          Theirs didn't.
        </p>
      </>,
      <>
        <p>
          Each singer sang into a matched pair of microphones, 60 millimetres apart, wired in opposite polarity.
        </p>
        <p>The voice reached the near one first. The Wall reached both equally, and cancelled itself out.</p>
      </>,
    ],
  },
  {
    id: 'power',
    images: [IMAGES.amps],
    motion: 'hold',
    sources: ['mc2300', 'sothebys'],
    cards: [
      <>
        <p className="figure">
          {S.amplifierCount} McIntosh MC 2300s. {S.amplifierWattsMono} watts each, {S.amplifierWeightLb} pounds each.
        </p>
        <p className="aside">
          {S.amplifierCount} is the published count. Steve Parish, of the crew, remembers “over 70”.
        </p>
      </>,
      <>
        <p>
          The crew named them. One that drove Garcia's guitar was called Budman; Parish says Jerry played through it
          for years. It was sold at Sotheby's in 2021, still in its black road case.
        </p>
      </>,
    ],
  },
  {
    id: 'evidence',
    images: [IMAGES.bowlTower],
    motion: 'hold',
    sources: ['blueprints', 'deadsources74', 'sothebys', 'juliens', 'anderson', 'pechner', 'schneider'],
    cards: [
      <>
        <p className="figure">What we know, and how well.</p>
        <p>
          Nobody drew a plan of the Wall. This reconstruction is built from scaffolding drawings dated 10 April 1974,
          a press sheet from that year, the cabinets and amplifiers that survive, and every photograph we could date.
        </p>
      </>,
      <>
        <p>
          Where we're sure, it's solid. Where we've had to estimate, the explorer says so, and shows its sources.
        </p>
        <p className="links">
          <a href="https://github.com/jwzuckerbrod/wall-of-sound-1974/blob/master/docs/qa-findings.md">
            The photograph record
          </a>
          <a href="https://github.com/jwzuckerbrod/wall-of-sound-1974/blob/master/docs/surviving-gear.md">
            The surviving equipment
          </a>
        </p>
      </>,
    ],
  },
];

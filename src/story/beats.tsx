import type { ReactNode } from 'react';
import { wall, CHANNELS, CONFIDENCE_COLOURS, type SourceId } from '../data/wall.config';
import { IMAGES, type StoryImage } from './images';
import { ListenCompare, ListenWall } from '../ui/Listen';
import { MicDiagram } from './MicDiagram';
import { PathDiagram } from './PathDiagram';
import { SeatDiagram, SeatLink } from './SeatDiagram';

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
  | 'push';

export interface Beat {
  id: string;
  /** A short name for the section, shown on the analytics dashboard (jzuckerbrod.com/stats). */
  name: string;
  /** One or two images; two only for a crossfade. */
  images: StoryImage[];
  /** A crossfade's two ends, as named on the slider that lets the reader hold it anywhere. */
  compare?: [string, string];
  motion: Motion;
  /** Each entry is one card that scrolls past over the image. */
  cards: ReactNode[];
  sources: SourceId[];
  /** A diagram, as a figure of its own between the cards: after card `after`. */
  diagram?: { node: ReactNode; after: number; label: string; animated?: boolean };
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
    name: 'The photograph',
    images: [IMAGES.photoBowl, IMAGES.bowlPhotoMatch],
    compare: ['Photograph', 'Reconstruction'],
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
    name: 'The whole Wall',
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
      <>
        <p className="figure">Whose idea was it?</p>
        <p>
          Owsley “Bear” Stanley's. He conceived the Wall and led its design, with the band's sound crew, Dan Healy,
          Mark “Sparky” Raizene and Bob Matthews, and the engineers of Alembic: Ron Wickersham and John Curl on the
          electronics, Rick Turner on the instruments.
        </p>
      </>,
    ],
  },
  {
    id: 'systems',
    name: 'The separate systems',
    images: [IMAGES.bowl, IMAGES.bowlSystems],
    compare: ['The stage', 'Each system'],
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
    id: 'paths',
    name: 'One mix, or none',
    images: [IMAGES.bowlSystems],
    motion: 'hold',
    diagram: { node: <PathDiagram />, after: 0, label: 'signal-path' },
    sources: ['deadsources74', 'wiki', 'duncan1982', 'pell', 'coules2021'],
    cards: [
      <>
        <p className="figure">One mix, or none.</p>
        <p>
          On a typical stage of the early 1970s, every microphone ran out to a mixing desk in the crowd. It all came
          back as one mix, out of speaker stacks at the front corners of the stage. The players heard themselves
          through monitors fed from the same desk.
        </p>
        <p className="aside">
          Musicians on those stages, the band's 1974 technical report said, “don't really know how they sound.”
        </p>
      </>,
      <>
        <p className="figure">The Wall had no mixing desk.</p>
        <p>
          Each instrument went straight to its own amplifiers and its own speakers, behind the player who made the
          sound. The singers set their own levels, with a volume control on each microphone.
        </p>
        <p>The band heard exactly what the crowd heard.</p>
        <p className="aside">
          The typical PA here is a composite: practice varied from band to band and changed fast. One exception on
          the Wall: Ned Lagin's keyboard shared the vocal system.
        </p>
      </>,
    ],
  },
  {
    id: 'seats',
    name: 'Where the sound comes from',
    images: [IMAGES.bowlHero],
    motion: 'hold',
    diagram: { node: <SeatDiagram />, after: 0, label: 'seat', animated: false },
    sources: ['deadsources74', 'precedence'],
    cards: [
      <>
        <p className="figure">Where the sound comes from.</p>
        <p>
          On a typical PA, every instrument left the same two stacks. <SeatLink preset="front" side="pa">Sit in the
          middle</SeatLink> and the whole band seems to hang between them. <SeatLink preset="side" side="pa">Sit to one
          side</SeatLink> and it all comes from the nearer stack, with the far one arriving late.
        </p>
        <p>Drag your seat around the Bowl, and switch between the two.</p>
      </>,
      <>
        <p>
          <SeatLink side="wall">The Wall</SeatLink> spread its six systems across the stage, each from its own speakers, so from most seats the band
          had a width to it, with the voices in the middle.
        </p>
        <p className="aside">
          This is a rule of thumb, not a simulation: when one sound arrives from two places, you hear it between them
          if the gap is under about 2 milliseconds, and from the first beyond that; beyond about 50, the second is an
          echo. It counts arrival times only. The Wall's left-to-right order is our best reading of the photographs,
          not a documented plan.
        </p>
      </>,
    ],
  },
  {
    id: 'listen',
    name: 'Listen',
    images: [IMAGES.photoBowl],
    motion: 'hold',
    sources: ['tapes'],
    cards: [
      <>
        <p className="figure">Listen.</p>
        <p>This is the Wall that afternoon, taped on a cassette recorder in the crowd at the Bowl.</p>
        <ListenWall />
      </>,
      <>
        <p className="figure">The same songs, three years apart.</p>
        <p>
          The same taper recorded the band in Hollywood in 1971, before the Wall, with the same kind of microphone.
          Switch between them as they play.
        </p>
        <ListenCompare />
      </>,
    ],
  },
  {
    id: 'monitor',
    name: "Garcia's mark",
    images: [IMAGES.garciaMark],
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
    name: 'The singing problem',
    images: [IMAGES.clusterUp],
    motion: 'hold',
    diagram: {
      node: (
        <>
          <p className="dg-read">
            The coloured arcs are the singer's voice, reaching the near microphone. The grey-blue lines are the Wall's
            sound, reaching both microphones at once.
          </p>
          <MicDiagram />
        </>
      ),
      after: 0,
      label: 'paired-microphone',
    },
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
    name: 'The power: 48 McIntoshes',
    images: [IMAGES.ampsClose],
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
    name: 'The evidence',
    images: [IMAGES.bowl, IMAGES.bowlEvidence],
    compare: ['The stage', 'How sure we are'],
    motion: 'crossfade',
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
        <ul className="key key-single">
          <li><span className="key-dots"><i style={{ background: CONFIDENCE_COLOURS.confirmed }} /></span><span>Confirmed: the scaffold, from its drawings</span></li>
          <li><span className="key-dots"><i style={{ background: CONFIDENCE_COLOURS.estimated }} /></span><span>Estimated: where each stack stood, the stage at the Bowl</span></li>
          <li><span className="key-dots"><i style={{ background: CONFIDENCE_COLOURS.guessed }} /></span><span>Guessed: where the bass-drum column stood</span></li>
        </ul>
        <p>
          The counts are firm: {wall.inventory.total} speakers, from an itemised list. Their arrangement is the
          reconstruction's biggest invention, and the explorer says so, part by part, with its sources.
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

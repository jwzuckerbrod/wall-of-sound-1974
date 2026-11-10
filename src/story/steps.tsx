import type { ReactNode } from 'react';
import { CONFIDENCE_COLOURS, wall, type ChannelId, type SourceId } from '../data/wall.config';
import type { ColorMode } from '../scene/Arrays';
import type { CompareId } from '../scene/ScaleObjects';
import type { Pose } from '../scene/TourCamera';
import { TOUR } from '../scene/tour';
import { COMPARE_VIEW, standIn, viewIn } from '../scene/views';
import { ListenCompare, ListenWall } from '../ui/Listen';
import { DiagramFigure } from './DiagramFigure';
import { IMAGES, type StoryImage } from './images';
import { MicDiagram } from './MicDiagram';
import { PathDiagram } from './PathDiagram';
import { SeatDiagram, SeatLink } from './SeatDiagram';

/**
 * The story, in steps (docs/story.md): three acts and a coda, told over the
 * live model. A step flies the camera and sets what the model shows, or lays a
 * still over it (photographs are evidence, so they stay photographs), or opens
 * a diagram or the players full-screen. Every figure is read from the config,
 * so the story can't drift from the model; every step lists its sources.
 */

const VENUE = 'hollywoodBowl' as const;
const S = wall.system;
const stop = (id: string): Pose => TOUR.find((t) => t.id === id)!;
const usd = (n: number) => `$${n.toLocaleString('en-US')}`;
const day = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', { month: 'long', day: 'numeric' });

export interface Step {
  id: string;
  /** Its name on the analytics dashboard. */
  name: string;
  act: string;
  /** Where the camera flies. Absent: the camera stays where the last step left it. */
  pose?: (portrait: boolean) => Pose;
  still?: StoryImage;
  /** A diagram or the players: the card takes the whole screen, over the dimmed picture. */
  full?: boolean;
  colorMode?: ColorMode;
  isolated?: ChannelId;
  compare?: CompareId;
  /** How far apart the Wall stands on arrival (0 to 1). */
  explode?: number;
  /** The one thing this step lets the reader do, in the card. */
  control?: 'systems' | 'explode';
  sources: SourceId[];
  body: ReactNode;
}

const DECK = wall.dimensions.stageDeckHeight;
const WIDE: Pose = { position: [-14, 9, 44], target: [0, 9, 0], fov: 42 };
/** Back and a little above, with room for the Wall to come apart. */
const APART: Pose = { position: [-12, 12, 34], target: [0, 9, 0], fov: 46 };
const APART_TALL: Pose = { position: [-12, 17, 54], target: [0, 9, 0], fov: 46 };
const SEATS: Pose = { position: [0, 6, 40], target: [0, 9.5, 0], fov: 40 };
/** In front of Garcia's mark, looking back past it and up his columns. */
const GARCIA: Pose = { position: [-3.4, DECK + 1.7, 10.5], target: [-6.2, DECK + 5.2, 0], fov: 58 };

const ACT1 = 'Act 1 · The problem';
const ACT2 = 'Act 2 · The machine';
const ACT3 = 'Act 3 · The cost, and the end';

export const STEPS: Step[] = [
  {
    id: 'title',
    name: 'Title',
    act: 'A reconstruction',
    sources: [],
    still: IMAGES.photoBowl,
    body: (
      <>
        <h1>The Wall of Sound</h1>
        <p className="dek">The Grateful Dead's sound system, summer 1974</p>
      </>
    ),
  },
  {
    id: 'hook',
    name: 'The photograph',
    act: ACT1,
    sources: ['photos', 'upa', 'wiki'],
    still: IMAGES.photoBowl,
    body: (
      <>
        <p className="kicker">Sunday, July 21, 1974. The Hollywood Bowl.</p>
        <p>
          For {wall.meta.showCount} shows in 1974 the Grateful Dead carried {S.weightTonsComplete} tons of sound system
          from city to city. Nothing had sounded like it. By October it was gone.
        </p>
      </>
    ),
  },
  {
    id: 'before',
    name: 'Before the Wall',
    act: ACT1,
    still: IMAGES.photoBowl,
    full: true,
    sources: ['deadsources74', 'wiki', 'duncan1982', 'pell', 'coules2021'],
    body: (
      <>
        <p className="figure">Before the Wall.</p>
        <p>
          At a typical concert of the early 1970s, before the Wall existed, every microphone ran to one mixing desk in
          the crowd. It all came back as one mix, out of two speaker stacks at the corners of the stage. Musicians on
          those stages, the band's 1974 technical report said, “don't really know how they sound.”
        </p>
        <DiagramFigure label="signal-path">
          <PathDiagram />
        </DiagramFigure>
        <p className="aside">
          The typical PA here is a composite: practice varied from band to band and changed fast.
        </p>
      </>
    ),
  },
  {
    id: 'bear',
    name: "Bear's answer",
    act: ACT1,
    sources: ['wiki', 'deadsources22', 'mcintosh'],
    pose: () => WIDE,
    body: (
      <>
        <p className="figure">Bear's answer: no mix at all.</p>
        <p>
          Owsley “Bear” Stanley wanted every instrument to have its own speakers, standing behind the band. The first
          try, at Stanford in February 1973, blew its tweeters during the first number. With the band's sound crew
          and the engineers of Alembic, he had this standing at the Cow Palace by {day(wall.meta.debut.date)} 1974.
        </p>
      </>
    ),
  },
  {
    id: 'whole',
    name: 'The whole Wall',
    act: ACT2,
    sources: ['wiki', 'deadsources22', 'blueprints'],
    pose: (portrait) => standIn(portrait ? { ...COMPARE_VIEW, position: [-1, 2.4, 68], fov: 40 } : COMPARE_VIEW, VENUE),
    compare: 'bus',
    body: (
      <>
        <p className="figure">
          {wall.inventory.total} speakers. {S.amplifierCount} amplifiers. Four stories.
        </p>
        <p>
          {S.weightTonsComplete} tons on the road. Those are four Volkswagen buses, for scale; they weren't there.
        </p>
      </>
    ),
  },
  {
    id: 'systems',
    name: 'The separate systems',
    act: ACT2,
    sources: ['wiki', 'mcintosh', 'deadsources74'],
    pose: () => SEATS,
    colorMode: 'channel',
    control: 'systems',
    body: (
      <>
        <p className="figure">Six systems, not one.</p>
        <p>
          Vocals, both guitars, the piano, the drums and the bass each had their own. Nothing was mixed together until
          it reached the air. Tap one to see it alone.
        </p>
      </>
    ),
  },
  {
    id: 'apart',
    name: 'Pull it apart',
    act: ACT2,
    sources: ['deadsources74', 'photos', 'derived'],
    pose: (portrait) => (portrait ? APART_TALL : APART),
    colorMode: 'channel',
    explode: 0.6,
    control: 'explode',
    body: (
      <>
        <p className="figure">Pull it apart.</p>
        <p>They were separate stacks of speakers, standing side by side. Drag to take the Wall apart and put it back.</p>
        <p className="aside">How the stacks were ordered across the stage is our best reading of the photographs.</p>
      </>
    ),
  },
  {
    id: 'garcia',
    name: "Garcia's mark",
    act: ACT2,
    sources: ['wiki', 'deadsources74', 'anderson'],
    pose: () => GARCIA,
    colorMode: 'channel',
    isolated: 'leadGuitar',
    body: (
      <>
        <p className="figure">Each player's own wall.</p>
        <p>
          There were no monitor speakers. Stand where Jerry Garcia stood: his guitar came out of the columns behind
          him, lit here, and the band heard exactly what the crowd heard.
        </p>
      </>
    ),
  },
  {
    id: 'mics',
    name: 'The singing problem',
    act: ACT2,
    sources: ['wiki', 'mcintosh', 'deadsources74'],
    pose: () => stop('mics'),
    body: (
      <>
        <p className="figure">The singing problem.</p>
        <p>
          A microphone in front of {Math.round(S.wattsQuoted1974 / 1000)} kilowatts should howl. Each singer sang into
          two, wired in opposite polarity.
        </p>
      </>
    ),
  },
  {
    id: 'cancel',
    name: 'The paired microphones',
    act: ACT2,
    sources: ['wiki', 'mcintosh', 'deadsources74'],
    full: true,
    body: (
      <>
        <p className="figure">The voice reached one. The Wall reached both, and canceled itself out.</p>
        <DiagramFigure label="paired-microphone">
          <p className="dg-read">
            The colored arcs are the singer's voice, reaching the near microphone. The gray-blue lines are the Wall's
            sound, reaching both microphones at once.
          </p>
          <MicDiagram />
        </DiagramFigure>
      </>
    ),
  },
  {
    id: 'seats',
    name: 'Where the sound comes from',
    act: ACT2,
    sources: ['deadsources74', 'precedence'],
    pose: () => SEATS,
    colorMode: 'channel',
    full: true,
    body: (
      <>
        <p className="figure">What it did for the crowd.</p>
        <p>
          On a typical PA the whole band came from two stacks. <SeatLink side="wall">The Wall</SeatLink> spread its six
          systems across the stage, so from most seats the band had a width to it. Drag your seat around the Bowl.
        </p>
        <SeatDiagram />
        <p className="aside">
          A rule of thumb, not a simulation: it counts arrival times only. The Wall's left-to-right order is our best
          reading of the photographs, not a documented plan.
        </p>
      </>
    ),
  },
  {
    id: 'listen',
    name: 'Listen',
    act: ACT2,
    sources: ['tapes'],
    still: IMAGES.photoBowl,
    full: true,
    body: (
      <>
        <p className="figure">Now listen.</p>
        <p>This is the Wall that afternoon, taped on a cassette recorder in the crowd at the Bowl.</p>
        <ListenWall />
        <p>
          The same taper recorded the band in Hollywood in 1971, before the Wall, with the same kind of microphone.
          Switch between them as they play.
        </p>
        <ListenCompare />
      </>
    ),
  },
  {
    id: 'cost',
    name: 'What it took',
    act: ACT3,
    sources: ['upa', 'mixtest', 'anderson', 'deadsources22', 'wiki'],
    pose: () => stop('structure'),
    body: (
      <>
        <p className="figure">What it took.</p>
        <p>
          Over {usd(S.buildCostUsd1974)} to build. Two identical scaffolds leapfrogged from city to city, so one was
          standing when the speakers arrived. {S.crew} people to load it, {S.setupHours.stage} hours for the stage and{' '}
          {S.setupHours.sound} more for the sound, and {usd(S.transportLabourUsdPerMonth)} a month to move.
        </p>
      </>
    ),
  },
  {
    id: 'amps',
    name: 'The power: 48 McIntoshes',
    act: ACT3,
    sources: ['mc2300', 'mcintosh', 'anderson'],
    pose: () => stop('amps'),
    body: (
      <>
        <p>
          {S.amplifierCount} McIntosh MC 2300 amplifiers, {S.amplifierWattsMono} watts and {S.amplifierWeightLb} pounds
          each, carried in and racked at every show.
        </p>
        <p className="aside">
          {S.amplifierCount} is the published count. Steve Parish, of the crew, remembers “over 70”.
        </p>
      </>
    ),
  },
  {
    id: 'end',
    name: 'The last night',
    act: ACT3,
    pose: (portrait) => (portrait ? APART_TALL : APART),
    explode: 1,
    sources: ['wiki', 'deadsources22', 'upa'],
    body: (
      <>
        <p className="figure">The last night.</p>
        <p>
          It played {wall.meta.showCount} shows. The last were at {wall.meta.retired.venue}, {wall.meta.retired.run}.
          Seven months after it first stood, the Wall was taken apart, and then never again.
        </p>
      </>
    ),
  },
  {
    id: 'left',
    name: "What's left",
    act: ACT3,
    still: IMAGES.ampsClose,
    sources: ['sothebys', 'juliens', 'mc2300'],
    body: (
      <>
        <p className="figure">What's left.</p>
        <p>
          The crew named the amplifiers. One that drove Garcia's guitar was called Budman; Parish says Jerry played
          through it for years. It was sold at Sotheby's in 2021, still in its black road case, with a handful of the
          Wall's speaker cabinets.
        </p>
        <p className="links">
          <a href="https://github.com/jwzuckerbrod/wall-of-sound-1974/blob/master/docs/surviving-gear.md">
            The surviving equipment
          </a>
        </p>
      </>
    ),
  },
  {
    id: 'evidence',
    name: 'The evidence',
    act: 'Coda · How we know',
    still: IMAGES.bowlEvidence,
    sources: ['blueprints', 'deadsources74', 'sothebys', 'juliens', 'anderson', 'pechner', 'schneider'],
    body: (
      <>
        <p className="figure">What we know, and how well.</p>
        <p>
          Nobody drew a plan of the Wall. This reconstruction is built from scaffolding drawings dated April 10, 1974, a
          press sheet from that year, the equipment that survives, and every photograph we could date.
        </p>
        <ul className="key key-single">
          <li><span className="key-dots"><i style={{ background: CONFIDENCE_COLOURS.confirmed }} /></span><span>Confirmed: the scaffold, from its drawings</span></li>
          <li><span className="key-dots"><i style={{ background: CONFIDENCE_COLOURS.estimated }} /></span><span>Estimated: where each stack stood, the stage at the Bowl</span></li>
          <li><span className="key-dots"><i style={{ background: CONFIDENCE_COLOURS.guessed }} /></span><span>Guessed: where the bass-drum column stood</span></li>
        </ul>
        <p className="links">
          <a href="https://github.com/jwzuckerbrod/wall-of-sound-1974/blob/master/docs/qa-findings.md">
            The photograph record
          </a>
        </p>
      </>
    ),
  },
  {
    id: 'inside',
    name: 'Step inside',
    act: 'Coda',
    sources: [],
    pose: () => viewIn('front', VENUE),
    body: (
      <>
        <p className="figure">Step inside.</p>
        <p>
          It's yours now. Turn it, walk the stage, climb the tower. Every speaker block opens to show what it carried,
          and how sure we are of it.
        </p>
      </>
    ),
  },
];

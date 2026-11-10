import { Canvas, useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import * as THREE from 'three';
import { wall, type ChannelId } from '../data/wall.config';
import { detectTier, tierSettings } from '../quality';
import type { ArrayInteraction, ColorMode } from '../scene/Arrays';
import { Post } from '../scene/Post';
import { Scene, sceneDefaults } from '../scene/Scene';
import type { CompareId } from '../scene/ScaleObjects';
import type { Pose } from '../scene/TourCamera';
import { TOUR } from '../scene/tour';
import { COMPARE_VIEW, standIn, viewIn } from '../scene/views';
import { IMAGES, srcOf, type StoryImage } from '../story/images';
import { DiagramFigure } from '../story/DiagramFigure';
import { MicDiagram } from '../story/MicDiagram';
import { PathDiagram } from '../story/PathDiagram';
import { SeatDiagram, SeatLink } from '../story/SeatDiagram';
import { ListenCompare } from '../ui/Listen';

/**
 * A mockup of the story told over the live model (docs/story.md, "the story in
 * three acts"). One canvas is pinned behind the page. Each beat either flies
 * its camera somewhere and sets what the model shows, or lays a still over it
 * (photographs are evidence, so they stay photographs). The last beat hands the
 * camera to the reader. Dev only: live.html is not built or published.
 */

const VENUE = 'hollywoodBowl' as const;
const S = wall.system;
const stop = (id: string): Pose => TOUR.find((t) => t.id === id)!;

interface LiveBeat {
  id: string;
  act: string;
  /** Where the camera flies. Absent: the beat is a still, and the camera stays put behind it. */
  pose?: (portrait: boolean) => Pose;
  still?: StoryImage;
  /** A still that doesn't exist yet: what it would be. */
  placeholder?: string;
  colorMode?: ColorMode;
  isolated?: ChannelId;
  compare?: CompareId;
  body: ReactNode;
}

const WIDE: Pose = { position: [-14, 9, 44], target: [0, 9, 0], fov: 42 };
const DECK = wall.dimensions.stageDeckHeight;
/** In front of Garcia's mark, looking back past it and up his columns. */
const GARCIA: Pose = { position: [-3.4, DECK + 1.7, 10.5], target: [-6.2, DECK + 5.2, 0], fov: 58 };
const SEATS: Pose = { position: [0, 6, 40], target: [0, 9.5, 0], fov: 40 };

const BEATS: LiveBeat[] = [
  {
    id: 'hook',
    act: 'Act 1 · The problem',
    still: IMAGES.photoBowl,
    body: (
      <>
        <p className="kicker">Sunday, 21 July 1974. The Hollywood Bowl.</p>
        <p>
          For {wall.meta.showCount} shows in 1974 the Grateful Dead carried {S.weightTonsComplete} tons of sound system
          from city to city. Nothing had ever sounded like it. By October it was gone.
        </p>
      </>
    ),
  },
  {
    id: 'before',
    act: 'Act 1 · The problem',
    still: IMAGES.title,
    placeholder: 'Picture to come: a typical stage of the early 1970s',
    body: (
      <>
        <p className="figure">What a concert sounded like.</p>
        <p>
          Every microphone ran to one mixing desk in the crowd and came back as one mix, out of two stacks at the
          corners of the stage. The players, the band's own report said, “don't really know how they sound.”
        </p>
        <DiagramFigure label="signal-path">
          <PathDiagram />
        </DiagramFigure>
      </>
    ),
  },
  {
    id: 'bear',
    act: 'Act 1 · The problem',
    pose: () => WIDE,
    body: (
      <>
        <p className="figure">Bear's answer: no mix at all.</p>
        <p>
          Owsley “Bear” Stanley wanted every instrument to have its own speakers, standing behind the band. The first
          try, at Stanford in February 1973, blew its tweeters during the first number.
        </p>
        <p>A year later, this stood at the Cow Palace.</p>
      </>
    ),
  },
  {
    id: 'whole',
    act: 'Act 2 · The machine',
    pose: (portrait) => standIn(portrait ? { ...COMPARE_VIEW, position: [-1, 2.4, 68], fov: 40 } : COMPARE_VIEW, VENUE),
    compare: 'bus',
    body: (
      <>
        <p className="figure">
          {wall.inventory.total} speakers. {S.amplifierCount} amplifiers. Four storeys.
        </p>
        <p>Those are Volkswagen buses, for scale.</p>
      </>
    ),
  },
  {
    id: 'systems',
    act: 'Act 2 · The machine',
    pose: () => SEATS,
    colorMode: 'channel',
    body: (
      <>
        <p className="figure">Six systems, not one.</p>
        <p>
          Vocals, Garcia's guitar, Weir's guitar, the piano, the drums, and Lesh's bass on four channels of its own.
          Nothing was mixed together until it reached the air.
        </p>
      </>
    ),
  },
  {
    id: 'garcia',
    act: 'Act 2 · The machine',
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
    act: 'Act 2 · The machine',
    pose: () => stop('mics'),
    body: (
      <>
        <p className="figure">The singing problem.</p>
        <p>
          A microphone in front of {Math.round(S.wattsQuoted1974 / 1000)} kilowatts should howl. Each singer sang into
          two, wired in opposite polarity. The voice reached one; the Wall reached both, and cancelled itself out.
        </p>
        <DiagramFigure label="paired-microphone">
          <MicDiagram />
        </DiagramFigure>
      </>
    ),
  },
  {
    id: 'seats',
    act: 'Act 2 · The machine',
    pose: () => SEATS,
    colorMode: 'channel',
    body: (
      <>
        <p className="figure">What it did for the crowd.</p>
        <p>
          On a typical PA the whole band came from two stacks. <SeatLink side="wall">The Wall</SeatLink> spread its six
          systems across the stage, so from most seats the band had a width to it. Drag your seat around the Bowl.
        </p>
        <SeatDiagram />
      </>
    ),
  },
  {
    id: 'listen',
    act: 'Act 2 · The machine',
    still: IMAGES.photoBowl,
    body: (
      <>
        <p className="figure">Now listen.</p>
        <p>The same songs, the same taper, three years apart: before the Wall, and through it.</p>
        <ListenCompare />
      </>
    ),
  },
  {
    id: 'cost',
    act: 'Act 3 · The cost, and the end',
    pose: () => stop('structure'),
    body: (
      <>
        <p className="figure">What it took.</p>
        <p>
          ${S.buildCostUsd1974.toLocaleString('en-US')} to build. Two identical scaffolds leapfrogging from city to
          city, {S.crew} people to load it, ${S.transportLabourUsdPerMonth.toLocaleString('en-US')} a month to move.
        </p>
      </>
    ),
  },
  {
    id: 'amps',
    act: 'Act 3 · The cost, and the end',
    pose: () => stop('amps'),
    body: (
      <>
        <p>
          {S.amplifierCount} McIntosh amplifiers, {S.amplifierWeightLb} pounds each. The crew named them. The one that
          drove Garcia's guitar was Budman.
        </p>
      </>
    ),
  },
  {
    id: 'end',
    act: 'Act 3 · The cost, and the end',
    still: IMAGES.bowlHero,
    placeholder: 'Picture to come: the last night, the Wall coming down',
    body: (
      <>
        <p className="figure">The last night.</p>
        <p>
          Winterland, San Francisco, 20 October 1974. Seven months after its first show, the Wall came down for the
          last time.
        </p>
        <p className="aside">Why it ended, and what came after: to be written, once sourced.</p>
      </>
    ),
  },
  {
    id: 'inside',
    act: 'Coda',
    pose: () => viewIn('front', VENUE),
    body: (
      <>
        <p className="figure">Step inside.</p>
        <p>It's yours now. Turn it, walk the stage, climb the tower.</p>
      </>
    ),
  },
];

function Fps() {
  const el = useRef<HTMLElement | null>(null);
  const n = useRef({ frames: 0, t: 0 });
  useFrame((_, dt) => {
    el.current ??= document.getElementById('live-fps');
    n.current.frames++;
    n.current.t += dt;
    if (n.current.t >= 0.5) {
      if (el.current) el.current.textContent = `${Math.round(n.current.frames / n.current.t)} fps`;
      n.current = { frames: 0, t: 0 };
    }
  });
  return null;
}

const noop = () => {};

export function Live() {
  const [active, setActive] = useState(0);
  const [free, setFree] = useState(false);
  const [portrait, setPortrait] = useState(() => window.innerHeight > window.innerWidth);
  const tier = useMemo(detectTier, []);
  const q = tierSettings(tier);
  const cards = useRef<(HTMLElement | null)[]>([]);

  // The beat whose card is nearest the reading line owns the picture.
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      // The last card whose top has come up past the line: a tall card (a diagram) keeps the picture while it's read.
      const line = window.innerHeight * 0.85;
      let best = 0;
      cards.current.forEach((c, i) => {
        if (c && c.getBoundingClientRect().top < line) best = i;
      });
      setActive(best);
      setPortrait(window.innerHeight > window.innerWidth);
    };
    const on = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', on);
    return () => {
      window.removeEventListener('scroll', on);
      window.removeEventListener('resize', on);
      cancelAnimationFrame(frame);
    };
  }, []);

  // Exploring: the page stops scrolling, so the wheel and a finger only turn and zoom the model,
  // and the story is still where it was left on the way back.
  useEffect(() => {
    if (!free) return;
    const at = window.scrollY;
    document.documentElement.classList.add('live-locked');
    return () => {
      document.documentElement.classList.remove('live-locked');
      window.scrollTo(0, at);
    };
  }, [free]);

  const beat = BEATS[active];
  // A still keeps the camera where the last live beat left it, or sends it ahead to the next one.
  const pose = useMemo(() => {
    for (let i = active; i >= 0; i--) if (BEATS[i].pose) return BEATS[i].pose!(portrait);
    return BEATS.find((b) => b.pose)!.pose!(portrait);
  }, [active, portrait]);

  const interaction: ArrayInteraction = useMemo(
    () => ({ hovered: null, selected: null, isolated: free ? null : (beat.isolated ?? null), explode: 0, onHover: noop, onSelect: noop }),
    [beat.isolated, free],
  );
  const view = useMemo(() => viewIn('front', VENUE), []);
  // Lift the model clear of the card: above it on a phone, beside it on a wide screen.
  const offset = free ? { room: 0, up: 0 } : portrait ? { room: 0, up: Math.round(window.innerHeight * 0.17) } : { room: 380, up: 0 };

  return (
    <div className={`live${free ? ' free' : ''}`}>
      <div className="live-canvas">
        <Canvas
          shadows={q.shadowMapSize > 0}
          dpr={[1, q.pixelRatioCap]}
          gl={{ antialias: tier === 'low', powerPreference: 'high-performance' }}
          camera={{ position: pose.position, fov: pose.fov ?? 42, near: 0.1, far: 600 }}
          onCreated={({ gl }) => {
            gl.outputColorSpace = THREE.SRGBColorSpace;
          }}
        >
          <Scene
            {...sceneDefaults}
            venue={VENUE}
            colorMode={free ? 'material' : (beat.colorMode ?? 'material')}
            compare={free ? null : (beat.compare ?? null)}
            view={view}
            tier={tier}
            navMode={free ? 'orbit' : 'tour'}
            pose={pose}
            interaction={interaction}
            activeStop={null}
            dots={false}
            onPickStop={noop}
            onPickInstrument={noop}
            offset={offset}
            maxDistance={110}
          />
          <Post tier={tier} />
          <Fps />
        </Canvas>
      </div>

      {/* Stills lie over the model and fade away to show it. */}
      {BEATS.map((b, i) =>
        b.still ? (
          <figure key={b.id} className="live-still" data-on={(!free && i === active) || undefined} aria-hidden={i !== active}>
            <img {...srcOf(b.still)} sizes="100vw" alt={b.still.alt} style={{ objectPosition: b.still.focus }} />
            {b.placeholder && <figcaption>{b.placeholder}</figcaption>}
          </figure>
        ) : null,
      )}

      <span id="live-fps" className="live-fps" />
      <p className="live-tag">Mockup · working copy</p>

      {free && (
        <button className="live-back" onClick={() => setFree(false)}>
          Back to the story
        </button>
      )}
      {
        <main className="live-flow" inert={free}>
          <header className="live-title">
            <p className="eyebrow">A reconstruction</p>
            <h1>The Wall of Sound</h1>
            <p className="dek">The Grateful Dead's sound system, summer 1974</p>
          </header>
          {BEATS.map((b, i) => (
            <section key={b.id} className="live-beat" id={b.id}>
              <div className="live-card" ref={(el) => void (cards.current[i] = el)} data-on={i === active || undefined}>
                <p className="live-act">
                  {b.act} <span>{b.still ? (b.still.kind === 'photograph' && !b.placeholder ? 'Photograph' : 'Still') : 'Live model'}</span>
                </p>
                {b.body}
                {b.id === 'inside' && (
                  <button className="live-go" onClick={() => setFree(true)}>
                    Explore it yourself
                  </button>
                )}
              </div>
            </section>
          ))}
        </main>
      }
    </div>
  );
}

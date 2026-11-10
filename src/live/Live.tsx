import { Canvas, useFrame } from '@react-three/fiber';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
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
 * three acts"), as steps, not a scrolling page: the page never scrolls, so every
 * drag and wheel turn belongs to the model, and the reader can look around at
 * any step. Next and Back (buttons, arrow keys, a swipe on the card) move
 * between steps. A step flies the camera and sets what the model shows, or lays
 * a still over it (photographs are evidence, so they stay photographs), or
 * opens a diagram or the players full-screen. Dev only: live.html is not built
 * or published.
 */

const VENUE = 'hollywoodBowl' as const;
const S = wall.system;
const stop = (id: string): Pose => TOUR.find((t) => t.id === id)!;

interface Step {
  id: string;
  act: string;
  /** Where the camera flies. Absent: the camera stays where the last step left it. */
  pose?: (portrait: boolean) => Pose;
  still?: StoryImage;
  /** A still that doesn't exist yet: what it would be. */
  placeholder?: string;
  /** A diagram or the players: the card takes the whole screen, over the dimmed picture. */
  full?: boolean;
  colorMode?: ColorMode;
  isolated?: ChannelId;
  compare?: CompareId;
  body: ReactNode;
}

const DECK = wall.dimensions.stageDeckHeight;
const WIDE: Pose = { position: [-14, 9, 44], target: [0, 9, 0], fov: 42 };
const SEATS: Pose = { position: [0, 6, 40], target: [0, 9.5, 0], fov: 40 };
/** In front of Garcia's mark, looking back past it and up his columns. */
const GARCIA: Pose = { position: [-3.4, DECK + 1.7, 10.5], target: [-6.2, DECK + 5.2, 0], fov: 58 };

const ACT1 = 'Act 1 · The problem';
const ACT2 = 'Act 2 · The machine';
const ACT3 = 'Act 3 · The cost, and the end';

const STEPS: Step[] = [
  {
    id: 'title',
    act: 'A reconstruction',
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
    act: ACT1,
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
    act: ACT1,
    still: IMAGES.title,
    placeholder: 'Picture to come: a typical stage of the early 1970s',
    body: (
      <>
        <p className="figure">What a concert sounded like.</p>
        <p>
          Every microphone ran to one mixing desk in the crowd and came back as one mix, out of two stacks at the
          corners of the stage. The players, the band's own report said, “don't really know how they sound.”
        </p>
      </>
    ),
  },
  {
    id: 'path',
    act: ACT1,
    still: IMAGES.title,
    full: true,
    body: (
      <>
        <p className="figure">One mix, or none.</p>
        <DiagramFigure label="signal-path">
          <PathDiagram />
        </DiagramFigure>
      </>
    ),
  },
  {
    id: 'bear',
    act: ACT1,
    pose: () => WIDE,
    body: (
      <>
        <p className="figure">Bear's answer: no mix at all.</p>
        <p>
          Owsley “Bear” Stanley wanted every instrument to have its own speakers, standing behind the band. The first
          try, at Stanford in February 1973, blew its tweeters during the first number. A year later, this stood at
          the Cow Palace.
        </p>
      </>
    ),
  },
  {
    id: 'whole',
    act: ACT2,
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
    act: ACT2,
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
    act: ACT2,
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
    act: ACT2,
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
    act: ACT2,
    full: true,
    body: (
      <>
        <p className="figure">The voice reached one. The Wall reached both, and cancelled itself out.</p>
        <DiagramFigure label="paired-microphone">
          <MicDiagram />
        </DiagramFigure>
      </>
    ),
  },
  {
    id: 'seats',
    act: ACT2,
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
      </>
    ),
  },
  {
    id: 'listen',
    act: ACT2,
    still: IMAGES.photoBowl,
    full: true,
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
    act: ACT3,
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
    act: ACT3,
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
    act: ACT3,
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
const fromHash = () => Math.max(0, STEPS.findIndex((s) => s.id === window.location.hash.slice(1)));

export function Live() {
  const [at, setAt] = useState(fromHash);
  /** The card put away, to look around; the story keeps its place. */
  const [hidden, setHidden] = useState(false);
  const [portrait, setPortrait] = useState(() => window.innerHeight > window.innerWidth);
  const tier = useMemo(detectTier, []);
  const q = tierSettings(tier);
  const step = STEPS[at];
  const last = at === STEPS.length - 1;

  const go = useCallback((n: number) => {
    const i = Math.min(STEPS.length - 1, Math.max(0, n));
    setAt(i);
    setHidden(false);
    window.history.replaceState(null, '', i ? `#${STEPS[i].id}` : window.location.pathname);
  }, []);

  useEffect(() => {
    const onResize = () => setPortrait(window.innerHeight > window.innerWidth);
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      // A slider or a switch in a diagram keeps its own arrow keys.
      const el = document.activeElement;
      if (el instanceof HTMLElement && ['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName)) return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown') go(at + 1);
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') go(at - 1);
      else if (e.key === 'Escape') setHidden((h) => !h);
      else return;
      e.preventDefault();
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('keydown', onKey);
    };
  }, [at, go]);

  // A sideways swipe on the card steps; on the model, a drag turns it.
  const touch = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.target as HTMLElement;
    touch.current = t.closest('input, .seat-figure, .dg') ? null : { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const from = touch.current;
    touch.current = null;
    if (!from) return;
    const dx = e.changedTouches[0].clientX - from.x;
    const dy = e.changedTouches[0].clientY - from.y;
    if (Math.abs(dx) > 60 && Math.abs(dx) > 2 * Math.abs(dy)) go(at + (dx < 0 ? 1 : -1));
  };

  // A step without a camera keeps the last one's.
  const pose = useMemo(() => {
    for (let i = at; i >= 0; i--) if (STEPS[i].pose) return STEPS[i].pose!(portrait);
    return STEPS.find((s) => s.pose)!.pose!(portrait);
  }, [at, portrait]);

  const interaction: ArrayInteraction = useMemo(
    () => ({ hovered: null, selected: null, isolated: step.isolated ?? null, explode: 0, onHover: noop, onSelect: noop }),
    [step.isolated],
  );
  const view = useMemo(() => viewIn('front', VENUE), []);
  // Lift the model clear of the card: above it on a phone, beside it on a wide screen.
  const covered = !hidden && !step.full && !step.still;
  const offset = !covered ? { room: 0, up: 0 } : portrait ? { room: 0, up: Math.round(window.innerHeight * 0.17) } : { room: 400, up: 0 };
  const live = !step.still && !step.full;

  return (
    <div className={`live${hidden ? ' looking' : ''}`}>
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
            colorMode={step.colorMode ?? 'material'}
            compare={step.compare ?? null}
            view={view}
            tier={tier}
            navMode="tour"
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
      {STEPS.map((s, i) =>
        s.still && (i === 0 || STEPS[i - 1].still !== s.still || STEPS[i - 1].placeholder !== s.placeholder) ? (
          <figure
            key={s.id}
            className="live-still"
            data-on={(!hidden && step.still === s.still && step.placeholder === s.placeholder) || undefined}
            data-dim={step.full || undefined}
          >
            <img {...srcOf(s.still)} sizes="100vw" alt={s.still.alt} style={{ objectPosition: s.still.focus }} />
            {s.placeholder && <figcaption>{s.placeholder}</figcaption>}
          </figure>
        ) : null,
      )}
      {step.full && !step.still && !hidden && <div className="live-dim" />}

      <span id="live-fps" className="live-fps" />
      <p className="live-tag">Mockup · working copy</p>

      {hidden ? (
        <button className="live-pill live-return" onClick={() => setHidden(false)}>
          Back to the story
        </button>
      ) : (
        <section
          className={`live-card${step.full ? ' full' : ''}${at === 0 ? ' opening' : ''}`}
          aria-live="polite"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <div className="live-body" key={step.id}>
            <p className="live-act">
              {step.act}
              {at > 0 && <span>{step.full ? '' : step.still ? (step.placeholder ? 'Still' : 'Photograph') : 'Live model · drag to look around'}</span>}
            </p>
            {step.body}
          </div>
          <div className="live-nav">
            <div className="live-progress" role="progressbar" aria-valuemin={1} aria-valuemax={STEPS.length} aria-valuenow={at + 1} aria-label="Place in the story">
              <i style={{ width: `${((at + 1) / STEPS.length) * 100}%` }} />
            </div>
            <div className="live-buttons">
              {at > 0 && (
                <button className="live-back" onClick={() => go(at - 1)} aria-label="Back">
                  <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3 5 8l5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
              )}
              {live && !last && (
                <button className="live-look" onClick={() => setHidden(true)}>
                  Hide text
                </button>
              )}
              <span className="live-count">
                {at + 1} / {STEPS.length}
              </span>
              {last ? (
                <button className="live-next" onClick={() => setHidden(true)}>
                  Explore it yourself
                </button>
              ) : (
                <button className="live-next" onClick={() => go(at + 1)}>
                  {at === 0 ? 'Begin' : 'Next'}
                </button>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

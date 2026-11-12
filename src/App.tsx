import { Canvas, events as pointerEvents, useFrame } from '@react-three/fiber';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { ARRAYS, CHANNELS, wall, type ChannelId } from './data/wall.config';
import { detectTier, downgrade, tierSettings, type Tier } from './quality';
import type { ArrayInteraction } from './scene/Arrays';
import { About } from './ui/About';
import { ListenPanel } from './ui/Listen';
import { NowPlaying } from './ui/NowPlaying';
import { ArrayPanel } from './ui/ArrayPanel';
import type { UnitSystem } from './ui/units';
import { Post } from './scene/Post';
import { Scene, sceneDefaults, type NavMode, type SceneOptions } from './scene/Scene';
import type { CompareId } from './scene/ScaleObjects';
import { PLANE_POSITIONS, type PlaneAt } from './geometry/scale';
import type { Pose } from './scene/TourCamera';
import { TOUR, instrumentPose } from './scene/tour';
import { COMPARE_VIEW, PLACES, PLANE_VIEWS, placeIn, standIn, viewFromSearch, viewIn } from './scene/views';
import { INSTRUMENTS, InstrumentCard, OverviewCard } from './ui/Cards';
import { BottomBar, Hint, TopBar } from './ui/Controls';
import { isTagOnly, setStep, track } from './analytics';
import { StoryLayer } from './story/StoryLayer';
import { STEPS } from './story/steps';

/** Whether a mesh, or something it sits in, is marked as clickable (userData.pickable). */
function isPickable(o: THREE.Object3D | null): boolean {
  for (; o; o = o.parent) if (o.userData.pickable) return true;
  return false;
}

/**
 * Fades out the loading screen in index.html once the model has actually
 * drawn: a few frames in, so the first visible frame is a finished one.
 */
function BootDone() {
  const frames = useRef(0);
  useFrame(() => {
    if (++frames.current !== 3) return;
    // The story's first screen may have put the loading screen away already (story/Landing.tsx).
    const boot = document.getElementById('boot');
    if (boot) {
      boot.classList.add('done');
      setTimeout(() => boot.remove(), 700);
    }
    // How long the model took to appear, for the dashboard's load time (and who gave up waiting). Only time
    // the page was on screen counts: a tab opened in the background draws nothing until it's looked at, which
    // once made a two-second load read as thirty. Split into getting the code (network) and drawing (device).
    const w = window as unknown as { __vis?: { hidden: number; at: number }; __appStart?: number };
    const now = performance.now();
    const hidden = (w.__vis?.hidden ?? 0) + (w.__vis && w.__vis.at >= 0 ? now - w.__vis.at : 0);
    const code = w.__appStart ?? null;
    track('ready', null, {
      ms: Math.round(Math.max(0, now - hidden)),
      total: Math.round(now),
      hidden: Math.round(hidden),
      code: code == null ? null : Math.round(code),
      // From the code starting to the model on screen (includes any hidden time; see `hidden`)
      draw: code == null ? null : Math.round(now - code),
    });
  });
  return null;
}

function FpsProbe({ onSample }: { onSample: (fps: number) => void }) {
  // Refs, not locals: onSample re-renders this component, which would reset counters.
  const frames = useRef(0);
  const elapsed = useRef(0);
  useFrame((_, dt) => {
    frames.current++;
    elapsed.current += dt;
    if (elapsed.current >= 0.5) {
      onSample(Math.round(frames.current / elapsed.current));
      frames.current = 0;
      elapsed.current = 0;
    }
  });
  return null;
}

/**
 * Opens at the Hollywood Bowl, where the story is set; ?venue=indoors (or
 * ?venue=arena) opens indoors, as on Pechner's photograph. The airliner stands
 * indoors only, so ?compare=737 without a venue opens indoors too.
 */
function venueFromSearch(search: string): SceneOptions['venue'] {
  const q = new URLSearchParams(search);
  const v = q.get('venue');
  if (v === 'indoors' || v === 'arena') return 'arena';
  if (v === null && q.get('compare') === '737') return 'arena';
  return 'hollywoodBowl';
}

/** ?compare shows the buses, ?compare=737 the airliner. */
function compareFromSearch(search: string): CompareId {
  const v = new URLSearchParams(search).get('compare');
  return v === null ? null : v === '737' ? 'b737' : 'bus';
}

/** ?at=behind or ?at=front moves the 737. */
function planeAtFromSearch(search: string): PlaneAt {
  const v = new URLSearchParams(search).get('at') as PlaneAt | null;
  return v && PLANE_POSITIONS.includes(v) ? v : 'beside';
}

/** Calls `report` whenever `value` changes after the first render (what the page opened with isn't something anyone did). */
function useOnChange<T>(value: T, report: (v: T) => void) {
  const last = useRef(value);
  useEffect(() => {
    if (Object.is(last.current, value)) return;
    last.current = value;
    report(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
}

/**
 * The page opens on the story (src/story), told over this same model. A link
 * that asks for something of the explorer (a venue, a comparison, a view, no
 * interface) or ends in #explore opens the explorer; #<step> opens that step.
 * A link tagged only with where it was shared (?ref=reddit) still opens the story.
 */
function storyFromLocation(hud: boolean): { on: boolean; at: number } {
  const at = Math.max(0, STEPS.findIndex((s) => s.id === window.location.hash.slice(1)));
  return { on: hud && isTagOnly(window.location.search) && window.location.hash !== '#explore', at };
}

const setHash = (hash: string) => window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${hash}`);

export default function App() {
  const initial = useMemo(() => viewFromSearch(window.location.search), []);
  const viewId = initial.id;
  const [navMode, setNavMode] = useState<NavMode>('orbit');
  const [pose, setPose] = useState<Pose>(TOUR[0]);
  const [tier, setTier] = useState<Tier>(() => {
    const forced = new URLSearchParams(window.location.search).get('tier');
    return forced && forced in wall.render.tiers ? (forced as Tier) : detectTier();
  });
  const [autoTier, setAutoTier] = useState(true);
  const [options, setOptionsState] = useState<SceneOptions>(() => ({
    ...sceneDefaults,
    venue: venueFromSearch(window.location.search),
    compare: compareFromSearch(window.location.search),
    planeAt: planeAtFromSearch(window.location.search),
  }));
  const setOptions = useCallback((next: SceneOptions | ((o: SceneOptions) => SceneOptions)) => {
    setOptionsState((o) => {
      const n = typeof next === 'function' ? next(o) : next;
      if (n.venue !== o.venue) {
        const url = new URL(window.location.href);
        if (n.venue === 'arena') url.searchParams.set('venue', 'indoors');
        else url.searchParams.delete('venue');
        window.history.replaceState(null, '', url);
      }
      return n;
    });
  }, []);
  const [fps, setFps] = useState(0);

  // What the card on the right shows: the overview (on arrival),
  // a speaker block someone clicked, an instrument, or nothing.
  // The story: which step, and whether it has the screen (else the explorer does).
  const opened = useMemo(() => storyFromLocation(initial.hud), [initial.hud]);
  const [storyAt, setStoryAt] = useState(opened.at);
  const [inStory, setInStory] = useState(opened.on);
  const [portrait, setPortrait] = useState(() => window.innerHeight > window.innerWidth);
  const step = STEPS[storyAt];

  const [overview, setOverview] = useState(initial.hud && !opened.on);
  /** The place picked from the View row; its line shows until the model is touched. */
  const [place, setPlace] = useState<string | null>(null);
  const [instrument, setInstrument] = useState<string | null>(null);

  // Inspection state: what the cursor is over, what is pinned open, which
  // system is isolated, and how far apart the exploded view has pulled things.
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelectedState] = useState<string | null>(null);
  const [isolated, setIsolated] = useState<ChannelId | null>(null);
  const [explode, setExplode] = useState(0);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [listenOpen, setListenOpen] = useState(false);
  const [units, setUnits] = useState<UnitSystem>('imperial');

  /** Clicking a speaker block opens its card in place of whatever was there. */
  const setSelected = useCallback((id: string | null) => {
    setSelectedState(id);
    if (id) {
      setOverview(false);
      setInstrument(null);
    }
  }, []);

  const interaction: ArrayInteraction = useMemo(
    () => ({ hovered, selected, isolated, explode, onHover: setHovered, onSelect: setSelected }),
    [hovered, selected, isolated, explode, setSelected],
  );

  const view = useMemo(() => viewIn(viewId, options.venue), [viewId, options.venue]);
  const hud = initial.hud && !inStory;
  const q = tierSettings(tier);

  /** Back to the overview: its card, and the camera where the page opens. */
  const goHome = useCallback(() => {
    setOverview(true);
    setPlace(null);
    setSelectedState(null);
    setInstrument(null);
    setPose(TOUR[0]);
    setNavMode('tour');
  }, []);

  /** Fly to a place to stand, with its one line; any card closes, so the view is clear. */
  const goToPlace = useCallback(
    (id: string) => {
      const p = PLACES.find((x) => x.id === id);
      if (!p) return;
      track('place', id, { label: p.label });
      setPlace(id);
      setOverview(false);
      setSelectedState(null);
      setInstrument(null);
      setPose(placeIn(p, options.venue));
      setNavMode('tour');
    },
    [options.venue],
  );

  // Touching the model puts the place's line away: from then on, it's their view.
  useEffect(() => {
    if (!place) return;
    const down = (e: PointerEvent) => {
      if (e.target instanceof HTMLCanvasElement) setPlace(null);
    };
    window.addEventListener('pointerdown', down, true);
    return () => window.removeEventListener('pointerdown', down, true);
  }, [place]);

  const pickInstrument = useCallback((id: string) => {
    setInstrument(id);
    setOverview(false);
    setSelectedState(null);
    setPose(instrumentPose(id));
    setNavMode('tour');
  }, []);

  const closeCard = useCallback(() => {
    setOverview(false);
    setSelectedState(null);
    setInstrument(null);
  }, []);

  /**
   * A step of the story sets the explorer's own state: the venue, the colors,
   * what stands beside the Wall, how far apart it is, where the camera is. So
   * when the story is put away, the explorer carries on from what was showing.
   */
  useEffect(() => {
    if (!inStory) return;
    const s = STEPS[storyAt];
    setOptions((o) => ({ ...o, venue: 'hollywoodBowl', colorMode: s.colorMode ?? 'material', compare: s.compare ?? null, planeAt: 'beside' }));
    setIsolated(s.isolated ?? null);
    setExplode(s.explode ?? 0);
    closeCard();
    setAboutOpen(false);
    setListenOpen(false);
    for (let i = storyAt; i >= 0; i--) {
      const at = STEPS[i].pose;
      if (!at) continue;
      // A new object each time, so coming back to a step flies back to its view.
      setPose({ ...at(portrait) });
      setNavMode('tour');
      break;
    }
    setHash(storyAt ? `#${s.id}` : '');
  }, [inStory, storyAt, portrait, setOptions, closeCard]);

  const goToStep = useCallback((n: number) => setStoryAt(Math.min(STEPS.length - 1, Math.max(0, n))), []);
  /** Put the story away: the explorer, as the step left it. */
  const leaveStory = useCallback(() => {
    setInStory(false);
    setHash('#explore');
  }, []);
  /** Back to the story where it was left; from its end, to its start. */
  const openStory = useCallback(() => {
    setStoryAt((n) => (n >= STEPS.length - 1 ? 0 : n));
    setInStory(true);
  }, []);

  // Which step of the visit is on screen, so the dashboard's Journey can show time spent on each and where
  // people leave: a story step, or exploring the model once the story is left.
  useEffect(() => {
    if (inStory) setStep(step.id, step.name);
    else setStep('explore', 'Exploring the model');
  }, [inStory, step]);
  // How readers move through the story: Next, Back, or a jump (the step dots, a link)
  const lastStep = useRef(storyAt);
  useOnChange(storyAt, (n) => {
    const from = lastStep.current;
    lastStep.current = n;
    if (inStory) track('nav', n === from + 1 ? 'next' : n === from - 1 ? 'back' : 'jump', { label: n === from + 1 ? 'Next' : n === from - 1 ? 'Back' : 'Jumped to a step', to: STEPS[n].id });
  });

  // What people do, for the private dashboard (src/analytics.ts). Watching the state, not the buttons,
  // so a keyboard shortcut counts the same as a click.
  // Each sends a stable id and the name people see on screen (the label), which the dashboard shows.
  useOnChange(selected, (id) => {
    const b = id ? ARRAYS.find((a) => a.id === id) : undefined;
    if (id) track('block', id, { label: b ? `${CHANNELS[b.channel].label}: ${b.label}` : id });
  });
  useOnChange(instrument, (id) => {
    const i = id ? INSTRUMENTS[id] : undefined;
    if (id) track('instrument', id, { label: i ? `${i.title} (${i.player})` : id });
  });
  // Not what a step of the story set by itself.
  useOnChange(isolated, (id) => id && id !== step.isolated && track('isolate', id, { label: CHANNELS[id].label }));
  useOnChange(options.venue, (v) => !inStory && track('venue', v, { label: wall.venues[v].label }));
  useOnChange(aboutOpen, (open) => open && track('about', null, { label: 'About' }));
  useOnChange(listenOpen, (open) => open && track('listen', null, { label: 'Listen' }));
  useOnChange(units, (u) => track('units', u, { label: u === 'metric' ? 'Metric' : 'Feet and inches' }));

  const cardOpen = hud && (overview || !!selected || !!instrument);

  // Make room for the card: the 360px card and its margins on a wide screen;
  // on a phone, lift the picture out of the sheet.
  const [wide, setWide] = useState(() => window.innerWidth > 720);
  useEffect(() => {
    const on = () => {
      setWide(window.innerWidth > 720);
      setPortrait(window.innerHeight > window.innerWidth);
    };
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  // In the story, clear of its card: above it on a phone, beside it on a wide screen.
  const storyCard = inStory && !step.still && !step.full;
  const offset = storyCard
    ? portrait ? { room: 0, up: Math.round(window.innerHeight * 0.17) } : { room: 400, up: 0 }
    : cardOpen ? (wide ? { room: 300, up: 0 } : { room: 0, up: Math.round(window.innerHeight * 0.2) }) : { room: 0, up: 0 };

  /** Stand where the comparison shows. */
  const goToCompare = useCallback(
    (id: CompareId, at: PlaneAt = 'beside') => {
      if (id) track('compare', id, { at, label: id === 'b737' ? 'A Boeing 737-200' : 'Four VW buses' });
      setOverview(false);
      setSelectedState(null);
      setInstrument(null);
      // Upright on a phone, stand back until it fits the narrow frame.
      const portrait = window.innerHeight > window.innerWidth;
      if (id === 'b737') setPose(portrait ? PLANE_VIEWS[at].tall : PLANE_VIEWS[at].wide);
      else setPose(standIn(portrait ? { ...COMPARE_VIEW, position: [-1, 2.4, 68], fov: 40 } : COMPARE_VIEW, options.venue));
      setNavMode('tour');
    },
    [options.venue],
  );

  /**
   * Global shortcuts. Deliberately skipped while focus is in a control, so
   * that tabbing to a button and pressing an arrow key does what the button
   * expects rather than flying the camera somewhere.
   */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      // The story has its own keys (StoryLayer).
      if (inStory) return;
      // Escape always closes, wherever focus is.
      if (e.key === 'Escape') {
        if (listenOpen) setListenOpen(false);
        else if (aboutOpen) setAboutOpen(false);
        else closeCard();
        return;
      }
      const el = document.activeElement;
      if (el instanceof HTMLElement && ['BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName)) return;

      const n = Number(e.key);
      if (n >= 1 && n <= PLACES.length) return goToPlace(PLACES[n - 1].id);

      switch (e.key.toLowerCase()) {
        case 'x':
          return setExplode((v) => (v > 0.5 ? 0 : 1));
        case 'c':
          return setOptions((o) => ({ ...o, colorMode: o.colorMode === 'channel' ? 'material' : 'channel' }));
        case '?':
        case 'i':
          return setAboutOpen((v) => !v);
        default:
          break;
      }

      // Arrows walk the places, in order.
      if (['ArrowRight', 'PageDown', 'ArrowLeft', 'PageUp'].includes(e.key)) {
        e.preventDefault();
        const at = PLACES.findIndex((p) => p.id === place);
        const by = e.key === 'ArrowRight' || e.key === 'PageDown' ? 1 : -1;
        goToPlace(PLACES[(at + by + PLACES.length) % PLACES.length].id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [place, goToPlace, aboutOpen, listenOpen, closeCard, setOptions, inStory]);

  /**
   * If the picked tier turns out to be too much for the device, drop one.
   * Only ever downgrades, and only once per tier, so it cannot oscillate
   * between two settings while somebody is trying to look at something.
   */
  const slowSamples = useRef(0);
  useEffect(() => {
    slowSamples.current = 0;
  }, [tier]);
  useEffect(() => {
    if (!autoTier || fps === 0) return;
    // A hidden or unfocused tab has its animation frames throttled by the
    // browser, which looks exactly like a slow GPU. Downgrading on that would
    // permanently drop quality just because somebody switched tabs.
    if (document.hidden || !document.hasFocus()) return;
    if (fps < 28) slowSamples.current++;
    else slowSamples.current = Math.max(0, slowSamples.current - 1);
    if (slowSamples.current >= 8) {
      const next = downgrade(tier);
      if (next) setTier(next);
      slowSamples.current = 0;
    }
  }, [fps, tier, autoTier]);

  return (
    <>
      <Canvas
        shadows={q.shadowMapSize > 0}
        dpr={[1, q.pixelRatioCap]}
        gl={{
          antialias: tier === 'low',
          powerPreference: 'high-performance',
          // Dev only: lets the rendered frame be sampled pixel-by-pixel, so
          // "why is that surface bright?" is a measurement rather than a guess.
          preserveDrawingBuffer: import.meta.env.DEV,
        }}
        camera={{ position: view.position, fov: view.fov ?? 42, near: 0.1, far: 600 }}
        // Only the speakers (and the empty ground, to clear a selection) take
        // clicks. Without this the scaffold tubes in front of every stack
        // caught the click first and the Wall could not be picked.
        events={(store) => ({ ...pointerEvents(store), filter: (hits) => hits.filter((h) => isPickable(h.object)) })}
        onCreated={({ gl }) => {
          gl.outputColorSpace = THREE.SRGBColorSpace;
        }}
      >
        <Scene
          {...options}
          view={view}
          tier={tier}
          navMode={navMode}
          pose={pose}
          interaction={interaction}
          // In the story the camera stays near the Wall: a long pull back loses the reader.
          maxDistance={inStory ? 110 : undefined}
          onPickInstrument={pickInstrument}
          offset={offset}
        />
        <Post tier={tier} />
        <FpsProbe onSample={setFps} />
        <BootDone />
      </Canvas>

      {hud && (
        <>
          <TopBar
            options={options}
            setOptions={setOptions}
            units={units}
            setUnits={setUnits}
            tier={tier}
            setTier={(t) => {
              setAutoTier(false);
              setTier(t);
            }}
            openAbout={() => setAboutOpen(true)}
            openListen={() => setListenOpen(true)}
            onHome={goHome}
            onStory={openStory}
            storyUnfinished={storyAt > 0 && storyAt < STEPS.length - 1}
          />
          <BottomBar
            explode={explode}
            setExplode={setExplode}
            options={options}
            setOptions={setOptions}
            isolated={isolated}
            setIsolated={setIsolated}
            place={place}
            onPlace={goToPlace}
            onCompare={goToCompare}
          />
          <Hint />
          {overview && <OverviewCard onClose={closeCard} />}
          {selected && (
            <ArrayPanel blockId={selected} units={units} onClose={closeCard} onIsolate={setIsolated} isolated={isolated} />
          )}
          {instrument && <InstrumentCard id={instrument} onClose={closeCard} isolated={isolated} onIsolate={setIsolated} />}
        </>
      )}

      {inStory && (
        <StoryLayer
          at={storyAt}
          go={goToStep}
          onLook={leaveStory}
          onSkip={() => {
            leaveStory();
            goHome();
          }}
          isolated={isolated}
          setIsolated={setIsolated}
          explode={explode}
          setExplode={setExplode}
        />
      )}

      {aboutOpen && <About onClose={() => setAboutOpen(false)} />}
      {listenOpen && <ListenPanel onClose={() => setListenOpen(false)} />}
      {/* Over the scene while the sound plays on; the panels have their own place for it. */}
      {!listenOpen && !aboutOpen && (
        <NowPlaying onOpen={() => (inStory ? goToStep(STEPS.findIndex((x) => x.id === 'listen')) : setListenOpen(true))} />
      )}
    </>
  );
}

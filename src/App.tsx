import { Canvas, events as pointerEvents, useFrame } from '@react-three/fiber';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { wall, type ChannelId } from './data/wall.config';
import { detectTier, downgrade, tierSettings, type Tier } from './quality';
import type { ArrayInteraction } from './scene/Arrays';
import { About } from './ui/About';
import { ArrayPanel } from './ui/ArrayPanel';
import type { UnitSystem } from './ui/units';
import { Post } from './scene/Post';
import { Scene, sceneDefaults, type NavMode, type SceneOptions } from './scene/Scene';
import type { Pose } from './scene/TourCamera';
import { TOUR, instrumentPose } from './scene/tour';
import { VIEWPOINTS, viewFromSearch, viewIn, viewpointIn, type ViewpointId } from './scene/views';
import { InstrumentCard, SpotCard } from './ui/Cards';
import { BottomBar, Hint, TopBar } from './ui/Controls';

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
    const boot = document.getElementById('boot');
    if (!boot) return;
    boot.classList.add('done');
    setTimeout(() => boot.remove(), 700);
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
  // Opens indoors; ?venue=bowl opens at the Hollywood Bowl.
  const [options, setOptionsState] = useState<SceneOptions>(() => ({
    ...sceneDefaults,
    venue: new URLSearchParams(window.location.search).get('venue') === 'bowl' ? 'hollywoodBowl' : 'arena',
  }));
  const setOptions = useCallback((next: SceneOptions | ((o: SceneOptions) => SceneOptions)) => {
    setOptionsState((o) => {
      const n = typeof next === 'function' ? next(o) : next;
      if (n.venue !== o.venue) {
        const url = new URL(window.location.href);
        if (n.venue === 'hollywoodBowl') url.searchParams.set('venue', 'bowl');
        else url.searchParams.delete('venue');
        window.history.replaceState(null, '', url);
      }
      return n;
    });
  }, []);
  const [fps, setFps] = useState(0);

  // What the card on the right shows: a tour stop (the overview on arrival),
  // a speaker block someone clicked, an instrument, or nothing.
  const [stop, setStop] = useState<number | null>(initial.hud ? 0 : null);
  const [instrument, setInstrument] = useState<string | null>(null);

  // Inspection state: what the cursor is over, what is pinned open, which
  // system is isolated, and how far apart the exploded view has pulled things.
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelectedState] = useState<string | null>(null);
  const [isolated, setIsolated] = useState<ChannelId | null>(null);
  const [explode, setExplode] = useState(0);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [units, setUnits] = useState<UnitSystem>('imperial');

  /** Clicking a speaker block opens its card in place of whatever was there. */
  const setSelected = useCallback((id: string | null) => {
    setSelectedState(id);
    if (id) {
      setStop(null);
      setInstrument(null);
    }
  }, []);

  const interaction: ArrayInteraction = useMemo(
    () => ({ hovered, selected, isolated, explode, onHover: setHovered, onSelect: setSelected }),
    [hovered, selected, isolated, explode, setSelected],
  );

  const view = useMemo(() => viewIn(viewId, options.venue), [viewId, options.venue]);
  const hud = initial.hud;
  const q = tierSettings(tier);

  /** Fly to a tour stop and open its card. The overview (0) opens its card where the camera is. */
  const goToStop = useCallback((i: number) => {
    const n = ((i % TOUR.length) + TOUR.length) % TOUR.length;
    setStop(n);
    setSelectedState(null);
    setInstrument(null);
    setPose(TOUR[n]);
    setNavMode('tour');
  }, []);

  const goToViewpoint = useCallback(
    (id: ViewpointId) => {
      setPose(viewpointIn(id, options.venue));
      setNavMode('tour');
    },
    [options.venue],
  );

  const pickInstrument = useCallback((id: string) => {
    setInstrument(id);
    setStop(null);
    setSelectedState(null);
    setPose(instrumentPose(id));
    setNavMode('tour');
  }, []);

  const closeCard = useCallback(() => {
    setStop(null);
    setSelectedState(null);
    setInstrument(null);
  }, []);

  const cardOpen = hud && (stop !== null || !!selected || !!instrument);

  // Make room for the card: the 360px card and its margins on a wide screen;
  // on a phone, lift the picture out of the sheet.
  const [wide, setWide] = useState(() => window.innerWidth > 720);
  useEffect(() => {
    const on = () => setWide(window.innerWidth > 720);
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  const offset = cardOpen ? (wide ? { room: 300, up: 0 } : { room: 0, up: Math.round(window.innerHeight * 0.2) }) : { room: 0, up: 0 };

  /**
   * Global shortcuts. Deliberately skipped while focus is in a control, so
   * that tabbing to a button and pressing an arrow key does what the button
   * expects rather than flying the camera somewhere.
   */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      // Escape always closes, wherever focus is.
      if (e.key === 'Escape') {
        if (aboutOpen) setAboutOpen(false);
        else closeCard();
        return;
      }
      const el = document.activeElement;
      if (el instanceof HTMLElement && ['BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName)) return;

      const ids = Object.keys(VIEWPOINTS) as ViewpointId[];
      const n = Number(e.key);
      if (n >= 1 && n <= ids.length) return goToViewpoint(ids[n - 1]);

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

      // Arrows walk the tour.
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        goToStop((stop ?? 0) + 1);
      } else if ((e.key === 'ArrowLeft' || e.key === 'PageUp') && stop !== null) {
        e.preventDefault();
        goToStop(stop - 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [stop, goToStop, goToViewpoint, aboutOpen, closeCard, setOptions]);

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
          activeStop={hud ? stop : null}
          onPickStop={goToStop}
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
            onHome={() => goToStop(0)}
          />
          <BottomBar
            explode={explode}
            setExplode={setExplode}
            options={options}
            setOptions={setOptions}
            isolated={isolated}
            setIsolated={setIsolated}
            onViewpoint={goToViewpoint}
          />
          <Hint />
          {stop !== null && (
            <SpotCard index={stop} onGo={goToStop} onClose={closeCard} isolated={isolated} onIsolate={setIsolated} />
          )}
          {selected && (
            <ArrayPanel blockId={selected} units={units} onClose={closeCard} onIsolate={setIsolated} isolated={isolated} />
          )}
          {instrument && <InstrumentCard id={instrument} onClose={closeCard} isolated={isolated} onIsolate={setIsolated} />}
        </>
      )}

      {aboutOpen && <About onClose={() => setAboutOpen(false)} />}
    </>
  );
}

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
import { TOUR } from './scene/tour';
import { VIEWS, viewFromSearch, viewIn, type ViewId } from './scene/views';
import { Hud } from './ui/Hud';

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
  const [viewId, setViewId] = useState<ViewId>(initial.id);
  const [navMode, setNavMode] = useState<NavMode>('orbit');
  const [stopIndex, setStopIndex] = useState(0);
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

  // Inspection state: what the cursor is over, what is pinned open, which
  // channel is isolated, and how far apart the exploded view has pulled things.
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [isolated, setIsolated] = useState<ChannelId | null>(null);
  const [explode, setExplode] = useState(0);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [units, setUnits] = useState<UnitSystem>('imperial');

  const interaction: ArrayInteraction = useMemo(
    () => ({ hovered, selected, isolated, explode, onHover: setHovered, onSelect: setSelected }),
    [hovered, selected, isolated, explode],
  );

  const view = useMemo(() => viewIn(viewId, options.venue), [viewId, options.venue]);
  const hud = initial.hud;
  const q = tierSettings(tier);
  const tourStop = TOUR[stopIndex];

  const selectView = useCallback((id: ViewId) => {
    setViewId(id);
    setNavMode('orbit');
    const url = new URL(window.location.href);
    url.searchParams.set('view', id);
    window.history.replaceState(null, '', url);
  }, []);

  const goToStop = useCallback((i: number) => {
    setStopIndex(((i % TOUR.length) + TOUR.length) % TOUR.length);
    setNavMode('tour');
  }, []);

  /**
   * Global shortcuts. Deliberately skipped while focus is in a control, so
   * that tabbing to a button and pressing an arrow key does what the button
   * expects rather than flying the camera somewhere.
   */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = document.activeElement;
      if (el instanceof HTMLElement && ['BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName)) return;

      const ids = Object.keys(VIEWS) as ViewId[];
      const n = Number(e.key);
      if (n >= 1 && n <= ids.length) return selectView(ids[n - 1]);

      switch (e.key.toLowerCase()) {
        case 'o':
          return setNavMode('orbit');
        case 't':
          return goToStop(stopIndex);
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

      // Arrows page the tour, but only when the tour is what is running.
      if (navMode === 'tour') {
        if (e.key === 'ArrowRight' || e.key === 'PageDown') {
          e.preventDefault();
          goToStop(stopIndex + 1);
        } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
          e.preventDefault();
          goToStop(stopIndex - 1);
        } else if (e.key === 'Home') {
          e.preventDefault();
          goToStop(0);
        } else if (e.key === 'End') {
          e.preventDefault();
          goToStop(TOUR.length - 1);
        }
      }
      if (e.key === 'Escape') {
        if (aboutOpen) setAboutOpen(false);
        else if (selected) setSelected(null);
        else if (navMode !== 'orbit') setNavMode('orbit');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navMode, stopIndex, goToStop, selectView, aboutOpen, selected]);

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
          tourStop={tourStop}
          interaction={interaction}
        />
        <Post tier={tier} />
        <FpsProbe onSample={setFps} />
        <BootDone />
      </Canvas>

      {hud && (
        <Hud
          options={options}
          setOptions={setOptions}
          fps={fps}
          viewId={viewId}
          setViewId={selectView}
          tier={tier}
          setTier={(t) => {
            setAutoTier(false);
            setTier(t);
          }}
          navMode={navMode}
          setNavMode={setNavMode}
          stopIndex={stopIndex}
          goToStop={goToStop}
          units={units}
          setUnits={setUnits}
          selected={selected}
          setSelected={setSelected}
          isolated={isolated}
          setIsolated={setIsolated}
          explode={explode}
          setExplode={setExplode}
          openAbout={() => setAboutOpen(true)}
        />
      )}

      {hud && selected && (
        <ArrayPanel
          blockId={selected}
          units={units}
          onClose={() => setSelected(null)}
          onIsolate={setIsolated}
          isolated={isolated}
        />
      )}

      {aboutOpen && <About onClose={() => setAboutOpen(false)} />}
    </>
  );
}

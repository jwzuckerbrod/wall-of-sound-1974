import { Canvas, useFrame } from '@react-three/fiber';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { wall } from './data/wall.config';
import { detectTier, downgrade, tierSettings, type Tier } from './quality';
import { Post } from './scene/Post';
import { Scene, sceneDefaults, type NavMode, type SceneOptions } from './scene/Scene';
import { TOUR } from './scene/tour';
import { VIEWS, viewFromSearch, type ViewId } from './scene/views';
import { Hud } from './ui/Hud';

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
  const [options, setOptions] = useState<SceneOptions>(sceneDefaults);
  const [fps, setFps] = useState(0);

  const view = VIEWS[viewId];
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
        case 'f':
          return setNavMode('walk');
        case 't':
          return goToStop(stopIndex);
        default:
          break;
      }

      // Arrows page the tour, but only when the tour is what is running —
      // in walk mode they are the movement keys.
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
      if (e.key === 'Escape' && navMode !== 'orbit') setNavMode('orbit');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navMode, stopIndex, goToStop, selectView]);

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
        onCreated={({ gl }) => {
          gl.outputColorSpace = THREE.SRGBColorSpace;
        }}
      >
        <Scene {...options} view={view} tier={tier} navMode={navMode} tourStop={tourStop} />
        <Post tier={tier} />
        <FpsProbe onSample={setFps} />
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
        />
      )}
    </>
  );
}

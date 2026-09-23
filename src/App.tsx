import { Canvas, useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { wall } from './data/wall.config';
import { Post } from './scene/Post';
import { Scene, sceneDefaults, type SceneOptions } from './scene/Scene';
import { VIEWS, viewFromSearch, type ViewId } from './scene/views';
import { detectTier, downgrade, tierSettings, type Tier } from './quality';
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

  const selectView = (id: ViewId) => {
    setViewId(id);
    const url = new URL(window.location.href);
    url.searchParams.set('view', id);
    window.history.replaceState(null, '', url);
  };

  // Number keys jump between views — the seed of the keyboard tour in stage 4.
  useEffect(() => {
    const ids = Object.keys(VIEWS) as ViewId[];
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const n = Number(e.key);
      if (n >= 1 && n <= ids.length) selectView(ids[n - 1]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

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
        gl={{ antialias: tier === 'low', powerPreference: 'high-performance' }}
        camera={{ position: view.position, fov: view.fov ?? 42, near: 0.1, far: 600 }}
        onCreated={({ gl }) => {
          gl.outputColorSpace = THREE.SRGBColorSpace;
        }}
      >
        <Scene {...options} view={view} tier={tier} />
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
        />
      )}
    </>
  );
}

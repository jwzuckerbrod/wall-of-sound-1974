import { Canvas, useFrame } from '@react-three/fiber';
import { useMemo, useRef, useState } from 'react';
import { Scene, type SceneOptions } from './scene/Scene';
import { viewFromSearch } from './scene/views';
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
  const { view, hud } = useMemo(() => viewFromSearch(window.location.search), []);
  const [options, setOptions] = useState<SceneOptions>({
    colorMode: 'grey',
    showScaffold: true,
    showStage: true,
    showFigures: true,
  });
  const [fps, setFps] = useState(0);

  return (
    <>
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: view.position, fov: view.fov ?? 42, near: 0.1, far: 500 }}
      >
        <Scene {...options} view={view} />
        <FpsProbe onSample={setFps} />
      </Canvas>
      {hud && <Hud options={options} setOptions={setOptions} fps={fps} view={view.label} />}
    </>
  );
}

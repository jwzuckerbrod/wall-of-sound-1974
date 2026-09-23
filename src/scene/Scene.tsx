import { Grid, OrbitControls } from '@react-three/drei';
import { useMemo } from 'react';
import { FT, wall } from '../data/wall.config';
import { scaffoldLayout } from '../geometry/scaffold';
import { Arrays, type ColorMode } from './Arrays';
import { FitCamera } from './FitCamera';
import { Scaffold, ScaleFigures, Stage } from './Structure';
import type { View } from './views';

export interface SceneOptions {
  colorMode: ColorMode;
  showScaffold: boolean;
  showStage: boolean;
  showFigures: boolean;
}

/**
 * Stage 2 is a massing check, so the lighting is deliberately plain: one key,
 * one fill, one bounce. Nothing here is the stage 3 lighting rig.
 */
export function Scene({ colorMode, showScaffold, showStage, showFigures, view }: SceneOptions & { view: View }) {
  const L = useMemo(() => scaffoldLayout(), []);
  const top = wall.dimensions.totalHeight;

  return (
    <>
      <color attach="background" args={['#15181c']} />
      <fog attach="fog" args={['#15181c', 60, 220]} />

      <hemisphereLight args={['#9fb4cc', '#2a2622', 0.55]} />
      <directionalLight
        position={[28, 38, 34]}
        intensity={2.1}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-40}
        shadow-camera-right={40}
        shadow-camera-top={40}
        shadow-camera-bottom={-20}
        shadow-camera-far={140}
      />
      <directionalLight position={[-30, 16, -22]} intensity={0.45} />

      <Arrays colorMode={colorMode} />
      {showScaffold && <Scaffold />}
      {showStage && <Stage />}
      {showFigures && <ScaleFigures />}

      {/* Ground: 1 m grid, 10 m majors — so distances are countable in the shot. */}
      <Grid
        args={[200, 200]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#2d3238"
        sectionSize={10}
        sectionThickness={1}
        sectionColor="#3d444c"
        fadeDistance={180}
        fadeStrength={1.2}
        infiniteGrid
        position={[0, 0.002, 0]}
      />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[400, 400]} />
        <meshStandardMaterial color="#1b1f24" roughness={1} />
      </mesh>

      {/* Height reference: a pole at the upstage corner marking 38'-10". */}
      <mesh position={[L.footprint.width / 2 + FT(6), top / 2, L.deck.minZ - FT(3)]}>
        <boxGeometry args={[0.08, top, 0.08]} />
        <meshStandardMaterial color="#c9552f" roughness={0.6} />
      </mesh>

      <OrbitControls
        makeDefault
        target={view.target}
        maxPolarAngle={Math.PI / 2 - 0.02}
        minDistance={4}
        maxDistance={180}
        enableDamping
        dampingFactor={0.06}
      />
      {/* After OrbitControls, so `controls` is in the store when this runs. */}
      <FitCamera view={view} />
    </>
  );
}

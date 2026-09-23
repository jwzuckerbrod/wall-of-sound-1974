import { OrbitControls } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import * as THREE from 'three';
import { wall } from '../data/wall.config';
import { tierSettings, type Tier } from '../quality';
import { Amps } from './Amps';
import { Arrays, type ColorMode } from './Arrays';
import { FitCamera } from './FitCamera';
import { Lighting } from './Lighting';
import { Cabling, Scaffold, ScaleFigures, Stage, StageRamp, TieDye } from './Structure';
import { TourCamera } from './TourCamera';
import { WalkControls } from './WalkControls';
import type { TourStop } from './tour';
import type { View } from './views';

/** Orbit around it, walk through it, or be taken round it. */
export type NavMode = 'orbit' | 'walk' | 'tour';

export interface SceneOptions {
  colorMode: ColorMode;
  showScaffold: boolean;
  showStage: boolean;
  showFigures: boolean;
  showAmps: boolean;
}

/** Applies the tier's renderer-level settings, which are not props on <Canvas>. */
function RendererSettings({ tier }: { tier: Tier }) {
  const gl = useThree((s) => s.gl);
  const q = tierSettings(tier);

  useEffect(() => {
    gl.shadowMap.enabled = q.shadowMapSize > 0;
    // PCFSoftShadowMap was removed in three r180+. PCF is the soft option now.
    gl.shadowMap.type = THREE.PCFShadowMap;
    gl.shadowMap.needsUpdate = true;
    // Tone mapping is done in the post chain at higher tiers; at low there is
    // no post chain, so the renderer has to do it.
    // Always the renderer's job, at every tier, so quality and exposure stay
    // independent. See the note in Post.tsx.
    gl.toneMapping = THREE.AgXToneMapping;
    gl.toneMappingExposure = 1.05;
  }, [gl, q.shadowMapSize, q.bloom]);

  return null;
}

/** Where a visitor is put down when they enter walk mode: out in the crowd. */
export const WALK_START = { x: 3.5, z: 26, yaw: 0 };

export function Scene({
  colorMode,
  showScaffold,
  showStage,
  showFigures,
  showAmps,
  view,
  tier,
  navMode,
  tourStop,
}: SceneOptions & { view: View; tier: Tier; navMode: NavMode; tourStop: TourStop }) {
  const q = tierSettings(tier);
  const shadows = q.shadowMapSize > 0;
  const orbiting = navMode !== 'walk';

  return (
    <>
      <color attach="background" args={['#0a0c0f']} />
      <fog attach="fog" args={['#0a0c0f', 55, 240]} />

      <RendererSettings tier={tier} />
      <Lighting tier={tier} />

      <Arrays colorMode={colorMode} shadows={shadows} />
      {showScaffold && (
        <>
          <Scaffold shadows={shadows} />
          <TieDye />
          <Cabling shadows={shadows} />
        </>
      )}
      {showAmps && <Amps shadows={shadows} />}
      {showStage && (
        <>
          <Stage shadows={shadows} />
          <StageRamp shadows={shadows} />
        </>
      )}
      {showFigures && <ScaleFigures shadows={shadows} />}

      {orbiting && (
        <OrbitControls
          makeDefault
          target={view.target}
          maxPolarAngle={Math.PI / 2 - 0.02}
          minDistance={2.5}
          maxDistance={200}
          enableDamping
          dampingFactor={0.06}
        />
      )}
      {/* After OrbitControls, so `controls` is in the store when these run. */}
      {navMode === 'orbit' && <FitCamera view={view} />}
      {navMode === 'tour' && <TourCamera stop={tourStop} active />}
      <WalkControls enabled={navMode === 'walk'} start={WALK_START} />
    </>
  );
}

export const sceneDefaults: SceneOptions = {
  colorMode: 'material',
  showScaffold: true,
  showStage: true,
  showFigures: true,
  showAmps: true,
};

export const deckHeight = wall.dimensions.stageDeckHeight;

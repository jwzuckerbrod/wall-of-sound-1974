import { OrbitControls } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import * as THREE from 'three';
import { wall } from '../data/wall.config';
import { tierSettings, type Tier } from '../quality';
import { Amps } from './Amps';
import { Arrays, type ArrayInteraction, type ColorMode } from './Arrays';
import { BandGear } from './BandGear';
import { BlockOutline } from './BlockOutline';
import { FitCamera } from './FitCamera';
import { Lighting } from './Lighting';
import { Cabling, LightBars, Scaffold, ScaffoldFloors, ScaleFigures, Stage, TieDye } from './Structure';
import { TourCamera } from './TourCamera';
import type { TourStop } from './tour';
import type { View } from './views';

/** Orbit around it, or be taken round it. */
export type NavMode = 'orbit' | 'tour';

export interface SceneOptions {
  colorMode: ColorMode;
  showScaffold: boolean;
  showStage: boolean;
  showFigures: boolean;
  showAmps: boolean;
  showBand: boolean;
}

/** Applies the tier's renderer-level settings, which are not props on <Canvas>. */
function RendererSettings({ tier }: { tier: Tier }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const q = tierSettings(tier);

  /**
   * Dev only. Lets a capture force a frame synchronously.
   *
   * The browser this is developed in suspends animation frames when its pane is
   * hidden, which leaves the drawing buffer empty and every captured PNG blank.
   * Rendering on demand sidesteps that entirely.
   */
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    (window as unknown as Record<string, unknown>).__renderNow = () => {
      gl.render(scene, camera);
    };
  }, [gl, scene, camera]);

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

export function Scene({
  colorMode,
  showScaffold,
  showStage,
  showFigures,
  showAmps,
  showBand,
  view,
  tier,
  navMode,
  tourStop,
  interaction,
}: SceneOptions & {
  view: View;
  tier: Tier;
  navMode: NavMode;
  tourStop: TourStop;
  interaction: ArrayInteraction;
}) {
  const q = tierSettings(tier);
  const shadows = q.shadowMapSize > 0;

  return (
    <>
      <color attach="background" args={['#0a0c0f']} />
      <fog attach="fog" args={['#0a0c0f', 55, 240]} />

      <RendererSettings tier={tier} />
      <Lighting tier={tier} />

      <Arrays colorMode={colorMode} shadows={shadows} interaction={interaction} />
      <BlockOutline blockId={interaction.hovered} />
      <BlockOutline blockId={interaction.selected} strong />
      {showScaffold && (
        <>
          <Scaffold shadows={shadows} />
          <LightBars shadows={shadows} />
          <ScaffoldFloors shadows={shadows} />
          <TieDye />
          <Cabling shadows={shadows} />
        </>
      )}
      {showAmps && <Amps shadows={shadows} />}
      {showStage && <Stage shadows={shadows} />}
      {showFigures && <ScaleFigures shadows={shadows} />}
      {showBand && <BandGear shadows={shadows} />}

      {/* Clicking past everything clears the selection. */}
      <mesh position={[0, -0.5, 0]} rotation={[-Math.PI / 2, 0, 0]} onClick={() => interaction.onSelect(null)}>
        <planeGeometry args={[400, 400]} />
        <meshBasicMaterial visible={false} />
      </mesh>

      <OrbitControls
        makeDefault
        target={view.target}
        maxPolarAngle={Math.PI / 2 - 0.02}
        minDistance={2.5}
        maxDistance={200}
        enableDamping
        dampingFactor={0.06}
      />
      {/* After OrbitControls, so `controls` is in the store when these run. */}
      {navMode === 'orbit' && <FitCamera view={view} />}
      {navMode === 'tour' && <TourCamera stop={tourStop} active />}
    </>
  );
}

export const sceneDefaults: SceneOptions = {
  colorMode: 'material',
  showScaffold: true,
  showStage: true,
  showFigures: true,
  showAmps: true,
  showBand: true,
};

export const deckHeight = wall.dimensions.stageDeckHeight;

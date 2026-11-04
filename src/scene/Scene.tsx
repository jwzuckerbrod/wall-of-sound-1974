import { OrbitControls } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import * as THREE from 'three';
import { wall } from '../data/wall.config';
import { tierSettings, type Tier } from '../quality';
import { Arrays, type ArrayInteraction, type ColorMode } from './Arrays';
import { BandGear } from './BandGear';
import { Instruments } from './Instruments';
import { RoadGear } from './RoadGear';
import { ScaleObjects, type CompareId } from './ScaleObjects';
import { BlockOutline } from './BlockOutline';
import { FitCamera } from './FitCamera';
import { Bowl } from './Bowl';
import { DaylightLighting, Lighting } from './Lighting';
import { Cabling, LightBars, Scaffold, ScaffoldFloors, ScaleFigures, Stage, TieDye } from './Structure';
import { TourCamera } from './TourCamera';
import { Hotspots, ViewOffset } from './Hotspots';
import type { Pose } from './TourCamera';
import type { View } from './views';

/** Orbit around it, or be taken round it. */
export type NavMode = 'orbit' | 'tour';

/** Where the Wall stands (wall.venues). */
export type Venue = 'arena' | 'hollywoodBowl';

export interface SceneOptions {
  colorMode: ColorMode;
  venue: Venue;
  showScaffold: boolean;
  showStage: boolean;
  showFigures: boolean;
  showAmps: boolean;
  showBand: boolean;
  /** Something of known size beside the Wall. */
  compare: CompareId;
}

/** Applies the tier's renderer-level settings, which are not props on <Canvas>. */
function RendererSettings({ tier }: { tier: Tier }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls);
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
    const w = window as unknown as Record<string, unknown>;
    w.__renderNow = () => {
      gl.render(scene, camera);
    };
    // What the last frame cost: triangles and draw calls. For comparing venues and tiers.
    w.__cost = () => {
      gl.render(scene, camera);
      const { triangles, calls } = gl.info.render;
      return { triangles, calls, geometries: gl.info.memory.geometries, textures: gl.info.memory.textures };
    };
    // Points the camera at an exact spot, for close-up captures:
    // __look([x, y, z], [tx, ty, tz], fov).
    w.__look = (p: [number, number, number], t: [number, number, number], fov?: number) => {
      const cam = camera as THREE.PerspectiveCamera;
      cam.position.set(...p);
      if (fov) cam.fov = fov;
      cam.updateProjectionMatrix();
      const c = controls as unknown as { target: THREE.Vector3; update: () => void } | null;
      if (c) {
        c.target.set(...t);
        c.update();
      } else cam.lookAt(...t);
    };
  }, [gl, scene, camera, controls]);

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
  venue,
  showScaffold,
  showStage,
  showFigures,
  showAmps,
  showBand,
  compare,
  view,
  tier,
  navMode,
  pose,
  interaction,
  activeStop,
  dots,
  onPickStop,
  onPickInstrument,
  offset,
}: SceneOptions & {
  view: View;
  tier: Tier;
  navMode: NavMode;
  /** Where the camera flies to when navMode is 'tour'. */
  pose: Pose;
  interaction: ArrayInteraction;
  activeStop: number | null;
  /** Dots on the model; off when the page runs without its interface (?hud=0, an embed). */
  dots: boolean;
  onPickStop: (i: number) => void;
  onPickInstrument: (id: string) => void;
  /** Room to make for an open card, in pixels: beside it, or above it on a phone. */
  offset: { room: number; up: number };
}) {
  const q = tierSettings(tier);
  const shadows = q.shadowMapSize > 0;
  const outdoor = wall.venues[venue].outdoor;

  return (
    <>
      <RendererSettings tier={tier} />
      {outdoor ? (
        <>
          {/* Afternoon haze down the canyon. */}
          <fog attach="fog" args={['#c9cdc8', 120, 900]} />
          <DaylightLighting tier={tier} />
          <Bowl shadows={shadows} tier={tier} />
        </>
      ) : (
        <>
          <color attach="background" args={['#0a0c0f']} />
          <fog attach="fog" args={['#0a0c0f', 55, 240]} />
          <Lighting tier={tier} />
        </>
      )}

      <Arrays colorMode={colorMode} shadows={shadows} interaction={interaction} />
      <BlockOutline blockId={interaction.hovered} />
      <BlockOutline blockId={interaction.selected} strong />
      {showScaffold && (
        <>
          <Scaffold shadows={shadows} />
          <LightBars shadows={shadows} outdoor={outdoor} />
          <ScaffoldFloors shadows={shadows} />
          {outdoor && <TieDye />}
          <Cabling shadows={shadows} />
        </>
      )}
      {showAmps && <RoadGear shadows={shadows} />}
      {showStage && <Stage shadows={shadows} outdoor={outdoor} />}
      {showFigures && <ScaleFigures shadows={shadows} />}
      {showBand && (
        <>
          <BandGear outdoor={outdoor} />
          <Instruments venue={venue} onPick={onPickInstrument} />
        </>
      )}

      <ScaleObjects compare={compare} venue={venue} shadows={shadows} />

      {/* Clicking past everything clears the selection. */}
      <mesh position={[0, -0.5, 0]} rotation={[-Math.PI / 2, 0, 0]} onClick={() => interaction.onSelect(null)} userData={{ pickable: true }}>
        <planeGeometry args={[400, 400]} />
        <meshBasicMaterial visible={false} />
      </mesh>

      <OrbitControls
        makeDefault
        target={view.target}
        maxPolarAngle={Math.PI / 2 - 0.02}
        minDistance={2.5}
        maxDistance={outdoor ? 400 : 200}
        enableDamping
        dampingFactor={0.06}
      />
      {/* After OrbitControls, so `controls` is in the store when these run. */}
      {navMode === 'orbit' && <FitCamera view={view} />}
      {navMode === 'tour' && <TourCamera stop={pose} active />}
      {/* At a tour stop the camera is in close and the dots would float over
          the shot; they come back on the overview, or when the card closes. */}
      <Hotspots active={activeStop} onPick={onPickStop} hidden={!dots || interaction.explode > 0.05 || (navMode === 'tour' && !!activeStop)} />
      <ViewOffset room={offset.room} up={offset.up} />
    </>
  );
}

export const sceneDefaults: SceneOptions = {
  colorMode: 'material',
  venue: 'arena',
  showScaffold: true,
  showStage: true,
  // Off: the instruments stand on the players' marks and give the scale now.
  showFigures: false,
  showAmps: true,
  showBand: true,
  compare: null,
};

export const deckHeight = wall.dimensions.stageDeckHeight;

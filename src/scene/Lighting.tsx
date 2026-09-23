import { Environment, Lightformer } from '@react-three/drei';
import * as THREE from 'three';
import { FT, wall } from '../data/wall.config';
import { scaffoldLayout } from '../geometry/scaffold';
import type { Tier } from '../quality';
import { tierSettings } from '../quality';

/**
 * Image-based lighting, generated in engine rather than downloaded.
 *
 * The brief asked for an HDRI environment. This is one — a genuine high dynamic
 * range cube map with emitters well above 1.0 — but it is rendered once at
 * startup from the Lightformers below instead of fetching a 2–8 MB .hdr file.
 * That keeps the whole page inside the 5 MB budget and means it works offline.
 *
 * The emitters are not decorative. Six hundred and forty-one aluminium dust
 * caps need something to reflect: without broad bright sources overhead and to
 * the sides, every driver on the wall goes dead flat and the thing stops
 * reading as a wall of speakers at all.
 */
export function Lighting({ tier }: { tier: Tier }) {
  const q = tierSettings(tier);
  const L = scaffoldLayout();
  const top = wall.dimensions.totalHeight;

  return (
    <>
      <Environment
        resolution={tier === 'low' ? 128 : 256}
        frames={1}
        background={false}
        // Without this the generated map alone over-lights every upward-facing
        // surface: the deck and the ground blow out to near-white whatever
        // their base colour is, and the shadows on them stop reading.
        environmentIntensity={wall.render.hdri.intensity}
        environmentRotation={[0, wall.render.hdri.rotation, 0]}
      >
        {/* Dark hall. */}
        <Lightformer form="rect" intensity={0.3} color="#48586e" scale={[140, 140, 1]} position={[0, 10, -80]} />
        {/* Truss wash from above and downstage — the stage lighting position. */}
        <Lightformer form="rect" intensity={16} color="#ffdfb6" scale={[30, 6, 1]} position={[0, top + 7, 16]} rotation={[-Math.PI / 3.1, 0, 0]} />
        <Lightformer form="rect" intensity={7} color="#ffeacd" scale={[18, 5, 1]} position={[-19, top + 5, 11]} rotation={[-Math.PI / 3.4, 0.5, 0]} />
        <Lightformer form="rect" intensity={7} color="#ffeacd" scale={[18, 5, 1]} position={[19, top + 5, 11]} rotation={[-Math.PI / 3.4, -0.5, 0]} />
        {/* Cool side kicks: what puts a rim on the tube scaffolding. */}
        <Lightformer form="rect" intensity={6} color="#b3d3ff" scale={[5, 24, 1]} position={[-26, 10, -3]} rotation={[0, Math.PI / 2.4, 0]} />
        <Lightformer form="rect" intensity={6} color="#b3d3ff" scale={[5, 24, 1]} position={[26, 10, -3]} rotation={[0, -Math.PI / 2.4, 0]} />
        {/* Overhead soft box: the broad source the dust caps actually reflect.
            Narrow rather than broad, so it makes highlights without becoming
            a general skylight over the whole stage. */}
        <Lightformer form="rect" intensity={4} color="#e8eeff" scale={[30, 7, 1]} position={[0, top + 12, 3]} rotation={[-Math.PI / 2, 0, 0]} />
        {/* Faint bounce off the deck, so undersides are not black holes. */}
        <Lightformer form="rect" intensity={0.8} color="#d9b98a" scale={[26, 12, 1]} position={[0, L.deck.y + 0.2, -2]} rotation={[-Math.PI / 2, 0, 0]} />
      </Environment>

      {/* Low: a hemisphere light lands its full sky colour on every upward-facing
          normal, so it hits the deck hardest of anything in the scene. */}
      <hemisphereLight args={['#8ea4bd', '#15120f', 0.22]} />

      {/* Key: warm, high, downstage — a follow-spot position, not the sun. */}
      <directionalLight
        position={[13, top + 16, 26]}
        intensity={3.3}
        color="#ffdcb0"
        castShadow={q.shadowMapSize > 0}
        shadow-mapSize={[q.shadowMapSize, q.shadowMapSize]}
        shadow-bias={-0.0006}
        shadow-normalBias={0.02}
        shadow-camera-left={-26}
        shadow-camera-right={26}
        shadow-camera-top={26}
        shadow-camera-bottom={-14}
        shadow-camera-near={1}
        shadow-camera-far={90}
      />
      {/* Fill from house left, cool and soft, no shadows. */}
      <directionalLight position={[-24, 12, 18]} intensity={1.3} color="#b6cdec" />
      {/* Upstage rim, to separate the towers from the dark behind them. */}
      <directionalLight position={[-6, 14, -28]} intensity={1.1} color="#9fbde0" />

      {/* Ground. Not a floor so much as a suggestion of the hall — and unlit,
          because it faces straight up into the key and a lit version blows out
          to near-white however dark its base colour is. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[400, 400]} />
        <meshBasicMaterial color="#0c0e11" />
      </mesh>

      {/* A hint of the arena: a dark bowl, big enough that its top edge never
          crosses the frame from any camera the tour uses. Unlit on purpose —
          a lit backdrop picks up the warm key and turns the whole frame brown. */}
      <mesh position={[0, FT(95), 0]}>
        <cylinderGeometry args={[FT(230), FT(230), FT(230), 32, 1, true]} />
        <meshBasicMaterial color="#0a0b0e" side={THREE.BackSide} fog={false} />
      </mesh>
    </>
  );
}

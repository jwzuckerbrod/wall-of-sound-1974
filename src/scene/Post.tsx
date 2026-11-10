import { Bloom, EffectComposer, SMAA, SSAO, Vignette } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import { tierSettings, type Tier } from '../quality';

/**
 * Post-processing, driven entirely by the quality tier.
 *
 * Bloom is kept deliberately low. The only things in the scene bright enough to
 * bloom are the McIntosh meters and the highlights on the aluminum dust caps,
 * and that is the point — turn it up and the whole wall goes to mush.
 *
 * At the low tier the composer is skipped entirely rather than run with its
 * effects disabled, because the composer's own render targets are most of the
 * cost on a phone.
 *
 * Tone mapping deliberately stays on the RENDERER rather than living here as a
 * ToneMapping effect. With it in the chain, switching quality also switched
 * exposure — the high tier came out visibly brighter than the low tier, and
 * `toneMappingExposure` silently did nothing because the renderer was set to
 * NoToneMapping. A quality control should change quality, not brightness.
 */
export function Post({ tier }: { tier: Tier }) {
  const q = tierSettings(tier);

  if (!q.bloom && !q.ssao) return null;

  return (
    <EffectComposer enableNormalPass={q.ssao} multisampling={0}>
      {q.ssao ? (
        <SSAO
          blendFunction={BlendFunction.MULTIPLY}
          samples={16}
          rings={4}
          distanceThreshold={0.4}
          distanceFalloff={0.15}
          rangeThreshold={0.004}
          rangeFalloff={0.002}
          luminanceInfluence={0.6}
          radius={0.09}
          intensity={14}
          bias={0.035}
          worldDistanceThreshold={40}
          worldDistanceFalloff={8}
          worldProximityThreshold={2}
          worldProximityFalloff={1}
        />
      ) : (
        <></>
      )}
      {q.bloom ? (
        <Bloom
          intensity={q.bloomStrength}
          luminanceThreshold={0.72}
          luminanceSmoothing={0.28}
          mipmapBlur
          radius={0.62}
        />
      ) : (
        <></>
      )}
      <Vignette offset={0.32} darkness={0.55} eskil={false} />
      {tier === 'high' ? <SMAA /> : <></>}
    </EffectComposer>
  );
}

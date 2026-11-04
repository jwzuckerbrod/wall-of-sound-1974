/**
 * Shared PBR materials, built once and reused across every instanced mesh.
 *
 * Colours, roughness and metalness come from wall.config.materials, so the
 * look is editable in the same file as the history. What is NOT configurable
 * is which surfaces exist: there is no grille-cloth material over the 12s and
 * 15s, because there was none. See docs/reconstruction-spec.md §9.
 */
import * as THREE from 'three';
import { wall } from '../data/wall.config';
import type { Finish } from '../geometry/arrays';
import {
  baffleMap,
  coneMap,
  deckMap,
  plywoodMap,
  plywoodRoughness,
  steelRoughness,
} from './textures';

export interface WallMaterials {
  shell: THREE.MeshStandardMaterial;
  baffle: THREE.MeshStandardMaterial;
  cone: THREE.MeshStandardMaterial;
  metal: THREE.MeshStandardMaterial;
  trim: THREE.MeshStandardMaterial;
  throat: THREE.MeshStandardMaterial;
  strip: THREE.MeshStandardMaterial;
  steel: THREE.MeshStandardMaterial;
  deck: THREE.MeshStandardMaterial;
  facing: THREE.MeshStandardMaterial;
  cable: THREE.MeshStandardMaterial;
  figure: THREE.MeshStandardMaterial;
  chrome: THREE.MeshStandardMaterial;
  caseBody: THREE.MeshStandardMaterial;
  dispose(): void;
}

let cached: WallMaterials | null = null;

export function wallMaterials(anisotropy = 4): WallMaterials {
  if (cached) return cached;
  const m = wall.materials;

  const tune = (t: THREE.Texture, repeat = 1) => {
    t.anisotropy = anisotropy;
    t.repeat.set(repeat, repeat);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  const linear = (t: THREE.Texture, repeat = 1) => {
    t.anisotropy = anisotropy;
    t.repeat.set(repeat, repeat);
    t.colorSpace = THREE.NoColorSpace;
    return t;
  };

  // The carcass material is shared by bare and painted cabinets; the per-instance
  // colour decides which one a given cabinet is. Paint over 14-ply birch still
  // shows the grain, so both use the same maps.
  const shell = new THREE.MeshStandardMaterial({
    map: tune(plywoodMap().clone()),
    roughnessMap: linear(plywoodRoughness().clone()),
    color: 0xffffff,
    roughness: m.plywood.roughness,
    metalness: m.plywood.metalness,
  });

  const baffle = new THREE.MeshStandardMaterial({
    map: tune(baffleMap().clone(), 2),
    color: m.baffle.baseColor,
    roughness: m.baffle.roughness,
    metalness: m.baffle.metalness,
    side: THREE.DoubleSide,
  });

  const cone = new THREE.MeshStandardMaterial({
    map: tune(coneMap().clone(), 1),
    color: m.cone.baseColor,
    roughness: m.cone.roughness,
    metalness: m.cone.metalness,
    side: THREE.DoubleSide,
  });

  // The one specular element on the face, and the reason the Wall reads as
  // hundreds of points of light in photographs.
  const metal = new THREE.MeshStandardMaterial({
    color: m.dustCap.baseColor,
    roughness: m.dustCap.roughness,
    metalness: m.dustCap.metalness,
    side: THREE.DoubleSide,
  });

  // The T350 horns: grey cast frame, black throat (Julien's lot 72).
  const trim = new THREE.MeshStandardMaterial({
    color: m.hornFrame.baseColor,
    roughness: m.hornFrame.roughness,
    metalness: m.hornFrame.metalness,
  });
  const throat = new THREE.MeshStandardMaterial({
    color: m.hornThroat.baseColor,
    roughness: m.hornThroat.roughness,
    metalness: m.hornThroat.metalness,
    side: THREE.DoubleSide,
  });
  // The cluster's strips, face and flanges alike (Sotheby's lot 49).
  const strip = new THREE.MeshStandardMaterial({
    color: m.stripAluminium.baseColor,
    roughness: m.stripAluminium.roughness,
    metalness: m.stripAluminium.metalness,
    side: THREE.DoubleSide,
  });

  const steel = new THREE.MeshStandardMaterial({
    color: m.steel.baseColor,
    roughnessMap: linear(steelRoughness().clone(), 3),
    roughness: m.steel.roughness,
    metalness: m.steel.metalness,
  });

  /**
   * Road-worn plywood under stage lighting. The deck is the largest single
   * surface in the scene and faces straight up into everything overhead, so it
   * kept coming out as the brightest thing in the frame.
   *
   * The fix was not more albedo tuning — it is `envMapIntensity`. Almost all of
   * what was landing on it came from the generated environment's upper
   * hemisphere, and that is controllable per material. Turning it down here
   * leaves the cabinets and the dust caps, which need the environment, exactly
   * as they were.
   */
  const deck = new THREE.MeshStandardMaterial({
    map: tune(deckMap().clone(), 10),
    color: 0xa89578,
    roughness: 0.97,
    metalness: 0,
    envMapIntensity: 1.0,
  });

  /**
   * The 5/8" plywood skirt: 82 ft wide and 10 ft tall, square-on to the key
   * light and the single largest unbroken surface in the scene. Left at any
   * ordinary "dark wood" value it blows out into a pale slab that swallows the
   * bottom third of every frame, so it is nearly black and textured. Black is also what it was: the skirt on
   * Pechner's 17 May photograph, and Blender's ('Stage skirt, black').
   */
  const facing = new THREE.MeshStandardMaterial({
    map: tune(deckMap().clone(), 14),
    color: 0x171614,
    roughness: 0.98,
    metalness: 0,
    envMapIntensity: 0.7,
  });
  const cable = new THREE.MeshStandardMaterial({ color: m.cable.baseColor, roughness: m.cable.roughness });


  // Scale reference, not a character: legible but not the brightest thing in
  // the frame, which is where a near-white figure ends up in a dark hall.
  const figure = new THREE.MeshStandardMaterial({ color: '#7d786f', roughness: 0.9 });

  const chrome = new THREE.MeshStandardMaterial({ color: '#c8ccd2', roughness: 0.22, metalness: 0.95 });
  const caseBody = new THREE.MeshStandardMaterial({ color: '#1e1c18', roughness: 0.72, metalness: 0.08 });

  cached = {
    shell, baffle, cone, metal, trim, throat, strip, steel, deck, facing, cable,
    figure,
    chrome, caseBody,
    dispose() {
      for (const v of Object.values(this)) if (v instanceof THREE.Material) v.dispose();
      cached = null;
    },
  };
  return cached;
}

/**
 * Per-cabinet colour. The surviving cabinet is painted matte black all over;
 * photographs show others with the plywood left bare. Which is which is
 * decided once, in src/geometry/arrays.ts, so Blender finishes the same
 * cabinets the same way. `index` only varies the road wear.
 */
export function shellColor(index: number, out: THREE.Color, finish: Finish): THREE.Color {
  const m = wall.materials;
  // The strips take their colour from their own material.
  if (finish === 'metal') return out.setRGB(1, 1, 1);
  const painted = finish === 'black';
  out.set(painted ? m.plywoodBlack.baseColor : m.plywood.baseColor);
  // Road wear: every cabinet a little different, none of them clean.
  const wear = (((index * 40503) % 211) / 211 - 0.5) * (painted ? 0.1 : 0.22);
  // Bare ply also drifts in hue: sun, spills and age, some boards yellower than others.
  const drift = painted ? 0 : (((index * 7919) % 101) / 101 - 0.5) * 0.03;
  out.offsetHSL(drift, 0, wear);
  return out;
}

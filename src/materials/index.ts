/**
 * Shared PBR materials, built once and reused across every instanced mesh.
 *
 * Colours, roughness and metalness come from wall.config.materials, so the
 * look is editable in the same file as the history. What is NOT configurable
 * is which surfaces exist: there is no grille-cloth material over the 12s and
 * 15s, because there was none. See docs/reconstruction-spec.md §9.
 */
import * as THREE from 'three';
import { wall, type CabinetId } from '../data/wall.config';
import { baffleMap, coneMap, deckMap, plywoodMap, plywoodRoughness, steelRoughness, tieDyeMap } from './textures';

export interface WallMaterials {
  shell: THREE.MeshStandardMaterial;
  baffle: THREE.MeshStandardMaterial;
  cone: THREE.MeshStandardMaterial;
  metal: THREE.MeshStandardMaterial;
  steel: THREE.MeshStandardMaterial;
  deck: THREE.MeshStandardMaterial;
  facing: THREE.MeshStandardMaterial;
  cable: THREE.MeshStandardMaterial;
  ampBody: THREE.MeshStandardMaterial;
  ampGlass: THREE.MeshStandardMaterial;
  ampMeter: THREE.MeshStandardMaterial;
  tieDye: THREE.MeshStandardMaterial;
  figure: THREE.MeshStandardMaterial;
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
   * bottom third of every frame, so it is nearly black and textured.
   */
  const facing = new THREE.MeshStandardMaterial({
    map: tune(deckMap().clone(), 14),
    color: 0x413a30,
    roughness: 0.98,
    metalness: 0,
    envMapIntensity: 0.7,
  });
  const cable = new THREE.MeshStandardMaterial({ color: m.cable.baseColor, roughness: m.cable.roughness });

  const ampBody = new THREE.MeshStandardMaterial({ color: '#2a2d31', roughness: 0.45, metalness: 0.75 });
  const ampGlass = new THREE.MeshStandardMaterial({
    color: m.ampGlass.baseColor,
    roughness: m.ampGlass.roughness,
    metalness: m.ampGlass.metalness,
  });
  // Emissive so the bloom pass catches it. This is the detail everyone who
  // stood in front of the Wall remembers: a bank of blue meters in the dark.
  const ampMeter = new THREE.MeshStandardMaterial({
    color: '#0b1a2a',
    emissive: new THREE.Color(wall.structure.amps.meterColor),
    emissiveIntensity: wall.structure.amps.meterEmissiveIntensity,
    roughness: 0.3,
  });

  const tieDye = new THREE.MeshStandardMaterial({
    map: tune(tieDyeMap().clone(), 1),
    color: 0x9a938a,
    roughness: 0.98,
    metalness: 0,
    side: THREE.DoubleSide,
  });

  // Scale reference, not a character: legible but not the brightest thing in
  // the frame, which is where a near-white figure ends up in a dark hall.
  const figure = new THREE.MeshStandardMaterial({ color: '#7d786f', roughness: 0.9 });

  cached = {
    shell, baffle, cone, metal, steel, deck, facing, cable,
    ampBody, ampGlass, ampMeter, tieDye, figure,
    dispose() {
      for (const v of Object.values(this)) if (v instanceof THREE.Material) v.dispose();
      cached = null;
    },
  };
  return cached;
}

/**
 * Per-cabinet finish. The surviving cabinet is painted matte black all over;
 * photographs show others with the plywood left bare. Both existed, so the
 * wall is mixed — deterministically, so it looks the same on every visit.
 */
export function shellColor(index: number, out: THREE.Color, cabinet?: CabinetId): THREE.Color {
  const m = wall.materials;
  // The 5-inch and horn sections were not discrete boxes but one big black
  // baffle board drilled with cutouts, which is exactly what the close-up
  // photographs show. So those never take the bare-plywood finish.
  const alwaysBlack = cabinet === 'panel5' || cabinet === 'panelHF';
  const r = ((index * 2654435761) % 1013) / 1013;
  const painted = alwaysBlack || r < m.blackFinishRatio;
  out.set(painted ? m.plywoodBlack.baseColor : m.plywood.baseColor);
  // Road wear: every cabinet a little different, none of them clean.
  const wear = (((index * 40503) % 211) / 211 - 0.5) * (painted ? 0.1 : 0.22);
  out.offsetHSL(0, painted ? 0 : -0.02, wear);
  return out;
}

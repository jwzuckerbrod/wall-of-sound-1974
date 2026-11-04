import { useEffect, useState } from 'react';
import * as THREE from 'three';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { wall } from '../data/wall.config';
import type { Venue } from './Scene';

/**
 * The band's instruments: the Wolf, the ES-335, Mission Control, the grand,
 * the Rhodes and the kit, exported from the same Blender models the renders
 * use (blender/export_instruments.py), already standing where the renders
 * stand them, with their materials baked to textures. Fetched after the Wall
 * is up, so they never hold up the first view. At the Bowl the kit is the
 * wine-red one (band.instruments.bowlKitShell).
 *
 * The guitars and the bass rest on plain stands, a review prop: they belong
 * in the players' hands. See PROVENANCE['band.instrumentPlacement'].
 */

const BASE = `${import.meta.env.BASE_URL}models/`;
const COMMON = ['garcia', 'weir', 'lesh', 'piano', 'rhodes', 'stands'];

let loader: GLTFLoader | null = null;
function gltfLoader() {
  if (!loader) {
    const draco = new DRACOLoader().setDecoderPath(`${import.meta.env.BASE_URL}draco/`).setDecoderConfig({ type: 'wasm' });
    loader = new GLTFLoader().setDRACOLoader(draco);
  }
  return loader;
}

const cache = new Map<string, Promise<THREE.Group>>();
function model(name: string) {
  let p = cache.get(name);
  if (!p) {
    p = gltfLoader()
      .loadAsync(`${BASE}${name}.glb`)
      .then((g) => {
        g.scene.traverse((o) => {
          if ((o as THREE.Mesh).isMesh) {
            o.castShadow = true;
            o.receiveShadow = true;
          }
        });
        return g.scene;
      });
    cache.set(name, p);
  }
  return p;
}

/** Two of the crew at the top corners of the scaffold (structure.crewAloft), fetched after the Wall is up. */
export function CrewAloft() {
  const [crew, setCrew] = useState<THREE.Group | null>(null);
  useEffect(() => {
    let live = true;
    model('crew')
      .then((g) => {
        // Nothing near them to shadow, and three times the triangles to draw it.
        g.traverse((o) => {
          o.castShadow = false;
        });
        if (live) setCrew(g);
      })
      .catch((e) => console.warn('crew:', e));
    return () => {
      live = false;
    };
  }, []);
  return crew && <primitive object={crew} />;
}

export function Instruments({ venue, onPick }: { venue: Venue; onPick: (id: string) => void }) {
  const names = [...COMMON, venue === 'hollywoodBowl' ? 'drums-bowl' : 'drums'];
  const [loaded, setLoaded] = useState<Record<string, THREE.Group>>({});
  const key = names.join(',');
  useEffect(() => {
    let live = true;
    for (const n of key.split(','))
      model(n)
        .then((g) => live && setLoaded((s) => ({ ...s, [n]: g })))
        .catch((e) => console.warn(`instrument ${n}:`, e));
    return () => {
      live = false;
    };
  }, [key]);
  return (
    <group name="instruments">
      {names.map(
        (n) =>
          loaded[n] && (
            // Click one for its card. The stands are a prop, not an instrument.
            <group
              key={n}
              userData={{ pickable: n !== 'stands' }}
              onClick={
                n === 'stands'
                  ? undefined
                  : (e) => {
                      e.stopPropagation();
                      onPick(n === 'drums-bowl' ? 'drums' : n);
                    }
              }
            >
              <primitive object={loaded[n]} position={[0, n === 'drums-bowl' ? wall.band.instruments.bowlKitRiser.h : 0, 0]} />
            </group>
          ),
      )}
    </group>
  );
}

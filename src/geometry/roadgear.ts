/**
 * The road gear on the deck, as a plan: where each amp rack and loose case
 * stands, what each is (orange, white or black Anvil; a stack of ZERO cases),
 * and every label, name, sticker and strip of tape on it.
 *
 * Every choice is made here, once, with a seeded generator, so the explorer
 * (src/scene/RoadGear.tsx) and Blender (blender/roadgear.py, via scene.json)
 * build the same cases with the same marks in the same places. Pure: no
 * three.js, so scripts/export-scene.mjs can run it.
 *
 * Face coordinates: x across the face as you look at it, z up from the foot of
 * the case (for an amp, from the middle of its front panel), metres.
 *
 * Modelled on the survivors (PROVENANCE['structure.roadCases']); the stickers
 * are an artistic choice, labelled as such (PROVENANCE['materials.stickers']).
 */
import { IN, wall } from '../data/wall.config';
import { generator } from './random';
import { scaffoldLayout, stageCases } from './scaffold';

export type CaseStyle = 'orange' | 'white' | 'black';
export type Paint = 'stamp' | 's_black' | 's_white';

export type Decal =
  /** A strip of tape, with something written on it in felt-tip or not. */
  | { kind: 'tape'; tape: 'masking' | 'duct' | 'gaffer'; at: [number, number]; length: number; width: number; angle: number; text?: string }
  /** The skull-and-bolt as a die-cut colour sticker. */
  | { kind: 'skullSticker'; at: [number, number]; height: number }
  /** The skull-and-bolt sprayed through a stencil in one colour, as on Budman's case. */
  | { kind: 'skullStamp'; at: [number, number]; height: number; paint: Paint }
  /** The black "GRATEFUL DEAD" sticker. */
  | { kind: 'wordSticker'; at: [number, number]; width: number }
  /** "GRATEFUL" over "DEAD", sprayed through a stencil, as on Budman's case. */
  | { kind: 'wordStencil'; at: [number, number]; width: number; paint: Paint }
  /** Stencilled lettering: a case's name. */
  | { kind: 'stencilText'; at: [number, number]; text: string; size: number; paint: Paint }
  /** The 1969 lightning-bolt mark at its true 5 1/2". */
  | { kind: 'bolt'; at: [number, number] };

export interface Rack {
  /** Front centre of the amps, scene frame; y is the deck. */
  front: [number, number, number];
  style: CaseStyle;
  name: string | null;
  /** The case, outer size w × h × d, casters included in h. */
  size: [number, number, number];
  /** Per amp, bottom to top: the labels on its front panel. */
  amps: { y: number; decals: Decal[] }[];
  /** The case's two ends, audience left (-1) and right (+1). */
  ends: { side: -1 | 1; decals: Decal[] }[];
}

export interface ZeroCase {
  /** Foot centre, scene frame. */
  pos: [number, number, number];
  rot: number;
  colour: 'orange' | 'purple';
  decals: Decal[];
}

export interface LooseCase {
  pos: [number, number, number];
  rot: number;
  size: [number, number, number];
  style: 'orange' | 'black';
  front: Decal[];
}

export interface RoadGearPlan {
  racks: Rack[];
  zeros: ZeroCase[];
  cases: LooseCase[];
}

/** Where the racks stand: twelve of four, spread across the tower, as scripts/export-scene.mjs had it. */
export function rackFronts(L = scaffoldLayout()): [number, number, number][] {
  const { rackCount, z } = wall.structure.amps;
  const span = L.footprint.width * 0.82;
  return Array.from({ length: rackCount }, (_, r) => [-span / 2 + (span / (rackCount - 1)) * r, L.deck.y, z]);
}

export function rackSize(): [number, number, number] {
  const A = wall.structure.amps;
  const C = wall.structure.roadCases;
  return [
    A.size.w + 2 * C.wall + 0.02,
    C.casterHeight + 2 * C.wall + A.perRack * (A.size.h + C.slotGap) + 0.01,
    A.size.d + C.rackSetback + 0.04,
  ];
}

let cached: RoadGearPlan | null = null;

export function roadGearPlan(L = scaffoldLayout()): RoadGearPlan {
  if (cached) return cached;
  const A = wall.structure.amps;
  const C = wall.structure.roadCases;
  const odds = C.odds;
  const rng = generator(C.seed);
  const names: readonly string[] = A.caseNames;
  const stickers = A.stickers;

  const tapeStrip = (at: [number, number], gaffer = false): Decal => ({
    kind: 'tape',
    tape: gaffer ? 'gaffer' : 'masking',
    at,
    length: rng.uniform(2.5, 7.0) * IN(1),
    width: (gaffer ? 2.0 : 1.0) * IN(1),
    angle: rng.uniform(-0.25, 0.25),
  });

  // Racks.
  const [rw, rh] = rackSize();
  const racks: Rack[] = rackFronts(L).map((front, n) => {
    // One name per amp case: there was only one Budman. Racks past the list go unnamed.
    const name = n < names.length ? names[n] : null;
    // Budman's case is black (lot 36); of the other surviving cased amps,
    // five are orange and one white.
    const style: CaseStyle = name === 'Budman' ? 'black' : rng.random() < odds.rackWhite ? 'white' : 'orange';

    const amps = Array.from({ length: A.perRack }, (_, k) => {
      const unit = n * A.perRack + k;
      // As on the surviving amps (docs/surviving-gear.md): a white tape strip
      // under the meters with a four-digit number, duct tape with an "M-"
      // number by the badge; now and then a sticker.
      const decals: Decal[] = [
        { kind: 'tape', tape: 'masking', at: [IN(-1.6), IN(0.35)], length: IN(3.2), width: IN(0.85), angle: 0, text: String(1001 + unit) },
      ];
      if (rng.random() < odds.ampDuctLabel)
        decals.push({ kind: 'tape', tape: 'duct', at: [IN(5.7), IN(3.75)], length: IN(1.9), width: IN(1.9), angle: 0, text: `M-${unit + 1}` });
      if (stickers && rng.random() < odds.ampSticker) decals.push({ kind: 'skullSticker', at: [IN(6.9), IN(0.4)], height: IN(1.6) });
      const y = C.casterHeight + C.wall + (A.size.h + C.slotGap) * k + C.slotGap / 2 + A.size.h / 2;
      return { y, decals };
    });

    const ends = ([-1, 1] as const).map((side) => {
      const decals: Decal[] = [];
      const rd = rackSize()[2];
      if (style === 'black') {
        if (stickers && side === -1) decals.push({ kind: 'wordStencil', at: [0, rh * 0.42], width: rd * 0.62, paint: 'stamp' });
        else if (stickers) decals.push({ kind: 'skullStamp', at: [0, rh * 0.45], height: Math.min(rd * 0.75, 0.36), paint: 'stamp' });
        if (name && side === 1) decals.push({ kind: 'stencilText', at: [0, rh * 0.18], text: name.toUpperCase(), size: IN(3.0), paint: 'stamp' });
      } else {
        if (name && rng.random() < odds.endName)
          decals.push({ kind: 'stencilText', at: [rng.uniform(-0.08, 0.08), rh * rng.uniform(0.22, 0.32)], text: name.toUpperCase(), size: IN(3.4), paint: 's_black' });
        if (stickers && rng.random() < odds.endWordSticker)
          decals.push({ kind: 'wordSticker', at: [rng.uniform(-0.08, 0.06), rh * rng.uniform(0.62, 0.74)], width: IN(8.0) });
        if (stickers && rng.random() < odds.endSkull)
          decals.push({ kind: 'skullSticker', at: [rng.uniform(0.07, 0.12), rh * rng.uniform(0.4, 0.5)], height: IN(4.5) });
      }
      for (let i = rng.int(0, 2); i > 0; i--) decals.push(tapeStrip([rng.uniform(-0.15, 0.15), rh * rng.uniform(0.2, 0.85)], rng.random() < 0.4));
      return { side, decals };
    });

    return { front, style, name, size: [rw, rh, rackSize()[2]], amps, ends };
  });

  // Loose cases along the upstage edge. Most spots get the amps' empty ZERO
  // cases, stacked: the cases dated to the Wall (lots 34-35). The rest are
  // Anvil trunks.
  const zeros: ZeroCase[] = [];
  const cases: LooseCase[] = [];
  const Z = C.zeroSize;
  let below: 'zero' | 'case' | null = null;
  stageCases(L).forEach((c, i) => {
    const [w, h, d] = c.size;
    const foot: [number, number, number] = [c.pos[0], L.deck.y + c.pos[1], c.pos[2]];
    const stacked = c.pos[1] > 0;
    // A case meant to stand on the one below: the ZERO stacks are already one
    // or two high, so nothing goes on them; on an Anvil, another Anvil.
    if (stacked && below === 'zero') return;
    const zero = !stacked && rng.random() < odds.looseZero;
    below = zero ? 'zero' : 'case';
    if (zero) {
      const across = Math.max(1, Math.floor(w / (Z.w + 0.03)));
      for (let a = 0; a < across; a++) {
        for (let lvl = 0, n = rng.int(1, 2); lvl < n; lvl++) {
          const colour = rng.random() < odds.zeroPurple ? 'purple' : 'orange';
          const off = (a - (across - 1) / 2) * (Z.w + 0.03);
          const decals: Decal[] = [];
          if (names.length && rng.random() < odds.zeroName)
            decals.push({ kind: 'stencilText', at: [0, Z.h * 0.62], text: rng.choice(names).toUpperCase(), size: IN(2.2), paint: 's_white' });
          for (let t = rng.int(0, 2); t > 0; t--) decals.push(tapeStrip([rng.uniform(-0.15, 0.15), rng.uniform(0.1, Z.h - 0.08)]));
          zeros.push({
            pos: [foot[0] + off * Math.cos(c.rot), foot[1] + lvl * Z.h, foot[2] - off * Math.sin(c.rot)],
            rot: c.rot + rng.uniform(-0.06, 0.06),
            colour,
            decals,
          });
        }
      }
      return;
    }
    const style = rng.random() < odds.looseBlack ? 'black' : 'orange';
    const lo = C.casterHeight + 0.08;
    const hi = C.casterHeight + (h - C.casterHeight) * 0.7;
    const front: Decal[] = [];
    if (style === 'black') {
      // As Budman's: the wordmark stencilled big across the front.
      if (stickers) front.push({ kind: 'wordStencil', at: [-w * 0.08, (lo + hi) / 2], width: Math.min(w * 0.55, 0.5), paint: 'stamp' });
      front.push({ kind: 'bolt', at: [w * 0.36, lo + 0.06] });
    } else {
      front.push({ kind: 'bolt', at: [w * 0.28, (lo + hi) / 2 + 0.03] });
      // Too short a case and the stencil would sit under the stickers.
      if (names.length && h > 0.6 && rng.random() < odds.frontName)
        front.push({ kind: 'stencilText', at: [-w * 0.28, lo + 0.06], text: names[i % names.length].toUpperCase(), size: IN(3.6), paint: 's_black' });
      if (stickers && rng.random() < odds.frontWordSticker)
        front.push({ kind: 'wordSticker', at: [-w * rng.uniform(0.05, 0.2), hi - 0.06], width: Math.min(IN(9.0), w * 0.42) });
      if (stickers && rng.random() < odds.frontSkull) front.push({ kind: 'skullSticker', at: [w * rng.uniform(0.0, 0.1), lo + 0.07], height: IN(4.5) });
    }
    for (let t = rng.int(1, 3); t > 0; t--) front.push(tapeStrip([rng.uniform(-0.4, 0.4) * w, rng.uniform(lo, hi)], rng.random() < 0.45));
    cases.push({ pos: foot, rot: c.rot, size: [w, h, d], style, front });
  });

  cached = { racks, zeros, cases };
  return cached;
}

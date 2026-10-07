/**
 * Canvas textures for the road gear: the MC 2300's front panel, and one atlas
 * holding every label, name, sticker and stencil in the plan
 * (src/geometry/roadgear.ts), so all of them draw in a single call.
 *
 * Drawn from the same sources Blender's meshes are (blender/roadgear.py): the
 * straight-on photograph of Budman (Sotheby's 2021 lot 36) for the panel, the
 * traced marks in blender/marks/ for the skull-and-bolt and the stencilled
 * wordmark, and the shared bolt outline (src/geometry/logo.ts) for the 1969
 * mark.
 */
import * as THREE from 'three';
import { IN, wall } from '../data/wall.config';
import { BOLT, BOLT_BOTTOM } from '../geometry/logo';
import type { Decal } from '../geometry/roadgear';

type Loops = number[][][];
export interface Marks {
  skull: Record<'black' | 'white' | 'red' | 'blue', Loops>;
  word: Loops;
}

export const INK = {
  masking: '#d8cfb4',
  duct: '#8d8f8f',
  gaffer: '#1b1b1b',
  marker: '#151515',
  stamp: '#dcd6c6',
  s_black: '#141414',
  s_white: '#ece6d8',
  v_white: '#ece6d6',
  v_black: '#121212',
  v_red: '#b3342b',
  v_blue: '#2a4a86',
};

const SANS = 'Arial, Helvetica, sans-serif';
const SERIF = 'Georgia, "Times New Roman", serif';
const STENCIL = '"DIN Condensed", "Arial Narrow", "Roboto Condensed", Arial, sans-serif';

function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return { c, ctx: c.getContext('2d')! };
}

/** Text centred on (x, y), shrunk to fit `width` if given. */
function text(ctx: CanvasRenderingContext2D, s: string, font: string, px: number, x: number, y: number, width?: number) {
  ctx.font = `bold ${px}px ${font}`;
  const m = ctx.measureText(s).width;
  const k = width && m > width ? width / m : 1;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(k, 1);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(s, 0, 0);
  ctx.restore();
}

/** Closed outlines, y up, filled even-odd: a traced colour region with its holes. */
function loops(ctx: CanvasRenderingContext2D, L: Loops, scale: number, colour: string) {
  ctx.fillStyle = colour;
  ctx.beginPath();
  for (const lp of L) {
    lp.forEach(([x, y], i) => (i ? ctx.lineTo(x * scale, -y * scale) : ctx.moveTo(x * scale, -y * scale)));
    ctx.closePath();
  }
  ctx.fill('evenodd');
}

// ─── the MC 2300 panel ───────────────────────────────────────────────────────

/**
 * The front panel at 54 px an inch, laid out from the Budman photograph as
 * blender/roadgear.py mc2300() places its parts (x across from the panel's
 * centre, z up from it, inches). Returns the colour map and an emissive map
 * that lights only the meter faces.
 */
export function mc2300Panel(): { map: THREE.CanvasTexture; emissive: THREE.CanvasTexture } {
  const A = wall.structure.amps;
  const ppi = 54;
  const W = Math.round((A.size.w / IN(1)) * ppi);
  const H = Math.round((A.size.h / IN(1)) * ppi);
  const X = (x: number) => W / 2 + x * ppi;
  const Y = (z: number) => H / 2 - z * ppi;
  const { c, ctx } = canvas(W, H);
  const glow = canvas(W, H);

  // Brushed gold: horizontal streaks over the anodizing.
  ctx.fillStyle = A.panel.gold;
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 1400; i++) {
    const y = Math.random() * H;
    ctx.fillStyle = Math.random() < 0.5 ? 'rgba(255,245,215,0.10)' : 'rgba(90,75,40,0.08)';
    ctx.fillRect(Math.random() * W - 40, y, 40 + Math.random() * 300, 1);
  }
  // The black strip along the bottom.
  const stripH = (A.panel.stripHeight / IN(1)) * ppi;
  ctx.fillStyle = A.panel.strip;
  ctx.fillRect(0, H - stripH, W, stripH);
  const sz = -A.size.h / IN(1) / 2 + A.panel.stripHeight / IN(1) / 2;
  ctx.fillStyle = '#e9e2cf';
  for (const [x, label] of [[-5.7, 'LEFT GAIN'], [-1.7, 'RIGHT/MONO GAIN'], [2.6, 'METER RANGE']] as [number, string][]) {
    text(ctx, label, SANS, 0.11 * ppi, X(x), Y(sz + 0.95), 1.4 * ppi);
    for (let k = 0; k < 6; k++) for (const sx of [-1, 1]) ctx.fillRect(X(x + sx * 0.95) - 0.15 * ppi, Y(sz + 0.65 - k * 0.24), 0.3 * ppi, 1.2);
  }
  text(ctx, 'ON', SANS, 0.11 * ppi, X(6.55), Y(sz + 0.35));
  text(ctx, 'OFF', SANS, 0.11 * ppi, X(6.6), Y(sz - 0.6));

  // The meters: black bezel, lit face, scale, needle.
  const mz = 2.7;
  glow.ctx.fillStyle = '#000';
  glow.ctx.fillRect(0, 0, W, H);
  for (const mx of [-4.37, 1.2]) {
    ctx.fillStyle = '#0b0b0b';
    ctx.fillRect(X(mx - 2.5), Y(mz + 1.225), 5.0 * ppi, 2.45 * ppi);
    ctx.fillStyle = '#5fb4ff';
    ctx.fillRect(X(mx - 2.25), Y(mz + 1.0), 4.5 * ppi, 2.0 * ppi);
    glow.ctx.fillStyle = '#ffffff';
    glow.ctx.fillRect(X(mx - 2.25), Y(mz + 1.0), 4.5 * ppi, 2.0 * ppi);
    ctx.strokeStyle = '#06121f';
    ctx.lineWidth = 1.5;
    const cx = X(mx);
    const cy = Y(mz - 1.05);
    ctx.beginPath();
    ctx.arc(cx, cy, 1.9 * ppi, -Math.PI / 2 - 0.8, -Math.PI / 2 + 0.8);
    ctx.stroke();
    for (let k = -5; k <= 5; k++) {
      const a = (k * 9 * Math.PI) / 180;
      ctx.beginPath();
      ctx.moveTo(cx + Math.sin(a) * 1.82 * ppi, cy - Math.cos(a) * 1.82 * ppi);
      ctx.lineTo(cx + Math.sin(a) * 1.98 * ppi, cy - Math.cos(a) * 1.98 * ppi);
      ctx.stroke();
    }
    ctx.fillStyle = '#1d1a14';
    text(ctx, 'POWER LEVEL', SANS, 0.17 * ppi, X(mx), Y(mz - 0.25));
    text(ctx, 'DECIBELS', SANS, 0.11 * ppi, X(mx), Y(mz - 0.5));
    const a = (-40 * Math.PI) / 180;
    ctx.strokeStyle = '#050505';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.sin(a) * 2.1 * ppi, cy - Math.cos(a) * 2.1 * ppi);
    ctx.stroke();
  }
  ctx.fillStyle = '#1d1a14';
  text(ctx, '300/300  WATT  STEREO  POWER  AMPLIFIER', SANS, 0.28 * ppi, X(-0.3), Y(-1.4), 14 * ppi);
  // The badge, upper right: McIntosh over MC 2300.
  ctx.fillStyle = '#0b0b0b';
  ctx.fillRect(X(5.7 - 1.2), Y(2.65 + 0.375), 2.4 * ppi, 0.75 * ppi);
  ctx.fillStyle = '#e9e2cf';
  text(ctx, 'McIntosh', SERIF, 0.5 * ppi, X(5.7), Y(2.65), 2.1 * ppi);
  ctx.fillStyle = '#1d1a14';
  text(ctx, 'MC 2300', SANS, 0.22 * ppi, X(5.7), Y(1.95));
  // Slotted rack ears.
  ctx.fillStyle = '#0a0909';
  for (const sx of [-1, 1]) for (const z of [4.4, 1.4, -1.6, -4.4]) ctx.fillRect(X(sx * 9.25) - 0.175 * ppi, Y(z) - 0.08 * ppi, 0.35 * ppi, 0.16 * ppi);

  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  const emissive = new THREE.CanvasTexture(glow.c);
  emissive.colorSpace = THREE.SRGBColorSpace;
  return { map, emissive };
}

// ─── decals ──────────────────────────────────────────────────────────────────

/** A decal's size on its face, metres, before any rotation. */
export function decalSize(d: Decal, marks: Marks): [number, number] {
  switch (d.kind) {
    case 'tape': return [d.length, d.width];
    case 'skullSticker': return [d.height, d.height];
    case 'skullStamp': return [d.height, d.height];
    case 'wordSticker': return [d.width + 0.006, d.width * 0.32 + 0.006];
    case 'wordStencil': {
      let ys = 0;
      for (const lp of marks.word) for (const [, y] of lp) ys = Math.max(ys, Math.abs(y));
      return [d.width, 2 * ys * d.width];
    }
    case 'stencilText': {
      const { ctx } = canvas(1, 1);
      ctx.font = `bold 100px ${STENCIL}`;
      return [(ctx.measureText(d.text).width / 100) * d.size * 1.05, d.size * 0.85];
    }
    case 'bolt': return [wall.band.logo.diameter, wall.band.logo.diameter];
  }
}

/** Draws one decal centred on the origin, `s` pixels a metre, y down. */
export function drawDecal(ctx: CanvasRenderingContext2D, d: Decal, s: number, marks: Marks) {
  switch (d.kind) {
    case 'tape': {
      const L = d.length * s;
      const W = d.width * s;
      ctx.fillStyle = INK[d.tape];
      ctx.fillRect(-L / 2, -W / 2, L, W);
      if (d.text) {
        ctx.fillStyle = INK.marker;
        text(ctx, d.text, SANS, d.width * 0.62 * s, 0, 0, L * 0.8);
      }
      return;
    }
    case 'skullSticker': {
      const R = (d.height / 2 / 1.04) * s;
      ctx.fillStyle = INK.v_white;
      ctx.beginPath();
      ctx.arc(0, 0, 1.04 * R, 0, Math.PI * 2);
      ctx.fill();
      for (const col of ['black', 'white', 'red', 'blue'] as const) loops(ctx, marks.skull[col], R, INK[`v_${col}`]);
      return;
    }
    case 'skullStamp':
      loops(ctx, marks.skull.black, (d.height / 2) * s, INK[d.paint]);
      return;
    case 'wordSticker': {
      const w = d.width * s;
      const h = w * 0.32;
      const round = (rw: number, rh: number, r: number, col: string) => {
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.roundRect(-rw / 2, -rh / 2, rw, rh, r);
        ctx.fill();
      };
      round(w + 0.006 * s, h + 0.006 * s, 0.006 * s, INK.v_white);
      round(w, h, 0.005 * s, INK.v_black);
      ctx.fillStyle = INK.v_white;
      text(ctx, 'G', SERIF, h * 1.1, -w * 0.34, h * 0.02);
      text(ctx, 'RATEFUL', SERIF, h * 0.42, w * 0.08, -h * 0.2, w * 0.66);
      text(ctx, 'DEAD', SERIF, h * 0.42, w * 0.12, h * 0.24, w * 0.4);
      return;
    }
    case 'wordStencil':
      loops(ctx, marks.word, d.width * s, INK[d.paint]);
      return;
    case 'stencilText':
      ctx.fillStyle = INK[d.paint];
      text(ctx, d.text, STENCIL, d.size * s, 0, 0);
      return;
    case 'bolt': {
      // The 1969 equipment mark: a white circle, red above and blue below,
      // split by a jagged white lightning bolt. No skull. Owsley Stanley's
      // account (thebear.org/GDLogo.html) gives the build: a 5 1/2" circle of
      // white, then a 5" field sprayed red on top and blue below through a
      // half-circle stencil with a jagged edge, the white showing through as
      // the bolt and as a 1/4" rim.
      const r = (wall.band.logo.diameter / 2) * s;
      const R = (r / 5.5) * 5;
      const P = (i: number): [number, number] => [BOLT[i][0] * R, BOLT[i][1] * R];
      const ang = (i: number) => Math.atan2(BOLT[i][1], BOLT[i][0]);
      ctx.fillStyle = INK.s_white;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = INK.v_blue;
      ctx.beginPath();
      for (let i = 0; i <= BOLT_BOTTOM; i++) ctx.lineTo(...P(i));
      ctx.arc(0, 0, R, ang(BOLT_BOTTOM), ang(0), true);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = INK.v_red;
      ctx.beginPath();
      ctx.moveTo(...P(BOLT_BOTTOM));
      for (let i = BOLT_BOTTOM + 1; i < BOLT.length; i++) ctx.lineTo(...P(i));
      ctx.lineTo(...P(0));
      ctx.arc(0, 0, R, ang(0), ang(BOLT_BOTTOM), true);
      ctx.closePath();
      ctx.fill();
      return;
    }
  }
}

export interface AtlasCell {
  /** UV rectangle in the atlas: u0, v0, u1, v1. */
  uv: [number, number, number, number];
}

/**
 * Packs every decal into one canvas, shelf by shelf, at `density` pixels a
 * metre (lowered until everything fits). Returns the texture and each
 * decal's UVs, in the order given.
 */
export function decalAtlas(decals: Decal[], marks: Marks, size = 2048): { texture: THREE.CanvasTexture; cells: AtlasCell[] } {
  const pad = 3;
  for (let density = 1600; density > 100; density *= 0.85) {
    const boxes = decals.map((d) => decalSize(d, marks).map((v) => Math.ceil(v * density) + 2 * pad) as [number, number]);
    const order = boxes.map((_, i) => i).sort((a, b) => boxes[b][1] - boxes[a][1]);
    const pos: [number, number][] = [];
    let x = 0;
    let y = 0;
    let shelf = 0;
    let fits = true;
    for (const i of order) {
      const [w, h] = boxes[i];
      if (x + w > size) {
        x = 0;
        y += shelf;
        shelf = 0;
      }
      if (w > size || y + h > size) {
        fits = false;
        break;
      }
      pos[i] = [x, y];
      x += w;
      shelf = Math.max(shelf, h);
    }
    if (!fits) continue;
    const { c, ctx } = canvas(size, size);
    const cells: AtlasCell[] = decals.map((d, i) => {
      const [w, h] = boxes[i];
      const [px, py] = pos[i];
      ctx.save();
      ctx.translate(px + w / 2, py + h / 2);
      drawDecal(ctx, d, density, marks);
      ctx.restore();
      return { uv: [(px + pad) / size, 1 - (py + h - pad) / size, (px + w - pad) / size, 1 - (py + pad) / size] };
    });
    const texture = new THREE.CanvasTexture(c);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    return { texture, cells };
  }
  throw new Error('decalAtlas: decals do not fit');
}

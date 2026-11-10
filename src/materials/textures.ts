/**
 * Every texture in the reconstruction is generated at load, on a canvas.
 *
 * Nothing is downloaded. The brief allows about 5 MB for the initial load and
 * three.js alone is 184 KB gzipped, so spending megabytes on wood grain would
 * be a poor trade — especially for a page that has to work on a phone. These
 * are cached by key, so a texture is built once however many materials use it.
 */
import * as THREE from 'three';

const cache = new Map<string, THREE.Texture>();

function make(key: string, size: number, draw: (ctx: CanvasRenderingContext2D, s: number) => void): THREE.Texture {
  const hit = cache.get(key);
  if (hit) return hit;

  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  draw(ctx, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  cache.set(key, tex);
  return tex;
}

// ─── noise ───────────────────────────────────────────────────────────────────

/** Deterministic hash noise — same wall every visit, no seeded-RNG bookkeeping. */
function hash(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

function valueNoise(x: number, y: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi);
  const b = hash(xi + 1, yi);
  const c = hash(xi, yi + 1);
  const d = hash(xi + 1, yi + 1);
  return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
}

function fbm(x: number, y: number, octaves = 4): number {
  let sum = 0;
  let amp = 0.5;
  let freq = 1;
  for (let i = 0; i < octaves; i++) {
    sum += valueNoise(x * freq, y * freq) * amp;
    freq *= 2;
    amp *= 0.5;
  }
  return sum;
}

// ─── plywood ─────────────────────────────────────────────────────────────────

/**
 * 14-ply laminated Finnish birch, as described on the one surviving cabinet:
 * pale, close-grained, and thoroughly road-worn. Grain runs horizontally;
 * the scuffs are heaviest at the edges, where cabinets were handled.
 */
export const plywoodMap = () =>
  make('plywood', 512, (ctx, s) => {
    const img = ctx.createImageData(s, s);
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        // Grain: stretched noise plus a ring-like modulation across the board.
        const grain = fbm(x / 14, y / 130, 5);
        const rings = Math.sin((x / s) * 34 + fbm(x / 40, y / 200, 3) * 7) * 0.5 + 0.5;
        const wear = Math.pow(Math.max(Math.abs(x / s - 0.5), Math.abs(y / s - 0.5)) * 2, 3);
        const dirt = fbm(x / 55, y / 55, 4);

        let l = 0.72 + grain * 0.22 + rings * 0.08;
        l *= 1 - wear * 0.3 * (0.4 + dirt * 0.9);
        l *= 0.88 + dirt * 0.22;

        // Birch, not pine: pale and only slightly warm. Pushing the red up
        // turns the whole wall orange, which is not what the film stock of
        // 1974 shows either.
        const i = (y * s + x) * 4;
        img.data[i] = Math.min(255, l * 226);
        img.data[i + 1] = Math.min(255, l * 208);
        img.data[i + 2] = Math.min(255, l * 178);
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  });

/** Roughness for the same board: worn spots are smoother, raw grain is rougher. */
export const plywoodRoughness = () =>
  make('plywood-rough', 512, (ctx, s) => {
    const img = ctx.createImageData(s, s);
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const grain = fbm(x / 14, y / 130, 4);
        const wear = Math.pow(Math.max(Math.abs(x / s - 0.5), Math.abs(y / s - 0.5)) * 2, 3);
        const v = (0.76 + grain * 0.2 - wear * 0.24) * 255;
        const i = (y * s + x) * 4;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = Math.max(0, Math.min(255, v));
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  });

// ─── cone paper ──────────────────────────────────────────────────────────────

/** Pressed-paper cone: fibrous, faintly blotchy, gray going slightly warm. */
export const coneMap = () =>
  make('cone', 256, (ctx, s) => {
    const img = ctx.createImageData(s, s);
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const fibre = fbm(x / 2.5, y / 2.5, 3) * 0.5 + fbm(x / 18, y / 18, 3) * 0.5;
        const l = 0.62 + fibre * 0.3;
        const i = (y * s + x) * 4;
        img.data[i] = l * 190;
        img.data[i + 1] = l * 188;
        img.data[i + 2] = l * 184;
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  });

// ─── black paint / baffle board ──────────────────────────────────────────────

/** Matte black over plywood: the grain still reads through, and so do the scuffs. */
export const baffleMap = () =>
  make('baffle', 256, (ctx, s) => {
    const img = ctx.createImageData(s, s);
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const grain = fbm(x / 9, y / 70, 4);
        const scuff = Math.pow(fbm(x / 30, y / 30, 4), 3);
        const l = 0.055 + grain * 0.045 + scuff * 0.16;
        const i = (y * s + x) * 4;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = Math.min(255, l * 255);
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  });

// ─── tie-dye ─────────────────────────────────────────────────────────────────

/**
 * One of Courtenay Pollock's tie-dyes (structure.tieDyes), as Blender's
 * shader draws it (blender/venue.py tiedye_material): dye bands round a
 * center a little off middle, a spiral on even panels and rings with petals
 * on odd ones, their edges bled by noise, with pale crazing where the folds
 * kept the dye out. Drawn on the panel's own proportions so the rings stay
 * round.
 */
export function tieDyeTexture(k: number, palette: readonly string[], aspect: number): THREE.Texture {
  const key = `tiedye-${k}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const w = 256;
  const h = Math.round(w / aspect);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(w, h);
  const pal = palette.map((c) => new THREE.Color(c));
  const pale = new THREE.Color('#efe6d2');
  const cx = 0.5 + 0.08 * (hash(k, 7) - 0.5);
  const cy = 0.55 + 0.1 * (hash(k, 8) - 0.5);
  const freq = 9 + 4 * hash(k, 9);
  const col = new THREE.Color();
  // Crazing: distance to the nearest edge between random cells.
  const cell = (x: number, y: number) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    let f1 = 9;
    let f2 = 9;
    for (let j = -1; j <= 1; j++)
      for (let i = -1; i <= 1; i++) {
        const px = xi + i + hash(xi + i + k * 31, yi + j);
        const py = yi + j + hash(yi + j, xi + i + k * 17);
        const d = Math.hypot(x - px, y - py);
        if (d < f1) [f1, f2] = [d, f1];
        else if (d < f2) f2 = d;
      }
    return f2 - f1;
  };
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const u = x / w;
      const v = 1 - y / h;
      const wob = (fbm(u * 6 + k, v * 6, 5) - 0.5) * 0.1;
      const px = (u - cx) * aspect + wob;
      const py = v - cy + wob;
      const r = Math.hypot(px, py);
      const ang = Math.atan2(py, px);
      const band = r * freq + (k % 2 === 0 ? ang / Math.PI : Math.sin(ang * 8));
      const t = (((band % 1) + 1) % 1) * pal.length;
      const i0 = Math.floor(t) % pal.length;
      const f = t - Math.floor(t);
      const ease = f * f * (3 - 2 * f);
      col.copy(pal[i0]).lerp(pal[(i0 + 1) % pal.length], ease);
      const vein = Math.max(0, 1 - cell(px * 7 + 10, py * 7 + 10) / 0.04);
      col.lerp(pale, vein * 0.7);
      const o = (y * w + x) * 4;
      img.data[o] = col.r * 255;
      img.data[o + 1] = col.g * 255;
      img.data[o + 2] = col.b * 255;
      img.data[o + 3] = 255;
    }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  cache.set(key, tex);
  return tex;
}

// ─── steel ───────────────────────────────────────────────────────────────────

/** Galvanized tube: mottled spangle, rust creeping in at random. */
export const steelRoughness = () =>
  make('steel-rough', 256, (ctx, s) => {
    const img = ctx.createImageData(s, s);
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const spangle = fbm(x / 6, y / 6, 3);
        const wear = fbm(x / 40, y / 40, 3);
        const v = (0.34 + spangle * 0.26 + wear * 0.22) * 255;
        const i = (y * s + x) * 4;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = Math.min(255, v);
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  });

// ─── stage deck ──────────────────────────────────────────────────────────────

/** 1-1/8" tongue-and-groove plywood over 2x10 planks, scuffed by a road crew. */
export const deckMap = () =>
  make('deck', 512, (ctx, s) => {
    const img = ctx.createImageData(s, s);
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const plank = Math.floor(y / 64);
        const seam = y % 64 < 1.5 ? 0.45 : 1;
        const grain = fbm(x / 20, (y + plank * 97) / 160, 4);
        const dirt = fbm(x / 60, y / 60, 4);
        const l = (0.42 + grain * 0.2) * seam * (0.8 + dirt * 0.35);
        const i = (y * s + x) * 4;
        img.data[i] = l * 196;
        img.data[i + 1] = l * 170;
        img.data[i + 2] = l * 134;
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  });

export function disposeTextures() {
  for (const t of cache.values()) t.dispose();
  cache.clear();
}

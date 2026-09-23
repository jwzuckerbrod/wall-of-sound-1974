/**
 * Reads back actual rendered pixels.
 *
 * Added after a long detour in which the stage deck appeared washed out in
 * every screenshot while the real framebuffer had it at #19130d — nearly
 * black. The screenshots were being brightened somewhere between the canvas
 * and the eye, and several materials got "corrected" against that distortion
 * before anyone measured anything.
 *
 * Dev only, and it needs `preserveDrawingBuffer` on the WebGL context. Call
 * `__probe()` from a console (or an automated browser) to get the current
 * frame's values at a set of named points.
 */
export interface ProbePoint {
  name: string;
  /** Fractions of the canvas, 0–1, origin top-left. */
  x: number;
  y: number;
}

/** Points chosen for the default front view. */
export const FRONT_PROBES: ProbePoint[] = [
  { name: 'background', x: 0.5, y: 0.2 },
  { name: 'tie-dye', x: 0.42, y: 0.47 },
  { name: 'scaffold', x: 0.2, y: 0.42 },
  { name: 'bare plywood cabinet', x: 0.1, y: 0.6 },
  { name: 'centre cluster', x: 0.5, y: 0.6 },
  { name: 'deck', x: 0.5, y: 0.7 },
  { name: 'stage facing', x: 0.5, y: 0.77 },
  { name: 'ground', x: 0.5, y: 0.9 },
];

const hex = (r: number, g: number, b: number) =>
  `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;

/** Rec. 709 relative luminance of an sRGB triple, 0–1. */
const luminance = (r: number, g: number, b: number) => {
  const lin = (v: number) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
};

export function probe(points: ProbePoint[] = FRONT_PROBES) {
  const canvas = document.querySelector('canvas');
  if (!canvas) return { error: 'no canvas' };

  const copy = document.createElement('canvas');
  copy.width = canvas.width;
  copy.height = canvas.height;
  const ctx = copy.getContext('2d');
  if (!ctx) return { error: 'no 2d context' };
  ctx.drawImage(canvas, 0, 0);

  const out: Record<string, string> = {};
  for (const p of points) {
    const px = Math.min(canvas.width - 1, Math.round(canvas.width * p.x));
    const py = Math.min(canvas.height - 1, Math.round(canvas.height * p.y));
    const [r, g, b] = ctx.getImageData(px, py, 1, 1).data;
    out[p.name] = `${hex(r, g, b)} (L ${luminance(r, g, b).toFixed(3)})`;
  }
  return out;
}

/**
 * Writes the current frame to .shots/<name>.png via the dev server.
 *
 * Needs `preserveDrawingBuffer`. Returns the path so a caller can open it.
 */
export async function shot(name: string) {
  const canvas = document.querySelector('canvas');
  if (!canvas) return { error: 'no canvas' };
  // Force a frame first: a hidden pane has its animation frames suspended, and
  // the drawing buffer is then empty however long you wait.
  (window as unknown as { __renderNow?: () => void }).__renderNow?.();
  const dataUrl = canvas.toDataURL('image/png');
  const res = await fetch('/__shot', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name, dataUrl }),
  });
  return res.json();
}

export function installProbe() {
  if (!import.meta.env.DEV) return;
  const w = window as unknown as Record<string, unknown>;
  w.__probe = probe;
  w.__shot = shot;
}

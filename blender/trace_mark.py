"""
Traces a mark from an image into polygons for roadgear.py.

The skull-and-bolt, from a flat image, one set of polygons per colour, to
blender/marks/steal_your_face.json:

    /Applications/Blender.app/Contents/MacOS/Blender -b -P blender/trace_mark.py -- \\
        .shots/reference/steal-your-face-hires.webp

The "GRATEFUL DEAD" stencil, from a photograph of pale paint on a black case
(--stencil), to blender/marks/grateful_dead_stencil.json:

    /Applications/Blender.app/Contents/MacOS/Blender -b -P blender/trace_mark.py -- \\
        .shots/reference/sothebys-lot36-budman-wordmark.png --stencil --crop 215,425,600,570

In stencil mode the crop is enlarged four times with smooth interpolation, the
paint is split from the case by brightness, and the worn patches are closed up
so each letter comes out whole. The paint on the case is flaked; the letters
were not. Output is in units of the lettering's width, centred, y up.

Every pixel is sorted into black, white, red or blue (or nothing, where the
image is transparent). Each colour's boundary is followed along pixel edges,
holes included, then simplified (Douglas-Peucker, about a pixel). Output is in
units of the design's outer radius, centred, y up. Loops wind one way round
solid areas and the other way round holes, so an even-odd fill of each colour
reproduces it.

Runs in Blender because Blender's Python has numpy and reads WebP.
"""
import json
import math
import os
import sys

import bpy
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MARKS = os.path.join(ROOT, 'blender', 'marks')

PALETTE = {
    'black': (0.10, 0.10, 0.10),
    'white': (1.00, 1.00, 1.00),
    'red': (0.86, 0.20, 0.19),
    'blue': (0.17, 0.22, 0.55),
}
MIN_AREA = 40.0   # px²: anti-aliasing specks are dropped
EPS = 0.9         # px: simplification tolerance


def load(path):
    img = bpy.data.images.load(os.path.abspath(path))
    w, h = img.size
    px = np.array(img.pixels[:], dtype=np.float32).reshape(h, w, 4)[::-1]  # rows top-down
    # An 8-bit sRGB image comes back as display values, not linear.
    return px[..., :3], px[..., 3]


def classify(rgb, alpha):
    names = list(PALETTE)
    pal = np.array([PALETTE[n] for n in names], dtype=np.float32)
    d = ((rgb[:, :, None, :] - pal[None, None]) ** 2).sum(-1)
    cls = d.argmin(-1)
    cls[alpha < 0.5] = -1
    return {n: cls == i for i, n in enumerate(names)}


def boundary_loops(mask):
    """Closed loops along pixel edges, interior on the right (y down)."""
    M = np.pad(mask, 1).astype(bool)
    H, W = M.shape
    r, c = np.nonzero(M)
    out = {}

    def add(a, b):
        out.setdefault(a, []).append(b)

    up, down, left, right = ~M[r - 1, c], ~M[r + 1, c], ~M[r, c - 1], ~M[r, c + 1]
    for rr, cc, u, d_, l, rt in zip(r.tolist(), c.tolist(), up.tolist(), down.tolist(), left.tolist(), right.tolist()):
        if u:
            add((cc, rr), (cc + 1, rr))
        if rt:
            add((cc + 1, rr), (cc + 1, rr + 1))
        if d_:
            add((cc + 1, rr + 1), (cc, rr + 1))
        if l:
            add((cc, rr + 1), (cc, rr))

    loops = []
    while out:
        start = next(iter(out))
        loop = [start]
        prev, cur = None, start
        while True:
            nxt = out[cur]
            if len(nxt) == 1:
                b = nxt.pop()
            else:
                # A checkerboard corner: turn right, keeping diagonal pixels apart.
                dx, dy = cur[0] - prev[0], cur[1] - prev[1]
                want = (cur[0] - dy, cur[1] + dx)
                b = want if want in nxt else nxt[0]
                nxt.remove(b)
            if not nxt:
                del out[cur]
            prev, cur = cur, b
            if cur == start:
                break
            loop.append(cur)
        loops.append(loop)
    # Back to the unpadded frame.
    return [[(x - 1, y - 1) for x, y in lp] for lp in loops]


def area(lp):
    a = 0.0
    for (x0, y0), (x1, y1) in zip(lp, lp[1:] + lp[:1]):
        a += x0 * y1 - x1 * y0
    return a / 2


def simplify(pts, eps):
    """Douglas-Peucker on an open polyline."""
    P = np.array(pts, dtype=np.float64)
    keep = np.zeros(len(P), bool)
    keep[0] = keep[-1] = True
    stack = [(0, len(P) - 1)]
    while stack:
        i, j = stack.pop()
        if j <= i + 1:
            continue
        a, b = P[i], P[j]
        ab = b - a
        L = np.hypot(*ab)
        seg = P[i + 1:j] - a
        dist = np.abs(ab[0] * seg[:, 1] - ab[1] * seg[:, 0]) / L if L > 0 else np.hypot(seg[:, 0], seg[:, 1])
        k = int(dist.argmax())
        if dist[k] > eps:
            m = i + 1 + k
            keep[m] = True
            stack += [(i, m), (m, j)]
    return [tuple(p) for p in P[keep]]


def simplify_loop(lp, eps):
    # Split at the point farthest from the start so both halves are open runs.
    P = np.array(lp, dtype=np.float64)
    far = int(np.hypot(*(P - P[0]).T).argmax())
    a = simplify(lp[:far + 1], eps)
    b = simplify(lp[far:] + [lp[0]], eps)
    return a[:-1] + b[:-1]


def upsample(a, k):
    """Linear interpolation by k along both axes."""
    h, w = a.shape
    ys, xs = np.linspace(0, h - 1, h * k), np.linspace(0, w - 1, w * k)
    rows = np.array([np.interp(xs, np.arange(w), a[i]) for i in range(h)])
    return np.array([np.interp(ys, np.arange(h), rows[:, j]) for j in range(w * k)]).T


def morph(mask, r, grow):
    """Dilate (grow) or erode a mask by a disc of radius r."""
    out = mask.copy()
    pad = np.pad(mask, r, constant_values=not grow)
    h, w = mask.shape
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            if dx * dx + dy * dy > r * r:
                continue
            win = pad[r + dy:r + dy + h, r + dx:r + dx + w]
            out = (out | win) if grow else (out & win)
    return out


def stencil(path, crop, k=4, close=9):
    rgb, alpha = load(path)
    x0, y0, x1, y1 = crop
    lum = rgb[y0:y1, x0:x1] @ np.array([0.299, 0.587, 0.114], dtype=np.float32)
    big = upsample(lum, k)
    paint = big > 0.36
    # Close the flaking: grow, then shrink back. Then drop specks.
    paint = morph(morph(paint, close, True), close, False)
    loops = []
    for lp in boundary_loops(paint):
        if abs(area(lp)) < 60 * k * k:
            continue
        loops.append(simplify_loop(lp, 0.8 * k / 2))
    xs = [x for lp in loops for x, _ in lp]
    ys = [y for lp in loops for _, y in lp]
    cx, cy = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2
    W = max(xs) - min(xs)
    out = [[[round((x - cx) / W, 5), round((cy - y) / W, 5)] for x, y in lp] for lp in loops]
    print('paint', len(out), 'loops', sum(len(l) for l in out), 'points; height/width', round((max(ys) - min(ys)) / W, 3))
    return out


def main():
    argv = sys.argv[sys.argv.index('--') + 1:]
    path = argv[0]
    if '--stencil' in argv:
        crop = [int(v) for v in argv[argv.index('--crop') + 1].split(',')]
        loops = stencil(path, crop)
        out = os.path.join(MARKS, 'grateful_dead_stencil.json')
        os.makedirs(MARKS, exist_ok=True)
        with open(out, 'w') as f:
            json.dump({'source': os.path.basename(path), 'crop': crop,
                       'note': 'Traced by blender/trace_mark.py --stencil. Units of the lettering width, y up. Even-odd fill.',
                       'layers': {'paint': loops}}, f)
        print('WROTE', out)
        return
    OUT = os.path.join(MARKS, 'steal_your_face.json')
    rgb, alpha = load(path)
    opaque = np.nonzero(alpha >= 0.5)
    cy = (opaque[0].min() + opaque[0].max() + 1) / 2
    cx = (opaque[1].min() + opaque[1].max() + 1) / 2
    R = max(opaque[0].max() + 1 - opaque[0].min(), opaque[1].max() + 1 - opaque[1].min()) / 2
    layers = {}
    for name, mask in classify(rgb, alpha).items():
        loops = []
        for lp in boundary_loops(mask):
            if abs(area(lp)) < MIN_AREA:
                continue
            s = simplify_loop(lp, EPS)
            if len(s) >= 3:
                loops.append([[round((x - cx) / R, 5), round((cy - y) / R, 5)] for x, y in s])
        layers[name] = loops
        print(name, len(loops), 'loops', sum(len(l) for l in loops), 'points')
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w') as f:
        json.dump({
            'source': os.path.basename(path),
            'note': 'Traced by blender/trace_mark.py. Units of the outer radius, y up. Even-odd fill per colour.',
            'layers': layers,
        }, f)
    print('WROTE', OUT)


main()

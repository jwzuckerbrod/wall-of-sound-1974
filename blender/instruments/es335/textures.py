"""
Registers Gibson's close-up cutouts of the body and headstock to the traced
model, so they can be worn as textures.

    /Applications/Blender.app/Contents/MacOS/Blender -b -P blender/instruments/es335/textures.py

The body close-up is a straight-on cutout of the same guitar as the front
view, at higher resolution. It is registered by its silhouette: an affine map
from the traced body outline onto the close-up's edge, by iterated closest
points, started from a least-squares fit on the four knobs, the toggle and the
jack. The silhouette is the rim, on the wood itself; the hardware stands up to
3/4" proud of it, and in a close-up that tall hardware is pushed outward from
the middle of the frame (the pickups by up to 0.27"), so it makes a poor anchor
for a texture of the top. (The headstock close-up is straightened separately,
by headstock_texture.py.)

The photograph's own hardware, pickguard, strings and studio glare are then
erased from a copy of it, and filled from the burst around them: the model has
its own hardware, and anything baked into the texture would show beside it as a
ghost. What was under them is unknown; the fill carries the burst's tone but
no wood figure of its own.

Writes textures.json beside this script (numbers only) and
.shots/textures/es335-top.png (ignored; the photos stay out of the repo).
"""
import json
import os
import sys

import bpy
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
import tracekit as tk  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))
REF = os.path.join(ROOT, '.shots', 'reference')
CLEAN = os.path.join(ROOT, '.shots', 'textures', 'es335-top.png')
BUILD = os.path.join(HERE, 'build.py')


def build_constants():
    """The hardware positions measured for the model, read from build.py."""
    import ast
    tree = ast.parse(open(BUILD).read())
    want = {'NECK_PU', 'BRIDGE_PU', 'BRIDGE', 'TAIL', 'KNOBS', 'KNOB_R', 'TOGGLE', 'JACK', 'BRIDGE_SPACING'}
    out = {}
    for node in tree.body:
        if isinstance(node, ast.Assign) and isinstance(node.targets[0], ast.Name) and node.targets[0].id in want:
            out[node.targets[0].id] = ast.literal_eval(node.value)
    return out


def blur(img, r):
    for _ in range(3):
        pad = ((r + 1, r), (0, 0)) + ((0, 0),) * (img.ndim - 2)
        c = np.cumsum(np.pad(img, pad, mode='edge'), axis=0)
        img = (c[2 * r + 1:] - c[:-2 * r - 1]) / (2 * r + 1)
        pad = ((0, 0), (r + 1, r)) + ((0, 0),) * (img.ndim - 2)
        c = np.cumsum(np.pad(img, pad, mode='edge'), axis=1)
        img = (c[:, 2 * r + 1:] - c[:, :-2 * r - 1]) / (2 * r + 1)
    return img


def register_silhouette(O, body, al):
    """Affine map model inches -> close-up pixels, fitted to the silhouette."""
    k, cx, cy = body['pxPerIn'], body['xCentrePx'], body['ySaddlePx']
    A = np.array([[k, 0, cx], [0, -k, cy]], float)
    inner = np.roll(al, 1, 0) & np.roll(al, -1, 0) & np.roll(al, 1, 1) & np.roll(al, -1, 1)
    ey, ex = np.nonzero(al & ~inner)
    E = np.stack([ex, ey], 1).astype(float)
    # The traced outline, less the neck notch (closed straight across in the
    # trace, and the neck carries on out of the close-up), resampled every 0.05".
    P = np.array(O['body'])
    P = P[~((np.abs(P[:, 0]) < 1.4) & (P[:, 1] > 14))]
    Q = []
    for p0, p1 in zip(P, np.roll(P, -1, axis=0)):
        n = max(1, int(np.hypot(*(p1 - p0)) / 0.05))
        Q += [p0 + (p1 - p0) * t for t in np.arange(n) / n]
    P = np.array(Q)
    cell = 20
    grid = {}
    for i, (x, y) in enumerate(E.astype(int)):
        grid.setdefault((x // cell, y // cell), []).append(i)

    def nearest(q):
        gx, gy = int(q[0]) // cell, int(q[1]) // cell
        idx = [i for dx in (-2, -1, 0, 1, 2) for dy in (-2, -1, 0, 1, 2) for i in grid.get((gx + dx, gy + dy), [])]
        if not idx:
            return None, None
        d = np.hypot(E[idx, 0] - q[0], E[idx, 1] - q[1])
        j = int(np.argmin(d))
        return idx[j], float(d[j])
    for _ in range(25):
        Qp = (A @ np.c_[P, np.ones(len(P))].T).T
        pairs = [(j, *nearest(q)) for j, q in enumerate(Qp)]
        pairs = [p for p in pairs if p[1] is not None]
        d = np.array([p[2] for p in pairs])
        thr = max(4.0, float(np.percentile(d, 80)))       # the worst fifth: the neck's stub, the strap button
        sel = [p for p in pairs if p[2] <= thr]
        M = np.array([[*P[j], 1] for j, _, _ in sel])
        R = np.array([E[i] for _, i, _ in sel])
        A = np.linalg.lstsq(M, R, rcond=None)[0].T
    rms = float(np.sqrt(np.mean(d[d <= thr] ** 2)))
    return A, rms


def clean_top(O, body):
    C = build_constants()
    a = tk.load_rgba(os.path.join(REF, 'es335-gibson-body.png'))
    rgb, al = a[..., :3].copy(), a[..., 3] > 0.5
    H, W = al.shape
    A = np.array(body['affine'])
    k = float(np.sqrt(abs(np.linalg.det(A[:, :2]))))
    Ai = np.linalg.inv(A[:, :2])
    yy, xx = np.mgrid[0:H, 0:W]
    X = Ai[0, 0] * (xx - A[0, 2]) + Ai[0, 1] * (yy - A[1, 2])      # model inches at every pixel
    Y = Ai[1, 0] * (xx - A[0, 2]) + Ai[1, 1] * (yy - A[1, 2])
    lum = rgb.mean(axis=2)
    sat = rgb.max(axis=2) - rgb.min(axis=2)

    erase = np.zeros((H, W), bool)
    rect = lambda x0, x1, y0, y1, m: (X > x0 - m) & (X < x1 + m) & (Y > y0 - m) & (Y < y1 + m)
    disc = lambda x, y, r: (X - x) ** 2 + (Y - y) ** 2 < r * r
    def inside(poly):
        P = np.array(poly)
        m = np.zeros((H, W), bool)
        for (x0, y0), (x1, y1) in zip(P, np.roll(P, -1, axis=0)):
            if y0 == y1:
                continue
            cross = ((Y >= min(y0, y1)) & (Y < max(y0, y1)) &
                     (X < x0 + (Y - y0) * (x1 - x0) / (y1 - y0)))
            m ^= cross
        return m
    # The pickguard (traced), with its white edge line and its shadow.
    guard = inside(O['pickguard'])
    erase |= tk.close_(guard, 2) | (blur(guard.astype(np.float32), int(0.08 * k)) > 0.02)
    for ring, cover in (C['NECK_PU'], C['BRIDGE_PU']):
        erase |= rect(*ring, 0.45)
    erase |= rect(*C['BRIDGE'], 0.3)
    erase |= rect(*C['TAIL'], 0.3)
    for x, y in C['KNOBS']:
        erase |= disc(x, y, C['KNOB_R'] + 0.4)
    erase |= disc(*C['TOGGLE'], 0.5)
    erase |= disc(*C['JACK'], 0.45)
    # The strings: the whole corridor under them, from the tailpiece to the
    # neck, a little wider than the outer strings (one by one, the wood left
    # between them shows as stripes). The hardware they run between is tall,
    # so in this close-up it and they are displaced toward the neck; the
    # corridor runs a margin past both ends.
    tail_y = (C['TAIL'][2] + C['TAIL'][3]) / 2
    y_top = 10.0
    half = lambda y: C['BRIDGE_SPACING'] / 2 + (O['boardWidthAtFret19In'] / 2 - 0.15 - C['BRIDGE_SPACING'] / 2) * np.clip(y / 8.25, 0, 1) + 0.2
    erase |= (np.abs(X) < half(Y)) & (Y > tail_y - 0.6) & (Y < y_top)
    # The guard as the photograph shows it, parallax and all: its black,
    # flooded from inside out to its white edge line, kept near the traced
    # guard (where the edge line is broken the flood would run out into the
    # dark of the burst).
    gx, gy = np.array(O['pickguard']).mean(axis=0)
    seed = np.zeros((H, W), bool)
    seed[int(A[1, 0] * gx + A[1, 1] * gy + A[1, 2]), int(A[0, 0] * gx + A[0, 1] * gy + A[0, 2])] = True
    near_guard = blur(guard.astype(np.float32), int(0.35 * k)) > 0.01
    photo_guard = tk.close_(tk.flood(seed, (lum < 0.2) & al & near_guard), 3)
    erase |= blur(photo_guard.astype(np.float32), int(0.1 * k)) > 0.02
    # The pickguard's bracket, where it screws to the rim beside the guard's
    # tip (read off this photograph: pixel 1400, 820).
    erase |= (xx - 1400) ** 2 + (yy - 820) ** 2 < (0.5 * k) ** 2
    # Studio glare: pale, unsaturated patches brighter than the burst around
    # them, on the dark outer part of the burst.
    local = blur(lum, int(0.4 * k))
    glare = (lum > local + 0.06) & (sat < 0.3) & (local < 0.35)
    erase |= tk.close_(glare, 3) & al
    # Only the top: not the neck, which carries on out of the frame.
    erase &= al & inside(O['body'])

    # Fill. A sunburst is shaded by distance from the edge, so first the
    # burst's own profile: the median colour of the known wood at each
    # distance in. Then the slow variation about that profile (the burst is
    # not perfectly even), spread in from the known wood over widening
    # circles. No figure is invented.
    P = np.array(O['body'])
    dist = np.full((H, W), 1e9, np.float32)
    for (x0, y0), (x1, y1) in zip(P, np.roll(P, -1, axis=0)):
        dx, dy = x1 - x0, y1 - y0
        tt = np.clip(((X - x0) * dx + (Y - y0) * dy) / (dx * dx + dy * dy or 1), 0, 1)
        np.minimum(dist, np.hypot(X - x0 - tt * dx, Y - y0 - tt * dy), out=dist)
    wood = al & ~erase & (sat > 0.15) & (lum > 0.08)      # not the binding, not the f-holes
    bins = np.minimum((dist / 0.1).astype(int), 80)
    prof = np.zeros((81, 3), np.float32)
    for i in range(81):
        sel = wood & (bins == i)
        prof[i] = np.median(rgb[sel], axis=0) if sel.sum() > 50 else prof[i - 1]
    base = prof[bins]
    # Glare the first pass missed: on the near-black outer burst, patches
    # well above the profile's tone at their distance in, and paler (glare
    # is the light's colour, not the wood's). Clear of the binding, and never
    # the f-holes.
    bl = base.mean(axis=2)
    bs = base.max(axis=2) - base.min(axis=2)
    glare2 = al & (dist > 0.25) & (dist < 3.0) & (bl < 0.3) & (lum - bl > 0.15) & (lum > 0.3) & (sat < 0.25)
    glare2 = blur(tk.close_(tk.open_(glare2, 2), 3).astype(np.float32), int(0.04 * k)) > 0.1
    fholes = blur(((lum < 0.06) & (dist > 0.5)).astype(np.float32), int(0.08 * k)) > 0.02
    erase |= glare2 & inside(O['body']) & ~fholes
    glare |= glare2 & ~fholes
    # (Leave out a margin round the erased parts: their shadows fall there.)
    near = blur(erase.astype(np.float32), int(0.06 * k)) > 0.01
    known = (al & ~near).astype(np.float32)
    resid = (rgb - base) * known[..., None]
    # Diffuse the variation in from the known wood (a smooth, harmonic fill),
    # at a quarter of the resolution; it has no fine detail to lose.
    q = 4
    kq = known[::q, ::q] > 0.5
    rq = resid[::q, ::q].copy()
    cq = np.where(kq[..., None], rq, 0.0)
    free = ~kq
    for _ in range(600):
        nb = (np.roll(cq, 1, 0) + np.roll(cq, -1, 0) + np.roll(cq, 1, 1) + np.roll(cq, -1, 1)) / 4
        cq[free] = nb[free]
    corr = np.repeat(np.repeat(cq, q, 0), q, 1)[:H, :W]
    corr = blur(corr, q)
    fill = rgb.copy()
    fill[erase] = np.clip(base[erase] + corr[erase], 0, 1)
    os.makedirs(os.path.dirname(CLEAN), exist_ok=True)
    img = bpy.data.images.new('top', W, H, alpha=True)
    img.pixels.foreach_set(np.dstack([fill, a[..., 3]])[::-1].astype(np.float32).ravel())
    img.filepath_raw = CLEAN
    img.file_format = 'PNG'
    img.save()
    return {'file': '.shots/textures/es335-top.png', 'erasedFraction': round(float(erase.sum() / al.sum()), 3),
            'glareFraction': round(float((glare & al).sum() / al.sum()), 3)}


def main():
    with open(os.path.join(HERE, 'outline.json')) as f:
        O = json.load(f)
    body_min_y = min(p[1] for p in O['body'])

    # Body: least squares on six parts that appear in both photographs — the
    # four knobs, the toggle and the jack — model inches (measured on the front
    # view) against their pixel centres in the body close-up. One scale, one
    # offset; the residual says how well the two photographs agree.
    pairs = [((6.357, -2.130), (1464.3, 1173.1)), ((4.254, -3.658), (1281.9, 1315.9)),
             ((5.290, -6.166), (1364.8, 1544.0)), ((7.336, -4.595), (1532.4, 1408.2)),
             ((3.858, -1.786), (1242.9, 1140.1)), ((3.491, -7.548), (1209.9, 1667.6))]
    A, rhs = [], []
    for (x, y), (px, py) in pairs:
        A.append([x, 1, 0]); rhs.append(px)
        A.append([-y, 0, 1]); rhs.append(py)
    (k, cx, cy), *_ = np.linalg.lstsq(np.array(A, float), np.array(rhs, float), rcond=None)
    res = np.array(rhs) - np.array(A, float) @ [k, cx, cy]     # a first guess only
    body = {'file': '.shots/reference/es335-gibson-body.png', 'size': [2000, 2000],
            'pxPerIn': round(float(k), 4), 'xCentrePx': round(float(cx), 2), 'ySaddlePx': round(float(cy), 2),
            'fit': {'anchors': 'knobs x4, toggle, jack', 'rmsPx': round(float(np.sqrt(np.mean(res ** 2))), 2)}}

    al = tk.load_rgba(os.path.join(REF, 'es335-gibson-body.png'))[..., 3] > 0.5
    A, rms = register_silhouette(O, body, al)
    anchors = np.array([(A @ [x, y, 1]) - np.array(p) for (x, y), p in pairs])
    body['affine'] = [[round(float(v), 5) for v in row] for row in A]
    body['fit'] = {'silhouetteRmsPx': round(rms, 2),
                   'anchorsUnderIt': 'knobs x4, toggle, jack (tall parts; parallax)',
                   'anchorsRmsPx': round(float(np.sqrt(np.mean(anchors ** 2))), 2),
                   'firstGuess': {'pxPerIn': body['pxPerIn'], 'rmsPx': body['fit']['rmsPx']}}
    for key in ('pxPerIn', 'xCentrePx', 'ySaddlePx'):
        body.pop(key)
    body['clean'] = clean_top(O, body)
    out = {'body': body}
    with open(os.path.join(HERE, 'textures.json'), 'w') as f:
        json.dump(out, f, indent=1)
    print('TEX', json.dumps(out))


main()

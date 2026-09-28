"""
Straightens the headstock face off Gibson's close-up, so the model wears the
real pearl logo, crown, truss-rod cover and lacquer, and takes the headstock
outline and the six tuner posts from the same photograph, so they line up by
construction.

    /Applications/Blender.app/Contents/MacOS/Blender -b -P blender/instruments/es335/headstock_texture.py

Reads .shots/reference/es335-gibson-headstock.webp (Gibson Certified Vintage,
the same 1960 ES-335TD as the front view; not in the repo). Writes:
  .shots/textures/es335-headstock-face.png   the face, straightened (ignored)
  headstock.json                             numbers only: the mapping, the
                                             outline, the post centres

In the front view the headstock is pitched 17 degrees away and the guitar
slightly rolled, so its outline there is skewed; the close-up looks at the face
nearly square-on. The mapping from the face (inches) to the close-up is affine:
  across  the nut's two ends, 1.67" apart (the nut width the front view fitted)
  along   the face's own centre line, found as the middle of the black lacquer
          between its edges; the same pixels per inch as across (the post tops,
          flat circles on the face, photograph round: 50 x 50 px)
  origin  the middle of the nut's head-side edge
The strings and the tuner posts and bushings are not part of the face; the
model has its own. They are erased and filled with the lacquer around them.
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
PHOTO = os.path.join(ROOT, '.shots', 'reference', 'es335-gibson-headstock.webp')
TEXTURE = os.path.join(ROOT, '.shots', 'textures', 'es335-headstock-face.png')
OUT = os.path.join(HERE, 'headstock.json')

# The face frame: x across (+ treble), d along the face from the nut's
# head-side edge. Output at 150 px per inch.
PPI = 150
X0, X1, D0, D1 = -2.0, 2.0, -0.05, 7.6


def grow(m, k):
    for _ in range(k):
        g = m.copy()
        g[1:] |= m[:-1]; g[:-1] |= m[1:]; g[:, 1:] |= m[:, :-1]; g[:, :-1] |= m[:, 1:]
        m = g
    return m


def shrink(m, k):
    return ~grow(~m, k)


def sample(a, u, v):
    h, w, _ = a.shape
    u = np.clip(u, 0, w - 1.001)
    v = np.clip(v, 0, h - 1.001)
    u0, v0 = np.floor(u).astype(int), np.floor(v).astype(int)
    fu, fv = (u - u0)[..., None], (v - v0)[..., None]
    return ((a[v0, u0] * (1 - fu) + a[v0, u0 + 1] * fu) * (1 - fv) +
            (a[v0 + 1, u0] * (1 - fu) + a[v0 + 1, u0 + 1] * fu) * fv)


def main():
    with open(os.path.join(HERE, 'outline.json')) as f:
        nut_in = json.load(f)['nutWidthIn']
    a = tk.load_rgba(PHOTO)
    rgb, al = a[..., :3], a[..., 3] > 0.5
    H, W = al.shape
    lum = rgb.mean(axis=2)
    sat = rgb.max(axis=2) - rgb.min(axis=2)

    # The nut: the lowest band of rows that is bright right across the neck
    # (the truss-rod cover's white edge is a band above it, narrower; the tuner
    # buttons make wide bright rows higher up, so look only near the neck).
    bright_cols = ((lum > 0.6) & al).sum(axis=1)
    rows = [y for y in range(int(H * 0.7), H - 100) if bright_cols[y] > 300]
    runs, cur = [], [rows[0]]
    for y in rows[1:]:
        if y == cur[-1] + 1:
            cur.append(y)
        else:
            runs.append(cur); cur = [y]
    runs.append(cur)
    nut = max(runs, key=len)
    y_top, y_bot = nut[0], nut[-1]
    ym = (y_top + y_bot) // 2
    xs = np.nonzero((lum[ym] > 0.6) & al[ym])[0]
    xs = xs[(xs > W * 0.2) & (xs < W * 0.8)]
    nl, nr = float(xs.min()), float(xs.max())
    ppi = (nr - nl) / nut_in

    # A rough centre line, only to tell the bass-side tuners from the treble:
    # the middle of the black lacquer at the rows between the tuner buttons.
    black = (lum < 0.2) & al
    mids = []
    for y in range(120, y_top - 40, 4):
        c = np.nonzero(black[y])[0]
        if len(c) > 50:
            mids.append((y, (c.min() + c.max()) / 2, c.max() - c.min()))
    M = np.array(mids)
    narrow = M[M[:, 2] < np.percentile(M[:, 2], 40)]
    k = np.polyfit(narrow[:, 0], narrow[:, 1], 1)          # x = k0 * y + k1

    # The tuner bushings: nickel rings about 0.4" across. A circle vote over
    # the bright rims finds their centres; three either side of the centre line.
    rim = (lum > 0.5) & (sat < 0.15) & al
    rim[:120] = False
    rim[y_top - 30:] = False
    rim &= ~shrink(rim, 1)
    ry, rx = np.nonzero(rim)
    acc = np.zeros(H * W)
    th = np.linspace(0, 2 * np.pi, 72, endpoint=False)
    r_px = np.arange(int(0.19 * ppi), int(0.23 * ppi) + 1)
    for r in r_px:
        cx = (rx[:, None] - r * np.cos(th)).round().astype(int).ravel()
        cy = (ry[:, None] - r * np.sin(th)).round().astype(int).ravel()
        ok = (cx >= 0) & (cx < W) & (cy >= 0) & (cy < H)
        acc += np.bincount(cy[ok] * W + cx[ok], minlength=H * W)
    acc = acc.reshape(H, W)
    found = []
    yy, xx = np.mgrid[0:H, 0:W]
    for side in (-1, 1):
        sc = acc.copy()
        sc[((xx - np.polyval(k, yy)) * side) < 0.5 * ppi] = 0
        for _ in range(3):
            py, px = np.unravel_index(np.argmax(sc), sc.shape)
            found.append((side, float(px), float(py)))
            sc[max(0, py - int(0.6 * ppi)):py + int(0.6 * ppi), max(0, px - int(0.6 * ppi)):px + int(0.6 * ppi)] = 0
    # Refine each to the centroid of the votes around its peak.
    bush = []
    for side, px, py in found:
        r = int(0.08 * ppi)
        win = acc[int(py) - r:int(py) + r + 1, int(px) - r:int(px) + r + 1]
        wy, wx = np.mgrid[-r:r + 1, -r:r + 1]
        wv = np.clip(win - win.max() * 0.5, 0, None)
        bush.append((side, px + (wx * wv).sum() / wv.sum(), py + (wy * wv).sum() / wv.sum()))
    L = sorted([np.array(b[1:]) for b in bush if b[0] < 0], key=lambda p: -p[1])   # nearest the nut first
    R = sorted([np.array(b[1:]) for b in bush if b[0] > 0], key=lambda p: -p[1])

    # The real centre line: Gibson set the tuners in mirror pairs, so the
    # middle of each pair lies on it, as does the middle of the nut. The
    # across direction: the nut and the three pairs, averaged.
    nut_mid = np.array([(nl + nr) / 2, (y_top + y_bot) / 2])
    pts = np.array([nut_mid] + [(l + r) / 2 for l, r in zip(L, R)])
    k = np.polyfit(pts[:, 1], pts[:, 0], 1)
    dirs = [np.array([nr - nl, 0.0])] + [r - l for l, r in zip(L, R)]
    u = np.mean([v / np.linalg.norm(v) for v in dirs], axis=0)
    across = u / np.linalg.norm(u) * ppi
    along = np.array([-k[0], -1.0]) / np.hypot(k[0], 1.0) * ppi   # px per inch, toward the tip
    origin = np.array([np.polyval(k, y_top), float(y_top)])
    axis_resid = pts[:, 0] - np.polyval(k, pts[:, 1])
    to_px = lambda x, d: (origin[0] + x * across[0] + d * along[0], origin[1] + x * across[1] + d * along[1])
    A = np.array([[across[0], along[0]], [across[1], along[1]]])
    Ai = np.linalg.inv(A)
    to_face = lambda p: Ai @ (p - origin)
    posts, asym = [], []
    for l, r in zip(L, R):
        (xl, dl), (xr, dr) = to_face(l), to_face(r)
        posts.append([round(float((xr - xl) / 2), 4), round(float((dl + dr) / 2), 4)])
        asym.append([round(float(-xl - xr), 3), round(float(dl - dr), 3)])

    # The keystone buttons, where they appear: cream blobs clear of the face.
    # They hang behind it, so seen at a slant they are displaced a little.
    cream = (lum > 0.55) & ((rgb[..., 0] - rgb[..., 2]) > 0.08) & al
    cream[y_top - 30:] = False
    cream = tk.open_(cream, 4)
    buttons, left = [], cream.copy()
    while left.sum() > 0.1 * ppi * ppi and len(buttons) < 12:
        yy0, xx0 = np.unravel_index(np.argmax(left), left.shape)
        seed_ = np.zeros_like(left); seed_[yy0, xx0] = True
        blob = tk.flood(seed_, left)
        left &= ~blob
        if blob.sum() < 0.1 * ppi * ppi:
            continue
        by, bx = np.nonzero(blob)
        fx, fd = to_face(np.array([bx.mean(), by.mean()]))
        if abs(fx) > 1.0:
            buttons.append([round(float(fx), 3), round(float(fd), 3)])
    buttons.sort(key=lambda p: (p[0] > 0, p[1]))
    # The slant shifts both sides the same way, so the mean of the two sides'
    # offsets from their posts cancels it.
    bl = [b for b in buttons if b[0] < 0]
    br = [b for b in buttons if b[0] > 0]
    button_out = float(np.mean([(-l[0] - p[0] + r[0] - p[0]) / 2 for l, r, p in zip(bl, br, posts)]))

    # Resample the face square-on.
    Wo, Ho = int((X1 - X0) * PPI), int((D1 - D0) * PPI)
    xs_ = X0 + (np.arange(Wo) + 0.5) / PPI
    ds_ = D1 - (np.arange(Ho) + 0.5) / PPI               # row 0 is the tip
    X, D = np.meshgrid(xs_, ds_)
    U, V = to_px(X, D)
    face = sample(np.dstack([rgb, a[..., 3:4]]), U, V)
    col, alpha = face[..., :3], face[..., 3]
    flum = col.mean(axis=2)
    fsat = col.max(axis=2) - col.min(axis=2)

    # The face: what is photographed and is neither a keystone button (cream)
    # nor the side of the headstock (brown, seen past the treble edge): both
    # are warm, and the face is black lacquer with pale nickel and white
    # celluloid on it. The pearl logo and crown are warm too, but enclosed,
    # so filling holes brings them back. Then open away the button shafts
    # and keep what the face and its mirror share.
    warm = (col[..., 0] - col[..., 2]) > 0.08
    face_px = (alpha > 0.5) & ~warm
    border = np.zeros_like(face_px)
    border[0], border[-1], border[:, 0], border[:, -1] = True, True, True, True
    head = ~tk.flood(border, ~face_px)
    head = grow(shrink(head, int(0.12 * PPI)), int(0.12 * PPI))
    seed = np.zeros_like(head)
    seed[int((D1 - 3.5) * PPI), int(-X0 * PPI)] = True
    head = tk.flood(seed, head)
    head &= head[:, ::-1]                                # X0 = -X1: the mirror is a flip
    head = tk.flood(seed, head)
    head = ~tk.flood(border, ~head)
    head[D < 0] = False

    # Erase the hardware: bushings as discs, and each string as the straight
    # band that looks most like a thin bright line, from near its post to near
    # its slot in the nut. (A string rides above the face, so seen at a slant
    # its line is displaced a little from the post's centre; a straight line
    # stays straight through the mapping all the same.) Gibson strings a 3+3
    # headstock E A D up the bass side and E B G up the treble, nearest first;
    # the slots are spread across the nut as in the model.
    thin = np.clip(flum - 0.5 * (np.roll(flum, 3, 1) + np.roll(flum, -3, 1)), 0, None)
    erase = np.zeros_like(head)
    for x, d in posts:
        for s in (-1, 1):
            erase |= (X - s * x) ** 2 + (D - d) ** 2 < 0.3 ** 2
    slot = (nut_in - 0.25) / 5
    t = np.linspace(0.12, 1.0, 200)
    strings = []
    for i, (x, d) in enumerate(posts):
        for s in (-1, 1):
            best = None
            for xa in np.arange(s * x - 0.15, s * x + 0.151, 0.01):
                for xb in np.arange(s * (2.5 - i) * slot - 0.12, s * (2.5 - i) * slot + 0.121, 0.01):
                    xx = xa + (xb - xa) * t
                    dd = d * (1 - t)
                    cc = ((xx - X0) * PPI).astype(int)
                    rr = ((D1 - dd) * PPI).astype(int)
                    score = float(thin[rr, cc].mean())
                    if best is None or score > best[0]:
                        best = (score, xa, xb)
            _, xa, xb = best
            strings.append([round(float(xa), 3), round(float(d), 3), round(float(xb), 3)])
            dx, dd_ = xb - xa, -d
            tt = np.clip(((X - xa) * dx + (D - d) * dd_) / (dx * dx + dd_ * dd_), 0, 1)
            erase |= np.hypot(X - (xa + tt * dx), D - (d + tt * dd_)) < 0.05
    erase &= head

    # Fill with the lacquer around: the black face, blurred wide, so the
    # patches carry its tone and gradual sheen but no detail of their own.
    def blur(img, r):
        for _ in range(3):
            c = np.cumsum(np.pad(img, ((r + 1, r), (0, 0)) + ((0, 0),) * (img.ndim - 2), mode='edge'), axis=0)
            img = (c[2 * r + 1:] - c[:-2 * r - 1]) / (2 * r + 1)
            c = np.cumsum(np.pad(img, ((0, 0), (r + 1, r)) + ((0, 0),) * (img.ndim - 2), mode='edge'), axis=1)
            img = (c[:, 2 * r + 1:] - c[:, :-2 * r - 1]) / (2 * r + 1)
        return img
    lac = (head & ~erase & (flum < 0.2)).astype(np.float32)
    tone = blur(col * lac[..., None], int(0.12 * PPI)) / np.maximum(blur(lac, int(0.12 * PPI)), 1e-4)[..., None]
    fill = col.copy()
    fill[erase] = tone[erase]
    fill[~head] = 0

    os.makedirs(os.path.dirname(TEXTURE), exist_ok=True)
    img = bpy.data.images.new('face', Wo, Ho, alpha=True)
    img.pixels.foreach_set(np.dstack([fill, head.astype(np.float32)])[::-1].astype(np.float32).ravel())
    img.filepath_raw = TEXTURE
    img.file_format = 'PNG'
    img.save()

    rows_ = []
    for i in range(0, Ho, 3):
        c = np.nonzero(head[i])[0]
        if len(c):
            rows_.append((float(ds_[i]), float(xs_[c.max()])))
    right = [(x, d) for d, x in rows_]
    outline = [[round(x, 4), round(d, 4)] for x, d in right] + [[round(-x, 4), round(d, 4)] for x, d in right[::-1]]

    data = {
        'source': 'es335-gibson-headstock.webp (Gibson Certified Vintage 1960 ES-335TD, the front view\'s guitar)',
        'frame': 'inches; x across (+ treble), d along the face from the nut\'s head-side edge',
        'mapping': {'originPx': [round(float(v), 2) for v in origin], 'acrossPxPerIn': [round(float(v), 4) for v in across],
                    'alongPxPerIn': [round(float(v), 4) for v in along], 'nutPx': [nl, nr, y_top, y_bot],
                    'nutThicknessIn': round((y_bot - y_top) / ppi, 3)},
        'texture': {'file': '.shots/textures/es335-headstock-face.png', 'pxPerIn': PPI, 'x0': X0, 'x1': X1, 'd0': D0, 'd1': D1},
        'posts': posts,
        'postAsymmetryIn': asym,
        'bushingsPx': [[s, round(px, 1), round(py, 1)] for s, px, py in bush],
        'axisResidualPx': [round(float(v), 1) for v in axis_resid],
        'strings': strings,
        'buttonsApparentIn': buttons,
        'buttonOutFromPostIn': round(button_out, 3),
        'lengthIn': round(max(p[1] for p in outline), 3),
        'maxWidthIn': round(2 * max(p[0] for p in outline), 3),
        'outline': outline,
    }
    with open(OUT, 'w') as f:
        json.dump(data, f, indent=1)
    print('HEAD', json.dumps({k: v for k, v in data.items() if k not in ('outline',)}), 'outline', len(outline))


main()

"""
Unwarps the headstock face off an angled close-up, so the model wears the
real medallion (brass ring, abalone disc, the skull and lightning bolt), the
mother-of-pearl cloud and the rosewood grain exactly as photographed.

    /Applications/Blender.app/Contents/MacOS/Blender -b -P blender/instruments/mission_control/headstock_texture.py

Reads .shots/reference/mc-user-headstock.jpg (supplied by the project owner;
not in the repo). Writes:
  .shots/textures/mc-headstock-face.png   the face, straightened (ignored; it
                                          is a crop of someone's photograph)
  headstock.json                          numbers only: the homography, and a
                                          sharper headstock outline

The face is flat, so four points on it fix the perspective exactly (a
homography). The four tuner-post bushings are those points: measured in the
close-up, and known on the model from the straight-on front view.

The strings, their blue silks and the posts are not part of the face; the
model has its own. They are erased and filled in from the surrounding wood.
"""
import json
import os

import bpy
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))
PHOTO = os.path.join(ROOT, '.shots', 'reference', 'mc-user-headstock.jpg')
TEXTURE = os.path.join(ROOT, '.shots', 'textures', 'mc-headstock-face.png')
OUT = os.path.join(HERE, 'headstock.json')

SCALE = 32.0
# (model x, y in inches, saddle frame)  ->  (photo px) : bushing centres.
POSTS = [((-0.8, SCALE + 1.52), (522.5, 227.7)),   # bass side, near the nut
         ((0.8, SCALE + 1.52), (468.3, 365.5)),    # treble side, near
         ((-0.8, SCALE + 3.67), (799.4, 279.1)),   # bass, far
         ((0.8, SCALE + 3.67), (740.5, 461.0))]    # treble, far
MEDALLION_PX = (648.0, 328.0)                      # checked against, not fitted
# Output: the face plane at 160 px per inch.
PPI = 160
X0, X1, Y0, Y1 = -2.4, 2.4, SCALE - 0.2, SCALE + 6.8


def homography(src, dst):
    A = []
    for (x, y), (u, v) in zip(src, dst):
        A.append([x, y, 1, 0, 0, 0, -u * x, -u * y, -u])
        A.append([0, 0, 0, x, y, 1, -v * x, -v * y, -v])
    _, _, vt = np.linalg.svd(np.array(A))
    H = vt[-1].reshape(3, 3)
    return H / H[2, 2]


def apply(H, x, y):
    w = H[2, 0] * x + H[2, 1] * y + H[2, 2]
    return (H[0, 0] * x + H[0, 1] * y + H[0, 2]) / w, (H[1, 0] * x + H[1, 1] * y + H[1, 2]) / w


def load(path):
    img = bpy.data.images.load(path)
    w, h = img.size
    a = np.empty(w * h * 4, np.float32)
    img.pixels.foreach_get(a)
    return a.reshape(h, w, 4)[::-1, :, :3]


def sample(a, u, v):
    h, w, _ = a.shape
    u = np.clip(u, 0, w - 1.001)
    v = np.clip(v, 0, h - 1.001)
    u0, v0 = np.floor(u).astype(int), np.floor(v).astype(int)
    fu, fv = (u - u0)[..., None], (v - v0)[..., None]
    return ((a[v0, u0] * (1 - fu) + a[v0, u0 + 1] * fu) * (1 - fv) +
            (a[v0 + 1, u0] * (1 - fu) + a[v0 + 1, u0 + 1] * fu) * fv)


def flood(seed, passable):
    m = seed & passable
    while True:
        g = m.copy()
        g[1:] |= m[:-1]; g[:-1] |= m[1:]; g[:, 1:] |= m[:, :-1]; g[:, :-1] |= m[:, 1:]
        g &= passable
        if (g == m).all():
            return m
        m = g


def grow(m, k):
    for _ in range(k):
        g = m.copy()
        g[1:] |= m[:-1]; g[:-1] |= m[1:]; g[:, 1:] |= m[:, :-1]; g[:, :-1] |= m[:, 1:]
        m = g
    return m


def main():
    a = load(PHOTO)
    H = homography([p[0] for p in POSTS], [p[1] for p in POSTS])
    Hinv = np.linalg.inv(H)
    mx, my = apply(Hinv, *MEDALLION_PX)

    W, Hh = int((X1 - X0) * PPI), int((Y1 - Y0) * PPI)
    xs = X0 + (np.arange(W) + 0.5) / PPI
    ys = Y1 - (np.arange(Hh) + 0.5) / PPI            # row 0 is the far end of the headstock
    X, Y = np.meshgrid(xs, ys)
    U, V = apply(H, X, Y)
    face = sample(a, U, V)
    inside = (U >= 0) & (U < a.shape[1] - 1) & (V >= 0) & (V < a.shape[0] - 1)

    r, g, b = face[..., 0], face[..., 1], face[..., 2]
    # The headstock against the black backdrop.
    bg = (face.max(axis=2) < 0.12) | ~inside
    border = np.zeros_like(bg)
    border[0], border[-1], border[:, 0], border[:, -1] = True, True, True, True
    background = flood(border, bg)
    # Tuner buttons stand beside the headstock, below its face: gold, outside.
    gold = ((r - b) > 0.3) & (g > 0.45)
    head = ~background & ~gold
    head[Y.astype(float) < SCALE + 0.22] = False       # the neck and nut: modelled separately
    seed = np.zeros_like(head)
    seed[int((Y1 - (SCALE + 2.75)) * PPI), int((0 - X0) * PPI)] = True
    # The button shafts are thin; opening by 1/8" cuts them, leaving the
    # buttons as islands that the flood from the centre never reaches. (1/4":
    # the bass-side shafts are wider than the treble ones.)
    def shrink(m, k):
        for _ in range(k):
            g = m.copy()
            g[1:] &= m[:-1]; g[:-1] &= m[1:]; g[:, 1:] &= m[:, :-1]; g[:, :-1] &= m[:, 1:]
            m = g
        return m
    # Brass inside the face (the medallion ring, the bushings) was cut with
    # the gold buttons; fill those holes back first, then open.
    head = ~flood(border, ~head)
    head = grow(shrink(head, PPI // 4), PPI // 4)
    head = flood(seed, head)
    # The headstock is symmetric (the straight-on front view shows it); tuner
    # buttons at the bass edge are not. Keep what the face and its mirror share.
    ci = int(round((0 - X0) * PPI))
    mirror = head[:, ::-1]
    shift = (W - 1) - 2 * ci
    mirror = np.roll(mirror, -shift, axis=1)
    head &= mirror
    head = flood(seed, head)          # and only the piece joined to the face
    # Fill the gold post bushings back in: they sit on the face.
    holes = ~flood(border, ~head)
    head |= holes

    # Erase what isn't the face. A string is straight, and a straight line
    # stays straight through the homography even though the string floats
    # above the face; so for each post, find the straight line from it to the
    # nut that looks most like a thin string, and erase that band. Blue silks
    # go by colour. The posts and bushings go as discs.
    lum = face.mean(axis=2)
    thin = np.abs(2 * lum - np.roll(lum, 3, 1) - np.roll(lum, -3, 1))
    to_px = lambda x, y: ((x - X0) * PPI, (Y1 - y) * PPI)
    # Silks shade from blue to violet; wood never has more blue than green.
    erase = grow(((b - r) > 0.08) | ((b - g) > 0.04), 6)
    lines = []
    for (px, py), _ in POSTS:
        best = None
        for xb in np.arange(-1.3, 1.3, 0.01):
            t = np.linspace(0.08, 1.0, 160)
            xx = px + (xb - px) * t
            yy = py + (SCALE + 0.22 - py) * t
            cx, cy = to_px(xx, yy)
            ok = (cx >= 3) & (cx < W - 3) & (cy >= 0) & (cy < Hh)
            score = float(thin[cy[ok].astype(int), cx[ok].astype(int)].mean()) if ok.any() else 0
            if best is None or score > best[0]:
                best = (score, xb)
        lines.append(((px, py), (best[1], SCALE + 0.22)))
        ax, ay = to_px(px, py)
        bx, by = to_px(best[1], SCALE + 0.22)
        # distance of every pixel to the segment, in pixels
        Pc, Pr = np.meshgrid(np.arange(W), np.arange(Hh))
        dx, dy = bx - ax, by - ay
        tt = np.clip(((Pc - ax) * dx + (Pr - ay) * dy) / (dx * dx + dy * dy), 0, 1)
        d = np.hypot(Pc - (ax + tt * dx), Pr - (ay + tt * dy))
        erase |= d < 0.035 * PPI
    discs = np.zeros_like(erase)
    for (px, py), _ in POSTS:
        # Bushings are 0.66" across. The near posts also carry the silk
        # wraps, which parallax pushes outward, so give them more margin
        # (the far posts can't have more: the medallion ring is just below).
        rr = 0.42 if py < SCALE + 2.5 else 0.34
        discs |= (X - px) ** 2 + (Y - py) ** 2 < rr ** 2
    erase &= head
    discs &= head

    fill = face.copy()
    # Thin string bands: interpolate across them, left to right.
    for i in range(Hh):
        row = erase[i] & ~discs[i]
        if not row.any():
            continue
        known = np.nonzero(~row & head[i])[0]
        if len(known) < 2:
            continue
        idx = np.nonzero(row)[0]
        for c in range(3):
            fill[i, idx, c] = np.interp(idx, known, fill[i, known, c])
    # Post discs: the grain runs along the headstock (down the columns), so
    # continue each column's wood through the disc from above and below.
    for j in range(W):
        col = discs[:, j]
        if not col.any():
            continue
        rows_ = np.nonzero(col)[0]
        top, bot = rows_.min() - 1, rows_.max() + 1
        if top < 0 or bot >= Hh:
            continue
        for k, i in enumerate(rows_):
            src = top - 1 - k if k < len(rows_) / 2 else bot + (rows_.max() - i) + 1
            src = int(np.clip(src, 0, Hh - 1))
            fill[i, j] = fill[src, j]
    fill[~head] = 0
    erase |= discs

    os.makedirs(os.path.dirname(TEXTURE), exist_ok=True)
    img = bpy.data.images.new('face', W, Hh, alpha=True)
    img.colorspace_settings.name = 'sRGB'
    rgba = np.dstack([fill, head.astype(np.float32)])[::-1]
    img.pixels.foreach_set(rgba.astype(np.float32).ravel())
    img.filepath_raw = TEXTURE
    img.file_format = 'PNG'
    img.save()

    # A sharper outline than the 16 px/in trace, from the straightened face.
    rows = []
    for i in range(Hh):
        cols = np.nonzero(head[i])[0]
        if len(cols):
            rows.append((float(ys[i]), float(xs[cols.min()]), float(xs[cols.max()])))
    right = [(xr, y) for y, xl, xr in rows[::3]]
    left = [(xl, y) for y, xl, xr in rows[::3]][::-1]
    outline = [[round(x, 4), round(y, 4)] for x, y in right + left]
    data = {
        'source': 'mc-user-headstock.jpg (1200x801), supplied by the project owner',
        'homographyModelToPhoto': [[round(float(v), 8) for v in row] for row in H],
        'medallionCheck': {'photoPx': MEDALLION_PX, 'mapsToIn': [round(float(mx), 3), round(float(my), 3)],
                           'modelIn': [0.0, SCALE + 2.75]},
        'texture': {'file': '.shots/textures/mc-headstock-face.png', 'pxPerIn': PPI,
                    'x0': X0, 'x1': X1, 'y0': Y0, 'y1': Y1},
        'outline': outline,
    }
    with open(OUT, 'w') as f:
        json.dump(data, f, indent=1)
    print('HEAD', json.dumps(data['medallionCheck']), 'outline', len(outline), 'erased px', int(erase.sum()),
          'strings', [[round(float(v), 2) for v in (l[1][0],)] for l in lines])


main()

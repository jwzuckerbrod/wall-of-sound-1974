"""
Traces Phil Lesh's "Mission Control" (Alembic 74 00008) off its straight-on
front photograph.

Run inside Blender for its numpy:
    /Applications/Blender.app/Contents/MacOS/Blender -b -P blender/instruments/mission_control/trace.py

Reads .shots/reference/mission-control-front-back.jpg (gdsets.com; front view
is the left half; not in the repo). Writes outline.json beside this script
(numbers only) and a preview to .shots/trace/.

Scale: no measurement of the scale length has been published. 32" is used
(the only figure found, a forum estimate) and flagged as such. The nut and the
saddle line are measured in the photograph and set 32" apart; every other
dimension follows from that one number, so correcting it is a one-line change.
Cross-checks at 32": nut 1.63", body 15.0" wide, fingerboard ending where fret
24 falls.
"""
import json
import os

import bpy
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))
PHOTO = os.path.join(ROOT, '.shots', 'reference', 'mission-control-front-back.jpg')
OUT = os.path.join(HERE, 'outline.json')
PREVIEW = os.path.join(ROOT, '.shots', 'trace', 'mission-control-trace.png')

SCALE_IN = 32.0          # estimate; see above
Y_NUT = 119.7            # measured: the nut's fingerboard edge
Y_SADDLE = 640.5         # measured: saddle crowns of the U-channel bridge
FRONT_MAX_X = 400        # the front view is the left half of the frame


def load(path):
    img = bpy.data.images.load(path)
    w, h = img.size
    a = np.empty(w * h * 4, np.float32)
    img.pixels.foreach_get(a)
    return a.reshape(h, w, 4)[::-1, :, :3] * 255.0


def flood(seed, passable):
    m = seed & passable
    while True:
        g = m.copy()
        g[1:] |= m[:-1]
        g[:-1] |= m[1:]
        g[:, 1:] |= m[:, :-1]
        g[:, :-1] |= m[:, 1:]
        g &= passable
        if (g == m).all():
            return m
        m = g


def trace(mask):
    """Moore-neighbour boundary, as (x, y) pixel coordinates."""
    ys, xs = np.nonzero(mask)
    start = (xs[np.argmin(ys * 100000 + xs)], ys.min())
    dirs = [(1, 0), (1, 1), (0, 1), (-1, 1), (-1, 0), (-1, -1), (0, -1), (1, -1)]
    h, w = mask.shape
    inside = lambda x, y: 0 <= x < w and 0 <= y < h and mask[y, x]
    pts, cur, back = [start], start, 4
    for _ in range(400000):
        for k in range(8):
            d = (back + 1 + k) % 8
            nx, ny = cur[0] + dirs[d][0], cur[1] + dirs[d][1]
            if inside(nx, ny):
                back = (d + 4) % 8
                cur = (nx, ny)
                break
        if cur == start:
            break
        pts.append(cur)
    return np.array(pts, float)


def simplify(P, eps):
    if len(P) < 3:
        return P
    a, b = P[0], P[-1]
    ab = b - a
    n = np.hypot(*ab) or 1.0
    d = np.abs(ab[0] * (a[1] - P[:, 1]) - (a[0] - P[:, 0]) * ab[1]) / n
    i = int(np.argmax(d))
    if d[i] > eps:
        return np.vstack([simplify(P[:i + 1], eps)[:-1], simplify(P[i:], eps)])
    return np.vstack([a, b])


def closed_simplify(P, eps):
    far = int(np.argmax(np.hypot(*(P - P[0]).T)))
    return np.vstack([simplify(P[:far + 1], eps)[:-1], simplify(np.vstack([P[far:], P[:1]]), eps)[:-1]])


def open_(m, k):
    """Morphological opening with a (2k+1) square: removes anything thinner."""
    def erode(m):
        o = m.copy()
        o[1:] &= m[:-1]; o[:-1] &= m[1:]; o[:, 1:] &= m[:, :-1]; o[:, :-1] &= m[:, 1:]
        return o
    def dilate(m):
        o = m.copy()
        o[1:] |= m[:-1]; o[:-1] |= m[1:]; o[:, 1:] |= m[:, :-1]; o[:, :-1] |= m[:, 1:]
        return o
    for _ in range(k):
        m = erode(m)
    for _ in range(k):
        m = dilate(m)
    return m


def close_(m, k):
    """Morphological closing: fills notches and holes narrower than 2k+1."""
    return ~open_(~m, k)


def main():
    a = load(PHOTO)[:, :FRONT_MAX_X]
    h, w, _ = a.shape
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    ppi = (Y_SADDLE - Y_NUT) / SCALE_IN

    # The wall is near-white and grey where the bass casts a shadow: bright
    # and unsaturated. The bass is brown, black, brass: not both.
    bright = a.sum(axis=2) > 480
    grey = (a.max(axis=2) - a.min(axis=2)) < 28
    wall = bright & grey
    border = np.zeros_like(wall)
    border[0, :] = border[-1, :] = border[:, 0] = border[:, -1] = True
    bass = ~flood(border, wall)

    # Fingerboard edges from the dark ebony, averaged along the neck.
    rows = range(int(Y_NUT) + 10, int(Y_NUT) + 300, 6)
    edges = []
    for y in rows:
        dark = np.nonzero(a[y, 150:240].sum(axis=1) < 250)[0]
        if len(dark) > 15:
            edges.append((y, 150 + dark.min(), 150 + dark.max()))
    E = np.array(edges, float)
    # Straight lines for each edge: the board tapers evenly.
    kl = np.polyfit(E[:, 0], E[:, 1], 1)
    kr = np.polyfit(E[:, 0], E[:, 2], 1)
    x_left = lambda y: np.polyval(kl, y)
    x_right = lambda y: np.polyval(kr, y)
    axis = lambda y: (x_left(y) + x_right(y)) / 2

    # Body: everything below where the neck meets it, the neck removed and the
    # notch it leaves closed straight across (as on the Wolf).
    body = bass.copy()
    body[:int(Y_NUT) + 150] = False
    seed = np.zeros_like(body)
    seed[int(Y_SADDLE), int(axis(Y_SADDLE)) - 60] = True
    body = flood(seed, body)
    body = open_(body, 2)                      # strap buttons and the cable go
    y_body_top = int(np.nonzero(body.any(axis=1))[0].min())
    y24 = Y_NUT + ppi * SCALE_IN * (1 - 2 ** (-24 / 12))
    xl, xr = int(np.floor(x_left(y24))) - 1, int(np.ceil(x_right(y24))) + 1
    body[:, xl:xr + 1] &= False
    cols_l = np.nonzero(body[:, xl - 2])[0]
    cols_r = np.nonzero(body[:, xr + 2])[0]
    y_join = max(cols_l.min(), cols_r.min())
    bottom = int(np.nonzero(body.any(axis=1))[0].max())
    body[y_join:bottom + 1, xl:xr + 1] = bass[y_join:bottom + 1, xl:xr + 1]
    body = flood(seed, body)
    body = open_(body, 2)

    # Headstock: above the nut, tuner buttons (brass, on thin shafts) opened away.
    head = bass.copy()
    head[int(Y_NUT) + 1:] = False
    # The tuner buttons are gold brass: brighter and yellower than the brown
    # rosewood face. Drop them before tracing the headstock's own outline.
    gold = ((r - b) > 90) & (g > 120)
    head &= ~gold
    head = open_(head, 5)
    hseed = np.zeros_like(head)
    hseed[int(Y_NUT) - 20, int(axis(Y_NUT))] = True
    head = flood(hseed, head)
    # The gold string posts on the face leave bites in the edge; close them.
    head = close_(head, 4)
    head[int(Y_NUT) + 1:] = False
    # The headstock is symmetric about the neck's centre line; where a shaft
    # bites one side, the other side is whole, so take the union with the
    # mirror image.
    cx = axis(Y_NUT)
    cols = np.arange(w)
    src = np.round(2 * cx - cols).astype(int)
    ok = (src >= 0) & (src < w)
    mirror = np.zeros_like(head)
    mirror[:, cols[ok]] = head[:, src[ok]]
    head |= mirror

    # Knobs (black) and ivoroid buttons (white) on the top: find each blob
    # and keep its centre and size. Only blobs of the right size count.
    def blobs(mask, lo, hi):
        found, seen = [], np.zeros_like(mask)
        for y, x in zip(*np.nonzero(mask)):
            if seen[y, x]:
                continue
            s0 = np.zeros_like(mask)
            s0[y, x] = True
            bl = flood(s0, mask)
            seen |= bl
            n = int(bl.sum())
            if lo <= n <= hi:
                ys_, xs_ = np.nonzero(bl)
                found.append((float(xs_.mean()), float(ys_.mean()), float(np.sqrt(n / np.pi))))
        return found
    inner = open_(body, 4)
    knobs = blobs((a.sum(axis=2) < 170) & inner, 25, 220)
    buttons = blobs((a.min(axis=2) > 205) & inner, 5, 80)

    to_in = lambda pts, yc, xc: [[round(float((x - xc) / ppi), 4), round(float((yc - y) / ppi), 4)] for x, y in pts]
    body_pts = closed_simplify(trace(body), 0.5)
    head_pts = closed_simplify(trace(head), 0.5)
    x_c = axis(Y_SADDLE)
    data = {
        'source': 'gdsets.com/philbasses/mc2.jpg, front view (left half), straight-on',
        'frame': 'inches; x across (+ treble side), y along the neck, 0 at the saddle line, + toward the neck',
        'scale': {'scaleLengthIn': SCALE_IN, 'scaleIsEstimate': True, 'pxPerIn': round(ppi, 3),
                  'yNutPx': Y_NUT, 'ySaddlePx': Y_SADDLE},
        'nutWidthIn': round(float((x_right(Y_NUT) - x_left(Y_NUT)) / ppi), 3),
        'boardWidthAtFret24In': round(float((x_right(y24) - x_left(y24)) / ppi), 3),
        'bodyIn': {'width': round(float(np.ptp(body_pts[:, 0]) / ppi), 3),
                   'length': round(float(np.ptp(body_pts[:, 1]) / ppi), 3)},
        'body': to_in(body_pts, Y_SADDLE, x_c),
        # Headstock in the same frame as the body, so y is well above 32.
        'headstock': to_in(head_pts, Y_SADDLE, axis(Y_NUT)),
        'knobs': [[round((x - axis(Y_SADDLE)) / ppi, 3), round((Y_SADDLE - y) / ppi, 3), round(r_ / ppi, 3)] for x, y, r_ in knobs],
        'buttons': [[round((x - axis(Y_SADDLE)) / ppi, 3), round((Y_SADDLE - y) / ppi, 3), round(r_ / ppi, 3)] for x, y, r_ in buttons],
        'photoFrame': {'widthPx': FRONT_MAX_X, 'heightPx': int(h), 'xCentrePx': round(float(x_c), 2)},
    }
    with open(OUT, 'w') as f:
        json.dump(data, f, indent=1)
    print('TRACE', json.dumps({k: v for k, v in data.items() if k not in ('body', 'headstock')}),
          'points', len(data['body']), len(data['headstock']))

    prev = a * 0.55
    for pts, col in ((body_pts, (255, 60, 60)), (head_pts, (60, 200, 255))):
        for (x0, y0), (x1, y1) in zip(pts, np.roll(pts, -1, axis=0)):
            for t in np.linspace(0, 1, 30):
                x, y = int(x0 + (x1 - x0) * t), int(y0 + (y1 - y0) * t)
                if 0 <= x < w and 0 <= y < h:
                    prev[y, x] = col
    for k in range(25):
        y = int(round(Y_NUT + ppi * SCALE_IN * (1 - 2 ** (-k / 12))))
        prev[y, int(x_left(y)):int(x_right(y)) + 1] = (60, 255, 120)
    prev[int(round(Y_SADDLE)), 60:340] = (255, 220, 0)
    for x, y, r_ in knobs:
        prev[int(y) - 1:int(y) + 2, int(x) - 1:int(x) + 2] = (255, 0, 255)
    for x, y, r_ in buttons:
        prev[int(y) - 1:int(y) + 2, int(x) - 1:int(x) + 2] = (0, 255, 255)
    os.makedirs(os.path.dirname(PREVIEW), exist_ok=True)
    out = bpy.data.images.new('trace', w, h)
    out.pixels.foreach_set(np.dstack([prev / 255.0, np.ones((h, w))])[::-1].astype(np.float32).ravel())
    out.filepath_raw = PREVIEW
    out.file_format = 'PNG'
    out.save()


main()

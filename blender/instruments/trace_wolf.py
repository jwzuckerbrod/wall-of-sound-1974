"""
Traces the Wolf's body outline off Herb Greene's straight-on photograph and
scales it from the frets.

Run inside Blender for its numpy:
    /Applications/Blender.app/Contents/MacOS/Blender -b -P blender/instruments/trace_wolf.py

Reads .shots/reference/wolf-irwin-body.jpg (not in the repo; see
blender/instruments/README.md). Writes blender/instruments/wolf_outline.json —
only the traced numbers, which are what the model is built from — and a
preview image to .shots/trace/.

Scale comes from the instrument itself, not a guess: Wolf has a 25" scale
(Irwin), so fret n sits 25 * (1 - 2^(-n/12)) inches from the nut. The frets
visible in the photo are fitted to that series, which fixes both the pixels per
inch and which frets they are, and puts the saddle line 25" from the nut.
"""
import json
import os

import bpy
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PHOTO = os.path.join(ROOT, '.shots', 'reference', 'wolf-irwin-body.jpg')
OUT = os.path.join(ROOT, 'blender', 'instruments', 'wolf_outline.json')
PREVIEW = os.path.join(ROOT, '.shots', 'trace', 'wolf-trace.png')
SCALE_IN = 25.0


def load(path):
    img = bpy.data.images.load(path)
    w, h = img.size
    a = np.empty(w * h * 4, np.float32)
    img.pixels.foreach_get(a)
    return a.reshape(h, w, 4)[::-1, :, :3] * 255.0  # top-down, 0..255


def flood(seed_mask, passable):
    """Grow seed_mask through passable pixels (4-connected)."""
    m = seed_mask & passable
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
    """Moore-neighbour boundary of the largest blob, as (x, y) pixel corners."""
    ys, xs = np.nonzero(mask)
    start = (xs[np.argmin(ys * 10000 + xs)], ys.min())
    dirs = [(1, 0), (1, 1), (0, 1), (-1, 1), (-1, 0), (-1, -1), (0, -1), (1, -1)]
    h, w = mask.shape
    inside = lambda x, y: 0 <= x < w and 0 <= y < h and mask[y, x]
    pts, cur, back = [start], start, 4
    for _ in range(200000):
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
    """Douglas-Peucker on an open polyline."""
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


def fret_peaks(a, cols, y0, y1):
    prof = a[y0:y1, cols].mean(axis=(1, 2))
    prof = prof - np.convolve(prof, np.ones(15) / 15, mode='same')
    peaks = [y for y in range(2, len(prof) - 2)
             if prof[y] > 12 and prof[y] == prof[y - 2:y + 3].max()]
    # Sub-pixel centroid of each peak.
    out = []
    for y in peaks:
        wts = np.clip(prof[y - 2:y + 3], 0, None)
        out.append(y0 + y - 2 + (wts * np.arange(5)).sum() / wts.sum())
    return np.array(out)


def fit_frets(peaks, ppi_range):
    """
    Which frets are these, and how many pixels to the inch?

    Fret n lies 25 * (1 - 2^(-n/12)) in from the nut. Every pair of peaks,
    taken as every pair of fret numbers, fixes a candidate scale and nut
    position; the candidate that lands on the most peaks wins, and a least-
    squares fit over those peaks refines it. Inlays and string glints are
    simply the peaks no candidate explains.
    """
    frets = SCALE_IN * (1 - 2.0 ** (-np.arange(25) / 12))
    best = None
    for i in range(len(peaks)):
        for j in range(i + 1, len(peaks)):
            for ni in range(1, 24):
                for nj in range(ni + 1, 25):
                    ppi = (peaks[j] - peaks[i]) / (frets[nj] - frets[ni])
                    if not ppi_range[0] < ppi < ppi_range[1]:
                        continue
                    y_nut = peaks[i] - ppi * frets[ni]
                    pred = y_nut + ppi * frets
                    d = np.abs(peaks[:, None] - pred[None, :])
                    hits = d.min(axis=1) < 2.0
                    score = (int(hits.sum()), -float(d.min(axis=1)[hits].mean()))
                    if best is None or score > best[0]:
                        best = (score, hits, d.argmin(axis=1))
    _, hits, idx = best
    x = frets[idx[hits]]
    A = np.vstack([x, np.ones_like(x)]).T
    (ppi, y_nut), *_ = np.linalg.lstsq(A, peaks[hits], rcond=None)
    err = float(np.sqrt(np.mean((A @ [ppi, y_nut] - peaks[hits]) ** 2)))
    return err, int(idx[hits].min()), float(ppi), float(y_nut), int(hits.sum())


def main():
    a = load(PHOTO)
    h, w, _ = a.shape
    r, g, b = a[..., 0], a[..., 1], a[..., 2]

    # Background and the ebony board both lean blue; the body, plate and
    # hardware do not. Flood from the border so dark hardware inside the body
    # (pickups, holes) is never mistaken for background.
    bluish = (b - r) > 6
    border = np.zeros_like(bluish)
    border[0, :] = border[-1, :] = border[:, 0] = border[:, -1] = True
    bg = flood(border, bluish)
    body = ~bg
    # Keep only the body itself: grow it from a point on the lower bout, which
    # drops stray specks anywhere else in the frame.
    seed = np.zeros_like(body)
    seed[500, 200] = True
    body = flood(seed, body)

    # The fingerboard runs over the body to fret 24 and flooded out with the
    # background, leaving a notch. Find the board where it crosses the body —
    # the widest non-gold run between gold on both sides, just above its end —
    # and close the notch with a straight edge at the lower cutaway.
    gold = (r - b) > 30
    best = (0, 0, 0)
    for y in range(180, 250):
        row = np.nonzero(gold[y])[0]
        if len(row) < 2:
            continue
        gaps = np.diff(row)
        i = int(np.argmax(gaps))
        if gaps[i] > best[0] and 60 < gaps[i] < 200:
            best = (int(gaps[i]), int(row[i]) + 1, int(row[i + 1]) - 1)
    _, gl, gr = best
    # Inside that gap, the board itself is the run of ebony (darker than the
    # background, r < 30) at mid-height of the visible neck.
    ebony = np.nonzero((r[120, gl:gr] < 30))[0]
    bl, br = gl + int(ebony.min()), gl + int(ebony.max())
    y_join = max(int(np.nonzero(body[:, bl - 2])[0].min()), int(np.nonzero(body[:, br + 2])[0].min()))
    for x in range(bl, br + 1):
        below = np.nonzero(body[y_join:, x])[0]
        if len(below):
            body[y_join:y_join + below[0], x] = True

    # Frets: sample the board just inside each edge, clear of the inlays.
    fb_cols = list(range(bl + 3, bl + 9)) + list(range(br - 8, br - 2))
    peaks = fret_peaks(a, fb_cols, 0, 260)
    print("TRACE board", bl, br, "peaks", np.round(peaks, 1).tolist())
    # A fingerboard at the body end is 2.0-2.4 in across on any six-string,
    # which rules out the degenerate fits (low frets at a tiny scale).
    board_px = br - bl
    err, n0, ppi, y_nut, n_used = fit_frets(peaks, (board_px / 2.4, board_px / 2.0))
    y_saddle = y_nut + ppi * SCALE_IN
    x_centre = (bl + br) / 2

    outline = trace(body)
    # Simplify as two open halves: a closed loop starts and ends on the same
    # point, which leaves Douglas-Peucker nothing to measure against.
    far = int(np.argmax(np.hypot(*(outline - outline[0]).T)))
    outline = np.vstack([simplify(outline[:far + 1], 0.6)[:-1],
                         simplify(np.vstack([outline[far:], outline[:1]]), 0.6)[:-1]])
    inches = [[round((x - x_centre) / ppi, 4), round((y_saddle - y) / ppi, 4)] for x, y in outline]
    xs = [p[0] for p in inches]
    ys = [p[1] for p in inches]

    # Fingerboard inlays visible in this photo (frets 13 up). The print has a
    # cool cast, so ivory reads as bright rather than warm. Frets and strings
    # are just as bright, so mask out the fitted fret rows and the six string
    # columns first, then close the small gaps they leave through each inlay.
    bright = (r + g + b) > 430
    board = np.zeros_like(bright)
    board[:int(y_nut + ppi * 18.9), bl + 3:br - 2] = True
    ivory = bright & board
    for k in range(n0, 25):
        y = int(round(y_nut + ppi * SCALE_IN * (1 - 2 ** (-k / 12))))
        ivory[max(0, y - 3):y + 4] = False
    strings = np.nonzero(bright[:int(y_nut + ppi * 18.9), bl:br].mean(axis=0) > 0.55)[0] + bl
    for x in strings:
        ivory[:, x - 1:x + 2] = False
    grow = ivory.copy()
    for _ in range(3):
        g2 = grow.copy()
        g2[1:] |= grow[:-1]; g2[:-1] |= grow[1:]; g2[:, 1:] |= grow[:, :-1]; g2[:, :-1] |= grow[:, 1:]
        grow = g2
    ivory = grow & board & ~((r + g + b) < 150)
    inlays = []
    seen = np.zeros_like(ivory)
    for y, x in zip(*np.nonzero(ivory)):
        if seen[y, x]:
            continue
        s0 = np.zeros_like(ivory)
        s0[y, x] = True
        blob = flood(s0, ivory)
        seen |= blob
        if blob.sum() < 25:
            continue
        pts = trace(blob)
        if len(pts) < 8:
            continue
        shape = [[round((px - x_centre) / ppi, 4), round((y_saddle - py) / ppi, 4)] for px, py in pts[::2]]
        xs_, ys_ = [q[0] for q in shape], [q[1] for q in shape]
        # A string or the board edge leaks through as a long hair-thin line.
        if max(xs_) - min(xs_) < 0.2 or max(ys_) - min(ys_) > 1.0:
            continue
        inlays.append(shape)

    # The neck-through laminate shows as two thin purpleheart lines down the
    # middle below the bridge. Find them on a clear row between the bridge
    # parts and the tail.
    row = 600  # between the bridge and the tailpiece, clear of the decal
    warm = a[row, int(x_centre) - 40:int(x_centre) + 40]
    dark = np.nonzero((warm.sum(axis=1) < 200) & (warm[:, 0] >= warm[:, 2]))[0]
    stripes = []
    for x in dark:
        xx = int(x_centre) - 40 + int(x)
        if not stripes or xx - stripes[-1][-1] > 5:
            stripes.append([xx])
        else:
            stripes[-1].append(xx)
    stripe_in = [[round((min(g) - x_centre) / ppi, 4), round((max(g) + 1 - x_centre) / ppi, 4)] for g in stripes]

    data = {
        'source': 'Herb Greene photograph, irwin-guitars.com (wolf-irwin-body.jpg, 800x935)',
        'frame': 'inches; x across the body (+ treble side, player facing you), y along the neck, 0 at the saddle line, + toward the neck',
        'scale': {'scaleLengthIn': SCALE_IN, 'pxPerIn': round(float(ppi), 4), 'firstFret': int(n0),
                  'fretsFitted': n_used, 'rmsErrorPx': round(err, 3)},
        'fingerboardWidthAtBodyIn': round((br - bl) / ppi, 3),
        'bodyIn': {'width': round(max(xs) - min(xs), 3), 'length': round(max(ys) - min(ys), 3),
                   'top': round(max(ys), 3), 'bottom': round(min(ys), 3)},
        'outline': inches,
        'inlays': inlays,
        'centreStripesIn': stripe_in,
        'photoFrame': {'widthPx': int(w), 'heightPx': int(h), 'xCentrePx': round(float(x_centre), 2),
                       'ySaddlePx': round(float(y_saddle), 2), 'yNutPx': round(float(y_nut), 2)},
    }
    with open(OUT, 'w') as f:
        json.dump(data, f, indent=1)
    print('TRACE', json.dumps({k: v for k, v in data.items() if k not in ('outline', 'inlays')}), 'points', len(inches), 'inlays', [len(i) for i in inlays])

    # Preview: photo, traced outline, fitted frets and saddle line.
    prev = a.copy() * 0.6
    ol = np.round(outline).astype(int)
    for (x0, y0), (x1, y1) in zip(ol, np.roll(ol, -1, axis=0)):
        for t in np.linspace(0, 1, 40):
            x, y = int(x0 + (x1 - x0) * t), int(y0 + (y1 - y0) * t)
            if 0 <= x < w and 0 <= y < h:
                prev[max(0, y - 1):y + 2, max(0, x - 1):x + 2] = (255, 60, 60)
    for k in range(0, 25):
        y = int(round(y_nut + ppi * SCALE_IN * (1 - 2 ** (-k / 12))))
        if 0 <= y < h:
            prev[y, bl:br] = (60, 255, 120)
    for inl in inlays:
        for xi, yi in inl:
            x, y = int(round(x_centre + xi * ppi)), int(round(y_saddle - yi * ppi))
            if 0 <= x < w and 0 <= y < h:
                prev[y, x] = (80, 200, 255)
    ys_ = int(round(y_saddle))
    if 0 <= ys_ < h:
        prev[ys_ - 1:ys_ + 2, :] = (255, 220, 0)
    os.makedirs(os.path.dirname(PREVIEW), exist_ok=True)
    out = bpy.data.images.new('trace', w, h)
    rgba = np.dstack([prev / 255.0, np.ones((h, w))])[::-1].astype(np.float32)
    out.pixels.foreach_set(rgba.ravel())
    out.filepath_raw = PREVIEW
    out.file_format = 'PNG'
    out.save()


main()

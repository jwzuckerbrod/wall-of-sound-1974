"""
Traces a 1960 Gibson ES-335 off Gibson's straight-on catalogue cutout, and
measures the body depth off the side view.

    /Applications/Blender.app/Contents/MacOS/Blender -b -P blender/instruments/es335/trace.py

Reads .shots/reference/es335-gibson-front.webp and -side.webp (Gibson
Certified Vintage, 1960 ES-335TD, serial A33064; not in the repo). The photos
are cutouts on transparent backgrounds, so the silhouette is the alpha channel.
Writes outline.json beside this script and a preview to .shots/trace/.

Scale. Along the neck: Gibson's published 24.75" scale; the frets along the
board are fitted to that series, anchored at the nut (seen as the white band
across the neck; without it the series fits one fret off just as well, 6% out
in scale), which fixes the pixels per inch and the saddle line. The dot inlays
confirm the numbering (the first falls between frets 2 and 3). Across: Gibson's
1 11/16" nut. The two differ: this catalogue image is about 6% taller than it
is wide (so is Gibson's body close-up; the headstock close-up is not), so x and
y are scaled separately.
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
OUT = os.path.join(HERE, 'outline.json')
PREVIEW = os.path.join(ROOT, '.shots', 'trace', 'es335-trace.png')
SCALE_IN = 24.75
NUT_IN = 1.6875       # Gibson: 1 11/16"
FRETS = 22


def main():
    a = tk.load_rgba(os.path.join(REF, 'es335-gibson-front.webp'))
    h, w, _ = a.shape
    rgb = a[..., :3] * 255
    guitar = a[..., 3] > 0.5
    lum = rgb.mean(axis=2)

    # The neck: rows where the silhouette is narrow. Its edges, fitted as lines.
    rows = [y for y in range(250, 1050, 10) if 60 < np.ptp(np.nonzero(guitar[y])[0]) < 110]
    E = np.array([(y, np.nonzero(guitar[y])[0].min(), np.nonzero(guitar[y])[0].max()) for y in rows], float)
    kl, kr = np.polyfit(E[:, 0], E[:, 1], 1), np.polyfit(E[:, 0], E[:, 2], 1)
    xl = lambda y: np.polyval(kl, y)
    xr = lambda y: np.polyval(kr, y)
    axis = lambda y: (xl(y) + xr(y)) / 2

    # The nut: coming down the neck, the first rows that are bright right
    # across it (the truss-rod cover's outline above is only thin strokes).
    # The scale is measured from its fretboard-side edge.
    bright = []
    for y in range(int(E[0, 0]) - 80, int(E[0, 0]) + 250):
        a0, a1 = int(xl(y) + 0.06 * (xr(y) - xl(y))), int(xr(y) - 0.06 * (xr(y) - xl(y)))
        if a1 > a0 and (lum[y, a0:a1] > 170).mean() > 0.9 and guitar[y, a0:a1].all():
            bright.append(y)
    run = [bright[0]]
    for y in bright[1:]:
        if y != run[-1] + 1:
            break
        run.append(y)
    nut_seen = run[-1] + 0.5

    # Frets: bright lines crossing the board; sample just inside each edge,
    # clear of the dot inlays down the middle.
    y_mid = int(np.mean(E[:, 0]))
    cols = [int(xl(y_mid)) + d for d in range(8, 14)] + [int(xr(y_mid)) - d for d in range(8, 14)]
    peaks = tk.fret_peaks(rgb, cols, int(E[0, 0]) - 60, 1250)
    merged = []
    for y in sorted(peaks):
        if merged and y - merged[-1] < 5:
            merged[-1] = (merged[-1] + y) / 2
        else:
            merged.append(y)
    peaks = np.array(merged)
    nut_px = xr(nut_seen) - xl(nut_seen)
    err, n0, ppi_y, y_nut, used = tk.fit_frets(peaks, (nut_px / 1.9, nut_px / 1.3), SCALE_IN, FRETS, nut=nut_seen)
    ppi_x = nut_px / NUT_IN
    ppi = ppi_y
    y_saddle = y_nut + ppi_y * SCALE_IN
    y19 = y_nut + ppi_y * SCALE_IN * (1 - 2 ** (-19 / 12))
    # The dots: the first should fall between frets 2 and 3.
    f_ = lambda k: y_nut + ppi_y * SCALE_IN * (1 - 2 ** (-k / 12))
    xm = lambda y: int(round((xl(y) + xr(y)) / 2))
    dot_rows = [y for y in range(int(f_(1)), int(f_(4))) if lum[y, xm(y) - 2:xm(y) + 3].mean() > 170]
    first_dot_between = [k for k in range(1, 4) if dot_rows and f_(k) < np.mean(dot_rows) < f_(k + 1)]

    # Body: the silhouette below where the neck joins it (fret 19, Gibson),
    # the neck notch closed straight across.
    body = guitar.copy()
    body[:int(y19) - 150] = False
    seed = np.zeros_like(body)
    seed[int(y_saddle), int(axis(y_saddle)) - 150] = True
    body = tk.flood(seed, body)
    xl19, xr19 = int(xl(y19)) - 1, int(xr(y19)) + 1
    ljoin = np.nonzero(body[:, xl19 - 3])[0].min()
    rjoin = np.nonzero(body[:, xr19 + 3])[0].min()
    body[:max(ljoin, rjoin), xl19:xr19 + 1] = False
    body = tk.flood(seed, tk.open_(body, 2))

    # Headstock: above the nut; the keystone tuner buttons stand off on thin
    # shafts, so open them away, then keep what the headstock and its mirror
    # share (it is symmetric; the buttons' shadows are not).
    head = guitar.copy()
    head[int(y_nut) + 1:] = False
    head = tk.open_(head, 6)
    hseed = np.zeros_like(head)
    hseed[int(y_nut) - 60, int(axis(y_nut))] = True
    head = tk.flood(hseed, head)
    cx = axis(y_nut)
    colsi = np.arange(w)
    src = np.round(2 * cx - colsi).astype(int)
    ok = (src >= 0) & (src < w)
    mirror = np.zeros_like(head)
    mirror[:, colsi[ok]] = head[:, src[ok]]
    head = tk.flood(hseed, head & mirror)

    # Pickguard: glossy black, edged in a white binding line, so a flood of
    # dark pixels started inside it stops at its own edge. It also floods the
    # black pickup rings it butts against; those are cut back out as boxes.
    dark = lum < 60
    gseed = np.zeros_like(dark)
    gseed[1330, 1120] = True
    guard = tk.flood(gseed, dark & body)
    for (x0, x1, y0, y1) in ((918, 1074, 1194, 1284), (916, 1074, 1389, 1483)):
        guard[y0:y1, x0:x1] = False
    guard = tk.flood(gseed, tk.open_(guard, 3))
    guard = tk.close_(guard, 4)
    guard_pts = tk.closed_simplify(tk.trace(guard), 0.8)

    to_in = lambda pts, xc: [[round(float((x - xc) / ppi_x), 4), round(float((y_saddle - y) / ppi_y), 4)] for x, y in pts]
    body_pts = tk.closed_simplify(tk.trace(body), 0.6)
    head_pts = tk.closed_simplify(tk.trace(head), 0.6)
    x_c = axis(y_saddle)

    # Body depth, off the side view at the same scale: the rim's width in the
    # lower bout, well clear of the knobs and the tailpiece.
    s = tk.load_rgba(os.path.join(REF, 'es335-gibson-side.webp'))
    sg = s[..., 3] > 0.5
    ys, _ = np.nonzero(sg)
    side_len = ys.max() - ys.min()
    front_len = np.ptp(np.nonzero(guitar.any(axis=1))[0])
    side_ppi = ppi_x * side_len / front_len   # (the side image, like the front, taller than wide)
    lower = [np.ptp(np.nonzero(sg[y])[0]) for y in range(ys.max() - 200, ys.max() - 60, 5) if sg[y].any()]
    depth_in = float(np.median(lower)) / side_ppi

    data = {
        'source': 'Gibson Certified Vintage 1960 ES-335TD, serial A33064: catalogue cutouts (front, side)',
        'frame': 'inches; x across (+ treble side), y along the neck, 0 at the saddle line, + toward the neck',
        'scale': {'scaleLengthIn': SCALE_IN, 'pxPerInAlong': round(ppi_y, 3), 'pxPerInAcross': round(ppi_x, 3),
                  'aspect': round(ppi_y / ppi_x, 4), 'fretsFitted': used, 'firstFret': n0,
                  'rmsErrorPx': round(err, 3), 'nutSeenPx': nut_seen, 'yNutPx': round(y_nut, 2),
                  'ySaddlePx': round(y_saddle, 2), 'firstDotBetweenFrets': [first_dot_between[0], first_dot_between[0] + 1] if first_dot_between else None},
        'nutWidthIn': NUT_IN,
        'boardWidthAtFret19In': round(float((xr(y19) - xl(y19)) / ppi_x), 3),
        'bodyIn': {'width': round(float(np.ptp(body_pts[:, 0]) / ppi_x), 3),
                   'length': round(float(np.ptp(body_pts[:, 1]) / ppi_y), 3)},
        'bodyDepthIn': round(depth_in, 3),
        'body': to_in(body_pts, x_c),
        'headstock': to_in(head_pts, axis(y_nut)),
        'pickguard': to_in(guard_pts, x_c),
        'photoFrame': {'widthPx': int(w), 'heightPx': int(h), 'xCentrePx': round(float(x_c), 2)},
    }
    with open(OUT, 'w') as f:
        json.dump(data, f, indent=1)
    print('TRACE', json.dumps({k: v for k, v in data.items() if k not in ('body', 'headstock', 'pickguard')}), 'guard pts', len(data['pickguard']),
          'points', len(data['body']), len(data['headstock']))

    prev = rgb * 0.5 + 60
    for pts, col in ((body_pts, (255, 60, 60)), (head_pts, (60, 200, 255)), (guard_pts, (255, 0, 255))):
        for (x0, y0), (x1, y1) in zip(pts, np.roll(pts, -1, axis=0)):
            for t in np.linspace(0, 1, 30):
                x, y = int(x0 + (x1 - x0) * t), int(y0 + (y1 - y0) * t)
                if 0 <= x < w and 0 <= y < h:
                    prev[max(0, y - 1):y + 2, max(0, x - 1):x + 2] = col
    for k in range(FRETS + 1):
        y = int(round(y_nut + ppi * SCALE_IN * (1 - 2 ** (-k / 12))))
        prev[y, int(xl(y)):int(xr(y)) + 1] = (60, 255, 120)
    prev[int(round(y_saddle)) - 1:int(round(y_saddle)) + 2, 600:1500] = (255, 220, 0)
    os.makedirs(os.path.dirname(PREVIEW), exist_ok=True)
    out = bpy.data.images.new('trace', w, h)
    out.pixels.foreach_set(np.dstack([np.clip(prev, 0, 255) / 255.0, np.ones((h, w))])[::-1].astype(np.float32).ravel())
    out.filepath_raw = PREVIEW
    out.file_format = 'PNG'
    out.save()


main()

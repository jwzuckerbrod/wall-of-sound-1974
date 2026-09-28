"""
Traces a Steinway Model D concert grand off a dimensioned drawing: plan, side
elevation and front elevation.

    /Applications/Blender.app/Contents/MacOS/Blender -b -P blender/instruments/piano/trace.py

Reads .shots/reference/steinway-d-plan.svg (dimensions.com, "Steinway Grand
Piano - Model D"; not in the repo). The drawing is vector: Blender's own SVG
importer reads its strokes, which are drawn into a raster here and traced.

Scale: the drawing's own dimensions, Steinway's published 107.75" long and
61.75" wide. The length sets the scale for all three views (the side view
measures 107.99" at it; the front view 61.5" wide). The plan is drawn about
2.5% narrow for its length, so its width alone is scaled to the 61.75".

Frame: inches. x across (+ treble), y from the front of the keys toward the
tail, z up from the floor.
Writes outline.json beside this script and a preview to .shots/trace/.
"""
import json
import os
import sys

import bpy
import numpy as np
from mathutils.geometry import interpolate_bezier

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
import tracekit as tk  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))
SVG = os.path.join(ROOT, '.shots', 'reference', 'steinway-d-plan.svg')
OUT = os.path.join(HERE, 'outline.json')
PREVIEW = os.path.join(ROOT, '.shots', 'trace', 'piano-trace.png')
LENGTH_IN, WIDTH_IN = 107.75, 61.75      # Steinway, as dimensioned on the drawing
PX = 10                                  # raster pixels per drawing unit


def strokes():
    """Every stroke in the drawing as line segments, in drawing units (y down)."""
    bpy.ops.import_curve.svg(filepath=SVG)
    segs = []
    for o in bpy.data.objects:
        if o.type != 'CURVE':
            continue
        M = o.matrix_world
        for sp in o.data.splines:
            bp = sp.bezier_points
            n = len(bp)
            pairs = [(i, i + 1) for i in range(n - 1)] + ([(n - 1, 0)] if sp.use_cyclic_u else [])
            for i, j in pairs:
                pts = interpolate_bezier(M @ bp[i].co, M @ bp[i].handle_right, M @ bp[j].handle_left, M @ bp[j].co, 8)
                segs += [(a.x, a.y, b.x, b.y) for a, b in zip(pts, pts[1:])]
    S = np.array(segs)
    unit = S[:, [0, 2]].max() / 1000.0          # the drawing is 1000 units wide
    S = S / unit
    S[:, [1, 3]] = 425.0 - S[:, [1, 3]]
    return S


def rasterize(S):
    W, H = 1000 * PX + 8, 425 * PX + 8
    img = np.zeros((H, W), bool)
    L = np.hypot(S[:, 2] - S[:, 0], S[:, 3] - S[:, 1])
    S = S[L < 500]                               # not the page frame
    for x0, y0, x1, y1 in S:
        n = int(np.hypot(x1 - x0, y1 - y0) * PX) + 2
        t = np.linspace(0, 1, n)
        img[((y0 + (y1 - y0) * t) * PX).astype(int) + 4, ((x0 + (x1 - x0) * t) * PX).astype(int) + 4] = True
    m = 3 * PX                                   # the page frame
    img[:m], img[-m:], img[:, :m], img[:, -m:] = False, False, False, False
    return img


def views(img):
    """The three drawings, left to right, split at the empty columns between."""
    xs = np.nonzero(img.any(axis=0))[0]
    out, s, p = [], xs[0], xs[0]
    for x in xs[1:]:
        if x - p > 20 * PX:
            out.append((s, p))
            s = x
        p = x
    out.append((s, p))
    return out


def solid(img, x0, x1, y0, y1, seed, close=0):
    """What the strokes enclose, around seed: fill everything the outside
    can't reach, then keep the piece containing the seed. close bridges gaps
    between parallel strokes (a rim drawn as two lines, open at one end)."""
    box = img[y0:y1, x0:x1]
    if close:
        box = tk.close_(box, close)
    border = np.zeros_like(box)
    border[0], border[-1], border[:, 0], border[:, -1] = True, True, True, True
    inside = ~tk.flood(border, ~box)
    s = np.zeros_like(box)
    s[seed[1] - y0, seed[0] - x0] = True
    return tk.flood(s, inside)


def runs(row):
    """(start, end) of each run of True in a 1-D array."""
    d = np.diff(np.concatenate([[0], row.astype(int), [0]]))
    return list(zip(np.nonzero(d == 1)[0], np.nonzero(d == -1)[0] - 1))


def main():
    img = rasterize(strokes())
    (px0, px1), (sx0, sx1), (fx0, fx1) = views(img)

    # ── Plan: keys at the bottom of the page, tail at the top, bass on the left.
    rows = np.nonzero(img[:, px0:px1].any(axis=1))[0]
    py0, py1 = rows.min(), rows.max()
    # (the "Plan" label sits beside the bentside, outside the case)
    # (its width across the arms, just behind the keys)
    base = np.nonzero(img[py1 - 5 * PX, px0:px1])[0]
    pl, pr = px0 + base.min(), px0 + base.max()
    ppi_y = (py1 - py0) / LENGTH_IN
    ppi_x = (pr - pl) / WIDTH_IN
    xc = (pl + pr) / 2
    plan = solid(img, pl - 60, pr + 60, py0 - 60, py1 + 60, (int(xc), (py0 + py1) // 2), close=3 * PX)
    plan = tk.open_(plan, 2)
    pts = tk.closed_simplify(tk.trace(plan), 0.8)
    to_plan = lambda P: [[round(float((x + pl - 60 - xc) / ppi_x), 3), round(float((py1 - (y + py0 - 60)) / ppi_y), 3)] for x, y in P]
    outline = to_plan(pts)
    # Lines across the plan inside the case: the front of the case over the
    # keys, and the fold of the lid's front flap.
    across = []
    for y in range(py0 + 40 * PX, py1):
        r = [(a, b) for a, b in runs(img[y, pl:pr + 1]) if b - a > 0.8 * (pr - pl)]
        if r:
            across.append(round(float((py1 - y) / ppi_y), 2))
    lines = []
    for v in sorted(set(across)):
        if not lines or v - lines[-1][-1] > 0.3:
            lines.append([v])
        else:
            lines[-1].append(v)
    across = [round(float(np.mean(g)), 2) for g in lines]

    # ── Side elevation: keys on the left, tail on the right, the floor the
    # dashed line under the casters.
    sub = img[:, sx0:sx1 + 1]
    floor = max(y for y in range(sub.shape[0]) if sub[y].sum() > 0.8 * (sx1 - sx0))
    wide = [y for y in range(sub.shape[0]) if sub[y].sum() > 0.8 * (sx1 - sx0)]
    side_rows = np.nonzero(sub[:floor - 5].any(axis=1))[0]
    body_cols = np.nonzero(sub[side_rows.min():floor - 5].any(axis=0))[0]
    kx0 = sx0 + body_cols.min()                          # the front of the keys
    z = lambda y: (floor - y) / ppi_y
    yz = lambda x: (x - kx0) / ppi_y
    rim_top = min(y for y in range(sub.shape[0]) if sub[y].sum() > 0.8 * (sx1 - sx0) and y < floor - 10)
    longs = sorted({y for y in range(rim_top + 5, floor - 10) if sub[y].sum() > 0.5 * (sx1 - sx0)})
    rim_bottom = longs[0]
    # The case in profile, between the underside of the keybed and the rim top
    # (below: legs and lyre; above: the lid and music desk, drawn open).
    zlo = int(floor - 22.5 * ppi_y)
    side = solid(img, sx0 - 20, sx1 + 20, rim_top, zlo, (int((kx0 + sx1) / 2), (rim_top + rim_bottom) // 2))
    side = tk.open_(side, 2)
    spts = tk.closed_simplify(tk.trace(side), 0.8)
    profile = [[round(float(yz(x + sx0 - 20)), 3), round(float(z(y + rim_top)), 3)] for x, y in spts]
    # Legs along the case: the solid columns a hand's height off the floor.
    side_legs = []
    for a, b in runs(img[int(floor - 12 * ppi_y), sx0:sx1].astype(bool)):
        side_legs.append(sx0 + a)
    # (the shafts are drawn as pairs of lines: pair them up)
    edges = [round(float(yz(x)), 2) for x in side_legs]

    # ── Front elevation: bass on the left.
    fsub = img[:, fx0:fx1 + 1]
    frows = [y for y in range(fsub.shape[0]) if fsub[y].sum() > 0.8 * (fx1 - fx0)]
    ffloor = max(frows)
    fcols = np.nonzero(fsub[:ffloor - 10].any(axis=0))[0]
    # The case sides: the two long verticals.
    verts = [fx0 + c for c in range(fsub.shape[1]) if fsub[:ffloor - 10, c].sum() > 400]
    case_l, case_r = min(verts), max(verts)
    fxc = (case_l + case_r) / 2
    fx = lambda x: (x - fxc) / ppi_y
    fz = lambda y: (ffloor - y) / ppi_y
    front_edges = [round(float(fx(fx0 + a)), 2) for a, b in runs(fsub[int(ffloor - 12 * ppi_y)])]
    horiz = sorted({round(float(fz(y)), 2) for y in range(0, ffloor - 10) if fsub[y].sum() > 0.8 * (case_r - case_l)})
    # The front legs' profile (width against height), from the bass leg: its
    # edges in each row, gathering over a few rows to bridge the dashed lines.
    leg_c = (front_edges[0] + front_edges[1]) / 2
    leg_profile = []
    for zz in np.arange(0.25, 23.6, 0.25):
        y = int(ffloor - zz * ppi_y)
        band = fsub[y - 6:y + 7].any(axis=0)
        lo, hi = int(fxc - fx0 + (leg_c - 4.5) * ppi_y), int(fxc - fx0 + (leg_c + 4.5) * ppi_y)
        xs = np.nonzero(band[lo:hi])[0]
        if len(xs) >= 2:
            leg_profile.append([round(float(zz), 2), round(float((xs.max() - xs.min()) / ppi_y / 2), 3),
                                round(float(fx(fx0 + lo + (xs.max() + xs.min()) / 2)), 2)])

    data = {
        'source': 'dimensions.com, "Steinway Grand Piano - Model D": plan, side and front elevations (vector)',
        'frame': 'inches; x across (+ treble), y from the front of the keys toward the tail, z up from the floor',
        'scale': {'lengthIn': LENGTH_IN, 'widthIn': WIDTH_IN, 'pxPerInAlong': round(ppi_y, 3), 'pxPerInAcross': round(ppi_x, 3),
                  'aspect': round(ppi_y / ppi_x, 4),
                  'sideLengthIn': round(float((sx0 + body_cols.max() - kx0) / ppi_y), 2),
                  'frontWidthIn': round(float((case_r - case_l) / ppi_y), 2),
                  'note': 'the side and front elevations share the length scale (the side view measures 107.99 against 107.75); the plan is drawn about 2.5% narrower than the front view, so its width alone is scaled to the published 61.75'},
        'plan': outline,
        'planLinesAcrossIn': across,
        'side': {'rimTopIn': round(float(z(rim_top)), 2), 'rimBottomIn': round(float(z(rim_bottom)), 2),
                 'longLinesIn': [round(float(z(y)), 2) for y in longs],
                 'profile': profile, 'edgesAt12In': edges},
        'front': {'caseWidthIn': round(float((case_r - case_l) / ppi_y), 2), 'edgesAt12In': front_edges,
                  'linesAcrossIn': horiz, 'legProfile': {'columns': 'z, half-width, centre x', 'rows': leg_profile}},
    }
    with open(OUT, 'w') as f:
        json.dump(data, f, indent=1)
    print('TRACE', json.dumps({k: v for k, v in data.items() if k not in ('plan',)}, default=str)[:3000])
    print('plan points', len(outline), 'profile points', len(profile))

    # Preview: the traced plan and profile over the drawing.
    H, W = img.shape
    prev = np.dstack([1 - img * 0.6] * 3)
    for P, ox, oy, col in ((pts, pl - 60, py0 - 60, (1, 0, 0)), (spts, sx0 - 20, rim_top, (0, 0.6, 1))):
        for (x0, y0), (x1, y1) in zip(P, np.roll(P, -1, axis=0)):
            for t in np.linspace(0, 1, 40):
                x, y = int(x0 + (x1 - x0) * t) + ox, int(y0 + (y1 - y0) * t) + oy
                prev[max(0, y - 2):y + 3, max(0, x - 2):x + 3] = col
    prev = prev[::2, ::2]
    H, W = prev.shape[:2]
    os.makedirs(os.path.dirname(PREVIEW), exist_ok=True)
    o = bpy.data.images.new('trace', W, H)
    o.pixels.foreach_set(np.dstack([prev, np.ones((H, W))])[::-1].astype(np.float32).ravel())
    o.filepath_raw = PREVIEW
    o.file_format = 'PNG'
    o.save()


main()

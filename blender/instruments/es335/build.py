"""
Bob Weir's Gibson ES-335 (a 1958-62 "dot neck", tobacco sunburst) as he
played it in summer 1974.

    /Applications/Blender.app/Contents/MacOS/Blender -b -P blender/instruments/es335/build.py -- \\
        --shot hero --samples 256          # or detail, head, match; --save for a .blend

Where every number comes from (see README.md beside this script):
  traced    body, headstock and pickguard outlines; nut and board widths; body
            depth: Gibson's straight-on catalogue cutouts of a 1960 ES-335TD
            (A33064), scaled off the 24.75" scale (outline.json)
  measured  pickups, bridge, tailpiece, knobs, toggle and jack, read off the
            same photograph on a grid
  photo     the top's wood figure and burst gradient (Gibson's body cutout),
            re-toned to Weir's guitar as photographed by Jim Anderson at
            Hartford, 31 July 1974; the headstock face, its outline and the
            tuner posts (Gibson's close-up, straightened: headstock.json)
  Weir 1974 dot inlays, chrome pickup covers, black pickguard, bell knobs, the
            faded amber burst: Kirk Drange, Des Moines, 16 June 1974, and Jim
            Anderson, Hartford, 31 July 1974
  Gibson    24.75" scale, 22 frets, 1 11/16" nut, neck joining at fret 19,
            Tune-o-matic and stop tailpiece, maple/poplar/maple laminated top
  estimate  arch heights (the side view's 2.30" total over the 1 3/4" rim),
            string gauges, and anything specific to Weir's guitar the two 1974
            photographs don't show (wear, pickguard detail, exact year)

Frame: inches. x across (+ treble), y along the neck (0 at the saddle line),
z out of the top (0 at the back rim).
"""
import argparse
import json
import math
import os
import sys

import bmesh
import bpy
import mathutils
import numpy as np
from mathutils import Matrix, Vector

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
from kit import (IN, cyl, frame_viewports, lacquer, modifier_bevel, new_mat, obj, plain,  # noqa: E402
                 prism, render, rounded_rect, smooth_outline, srgb, studio)

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))

RIM = 1.75            # Gibson
ARCH_TOP = 0.30       # estimate: side view total 2.30" less the rim, split
ARCH_BACK = 0.25
BOARD_T = 0.25
FRETS = 22
NECK_JOIN = 19        # Gibson: neck meets the body at fret 19
HEAD_PITCH = 17.0     # Gibson's headstock angle
HEAD_T = 0.55

# Read off the front photograph on a grid (inches, saddle frame; x at the
# across scale, y at the along scale; see trace.py).
NECK_PU = ((-1.655, 1.722, 4.607, 6.409), (-1.325, 1.357, 4.756, 6.224))    # ring, cover
BRIDGE_PU = ((-1.690, 1.722, 0.423, 2.296), (-1.385, 1.357, 0.596, 2.157))
BRIDGE = (-1.691, 1.721, -0.410, 0.192)
TAIL = (-1.933, 1.993, -2.027, -1.333)
KNOBS = [(6.357, -2.130), (4.254, -3.658), (5.290, -6.166), (7.336, -4.595)]
KNOB_R = 0.49
TOGGLE = (3.858, -1.786)
JACK = (3.491, -7.548)
DOTS = [3, 5, 7, 9, 12, 15, 17, 19, 21]
STRING_GAUGES = (0.046, 0.036, 0.026, 0.017, 0.013, 0.010)
BRIDGE_SPACING = 2.05
# Weir's burst, sampled off Anderson's 31 July 1974 photograph (sRGB), dark to light.
WEIR_BURST = ['#3f2912', '#6f4a22', '#9a6a30', '#b98a3e', '#c9a04a']


def args():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    p = argparse.ArgumentParser()
    p.add_argument('--shot', default='hero', choices=['hero', 'detail', 'head', 'match'])
    p.add_argument('--samples', type=int, default=256)
    p.add_argument('--out', default=os.path.join(ROOT, '.shots', 'instruments'))
    p.add_argument('--save', action='store_true')
    return p.parse_args(argv)


def fret_y(n):
    return SCALE * 2 ** (-n / 12)


def board_half(y):
    w0, w1 = DATA['nutWidthIn'], DATA['boardWidthAtFret19In']
    y0, y1 = SCALE, fret_y(19)
    return (w0 + (w1 - w0) * (y - y0) / (y1 - y0)) / 2


# ─── materials ────────────────────────────────────────────────────────────────

def image(path):
    full = os.path.join(ROOT, path)
    return bpy.data.images.load(full) if os.path.exists(full) else None


def burst_top():
    """
    The top: Gibson's photograph of a real 1960 top for the maple's figure and
    the burst's shape, its light and dark mapped onto the colours of Weir's own
    faded burst in 1974. Nitro lacquer over it.
    """
    m, nt, L, b = new_mat('Sunburst top, Weir 1974')
    img = image(TEX['body']['clean']['file'])
    ramp = nt.new('ShaderNodeValToRGB')
    els = ramp.color_ramp.elements
    els[0].position, els[0].color = 0.05, srgb(WEIR_BURST[0])
    els[1].position, els[1].color = 0.75, srgb(WEIR_BURST[-1])
    for i, c in enumerate(WEIR_BURST[1:-1], 1):
        els.new(0.05 + 0.7 * i / (len(WEIR_BURST) - 1)).color = srgb(c)
    if img:
        tex = nt.new('ShaderNodeTexImage')
        tex.image = img
        tex.interpolation = 'Cubic'
        uv = nt.new('ShaderNodeUVMap')
        L.new(uv.outputs['UV'], tex.inputs['Vector'])
        bw = nt.new('ShaderNodeRGBToBW')
        L.new(tex.outputs['Color'], bw.inputs['Color'])
        L.new(bw.outputs['Val'], ramp.inputs['Fac'])
        # Where the photo shows something that isn't finished wood (binding,
        # f-holes, the guard and hardware under the 3D parts), keep its own
        # colour; elsewhere use the re-toned wood.
        sat = nt.new('ShaderNodeSeparateColor')
        sat.mode = 'HSV'
        L.new(tex.outputs['Color'], sat.inputs['Color'])
        keep = nt.new('ShaderNodeMapRange')
        keep.inputs['From Min'].default_value = 0.35
        keep.inputs['From Max'].default_value = 0.2
        L.new(sat.outputs['Green'], keep.inputs['Value'])
        mix = nt.new('ShaderNodeMix')
        mix.data_type = 'RGBA'
        L.new(keep.outputs['Result'], mix.inputs['Factor'])
        L.new(ramp.outputs['Color'], mix.inputs['A'])
        L.new(tex.outputs['Color'], mix.inputs['B'])
        L.new(mix.outputs['Result'], b.inputs['Base Color'])
    else:
        L.new(ramp.outputs['Color'], b.inputs['Base Color'])
    b.inputs['Roughness'].default_value = 0.3
    lacquer(b)
    b.inputs['Coat Roughness'].default_value = 0.06   # sixty-year-old nitro, not glass
    return m


def photo_face(path):
    m, nt, L, b = new_mat('Headstock face, photographed')
    img = image(path)
    if img:
        tex = nt.new('ShaderNodeTexImage')
        tex.image = img
        tex.interpolation = 'Cubic'
        L.new(tex.outputs['Color'], b.inputs['Base Color'])
    else:
        b.inputs['Base Color'].default_value = srgb('#0c0b0a')
    b.inputs['Roughness'].default_value = 0.2
    lacquer(b)
    return m


def materials():
    M = {}
    M['top'] = burst_top()
    M['rim'] = plain('Rim and back, burst edge', '#3a2410', 0.3, coat=True)
    M['binding'] = plain('Binding, aged cream', '#e6dbbd', 0.35, coat=True)
    M['mahogany'] = plain('Mahogany neck', '#5a2a12', 0.35, coat=True)
    M['rosewood'] = plain('Rosewood board', '#2a1609', 0.55)
    M['pearloid'] = plain('Pearloid dot', '#e9e2cf', 0.25, coat=True)
    M['fret'] = plain('Nickel fret', '#c9c6bd', 0.18, 1.0)
    M['nickel'] = plain('Nickel', '#cfd0cc', 0.14, 1.0)
    M['black'] = plain('Black plastic', '#0b0b0b', 0.25, coat=True)
    M['guard'] = plain('Pickguard, black', '#0a0a0a', 0.12, coat=True)
    M['gold'] = plain('Gold bell knob', '#b88a2e', 0.25, 0.6, coat=True)
    M['amber'] = plain('Amber toggle tip', '#d9a24a', 0.25, coat=True)
    M['cream'] = plain('Keystone button, aged', '#e9dfc0', 0.3, coat=True)
    M['string'] = plain('Steel string', '#e2e2e2', 0.15, 1.0)
    M['wound'] = plain('Wound string', '#c9c3b4', 0.3, 1.0)
    M['bone'] = plain('Nut', '#e8dfc6', 0.4)
    M['face'] = photo_face(HS['texture']['file'])
    return M


# ─── parts ────────────────────────────────────────────────────────────────────

def dist_to_outline(p, poly):
    best = 1e9
    for a, b in zip(poly, poly[1:] + poly[:1]):
        ax, ay, bx, by = a[0], a[1], b[0], b[1]
        dx, dy = bx - ax, by - ay
        t = max(0, min(1, ((p[0] - ax) * dx + (p[1] - ay) * dy) / (dx * dx + dy * dy or 1)))
        best = min(best, math.hypot(p[0] - ax - t * dx, p[1] - ay - t * dy))
    return best


def offset_outline(poly, d):
    """Push each vertex of a closed outline outward by d along its normal."""
    out, n = [], len(poly)
    area = sum(poly[i][0] * poly[(i + 1) % n][1] - poly[(i + 1) % n][0] * poly[i][1] for i in range(n))
    sgn = 1 if area > 0 else -1
    for i in range(n):
        (x0, y0), (x1, y1) = poly[i - 1], poly[(i + 1) % n]
        tx, ty = x1 - x0, y1 - y0
        l = math.hypot(tx, ty) or 1
        out.append((poly[i][0] + sgn * ty / l * d, poly[i][1] - sgn * tx / l * d))
    return out


def body(M, root):
    """
    Rim plus arched top and back: laminated, pressed arches rise from the
    binding towards the middle. The arch follows distance from the edge,
    easing in over the first 2.5 inches.
    """
    poly = smooth_outline([tuple(p) for p in DATA['body']], step=0.12, passes=6)
    t = TEX['body'] if TEX else None
    ring = np.array(poly)
    n = len(ring)

    # The arch rises with distance from the edge, eased in over 2.5". Plain
    # distance has a crease wherever two edges are equally near (down the
    # horns, across the waist), which a glossy coat shows as a hard line; so
    # the distance is smoothed first (on a 0.05" grid, over about half an
    # inch), and never allowed above the true distance, so the arch still
    # starts from zero at the binding.
    step = 0.05
    gx0, gy0 = ring[:, 0].min() - 0.5, ring[:, 1].min() - 0.5
    gxs = np.arange(gx0, ring[:, 0].max() + 0.5, step)
    gys = np.arange(gy0, ring[:, 1].max() + 0.5, step)
    GX, GY = np.meshgrid(gxs, gys)
    D = np.full(GX.shape, 1e9)
    for (x0, y0), (x1, y1) in zip(ring, np.roll(ring, -1, axis=0)):
        dx, dy = x1 - x0, y1 - y0
        tt = np.clip(((GX - x0) * dx + (GY - y0) * dy) / (dx * dx + dy * dy or 1), 0, 1)
        np.minimum(D, np.hypot(GX - x0 - tt * dx, GY - y0 - tt * dy), out=D)
    Ds = D.copy()
    r = 3
    for _ in range(3):
        c = np.cumsum(np.pad(Ds, ((r + 1, r), (0, 0)), mode='edge'), axis=0)
        Ds = (c[2 * r + 1:] - c[:-2 * r - 1]) / (2 * r + 1)
        c = np.cumsum(np.pad(Ds, ((0, 0), (r + 1, r)), mode='edge'), axis=1)
        Ds = (c[:, 2 * r + 1:] - c[:, :-2 * r - 1]) / (2 * r + 1)
    Ds = np.minimum(D, Ds)
    S = np.minimum(1.0, Ds / 2.5)
    Z1 = S * S * (3 - 2 * S)
    dZdy, dZdx = np.gradient(Z1, step)

    def arch(P, height):
        """Arch height at points P (N x 2) and its gradient, sampled from the
        smoothed field."""
        fx = np.clip((P[:, 0] - gx0) / step, 0, len(gxs) - 1.001)
        fy = np.clip((P[:, 1] - gy0) / step, 0, len(gys) - 1.001)
        i0, j0 = fy.astype(int), fx.astype(int)
        u, v = fx - j0, fy - i0
        def bil(F):
            return (F[i0, j0] * (1 - u) * (1 - v) + F[i0, j0 + 1] * u * (1 - v) +
                    F[i0 + 1, j0] * (1 - u) * v + F[i0 + 1, j0 + 1] * u * v)
        return height * bil(Z1), height * np.stack([bil(dZdx), bil(dZdy)], 1)

    # The arched faces: a constrained Delaunay triangulation of the outline
    # and an even 0.2" grid inside it, so no triangle is long and thin (a
    # glossy coat shows long thin facets as streaks, whatever their normals).
    xs = np.arange(ring[:, 0].min(), ring[:, 0].max(), 0.2)
    ys = np.arange(ring[:, 1].min(), ring[:, 1].max(), 0.2)
    G = np.array([(x, y) for y in ys for x in xs])
    d_in, _ = arch(G, 1.0)
    inside = np.zeros(len(G), bool)
    for (x0, y0), (x1, y1) in zip(ring, np.roll(ring, -1, axis=0)):
        if y0 != y1:
            inside ^= ((G[:, 1] >= min(y0, y1)) & (G[:, 1] < max(y0, y1)) &
                       (G[:, 0] < x0 + (G[:, 1] - y0) * (x1 - x0) / (y1 - y0)))
    s_in = np.minimum(1.0, np.hypot(*(G[:, None, :] - ring[None, ::4, :]).transpose(2, 0, 1)).min(axis=1) / 0.1)
    G = G[inside & (s_in >= 1.0)]
    pts = [Vector((x, y)) for x, y in np.vstack([ring, G])]
    cdt = mathutils.geometry.delaunay_2d_cdt(pts, [(i, (i + 1) % n) for i in range(n)], [list(range(n))], 1, 1e-6)
    V, tris = np.array([(v.x, v.y) for v in cdt[0]]), cdt[2]
    at = {}                                   # outline point -> triangulation vertex
    for out_i, orig in enumerate(cdt[3]):
        for j in orig:
            if j < n:
                at[j] = out_i

    bm = bmesh.new()
    uv = bm.loops.layers.uv.new()
    for side, height, z_edge in ((1, ARCH_TOP, RIM), (-1, ARCH_BACK, 0.0)):
        z, g = arch(V, height)
        vs = [bm.verts.new((x, y, z_edge + side * zz)) for (x, y), zz in zip(V, z)]
        for tri in tris:
            fv = [vs[i] for i in (tri if side > 0 else tri[::-1])]
            try:
                f_ = bm.faces.new(fv)
            except ValueError:
                continue
            f_.material_index = 0 if side > 0 else 1
        if side > 0:
            top_vs = vs
        else:
            bot_vs = vs
    # The rim: quads between the two edges.
    for i in range(n):
        a_, b_ = at[i], at[(i + 1) % n]
        f_ = bm.faces.new((bot_vs[a_], bot_vs[b_], top_vs[b_], top_vs[a_]))
        f_.material_index = 1
    for f_ in bm.faces:
        for loop in f_.loops:
            x, y = loop.vert.co.x, loop.vert.co.y
            if t:
                (a, b, c), (d, e, g) = t['affine']
                loop[uv].uv = ((a * x + b * y + c) / t['size'][0], 1 - (d * x + e * y + g) / t['size'][1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    o = obj('335 body', bm, [M['top'], M['rim']], root)
    me = o.data
    me.shade_smooth()
    # The arch's own normals on its faces, from its formula; the rim keeps
    # its own. (Read back from the finished mesh, loop by loop.)
    co = np.array([v.co[:] for v in me.vertices])
    _, g_top = arch(co[:, :2], ARCH_TOP)
    _, g_bot = arch(co[:, :2], ARCH_BACK)
    loop_normals = []
    for p in me.polygons:
        for li in p.loop_indices:
            vi = me.loops[li].vertex_index
            if p.normal.z > 0.2:
                loop_normals.append(Vector((-g_top[vi, 0], -g_top[vi, 1], 1)).normalized())
            elif p.normal.z < -0.2:
                loop_normals.append(Vector((g_bot[vi, 0], g_bot[vi, 1], -1)).normalized())
            else:
                loop_normals.append(Vector((0, 0, 0)))
    me.normals_split_custom_set(loop_normals)
    modifier_bevel(o, 0.06, segs=3).harden_normals = False
    # Cream binding: a band round the sides at the top and back edges, just
    # proud of the rim (sides only, so it never covers the arched top).
    for z0 in (RIM - 0.12, -0.02):
        bm = bmesh.new()
        ring = offset_outline(poly, 0.012)
        lo = [bm.verts.new((x, y, z0)) for x, y in ring]
        hi = [bm.verts.new((x, y, z0 + 0.14)) for x, y in ring]
        n = len(ring)
        for i in range(n):
            bm.faces.new((lo[i], lo[(i + 1) % n], hi[(i + 1) % n], hi[i]))
        obj('335 binding', bm, [M['binding']], root).data.shade_smooth()


def neck(M, root):
    y_end = fret_y(FRETS) - 0.3
    y_heel = fret_y(NECK_JOIN) - 0.9
    bm = bmesh.new()
    n = 18
    rings = []
    ys = [y_heel + 0.5 * i for i in range(int((SCALE + 0.5 - y_heel) / 0.5) + 1)]
    for y in ys:
        hw = board_half(min(y, SCALE))
        depth = 0.85 + 0.12 * (SCALE - min(y, SCALE)) / (SCALE - fret_y(12))
        rings.append([bm.verts.new((hw * math.cos(math.pi * k / n), y, RIM + ARCH_TOP + 0.35 - depth * math.sin(math.pi * k / n)))
                      for k in range(n + 1)])
    for r0, r1 in zip(rings, rings[1:]):
        for k in range(n):
            bm.faces.new((r0[k], r0[k + 1], r1[k + 1], r1[k]))
    obj('335 neck', bm, [M['mahogany']], root).data.shade_smooth()

    z0 = RIM + ARCH_TOP + 0.35
    bm = bmesh.new()
    board = [(-board_half(y_end), y_end), (board_half(y_end), y_end), (board_half(SCALE), SCALE), (-board_half(SCALE), SCALE)]
    prism(bm, board, z0, z0 + BOARD_T)
    obj('335 board', bm, [M['rosewood']], root)
    for side in (-1, 1):
        bm = bmesh.new()
        strip = [(side * board_half(y_end), y_end), (side * (board_half(y_end) + 0.06), y_end),
                 (side * (board_half(SCALE) + 0.06), SCALE), (side * board_half(SCALE), SCALE)]
        prism(bm, strip if side > 0 else list(reversed(strip)), z0, z0 + BOARD_T)
        obj('335 board binding', bm, [M['binding']], root)
    bm = bmesh.new()
    for k in range(1, FRETS + 1):
        y = fret_y(k)
        res = bmesh.ops.create_cone(bm, cap_ends=True, segments=12, radius1=0.04, radius2=0.04, depth=2 * board_half(y) + 0.1)
        bmesh.ops.rotate(bm, verts=res['verts'], cent=(0, 0, 0), matrix=Matrix.Rotation(math.radians(90), 3, 'Y'))
        bmesh.ops.translate(bm, verts=res['verts'], vec=(0, y, z0 + BOARD_T))
    obj('335 frets', bm, [M['fret']], root).data.shade_smooth()
    bm = bmesh.new()
    for k in DOTS:
        yc = (fret_y(k - 1) + fret_y(k)) / 2
        for dx in ((-0.42, 0.42) if k == 12 else (0,)):
            cyl(bm, dx, yc, z0 + BOARD_T - 0.004, 0.006, 0.125, seg=24)
    obj('335 dots', bm, [M['pearloid']], root)
    bm = bmesh.new()
    prism(bm, rounded_rect(-board_half(SCALE), board_half(SCALE), SCALE, SCALE + 0.2, 0.03), z0 + BOARD_T, z0 + BOARD_T + 0.14)
    obj('335 nut', bm, [M['bone']], root)
    return z0


def headstock(M, root, z0):
    """The face, its outline and its tuner posts all come from Gibson's
    close-up, straightened square-on (headstock_texture.py, headstock.json);
    d there runs along the face from the nut's head-side edge (the pivot)."""
    pivot_y, pivot_z = SCALE + 0.2, z0 + BOARD_T
    pts = smooth_outline([(x, pivot_y + max(d, 0.0)) for x, d in HS['outline']], step=0.05, passes=2)
    bm = bmesh.new()
    top = prism(bm, pts, pivot_z - HEAD_T, pivot_z, mat=0, side_mat=0)
    for f in bm.faces:
        f.material_index = 1 if all(abs(v.co.z - pivot_z) < 1e-4 for v in f.verts) else 0
    t = HS['texture']
    uv = bm.loops.layers.uv.new()
    for f in bm.faces:
        for loop in f.loops:
            x, d = loop.vert.co.x, loop.vert.co.y - pivot_y
            loop[uv].uv = ((x - t['x0']) / (t['x1'] - t['x0']), (d - t['d0']) / (t['d1'] - t['d0']))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    rot = (Matrix.Translation((0, pivot_y, pivot_z)) @ Matrix.Rotation(math.radians(-HEAD_PITCH), 4, 'X')
           @ Matrix.Translation((0, -pivot_y, -pivot_z)))
    bmesh.ops.transform(bm, matrix=rot, verts=bm.verts[:])
    o = obj('335 headstock', bm, [M['mahogany'], M['face']], root)
    modifier_bevel(o, 0.03, segs=3)

    # Kluson tuners, three a side: posts through the face at the bushings
    # measured in the close-up, keystone buttons out beyond the edge.
    posts = [(side * x, pivot_y + d) for side in (-1, 1) for x, d in HS['posts']]
    out = HS['buttonOutFromPostIn']
    def half_width(y):
        xs = [x0 + (x1 - x0) * (y - y0) / (y1 - y0)
              for (x0, y0), (x1, y1) in zip(pts, pts[1:] + pts[:1]) if (y0 - y) * (y1 - y) <= 0 and y0 != y1]
        return max(abs(x) for x in xs)
    z_back = pivot_z - HEAD_T
    z_btn = z_back - 0.2
    bm, bb = bmesh.new(), bmesh.new()
    for px, py in posts:
        side = 1 if px > 0 else -1
        cyl(bm, px, py, pivot_z, 0.06, 0.2)                   # bushing
        cyl(bm, px, py, pivot_z, 0.42, 0.1)                   # post
        # The housing on the back runs from the post out to the edge; the
        # front photographs never show it, so it stays inside the outline.
        edge = half_width(py)
        prism(bm, rounded_rect(min(px, px + side * (edge - abs(px) - 0.05)) - (0.28 if side > 0 else 0),
                               max(px, px + side * (edge - abs(px) - 0.05)) + (0.28 if side < 0 else 0),
                               py - 0.24, py + 0.24, 0.1), z_back - 0.34, z_back)
        # The shaft out of the side, then the keystone button: a flat paddle,
        # its broad face toward the front (as the close-up shows it), on a
        # round collar.
        x_in, x_btn = side * (edge - 0.05), px + side * out
        for r, x0, x1 in ((0.05, x_in, x_btn - side * 0.3), (0.11, x_btn - side * 0.36, x_btn - side * 0.26)):
            res = bmesh.ops.create_cone(bm if r < 0.1 else bb, cap_ends=True, segments=20, radius1=r, radius2=r,
                                        depth=abs(x1 - x0))
            bmesh.ops.rotate(bm if r < 0.1 else bb, verts=res['verts'], cent=(0, 0, 0),
                             matrix=Matrix.Rotation(math.radians(90), 3, 'Y'))
            bmesh.ops.translate(bm if r < 0.1 else bb, verts=res['verts'], vec=((x0 + x1) / 2, py, z_btn))
        key = [(x_btn - side * 0.28, -0.2), (x_btn + side * 0.3, -0.29), (x_btn + side * 0.3, 0.29),
               (x_btn - side * 0.28, 0.2)]
        key = smooth_outline([(x, py + y) for x, y in (key if side > 0 else key[::-1])], step=0.03, passes=6)
        prism(bb, key, z_btn - 0.09, z_btn + 0.09)
    bmesh.ops.transform(bm, matrix=rot, verts=bm.verts[:])
    bmesh.ops.transform(bb, matrix=rot, verts=bb.verts[:])
    bmesh.ops.recalc_face_normals(bb, faces=bb.faces[:])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    obj('335 tuners', bm, [M['nickel']], root).data.shade_smooth()
    o = obj('335 keystones', bb, [M['cream']], root)
    modifier_bevel(o, 0.05, segs=3)
    return rot, posts, pivot_z


def hardware(M, root, head):
    rot, posts, pivot_z = head
    top = RIM + ARCH_TOP
    for name, (ring, cover) in (('neck', NECK_PU), ('bridge', BRIDGE_PU)):
        bm = bmesh.new()
        prism(bm, rounded_rect(ring[0], ring[1], ring[2], ring[3], 0.12), top - 0.02, top + 0.22)
        obj(f'335 {name} ring', bm, [M['black']], root)
        bm = bmesh.new()
        prism(bm, rounded_rect(cover[0], cover[1], cover[2], cover[3], 0.1), top + 0.1, top + 0.55)
        o = obj(f'335 {name} cover', bm, [M['nickel']], root)
        modifier_bevel(o, 0.05, segs=3)
    x0, x1, y0, y1 = BRIDGE
    bm = bmesh.new()
    prism(bm, rounded_rect(x0 + 0.2, x1 - 0.2, y0 + 0.05, y1 - 0.05, 0.1), top, top + 0.62)
    for k in range(6):
        px = (k - 2.5) * BRIDGE_SPACING / 5
        prism(bm, rounded_rect(px - 0.11, px + 0.11, -0.13, 0.13, 0.03), top + 0.62, top + 0.72)
    for sx in (x0 + 0.12, x1 - 0.12):
        cyl(bm, sx, (y0 + y1) / 2, top, 0.66, 0.14)
    o = obj('335 bridge', bm, [M['nickel']], root)
    modifier_bevel(o, 0.02, segs=2)
    x0, x1, y0, y1 = TAIL
    bm = bmesh.new()
    prism(bm, rounded_rect(x0 + 0.1, x1 - 0.1, y0 + 0.05, y1 - 0.05, 0.3, seg=8), top + 0.35, top + 0.72)
    for sx in (x0 + 0.3, x1 - 0.3):
        cyl(bm, sx, (y0 + y1) / 2, top, 0.8, 0.2)
    o = obj('335 tailpiece', bm, [M['nickel']], root)
    modifier_bevel(o, 0.06, segs=4)

    # The pickguard stands off the arched top on a bracket.
    guard = smooth_outline([tuple(p) for p in DATA['pickguard']], step=0.06, passes=4)
    bm = bmesh.new()
    prism(bm, guard, top + 0.35, top + 0.43)
    o = obj('335 pickguard', bm, [M['guard']], root)
    modifier_bevel(o, 0.025, segs=2)

    bm = bmesh.new()
    for kx, ky in KNOBS:
        res = bmesh.ops.create_cone(bm, cap_ends=True, segments=36, radius1=KNOB_R, radius2=KNOB_R * 0.72, depth=0.6)
        bmesh.ops.translate(bm, verts=res['verts'], vec=(kx, ky, top + 0.3))
        cyl(bm, kx, ky, top + 0.6, 0.08, KNOB_R * 0.62, seg=36)
    obj('335 knobs', bm, [M['gold']], root).data.shade_smooth()
    bm = bmesh.new()
    cyl(bm, TOGGLE[0], TOGGLE[1], top, 0.06, 0.3, seg=32)
    cyl(bm, TOGGLE[0], TOGGLE[1], top, 0.55, 0.05, seg=12)
    cyl(bm, JACK[0], JACK[1], top, 0.08, 0.3, seg=32)
    obj('335 toggle and jack', bm, [M['nickel']], root).data.shade_smooth()
    bm = bmesh.new()
    vs = bmesh.ops.create_uvsphere(bm, u_segments=16, v_segments=10, radius=0.12)['verts']
    bmesh.ops.scale(bm, verts=vs, vec=(1, 1, 1.4))
    bmesh.ops.translate(bm, verts=vs, vec=(TOGGLE[0], TOGGLE[1], top + 0.62))
    obj('335 toggle tip', bm, [M['amber']], root).data.shade_smooth()

    # Strings: tailpiece, saddle, nut, post (E A D bass side, nearest first).
    z_nut = RIM + ARCH_TOP + 0.35 + BOARD_T + 0.14
    for k, g in enumerate(STRING_GAUGES):
        bx = (k - 2.5) * BRIDGE_SPACING / 5
        nx = (k - 2.5) * (board_half(SCALE) * 2 - 0.25) / 5
        side = -1 if k < 3 else 1
        post = [p for p in posts if (p[0] > 0) == (side > 0)]
        post = sorted(post, key=lambda p: p[1])[k if k < 3 else 5 - k]
        pz = (rot @ Vector((post[0], post[1], pivot_z + 0.3)).to_4d()).xyz
        path = [Vector((bx, (TAIL[2] + TAIL[3]) / 2, top + 0.55)), Vector((bx, 0.0, top + 0.72)),
                Vector((nx, SCALE + 0.1, z_nut)), pz]
        bm = bmesh.new()
        for a, c in zip(path, path[1:]):
            d = c - a
            res = bmesh.ops.create_cone(bm, cap_ends=False, segments=8, radius1=g / 2, radius2=g / 2, depth=d.length)
            q = Vector((0, 0, 1)).rotation_difference(d.normalized())
            bmesh.ops.transform(bm, verts=res['verts'], matrix=Matrix.Translation((a + c) / 2) @ q.to_matrix().to_4x4())
        obj(f'335 string {k + 1}', bm, [M['wound'] if g > 0.02 else M['string']], root).data.shade_smooth()


def camera(shot):
    s = bpy.context.scene
    cam = bpy.data.cameras.new('camera')
    o = bpy.data.objects.new('camera', cam)
    s.collection.objects.link(o)
    s.camera = o
    if shot == 'match':
        # Pixel for pixel with Gibson's front view, which is taller than wide:
        # non-square render pixels give it the same two scales.
        f = DATA['photoFrame']
        px, py = DATA['scale']['pxPerInAcross'], DATA['scale']['pxPerInAlong']
        cam.type = 'ORTHO'
        cam.sensor_fit = 'HORIZONTAL'
        cam.ortho_scale = f['widthPx'] / px * IN
        cx = (f['widthPx'] / 2 - f['xCentrePx']) / px
        cy = (DATA['scale']['ySaddlePx'] - f['heightPx'] / 2) / py
        o.location = (cx * IN, cy * IN, 1.0)
        s.render.resolution_x, s.render.resolution_y = f['widthPx'] // 2, f['heightPx'] // 2
        s.render.pixel_aspect_x, s.render.pixel_aspect_y = py / px, 1.0
        return Vector((cx * IN, cy * IN, 0))
    cam.lens = {'hero': 60, 'detail': 100, 'head': 100}[shot]
    cam.dof.use_dof = True
    cam.dof.aperture_fstop = 5.6
    if shot == 'hero':
        o.location = (0.5, -2.15, 0.62)
        target = Vector((0.0, 0.0, 0.52))
        s.render.resolution_x, s.render.resolution_y = 1080, 1620
    elif shot == 'head':
        o.location = (0.1, -0.68, 1.07)
        target = Vector((0.0, 0.0, 0.975))
        s.render.resolution_x, s.render.resolution_y = 1200, 1500
    else:
        o.location = (0.32, -0.7, 0.4)
        target = Vector((0.04, 0.0, 0.26))
        s.render.resolution_x, s.render.resolution_y = 1600, 1066
    o.rotation_euler = (target - o.location).to_track_quat('-Z', 'Y').to_euler()
    cam.dof.focus_distance = (target - o.location).length
    return target


def main():
    a = args()
    global DATA, SCALE, TEX, HS
    with open(os.path.join(HERE, 'outline.json')) as f:
        DATA = json.load(f)
    with open(os.path.join(HERE, 'headstock.json')) as f:
        HS = json.load(f)
    SCALE = DATA['scale']['scaleLengthIn']
    TEX = None
    tj = os.path.join(HERE, 'textures.json')
    if os.path.exists(tj):
        with open(tj) as f:
            TEX = json.load(f)
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o)
    root = bpy.data.objects.new('ES-335', None)
    bpy.context.scene.collection.objects.link(root)
    M = materials()
    body(M, root)
    z0 = neck(M, root)
    head = headstock(M, root, z0)
    hardware(M, root, head)
    root.scale = (IN, IN, IN)
    if a.shot != 'match':
        bottom = min(p[1] for p in DATA['body'])
        root.rotation_euler = (math.radians(90), 0, math.radians(-12))
        root.location = (0, 0, -bottom * IN + 0.01)
    studio(a.shot)
    target = camera(a.shot)
    os.makedirs(a.out, exist_ok=True)
    if a.save:
        frame_viewports(a.shot, target)
        bpy.ops.wm.save_as_mainfile(filepath=os.path.join(HERE, 'es335.blend'))
    out = os.path.join(a.out, f'es335-{a.shot}.png')
    render(a.samples, out)
    print('RENDERED', out)


main()

"""
Phil Lesh's "Mission Control" (Alembic 74 00008, Rick Turner) as it stood in
summer 1974 — version 1 in gdsets.com's history, played from 16 June 1974.

    /Applications/Blender.app/Contents/MacOS/Blender -b -P blender/instruments/mission_control/build.py -- \\
        --shot hero --samples 256          # or detail, match; --save for a .blend

Where every number comes from (see README.md beside this script):
  traced    body and headstock outlines, button positions: gdsets front view,
            scaled so nut to saddle is the scale length (outline.json)
  measured  knob, star, pickup, bridge, tailpiece and plate positions, and the
            board width at two points, read off the same photograph on a grid
  article   woods and construction, pickups, LED markers, batwing tailpiece,
            U-channel bridge (Guitar World, on the 2020 restoration)
  gdsets    version 1 hardware: U-channel bridge and batwing tailpiece, no
            pickup rings or wood trim (rings came in 1975)
  estimate  the 32" scale (a forum figure; nothing published), body thickness
            1.75", headstock pitch 8°, neck depth, string gauges

Left off until evidence settles them: the fingerboard's eleven inlays and the
red/green LED markers (the front photo is too small to trace them, and the
close-ups are at an angle), the headstock's dove, and the decorative edge
purfling in the photographs, which gdsets dates after version 1.

Frame: inches. x across (+ treble), y along the neck (0 at the saddle line),
z out of the top (0 at the back).
"""
import argparse
import json
import math
import os
import sys

import bmesh
import bpy
from mathutils import Matrix, Vector

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
from kit import (IN, cyl, lacquer, laminate, modifier_bevel, new_mat, obj, plain,  # noqa: E402
                 frame_viewports, prism, render, rosewood, rounded_rect, smooth_outline, srgb, studio)

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))

T = 1.75              # body thickness (estimate)
BOARD_T = 0.25
FRETS = 24            # Alembic; the board ends where fret 24 falls in the photo
HEAD_PITCH = 8.0      # degrees (estimate)
HEAD_T = 0.6
# Board width read off the photo at two points (y px 230 and 470).
BOARD_W = ((230, 25 / 16.275), (470, 30 / 16.275))

# Read off the gdsets front view on a grid (px -> inches in outline.json's frame).
KNOBS = [(3.06, 4.46), (4.53, 1.64), (3.06, 1.05), (5.46, 0.33), (3.09, -0.52), (4.57, -0.99),
         (5.46, -2.51), (3.94, -2.97), (6.34, -3.86), (3.90, -4.49), (5.27, -4.83)]
KNOB_R = 0.44
STARS = [(4.11, 0.37, 0.85), (5.08, -3.68, 0.95)]      # MOP stars under the two clusters
PICKUPS = [(7.08, 5.30), (5.12, 3.34), (3.16, 1.38)]    # copper-covered coils, y top/bottom
PICKUP_X = (-1.66, 1.84)
QUAD_Y = 0.92                                           # thin quad pickup, bridge side
BRIDGE_Y = (0.52, -0.52)
TAIL_Y = (-1.69, -3.04)
PLATE = (-2.9, -1.66, -5.8, -3.96)                      # brass and koa output plate
STRING_GAUGES = (0.105, 0.085, 0.065, 0.045)
BRIDGE_SPACING = 3 * 10.7 / 16.275                      # E to G, measured at the bridge


def args():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    p = argparse.ArgumentParser()
    p.add_argument('--shot', default='hero', choices=['hero', 'detail', 'match'])
    p.add_argument('--samples', type=int, default=256)
    p.add_argument('--out', default=os.path.join(ROOT, '.shots', 'instruments'))
    p.add_argument('--save', action='store_true')
    return p.parse_args(argv)


def fret_y(n):
    return SCALE * 2 ** (-n / 12)


def board_half(y):
    """Half-width at y (saddle frame), linear through the two measured widths."""
    ppi, y_saddle = DATA['scale']['pxPerIn'], DATA['scale']['ySaddlePx']
    (p0, w0), (p1, w1) = BOARD_W
    y0, y1 = (y_saddle - p0) / ppi, (y_saddle - p1) / ppi
    return (w0 + (w1 - w0) * (y - y0) / (y1 - y0)) / 2


# ─── materials ────────────────────────────────────────────────────────────────

def koa():
    """
    Hawaiian koa under lacquer, as in Lisa Johnson's photographs: a warm
    reddish brown, long soft streaks running with the body, and a gentle
    shimmer that shifts with the angle rather than hard stripes.
    """
    m, nt, L, b = new_mat('Hawaiian koa')
    co = nt.new('ShaderNodeTexCoord')
    mp = nt.new('ShaderNodeMapping')
    mp.inputs['Scale'].default_value = (2.2, 0.18, 2.2)      # streaks long along the body
    L.new(co.outputs['Object'], mp.inputs['Vector'])
    streak = nt.new('ShaderNodeTexNoise')
    streak.inputs['Scale'].default_value = 1.6
    streak.inputs['Detail'].default_value = 6
    streak.inputs['Roughness'].default_value = 0.6
    L.new(mp.outputs['Vector'], streak.inputs['Vector'])
    curl = nt.new('ShaderNodeTexWave')
    curl.bands_direction = 'Y'
    curl.inputs['Scale'].default_value = 0.7
    curl.inputs['Distortion'].default_value = 4
    L.new(co.outputs['Object'], curl.inputs['Vector'])
    facing = nt.new('ShaderNodeLayerWeight')
    facing.inputs['Blend'].default_value = 0.4
    sheen = nt.new('ShaderNodeMath'); sheen.operation = 'MULTIPLY'
    L.new(curl.outputs['Fac'], sheen.inputs[0])
    L.new(facing.outputs['Facing'], sheen.inputs[1])
    fac = nt.new('ShaderNodeMath'); fac.operation = 'MULTIPLY_ADD'
    fac.inputs[1].default_value = 0.35
    L.new(sheen.outputs[0], fac.inputs[0])
    L.new(streak.outputs['Fac'], fac.inputs[2])
    ramp = nt.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].position = 0.3
    ramp.color_ramp.elements[0].color = srgb('#5a260e')
    ramp.color_ramp.elements[1].position = 0.75
    ramp.color_ramp.elements[1].color = srgb('#a8581f')
    L.new(fac.outputs[0], ramp.inputs['Fac'])
    L.new(ramp.outputs['Color'], b.inputs['Base Color'])
    bump = nt.new('ShaderNodeBump')
    bump.inputs['Strength'].default_value = 0.04
    bump.inputs['Distance'].default_value = 0.02
    L.new(streak.outputs['Fac'], bump.inputs['Height'])
    L.new(bump.outputs['Normal'], b.inputs['Normal'])
    b.inputs['Roughness'].default_value = 0.35
    lacquer(b)
    return m


def materials():
    M = {}
    M['koa'] = koa()
    # The 'hippie sandwich' edge, back to top: koa, maple and walnut veneers,
    # mahogany core, walnut, maple, koa (Guitar World). Fractions of T.
    v = 0.035
    k = 0.16
    M['edge'] = laminate('Body laminations', 'Z', [
        (0.0, '#8a4318'), (k, '#e0b070'), (k + v, '#3a2416'), (k + 2 * v, '#6a2e18'),
        (1 - k - 2 * v, '#3a2416'), (1 - k - v, '#e0b070'), (1 - k, '#8a4318')], (0, T))
    # Neck-through, read off the back: wide outer strips, two thin maple lines
    # with Osage orange between. Across -0.9..0.9 in.
    M['neck'] = laminate('Neck laminations', 'X', [
        (0.0, '#8e4a1c'), (0.43, '#e2b878'), (0.465, '#c47a26'), (0.535, '#e2b878'), (0.57, '#8e4a1c')],
        (-0.9, 0.9))
    M['ebony'] = plain('Ebony board', '#0d0b0a', 0.4)
    M['rosewood'] = rosewood('Headstock face, rosewood')
    M['abalone'] = plain('Abalone', '#6f9a8e', 0.15, 0.3, coat=True)
    M['pearl'] = plain('Mother-of-pearl', '#e8e6df', 0.18, coat=True)
    M['fret'] = plain('Nickel-silver fret', '#c9c6bd', 0.18, 1.0)
    M['copper'] = plain('Copper pickup cover', '#b9612b', 0.25, 0.9)
    M['nickel'] = plain('Nickel', '#c8c9c6', 0.18, 1.0)
    M['brass'] = plain('Brass', '#c9a24a', 0.22, 1.0)
    M['walnut'] = plain('Walnut', '#3a2416', 0.35, coat=True)
    M['knob'] = plain('Black knob', '#0c0c0d', 0.28, coat=True)
    M['ivoroid'] = plain('Ivoroid', '#ece5d2', 0.3, coat=True)
    M['led'], = [plain('Red LED lens', '#8a1010', 0.1)]
    M['string'] = plain('Bass string, nickel wound', '#bdb9ae', 0.35, 1.0)
    M['bone'] = plain('Bone nut', '#efe6cf', 0.4)
    M['tuner'] = plain('Brass tuner', '#c9a24a', 0.18, 1.0)
    return M


# ─── parts ────────────────────────────────────────────────────────────────────

def body(M, root):
    bm = bmesh.new()
    # The source photo gives ~16 px/in, so the trace carries pixel steps an inch
    # apart; relax much harder than the Wolf's 44 px/in trace needed.
    prism(bm, smooth_outline([tuple(p) for p in DATA['body']], step=0.08, passes=40), 0.0, T, mat=0, side_mat=1)
    o = obj('MC body', bm, [M['koa'], M['edge']], root)
    modifier_bevel(o, 0.16, segs=6)


def neck(M, root):
    y_end = fret_y(FRETS) - 0.25
    bm = bmesh.new()
    n = 18
    rings = []
    ys = [y_end - 1.0 + 0.5 * i for i in range(int((SCALE + 0.4 - y_end + 1.0) / 0.5) + 1)]
    for y in ys:
        hw = board_half(min(y, SCALE)) + 0.04
        depth = 0.72 + 0.1 * (SCALE - min(y, SCALE)) / (SCALE - 12)
        ring = [bm.verts.new((hw * math.cos(math.pi * k / n), y, T - depth * math.sin(math.pi * k / n))) for k in range(n + 1)]
        rings.append(ring)
    for r0, r1 in zip(rings, rings[1:]):
        for k in range(n):
            bm.faces.new((r0[k], r0[k + 1], r1[k + 1], r1[k]))
    obj('MC neck', bm, [M['neck']], root).data.shade_smooth()

    bm = bmesh.new()
    board = [(-board_half(y_end), y_end), (board_half(y_end), y_end), (board_half(SCALE), SCALE), (-board_half(SCALE), SCALE)]
    prism(bm, board, T, T + BOARD_T)
    o = obj('MC fingerboard', bm, [M['ebony']], root)
    modifier_bevel(o, 0.02, segs=2)

    bm = bmesh.new()
    for k in range(1, FRETS + 1):
        y = fret_y(k)
        hw = board_half(y)
        res = bmesh.ops.create_cone(bm, cap_ends=True, segments=12, radius1=0.05, radius2=0.05, depth=2 * hw)
        bmesh.ops.rotate(bm, verts=res['verts'], cent=(0, 0, 0), matrix=Matrix.Rotation(math.radians(90), 3, 'Y'))
        bmesh.ops.translate(bm, verts=res['verts'], vec=(0, y, T + BOARD_T))
    obj('MC frets', bm, [M['fret']], root).data.shade_smooth()

    bm = bmesh.new()
    nw = board_half(SCALE)
    prism(bm, rounded_rect(-nw, nw, SCALE, SCALE + 0.22, 0.03), T + BOARD_T, T + BOARD_T + 0.16)
    obj('MC nut', bm, [M['bone']], root)


def headstock(M, root):
    pivot_y, pivot_z = SCALE + 0.22, T + BOARD_T
    # Clip the traced outline at the nut: the neck below is modelled separately.
    pts = smooth_outline([(x, max(y, pivot_y)) for x, y in DATA['headstock']], step=0.06, passes=24)
    bm = bmesh.new()
    top = prism(bm, pts, pivot_z - HEAD_T, pivot_z, mat=0, side_mat=0)
    rim = set(bmesh.ops.inset_region(bm, faces=[top], thickness=0.08, depth=0)['faces'])
    for f in bm.faces:
        on_top = all(abs(v.co.z - pivot_z) < 1e-4 for v in f.verts)
        f.material_index = 1 if (on_top and f not in rim) else 0
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    rot = (Matrix.Translation((0, pivot_y, pivot_z)) @ Matrix.Rotation(math.radians(-HEAD_PITCH), 4, 'X')
           @ Matrix.Translation((0, -pivot_y, -pivot_z)))
    bmesh.ops.transform(bm, matrix=rot, verts=bm.verts[:])
    o = obj('MC headstock', bm, [M['neck'], M['rosewood']], root)
    modifier_bevel(o, 0.03, segs=3)

    # Abalone medallion, read off the photo: centred 2.75" above the nut, 1.2" across.
    cy = SCALE + 2.75
    bm = bmesh.new()
    cyl(bm, 0, cy, pivot_z, 0.012, 0.6, seg=48)
    bmesh.ops.transform(bm, matrix=rot, verts=bm.verts[:])
    obj('MC medallion', bm, [M['abalone']], root)

    # Four brass tuners, two a side, buttons out to the sides.
    bm = bmesh.new()
    # Posts read off the photo: 1.52" and 3.67" above the nut, 0.8" either side.
    posts = [(-0.8, SCALE + 1.52), (-0.8, SCALE + 3.67), (0.8, SCALE + 1.52), (0.8, SCALE + 3.67)]
    for px, py in posts:
        cyl(bm, px, py, pivot_z, 0.1, 0.24)
        cyl(bm, px, py, pivot_z, 0.55, 0.16)
        cyl(bm, px, py, pivot_z - HEAD_T - 0.45, 0.45, 0.32)
        side = 1 if px > 0 else -1
        vs = bmesh.ops.create_cone(bm, cap_ends=True, segments=3, radius1=0.5, radius2=0.08, depth=0.8)['verts']
        bmesh.ops.rotate(bm, verts=vs, cent=(0, 0, 0), matrix=Matrix.Rotation(math.radians(-90 * side), 3, 'Y'))
        bmesh.ops.scale(bm, verts=vs, vec=(1, 1, 0.25))
        bmesh.ops.translate(bm, verts=vs, vec=(px + side * 1.0, py, pivot_z - HEAD_T - 0.25))
    bmesh.ops.transform(bm, matrix=rot, verts=bm.verts[:])
    obj('MC tuners', bm, [M['tuner']], root).data.shade_smooth()
    return rot, posts, pivot_y, pivot_z


def hardware(M, root, head):
    top = T
    rot, posts, pivot_y, pivot_z = head
    # Three copper-covered coils in a row.
    for i, (y0, y1) in enumerate(PICKUPS):
        bm = bmesh.new()
        prism(bm, rounded_rect(PICKUP_X[0], PICKUP_X[1], y1, y0, 0.14), top, top + 0.42)
        o = obj(f'MC coil {i}', bm, [M['copper']], root)
        modifier_bevel(o, 0.05, segs=4)
    # The thin quad pickup between the last coil and the bridge.
    bm = bmesh.new()
    prism(bm, rounded_rect(-1.3, 1.3, QUAD_Y - 0.14, QUAD_Y + 0.14, 0.06), top, top + 0.32)
    obj('MC quad pickup', bm, [M['nickel']], root)
    # U-channel bridge with four saddles.
    bm = bmesh.new()
    prism(bm, rounded_rect(-1.75, 1.75, BRIDGE_Y[1], BRIDGE_Y[0], 0.2), top, top + 0.5)
    for k in range(4):
        px = (k - 1.5) * BRIDGE_SPACING / 3
        prism(bm, rounded_rect(px - 0.18, px + 0.18, -0.2, 0.18, 0.05), top + 0.5, top + 0.66)
    o = obj('MC bridge', bm, [M['nickel']], root)
    modifier_bevel(o, 0.03, segs=3)
    # Batwing tailpiece: brass wings with a walnut centre.
    t0, t1 = TAIL_Y
    wing = [(0, t0), (0.55, t0 + 0.05), (1.45, t0 + 0.35), (1.9, t0 + 0.05), (1.7, t1 + 0.25),
            (1.55, t1 - 0.15), (1.1, t1 + 0.45), (0.35, t1 + 0.2), (0, t1 + 0.3)]
    outline = wing + [(-x, y) for x, y in reversed(wing[1:-1])]
    bm = bmesh.new()
    prism(bm, outline, top, top + 0.3)
    o = obj('MC tailpiece', bm, [M['brass']], root)
    modifier_bevel(o, 0.03, segs=3)
    bm = bmesh.new()
    prism(bm, rounded_rect(-0.32, 0.32, t1 + 0.3, t0 - 0.05, 0.1), top + 0.3, top + 0.36)
    obj('MC tailpiece walnut', bm, [M['walnut']], root)

    # Knobs and the mother-of-pearl stars under the clusters.
    bm = bmesh.new()
    for kx, ky in KNOBS:
        cyl(bm, kx, ky, top, 0.55, KNOB_R, seg=32)
        vs = bmesh.ops.create_uvsphere(bm, u_segments=32, v_segments=12, radius=KNOB_R)['verts']
        keep = [v for v in vs if v.co.z >= 0]
        bmesh.ops.delete(bm, geom=[v for v in vs if v.co.z < 0], context='VERTS')
        bmesh.ops.scale(bm, verts=keep, vec=(1, 1, 0.25))
        bmesh.ops.translate(bm, verts=keep, vec=(kx, ky, top + 0.55))
    obj('MC knobs', bm, [M['knob']], root).data.shade_smooth()
    for i, (sx, sy, sr) in enumerate(STARS):
        pts = []
        for k in range(10):
            a = math.pi / 2 + k * math.pi / 5
            rr = sr if k % 2 == 0 else sr * 0.28
            pts.append((sx + rr * math.cos(a), sy + rr * math.sin(a)))
        bm = bmesh.new()
        prism(bm, pts, top - 0.004, top + 0.002)
        obj(f'MC star {i}', bm, [M['pearl']], root)

    # Ivoroid buttons, each with its red LED beside it (Guitar World).
    bm, bl = bmesh.new(), bmesh.new()
    for x, y, r in DATA['buttons']:
        if x > -1.9 or y > 6.5:
            continue                      # inlays and strays, not buttons
        cyl(bm, x, y, top, 0.12, 0.17, seg=24)
        vs = bmesh.ops.create_uvsphere(bl, u_segments=12, v_segments=8, radius=0.07)['verts']
        bmesh.ops.translate(bl, verts=vs, vec=(x + 0.32, y + 0.08, top + 0.03))
    obj('MC buttons', bm, [M['ivoroid']], root).data.shade_smooth()
    obj('MC LEDs', bl, [M['led']], root).data.shade_smooth()

    # Brass output plate with a koa window.
    x0, x1, y0, y1 = PLATE
    bm = bmesh.new()
    prism(bm, rounded_rect(x0, x1, y0, y1, 0.08), top, top + 0.05)
    obj('MC output plate', bm, [M['brass']], root)
    bm = bmesh.new()
    prism(bm, rounded_rect(x0 + 0.25, x1 - 0.25, y0 + 0.35, y1 - 0.35, 0.05), top + 0.05, top + 0.06)
    obj('MC output plate koa', bm, [M['koa']], root)

    # Strings: tailpiece, saddle, nut, post.
    for k, g in enumerate(STRING_GAUGES):
        bx = (k - 1.5) * BRIDGE_SPACING / 3
        nx = (k - 1.5) * (board_half(SCALE) * 2 - 0.3) / 3
        px, py = posts[[1, 0, 2, 3][k]]    # E, A on the bass side (E farther out); D, G treble
        p_local = Vector((px, py, pivot_z + 0.35))
        pz = (rot @ p_local.to_4d()).xyz
        path = [Vector((bx * 1.05, (t0 + t1) / 2, top + 0.3)), Vector((bx, 0.0, top + 0.66)),
                Vector((nx, SCALE + 0.1, T + BOARD_T + 0.16)), pz]
        bm = bmesh.new()
        for a, c in zip(path, path[1:]):
            d = c - a
            res = bmesh.ops.create_cone(bm, cap_ends=False, segments=10, radius1=g / 2, radius2=g / 2, depth=d.length)
            q = Vector((0, 0, 1)).rotation_difference(d.normalized())
            bmesh.ops.transform(bm, verts=res['verts'], matrix=Matrix.Translation((a + c) / 2) @ q.to_matrix().to_4x4())
        obj(f'MC string {k + 1}', bm, [M['string']], root).data.shade_smooth()


def camera(shot):
    s = bpy.context.scene
    cam = bpy.data.cameras.new('camera')
    o = bpy.data.objects.new('camera', cam)
    s.collection.objects.link(o)
    s.camera = o
    if shot == 'match':
        f = DATA['photoFrame']
        ppi = DATA['scale']['pxPerIn']
        cam.type = 'ORTHO'
        cam.sensor_fit = 'VERTICAL'
        cam.ortho_scale = f['heightPx'] / ppi * IN
        cx = (f['widthPx'] / 2 - f['xCentrePx']) / ppi
        cy = (DATA['scale']['ySaddlePx'] - f['heightPx'] / 2) / ppi
        o.location = (cx * IN, cy * IN, 1.0)
        s.render.resolution_x, s.render.resolution_y = f['widthPx'], f['heightPx']
        return Vector((cx * IN, cy * IN, 0))
    cam.lens = 60 if shot == 'hero' else 100
    cam.dof.use_dof = True
    cam.dof.aperture_fstop = 5.6
    if shot == 'hero':
        o.location = (0.55, -2.3, 0.72)
        target = Vector((0.0, 0.0, 0.6))
        s.render.resolution_x, s.render.resolution_y = 1080, 1620
    else:
        o.location = (0.3, -0.7, 0.42)
        target = Vector((0.03, 0.0, 0.3))
        s.render.resolution_x, s.render.resolution_y = 1600, 1066
    o.rotation_euler = (target - o.location).to_track_quat('-Z', 'Y').to_euler()
    cam.dof.focus_distance = (target - o.location).length
    return target


def main():
    a = args()
    global DATA, SCALE
    with open(os.path.join(HERE, 'outline.json')) as f:
        DATA = json.load(f)
    SCALE = DATA['scale']['scaleLengthIn']
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o)
    root = bpy.data.objects.new('Mission Control', None)
    bpy.context.scene.collection.objects.link(root)
    M = materials()
    body(M, root)
    neck(M, root)
    head = headstock(M, root)
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
        bpy.ops.wm.save_as_mainfile(filepath=os.path.join(HERE, 'mission_control.blend'))
    out = os.path.join(a.out, f'mission-control-{a.shot}.png')
    render(a.samples, out)
    print('RENDERED', out)


main()

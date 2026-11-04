"""
A 1974 Volkswagen Type 2 ("Bay Window") bus, for comparing sizes: scripted, to
the dimensions in wall.config (scale.vwBus, via blender/scene.json). Writes
public/models/vwbus.glb for the explorer, with plain materials and nothing baked.

    npm run export:scene
    /Applications/Blender.app/Contents/MacOS/Blender -b -P blender/scale/vwbus.py -- [--preview DIR]

The body is lofted from horizontal slices, so the colour break at the beltline
falls on a slice. Windows and lamps are projected onto it. Front toward +X, the
sliding door's side toward -Y (in the explorer, toward the audience).
Proportions off photographs (.shots/reference/scale/bus): not a measured survey.
"""
import argparse
import json
import math
import os
import sys

import bmesh
import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
with open(os.path.join(ROOT, 'blender', 'scene.json')) as f:
    BUS = json.load(f)['scale']['vwBus']
L, W, H = BUS['length'], BUS['width'], BUS['height']

BUMPER = 0.075           # each end, beyond the body
BODY_L = L - 2 * BUMPER
FRONT_X = L / 2 - BUMPER  # x of the body's nose
SILL = 0.29
BELT = 1.10
ROOF_EDGE = H - 0.17
AXLE_F = 0.72            # back from the nose
WHEELBASE = BUS['wheelbase']
TYRE_R = 0.325
TRACK = 1.40


def x_of(s):
    return FRONT_X - s


def smooth(a, b, v):
    t = max(0.0, min(1.0, (v - a) / (b - a)))
    return t * t * (3 - 2 * t)


def lerp(a, b, t):
    return a + (b - a) * t


def profile(z):
    """At height z: how far the front stands back, how far the rear, half the width, the front corner's radius."""
    t = max(0.0, (z - ROOF_EDGE) / (H - ROOF_EDGE))
    dome = 1 - (1 - t ** 2.6) ** (1 / 2.6)    # 0 at the roof's edge, 1 at the crown
    if z < 0.5:
        sf = lerp(0.12, 0.03, smooth(SILL, 0.5, z))
    elif z < BELT:
        sf = lerp(0.03, 0.0, smooth(0.5, BELT, z))
    else:
        sf = lerp(0.0, 0.33, (min(z, ROOF_EDGE) - BELT) / (ROOF_EDGE - BELT))
    sf += dome * 0.42
    if z < BELT:
        sr = BODY_L - lerp(0.10, 0.0, smooth(SILL, 0.8, z))
    else:
        sr = BODY_L - lerp(0.0, 0.17, ((min(z, ROOF_EDGE) - BELT) / (ROOF_EDGE - BELT)) ** 1.4)
    sr -= dome * 0.3
    hw = W / 2
    if z < 0.5:
        hw -= 0.03 * (1 - smooth(SILL, 0.5, z))
    if z > BELT:
        hw -= 0.13 * ((min(z, ROOF_EDGE) - BELT) / (ROOF_EDGE - BELT)) ** 1.15
    hw *= 1 - dome * 0.999
    rf = max(0.02, min(hw, lerp(0.40, 0.2, smooth(0.9, ROOF_EDGE, z))))
    return sf, sr, hw, rf


def outline(z, arc=14, side=20, rear_arc=8, end=8):
    """The body's plan at height z: a loop of (x, y), the same count of points at every height."""
    sf, sr, hw, rf = profile(z)
    rr = min(0.24, hw)
    pts = []
    # Across the front, a shallow bow; then the corner, the side, the rear corner, the rear.
    bow = 0.05 * (hw / (W / 2))
    y0 = hw - rf
    for i in range(-end, end):
        y = y0 * i / end
        pts.append((sf + bow * (y / max(y0, 1e-4)) ** 2, y))
    for i in range(arc):
        a = (math.pi / 2) * i / arc
        pts.append((sf + bow + rf * (1 - math.cos(a)), y0 + rf * math.sin(a)))
    s0, s1 = sf + bow + rf, sr - rr
    for i in range(side):
        pts.append((lerp(s0, s1, i / side), hw))
    for i in range(rear_arc):
        a = (math.pi / 2) * i / rear_arc
        pts.append((s1 + rr * math.sin(a), hw - rr * (1 - math.cos(a))))
    yr = hw - rr
    for i in range(end * 2):
        pts.append((sr, yr * (1 - 2 * i / (end * 2))))
    for i in range(rear_arc):
        a = (math.pi / 2) * i / rear_arc
        pts.append((s1 + rr * math.cos(a), -hw + rr * (1 - math.sin(a))))
    for i in range(side):
        pts.append((lerp(s1, s0, i / side), -hw))
    for i in range(arc):
        a = (math.pi / 2) * i / arc
        pts.append((sf + bow + rf * (1 - math.sin(a)), -y0 - rf * math.cos(a)))
    return pts


# ── materials ────────────────────────────────────────────────────────────────

def material(name, colour, rough=0.5, metal=0.0):
    m = bpy.data.materials.new(name)
    m.use_backface_culling = False
    b = m.node_tree.nodes.get('Principled BSDF')
    c = tuple(pow(int(colour[i:i + 2], 16) / 255, 2.2) for i in (1, 3, 5)) + (1,)
    b.inputs['Base Color'].default_value = c
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    return m


M = {
    # The lower paint is swapped bus by bus in the explorer (scale.vwBus.colours).
    'paint': material('paint', BUS['colours'][0], 0.28),
    'upper': material('upper', '#e6dfca', 0.3),
    'glass': material('glass', '#141c20', 0.08, 0.3),
    'rubber': material('rubber', '#0e0e0f', 0.75),
    'chrome': material('chrome', '#d6d8da', 0.25, 0.7),
    'lens': material('lens', '#a9afad', 0.15, 0.2),
    'amber': material('amber', '#d9681c', 0.3),
    'red': material('red', '#8e1814', 0.3),
    'dark': material('dark', '#08080a', 0.9),
}
ORDER = list(M)


def new_object(name, verts, faces, mat, smooth_at=None):
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(v) for v in verts], [], faces)
    me.materials.append(M[mat])
    me.update()
    o = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(o)
    if smooth_at is not None:
        me.shade_smooth()
        me.set_sharp_from_angle(angle=math.radians(smooth_at))
    return o


# ── the body ─────────────────────────────────────────────────────────────────

def body():
    # Slices: close together at the sill and into the roof.
    zs = [SILL + (0.5 - SILL) * i / 4 for i in range(4)]
    zs += [0.5 + (BELT - 0.5) * i / 8 for i in range(8)]
    zs += [BELT]  # the colour break, doubled, so the seam is crisp
    zs += [BELT + (ROOF_EDGE - BELT) * i / 10 for i in range(1, 11)]
    zs += [ROOF_EDGE + (H - ROOF_EDGE) * math.sin((math.pi / 2) * i / 10) for i in range(1, 10)]
    rings = [[(x_of(s), y, z) for s, y in outline(z)] for z in zs]
    n = len(rings[0])
    verts = [v for r in rings for v in r]
    faces, mats = [], []
    for k in range(len(rings) - 1):
        for i in range(n):
            a, b = k * n + i, k * n + (i + 1) % n
            faces.append((a, a + n, b + n, b))
            mats.append(0 if zs[k] < BELT - 1e-6 else 1)
    # The caps: floor and crown.
    bottom = len(verts)
    c = [sum(v[j] for v in rings[0]) / n for j in range(3)]
    verts.append(tuple(c))
    for i in range(n):
        faces.append((bottom, (i + 1) % n, i))
        mats.append(0)
    crown = len(verts)
    c = [sum(v[j] for v in rings[-1]) / n for j in range(2)] + [H]
    verts.append(tuple(c))
    off = (len(rings) - 1) * n
    for i in range(n):
        faces.append((crown, off + i, off + (i + 1) % n))
        mats.append(1)
    o = new_object('body', verts, faces, 'paint')
    o.data.materials.append(M['upper'])
    for p, m in zip(o.data.polygons, mats):
        p.material_index = m
    o.data.shade_smooth()
    o.data.set_sharp_from_angle(angle=math.radians(38))
    return o


def wheel_arches(o):
    """Cut the wheel wells with short cylinders, one a side."""
    for s in (AXLE_F, AXLE_F + WHEELBASE):
        for sy in (-1, 1):
            bpy.ops.mesh.primitive_cylinder_add(
                vertices=48, radius=TYRE_R + 0.055, depth=0.5,
                location=(x_of(s), sy * (W / 2 - 0.1), TYRE_R + 0.03), rotation=(math.pi / 2, 0, 0))
            c = bpy.context.object
            c.data.materials.append(M['dark'])
            mod = o.modifiers.new('arch', 'BOOLEAN')
            mod.operation = 'DIFFERENCE'
            mod.object = c
            mod.solver = 'EXACT'
            mod.material_mode = 'TRANSFER'
            bpy.context.view_layer.objects.active = o
            bpy.ops.object.modifier_apply(modifier=mod.name)
            bpy.data.objects.remove(c)
    # Whatever the cut left inside the wells is dark.
    me = o.data
    if 'dark' not in [m.name for m in me.materials]:
        me.materials.append(M['dark'])
    dark = [m.name for m in me.materials].index('dark')
    for p in me.polygons:
        c = p.center
        near = min(math.hypot(c.x - x_of(s), c.z - (TYRE_R + 0.03)) for s in (AXLE_F, AXLE_F + WHEELBASE))
        if near < TYRE_R + 0.057 and abs(c.y) < W / 2 - 0.012:
            p.material_index = dark


# ── panels projected onto the body ───────────────────────────────────────────

class Projector:
    def __init__(self, o):
        bm = bmesh.new()
        bm.from_mesh(o.data)
        self.tree = BVHTree.FromBMesh(bm)
        bm.free()

    def hit(self, origin, direction):
        loc, normal, _, _ = self.tree.ray_cast(Vector(origin), Vector(direction))
        return loc, normal


def squircle(u, v, a, b, n):
    """Boundary-aware map: polar (ring u in 0..1, angle v) to a rounded rectangle of half-sizes a, b."""
    c, s = math.cos(v), math.sin(v)
    r = (abs(c / a) ** n + abs(s / b) ** n) ** (-1 / n)
    return u * r * c, u * r * s


def panel(name, mat, proj, centre, a, b, plane, direction, lift=0.004, n=7, rings=5, seg=40):
    """A rounded rectangle on the body. plane maps (p, q) to a ray's start, far outside; direction points inward."""
    verts, faces = [], []
    for i in range(rings + 1):
        u = i / rings
        for j in range(seg):
            p, q = squircle(u, 2 * math.pi * j / seg, a, b, n)
            start = plane(centre[0] + p, centre[1] + q)
            loc, _ = proj.hit(start, direction)
            if loc is None:
                loc = Vector(start) + Vector(direction) * 1.5
            verts.append(loc - Vector(direction) * lift)
    for i in range(rings):
        for j in range(seg):
            k = j, (j + 1) % seg
            faces.append((i * seg + k[0], i * seg + k[1], (i + 1) * seg + k[1], (i + 1) * seg + k[0]))
    return new_object(name, verts, faces, mat, smooth_at=50)


def rect(name, mat, proj, centre, a, b, plane, direction, lift=0.004, nx=8, ny=1):
    """A plain rectangle on the body: for thin things, where a rounded one goes lens-shaped."""
    verts, faces = [], []
    for j in range(ny + 1):
        for i in range(nx + 1):
            start = plane(centre[0] - a + 2 * a * i / nx, centre[1] - b + 2 * b * j / ny)
            loc, _ = proj.hit(start, direction)
            if loc is None:
                loc = Vector(start) + Vector(direction) * 1.5
            verts.append(loc - Vector(direction) * lift)
    for j in range(ny):
        for i in range(nx):
            k = j * (nx + 1) + i
            faces.append((k, k + 1, k + nx + 2, k + nx + 1))
    return new_object(name, verts, faces, mat)


def side_plane(sy):
    return lambda s, z: (x_of(s), sy * 2.0, z)


def front_plane(y, z):
    return (FRONT_X + 2.0, y, z)


def rear_plane(y, z):
    return (FRONT_X - BODY_L - 2.0, y, z)


def strip_side(name, mat, proj, sy, s0, z0, s1, z1, t=0.012):
    long_x = abs(s1 - s0) > abs(z1 - z0)
    return rect(name, mat, proj, ((s0 + s1) / 2, (z0 + z1) / 2), max(abs(s1 - s0) / 2, t), max(abs(z1 - z0) / 2, t),
                side_plane(sy), (0, -sy, 0), lift=0.002, nx=24 if long_x else 1, ny=1 if long_x else 16)


def windows(proj):
    wz = (BELT + 0.07 + ROOF_EDGE - 0.05) / 2
    wb = (ROOF_EDGE - 0.05 - BELT - 0.07) / 2
    for sy in (-1, 1):
        plane, inward = side_plane(sy), (0, -sy, 0)
        for s0, s1 in ((0.68, 1.42), (1.52, 2.40), (2.50, 3.38)):
            c, a = ((s0 + s1) / 2, wz), (s1 - s0) / 2
            panel('rim', 'rubber', proj, c, a + 0.022, wb + 0.022, plane, inward, lift=0.003, n=9, seg=64)
            panel('window', 'glass', proj, c, a, wb, plane, inward, lift=0.006, n=9, seg=64)
        # The louvres behind the last window.
        s = 3.62
        panel('louvre', 'dark', proj, (s, wz + 0.03), 0.11, wb - 0.04, plane, inward, lift=0.003, n=12)
        for i in range(7):
            z = wz - wb + 0.14 + i * (2 * wb - 0.2) / 6
            rect('slat', 'upper', proj, (s, z), 0.1, 0.011, plane, inward, lift=0.006, nx=4)
        # Door seams and handles.
        for s in (0.62, 1.47):
            strip_side('seam', 'dark', proj, sy, s - 0.005, SILL + 0.19, s + 0.005, BELT + 0.62, 0.005)
        strip_side('seam', 'dark', proj, sy, 2.455, SILL + 0.19, 2.465, BELT, 0.005)
        rect('handle', 'chrome', proj, (1.36, BELT - 0.09), 0.07, 0.014, plane, inward, lift=0.016, nx=4)
        # The shoulder: a soft bright line under the windows.
        strip_side('belt-trim', 'upper', proj, sy, 0.3, BELT - 0.004, BODY_L - 0.1, BELT + 0.012, 0.006)
    # The windscreen and the rear window.
    panel('rim', 'rubber', proj, (0, wz + 0.02), 0.665, wb - 0.005, front_plane, (-1, 0, 0), lift=0.006, n=7, seg=72, rings=18)
    panel('windscreen', 'glass', proj, (0, wz + 0.02), 0.64, wb - 0.03, front_plane, (-1, 0, 0), lift=0.012, n=7, seg=72, rings=18)
    panel('rim', 'rubber', proj, (0, wz + 0.02), 0.59, wb - 0.05, rear_plane, (1, 0, 0), lift=0.003, n=7, seg=64)
    panel('rear window', 'glass', proj, (0, wz + 0.02), 0.565, wb - 0.075, rear_plane, (1, 0, 0), lift=0.006, n=7, seg=64)


def front_details(proj):
    p, d = front_plane, (-1, 0, 0)
    # Headlamps: a chrome ring, then a domed lens.
    for sy in (-1, 1):
        y, z = sy * 0.55, 0.82
        panel('lamp ring', 'chrome', proj, (y, z), 0.102, 0.102, p, d, lift=0.012, n=2, rings=3, seg=32)
        panel('lamp', 'lens', proj, (y, z), 0.086, 0.086, p, d, lift=0.022, n=2, rings=4, seg=32)
        panel('indicator', 'amber', proj, (sy * 0.60, 1.0), 0.06, 0.042, p, d, lift=0.008, n=8)
    # The fresh-air grille between the indicators.
    rect('grille', 'paint', proj, (0, 1.0), 0.51, 0.05, p, d, lift=0.004, nx=16)
    for sy in (-1, 1):
        for i in range(17):
            y = sy * (0.05 + i * 0.026)
            rect('slot', 'dark', proj, (y, 1.0), 0.006, 0.032, p, d, lift=0.006, nx=1)
    # The roundel: a ring and the strokes inside it, plain.
    cz = 0.82
    verts, faces = [], []
    panel('roundel', 'upper', proj, (0, cz), 0.125, 0.135, p, d, lift=0.008, n=2, rings=1, seg=36)
    panel('roundel', 'paint', proj, (0, cz), 0.109, 0.118, p, d, lift=0.010, n=2, rings=1, seg=36)
    def stroke(y0, z0, y1, z1, t=0.0105):
        ln = math.hypot(y1 - y0, z1 - z0)
        ny, nz = -(z1 - z0) / ln * t, (y1 - y0) / ln * t
        base = FRONT_X + 0.03
        hit = [proj.hit((base + 2, y, z), (-1, 0, 0))[0].x + 0.012 for y, z in
               ((y0, z0 + cz), (y1, z1 + cz))]
        vs = [(hit[0], y0 + ny, cz + z0 + nz), (hit[1], y1 + ny, cz + z1 + nz),
              (hit[1], y1 - ny, cz + z1 - nz), (hit[0], y0 - ny, cz + z0 - nz)]
        new_object('roundel stroke', vs, [(0, 1, 2, 3)], 'upper')
    # V above, W below.
    stroke(-0.078, 0.092, 0, -0.03); stroke(0.078, 0.092, 0, -0.03)
    stroke(-0.112, 0.03, -0.055, -0.098); stroke(-0.055, -0.098, 0, 0.018)
    stroke(0.112, 0.03, 0.055, -0.098); stroke(0.055, -0.098, 0, 0.018)
    # Wipers.
    for y0 in (-0.48, 0.08):
        rect('wiper', 'dark', proj, (y0 + 0.2, BELT + 0.11), 0.2, 0.007, p, d, lift=0.014, nx=8)
    # The rear lamps.
    for sy in (-1, 1):
        panel('tail lamp', 'red', proj, (sy * 0.72, 0.96), 0.05, 0.1, rear_plane, (1, 0, 0), lift=0.01, n=7)


def box(name, mat, x0, x1, y0, y1, z0, z1):
    vs = [(x, y, z) for x in (x0, x1) for y in (y0, y1) for z in (z0, z1)]
    fs = [(0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)]
    return new_object(name, vs, fs, mat)


def bumpers():
    """Follows the plan of the body at bumper height, front and rear, wrapping the corners."""
    z0, z1 = 0.36, 0.52
    for front in (True, False):
        pts = []
        steps = 44
        sf, sr, hw, rf = profile(0.48)
        for i in range(steps + 1):
            t = -1 + 2 * i / steps
            y = t * (hw + 0.012)
            edge = max(0.0, abs(y) - (hw - rf)) / rf
            back = rf * (1 - math.sqrt(max(0, 1 - min(edge, 1) ** 2))) * 0.9
            s = (BUMPER * -1 + 0.0 + back + 0.05 * (y / (W / 2)) ** 2) if front else (BODY_L + BUMPER - back * 0.8)
            pts.append((x_of(s), y))
        verts, faces = [], []
        depth = 0.075 if front else -0.075
        for x, y in pts:
            xi = x - depth
            verts += [(x, y, z0 + 0.02), (x, y, z1 - 0.02), (x - depth * 0.3, y, z1), (xi, y, z1), (xi, y, z0), (x - depth * 0.3, y, z0)]
        m = 6
        for i in range(steps):
            for j in range(m):
                a, b = i * m + j, i * m + (j + 1) % m
                f = (a, b, b + m, a + m) if front else (a, a + m, b + m, b)
                faces.append(f)
        faces.append(tuple(range(m)) if not front else tuple(reversed(range(m))))
        faces.append(tuple(steps * m + k for k in (reversed(range(m)) if not front else range(m))))
        new_object('bumper', verts, faces, 'upper', smooth_at=40)
        # The dark rubbing strip along it.
        vs, fs = [], []
        for x, y in pts:
            vs += [(x + (0.002 if front else -0.002), y, 0.425), (x + (0.002 if front else -0.002), y, 0.455)]
        for i in range(steps):
            a = i * 2
            fs.append((a, a + 2, a + 3, a + 1) if front else (a, a + 1, a + 3, a + 2))
        new_object('strip', vs, fs, 'rubber')
        # Plate.
        px = pts[steps // 2][0]
    return


def plate(proj):
    panel('plate', 'upper', proj, (0, 0.59), 0.15, 0.05, front_plane, (-1, 0, 0), lift=0.005, n=12, rings=1, seg=20)


def wheels():
    def lathe(name, mat, profile_pts, cx, cy, seg=40, sign=1):
        """A surface of revolution about the y axis through (cx, cy, TYRE_R); profile as (axial, radius)."""
        verts, faces = [], []
        n = len(profile_pts)
        for j in range(seg):
            a = 2 * math.pi * j / seg
            for ax, r in profile_pts:
                verts.append((cx + r * math.cos(a), cy + sign * ax, TYRE_R + r * math.sin(a)))
        for j in range(seg):
            k = (j + 1) % seg
            for i in range(n - 1):
                f = (j * n + i, j * n + i + 1, k * n + i + 1, k * n + i)
                faces.append(f if sign > 0 else tuple(reversed(f)))
        return new_object(name, verts, faces, mat, smooth_at=48)

    tyre = [(-0.08, 0.17), (-0.092, 0.27), (-0.075, 0.31), (-0.04, TYRE_R), (0.04, TYRE_R), (0.075, 0.31), (0.092, 0.27), (0.08, 0.17)]
    rim = [(0.06, 0.2), (0.075, 0.19), (0.07, 0.15), (0.06, 0.12)]
    cap = [(0.06, 0.125), (0.09, 0.118), (0.108, 0.07), (0.112, 0.0)]
    for s in (AXLE_F, AXLE_F + WHEELBASE):
        for sy in (-1, 1):
            cy = sy * TRACK / 2
            lathe('tyre', 'rubber', tyre, x_of(s), cy, sign=-sy)
            lathe('rim', 'upper', [(a, r) for a, r in rim], x_of(s), cy, sign=-sy)
            lathe('hubcap', 'chrome', cap, x_of(s), cy, sign=-sy)
    # The chassis, in shadow under the sill.
    box('underbody', 'dark', x_of(BODY_L - 0.3), x_of(0.3), -W / 2 + 0.25, W / 2 - 0.25, 0.2, SILL + 0.02)


def mirrors():
    for sy in (-1, 1):
        x, y, z = x_of(0.55), sy * (W / 2 + 0.1), BELT + 0.2
        # A disc of a mirror, and its arm.
        n = 20
        vs = [(x, y, z)] + [(x, y + sy * 0.065 * math.cos(2 * math.pi * i / n), z + 0.085 * math.sin(2 * math.pi * i / n)) for i in range(n)]
        fs = [(0, 1 + i, 1 + (i + 1) % n) for i in range(n)]
        new_object('mirror', vs, fs, 'chrome')
        y0 = sy * (W / 2 - 0.02)
        vs = [(x - 0.008, y0, z - 0.15), (x + 0.008, y0, z - 0.15), (x + 0.008, y, z), (x - 0.008, y, z)]
        new_object('mirror arm', vs, [(0, 1, 2, 3)], 'chrome')


def gutter():
    """The rain gutter along the roof's edge: a small bright ridge."""
    z = ROOF_EDGE - 0.012
    pts = outline(z)
    verts, faces = [], []
    n = len(pts)
    for s, y in pts:
        # Out from the body along the plan normal, approximately.
        k = (abs(y) + 0.016) / max(abs(y), 1e-3)
        verts += [(x_of(s), y * k, z - 0.014), (x_of(s), y * k, z + 0.014)]
    for i in range(n):
        a, b = i * 2, (i + 1) % n * 2
        faces.append((a, b, b + 1, a + 1))
    new_object('gutter', verts, faces, 'upper', smooth_at=40)


def join_by_material():
    """One mesh for each material, so the explorer draws few of them."""
    objs = [o for o in bpy.data.objects if o.type == 'MESH']
    bm_by = {}
    for o in objs:
        me = o.data
        for p in me.polygons:
            mat = me.materials[p.material_index] if me.materials else None
            bm_by.setdefault(mat.name, []).append((o, p))
    # Split the body's materials out, then join with the rest.
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    o = bpy.context.object
    o.name = 'VW bus'
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.normals_make_consistent(inside=False)
    bpy.ops.object.mode_set(mode='OBJECT')
    return o


def preview(out):
    from math import radians
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.samples = 48
    sc.render.resolution_x, sc.render.resolution_y = 1400, 800
    w = bpy.data.worlds.new('w')
    w.use_nodes = True
    w.node_tree.nodes['Background'].inputs[0].default_value = (0.72, 0.78, 0.85, 1)
    sc.world = w
    bpy.ops.mesh.primitive_plane_add(size=60)
    bpy.context.object.data.materials.append(material('ground', '#77736c', 0.9))
    sun = bpy.data.lights.new('sun', 'SUN')
    sun.energy = 3.5
    so = bpy.data.objects.new('sun', sun)
    bpy.context.collection.objects.link(so)
    so.rotation_euler = (radians(50), radians(10), radians(40))
    cam = bpy.data.cameras.new('c')
    co = bpy.data.objects.new('c', cam)
    bpy.context.collection.objects.link(co)
    sc.camera = co
    cam.lens = 60
    for name, loc in (('quarter', (6.2, -6.2, 1.2)), ('side', (0, -9.5, 1.0)), ('front', (9.5, 0, 1.0)), ('rear', (-6.5, -5.5, 1.3))):
        co.location = loc
        d = Vector((0, 0, 0.95)) - Vector(loc)
        co.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
        sc.render.filepath = os.path.join(out, f'bus-{name}.png')
        bpy.ops.render.render(write_still=True)


def main():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    p = argparse.ArgumentParser()
    p.add_argument('--preview', default=None)
    a = p.parse_args(argv)
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o)
    b = body()
    wheel_arches(b)
    proj = Projector(b)
    windows(proj)
    front_details(proj)
    plate(proj)
    bumpers()
    gutter()
    wheels()
    mirrors()
    o = join_by_material()
    tris = sum(len(p.vertices) - 2 for p in o.data.polygons)
    w, h, l = o.dimensions.y, o.dimensions.z, o.dimensions.x
    print(f'BUS {l:.3f} x {w:.3f} x {h:.3f} m, {tris} triangles')
    bpy.ops.object.select_all(action='DESELECT')
    o.select_set(True)
    out = os.path.join(ROOT, 'public', 'models', 'vwbus.glb')
    bpy.ops.export_scene.gltf(
        filepath=out, export_format='GLB', use_selection=True, export_yup=True, export_apply=True,
        export_normals=True, export_materials='EXPORT',
        export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=7,
    )
    print('EXPORTED', out, f'{os.path.getsize(out) / 1024:.0f} KB')
    if a.preview:
        preview(a.preview)


main()

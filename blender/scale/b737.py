"""
A Boeing 737-200 in plain paint, for comparing sizes: scripted to Boeing's own
figures (wall.config scale.b737, via blender/scene.json) from "737 Airplane
Characteristics for Airport Planning", D6-58325-6 Rev E, sections 2.2.2 and 2.3.1.
Writes public/models/b737.glb for the explorer, plain materials, nothing baked.

    npm run export:scene
    /Applications/Blender.app/Contents/MacOS/Blender -b -P blender/scale/b737.py -- [--preview DIR]

Figures Boeing states come from the config. The outlines between them are read off
the manual's three-view at its scale, so they are close, not surveyed. Distances
along the aircraft are `s`, metres back from the nose. Nose toward +X, on the ground.
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
    B = json.load(f)['scale']['b737']
L = B['length']
TOP, BOTTOM, WIDTH = B['fuselageTop'], B['fuselageBottom'], B['fuselageWidth']
MID = (TOP + BOTTOM) / 2


def X(s):
    return L / 2 - s


def table(pts, v):
    """Smooth (Catmull-Rom) through (s, value) pairs."""
    if v <= pts[0][0]:
        return pts[0][1]
    if v >= pts[-1][0]:
        return pts[-1][1]
    for i in range(len(pts) - 1):
        if pts[i][0] <= v <= pts[i + 1][0]:
            p0 = pts[max(i - 1, 0)]
            p1, p2 = pts[i], pts[i + 1]
            p3 = pts[min(i + 2, len(pts) - 1)]
            h = p2[0] - p1[0]
            t = (v - p1[0]) / h
            m1 = (p2[1] - p0[1]) / max(p2[0] - p0[0], 1e-6) * h
            m2 = (p3[1] - p1[1]) / max(p3[0] - p1[0], 1e-6) * h
            t2, t3 = t * t, t * t * t
            return (2 * t3 - 3 * t2 + 1) * p1[1] + (t3 - 2 * t2 + t) * m1 + (-2 * t3 + 3 * t2) * p2[1] + (t3 - t2) * m2
    return pts[-1][1]


# The fuselage's outline, off the side and plan views.
TOP_LINE = [(0.0, 2.80), (0.5, 3.35), (1.2, 3.80), (2.2, 4.32), (3.3, 4.72), (4.6, 4.98), (6.0, TOP), (21.5, TOP), (24.5, 5.03), (27.5, 4.87), (29.3, 4.72), (29.75, 4.5)]
BOTTOM_LINE = [(0.0, 2.80), (0.5, 2.25), (1.2, 1.78), (2.2, 1.42), (3.5, 1.17), (5.0, BOTTOM), (16.0, BOTTOM), (19.0, 1.33), (22.0, 1.95), (25.0, 2.75), (28.0, 3.6), (29.75, 4.3)]
HALF = [(0.0, 0.0), (0.25, 0.42), (0.8, 0.86), (1.8, 1.32), (3.3, 1.68), (5.5, WIDTH / 2), (20.5, WIDTH / 2), (23.0, 1.62), (26.0, 1.05), (28.5, 0.5), (29.75, 0.1)]


def material(name, colour, rough=0.5, metal=0.0):
    m = bpy.data.materials.new(name)
    m.use_backface_culling = False
    b = m.node_tree.nodes.get('Principled BSDF')
    b.inputs['Base Color'].default_value = tuple(pow(int(colour[i:i + 2], 16) / 255, 2.2) for i in (1, 3, 5)) + (1,)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    return m


M = {
    'white': material('white', '#e9e9e4', 0.35),
    'belly': material('belly', '#a9adb0', 0.4, 0.2),
    'metal': material('metal', '#b4b8bb', 0.3, 0.7),
    'wing': material('wing', '#b8bbbd', 0.4, 0.2),
    'dark': material('dark', '#14171a', 0.2),
    'nose': material('nose', '#2b2d30', 0.45),
    'tyre': material('tyre', '#101011', 0.85),
    'seam': material('seam', '#6f7377', 0.6),
}


def obj(name, verts, faces, mat, angle=50):
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(v) for v in verts], [], faces)
    me.materials.append(M[mat])
    me.update()
    o = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(o)
    me.shade_smooth()
    me.set_sharp_from_angle(angle=math.radians(angle))
    return o


def fuselage():
    ss = [0.0, 0.05, 0.12, 0.25, 0.4, 0.6, 0.8, 1.0, 1.3, 1.6, 2.0, 2.5, 3.0, 3.5, 4.2, 5.0, 6.0]
    ss += [6.0 + i * 1.5 for i in range(1, 11)] + [22.0 + i * 0.7 for i in range(1, 12)]
    ss = sorted(set(round(x, 3) for x in ss if x < 29.75)) + [29.75]
    n = 36
    verts, faces, mats = [], [], []
    for s in ss:
        zt, zb, hw = table(TOP_LINE, s), table(BOTTOM_LINE, s), max(table(HALF, s), 0.001)
        cz, rz = (zt + zb) / 2, max((zt - zb) / 2, 0.001)
        for i in range(n):
            a = 2 * math.pi * i / n
            verts.append((X(s), hw * math.cos(a), cz + rz * math.sin(a)))
    for k in range(len(ss) - 1):
        for i in range(n):
            a, b = k * n + i, k * n + (i + 1) % n
            faces.append((a, b, b + n, a + n))
            # The radome; then grey below a line round the body, then white.
            low = math.sin(2 * math.pi * (i + 0.5) / n) < -0.3
            mats.append(2 if ss[k] < 0.8 else (1 if low else 0))
    # The tail cone's end.
    end = (len(ss) - 1) * n
    faces.append(tuple(end + i for i in range(n)))
    mats.append(1)
    o = obj('fuselage', verts, faces, 'white', 60)
    o.data.materials.append(M['belly'])
    o.data.materials.append(M['nose'])
    for p, m in zip(o.data.polygons, mats):
        p.material_index = m
    return o


def foil(chord, thick, n=10):
    """A plain airfoil loop as (fraction along the chord, thickness), leading edge at 0."""
    pts = []
    for i in range(n + 1):
        t = (1 - math.cos(math.pi * i / n)) / 2
        h = 0.5 * thick * (2.97 * math.sqrt(max(t, 0)) - 1.26 * t - 3.52 * t * t + 2.84 * t ** 3 - 1.02 * t ** 4) / 0.5
        pts.append((t * chord, h * 0.5))
    upper = pts
    lower = [(x, -h) for x, h in reversed(pts[1:-1])]
    return upper + lower


def lifting(name, sections, mat):
    """Sections: (s of leading edge, chord, thickness, along-axis position, z, axis) lofted into a surface, capped."""
    verts, faces = [], []
    m = None
    for s0, chord, thick, y, z, vertical in sections:
        loop = foil(chord, thick)
        m = len(loop)
        for dx, h in loop:
            if vertical:
                verts.append((X(s0 + dx), h, z))
            else:
                verts.append((X(s0 + dx), y, z + h))
    for k in range(len(sections) - 1):
        for i in range(m):
            a, b = k * m + i, k * m + (i + 1) % m
            faces.append((a, a + m, b + m, b))
    faces.append(tuple(range(m)))
    faces.append(tuple((len(sections) - 1) * m + i for i in range(m)))
    return obj(name, verts, faces, mat, 35)


def wing(sign):
    def z(y):
        return 1.72 + (B['wingtipHeight'] - 1.72) * (y - 1.2) / (B['span'] / 2 - 1.2)
    stations = [
        (1.2, 10.75, 16.74, 0.62),
        (1.94, 10.88, 16.74, 0.55),
        (4.9, 12.60, 16.74, 0.42),
        (14.1, 18.0, 19.30, 0.16),
        (B['span'] / 2, 18.15, 19.25, 0.07),
    ]
    secs = [(le, te - le, t, sign * y, z(y), False) for y, le, te, t in stations]
    return lifting('wing', secs, 'wing')


def stabiliser(sign):
    half = B['stabiliserSpan'] / 2
    z0, z1 = 4.72, B['stabiliserHeight']
    secs = [
        (25.6, 3.75, 0.26, sign * 0.15, z0, False),
        (26.0, 3.3, 0.24, sign * 0.6, z0 + (z1 - z0) * 0.11, False),
        (29.15, 1.38, 0.08, sign * half, z1, False),
    ]
    return lifting('stabiliser', secs, 'white')


def fin():
    top = B['tailHeight']
    # Height, leading edge, trailing edge: the dorsal's curve, then straight to the top.
    rows = [(4.75, 21.6, 28.75), (5.13, 22.4, 28.8), (5.5, 23.8, 28.9), (6.1, 24.9, 29.0), (7.0, 25.8, 29.25), (9.0, 27.2, 29.75), (10.8, 28.45, 30.2), (top - 0.12, 28.85, 30.33), (top, 29.15, 30.33)]
    secs = [(le, te - le, 0.5 * (1 - (z - 4.75) / (top - 4.75)) + 0.1, 0, z, True) for z, le, te in rows]
    return lifting('fin', secs, 'white')


def lathe(name, mat, prof, cx, cy, cz, seg=28):
    """About the fore-and-aft axis: profile as (s from nacelle front, radius)."""
    verts, faces = [], []
    n = len(prof)
    for j in range(seg):
        a = 2 * math.pi * j / seg
        for ds, r in prof:
            verts.append((X(cx + ds), cy + r * math.cos(a), cz + r * math.sin(a)))
    for j in range(seg):
        k = (j + 1) % seg
        for i in range(n - 1):
            faces.append((j * n + i, k * n + i, k * n + i + 1, j * n + i + 1))
    return obj(name, verts, faces, mat, 40)


def engine(sign):
    # Bottom at the manual's engine clearance, front off the side view.
    r = 0.74
    cz = B['engineClearance'] + r
    y, s0, ln = sign * 4.8, 11.55, 5.6
    lathe('nacelle', 'metal', [(0, 0.58), (0.05, 0.66), (0.35, r), (2.6, r), (3.9, 0.72), (4.7, 0.6), (ln - 0.5, 0.5), (ln, 0.47)], s0, y, cz)
    lathe('intake', 'dark', [(0.05, 0.56), (0.25, 0.0)], s0, y, cz, seg=20)
    lathe('exhaust', 'dark', [(ln - 0.1, 0.44), (ln - 0.5, 0.0)], s0, y, cz, seg=20)
    # Where it hangs under the wing.
    verts = [(X(s), y + d, z) for s in (s0 + 1.8, s0 + 4.0) for d in (-0.14, 0.14) for z in (cz + r - 0.1, cz + r + 0.12)]
    faces = [(0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)]
    obj('pylon', verts, faces, 'wing', 20)


def tube(name, mat, a, b, r, seg=8):
    a, b = Vector(a), Vector(b)
    d = (b - a).normalized()
    u = d.orthogonal().normalized()
    v = d.cross(u)
    verts, faces = [], []
    for p in (a, b):
        for i in range(seg):
            t = 2 * math.pi * i / seg
            verts.append(p + u * r * math.cos(t) + v * r * math.sin(t))
    for i in range(seg):
        k = (i + 1) % seg
        faces.append((i, k, k + seg, i + seg))
    return obj(name, verts, faces, mat, 60)


def wheel(s, y, r, w):
    prof = [(-w / 2, r * 0.45), (-w / 2, r * 0.85), (-w / 2 + 0.03, r), (w / 2 - 0.03, r), (w / 2, r * 0.85), (w / 2, r * 0.45)]
    verts, faces = [], []
    seg, n = 24, len(prof)
    for j in range(seg):
        a = 2 * math.pi * j / seg
        for ax, rr in prof:
            verts.append((X(s) + rr * math.cos(a), y + ax, r + rr * math.sin(a)))
    for j in range(seg):
        k = (j + 1) % seg
        for i in range(n - 1):
            faces.append((j * n + i, k * n + i, k * n + i + 1, j * n + i + 1))
    obj('tyre', verts, faces, 'tyre', 50)
    for sgn in (-1, 1):
        vs = [(X(s), y + sgn * w * 0.46, r)] + [(X(s) + r * 0.46 * math.cos(2 * math.pi * j / 16), y + sgn * w * 0.46, r + r * 0.46 * math.sin(2 * math.pi * j / 16)) for j in range(16)]
        obj('hub', vs, [(0, 1 + j, 1 + (j + 1) % 16) for j in range(16)], 'metal')


def gear():
    nose_s, main_s = B['noseToNoseGear'], B['noseToNoseGear'] + B['wheelbase']
    for d in (-0.2, 0.2):
        wheel(nose_s, d, 0.32, 0.2)
    tube('nose strut', 'metal', (X(nose_s), 0, 0.32), (X(nose_s - 0.1), 0, 1.5), 0.07)
    for sign in (-1, 1):
        y = sign * B['mainGearTrack'] / 2
        for d in (-0.26, 0.26):
            wheel(main_s, y + d, 0.5, 0.33)
        tube('main strut', 'metal', (X(main_s), y, 0.5), (X(main_s - 0.15), y * 0.96, 2.05), 0.1)
        tube('drag brace', 'metal', (X(main_s), y, 1.1), (X(main_s), y * 0.5, 1.45), 0.05)


def project(proj, s, z, sign, lift):
    start = Vector((X(s), sign * 4.0, z))
    loc, _, _, _ = proj.ray_cast(start, Vector((0, -sign, 0)))
    if loc is None:
        return None
    return loc + Vector((0, sign * lift, 0))


def rect(proj, name, mat, s0, s1, z0, z1, sign, lift=0.03, nx=2, ny=2):
    verts, faces = [], []
    for j in range(ny + 1):
        for i in range(nx + 1):
            p = project(proj, s0 + (s1 - s0) * i / nx, z0 + (z1 - z0) * j / ny, sign, lift)
            if p is None:
                return
            verts.append(p)
    for j in range(ny):
        for i in range(nx):
            k = j * (nx + 1) + i
            faces.append((k, k + 1, k + nx + 2, k + nx + 1))
    obj(name, verts, faces, mat)


def windows(body):
    bm = bmesh.new()
    bm.from_mesh(body.data)
    tree = BVHTree.FromBMesh(bm)
    bm.free()
    wz = 3.64
    for sign in (-1, 1):
        # Cabin windows, 20 in apart, from behind the front door to the rear door; a gap at the wing exit.
        s = 6.2
        while s < 22.7:
            rect(tree, 'window', 'dark', s, s + 0.2, wz - 0.15, wz + 0.15, sign, nx=1, ny=1)
            s += 0.508
        # Doors and the overwing exit, outlined.
        for s0, s1, z0, z1 in ((4.0, 4.86, 2.68, 4.38), (23.45, 24.2, 2.82, 4.42), (13.05, 13.55, 3.2, 4.1)):
            for a in ((s0, s0 + 0.025, z0, z1), (s1 - 0.025, s1, z0, z1), (s0, s1, z0, z0 + 0.025), (s0, s1, z1 - 0.025, z1)):
                rect(tree, 'door', 'seam', a[0], a[1], a[2], a[3], sign, nx=2, ny=4)
        # The flight deck's side windows.
        for s0, s1, z0, z1 in ((1.56, 1.98, 3.84, 4.16), (2.04, 2.46, 3.94, 4.28), (2.52, 2.86, 4.05, 4.36)):
            rect(tree, 'cockpit', 'dark', s0, s1, z0, z1, sign, nx=2, ny=2)


def join():
    objs = [o for o in bpy.data.objects if o.type == 'MESH']
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    o = bpy.context.object
    o.name = 'Boeing 737-200'
    return o


def preview(out):
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.samples = 32
    sc.render.resolution_x, sc.render.resolution_y = 1400, 800
    w = bpy.data.worlds.new('w')
    w.use_nodes = True
    w.node_tree.nodes['Background'].inputs[0].default_value = (0.72, 0.78, 0.85, 1)
    sc.world = w
    bpy.ops.mesh.primitive_plane_add(size=200)
    bpy.context.object.data.materials.append(material('ground', '#77736c', 0.9))
    sun = bpy.data.lights.new('sun', 'SUN')
    sun.energy = 3.5
    so = bpy.data.objects.new('sun', sun)
    bpy.context.collection.objects.link(so)
    so.rotation_euler = (math.radians(50), math.radians(10), math.radians(40))
    cam = bpy.data.cameras.new('c')
    co = bpy.data.objects.new('c', cam)
    bpy.context.collection.objects.link(co)
    sc.camera = co
    cam.lens = 60
    for name, loc in (('quarter', (30, -36, 5)), ('side', (0, -50, 4)), ('front', (55, 0, 4))):
        co.location = loc
        d = Vector((0, 0, 4.5)) - Vector(loc)
        co.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
        sc.render.filepath = os.path.join(out, f'b737-{name}.png')
        bpy.ops.render.render(write_still=True)


def main():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    p = argparse.ArgumentParser()
    p.add_argument('--preview', default=None)
    a = p.parse_args(argv)
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o)
    body = fuselage()
    windows(body)
    fin()
    for sign in (-1, 1):
        wing(sign)
        stabiliser(sign)
        engine(sign)
    gear()
    o = join()
    tris = sum(len(p.vertices) - 2 for p in o.data.polygons)
    print(f'B737 {o.dimensions.x:.3f} x {o.dimensions.y:.3f} x {o.dimensions.z:.3f} m, {tris} triangles')
    bpy.ops.object.select_all(action='DESELECT')
    o.select_set(True)
    out = os.path.join(ROOT, 'public', 'models', 'b737.glb')
    bpy.ops.export_scene.gltf(
        filepath=out, export_format='GLB', use_selection=True, export_yup=True, export_apply=True,
        export_normals=True, export_materials='EXPORT',
        export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=7,
    )
    print('EXPORTED', f'{os.path.getsize(out) / 1024:.0f} KB')
    if a.preview:
        preview(a.preview)


main()

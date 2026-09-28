"""
Keith Godchaux's Fender Rhodes: the Grateful Dead's own "Seventy-Three"
stage piano, serial 27763, sold by Sotheby's in 2021 as property of Grateful
Dead Productions, modelled to stand beside the grand at Winterland, October
1974.

    /Applications/Blender.app/Contents/MacOS/Blender -b -P blender/instruments/rhodes/build.py -- \\
        --shot hero --samples 256          # or front; --save for a .blend

Where every number comes from (see README.md beside this script):
  Sotheby's  45" wide, 23" deep, 8" high; the instrument itself in three
             photographs (lot 53, 2021)
  photo      measured on the straight-on photograph at its own scale (the
             base 45" across = 39.4 px/in): 73 keys, E to E (43 white, 30
             sharps, counted), white keys 0.92" (a standard key is 0.925"),
             the name rail and lid 41" wide between the case's end walls,
             the cheek blocks 1.8"; the base's front, the name rail with its
             control panel, and the lid's front with the "Seventy-Three"
             script are that photograph's own pixels
  estimate   the side profile (the photographs are at an angle; fitted to the
             8" height and 23" depth), the legs (Sotheby's says "with legs";
             they aren't pictured), the height it stood at

Frame: inches. x across (+ treble), y from the front of the base toward the
back, z up from the floor.
"""
import argparse
import math
import os
import sys

import bmesh
import bpy
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
from kit import IN, cyl, frame_viewports, lacquer, modifier_bevel, new_mat, obj, plain, prism, render, srgb, studio  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))
PHOTO = os.path.join(ROOT, '.shots', 'reference', 'rhodes-sothebys-01.jpg')

W, D, H = 45.0, 23.0, 8.0        # Sotheby's
PPI = 1775 / W                   # the base's front, 1775 px across in the photograph
XC = 1021.5                      # the photograph's centre line (between the base's ends)
INNER = 1605 / PPI / 2           # the rail and lid: 41" wide
WHITE = 1559 / PPI / 43          # 43 white keys across 1559 px
KEYS_W = 43 * WHITE
CHEEK = (240 - 170) / PPI
BASE_Z0 = 24.9                   # estimate: the base's underside on its legs
BASE_T = 2.5                     # the base's front: rows 1200-1300, 100 px
KEY_TOP = BASE_Z0 + 3.2
KEY_Y0, KEY_Y1 = 0.6, 6.2        # the keys' fronts to the name rail
RAIL = ((KEY_Y1, BASE_Z0 + 3.6), (KEY_Y1 + 1.5, BASE_Z0 + 5.0))
LID_Y0 = RAIL[1][0]


def args():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    p = argparse.ArgumentParser()
    p.add_argument('--shot', default='hero', choices=['hero', 'front'])
    p.add_argument('--samples', type=int, default=256)
    p.add_argument('--save', action='store_true')
    p.add_argument('--out', default=os.path.join(ROOT, '.shots', 'instruments'))
    return p.parse_args(argv)


def tolex():
    """Black Tolex: a pebbled vinyl, dull, its grain as a fine bump."""
    m, nt, L, b = new_mat('Tolex, black')
    b.inputs['Base Color'].default_value = srgb('#121212')
    b.inputs['Roughness'].default_value = 0.55
    tex = nt.new('ShaderNodeTexVoronoi')
    tex.inputs['Scale'].default_value = 60.0
    bump = nt.new('ShaderNodeBump')
    bump.inputs['Strength'].default_value = 0.25
    co = nt.new('ShaderNodeTexCoord')
    L.new(co.outputs['Object'], tex.inputs['Vector'])
    L.new(tex.outputs['Distance'], bump.inputs['Height'])
    L.new(bump.outputs['Normal'], b.inputs['Normal'])
    return m


def photo_mat(name, rough, metal=0.0):
    m, nt, L, b = new_mat(name)
    img = bpy.data.images.load(PHOTO) if os.path.exists(PHOTO) else None
    if img:
        t = nt.new('ShaderNodeTexImage')
        t.image = img
        t.interpolation = 'Cubic'
        L.new(t.outputs['Color'], b.inputs['Base Color'])
    else:
        b.inputs['Base Color'].default_value = srgb('#151515')
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    return m


def materials():
    M = {'tolex': tolex()}
    M['front'] = photo_mat('Base front, photographed', 0.55)
    M['rail'] = photo_mat('Name rail and panel, photographed', 0.3, 0.6)
    M['lidfront'] = photo_mat('Lid front, photographed', 0.45)
    M['white'] = plain('Keytop, white', '#e9e5d8', 0.3, coat=True)
    M['black'] = plain('Sharp, black', '#0b0b0b', 0.5)
    M['felt'] = plain('Key felt, red', '#6a1a16', 0.9)
    M['chrome'] = plain('Chrome', '#d8d8d8', 0.08, 1.0)
    M['rubber'] = plain('Leg tip, rubber', '#1a1a1a', 0.8)
    return M


def uv_front(bm, faces, px_of):
    """UVs from the photograph for faces that face the camera: px_of maps a
    vertex to its photograph pixel."""
    uv = bm.loops.layers.uv.verify()
    for f in faces:
        for loop in f.loops:
            px, py = px_of(loop.vert.co)
            loop[uv].uv = (px / 2048.0, 1 - py / 2048.0)


def quad(bm, pts, mat):
    f = bm.faces.new([bm.verts.new(p) for p in pts])
    f.material_index = mat
    return f


def build(M, root):
    z0 = BASE_Z0
    # The base: a tray the full size, its front the photograph's.
    bm = bmesh.new()
    prism(bm, [(-W / 2, 0), (W / 2, 0), (W / 2, D), (-W / 2, D)], z0, z0 + BASE_T)
    front = [f for f in bm.faces if f.normal.y < -0.9]
    for f in front:
        f.material_index = 1
    uv_front(bm, front, lambda v: (XC + v.x * PPI, 1300 - (v.z - z0) / BASE_T * 100))
    o = obj('base', bm, [M['tolex'], M['front']], root)
    modifier_bevel(o, 0.15, segs=3)
    # End walls rising either side of the keys and the lid (the photographs'
    # side panels), sloping up from the front.
    bm = bmesh.new()
    prof = [(0.0, z0 + BASE_T), (0.0, z0 + BASE_T + 1.0), (LID_Y0, z0 + H - 1.2), (D, z0 + H - 0.6), (D, z0 + BASE_T)]
    for x0, x1 in ((-W / 2, -INNER), (INNER, W / 2)):
        a = [bm.verts.new((x0, y, z)) for y, z in prof]
        b = [bm.verts.new((x1, y, z)) for y, z in prof]
        bm.faces.new(list(reversed(a)))
        bm.faces.new(b)
        for i in range(len(prof)):
            j = (i + 1) % len(prof)
            bm.faces.new((a[i], a[j], b[j], b[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    o = obj('end walls', bm, [M['tolex']], root)
    modifier_bevel(o, 0.2, segs=3)

    # Keys: 73, E to E.
    bw, bb, bf = bmesh.new(), bmesh.new(), bmesh.new()
    x0 = -KEYS_W / 2
    for i in range(43):
        xa, xb = x0 + i * WHITE + 0.012, x0 + (i + 1) * WHITE - 0.012
        prism(bw, [(xa, KEY_Y0), (xb, KEY_Y0), (xb, KEY_Y1 + 0.5), (xa, KEY_Y1 + 0.5)], KEY_TOP - 0.8, KEY_TOP)
    # From E: F F# G G# A A# B C C# D D# E ... a sharp after F, G, A, C, D.
    sharp_after = {1: True, 2: True, 3: True, 4: False, 5: True, 6: True, 0: False}   # index mod 7 from E
    for i in range(42):
        if sharp_after[i % 7] and i % 7 != 0:
            xc = x0 + (i + 1) * WHITE
            prism(bb, [(xc - 0.23, KEY_Y0 + 2.0), (xc + 0.23, KEY_Y0 + 2.0), (xc + 0.23, KEY_Y1 + 0.5), (xc - 0.23, KEY_Y1 + 0.5)],
                  KEY_TOP, KEY_TOP + 0.45)
    prism(bf, [(-KEYS_W / 2, KEY_Y1 - 0.15), (KEYS_W / 2, KEY_Y1 - 0.15), (KEYS_W / 2, KEY_Y1), (-KEYS_W / 2, KEY_Y1)], KEY_TOP, KEY_TOP + 0.3)
    o = obj('white keys', bw, [M['white']], root)
    modifier_bevel(o, 0.02, segs=2)
    o = obj('sharps', bb, [M['black']], root)
    modifier_bevel(o, 0.04, segs=2)
    obj('key felt', bf, [M['felt']], root)
    # Cheek blocks at the keys' ends.
    bm = bmesh.new()
    for xa, xb in ((-KEYS_W / 2 - CHEEK, -KEYS_W / 2), (KEYS_W / 2, KEYS_W / 2 + CHEEK)):
        prism(bm, [(xa, KEY_Y0), (xb, KEY_Y0), (xb, KEY_Y1 + 0.5), (xa, KEY_Y1 + 0.5)], z0 + BASE_T, KEY_TOP + 0.9)
    o = obj('cheek blocks', bm, [M['tolex']], root)
    modifier_bevel(o, 0.1, segs=2)

    # The name rail: a slanted aluminium strip, the photograph's (badge,
    # control panel and all), its rows 997 (top) to 1087 (bottom).
    bm = bmesh.new()
    (ya, za), (yb, zb) = RAIL
    f = quad(bm, [(-INNER, ya, za), (INNER, ya, za), (INNER, yb, zb), (-INNER, yb, zb)], 0)
    uv_front(bm, [f], lambda v: (XC + v.x * PPI, 1087 - (v.z - za) / (zb - za) * 90))
    solid = bmesh.ops.extrude_face_region(bm, geom=[f])
    bmesh.ops.translate(bm, verts=[e for e in solid['geom'] if isinstance(e, bmesh.types.BMVert)], vec=(0, 0.15, -0.15))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    obj('name rail', bm, [M['rail']], root)

    # The lid: a front face (the photograph's, rows 890 to 997), a rounded
    # front edge, and a flat top running back to the rear of the case.
    bm = bmesh.new()
    zt = z0 + H
    r = 1.6
    prof = [(LID_Y0, zb), (LID_Y0, zt - r)] + [(LID_Y0 + r - r * math.cos(math.pi / 2 * k / 10), zt - r + r * math.sin(math.pi / 2 * k / 10)) for k in range(11)] + [(D, zt), (D, zb)]
    a = [bm.verts.new((-INNER, y, z)) for y, z in prof]
    b = [bm.verts.new((INNER, y, z)) for y, z in prof]
    bm.faces.new(list(reversed(a)))
    bm.faces.new(b)
    faces = []
    for i in range(len(prof)):
        j = (i + 1) % len(prof)
        faces.append(bm.faces.new((a[i], a[j], b[j], b[i])))
    # The front and its rounded edge wear the photograph (rows 997 at the
    # rail up to 890 at the top of the curve), "Seventy-Three" script and all.
    fronts = [f for f in faces if f.calc_center_median().y < LID_Y0 + r + 0.01]
    for f in fronts:
        f.material_index = 1
    uv_front(bm, fronts, lambda v: (XC + v.x * PPI, 997 - (v.z - zb) / (zt - zb) * 107))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    o = obj('lid', bm, [M['tolex'], M['lidfront']], root)
    o.data.shade_smooth()

    # Legs: chrome tubes at the corners (estimate: Rhodes stage legs; not in
    # Sotheby's photographs), rubber tips.
    bm, bt = bmesh.new(), bmesh.new()
    for x in (-W / 2 + 3, W / 2 - 3):
        for y in (3.0, D - 3.0):
            cyl(bm, x, y, 0.8, z0 - 0.8, 0.55)
            cyl(bt, x, y, 0.0, 0.8, 0.7)
    obj('legs', bm, [M['chrome']], root).data.shade_smooth()
    obj('leg tips', bt, [M['rubber']], root).data.shade_smooth()


def camera(shot):
    s = bpy.context.scene
    cam = bpy.data.cameras.new('camera')
    o = bpy.data.objects.new('camera', cam)
    s.collection.objects.link(o)
    s.camera = o
    cam.dof.use_dof = True
    cam.dof.aperture_fstop = 8
    if shot == 'hero':
        cam.lens = 50
        o.location = (-1.1, -2.2, 1.55)
        target = Vector((0.0, 0.0, 0.7))
    else:
        cam.lens = 70
        o.location = (0.0, -2.4, 1.2)
        target = Vector((0.0, 0.0, 0.72))
    s.render.resolution_x, s.render.resolution_y = 1600, 1066
    o.rotation_euler = (target - o.location).to_track_quat('-Z', 'Y').to_euler()
    cam.dof.focus_distance = (target - o.location).length
    return target


def main():
    a = args()
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o)
    root = bpy.data.objects.new('Fender Rhodes', None)
    bpy.context.scene.collection.objects.link(root)
    M = materials()
    build(M, root)
    root.scale = (IN, IN, IN)
    root.location = (0, -D / 2 * IN, 0)
    studio('hero')
    target = camera(a.shot)
    os.makedirs(a.out, exist_ok=True)
    if a.save:
        frame_viewports(a.shot, target)
        bpy.ops.wm.save_as_mainfile(filepath=os.path.join(HERE, 'rhodes.blend'))
    out = os.path.join(a.out, f'rhodes-{a.shot}.png')
    render(a.samples, out)
    print('RENDERED', out)


main()

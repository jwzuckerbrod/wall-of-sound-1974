"""
Keith Godchaux's grand piano as it stood at Winterland, 16-20 October 1974: a
9-ft concert grand, black, its lid closed flat. Modelled as a New York
Steinway Model D, from Steinway's published size and a dimensioned drawing.

    /Applications/Blender.app/Contents/MacOS/Blender -b -P blender/instruments/piano/build.py -- \\
        --shot hero --samples 256          # or keys, top; --save for a .blend

Where every number comes from (see README.md beside this script):
  traced    the case in plan (rim, tail, bentside) and in profile (the cheeks'
            S-curve, the keybed, the rim), the front legs' turned profile, and
            where the three legs, the lyre and the pedals stand: the
            dimensioned Steinway Model D drawing (outline.json)
  Steinway  107.75" x 61.75"
  drawing   key tops 28.1" (the front elevation; dimensions.com lists
            28.125"), rim top 40.05", keybed underside 24.8", rim underside
            28.1", the front flap's fold 23.0" behind the keys
  Winterland lid closed flat, front flap too (no music desk); black, a soft
            sheen: dead.net, 16 October 1974
  standard  an 88-note keyboard: 52 white keys at 0.925", black keys between
  estimate  the make (a Steinway is the most likely rental; not confirmed),
            the lid's thickness, the legs' round section, the lyre's posts,
            the pedals, casters and key materials

Frame: inches. x across (+ treble), y from the front of the keys toward the
tail, z up from the floor.
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
from kit import (IN, cyl, frame_viewports, lacquer, modifier_bevel, new_mat, obj, plain,  # noqa: E402
                 prism, render, smooth_outline, srgb, studio)

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))

LID_T = 0.9           # estimate
KEY_TOP = 28.14       # the drawing's front elevation
KEYS_BACK = 5.37      # the plan: where the keys disappear under the case
CASE_FRONT = 6.89     # the plan and the side view: front of the rim and lid
FLAP_FOLD = 23.01     # the plan: the fold of the lid's front flap
ARM_W = 2.07          # the front elevation: each cheek
WHITE_W = 0.925       # standard: 52 white keys across 48.1"
KEYBED_UNDER = 24.835
RIM_UNDER = 28.144


def args():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    p = argparse.ArgumentParser()
    p.add_argument('--shot', default='hero', choices=['hero', 'keys', 'top'])
    p.add_argument('--samples', type=int, default=256)
    p.add_argument('--save', action='store_true')
    p.add_argument('--out', default=os.path.join(ROOT, '.shots', 'instruments'))
    return p.parse_args(argv)


def materials():
    M = {}
    m, nt, L, b = new_mat('Case, black, satin')
    b.inputs['Base Color'].default_value = srgb('#0b0b0c')
    b.inputs['Roughness'].default_value = 0.35
    lacquer(b)
    b.inputs['Coat Roughness'].default_value = 0.18      # a soft sheen, not a mirror (the 1974 photo)
    M['case'] = m
    M['under'] = plain('Case underside, black', '#0a0a0a', 0.6)
    M['white'] = plain('Keytop, white', '#efece2', 0.28, coat=True)
    M['black'] = plain('Sharp, black', '#0c0c0c', 0.35, coat=True)
    M['felt'] = plain('Key felt, red', '#5a1414', 0.9)
    M['brass'] = plain('Brass', '#b8903f', 0.22, 1.0)
    M['rubber'] = plain('Caster tyre', '#1a1a1a', 0.7)
    return M


# ─── geometry helpers ────────────────────────────────────────────────────────

def clip(poly, y0, keep_above=True):
    """Clip a closed polygon to y >= y0 (or y <= y0)."""
    out = []
    inside = (lambda p: p[1] >= y0) if keep_above else (lambda p: p[1] <= y0)
    for a, b in zip(poly, poly[1:] + poly[:1]):
        if inside(a):
            out.append(a)
        if inside(a) != inside(b):
            t = (y0 - a[1]) / (b[1] - a[1])
            out.append((a[0] + (b[0] - a[0]) * t, y0))
    return out


def extrude_x(bm, prof, x0, x1, mat=0):
    """A closed (y, z) profile extruded across x0..x1."""
    a = [bm.verts.new((x0, y, z)) for y, z in prof]
    b = [bm.verts.new((x1, y, z)) for y, z in prof]
    n = len(prof)
    bm.faces.new(list(reversed(a))).material_index = mat
    bm.faces.new(b).material_index = mat
    for i in range(n):
        bm.faces.new((a[i], a[(i + 1) % n], b[(i + 1) % n], b[i])).material_index = mat


def boolean(o, cutter, op):
    m = o.modifiers.new(cutter.name, 'BOOLEAN')
    m.operation = op
    m.solver = 'EXACT'
    m.object = cutter
    cutter.hide_render = True
    cutter.display_type = 'WIRE'
    return m


def lathe(bm, rows, cx, cy, seg=40):
    """Revolve (z, radius) rows about a vertical axis at (cx, cy)."""
    rings = []
    for z, r in rows:
        rings.append([bm.verts.new((cx + r * math.cos(2 * math.pi * k / seg), cy + r * math.sin(2 * math.pi * k / seg), z))
                      for k in range(seg)])
    for r0, r1 in zip(rings, rings[1:]):
        for k in range(seg):
            bm.faces.new((r0[k], r0[(k + 1) % seg], r1[(k + 1) % seg], r1[k]))
    bm.faces.new(list(reversed(rings[0])))
    bm.faces.new(rings[-1])


# ─── parts ───────────────────────────────────────────────────────────────────

def case(M, root):
    plan = [tuple(p) for p in DATA['plan']]
    plan = smooth_outline(plan, step=0.25, passes=3)
    rim_top = DATA['side']['rimTopIn']
    half = max(abs(p[0]) for p in plan if p[1] < 3) - ARM_W
    bm = bmesh.new()
    # The rim: the plan, from the rim's underside to its top, behind the
    # front of the case.
    prism(bm, clip(plan, CASE_FRONT), RIM_UNDER, rim_top)
    # The keybed, lower than the rim, from the keys back to where the side
    # profile steps up (28"); under the keys it stops beneath them.
    prism(bm, clip(clip(plan, KEYS_BACK), 28.4, keep_above=False), KEYBED_UNDER, RIM_UNDER)
    prism(bm, [(-half, 0.3), (half, 0.3), (half, KEYS_BACK), (-half, KEYS_BACK)], KEYBED_UNDER, KEY_TOP - 0.9)
    # The cheeks and the key cover: the side profile's front, up to where the
    # rim begins; the cheeks full depth, the cover between them only behind
    # the keys.
    front = [(y, z) for y, z in DATA['side']['profile'] if y <= CASE_FRONT + 0.05 and z >= KEYBED_UNDER - 0.01]
    front = sorted(set(front), key=lambda p: (p[1], p[0]))
    top = [(y, z) for y, z in DATA['side']['profile'] if y <= CASE_FRONT + 0.05 and z > RIM_UNDER - 1.0]
    # (the profile runs round the whole case; its front edge, bottom to top)
    edge = sorted([p for p in DATA['side']['profile'] if p[0] <= CASE_FRONT + 0.05], key=lambda p: p[1])
    cheek = [(CASE_FRONT + 0.2, KEYBED_UNDER)] + [(y, z) for y, z in edge if z >= KEYBED_UNDER] + [(CASE_FRONT + 0.2, rim_top)]
    cheek = [p for i, p in enumerate(cheek) if i == 0 or p != cheek[i - 1]]
    for x0, x1 in ((-half - ARM_W, -half), (half, half + ARM_W)):
        extrude_x(bm, cheek, x0, x1)
    cover = [(max(y, KEYS_BACK), z) for y, z in cheek if z >= KEY_TOP + 0.35]
    cover = [(KEYS_BACK, KEY_TOP + 0.35)] + cover
    cover = [p for i, p in enumerate(cover) if i == 0 or p != cover[i - 1]]
    extrude_x(bm, cover, -half, half)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    body = obj('piano case', bm, [M['case']], root)
    body.data.shade_smooth()
    modifier_bevel(body, 0.12, segs=3)

    # The lid, closed, in two leaves: the front flap folds at 23.0".
    lid = clip(plan, CASE_FRONT)
    for name, y0, y1 in (('lid front flap', CASE_FRONT, FLAP_FOLD - 0.03), ('lid', FLAP_FOLD + 0.03, 999)):
        leaf = clip(clip(lid, y0), y1, keep_above=False)
        bm = bmesh.new()
        prism(bm, leaf, rim_top, rim_top + LID_T)
        o = obj(name, bm, [M['case']], root)
        o.data.shade_smooth()
        modifier_bevel(o, 0.1, segs=3)
    return half, rim_top


def keyboard(M, root, half):
    """88 keys, A0 to C8, centred between the cheeks."""
    whites = 52
    width = whites * WHITE_W
    x0 = -width / 2
    bm_w, bm_b, bm_f = bmesh.new(), bmesh.new(), bmesh.new()
    gap = 0.02
    for i in range(whites):
        xa, xb = x0 + i * WHITE_W + gap / 2, x0 + (i + 1) * WHITE_W - gap / 2
        prism(bm_w, [(xa, 0.3), (xb, 0.3), (xb, KEYS_BACK + 0.5), (xa, KEYS_BACK + 0.5)], KEY_TOP - 0.9, KEY_TOP)
    # Sharps: A0 is white key 0 and B0 key 1 (one sharp between), then
    # C D E F G A B octaves from C1 (white key 2).
    note_has_sharp = {0: True, 1: True, 2: False, 3: True, 4: True, 5: True, 6: False}   # C D E F G A B
    sharps = [0]                                          # A#0, between white keys 0 and 1
    for i in range(2, whites - 1):
        if note_has_sharp[(i - 2) % 7]:
            sharps.append(i)
    for i in sharps:
        xc = x0 + (i + 1) * WHITE_W
        prism(bm_b, [(xc - 0.23, 2.05), (xc + 0.23, 2.05), (xc + 0.23, KEYS_BACK + 0.5), (xc - 0.23, KEYS_BACK + 0.5)],
              KEY_TOP, KEY_TOP + 0.45)
    # Key slip under the fronts, and the red felt strip at the back.
    prism(bm_f, [(-half, KEYS_BACK - 0.2), (half, KEYS_BACK - 0.2), (half, KEYS_BACK), (-half, KEYS_BACK)], KEY_TOP, KEY_TOP + 0.35)
    o = obj('white keys', bm_w, [M['white']], root)
    modifier_bevel(o, 0.02, segs=2)
    o = obj('sharps', bm_b, [M['black']], root)
    modifier_bevel(o, 0.04, segs=2)
    obj('key felt', bm_f, [M['felt']], root)
    bm = bmesh.new()
    prism(bm, [(-half, -0.05), (half, -0.05), (half, 0.3), (-half, 0.3)], KEY_TOP - 1.9, KEY_TOP - 0.25)
    o = obj('key slip', bm, [M['case']], root)
    modifier_bevel(o, 0.05, segs=2)


def legs(M, root):
    """Three legs, turned to the front elevation's profile, on brass casters."""
    rows = [(z, r) for z, r, _ in DATA['front']['legProfile']['rows'] if z >= 2.25]
    f = DATA['front']['edgesAt12In']
    s = DATA['side']['edgesAt12In']
    front_y, tail_y = (s[0] + s[1]) / 2, (s[-2] + s[-1]) / 2
    spots = [((f[0] + f[1]) / 2, front_y, KEYBED_UNDER), ((f[-2] + f[-1]) / 2, front_y, KEYBED_UNDER),
             ((f[2] + f[3]) / 2, tail_y, KEYBED_UNDER)]
    bm, bb = bmesh.new(), bmesh.new()
    for x, y, top in spots:
        prof = rows + [(top, rows[-1][1])]
        lathe(bm, prof, x, y)
        # Caster: a brass wheel under the foot (the drawing's circle).
        res = bmesh.ops.create_cone(bb, cap_ends=True, segments=32, radius1=0.95, radius2=0.95, depth=0.7)
        bmesh.ops.rotate(bb, verts=res['verts'], cent=(0, 0, 0), matrix=Matrix.Rotation(math.radians(90), 3, 'Y'))
        bmesh.ops.translate(bb, verts=res['verts'], vec=(x, y + 0.6, 0.95))
        cyl(bb, x, y, 1.6, 0.7, 0.35)
    # The tail leg meets the rim on a two-step plinth (the side profile).
    for y0, y1, z0, z1 in ((95.9, 105.2, KEYBED_UNDER, 26.5), (94.0, 105.5, 26.5, RIM_UNDER)):
        x = spots[2][0]
        prism(bm, [(x - 3.2, y0), (x + 3.2, y0), (x + 3.2, y1), (x - 3.2, y1)], z0, z1)
    o = obj('legs', bm, [M['case']], root)
    o.data.shade_smooth()
    obj('casters', bb, [M['brass']], root).data.shade_smooth()


def lyre(M, root):
    """The pedal lyre under the keyboard: two posts (front elevation, centred
    at +-3.0"), a pedal box, three brass pedals reaching forward to 8.1"
    (side elevation), and a brace back to the case."""
    f = DATA['front']['edgesAt12In']
    xs = [(f[4] + f[5]) / 2, (f[6] + f[7]) / 2]
    w = f[5] - f[4]
    y = 14.2
    bm = bmesh.new()
    for x in xs:
        prism(bm, [(x - w / 2, y - 0.6), (x + w / 2, y - 0.6), (x + w / 2, y + 0.6), (x - w / 2, y + 0.6)], 4.8, KEYBED_UNDER)
    prism(bm, [(-4.6, y - 1.6), (4.6, y - 1.6), (4.6, y + 1.6), (-4.6, y + 1.6)], 1.0, 4.8)
    prism(bm, [(-3.2, 24.3), (3.2, 24.3), (3.2, 26.75), (-3.2, 26.75)], 23.0, KEYBED_UNDER)
    o = obj('lyre', bm, [M['case']], root)
    modifier_bevel(o, 0.1, segs=2)
    bm = bmesh.new()
    for px in (-2.2, 0.0, 2.2):
        prism(bm, [(px - 0.55, 8.1), (px + 0.55, 8.1), (px + 0.35, y - 1.6), (px - 0.35, y - 1.6)], 2.5, 3.1)
    # The brace: a rod from the lyre's foot back up to the case (the side
    # elevation's diagonal).
    a, b = Vector((0, 16.6, 7.1)), Vector((0, 25.8, 22.7))
    d = b - a
    for bx in (-1.6, 1.6):
        res = bmesh.ops.create_cone(bm, cap_ends=True, segments=16, radius1=0.2, radius2=0.2, depth=d.length)
        q = Vector((0, 0, 1)).rotation_difference(d.normalized())
        bmesh.ops.transform(bm, verts=res['verts'], matrix=Matrix.Translation((a + b) / 2 + Vector((bx, 0, 0))) @ q.to_matrix().to_4x4())
    o = obj('pedals and brace', bm, [M['brass']], root)
    o.data.shade_smooth()


def camera(shot):
    s = bpy.context.scene
    cam = bpy.data.cameras.new('camera')
    o = bpy.data.objects.new('camera', cam)
    s.collection.objects.link(o)
    s.camera = o
    cam.dof.use_dof = True
    cam.dof.aperture_fstop = 8
    if shot == 'hero':
        cam.lens = 45
        o.location = (-2.9, -3.3, 1.9)
        target = Vector((0.1, 0.05, 0.75))
        s.render.resolution_x, s.render.resolution_y = 1600, 1066
    elif shot == 'keys':
        cam.lens = 60
        o.location = (-0.75, -2.75, 1.35)          # in front of the keys (at y = -1.37 m)
        target = Vector((0.05, -1.25, 0.76))
        s.render.resolution_x, s.render.resolution_y = 1600, 1066
    else:
        # From above and behind the keyboard's treble end, looking down the
        # closed lid, roughly as the 16 October 1974 photograph does.
        cam.lens = 35
        o.location = (1.9, 3.9, 3.2)
        target = Vector((-0.2, 1.1, 0.9))
        s.render.resolution_x, s.render.resolution_y = 1600, 1066
    o.rotation_euler = (target - o.location).to_track_quat('-Z', 'Y').to_euler()
    cam.dof.focus_distance = (target - o.location).length
    return target


def bigger_studio(k=2.5):
    """kit.studio is sized for a guitar; a nine-foot piano needs it larger.
    Scale everything about the origin, and the lights' power with the square
    of the distance, so the light on the subject is unchanged."""
    for o in bpy.data.objects:
        if o.name in ('cyc', 'reflector card') or o.type == 'LIGHT':
            o.location = o.location * k
            o.scale = (k, k, k)
            if o.type == 'LIGHT':
                o.data.energy *= k * k


def main():
    a = args()
    global DATA
    with open(os.path.join(HERE, 'outline.json')) as f:
        DATA = json.load(f)
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o)
    root = bpy.data.objects.new('Grand piano', None)
    bpy.context.scene.collection.objects.link(root)
    M = materials()
    half, rim_top = case(M, root)
    keyboard(M, root, half)
    legs(M, root)
    lyre(M, root)
    root.scale = (IN, IN, IN)
    # Centre the piano on the studio: its middle over the origin.
    root.location = (0, -53.9 * IN, 0)
    studio('hero')
    bigger_studio()
    target = camera(a.shot)
    os.makedirs(a.out, exist_ok=True)
    if a.save:
        frame_viewports(a.shot, target)
        bpy.ops.wm.save_as_mainfile(filepath=os.path.join(HERE, 'piano.blend'))
    out = os.path.join(a.out, f'piano-{a.shot}.png')
    render(a.samples, out)
    print('RENDERED', out)


main()

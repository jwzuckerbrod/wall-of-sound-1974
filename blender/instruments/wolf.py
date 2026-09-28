"""
Jerry Garcia's "Wolf" (Doug Irwin, 1973) as it stood in 1974, built in Blender.

    /Applications/Blender.app/Contents/MacOS/Blender -b -P blender/instruments/wolf.py -- \
        --shot hero --samples 256 --out .shots/instruments

Shots: hero (standing, three-quarter), detail (fingerboard and pickups),
match (orthographic, framed exactly as the Herb Greene photograph the outline
was traced from, for a side-by-side check). Add --save to write wolf.blend.

Where every number comes from (see blender/instruments/README.md):
  traced   body outline, fingerboard width at the body, inlays 15-24, centre
           stripes, pickup-plate and control positions: Herb Greene's
           straight-on photograph, scaled off the frets (wolf_outline.json)
  traced   headstock outline and tuner posts: the Met, 2019 (CC BY 2.0),
           scaled off the 25" nut-to-saddle distance
  Irwin    25" scale, 24 frets, woods and laminations, Schaller chrome-nickel
           hardware, three Stratocaster pickups (1973 build; humbuckers 1978)
  estimate body thickness 1.75", headstock pitch 10", nut width 1.69", string
           gauges, and the 1974 control layout (volume, tone, 5-way, one jack)

Deliberately left off until a 1974 photograph settles them: the peacock inlay
on the headstock (the Met photograph shows the later eagle), the cartoon wolf
sticker (a 30 Nov 1973 photograph shows the guitar without it), and inlays
below fret 13, which neither photograph shows cleanly enough yet.

Frame: inches until the very end. x across the body (+ treble), y along the
neck (0 at the saddle line, 25 at the nut), z out of the top (0 at the back).
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
ROOT = os.path.dirname(os.path.dirname(HERE))
IN = 0.0254

T = 1.75            # body thickness (estimate)
BOARD_T = 0.25      # fingerboard thickness
NUT_W = 1.69        # nut width (estimate)
SCALE = 25.0        # Irwin
FRETS = 24          # Irwin
HEAD_PITCH = 10.0   # degrees (estimate)
HEAD_T = 0.55       # headstock thickness (estimate)

# Headstock half-widths, inches from the nut, traced off the Met photograph and
# averaged left/right (the photo is a little off-axis).
HEADSTOCK = [(0.83, 0.0), (0.76, 0.5), (1.49, 1.55), (1.39, 2.45), (1.47, 3.14), (1.55, 4.12),
             (1.69, 5.10), (1.78, 6.24), (1.35, 6.28), (0.80, 6.57), (0.33, 6.83), (0.0, 6.89)]
TUNER_POSTS = [(0.97, 2.31), (0.97, 3.79), (0.97, 5.31)]

# 1974 hardware, placed off the Greene photograph (inches, saddle frame).
PLATE = (-2.125, 2.37, 0.36, 5.95)        # x0, x1, y0, y1
PICKUPS_Y = (5.42, 3.75, 2.05)             # neck (traced), middle, bridge (estimate)
KNOBS = [(3.05, -0.18), (2.60, -2.77)]     # volume, tone
SELECTOR = (4.28, -3.13)
JACK = (2.48, -5.92)
TAILPIECE_Y = -2.45
STRING_GAUGES = (0.046, 0.036, 0.026, 0.017, 0.013, 0.010)
BRIDGE_SPACING, NUT_SPACING = 2.063, 1.40


def args():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    p = argparse.ArgumentParser()
    p.add_argument('--shot', default='hero', choices=['hero', 'detail', 'match'])
    p.add_argument('--samples', type=int, default=256)
    p.add_argument('--out', default=os.path.join(ROOT, '.shots', 'instruments'))
    p.add_argument('--save', action='store_true')
    return p.parse_args(argv)


def srgb(hex_):
    c = [int(hex_[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    return tuple(v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4 for v in c) + (1.0,)


def fret_y(n):
    """Distance of fret n from the saddle."""
    return SCALE * 2 ** (-n / 12)


def board_half(y):
    """Fingerboard half-width at y, linear from the nut to the traced width at fret 24."""
    w24 = DATA['fingerboardWidthAtBodyIn']
    y24 = fret_y(24)
    t = (y - y24) / (SCALE - y24)
    return (w24 + (NUT_W - w24) * t) / 2


# ─── mesh helpers ─────────────────────────────────────────────────────────────

def obj(name, bm, mats, parent):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    for m in mats:
        me.materials.append(m)
    o = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(o)
    o.parent = parent
    return o


def prism(bm, pts, z0, z1, mat=0, side_mat=None):
    """Extrude a closed (x, y) polygon in inches between z0 and z1."""
    bot = [bm.verts.new((x, y, z0)) for x, y in pts]
    top = [bm.verts.new((x, y, z1)) for x, y in pts]
    fb = bm.faces.new(list(reversed(bot)))
    ft = bm.faces.new(top)
    fb.material_index = ft.material_index = mat
    n = len(pts)
    for i in range(n):
        f = bm.faces.new((bot[i], bot[(i + 1) % n], top[(i + 1) % n], top[i]))
        f.material_index = mat if side_mat is None else side_mat
    return ft


def smooth_outline(pts, step=0.06, passes=4):
    """
    Resample the traced outline evenly and relax it a little. The trace follows
    pixel edges, which leaves a fine stair-step in the silhouette that a
    polished body edge would never have. Four passes move nothing further than
    about a hundredth of an inch.
    """
    if pts[0] == pts[-1]:
        pts = pts[:-1]
    P = [Vector((x, y)) for x, y in pts] + [Vector(pts[0])]
    out, carry = [], 0.0
    for a, b in zip(P, P[1:]):
        seg = (b - a).length
        d = carry
        while d < seg:
            out.append(a + (b - a) * (d / seg))
            d += step
        carry = d - seg
    for _ in range(passes):
        n = len(out)
        out = [(out[i - 1] + out[i] * 2 + out[(i + 1) % n]) / 4 for i in range(n)]
    return [(v.x, v.y) for v in out]


def rounded_rect(x0, x1, y0, y1, r, seg=6):
    pts = []
    for cx, cy, a0 in ((x1 - r, y0 + r, -90), (x1 - r, y1 - r, 0), (x0 + r, y1 - r, 90), (x0 + r, y0 + r, 180)):
        for k in range(seg + 1):
            a = math.radians(a0 + 90 * k / seg)
            pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return pts


def cyl(bm, x, y, z0, h, r, seg=24, mat=0, axis='Z'):
    res = bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r, radius2=r, depth=h)
    vs = res['verts']
    if axis == 'Y':
        bmesh.ops.rotate(bm, verts=vs, cent=(0, 0, 0), matrix=Matrix.Rotation(math.radians(90), 3, 'X'))
    bmesh.ops.translate(bm, verts=vs, vec=(x, y, z0 + (h / 2 if axis == 'Z' else 0)))
    for f in {f for v in vs for f in v.link_faces}:
        f.material_index = mat
    return vs


def modifier_bevel(o, width, segs=4, limit='ANGLE'):
    m = o.modifiers.new('bevel', 'BEVEL')
    m.width = width
    m.segments = segs
    m.limit_method = limit
    m.harden_normals = True
    o.data.shade_smooth() if hasattr(o.data, 'shade_smooth') else None
    return m


# ─── materials ────────────────────────────────────────────────────────────────

def new_mat(name):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    return m, m.node_tree.nodes, m.node_tree.links, m.node_tree.nodes['Principled BSDF']


def lacquer(b):
    b.inputs['Coat Weight'].default_value = 1.0
    b.inputs['Coat Roughness'].default_value = 0.025
    b.inputs['Coat IOR'].default_value = 1.52


def quilted_maple():
    """Amber-finished quilted maple: pillowy figure that shifts in the light, under deep lacquer."""
    m, nt, L, b = new_mat('Quilted maple, amber')
    co = nt.new('ShaderNodeTexCoord')
    mp = nt.new('ShaderNodeMapping')
    mp.inputs['Scale'].default_value = (1.7, 0.95, 1.7)   # quilt pillows ~0.6 x 1 in, long across the grain
    L.new(co.outputs['Object'], mp.inputs['Vector'])
    warp = nt.new('ShaderNodeTexNoise')
    warp.inputs['Scale'].default_value = 0.6
    warp.inputs['Detail'].default_value = 2
    mix = nt.new('ShaderNodeVectorMath')
    mix.operation = 'MULTIPLY_ADD'
    mix.inputs[1].default_value = (0.9, 0.9, 0.9)
    L.new(warp.outputs['Color'], mix.inputs[0])
    L.new(mp.outputs['Vector'], mix.inputs[2])
    L.new(mp.outputs['Vector'], warp.inputs['Vector'])
    vor = nt.new('ShaderNodeTexVoronoi')
    vor.feature = 'SMOOTH_F1'
    vor.inputs['Smoothness'].default_value = 1.0
    L.new(mix.outputs['Vector'], vor.inputs['Vector'])
    flow = nt.new('ShaderNodeTexNoise')
    flow.inputs['Scale'].default_value = 1.6
    flow.inputs['Detail'].default_value = 3
    flow.inputs['Distortion'].default_value = 1.2
    L.new(mix.outputs['Vector'], flow.inputs['Vector'])
    blend = nt.new('ShaderNodeMix')
    blend.data_type = 'FLOAT'
    blend.inputs['Factor'].default_value = 0.45
    L.new(vor.outputs['Distance'], blend.inputs['A'])
    L.new(flow.outputs['Fac'], blend.inputs['B'])
    # Chatoyance: quilt is figure you see because the fibres reflect light
    # differently as the angle changes. Shift the pattern with the facing
    # angle so the pillows roll as the camera or light moves, like the real top.
    facing = nt.new('ShaderNodeLayerWeight')
    facing.inputs['Blend'].default_value = 0.5
    shift = nt.new('ShaderNodeMath'); shift.operation = 'MULTIPLY_ADD'
    shift.inputs[1].default_value = 0.9
    L.new(facing.outputs['Facing'], shift.inputs[0])
    L.new(blend.outputs['Result'], shift.inputs[2])
    wrap = nt.new('ShaderNodeMath'); wrap.operation = 'PINGPONG'
    wrap.inputs[1].default_value = 0.55
    L.new(shift.outputs[0], wrap.inputs[0])
    ramp = nt.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].color = srgb('#6a300a')
    ramp.color_ramp.elements[1].position = 0.55
    ramp.color_ramp.elements[1].color = srgb('#f0b24a')
    ramp.color_ramp.elements.new(0.3).color = srgb('#c0701c')
    L.new(wrap.outputs[0], ramp.inputs['Fac'])
    # Neck-through core: two purpleheart lines with maple between, traced.
    x = nt.new('ShaderNodeSeparateXYZ')
    L.new(co.outputs['Object'], x.inputs['Vector'])
    stripe = None
    for x0, x1 in DATA['centreStripesIn']:
        lo = nt.new('ShaderNodeMath'); lo.operation = 'GREATER_THAN'; lo.inputs[1].default_value = x0
        hi = nt.new('ShaderNodeMath'); hi.operation = 'LESS_THAN'; hi.inputs[1].default_value = x1
        L.new(x.outputs['X'], lo.inputs[0]); L.new(x.outputs['X'], hi.inputs[0])
        both = nt.new('ShaderNodeMath'); both.operation = 'MULTIPLY'
        L.new(lo.outputs[0], both.inputs[0]); L.new(hi.outputs[0], both.inputs[1])
        if stripe is None:
            stripe = both
        else:
            add = nt.new('ShaderNodeMath'); add.operation = 'MAXIMUM'
            L.new(stripe.outputs[0], add.inputs[0]); L.new(both.outputs[0], add.inputs[1])
            stripe = add
    below = nt.new('ShaderNodeMath'); below.operation = 'LESS_THAN'; below.inputs[1].default_value = PLATE[2] + 0.05
    L.new(x.outputs['Y'], below.inputs[0])
    gate = nt.new('ShaderNodeMath'); gate.operation = 'MULTIPLY'
    L.new(stripe.outputs[0], gate.inputs[0]); L.new(below.outputs[0], gate.inputs[1])
    col = nt.new('ShaderNodeMix'); col.data_type = 'RGBA'
    col.inputs['B'].default_value = srgb('#4a1d1e')
    L.new(gate.outputs[0], col.inputs['Factor'])
    L.new(ramp.outputs['Color'], col.inputs['A'])
    L.new(col.outputs['Result'], b.inputs['Base Color'])
    bump = nt.new('ShaderNodeBump')
    # The figure bumps the wood, not the lacquer: the coat stays glass-flat.
    bump.inputs['Strength'].default_value = 0.18
    bump.inputs['Distance'].default_value = 0.02
    L.new(blend.outputs['Result'], bump.inputs['Height'])
    L.new(bump.outputs['Normal'], b.inputs['Normal'])
    b.inputs['Roughness'].default_value = 0.35
    lacquer(b)
    return m


def laminate(name, axis, bands, extent):
    """Laminated edge: constant colour bands along one object axis, 0..extent inches."""
    m, nt, L, b = new_mat(name)
    co = nt.new('ShaderNodeTexCoord')
    sep = nt.new('ShaderNodeSeparateXYZ')
    L.new(co.outputs['Object'], sep.inputs['Vector'])
    mr = nt.new('ShaderNodeMapRange')
    mr.inputs['From Min'].default_value = extent[0]
    mr.inputs['From Max'].default_value = extent[1]
    L.new(sep.outputs[axis], mr.inputs['Value'])
    ramp = nt.new('ShaderNodeValToRGB')
    ramp.color_ramp.interpolation = 'CONSTANT'
    els = ramp.color_ramp.elements
    els[0].position, els[0].color = 0.0, srgb(bands[0][1])
    els[1].position, els[1].color = bands[1][0], srgb(bands[1][1])
    for pos, col in bands[2:]:
        e = els.new(pos)
        e.color = srgb(col)
    L.new(mr.outputs['Result'], ramp.inputs['Fac'])
    L.new(ramp.outputs['Color'], b.inputs['Base Color'])
    b.inputs['Roughness'].default_value = 0.3
    lacquer(b)
    return m


def plain(name, hex_, rough, metal=0.0, coat=False):
    m, nt, L, b = new_mat(name)
    b.inputs['Base Color'].default_value = srgb(hex_)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    if coat:
        lacquer(b)
    return m


def ebony():
    m, nt, L, b = new_mat('Gaboon ebony')
    co = nt.new('ShaderNodeTexCoord')
    wave = nt.new('ShaderNodeTexWave')
    wave.bands_direction = 'Y'
    wave.inputs['Scale'].default_value = 1.0
    wave.inputs['Distortion'].default_value = 4
    L.new(co.outputs['Object'], wave.inputs['Vector'])
    ramp = nt.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].color = srgb('#0b0908')
    ramp.color_ramp.elements[1].color = srgb('#1f1914')
    L.new(wave.outputs['Fac'], ramp.inputs['Fac'])
    L.new(ramp.outputs['Color'], b.inputs['Base Color'])
    b.inputs['Roughness'].default_value = 0.42
    return m


def materials():
    M = {}
    M['top'] = quilted_maple()
    # Body edge, back to top: maple back, four 1/28" sheets, purpleheart core,
    # four sheets, maple top (Irwin). Positions are fractions of T.
    s = 1 / 28 / T
    back = 0.22
    bands = [(0.0, '#d49a4a'), (back, '#4a1d1e'), (back + s, '#d8a860'), (back + 2 * s, '#4a1d1e'),
             (back + 3 * s, '#d8a860'), (back + 4 * s, '#5a2426'),
             (1 - back - 4 * s, '#d8a860'), (1 - back - 3 * s, '#4a1d1e'), (1 - back - 2 * s, '#d8a860'),
             (1 - back - s, '#4a1d1e'), (1 - back, '#d49a4a')]
    M['edge'] = laminate('Body laminations', 'Z', bands, (0, T))
    # Neck: fiddleback maple and purpleheart laminated along its length.
    M['neck'] = laminate('Neck laminations', 'X',
                         [(0.0, '#d8a860'), (0.28, '#4a1d1e'), (0.36, '#d8a860'), (0.64, '#4a1d1e'), (0.72, '#d8a860')],
                         (-0.9, 0.9))
    M['ebony'] = ebony()
    M['face'] = plain('Headstock face, ebony, lacquered', '#0a0908', 0.25, coat=True)
    M['binding'] = plain('Maple binding', '#dcae66', 0.3, coat=True)
    M['purpleheart'] = plain('Purpleheart', '#4a1d1e', 0.3, coat=True)
    M['ivory'] = plain('African ivory', '#e6dcc0', 0.3, coat=True)
    M['fret'] = plain('Nickel-silver fret', '#c9c6bd', 0.18, 1.0)
    M['chrome'] = plain('Chrome-nickel', '#d7d9dc', 0.08, 1.0)
    M['plate'] = plain('Plated brass plate', '#cfd1d3', 0.14, 1.0)
    M['cover'] = plain('Pickup cover, aged white', '#e9e4d2', 0.32)
    M['pole'] = plain('Pole piece', '#b8bab8', 0.2, 1.0)
    M['bone'] = plain('Bone nut', '#efe6cf', 0.4)
    M['string'] = plain('Plain steel string', '#e2e2e2', 0.15, 1.0)
    M['wound'] = plain('Wound string', '#c9c3b4', 0.3, 1.0)
    M['tuner'] = plain('Schaller tuner', '#dcdde0', 0.1, 1.0)
    M['felt'] = plain('Strap button felt', '#1a1a1a', 0.9)
    return M


# ─── parts ────────────────────────────────────────────────────────────────────

def body(M, root):
    bm = bmesh.new()
    outline = smooth_outline([tuple(p) for p in DATA['outline']])
    prism(bm, outline, 0.0, T, mat=0, side_mat=1)
    o = obj('Wolf body', bm, [M['top'], M['edge']], root)
    modifier_bevel(o, 0.14, segs=6)
    return o


def neck(M, root):
    # Shaft: half-ellipse sections from inside the body to just past the nut.
    bm = bmesh.new()
    ys = [8.0 + i * 0.5 for i in range(int((25.3 - 8.0) / 0.5) + 1)] + [25.3]
    n = 18
    rings = []
    for y in ys:
        hw = board_half(min(y, SCALE))
        depth = 0.62 + 0.08 * (SCALE - min(y, SCALE)) / (SCALE - 12)
        ring = []
        for k in range(n + 1):
            a = math.pi * k / n
            ring.append(bm.verts.new((hw * math.cos(a), y, T - depth * math.sin(a))))
        rings.append(ring)
    for r0, r1 in zip(rings, rings[1:]):
        for k in range(n):
            bm.faces.new((r0[k], r0[k + 1], r1[k + 1], r1[k]))
    o = obj('Wolf neck', bm, [M['neck']], root)
    o.data.shade_smooth()

    # Fingerboard with binding strips.
    y_end = fret_y(24) - 0.22
    bm = bmesh.new()
    board = [(-board_half(y_end), y_end), (board_half(y_end), y_end), (board_half(SCALE), SCALE), (-board_half(SCALE), SCALE)]
    prism(bm, board, T, T + BOARD_T)
    obj('Wolf fingerboard', bm, [M['ebony']], root)
    # Binding: laminations of maple, purpleheart and ebony (Irwin) — shown as a
    # purpleheart line inside a maple edge.
    for side in (-1, 1):
        for i, (w0, w1, mat) in enumerate(((0.0, 0.025, 'purpleheart'), (0.025, 0.07, 'binding'))):
            bm = bmesh.new()
            strip = [(side * (board_half(y_end) + w0), y_end), (side * (board_half(y_end) + w1), y_end),
                     (side * (board_half(SCALE) + w1), SCALE), (side * (board_half(SCALE) + w0), SCALE)]
            if side < 0:
                strip = list(reversed(strip))
            prism(bm, strip, T, T + BOARD_T)
            obj(f'Wolf binding {side} {i}', bm, [M[mat]], root)

    # Frets: half-round nickel-silver wire, notched so only the crown reaches the binding.
    bm = bmesh.new()
    for k in range(1, FRETS + 1):
        y = fret_y(k)
        hw = board_half(y) + 0.06
        res = bmesh.ops.create_cone(bm, cap_ends=True, segments=12, radius1=0.042, radius2=0.042, depth=2 * hw)
        bmesh.ops.rotate(bm, verts=res['verts'], cent=(0, 0, 0), matrix=Matrix.Rotation(math.radians(90), 3, 'Y'))
        bmesh.ops.scale(bm, verts=res['verts'], vec=(1, 1.1, 1))
        bmesh.ops.translate(bm, verts=res['verts'], vec=(0, y, T + BOARD_T))
    obj('Wolf frets', bm, [M['fret']], root).data.shade_smooth()

    # Inlays: the traced shapes, flush in the board.
    for i, shape in enumerate(DATA['inlays']):
        bm = bmesh.new()
        try:
            prism(bm, [tuple(p) for p in shape], T + BOARD_T - 0.004, T + BOARD_T + 0.0015)
        except ValueError:
            bm.free()
            continue
        obj(f'Wolf inlay {i}', bm, [M['ivory']], root)

    # Bone nut.
    bm = bmesh.new()
    prism(bm, rounded_rect(-NUT_W / 2, NUT_W / 2, SCALE, SCALE + 0.2, 0.03), T + BOARD_T, T + BOARD_T + 0.14)
    o = obj('Wolf nut', bm, [M['bone']], root)
    modifier_bevel(o, 0.02, segs=3)


def headstock(M, root):
    right = [(x, y) for x, y in HEADSTOCK]
    left = [(-x, y) for x, y in reversed(HEADSTOCK)]
    outline = [(x, SCALE + 0.2 + y) for x, y in right + left[1:-1]]
    pivot_y, pivot_z = SCALE + 0.2, T + BOARD_T
    bm = bmesh.new()
    top = prism(bm, outline, pivot_z - HEAD_T, pivot_z, mat=0, side_mat=0)
    # Binding: inset the face; the rim keeps the laminate, the centre is ebony.
    rim = set(bmesh.ops.inset_region(bm, faces=[top], thickness=0.09, depth=0)['faces'])
    # Pick the face by where it is, not by its normal: the outline's winding
    # decides which way the normal points, and it points down here.
    for f in bm.faces:
        on_top = all(abs(v.co.z - pivot_z) < 1e-4 for v in f.verts)
        f.material_index = 1 if (on_top and f not in rim) else 0
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    rot = Matrix.Translation((0, pivot_y, pivot_z)) @ Matrix.Rotation(math.radians(-HEAD_PITCH), 4, 'X') @ Matrix.Translation((0, -pivot_y, -pivot_z))
    bmesh.ops.transform(bm, matrix=rot, verts=bm.verts[:])
    o = obj('Wolf headstock', bm, [M['binding'], M['face']], root)
    modifier_bevel(o, 0.03, segs=3)

    # Schaller tuners: post and bushing on the face, housing and button behind.
    bm = bmesh.new()
    for sx in (-1, 1):
        for x, y in TUNER_POSTS:
            px, py = sx * x, SCALE + 0.2 + y
            cyl(bm, px, py, pivot_z, 0.09, 0.2, mat=0)           # bushing
            cyl(bm, px, py, pivot_z, 0.45, 0.12, mat=0)          # post
            cyl(bm, px, py, pivot_z - HEAD_T - 0.4, 0.4, 0.3, mat=0)   # housing
            bx = px + sx * 0.75
            vs = bmesh.ops.create_uvsphere(bm, u_segments=16, v_segments=10, radius=0.3)['verts']
            bmesh.ops.scale(bm, verts=vs, vec=(1.0, 0.45, 0.62))
            bmesh.ops.translate(bm, verts=vs, vec=(bx, py, pivot_z - HEAD_T - 0.2))
    bmesh.ops.transform(bm, matrix=rot, verts=bm.verts[:])
    obj('Wolf tuners', bm, [M['tuner']], root).data.shade_smooth()


def hardware(M, root):
    top = T
    # Chrome-nickel plated brass pickup plate, screwed down.
    x0, x1, y0, y1 = PLATE
    bm = bmesh.new()
    prism(bm, rounded_rect(x0, x1, y0, y1, 0.12), top, top + 0.06)
    o = obj('Wolf pickup plate', bm, [M['plate']], root)
    modifier_bevel(o, 0.015, segs=2)
    bm = bmesh.new()
    for sx in (x0 + 0.18, x1 - 0.18):
        for sy in (y0 + 0.2, (y0 + y1) / 2, y1 - 0.2):
            cyl(bm, sx, sy, top + 0.06, 0.03, 0.07, seg=16)
    obj('Wolf plate screws', bm, [M['chrome']], root).data.shade_smooth()

    # Three Stratocaster single-coils: rounded covers, six staggered poles.
    stagger = (0.06, 0.06, 0.09, 0.08, 0.05, 0.05)
    for i, py in enumerate(PICKUPS_Y):
        bm = bmesh.new()
        prism(bm, rounded_rect(-1.64, 1.64, py - 0.36, py + 0.36, 0.35, seg=10), top + 0.06, top + 0.46)
        o = obj(f'Wolf pickup {i}', bm, [M['cover']], root)
        modifier_bevel(o, 0.06, segs=4)
        bm = bmesh.new()
        for k in range(6):
            px = (k - 2.5) * BRIDGE_SPACING / 5
            cyl(bm, px, py, top + 0.3, 0.16 + stagger[k], 0.094, seg=16)
        obj(f'Wolf poles {i}', bm, [M['pole']], root).data.shade_smooth()

    # Schaller bridge at the saddle line, tailpiece behind it.
    bm = bmesh.new()
    prism(bm, rounded_rect(-1.62, 1.62, -0.3, 0.3, 0.12), top, top + 0.42)
    for k in range(6):
        px = (k - 2.5) * BRIDGE_SPACING / 5
        prism(bm, rounded_rect(px - 0.14, px + 0.14, -0.14, 0.12, 0.04), top + 0.42, top + 0.55)
    o = obj('Wolf bridge', bm, [M['chrome']], root)
    modifier_bevel(o, 0.02, segs=3)
    bm = bmesh.new()
    prism(bm, rounded_rect(-1.65, 1.65, TAILPIECE_Y - 0.3, TAILPIECE_Y + 0.3, 0.28, seg=8), top, top + 0.45)
    o = obj('Wolf tailpiece', bm, [M['chrome']], root)
    modifier_bevel(o, 0.05, segs=4)

    # Knobs, selector, jack, strap buttons.
    bm = bmesh.new()
    for kx, ky in KNOBS:
        cyl(bm, kx, ky, top, 0.5, 0.36, seg=32)
        vs = bmesh.ops.create_uvsphere(bm, u_segments=32, v_segments=12, radius=0.36)['verts']
        keep = [v for v in vs if v.co.z >= 0]
        bmesh.ops.delete(bm, geom=[v for v in vs if v.co.z < 0], context='VERTS')
        bmesh.ops.scale(bm, verts=keep, vec=(1, 1, 0.3))
        bmesh.ops.translate(bm, verts=keep, vec=(kx, ky, top + 0.5))
    sx, sy = SELECTOR
    prism(bm, [(sx + 0.3 * math.cos(a) , sy + 0.75 * math.sin(a)) for a in [i * math.pi / 16 for i in range(32)]], top, top + 0.05)
    prism(bm, rounded_rect(sx - 0.06, sx + 0.06, sy - 0.05, sy + 0.05, 0.02), top + 0.05, top + 0.5)
    cyl(bm, JACK[0], JACK[1], top, 0.08, 0.3, seg=32)
    cyl(bm, JACK[0], JACK[1], top, 0.1, 0.19, seg=32)
    o = obj('Wolf controls', bm, [M['chrome']], root)
    o.data.shade_smooth()

    # Strings: saddle to nut to post.
    nut_z = T + BOARD_T + 0.14
    saddle_z = top + 0.55
    for k, g in enumerate(STRING_GAUGES):
        bx = (k - 2.5) * BRIDGE_SPACING / 5
        nx = (k - 2.5) * NUT_SPACING / 5
        tx = (k - 2.5) * BRIDGE_SPACING / 5 * 1.02
        side = -1 if k < 3 else 1
        post = TUNER_POSTS[k if k < 3 else 5 - k]   # E A D nearest-first on the bass side, e B G on the treble
        px, py = post[0] * side, SCALE + 0.2 + post[1]
        pz = T + BOARD_T - (py - SCALE - 0.2) * math.tan(math.radians(HEAD_PITCH)) + 0.3
        path = [(tx, TAILPIECE_Y, top + 0.35), (bx, 0.0, saddle_z), (nx, SCALE + 0.1, nut_z), (px, py, pz)]
        bm = bmesh.new()
        for (ax, ay, az), (cx, cy, cz) in zip(path, path[1:]):
            a, c = Vector((ax, ay, az)), Vector((cx, cy, cz))
            d = c - a
            res = bmesh.ops.create_cone(bm, cap_ends=False, segments=8, radius1=g / 2, radius2=g / 2, depth=d.length)
            q = Vector((0, 0, 1)).rotation_difference(d.normalized())
            bmesh.ops.transform(bm, verts=res['verts'], matrix=Matrix.Translation((a + c) / 2) @ q.to_matrix().to_4x4())
        obj(f'Wolf string {k + 1}', bm, [M['wound'] if g > 0.02 else M['string']], root).data.shade_smooth()

    # Strap buttons on the treble horn tip and the tail.
    bm = bmesh.new()
    cyl(bm, -3.43, 10.72, T / 2, 0.2, 0.17, axis='Y')
    cyl(bm, 0.0, -8.27, T / 2, 0.2, 0.17, axis='Y')
    obj('Wolf strap buttons', bm, [M['chrome']], root).data.shade_smooth()


# ─── stage: studio, cameras ───────────────────────────────────────────────────

def studio(shot):
    s = bpy.context.scene
    world = s.world or bpy.data.worlds.new('World')
    s.world = world
    world.use_nodes = True
    wn, wl = world.node_tree.nodes, world.node_tree.links
    bg = wn['Background']
    bg.inputs['Strength'].default_value = 0.35
    tc = wn.new('ShaderNodeTexCoord')
    sep = wn.new('ShaderNodeSeparateXYZ')
    wl.new(tc.outputs['Generated'], sep.inputs['Vector'])
    grad = wn.new('ShaderNodeValToRGB')
    grad.color_ramp.elements[0].color = srgb('#08090a')
    grad.color_ramp.elements[1].position = 0.75
    grad.color_ramp.elements[1].color = srgb('#9aa0a8')
    toward = wn.new('ShaderNodeMath'); toward.operation = 'MULTIPLY_ADD'
    toward.inputs[1].default_value = -0.5
    toward.inputs[2].default_value = 0.5
    wl.new(sep.outputs['Y'], toward.inputs[0])   # -Y (behind the camera) is brighter
    up = wn.new('ShaderNodeMath'); up.operation = 'MULTIPLY_ADD'
    up.inputs[1].default_value = 0.5
    wl.new(sep.outputs['Z'], up.inputs[0])
    wl.new(toward.outputs[0], up.inputs[2])
    wl.new(up.outputs[0], grad.inputs['Fac'])
    wl.new(grad.outputs['Color'], bg.inputs['Color'])
    # The backdrop hides the world from the camera; only reflections see it.

    def area(name, loc, size, power, colour='#fff6ea'):
        L = bpy.data.lights.new(name, 'AREA')
        L.shape = 'RECTANGLE'
        L.size, L.size_y = size
        L.energy = power
        L.color = srgb(colour)[:3]
        o = bpy.data.objects.new(name, L)
        s.collection.objects.link(o)
        o.location = loc
        o.rotation_euler = (Vector((0, 0, 0.55)) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()

    if shot == 'match':
        # Flat, even light like a copy stand, so the comparison is about shape.
        area('copy left', (-0.8, -0.4, 1.4), (1.2, 1.2), 45)
        area('copy right', (0.8, -0.4, 1.4), (1.2, 1.2), 45)
        world.node_tree.nodes['Background'].inputs['Color'].default_value = srgb('#6c7078')
        world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.6
        return
    # Cyclorama: a floor that sweeps up into a back wall.
    bm = bmesh.new()
    prof = [(-3.0, -3.0, 0.0), (1.2, 1.2, 0.0)]
    for i in range(24):
        a = math.pi / 2 * i / 23
        prof.append((0, 1.2 + 0.6 * math.sin(a), 0.6 - 0.6 * math.cos(a)))
    verts = []
    for x in (-3.0, 3.0):
        verts.append([bm.verts.new((x, y, z)) for (_, y, z) in [(0, -3.0, 0.0)] + prof[2:] + [(0, 1.8, 3.0)]])
    for i in range(len(verts[0]) - 1):
        bm.faces.new((verts[0][i], verts[1][i], verts[1][i + 1], verts[0][i + 1]))
    me = bpy.data.meshes.new('cyc')
    bm.to_mesh(me)
    bm.free()
    me.shade_smooth()
    cyc = bpy.data.objects.new('cyc', me)
    s.collection.objects.link(cyc)
    me.materials.append(plain('Backdrop', '#1d1e21', 0.8))
    # White card behind and above the camera, invisible to it, so polished
    # metal reads as metal instead of reflecting a black studio.
    bm2 = bmesh.new()
    bmesh.ops.create_grid(bm2, x_segments=1, y_segments=1, size=0.7)
    me2 = bpy.data.meshes.new('card')
    bm2.to_mesh(me2)
    bm2.free()
    card = bpy.data.objects.new('reflector card', me2)
    s.collection.objects.link(card)
    card.location = (-0.9, -2.6, 0.25)
    card.rotation_euler = (math.radians(90), 0, math.radians(-25))
    cm = bpy.data.materials.new('card')
    cm.use_nodes = True
    em = cm.node_tree.nodes.new('ShaderNodeEmission')
    em.inputs['Strength'].default_value = 1.6
    cm.node_tree.links.new(em.outputs[0], cm.node_tree.nodes['Material Output'].inputs['Surface'])
    me2.materials.append(cm)
    card.visible_camera = False
    card.visible_diffuse = False
    # From the side and high, so the black lacquer headstock doesn't mirror it.
    area('key', (-1.7, -0.5, 1.9), (0.9, 1.3), 70)
    area('fill', (1.4, -1.0, 0.8), (1.0, 1.0), 9, '#e8eefc')
    area('rim', (0.6, 1.1, 1.9), (0.3, 1.6), 40)


def camera(shot, root):
    s = bpy.context.scene
    cam = bpy.data.cameras.new('camera')
    o = bpy.data.objects.new('camera', cam)
    s.collection.objects.link(o)
    s.camera = o
    if shot == 'match':
        # Orthographic, looking straight down on the guitar lying on its back,
        # framed exactly as the Greene photograph: same px per inch, same centre.
        f = DATA['photoFrame']
        ppi = DATA['scale']['pxPerIn']
        cam.type = 'ORTHO'
        # ortho_scale spans the frame's longer side unless told otherwise; the
        # photo is portrait, so pin it to the width.
        cam.sensor_fit = 'HORIZONTAL'
        cam.ortho_scale = f['widthPx'] / ppi * IN
        cx = (f['widthPx'] / 2 - f['xCentrePx']) / ppi
        cy = (f['ySaddlePx'] - f['heightPx'] / 2) / ppi
        o.location = (cx * IN, cy * IN, 1.0)
        o.rotation_euler = (0, 0, 0)
        s.render.resolution_x, s.render.resolution_y = f['widthPx'], f['heightPx']
        return
    cam.lens = 70 if shot == 'hero' else 100
    cam.dof.use_dof = True
    cam.dof.aperture_fstop = 5.6 if shot == 'hero' else 4.0
    if shot == 'hero':
        o.location = (0.55, -2.1, 0.62)
        target = Vector((0.0, 0.0, 0.52))
        s.render.resolution_x, s.render.resolution_y = 1080, 1620
    else:
        o.location = (0.28, -0.62, 0.48)
        target = Vector((0.0, 0.0, 0.34))
        s.render.resolution_x, s.render.resolution_y = 1600, 1066
    o.rotation_euler = (target - o.location).to_track_quat('-Z', 'Y').to_euler()
    cam.dof.focus_distance = (target - o.location).length


def render(samples, path):
    s = bpy.context.scene
    s.render.engine = 'CYCLES'
    prefs = bpy.context.preferences.addons['cycles'].preferences
    prefs.compute_device_type = 'METAL'
    prefs.get_devices()
    for d in prefs.devices:
        d.use = d.type == 'METAL'
    s.cycles.device = 'GPU'
    s.cycles.samples = samples
    s.cycles.use_denoising = True
    s.view_settings.view_transform = 'AgX'
    s.view_settings.look = 'AgX - Medium High Contrast'
    s.render.resolution_percentage = 100
    s.render.image_settings.file_format = 'PNG'
    s.render.filepath = path
    bpy.ops.render.render(write_still=True)


def main():
    a = args()
    global DATA
    with open(os.path.join(HERE, 'wolf_outline.json')) as f:
        DATA = json.load(f)
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o)

    # Build in inches, then scale the whole instrument to metres in one go.
    root = bpy.data.objects.new('Wolf', None)
    bpy.context.scene.collection.objects.link(root)
    M = materials()
    body(M, root)
    neck(M, root)
    headstock(M, root)
    hardware(M, root)
    root.scale = (IN, IN, IN)
    # Shaders read object coordinates, i.e. the mesh's own inches; only the
    # root is scaled to metres.
    if a.shot == 'match':
        root.location = (0, 0, 0)
    else:
        # Standing on its tail, face to camera, slightly turned: museum stance.
        root.rotation_euler = (math.radians(90), 0, math.radians(-14))
        root.location = (0, 0, 8.4 * IN)
    studio(a.shot)
    camera(a.shot, root)
    os.makedirs(a.out, exist_ok=True)
    if a.save:
        bpy.ops.wm.save_as_mainfile(filepath=os.path.join(HERE, 'wolf.blend'))
    out = os.path.join(a.out, f'wolf-{a.shot}.png')
    render(a.samples, out)
    print('RENDERED', out)


main()

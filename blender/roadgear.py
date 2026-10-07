"""
The road gear on the Wall's deck: the McIntosh MC 2300s in orange Anvil
rolling cases, the loose road cases, and what the crew stuck on them.

Modelled on the one Wall amplifier known to survive with its case (Sotheby's
2021, lot 43; the config's PROVENANCE['materials.mcIntoshMeters'] and
['materials.roadCases']):

  - MC 2300: 19 x 10.5 x 17 in. An anodized gold front panel over a black
    chassis, two blue meters, gold rack handles, and a black strip below with
    three knobs and a red power switch.
  - Case: orange Anvil, aluminium edging and ball corners, recessed latches
    and handles, on casters.

The "GRATEFUL DEAD" lettering sticker and the skull-and-bolt sticker are an
artistic choice, not 1974 evidence (PROVENANCE['materials.stickers']);
scene.json's `stickers` turns them off. The 1969 bolt stencil is drawn from
the same traced outline the browser uses (src/geometry/logo.ts).

Wear is all in the shaders, offset per object so no two cases wear alike.
Called from build_scene.build(); positions all come from scene.json.
"""
import json
import math
import os
import random

import bmesh
import bpy
from mathutils import Matrix, Vector

IN = 0.0254
FONTS = '/System/Library/Fonts/Supplemental/'
SERIF = FONTS + 'Georgia Bold.ttf'
STENCIL = FONTS + 'DIN Condensed Bold.ttf'
SANS = FONTS + 'Arial Bold.ttf'

MARKS = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'marks')

# From the config (structure.roadCases), via scene.json.
with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'scene.json')) as _f:
    _RC = json.load(_f)['gear']
CASTER_H = _RC['casterHeight']      # caster wheel, fork and plate, floor to case bottom
PANEL = _RC['wall']                 # case wall: 3/8" ply under its laminate
RACK_SETBACK = _RC['rackSetback']   # amp fronts behind the case's front edge, clearing the handles
SLOT_GAP = _RC['slotGap']           # between amps in a rack


def srgb(hex_):
    out = []
    for i in (1, 3, 5):
        c = int(hex_[i:i + 2], 16) / 255
        out.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
    return (*out, 1.0)


# ─── shader pieces ────────────────────────────────────────────────────────────

class Sh:
    """A material's node tree, with the handful of moves every wear shader makes."""

    def __init__(self, name):
        self.m = bpy.data.materials.new(name)
        self.m.use_nodes = True
        self.nt = self.m.node_tree.nodes
        self.ln = self.m.node_tree.links
        self.bsdf = self.nt['Principled BSDF']
        self._co = None

    def node(self, kind, **inputs):
        n = self.nt.new(kind)
        for k, v in inputs.items():
            n.inputs[k].default_value = v
        return n

    def link(self, a, b):
        self.ln.new(a, b)

    def co(self):
        """Object coordinates, shifted per object so instances wear differently."""
        if self._co is None:
            tc = self.nt.new('ShaderNodeTexCoord')
            info = self.nt.new('ShaderNodeObjectInfo')
            off = self.node('ShaderNodeVectorMath')
            off.operation = 'SCALE'
            off.inputs[0].default_value = (37.1, 91.7, 13.3)
            self.link(info.outputs['Random'], off.inputs['Scale'])
            add = self.node('ShaderNodeVectorMath')
            add.operation = 'ADD'
            self.link(tc.outputs['Object'], add.inputs[0])
            self.link(off.outputs[0], add.inputs[1])
            self._co = add.outputs[0]
        return self._co

    def noise(self, scale, detail=6.0, rough=0.6, stretch=None):
        n = self.node('ShaderNodeTexNoise', Scale=scale, Detail=detail, Roughness=rough)
        v = self.co()
        if stretch:
            mp = self.node('ShaderNodeMapping')
            mp.inputs['Scale'].default_value = stretch
            self.link(v, mp.inputs['Vector'])
            v = mp.outputs[0]
        self.link(v, n.inputs['Vector'])
        return n.outputs['Fac']

    def band(self, fac, lo, hi, amount=1.0):
        """0 below lo, 1 above hi (or the reverse if lo > hi), times amount."""
        mr = self.node('ShaderNodeMapRange')
        mr.inputs['From Min'].default_value = lo
        mr.inputs['From Max'].default_value = hi
        mr.inputs['To Max'].default_value = amount
        mr.clamp = True
        self.link(fac, mr.inputs['Value'])
        return mr.outputs['Result']

    def mul(self, a, b):
        m = self.node('ShaderNodeMath')
        m.operation = 'MULTIPLY'
        self.link(a, m.inputs[0])
        if isinstance(b, float):
            m.inputs[1].default_value = b
        else:
            self.link(b, m.inputs[1])
        return m.outputs[0]

    def mix(self, colour, fac, over):
        """colour (a socket or a hex), with `over` laid on by fac."""
        mx = self.node('ShaderNodeMix')
        mx.data_type = 'RGBA'
        if isinstance(colour, str):
            mx.inputs['A'].default_value = srgb(colour)
        else:
            self.link(colour, mx.inputs['A'])
        mx.inputs['B'].default_value = srgb(over)
        self.link(fac, mx.inputs['Factor'])
        return mx.outputs['Result']

    def edges(self, radius):
        """1 along convex edges and corners, 0 on flat faces; plus the rounded normal."""
        bev = self.node('ShaderNodeBevel', Radius=radius)
        geo = self.nt.new('ShaderNodeNewGeometry')
        dot = self.node('ShaderNodeVectorMath')
        dot.operation = 'DOT_PRODUCT'
        self.link(bev.outputs['Normal'], dot.inputs[0])
        self.link(geo.outputs['Normal'], dot.inputs[1])
        return self.band(dot.outputs['Value'], 0.995, 0.85), bev.outputs['Normal']

    def upward(self):
        """How much a face looks up: where dust settles."""
        geo = self.nt.new('ShaderNodeNewGeometry')
        sep = self.nt.new('ShaderNodeSeparateXYZ')
        self.link(geo.outputs['Normal'], sep.inputs[0])
        return self.band(sep.outputs['Z'], 0.4, 0.9)

    def bump(self, height, strength, normal=None):
        b = self.node('ShaderNodeBump', Strength=strength, Distance=0.002)
        self.link(height, b.inputs['Height'])
        if normal is not None:
            self.link(normal, b.inputs['Normal'])
        return b.outputs['Normal']

    def out(self, colour, rough, metal=0.0, normal=None, alpha=None):
        if isinstance(colour, str):
            self.bsdf.inputs['Base Color'].default_value = srgb(colour)
        else:
            self.link(colour, self.bsdf.inputs['Base Color'])
        if isinstance(rough, float):
            self.bsdf.inputs['Roughness'].default_value = rough
        else:
            self.link(rough, self.bsdf.inputs['Roughness'])
        self.bsdf.inputs['Metallic'].default_value = metal
        if normal is not None:
            self.link(normal, self.bsdf.inputs['Normal'])
        if alpha is not None:
            self.link(alpha, self.bsdf.inputs['Alpha'])
        return self.m


def add(sh, a, b):
    m = sh.node('ShaderNodeMath')
    m.operation = 'ADD'
    for i, v in enumerate((a, b)):
        if isinstance(v, float):
            m.inputs[i].default_value = v
        else:
            sh.link(v, m.inputs[i])
    return m.outputs[0]


CASE_FINISHES = {
    # Sotheby's 2021 lot 43: the orange Anvil case.
    'orange': dict(name='Anvil case, orange', base='#b4512c', faded='#c8784f', grime='#4a3226',
                   scuff='#26201c', worn='#7f5b44', dust='#8a7a66', crackle=0.0),
    # Lot 40, Weir's: white Anvil.
    'white': dict(name='Anvil case, white', base='#d9d4c7', faded='#e4e0d5', grime='#6d665a',
                  scuff='#3a3632', worn='#9a9284', dust='#a59d8e', crackle=0.0),
    # Lots 34-35: ZERO metal cases, painted bright to tell them apart.
    'zero_orange': dict(name='ZERO case, orange', base='#cf5a2a', faded='#dc7a4c', grime='#5a3322',
                        scuff='#2a2420', worn='#b9bcbe', dust='#9a8a78', crackle=0.0),
    'zero_purple': dict(name='ZERO case, purple', base='#7a3b8f', faded='#8d559f', grime='#3a2440',
                        scuff='#231c26', worn='#b9bcbe', dust='#857a86', crackle=0.0),
    # Lot 36, Budman: black laminate, scratched pale and crazed all over.
    'black': dict(name='Anvil case, black', base='#141414', faded='#1e1d1b', grime='#0a0a09',
                  scuff='#4b4944', worn='#3d3a36', dust='#4f4b44', crackle=0.35),
}


# The base colours are the config's (structure.roadCases.colours); the wear around them is Blender's own.
for _k, _c in (('orange', 'orange'), ('white', 'white'), ('black', 'black'), ('zero_orange', 'zeroOrange'), ('zero_purple', 'zeroPurple')):
    CASE_FINISHES[_k]['base'] = _RC['colours'][_c]


def case_paint(name, base, faded, grime, scuff, worn, dust, crackle):
    """Case laminate: faded in patches, grimed, scuffed, worn through at the edges, dusty on top."""
    s = Sh(name)
    c = s.mix(base, s.noise(1.6, 3.0), faded)
    c = s.mix(c, s.band(s.noise(7.0, 8.0, 0.65), 0.45, 0.8, 0.55), grime)
    marks = s.band(s.noise(26.0, 12.0, 0.7, stretch=(1.0, 1.0, 0.35)), 0.6, 0.64, 0.85)
    c = s.mix(c, marks, scuff)
    if crackle:
        # The laminate crazes into a fine net of pale lines (visible on Budman's case).
        v = s.node('ShaderNodeTexVoronoi', Scale=16.0, Randomness=1.0)
        v.feature = 'DISTANCE_TO_EDGE'
        s.link(s.co(), v.inputs['Vector'])
        lines = s.band(v.outputs['Distance'], 0.008, 0.0, crackle)
        c = s.mix(c, s.mul(lines, s.band(s.noise(3.0, 4.0), 0.35, 0.6)), scuff)
    edge, n = s.edges(0.006)
    wear = s.mul(edge, s.band(s.noise(55.0, 4.0), 0.35, 0.6))
    c = s.mix(c, wear, worn)
    c = s.mix(c, s.mul(s.upward(), s.band(s.noise(4.0, 6.0), 0.4, 0.75, 0.6)), dust)
    rough = add(s, 0.52, s.mul(s.noise(7.0, 8.0, 0.65), 0.35))
    return s.out(c, rough, normal=s.bump(s.noise(90.0, 6.0), 0.06, n))


def rust():
    """Steel corners and latch dishes, rusted through except where hands and knocks keep them bright."""
    s = Sh('Steel, rusted')
    patch = s.band(s.noise(14.0, 10.0, 0.7), 0.38, 0.55)
    c = s.mix('#8a8b8b', patch, '#7a4127')
    c = s.mix(c, s.mul(patch, s.band(s.noise(60.0, 6.0), 0.5, 0.75)), '#4e2617')
    edge, n = s.edges(0.003)
    c = s.mix(c, s.mul(edge, s.band(s.noise(40.0, 4.0), 0.4, 0.6)), '#b9b8b4')
    metal = s.node('ShaderNodeMath')
    metal.operation = 'SUBTRACT'
    metal.inputs[0].default_value = 1.0
    s.link(patch, metal.inputs[1])
    m = s.out(c, add(s, 0.45, s.mul(patch, 0.4)), normal=s.bump(s.noise(150.0, 8.0), 0.15, n))
    s.link(metal.outputs[0], s.bsdf.inputs['Metallic'])
    return m


def stamp_paint(name, base):
    """Paint sprayed through a stencil years ago: speckled, flaked away in patches, scratched through."""
    s = Sh(name)
    c = s.mix(base, s.band(s.noise(12.0, 6.0), 0.45, 0.8, 0.4), '#8c877d')
    speck = s.band(s.noise(900.0, 2.0, 0.5), 0.22, 0.38)
    flake = s.band(s.noise(16.0, 10.0, 0.72), 0.3, 0.36)
    scratch = s.band(s.noise(30.0, 12.0, 0.7, stretch=(1.0, 1.0, 0.08)), 0.66, 0.62)
    return s.out(c, 0.75, alpha=s.mul(s.mul(speck, flake), scratch))


def aluminium(name='Case edging, aluminium', base='#a6aaad'):
    s = Sh(name)
    c = s.mix(base, s.band(s.noise(9.0, 8.0), 0.5, 0.82, 0.7), '#57534b')
    edge, n = s.edges(0.004)
    c = s.mix(c, edge, '#d4d6d8')
    rough = add(s, 0.3, s.mul(s.noise(40.0, 6.0), 0.3))
    return s.out(c, rough, metal=1.0, normal=s.bump(s.noise(120.0, 4.0), 0.04, n))


def anodized_gold():
    """The MC 2300's panel: champagne-gold anodizing, brushed, scratched, rubbed bright at the edges."""
    s = Sh('MC 2300 panel, anodized gold')
    brushed = s.noise(260.0, 2.0, 0.5, stretch=(0.02, 1.0, 1.0))
    c = s.mix(_RC['panel']['gold'], s.mul(brushed, 0.35), '#e0d0a6')
    c = s.mix(c, s.band(s.noise(10.0, 8.0), 0.55, 0.85, 0.45), '#6e6247')
    scratch = s.band(s.noise(40.0, 14.0, 0.75, stretch=(0.15, 1.0, 1.0)), 0.66, 0.69, 0.8)
    c = s.mix(c, scratch, '#d9cba3')
    edge, n = s.edges(0.003)
    c = s.mix(c, edge, '#ddd0aa')
    rough = add(s, 0.36, s.mul(brushed, 0.2))
    return s.out(c, rough, metal=0.85, normal=n)


def black_metal(name, base='#141414'):
    s = Sh(name)
    edge, n = s.edges(0.003)
    c = s.mix(base, s.mul(edge, s.band(s.noise(50.0, 4.0), 0.3, 0.55)), '#77736b')
    c = s.mix(c, s.mul(s.upward(), s.band(s.noise(5.0, 6.0), 0.35, 0.8, 0.7)), '#4a463e')
    rough = add(s, 0.38, s.mul(s.noise(12.0, 6.0), 0.3))
    return s.out(c, rough, metal=0.5, normal=n)


def plain(name, base, rough, metal=0.0, **extra):
    s = Sh(name)
    for k, v in extra.items():
        s.bsdf.inputs[k].default_value = srgb(v) if isinstance(v, str) else v
    return s.out(base, rough, metal)


def vinyl(name, base, peel=True, spray=False):
    """
    A sticker's vinyl, or paint sprayed through a stencil: faded and scuffed,
    and, for stickers, peeled away in patches. Every layer of one sticker reads
    the same noise, so the peeling runs through all its colours at once.
    """
    s = Sh(name)
    c = s.mix(base, s.band(s.noise(30.0, 8.0), 0.55, 0.85, 0.5), '#8f877a')
    c = s.mix(c, s.band(s.noise(14.0, 6.0), 0.45, 0.75, 0.35), '#3d352c')
    alpha = None
    if spray:
        # Overspray: speckled coverage, never quite solid.
        alpha = s.band(s.noise(900.0, 2.0, 0.5), 0.25, 0.42)
    elif peel:
        alpha = s.band(s.noise(22.0, 10.0, 0.7), 0.3, 0.315)
    return s.out(c, add(s, 0.42, s.mul(s.noise(30.0, 4.0), 0.3)), alpha=alpha)


def tape(name, base):
    s = Sh(name)
    c = s.mix(base, s.band(s.noise(40.0, 8.0), 0.45, 0.8, 0.6), '#6b604c')
    alpha = s.band(s.noise(28.0, 12.0, 0.75), 0.27, 0.29)
    return s.out(c, 0.8, alpha=alpha, normal=s.bump(s.noise(200.0, 3.0), 0.08))


def meter_face():
    s = Sh('MC 2300 meter, lit')
    s.bsdf.inputs['Emission Color'].default_value = srgb('#1f8cff')
    s.bsdf.inputs['Emission Strength'].default_value = 1.1
    return s.out('#1a6fc4', 0.5)


def materials():
    G = {
        'paint': case_paint(**CASE_FINISHES['orange']),
        'paint_black': case_paint(**CASE_FINISHES['black']),
        'paint_white': case_paint(**CASE_FINISHES['white']),
        'zero_orange': case_paint(**CASE_FINISHES['zero_orange']),
        'zero_purple': case_paint(**CASE_FINISHES['zero_purple']),
        'duct': tape('Duct tape', '#8d8f8f'),
        'marker': plain('Felt-tip marker', '#151515', 0.6),
        'rust': rust(),
        'stamp': stamp_paint('Stencil paint, pale, worn', '#dcd6c6'),
        'alu': aluminium(),
        'steel': aluminium('Caster plate, steel', '#7c7e80'),
        'rubber': plain('Caster wheel, rubber', '#161515', 0.85),
        'gold': anodized_gold(),
        'chassis': black_metal('MC 2300 chassis'),
        'black': black_metal('Black panel', '#0b0b0b'),
        'knob': aluminium('Knob, knurled aluminium', '#c4c6c8'),
        'red': plain('Power switch, red', '#b81c18', 0.3),
        'meter': meter_face(),
        'glass': plain('Meter glass', '#ffffff', 0.03, **{'Transmission Weight': 1.0, 'IOR': 1.5}),
        'print': plain('Panel legend', '#1d1a14', 0.6),
        'badge': plain('Badge lettering', '#e9e2cf', 0.4),
        'needle': plain('Meter needle', '#050505', 0.5),
        'dark': plain('Case recess', '#0a0909', 0.7),
        'interior': plain('Case interior', '#1c1814', 0.9),
        'v_white': vinyl('Sticker, white', '#ece6d6'),
        'v_black': vinyl('Sticker, black', '#121212'),
        'v_red': vinyl('Sticker, red', '#b3342b'),
        'v_blue': vinyl('Sticker, blue', '#2a4a86'),
        's_white': vinyl('Stencil, white', '#ece6d8', spray=True),
        's_red': vinyl('Stencil, red', '#b3342b', spray=True),
        's_blue': vinyl('Stencil, blue', '#2a4a86', spray=True),
        's_black': vinyl('Stencil, black', '#141414', spray=True),
        'masking': tape('Masking tape', '#d8cfb4'),
        'gaffer': tape('Gaffer tape', '#1b1b1b'),
    }
    return G


# ─── meshes ───────────────────────────────────────────────────────────────────

class Parts:
    """Boxes, cylinders, spheres, flat shapes and text, gathered into one mesh by material."""

    def __init__(self):
        self.bm = bmesh.new()
        self.keys = []

    def _slot(self, key):
        if key not in self.keys:
            self.keys.append(key)
        return self.keys.index(key)

    def _paint(self, verts, key, smooth=False):
        i = self._slot(key)
        for f in {f for v in verts for f in v.link_faces}:
            f.material_index = i
            f.smooth = smooth

    def box(self, key, size, centre, rot=None):
        v = bmesh.ops.create_cube(self.bm, size=1.0)['verts']
        bmesh.ops.scale(self.bm, vec=size, verts=v)
        if rot is not None:
            bmesh.ops.rotate(self.bm, verts=v, cent=(0, 0, 0), matrix=rot)
        bmesh.ops.translate(self.bm, vec=centre, verts=v)
        self._paint(v, key)

    def cyl(self, key, r, depth, centre, axis='Z', seg=24):
        v = bmesh.ops.create_cone(self.bm, cap_ends=True, cap_tris=True, segments=seg, radius1=r, radius2=r, depth=depth)['verts']
        if axis == 'Y':
            bmesh.ops.rotate(self.bm, verts=v, cent=(0, 0, 0), matrix=Matrix.Rotation(math.radians(90), 3, 'X'))
        elif axis == 'X':
            bmesh.ops.rotate(self.bm, verts=v, cent=(0, 0, 0), matrix=Matrix.Rotation(math.radians(90), 3, 'Y'))
        bmesh.ops.translate(self.bm, vec=centre, verts=v)
        self._paint(v, key, smooth=True)
        # Flat caps: smoothing them into the sides smears their reflections.
        ax = Vector({'X': (1, 0, 0), 'Y': (0, 1, 0)}.get(axis, (0, 0, 1)))
        for f in {f for vv in v for f in vv.link_faces}:
            f.normal_update()
            if abs(f.normal.dot(ax)) > 0.9:
                f.smooth = False

    def sphere(self, key, r, centre):
        v = bmesh.ops.create_uvsphere(self.bm, u_segments=12, v_segments=8, radius=r)['verts']
        bmesh.ops.translate(self.bm, vec=centre, verts=v)
        self._paint(v, key, smooth=True)

    def flat(self, key, pts, y):
        """A flat shape in the x-z plane at depth y, facing -y (the audience)."""
        out = []
        for p in pts:
            if not out or (Vector(p) - Vector(out[-1])).length > 1e-6:
                out.append(p)
        if (Vector(out[0]) - Vector(out[-1])).length < 1e-6:
            out.pop()
        f = self.bm.faces.new([self.bm.verts.new((x, y, z)) for x, z in out])
        if f.normal.y > 0:
            f.normal_flip()
        f.material_index = self._slot(key)

    def loops(self, key, loops, y):
        """
        Several closed outlines in the x-z plane, filled even-odd, so a loop
        inside another is a hole: a traced colour region with its holes.
        """
        edges = []
        for lp in loops:
            vs = [self.bm.verts.new((x, y, z)) for x, z in lp]
            edges += [self.bm.edges.new((vs[i], vs[(i + 1) % len(vs)])) for i in range(len(vs))]
        res = bmesh.ops.triangle_fill(self.bm, edges=edges, use_beauty=False, use_dissolve=False, normal=(0, -1, 0))
        i = self._slot(key)
        for f in res['geom']:
            if isinstance(f, bmesh.types.BMFace):
                f.material_index = i
                if f.normal.y > 0:
                    f.normal_flip()

    def text(self, key, body, font, size, centre, y, align='CENTER', width=None):
        """Text laid flat at depth y, facing -y. With `width`, scaled to fit it."""
        me = text_mesh(body, font, size, align)
        xs = [v.co.x for v in me.vertices]
        sc = 1.0
        if width and max(xs) - min(xs) > width:
            sc = width / (max(xs) - min(xs))
        n0 = len(self.bm.verts)
        self.bm.from_mesh(me)
        self.bm.verts.ensure_lookup_table()
        new = self.bm.verts[n0:]
        for v in new:
            v.co = Vector((centre[0] + v.co.x * sc, y, centre[1] + v.co.y * sc))
        i = self._slot(key)
        for f in {f for v in new for f in v.link_faces}:
            f.material_index = i
            if f.normal.y > 0:
                f.normal_flip()
        bpy.data.meshes.remove(me)

    def mesh(self, name, G):
        me = bpy.data.meshes.new(name)
        self.bm.to_mesh(me)
        self.bm.free()
        for k in self.keys:
            me.materials.append(G[k])
        return me


def text_mesh(body, font, size, align):
    cu = bpy.data.curves.new('text', 'FONT')
    cu.body = body
    cu.font = bpy.data.fonts.load(font, check_existing=True)
    cu.size = size
    cu.align_x = align
    cu.align_y = 'CENTER'
    ob = bpy.data.objects.new('text', cu)
    bpy.context.scene.collection.objects.link(ob)
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(ob.evaluated_get(dg))
    bpy.data.objects.remove(ob)
    bpy.data.curves.remove(cu)
    return me


def mc2300(G, size):
    """
    One MC 2300, origin at the middle of its front panel, facing -y. Parts are
    placed from the straight-on photograph of Budman (Sotheby's 2021, lot 36;
    .shots/reference/sothebys-lot36-budman-front.png), scaled off the 19"
    panel: about 0.030" a pixel. x across from the panel's centre, z up from it.
    """
    w, h, d = size
    P = Parts()
    t = 0.006
    P.box('gold', (w, t, h), (0, -t / 2, 0))
    P.box('chassis', (17.2 * IN, d - t, h - 0.3 * IN), (0, (d - t) / 2, 0))
    # The black strip along the bottom: three knurled knobs and the red rocker.
    sh = 3.5 * IN
    sz = -h / 2 + sh / 2
    P.box('black', (w, 0.003, sh), (0, -t - 0.0015, sz))
    for x, label in ((-5.7, 'LEFT GAIN'), (-1.7, 'RIGHT/MONO GAIN'), (2.6, 'METER RANGE')):
        P.cyl('knob', 0.6 * IN, 0.65 * IN, (x * IN, -t - 0.003 - 0.325 * IN, sz - 0.1 * IN), axis='Y', seg=40)
        P.text('badge', label, SANS, 0.11 * IN, (x * IN, sz + 0.95 * IN), -t - 0.0032, width=1.4 * IN)
        for k in range(6):
            for sx in (-1, 1):
                P.box('badge', (0.3 * IN, 0.0005, 0.02 * IN),
                      ((x + sx * 0.95) * IN, -t - 0.0032, sz + (0.65 - k * 0.24) * IN))
    P.box('red', (0.6 * IN, 0.3 * IN, 1.15 * IN), (5.9 * IN, -t - 0.003 - 0.15 * IN, sz - 0.1 * IN))
    P.text('badge', 'ON', SANS, 0.11 * IN, (6.55 * IN, sz + 0.35 * IN), -t - 0.0032)
    P.text('badge', 'OFF', SANS, 0.11 * IN, (6.6 * IN, sz - 0.6 * IN), -t - 0.0032)
    # The meters: black bezel, lit face with its scale, a needle, glass.
    mz = 2.7 * IN
    for mx in (-4.37 * IN, 1.2 * IN):
        P.box('black', (5.0 * IN, 0.003, 2.45 * IN), (mx, -t - 0.0015, mz))
        P.box('meter', (4.5 * IN, 0.002, 2.0 * IN), (mx, -t - 0.004, mz))
        for k in range(-5, 6):
            a = math.radians(k * 9)
            P.box('needle', (0.025 * IN, 0.0008, 0.16 * IN),
                  (mx + math.sin(a) * 1.9 * IN, -t - 0.0052, mz - 1.05 * IN + math.cos(a) * 1.9 * IN),
                  rot=Matrix.Rotation(-a, 3, 'Y'))
        P.text('print', 'POWER LEVEL', SANS, 0.17 * IN, (mx, mz - 0.25 * IN), -t - 0.0052)
        P.text('print', 'DECIBELS', SANS, 0.11 * IN, (mx, mz - 0.5 * IN), -t - 0.0052)
        a = math.radians(-40)
        P.box('needle', (0.035 * IN, 0.0008, 2.1 * IN),
              (mx + math.sin(a) * 1.05 * IN, -t - 0.0058, mz - 1.05 * IN + math.cos(a) * 1.05 * IN),
              rot=Matrix.Rotation(-a, 3, 'Y'))
        P.box('glass', (4.5 * IN, 0.0015, 2.0 * IN), (mx, -t - 0.0072, mz))
    P.text('print', '300/300  WATT  STEREO  POWER  AMPLIFIER', SANS, 0.28 * IN, (-0.3 * IN, -1.4 * IN),
           -t - 0.0003, width=14.0 * IN)
    # The badge, upper right: McIntosh over MC 2300, pale on black.
    P.box('black', (2.4 * IN, 0.002, 0.75 * IN), (5.7 * IN, -t - 0.001, 2.65 * IN))
    P.text('badge', 'McIntosh', SERIF, 0.5 * IN, (5.7 * IN, 2.65 * IN), -t - 0.0022, width=2.1 * IN)
    P.text('print', 'MC 2300', SANS, 0.22 * IN, (5.7 * IN, 1.95 * IN), -t - 0.0003)
    # Rack handles, bare aluminium; slotted rack ears at the panel's edges.
    for sx in (-1, 1):
        hx = sx * 8.75 * IN
        for z in (3.1, -1.3):
            P.box('alu', (0.55 * IN, 1.2 * IN, 0.5 * IN), (hx, -t - 0.6 * IN, z * IN))
        P.box('alu', (0.55 * IN, 0.45 * IN, 4.9 * IN), (hx, -t - 1.2 * IN, 0.9 * IN))
        for z in (4.4, 1.4, -1.6, -4.4):
            P.box('dark', (0.35 * IN, 0.001, 0.16 * IN), (sx * 9.25 * IN, -t - 0.0005, z * IN))
    return P.mesh('MC 2300', G)


def anvil(G, w, h, d, open_front=False, style='orange'):
    """
    An Anvil case, foot centre at the origin, front at -d/2: laminate,
    riveted aluminium edging, a lid seam with its latches (or an open rack
    front with rails), recessed end handles, casters.

    'orange' follows Sotheby's lot 43: ball corners, steel latch dishes.
    'black' follows lot 36, Budman: folded steel corners and latch dishes,
    both rusted, and a piano hinge across the back.
    """
    P = Parts()
    paint = {'black': 'paint_black', 'white': 'paint_white'}.get(style, 'paint')
    corner = 'rust' if style == 'black' else 'alu'
    dish = 'rust' if style == 'black' else 'steel'
    z0, z1 = CASTER_H, h
    hb = z1 - z0
    for sx in (-1, 1):
        for sy in (-1, 1):
            cx, cy = sx * (w / 2 - 0.065), sy * (d / 2 - 0.065)
            P.box('steel', (0.095, 0.095, 0.006), (cx, cy, z0 - 0.003))
            P.box('steel', (0.06, 0.05, 0.022), (cx, cy, z0 - 0.017))
            for fx in (-1, 1):
                P.box('steel', (0.005, 0.05, 0.07), (cx + fx * 0.024, cy, z0 - 0.045))
            P.cyl('rubber', 0.046, 0.036, (cx, cy, 0.046), axis='X', seg=20)
    if open_front:
        T = PANEL
        P.box(paint, (T, d, hb), (-w / 2 + T / 2, 0, z0 + hb / 2))
        P.box(paint, (T, d, hb), (w / 2 - T / 2, 0, z0 + hb / 2))
        P.box(paint, (w, d, T), (0, 0, z1 - T / 2))
        P.box(paint, (w, d, T), (0, 0, z0 + T / 2))
        P.box(paint, (w, T, hb), (0, d / 2 - T / 2, z0 + hb / 2))
        P.box('interior', (w - 2 * T, 0.002, hb - 2 * T), (0, d / 2 - T - 0.001, z0 + hb / 2))
        for sx in (-1, 1):
            P.box('black', (0.022, 0.012, hb - 2 * T), (sx * (w / 2 - T - 0.011), -d / 2 + RACK_SETBACK + 0.006, z0 + hb / 2))
    else:
        P.box(paint, (w, d, hb), (0, 0, z0 + hb / 2))
    # Aluminium angle along all twelve edges, ball corners on all eight.
    e = 0.022
    for sx in (-1, 1):
        for sy in (-1, 1):
            P.box('alu', (e, e, hb), (sx * (w / 2 - e / 2 + 0.002), sy * (d / 2 - e / 2 + 0.002), z0 + hb / 2))
        for sz in (z0, z1):
            P.box('alu', (e, d, e), (sx * (w / 2 - e / 2 + 0.002), 0, sz - math.copysign(e / 2 - 0.002, sz - z0 - hb / 2)))
    for sy in (-1, 1):
        for sz in (z0, z1):
            P.box('alu', (w, e, e), (0, sy * (d / 2 - e / 2 + 0.002), sz - math.copysign(e / 2 - 0.002, sz - z0 - hb / 2)))
    for sx in (-1, 1):
        for sy in (-1, 1):
            for sz in (z0, z1):
                if style == 'black':
                    # A folded corner: three plates meeting at the corner.
                    q, t = 0.075, 0.004
                    up = 1 if sz == z1 else -1
                    P.box(corner, (q, q, t), (sx * (w / 2 - q / 2 + 0.004), sy * (d / 2 - q / 2 + 0.004), sz + up * 0.002))
                    P.box(corner, (t, q, q), (sx * (w / 2 + 0.003), sy * (d / 2 - q / 2 + 0.004), sz - up * (q / 2 - 0.004)))
                    P.box(corner, (q, t, q), (sx * (w / 2 - q / 2 + 0.004), sy * (d / 2 + 0.003), sz - up * (q / 2 - 0.004)))
                else:
                    P.sphere(corner, 0.026, (sx * w / 2, sy * d / 2, sz))
    # Rivets down the front edging.
    for sx in (-1, 1):
        n = max(2, int(hb / 0.075))
        for k in range(1, n):
            P.sphere('alu', 0.0035, (sx * (w / 2 - 0.009), -d / 2 - 0.001, z0 + hb * k / n))
    # The lid seam: a band of extrusion round the case, latches across it.
    seam = z0 + hb * 0.78
    if not open_front:
        for sy in (-1, 1):
            P.box('alu', (w + 0.004, 0.006, 0.026), (0, sy * (d / 2 + 0.001), seam))
        for sx in (-1, 1):
            P.box('alu', (0.006, d + 0.004, 0.026), (sx * (w / 2 + 0.001), 0, seam))
        for lx in (-0.3, 0.3):
            P.box(dish, (0.13, 0.006, 0.155), (lx * w, -d / 2 - 0.002, seam))
            P.box('alu', (0.065, 0.014, 0.08), (lx * w, -d / 2 - 0.008, seam - 0.01))
            P.cyl('alu', 0.014, 0.014, (lx * w, -d / 2 - 0.018, seam), axis='Y', seg=12)
        n = max(2, int(w / 0.07))
        for k in range(1, n):
            P.sphere('alu', 0.0035, (-w / 2 + w * k / n, -d / 2 - 0.004, seam + 0.009))
            P.sphere('alu', 0.0035, (-w / 2 + w * k / n, -d / 2 - 0.004, seam - 0.009))
        if style == 'black':
            # Piano hinge across the back.
            P.box('alu', (w * 0.82, 0.006, 0.05), (0, d / 2 + 0.003, seam))
            P.cyl('alu', 0.006, w * 0.82, (0, d / 2 + 0.006, seam), axis='X', seg=10)
    # Recessed handles in both ends.
    for sx in (-1, 1):
        P.box('steel', (0.006, 0.17, 0.1), (sx * (w / 2 + 0.002), 0, z0 + hb * 0.55))
        P.box('dark', (0.006, 0.13, 0.05), (sx * (w / 2 + 0.004), 0, z0 + hb * 0.55))
    return P.mesh(f'Anvil case {w:.2f}x{h:.2f}x{d:.2f}', G)


def zero_case(G, colour, size=(21 * IN, 20 * IN, 19 * IN)):
    """
    A ZERO metal case for one MC 2300 (Sotheby's lots 34-35): a painted
    aluminium cube with rounded edges, the lid meeting the base low down, draw
    latches across the seam on all four sides, and a handle in each end.
    Foot centre at the origin, front at -d/2.
    """
    w, h, d = size
    P = Parts()
    key = 'zero_' + colour
    v = bmesh.ops.create_cube(P.bm, size=1.0)['verts']
    bmesh.ops.scale(P.bm, vec=(w, d, h), verts=v)
    bmesh.ops.translate(P.bm, vec=(0, 0, h / 2), verts=v)
    edges = list({e for vv in v for e in vv.link_edges})
    bmesh.ops.bevel(P.bm, geom=v + edges, offset=0.025, segments=3, affect='EDGES')
    P._paint(list(P.bm.verts), key, smooth=True)
    seam = h * 0.36
    # The seam: a lip round the case where the lid meets the base.
    P.box('alu', (w + 0.004, d + 0.004, 0.012), (0, 0, seam))
    for side, (nx, ny, span) in {'front': (0, -1, w), 'back': (0, 1, w), 'left': (-1, 0, d), 'right': (1, 0, d)}.items():
        for f in (-0.32, 0.32):
            x = nx * (w / 2 + 0.006) + (f * span if ny else 0)
            y = ny * (d / 2 + 0.006) + (f * span if nx else 0)
            sx, sy = (0.012, 0.045) if nx else (0.045, 0.012)
            P.box('steel', (sx, sy, 0.07), (x, y, seam))
        if nx:
            P.box('steel', (0.015, 0.12, 0.035), (nx * (w / 2 + 0.01), 0, h * 0.68))
    return P.mesh(f'ZERO case {colour}', G)


def tape_label(P, rng, centre, y, text, key='masking', length=2.6 * IN):
    """A strip of tape with something written on it in felt-tip."""
    cx, cz = centre
    W = (1.9 if key == 'duct' else 0.85) * IN
    P.flat(key, [(cx - length / 2, cz - W / 2), (cx + length / 2, cz - W / 2),
                 (cx + length / 2, cz + W / 2), (cx - length / 2, cz + W / 2)], y)
    P.text('marker', text, SANS, W * 0.62, (cx, cz), y - 0.0003, width=length * 0.8)


# ─── stickers, stencils and tape ──────────────────────────────────────────────

def arc_pts(r, a0, a1, cx=0.0, cz=0.0, step=math.pi / 48):
    n = max(2, int(abs(a1 - a0) / step))
    return [(cx + r * math.cos(a0 + (a1 - a0) * i / n), cz + r * math.sin(a0 + (a1 - a0) * i / n)) for i in range(n + 1)]


def bolt_fields(S, R):
    """
    The 1969 mark's blue and red fields, radius R, y up. The same path as
    stencilMap() in src/materials/textures.ts: worked in the canvas's y-down
    frame, where its arcs run anticlockwise, then turned up the right way.
    """
    pts, k = S['bolt'], S['boltBottom']
    P = lambda i: (pts[i][0] * R, pts[i][1] * R)
    ang = lambda i: math.atan2(pts[i][1], pts[i][0])

    def ccw(a0, a1):  # the canvas's anticlockwise: angle decreasing from a0 to a1
        while a1 > a0:
            a1 -= 2 * math.pi
        return arc_pts(R, a0, a1)

    blue = [P(i) for i in range(k + 1)] + ccw(ang(k), ang(0))
    red = [P(k)] + [P(i) for i in range(k + 1, len(pts))] + [P(0)] + ccw(ang(0), ang(k))
    flip = lambda poly: [(x, -y) for x, y in poly]
    return flip(blue), flip(red)


def circle(r, cx=0.0, cz=0.0):
    return arc_pts(r, 0, 2 * math.pi, cx, cz)[:-1]


def mark_1969(G, S, P, centre, y, sprayed=True):
    """The bolt mark at its true 5 1/2": a white disc, the 5" red and blue field."""
    D = S['boltDiameter']
    kind = 's_' if sprayed else 'v_'
    cx, cz = centre
    P.flat(kind + 'white', circle(D / 2, cx, cz), y)
    blue, red = bolt_fields(S, D / 2 * 5 / 5.5)
    P.flat(kind + 'blue', [(cx + x, cz + z) for x, z in blue], y - 0.0002)
    P.flat(kind + 'red', [(cx + x, cz + z) for x, z in red], y - 0.0002)


_SYF = None


def syf_trace():
    """The skull-and-bolt, traced by blender/trace_mark.py: loops per colour, outer radius 1, y up."""
    global _SYF
    if _SYF is None:
        with open(os.path.join(MARKS, 'steal_your_face.json')) as f:
            _SYF = json.load(f)['layers']
    return _SYF


def syf_sticker(G, S, P, centre, height, y):
    """The skull-and-bolt in colour, as a die-cut sticker with a white margin. An artistic choice."""
    R = height / 2 / 1.04
    cx, cz = centre
    T = lambda lp: [(cx + x * R, cz + z * R) for x, z in lp]
    P.flat('v_white', circle(1.04 * R, cx, cz), y)
    for colour in ('black', 'white', 'red', 'blue'):
        P.loops('v_' + colour, [T(lp) for lp in syf_trace()[colour]], y - 0.0002)


def syf_stamp(G, P, centre, height, y, paint='s_white'):
    """
    The skull-and-bolt sprayed through a stencil in one colour, as on the back
    of Budman's case (Sotheby's 2021, lot 36): the design's linework in pale
    paint, the case showing through everywhere else. An artistic choice.
    """
    R = height / 2
    cx, cz = centre
    P.loops(paint, [[(cx + x * R, cz + z * R) for x, z in lp] for lp in syf_trace()['black']], y)


def rounded_rect(w, h, r, cx=0.0, cz=0.0):
    pts = []
    for (sx, sz, a0) in ((1, 1, 0), (-1, 1, 90), (-1, -1, 180), (1, -1, 270)):
        c = (cx + sx * (w / 2 - r), cz + sz * (h / 2 - r))
        pts += arc_pts(r, math.radians(a0), math.radians(a0 + 90), *c, step=math.pi / 12)
    return pts


def word_sticker(G, P, centre, width, y):
    """The black "GRATEFUL DEAD" sticker: a big G, RATEFUL over DEAD. An artistic choice."""
    h = width * 0.32
    cx, cz = centre
    P.flat('v_white', rounded_rect(width + 0.006, h + 0.006, 0.006, cx, cz), y)
    P.flat('v_black', rounded_rect(width, h, 0.005, cx, cz), y - 0.0002)
    P.text('v_white', 'G', SERIF, h * 1.1, (cx - width * 0.34, cz - h * 0.02), y - 0.0004)
    P.text('v_white', 'RATEFUL', SERIF, h * 0.42, (cx + width * 0.08, cz + h * 0.2), y - 0.0004, width=width * 0.66)
    P.text('v_white', 'DEAD', SERIF, h * 0.42, (cx + width * 0.12, cz - h * 0.24), y - 0.0004, width=width * 0.4)


_WORD = None


def stencil_wordmark(P, centre, width, y, paint='stamp'):
    """
    "GRATEFUL" over "DEAD", sprayed through a stencil, as on Budman's case
    (lot 36): traced from the photograph by blender/trace_mark.py --stencil.
    An artistic choice.
    """
    global _WORD
    if _WORD is None:
        with open(os.path.join(MARKS, 'grateful_dead_stencil.json')) as f:
            _WORD = json.load(f)['layers']['paint']
    cx, cz = centre
    P.loops(paint, [[(cx + x * width, cz + z * width) for x, z in lp] for lp in _WORD], y)


def tape_strip(P, rng, centre, y, gaffer=False):
    L = rng.uniform(2.5, 7.0) * IN
    W = (2.0 if gaffer else 1.0) * IN
    a = rng.uniform(-0.25, 0.25)
    pts = [(-L / 2, -W / 2), (L / 2, -W / 2), (L / 2, W / 2), (-L / 2, W / 2)]
    c, s = math.cos(a), math.sin(a)
    P.flat('gaffer' if gaffer else 'masking', [(centre[0] + x * c - z * s, centre[1] + x * s + z * c) for x, z in pts], y)


def decal_object(name, P, G, coll, parent, loc, rot_z=0.0):
    o = bpy.data.objects.new(name, P.mesh(name, G))
    coll.objects.link(o)
    o.parent = parent
    o.location = loc
    o.rotation_euler = (0, 0, rot_z)
    return o


# ─── placing it ───────────────────────────────────────────────────────────────

def draw_decals(G, S, P, decals, y):
    """
    One face's marks, from the plan (src/geometry/roadgear.ts, via scene.json):
    face coordinates x across and z up, laid at depth y and stepping toward
    the viewer so later marks sit on earlier ones.
    """
    for i, d in enumerate(decals):
        yy = y - 0.0004 * i
        at = d['at']
        k = d['kind']
        if k == 'tape':
            L, W, a = d['length'], d['width'], d['angle']
            c, s_ = math.cos(a), math.sin(a)
            pts = [(-L / 2, -W / 2), (L / 2, -W / 2), (L / 2, W / 2), (-L / 2, W / 2)]
            P.flat(d['tape'], [(at[0] + x * c - z * s_, at[1] + x * s_ + z * c) for x, z in pts], yy)
            if d.get('text'):
                P.text('marker', d['text'], SANS, W * 0.62, tuple(at), yy - 0.0003, width=L * 0.8)
        elif k == 'skullSticker':
            syf_sticker(G, S, P, tuple(at), d['height'], yy)
        elif k == 'skullStamp':
            syf_stamp(G, P, tuple(at), d['height'], yy, paint=d['paint'])
        elif k == 'wordSticker':
            word_sticker(G, P, tuple(at), d['width'], yy)
        elif k == 'wordStencil':
            stencil_wordmark(P, tuple(at), d['width'], yy, paint=d['paint'])
        elif k == 'stencilText':
            P.text(d['paint'], d['text'], STENCIL, d['size'], tuple(at), yy)
        elif k == 'bolt':
            mark_1969(G, S, P, tuple(at), yy)


def build_gear(S, coll, B):
    """
    Racks of amps in their cases, the loose cases, and what is stuck on them,
    all as the plan in scene.json lays them out (src/geometry/roadgear.ts):
    the explorer builds the same gear from the same plan.
    """
    G = materials()
    R = S['gear']
    deck = S['deck']['y']
    aw, ah, ad = S['ampSize']
    amp = mc2300(G, (aw, ah, ad))
    zw, zh, zd = R['zeroSize']

    rack_cases = {}
    for n, r in enumerate(R['plan']['racks']):
        rw, rh, rd = r['size']
        key = (r['style'], rw, rh, rd)
        if key not in rack_cases:
            rack_cases[key] = anvil(G, rw, rh, rd, open_front=True, style=r['style'])
        front = B(r['front'])
        # The amps' fronts on the plan's front plane; the case behind them.
        base = Vector((front.x, front.y - RACK_SETBACK + rd / 2, deck))
        case = bpy.data.objects.new(f'rack.{n:02d}', rack_cases[key])
        coll.objects.link(case)
        case.location = base
        for k, a_ in enumerate(r['amps']):
            a = bpy.data.objects.new(f'rack.{n:02d}.amp.{k}', amp)
            coll.objects.link(a)
            a.parent = case
            a.location = (0, -rd / 2 + RACK_SETBACK, a_['y'])
            if a_['decals']:
                P = Parts()
                draw_decals(G, S, P, a_['decals'], -0.0072)
                decal_object(f'rack.{n:02d}.amp.{k}.labels', P, G, coll, a, (0, 0, 0))
        for e in r['ends']:
            if not e['decals']:
                continue
            P = Parts()
            draw_decals(G, S, P, e['decals'], -0.0004)
            # The decal's -y face turned to face out of this end of the case.
            side = e['side']
            decal_object(f'rack.{n:02d}.end.{side}', P, G, coll, case,
                         (side * (rw / 2 + 0.0005), 0, 0), rot_z=math.radians(90 * side))

    zeros = {col: zero_case(G, col, (zw, zh, zd)) for col in ('orange', 'purple')}
    for i, z in enumerate(R['plan']['zeros']):
        o = bpy.data.objects.new(f'zero.{i:02d}', zeros[z['colour']])
        coll.objects.link(o)
        o.location = B(z['pos'])
        o.rotation_euler = (0, 0, z['rot'])
        if z['decals']:
            P = Parts()
            draw_decals(G, S, P, z['decals'], -zd / 2 - 0.006)
            decal_object(f'zero.{i:02d}.marks', P, G, coll, o, (0, 0, 0))

    for i, c in enumerate(R['plan']['cases']):
        w, h, d = c['size']
        case = bpy.data.objects.new(f'case.{i:02d}', anvil(G, w, h, d, style=c['style']))
        coll.objects.link(case)
        case.location = B(c['pos'])
        case.rotation_euler = (0, 0, c['rot'])
        P = Parts()
        draw_decals(G, S, P, c['front'], -d / 2 - 0.0005)
        decal_object(f'case.{i:02d}.front', P, G, coll, case, (0, 0, 0))

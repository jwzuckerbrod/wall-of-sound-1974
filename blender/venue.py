"""
The Wall outdoors, as most of the summer 1974 photographs show it: daylight,
open ground, and blue tarps on the scaffold.

The tarps follow the photographs (docs/qa-findings.md §7, §10): sheets of blue
polythene over the back of the towers and both ends, at UC Santa Barbara on
25 May, Oakland on 8 June and Des Moines on 16 June, and a strip along the top
at Oakland. They are hung here one sheet to a scaffold bay, tied at every
lift, bellying between the ties.

Tie-dyed panels hang high on the front of the scaffold, two over each side,
below the tarp strip: Oakland, 8 June, and the Hollywood Bowl, 21 July. The
config confirms Courtenay Pollock's tie-dyes on the structure
(materials.tieDye). The patterns here are generic radial and spiral dyeing
made in the shader, not copies of his designs.

Everything is placed from scene.json's scaffold tubes, so it follows the
structure if the config changes. Called from build_scene.py with
--venue outdoor; the arena stays the default, for Pechner's 17 May photograph.
"""
import math

import bmesh
import bpy
from mathutils import Vector

SUN_ELEVATION = math.radians(38)   # mid-afternoon
SUN_AZIMUTH = math.radians(-32)    # from the audience, a little to their left


def srgb(hex_):
    out = []
    for i in (1, 3, 5):
        c = int(hex_[i:i + 2], 16) / 255
        out.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
    return (*out, 1.0)


def sun_vector():
    """Unit vector toward the sun, Blender frame (audience at -Y)."""
    ce = math.cos(SUN_ELEVATION)
    return Vector((math.sin(SUN_AZIMUTH) * ce, -math.cos(SUN_AZIMUTH) * ce, math.sin(SUN_ELEVATION)))


# ─── materials ────────────────────────────────────────────────────────────────

def _noise(nt, links, scale, detail=6.0):
    n = nt.new('ShaderNodeTexNoise')
    n.inputs['Scale'].default_value = scale
    n.inputs['Detail'].default_value = detail
    tc = nt.new('ShaderNodeTexCoord')
    links.new(tc.outputs['Object'], n.inputs['Vector'])
    return n.outputs['Fac']


def _mix(nt, links, a, b, fac):
    m = nt.new('ShaderNodeMix')
    m.data_type = 'RGBA'
    if isinstance(a, str):
        m.inputs['A'].default_value = srgb(a)
    else:
        links.new(a, m.inputs['A'])
    m.inputs['B'].default_value = srgb(b)
    links.new(fac, m.inputs['Factor'])
    return m.outputs['Result']


def _band(nt, links, fac, lo, hi):
    r = nt.new('ShaderNodeMapRange')
    r.inputs['From Min'].default_value = lo
    r.inputs['From Max'].default_value = hi
    r.clamp = True
    links.new(fac, r.inputs['Value'])
    return r.outputs['Result']


def tarp_material():
    """Blue polythene: faded in patches, grimy low down, thin enough to glow with the sun behind it."""
    m = bpy.data.materials.new('Tarp, blue polythene')
    m.use_nodes = True
    nt, links = m.node_tree.nodes, m.node_tree.links
    b = nt['Principled BSDF']
    c = _mix(nt, links, '#24529e', '#3f74c2', _band(nt, links, _noise(nt, links, 0.8, 4), 0.35, 0.7))
    c = _mix(nt, links, c, '#2a3f5c', _band(nt, links, _noise(nt, links, 3.0, 8), 0.6, 0.85))
    links.new(c, b.inputs['Base Color'])
    b.inputs['Roughness'].default_value = 0.42
    b.inputs['Sheen Weight'].default_value = 0.1
    b.inputs['Transmission Weight'].default_value = 0.08
    b.inputs['Thin Wall'].default_value = True
    return m


def ground_material():
    """A dry summer field: straw, bare earth, a little green."""
    m = bpy.data.materials.new('Ground, summer field')
    m.use_nodes = True
    nt, links = m.node_tree.nodes, m.node_tree.links
    b = nt['Principled BSDF']
    c = _mix(nt, links, '#8a7a4c', '#6b5d3a', _band(nt, links, _noise(nt, links, 0.05, 6), 0.4, 0.7))
    c = _mix(nt, links, c, '#556035', _band(nt, links, _noise(nt, links, 0.02, 4), 0.55, 0.8))
    links.new(c, b.inputs['Base Color'])
    b.inputs['Roughness'].default_value = 0.95
    bump = nt.new('ShaderNodeBump')
    bump.inputs['Strength'].default_value = 0.3
    links.new(_noise(nt, links, 40.0, 8), bump.inputs['Height'])
    links.new(bump.outputs['Normal'], b.inputs['Normal'])
    return m


# ─── tarps ────────────────────────────────────────────────────────────────────

def _h(i, j=0):
    """A cheap repeatable hash in [0, 1)."""
    return (math.sin(i * 127.1 + j * 311.7) * 43758.5453) % 1.0


def tarp_sheet(name, mat, origin, u, v, out, width, height, ties, seed, coll, res=0.08, crease=1.0):
    """
    One sheet: `width` along u, `height` along v (up), bellying toward `out`
    between the tie heights (metres above the sheet's foot), creased below
    each tie.
    """
    nu, nv = max(2, int(width / res)), max(2, int(height / res))
    bm = bmesh.new()
    grid = []
    phase = _h(seed) * 6.28
    belly = 0.07 + 0.08 * _h(seed, 1)
    for j in range(nv + 1):
        b = height * j / nv
        # Where between two ties this point hangs: 0 at a tie, 1 at the next.
        lo = max([t for t in ties if t <= b], default=0.0)
        hi = min([t for t in ties if t > b], default=height)
        t = (b - lo) / max(hi - lo, 1e-6)
        row = []
        for i in range(nu + 1):
            a = width * i / nu
            edge = math.sin(math.pi * a / width)          # pinned at the bay's uprights
            d = belly * math.sin(math.pi * t) * edge
            # Creases: two irregular sets, so the folds don't read as corrugation.
            d += crease * 0.02 * math.sin(2 * math.pi * a / (0.35 + 0.15 * _h(seed, 2)) + phase + 3 * t) * (0.3 + t) * (0.5 + 0.5 * math.sin(a * 1.7 + phase))
            d += crease * 0.01 * math.sin(2 * math.pi * a / (0.13 + 0.05 * _h(seed, 3)) + phase * 2 + 5 * t) * t
            row.append(bm.verts.new(origin + u * a + v * b + out * d))
        grid.append(row)
    for j in range(nv):
        for i in range(nu):
            f = bm.faces.new((grid[j][i], grid[j][i + 1], grid[j + 1][i + 1], grid[j + 1][i]))
            f.smooth = True
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    me.materials.append(mat)
    o = bpy.data.objects.new(name, me)
    coll.objects.link(o)
    return o


def scaffold_extent(S):
    """The towers' box from the exported tubes: x and z of the full-height steel, and its top."""
    tubes = [(t['a'], t['b']) for t in S['tubes']]
    top = max(max(a[1], b[1]) for a, b in tubes)
    tall = [(a, b) for a, b in tubes if max(a[1], b[1]) > top - 0.05]
    xs = [p[0] for a, b in tall for p in (a, b)]
    zs = [p[2] for a, b in tall for p in (a, b)]
    uprights = sorted({round(p[0], 2) for a, b in tubes for p in (a, b)
                       if abs(a[0] - b[0]) < 1e-3 and abs(a[2] - b[2]) < 1e-3 and min(xs) - 0.01 <= p[0] <= max(xs) + 0.01})
    levels = sorted({round(a[1], 2) for a, b in tubes if abs(a[1] - b[1]) < 1e-3 and a[1] > S['deck']['y'] + 0.1})
    return min(xs), max(xs), min(zs), max(zs), top, uprights, levels


def build_tarps(S, coll, B):
    mat = tarp_material()
    deck = S['deck']['y']
    x0, x1, z0, z1, top, xs, levels = scaffold_extent(S)
    H = top - deck
    ties = [y - deck for y in levels if deck < y < top]
    # Back of the towers: one sheet per bay, just behind the steel, bellying upstage.
    for k, (a, b) in enumerate(zip(xs, xs[1:])):
        tarp_sheet(f'tarp.back.{k:02d}', mat, B((a - 0.03, deck, z0 - 0.06)), Vector((1, 0, 0)),
                   Vector((0, 0, 1)), Vector((0, 1, 0)), b - a + 0.06, H, ties, 11 + k, coll)
    # Both ends, across the towers' depth, bellying outward.
    for side, x in (('left', x0 - 0.06), ('right', x1 + 0.06)):
        out = Vector((-1 if side == 'left' else 1, 0, 0))
        tarp_sheet(f'tarp.{side}', mat, B((x, deck, z0)), Vector((0, -1, 0)), Vector((0, 0, 1)), out,
                   z1 - z0, H, ties, 53 if side == 'left' else 71, coll)
    # A strip along the top of the front, one lift deep (Oakland, 8 June).
    if len(levels) >= 2:
        lift = top - levels[-2]
        tarp_sheet('tarp.valance', mat, B((x0 - 0.03, levels[-2], z1 + 0.05)), Vector((1, 0, 0)),
                   Vector((0, 0, 1)), Vector((0, -1, 0)), x1 - x0 + 0.06, lift, [lift * 0.5], 97, coll, crease=0.35)


# ─── tie-dyes ─────────────────────────────────────────────────────────────────

# Scaled off the Oakland photograph: about 4.3 ft wide and 8 ft tall. The x
# places keep each panel above the stacks below it rather than in front of
# them, clear of the three 34 ft columns.
TIEDYE_X = (-8.6, -6.1, 6.4, 8.9)
TIEDYE_W, TIEDYE_H = 1.3, 2.46

PALETTES = (
    ('#c8202a', '#f07a1a', '#f4cf2a', '#2f9a4a', '#2456b8', '#6a2e9a'),
    ('#7a1fa0', '#d62a7a', '#f2a02a', '#f6e04a', '#38a0c8', '#1f3f9a'),
    ('#1f6fb8', '#29a8a0', '#9ac83a', '#f4d43a', '#e8562a', '#a8203a'),
    ('#e0402a', '#f4b02a', '#3aa848', '#2a78c8', '#8a2aa8', '#d83a8a'),
)


def tiedye_material(k):
    """
    Dye bands round a centre, spiral or concentric, their edges bled by noise,
    with pale crazing where the dye didn't take.
    """
    m = bpy.data.materials.new(f'Tie-dye {k}')
    m.use_nodes = True
    nt, links = m.node_tree.nodes, m.node_tree.links
    b = nt['Principled BSDF']
    uv = nt.new('ShaderNodeTexCoord')
    # Centre the panel's UVs on a point a little off middle, panel by panel.
    sub = nt.new('ShaderNodeVectorMath')
    sub.operation = 'SUBTRACT'
    sub.inputs[1].default_value = (0.5 + 0.08 * (_h(k, 7) - 0.5), 0.55 + 0.1 * (_h(k, 8) - 0.5), 0)
    links.new(uv.outputs['UV'], sub.inputs[0])
    # The panel is about twice as tall as wide: square up the coordinates.
    sq = nt.new('ShaderNodeVectorMath')
    sq.operation = 'MULTIPLY'
    sq.inputs[1].default_value = (TIEDYE_W / TIEDYE_H, 1.0, 1.0)
    links.new(sub.outputs[0], sq.inputs[0])
    # Bleed: wobble the coordinates with noise.
    n = nt.new('ShaderNodeTexNoise')
    n.inputs['Scale'].default_value = 6.0
    n.inputs['Detail'].default_value = 6.0
    links.new(uv.outputs['UV'], n.inputs['Vector'])
    wob = nt.new('ShaderNodeVectorMath')
    wob.operation = 'MULTIPLY_ADD'
    wob.inputs[1].default_value = (0.05, 0.05, 0)
    links.new(n.outputs['Color'], wob.inputs[0])
    links.new(sq.outputs[0], wob.inputs[2])
    sep = nt.new('ShaderNodeSeparateXYZ')
    links.new(wob.outputs[0], sep.inputs[0])
    # Polar: radius and angle.
    ln = nt.new('ShaderNodeVectorMath')
    ln.operation = 'LENGTH'
    links.new(wob.outputs[0], ln.inputs[0])
    ang = nt.new('ShaderNodeMath')
    ang.operation = 'ARCTAN2'
    links.new(sep.outputs['Y'], ang.inputs[0])
    links.new(sep.outputs['X'], ang.inputs[1])
    # Spiral (even panels) or rings with petals (odd): bands = r * f + angle term.
    rings = nt.new('ShaderNodeMath')
    rings.operation = 'MULTIPLY'
    rings.inputs[1].default_value = 9.0 + 4.0 * _h(k, 9)
    links.new(ln.outputs['Value'], rings.inputs[0])
    if k % 2 == 0:
        tw = nt.new('ShaderNodeMath')
        tw.operation = 'MULTIPLY'
        tw.inputs[1].default_value = 1.0 / math.pi
        links.new(ang.outputs[0], tw.inputs[0])
    else:
        pet = nt.new('ShaderNodeMath')
        pet.operation = 'MULTIPLY'
        pet.inputs[1].default_value = 8.0
        links.new(ang.outputs[0], pet.inputs[0])
        tw = nt.new('ShaderNodeMath')
        tw.operation = 'SINE'
        links.new(pet.outputs[0], tw.inputs[0])
    band = nt.new('ShaderNodeMath')
    band.operation = 'ADD'
    links.new(rings.outputs[0], band.inputs[0])
    links.new(tw.outputs[0], band.inputs[1])
    fr = nt.new('ShaderNodeMath')
    fr.operation = 'FRACT'
    links.new(band.outputs[0], fr.inputs[0])
    ramp = nt.new('ShaderNodeValToRGB')
    pal = PALETTES[k % len(PALETTES)]
    els = ramp.color_ramp.elements
    while len(els) < len(pal):
        els.new(0.5)
    for i, hexc in enumerate(pal):
        els[i].position = i / len(pal)
        els[i].color = srgb(hexc)
    ramp.color_ramp.interpolation = 'EASE'
    links.new(fr.outputs[0], ramp.inputs['Fac'])
    # Crazing: pale veins where the folds kept the dye out.
    v = nt.new('ShaderNodeTexVoronoi')
    v.feature = 'DISTANCE_TO_EDGE'
    v.inputs['Scale'].default_value = 7.0
    links.new(wob.outputs[0], v.inputs['Vector'])
    vein = _band(nt, links, v.outputs['Distance'], 0.02, 0.0)
    col = nt.new('ShaderNodeMix')
    col.data_type = 'RGBA'
    links.new(ramp.outputs['Color'], col.inputs['A'])
    col.inputs['B'].default_value = srgb('#efe6d2')
    fac = nt.new('ShaderNodeMath')
    fac.operation = 'MULTIPLY'
    fac.inputs[1].default_value = 0.7
    links.new(vein, fac.inputs[0])
    links.new(fac.outputs[0], col.inputs['Factor'])
    links.new(col.outputs['Result'], b.inputs['Base Color'])
    b.inputs['Roughness'].default_value = 0.85
    b.inputs['Sheen Weight'].default_value = 0.12
    b.inputs['Transmission Weight'].default_value = 0.12
    b.inputs['Thin Wall'].default_value = True
    return m


def cloth_panel(name, mat, top_centre, width, height, seed, coll, res=0.04):
    """A cloth hung from its top edge: gentle vertical folds, a slight sway, UVs over the whole panel."""
    nu, nv = int(width / res), int(height / res)
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.new()
    grid = []
    for j in range(nv + 1):
        t = j / nv                       # 0 at the top, 1 at the hem
        row = []
        for i in range(nu + 1):
            a = i / nu
            x = (a - 0.5) * width
            fold = 0.035 * math.sin(2 * math.pi * a * 3 + _h(seed) * 6) * (0.2 + t)
            fold += 0.012 * math.sin(2 * math.pi * a * 9 + _h(seed, 1) * 6) * t
            sway = 0.05 * t * t * (_h(seed, 2) - 0.5)
            row.append((bm.verts.new(top_centre + Vector((x, -(fold + sway), -t * height))), (a, 1 - t)))
        grid.append(row)
    for j in range(nv):
        for i in range(nu):
            cell = (grid[j][i], grid[j][i + 1], grid[j + 1][i + 1], grid[j + 1][i])
            f = bm.faces.new([c[0] for c in cell])
            f.smooth = True
            for loop, c in zip(f.loops, cell):
                loop[uvl].uv = c[1]
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    me.materials.append(mat)
    o = bpy.data.objects.new(name, me)
    coll.objects.link(o)
    return o


def build_tiedyes(S, coll, B):
    deck = S['deck']['y']
    x0, x1, z0, z1, top, xs, levels = scaffold_extent(S)
    hang = levels[-2] if len(levels) >= 2 else top     # just under the tarp strip
    for k, x in enumerate(TIEDYE_X):
        cloth_panel(f'tie-dye.{k}', tiedye_material(k), B((x, hang, z1 + 0.22)), TIEDYE_W, TIEDYE_H, 31 + k, coll)


# ─── sky and ground ───────────────────────────────────────────────────────────

def build_outdoor(S, coll, B):
    g = bmesh.new()
    bmesh.ops.create_grid(g, x_segments=1, y_segments=1, size=2000)
    me = bpy.data.meshes.new('ground')
    g.to_mesh(me)
    g.free()
    me.materials.append(ground_material())
    o = bpy.data.objects.new('ground', me)
    coll.objects.link(o)
    o.location = (0, 0, -0.02)
    build_tarps(S, coll, B)
    build_tiedyes(S, coll, B)


def outdoor_lights():
    """Afternoon sun and the sky it lights, matched to each other."""
    world = bpy.context.scene.world or bpy.data.worlds.new('World')
    bpy.context.scene.world = world
    world.use_nodes = True
    nt = world.node_tree.nodes
    sky = nt.new('ShaderNodeTexSky')
    sky.sky_type = 'MULTIPLE_SCATTERING'
    # No disc: the lamp is the sun. With both, the scene gets two.
    sky.sun_disc = False
    sky.sun_elevation = SUN_ELEVATION
    # The sky model's azimuth: 0 at +Y, turning toward +X... measured here
    # from the sun vector so the glow and the lamp agree.
    s = sun_vector()
    sky.sun_rotation = math.atan2(s.x, s.y) % (2 * math.pi)
    bg = nt['Background']
    world.node_tree.links.new(sky.outputs['Color'], bg.inputs['Color'])
    bg.inputs['Strength'].default_value = 0.12
    L = bpy.data.lights.new('sun', 'SUN')
    # Low sun is weaker and warmer: through more air.
    low = max(0.0, min(1.0, (math.radians(25) - SUN_ELEVATION) / math.radians(20)))
    L.energy = 3.2 - 1.4 * low
    L.angle = math.radians(0.53)
    warm, day = srgb('#ffb877'), srgb('#fff4e4')
    L.color = tuple(d + (w - d) * low for w, d in zip(warm[:3], day[:3]))
    o = bpy.data.objects.new('sun', L)
    bpy.context.scene.collection.objects.link(o)
    o.rotation_mode = 'QUATERNION'
    o.rotation_quaternion = Vector((0, 0, -1)).rotation_difference(-s)

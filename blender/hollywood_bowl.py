"""
The Hollywood Bowl, 21 July 1974: the setting for the story page.

Sources: two colour photographs of the Wall at the Bowl before the show
(.shots/reference/unsourced-hollywoodbowl-1974-07-21-a.png, -b.webp) and two
of the band there; the Bowl's own histories for the 1929 shell, Frank Gehry's
cardboard Sonotubes of the 1970s, and the reflecting pool, gone by 1972.

Sizes are measured on the wide photograph against the Wall's 64 ft scaffold,
allowing for the shell standing further back. They are estimates:

  - the shell: white, concentric arches, the outer about 14.5 m in radius,
    springing about 1 m above the stage, so its crown is about 15.5 m up
  - two horizontal white tubes, about 0.8 m across, spanning the shell's full
    width about 11 m above the stage, round-ended
  - a row of tall white panels in the shell's crown
  - a curved bank of vertical white tubes, about 5-6.5 m tall, standing round
    the sides and back of the Wall
  - no tarps; wooded hills behind and beside the shell
  - in front of the stage, the semicircle where the pool had been, 1.4 m
    below the stage, and the seats rising up the canyon, facing northeast

The stage faces southwest, so in the afternoon the sun comes from behind the
crowd's left shoulder and lights the Wall's face.

The crowd is simple figures, coloured at random from 1970s clothes. Nobody in
it is anybody.
"""
import math
import os
import random

import bmesh
import bpy
from mathutils import Vector

import venue

# Poly Haven's CC0 assets, downloaded by hand into this ignored folder (see
# docs/qa-findings.md §15). Without them the bowl falls back to simple shapes.
ASSETS = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'assets', 'polyhaven')
# Realistic people from blender/make_people.py (MPFB). Without it, simple figures.
PEOPLE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'assets', 'makehuman', 'people.blend')

# Places the crowd must leave empty (camera positions), set by the caller.
KEEP_CLEAR = []

STAGE_DROP = 1.4      # the floor in front of the stage, below the stage
POOL_R = 15.0         # the old pool circle, from the stage front's centre
FAN = math.radians(62)  # the seating's half-angle
SEAT_R0, SEAT_R1 = 16.0, 112.0
ROW = 0.95


def mat(name, hex_, rough, **extra):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = venue.srgb(hex_)
    b.inputs['Roughness'].default_value = rough
    for k, v in extra.items():
        b.inputs[k].default_value = v
    return m


def obj(name, bm, mats, coll):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    for m in mats:
        me.materials.append(m)
    o = bpy.data.objects.new(name, me)
    coll.objects.link(o)
    return o


# ─── the bowl's surfaces ──────────────────────────────────────────────────────

def seat_z(r, floor):
    """Height of the seating at radius r: gentle in the boxes, steeper up the hill."""
    t = max(0.0, r - SEAT_R0)
    return floor + 0.12 * t + 0.0018 * t * t


def smooth(a, b, x):
    t = max(0.0, min(1.0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)


def terrain_z(x, y, floor, deck, cy):
    """The canyon: seats in the fan, hills beside and behind, the stage flat."""
    dx, dy = x, y - cy
    r = math.hypot(dx, dy)
    ang = math.atan2(abs(dx), -dy)          # 0 toward the crowd, pi behind the stage
    n = (math.sin(x * 0.037 + 1.3) * math.cos(y * 0.029 - 0.7) + 0.5 * math.sin(x * 0.11 + y * 0.083)) * 4.0
    # Beyond the top row the hill flattens out (the bowl's rim, then Highland Avenue's side).
    seats = seat_z(min(r, SEAT_R1), floor) - 0.4 + min(25.0, 0.15 * max(0.0, r - SEAT_R1))
    # The canyon's sides: low by the stage, rising with distance.
    hill = seats + (4 + 0.25 * min(r, 170)) * smooth(8, 70, r) + n * smooth(10, 40, r)
    behind = deck - 0.3 + max(0.0, math.hypot(dx, dy - 10) - 20) * 0.55 + n * smooth(20, 40, math.hypot(dx, dy - 10))
    if r < POOL_R:
        return floor - 0.05
    if ang < FAN:
        return seats
    if ang < math.radians(100):
        return seats + (hill - seats) * smooth(FAN, math.radians(80), ang)
    side = seats + (hill - seats)
    return side + (behind - side) * smooth(math.radians(100), math.radians(125), ang)


def build_terrain(coll, floor, deck, cy):
    size, n = 700.0, 220
    bm = bmesh.new()
    vs = []
    for j in range(n + 1):
        row = []
        for i in range(n + 1):
            x = -size / 2 + size * i / n
            y = -size / 2 + size * j / n + 120
            row.append(bm.verts.new((x, y, terrain_z(x, y, floor, deck, cy))))
        vs.append(row)
    uv = bm.loops.layers.uv.new()
    for j in range(n):
        for i in range(n):
            f = bm.faces.new((vs[j][i], vs[j][i + 1], vs[j + 1][i + 1], vs[j + 1][i]))
            f.smooth = True
            for loop in f.loops:
                loop[uv].uv = (loop.vert.co.x / 15.0, loop.vert.co.y / 15.0)   # the texture's 15 m tile
    ground = append_material('aerial_grass_rock', 'aerial_grass_rock')
    if ground:
        return obj('canyon', bm, [ground], coll)
    m = bpy.data.materials.new('Canyon, chaparral')
    m.use_nodes = True
    nt, links = m.node_tree.nodes, m.node_tree.links
    b = nt['Principled BSDF']
    c = venue._mix(nt, links, '#5c5a33', '#2f4024', venue._band(nt, links, venue._noise(nt, links, 0.06, 6), 0.45, 0.6))
    c = venue._mix(nt, links, c, '#8a7a52', venue._band(nt, links, venue._noise(nt, links, 0.02, 4), 0.62, 0.8))
    links.new(c, b.inputs['Base Color'])
    b.inputs['Roughness'].default_value = 0.95
    bump = nt.new('ShaderNodeBump')
    bump.inputs['Strength'].default_value = 0.6
    links.new(venue._noise(nt, links, 1.2, 8), bump.inputs['Height'])
    links.new(bump.outputs['Normal'], b.inputs['Normal'])
    return obj('canyon', bm, [m], coll)


def append_material(asset, name):
    path = os.path.join(ASSETS, asset, asset + '.blend')
    if not os.path.exists(path):
        return None
    with bpy.data.libraries.load(path) as (src, dst):
        dst.materials = [name]
    return dst.materials[0]


def append_plants(coll):
    """The Poly Haven plants, lightest level of detail, in a hidden collection to instance from."""
    picks = {
        # (asset, objects, scale range): Searsia burchellii scaled up stands in
        # for the canyon's oaks; S. lucida and Shrub 02 for the chaparral.
        'oaks': ('searsia_burchellii', ['searsia_burchellii_medium_LOD2', 'searsia_burchellii_large_LOD2'], (1.6, 2.4)),
        'chaparral': ('searsia_lucida', ['searsia_lucida_a_LOD2', 'searsia_lucida_b_LOD2', 'searsia_lucida_c_LOD2'], (1.8, 2.8)),
        'shrubs': ('shrub_02', ['shrub_02_a_LOD2', 'shrub_02_b_LOD2', 'shrub_02_c_LOD2'], (1.2, 2.0)),
    }
    out = {}
    for kind, (asset, names, scale) in picks.items():
        path = os.path.join(ASSETS, asset, asset + '.blend')
        if not os.path.exists(path):
            return None
        with bpy.data.libraries.load(path) as (src, dst):
            dst.objects = [n for n in names if n in src.objects]
        c = bpy.data.collections.new(f'plants, {kind}')
        bpy.context.scene.collection.children.link(c)
        for o in dst.objects:
            o.location = (0, 0, 0)
            c.objects.link(o)
        bpy.context.view_layer.layer_collection.children[c.name].exclude = True
        out[kind] = (c, scale)
    return out


def instance_on(coll, name, points, source, scale, seed):
    """A point cloud with a geometry-nodes modifier that instances a random member of `source` on each point."""
    me = bpy.data.meshes.new(name)
    me.from_pydata(points, [], [])
    o = bpy.data.objects.new(name, me)
    coll.objects.link(o)
    g = bpy.data.node_groups.new(name, 'GeometryNodeTree')
    g.interface.new_socket('Geometry', in_out='INPUT', socket_type='NodeSocketGeometry')
    g.interface.new_socket('Geometry', in_out='OUTPUT', socket_type='NodeSocketGeometry')
    n, L = g.nodes, g.links
    gi, go = n.new('NodeGroupInput'), n.new('NodeGroupOutput')
    m2p = n.new('GeometryNodeMeshToPoints')
    ci = n.new('GeometryNodeCollectionInfo')
    ci.inputs['Collection'].default_value = source
    ci.inputs['Separate Children'].default_value = True
    ci.inputs['Reset Children'].default_value = True
    iop = n.new('GeometryNodeInstanceOnPoints')
    pick = n.new('FunctionNodeRandomValue')
    pick.data_type = 'INT'
    pick.inputs['Min'].default_value = 0
    pick.inputs['Max'].default_value = len(source.objects) - 1
    pick.inputs['Seed'].default_value = seed
    rot = n.new('FunctionNodeRandomValue')
    rot.data_type = 'FLOAT_VECTOR'
    rot.inputs['Max'].default_value = (0, 0, 6.2832)
    rot.inputs['Seed'].default_value = seed + 1
    sc = n.new('FunctionNodeRandomValue')
    sc.data_type = 'FLOAT'
    sc.inputs['Min'].default_value = scale[0]
    sc.inputs['Max'].default_value = scale[1]
    sc.inputs['Seed'].default_value = seed + 2
    L.new(gi.outputs['Geometry'], m2p.inputs['Mesh'])
    L.new(m2p.outputs['Points'], iop.inputs['Points'])
    L.new(ci.outputs['Instances'], iop.inputs['Instance'])
    iop.inputs['Pick Instance'].default_value = True
    L.new(pick.outputs[0], iop.inputs['Instance Index'])
    L.new(rot.outputs[0], iop.inputs['Rotation'])
    L.new(sc.outputs[0], iop.inputs['Scale'])
    L.new(iop.outputs['Instances'], go.inputs['Geometry'])
    mod = o.modifiers.new(name, 'NODES')
    mod.node_group = g
    return o


def build_plants(coll, floor, deck, cy):
    """The canyon's oaks and chaparral, from Poly Haven's plants. False if they aren't downloaded."""
    src = append_plants(coll)
    if not src:
        return False
    rng = random.Random(1922)
    pts = {'oaks': [], 'chaparral': [], 'shrubs': []}
    for _ in range(90000):
        x = rng.uniform(-260, 260)
        y = rng.uniform(-230, 330)
        r = math.hypot(x, y - cy)
        ang = math.atan2(abs(x), -(y - cy))
        if r < 22 or ang < FAN + math.radians(3) and r < SEAT_R1 + 4:
            continue
        if abs(x) < 17 and -2 < y < 22:
            continue
        woods = math.sin(x * 0.05 + 2.1) * math.cos(y * 0.043 + 0.4) + 0.4 * math.sin(x * 0.17 - y * 0.13)
        z = terrain_z(x, y, floor, deck, cy) - 0.15
        if woods > 0.35 and rng.random() < 0.5:
            pts['oaks'].append((x, y, z))
        elif woods > -0.2:
            pts['chaparral'].append((x, y, z))
        elif rng.random() < 0.35:
            pts['shrubs'].append((x, y, z))
    for k, (kind, p) in enumerate(pts.items()):
        c, scale = src[kind]
        instance_on(coll, f'plants, {kind} (scatter)', p, c, scale, 31 + 7 * k)
    print('PLANTS', {k: len(v) for k, v in pts.items()})
    return True


def build_trees(coll, floor, deck, cy):
    """Chaparral and oaks on the canyon's sides and the hill behind the shell."""
    rng = random.Random(1922)
    pts = {'small': [], 'large': []}
    for _ in range(40000):
        x = rng.uniform(-260, 260)
        y = rng.uniform(-230, 330)
        r = math.hypot(x, y - cy)
        ang = math.atan2(abs(x), -(y - cy))
        if r < 24 or ang < FAN + math.radians(4) and r < SEAT_R1 + 6:
            continue
        if abs(x) < 17 and -2 < y < 22:      # the stage and the shell
            continue
        # Clumps: keep a point only where a slow noise says woods.
        if math.sin(x * 0.05 + 2.1) * math.cos(y * 0.043 + 0.4) + 0.4 * math.sin(x * 0.17 - y * 0.13) < -0.1:
            continue
        z = terrain_z(x, y, floor, deck, cy) - 0.4
        pts['large' if rng.random() < 0.15 else 'small'].append((x, y, z))
    m = bpy.data.materials.new('Trees, chaparral and oak')
    m.use_nodes = True
    nt, links = m.node_tree.nodes, m.node_tree.links
    info = nt.new('ShaderNodeObjectInfo')
    ramp = nt.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].color = venue.srgb('#26361c')
    ramp.color_ramp.elements[1].color = venue.srgb('#5d6234')
    links.new(info.outputs['Random'], ramp.inputs['Fac'])
    b = nt['Principled BSDF']
    links.new(ramp.outputs['Color'], b.inputs['Base Color'])
    b.inputs['Roughness'].default_value = 0.9
    bump = nt.new('ShaderNodeBump')
    bump.inputs['Strength'].default_value = 0.8
    links.new(venue._noise(nt, links, 6.0, 8), bump.inputs['Height'])
    links.new(bump.outputs['Normal'], b.inputs['Normal'])
    for kind, (rad, squash) in {'small': (0.9, 0.75), 'large': (2.6, 0.8)}.items():
        bm = bmesh.new()
        v = bmesh.ops.create_icosphere(bm, subdivisions=2, radius=rad)['verts']
        rr = random.Random(len(kind))
        for vv in v:
            vv.co *= rr.uniform(0.82, 1.12)
            vv.co.z *= squash
            vv.co.z += rad * squash * 0.6
        for f in bm.faces:
            f.smooth = True
        me = bpy.data.meshes.new(f'tree {kind}')
        bm.to_mesh(me)
        bm.free()
        scatter(coll, f'trees, {kind}', me, pts[kind], [m])


def build_seating(coll, floor, cy):
    """Concentric rows up the hill: a wooden bench on each tread, concrete risers."""
    bm = bmesh.new()
    seg = 90
    r = SEAT_R0
    while r < SEAT_R1:
        z0, z1 = seat_z(r, floor), seat_z(r + ROW, floor)
        ring = []
        for k in range(seg + 1):
            a = -FAN + 2 * FAN * k / seg
            sx, sy = math.sin(a), -math.cos(a)
            ring.append((sx, sy))
        for k in range(seg):
            (ax, ay), (bx, by) = ring[k], ring[k + 1]
            # riser, then tread
            q = [bm.verts.new((ax * r, cy + ay * r, z0)), bm.verts.new((bx * r, cy + by * r, z0)),
                 bm.verts.new((bx * r, cy + by * r, z1)), bm.verts.new((ax * r, cy + ay * r, z1))]
            f = bm.faces.new(q)
            f.material_index = 0
            q = [bm.verts.new((ax * r, cy + ay * r, z1)), bm.verts.new((bx * r, cy + by * r, z1)),
                 bm.verts.new((bx * (r + ROW), cy + by * (r + ROW), z1)), bm.verts.new((ax * (r + ROW), cy + ay * (r + ROW), z1))]
            f = bm.faces.new(q)
            f.material_index = 0
            # the bench: a plank 0.45 m up, a third of the way into the tread
            rb = r + ROW * 0.55
            q = [bm.verts.new((ax * rb, cy + ay * rb, z1 + 0.42)), bm.verts.new((bx * rb, cy + by * rb, z1 + 0.42)),
                 bm.verts.new((bx * (rb + 0.3), cy + by * (rb + 0.3), z1 + 0.42)), bm.verts.new((ax * (rb + 0.3), cy + ay * (rb + 0.3), z1 + 0.42))]
            f = bm.faces.new(q)
            f.material_index = 1
        r += ROW
    # The pool circle's floor, and the old pool's curb round it.
    c = bm.verts.new((0, cy, floor))
    rim = [bm.verts.new((math.sin(a) * POOL_R, cy - math.cos(a) * POOL_R, floor))
           for a in [-math.pi / 2 + math.pi * k / 64 for k in range(65)]]
    for a, b in zip(rim, rim[1:]):
        bm.faces.new((c, a, b)).material_index = 2
    return obj('seating', bm, [mat('Bowl, concrete', '#a49c8c', 0.9), mat('Bench, weathered wood', '#5d5446', 0.85),
                               mat('Pool circle, paving', '#8f8a80', 0.85)], coll)


# ─── the shell, the tubes, the panels ─────────────────────────────────────────

def build_shell(coll, deck):
    white = mat('Shell, white transite', '#e8e6df', 0.55)
    inner = mat('Shell, inside', '#d9d8d2', 0.7)
    bm = bmesh.new()
    rings, R0, dR, y0, dy, spring = 6, 14.5, 1.35, 7.0, 1.25, 1.0
    seg = 48
    zc = deck + spring

    def arc(R, y):
        pts = [(-R, y, deck)]
        pts += [(-math.cos(math.pi * k / seg) * R, y, zc + math.sin(math.pi * k / seg) * R) for k in range(seg + 1)]
        pts += [(R, y, deck)]
        return pts

    for i in range(rings):
        R, Rn = R0 - dR * i, R0 - dR * (i + 1)
        ya, yb = y0 + dy * i, y0 + dy * (i + 1)
        # the ring's soffit: a half-cylinder from ya to yb
        A, Bv = arc(R, ya), arc(R, yb)
        va = [bm.verts.new(p) for p in A]
        vb = [bm.verts.new(p) for p in Bv]
        for k in range(len(va) - 1):
            f = bm.faces.new((va[k], va[k + 1], vb[k + 1], vb[k]))
            f.material_index = 1
            f.smooth = True
        # the step at its back: an annulus from R down to the next ring's radius
        C = arc(Rn, yb)
        vc = [bm.verts.new(p) for p in C]
        vb2 = [bm.verts.new(p) for p in Bv]
        for k in range(len(vc) - 1):
            f = bm.faces.new((vb2[k], vb2[k + 1], vc[k + 1], vc[k]))
            f.material_index = 0
            f.smooth = True
    # The outer hood: the front arch's face, and its back over the hill.
    front = arc(R0 + 0.6, y0)
    vo = [bm.verts.new(p) for p in front]
    vi = [bm.verts.new(p) for p in arc(R0, y0)]
    for k in range(len(vo) - 1):
        bm.faces.new((vo[k], vo[k + 1], vi[k + 1], vi[k])).material_index = 0
    back = arc(R0 + 0.6, y0 + dy * rings + 1.5)
    vk = [bm.verts.new(p) for p in back]
    vo2 = [bm.verts.new(p) for p in front]
    for k in range(len(vk) - 1):
        f = bm.faces.new((vo2[k], vo2[k + 1], vk[k + 1], vk[k]))
        f.material_index = 0
        f.smooth = True
    # The back wall, closing the last ring.
    yw = y0 + dy * rings
    last = [bm.verts.new(p) for p in arc(R0 - dR * rings, yw)]
    bm.faces.new(last).material_index = 1
    shell = obj('shell', bm, [white, inner], coll)
    # The stage floor under the shell, behind the Wall's own deck.
    f = bmesh.new()
    bmesh.ops.create_cube(f, size=1.0)
    bmesh.ops.scale(f, vec=(2 * R0 + 2, yw - 5.6, 0.3), verts=f.verts)
    bmesh.ops.translate(f, vec=(0, (yw + 5.6) / 2, deck - 0.15), verts=f.verts)
    obj('bowl stage', f, [mat('Stage, grey paint', '#6d6a63', 0.8)], coll)
    return shell, (y0, R0, yw)


def build_tubes(coll, deck, y0, R0):
    card = mat('Sonotube, painted card', '#dcdde0', 0.75)
    bm = bmesh.new()
    # Two long horizontal tubes across the shell, round-ended.
    for z, y, r in ((deck + 10.6, 6.4, 0.42), (deck + 11.35, 6.9, 0.42)):
        L = 2 * (R0 + 0.4)
        c = bmesh.ops.create_cone(bm, cap_ends=False, segments=32, radius1=r, radius2=r, depth=L)['verts']
        bmesh.ops.rotate(bm, verts=c, cent=(0, 0, 0), matrix=__import__('mathutils').Matrix.Rotation(math.pi / 2, 3, 'Y'))
        bmesh.ops.translate(bm, verts=c, vec=(0, y, z))
        for sx in (-1, 1):
            s = bmesh.ops.create_uvsphere(bm, u_segments=24, v_segments=12, radius=r)['verts']
            bmesh.ops.translate(bm, verts=s, vec=(sx * L / 2, y, z))
    # The bank of vertical tubes round the sides and back of the Wall.
    rng = random.Random(721)
    d, gap = 0.82, 0.88
    path = []
    x = -R0 + 1.2
    for y in [-1.0 + gap * k for k in range(int((6.6 - -1.0) / gap) + 1)]:
        path.append((x, y))
    for k in range(int(2 * (R0 - 1.2) / gap) + 1):
        path.append((-R0 + 1.2 + gap * k, 6.6))
    for y in [6.6 - gap * k for k in range(1, int(7.6 / gap) + 1)]:
        path.append((R0 - 1.2, y))
    for (px, py) in path:
        h = rng.uniform(5.0, 6.6)
        c = bmesh.ops.create_cone(bm, cap_ends=True, segments=20, radius1=d / 2, radius2=d / 2, depth=h)['verts']
        bmesh.ops.translate(bm, verts=c, vec=(px, py, deck + h / 2))
    for f in bm.faces:
        f.smooth = True
    obj('sonotubes', bm, [card], coll)
    # The panels in the shell's crown.
    p = bmesh.new()
    n = 15
    for k in range(n):
        a = math.radians(30 + 120 * k / (n - 1))
        cx, cz = -math.cos(a) * 9.8, deck + 1.0 + math.sin(a) * 9.8 + 1.2
        v = bmesh.ops.create_cube(p, size=1.0)['verts']
        bmesh.ops.scale(p, vec=(0.95, 0.06, 2.3), verts=v)
        bmesh.ops.translate(p, vec=(cx, 8.6, cz), verts=v)
    obj('reflector panels', p, [mat('Panel, white', '#efefea', 0.5)], coll)


# ─── the crowd ────────────────────────────────────────────────────────────────

# Tops, from the 1970s photographs (docs/crowd-references.md): white and cream
# T-shirts, faded blue, rust, mustard, olive, brown, maroon, stripes read as
# mid-tones, and skin for the shirts-off. Little tie-dye: that's the 1980s.
CLOTHES = ('#e9e3d3', '#d8cdb4', '#5c7896', '#a8502e', '#c99a3a', '#6b6a3a', '#6b4a2e', '#7a2e34', '#9a8a6a', '#c58f6a', '#b98a64', '#3a4a5a')


def _part(bm, kind, size, at, mat, rot=None):
    """A body part: a rounded box ('box') or a sphere ('ball'), at `at`."""
    from mathutils import Matrix
    if kind == 'ball':
        v = bmesh.ops.create_uvsphere(bm, u_segments=12, v_segments=8, radius=1.0)['verts']
    else:
        v = bmesh.ops.create_cube(bm, size=2.0)['verts']
    bmesh.ops.scale(bm, vec=size, verts=v)
    if rot:
        bmesh.ops.rotate(bm, verts=v, cent=(0, 0, 0), matrix=Matrix.Rotation(rot[0], 3, rot[1]))
    bmesh.ops.translate(bm, vec=at, verts=v)
    for vv in v:
        for f in vv.link_faces:
            f.material_index = mat
            f.smooth = True


def figure_mesh(name, pose, look='long'):
    """
    One person, facing -y, in one of four poses read off the 1970s crowd
    photographs (docs/crowd-references.md): 'stand', 'bench' (sitting on a
    bench, knees forward), 'ground' (sitting cross-legged on the grass) and
    'lie' (lying back on one elbow). `look` is the head: 'short', 'long'
    (hair to the shoulders, on men and women alike), 'hat' (long hair under a
    cowboy or floppy hat) or 'bare' (long hair, shirt off).
    Materials: 0 top, 1 hair, 2 trousers, 3 hat, 4 skin.
    """
    bm = bmesh.new()
    TOP, HAIR, LEGS, HAT, SKIN = 0, 1, 2, 3, 4
    if look == 'bare':
        TOP = SKIN
    if pose == 'stand':
        _part(bm, 'box', (0.08, 0.09, 0.42), (-0.1, 0, 0.42), LEGS)
        _part(bm, 'box', (0.08, 0.09, 0.42), (0.1, 0, 0.42), LEGS)
        _part(bm, 'box', (0.21, 0.13, 0.3), (0, 0, 1.13), TOP)
        _part(bm, 'box', (0.06, 0.07, 0.28), (-0.27, 0, 1.12), TOP)
        _part(bm, 'box', (0.06, 0.07, 0.28), (0.27, 0, 1.12), TOP)
        _part(bm, 'ball', (0.105, 0.115, 0.13), (0, 0.01, 1.58), HAIR)
    elif pose == 'bench':
        # bench top at 0.42 above the feet; thighs forward, shins down
        _part(bm, 'box', (0.16, 0.24, 0.08), (0, -0.2, 0.47), LEGS)
        _part(bm, 'box', (0.16, 0.07, 0.22), (0, -0.42, 0.22), LEGS)
        _part(bm, 'box', (0.21, 0.13, 0.3), (0, 0.03, 0.85), TOP, (math.radians(-6), 'X'))
        _part(bm, 'box', (0.06, 0.18, 0.06), (-0.25, -0.12, 0.72), TOP)
        _part(bm, 'box', (0.06, 0.18, 0.06), (0.25, -0.12, 0.72), TOP)
        _part(bm, 'ball', (0.105, 0.115, 0.13), (0, 0.0, 1.3), HAIR)
    elif pose == 'ground':
        _part(bm, 'box', (0.3, 0.22, 0.07), (0, -0.12, 0.08), LEGS)
        _part(bm, 'box', (0.21, 0.13, 0.28), (0, 0.04, 0.42), TOP, (math.radians(-10), 'X'))
        _part(bm, 'box', (0.06, 0.2, 0.06), (-0.24, -0.1, 0.3), TOP)
        _part(bm, 'box', (0.06, 0.2, 0.06), (0.24, -0.1, 0.3), TOP)
        _part(bm, 'ball', (0.105, 0.115, 0.13), (0, 0.0, 0.86), HAIR)
    else:  # lie, on one elbow, feet toward the stage
        _part(bm, 'box', (0.16, 0.45, 0.08), (0, -0.55, 0.09), LEGS)
        _part(bm, 'box', (0.2, 0.3, 0.11), (0, 0.15, 0.2), TOP, (math.radians(22), 'X'))
        _part(bm, 'box', (0.06, 0.06, 0.16), (0.22, 0.3, 0.16), TOP)
        _part(bm, 'ball', (0.105, 0.115, 0.13), (0, 0.48, 0.42), HAIR)
        _part(bm, 'box', (0.55, 0.85, 0.01), (0, -0.15, 0.01), TOP)  # a blanket
    head = {'stand': (0, 0.01, 1.58), 'bench': (0, 0.0, 1.3), 'ground': (0, 0.0, 0.86), 'lie': (0, 0.48, 0.42)}[pose]
    hx, hy, hz = head
    if pose != 'lie' and look != 'short':
        # Long hair: falls behind the head to the shoulders.
        _part(bm, 'ball', (0.12, 0.07, 0.17), (hx, hy + 0.05, hz - 0.12), HAIR)
    if pose != 'lie' and look == 'hat':
        _part(bm, 'box', (0.2, 0.2, 0.008), (hx, hy, hz + 0.08), HAT)      # brim
        _part(bm, 'ball', (0.1, 0.11, 0.07), (hx, hy, hz + 0.12), HAT)     # crown
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    return me


def crowd_materials():
    """Clothes and hair picked per person from the instance's random number."""
    out = []
    for name, palette in (('Crowd, clothes', CLOTHES), ('Crowd, hair', ('#2a1d14', '#4a3220', '#7a5a34', '#b08a5a', '#1a1a1a', '#c9b48a')),
                          ('Crowd, trousers', ('#3b5274', '#2f4560', '#4a628a', '#6f87a8', '#5a4a3a', '#7a5a3a', '#3a3a3a', '#8a3a2a')),
                          ('Crowd, hats', ('#b89a6a', '#8a6a44', '#5a4632', '#2a2522', '#d8c8a0')),
                          ('Crowd, skin', ('#e8bf9a', '#d9a47e', '#c48a62', '#a8704c', '#8a5a3a', '#f0cfae'))):
        m = bpy.data.materials.new(name)
        m.use_nodes = True
        nt, links = m.node_tree.nodes, m.node_tree.links
        info = nt.new('ShaderNodeObjectInfo')
        ramp = nt.new('ShaderNodeValToRGB')
        ramp.color_ramp.interpolation = 'CONSTANT'
        els = ramp.color_ramp.elements
        while len(els) < len(palette):
            els.new(0.5)
        for i, c in enumerate(palette):
            els[i].position = i / len(palette)
            els[i].color = venue.srgb(c)
        links.new(info.outputs['Random'], ramp.inputs['Fac'])
        b = nt['Principled BSDF']
        links.new(ramp.outputs['Color'], b.inputs['Base Color'])
        b.inputs['Roughness'].default_value = 0.85
        out.append(m)
    return out


def scatter(coll, name, me, points, mats, yaws=None):
    """
    Instance `me` at every point, turned by its yaw (radians about z), with a
    geometry-nodes modifier. Each instance gets its own random number, so the
    materials pick each person's colours.
    """
    for m in mats:
        me.materials.append(m)
    proto = bpy.data.objects.new(name + ' (person)', me)
    coll.objects.link(proto)
    proto.hide_render = True
    proto.hide_viewport = True
    cloud = bpy.data.meshes.new(name)
    cloud.from_pydata(points, [], [])
    attr = cloud.attributes.new('yaw', 'FLOAT', 'POINT')
    attr.data.foreach_set('value', list(yaws) if yaws else [0.0] * len(points))
    o = bpy.data.objects.new(name, cloud)
    coll.objects.link(o)
    g = bpy.data.node_groups.new(name, 'GeometryNodeTree')
    g.interface.new_socket('Geometry', in_out='INPUT', socket_type='NodeSocketGeometry')
    g.interface.new_socket('Geometry', in_out='OUTPUT', socket_type='NodeSocketGeometry')
    n, L = g.nodes, g.links
    gi, go = n.new('NodeGroupInput'), n.new('NodeGroupOutput')
    m2p = n.new('GeometryNodeMeshToPoints')
    oi = n.new('GeometryNodeObjectInfo')
    oi.inputs['Object'].default_value = proto
    iop = n.new('GeometryNodeInstanceOnPoints')
    na = n.new('GeometryNodeInputNamedAttribute')
    na.data_type = 'FLOAT'
    na.inputs['Name'].default_value = 'yaw'
    cx = n.new('ShaderNodeCombineXYZ')
    sc = n.new('FunctionNodeRandomValue')
    sc.data_type = 'FLOAT_VECTOR'
    sc.inputs['Min'].default_value = (0.85, 0.9, 0.9)    # slight to broad, short to tall
    sc.inputs['Max'].default_value = (1.2, 1.1, 1.1)
    L.new(gi.outputs['Geometry'], m2p.inputs['Mesh'])
    L.new(m2p.outputs['Points'], iop.inputs['Points'])
    L.new(oi.outputs['Geometry'], iop.inputs['Instance'])
    L.new(na.outputs[0], cx.inputs['Z'])
    L.new(cx.outputs[0], iop.inputs['Rotation'])
    L.new(sc.outputs[0], iop.inputs['Scale'])
    L.new(iop.outputs['Instances'], go.inputs['Geometry'])
    o.modifiers.new(name, 'NODES').node_group = g
    return o


def people_library():
    """The generated people, one collection per pose, or None if not made yet."""
    if not os.path.exists(PEOPLE):
        return None
    with bpy.data.libraries.load(PEOPLE, link=False) as (src, dst):
        dst.collections = [c for c in src.collections if c.startswith('people')]
    out = {}
    for c in dst.collections:
        if c is None:
            continue
        bpy.context.scene.collection.children.link(c)
        bpy.context.view_layer.layer_collection.children[c.name].exclude = True
        tag, pose = c.name.split(', ', 1)
        out[(tag, pose)] = c
    return out or None


def scatter_people(coll, name, points, yaws, source, seed):
    """Instance a random person from `source` at each point, turned by its yaw."""
    me = bpy.data.meshes.new(name)
    me.from_pydata(points, [], [])
    attr = me.attributes.new('yaw', 'FLOAT', 'POINT')
    attr.data.foreach_set('value', [y + math.pi for y in yaws])   # MakeHuman people face +y, the figures -y
    o = bpy.data.objects.new(name, me)
    coll.objects.link(o)
    g = bpy.data.node_groups.new(name, 'GeometryNodeTree')
    g.interface.new_socket('Geometry', in_out='INPUT', socket_type='NodeSocketGeometry')
    g.interface.new_socket('Geometry', in_out='OUTPUT', socket_type='NodeSocketGeometry')
    n, L = g.nodes, g.links
    gi, go = n.new('NodeGroupInput'), n.new('NodeGroupOutput')
    m2p = n.new('GeometryNodeMeshToPoints')
    ci = n.new('GeometryNodeCollectionInfo')
    ci.inputs['Collection'].default_value = source
    ci.inputs['Separate Children'].default_value = True
    ci.inputs['Reset Children'].default_value = True
    iop = n.new('GeometryNodeInstanceOnPoints')
    iop.inputs['Pick Instance'].default_value = True
    pick = n.new('FunctionNodeRandomValue')
    pick.data_type = 'INT'
    pick.inputs['Min'].default_value = 0
    pick.inputs['Max'].default_value = len(source.objects) - 1
    pick.inputs['Seed'].default_value = seed
    na = n.new('GeometryNodeInputNamedAttribute')
    na.data_type = 'FLOAT'
    na.inputs['Name'].default_value = 'yaw'
    cx = n.new('ShaderNodeCombineXYZ')
    sc = n.new('FunctionNodeRandomValue')
    sc.data_type = 'FLOAT'
    sc.inputs['Min'].default_value = 0.95
    sc.inputs['Max'].default_value = 1.05
    sc.inputs['Seed'].default_value = seed + 1
    L.new(gi.outputs['Geometry'], m2p.inputs['Mesh'])
    L.new(m2p.outputs['Points'], iop.inputs['Points'])
    L.new(ci.outputs['Instances'], iop.inputs['Instance'])
    L.new(pick.outputs[0], iop.inputs['Instance Index'])
    L.new(na.outputs[0], cx.inputs['Z'])
    L.new(cx.outputs[0], iop.inputs['Rotation'])
    L.new(sc.outputs[0], iop.inputs['Scale'])
    L.new(iop.outputs['Instances'], go.inputs['Geometry'])
    o.modifiers.new(name, 'NODES').node_group = g
    return o


def build_crowd(coll, floor, cy, keep_clear=()):
    """
    About 12,000 people, mostly sitting, as the 1970s photographs show a
    crowd before a show: on the benches; on blankets in the pool circle, some
    lying back; a few standing and walking about.
    """
    rng = random.Random(1974)
    mats = crowd_materials()
    poses = {k: ([], []) for k in ('stand', 'bench', 'ground', 'lie')}

    def clear(p):
        # Nobody within 9 m of a camera: close up, simple figures look like what they are.
        return all((Vector(p) - Vector(c)).length > 12.0 for c in keep_clear)

    def add(pose, p, jitter):
        if not clear(p):
            return
        face = math.atan2(-(p[0] - 0.0), -(p[1] - (cy + 6)))     # toward the stage
        poses[pose][0].append(p)
        poses[pose][1].append(face + max(-0.26, min(0.26, rng.gauss(0, jitter))))   # never more than 15 degrees off

    # The pool circle: blankets and people on them, thicker toward the stage.
    for _ in range(1600):
        a = rng.uniform(-math.pi / 2, math.pi / 2)
        r = POOL_R * math.sqrt(rng.random())
        if r < 1.2 or rng.random() > 1.15 - r / POOL_R:
            continue
        p = (math.sin(a) * r, cy - math.cos(a) * r, floor)
        u = rng.random()
        if u < 0.45:
            add('ground', p, 0.13)
        elif u < 0.62:
            add('lie', p, 0.13)
        else:
            add('stand', p, 0.13)
    # The benches, but not a congregation: before the show people stand on
    # the treads, perch on the bench backs, sit on the steps, turn to talk, and
    # gather in clusters with gaps between (docs/crowd-references.md).
    def clump(x, y):
        return (math.sin(x * 0.21 + 1.7) * math.cos(y * 0.19 - 0.3) + 0.6 * math.sin(x * 0.53 - y * 0.47 + 2.0)) * 0.5

    r = SEAT_R0
    while r < SEAT_R1:
        z = seat_z(r + ROW, floor)
        n = int(2 * FAN * (r + ROW * 0.55) / 0.55)
        base = 0.78 - 0.45 * (r - SEAT_R0) / (SEAT_R1 - SEAT_R0)
        for k in range(n):
            a = -FAN + 2 * FAN * (k + rng.uniform(0.0, 1.0)) / n
            rr = r + ROW * rng.uniform(0.35, 0.8)
            x, y = math.sin(a) * rr, cy - math.cos(a) * rr
            if rng.random() > base * (0.55 + 0.9 * clump(x, y)):
                continue
            u = rng.random()
            # Everyone faces the stage, give or take 15 degrees.
            jit = 0.13
            if u < 0.34:
                add('stand', (x, y, z), jit)
            elif u < 0.74:
                add('bench', (x, y, z), jit)
            elif u < 0.84:
                add('bench', (x, y, z + 0.38), jit)  # up on the bench back
            elif u < 0.95:
                add('ground', (x, y, z), jit)        # on the tread, back to the bench
            else:
                add('lie', (x, y, z + 0.42), 0.13)   # stretched out along a bench
        r += ROW
    # Walking up and down the aisles.
    for aisle in (-FAN * 0.5, 0.0, FAN * 0.5):
        rr = SEAT_R0
        while rr < SEAT_R1:
            if rng.random() < 0.35:
                aa = aisle + rng.uniform(-0.01, 0.01)
                x, y = math.sin(aa) * rr, cy - math.cos(aa) * rr
                add('stand', (x, y, seat_z(rr, floor)), 0.13)
            rr += rng.uniform(1.0, 3.0)
    lib = people_library()
    if lib:
        # Full-detail people within 25 m of the camera, light ones beyond.
        cams = [Vector(c) for c in keep_clear]
        for k, (pose, (pts, yaws)) in enumerate(poses.items()):
            near = [i for i, p in enumerate(pts) if cams and min((Vector(p) - c).length for c in cams) < 25.0]
            nset = set(near)
            far = [i for i in range(len(pts)) if i not in nset]
            for tag, idx in (('people hi', near), ('people', far)):
                src = lib.get((tag, pose)) or lib.get(('people', pose))
                if idx and src:
                    scatter_people(coll, f'crowd, {pose}, {tag}', [pts[i] for i in idx], [yaws[i] for i in idx], src,
                                   101 + 13 * k)
        return {k: len(v[0]) for k, v in poses.items()}
    # Looks, from a separate stream so the crowd's places don't change with
    # them (an edited render of these places can be laid back over).
    looks = random.Random(7419)
    for pose, (pts, yaws) in poses.items():
        split = {'short': ([], []), 'long': ([], []), 'hat': ([], []), 'bare': ([], [])}
        for p, y in zip(pts, yaws):
            u = looks.random()
            k = 'short' if u < 0.25 else 'hat' if u < 0.37 else 'bare' if u < 0.47 else 'long'
            split[k][0].append(p)
            split[k][1].append(y)
        for look, (pp, yy) in split.items():
            if pp:
                scatter(coll, f'crowd, {pose}, {look}', figure_mesh(f'person {pose} {look}', pose, look), pp, mats, yy)
    return {k: len(v[0]) for k, v in poses.items()}


# ─── all of it ────────────────────────────────────────────────────────────────

def build_haze(coll):
    """Summer haze in the canyon: a thin volume, so the hills recede."""
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=(700, 700, 140), verts=bm.verts)
    bmesh.ops.translate(bm, vec=(0, 100, 68), verts=bm.verts)
    m = bpy.data.materials.new('Haze')
    m.use_nodes = True
    nt, links = m.node_tree.nodes, m.node_tree.links
    nt.remove(nt['Principled BSDF'])
    vol = nt.new('ShaderNodeVolumePrincipled')
    vol.inputs['Density'].default_value = 0.0045
    vol.inputs['Color'].default_value = venue.srgb('#d9d2c2')
    links.new(vol.outputs['Volume'], nt['Material Output'].inputs['Volume'])
    o = obj('haze', bm, [m], coll)
    o.visible_shadow = False


def build(S, coll, B, keep_clear=()):
    deck = S['deck']['y']
    floor = deck - STAGE_DROP
    cy = B((0, 0, S['deck']['maxZ'])).y          # the stage front's centre line
    build_terrain(coll, floor, deck, cy)
    build_seating(coll, floor, cy)
    if not build_plants(coll, floor, deck, cy):
        build_trees(coll, floor, deck, cy)
    _, (y0, R0, yw) = build_shell(coll, deck)
    build_tubes(coll, deck, y0, R0)
    venue.build_tiedyes(S, coll, B)
    n = build_crowd(coll, floor, cy, keep_clear)
    build_haze(coll)
    print('CROWD', n)


def lights():
    """The afternoon sun (venue.outdoor_lights), under Poly Haven's late-afternoon sky."""
    venue.outdoor_lights()
    path = os.path.join(ASSETS, 'kiara_7_late-afternoon_4k.exr')
    if not os.path.exists(path):
        return
    w = bpy.context.scene.world
    nt, links = w.node_tree.nodes, w.node_tree.links
    env = nt.new('ShaderNodeTexEnvironment')
    env.image = bpy.data.images.load(path)
    tc = nt.new('ShaderNodeTexCoord')
    mp = nt.new('ShaderNodeMapping')
    # Turn the image so its low sun glows on the same side as the sun lamp.
    s = venue.sun_vector()
    want = math.atan2(s.y, s.x)
    have = math.atan2(0.669, -0.743)              # where the image's sun is (measured)
    mp.inputs['Rotation'].default_value = (0, 0, have - want)
    links.new(tc.outputs['Generated'], mp.inputs['Vector'])
    links.new(mp.outputs['Vector'], env.inputs['Vector'])
    # Cap the image's sun: the lamp lights the scene; the sky only fills.
    cap = nt.new('ShaderNodeVectorMath')
    cap.operation = 'MINIMUM'
    cap.inputs[1].default_value = (6.0, 6.0, 6.0)
    links.new(env.outputs['Color'], cap.inputs[0])
    bg = nt['Background']
    links.new(cap.outputs['Vector'], bg.inputs['Color'])
    bg.inputs['Strength'].default_value = 0.55


def seat_eye(x, r_back, S, B):
    """A camera place in the seats: (x, y, z) at seated eye height, r_back from the stage front."""
    deck = S['deck']['y']
    cy = B((0, 0, S['deck']['maxZ'])).y
    return (x, cy - r_back, seat_z(r_back, deck - STAGE_DROP) + 1.15)

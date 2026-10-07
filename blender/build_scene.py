"""
Builds the Wall of Sound in Blender from blender/scene.json and renders it.

Nothing here is modelled by hand. scene.json is written by
`npm run export:scene` from src/data/wall.config.ts, the same source the web
app draws from, so correcting the history never means editing this scene.

    npm run export:scene
    /Applications/Blender.app/Contents/MacOS/Blender -b -P blender/build_scene.py -- \
        --shot pechner --samples 256 --scale 2 --out .shots/blender

Add --save to also write blender/wall.blend for looking around by hand.

The scene frame is metres, +Y up, +Z toward the audience. Blender is Z-up, so
(x, y, z) becomes (x, -z, y): the audience is at -Y and cabinets face -Y.
"""
import argparse
import json
import math
import os
import sys

import bmesh
import bpy
from mathutils import Matrix, Vector

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'blender'))
import roadgear  # noqa: E402  (the amps, cases and stickers)
import venue  # noqa: E402  (outdoors: sky, ground, tarps)
import hollywood_bowl  # noqa: E402  (the Hollywood Bowl, 21 July 1974)


def args():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    p = argparse.ArgumentParser()
    p.add_argument('--shot', default='pechner')
    p.add_argument('--samples', type=int, default=256)
    p.add_argument('--scale', type=float, default=2.0)
    p.add_argument('--out', default=os.path.join(ROOT, '.shots', 'blender'))
    p.add_argument('--save', action='store_true')
    p.add_argument('--venue', default='arena', choices=['arena', 'outdoor', 'hollywood'],
                   help='arena: the hall of Pechner\'s photograph; outdoor: sky, ground and tarps')
    return p.parse_args(argv)


def B(p):
    """Scene frame (Y up, +Z audience) to Blender (Z up, audience at -Y)."""
    return Vector((p[0], -p[2], p[1]))


def srgb(hex_):
    """sRGB hex to the linear floats Blender's colour inputs expect."""
    out = []
    for i in (1, 3, 5):
        c = int(hex_[i:i + 2], 16) / 255
        out.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
    return (*out, 1.0)


# ─── materials ────────────────────────────────────────────────────────────────

def principled(name, base, rough, metal=0.0, **extra):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes['Principled BSDF']
    bsdf.inputs['Base Color'].default_value = srgb(base) if isinstance(base, str) else base
    bsdf.inputs['Roughness'].default_value = rough
    bsdf.inputs['Metallic'].default_value = metal
    for k, v in extra.items():
        bsdf.inputs[k].default_value = v
    return m, bsdf


def wood(name, light, dark, scale=6.0, rough=0.72):
    """Birch ply: a stretched wave for the grain, noise for handling wear."""
    m, bsdf = principled(name, light, rough)
    nt, links = m.node_tree.nodes, m.node_tree.links
    coord = nt.new('ShaderNodeTexCoord')
    wave = nt.new('ShaderNodeTexWave')
    wave.wave_type = 'BANDS'
    wave.bands_direction = 'X'
    wave.inputs['Scale'].default_value = scale
    wave.inputs['Distortion'].default_value = 6.0
    wave.inputs['Detail'].default_value = 3.0
    noise = nt.new('ShaderNodeTexNoise')
    noise.inputs['Scale'].default_value = 3.0
    mix = nt.new('ShaderNodeMix')
    mix.data_type = 'RGBA'
    mix.inputs['A'].default_value = srgb(light)
    mix.inputs['B'].default_value = srgb(dark)
    ramp = nt.new('ShaderNodeMath')
    ramp.operation = 'MULTIPLY_ADD'
    ramp.inputs[1].default_value = 0.35
    ramp.inputs[2].default_value = 0.0
    add = nt.new('ShaderNodeMath')
    add.operation = 'MULTIPLY_ADD'  # grain + 0.25 x wear
    add.inputs[2].default_value = 0.0
    links.new(coord.outputs['Object'], wave.inputs['Vector'])
    links.new(coord.outputs['Object'], noise.inputs['Vector'])
    links.new(wave.outputs['Fac'], ramp.inputs[0])
    wear = nt.new('ShaderNodeMath')
    wear.operation = 'MULTIPLY'
    wear.inputs[1].default_value = 0.25
    links.new(noise.outputs['Fac'], wear.inputs[0])
    links.new(ramp.outputs[0], add.inputs[0])
    add.inputs[1].default_value = 1.0
    links.new(wear.outputs[0], add.inputs[2])
    # Softened edges: a bevel in the shading catches a highlight on every corner.
    bevel = nt.new('ShaderNodeBevel')
    bevel.inputs['Radius'].default_value = 0.004
    links.new(bevel.outputs['Normal'], bsdf.inputs['Normal'])
    clamp = nt.new('ShaderNodeClamp')
    links.new(add.outputs[0], clamp.inputs['Value'])
    links.new(clamp.outputs[0], mix.inputs['Factor'])
    links.new(mix.outputs['Result'], bsdf.inputs['Base Color'])
    return m


def build_materials():
    M = {}
    M['ply'] = wood('Birch ply', '#a08a6c', '#6b5842')
    M['baffle'], _ = principled('Baffle, flat black', '#0d0d0d', 0.85)
    # Paper cones: mid-grey, matte, with a little sheen at grazing angles.
    M['cone'], b = principled('Paper cone', '#2a2a2c', 0.88)
    b.inputs['Sheen Weight'].default_value = 0.3
    M['cap'], _ = principled('Aluminium dust cap', '#d9dbde', 0.22, 1.0)
    M['frame'], _ = principled('Driver frame', '#1b1b1d', 0.45, 0.6)
    # Stage lamps: black-painted cans, a dark lens.
    M['lampbody'], _ = principled('Lamp can, black paint', '#121212', 0.5, 0.3)
    M['lens'], _ = principled('Lamp lens, unlit', '#2b2a27', 0.08, 0.0)
    M['horn'], _ = principled('Horn flare', '#161616', 0.5)
    M['steel'], _ = principled('Galvanised tube', '#a9adb1', 0.38, 1.0)
    # The cluster's 5" strips: dull, oxidised aluminium channel (Sotheby's lot 49).
    M['strip'], _ = principled('Cluster strip, aluminium', '#8a8e91', 0.5, 0.9)
    M['deck'] = wood('Deck ply', '#7d6548', '#4a3a28', scale=2.5, rough=0.8)
    M['plank'] = wood('Floor plank', '#8f7552', '#5a452e', scale=3.0, rough=0.8)
    M['facing'], _ = principled('Stage skirt, black', '#0b0b0c', 0.9)
    M['cable'], _ = principled('Cable, rubber', '#0e0e0e', 0.6)
    M['floor'], _ = principled('Arena floor', '#5a5750', 0.9)
    M['hall'], _ = principled('Arena interior', '#2a2a2c', 0.95)
    return M


# ─── cabinet prototypes ───────────────────────────────────────────────────────

def mesh_from_bm(bm, name):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    return me


def box_bm(bm, w, d, h, centre, mat):
    geom = bmesh.ops.create_cube(bm, size=1.0)['verts']
    bmesh.ops.scale(bm, vec=(w, d, h), verts=geom)
    bmesh.ops.translate(bm, vec=centre, verts=geom)
    for f in {f for v in geom for f in v.link_faces}:
        f.material_index = mat


def cabinet_prototype(cid, cab, drv, slots, top=True, bottom=True, left=True, right=True, back=True):
    """
    One cabinet with its driver, front facing -Y, as a single mesh with
    material slots: ply, baffle, cone, cap, frame, horn.

    top/bottom=False leaves that board off, so two cells stacked read as one
    box holding two drivers: how the 12"s were built (Sotheby's lot 47).
    left/right/back=False do the same across, for the cluster's aluminium
    strips (lot 49): cells side by side read as one open-backed channel.
    """
    w, h, d, t, inset = cab['w'], cab['h'], cab['d'], cab['shell'], cab['inset']
    oz = cab.get('driverY', 0.0)
    bm = bmesh.new()
    ply, baffle, cone, cap, frame, horn = (slots[k] for k in ('ply', 'baffle', 'cone', 'cap', 'frame', 'horn'))

    # Carcass: sides, top, bottom and back as separate boards, so the front is open.
    tt, tb = (t if top else 0.0), (t if bottom else 0.0)
    if left:
        box_bm(bm, t, d, h, (-w / 2 + t / 2, 0, 0), ply)
    if right:
        box_bm(bm, t, d, h, (w / 2 - t / 2, 0, 0), ply)
    if top:
        box_bm(bm, w - 2 * t, d, t, (0, 0, h / 2 - t / 2), ply)
    if bottom:
        box_bm(bm, w - 2 * t, d, t, (0, 0, -h / 2 + t / 2), ply)
    if back:
        box_bm(bm, w - 2 * t, t, h - tt - tb, (0, d / 2 - t / 2, (tb - tt) / 2), ply)

    # Baffle board, set back by `inset`, with the driver hole cut through it.
    by = -d / 2 + inset
    bw, bh, bt = w - 2 * t, h - tt - tb, min(t, 0.019)
    bz = (tb - tt) / 2
    r_hole = min(drv['coneDia'] / 2 + drv['surroundWidth'], bw / 2 * 0.98, bh / 2 * 0.98 - abs(oz - bz))
    seg = 48
    hole = bmesh.ops.create_circle(bm, cap_ends=False, segments=seg, radius=r_hole)['verts']
    for v in hole:
        v.co = Vector((v.co.x, by, v.co.y + oz))
    corners = [bm.verts.new((sx * bw / 2, by, bz + sz * bh / 2)) for sx, sz in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
    rect = [bm.edges.new((corners[i], corners[(i + 1) % 4])) for i in range(4)]
    ring = list({e for v in hole for e in v.link_edges})
    # Fill between the board's edge and the hole; the inner loop stays open.
    filled = bmesh.ops.triangle_fill(bm, edges=rect + ring, use_beauty=True, normal=(0, -1, 0))
    for f in filled['geom']:
        if isinstance(f, bmesh.types.BMFace):
            f.material_index = baffle

    if drv['coneDepth'] < 0:
        # EV T350: a short rectangular horn projecting forward of the baffle.
        L = abs(drv['coneDepth'])
        res = bmesh.ops.create_cone(bm, cap_ends=False, segments=4, radius1=drv['frameDia'] / 2,
                                    radius2=drv['frameDia'] / 3.2, depth=L)
        bmesh.ops.rotate(bm, verts=res['verts'], cent=(0, 0, 0), matrix=Matrix.Rotation(math.radians(45), 3, 'Z'))
        # -90 about X sends +Z to +Y, so the wide end (radius1, at -Z) faces the audience.
        bmesh.ops.rotate(bm, verts=res['verts'], cent=(0, 0, 0), matrix=Matrix.Rotation(math.radians(-90), 3, 'X'))
        bmesh.ops.translate(bm, verts=res['verts'], vec=(0, by - L / 2, oz))
        for f in {f for v in res['verts'] for f in v.link_faces}:
            f.material_index = horn
        return mesh_from_bm(bm, f'{cid} proto')

    coneR, capR, depth = drv['coneDia'] / 2, drv['dustCapDia'] / 2, drv['coneDepth']
    # Paper cone, mouth at the baffle, receding into the box.
    res = bmesh.ops.create_cone(bm, cap_ends=False, segments=seg, radius1=coneR, radius2=capR * 1.15, depth=depth)
    bmesh.ops.rotate(bm, verts=res['verts'], cent=(0, 0, 0), matrix=Matrix.Rotation(math.radians(-90), 3, 'X'))
    bmesh.ops.translate(bm, verts=res['verts'], vec=(0, by + depth / 2, oz))
    for f in {f for v in res['verts'] for f in v.link_faces}:
        f.material_index = cone
    # Half-roll surround.
    sw = drv['surroundWidth']
    if sw > 0:
        tor = bmesh.ops.create_circle(bm, segments=seg, radius=coneR + sw / 2)['verts']
        for v in tor:
            v.co = Vector((v.co.x, by - 0.002, v.co.y + oz))
        # A flat annulus is enough at this scale; the roll reads from the shading.
        ring = bmesh.ops.create_circle(bm, segments=seg, radius=coneR)['verts']
        for v in ring:
            v.co = Vector((v.co.x, by, v.co.y + oz))
        e1 = [e for v in tor for e in v.link_edges]
        e2 = [e for v in ring for e in v.link_edges]
        br = bmesh.ops.bridge_loops(bm, edges=list(set(e1 + e2)))
        for f in br['faces']:
            f.material_index = cone
    # Steel frame flange around the hole.
    fl_o = bmesh.ops.create_circle(bm, segments=seg, radius=min(drv['frameDia'] / 2, r_hole))['verts']
    fl_i = bmesh.ops.create_circle(bm, segments=seg, radius=coneR + sw * 0.9)['verts']
    for v in fl_o + fl_i:
        v.co = Vector((v.co.x, by - 0.004, v.co.y + oz))
    br = bmesh.ops.bridge_loops(bm, edges=list({e for v in fl_o + fl_i for e in v.link_edges}))
    for f in br['faces']:
        f.material_index = frame
    # Aluminium dust cap: the bright point every photograph of the Wall is made of.
    sph = bmesh.ops.create_uvsphere(bm, u_segments=24, v_segments=8, radius=capR)
    keep = [v for v in sph['verts'] if v.co.z >= -1e-6]
    bmesh.ops.delete(bm, geom=[v for v in sph['verts'] if v.co.z < -1e-6], context='VERTS')
    bmesh.ops.scale(bm, verts=keep, vec=(1, 1, drv['dustCapRise'] / capR))
    bmesh.ops.rotate(bm, verts=keep, cent=(0, 0, 0), matrix=Matrix.Rotation(math.radians(90), 3, 'X'))
    bmesh.ops.translate(bm, verts=keep, vec=(0, by + depth, oz))
    for f in {f for v in keep for f in v.link_faces}:
        f.material_index = cap
    return mesh_from_bm(bm, f'{cid} proto')


# ─── scene ────────────────────────────────────────────────────────────────────

def new_obj(name, mesh, coll):
    o = bpy.data.objects.new(name, mesh)
    coll.objects.link(o)
    return o


def unit_box(name, mat):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    me = mesh_from_bm(bm, name)
    me.materials.append(mat)
    return me


def tube_mesh(name, r, mat, seg=10):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r, radius2=r, depth=1.0)
    me = mesh_from_bm(bm, name)
    me.materials.append(mat)
    for p in me.polygons:
        p.use_smooth = True
    return me


def place_segment(o, a, b):
    a, b = B(a), B(b)
    d = b - a
    o.location = (a + b) / 2
    o.rotation_mode = 'QUATERNION'
    o.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(d.normalized())
    o.scale = (1, 1, d.length)


def build(S, M, place='arena'):
    scene = bpy.context.scene
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o)
    root = scene.collection
    colls = {}
    for n in ('Speakers', 'Scaffold', 'Stage', 'Gear', 'Venue'):
        c = bpy.data.collections.new(n)
        root.children.link(c)
        colls[n] = c

    slot_order = ['ply', 'baffle', 'cone', 'cap', 'frame', 'horn']
    slots = {k: i for i, k in enumerate(slot_order)}
    protos = {}
    for cid, cab in S['cabinets'].items():
        # The 12"s come two to a box (lot 47): a lower cell without its top
        # board and an upper one without its bottom. An odd row out is whole.
        drv = S['drivers'][cab['driver']]
        if cab.get('strip'):
            # A length of strip: end plates at its two ends only, no back,
            # face and flanges all aluminium.
            for kind, (l, r) in {'mid': (False, False), 'first': (True, False),
                                 'last': (False, True), 'single': (True, True)}.items():
                me = cabinet_prototype(cid, cab, drv, slots, left=l, right=r, back=False)
                for k in slot_order:
                    me.materials.append(M['strip'] if k in ('ply', 'baffle') else M[k])
                protos[cid, kind] = me
            continue
        kinds = {'whole': (True, True)}
        if cid == 'cab12':
            kinds.update(lower=(False, True), upper=(True, False))
        for kind, (top, bottom) in kinds.items():
            me = cabinet_prototype(cid, cab, drv, slots, top, bottom)
            for k in slot_order:
                me.materials.append(M[k])
            protos[cid, kind] = me

    def pair(c):
        n = S['cabinets'][c['cabinet']].get('strip', 0)
        if n:
            k = c['col'] % n
            first, last = k == 0, k == n - 1 or c['col'] == c.get('cols', 0) - 1
            return 'single' if first and last else 'first' if first else 'last' if last else 'mid'
        if c['cabinet'] != 'cab12' or (c['row'] == c['rows'] - 1 and c['rows'] % 2):
            return 'whole'
        return 'lower' if c['row'] % 2 == 0 else 'upper'

    for i, c in enumerate(S['cells']):
        o = new_obj(f"{c['block']}.{i:03d}", protos[c['cabinet'], pair(c)], colls['Speakers'])
        o.location = B(c['p'])
        o.rotation_euler = (0, 0, c['ry'])

    tube = tube_mesh('tube', S['tubeRadius'], M['steel'])
    for i, t in enumerate(S['tubes']):
        place_segment(new_obj(f'tube.{i:04d}', tube, colls['Scaffold']), t['a'], t['b'])
    cable = tube_mesh('cable', S['cableRadius'], M['cable'], seg=8)
    for i, t in enumerate(S['cable']):
        place_segment(new_obj(f'cable.{i:03d}', cable, colls['Scaffold']), t['a'], t['b'])

    boxes = {k: unit_box(k, M[k]) for k in ('deck', 'facing', 'plank')}
    for i, s in enumerate(S['slabs']):
        o = new_obj(f"stage.{s['kind']}.{i}", boxes['deck' if s['kind'] == 'deck' else 'facing'], colls['Stage'])
        o.location = B(s['c'])
        o.scale = (s['s'][0], s['s'][2], s['s'][1])
    for i, s in enumerate(S['floors']):
        o = new_obj(f'floor.{i:02d}', boxes['plank'], colls['Stage'])
        o.location = B(s['c'])
        o.scale = (s['s'][0], s['s'][2], s['s'][1])

    roadgear.build_gear(S, colls['Gear'], B)
    build_light_rig(S, M, colls['Scaffold'], place)

    if place == 'outdoor':
        venue.build_outdoor(S, colls['Venue'], B)
        return
    if place == 'hollywood':
        hollywood_bowl.build(S, colls['Venue'], B, hollywood_bowl.KEEP_CLEAR)
        return
    # The hall: a floor, and a dark box of an arena around it.
    floor = unit_box('arena floor', M['floor'])
    o = new_obj('arena floor', floor, colls['Venue'])
    o.location = (0, -30, -0.05)
    o.scale = (160, 160, 0.1)
    hall = unit_box('arena', M['hall'])
    for name, loc, sc in (
        ('arena back', (0, 45, 15), (160, 1, 40)),
        ('arena left', (-60, -20, 15), (1, 140, 40)),
        ('arena right', (60, -20, 15), (1, 140, 40)),
        ('arena roof', (0, -20, 32), (160, 140, 1)),
        ('arena behind camera', (0, -75, 15), (160, 1, 40)),
    ):
        o = new_obj(name, hall, colls['Venue'])
        o.location, o.scale = loc, sc


def build_light_rig(S, M, coll, place='arena'):
    """
    The light bars (structure.lightBars): pipes, and on each lamp a clamp, a
    yoke and a black can aimed down at the band. Unlit: in daylight they are
    hardware, and the photographs show them dark.
    """
    R = S['lights']
    pipe = tube_mesh('light pipe', 0.024, M['steel'])
    keep = lambda o: place == 'arena' or not o.get('indoor')
    for i, t in enumerate(R['pipes']):
        if not keep(t):
            continue
        place_segment(new_obj(f'light.pipe.{i:02d}', pipe, coll), t['a'], t['b'])
    r, L = R['dia'] / 2, R['len']
    bm = bmesh.new()
    # The can: body, a lip at the front, the lens recessed in it. Built along -Z
    # (the aim) from its pivot at the origin.
    body = bmesh.ops.create_cone(bm, cap_ends=True, segments=20, radius1=r, radius2=r * 0.92, depth=L)['verts']
    bmesh.ops.translate(bm, verts=body, vec=(0, 0, -L / 2 + 0.06))
    lip = bmesh.ops.create_cone(bm, cap_ends=False, segments=20, radius1=r * 1.08, radius2=r * 1.08, depth=0.03)['verts']
    bmesh.ops.translate(bm, verts=lip, vec=(0, 0, -L + 0.07))
    for v in body + lip:
        for f in v.link_faces:
            f.material_index = 0
            f.smooth = True
    lens = bmesh.ops.create_circle(bm, cap_ends=True, segments=20, radius=r * 0.8)['verts']
    bmesh.ops.translate(bm, verts=lens, vec=(0, 0, -L + 0.075))
    for v in lens:
        for f in v.link_faces:
            f.material_index = 1
    # Yoke: two arms either side of the can, joined above it.
    for sx in (-1, 1):
        arm = bmesh.ops.create_cube(bm, size=1.0)['verts']
        bmesh.ops.scale(bm, vec=(0.012, 0.04, 0.2), verts=arm)
        bmesh.ops.translate(bm, vec=(sx * (r + 0.015), 0, 0.03), verts=arm)
        for v in arm:
            for f in v.link_faces:
                f.material_index = 2
    me = mesh_from_bm(bm, 'lamp')
    for k in ('lampbody', 'lens', 'frame'):
        me.materials.append(M[k])
    yoke = bmesh.new()
    top = bmesh.ops.create_cube(yoke, size=1.0)['verts']
    bmesh.ops.scale(yoke, vec=(2 * r + 0.05, 0.04, 0.014), verts=top)
    bmesh.ops.translate(yoke, vec=(0, 0, 0.13), verts=top)
    clamp = bmesh.ops.create_cube(yoke, size=1.0)['verts']
    bmesh.ops.scale(yoke, vec=(0.05, 0.06, 0.06), verts=clamp)
    bmesh.ops.translate(yoke, vec=(0, 0, 0.18), verts=clamp)
    yme = mesh_from_bm(yoke, 'lamp yoke')
    yme.materials.append(M['frame'])
    for i, l in enumerate(R['lamps']):
        if not keep(l):
            continue
        at, aim = B(l['at']), B(l['aim'])
        d = (aim - at).normalized()
        # The yoke hangs plumb under the pipe and turns to face the aim.
        h = new_obj(f'light.yoke.{i:02d}', yme, coll)
        h.location = at
        h.rotation_euler = (0, 0, math.atan2(d.x, -d.y))
        o = new_obj(f'light.can.{i:02d}', me, coll)
        o.location = at
        o.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()


# ─── light and camera ─────────────────────────────────────────────────────────

def lights(place='arena'):
    """A sound check under house and work lights: broad, soft, from the front and above."""
    if place == 'hollywood':
        hollywood_bowl.lights()
        return
    if place == 'outdoor':
        venue.outdoor_lights()
        return
    def area(name, loc, rot, size, power, colour='#fff3e2'):
        L = bpy.data.lights.new(name, 'AREA')
        L.shape = 'RECTANGLE'
        L.size, L.size_y = size
        L.energy = power
        L.color = srgb(colour)[:3]
        o = bpy.data.objects.new(name, L)
        bpy.context.scene.collection.objects.link(o)
        o.location, o.rotation_euler = loc, [math.radians(a) for a in rot]
        return o

    area('house key', (0, -34, 22), (58, 0, 0), (40, 10), 14000)
    area('house left', (-35, -20, 26), (40, 0, -40), (20, 20), 4000, '#e8eefc')
    area('house right', (35, -20, 26), (40, 0, 40), (20, 20), 4000, '#e8eefc')
    area('overhead', (0, 0, 30), (0, 0, 0), (60, 30), 5000, '#f4f1ea')
    world = bpy.context.scene.world or bpy.data.worlds.new('World')
    bpy.context.scene.world = world
    world.use_nodes = True
    world.node_tree.nodes['Background'].inputs['Color'].default_value = srgb('#1c1f24')
    world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.12


SHOTS = {
    # Solved from Pechner's 17 May 1974 frame (docs/qa-findings.md §6):
    # 9.52 px/ft on the tower face, lens level with the deck, principal point
    # at (398, 440) in a 796 x 600 frame, 55 ft from the wall face.
    'pechner': {'size': (796, 600), 'pos': (-0.08, 3.05, 16.764), 'f_px': 524.6, 'pp': (398, 440)},
    # Checking shots: a vocal-low column and the cluster, close up.
    'close': {'size': (800, 600), 'pos': (-2.6, 4.9, 3.2), 'target': (-4.2, 5.4, 0), 'f_px': 700, 'pp': (400, 300)},
    'cluster': {'size': (800, 600), 'pos': (1.5, 4.2, 7.5), 'target': (0, 7.0, 0), 'f_px': 800, 'pp': (400, 300)},
    # The road gear: a stack of loose cases, and a rack of amps beyond it.
    'gear': {'size': (1200, 800), 'pos': (-4.7, 4.5, 3.4), 'target': (-6.6, 3.6, 0.6), 'f_px': 1100, 'pp': (600, 400)},
    'rack': {'size': (1000, 800), 'pos': (-5.6, 4.1, -0.7), 'target': (-6.54, 3.75, -2.2), 'f_px': 900, 'pp': (500, 400)},
}


def camera(shot, scale):
    W, H = shot['size']
    cam = bpy.data.cameras.new('camera')
    cam.sensor_fit = 'HORIZONTAL'
    cam.sensor_width = 36.0
    cam.lens = shot['f_px'] / W * 36.0
    # Blender shifts in units of the larger image side; +Y moves the frame up.
    cam.shift_x = -(shot['pp'][0] - W / 2) / max(W, H)
    cam.shift_y = (shot['pp'][1] - H / 2) / max(W, H)
    cam.clip_end = 400
    o = bpy.data.objects.new('camera', cam)
    bpy.context.scene.collection.objects.link(o)
    o.location = B(shot['pos'])
    if 'target' in shot:
        o.rotation_euler = (B(shot['target']) - o.location).to_track_quat('-Z', 'Y').to_euler()
    else:
        o.rotation_euler = (math.radians(90), 0, 0)  # level, looking at the wall (+Y)
    s = bpy.context.scene
    s.camera = o
    s.render.resolution_x, s.render.resolution_y = int(W * scale), int(H * scale)
    s.render.resolution_percentage = 100


def render_settings(samples):
    s = bpy.context.scene
    s.render.engine = 'CYCLES'
    prefs = bpy.context.preferences.addons['cycles'].preferences
    prefs.compute_device_type = 'METAL'
    prefs.get_devices()
    for d in prefs.devices:
        d.use = d.type == 'METAL'
    s.cycles.device = 'GPU'
    s.cycles.samples = samples
    s.cycles.use_adaptive_sampling = True
    s.cycles.use_denoising = True
    s.cycles.max_bounces = 8
    s.view_settings.view_transform = 'AgX'
    s.view_settings.look = 'None'
    s.render.image_settings.file_format = 'PNG'
    s.render.film_transparent = False


def main():
    a = args()
    with open(os.path.join(ROOT, 'blender', 'scene.json')) as f:
        S = json.load(f)
    M = build_materials()
    build(S, M, a.venue)
    lights(a.venue)
    camera(SHOTS[a.shot], a.scale)
    render_settings(a.samples)
    os.makedirs(a.out, exist_ok=True)
    if a.save:
        bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT, 'blender', 'wall.blend'))
    out = os.path.join(a.out, f'{a.shot}-cycles.png')
    bpy.context.scene.render.filepath = out
    bpy.ops.render.render(write_still=True)
    print('RENDERED', out)


main()

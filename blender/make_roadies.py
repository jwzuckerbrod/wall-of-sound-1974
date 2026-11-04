"""
Two of the crew for the explorer, at the top corners of the scaffold, written
to public/models/crew.glb: MakeHuman people (make_people.py), posed in place
with IK so their hands and boots land on the real tubes, baked like the
instruments (export_instruments.py). Nobody in particular; every number is in
structure.crewAloft, the evidence in PROVENANCE['structure.crewAloft'].

    npm run export:scene
    /Applications/Blender.app/Contents/MacOS/Blender -b -P blender/make_roadies.py

Needs MPFB and its packs, as make_people.py does. Hair keeps its own texture,
tinted and drawn opaque: its alpha, exported, cuts away the scalp. The packs have no vest,
plaid shirt or sunglasses, so those are made here: a vest is a T-shirt with its
sleeves and front taken out, puffed outward, quilted for a down vest.
"""
import json
import math
import os

import bmesh
import bpy
import numpy as np
from mathutils import Euler, Matrix, Vector

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public', 'models', 'crew.glb')


def borrowed(script, tail):
    """Another script's functions, without running its main()."""
    path = os.path.join(ROOT, 'blender', script)
    src = open(path).read().rsplit(tail, 1)[0]
    g = {'__file__': path, '__name__': script}
    exec(compile(src, path, 'exec'), g)
    return g


P = borrowed('make_people.py', '\nmain()')
X = borrowed('export_instruments.py', '\nmain()')
HS = P['HumanService']
LS = P['LocationService']

with open(os.path.join(ROOT, 'blender', 'scene.json')) as f:
    S = json.load(f)


def B(p):
    """The scene frame (+y up, +z to the audience) to Blender's."""
    return Vector((p[0], -p[2], p[1]))


def empty(name, at):
    o = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(o)
    o.location = at
    return o


def base_image(o):
    for slot in o.material_slots:
        m = slot.material
        if m and m.use_nodes:
            for n in m.node_tree.nodes:
                if n.type == 'TEX_IMAGE' and n.image and 'norm' not in n.image.name.lower():
                    return n.image
    return None


def flat(o, hex_, rough=0.8, name=None):
    """Replaces o's materials with one plain colour."""
    m = bpy.data.materials.new(name or f'{o.name} plain')
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = P['srgb'](hex_)
    b.inputs['Roughness'].default_value = rough
    o.data.materials.clear()
    o.data.materials.append(m)
    return m, b


def plaid(o):
    """A flannel shirt: dark red and black checks with a pale line, on the garment's own UVs."""
    n = 512
    y, x = np.mgrid[0:n, 0:n]
    cell = n // 18
    u = (x % cell) < cell // 2
    v = (y % cell) < cell // 2
    px = np.zeros((n, n, 4), dtype=np.float32)
    px[..., 3] = 1
    px[..., :3] = np.array(P['srgb']('#7a2a24')[:3])
    px[u ^ v, :3] = np.array(P['srgb']('#3a1c1a')[:3])
    px[u & v, :3] = np.array(P['srgb']('#14110f')[:3])
    px[((x % cell) < 2) | ((y % cell) < 2), :3] = np.array(P['srgb']('#b9a988')[:3])
    im = bpy.data.images.new(f'{o.name} plaid', n, n)
    im.pixels.foreach_set(px.ravel())
    im.pack()
    m, b = flat(o, '#7a2a24', 0.9)
    t = m.node_tree.nodes.new('ShaderNodeTexImage')
    t.image = im
    m.node_tree.links.new(t.outputs['Color'], b.inputs['Base Color'])


def make_vest(shirt, kind):
    """A copy of the T-shirt, on the same rig, with no sleeves, open down the front, outside it."""
    v = shirt.copy()
    v.data = shirt.data.copy()
    v.name = f'{shirt.name} vest'
    bpy.context.scene.collection.objects.link(v)
    me = v.data
    arms = {g.index for g in v.vertex_groups if g.name.split('.')[0] in ('upperarm01', 'upperarm02', 'lowerarm01')}
    gone = [p.index for p in me.vertices
            if any(g.group in arms and g.weight > 0.62 for g in p.groups) or (p.co.y < 0 and abs(p.co.x) < 0.028)]
    bm = bmesh.new()
    bm.from_mesh(me)
    bm.verts.ensure_lookup_table()
    bmesh.ops.delete(bm, geom=[bm.verts[i] for i in gone], context='VERTS')
    bm.to_mesh(me)
    bm.free()
    me.update()
    down = kind == 'down'
    shade = me.color_attributes.new('quilt', 'FLOAT_COLOR', 'POINT')
    normals = [Vector(n.vector) for n in me.vertex_normals]
    for p, nor, sh in zip(me.vertices, normals, shade.data):
        # Sewn channels about 7.5 cm deep across a down vest; leather lies flat.
        k = abs(math.sin(p.co.z * math.pi / 0.075)) if down else 1.0
        p.co += nor * ((0.009 + 0.011 * k) if down else 0.011)
        d = 0.55 + 0.45 * k if down else 1.0
        sh.color = (d, d, d, 1)
    m, b = flat(v, '#2a221c' if down else '#17120e', 0.55, f'{v.name} surface')
    c = m.node_tree.nodes.new('ShaderNodeVertexColor')
    c.layer_name = 'quilt'
    mix = m.node_tree.nodes.new('ShaderNodeMix')
    mix.data_type = 'RGBA'
    mix.blend_type = 'MULTIPLY'
    mix.inputs['Factor'].default_value = 1
    mix.inputs['A'].default_value = P['srgb']('#2a221c' if down else '#17120e')
    m.node_tree.links.new(c.outputs['Color'], mix.inputs['B'])
    m.node_tree.links.new(mix.outputs['Result'], b.inputs['Base Color'])
    return v


def prop(name, rig, bone, parts, hex_, rough):
    """Small rigid things worn on a bone: boxes as (centre, size), in the rig's rest frame."""
    bm = bmesh.new()
    for centre, size in parts:
        r = bmesh.ops.create_cube(bm, size=1.0)
        for w in r['verts']:
            w.co = Vector((w.co.x * size[0], w.co.y * size[1], w.co.z * size[2])) + Vector(centre)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(f'prop {name}', me)
    bpy.context.scene.collection.objects.link(o)
    o.parent = rig
    g = o.vertex_groups.new(name=bone)
    g.add(list(range(len(me.vertices))), 1.0, 'REPLACE')
    o.modifiers.new('rig', 'ARMATURE').object = rig
    flat(o, hex_, rough, f'{name} material')
    return o


def sunglasses(rig, eyes, name):
    """Big dark 1970s lenses, rounded, and a thin frame, on the head bone."""
    vs = [v.co for v in eyes.data.vertices]
    front = min(v.y for v in vs) - 0.016
    z = sum(v.z for v in vs) / len(vs) + 0.002
    right = [v for v in vs if v.x > 0]
    x = sum(v.x for v in right) / len(right)
    # Each lens as a stack of thin slats, wider through the middle: fewer faces than a disc needs.
    parts = []
    for s in (-1, 1):
        for row in range(-3, 4):
            w = 0.05 * math.sqrt(max(0.15, 1 - (row / 3.6) ** 2))
            parts.append(((s * x, front, z + row * 0.0064), (w, 0.003, 0.0066)))
        parts.append(((s * (x + 0.03), front + 0.055, z + 0.012), (0.003, 0.11, 0.004)))   # an arm
    parts.append(((0, front, z + 0.012), (2 * x - 0.04, 0.004, 0.004)))                  # the bridge
    return prop(f'sunglasses {name}', rig, 'head', parts, '#070707', 0.12)


def card_material(name, img, hex_, size=512):
    """A hair card's own texture, tinted to hex_, at a browser's size."""
    im = img.copy()
    im.name = name
    if max(im.size) > size:
        im.scale(size, size)
    w, h = im.size
    px = np.empty(w * h * 4, dtype=np.float32)
    im.pixels.foreach_get(px)
    px = px.reshape(-1, 4)
    lum = px[:, :3].mean(axis=1)
    lum = lum / max(float(np.percentile(lum[px[:, 3] > 0.5], 90)) if (px[:, 3] > 0.5).any() else 1.0, 1e-3)
    col = np.array(P['srgb'](hex_)[:3], dtype=np.float32)
    # The cards' strand detail in lighter and darker versions of the hair colour.
    px[:, :3] = np.clip(lum[:, None] * 0.7 + 0.3, 0, 1.3) * col
    im.pixels.foreach_set(px.ravel())
    im.update()
    im.pack()
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    t = m.node_tree.nodes.new('ShaderNodeTexImage')
    t.image = im
    m.node_tree.links.new(t.outputs['Color'], b.inputs['Base Color'])
    b.inputs['Roughness'].default_value = 0.8
    return m


def add_limb_ik(rig, bone, target, chain):
    c = rig.pose.bones[bone].constraints.new('IK')
    c.target = target
    c.chain_count = chain
    c.use_rotation = False


def curl_fingers(rig, side, amount):
    for f in range(1, 6):
        for j in range(1, 4):
            b = rig.pose.bones.get(f'finger{f}-{j}.{side}')
            if b:
                b.rotation_mode = 'XYZ'
                b.rotation_euler = (math.radians(amount if j > 1 or f > 1 else amount * 0.4), 0, 0)


def make(c):
    macro = {'gender': 1.0, 'age': 0.48, 'muscle': 0.55, 'weight': 0.42, 'proportions': 0.5,
             'height': c['height'], 'cupsize': 0.5, 'firmness': 0.5,
             'race': {'caucasian': 1.0, 'african': 0.05, 'asian': 0.05}}
    body = HS.create_human(macro_detail_dict=macro)
    HS.add_builtin_rig(body, 'default')
    rig = body.parent
    sk = P['assets']('skins', 'mhmat')
    HS.set_character_skin(sk['young_caucasian_male'], body, skin_type='MAKESKIN')
    clothes = P['assets']('clothes')
    hair = P['assets']('hair')
    brows = P['assets']('eyebrows')

    def add(path, kind):
        HS.add_mhclo_asset(path, body, asset_type=kind, subdiv_levels=0, material_type='MAKESKIN')

    add(sorted(brows.values())[0], 'Eyebrows')
    eyes = os.path.join(LS.get_user_data(), 'eyes', 'low-poly', 'low-poly.mhclo')
    if os.path.exists(eyes):
        add(eyes, 'Eyes')
    add(hair[c['hair']], 'Hair')
    for extra in (c['beard'], c['moustache']):
        if extra:
            add(clothes[extra], 'Clothes')
    # The shirt under the vest: a long-sleeved flannel, or a dark T-shirt.
    add(clothes['toigo_fisherman_sweater' if c['top'] == 'plaid' else 'elvs_crude_t-shirt_male'], 'Clothes')
    add(clothes['toigo_basic_tucked_t-shirt'], 'Clothes')   # what the vest is cut from
    add(clothes['toigo_wool_pants'], 'Clothes')
    add(clothes[c['shoes']], 'Clothes')
    by = lambda k: next(o for o in rig.children if k in o.name.lower())
    shirt = by('fisherman' if c['top'] == 'plaid' else 'crude')
    if c['top'] == 'plaid':
        plaid(shirt)
    else:
        flat(shirt, '#1d1c1f', 0.9)
    cut = by('basic_tucked')
    make_vest(cut, c['vest'])
    bpy.data.objects.remove(cut)
    P['tint'](by('wool_pants'), c['trousersColour'], 'COLOR', 0.92)
    shoes = by(c['shoes'])
    P['tint'](shoes, '#4a3424', 'COLOR', 0.9)    # work boots, as near as the pack comes
    # The shoe's collar pokes through the trouser leg at a bent ankle: trim it inside the leg.
    bm = bmesh.new()
    bm.from_mesh(shoes.data)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z > 0.1], context='VERTS')
    bm.to_mesh(shoes.data)
    bm.free()
    if c['sunglasses']:
        sunglasses(rig, by('low-poly'), c['id'])
    # A big belt buckle, as in the photographs, on the trousers' front.
    pv = [v.co for v in by('wool_pants').data.vertices]
    top = max(v.z for v in pv)
    fy = min(v.y for v in pv if v.z > top - 0.05)
    prop(f"buckle {c['id']}", rig, 'spine05', [((0, fy - 0.006, top - 0.03), (0.056, 0.01, 0.038))], '#a8894e', 0.35)

    # The legs under the trousers are never seen: fewer triangles.
    hide = body.vertex_groups.new(name='under trousers')
    idx = {g.index for g in body.vertex_groups
           if g.name.split('.')[0] in ('upperleg01', 'upperleg02', 'lowerleg01', 'lowerleg02', 'foot')}
    for v in body.data.vertices:
        if any(g.group in idx and g.weight > 0.15 for g in v.groups):
            hide.add([v.index], 1.0, 'REPLACE')
    mask = body.modifiers.new('under trousers', 'MASK')
    mask.vertex_group = hide.name
    mask.invert_vertex_group = True
    # MakeHuman's young skin reads orange under the stage lights: weathered, not tanned.
    P['tint'](body, '#c8a68c', 'COLOR', 0.55)
    # The whole figure: faces its yaw, hips where the config says, leaning.
    bpy.context.view_layer.update()
    root = rig.data.bones['spine05'].head_local.copy()
    rig.matrix_world = (Matrix.Translation(B(c['hips']))
                        @ Matrix.Rotation(math.radians(c['yaw']), 4, 'Z')
                        @ Matrix.Rotation(math.radians(-c['lean']), 4, 'X')
                        @ Matrix.Translation(-root))
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.mode_set(mode='POSE')
    for side in 'LR':
        # A starting bend, so the IK folds knees and elbows the right way.
        ll = rig.pose.bones[f'lowerleg01.{side}']
        ll.rotation_mode = 'XYZ'
        ll.rotation_euler = (math.radians(35), 0, 0)
        ul = rig.pose.bones[f'upperleg01.{side}']
        ul.rotation_mode = 'XYZ'
        ul.rotation_euler = (math.radians(-20), 0, 0)
        la = rig.pose.bones[f'lowerarm01.{side}']
        la.rotation_mode = 'XYZ'
        la.rotation_euler = (math.radians(-30), 0, 0)
        add_limb_ik(rig, f'lowerarm02.{side}', empty(f"{c['id']} hand {side}", B(c[f'hand{side}'])), 4)
        add_limb_ik(rig, f'lowerleg02.{side}', empty(f"{c['id']} foot {side}", B(c[f'foot{side}'])), 4)
        curl_fingers(rig, side, 55)
    for name, share in (('spine03', 0.4), ('spine01', 0.3)):
        b = rig.pose.bones[name]
        b.rotation_mode = 'XYZ'
        b.rotation_euler = (math.radians(c['lean'] * share * 0.5), 0, 0)
    for name, share in (('neck02', 0.45), ('head', 0.55)):
        b = rig.pose.bones[name]
        b.rotation_mode = 'XYZ'
        b.rotation_euler = (math.radians(c['look']['pitch'] * share), math.radians(c['look']['yaw'] * share), 0)
    bpy.ops.object.mode_set(mode='OBJECT')
    bpy.context.view_layer.update()
    return rig, body


def rope(c):
    if not c['rope']:
        return None
    pts = [B(p) for p in c['rope']]
    cu = bpy.data.curves.new(f"{c['id']} rope", 'CURVE')
    cu.dimensions = '3D'
    cu.bevel_depth = 0.008
    cu.bevel_resolution = 1
    sp = cu.splines.new('POLY')
    sp.points.add(len(pts) - 1)
    for s, p in zip(sp.points, pts):
        s.co = (*p, 1)
    o = bpy.data.objects.new(cu.name, cu)
    bpy.context.scene.collection.objects.link(o)
    me = bpy.data.meshes.new_from_object(o.evaluated_get(bpy.context.evaluated_depsgraph_get()))
    r = bpy.data.objects.new(cu.name + ' mesh', me)
    bpy.context.scene.collection.objects.link(r)
    bpy.data.objects.remove(o)
    m = bpy.data.materials.new('rope')
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = P['srgb']('#b9ab8c')
    b.inputs['Roughness'].default_value = 0.95
    me.materials.append(m)
    return r


def main():
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.samples = 4
    try:
        sc.cycles.device = 'GPU'
    except Exception:
        pass
    out = []
    for c in S['crewAloft']:
        rig, body = make(c)
        parts = [o for o in rig.children_recursive if o.type == 'MESH']
        keys = [k.lower() for k in (c['hair'], c['beard'], c['moustache'], 'eyebrow') if k]
        cards = [o for o in parts if any(k in o.name.lower() for k in keys)]
        props = [o for o in parts if o.name.startswith('prop ')]
        solid = [o for o in parts if o not in cards and o not in props]
        for i, o in enumerate(cards):
            img = base_image(o)
            if not img:
                continue
            n = o.name.lower()
            hex_ = c['hairColour'] if c['hair'].lower() in n else '#241a14'
            j = X['joined'](f"{c['id']} card{i}", [o])
            j.data.materials.clear()
            j.data.materials.append(card_material(f"hair {c['id']} {i}", img, hex_))
            out.append(j)
        for i, p in enumerate(props):
            mats = list(p.data.materials)
            j = X['joined'](f"{c['id']} prop{i}", [p])
            j.data.materials.clear()
            j.data.materials.append(mats[0])
            out.append(j)
        o = X['joined'](c['id'], solid)
        # Half the faces: nobody gets closer than a few metres.
        d = o.modifiers.new('less', 'DECIMATE')
        d.ratio = 0.6
        d.use_collapse_triangulate = True
        bpy.ops.object.select_all(action='DESELECT')
        o.select_set(True)
        bpy.context.view_layer.objects.active = o
        bpy.ops.object.modifier_apply(modifier=d.name)
        X['unwrap'](o)
        col = X['bake'](o, 1024, 'color')
        rough = X['bake'](o, 256, 'rough')
        metal = X['bake'](o, 64, 'metal')
        o.data.materials.clear()
        o.data.materials.append(X['baked_material'](f"{c['id']}, baked", col, rough, metal))
        for uv in list(o.data.uv_layers):
            if uv.name != 'bake':
                o.data.uv_layers.remove(uv)
        out.append(o)
        r = rope(c)
        if r:
            out.append(r)
    bpy.ops.object.select_all(action='DESELECT')
    for o in out:
        o.select_set(True)
    bpy.context.view_layer.objects.active = out[0]
    bpy.ops.export_scene.gltf(
        filepath=OUT, export_format='GLB', use_selection=True, export_yup=True,
        export_apply=True, export_texcoords=True, export_normals=True, export_materials='EXPORT',
        export_image_format='WEBP', export_image_quality=82,
        export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=7,
    )
    print('EXPORTED', OUT, f'{os.path.getsize(OUT) / 1e6:.2f} MB')


main()

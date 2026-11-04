"""
Two of the crew for the explorer, at the top corners of the scaffold, written
to public/models/crew.glb: MakeHuman people (make_people.py), posed in place
with IK so their hands and boots land on the real tubes, baked like the
instruments (export_instruments.py). Nobody in particular; every number is in
structure.crewAloft, the evidence in PROVENANCE['structure.crewAloft'].

    npm run export:scene
    /Applications/Blender.app/Contents/MacOS/Blender -b -P blender/make_roadies.py

Needs MPFB and its packs, as make_people.py does. Hair keeps its own texture,
tinted, because it needs its original UVs; it's drawn opaque in the explorer.
"""
import json
import math
import os

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
                if n.type == 'TEX_IMAGE' and n.image:
                    return n.image
    return None


def card_material(name, img, hex_, size=512):
    """A hair card's own texture, tinted to hex_, its alpha kept, at a browser's size."""
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
    if c['beard']:
        add(clothes[c['beard']], 'Clothes')
    add(clothes[c['top']], 'Clothes')
    add(clothes['toigo_wool_pants'], 'Clothes')
    add(clothes[c['shoes']], 'Clothes')
    for o in rig.children:
        n = o.name.lower()
        if c['top'].lower()[:10] in n:
            P['tint'](o, c['topColour'])
        elif 'wool_pants' in n:
            P['tint'](o, c['trousersColour'], 'COLOR', 0.92)
        elif c['shoes'] in n:
            P['tint'](o, '#4a3424', 'COLOR', 0.9)    # work boots, as near as the pack comes

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
        cards = [o for o in parts if any(k in o.name.lower() for k in ('hair', 'long01', 'short0', 'brow', 'beard'))]
        solid = [o for o in parts if o not in cards]
        for i, o in enumerate(cards):
            img = base_image(o)
            if not img:
                continue
            n = o.name.lower()
            hex_ = '#2e2218' if 'brow' in n or 'beard' in n else c['hairColour']
            j = X['joined'](f"{c['id']} card{i}", [o])
            j.data.materials.clear()
            j.data.materials.append(card_material(f"hair {c['id']} {i}", img, hex_))
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

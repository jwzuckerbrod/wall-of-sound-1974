"""
Makes the Hollywood Bowl's crowd: a library of realistic 1974 concert-goers,
generated with MPFB (the MakeHuman add-on for Blender) from the MakeHuman
community's asset packs, posed, baked to plain meshes and saved to
blender/assets/makehuman/people.blend for hollywood_bowl.py to scatter.

    Blender -b -P blender/make_people.py -- [--count 48] [--test]

Needs MPFB installed and enabled, with these packs loaded into it (all in the
ignored blender/assets/makehuman/zips/, docs/qa-findings.md §16): makehuman
system assets, skins 01 and 02, poses 01, hair 01, hair 02 and 03 (CC-BY:
credit "MakeHuman community" and the hair authors), shirts 01, pants 01,
hats 01, bodyparts 05.

Each person: a body (sex, age 18-35, build, height, ancestry mostly white, as
the photographs of the crowd show), a young skin to match, eyes, eyebrows,
hair (long more often than not, men and women alike), a beard on some men,
1970s clothes (T-shirts, tank tops, a peasant-style top, jeans and shorts,
work trousers), a hat on some, shoes. Then a pose: standing with arms down,
or one of the sitting poses from poses 01, on a bench or on the ground.
Clothes are tinted from a 1970s palette so the crowd isn't all one shirt.
Every choice comes from a seeded random stream: the same command makes the
same people.
"""
import argparse
import math
import os
import random
import sys

import addon_utils
import bpy

addon_utils.enable('bl_ext.user_default.mpfb')
from bl_ext.user_default.mpfb.services.animationservice import AnimationService  # noqa: E402
from bl_ext.user_default.mpfb.services.assetservice import AssetService  # noqa: E402
from bl_ext.user_default.mpfb.services.humanservice import HumanService  # noqa: E402
from bl_ext.user_default.mpfb.services.locationservice import LocationService  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'blender', 'assets', 'makehuman', 'people.blend')

# What a 1974 crowd wore (docs/crowd-references.md), from what the packs have.
HAIR_LONG = ['long01', 'o4saken_long01', 'elvs_lady_hippy_hair', 'elvs_grump_hair', 'elvs_hazel_hair',
             'elvs_katherine_hair', 'culturalibre_hair_01', 'culturalibre_hair_05', 'cortu_shaggy_green_hair']
HAIR_SHORT = ['cortu_short_messy_hair', 'elvs_maxwell_hair', 'bob01', 'elvs_wavy_bob']
HAIR_CURLY = ['afro01', 'o4saken_curly01']
BEARDS = ['wdg_scruffy_beard', 'grinsegold_beard_sigmund_wip']
# Mostly T-shirts and shirts, as in the photographs; a few tank tops.
TOPS_M = ['elvs_crude_t-shirt_male', 'elvs_crude_t-shirt_male', 'toigo_basic_tucked_t-shirt', 'toigo_basic_tucked_t-shirt',
          'namuhekam_male_polo_shirt', 'toigo_keyhole_tank_top']
TOPS_F = ['joepal_crude_t-shirt_female', 'joepal_crude_t-shirt_female', 'toigo_basic_tucked_t-shirt',
          'toigo_basic_tucked_t-shirt', 'toigo_bodice-style_top', 'toigo_bodice-style_top', 'toigo_camisole_top']
# The wool trousers are recoloured as denim; the cargo and harem pants carry
# camouflage and floral prints the recolouring can't hide, so they're out.
BOTTOMS = ['toigo_wool_pants'] * 9 + ['cortu_jeans_shorts']   # jeans for nearly everyone
HATS = ['fedora01', 'jujube_newsboy_cap', 'grinsegold_uncle_joshis_hat']
SHOES = ['shoes01', 'shoes02', 'shoes03', 'shoes04', 'shoes05', 'shoes06']
SIT_BENCH = ['callharvey3d_sittingdefault', 'callharvey3d_sittingnatural', 'anrico_sitting02', 'anrico_sitting03',
             'anrico_sitting07', 'callharvey3d_sittinglegscrossed', 'sweetan008_sitting-pose']
SIT_GROUND = ['callharvey3d_sittingfloor2', 'callharvey3d_lotus', 'wolgade_sit_on_ground_01', 'xhado84_sitting_floor_3']
LIE = ['callharvey3d_sittingfloorstretch2']

# Natural hair, as in the photographs: mostly brown, some dark, a little blond and red.
HAIR_COLOURS = ['#3b2a1e', '#4a3424', '#5a3e28', '#2a1f18', '#6b4a2e', '#1c1612', '#7a5a38', '#a07a4a', '#c09a62', '#7a3a22']

# Shirt colours of the period, as in the crowd photographs; denim for most trousers.
TOP_COLOURS = ['#e9e3d3', '#d8cdb4', '#5c7896', '#a8502e', '#c99a3a', '#6b6a3a', '#7a2e34', '#9a8a6a', '#3a4a5a', '#c56a3a']
DENIM = ['#3b5274', '#2f4560', '#4a628a', '#6f87a8']
OTHER_TROUSERS = ['#5a4a3a', '#7a5a3a', '#3a3a3a', '#8a7a5a']


def assets(sub, kind='mhclo'):
    paths = AssetService.list_mhmat_assets(sub) if kind == 'mhmat' else AssetService.list_mhclo_assets(sub)
    return {os.path.splitext(os.path.basename(str(p)))[0]: str(p) for p in paths}


def srgb(hex_):
    c = [int(hex_[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    return tuple(v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4 for v in c) + (1.0,)


def tint(obj, hex_, blend='COLOR', amount=0.85):
    """Recolour every material on obj, keeping its texture's light and shade (blend COLOR)."""
    for slot in obj.material_slots:
        m = slot.material
        if not m or not m.use_nodes:
            continue
        m = m.copy()
        slot.material = m
        nt, L = m.node_tree.nodes, m.node_tree.links
        bsdf = next((n for n in nt if n.type == 'BSDF_PRINCIPLED'), None)
        if not bsdf:
            continue
        src = bsdf.inputs['Base Color']
        mix = nt.new('ShaderNodeMix')
        mix.data_type = 'RGBA'
        mix.blend_type = blend
        mix.inputs['Factor'].default_value = amount
        if src.links:
            L.new(src.links[0].from_socket, mix.inputs['A'])
        else:
            mix.inputs['A'].default_value = src.default_value
        mix.inputs['B'].default_value = srgb(hex_)
        L.new(mix.outputs['Result'], src)


def make_person(rng, pose, A, sk, P):
    male = rng.random() < 0.55
    race = rng.random()
    anc = 'caucasian' if race < 0.86 else ('african' if race < 0.94 else 'asian')
    macro = {
        'gender': 1.0 if male else 0.0,
        'age': rng.uniform(0.38, 0.55),            # about 18 to 32
        'muscle': rng.uniform(0.3, 0.65),
        'weight': rng.uniform(0.3, 0.6),
        'proportions': 0.5,
        'height': rng.uniform(0.3, 0.75),
        'cupsize': 0.5, 'firmness': 0.5,
        'race': {'caucasian': 1.0 if anc == 'caucasian' else 0.05,
                 'african': 1.0 if anc == 'african' else 0.05,
                 'asian': 1.0 if anc == 'asian' else 0.05},
    }
    body = HumanService.create_human(macro_detail_dict=macro)
    # The rig goes on first, so every asset added after it is rigged to it.
    HumanService.add_builtin_rig(body, 'default')
    rig = body.parent
    skin = f"young_{anc}_{'male' if male else 'female'}"
    if skin in sk:
        HumanService.set_character_skin(sk[skin], body, skin_type='ENHANCED_SSS')   # light through the skin

    def add(name, kind, table):
        if name in table:
            HumanService.add_mhclo_asset(table[name], body, asset_type=kind, subdiv_levels=0, material_type='MAKESKIN')
            return True
        return False

    eyes = os.path.join(LocationService.get_user_data(), 'eyes', 'high-poly', 'high-poly.mhclo')
    if os.path.exists(eyes):
        HumanService.add_mhclo_asset(eyes, body, asset_type='Eyes', subdiv_levels=0, material_type='MAKESKIN')
    add(rng.choice(sorted(A['eyebrows'])), 'Eyebrows', A['eyebrows'])
    u = rng.random()
    hair = rng.choice(HAIR_LONG if u < 0.62 else HAIR_CURLY if u < 0.78 else HAIR_SHORT)
    add(hair, 'Hair', A['hair'])
    if male and rng.random() < 0.4:
        add(rng.choice(BEARDS), 'Clothes', A['clothes'])
    shirt_off = male and rng.random() < 0.05
    top = None
    if not shirt_off:
        top = rng.choice(TOPS_M if male else TOPS_F)
        add(top, 'Clothes', A['clothes'])
    bottom = rng.choice(BOTTOMS)
    add(bottom, 'Clothes', A['clothes'])
    if rng.random() < 0.15:
        add(rng.choice(HATS), 'Clothes', A['clothes'])
    if pose != 'ground' or rng.random() < 0.5:
        add(rng.choice(SHOES), 'Clothes', A['clothes'])
    # Colour the clothes from the period palette.
    for o in rig.children:
        n = o.name.lower()
        if n.startswith(f'{body.name.lower()}.') and any(h.lower() in n for h in HAIR_LONG + HAIR_SHORT + HAIR_CURLY):
            tint(o, rng.choice(HAIR_COLOURS), 'COLOR', 0.9)
        if 'beard' in n:
            tint(o, rng.choice(['#2e2218', '#4a3420', '#6a4a2a', '#1e1a16']), 'COLOR', 1.0)   # one beard's texture is purple
        if top and top.lower()[:10] in n:
            tint(o, rng.choice(TOP_COLOURS))
        elif bottom.lower()[:10] in n and bottom != 'cortu_jeans_shorts':
            tint(o, rng.choice(DENIM if rng.random() < 0.8 else OTHER_TROUSERS))

    if pose == 'stand':
        # From the A-pose: arms down by the sides, a little bend at the elbows.
        bpy.context.view_layer.objects.active = rig
        bpy.ops.object.mode_set(mode='POSE')
        # On this rig +Z raises the left arm (measured), so lowering is -Z on the left.
        for side, sgn in (('L', -1), ('R', 1)):
            ua = rig.pose.bones[f'upperarm01.{side}']
            ua.rotation_mode = 'XYZ'
            ua.rotation_euler = (0, 0, math.radians(sgn * rng.uniform(32, 42)))
            la = rig.pose.bones[f'lowerarm01.{side}']
            la.rotation_mode = 'XYZ'
            la.rotation_euler = (math.radians(rng.uniform(-5, -20)), 0, 0)
        bpy.ops.object.mode_set(mode='OBJECT')
    else:
        bvh = P[rng.choice({'bench': SIT_BENCH, 'ground': SIT_GROUND, 'lie': LIE}[pose])]
        AnimationService.import_bvh_file_as_pose(rig, bvh)
    return rig, body


def facing(rig):
    """
    How far a pose has turned the body about z, from the line between the
    shoulders, rest against posed. Some of the borrowed sitting poses turn
    the whole figure; this undoes it.
    """
    def yaw(a, b):
        return math.atan2(b.y - a.y, b.x - a.x)
    rest = yaw(rig.data.bones['clavicle.L'].head_local, rig.data.bones['clavicle.R'].head_local)
    pose = yaw(rig.pose.bones['clavicle.L'].head, rig.pose.bones['clavicle.R'].head)
    pelvis = rig.matrix_world @ rig.pose.bones['spine05'].head if 'spine05' in rig.pose.bones else rig.location
    return rest - pose, pelvis


def bake(rig, name):
    """
    The rig and everything on it as one static mesh, feet (or seat) at z = 0,
    centred on the hips and facing the way the rest pose faces. Returns the
    full-detail mesh and a copy at about a third of the faces, for distance.
    """
    from mathutils import Matrix
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    dg.update()
    turn, pelvis = facing(rig)
    parts = [o for o in rig.children_recursive if o.type == 'MESH']
    meshes = []
    for o in parts:
        me = bpy.data.meshes.new_from_object(o.evaluated_get(dg), preserve_all_data_layers=False, depsgraph=dg)
        me.transform(o.matrix_world)
        me.transform(Matrix.Translation((-pelvis.x, -pelvis.y, 0)))
        me.transform(Matrix.Rotation(turn, 4, 'Z'))
        meshes.append(me)
    objs = []
    for me in meshes:
        ob = bpy.data.objects.new(name, me)
        bpy.context.scene.collection.objects.link(ob)
        objs.append(ob)
    bpy.ops.object.select_all(action='DESELECT')
    for ob in objs:
        ob.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    hi = bpy.context.view_layer.objects.active
    hi.name = name + '.hi'
    zmin = min(v.co.z for v in hi.data.vertices)
    for v in hi.data.vertices:
        v.co.z -= zmin
    for p in hi.data.polygons:
        p.use_smooth = True
    lo = hi.copy()
    lo.data = hi.data.copy()
    lo.name = name
    bpy.context.scene.collection.objects.link(lo)
    d = lo.modifiers.new('decimate', 'DECIMATE')
    d.ratio = 0.35
    bpy.context.view_layer.objects.active = lo
    bpy.ops.object.modifier_apply(modifier=d.name)
    for o in [rig] + parts:
        bpy.data.objects.remove(o, do_unlink=True)
    return hi, lo, math.degrees(turn)


def main():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    p = argparse.ArgumentParser()
    p.add_argument('--count', type=int, default=48)
    p.add_argument('--test', action='store_true', help='one person, rendered to .shots/people-test.png')
    a = p.parse_args(argv)
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o)
    AssetService.update_all_asset_lists()
    A = {'hair': assets('hair'), 'eyebrows': assets('eyebrows'), 'clothes': assets('clothes')}
    sk = assets('skins', 'mhmat')
    P = {os.path.splitext(os.path.basename(str(x)))[0]: str(x) for x in AssetService.list_bvh_assets('poses')}
    rng = random.Random(1974)
    # Shares of each pose, as hollywood_bowl.py's crowd uses them.
    plan = (['stand'] * 4 + ['bench'] * 5 + ['ground'] * 2 + ['lie']) * (a.count // 12 + 1)
    plan = plan[:1 if a.test else a.count]
    cols = {}
    for k, pose in enumerate(plan):
        rig, _ = make_person(rng, pose, A, sk, P)
        hi, person, turn = bake(rig, f'person.{pose}.{k:03d}')
        for tag, ob in (('people', person), ('people hi', hi)):
            key = f'{tag}, {pose}'
            if key not in cols:
                cols[key] = bpy.data.collections.new(key)
                bpy.context.scene.collection.children.link(cols[key])
            for c in ob.users_collection:
                c.objects.unlink(ob)
            cols[key].objects.link(ob)
            ob.location = ((k % 12) * 1.2, (k // 12) * 1.6 + (30 if tag == 'people hi' else 0), 0)
        print('PERSON', person.name, len(hi.data.polygons), '/', len(person.data.polygons), 'faces, turned', round(turn), 'deg')
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    if a.test:
        cam = bpy.data.cameras.new('c')
        c = bpy.data.objects.new('c', cam)
        bpy.context.scene.collection.objects.link(c)
        c.location = (1.4, -3.2, 1.3)
        c.rotation_euler = (math.radians(86), 0, math.radians(22))
        bpy.context.scene.camera = c
        L = bpy.data.lights.new('sun', 'SUN')
        L.energy = 3
        lo = bpy.data.objects.new('sun', L)
        bpy.context.scene.collection.objects.link(lo)
        lo.rotation_euler = (math.radians(50), 0, math.radians(30))
        s = bpy.context.scene
        s.render.engine = 'CYCLES'
        s.cycles.samples = 48
        s.render.resolution_x, s.render.resolution_y = 800, 1000
        s.render.filepath = os.path.join(ROOT, '.shots', 'people-test.png')
        bpy.ops.render.render(write_still=True)
        print('RENDERED', s.render.filepath)
        return
    bpy.ops.wm.save_as_mainfile(filepath=OUT)
    print('SAVED', OUT)


main()

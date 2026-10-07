"""
Exports the instruments for the explorer, as glTF binaries in
public/models/: each one placed exactly as the renders place it
(stage_review.py place(), from the marks and band.instruments in
scene.json), its procedural materials baked to textures so the browser can
draw them.

    npm run export:scene
    /Applications/Blender.app/Contents/MacOS/Blender -b -P blender/export_instruments.py -- [--only drums] [--size 2048]

Per instrument: the parts are joined into one mesh, unwrapped, and Cycles
bakes its base colour, roughness and metalness into one atlas each; the
mesh then carries one material with those maps. Draco-compressed. The kit
is written twice: as at Hartford (butcher block) and as at the Bowl (wine
red, band.instruments.bowlKitShell).

The Wolf comes from the Garcia Guitars project, next door to this one.
"""
import argparse
import os
import sys

import bpy

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public', 'models')


def args():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    p = argparse.ArgumentParser()
    p.add_argument('--only', default=None)
    p.add_argument('--size', type=int, default=2048)
    p.add_argument('--samples', type=int, default=4)
    return p.parse_args(argv)


def stage_review():
    """stage_review.py's own functions, without running its main()."""
    path = os.path.join(ROOT, 'blender', 'stage_review.py')
    src = open(path).read().rsplit('\nmain()', 1)[0]
    g = {'__file__': path, '__name__': 'stage_review'}
    exec(compile(src, path, 'exec'), g)
    return g


def clear():
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o)


def tree(root):
    out = [root]
    for c in root.children_recursive:
        out.append(c)
    return [o for o in out if o.type in ('MESH', 'CURVE', 'FONT') and not o.hide_render]


def joined(name, objs):
    """A single mesh in world space: modifiers applied, parents baked in, everything joined."""
    dg = bpy.context.evaluated_depsgraph_get()
    parts = []
    for o in objs:
        me = bpy.data.meshes.new_from_object(o.evaluated_get(dg), preserve_all_data_layers=True, depsgraph=dg)
        me.transform(o.matrix_world)
        p = bpy.data.objects.new(o.name + ' (baked)', me)
        bpy.context.scene.collection.objects.link(p)
        parts.append(p)
    bpy.ops.object.select_all(action='DESELECT')
    for p in parts:
        p.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    j = bpy.context.view_layer.objects.active
    j.name = name
    return j


def unwrap(o):
    """A fresh UV map for the bake, made active for output; any existing one stays the render map, for image lookups."""
    me = o.data
    render = next((uv for uv in me.uv_layers if uv.active_render), None)
    bake = me.uv_layers.new(name='bake')
    me.uv_layers.active = bake
    if render:
        render.active_render = True
    bpy.ops.object.select_all(action='DESELECT')
    o.select_set(True)
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=1.15, island_margin=0.004, area_weight=0.6)
    # Smart project leaves much of the square empty; packing fills it, so the texture goes further.
    bpy.ops.uv.select_all(action='SELECT')
    bpy.ops.uv.pack_islands(rotate=True, margin=0.003)
    bpy.ops.object.mode_set(mode='OBJECT')
    return bake


def principled_nodes(m):
    return [n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'] if m and m.use_nodes else []


def bake(o, size, kind):
    """Bakes one property of every material on `o` into one image."""
    img = bpy.data.images.new(f'{o.name} {kind}', size, size, alpha=False)
    img.colorspace_settings.name = 'sRGB' if kind == 'color' else 'Non-Color'
    nodes = []
    for slot in o.material_slots:
        m = slot.material
        if not m or not m.use_nodes:
            continue
        n = m.node_tree.nodes.new('ShaderNodeTexImage')
        n.image = img
        m.node_tree.nodes.active = n
        nodes.append((m, n))
    restore = []
    if kind == 'metal':
        # Bake metalness as emission: each Principled node's Metallic routed
        # into its own emission, everything else dark.
        for slot in o.material_slots:
            for b in principled_nodes(slot.material):
                ec, es = b.inputs['Emission Color'], b.inputs['Emission Strength']
                restore.append((slot.material, b, ec.default_value[:], es.default_value,
                                [l.from_socket for l in ec.links]))
                for l in list(ec.links):
                    slot.material.node_tree.links.remove(l)
                met = b.inputs['Metallic']
                if met.is_linked:
                    slot.material.node_tree.links.new(met.links[0].from_socket, ec)
                else:
                    v = met.default_value
                    ec.default_value = (v, v, v, 1)
                es.default_value = 1.0
    sc = bpy.context.scene
    bpy.ops.object.select_all(action='DESELECT')
    o.select_set(True)
    bpy.context.view_layer.objects.active = o
    if kind == 'color':
        sc.render.bake.use_pass_direct = False
        sc.render.bake.use_pass_indirect = False
        sc.render.bake.use_pass_color = True
        bpy.ops.object.bake(type='DIFFUSE', margin=6)
    elif kind == 'rough':
        bpy.ops.object.bake(type='ROUGHNESS', margin=6)
    else:
        bpy.ops.object.bake(type='EMIT', margin=6)
    for m, b, col, strength, links in restore:
        b.inputs['Emission Color'].default_value = col
        b.inputs['Emission Strength'].default_value = strength
        for s in links:
            m.node_tree.links.new(s, b.inputs['Emission Color'])
    for m, n in nodes:
        m.node_tree.nodes.remove(n)
    img.pack()
    return img


def baked_material(name, color, rough, metal):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt, links = m.node_tree.nodes, m.node_tree.links
    b = nt['Principled BSDF']
    for img, socket in ((color, 'Base Color'), (rough, 'Roughness'), (metal, 'Metallic')):
        t = nt.new('ShaderNodeTexImage')
        t.image = img
        links.new(t.outputs['Color'], b.inputs[socket])
    return m


def export(o, name):
    bpy.ops.object.select_all(action='DESELECT')
    o.select_set(True)
    bpy.context.view_layer.objects.active = o
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, f'{name}.glb')
    bpy.ops.export_scene.gltf(
        filepath=path, export_format='GLB', use_selection=True, export_yup=True,
        export_apply=True, export_texcoords=True, export_normals=True, export_materials='EXPORT',
        export_image_format='WEBP', export_image_quality=82,
        export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=7,
    )
    print('EXPORTED', path, f'{os.path.getsize(path) / 1e6:.1f} MB')


def main():
    a = args()
    W = stage_review()
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.samples = a.samples
    try:
        sc.cycles.device = 'GPU'
    except Exception:
        pass
    for red in (False, True):
        clear()
        deck = W['_S']['deck']['y']
        placed = W['place'](deck, red_kit=red)
        stands = [o for o in bpy.data.objects if o.name.endswith(' stand')]
        jobs = {'drums-bowl': placed.get('drums')} if red else {k: v for k, v in placed.items()}
        if not red and stands:
            jobs['stands'] = None
        for name, root in jobs.items():
            if a.only and a.only != name:
                continue
            objs = stands if name == 'stands' else tree(root)
            if not objs:
                print('NOTHING TO EXPORT', name)
                continue
            o = joined(name, objs)
            unwrap(o)
            size = a.size if name in ('piano', 'drums', 'drums-bowl', 'garcia', 'weir', 'lesh') else a.size // 2
            col = bake(o, size, 'color')
            rough = bake(o, size // 2, 'rough')
            metal = bake(o, size // 4, 'metal')
            o.data.materials.clear()
            o.data.materials.append(baked_material(f'{name}, baked', col, rough, metal))
            # Only the bake map goes out.
            for uv in list(o.data.uv_layers):
                if uv.name != 'bake':
                    o.data.uv_layers.remove(uv)
            export(o, name)


main()

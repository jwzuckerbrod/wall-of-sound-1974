"""
Two of the crew for the explorer, at the top corners of the scaffold, written
to public/models/crew.glb. They are AI-generated, and labelled so: a picture
from FLUX.1 schnell (text prompt only), turned into a textured mesh by
TRELLIS.2, both on their free Hugging Face demos. The prompts are in
docs/qa-findings.md; the raw meshes are in the ignored blender/assets/crew-ai/.
This script does the rest, from structure.crewAloft: removes the pipe or rope
the picture came with, calms the skin colour, adds surface detail, scales and
places each on the real tubes, and reduces it for a browser.

    npm run export:scene
    /Applications/Blender.app/Contents/MacOS/Blender -b -P blender/make_roadies.py -- [--src DIR]

--src defaults to blender/assets/crew-ai/ (a worktree has to point at the main
checkout's).
"""
import argparse
import json
import math
import os
import sys

import bmesh
import bpy
import numpy as np
from mathutils import Matrix, Vector

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public', 'models', 'crew.glb')
with open(os.path.join(ROOT, 'blender', 'scene.json')) as f:
    S = json.load(f)


def B(p):
    """The scene frame (+y up, +z to the audience) to Blender's."""
    return Vector((p[0], -p[2], p[1]))


def load(path):
    before = set(bpy.context.scene.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    o = next(x for x in bpy.context.scene.objects if x not in before and x.type == 'MESH')
    me = o.data
    me.transform(o.matrix_world)
    o.parent = None
    o.matrix_world = Matrix.Identity(4)
    return o


def verts(me):
    return np.array([v.co for v in me.vertices])


def calm_skin(o, c):
    """TRELLIS's skin comes out red. Pull it toward weathered skin, keeping the shading."""
    mat = o.data.materials[0]
    tex = next(n for n in mat.node_tree.nodes if n.type == 'TEX_IMAGE'
               and any(l.to_socket.name == 'Base Color' for out in n.outputs for l in out.links))
    img = tex.image
    w, h = img.size
    px = np.empty(w * h * 4, dtype=np.float32)
    img.pixels.foreach_get(px)
    px = px.reshape(h, w, 4)
    rgb = px[..., :3]
    srgb = np.where(rgb <= 0.0031308, rgb * 12.92, 1.055 * np.clip(rgb, 1e-6, None) ** (1 / 2.4) - 0.055)
    R, G, Bl = srgb[..., 0], srgb[..., 1], srgb[..., 2]
    mx, mn = srgb.max(2), srgb.min(2)
    sat = (mx - mn) / np.maximum(mx, 1e-4)
    hue = np.where(mx == R, ((G - Bl) / np.maximum(mx - mn, 1e-4)) % 6, 4 + (R - G) / np.maximum(mx - mn, 1e-4)) * 60
    lo, hi = c['skinHue']
    mask = (((hue < hi) | (hue > lo)) & (sat > c['skinSat']) & (mx > 0.25))
    t = np.clip((sat - c['skinSat']) / 0.12, 0, 1) * mask
    lum = 0.3 * R + 0.59 * G + 0.11 * Bl
    target = np.stack([lum * 0.98, lum * 0.88, lum * 0.8], 2)
    srgb = np.clip(srgb * (1 - t[..., None]) + target * t[..., None], 0, 1)
    px[..., :3] = np.where(srgb <= 0.04045, srgb / 12.92, ((srgb + 0.055) / 1.055) ** 2.4)
    # A new image: the exporter writes an imported image's original bytes, ignoring edits.
    new = bpy.data.images.new(f"{c['id']} colour", w, h, alpha=False)
    new.colorspace_settings.name = 'sRGB'
    new.pixels.foreach_set(px.ravel())
    new.pack()
    tex.image = new
    print(c['id'], 'skin share', float(mask.mean()))


def add_surface_detail(o, c):
    """A normal map from the colour texture's fine detail: quilting, denim, boot creases catch the light."""
    mat = o.data.materials[0]
    nt = mat.node_tree
    tex = next(n for n in nt.nodes if n.type == 'TEX_IMAGE'
               and any(l.to_socket.name == 'Base Color' for out in n.outputs for l in out.links))
    src = tex.image
    w, h = src.size
    px = np.empty(w * h * 4, dtype=np.float32)
    src.pixels.foreach_get(px)
    lum = px.reshape(h, w, 4)[..., :3].mean(axis=2) ** 0.5
    n = 1024
    if w != n:
        step = w // n
        lum = lum[::step, ::step][:n, :n]
    # High-pass: only the fine detail; the mesh has the large forms.
    blur = lum
    for _ in range(6):
        blur = (blur + np.roll(blur, 1, 0) + np.roll(blur, -1, 0) + np.roll(blur, 1, 1) + np.roll(blur, -1, 1)) / 5
    d = (lum - blur) * c['detail']
    dx = (np.roll(d, -1, 1) - np.roll(d, 1, 1))
    dy = (np.roll(d, -1, 0) - np.roll(d, 1, 0))
    nz = np.ones_like(d)
    length = np.sqrt(dx * dx + dy * dy + 1)
    out = np.stack([(-dx / length + 1) / 2, (-dy / length + 1) / 2, (nz / length + 1) / 2, np.ones_like(d)], 2)
    img = bpy.data.images.new(f"{o.name} detail", n, n, alpha=False)
    img.colorspace_settings.name = 'Non-Color'
    img.pixels.foreach_set(out.astype(np.float32).ravel())
    img.pack()
    t = nt.nodes.new('ShaderNodeTexImage')
    t.image = img
    m = nt.nodes.new('ShaderNodeNormalMap')
    m.inputs['Strength'].default_value = 1.0
    uv = next((l.from_socket for l in tex.inputs['Vector'].links), None)
    if uv:
        nt.links.new(uv, t.inputs['Vector'])
    nt.links.new(t.outputs['Color'], m.inputs['Color'])
    bsdf = next(x for x in nt.nodes if x.type == 'BSDF_PRINCIPLED')
    nt.links.new(m.outputs['Normal'], bsdf.inputs['Normal'])


def remove_faces(o, test):
    bm = bmesh.new()
    bm.from_mesh(o.data)
    kill = [f for f in bm.faces if test(f.calc_center_median())]
    bmesh.ops.delete(bm, geom=kill, context='FACES')
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.0005)
    # Scraps left by the cut: small loose pieces.
    bm.verts.ensure_lookup_table()
    seen, comps = set(), []
    for v in bm.verts:
        if v.index in seen:
            continue
        stack, comp = [v], []
        seen.add(v.index)
        while stack:
            u = stack.pop()
            comp.append(u)
            for e in u.link_edges:
                x = e.other_vert(u)
                if x.index not in seen:
                    seen.add(x.index)
                    stack.append(x)
        comps.append(comp)
    big = max(len(c) for c in comps)
    bmesh.ops.delete(bm, geom=[v for c in comps if len(c) < max(60, big * 0.002) for v in c], context='VERTS')
    bm.to_mesh(o.data)
    bm.free()
    print(o.name, 'removed', len(kill), 'faces; pieces', len(comps))


def place_astride(o, c):
    """The picture's pipe is cut out and its axis laid on the real rail."""
    me = o.data
    V = verts(me)
    far = V[np.abs(V[:, 0]) > 0.26]
    yc, zc = float(np.median(far[:, 1])), float(np.median(far[:, 2]))
    r0 = float(np.percentile(np.hypot(far[:, 1] - yc, far[:, 2] - zc), 70))
    remove_faces(o, lambda p: (abs(p.x) > 0.2 and math.hypot(p.y - yc, p.z - zc) < r0 * 2.2)
                 or math.hypot(p.y - yc, p.z - zc) < r0 * 1.15)
    V = verts(me)
    top, bot = np.percentile(V[:, 2], 99.9), np.percentile(V[:, 2], 0.1)
    k = c['seatedHeight'] / (top - bot)
    me.transform(Matrix.Translation(B(c['seat']) + Vector((0, 0, c['seatRaise']))) @ Matrix.Scale(k, 4)
                 @ Matrix.Translation((0, -yc, -zc)))
    print(o.name, 'scale', k)


def place_hauling(o, c):
    """Turned to face the Wall, the rope stub above the fist cut off, tilted and scaled so the fist meets the rail and the lower boot the ledger."""
    me = o.data
    me.transform(Matrix.Rotation(math.radians(c['turn']), 4, 'Z'))
    V = verts(me)
    z0, z1 = V[:, 2].min(), V[:, 2].max()
    span = z1 - z0
    cut = z1 - c['ropeStub'] * span
    remove_faces(o, lambda p: p.z > cut)
    V = verts(me)
    fist = V[V[:, 2] > cut - c['fistDepth'] * span].mean(axis=0)
    foot = V[V[:, 2] < z0 + 0.012 * span].mean(axis=0)
    d = fist - foot
    # Lean about x until fist and boot share the scaffold's plane; x is left to fall where it falls.
    lean = math.atan2(d[1], d[2])
    R = Matrix.Rotation(lean, 4, 'X')
    d2 = R @ Vector(d)
    target = B(c['hand'])[2] - c['footY']
    k = target / d2.z
    me.transform(Matrix.Translation(B(c['hand'])) @ Matrix.Scale(k, 4) @ R @ Matrix.Translation(-Vector(fist)))
    V = verts(me)
    low = V[V[:, 2] < V[:, 2].min() + 0.02]
    print(o.name, 'scale', k, 'lean deg', math.degrees(lean), 'boot at', low.mean(axis=0),
          'bb', V.min(axis=0), V.max(axis=0))


def rope(c):
    pts = [B(p) for p in c['rope']]
    cu = bpy.data.curves.new(f"{c['id']} rope", 'CURVE')
    cu.dimensions = '3D'
    cu.bevel_depth = 0.007
    cu.bevel_resolution = 1
    sp = cu.splines.new('POLY')
    sp.points.add(len(pts) - 1)
    for s, p in zip(sp.points, pts):
        s.co = (*p, 1)
    tmp = bpy.data.objects.new(cu.name, cu)
    bpy.context.scene.collection.objects.link(tmp)
    me = bpy.data.meshes.new_from_object(tmp.evaluated_get(bpy.context.evaluated_depsgraph_get()))
    r = bpy.data.objects.new(cu.name + ' mesh', me)
    bpy.context.scene.collection.objects.link(r)
    bpy.data.objects.remove(tmp)
    m = bpy.data.materials.new('rope')
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (0.48, 0.41, 0.26, 1)
    b.inputs['Roughness'].default_value = 0.95
    me.materials.append(m)
    return r


def main():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    p = argparse.ArgumentParser()
    p.add_argument('--src', default=os.path.join(ROOT, 'blender', 'assets', 'crew-ai'))
    a = p.parse_args(argv)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    out = []
    for c in S['crewAloft']:
        o = load(os.path.join(a.src, c['mesh']))
        o.name = c['id']
        calm_skin(o, c)
        add_surface_detail(o, c)
        {'astride': place_astride, 'hauling': place_hauling}[c['id']](o, c)
        for poly in o.data.polygons:
            poly.use_smooth = True
        d = o.modifiers.new('less', 'DECIMATE')
        d.ratio = c['keepFaces']
        bpy.context.view_layer.objects.active = o
        bpy.ops.object.select_all(action='DESELECT')
        o.select_set(True)
        bpy.ops.object.modifier_apply(modifier=d.name)
        print(o.name, 'faces', len(o.data.polygons))
        for n in o.data.materials[0].node_tree.nodes:
            if n.type == 'TEX_IMAGE' and n.image and 'detail' not in n.image.name:
                # Colour stays at the demo's full 2K; the shine map doesn't need it.
                base = any(l.to_socket.name == 'Base Color' for out in n.outputs for l in out.links)
                if not base and n.image.size[0] > 256:
                    n.image.scale(256, 256)
                    px = np.empty(256 * 256 * 4, dtype=np.float32)
                    n.image.pixels.foreach_get(px)
                    small = bpy.data.images.new(f'{o.name} shine', 256, 256, alpha=False)
                    small.colorspace_settings.name = 'Non-Color'
                    small.pixels.foreach_set(px)
                    small.pack()
                    n.image = small
        out.append(o)
        if c.get('rope'):
            out.append(rope(c))
    bpy.ops.object.select_all(action='DESELECT')
    for o in out:
        o.select_set(True)
    bpy.ops.export_scene.gltf(
        filepath=OUT, export_format='GLB', use_selection=True, export_yup=True,
        export_apply=True, export_texcoords=True, export_normals=True, export_materials='EXPORT',
        export_image_format='WEBP', export_image_quality=84,
        export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=7,
    )
    print('EXPORTED', OUT, f'{os.path.getsize(OUT) / 1e6:.2f} MB')


main()

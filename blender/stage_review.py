"""
Puts the instruments on the Wall: the Wall built from scene.json exactly as
build_scene.py builds it, and each instrument appended from the .blend its own
build script saves, stood where the app's config puts its player
(src/data/wall.config.ts, band.members).

    npm run export:scene
    (each instrument's build.py with --save, and the Wolf's with --era 1974)
    /Applications/Blender.app/Contents/MacOS/Blender -b -P blender/stage_review.py -- \\
        --shot overview --samples 128          # or band, keys; --save for blender/stage.blend

This is for reviewing the instruments in place, not a historical record of
their placing:
  - the players' marks are the app's (estimated; see band.positions there)
  - the piano stands tail to the audience, as at Winterland on 16 October 1974
  - where the Rhodes stood beside it isn't known: here, at Keith's right
  - the guitars and the bass rest upright on plain stands, which are review
    props; they will be in the players' hands
"""
import argparse
import math
import os
import sys

import bpy
from mathutils import Vector

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INST = os.path.join(ROOT, 'blender', 'instruments')
WOLF = os.path.join(os.path.dirname(ROOT), 'Garcia Guitars Project', 'guitars', 'wolf', 'wolf.blend')
IN = 0.0254

# The app's marks (scene frame: x across, +z toward the audience), metres.
MARKS = {'weir': (-5.6, 5.4), 'lesh': (-2.6, 5.8), 'kreutz': (0.2, 4.3), 'keith': (4.6, 5.2), 'garcia': (7.0, 5.6)}


def load_wall():
    """build_scene.py's own functions, without running its main()."""
    path = os.path.join(ROOT, 'blender', 'build_scene.py')
    src = open(path).read().rsplit('\nmain()', 1)[0]
    g = {'__file__': path, '__name__': 'build_scene'}
    exec(compile(src, path, 'exec'), g)
    return g


def append(path, root_name):
    """Append one instrument (its root and everything under it)."""
    with bpy.data.libraries.load(path) as (src, dst):
        dst.objects = list(src.objects)
    keep = None
    for o in dst.objects:
        if o is None:
            continue
        top = o
        while top.parent is not None:
            top = top.parent
        if top.name.startswith(root_name):
            bpy.context.scene.collection.objects.link(o)
            if o.parent is None:
                keep = o
        else:
            bpy.data.objects.remove(o)
    return keep


def holder(name, x, y, z, rz=0.0):
    e = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(e)
    e.location = (x, y, z)
    e.rotation_euler = (0, 0, rz)
    return e


def guitar_stand(name, x, y, deck):
    """A plain A-frame stand (a review prop)."""
    import bmesh
    bm = bmesh.new()
    def tube(a, b, r=0.009):
        d = b - a
        res = bmesh.ops.create_cone(bm, cap_ends=True, segments=10, radius1=r, radius2=r, depth=d.length)
        q = Vector((0, 0, 1)).rotation_difference(d.normalized())
        bmesh.ops.transform(bm, verts=res['verts'], matrix=__import__('mathutils').Matrix.Translation((a + b) / 2) @ q.to_matrix().to_4x4())
    top = Vector((x, y + 0.08, deck + 0.62))
    for sx in (-0.16, 0.16):
        tube(Vector((x + sx, y - 0.12, deck)), top)
        tube(Vector((x + sx, y + 0.22, deck)), top)
    tube(Vector((x - 0.17, y - 0.12, deck + 0.1)), Vector((x + 0.17, y - 0.12, deck + 0.1)), 0.012)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(o)
    m = bpy.data.materials.new('stand, black (review prop)')
    m.use_nodes = True
    m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.02, 0.02, 0.02, 1)
    m.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = 0.5
    me.materials.append(m)


def place(deck):
    B = lambda x, z: (x, -z)                     # scene (x, z) -> Blender (x, y); audience at -Y
    out = {}
    # Guitars and bass: upright, facing the audience, resting on a stand.
    for key, path, name in (('weir', os.path.join(INST, 'es335', 'es335.blend'), 'ES-335'),
                            ('lesh', os.path.join(INST, 'mission_control', 'mission_control.blend'), 'Mission Control'),
                            ('garcia', WOLF, 'Wolf')):
        if not os.path.exists(path):
            print('MISSING', path)
            continue
        r = append(path, name)
        x, y = B(*MARKS[key])
        lift = r.location.z - 0.01                # the file stood it with its bottom at 1 cm
        r.location = (x, y, deck + 0.07 + lift)
        r.rotation_euler = (math.radians(90), 0, 0)
        guitar_stand(f'{name} stand', x, y, deck)
        out[key] = r
    # The piano, tail to the audience, centred on Keith's mark.
    r = append(os.path.join(INST, 'piano', 'piano.blend'), 'Grand piano')
    x, y = B(*MARKS['keith'])
    h = holder('piano on stage', x, y, deck, math.radians(180))
    r.parent = h
    r.location = (0, -53.9 * IN, 0)
    out['piano'] = r
    # The Rhodes at Keith's right as he sits at the keys (facing the
    # audience, his right is -x), end-on to the piano, its keys toward him.
    r = append(os.path.join(INST, 'rhodes', 'rhodes.blend'), 'Fender Rhodes')
    keys_y = y + 0.1 * 0 + (53.9 * IN)            # the piano's keys, on the Wall side of its centre
    h = holder('Rhodes on stage', x - 0.78 - 0.45, keys_y + 0.2, deck, math.radians(90))
    r.parent = h
    r.location = (0, -11.5 * IN, 0)
    out['rhodes'] = r
    # The drums: the kit's frame already faces the audience; its middle on
    # Kreutzmann's mark.
    r = append(os.path.join(INST, 'drums', 'drums.blend'), 'Drum kit')
    x, y = B(*MARKS['kreutz'])
    h = holder('drums on stage', x, y, deck)
    r.parent = h
    r.location = (0, -0.5, 0)
    out['drums'] = r
    return out


SHOTS = {
    # From the floor of the hall, well back, the whole Wall.
    'overview': dict(loc=(3.0, -25.0, 4.6), target=(0.0, 0.0, 7.2), lens=32),
    # From the front of the stage, low, along the band's line.
    'band': dict(loc=(-9.5, -11.5, 4.6), target=(1.5, -4.8, 3.8), lens=32),
    # Keith's corner and the drums.
    'keys': dict(loc=(8.8, -9.8, 5.4), target=(2.2, -4.2, 3.6), lens=35),
}


def camera(shot):
    s = SHOTS[shot]
    cam = bpy.data.cameras.new('camera')
    cam.lens = s['lens']
    cam.clip_end = 400
    o = bpy.data.objects.new('camera', cam)
    bpy.context.scene.collection.objects.link(o)
    o.location = s['loc']
    o.rotation_euler = (Vector(s['target']) - Vector(s['loc'])).to_track_quat('-Z', 'Y').to_euler()
    sc = bpy.context.scene
    sc.camera = o
    sc.render.resolution_x, sc.render.resolution_y = 1920, 1080
    sc.render.resolution_percentage = 100


def main():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    p = argparse.ArgumentParser()
    p.add_argument('--shot', default='overview', choices=list(SHOTS))
    p.add_argument('--samples', type=int, default=128)
    p.add_argument('--out', default=os.path.join(ROOT, '.shots', 'blender'))
    p.add_argument('--save', action='store_true')
    a = p.parse_args(argv)

    W = load_wall()
    import json
    with open(os.path.join(ROOT, 'blender', 'scene.json')) as f:
        S = json.load(f)
    M = W['build_materials']()
    W['build'](S, M)
    W['lights']()
    deck = S['deck']['y']
    place(deck)
    camera(a.shot)
    W['render_settings'](a.samples)
    os.makedirs(a.out, exist_ok=True)
    if a.save:
        bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT, 'blender', 'stage.blend'))
    out = os.path.join(a.out, f'stage-{a.shot}.png')
    bpy.context.scene.render.filepath = out
    bpy.ops.render.render(write_still=True)
    print('RENDERED', out)


main()

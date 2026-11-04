"""
Puts the instruments on the Wall: the Wall built from scene.json exactly as
build_scene.py builds it, and each instrument appended from the .blend its own
build script saves, stood where the app's config puts its player
(src/data/wall.config.ts, band.members).

    npm run export:scene
    (each instrument's build.py with --save, and the Wolf's with --era 1974)
    /Applications/Blender.app/Contents/MacOS/Blender -b -P blender/stage_review.py -- \\
        --shot overview --samples 128          # or band, keys; --save for blender/stage.blend
                                               # --venue arena for the hall instead of outdoors

This is for reviewing the instruments in place, not a historical record of
their placing:
  - the players' marks are the app's, read from scene.json (measured on
    Pechner's 17 May 1974 photograph; see band.positions in the config)
  - the grand lies across the stage with its keyboard at the audience's
    right, as on that photograph; Keith sits at that end
  - where the Rhodes stood isn't known: here, upstage of Keith at his right
    hand, which puts it beyond the grand from the audience, as at Oakland on
    8 June 1974
  - the guitars and the bass rest upright on plain stands, which are review
    props; they will be in the players' hands
"""
import argparse
import json
import math
import os
import sys

import bpy
from mathutils import Vector

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INST = os.path.join(ROOT, 'blender', 'instruments')
WOLF = os.path.join(os.path.dirname(ROOT), 'Garcia Guitars Project', 'guitars', 'wolf', 'wolf.blend')
IN = 0.0254

# The app's marks (scene frame: x across, +z toward the audience), metres,
# as scripts/export-scene.mjs writes them from band.members.
with open(os.path.join(ROOT, 'blender', 'scene.json')) as _f:
    _S = json.load(_f)
    MARKS = {k: tuple(v) for k, v in _S['band'].items()}
    # How each instrument stands on its mark (band.instruments in the config).
    PLACE = _S['instruments']


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


def W_srgb(hex_):
    """sRGB hex to the linear floats Blender's colour inputs expect."""
    out = []
    for i in (1, 3, 5):
        c = int(hex_[i:i + 2], 16) / 255
        out.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
    return (*out, 1.0)


def tint_systems(S):
    """
    The story's colour-by-system pass (beat 3): each cabinet's boards and
    baffle in its channel's colour (CHANNELS in the config, the explorer's
    overlay colours), cones and horns left as they are. Rendered through the
    same camera as the plain shot so the two crossfade in register.
    """
    mats = {}
    for cid, ch in S['channels'].items():
        m = bpy.data.materials.new(f'System {cid}')
        m.use_nodes = True
        b = m.node_tree.nodes['Principled BSDF']
        col = W_srgb(ch['color'])
        b.inputs['Base Color'].default_value = col
        b.inputs['Roughness'].default_value = 0.6
        b.inputs['Emission Color'].default_value = col
        b.inputs['Emission Strength'].default_value = 0.35
        mats[cid] = m
    for o in bpy.data.collections['Speakers'].objects:
        c = S['cells'][int(o.name.rsplit('.', 1)[1])]
        m = mats[c['channel']]
        for k in (0, 1):  # ply, baffle (build_scene.py slot_order)
            o.material_slots[k].link = 'OBJECT'
            o.material_slots[k].material = m


def tint_evidence(S):
    """
    The story's how-sure-are-we pass (beat 7): the Wall's parts in the colour of
    their PROVENANCE confidence, read from scene.json, so the picture can't
    claim more than the config does. Like tint_systems, cones and horns keep
    their colour, and the venue and crowd stay as they are.
    """
    E = S['evidence']
    mats = {}
    for level, colour in E['colours'].items():
        m = bpy.data.materials.new(f'Evidence {level}')
        m.use_nodes = True
        b = m.node_tree.nodes['Principled BSDF']
        col = W_srgb(colour)
        b.inputs['Base Color'].default_value = col
        b.inputs['Roughness'].default_value = 0.6
        b.inputs['Emission Color'].default_value = col
        b.inputs['Emission Strength'].default_value = 0.35
        mats[level] = m

    def paint(o, part, slots=None):
        for k, slot in enumerate(o.material_slots):
            if slots is None or k in slots:
                slot.link = 'OBJECT'
                slot.material = mats[E['parts'][part]]

    for o in bpy.data.collections['Speakers'].objects:
        c = S['cells'][int(o.name.rsplit('.', 1)[1])]
        paint(o, 'kick' if c['block'] == 'kick' else 'speakers', (0, 1))  # ply, baffle
    for o in bpy.data.objects:
        n = o.name
        if n.startswith('tube.'):
            paint(o, 'scaffold')
        elif n.startswith(('stage.', 'floor.')):
            paint(o, 'deck')
        elif n.startswith('light.'):
            paint(o, 'lights')
        elif n.lower().startswith(('tiedye', 'tie-dye', 'tie dye')):
            paint(o, 'tieDyes')


def write_meters(path):
    """
    Where each MC 2300's two needles land in the frame, so the story can swing
    them over the still (beat 6). Their pointers are made invisible in the
    render. For each needle in view and not hidden by something nearer: its
    pivot in frame pixels, and the screen vectors of one metre along the
    panel's x and z, so the page can draw it at any angle.
    """
    from bpy_extras.object_utils import world_to_camera_view
    from roadgear import METER_XS, METER_Z, METER_PIVOT_DROP, METER_POINTER_LENGTH, METER_POINTER_Y
    bpy.data.materials['Meter pointer'].node_tree.nodes['Principled BSDF'].inputs['Alpha'].default_value = 0.0
    sc = bpy.context.scene
    bpy.context.view_layer.update()
    cam = sc.camera
    W, H = sc.render.resolution_x, sc.render.resolution_y
    dg = bpy.context.evaluated_depsgraph_get()
    px = lambda v: (lambda c: Vector((c.x * W, (1 - c.y) * H, c.z)))(world_to_camera_view(sc, cam, v))
    out = []
    for o in sorted((o for o in bpy.data.objects if '.amp.' in o.name and o.name.startswith('rack.') and 'labels' not in o.name), key=lambda o: o.name):
        for mx in METER_XS:
            m = o.matrix_world
            local = Vector((mx, METER_POINTER_Y, METER_Z - METER_PIVOT_DROP))
            pivot = m @ local
            p = px(pivot)
            if p.z <= 0 or not (0 <= p.x <= W and 0 <= p.y <= H):
                continue
            face = m @ (local + Vector((0, 0, METER_POINTER_LENGTH / 2)))
            to = face - cam.location
            hit, at, *_ = sc.ray_cast(dg, cam.location, to.normalized(), distance=to.length - 0.02)
            if hit:
                continue
            step = 0.05
            ux, uz = px(m @ (local + Vector((step, 0, 0)))) - p, px(m @ (local + Vector((0, 0, step)))) - p
            out.append([round(v, 2) for v in (p.x, p.y, ux.x / step, ux.y / step, uz.x / step, uz.y / step)])
    with open(path, 'w') as f:
        json.dump({'frame': [W, H], 'length': METER_POINTER_LENGTH, 'needles': out}, f)
    print('METERS', len(out), path)


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


def place(deck, red_kit=False):
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
    # The grand across the stage, centred on Keith's mark, keyboard to the
    # audience's right (+x): its keys face +x, its tail points to the kit.
    r = append(os.path.join(INST, 'piano', 'piano.blend'), 'Grand piano')
    x, y = B(*MARKS['keith'])
    h = holder('piano on stage', x, y, deck, math.radians(90))
    r.parent = h
    r.location = (0, -PLACE['pianoKeyboardOffset'], 0)
    out['piano'] = r
    # Keith sits past the keyboard facing -x; his right hand is upstage. The
    # Rhodes stands there, square to the audience, keys toward him.
    r = append(os.path.join(INST, 'rhodes', 'rhodes.blend'), 'Fender Rhodes')
    keys_x = x + PLACE['pianoKeyboardOffset']
    rx, ry = PLACE['rhodesFromKeys']
    h = holder('Rhodes on stage', keys_x + rx, y + ry, deck)
    r.parent = h
    r.location = (0, -11.5 * IN, 0)
    out['rhodes'] = r
    # The drums: the kit's frame already faces the audience; its middle on
    # Kreutzmann's mark.
    r = append(os.path.join(INST, 'drums', 'drums.blend'), 'Drum kit')
    x, y = B(*MARKS['kreutz'])
    h = holder('drums on stage', x, y, deck)
    r.parent = h
    r.location = (0, -PLACE['kitBack'], 0)
    out['drums'] = r
    if red_kit:
        # The kit at the Hollywood Bowl on 21 July was the wine-red one, not the
        # butcher block of 31 July (qa-findings §14). Only the finish changes:
        # its drums are still the concert toms modelled from Hartford.
        red = bpy.data.materials.new('Drum shells, wine red lacquer')
        red.use_nodes = True
        b = red.node_tree.nodes['Principled BSDF']
        b.inputs['Base Color'].default_value = W_srgb(PLACE['bowlKitShell'])
        b.inputs['Roughness'].default_value = 0.25
        b.inputs['Coat Weight'].default_value = 0.8
        for o in bpy.data.objects:
            if o.type == 'MESH':
                for slot in o.material_slots:
                    if slot.material and slot.material.name.startswith('Butcher block'):
                        slot.material = red
    return out


SHOTS = {
    # From the floor of the hall, well back, the whole Wall.
    'overview': dict(loc=(3.0, -25.0, 4.6), target=(0.0, 0.0, 7.2), lens=32),
    # From the front of the stage, low, along the band's line.
    'band': dict(loc=(-9.5, -11.5, 4.6), target=(1.5, -4.8, 3.8), lens=32),
    # Keith's corner and the drums.
    'keys': dict(loc=(8.8, -9.8, 5.4), target=(2.2, -4.2, 3.6), lens=35),
    # Hero shots for the story page (docs/story.md). Eye height on the field
    # is 1.7 m; the deck top is at 3.05.
    # From the height of a mixing platform in the crowd, as many of the 1974
    # photographs were taken.
    'hero': dict(loc=(-17.0, -27.0, 4.6), target=(1.0, 0.0, 9.0), lens=38),
    'audience': dict(loc=(0.0, -38.0, 4.6), target=(0.0, 0.0, 9.2), lens=36),
    'cluster-up': dict(loc=(1.6, -6.8, 4.8), target=(0.0, 0.0, 9.2), lens=26),
    'garcia': dict(loc=(-3.2, -7.8, 4.75), target=(-6.8, 0.0, 9.5), lens=22),
    'tower': dict(loc=(-6.4, -0.6, 15.7), target=(0.4, -6.5, 3.2), lens=22),
    'amps': dict(loc=(0.3, -3.6, 4.3), target=(1.4, 2.0, 3.7), lens=28),
    # At the Hollywood Bowl (--venue hollywood). Seated eye heights in the
    # bowl's rows; the stage front is at y = -6.71.
    'bowl': dict(loc=(-3.0, -46.7, 6.72), target=(0.5, 0.0, 8.6), lens=50, fstop=2.0),
    # f/0.6 is not a real lens at this distance; it gives the crowd the softness
    # a long lens and haze give a photograph from high in the seats.
    'bowl-hero': dict(loc=(-38.0, -60.0, 14.2), target=(0.0, 0.0, 8.5), lens=42, fstop=0.6),
    'bowl-tower': dict(loc=(3.0, -0.4, 15.35), target=(-3.0, -60.0, 9.0), lens=20),
    # The story's title: from the same seats as 'bowl', a long lens filling the frame with the cluster's cones.
    'title': dict(loc=(-3.0, -46.7, 6.72), target=(0.0, 0.0, 8.7), lens=300),
    # Beat 4: from the lip of the stage, Garcia's guitar at his mark and his columns behind it.
    'garcia-mark': dict(loc=(-3.5, -8.0, 3.6), target=(-5.2, -3.0, 4.75), lens=24),
    # Beat 6: close on two racks, near enough to read the meters.
    'amps-close': dict(loc=(0.3, 1.2, 3.82), target=(0.62, 2.0, 3.68), lens=24),
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
    if 'fstop' in s:
        # Focus on the Wall: the crowd and the hills fall soft, as through a lens.
        cam.dof.use_dof = True
        cam.dof.focus_distance = (Vector(s['target']) - Vector(s['loc'])).length
        cam.dof.aperture_fstop = s['fstop']
    sc = bpy.context.scene
    sc.camera = o
    sc.render.resolution_x, sc.render.resolution_y = 1920, 1080
    sc.render.resolution_percentage = 100


def solved_camera(path, scale=2):
    """
    A camera solved from a photograph (blender/solve_camera.py): the photo's
    own framing, lens and roll, rendered at `scale` times the photo's size
    so the render can be laid over it. Returns its Blender location.
    """
    import numpy as np
    from mathutils import Matrix
    spec = json.load(open(path))
    c, (W, H) = spec['camera'], spec['size']
    yaw, pitch, roll = (math.radians(c[k]) for k in ('yaw_deg', 'pitch_deg', 'roll_deg'))
    cy, sy, cp, sp, cr, sr = math.cos(yaw), math.sin(yaw), math.cos(pitch), math.sin(pitch), math.cos(roll), math.sin(roll)
    M = (np.array([[cy, 0, sy], [0, 1, 0], [-sy, 0, cy]]) @ np.array([[1, 0, 0], [0, cp, -sp], [0, sp, cp]])
         @ np.array([[cr, -sr, 0], [sr, cr, 0], [0, 0, 1]]))
    # Scene frame (y up, +z to the audience) to Blender's (z up, audience at -y).
    P = np.array([[1, 0, 0], [0, 0, -1], [0, 1, 0]])
    cam = bpy.data.cameras.new('camera')
    cam.sensor_fit = 'HORIZONTAL'
    cam.sensor_width = 36.0
    cam.lens = c['f_px'] / W * 36.0
    cam.clip_end = 600
    o = bpy.data.objects.new('camera', cam)
    bpy.context.scene.collection.objects.link(o)
    x, y, z = c['position']
    o.location = (x, -z, y)
    o.rotation_mode = 'QUATERNION'
    o.rotation_quaternion = Matrix((P @ M).tolist()).to_quaternion()
    sc = bpy.context.scene
    sc.camera = o
    sc.render.resolution_x, sc.render.resolution_y = W * scale, H * scale
    sc.render.resolution_percentage = 100
    return o.location.copy()


def main():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    p = argparse.ArgumentParser()
    p.add_argument('--shot', default='overview', choices=list(SHOTS))
    p.add_argument('--samples', type=int, default=128)
    p.add_argument('--out', default=os.path.join(ROOT, '.shots', 'blender'))
    p.add_argument('--save', action='store_true')
    p.add_argument('--venue', default='outdoor', choices=['outdoor', 'arena', 'hollywood'])
    p.add_argument('--sun', default=None, help='outdoors: sun elevation,azimuth in degrees (azimuth 0 = behind the audience)')
    p.add_argument('--name', default=None, help='output name, in place of stage-<shot>')
    p.add_argument('--exposure', type=float, default=0.0)
    p.add_argument('--no-crowd', action='store_true', help='hollywood: leave the crowd out (for a crowd mask)')
    p.add_argument('--scale', type=int, default=100, help='resolution percentage')
    p.add_argument('--tint', choices=['systems', 'evidence'], default=None, help='colour the Wall by system (story beat 3) or by how sure we are of it (beat 7)')
    p.add_argument('--meters', default=None, help='hide the meters\' pointers and write where they land in the frame to this JSON (story beat 6)')
    p.add_argument('--camera', default=None, help='a camera solved from a photo (blender/cameras/*.json), in place of --shot')
    a = p.parse_args(argv)

    W = load_wall()
    import hollywood_bowl
    if a.camera:
        c = json.load(open(a.camera))['camera']['position']
        hollywood_bowl.KEEP_CLEAR[:] = [(c[0], -c[2], c[1])]
    else:
        hollywood_bowl.KEEP_CLEAR[:] = [SHOTS[a.shot]['loc']]
    if a.sun:
        import venue
        el, az = (float(v) for v in a.sun.split(','))
        venue.SUN_ELEVATION, venue.SUN_AZIMUTH = math.radians(el), math.radians(az)
    with open(os.path.join(ROOT, 'blender', 'scene.json')) as f:
        S = json.load(f)
    M = W['build_materials'](S)
    W['build'](S, M, a.venue)
    W['lights'](a.venue)
    deck = S['deck']['y']
    place(deck, red_kit=a.venue == 'hollywood')
    if a.tint == 'systems':
        tint_systems(S)
    elif a.tint == 'evidence':
        tint_evidence(S)
    if a.camera:
        solved_camera(a.camera)
    else:
        camera(a.shot)
    if a.no_crowd:
        for o in bpy.data.objects:
            if o.name.startswith('crowd'):
                o.hide_render = True
    if a.meters:
        write_meters(a.meters)
    W['render_settings'](a.samples)
    bpy.context.scene.view_settings.exposure = a.exposure
    bpy.context.scene.render.resolution_percentage = a.scale
    os.makedirs(a.out, exist_ok=True)
    if a.save:
        bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT, 'blender', 'stage.blend'))
    out = os.path.join(a.out, f'{a.name or "stage-" + a.shot}.png')
    bpy.context.scene.render.filepath = out
    bpy.ops.render.render(write_still=True)
    print('RENDERED', out)


main()

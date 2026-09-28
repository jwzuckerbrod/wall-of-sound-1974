"""
Bill Kreutzmann's drum kit, summer 1974: butcher-block concert toms, as it
stood before the show at Dillon Stadium, Hartford, 31 July 1974 (and, the
same kit, at Winterland in October).

    /Applications/Blender.app/Contents/MacOS/Blender -b -P blender/instruments/drums/build.py -- \\
        --shot hero --samples 256          # or front; --save for a .blend

Where every number comes from (see README.md beside this script):
  photo     Jim Anderson's pre-show photograph (straight on, from the
            audience): what's in the kit and where each piece stands across
            the stage and how high; read on a grid at the bass drum's scale
  1974      butcher-block finish in laminated light and dark strips, single-
            headed concert toms with open bottoms, a white coated Remo front
            head with no port, four cymbals (one dark), a patterned seat:
            Anderson, 31 July 1974 (black-and-white and colour); Winterland,
            16 October 1974 (dead.net)
  judgement the bass drum 24" (which also fits the 14" hi-hats a Zildjian
            guide lists for him), so every size follows from it; tom sizes
            rounded to standard concert-tom sizes
  estimate  depths front to back (a straight-on photograph can't give them),
            shell depths, stand hardware, the snare, the cymbals' weights

Frame: inches. x across as the audience sees it (+ to their right), y away
from the audience (the drummer sits at +y), z up from the riser.
"""
import argparse
import math
import os
import sys

import bmesh
import bpy
from mathutils import Matrix, Vector

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
from kit import IN, frame_viewports, new_mat, obj, plain, render, srgb, studio  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))

PX = 310 / 24.0      # the bass drum's head, 310 px across in the photograph = 24"
KICK_X = 1210        # its centre, in the photograph's pixels
FLOOR = 1345         # the riser under it (the head's bottom, 24" below its top at 1035)


def at(px, py):
    """Photograph pixel -> (x, z) inches at the bass drum's scale."""
    return (px - KICK_X) / PX, (FLOOR - py) / PX


# Toms, read off the photograph: (name, head centre px, diameter in, shell
# depth in, y, tilt toward the drummer in degrees, on a stand?)
TOMS = [
    ('tom 13', (1090, 830), 13, 11, 16, 28, False),
    ('tom 14', (1305, 845), 14, 12, 16, 28, False),
    ('tom 12', (930, 880), 12, 14, 12, 18, True),
    ('tom 10', (800, 930), 10, 16, 8, 12, True),
]
# Cymbals: (name, centre px, diameter in, y, tilt, dark?)
CYMBALS = [
    ('flat cymbal, left', (700, 760), 14, 30, 4, False),
    ('crash', (920, 765), 18, 22, 28, False),
    ('dark cymbal, right', (1425, 775), 18, 24, 22, True),
    ('hi-hats', (1385, 905), 14, 20, 2, False),
]


def args():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    p = argparse.ArgumentParser()
    p.add_argument('--shot', default='hero', choices=['hero', 'front'])
    p.add_argument('--samples', type=int, default=256)
    p.add_argument('--save', action='store_true')
    p.add_argument('--out', default=os.path.join(ROOT, '.shots', 'instruments'))
    return p.parse_args(argv)


def butcher_block():
    """Laminated strips of light and darker maple stacked up the shell, as the
    colour photograph shows them: bands along the shell's axis (object z)."""
    m, nt, L, b = new_mat('Butcher block')
    co = nt.new('ShaderNodeTexCoord')
    sep = nt.new('ShaderNodeSeparateXYZ')
    L.new(co.outputs['Object'], sep.inputs['Vector'])
    noise = nt.new('ShaderNodeTexNoise')
    noise.inputs['Scale'].default_value = 0.35
    L.new(co.outputs['Object'], noise.inputs['Vector'])
    wob = nt.new('ShaderNodeMath'); wob.operation = 'MULTIPLY'
    wob.inputs[1].default_value = 0.15                    # the strips run true, barely wandering
    L.new(noise.outputs['Fac'], wob.inputs[0])
    add = nt.new('ShaderNodeMath'); add.operation = 'ADD'
    L.new(sep.outputs['Z'], add.inputs[0])
    L.new(wob.outputs[0], add.inputs[1])
    wave = nt.new('ShaderNodeMath'); wave.operation = 'SINE'
    scale = nt.new('ShaderNodeMath'); scale.operation = 'MULTIPLY'
    scale.inputs[1].default_value = 2.4                   # a light and a dark strip every 2.6"
    L.new(add.outputs[0], scale.inputs[0])
    L.new(scale.outputs[0], wave.inputs[0])
    ramp = nt.new('ShaderNodeValToRGB')
    ramp.color_ramp.interpolation = 'CONSTANT'
    ramp.color_ramp.elements[0].color = srgb('#c3945a')
    ramp.color_ramp.elements[1].position = 0.5
    ramp.color_ramp.elements[1].color = srgb('#dcb97c')
    mr = nt.new('ShaderNodeMapRange')
    mr.inputs['From Min'].default_value = -1
    L.new(wave.outputs[0], mr.inputs['Value'])
    L.new(mr.outputs['Result'], ramp.inputs['Fac'])
    L.new(ramp.outputs['Color'], b.inputs['Base Color'])
    b.inputs['Roughness'].default_value = 0.35
    b.inputs['Coat Weight'].default_value = 1.0
    b.inputs['Coat Roughness'].default_value = 0.08
    return m


def cymbal_mat(name, hex_, rough):
    """Brass, lathed: fine concentric grooves as a bump."""
    m, nt, L, b = new_mat(name)
    b.inputs['Base Color'].default_value = srgb(hex_)
    b.inputs['Metallic'].default_value = 1.0
    b.inputs['Roughness'].default_value = rough
    co = nt.new('ShaderNodeTexCoord')
    sep = nt.new('ShaderNodeSeparateXYZ')
    L.new(co.outputs['Object'], sep.inputs['Vector'])
    r = nt.new('ShaderNodeVectorMath'); r.operation = 'LENGTH'
    L.new(co.outputs['Object'], r.inputs[0])
    s = nt.new('ShaderNodeMath'); s.operation = 'MULTIPLY'; s.inputs[1].default_value = 40.0
    L.new(r.outputs['Value'], s.inputs[0])
    sn = nt.new('ShaderNodeMath'); sn.operation = 'SINE'
    L.new(s.outputs[0], sn.inputs[0])
    bump = nt.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = 0.08
    L.new(sn.outputs[0], bump.inputs['Height'])
    L.new(bump.outputs['Normal'], b.inputs['Normal'])
    return m


def materials():
    return {
        'shell': butcher_block(),
        'head': plain('Drum head, white coated', '#e8e4d8', 0.7),
        'inside': plain('Shell inside, bare maple', '#caa674', 0.7),
        'chrome': plain('Chrome', '#d6d6d6', 0.1, 1.0),
        'brass': cymbal_mat('Cymbal, brass', '#c19548', 0.28),
        'dark': cymbal_mat('Cymbal, dark', '#4a3a26', 0.45),
        'seat': plain('Throne seat, patterned vinyl', '#2b2622', 0.6),
        'rubber': plain('Rubber', '#161616', 0.8),
    }


# ─── parts ───────────────────────────────────────────────────────────────────

def drum(M, root, name, centre, diameter, depth, axis, open_bottom):
    """A shell along axis (a unit vector from the resonant end to the batter
    head), its batter head at centre."""
    bm = bmesh.new()
    r = diameter / 2
    seg = 64
    q = Vector((0, 0, 1)).rotation_difference(axis)
    T = Matrix.Translation(centre) @ q.to_matrix().to_4x4()
    outer = bmesh.ops.create_cone(bm, cap_ends=False, segments=seg, radius1=r, radius2=r, depth=depth)['verts']
    bmesh.ops.translate(bm, verts=outer, vec=(0, 0, -depth / 2))
    inner = bmesh.ops.create_cone(bm, cap_ends=False, segments=seg, radius1=r - 0.25, radius2=r - 0.25, depth=depth)['verts']
    bmesh.ops.translate(bm, verts=inner, vec=(0, 0, -depth / 2))
    for f in bm.faces:
        f.material_index = 0 if all((v.co.x ** 2 + v.co.y ** 2) > (r - 0.1) ** 2 for v in f.verts) else 2
    bmesh.ops.reverse_faces(bm, faces=[f for f in bm.faces if f.material_index == 2])
    # (built in the drum's own frame, so the strips wrap round its shell)
    o = obj(name, bm, [M['shell'], M['head'], M['inside']], root)
    o.matrix_basis = T
    o.data.shade_smooth()
    # Heads and hoops: the batter head; a resonant head too unless open.
    bm = bmesh.new()
    for z, head in ((0.0, True), (-depth, not open_bottom)):
        if head:
            h = bmesh.ops.create_circle(bm, cap_ends=True, segments=seg, radius=r)['verts']
            bmesh.ops.translate(bm, verts=h, vec=(0, 0, z + (0.05 if z == 0 else -0.05)))
        hoop = bmesh.ops.create_cone(bm, cap_ends=False, segments=seg, radius1=r + 0.12, radius2=r + 0.12, depth=0.45)['verts']
        bmesh.ops.translate(bm, verts=hoop, vec=(0, 0, z - 0.1 if z == 0 else z + 0.1))
    for f in bm.faces:
        f.material_index = 1 if len(f.verts) > 4 else 0
    h = obj(name + ' heads', bm, [M['chrome'], M['head']], root)
    h.matrix_basis = T
    h.data.shade_smooth()
    # Tension lugs down the shell.
    bm = bmesh.new()
    n = 10 if diameter >= 20 else 6
    for k in range(n):
        a = 2 * math.pi * (k + 0.5) / n
        for z in ((-depth / 2,) if depth < 13 else (-1.5, -depth + 1.5)):
            res = bmesh.ops.create_cube(bm, size=1)['verts']
            bmesh.ops.scale(bm, verts=res, vec=(0.5, 0.35, 1.4))
            bmesh.ops.rotate(bm, verts=res, cent=(0, 0, 0), matrix=Matrix.Rotation(a, 3, 'Z'))
            bmesh.ops.translate(bm, verts=res, vec=((r + 0.25) * math.cos(a), (r + 0.25) * math.sin(a), z))
    obj(name + ' lugs', bm, [M['chrome']], root).matrix_basis = T


def tube(bm, a, b, r=0.35):
    d = b - a
    res = bmesh.ops.create_cone(bm, cap_ends=True, segments=12, radius1=r, radius2=r, depth=d.length)
    q = Vector((0, 0, 1)).rotation_difference(d.normalized())
    bmesh.ops.transform(bm, verts=res['verts'], matrix=Matrix.Translation((a + b) / 2) @ q.to_matrix().to_4x4())


def tripod(bm, top, spread=11):
    base = Vector((top.x, top.y, 0))
    tube(bm, base + Vector((0, 0, 6)), top, 0.42)
    for k in range(3):
        a = 2 * math.pi * k / 3 + 0.5
        foot = base + Vector((spread * math.cos(a), spread * math.sin(a), 0.3))
        tube(bm, base + Vector((0, 0, 7)), foot, 0.3)


def cymbal(M, root, name, centre, diameter, tilt, dark):
    bm = bmesh.new()
    r = diameter / 2
    rows = [(0.0, 0.9), (0.5, 0.75), (1.4, 0.35), (r, 0.0)] if not dark else [(0.0, 0.8), (0.6, 0.6), (1.6, 0.2), (r - 1.5, 0.0), (r, 0.45)]
    seg = 64
    rings = []
    for rad, z in rows:
        rings.append([bm.verts.new((rad * math.cos(2 * math.pi * k / seg), rad * math.sin(2 * math.pi * k / seg), z)) for k in range(seg)])
    for r0, r1 in zip(rings, rings[1:]):
        for k in range(seg):
            bm.faces.new((r0[k], r0[(k + 1) % seg], r1[(k + 1) % seg], r1[k]))
    bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=1e-4)
    geom = bmesh.ops.solidify(bm, geom=bm.faces[:], thickness=0.06)
    T = Matrix.Translation(centre) @ Matrix.Rotation(math.radians(-tilt), 4, 'X')
    bmesh.ops.transform(bm, matrix=T, verts=bm.verts[:])
    o = obj(name, bm, [M['dark' if dark else 'brass']], root)
    o.data.shade_smooth()


def build(M, root):
    # The bass drum: 24" (see above), 14" deep, front head toward the audience.
    kx, kz = 0.0, 12.0
    drum(M, root, 'bass drum', Vector((kx, 14.0, kz)), 24, 14, Vector((0, 1, 0)), False)
    hw = bmesh.new()
    # Spurs and the pedal.
    for s in (-1, 1):
        tube(hw, Vector((s * 10, 2, 5)), Vector((s * 14, -3, 0.2)), 0.3)
    tube(hw, Vector((kx, 15, 1)), Vector((kx, 22, 1.5)), 0.6)
    for name, (px, py), dia, depth, y, tilt, stand in TOMS:
        x, ztop = at(px, py)
        axis = Vector((0, math.sin(math.radians(tilt)), math.cos(math.radians(tilt))))
        head = Vector((x, y, ztop))
        drum(M, root, name, head, dia, depth, axis, True)
        mount = head - axis * (depth * 0.45) + Vector((0, dia / 2 + 0.6, 0)).normalized() * 0
        if stand:
            tripod(hw, Vector((x, y + dia / 2 + 1, ztop - depth * 0.6)))
            tube(hw, Vector((x, y + dia / 2 + 1, ztop - depth * 0.6)), head - axis * (depth * 0.4) + Vector((0, dia / 2, 0)), 0.3)
        else:
            # Mounted on the bass drum's rail.
            tube(hw, Vector((x * 0.5, 14, kz + 12)), head - axis * (depth * 0.5) + Vector((0, dia / 2, 0)) * 0.6, 0.35)
    tube(hw, Vector((-8, 14, kz + 12)), Vector((8, 14, kz + 12)), 0.4)
    # Snare between the drummer's knees (estimate: hidden behind the bass drum).
    drum(M, root, 'snare', Vector((8, 26, 25)), 14, 5.5, Vector((0, 0.17, 0.985)), False)
    tripod(hw, Vector((8, 26, 18.5)), 8)
    for name, (px, py), dia, y, tilt, dark in CYMBALS:
        x, z = at(px, py)
        if name == 'hi-hats':
            cymbal(M, root, name + ' top', Vector((x, y, z + 0.9)), dia, tilt, False)
            cymbal(M, root, name + ' bottom', Vector((x, y, z)), dia, tilt, False)
            tripod(hw, Vector((x, y, z)), 8)
            tube(hw, Vector((x, y, z)), Vector((x, y, z + 6)), 0.18)
        else:
            cymbal(M, root, name, Vector((x, y, z)), dia, tilt, dark)
            tripod(hw, Vector((x, y + 1.5, z - 1.2)))
    o = obj('stands', hw, [M['chrome']], root)
    o.data.shade_smooth()
    # The throne: a round patterned seat, behind the kit (photograph: its top
    # 20.5" up, a little to the audience's left of the bass drum).
    tx, tz = at(1015, 1080)
    bm = bmesh.new()
    res = bmesh.ops.create_cone(bm, cap_ends=True, segments=40, radius1=7, radius2=6.5, depth=3.5)
    bmesh.ops.translate(bm, verts=res['verts'], vec=(tx, 34, tz - 1.75))
    o = obj('throne seat', bm, [M['seat']], root)
    o.data.shade_smooth()
    bm = bmesh.new()
    tripod(bm, Vector((tx, 34, tz - 3.5)), 10)
    obj('throne stand', bm, [M['chrome']], root).data.shade_smooth()


def camera(shot):
    s = bpy.context.scene
    cam = bpy.data.cameras.new('camera')
    o = bpy.data.objects.new('camera', cam)
    s.collection.objects.link(o)
    s.camera = o
    cam.dof.use_dof = True
    cam.dof.aperture_fstop = 8
    if shot == 'hero':
        cam.lens = 40
        o.location = (-1.6, -2.6, 1.7)
        target = Vector((-0.25, 0.35, 0.72))
    else:
        # From the audience, straight on and low, like Anderson's photograph.
        cam.lens = 55
        o.location = (0.0, -4.2, 1.0)
        target = Vector((-0.25, 0.3, 0.7))
    s.render.resolution_x, s.render.resolution_y = 1600, 1066
    o.rotation_euler = (target - o.location).to_track_quat('-Z', 'Y').to_euler()
    cam.dof.focus_distance = (target - o.location).length
    return target


def main():
    a = args()
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o)
    root = bpy.data.objects.new('Drum kit', None)
    bpy.context.scene.collection.objects.link(root)
    build(materials(), root)
    root.scale = (IN, IN, IN)
    studio('hero')
    for o in bpy.data.objects:          # the studio is sized for a guitar; widen it
        if o.name in ('cyc', 'reflector card') or o.type == 'LIGHT':
            o.location = o.location * 2.0
            o.scale = (2.0, 2.0, 2.0)
            if o.type == 'LIGHT':
                o.data.energy *= 4.0
    target = camera(a.shot)
    os.makedirs(a.out, exist_ok=True)
    if a.save:
        frame_viewports(a.shot, target)
        bpy.ops.wm.save_as_mainfile(filepath=os.path.join(HERE, 'drums.blend'))
    out = os.path.join(a.out, f'drums-{a.shot}.png')
    render(a.samples, out)
    print('RENDERED', out)


main()

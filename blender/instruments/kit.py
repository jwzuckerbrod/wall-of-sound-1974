"""
Shared building blocks for the instrument scripts: mesh helpers, materials,
the studio, and rendering. Each instrument's build.py adds only what is its
own. (The Wolf, in the garcia-guitars project, has the original copies.)

Instruments are built in inches under a root empty scaled to metres, so
shader object coordinates are inches too.
"""
import math

import bmesh
import bpy
from mathutils import Matrix, Vector

IN = 0.0254


def srgb(hex_):
    c = [int(hex_[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    return tuple(v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4 for v in c) + (1.0,)


def obj(name, bm, mats, parent):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    for m in mats:
        me.materials.append(m)
    o = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(o)
    o.parent = parent
    return o


def prism(bm, pts, z0, z1, mat=0, side_mat=None):
    """Extrude a closed (x, y) polygon in inches between z0 and z1."""
    bot = [bm.verts.new((x, y, z0)) for x, y in pts]
    top = [bm.verts.new((x, y, z1)) for x, y in pts]
    fb = bm.faces.new(list(reversed(bot)))
    ft = bm.faces.new(top)
    fb.material_index = ft.material_index = mat
    n = len(pts)
    for i in range(n):
        f = bm.faces.new((bot[i], bot[(i + 1) % n], top[(i + 1) % n], top[i]))
        f.material_index = mat if side_mat is None else side_mat
    return ft


def smooth_outline(pts, step=0.06, passes=4):
    """
    Resample the traced outline evenly and relax it a little. The trace follows
    pixel edges, which leaves a fine stair-step in the silhouette that a
    polished body edge would never have. Four passes move nothing further than
    about a hundredth of an inch.
    """
    if pts[0] == pts[-1]:
        pts = pts[:-1]
    P = [Vector((x, y)) for x, y in pts] + [Vector(pts[0])]
    out, carry = [], 0.0
    for a, b in zip(P, P[1:]):
        seg = (b - a).length
        d = carry
        while d < seg:
            out.append(a + (b - a) * (d / seg))
            d += step
        carry = d - seg
    for _ in range(passes):
        n = len(out)
        out = [(out[i - 1] + out[i] * 2 + out[(i + 1) % n]) / 4 for i in range(n)]
    return [(v.x, v.y) for v in out]


def rounded_rect(x0, x1, y0, y1, r, seg=6):
    pts = []
    for cx, cy, a0 in ((x1 - r, y0 + r, -90), (x1 - r, y1 - r, 0), (x0 + r, y1 - r, 90), (x0 + r, y0 + r, 180)):
        for k in range(seg + 1):
            a = math.radians(a0 + 90 * k / seg)
            pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return pts


def cyl(bm, x, y, z0, h, r, seg=24, mat=0, axis='Z'):
    res = bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r, radius2=r, depth=h)
    vs = res['verts']
    if axis == 'Y':
        bmesh.ops.rotate(bm, verts=vs, cent=(0, 0, 0), matrix=Matrix.Rotation(math.radians(90), 3, 'X'))
    bmesh.ops.translate(bm, verts=vs, vec=(x, y, z0 + (h / 2 if axis == 'Z' else 0)))
    for f in {f for v in vs for f in v.link_faces}:
        f.material_index = mat
    return vs


def modifier_bevel(o, width, segs=4, limit='ANGLE'):
    m = o.modifiers.new('bevel', 'BEVEL')
    m.width = width
    m.segments = segs
    m.limit_method = limit
    m.harden_normals = True
    o.data.shade_smooth() if hasattr(o.data, 'shade_smooth') else None
    return m


# ─── materials ────────────────────────────────────────────────────────────────

def new_mat(name):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    return m, m.node_tree.nodes, m.node_tree.links, m.node_tree.nodes['Principled BSDF']


def lacquer(b):
    b.inputs['Coat Weight'].default_value = 1.0
    b.inputs['Coat Roughness'].default_value = 0.025
    b.inputs['Coat IOR'].default_value = 1.52


def laminate(name, axis, bands, extent):
    """Laminated edge: constant colour bands along one object axis, 0..extent inches."""
    m, nt, L, b = new_mat(name)
    co = nt.new('ShaderNodeTexCoord')
    sep = nt.new('ShaderNodeSeparateXYZ')
    L.new(co.outputs['Object'], sep.inputs['Vector'])
    mr = nt.new('ShaderNodeMapRange')
    mr.inputs['From Min'].default_value = extent[0]
    mr.inputs['From Max'].default_value = extent[1]
    L.new(sep.outputs[axis], mr.inputs['Value'])
    ramp = nt.new('ShaderNodeValToRGB')
    ramp.color_ramp.interpolation = 'CONSTANT'
    els = ramp.color_ramp.elements
    els[0].position, els[0].color = 0.0, srgb(bands[0][1])
    els[1].position, els[1].color = bands[1][0], srgb(bands[1][1])
    for pos, col in bands[2:]:
        e = els.new(pos)
        e.color = srgb(col)
    L.new(mr.outputs['Result'], ramp.inputs['Fac'])
    L.new(ramp.outputs['Color'], b.inputs['Base Color'])
    b.inputs['Roughness'].default_value = 0.3
    lacquer(b)
    return m


def plain(name, hex_, rough, metal=0.0, coat=False):
    m, nt, L, b = new_mat(name)
    b.inputs['Base Color'].default_value = srgb(hex_)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    if coat:
        lacquer(b)
    return m


def ebony():
    m, nt, L, b = new_mat('Gaboon ebony')
    co = nt.new('ShaderNodeTexCoord')
    wave = nt.new('ShaderNodeTexWave')
    wave.bands_direction = 'Y'
    wave.inputs['Scale'].default_value = 1.0
    wave.inputs['Distortion'].default_value = 4
    L.new(co.outputs['Object'], wave.inputs['Vector'])
    ramp = nt.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].color = srgb('#0b0908')
    ramp.color_ramp.elements[1].color = srgb('#1f1914')
    L.new(wave.outputs['Fac'], ramp.inputs['Fac'])
    L.new(ramp.outputs['Color'], b.inputs['Base Color'])
    b.inputs['Roughness'].default_value = 0.42
    return m


def rosewood(name='Brazilian rosewood, lacquered'):
    """Brazilian rosewood under lacquer: chocolate brown, darker streaks."""
    m, nt, L, b = new_mat(name)
    co = nt.new('ShaderNodeTexCoord')
    wave = nt.new('ShaderNodeTexWave')
    wave.bands_direction = 'X'
    wave.inputs['Scale'].default_value = 2.2
    wave.inputs['Distortion'].default_value = 7
    wave.inputs['Detail'].default_value = 4
    L.new(co.outputs['Object'], wave.inputs['Vector'])
    ramp = nt.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].color = srgb('#1a0c07')
    ramp.color_ramp.elements[1].color = srgb('#5a2d17')
    ramp.color_ramp.elements.new(0.62).color = srgb('#3b1b0e')
    L.new(wave.outputs['Fac'], ramp.inputs['Fac'])
    L.new(ramp.outputs['Color'], b.inputs['Base Color'])
    b.inputs['Roughness'].default_value = 0.3
    lacquer(b)
    return m


def studio(shot):
    s = bpy.context.scene
    world = s.world or bpy.data.worlds.new('World')
    s.world = world
    world.use_nodes = True
    wn, wl = world.node_tree.nodes, world.node_tree.links
    bg = wn['Background']
    bg.inputs['Strength'].default_value = 0.35
    tc = wn.new('ShaderNodeTexCoord')
    sep = wn.new('ShaderNodeSeparateXYZ')
    wl.new(tc.outputs['Generated'], sep.inputs['Vector'])
    grad = wn.new('ShaderNodeValToRGB')
    grad.color_ramp.elements[0].color = srgb('#08090a')
    grad.color_ramp.elements[1].position = 0.75
    grad.color_ramp.elements[1].color = srgb('#9aa0a8')
    toward = wn.new('ShaderNodeMath'); toward.operation = 'MULTIPLY_ADD'
    toward.inputs[1].default_value = -0.5
    toward.inputs[2].default_value = 0.5
    wl.new(sep.outputs['Y'], toward.inputs[0])   # -Y (behind the camera) is brighter
    up = wn.new('ShaderNodeMath'); up.operation = 'MULTIPLY_ADD'
    up.inputs[1].default_value = 0.5
    wl.new(sep.outputs['Z'], up.inputs[0])
    wl.new(toward.outputs[0], up.inputs[2])
    wl.new(up.outputs[0], grad.inputs['Fac'])
    wl.new(grad.outputs['Color'], bg.inputs['Color'])
    # The backdrop hides the world from the camera; only reflections see it.

    def area(name, loc, size, power, colour='#fff6ea'):
        L = bpy.data.lights.new(name, 'AREA')
        L.shape = 'RECTANGLE'
        L.size, L.size_y = size
        L.energy = power
        L.color = srgb(colour)[:3]
        o = bpy.data.objects.new(name, L)
        s.collection.objects.link(o)
        o.location = loc
        o.rotation_euler = (Vector((0, 0, 0.55)) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()

    if shot == 'match':
        # Flat, even light like a copy stand, so the comparison is about shape.
        area('copy left', (-0.8, -0.4, 1.4), (1.2, 1.2), 45)
        area('copy right', (0.8, -0.4, 1.4), (1.2, 1.2), 45)
        world.node_tree.nodes['Background'].inputs['Color'].default_value = srgb('#6c7078')
        world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.6
        return
    # Cyclorama: a floor that sweeps up into a back wall.
    bm = bmesh.new()
    prof = [(-3.0, -3.0, 0.0), (1.2, 1.2, 0.0)]
    for i in range(24):
        a = math.pi / 2 * i / 23
        prof.append((0, 1.2 + 0.6 * math.sin(a), 0.6 - 0.6 * math.cos(a)))
    verts = []
    for x in (-3.0, 3.0):
        verts.append([bm.verts.new((x, y, z)) for (_, y, z) in [(0, -3.0, 0.0)] + prof[2:] + [(0, 1.8, 3.0)]])
    for i in range(len(verts[0]) - 1):
        bm.faces.new((verts[0][i], verts[1][i], verts[1][i + 1], verts[0][i + 1]))
    me = bpy.data.meshes.new('cyc')
    bm.to_mesh(me)
    bm.free()
    me.shade_smooth()
    cyc = bpy.data.objects.new('cyc', me)
    s.collection.objects.link(cyc)
    me.materials.append(plain('Backdrop', '#1d1e21', 0.8))
    # White card behind and above the camera, invisible to it, so polished
    # metal reads as metal instead of reflecting a black studio.
    bm2 = bmesh.new()
    bmesh.ops.create_grid(bm2, x_segments=1, y_segments=1, size=0.7)
    me2 = bpy.data.meshes.new('card')
    bm2.to_mesh(me2)
    bm2.free()
    card = bpy.data.objects.new('reflector card', me2)
    s.collection.objects.link(card)
    card.location = (-0.9, -2.6, 0.25)
    card.rotation_euler = (math.radians(90), 0, math.radians(-25))
    cm = bpy.data.materials.new('card')
    cm.use_nodes = True
    em = cm.node_tree.nodes.new('ShaderNodeEmission')
    em.inputs['Strength'].default_value = 1.6
    cm.node_tree.links.new(em.outputs[0], cm.node_tree.nodes['Material Output'].inputs['Surface'])
    me2.materials.append(cm)
    card.visible_camera = False
    card.visible_diffuse = False
    # From the side and high, so the black lacquer headstock doesn't mirror it.
    area('key', (-1.7, -0.5, 1.9), (0.9, 1.3), 70)
    area('fill', (1.4, -1.0, 0.8), (1.0, 1.0), 9, '#e8eefc')
    area('rim', (0.6, 1.1, 1.9), (0.3, 1.6), 40)


def frame_viewports(shot, target=None):
    """
    Open the saved file looking at the guitar, not at the studio: every 3D
    view framed from the shot's camera position, in Material Preview shading,
    with the lights, camera and card outlines hidden. Orbit from there. (A
    file saved from the command line can't keep Rendered shading; Blender
    drops it back to Solid. Press Z > Rendered for the Cycles view.)
    """
    cam = bpy.context.scene.camera
    if target is None:
        target = Vector((0.0, 0.0, 0.52)) if shot != 'match' else Vector((0.0, 0.0, 0.0))
    eye = cam.location.copy()
    for screen in bpy.data.screens:
        for area in screen.areas:
            if area.type != 'VIEW_3D':
                continue
            space = area.spaces.active
            space.shading.type = 'MATERIAL'
            space.overlay.show_extras = False
            space.overlay.show_floor = False
            space.overlay.show_axis_x = space.overlay.show_axis_y = False
            space.clip_start = 0.005
            r3d = space.region_3d
            r3d.view_perspective = 'PERSP'
            r3d.view_location = target
            r3d.view_rotation = (target - eye).to_track_quat('-Z', 'Y')
            r3d.view_distance = (target - eye).length * 0.8
    bpy.context.scene.cycles.preview_samples = 64
    bpy.context.scene.cycles.use_preview_denoising = True


def render(samples, path):
    s = bpy.context.scene
    s.render.engine = 'CYCLES'
    prefs = bpy.context.preferences.addons['cycles'].preferences
    prefs.compute_device_type = 'METAL'
    prefs.get_devices()
    for d in prefs.devices:
        d.use = d.type == 'METAL'
    s.cycles.device = 'GPU'
    s.cycles.samples = samples
    s.cycles.use_denoising = True
    s.view_settings.view_transform = 'AgX'
    s.view_settings.look = 'AgX - Medium High Contrast'
    s.render.resolution_percentage = 100
    s.render.image_settings.file_format = 'PNG'
    s.render.filepath = path
    bpy.ops.render.render(write_still=True)



"""
Crowd masks and crowd compositing, for the story's renders.

    # mask: where a render with the crowd differs from one without it
    Blender -b -P blender/crowd_mask.py -- mask <with.png> <without.png> <mask.png>
    # composite: take only the masked pixels from an edited image
    Blender -b -P blender/crowd_mask.py -- composite <render.png> <edited.png> <mask.png> <out.png>
    # grade: make the whole frame look like a 1974 colour print
    Blender -b -P blender/crowd_mask.py -- grade <in.png> <out.png>

The composite is how an AI-edited crowd (Kling) goes into a render without
touching anything else: every pixel outside the mask is the render's own, so
the Wall, the scaffold, the shell and the band stay exactly as modelled.
Runs inside Blender for its numpy and image I/O.
"""
import sys

import bpy
import numpy as np


def load(path, size=None):
    img = bpy.data.images.load(path)
    if size and tuple(img.size) != size:
        img.scale(*size)
    w, h = img.size
    return np.array(img.pixels[:], dtype=np.float32).reshape(h, w, 4), (w, h)


def save(arr, size, path):
    w, h = size
    img = bpy.data.images.new('out', w, h, alpha=True)
    img.pixels = arr.reshape(-1).tolist()
    img.filepath_raw = path
    img.file_format = 'PNG'
    img.save()


def grow(m, r):
    out = m.copy()
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            if dx * dx + dy * dy <= r * r:
                out = np.maximum(out, np.roll(np.roll(m, dy, 0), dx, 1))
    return out


def blur(m, r):
    k = np.ones(2 * r + 1, dtype=np.float32) / (2 * r + 1)
    m = np.apply_along_axis(lambda v: np.convolve(v, k, mode='same'), 0, m)
    return np.apply_along_axis(lambda v: np.convolve(v, k, mode='same'), 1, m)


def mask(with_crowd, without, out):
    a, size = load(with_crowd)
    b, _ = load(without, size)
    d = np.abs(a[..., :3] - b[..., :3]).max(-1)
    m = (d > 0.04).astype(np.float32)
    # Keep only big connected regions: render noise on the Wall's bright dust
    # caps makes isolated specks that aren't crowd. A pixel counts if enough of
    # its neighbourhood differs too.
    m = (blur(m, 6) > 0.25).astype(np.float32) * m
    m = blur(grow(m, 4), 3)              # fill the gaps between people, soften the edge
    m = np.clip(m * 1.5, 0, 1)
    rgba = np.dstack([m, m, m, np.ones_like(m)])
    save(rgba, size, out)
    print('MASK', out, 'covers', round(float(m.mean()) * 100, 1), '% of the frame')


def composite(render, edited, mask_path, out):
    r, size = load(render)
    e, _ = load(edited, size)
    m, _ = load(mask_path, size)
    k = m[..., :1]
    o = r * (1 - k) + e * k
    o[..., 3] = 1
    save(o, size, out)
    print('COMPOSITE', out)


def grade(src, out):
    """
    A 1974 colour print, after the crowd photographs (docs/crowd-references.md):
    warmer, lifted blacks and softened whites, less saturation, a little
    yellow in the highlights, film grain. One grade over the whole frame, so
    the rendered Wall and the edited crowd share one look.
    """
    a, size = load(src)
    c = a[..., :3]
    lum = c @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
    c = lum[..., None] + (c - lum[..., None]) * 0.78           # less saturated
    c = c * np.array([1.05, 1.0, 0.88], dtype=np.float32)       # warmer
    c = 0.045 + c * 0.9                                          # lifted blacks, soft whites
    hi = np.clip((lum - 0.55) / 0.45, 0, 1)[..., None]
    c = c + hi * np.array([0.03, 0.02, -0.02], dtype=np.float32)  # yellowed highlights
    rng = np.random.default_rng(1974)
    g = rng.normal(0, 0.022, c.shape[:2]).astype(np.float32)
    g = (g + np.roll(g, 1, 0) + np.roll(g, 1, 1)) / 1.8          # grain a pixel or two across
    c = np.clip(c + g[..., None] * (0.6 + 0.4 * (1 - lum[..., None])), 0, 1)
    o = np.dstack([c, np.ones(c.shape[:2], dtype=np.float32)])
    save(o, size, out)
    print('GRADED', out)


argv = sys.argv[sys.argv.index('--') + 1:]
{'mask': mask, 'composite': composite, 'grade': grade}[argv[0]](*argv[1:])

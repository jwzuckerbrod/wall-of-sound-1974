"""
Sets a Cycles render beside the 1974 photograph it was shot to match.

    /Applications/Blender.app/Contents/MacOS/Blender -b -P blender/compare.py -- \
        --render .shots/blender/pechner-cycles.png \
        --photo .shots/reference/pechner-vancouver-1974-05-17.jpg

Writes, next to the render:
  *-film.png     the render as black-and-white film: luminance through a
                 toe-and-shoulder curve, soft halation on the highlights, grain
  *-compare.png  photo | film render | photo with the render at 50%

Runs inside Blender for its bundled numpy and image I/O; no other dependencies.
"""
import argparse
import os
import sys

import bpy
import numpy as np


def args():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    p = argparse.ArgumentParser()
    p.add_argument('--render', required=True)
    p.add_argument('--photo', required=True)
    p.add_argument('--grain', type=float, default=0.035)
    return p.parse_args(argv)


def load(path, size=None):
    img = bpy.data.images.load(os.path.abspath(path))
    if size and tuple(img.size) != size:
        img.scale(*size)
    w, h = img.size
    px = np.empty(w * h * 4, dtype=np.float32)
    img.pixels.foreach_get(px)
    # Blender stores rows bottom-up; keep it that way and write back the same.
    return px.reshape(h, w, 4), (w, h), img.colorspace_settings.name


def save(arr, path):
    h, w = arr.shape[:2]
    img = bpy.data.images.new(os.path.basename(path), w, h, alpha=True)
    img.colorspace_settings.name = 'sRGB'
    img.pixels.foreach_set(np.clip(arr, 0, 1).astype(np.float32).ravel())
    img.filepath_raw = os.path.abspath(path)
    img.file_format = 'PNG'
    img.save()


def blur(a, r):
    """Cheap separable box blur, three passes ≈ Gaussian."""
    k = 2 * r + 1
    for _ in range(3):
        c = np.cumsum(np.pad(a, ((r + 1, r), (0, 0)), mode='edge'), axis=0)
        a = (c[k:] - c[:-k]) / k
        c = np.cumsum(np.pad(a, ((0, 0), (r + 1, r)), mode='edge'), axis=1)
        a = (c[:, k:] - c[:, :-k]) / k
    return a


def film(rgb, grain, rng):
    # Tri-X-ish panchromatic response: a little less blue than photopic luminance.
    y = rgb[..., 0] * 0.30 + rgb[..., 1] * 0.59 + rgb[..., 2] * 0.11
    # Halation: the bright points bloom, the way the dust caps do in every print.
    y = y + 0.18 * blur(np.clip(y - 0.7, 0, None), 6)
    # Toe and shoulder.
    y = np.clip(y, 0, 1)
    y = y * y * (3 - 2 * y) * 0.75 + y * 0.25
    # Grain, stronger in the mid-tones, clumped a little.
    g = blur(rng.standard_normal(y.shape).astype(np.float32), 1) * 2.2
    y = y + g * grain * (0.35 + 4 * y * (1 - y))
    y = np.clip(y, 0, 1)
    return np.dstack([y, y, y, np.ones_like(y)])


def main():
    a = args()
    render, size, _ = load(a.render)
    photo, _, _ = load(a.photo, size)
    rng = np.random.default_rng(1974)
    f = film(render[..., :3], a.grain, rng)
    base = os.path.splitext(a.render)[0]
    save(f, base + '-film.png')

    overlay = photo.copy()
    overlay[..., :3] = photo[..., :3] * 0.5 + f[..., :3] * 0.5
    gap = np.ones((size[1], 12, 4), dtype=np.float32)
    save(np.concatenate([photo, gap, f, gap, overlay], axis=1), base + '-compare.png')
    print('COMPARED', base + '-compare.png')


main()

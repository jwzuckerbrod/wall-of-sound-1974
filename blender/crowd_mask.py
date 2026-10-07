"""
Crowd masks and crowd compositing, for the story's renders.

    # mask: where a render with the crowd differs from one without it
    Blender -b -P blender/crowd_mask.py -- mask <with.png> <without.png> <mask.png>
    # composite: take only the masked pixels from an edited image
    Blender -b -P blender/crowd_mask.py -- composite <render.png> <edited.png> <mask.png> <out.png>
    # tiles: cut the crowd into 16:9 crops, so an edit sees bigger people
    Blender -b -P blender/crowd_mask.py -- tiles <render.png> <dir> x0,y0,w,h [x0,y0,w,h ...]
    # place: align each edited tile to its crop, reject any that moved, composite
    Blender -b -P blender/crowd_mask.py -- place <render.png> <mask.png> <dir> <out.png>
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
    """Dilate by a disc of radius r. Padded, not wrapped, so nothing leaks across the frame's edges."""
    h, w = m.shape
    p = np.pad(m, r)
    out = m.copy()
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            if dx * dx + dy * dy <= r * r:
                out = np.maximum(out, p[r + dy:r + dy + h, r + dx:r + dx + w])
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


def topdown(a):
    return a[::-1].copy()


def gray(a):
    return a[..., :3] @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)


def warp(img, s, dx, dy):
    """img scaled by s about its centre and shifted by (dx, dy) px, sampled bilinearly. Top-down arrays."""
    h, w = img.shape[:2]
    ys, xs = np.mgrid[0:h, 0:w].astype(np.float32)
    sx = (xs - w / 2 - dx) / s + w / 2
    sy = (ys - h / 2 - dy) / s + h / 2
    x0 = np.clip(np.floor(sx).astype(int), 0, w - 2)
    y0 = np.clip(np.floor(sy).astype(int), 0, h - 2)
    fx = np.clip(sx - x0, 0, 1)[..., None] if img.ndim == 3 else np.clip(sx - x0, 0, 1)
    fy = np.clip(sy - y0, 0, 1)[..., None] if img.ndim == 3 else np.clip(sy - y0, 0, 1)
    a = img[y0, x0] * (1 - fx) + img[y0, x0 + 1] * fx
    b = img[y0 + 1, x0] * (1 - fx) + img[y0 + 1, x0 + 1] * fx
    return a * (1 - fy) + b * fy


def tiles(render, out_dir, *boxes):
    import json
    import os
    r, size = load(render)
    r = topdown(r)
    meta = []
    for k, box in enumerate(boxes):
        x0, y0, w, h = (int(v) for v in box.split(','))
        crop = r[y0:y0 + h, x0:x0 + w]
        path = os.path.join(out_dir, f'tile{k}.png')
        save(topdown(crop), (w, h), path)
        meta.append({'file': f'tile{k}.png', 'box': [x0, y0, w, h]})
        print('TILE', path, w, 'x', h)
    json.dump(meta, open(os.path.join(out_dir, 'tiles.json'), 'w'))


def align(crop, edit, keep):
    """
    The scale and shift that best lay `edit` over `crop`, judged only where
    nothing should have changed (keep > 0.5). A coarse search, then a fine one.
    Returns (s, dx, dy, error, error_unaligned).
    """
    g0, g1 = gray(crop), gray(edit)
    k = keep > 0.5

    def err(s, dx, dy, step=1):
        w = warp(g1[::step, ::step], s, dx / step, dy / step)
        kk = k[::step, ::step]
        return float(np.abs(w - g0[::step, ::step])[kk].mean())

    base = err(1.0, 0, 0)
    best = (base, 1.0, 0.0, 0.0)
    for s in np.arange(0.88, 1.125, 0.02):
        for dx in range(-40, 41, 8):
            for dy in range(-40, 41, 8):
                e = err(s, dx, dy, 4)
                if e < best[0]:
                    best = (e, s, dx, dy)
    _, s0, x0, y0 = best
    best = (err(s0, x0, y0), s0, x0, y0)
    for s in np.arange(s0 - 0.02, s0 + 0.021, 0.005):
        for dx in range(int(x0) - 6, int(x0) + 7, 2):
            for dy in range(int(y0) - 6, int(y0) + 7, 2):
                e = err(s, dx, dy)
                if e < best[0]:
                    best = (e, s, dx, dy)
    e, s, dx, dy = best
    return s, dx, dy, e, base


def place(render, mask_path, tile_dir, out, max_error=0.045):
    import json
    import os
    r, size = load(render)
    m, _ = load(mask_path, size)
    r, m = topdown(r), topdown(m)[..., 0]
    acc = np.zeros_like(r)
    wsum = np.zeros(m.shape, dtype=np.float32)
    for t in json.load(open(os.path.join(tile_dir, 'tiles.json'))):
        x0, y0, w, h = t['box']
        ed_path = os.path.join(tile_dir, t['file'].replace('.png', '-kling.png'))
        if not os.path.exists(ed_path):
            print('MISSING', ed_path)
            continue
        e, _ = load(ed_path, (w, h))
        e = topdown(e)
        crop, mk = r[y0:y0 + h, x0:x0 + w], m[y0:y0 + h, x0:x0 + w]
        s, dx, dy, err, base = align(crop, e, 1 - mk)
        verdict = 'OK' if err < max_error else 'REJECTED'
        print(f"ALIGN {t['file']}: scale {s:.3f} shift ({dx:+.0f}, {dy:+.0f}) px, "
              f"error {base:.3f} -> {err:.3f}  {verdict}")
        if verdict != 'OK':
            continue
        e = warp(e, s, dx, dy)
        # Feather each tile's edges, so overlapping tiles blend.
        fy = np.minimum(np.arange(h), np.arange(h)[::-1]).astype(np.float32)
        fx = np.minimum(np.arange(w), np.arange(w)[::-1]).astype(np.float32)
        feather = np.clip(np.minimum(fy[:, None], fx[None, :]) / 40.0, 0, 1)
        acc[y0:y0 + h, x0:x0 + w] += e * feather[..., None]
        wsum[y0:y0 + h, x0:x0 + w] += feather
    edited = np.where(wsum[..., None] > 0, acc / np.maximum(wsum, 1e-6)[..., None], r)
    k = (m * np.clip(wsum * 4, 0, 1))[..., None]
    o = r * (1 - k) + edited * k
    o[..., 3] = 1
    save(topdown(o), size, out)
    print('PLACED', out)


argv = sys.argv[sys.argv.index('--') + 1:]
{'mask': mask, 'composite': composite, 'grade': grade, 'tiles': tiles, 'place': place}[argv[0]](*argv[1:])

"""
Shared tracing helpers for the instrument scripts (run inside Blender for its
numpy): loading photos with their alpha, flood fills, boundary tracing and
simplification, morphology, and fitting photographed frets to a known scale.
The Wolf's copies, in garcia-guitars, are the originals.
"""
import bpy
import numpy as np


def load_rgba(path):
    """Top-down float RGBA, 0..1."""
    img = bpy.data.images.load(path)
    w, h = img.size
    a = np.empty(w * h * 4, np.float32)
    img.pixels.foreach_get(a)
    return a.reshape(h, w, 4)[::-1]


def flood(seed, passable):
    m = seed & passable
    while True:
        g = m.copy()
        g[1:] |= m[:-1]
        g[:-1] |= m[1:]
        g[:, 1:] |= m[:, :-1]
        g[:, :-1] |= m[:, 1:]
        g &= passable
        if (g == m).all():
            return m
        m = g


def trace(mask):
    """Moore-neighbour boundary, as (x, y) pixel coordinates."""
    ys, xs = np.nonzero(mask)
    start = (xs[np.argmin(ys * 100000 + xs)], ys.min())
    dirs = [(1, 0), (1, 1), (0, 1), (-1, 1), (-1, 0), (-1, -1), (0, -1), (1, -1)]
    h, w = mask.shape
    inside = lambda x, y: 0 <= x < w and 0 <= y < h and mask[y, x]
    pts, cur, back = [start], start, 4
    for _ in range(400000):
        for k in range(8):
            d = (back + 1 + k) % 8
            nx, ny = cur[0] + dirs[d][0], cur[1] + dirs[d][1]
            if inside(nx, ny):
                back = (d + 4) % 8
                cur = (nx, ny)
                break
        if cur == start:
            break
        pts.append(cur)
    return np.array(pts, float)


def simplify(P, eps):
    if len(P) < 3:
        return P
    a, b = P[0], P[-1]
    ab = b - a
    n = np.hypot(*ab) or 1.0
    d = np.abs(ab[0] * (a[1] - P[:, 1]) - (a[0] - P[:, 0]) * ab[1]) / n
    i = int(np.argmax(d))
    if d[i] > eps:
        return np.vstack([simplify(P[:i + 1], eps)[:-1], simplify(P[i:], eps)])
    return np.vstack([a, b])


def closed_simplify(P, eps):
    far = int(np.argmax(np.hypot(*(P - P[0]).T)))
    return np.vstack([simplify(P[:far + 1], eps)[:-1], simplify(np.vstack([P[far:], P[:1]]), eps)[:-1]])


def open_(m, k):
    """Morphological opening with a (2k+1) square: removes anything thinner."""
    def erode(m):
        o = m.copy()
        o[1:] &= m[:-1]; o[:-1] &= m[1:]; o[:, 1:] &= m[:, :-1]; o[:, :-1] &= m[:, 1:]
        return o
    def dilate(m):
        o = m.copy()
        o[1:] |= m[:-1]; o[:-1] |= m[1:]; o[:, 1:] |= m[:, :-1]; o[:, :-1] |= m[:, 1:]
        return o
    for _ in range(k):
        m = erode(m)
    for _ in range(k):
        m = dilate(m)
    return m


def close_(m, k):
    """Morphological closing: fills notches and holes narrower than 2k+1."""
    return ~open_(~m, k)


def fret_peaks(a, cols, y0, y1):
    prof = a[y0:y1, cols].mean(axis=(1, 2))
    prof = prof - np.convolve(prof, np.ones(15) / 15, mode='same')
    peaks = [y for y in range(2, len(prof) - 2)
             if prof[y] > 12 and prof[y] == prof[y - 2:y + 3].max()]
    # Sub-pixel centroid of each peak.
    out = []
    for y in peaks:
        wts = np.clip(prof[y - 2:y + 3], 0, None)
        out.append(y0 + y - 2 + (wts * np.arange(5)).sum() / wts.sum())
    return np.array(out)


def fit_frets(peaks, ppi_range, scale_in, n_frets, nut=None, nut_tol=6.0):
    """
    Which frets are these, and how many pixels to the inch?

    Fret n lies scale_in * (1 - 2^(-n/12)) in from the nut. Every pair of peaks,
    taken as every pair of fret numbers, fixes a candidate scale and nut
    position; the candidate that lands on the most peaks wins, and a least-
    squares fit over those peaks refines it. Inlays and string glints are
    simply the peaks no candidate explains.

    The fret series is self-similar: numbering every fret one higher fits the
    same peaks just as well at a scale 2^(1/12) larger. Only something outside
    the series tells the two apart, so pass the nut's position when it can be
    seen (nut, in pixels): candidates must put the nut within nut_tol of it.
    """
    frets = scale_in * (1 - 2.0 ** (-np.arange(n_frets + 1) / 12))
    best = None
    for i in range(len(peaks)):
        for j in range(i + 1, len(peaks)):
            for ni in range(1, n_frets):
                for nj in range(ni + 1, n_frets + 1):
                    ppi = (peaks[j] - peaks[i]) / (frets[nj] - frets[ni])
                    if not ppi_range[0] < ppi < ppi_range[1]:
                        continue
                    y_nut = peaks[i] - ppi * frets[ni]
                    if nut is not None and abs(y_nut - nut) > nut_tol:
                        continue
                    pred = y_nut + ppi * frets
                    d = np.abs(peaks[:, None] - pred[None, :])
                    hits = d.min(axis=1) < 2.0
                    score = (int(hits.sum()), -float(d.min(axis=1)[hits].mean()))
                    if best is None or score > best[0]:
                        best = (score, hits, d.argmin(axis=1))
    _, hits, idx = best
    x = frets[idx[hits]]
    A = np.vstack([x, np.ones_like(x)]).T
    (ppi, y_nut), *_ = np.linalg.lstsq(A, peaks[hits], rcond=None)
    err = float(np.sqrt(np.mean((A @ [ppi, y_nut] - peaks[hits]) ** 2)))
    return err, int(idx[hits].min()), float(ppi), float(y_nut), int(hits.sum())



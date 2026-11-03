"""
Solves a camera from a photograph: where it stood, which way it looked, and
its lens, from points read off the photo whose positions the model knows
(blender/cameras/<name>.json). Least squares (Levenberg-Marquardt) on a
pinhole camera with its principal point at the frame's centre.

    /Applications/Blender.app/Contents/MacOS/Blender -b -P blender/solve_camera.py -- blender/cameras/bowl-1974-07-21.json

Writes the solution back into the same file under "camera": position,
target, roll, f_px, the vertical field of view, and each point's error in
pixels. Runs inside Blender only for its numpy. Pechner's camera was solved
by hand from the same idea (docs/qa-findings.md §6); this one by numbers.
"""
import json
import math
import sys

import numpy as np


def rot(yaw, pitch, roll):
    """Camera-to-world rotation: yaw about y, then pitch about x, then roll about the view axis."""
    cy, sy = math.cos(yaw), math.sin(yaw)
    cp, sp = math.cos(pitch), math.sin(pitch)
    cr, sr = math.cos(roll), math.sin(roll)
    Ry = np.array([[cy, 0, sy], [0, 1, 0], [-sy, 0, cy]])
    Rx = np.array([[1, 0, 0], [0, cp, -sp], [0, sp, cp]])
    Rz = np.array([[cr, -sr, 0], [sr, cr, 0], [0, 0, 1]])
    return Ry @ Rx @ Rz


def project(params, world, size):
    x, y, z, yaw, pitch, roll, f = params
    M = rot(yaw, pitch, roll)
    out = []
    for p in world:
        c = M.T @ (np.array(p) - np.array([x, y, z]))
        # Looking down -z: depth is -c[2].
        out.append([size[0] / 2 + f * c[0] / -c[2], size[1] / 2 - f * c[1] / -c[2]])
    return np.array(out)


def solve(world, px, size, guess):
    p = np.array(guess, dtype=float)
    lam = 1e-2
    def resid(q):
        return (project(q, world, size) - px).ravel()
    r = resid(p)
    for _ in range(500):
        J = np.empty((r.size, p.size))
        for i in range(p.size):
            h = 1e-6 * max(1.0, abs(p[i]))
            q = p.copy()
            q[i] += h
            J[:, i] = (resid(q) - r) / h
        A = J.T @ J
        g = J.T @ r
        step = np.linalg.solve(A + lam * np.diag(np.diag(A) + 1e-9), -g)
        q = p + step
        rq = resid(q)
        if rq @ rq < r @ r:
            p, r, lam = q, rq, lam * 0.3
            if np.linalg.norm(step) < 1e-10:
                break
        else:
            lam *= 10
    return p, r


def solve_at(world, px, size, z):
    """Solve with the camera's distance pinned at z: the other six parameters free."""
    full = lambda q: [q[0], q[1], z, q[2], q[3], q[4], q[5]]
    p = np.array([0, 6, 0, 0, 0, 35 * z], dtype=float)
    lam = 1e-2
    resid = lambda q: (project(full(q), world, size) - px).ravel()
    r = resid(p)
    for _ in range(400):
        J = np.empty((r.size, p.size))
        for i in range(p.size):
            h = 1e-6 * max(1.0, abs(p[i]))
            q = p.copy()
            q[i] += h
            J[:, i] = (resid(q) - r) / h
        A = J.T @ J
        step = np.linalg.solve(A + lam * np.diag(np.diag(A) + 1e-9), -J.T @ r)
        rq = resid(p + step)
        if rq @ rq < r @ r:
            p, r, lam = p + step, rq, lam * 0.3
        else:
            lam *= 10
    return np.array(full(p)), r


def seat_eye_height(z, bowl, deck_front, eye):
    """Eye height in the Bowl's seats z metres out (src/geometry/bowl.ts seatHeight), scene frame."""
    S = bowl['seating']
    floor = 3.048 - bowl['stageDrop']
    t = max(0.0, (z - deck_front) - S['firstRow'])
    return floor + S['rise'] * t + S['steepen'] * t * t + eye


def main():
    path = sys.argv[sys.argv.index('--') + 1]
    spec = json.load(open(path))
    world = [pt['world'] for pt in spec['points']]
    px = np.array([pt['px'] for pt in spec['points']], dtype=float)
    size = spec['size']
    seat = spec.get('seat_eye')
    if seat:
        # A near-frontal view fixes where the camera looks and its lens-to-
        # distance ratio, but hardly the distance: the fit is as good at 20 m
        # as at 80. What does fix it is that the photographer stood in the
        # crowd: walk the distance until the fitted camera height meets a
        # standing (or seated) eye in the Bowl's seating.
        scene = json.load(open(spec['scene']))
        bowl, front = scene['bowl'], scene['deck']['maxZ']
        gap = lambda z: solve_at(world, px, size, z)[0][1] - seat_eye_height(z, bowl, front, seat)
        lo, hi = 15.0, 110.0
        if gap(lo) * gap(hi) > 0:
            raise SystemExit('no distance puts the camera at a seat')
        for _ in range(40):
            mid = (lo + hi) / 2
            if gap(lo) * gap(mid) <= 0:
                hi = mid
            else:
                lo = mid
        p, r = solve_at(world, px, size, (lo + hi) / 2)
    else:
        best = None
        for d in (20, 30, 45, 70):
            p, r = solve(world, px, size, [0, 6, d, 0, 0, 0, 35 * d])
            e = float(np.sqrt((r @ r) / len(world)))
            if best is None or e < best[2]:
                best = (p, r, e)
        p, r, _ = best
    err = float(np.sqrt((r @ r) / len(world)))
    x, y, z, yaw, pitch, roll, f = (float(v) for v in p)
    M = rot(yaw, pitch, roll)
    fwd = M @ np.array([0, 0, -1.0])
    pos = np.array([x, y, z])
    # A target on the view axis, level with where the axis crosses the Wall's front plane.
    t = -pos[2] / fwd[2] if abs(fwd[2]) > 1e-9 else 30.0
    target = pos + fwd * t
    spec['camera'] = {
        'position': [round(x, 3), round(y, 3), round(z, 3)],
        'target': [round(float(v), 3) for v in target],
        'yaw_deg': round(math.degrees(yaw), 4),
        'pitch_deg': round(math.degrees(pitch), 4),
        'roll_deg': round(math.degrees(roll), 4),
        'f_px': round(f, 1),
        'vfov_deg': round(math.degrees(2 * math.atan(size[1] / 2 / f)), 3),
        'rms_px': round(err, 2),
        'errors_px': [round(float(math.hypot(r[2 * i], r[2 * i + 1])), 1) for i in range(len(world))],
    }
    json.dump(spec, open(path, 'w'), indent=2)
    print('SOLVED', json.dumps(spec['camera']))


main()

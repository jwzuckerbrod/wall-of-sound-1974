// Bakes the map's outlines (src/data/mapOutlines.ts) from Natural Earth, which is in the public domain.
//
//   node scripts/make-map.mjs <folder holding the three GeoJSON files>
//
// The files, from https://github.com/nvkelso/natural-earth-vector/tree/master/geojson :
//   ne_110m_admin_1_states_provinces.geojson   the US states
//   ne_110m_admin_0_countries.geojson          Canada and Mexico, behind them
//   ne_50m_admin_0_countries.geojson           western Europe (finer: the view is closer)
//
// Each outline goes through the map's own projection (src/geometry/tourmap.ts), is thinned to what a
// phone can show, and is written as SVG path data. Run it again only if the projection or its boxes change.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createServer } from 'vite';

const dir = process.argv[2];
if (!dir) {
  console.error('usage: node scripts/make-map.mjs <folder with the Natural Earth GeoJSON files>');
  process.exit(1);
}
const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
let VIEWS;
try {
  ({ VIEWS } = await vite.ssrLoadModule('/src/geometry/tourmap.ts'));
} finally {
  await vite.close();
}
const read = (name) => JSON.parse(readFileSync(join(dir, `${name}.geojson`), 'utf8')).features;

/** Every ring of a feature: polygons and multipolygons alike. */
const rings = (f) => (f.geometry.type === 'Polygon' ? f.geometry.coordinates : f.geometry.coordinates.flat());

/** Douglas-Peucker: drop points that sit within `tol` of the line through their neighbors. */
function thin(pts, tol) {
  if (pts.length < 3) return pts;
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const [ax, ay] = pts[a], [bx, by] = pts[b];
    const len = Math.hypot(bx - ax, by - ay);
    let far = -1, most = tol;
    for (let i = a + 1; i < b; i++) {
      // A closed ring starts and ends on one point: measure from that point instead of from a line.
      const d = len < 1e-9
        ? Math.hypot(pts[i][0] - ax, pts[i][1] - ay)
        : Math.abs((by - ay) * pts[i][0] - (bx - ax) * pts[i][1] + bx * ay - by * ax) / len;
      if (d > most) { most = d; far = i; }
    }
    if (far > 0) { keep[far] = 1; stack.push([a, far], [far, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}

/** The rings of these features that reach into the view, as one path. */
function path(features, view, tol) {
  const margin = 60;
  const out = [];
  for (const f of features) {
    for (const ring of rings(f)) {
      // Leave out what is nowhere near the view (Alaska, Hawaii, the far side of the world).
      const [w, s, e, n] = view.box;
      if (!ring.some(([lon, lat]) => lon > w - 8 && lon < e + 8 && lat > s - 6 && lat < n + 6)) continue;
      const pts = thin(ring.map(([lon, lat]) => view.project(lon, lat)), tol);
      if (pts.length < 4) continue;
      // Islands too small to see at this size.
      const xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]);
      if (Math.max(...xs) - Math.min(...xs) < 5 && Math.max(...ys) - Math.min(...ys) < 5) continue;
      if (!pts.some(([x, y]) => x > -margin && x < view.width + margin && y > -margin && y < view.height + margin)) continue;
      out.push(`M${pts.map(([x, y]) => `${Math.round(x * 10) / 10},${Math.round(y * 10) / 10}`).join('L')}Z`);
    }
  }
  return out.join('');
}

const states = read('ne_110m_admin_1_states_provinces');
const world = read('ne_110m_admin_0_countries');
const fine = read('ne_50m_admin_0_countries');
const named = (list, ...ids) => list.filter((f) => ids.includes(f.properties.ADM0_A3));

const america = {
  states: path(states, VIEWS.america, 0.5),
  neighbors: path(named(world, 'CAN', 'MEX'), VIEWS.america, 0.8),
};
const europe = {
  // Everything in the box: each country is a ring of its own, so the borders show.
  land: path(fine, VIEWS.europe, 1.3),
};

const banner = `/**
 * The map's outlines, as SVG path data in the drawing's units (src/geometry/tourmap.ts).
 * Written by scripts/make-map.mjs from Natural Earth (public domain, naturalearthdata.com):
 * do not edit by hand.
 */
`;
const body = `export const AMERICA_STATES =\n  '${america.states}';\nexport const AMERICA_NEIGHBORS =\n  '${america.neighbors}';\nexport const EUROPE_LAND =\n  '${europe.land}';\n`;
writeFileSync('src/data/mapOutlines.ts', banner + body);
console.log(`map: states ${america.states.length}, neighbors ${america.neighbors.length}, europe ${europe.land.length} characters`);
console.log(`     america ${VIEWS.america.width} x ${VIEWS.america.height}, europe ${VIEWS.europe.width} x ${VIEWS.europe.height}`);

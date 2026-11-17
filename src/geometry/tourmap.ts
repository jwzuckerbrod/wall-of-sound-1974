/**
 * The map of where the Wall went: two views (North America, western Europe),
 * each an Albers equal-area conic fitted to a box of longitude and latitude,
 * and the straight-line distance between two places.
 *
 * Shared by the map (src/ui/TourMap.tsx) and by scripts/make-map.mjs, which
 * bakes Natural Earth's outlines through the same projection, so the stops and
 * the coastlines agree.
 */

export type ViewId = 'america' | 'europe';

interface ViewSpec {
  /** Standard parallels and the central meridian, in degrees. */
  parallels: [number, number];
  meridian: number;
  /** The box the view is fitted to: west, south, east, north. */
  box: [number, number, number, number];
}

const SPECS: Record<ViewId, ViewSpec> = {
  // The lower 48, and far enough north for Vancouver.
  america: { parallels: [29.5, 45.5], meridian: -96, box: [-124.9, 24.4, -66.8, 50.2] },
  // London, Munich, Dijon and Paris, with the coasts that place them.
  europe: { parallels: [46, 52], meridian: 4, box: [-7, 44.6, 15, 54.6] },
};

const RAD = Math.PI / 180;
/** Every view is this wide, in the drawing's units; its height follows from the box. */
export const MAP_WIDTH = 1000;
const PAD = 14;

export interface MapView {
  id: ViewId;
  width: number;
  height: number;
  box: [number, number, number, number];
  /** Longitude and latitude to the drawing's x and y. */
  project: (lon: number, lat: number) => [number, number];
  /** Whether a place is inside the view's box. */
  holds: (lon: number, lat: number) => boolean;
}

function makeView(id: ViewId): MapView {
  const { parallels, meridian, box } = SPECS[id];
  const [p1, p2] = parallels.map((p) => p * RAD);
  const n = (Math.sin(p1) + Math.sin(p2)) / 2;
  const c = Math.cos(p1) ** 2 + 2 * n * Math.sin(p1);
  const rho = (lat: number) => Math.sqrt(c - 2 * n * Math.sin(lat * RAD)) / n;
  const rho0 = rho((box[1] + box[3]) / 2);
  const raw = (lon: number, lat: number): [number, number] => {
    const theta = n * (lon - meridian) * RAD;
    const r = rho(lat);
    return [r * Math.sin(theta), -(rho0 - r * Math.cos(theta))];
  };
  // Fit the box's outline to the width.
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  const [w, s, e, nn] = box;
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    for (const [lon, lat] of [[w + (e - w) * t, s], [w + (e - w) * t, nn], [w, s + (nn - s) * t], [e, s + (nn - s) * t]]) {
      const [x, y] = raw(lon, lat);
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    }
  }
  const k = (MAP_WIDTH - 2 * PAD) / (maxX - minX);
  return {
    id,
    width: MAP_WIDTH,
    height: Math.round((maxY - minY) * k + 2 * PAD),
    box,
    project: (lon, lat) => {
      const [x, y] = raw(lon, lat);
      return [PAD + (x - minX) * k, PAD + (y - minY) * k];
    },
    holds: (lon, lat) => lon >= w && lon <= e && lat >= s && lat <= nn,
  };
}

export const VIEWS: Record<ViewId, MapView> = { america: makeView('america'), europe: makeView('europe') };

/** Which view a place belongs on. */
export const viewOf = (lat: number, lon: number): ViewId => (VIEWS.europe.holds(lon, lat) ? 'europe' : 'america');

/** Straight-line (great-circle) miles between two places given as [latitude, longitude]. */
export function milesBetween(a: [number, number], b: [number, number]): number {
  const dLat = (b[0] - a[0]) * RAD;
  const dLon = (b[1] - a[1]) * RAD;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * RAD) * Math.cos(b[0] * RAD) * Math.sin(dLon / 2) ** 2;
  return 3958.8 * 2 * Math.asin(Math.sqrt(h));
}

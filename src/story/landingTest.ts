/**
 * The story's first screen is under test: three designs, one per visitor (Landing.tsx).
 * The dashboard (jzuckerbrod.com/stats, "Landing test") reads the events below by these ids,
 * and shows each design under its tag and name, so keep them stable while the test runs.
 *
 * A visitor keeps the design they were first shown (this browser's storage; when storage is
 * blocked, each page load draws again). `?landing=lights|photo|systems` (or A, 1, 5) forces one,
 * for previewing, and isn't remembered.
 */
export const LANDINGS = {
  lights: { tag: 'A', label: 'Lights, then the systems' },
  photo: { tag: '1', label: 'The photograph comes alive' },
  systems: { tag: '5', label: 'Six systems' },
} as const;
export type LandingId = keyof typeof LANDINGS;

const KEY = 'wos-landing';
const IDS = Object.keys(LANDINGS) as LandingId[];
const BY_TAG: Record<string, LandingId> = Object.fromEntries(IDS.map((id) => [LANDINGS[id].tag.toLowerCase(), id]));

/** Which design this visitor sees, and whether it was forced by the address (forced views aren't counted). */
export function pickLanding(search = window.location.search): { id: LandingId; forced: boolean } {
  const asked = new URLSearchParams(search).get('landing')?.toLowerCase();
  const forced = asked && (asked in LANDINGS ? (asked as LandingId) : BY_TAG[asked]);
  if (forced) return { id: forced, forced: true };
  try {
    const kept = localStorage.getItem(KEY);
    if (kept && kept in LANDINGS) return { id: kept as LandingId, forced: false };
  } catch {
    /* storage blocked: draw one for this page load */
  }
  const id = IDS[Math.floor(Math.random() * IDS.length)];
  try {
    localStorage.setItem(KEY, id);
  } catch {
    /* as above */
  }
  return { id, forced: false };
}

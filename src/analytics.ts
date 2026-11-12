/**
 * Records what people do, for the private dashboard at jzuckerbrod.com/stats.
 * The counter itself (https://jzuckerbrod.com/s.js, from the personal-website project) is loaded by
 * index.html. It keeps no cookies or IP addresses and does nothing on localhost.
 * Calls made before it loads wait in a queue that index.html sets up.
 */
type Jzt = (name: string, value?: string | number | null, props?: Record<string, unknown>) => void;

export function track(name: string, value?: string | number | null, props?: Record<string, unknown>): void {
  try {
    (window as unknown as { jzt?: Jzt }).jzt?.(name, value ?? null, props);
  } catch {
    // Never let counting break the page
  }
}

/** Says which step of the visit is on screen (a story step, or exploring), so time is counted against it. */
export function setStep(id: string, label: string): void {
  track('@step', id, { label });
}

/** Page addresses can carry a tag saying where the link was shared (?ref=reddit, ?utm_source=linkedin). */
export function isTagOnly(search: string): boolean {
  const q = new URLSearchParams(search);
  // ?landing= picks the story's first screen (story/landingTest.ts), so it keeps the story too.
  for (const k of q.keys()) if (k !== 'ref' && k !== 'src' && k !== 'landing' && !k.startsWith('utm_')) return false;
  return true;
}


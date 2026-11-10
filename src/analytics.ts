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

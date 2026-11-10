/**
 * Render quality tiers. The brief asks for 60 fps on a recent MacBook Air and
 * graceful degradation on phones, so the tier is picked from what the device
 * looks like, then the visitor can override it.
 */
import { wall } from './data/wall.config';

export type Tier = keyof typeof wall.render.tiers;
export const TIERS = Object.keys(wall.render.tiers) as Tier[];
export const tierSettings = (t: Tier) => wall.render.tiers[t];

export const TIER_LABEL: Record<Tier, string> = {
  high: 'High — soft shadows, bloom',
  medium: 'Medium — bloom only',
  low: 'Low — no post-processing',
};

/**
 * Guessing hardware from a browser is inexact, so this is deliberately blunt:
 * coarse pointer or a narrow screen means a phone, few cores means a weak GPU.
 * The real defense is the manual override and the adaptive downgrade below.
 */
export function detectTier(): Tier {
  if (typeof window === 'undefined') return 'medium';

  const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  const narrow = Math.min(window.innerWidth, window.innerHeight) < 600;
  const cores = navigator.hardwareConcurrency ?? 4;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

  if (coarse && narrow) return 'low';
  if (cores <= 4 || memory <= 4 || reducedMotion) return 'medium';
  if (coarse) return 'medium';
  return 'high';
}

/** The tier below this one, or null at the bottom. */
export function downgrade(t: Tier): Tier | null {
  const i = TIERS.indexOf(t);
  return i < TIERS.length - 1 ? TIERS[i + 1] : null;
}

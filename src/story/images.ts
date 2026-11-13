/**
 * Every image the story shows, with what it is and whose it is. A photograph
 * is never shown without its credit; a render is always labeled as one, so
 * nobody mistakes the reconstruction for the record.
 *
 * Files live in public/story/, written by scripts/story-images.sh.
 */

import { useEffect, useState } from 'react';

export interface StoryImage {
  id: string;
  kind: 'render' | 'photograph';
  alt: string;
  /** Shown under the image. */
  caption: string;
  credit: string;
  /** The credit where a phone's caption has two lines; the full one stays in Credits. */
  creditShort?: string;
  creditUrl?: string;
  /** Renders come in two widths; photographs at their own size. */
  widths?: [number, number];
  /** Where to keep the subject when a phone crops the frame (object-position). */
  focus?: string;
  /** Something drawn over the still. */
  overlay?: 'needles';
}

const RENDER_CREDIT = 'Rendered in Blender Cycles.';

export const IMAGES = {
  photoBowl: {
    id: 'photo-bowl-1974-07-21',
    kind: 'photograph',
    alt: 'The Wall of Sound in daylight in front of the white shell of the Hollywood Bowl, with the crowd in the foreground.',
    caption: 'The Hollywood Bowl, July 21, 1974.',
    credit: 'Photographer unknown. If this is your photograph, please get in touch so we can credit you properly.',
    creditShort: 'Photographer unknown. Yours? Tell us.',
    creditUrl: 'https://github.com/jwzuckerbrod/wall-of-sound-1974/issues',
    focus: '50% 45%',
  },
  /**
   * The reconstruction through the photographer's own camera, solved from the
   * photograph (docs/qa-findings.md §19): same seat, same lens, same frame, so
   * the two crossfade in register.
   */
  bowlPhotoMatch: {
    id: 'bowl-photo',
    kind: 'render',
    alt: 'The reconstructed Wall of Sound at the Hollywood Bowl, from the same seat and with the same framing as the photograph before it.',
    caption: 'The reconstruction, from the same seat.',
    credit: RENDER_CREDIT,
    widths: [1020, 2040],
    focus: '50% 45%',
  },
  bowl: {
    id: 'bowl',
    kind: 'render',
    alt: 'The reconstructed Wall of Sound at the Hollywood Bowl, seen straight on from the seats.',
    caption: 'The reconstruction, from the seats.',
    credit: RENDER_CREDIT,
    widths: [960, 1920],
    focus: '50% 50%',
  },
  /** The same frame as `bowl`, every cabinet in its system's color (the explorer's channel colors). */
  bowlSystems: {
    id: 'bowl-systems',
    kind: 'render',
    alt: 'The same view of the reconstructed Wall with each speaker block colored by the system it belonged to: vocals gold in the center, Garcia red, Weir purple, piano teal, drums blue, and four shades of green for the bass.',
    caption: 'The same view, each speaker colored by its system.',
    credit: RENDER_CREDIT,
    widths: [960, 1920],
    focus: '50% 50%',
  },
  bowlHero: {
    id: 'bowl-hero',
    kind: 'render',
    alt: 'The Hollywood Bowl from high in the seats: the shell, the Wall inside it, the crowd filling the bowl, the wooded hills behind.',
    caption: 'The Hollywood Bowl, from high in the seats.',
    credit: RENDER_CREDIT,
    widths: [960, 1920],
    focus: '45% 55%',
  },
  /** Beat 4. The renders show the stage without the band, so the guitar stands at his mark. */
  garciaMark: {
    id: 'garcia-mark',
    kind: 'render',
    alt: 'A guitar on a stand at Jerry Garcia\'s mark on the empty stage, with the speaker columns rising behind it through the scaffold.',
    caption: 'Garcia\'s mark, and the columns behind it. No band in the render, so the guitar is on a stand.',
    credit: RENDER_CREDIT,
    widths: [960, 1920],
    focus: '35% 60%',
  },
  clusterUp: {
    id: 'cluster-up',
    kind: 'render',
    alt: 'The curved center cluster of vocal speakers seen from below, hanging over the stage.',
    caption: 'The vocal cluster, from below.',
    credit: RENDER_CREDIT,
    widths: [960, 1920],
    focus: '50% 40%',
  },
  /** Beat 6, with the needles drawn over it (Needles.tsx). */
  ampsClose: {
    id: 'amps-close',
    kind: 'render',
    alt: 'A road case of McIntosh MC 2300 amplifiers seen close up, their gold panels and blue meters lit, the needles moving.',
    caption: 'MC 2300s in their rack. The needles\' movement is illustrative.',
    credit: RENDER_CREDIT,
    widths: [960, 1920],
    focus: '50% 50%',
    overlay: 'needles',
  },
  /** The title's backdrop: the cluster's cones through a long lens. */
  title: {
    id: 'title',
    kind: 'render',
    alt: '',
    caption: 'The vocal cluster, from the seats. A reconstruction.',
    credit: RENDER_CREDIT,
    widths: [960, 1920],
    focus: '50% 60%',
  },
  /** The same frame as `bowl`, the Wall's parts colored by how sure we are of them (PROVENANCE). */
  bowlEvidence: {
    id: 'bowl-evidence',
    kind: 'render',
    alt: 'The same view of the reconstructed Wall colored by evidence: the scaffold green for confirmed, the speakers and stage amber for estimated, and one column of speakers red for guessed.',
    caption: 'The same view, colored by how sure we are.',
    credit: RENDER_CREDIT,
    widths: [960, 1920],
    focus: '50% 50%',
  },
} satisfies Record<string, StoryImage>;

export type ImageKey = keyof typeof IMAGES;

export const BASE = `${import.meta.env.BASE_URL}story/`;

export function srcOf(img: StoryImage): { src: string; srcSet?: string } {
  if (!img.widths) return { src: `${BASE}${img.id}.jpg` };
  const [small, large] = img.widths;
  return {
    src: `${BASE}${img.id}-${large}.jpg`,
    srcSet: `${BASE}${img.id}-${small}.jpg ${small}w, ${BASE}${img.id}-${large}.jpg ${large}w`,
  };
}

/** Only the smaller file: what a picture shows while the model is still downloading. */
export function smallSrcOf(img: StoryImage): { src: string } {
  return { src: img.widths ? `${BASE}${img.id}-${img.widths[0]}.jpg` : `${BASE}${img.id}.jpg` };
}

// ── the model on screen ──────────────────────────────────────────────────────────────────
// The first screen's pictures share a phone's connection with the model's code and files. Until
// the model has drawn, the story asks only for what's on screen, in the smaller size; then the rest.

let modelReady = false;
const waiting = new Set<() => void>();
/** Called once the model has drawn (App.tsx, BootDone). */
export function markModelReady() {
  if (modelReady) return;
  modelReady = true;
  waiting.forEach((f) => f());
  waiting.clear();
}
/** True once the model has drawn. */
export function useModelReady(): boolean {
  const [ready, setReady] = useState(modelReady);
  useEffect(() => {
    if (ready) return;
    const on = () => setReady(true);
    waiting.add(on);
    return () => void waiting.delete(on);
  }, [ready]);
  return ready;
}

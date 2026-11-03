/**
 * Every image the story shows, with what it is and whose it is. A photograph
 * is never shown without its credit; a render is always labelled as one, so
 * nobody mistakes the reconstruction for the record.
 *
 * Files live in public/story/, written by scripts/story-images.sh.
 */

export interface StoryImage {
  id: string;
  kind: 'render' | 'photograph';
  alt: string;
  /** Shown under the image. */
  caption: string;
  credit: string;
  creditUrl?: string;
  /** Renders come in two widths; photographs at their own size. */
  widths?: [number, number];
  /** Where to keep the subject when a phone crops the frame (object-position). */
  focus?: string;
}

const RENDER_CREDIT = 'Reconstruction, rendered in Blender Cycles';

export const IMAGES = {
  photoBowl: {
    id: 'photo-bowl-1974-07-21',
    kind: 'photograph',
    alt: 'The Wall of Sound in daylight in front of the white shell of the Hollywood Bowl, with the crowd in the foreground.',
    caption: 'The Hollywood Bowl, 21 July 1974.',
    credit: 'Photographer unknown. If this is your photograph, please get in touch so we can credit you properly.',
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
  /** The same frame as `bowl`, every cabinet in its system's colour (the explorer's channel colours). */
  bowlSystems: {
    id: 'bowl-systems',
    kind: 'render',
    alt: 'The same view of the reconstructed Wall with each speaker block coloured by the system it belonged to: vocals gold in the centre, Garcia red, Weir purple, piano teal, drums blue, and four shades of green for the bass.',
    caption: 'The same view, each speaker coloured by its system.',
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
  garcia: {
    id: 'garcia',
    kind: 'render',
    alt: 'Looking up from the stage at the speaker columns behind Jerry Garcia\'s position, under the scaffold and the tie-dyes.',
    caption: 'From the stage, looking up at the guitar columns.',
    credit: RENDER_CREDIT,
    widths: [960, 1920],
    focus: '55% 50%',
  },
  clusterUp: {
    id: 'cluster-up',
    kind: 'render',
    alt: 'The curved centre cluster of vocal speakers seen from below, hanging over the stage.',
    caption: 'The vocal cluster, from below.',
    credit: RENDER_CREDIT,
    widths: [960, 1920],
    focus: '50% 40%',
  },
  amps: {
    id: 'amps',
    kind: 'render',
    alt: 'Racks of McIntosh MC 2300 amplifiers under the stage cluster, their blue meters lit.',
    caption: 'The McIntosh racks.',
    credit: RENDER_CREDIT,
    widths: [960, 1920],
    focus: '50% 50%',
  },
  bowlTower: {
    id: 'bowl-tower',
    kind: 'render',
    alt: 'From the top of the Wall, looking out over the crowd filling the Hollywood Bowl.',
    caption: 'From the top of the tower, out over the Bowl.',
    credit: RENDER_CREDIT,
    widths: [960, 1920],
    focus: '50% 50%',
  },
} satisfies Record<string, StoryImage>;

export type ImageKey = keyof typeof IMAGES;

const BASE = `${import.meta.env.BASE_URL}story/`;

export function srcOf(img: StoryImage): { src: string; srcSet?: string } {
  if (!img.widths) return { src: `${BASE}${img.id}.jpg` };
  const [small, large] = img.widths;
  return {
    src: `${BASE}${img.id}-${large}.jpg`,
    srcSet: `${BASE}${img.id}-${small}.jpg ${small}w, ${BASE}${img.id}-${large}.jpg ${large}w`,
  };
}

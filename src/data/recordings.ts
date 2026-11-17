/**
 * The one recording the site still streams from the Internet Archive: Rob
 * Bertrando's audience tape of the Hollywood Bowl, July 21, 1974, played by the
 * first screen's sound button (src/story/Landing.tsx). Everything else plays
 * from a licensed service (src/data/shows.ts). The show was never released, so
 * this tape is the only record of what the crowd heard that afternoon.
 */

export type TapeId = 'bowl1974';

export interface Tape {
  id: TapeId;
  /** archive.org item. */
  identifier: string;
  date: string;
  venue: string;
  taper: string;
  transfer: string;
  /** Microphones and recorder, from the item's own lineage. */
  rig: string;
  /** Where the taper stood, as the item says. */
  position: string;
  /** What the band played through. */
  pa: string;
}

export const TAPES: Record<TapeId, Tape> = {
  bowl1974: {
    id: 'bowl1974',
    identifier: 'gd1974-07-21.ecm22p.bertrando.89033.flac24',
    date: 'July 21, 1974',
    venue: 'Hollywood Bowl',
    taper: 'Rob Bertrando',
    transfer: 'Adam Egert',
    rig: 'Two Sony ECM-22P microphones into a Sony TC-152SD cassette deck',
    position: 'In front of the mixing desk',
    pa: 'The Wall of Sound',
  },
};

export interface Track {
  tape: TapeId;
  /** The mp3 in the archive.org item. */
  file: string;
  title: string;
}

export const trackUrl = (t: Track) => `https://archive.org/download/${TAPES[t.tape].identifier}/${t.file}`;
export const tapeUrl = (id: TapeId) => `https://archive.org/details/${TAPES[id].identifier}`;

/** The Wall on its own, from the crowd at the Bowl. */
export const WALL_TRACKS: Track[] = [
  { tape: 'bowl1974', file: 'gd1974-07-21.motb.0056.s1t09.mp3', title: 'Scarlet Begonias' },
  { tape: 'bowl1974', file: 'gd1974-07-21.motb.0056.sEt01.mp3', title: 'U.S. Blues (the encore)' },
];

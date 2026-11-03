/**
 * The recordings the site plays: audience tapes of the Grateful Dead from the
 * Internet Archive's Grateful Dead collection, streamed from archive.org (never
 * copied here). Audience tapes, not soundboards: a soundboard tape is the mixing
 * desk's feed and never passed through the PA; an audience tape is the PA as the
 * crowd heard it.
 *
 * The comparison holds the recording steady: both tapes are Rob Bertrando's,
 * made with the same model of microphone (Sony ECM-22P) at shows in Hollywood.
 * What it can't hold steady is said in COMPARISON_CAVEATS and on the page.
 */

export type TapeId = 'bowl1974' | 'palladium1971';

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
    date: '21 July 1974',
    venue: 'Hollywood Bowl',
    taper: 'Rob Bertrando',
    transfer: 'Adam Egert',
    rig: 'Two Sony ECM-22P microphones into a Sony TC-152SD cassette deck',
    position: 'In front of the mixing desk',
    pa: 'The Wall of Sound',
  },
  palladium1971: {
    id: 'palladium1971',
    identifier: 'gd71-08-06.aud.bertrando.yerys.129.sbeok.shnf',
    date: '6 August 1971',
    venue: 'Hollywood Palladium',
    taper: 'Rob Bertrando',
    transfer: 'Ben Kasper',
    rig: 'Sony ECM-22P microphones into a Sony 770 reel-to-reel at 7½ inches a second',
    position: '40 to 50 feet back, dead centre',
    pa: 'A conventional PA, three years before the Wall',
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

/** The same song before and after: the 1971 tape first, then the Wall. */
export const PAIRS: { title: string; before: Track; after: Track }[] = [
  {
    title: 'Sugar Magnolia',
    before: { tape: 'palladium1971', file: 'gd08-06-71d2t05.mp3', title: 'Sugar Magnolia' },
    after: { tape: 'bowl1974', file: 'gd1974-07-21.motb.0056.s3t11.mp3', title: 'Sugar Magnolia' },
  },
  {
    title: 'Me and My Uncle',
    before: { tape: 'palladium1971', file: 'gd08-06-71d2t02.mp3', title: 'Me and My Uncle' },
    after: { tape: 'bowl1974', file: 'gd1974-07-21.motb.0056.s1t03.mp3', title: 'Me and My Uncle' },
  },
];

/** What the pair can't hold steady. Shown with the comparison. */
export const COMPARISON_CAVEATS = [
  'A hall indoors in 1971; an open-air bowl in 1974.',
  'The 1971 tape was made on reel-to-reel, the better recorder; 1974 on cassette. Any edge the Wall has, it has in spite of the tape.',
  'Three years of the band: different performances, and different nights.',
];

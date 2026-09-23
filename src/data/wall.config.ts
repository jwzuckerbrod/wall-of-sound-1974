/**
 * Wall of Sound (Grateful Dead, 1974) — single source of truth.
 *
 * Every dimension, count, position and material value used by the reconstruction
 * lives here. Geometry code reads this file and nothing else. Correcting the
 * history should never mean editing geometry.
 *
 * Units: metres, radians, seconds. Colours: sRGB hex.
 * Frame: right-handed, +Y up, +Z toward the audience, +X to the audience's right.
 *        Origin at the centre of the stage deck surface, on the wall's front-face plane.
 *
 * Provenance for every value is in PROVENANCE, keyed by dotted path.
 * See docs/reconstruction-spec.md for the reasoning behind each choice.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Units
// ─────────────────────────────────────────────────────────────────────────────

/** inches → metres */
export const IN = (n: number) => n * 0.0254;
/** feet → metres */
export const FT = (n: number) => n * 0.3048;
/** degrees → radians */
export const DEG = (n: number) => (n * Math.PI) / 180;

// ─────────────────────────────────────────────────────────────────────────────
// Provenance
// ─────────────────────────────────────────────────────────────────────────────

export type Confidence = 'confirmed' | 'estimated' | 'guessed';

export type SourceId =
  | 'wiki'
  | 'mcintosh'
  | 'deadsources74'
  | 'deadsources22'
  | 'mixtest'
  | 'mixrebuild'
  | 'owsinski'
  | 'mayberry'
  | 'relix'
  | 'upa'
  | 'mc2300'
  | 'syf'
  | 'photos'
  | 'anderson'
  | 'derived';

export interface SourceRef {
  title: string;
  url?: string;
  kind: 'encyclopedia' | 'manufacturer' | 'primary' | 'trade' | 'blog' | 'photographic' | 'derivation';
}

export const SOURCES: Record<SourceId, SourceRef> = {
  wiki: {
    title: 'Wikipedia — Wall of Sound (Grateful Dead)',
    url: 'https://en.wikipedia.org/wiki/Wall_of_Sound_(Grateful_Dead)',
    kind: 'encyclopedia',
  },
  mcintosh: {
    title: "McIntosh Laboratory — McIntosh and the Grateful Dead's Wall of Sound",
    url: 'https://www.mcintoshlabs.com/about/news/mcintosh-and-the-grateful-deads-wall-of-sound',
    kind: 'manufacturer',
  },
  deadsources74: {
    title: 'Grateful Dead Sources — 1974: Wall of Sound Technical Specs (the 1974 press spec sheet)',
    url: 'http://deadsources.blogspot.com/2012/12/1974-wall-of-sound-technical-specs.html',
    kind: 'primary',
  },
  deadsources22: {
    title: 'Grateful Dead Sources — September 1974: The Wall of Sound',
    url: 'https://deadsources.blogspot.com/2022/02/september-1974-wall-of-sound.html',
    kind: 'primary',
  },
  mixtest: {
    title: "Mix — Testing the Grateful Dead's Wall of Sound",
    url: 'https://www.mixonline.com/live-sound/grateful-dead-wall-of-sound-test',
    kind: 'trade',
  },
  mixrebuild: {
    title: "Mix — Bringing the Grateful Dead's Wall of Sound Back to Life",
    url: 'https://www.mixonline.com/live-sound/live-gear/bringing-the-grateful-deads-wall-of-sound-back-to-life',
    kind: 'trade',
  },
  owsinski: {
    title: "Bobby Owsinski — There's Never Been Anything Like It",
    url: 'https://bobbyowsinskiblog.com/grateful-dead-wall-of-sound/',
    kind: 'blog',
  },
  mayberry: {
    title: "John Mayberry — The Grateful Dead's Wall of Sound vs. the Line Array",
    url: 'https://www.linkedin.com/pulse/grateful-deads-wall-sound-vs-line-array-john-mayberry',
    kind: 'blog',
  },
  relix: {
    title: "Relix — Loud and Clear: A New Look at the Grateful Dead's Epic Wall of Sound",
    url: 'https://relix.com/features/detail/loud-and-clear-a-new-look-at-the-grateful-deads-epic-wall-of-sound',
    kind: 'trade',
  },
  upa: {
    title: 'Underground PA — The Wall of Sound',
    url: 'https://undergroundpa.substack.com/p/the-wall-of-sound-1970s-sound-system',
    kind: 'blog',
  },
  mc2300: {
    title: 'Wikipedia — McIntosh MC-2300',
    url: 'https://en.wikipedia.org/wiki/McIntosh_MC-2300',
    kind: 'encyclopedia',
  },
  syf: {
    title: 'Wikipedia — Steal Your Face',
    url: 'https://en.wikipedia.org/wiki/Steal_Your_Face',
    kind: 'encyclopedia',
  },
  anderson: {
    title:
      'Brian Anderson, Loud and Clear (2025) — chapter 1, "The Artifact". Supplied by the project owner. Highest-quality dimensional source found: it separates the speaker array from the staging, gives the stage deck height, and describes a surviving cabinet measured in hand.',
    kind: 'primary',
  },
  photos: {
    title:
      'Photographic record — Richard Pechner (rpechner.com), Ken West, the 1974 galleries at vintag.es and designyoutrust.com, dead.net 1974 archive',
    kind: 'photographic',
  },
  derived: {
    title: 'Derived in docs/reconstruction-spec.md from confirmed facts',
    kind: 'derivation',
  },
};

export interface Provenance {
  confidence: Confidence;
  sources: SourceId[];
  note?: string;
}

/**
 * Keyed by dotted path into `wall`. The About page and every info panel read
 * from here, so nothing can be shown to a visitor without its confidence level.
 */
export const PROVENANCE: Record<string, Provenance> = {
  'meta.debut': { confidence: 'confirmed', sources: ['wiki', 'mcintosh', 'deadsources74'] },
  'meta.retired': { confidence: 'confirmed', sources: ['wiki', 'deadsources22'] },
  'meta.prototypeTest': {
    confidence: 'confirmed',
    sources: ['wiki'],
    note: 'Framework prototype, Maples Pavilion, Stanford. The tweeters failed during the first number.',
  },
  'meta.showCount': { confidence: 'confirmed', sources: ['upa'] },
  'meta.designers': { confidence: 'confirmed', sources: ['wiki', 'deadsources22'] },

  'system.amplifierCount': {
    confidence: 'confirmed',
    sources: ['wiki', 'mcintosh', 'mayberry', 'owsinski'],
    note: 'The brief\'s "48–55" range is not supported; 48 is the figure in every source found.',
  },
  'system.wattsInstalled': {
    confidence: 'confirmed',
    sources: ['mcintosh', 'mayberry'],
    note: '48 × 600 W monoblock = 28,800 W.',
  },
  'system.wattsQuoted1974': {
    confidence: 'confirmed',
    sources: ['deadsources74', 'wiki'],
    note: 'The 1974 press figure. 26,400 = 44 × 600, i.e. four fewer amplifiers driven than installed. Unexplained in the sources; both figures are shown to visitors.',
  },
  'system.weightTonsComplete': { confidence: 'confirmed', sources: ['wiki', 'mcintosh', 'deadsources22'] },
  'system.weightTonsAudioOnly': { confidence: 'confirmed', sources: ['deadsources22'] },
  'system.crew': {
    confidence: 'confirmed',
    sources: ['wiki', 'mcintosh'],
    note: 'Some accounts give ~30 for the full road crew; 21 is the figure for load-in and load-out.',
  },
  'system.stagingSets': {
    confidence: 'confirmed',
    sources: ['anderson', 'wiki'],
    note: 'RESOLVED by Anderson: there was ONE sound system and TWO identical scaffolding sets, so that Crew B had the frame standing before Crew A arrived with the PA. That settles the McNally (two) / Stanley (three) disagreement in McNally\'s favour, and explains it — Stanley may have been counting crews, or the band paying rent at two venues at once.',
  },
  'system.transportLabourUsdPerMonth': { confidence: 'confirmed', sources: ['anderson'] },
  'system.onstageSplDb': {
    confidence: 'confirmed',
    sources: ['anderson'],
    note: 'CONTRADICTS Mix, which reports onstage levels lower than in the hall and normal conversation being possible. Anderson: meters regularly hit 120 dB onstage, and everyone involved suffered hearing damage. Both are shown; they may describe different moments in a show.',
  },
  'system.buildCostUsd1974': { confidence: 'confirmed', sources: ['upa', 'mixtest'] },
  'system.insuredValueUsd1974': { confidence: 'confirmed', sources: ['deadsources22'] },
  'system.setupHours': { confidence: 'confirmed', sources: ['deadsources22'] },
  'system.usableThrowMetres': { confidence: 'confirmed', sources: ['wiki'] },

  'inventory': {
    confidence: 'confirmed',
    sources: ['deadsources22'],
    note: 'Itemised 89/178/320/54. Sums to 587 JBL, one more than the commonly published 586. Unresolved in the sources; the model carries 587 and says so.',
  },

  'dimensions.arrayWidth': {
    confidence: 'confirmed',
    sources: ['anderson'],
    note: 'RESOLVES the width problem. Anderson separates two things the other sources conflate: the speaker array proper was SIXTY FEET end to end, while the full staging and scaffolding measured 76 × 30 ft indoors and over 100 × 40 ft outdoors. Every "roughly 98 feet across" / "nearly 100 feet wide" figure elsewhere is the outdoor STAGING, not the wall of speakers. The layout was rebuilt to 18.2 m.',
  },
  'dimensions.arrayHeight': {
    confidence: 'estimated',
    sources: ['anderson', 'relix', 'derived'],
    note: '"Over three stories tall" / "36 feet high" is read as the total above ground. With a confirmed 10-foot deck under it, the speaker envelope is ~26 ft (8.0 m) above the deck.',
  },
  'dimensions.stageDeckHeight': {
    confidence: 'confirmed',
    sources: ['anderson'],
    note: 'One-inch plywood floor set TEN FEET above ground, bolted and tied into the scaffolding — because sound pressure could bounce the whole system by as much as a foot when the band pushed it. Previously guessed at 5 ft; corrected.',
  },
  'dimensions.stagingIndoor': { confidence: 'confirmed', sources: ['anderson'], note: '76 ft wide × 30 ft deep.' },
  'dimensions.stagingOutdoor': { confidence: 'confirmed', sources: ['anderson'], note: 'Over 100 ft wide × 40 ft deep.' },
  'dimensions.bandLineZ': {
    confidence: 'estimated',
    sources: ['photos', 'derived'],
    note: 'Consistent with the 60 mm differential mic pair working with the Wall roughly 3 m behind the singer.',
  },

  'cabinets.ratioRule': {
    confidence: 'confirmed',
    sources: ['mayberry'],
    note: 'Owsley specified cabinet proportions using the cube root of 2 (1.259921) as the depth : width : height multiplier.',
  },
  'cabinets.absoluteSizes': {
    confidence: 'estimated',
    sources: ['anderson', 'derived', 'photos'],
    note: 'The 2^(1/3) ratio is documented; absolute sizes are not, EXCEPT for one surviving cabinet Anderson bought at Sotheby\'s and measured: 31 × 22.5 × 24 in, 64 lb, holding two 12-inch JBLs and two small drivers — a vocal fill, stamped JUL 17 1974 with "G. DEAD" written on the cone. That is the only hard cabinet measurement in the whole record and it anchors cab12x2.',
  },
  'cabinets.construction': {
    confidence: 'confirmed',
    sources: ['anderson', 'mixrebuild'],
    note: '14-ply laminated Finnish birch. Anderson\'s surviving cabinet is painted MATTE BLACK all over, not left natural — so the model finishes some cabinets black and leaves the plywood showing on others, which is what the photographs show across the wall.',
  },

  'drivers.models': {
    confidence: 'estimated',
    sources: ['derived'],
    note: 'No source names JBL model numbers. These are the period-correct candidates and affect only cone and dust-cap proportions.',
  },

  'channels.count': { confidence: 'confirmed', sources: ['wiki', 'mcintosh', 'mayberry'], note: 'Six independent systems on eleven channels.' },
  'channels.bassQuad': {
    confidence: 'estimated',
    sources: ['wiki', 'mcintosh', 'deadsources74'],
    note: 'CONTESTED. Wikipedia and McIntosh say each of the four strings had its own channel. The 1974 spec sheet describes three pickups, a quad encoder and a decoder offering sixteen selectable quad arrangements. Four independent bass channels are certain; per-string assignment is one plausible reading.',
  },
  'channels.vocalMics': {
    confidence: 'confirmed',
    sources: ['wiki', 'deadsources74', 'owsinski'],
    note: 'Matched Brüel & Kjær pairs, capsules 60 mm apart, wired in reverse polarity, summed differentially.',
  },

  'arrays.kickCount': { confidence: 'confirmed', sources: ['deadsources74'], note: 'Sixteen 15-inch speakers in a column.' },
  'arrays.guitarCount': {
    confidence: 'confirmed',
    sources: ['deadsources74'],
    note: 'Columns of twenty 12-inch speakers each. Mix\'s "30 cabinets combined" for both guitars conflicts and is not used.',
  },
  'arrays.garciaExtensionPlacement': { confidence: 'confirmed', sources: ['deadsources74'], note: 'Beside Godchaux and behind Kreutzmann.' },
  'arrays.bassCount': { confidence: 'estimated', sources: ['mixtest'], note: 'Mix: "Lesh had sixteen a side." The 1974 spec sheet gives no bass count.' },
  'arrays.vocalCluster': {
    confidence: 'estimated',
    sources: ['deadsources74', 'photos'],
    note: 'The curve and the cylindrical-dispersion intent are confirmed; the column and row counts are the reconstruction\'s allocation, chosen to sum to the published inventory.',
  },
  'arrays.positions': {
    confidence: 'estimated',
    sources: ['photos', 'anderson', 'derived'],
    note: 'LARGEST INVENTION IN THE MODEL. No plan drawing of the Wall has been found. The left-to-right order is consistent with photographs but is not documented, and it varied between venues. The overall 60 ft envelope the blocks pack into IS documented.',
  },
  'arrays.verticalSplit': {
    confidence: 'confirmed',
    sources: ['anderson'],
    note: 'The lower half of each array fed the musicians onstage; the upper half threw to the crowd. The PA was the monitoring — there were no wedges. Drives the "how it worked" overlay.',
  },

  'structure.scaffold': { confidence: 'estimated', sources: ['photos', 'derived'], note: 'Standard period tube-and-clamp frames.' },
  'structure.cabling': {
    confidence: 'confirmed',
    sources: ['anderson'],
    note: 'Arm-thick military-surplus cable, originally made for connecting docked ships to shore power. Nothing lighter could carry the current. Modelled at 50 mm — these runs are a visual feature, not a detail.',
  },

  'materials.exposedDrivers': {
    confidence: 'confirmed',
    sources: ['photos'],
    note: 'The drivers were NOT behind grille cloth. Cones, surrounds, aluminium dust caps and mounting screws are all visible in every photograph.',
  },
  'materials.plywood': {
    confidence: 'confirmed',
    sources: ['anderson', 'mixrebuild', 'photos'],
    note: '14-ply laminated Finnish birch, Hard Truckers style. Finish varied: Anderson\'s surviving cabinet is matte black throughout; photographs show other cabinets with bare plywood frames around black baffles. Both are modelled, mixed across the wall.',
  },
  'materials.tieDye': { confidence: 'confirmed', sources: ['deadsources22'], note: 'Courtenay Pollock tie-dyed the fabric panels — on the structure, not over the drivers.' },
  'materials.mcIntoshMeters': { confidence: 'confirmed', sources: ['mcintosh', 'mc2300'], note: 'Blue illuminated meters, black glass panel, 128 lb per amplifier.' },

  'band.positions': {
    confidence: 'estimated',
    sources: ['photos', 'derived'],
    note: 'Which side Garcia stood on in 1974 is not settled by any source found, and it varied. Flip with stage.mirrored.',
  },
  'band.gear': { confidence: 'estimated', sources: ['derived'], note: 'Garcia "Wolf" (Doug Irwin); Weir Gibson ES-335; Lesh Alembic quad bass ("Mission Control", serial 74 00008, from 16 June 1974); Godchaux grand with five Countryman pickups.' },
  'band.logo': {
    confidence: 'confirmed',
    sources: ['syf'],
    note: 'The Steal Your Face skull and 13-point bolt was created by Owsley Stanley and Bob Thomas in 1969 as stencil art to mark the band\'s touring equipment. Used here only as case stencilling — its original and correct application.',
  },
};

export const provenanceOf = (path: string): Provenance =>
  PROVENANCE[path] ?? { confidence: 'guessed', sources: ['derived'], note: 'No provenance recorded.' };

// ─────────────────────────────────────────────────────────────────────────────
// Channels — six independent systems, eleven channels
// ─────────────────────────────────────────────────────────────────────────────

export type ChannelId =
  | 'vocals'
  | 'leadGuitar'
  | 'rhythmGuitar'
  | 'piano'
  | 'kick'
  | 'drumsL'
  | 'drumsR'
  | 'bass1'
  | 'bass2'
  | 'bass3'
  | 'bass4';

export interface Channel {
  id: ChannelId;
  /** Grouping used by the exploded view and the subsystem info panels. */
  system: 'vocals' | 'leadGuitar' | 'rhythmGuitar' | 'piano' | 'drums' | 'bass';
  label: string;
  /** Overlay colour for the channel view. */
  color: string;
  player?: string;
  /** Shown verbatim in the info panel. Also serves as the text alternative. */
  blurb: string;
}

export const CHANNELS: Record<ChannelId, Channel> = {
  vocals: {
    id: 'vocals',
    system: 'vocals',
    label: 'Vocals',
    color: '#F4C95D',
    blurb:
      'The largest subsystem — 372 of the 641 drivers. Four-way crossover: horns, 5-inch, 12-inch and 15-inch. Singers stood directly in front of it without feedback because each vocal microphone was a matched Brüel & Kjær pair, capsules 60 mm apart and wired in reverse polarity: the voice reached the near capsule first and survived, everything arriving equally at both — including 26 kilowatts of Wall three metres behind — cancelled.',
  },
  leadGuitar: {
    id: 'leadGuitar',
    system: 'leadGuitar',
    label: 'Lead guitar',
    color: '#E8543F',
    player: 'Jerry Garcia',
    blurb:
      'A column of twenty 12-inch JBLs, run full-range with no crossover. Some of the column was split off as extension cabinets placed beside the piano and behind the drums.',
  },
  rhythmGuitar: {
    id: 'rhythmGuitar',
    system: 'rhythmGuitar',
    label: 'Rhythm guitar',
    color: '#9B5DE5',
    player: 'Bob Weir',
    blurb: 'A column of twenty 12-inch JBLs, run full-range with no crossover.',
  },
  piano: {
    id: 'piano',
    system: 'piano',
    label: 'Piano',
    color: '#2EC4B6',
    player: 'Keith Godchaux',
    blurb:
      'Five Countryman pickups, one per division of the piano frame, each with its own volume control, into a three-way crossover: highs and mids through a cluster of 5-inch and 12-inch drivers, lows through a column of 15-inch.',
  },
  kick: {
    id: 'kick',
    system: 'drums',
    label: 'Bass drum',
    color: '#6B7A8F',
    player: 'Bill Kreutzmann',
    blurb: 'One channel, sixteen 15-inch speakers in a single column. Nothing else went through them.',
  },
  drumsL: {
    id: 'drumsL',
    system: 'drums',
    label: 'Drums & cymbals — left',
    color: '#4D8BE8',
    player: 'Bill Kreutzmann',
    blurb: 'Snare, toms and cymbals in stereo, three-way: horns, 5-inch and 12-inch, in identical columns left and right.',
  },
  drumsR: {
    id: 'drumsR',
    system: 'drums',
    label: 'Drums & cymbals — right',
    color: '#7FB3F5',
    player: 'Bill Kreutzmann',
    blurb: 'Snare, toms and cymbals in stereo, three-way: horns, 5-inch and 12-inch, in identical columns left and right.',
  },
  bass1: { id: 'bass1', system: 'bass', label: 'Bass — E string', color: '#14612C', player: 'Phil Lesh', blurb: 'One quarter of a quadraphonic bass rig: eight 15-inch JBLs of its own.' },
  bass2: { id: 'bass2', system: 'bass', label: 'Bass — A string', color: '#2FA14C', player: 'Phil Lesh', blurb: 'One quarter of a quadraphonic bass rig: eight 15-inch JBLs of its own.' },
  bass3: { id: 'bass3', system: 'bass', label: 'Bass — D string', color: '#63C97C', player: 'Phil Lesh', blurb: 'One quarter of a quadraphonic bass rig: eight 15-inch JBLs of its own.' },
  bass4: { id: 'bass4', system: 'bass', label: 'Bass — G string', color: '#9BE0AC', player: 'Phil Lesh', blurb: 'One quarter of a quadraphonic bass rig: eight 15-inch JBLs of its own.' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Drivers
// ─────────────────────────────────────────────────────────────────────────────

export type DriverId = 'jbl15' | 'jbl12' | 'jbl5' | 'evHorn';

export interface Driver {
  id: DriverId;
  label: string;
  /** Period-correct candidate. Not documented — see PROVENANCE['drivers.models']. */
  modelGuess: string;
  /** Nominal diameter, inches. */
  nominalIn: number;
  /** Outer frame diameter. */
  frameDia: number;
  /** Visible cone mouth diameter. */
  coneDia: number;
  /** Cone depth from baffle plane to apex. */
  coneDepth: number;
  /** Aluminium dust cap — the specular highlight that makes the Wall read at distance. */
  dustCapDia: number;
  dustCapRise: number;
  /** Rubber/cloth surround annulus width. */
  surroundWidth: number;
  /** Bolt circle count for the visible mounting screws. */
  boltCount: number;
}

export const DRIVERS: Record<DriverId, Driver> = {
  jbl15: {
    id: 'jbl15', label: '15-inch woofer', modelGuess: 'JBL K140 / D140',
    nominalIn: 15, frameDia: IN(15.5), coneDia: IN(12.8), coneDepth: IN(3.2),
    dustCapDia: IN(4.0), dustCapRise: IN(0.9), surroundWidth: IN(0.8), boltCount: 8,
  },
  jbl12: {
    id: 'jbl12', label: '12-inch cone driver', modelGuess: 'JBL K120 / D120',
    nominalIn: 12, frameDia: IN(12.4), coneDia: IN(10.2), coneDepth: IN(2.6),
    dustCapDia: IN(3.2), dustCapRise: IN(0.7), surroundWidth: IN(0.7), boltCount: 8,
  },
  jbl5: {
    id: 'jbl5', label: '5-inch mid driver', modelGuess: 'JBL LE5',
    nominalIn: 5, frameDia: IN(5.3), coneDia: IN(4.1), coneDepth: IN(1.1),
    dustCapDia: IN(1.3), dustCapRise: IN(0.3), surroundWidth: IN(0.35), boltCount: 4,
  },
  evHorn: {
    id: 'evHorn', label: 'Electro-Voice horn tweeter', modelGuess: 'Electro-Voice T-35',
    nominalIn: 0, frameDia: IN(4.5), coneDia: IN(3.4), coneDepth: IN(-1.6), // negative = horn flare projects forward
    dustCapDia: 0, dustCapRise: 0, surroundWidth: 0, boltCount: 4,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Cabinets
// ─────────────────────────────────────────────────────────────────────────────

/** Owsley's documented proportion rule: depth : width : height = 1 : 2^(1/3) : 2^(2/3). */
export const CUBE_ROOT_2 = Math.cbrt(2); // 1.259921...

/**
 * When true, cabinet width and height are generated from depth via CUBE_ROOT_2
 * (the documented design rule). When false, the explicit sizes below are used.
 *
 * Default is FALSE: the rule is a documented maxim, but Anderson's surviving
 * cabinet is a documented measurement, and 31 × 22.5 × 24 in does not follow
 * 1 : 2^(1/3) : 2^(2/3). Measurement beats maxim. The rule is kept switchable
 * because it may still describe the cabinets nobody has measured.
 */
export const useCubeRootRule = false;

export type CabinetId = 'cab15' | 'cab12' | 'cab12x2' | 'panel5' | 'panelHF';

/**
 * The only cabinet from the Wall that anyone has measured in hand: a vocal fill
 * bought at the 2021 Sotheby's sale of the Dead's warehouse and described by
 * Brian Anderson in "Loud and Clear" — 31 × 22.5 × 24 in, 64 lb, 14-ply
 * laminated Finnish birch painted matte black, two 12-inch JBLs plus two small
 * drivers, stamped JUL 17 1974 with "G. DEAD" on the back of the cone.
 *
 * Everything else in CABINETS is proportioned against this.
 */
export const MEASURED_CABINET = {
  widthIn: 31,
  heightIn: 24,
  depthIn: 22.5,
  weightLb: 64,
  plies: 14,
  finish: 'matte black' as const,
  drivers: { jbl12: 2, small: 2 },
  stamped: '1974-07-17',
  role: 'vocal fill',
};

export interface Cabinet {
  id: CabinetId;
  kind: 'box' | 'panel';
  driver: DriverId;
  depth: number;
  /** Used when useCubeRootRule === false. */
  widthExplicit: number;
  heightExplicit: number;
  /** Panel types tile on this pitch instead of using width/height. */
  pitch?: number;
  /** Plywood carcass thickness. */
  shellThickness: number;
  /** How far the black baffle sits behind the cabinet's front edge. */
  baffleInset: number;
}

export const CABINETS: Record<CabinetId, Cabinet> = {
  cab15: { id: 'cab15', kind: 'box', driver: 'jbl15', depth: IN(22.5), widthExplicit: IN(24), heightExplicit: IN(24), shellThickness: IN(0.75), baffleInset: IN(0.5) },
  // cab12's explicit size is half of the measured cabinet's width, at its measured height and depth.
  cab12: { id: 'cab12', kind: 'box', driver: 'jbl12', depth: IN(22.5), widthExplicit: IN(15.5), heightExplicit: IN(24), shellThickness: IN(0.75), baffleInset: IN(0.5) },
  // The measured cabinet itself — used for the vocal fills, at true size.
  cab12x2: { id: 'cab12x2', kind: 'box', driver: 'jbl12', depth: IN(22.5), widthExplicit: IN(31), heightExplicit: IN(24), shellThickness: IN(0.75), baffleInset: IN(0.5) },
  panel5: { id: 'panel5', kind: 'panel', driver: 'jbl5', depth: 0.300, widthExplicit: 0.225, heightExplicit: 0.190, pitch: 0.225, shellThickness: IN(0.75), baffleInset: IN(0.25) },
  panelHF: { id: 'panelHF', kind: 'panel', driver: 'evHorn', depth: 0.250, widthExplicit: 0.225, heightExplicit: 0.160, pitch: 0.225, shellThickness: IN(0.75), baffleInset: IN(0.25) },
};

/** Resolved outer size of one cabinet or one panel cell. */
export function cabinetSize(id: CabinetId): { w: number; h: number; d: number } {
  const c = CABINETS[id];
  if (c.kind === 'panel' || !useCubeRootRule) {
    return { w: c.widthExplicit, h: c.heightExplicit, d: c.depth };
  }
  return { w: c.depth * CUBE_ROOT_2, h: c.depth * CUBE_ROOT_2 * CUBE_ROOT_2, d: c.depth };
}

// ─────────────────────────────────────────────────────────────────────────────
// Arrays
// ─────────────────────────────────────────────────────────────────────────────

export interface ArrayBlock {
  id: string;
  channel: ChannelId;
  /** Crossover band, for the four-way vocal system and three-way piano/drums. */
  band: 'high' | 'upperMid' | 'lowerMid' | 'low' | 'full';
  cabinet: CabinetId;
  cols: number;
  rows: number;
  /** Centre of the block, audience-view X. */
  x: number;
  /** Underside height above the stage deck. */
  baseY: number;
  /** Front face offset from the wall plane; negative = further upstage. */
  z: number;
  /** Convex arc radius for curved blocks; 0 = flat. */
  curveRadius: number;
  /** Direction the exploded view pulls this block. */
  explode: [number, number, number];
  label: string;
}

const A = (b: ArrayBlock) => b;

/**
 * Cabinet module sizes these positions are packed against (useCubeRootRule = false):
 *   cab15   0.610 w × 0.610 h    cab12   0.394 w × 0.610 h
 *   panel5  0.225 w × 0.190 h    panelHF 0.225 w × 0.160 h
 *
 * Blocks butt against each other with no gap. The packed envelope comes to
 * 18.96 m (62.2 ft) wide and 7.56 m (24.8 ft) of speakers above the deck —
 * against Anderson's documented sixty feet end to end, within 4%.
 *
 * The wall is not symmetric about the centreline: the piano takes two slots on
 * the left, Garcia's main column plus his extension take two on the right, and
 * they are not the same width. The real wall was asymmetric for the same reason.
 */
export const ARRAYS: ArrayBlock[] = [
  // ── Vocals — the curved centre cluster, elevated to clear the band ──────────
  // ── Vocals — curved centre cluster, raised to clear the band ───────────────
  A({ id: 'voc-hf',   channel: 'vocals', band: 'high',     cabinet: 'panelHF', cols: 20, rows: 1, x:  0.00, baseY: 7.40, z: 0, curveRadius: 5.5, explode: [ 0.0, 1.6, 0.9], label: 'Vocal highs, centre — 20 horns' }),
  A({ id: 'voc-um',   channel: 'vocals', band: 'upperMid', cabinet: 'panel5',  cols: 20, rows: 6, x:  0.00, baseY: 6.26, z: 0, curveRadius: 5.5, explode: [ 0.0, 1.1, 0.9], label: 'Vocal upper mids, centre — 120 × 5″' }),
  A({ id: 'voc-lm',   channel: 'vocals', band: 'lowerMid', cabinet: 'cab12',   cols: 11, rows: 6, x:  0.00, baseY: 2.60, z: 0, curveRadius: 5.5, explode: [ 0.0, 0.6, 0.9], label: 'Vocal lower mids, centre — 66 × 12″' }),
  // Vocal fill towers flanking the cluster — the role of Anderson's measured cabinet
  A({ id: 'voc-lmL',  channel: 'vocals', band: 'lowerMid', cabinet: 'cab12',   cols: 3,  rows: 6, x: -3.04, baseY: 0.00, z: 0, curveRadius: 0,   explode: [-0.9, 0.2, 0.7], label: 'Vocal fill, left — 18 × 12″' }),
  A({ id: 'voc-umL',  channel: 'vocals', band: 'upperMid', cabinet: 'panel5',  cols: 6,  rows: 7, x: -3.04, baseY: 3.66, z: 0, curveRadius: 0,   explode: [-0.9, 0.5, 0.7], label: 'Vocal fill mids, left — 42 × 5″' }),
  A({ id: 'voc-hfL',  channel: 'vocals', band: 'high',     cabinet: 'panelHF', cols: 7,  rows: 1, x: -3.04, baseY: 4.99, z: 0, curveRadius: 0,   explode: [-0.9, 0.8, 0.7], label: 'Vocal fill highs, left — 7 horns' }),
  A({ id: 'voc-lmR',  channel: 'vocals', band: 'lowerMid', cabinet: 'cab12',   cols: 3,  rows: 6, x:  3.04, baseY: 0.00, z: 0, curveRadius: 0,   explode: [ 0.9, 0.2, 0.7], label: 'Vocal fill, right — 18 × 12″' }),
  A({ id: 'voc-umR',  channel: 'vocals', band: 'upperMid', cabinet: 'panel5',  cols: 6,  rows: 7, x:  3.04, baseY: 3.66, z: 0, curveRadius: 0,   explode: [ 0.9, 0.5, 0.7], label: 'Vocal fill mids, right — 42 × 5″' }),
  A({ id: 'voc-hfR',  channel: 'vocals', band: 'high',     cabinet: 'panelHF', cols: 7,  rows: 1, x:  3.04, baseY: 4.99, z: 0, curveRadius: 0,   explode: [ 0.9, 0.8, 0.7], label: 'Vocal fill highs, right — 7 horns' }),
  A({ id: 'voc-loL',  channel: 'vocals', band: 'low',      cabinet: 'cab15',   cols: 2,  rows: 8, x: -4.44, baseY: 0.00, z: 0, curveRadius: 0,   explode: [-1.3, 0.0, 0.6], label: 'Vocal lows, left — 16 × 15″' }),
  A({ id: 'voc-loR',  channel: 'vocals', band: 'low',      cabinet: 'cab15',   cols: 2,  rows: 8, x:  4.44, baseY: 0.00, z: 0, curveRadius: 0,   explode: [ 1.3, 0.0, 0.6], label: 'Vocal lows, right — 16 × 15″' }),

  // ── Bass drum — deck level, on the centreline, tucked under the cluster ────
  A({ id: 'kick',     channel: 'kick',   band: 'full',     cabinet: 'cab15',   cols: 4,  rows: 4, x:  0.00, baseY: 0.00, z: -0.9, curveRadius: 0, explode: [0, 0, -1.6], label: 'Bass drum — 16 × 15″' }),

  // ── Bass, quadraphonic — sixteen a side ───────────────────────────────────
  A({ id: 'bass1',    channel: 'bass1',  band: 'full',     cabinet: 'cab15',   cols: 1,  rows: 8, x: -8.54, baseY: 0.00, z: 0, curveRadius: 0, explode: [-2.5, 0, 0.4], label: 'Bass, E string — 8 × 15″' }),
  A({ id: 'bass2',    channel: 'bass2',  band: 'full',     cabinet: 'cab15',   cols: 1,  rows: 8, x: -7.93, baseY: 0.00, z: 0, curveRadius: 0, explode: [-2.1, 0, 0.4], label: 'Bass, A string — 8 × 15″' }),
  A({ id: 'bass3',    channel: 'bass3',  band: 'full',     cabinet: 'cab15',   cols: 1,  rows: 8, x:  6.94, baseY: 0.00, z: 0, curveRadius: 0, explode: [ 2.1, 0, 0.4], label: 'Bass, D string — 8 × 15″' }),
  A({ id: 'bass4',    channel: 'bass4',  band: 'full',     cabinet: 'cab15',   cols: 1,  rows: 8, x:  7.55, baseY: 0.00, z: 0, curveRadius: 0, explode: [ 2.5, 0, 0.4], label: 'Bass, G string — 8 × 15″' }),

  // ── Guitars ───────────────────────────────────────────────────────────────
  A({ id: 'weir',     channel: 'rhythmGuitar', band: 'full', cabinet: 'cab12', cols: 2, rows: 10, x: -5.45, baseY: 0.00, z: 0,    curveRadius: 0, explode: [-1.7, 0, 0.5], label: 'Rhythm guitar — 20 × 12″' }),
  A({ id: 'garcia',   channel: 'leadGuitar',   band: 'full', cabinet: 'cab12', cols: 2, rows: 7,  x:  5.45, baseY: 0.00, z: 0,    curveRadius: 0, explode: [ 1.7, 0, 0.5], label: 'Lead guitar, main — 14 × 12″' }),
  A({ id: 'garcia-x', channel: 'leadGuitar',   band: 'full', cabinet: 'cab12', cols: 2, rows: 3,  x:  6.24, baseY: 0.00, z: -1.6, curveRadius: 0, explode: [ 1.2, 0, -0.9], label: 'Lead guitar, extension — 6 × 12″' }),

  // ── Piano — 15″ column in one slot, 12″ and 5″ stacked in the next ─────────
  A({ id: 'pno-lo',   channel: 'piano', band: 'low',      cabinet: 'cab15',  cols: 1, rows: 9, x: -6.15, baseY: 0.00, z: 0, curveRadius: 0, explode: [-1.5, 0.0, 0.5], label: 'Piano lows — 9 × 15″' }),
  A({ id: 'pno-lm',   channel: 'piano', band: 'lowerMid', cabinet: 'cab12',  cols: 3, rows: 4, x: -7.04, baseY: 0.00, z: 0, curveRadius: 0, explode: [-1.8, 0.0, 0.5], label: 'Piano mids — 12 × 12″' }),
  A({ id: 'pno-um',   channel: 'piano', band: 'upperMid', cabinet: 'panel5', cols: 4, rows: 9, x: -7.04, baseY: 2.44, z: 0, curveRadius: 0, explode: [-1.8, 0.4, 0.5], label: 'Piano highs — 36 × 5″' }),

  // ── Drums & cymbals — stereo, identical columns left and right ────────────
  A({ id: 'drm-lmL',  channel: 'drumsL', band: 'lowerMid', cabinet: 'cab12',  cols: 2, rows: 6, x: -9.42, baseY: 0.00, z: 0, curveRadius: 0, explode: [-3.0, 0.0, 0.5], label: 'Drums lower mids, left — 12 × 12″' }),
  A({ id: 'drm-umL',  channel: 'drumsL', band: 'upperMid', cabinet: 'panel5', cols: 5, rows: 8, x: -9.42, baseY: 3.66, z: 0, curveRadius: 0, explode: [-3.0, 0.4, 0.5], label: 'Drums upper mids, left — 40 × 5″' }),
  A({ id: 'drm-hfL',  channel: 'drumsL', band: 'high',     cabinet: 'panelHF',cols: 5, rows: 2, x: -9.42, baseY: 5.18, z: 0, curveRadius: 0, explode: [-3.0, 0.8, 0.5], label: 'Drums highs, left — 10 horns' }),
  A({ id: 'drm-lmR',  channel: 'drumsR', band: 'lowerMid', cabinet: 'cab12',  cols: 2, rows: 6, x:  8.42, baseY: 0.00, z: 0, curveRadius: 0, explode: [ 3.0, 0.0, 0.5], label: 'Drums lower mids, right — 12 × 12″' }),
  A({ id: 'drm-umR',  channel: 'drumsR', band: 'upperMid', cabinet: 'panel5', cols: 5, rows: 8, x:  8.42, baseY: 3.66, z: 0, curveRadius: 0, explode: [ 3.0, 0.4, 0.5], label: 'Drums upper mids, right — 40 × 5″' }),
  A({ id: 'drm-hfR',  channel: 'drumsR', band: 'high',     cabinet: 'panelHF',cols: 5, rows: 2, x:  8.42, baseY: 5.18, z: 0, curveRadius: 0, explode: [ 3.0, 0.8, 0.5], label: 'Drums highs, right — 10 horns' }),
];

// ─────────────────────────────────────────────────────────────────────────────
// The wall
// ─────────────────────────────────────────────────────────────────────────────

export const wall = {
  meta: {
    title: 'The Wall of Sound',
    subtitle: 'Grateful Dead touring PA, 1974',
    debut: { date: '1974-03-23', venue: 'Cow Palace, Daly City, California' },
    retired: { date: '1974-10-20', venue: 'Winterland Ballroom, San Francisco', run: '16–20 October 1974' },
    prototypeTest: { date: '1973-02-09', venue: 'Maples Pavilion, Stanford University' },
    showCount: 37,
    designers: [
      { name: 'Owsley "Bear" Stanley', role: 'concept and lead design' },
      { name: 'Dan Healy', role: 'sound crew, system design' },
      { name: 'Mark "Sparky" Raizene', role: 'sound crew, vocal system' },
      { name: 'Bob Matthews', role: 'sound crew' },
      { name: 'Ron Wickersham', role: 'Alembic — electronics' },
      { name: 'Rick Turner', role: 'Alembic — instruments, incl. the quad basses' },
      { name: 'John Curl', role: 'Alembic — electronics' },
      { name: 'Courtenay Pollock', role: 'tie-dyed fabric panels' },
    ],
  },

  system: {
    amplifierModel: 'McIntosh MC-2300',
    amplifierCount: 48,
    amplifierWattsMono: 600,
    amplifierWeightLb: 128,
    wattsInstalled: 28_800,
    wattsQuoted1974: 26_400,
    channelCount: 11,
    independentSystems: 6,
    weightTonsComplete: 75,
    weightTonsAudioOnly: 28,
    crew: 21,
    /** One sound system, two identical scaffolding sets leapfrogging ahead of it. */
    stagingSets: 2,
    setupHours: { sound: 4, stage: 4 },
    buildCostUsd1974: 350_000,
    transportLabourUsdPerMonth: 100_000,
    insuredValueUsd1974: 250_000,
    usableThrowMetres: 180,
    acceptableThrowMetres: 400,
    onstageSplDb: 120,
    /** Sound pressure could lift the whole rig this far off the deck. */
    rigBounceMetres: FT(1),
  },

  /** Published driver inventory. The model asserts its own sum against these. */
  inventory: {
    driver15: 89,
    driver12: 178,
    driver5: 320,
    tweeters: 54,
    get totalJbl() { return this.driver15 + this.driver12 + this.driver5; }, // 587
    get total() { return this.totalJbl + this.tweeters; },                    // 641
    publishedJbl: 586,
    publishedTotal: 640,
  },

  dimensions: {
    /** The speakers themselves: sixty feet end to end. The model packs to 18.96 m. */
    arrayWidth: FT(60),
    arrayWidthPacked: 18.96,
    /** Speaker envelope above the deck. Model tops out at 7.56 m. */
    arrayHeight: 8.0,
    /** One-inch plywood, ten feet up, bolted and tied into the scaffolding. */
    stageDeckHeight: FT(10),
    stageDeckThickness: IN(1),
    /** Full staging footprint, which is what the "nearly 100 feet wide" figures describe. */
    stagingIndoor: { width: FT(76), depth: FT(30) },
    stagingOutdoor: { width: FT(104), depth: FT(40) },
    /** Which footprint the scene builds. */
    venue: 'outdoor' as 'indoor' | 'outdoor',
    bandLineZ: 3.0,
    /** Total height above ground: deck + speakers ≈ 36 ft, "over three stories". */
    get totalHeight() { return FT(10) + 8.0 },
  },

  structure: {
    scaffold: {
      bayWidth: FT(7),
      liftHeight: FT(6.5),
      tubeDiameter: 0.0483,
      guyWireDiameter: 0.006,
      /** Rear plane of scaffolding behind the arrays. */
      rearPlaneZ: -2.4,
    },
    /** Military-surplus shore-power cable. Arm-thick, and a visual feature. */
    cabling: { runDiameter: 0.050, bundleDiameter: 0.14, color: '#0E0E0E' },
    amps: {
      /** MC-2300, W × H × D. */
      size: { w: IN(19), h: IN(9.5), d: IN(16) },
      perRack: 4,
      rackCount: 12,
      /** Amps sit at deck level behind the arrays. Exact distribution undocumented. */
      z: -2.0,
      meterColor: '#3FA9F5',
      meterEmissiveIntensity: 2.4,
    },
  },

  band: {
    /** Flip the whole stage left-for-right. See PROVENANCE['band.positions']. */
    mirrored: false,
    members: [
      { id: 'weir',    name: 'Bob Weir',        instrument: 'Gibson ES-335',                 x: -5.0, z: 3.0 },
      { id: 'lesh',    name: 'Phil Lesh',       instrument: 'Alembic quadraphonic bass',     x: -2.4, z: 3.2 },
      { id: 'kreutz',  name: 'Bill Kreutzmann', instrument: 'drum kit',                      x:  0.0, z: 1.5 },
      { id: 'keith',   name: 'Keith Godchaux',  instrument: 'grand piano, 5 Countryman p/u', x:  3.4, z: 2.6 },
      { id: 'garcia',  name: 'Jerry Garcia',    instrument: '"Wolf" — Doug Irwin custom',    x:  5.6, z: 3.0 },
    ],
    /** Steal Your Face — 1969 equipment stencil. Cases only. */
    logo: { id: 'stealYourFace', boltPoints: 13, appliedTo: ['roadCases', 'flightCases'] },
  },

  materials: {
    plywood: { baseColor: '#C4A276', roughness: 0.82, metalness: 0.0, wearAmount: 0.55 },
    /** Matte black paint over the same 14-ply birch — the finish on the one surviving cabinet. */
    plywoodBlack: { baseColor: '#1A1917', roughness: 0.90, metalness: 0.0, wearAmount: 0.7 },
    /** Fraction of cabinets finished black rather than left bare. */
    blackFinishRatio: 0.55,
    baffle: { baseColor: '#141414', roughness: 0.94, metalness: 0.0 },
    cone: { baseColor: '#6E7178', roughness: 0.88, metalness: 0.0 },
    dustCap: { baseColor: '#C9CDD2', roughness: 0.28, metalness: 0.92 },
    surround: { baseColor: '#1C1C1C', roughness: 0.75, metalness: 0.0 },
    steel: { baseColor: '#9AA0A6', roughness: 0.46, metalness: 0.95 },
    cable: { baseColor: '#0E0E0E', roughness: 0.68, metalness: 0.0 },
    ampGlass: { baseColor: '#0A0A0C', roughness: 0.12, metalness: 0.2 },
    /** Drivers are exposed — there is no grille cloth material by design. */
    grilleCloth: null,
  },

  /** Quality tiers. Chosen at load from device capability, overridable by the visitor. */
  render: {
    tiers: {
      high:   { pixelRatioCap: 2.0, shadowMapSize: 2048, softShadows: true,  ssao: true,  bloom: true,  bloomStrength: 0.22, anisotropy: 8, maxLights: 6, instanceLod: false },
      medium: { pixelRatioCap: 1.5, shadowMapSize: 1024, softShadows: false, ssao: false, bloom: true,  bloomStrength: 0.14, anisotropy: 4, maxLights: 4, instanceLod: true },
      low:    { pixelRatioCap: 1.0, shadowMapSize: 512,  softShadows: false, ssao: false, bloom: false, bloomStrength: 0,    anisotropy: 1, maxLights: 2, instanceLod: true },
    },
    targetFps: 60,
    initialDownloadBudgetMb: 5,
    hdri: { intensity: 0.65, rotation: DEG(15) },
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Derived counts and the self-check
// ─────────────────────────────────────────────────────────────────────────────

export const driverCountOf = (b: ArrayBlock) => b.cols * b.rows;

export function inventoryFromArrays() {
  const acc = { driver15: 0, driver12: 0, driver5: 0, tweeters: 0 };
  const key = { jbl15: 'driver15', jbl12: 'driver12', jbl5: 'driver5', evHorn: 'tweeters' } as const;
  for (const b of ARRAYS) acc[key[CABINETS[b.cabinet].driver]] += driverCountOf(b);
  return { ...acc, total: acc.driver15 + acc.driver12 + acc.driver5 + acc.tweeters };
}

/**
 * Run at startup. If someone edits an array count, the model's driver total
 * must not silently drift away from the historical inventory.
 */
export function assertInventory(): void {
  const got = inventoryFromArrays();
  const want = wall.inventory;
  const mismatches = (
    [
      ['15-inch', got.driver15, want.driver15],
      ['12-inch', got.driver12, want.driver12],
      ['5-inch', got.driver5, want.driver5],
      ['tweeters', got.tweeters, want.tweeters],
    ] as const
  ).filter(([, a, b]) => a !== b);

  if (mismatches.length) {
    throw new Error(
      'wall.config: array layout no longer matches the historical inventory — ' +
        mismatches.map(([n, a, b]) => `${n}: laid out ${a}, inventory ${b}`).join('; '),
    );
  }
}

export const channelsBySystem = (system: Channel['system']) =>
  Object.values(CHANNELS).filter((c) => c.system === system);

export const arraysForChannel = (id: ChannelId) => ARRAYS.filter((a) => a.channel === id);

export default wall;

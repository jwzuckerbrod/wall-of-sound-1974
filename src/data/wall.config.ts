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
  | 'bear'
  | 'pechner'
  | 'photos'
  | 'anderson'
  | 'schneider'
  | 'sothebys'
  | 'blueprints'
  | 'juliens'
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
  pechner: {
    title: 'Richard Pechner, "Grateful Dead and the Wall of Sound", sound check, P.N.E. Coliseum, Vancouver, 17 May 1974 — the straight-on full-stage view',
    url: 'https://www.rpechner.com/Music/Grateful-Dead',
    kind: 'photographic',
  },
  schneider: {
    title: 'Steve Schneider, the Grateful Dead at Campus Stadium, UC Santa Barbara, 25 May 1974 — two colour photographs, close and full-stage, published by Paul Dorpat',
    url: 'https://pauldorpat.com/2023/08/10/seattle-now-then-grateful-dead-1974/',
    kind: 'photographic',
  },
  sothebys: {
    title: 'Sotheby\'s, "From the Vault: Property from the Grateful Dead and Friends", New York, closed 14 October 2021. Lots 34–50 are Wall of Sound equipment: eight McIntosh MC 2300s with their cases, two ZERO amp cases, six speaker cabinets and the centre cluster\'s aluminium 5-inch enclosures, most with a statement from Steve Parish. Catalogued lot by lot in docs/surviving-gear.md',
    url: 'https://www.sothebys.com/en/buy/auction/2021/from-the-vault-property-from-the-grateful-dead-and-friends',
    kind: 'primary',
  },
  bear: {
    title: 'Owsley Stanley, "This is the logo that Bob Thomas and I designed for Grateful Dead in 1969" — with a photograph of his stencilled toolbox',
    url: 'http://www.thebear.org/GDLogo.html',
    kind: 'primary',
  },
  anderson: {
    title:
      'Brian Anderson, Loud and Clear (2025) — chapter 1, "The Artifact". Supplied by the project owner. Highest-quality dimensional source found: it separates the speaker array from the staging, gives the stage deck height, and describes a surviving cabinet measured in hand.',
    kind: 'primary',
  },
  blueprints: {
    title:
      'Original Grateful Dead scaffolding and stage drawings, from the collection of "Big Steve" Parish — sold at Julien\'s Auctions, "Treasures From The Golden Road", 22 April 2026, lots 53/57/60 (P.A. tower, 1973-74 Winter Season, scale 3/8"=1\') and lot 71 (1974 Summer Tour, dated 10 April 1974, scale 1/4"=1\'-0", top view + stage left view + written tower and stage requirements). PRIMARY ENGINEERING DOCUMENTS. Where these disagree with anything else, they win.',
    url: 'https://www.juliensauctions.com/en/items/2208457/grateful-dead-1974-summer-tour-wall-of-sound-scaffolding-blueprints',
    kind: 'primary',
  },
  juliens: {
    title:
      'Julien\'s Auctions, "Treasures From The Golden Road: Featuring Property From Big Steve, Ram Rod & Trixie Garcia", 22 April 2026 — lot catalogue. Surviving hardware from the Dead\'s own crew: lot 72 (Wall of Sound 1974 Electro-Voice T350 tweeter), lots 276/277 (Hard Truckers small plywood enclosures, 4.5-inch speaker, tie-dye grille cloth), lots 58/62/69/70 (McIntosh MC2300s and their named road cases).',
    url: 'https://www.juliensauctions.com/en/auctions/treasures-from-the-golden-road',
    kind: 'primary',
  },
  photos: {
    title:
      'Photographic record — Richard Pechner (rpechner.com), Kirk West, the 1974 galleries at vintag.es and designyoutrust.com, dead.net 1974 archive',
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
  'dimensions.totalHeight': {
    confidence: 'estimated',
    sources: ['blueprints', 'pechner'],
    note: 'Ground to top of tower: the 10 ft deck plus the 38\'-10" tower above it = 48\'-10". The 10 April 1974 stage-left elevation gives the tower as a chain of 7\'-0" + 5\'-10" + four lifts of 6\'-6" but not where the chain starts. It was first read from the ground; Pechner\'s 17 May 1974 photograph shows the whole 38\'-10" standing above the deck.',
  },
  'dimensions.arrayHeight': {
    confidence: 'confirmed',
    sources: ['blueprints', 'pechner'],
    note: 'Tower above the deck: 38\'-10" (11.84 m), the drawing\'s full lift chain. Measured on Pechner\'s 17 May 1974 photograph at 38.8 ft, scaled three independent ways that agree — the 64 ft footprint, a crew member standing on the top rail, and the 24" rows of the 15" cabinets. The earlier figure, 28\'-10", came from hanging the chain from the ground. See docs/qa-findings.md §6.',
  },
  'dimensions.stageDeckHeight': {
    confidence: 'confirmed',
    sources: ['anderson', 'blueprints'],
    note: 'Ten feet above ground, bolted and tied into the scaffolding — because sound pressure could bounce the whole system by as much as a foot. Anderson says one-inch plywood; the 1974 drawing specifies 1-1/8" tongue-and-groove over 2x10 planks on 4x6 beams, so the drawing\'s figure is used. Previously guessed at 5 ft.',
  },
  'dimensions.scaffoldFootprint': {
    confidence: 'confirmed',
    sources: ['blueprints'],
    note: 'Top view, 10 April 1974: 64\'-0" wide × 40\'-0" deep. The width chain reads 9" + 5\'-0" + 7\'-0" bays + a 3\'-6" closer at the centreline, mirrored. The model\'s speaker array packs to 62.2 ft and drops inside this footprint with room for the end frames — an independent check that landed.',
  },
  'dimensions.deckOverhang': {
    confidence: 'confirmed',
    sources: ['blueprints'],
    note: 'Stage requirements, note 3: the deck overhangs the scaffolding by 9\'-0" stage left and stage right and by 1\'-0" downstage. So the deck is 82 ft wide × 41 ft deep around a 64 × 40 tower footprint.',
  },
  'dimensions.stagingIndoor': { confidence: 'confirmed', sources: ['anderson'], note: '76 ft wide × 30 ft deep — a different venue configuration from the drawing.' },
  'dimensions.stagingOutdoor': { confidence: 'confirmed', sources: ['anderson'], note: 'Over 100 ft wide × 40 ft deep. The 40 ft depth matches the drawing exactly.' },
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
    sources: ['anderson', 'sothebys', 'pechner', 'derived'],
    note: 'Sizes from surviving cabinets (docs/surviving-gear.md). 15": 19.5 W × 25.5 H × 29.5 D in, Sotheby\'s 2021 lot 46, read height × width × depth as Sotheby\'s lists the amplifiers; the 25.5" height matches the 24.5" row pitch measured on Pechner\'s photograph and makes the 16-high columns 34 ft against the photo\'s ~35. Lot 50 ("ca. 1974") agrees on the three numbers but its photograph suggests a taller face, which would make those columns taller than the tower, so it is not followed. The driver sits low on the baffle, as on lot 50 (lot 46 has it high). 12": lot 47, a 2 × 12" box of 16 × 26 × 22 in with the drivers stacked; each cell is half of it. 5": rows 5.5 in high, the height of the cluster\'s aluminium enclosures (lot 49) and the photo\'s row pitch; the 8.9 in width is kept so the cluster\'s 5" band stays as wide as its 12" section, as in the photographs. Also, Anderson measured a surviving vocal-fill cabinet, 31 × 22.5 × 24 in, 64 lb, two 12" JBLs and two small drivers, stamped JUL 17 1974: it anchors cab12x2.',
  },
  'cabinets.construction': {
    confidence: 'confirmed',
    sources: ['anderson', 'mixrebuild'],
    note: '14-ply laminated Finnish birch. Anderson\'s surviving cabinet is painted MATTE BLACK all over, not left natural — so the model finishes some cabinets black and leaves the plywood showing on others, which is what the photographs show across the wall.',
  },

  'drivers.models': {
    confidence: 'estimated',
    sources: ['juliens', 'derived'],
    note: 'No source names the JBL model numbers; those remain period-correct candidates and affect only cone and dust-cap proportions. The tweeter is NOT a guess: a surviving "Wall of Sound 1974" unit from the crew\'s own stock is an Electro-Voice T350.',
  },
  'drivers.tweeterModel': { confidence: 'confirmed', sources: ['juliens'], note: 'Electro-Voice T350. This config previously guessed T-35.' },
  'drivers.hornT350': {
    confidence: 'confirmed',
    sources: ['juliens'],
    note: 'The surviving unit (Julien\'s 2026, lot 72): 7.25 × 4.5 × 3.5 in, a rectangular horn in a plain grey cast-metal frame, its throat black with vertical vanes. Julien\'s says these sat on the upper part of the centre array, above the drums. Mounted landscape here, since a 7.25 in horn only fits the 6.3 in high horn cells that way. See docs/qa-findings.md §18.',
  },
  'drivers.smallCone': {
    confidence: 'estimated',
    sources: ['juliens', 'deadsources74'],
    note: 'The 1974 spec sheet calls these 5-inch; surviving Hard Truckers enclosures are catalogued with a 4.5-inch speaker. Both fit a nominal 5" driver with a ~4.5" frame, which is what is modelled.',
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
  'arrays.clusterStrips': {
    confidence: 'estimated',
    sources: ['sothebys', 'photos'],
    note: 'The cluster\'s 5"s in curved aluminium strips, as Sotheby\'s 2021 lot 49, which Steve Parish says replaced the first cluster\'s individual plywood cells. The Hollywood Bowl photographs of 21 July 1974 show strips already in use: four rows, the holes a third of the 12" cabinets\' spacing, the band as wide as the 12" section. So 4 rows of 33 at lot 49\'s 5.3 in spacing, each row three lengths of 11 (lot 49\'s hold about 13). That is 132 drivers, 12 more than the cells had, so the vocal fills give up a row of 6 each: the vocals\' 5" total and the 641 are unchanged. Pechner\'s 17 May photograph shows a taller 5" band, probably the plywood cells.',
  },
  'arrays.kickPosition': {
    confidence: 'guessed',
    sources: ['photos', 'pechner', 'derived'],
    note: 'Where the bass-drum column stood is not known. It is not under the cluster, where the model had a 4 × 4 block: every photograph found shows that space open, from 17 May to 31 July 1974, Hollywood Bowl on 21 July included. Stood here as the single column the spec sheet describes, in the only free slot in the run, on the deck at the audience\'s left between the bass and Garcia\'s main column. Its 16 drivers keep the inventory at 641.',
  },
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

  'dimensions.arrayStandoff': {
    confidence: 'estimated',
    sources: ['photos', 'derived'],
    note: 'Where the stacks\' faces stand against the front plane of the towers. Negative is behind it. The photographs show the stacks BEHIND the front steel: uprights, ledgers and X-braces cross in front of the speaker faces on both sides, at the Hollywood Bowl on 21 July 1974 and on Pechner\'s 17 May photograph. So the faces sit just behind the front tubes. An earlier note claimed the opposite. The centre cluster is the exception: see dimensions.clusterStandoff. See docs/qa-findings.md §13.',
  },
  'dimensions.clusterStandoff': {
    confidence: 'estimated',
    sources: ['photos'],
    note: 'The curved centre cluster projects forward of the steel, with no tubes across its face, at the Hollywood Bowl (21 July 1974) and on Pechner\'s 17 May photograph. Its front stands proud of the front plane; front ledgers and braces stop at its edges.',
  },
  'structure.lightBars': {
    confidence: 'estimated',
    sources: ['pechner', 'photos'],
    note: 'Stage-lighting bars of black can lamps clamped to the scaffold at both upper outer corners, in front of the stacks: on Pechner\'s 17 May photograph, at the Hollywood Bowl on 21 July and at UC Santa Barbara on 25 May. Measured on Pechner\'s photograph through its solved camera: each side a horizontal bar of about 5 lamps, a diagonal bar of about 8 rising toward the centre, and two vertical ladders of about 6. The ladders show only indoors; outdoors the tie-dyes hang in that space and only the flat and diagonal bars are seen. Lamp counts are read off small images; the lamps\' type is not known. The bar along the top front on some dates is not modelled.',
  },
  'structure.guyWires': {
    confidence: 'guessed',
    sources: ['photos'],
    note: 'Diagonal guy wires are unmistakable in the photographs, but nothing records their gauge or their pattern. Diameter and spacing are both invented.',
  },
  'materials.palette': {
    confidence: 'estimated',
    sources: ['photos', 'anderson', 'derived'],
    note: 'Every colour, roughness and metalness value is an interpretation of black-and-white and faded colour film, lit by a stage rig that is itself a reconstruction. The materials are plausible, not measured. The one hard fact underneath them is that the cabinets were 14-ply Finnish birch and the surviving one is painted matte black.',
  },
  'band.instruments': {
    confidence: 'estimated',
    sources: ['derived'],
    note: 'The instruments are honest silhouettes at true size, not replicas. Which instruments were on that stage in 1974 is reasonably established; their exact geometry here is not modelled from the objects.',
  },
  'structure.scaffold': {
    confidence: 'confirmed',
    sources: ['blueprints'],
    note: 'Tower requirements, 10 April 1974: built with 6\'-6" × 5\' end frames and 7\' X-braces; 50 ten-foot and 50 thirteen-foot tubelocks; 275 couplers in five sizes; six 22\' trusses; end frames sprocketed and pinned; forty 2"x10"x16" planks used as floors. The earlier 1973-74 Winter Season tower sheet is a smaller rig — 30 ft tall, standard 6\' frames, 5\' X-braces, 5\' bays, three levels, "floor in back only, 2nd level" and "omit floor in 5\' bay, 3rd level". The 6\'-6" lift and 7\' bay previously guessed in this config turn out to be right.',
  },
  'structure.stageDeck': {
    confidence: 'confirmed',
    sources: ['blueprints'],
    note: 'Stage requirements: 5\'x5\' end frames, 5\' and 7\' X-braces, screwjacks and base plates; deck of 4x6 beams and 2x10 planks under 1-1/8" T&G plywood; 5/8" plywood facing across the entire front and 16 ft back on both stage left and stage right. "X" areas on the plan mark towers that continue up after the deck is down.',
  },
  'structure.cabling': {
    confidence: 'confirmed',
    sources: ['anderson'],
    note: 'Arm-thick military-surplus cable, originally made for connecting docked ships to shore power. Nothing lighter could carry the current. Modelled at 50 mm — these runs are a visual feature, not a detail.',
  },

  'materials.exposedDrivers': {
    confidence: 'confirmed',
    sources: ['photos', 'juliens'],
    note: 'The big drivers were NOT behind grille cloth — cones, surrounds, aluminium dust caps and mounting screws are visible in every photograph. PARTIAL CORRECTION: surviving Hard Truckers small plywood enclosures are catalogued with tie-dye grille cloth over the 4.5-inch driver. So the small-cone boxes were covered and the 12s and 15s were not, which also explains where Courtenay Pollock\'s tie-dye went. Modelled accordingly.',
  },
  'materials.cone': {
    confidence: 'estimated',
    sources: ['photos'],
    note: 'Near-black. JBL cones of the period are dark grey paper, and every colour photograph (Oakland 8 June, the Hollywood Bowl 21 July 1974) reads them dark against the plywood. Was mid-grey; changed on the project owner\'s ruling, docs/qa-findings.md §18.',
  },
  'materials.steel': {
    confidence: 'estimated',
    sources: ['photos', 'pechner'],
    note: 'Bright galvanised steel: pale silver in daylight at Oakland and bright against the hall on Pechner\'s photograph. Was darkened for the explorer\'s lighting; restored on the project owner\'s ruling (docs/qa-findings.md §18). If it swamps the speakers on screen, that is a lighting problem, not a paint one.',
  },
  'cabinets.panelCells': {
    confidence: 'estimated',
    sources: ['photos'],
    note: 'The 5" and horn panels are built as small plywood cells, one driver each, not as one drilled black board: at Oakland the small-driver panels read as pale framed grids. The photographs are small; this is a reading, ruled on by the project owner (docs/qa-findings.md §18). They take the same black-or-bare finish as the other cabinets, one finish per block.',
  },
  'cabinets.pairedTwelves': {
    confidence: 'confirmed',
    sources: ['sothebys'],
    note: 'The 12"s came two to a box, stacked (Sotheby\'s 2021 lot 47, 16 × 26 × 22 in), so rows pair up: a lower cell without its top board, an upper one without its bottom. An odd top row is a single box.',
  },
  'materials.plywood': {
    confidence: 'confirmed',
    sources: ['anderson', 'mixrebuild', 'photos'],
    note: '14-ply laminated Finnish birch, Hard Truckers style. Finish varied: Anderson\'s surviving cabinet is matte black throughout; photographs show other cabinets with bare plywood frames around black baffles, both finishes in the same columns on Pechner\'s photograph. Both are modelled, mixed across the wall at blackFinishRatio, in the explorer and in Blender alike (src/geometry/arrays.ts decides each cabinet\'s finish).',
  },
  'materials.tieDye': { confidence: 'confirmed', sources: ['deadsources22'], note: 'Courtenay Pollock tie-dyed the fabric panels — on the structure, not over the drivers.' },
  'materials.mcIntoshMeters': { confidence: 'confirmed', sources: ['mcintosh', 'mc2300', 'sothebys'], note: 'Blue illuminated meters, black glass panel, 128 lb per amplifier. The front panel is anodized gold over a black chassis, 10.5 × 19 × 17 in, as measured on a Wall amplifier (Sotheby\'s lot 43).' },
  'materials.roadCases': {
    confidence: 'estimated',
    sources: ['sothebys', 'photos'],
    note: 'Orange Anvil rolling cases with aluminium edging, ball corners and recessed latches, from a Wall amplifier\'s own case (Sotheby\'s lot 43). Orange-red cases also stand under the piano at Oakland on 8 June 1974. Wear, tape and labels are modelled on the surviving case, which was in use until at least 1993, so they show decades of handling rather than one summer\'s.',
  },
  'materials.stickers': {
    confidence: 'guessed',
    sources: ['sothebys'],
    note: 'ARTISTIC CHOICE, NOT 1974 EVIDENCE. Some cases and amplifiers carry a "GRATEFUL DEAD" lettering sticker and a skull-and-lightning-bolt sticker, as the surviving amplifier and its case do. Nothing dates those stickers to 1974; the same case has tape dated 1993, and the skull-and-bolt was first widely published on the 1976 album. Kept at the project owner\'s request, for realism. The 1969 bolt stencil (band.logo) is still the only mark the evidence supports for 1974. Switch off with structure.amps.stickers.',
  },

  'band.positions': {
    confidence: 'estimated',
    sources: ['pechner', 'schneider', 'anderson', 'photos', 'deadsources74'],
    note: 'Measured on Pechner\'s 17 May 1974 photograph through its solved camera, left to right: Garcia, Weir, the kit, Lesh, then the grand lying across the stage with Keith at its keyboard end. Every other photograph found, to (probably) 16 June, also has Garcia at the far left and Keith to the right; Weir and Lesh changed places now and then, and on some dates a grand stands at the far right instead. The spec sheet puts Garcia\'s extension stack "beside Godchaux and behind Kreutzmann", which agrees. At the Hollywood Bowl on 21 July 1974, where the story is set, the order is the same: Garcia, Weir, the kit, Lesh, the pianos (the Bowl photographs, qa-findings §14; confirmed by the project owner, §17). See docs/qa-findings.md §7, §9 and §17.',
  },
  'band.gear': { confidence: 'estimated', sources: ['derived'], note: 'Garcia "Wolf" (Doug Irwin); Weir Gibson ES-335; Lesh Alembic quad bass ("Mission Control", serial 74 00008, from 16 June 1974); Godchaux grand with five Countryman pickups.' },
  'band.logo': {
    confidence: 'confirmed',
    sources: ['bear', 'syf'],
    note: 'The mark on the gear was the lightning bolt alone: a 5 1/2" white circle, a red half and a blue half, split by a jagged white bolt. Owsley Stanley\'s own account says it was cut as one half-circle stencil, sprayed red, turned over and sprayed blue, and "we put it on to all our gear" in 1969. The skull with the bolt is a later design by Bob Thomas; no source found puts it on the equipment in 1974. It appears in the Blender scene only as a later sticker, an artistic choice recorded under materials.stickers. Red above, blue below, as Stanley describes it; the bolt outline is traced from Bob Thomas\'s drawing. Evidence is from 1969; nothing found says the mark changed by 1974.',
  },
};

/** Where a block's face stands against the towers' front plane. */
export const standoffOf = (b: ArrayBlock): number =>
  b.curveRadius > 0 ? wall.dimensions.clusterStandoff : wall.dimensions.arrayStandoff;

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
  /** A horn instead of a cone: mouth width and height, and depth behind the baffle. */
  horn?: { w: number; h: number; depth: number };
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
    id: 'evHorn', label: 'Electro-Voice horn tweeter', modelGuess: 'Electro-Voice T350 (confirmed — surviving unit)',
    nominalIn: 0, frameDia: IN(4.5), coneDia: IN(3.4), coneDepth: IN(-1.6), // negative = horn flare projects forward
    dustCapDia: 0, dustCapRise: 0, surroundWidth: 0, boltCount: 4,
    // The surviving unit, Julien's 2026 lot 72. See PROVENANCE['drivers.hornT350'].
    horn: { w: IN(7.25), h: IN(4.5), depth: IN(3.5) },
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

export type CabinetId = 'cab15' | 'cab12' | 'cab12x2' | 'panel5' | 'strip5' | 'panelHF';

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
  /** Driver centre above (+) or below (−) the middle of the face. Default 0. */
  driverOffsetY?: number;
  /** For a strip: how many cells make one length of it. */
  strip?: number;
  /** Rows pair up two drivers to a box (Sotheby's lot 47). */
  pairRows?: boolean;
  /** One finish for the whole block, not cabinet by cabinet (the small-driver panels). */
  finishPerBlock?: boolean;
}

export const CABINETS: Record<CabinetId, Cabinet> = {
  // Sotheby's 2021 lot 46, read height × width × depth as Sotheby's lists the
  // amplifiers: 25.5 × 19.5 × 29.5 in. The 15" sits low on the baffle, as on
  // lot 50. See PROVENANCE['cabinets.absoluteSizes'] and docs/surviving-gear.md.
  cab15: { id: 'cab15', kind: 'box', driver: 'jbl15', depth: IN(29.5), widthExplicit: IN(19.5), heightExplicit: IN(25.5), shellThickness: IN(0.75), baffleInset: IN(0.5), driverOffsetY: -IN(4) },
  // One driver's share of lot 47, a 2 × 12" box of 16 × 26 × 22 in with the two
  // drivers stacked: each cell is 16 wide, 13 high. Rows pair up into boxes.
  cab12: { id: 'cab12', kind: 'box', driver: 'jbl12', depth: IN(22), widthExplicit: IN(16), heightExplicit: IN(13), shellThickness: IN(0.75), baffleInset: IN(0.5), pairRows: true },
  // The measured cabinet itself — used for the vocal fills, at true size.
  cab12x2: { id: 'cab12x2', kind: 'box', driver: 'jbl12', depth: IN(22.5), widthExplicit: IN(31), heightExplicit: IN(24), shellThickness: IN(0.75), baffleInset: IN(0.5) },
  // Rows 5.5 in high: the height of the cluster's aluminium 5" enclosures
  // (lot 49), and the row pitch Pechner's photo gives the cluster's 5" band.
  // Small plywood cells, one driver each. See PROVENANCE['cabinets.panelCells'].
  panel5: { id: 'panel5', kind: 'box', finishPerBlock: true, driver: 'jbl5', depth: 0.300, widthExplicit: 0.225, heightExplicit: IN(5.5), pitch: 0.225, shellThickness: IN(0.75), baffleInset: IN(0.25) },
  // The centre cluster's 5"s in curved aluminium channels, as Sotheby's 2021
  // lot 49: 5.5 high × 3.5 deep, holes 69/13 in apart. Three lengths of 11 make
  // a row as wide as the 12" section below. See PROVENANCE['arrays.clusterStrips'].
  strip5: { id: 'strip5', kind: 'panel', driver: 'jbl5', depth: IN(3.5), widthExplicit: IN(69 / 13), heightExplicit: IN(5.5), pitch: IN(69 / 13), shellThickness: IN(0.125), baffleInset: IN(0.1), strip: 11 },
  panelHF: { id: 'panelHF', kind: 'box', finishPerBlock: true, driver: 'evHorn', depth: 0.250, widthExplicit: 0.225, heightExplicit: 0.160, pitch: 0.225, shellThickness: IN(0.75), baffleInset: IN(0.25) },
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
 *   cab15   0.495 w × 0.648 h    cab12   0.406 w × 0.330 h
 *   panel5  0.225 w × 0.140 h    panelHF 0.225 w × 0.160 h
 * (The sizes from the surviving cabinets, Sotheby's 2021: docs/surviving-gear.md.
 * The x positions predate them and were packed against 24"-wide 15" cabinets,
 * so the 15" columns now stand a little apart.)
 *
 * Blocks sit side by side along the run. The packed envelope comes to about
 * 62 ft wide — against Anderson's documented sixty feet end to end, within 4% —
 * and 32 ft of speakers above the deck.
 *
 * Heights follow Pechner's 17 May 1974 photograph (docs/qa-findings.md §6):
 * tall, narrow columns under a 38'-10" tower, the vocal lows as single columns
 * of sixteen 15"s beside the cluster, and the curved cluster hung at 7 ft. Every
 * block keeps its driver count; only its shape and its floor changed.
 *
 * The wall is not symmetric about the centreline: Garcia's main column stands
 * on the left behind him, the piano's two take the right behind Keith, and
 * Garcia's extension stands behind the kit beside Keith (arrays.garciaExtensionPlacement),
 * they are not the same width. The real wall was asymmetric for the same reason.
 */
export const ARRAYS: ArrayBlock[] = [
  // ── Vocals — the curved centre cluster, elevated to clear the band ──────────
  // Scaffold floors above the deck, in metres — the only heights a stack can
  // start from. P[0] is the deck itself.
  //   P0 0.000   P1 2.134   P2 3.912   P3 5.893   P4 7.874   P5 9.855
  // Within a channel the crossover bands stack on each other, so only the
  // bottom band of each tower snaps to a floor.

  // ── Vocals — curved centre cluster on P1, hung clear over the band ────────
  A({ id: 'voc-hf',   channel: 'vocals', band: 'high',     cabinet: 'panelHF', cols: 20, rows: 1, x:  0.00, baseY: 6.452, z: 0, curveRadius: 5.5, explode: [ 0.0, 1.6, 0.9], label: 'Vocal highs, centre — 20 horns' }),
  A({ id: 'voc-um',   channel: 'vocals', band: 'upperMid', cabinet: 'strip5',  cols: 33, rows: 4, x:  0.00, baseY: 5.893, z: 0, curveRadius: 5.5, explode: [ 0.0, 1.1, 0.9], label: 'Vocal upper mids, centre — 132 × 5″ in aluminium strips' }),
  A({ id: 'voc-lm',   channel: 'vocals', band: 'lowerMid', cabinet: 'cab12',   cols: 11, rows: 6, x:  0.00, baseY: 3.912, z: 0, curveRadius: 5.5, explode: [ 0.0, 0.6, 0.9], label: 'Vocal lower mids, centre — 66 × 12″' }),
  // Vocal fill towers flanking the cluster, on the deck — the role of the one
  // cabinet anybody has measured.
  A({ id: 'voc-lmL',  channel: 'vocals', band: 'lowerMid', cabinet: 'cab12',   cols: 3,  rows: 6, x: -3.04, baseY: 0.000, z: 0, curveRadius: 0,   explode: [-0.9, 0.2, 0.7], label: 'Vocal fill, left — 18 × 12″' }),
  A({ id: 'voc-umL',  channel: 'vocals', band: 'upperMid', cabinet: 'panel5',  cols: 6,  rows: 6, x: -3.04, baseY: 1.981, z: 0, curveRadius: 0,   explode: [-0.9, 0.5, 0.7], label: 'Vocal fill mids, left — 36 × 5″' }),
  A({ id: 'voc-hfL',  channel: 'vocals', band: 'high',     cabinet: 'panelHF', cols: 7,  rows: 1, x: -3.04, baseY: 2.819, z: 0, curveRadius: 0,   explode: [-0.9, 0.8, 0.7], label: 'Vocal fill highs, left — 7 horns' }),
  A({ id: 'voc-lmR',  channel: 'vocals', band: 'lowerMid', cabinet: 'cab12',   cols: 3,  rows: 6, x:  3.04, baseY: 0.000, z: 0, curveRadius: 0,   explode: [ 0.9, 0.2, 0.7], label: 'Vocal fill, right — 18 × 12″' }),
  A({ id: 'voc-umR',  channel: 'vocals', band: 'upperMid', cabinet: 'panel5',  cols: 6,  rows: 6, x:  3.04, baseY: 1.981, z: 0, curveRadius: 0,   explode: [ 0.9, 0.5, 0.7], label: 'Vocal fill mids, right — 36 × 5″' }),
  A({ id: 'voc-hfR',  channel: 'vocals', band: 'high',     cabinet: 'panelHF', cols: 7,  rows: 1, x:  3.04, baseY: 2.819, z: 0, curveRadius: 0,   explode: [ 0.9, 0.8, 0.7], label: 'Vocal fill highs, right — 7 horns' }),
  A({ id: 'voc-loL',  channel: 'vocals', band: 'low',      cabinet: 'cab15',   cols: 1,  rows: 16, x: -4.44, baseY: 0.000, z: 0, curveRadius: 0,   explode: [-1.3, 0.0, 0.6], label: 'Vocal lows, left — 16 × 15″' }),
  A({ id: 'voc-loR',  channel: 'vocals', band: 'low',      cabinet: 'cab15',   cols: 1,  rows: 16, x:  4.44, baseY: 0.000, z: 0, curveRadius: 0,   explode: [ 1.3, 0.0, 0.6], label: 'Vocal lows, right — 16 × 15″' }),

  // ── Bass drum — deck level, on the centreline, tucked under the cluster ────
  // Not under the cluster: every photograph shows that space open (qa-findings
  // §7, §10). Sixteen 15"s "in a column" (arrays.kickCount), stood in the one
  // free slot. Where it really stood is not known: PROVENANCE['arrays.kickPosition'].
  A({ id: 'kick',     channel: 'kick',   band: 'full',     cabinet: 'cab15',   cols: 1,  rows: 16, x: -7.35, baseY: 0.000, z: 0, curveRadius: 0, explode: [-2.3, 0, 0.6], label: 'Bass drum — 16 × 15″' }),

  // ── Bass, quadraphonic — sixteen a side, on P1 ───────────────────────────
  A({ id: 'bass1',    channel: 'bass1',  band: 'full',     cabinet: 'cab15',   cols: 1,  rows: 8, x: -8.54, baseY: 2.134, z: 0, curveRadius: 0, explode: [-2.5, 0, 0.4], label: 'Bass, E string — 8 × 15″' }),
  A({ id: 'bass2',    channel: 'bass2',  band: 'full',     cabinet: 'cab15',   cols: 1,  rows: 8, x: -7.93, baseY: 2.134, z: 0, curveRadius: 0, explode: [-2.1, 0, 0.4], label: 'Bass, A string — 8 × 15″' }),
  A({ id: 'bass3',    channel: 'bass3',  band: 'full',     cabinet: 'cab15',   cols: 1,  rows: 8, x:  6.94, baseY: 2.134, z: 0, curveRadius: 0, explode: [ 2.1, 0, 0.4], label: 'Bass, D string — 8 × 15″' }),
  A({ id: 'bass4',    channel: 'bass4',  band: 'full',     cabinet: 'cab15',   cols: 1,  rows: 8, x:  7.55, baseY: 2.134, z: 0, curveRadius: 0, explode: [ 2.5, 0, 0.4], label: 'Bass, G string — 8 × 15″' }),

  // ── Guitars ───────────────────────────────────────────────────────────────
  A({ id: 'weir',     channel: 'rhythmGuitar', band: 'full', cabinet: 'cab12', cols: 2, rows: 10, x: -5.45, baseY: 2.134, z: 0,    curveRadius: 0, explode: [-1.7, 0, 0.5], label: 'Rhythm guitar — 20 × 12″' }),
  A({ id: 'garcia',   channel: 'leadGuitar',   band: 'full', cabinet: 'cab12', cols: 2, rows: 7,  x: -6.60, baseY: 2.134, z: 0,    curveRadius: 0, explode: [-1.7, 0, 0.5], label: 'Lead guitar, main — 14 × 12″' }),
  A({ id: 'garcia-x', channel: 'leadGuitar',   band: 'full', cabinet: 'cab12', cols: 2, rows: 3,  x:  1.60, baseY: 0.000, z: -1.3, curveRadius: 0, explode: [ 0.6, 0, -0.9], label: 'Lead guitar, extension — 6 × 12″' }),

  // ── Piano — 15″ column in one slot, 12″ and 5″ stacked in the next ─────────
  A({ id: 'pno-lo',   channel: 'piano', band: 'low',      cabinet: 'cab15',  cols: 1, rows: 9, x:  5.00, baseY: 2.134, z: 0, curveRadius: 0, explode: [ 1.5, 0.0, 0.5], label: 'Piano lows — 9 × 15″' }),
  A({ id: 'pno-lm',   channel: 'piano', band: 'lowerMid', cabinet: 'cab12',  cols: 3, rows: 4, x:  5.95, baseY: 2.134, z: 0, curveRadius: 0, explode: [ 1.8, 0.0, 0.5], label: 'Piano mids — 12 × 12″' }),
  A({ id: 'pno-um',   channel: 'piano', band: 'upperMid', cabinet: 'panel5', cols: 4, rows: 9, x:  5.95, baseY: 3.455, z: 0, curveRadius: 0, explode: [ 1.8, 0.4, 0.5], label: 'Piano highs — 36 × 5″' }),

  // ── Drums & cymbals — stereo, on P2: the tall flanks of the skyline ───────
  A({ id: 'drm-lmL',  channel: 'drumsL', band: 'lowerMid', cabinet: 'cab12',  cols: 2, rows: 6, x: -9.42, baseY: 3.912, z: 0, curveRadius: 0, explode: [-3.0, 0.0, 0.5], label: 'Drums lower mids, left — 12 × 12″' }),
  A({ id: 'drm-umL',  channel: 'drumsL', band: 'upperMid', cabinet: 'panel5', cols: 5, rows: 8, x: -9.42, baseY: 5.893, z: 0, curveRadius: 0, explode: [-3.0, 0.4, 0.5], label: 'Drums upper mids, left — 40 × 5″' }),
  A({ id: 'drm-hfL',  channel: 'drumsL', band: 'high',     cabinet: 'panelHF',cols: 5, rows: 2, x: -9.42, baseY: 7.011, z: 0, curveRadius: 0, explode: [-3.0, 0.8, 0.5], label: 'Drums highs, left — 10 horns' }),
  A({ id: 'drm-lmR',  channel: 'drumsR', band: 'lowerMid', cabinet: 'cab12',  cols: 2, rows: 6, x:  8.42, baseY: 3.912, z: 0, curveRadius: 0, explode: [ 3.0, 0.0, 0.5], label: 'Drums lower mids, right — 12 × 12″' }),
  A({ id: 'drm-umR',  channel: 'drumsR', band: 'upperMid', cabinet: 'panel5', cols: 5, rows: 8, x:  8.42, baseY: 5.893, z: 0, curveRadius: 0, explode: [ 3.0, 0.4, 0.5], label: 'Drums upper mids, right — 40 × 5″' }),
  A({ id: 'drm-hfR',  channel: 'drumsR', band: 'high',     cabinet: 'panelHF',cols: 5, rows: 2, x:  8.42, baseY: 7.011, z: 0, curveRadius: 0, explode: [ 3.0, 0.8, 0.5], label: 'Drums highs, right — 10 horns' }),
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
    /** Tower above the deck: the drawing's 38'-10" lift chain, measured from the deck. */
    arrayHeight: FT(38 + 10 / 12),
    /** Ground to top of tower: the 10 ft deck plus the 38'-10" tower. */
    totalHeight: FT(48 + 10 / 12),
    /** Ten feet up, bolted and tied into the scaffolding. */
    stageDeckHeight: FT(10),
    /** 1-1/8" T&G plywood over 2x10 planks on 4x6 beams. */
    stageDeckThickness: IN(1.125),
    /** Scaffold tower footprint, straight off the top view. */
    scaffoldFootprint: { width: FT(64), depth: FT(40) },
    /** Deck overhangs the towers 9'-0" each side and 1'-0" downstage. */
    deckOverhang: { side: FT(9), downstage: FT(1) },
    get deck() {
      return {
        width: FT(64) + FT(9) * 2,
        depth: FT(40) + FT(1),
        facingThickness: IN(0.625),
        /** 5/8" ply across the whole front, returning 16 ft down each side. */
        facingReturn: FT(16),
      };
    },
    /** Venue configurations Anderson reports, for the About page. Neither is the drawing. */
    stagingIndoor: { width: FT(76), depth: FT(30) },
    stagingOutdoor: { width: FT(104), depth: FT(40) },
    venue: 'outdoor' as 'indoor' | 'outdoor',
    bandLineZ: 5.2,
    /**
     * How far the speaker faces stand proud of the front plane of the towers.
     * Not documented. A full cabinet depth left the stacks reading as a
     * separate object parked in front of an empty cage; they need to sit IN
     * the structure with their faces just clear of the steel.
     */
    /** Speaker faces just behind the front tubes. See PROVENANCE['dimensions.arrayStandoff']. */
    arrayStandoff: -0.06,
    /** The curved centre cluster stands proud of the steel. */
    clusterStandoff: 0.16,
  },

  structure: {
    /**
     * Straight off the 10 April 1974 tower requirements. Every figure here is
     * from the drawing, not inferred.
     */
    scaffold: {
      /** 6'-6" x 5' end frames: 5 ft across the depth, 6'-6" per lift. */
      frameWidth: FT(5),
      liftHeight: FT(6.5),
      /** 7' X-braces set the bay spacing along the run. */
      bayWidth: FT(7),
      /** The plan closes on a 3'-6" half bay at the centreline, with 9" at each end. */
      closerBay: FT(3.5),
      endMargin: IN(9),
      tubeDiameter: 0.0483,
      guyWireDiameter: 0.006,
      /** Bill of materials, as written on the sheet. */
      bom: {
        tubelocks10ft: 50,
        tubelocks13ft: 50,
        couplers: { std1625x2: 100, adj1625x2: 100, std2x2: 50, adj2x2: 50, adj1625x1625: 25 },
        trusses22ft: 6,
        floorPlanks: { count: 40, section: [IN(2), IN(10)] as const, length: FT(16) },
      },
      /**
       * Scaffold floor levels available above the stage deck, in metres.
       *
       * The lift chain (7'-0" + 5'-10" + 6'-6" x4) measured up from the deck:
       * 7'-0", 12'-10", 19'-4", 25'-10", 32'-4". Cabinets sat on these floors —
       * the winter sheet even annotates which bays got a floor and which did
       * not — so array baseY values snap to this list rather than floating.
       * scripts/verify.mjs checks these against the generated scaffold.
       */
      platformsAboveDeck: [0, FT(7), FT(12 + 10 / 12), FT(19 + 4 / 12), FT(25 + 10 / 12), FT(32 + 4 / 12)],
      /** Rear plane of scaffolding behind the arrays; the footprint is 40 ft deep. */
      rearPlaneZ: -2.4,
    },
    /** The 1973-74 Winter Season tower, drawn at 3/8" = 1'. A smaller, earlier rig. */
    winterTower1973: { height: FT(30), liftHeight: FT(6), bayWidth: FT(5), braceSpan: FT(5), levels: 3 },
    /** Military-surplus shore-power cable. Arm-thick, and a visual feature. */
    cabling: { runDiameter: 0.050, bundleDiameter: 0.14, color: '#0E0E0E' },
    /**
     * Stage-lighting bars on the scaffold, audience-left side; the right is
     * its mirror. x across and y above the deck, metres, as measured on
     * Pechner's photograph; z in front of the front plane. Each bar is a pipe
     * from `from` to `to` with `lamps` cans hung evenly along it, aimed down
     * at the band. See PROVENANCE['structure.lightBars'].
     */
    lightBars: {
      z: 0.35,
      lampDiameter: IN(8),
      lampLength: IN(13),
      bars: [
        { id: 'flat',     from: [-9.8, 6.9], to: [-7.3, 6.9], lamps: 5 },
        { id: 'diagonal', from: [-6.9, 6.9], to: [-4.6, 8.6], lamps: 8 },
        // Indoors only: outdoors the tie-dyes hang there (Oakland, Hollywood Bowl).
        { id: 'ladder1',  from: [-9.2, 7.4], to: [-9.2, 10.2], lamps: 6, indoor: true },
        { id: 'ladder2',  from: [-8.2, 7.4], to: [-8.2, 10.2], lamps: 6, indoor: true },
      ] as { id: string; from: [number, number]; to: [number, number]; lamps: number; indoor?: boolean }[],
    },
    amps: {
      /** MC-2300, W × H × D. */
      size: { w: IN(19), h: IN(10.5), d: IN(17) },
      perRack: 4,
      /**
       * 48 amps. Steve Parish puts "over 70 Mac 2300 amps powering the Wall"
       * (Sotheby's 2021, lots 34-36); that may count spares and the amps used
       * for the band's own rigs. Kept at 48 until something splits the count.
       */
      rackCount: 12,
      /**
       * The amps were individually named and numbered, and the names were on
       * the road cases. Surviving examples: "M-14" (Garcia's), "M-5" (Sotheby's
       * lot 43), "Budman", "Ketchup", "Mustard". The "K" numbers are stencilled
       * inventory numbers, "from a trip to Europe in 1974" (lot 37). Stencilled
       * onto the cases in the model.
       */
      caseNames: ['Budman', 'Ketchup', 'Mustard', 'M-14', 'M-5', 'K14A', 'K18A', 'K27A'],
      /** Later stickers on some cases and amps. See PROVENANCE['materials.stickers']. */
      stickers: true,
      /** Amps sit at deck level behind the arrays. Exact distribution undocumented. */
      z: -2.0,
      meterColor: '#3FA9F5',
      meterEmissiveIntensity: 2.4,
    },
  },

  band: {
    /** Flip the band's marks left-for-right (not the arrays). Off: the marks are measured. */
    mirrored: false,
    members: [
      // Downstage of the Wall, not tucked into it. The first pass put the kit
      // and the piano at z = 1.2 to 2.0, and since a drum kit is a metre and a
      // half deep and a grand is over two metres long, both ended up inside the
      // speaker stacks. verify.mjs now checks every piece of gear against the
      // array footprints.
      //
      // x is measured on Pechner's 17 May 1974 photograph through its solved
      // camera (blender/build_scene.py, shot 'pechner'), at the players' depth.
      // Keith's mark is the centre of the grand, which lay across the stage
      // with its keyboard at the audience's right; he sat at that end, about
      // 1.5 m further right. See PROVENANCE['band.positions'].
      { id: 'garcia',  name: 'Jerry Garcia',    instrument: '"Wolf" — Doug Irwin custom',    x: -4.8,  z: 5.6 },
      { id: 'weir',    name: 'Bob Weir',        instrument: 'Gibson ES-335',                 x: -1.7,  z: 5.6 },
      { id: 'kreutz',  name: 'Bill Kreutzmann', instrument: 'drum kit',                      x: -0.35, z: 4.3 },
      { id: 'lesh',    name: 'Phil Lesh',       instrument: 'Alembic quadraphonic bass',     x:  0.6,  z: 6.15 },
      { id: 'keith',   name: 'Keith Godchaux',  instrument: 'grand piano, 5 Countryman p/u', x:  2.1,  z: 5.0 },
    ],
    /** The 1969 lightning-bolt equipment mark — no skull. Cases only. */
    logo: { id: 'lightningBolt', diameter: IN(5.5), boltPoints: 13, appliedTo: ['roadCases', 'flightCases'] },
  },

  materials: {
    plywood: { baseColor: '#D8B183', roughness: 0.82, metalness: 0.0, wearAmount: 0.55 },
    /** Matte black paint over the same 14-ply birch — the finish on the one surviving cabinet. */
    /**
     * Has to be far darker than it looks here: the plywood grain map multiplies
     * this, and stage lighting lifts the result, so anything above about #1a
     * comes out reading as brown rather than as a black-painted cabinet.
     */
    plywoodBlack: { baseColor: '#1B1A16', roughness: 0.90, metalness: 0.0, wearAmount: 0.7 },
    /**
     * Fraction of cabinets finished black rather than left bare. The one
     * surviving cabinet is black; the photographs show plenty of bare ply. With
     * no way to count, this is a judgement call, and it is the single value
     * that most changes how the wall reads.
     */
    blackFinishRatio: 0.42,
    baffle: { baseColor: '#141414', roughness: 0.94, metalness: 0.0 },
    /** Near-black paper. See PROVENANCE['materials.cone']. */
    cone: { baseColor: '#2A2A2C', roughness: 0.88, metalness: 0.0 },
    /** The T350: grey cast frame, black throat. See PROVENANCE['drivers.hornT350']. */
    hornFrame: { baseColor: '#8A8E91', roughness: 0.55, metalness: 0.8 },
    hornThroat: { baseColor: '#161616', roughness: 0.5, metalness: 0.0 },
    /** The cluster's 5" strips: dull, oxidised aluminium channel (Sotheby's lot 49). */
    stripAluminium: { baseColor: '#8A8E91', roughness: 0.5, metalness: 0.9 },
    /** Brushed aluminium, not chrome: in a dark hall a mirror just reflects the dark. */
    dustCap: { baseColor: '#D2D6DB', roughness: 0.42, metalness: 0.82 },
    surround: { baseColor: '#1C1C1C', roughness: 0.75, metalness: 0.0 },
    /** Bright galvanised tube. See PROVENANCE['materials.steel']. */
    steel: { baseColor: '#A9ADB1', roughness: 0.38, metalness: 1.0 },
    cable: { baseColor: '#0E0E0E', roughness: 0.68, metalness: 0.0 },
    ampGlass: { baseColor: '#0A0A0C', roughness: 0.12, metalness: 0.2 },
    /**
     * The 12s and 15s ran bare — no cloth over the cones. Only the small-cone
     * enclosures were covered, in Courtenay Pollock's tie-dye.
     */
    grilleCloth: null,
    tieDyeGrille: { appliesTo: ['panel5'] as CabinetId[], roughness: 0.95, metalness: 0.0, sheen: 0.3 },
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
    /**
     * How much the generated environment map contributes. Low on purpose: the
     * bright emitters that make the dust caps and the steel read are all high
     * overhead, so a strong ambient from them lands mostly on upward-facing
     * surfaces and turns the stage deck into the brightest thing in the frame.
     */
    hdri: { intensity: 0.55, rotation: DEG(15) },
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

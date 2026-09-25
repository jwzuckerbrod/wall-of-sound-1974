# Wall of Sound (1974) — Reconstruction Spec

**Subject:** the Grateful Dead's touring PA system, in service 23 March – 20 October 1974.
**Purpose:** define every dimension, count, material and placement used by the 3D reconstruction, with a source and a confidence level for each, so that the model can be corrected as better evidence appears.

**Status:** Stage 1 (research + spec). No geometry code written yet.

---

## 1. How to read this document

Every factual claim carries a confidence level:

| Level | Meaning |
|---|---|
| **confirmed** | Stated in two or more independent sources, or in a primary 1974 document, with no contradiction found. |
| **estimated** | Derived by reasoning from confirmed facts, photographs, or standard period hardware. Plausible, not documented. |
| **guessed** | No evidence either way. Chosen because the model needs *a* number. Treat as placeholder. |

**Source hierarchy.** When sources conflict, this is the order of precedence:

1. **The 1974 engineering drawings** — dimensioned, dated, from the crew's own files.
2. **Surviving hardware** — measured or catalogued objects.
3. **Anderson**, *Loud and Clear* — the only book to separate the array from the staging.
4. **The 1974 press spec sheet** — contemporary, but written for journalists.
5. **Trade press** (Mix, Relix) and **encyclopedias**.
6. **Photographs** — used for massing, materials and structure; never for numbers.

Where sources disagree, the disagreement is printed rather than smoothed over. Where the record is genuinely silent, the spec picks the most plausible option, marks it, and moves on.

**Every number in this document also lives in `src/data/wall.config.ts`,** together with its confidence and source ids. Geometry code reads only that file. Correcting history should never mean editing geometry.

---

## 2. Fact-check of the starting brief

The brief supplied nine starting facts. Checked against sources:

| # | Starting claim | Verdict | Correction / nuance |
|---|---|---|---|
| 1 | Designed by Owsley "Bear" Stanley and Dan Healy, with Alembic (Ron Wickersham, Rick Turner, John Curl) and Mark Raizene | **Correct** | Add **Bob Matthews** (sound crew) and **Courtenay Pollock** (the tie-dyed fabric panels that hung on the structure). Raizene is usually credited as "Sparky" Raizene and ran the vocal system. |
| 2 | Debuted 23 March 1974 at the Cow Palace; retired after the October 1974 Winterland run | **Correct, but incomplete** | A prototype of the framework was tested **9 February 1973 at Stanford's Maples Pavilion**, where the tweeters failed during the first number. The 3/23/74 Cow Palace show is the debut of the full touring system. Retirement: the **16–20 October 1974 Winterland** run, filmed for *The Grateful Dead Movie*. The system ran **37 shows** in total. |
| 3 | Roughly 586–604 speakers, mostly JBL, driven by ~48–55 McIntosh MC-2300s, ~26,400 W | **Mostly correct; the amp range and wattage need fixing** | The best-supported figure is **48 McIntosh MC-2300 amplifiers**. The "55" end of the range is not supported anywhere found. Wikipedia carries a second, garbled configuration ("89 300-watt solid-state and three 350-watt vacuum tube amplifiers") — the **89** there is almost certainly the count of **15-inch speakers**, not amplifiers, which matches the itemised 1974 inventory exactly. **Power: both 26,400 W and 28,800 W are widely published.** 48 × 600 W = 28,800 W, which is the *installed* rating; 26,400 W (= 44 × 600) is the figure in the 1974 press spec sheet and is probably the *driven* total, with some amplifiers held as spares or bridged differently. The reconstruction quotes both. |
| 4 | Sat behind the band, so the musicians heard what the audience heard | **Correct** | This is the defining idea. No front-of-house mix position, no wedge monitors; the band mixed itself from the stage. Onstage SPL was reportedly *lower* than in the hall — normal conversation was possible on stage. |
| 5 | Separate subsystems for vocals, Garcia, Weir, bass, piano and drums | **Correct** | Precisely: **six electrically independent systems carried on eleven channels.** See §4. |
| 6 | Lesh's bass ran quadraphonic, each of the four strings on its own channel | **Contested — kept, but flagged** | Wikipedia, McIntosh and most secondary sources say exactly this. The 1974 primary spec sheet describes something subtler: **three pickups**, a quadraphonic encoder, and a digital decoding circuit offering **sixteen quad spatial arrangements** (or eight stereo modes) selected by ten push-buttons. Both can be true — a per-string routing is one of the sixteen selectable arrangements. The reconstruction models **four independent bass channels** and labels them by string, with this caveat in the info panel. |
| 7 | Vocals used paired, phase-cancelling ("differential") microphones | **Correct** | Matched **Brüel & Kjær** condenser pairs, capsules **60 mm apart**, wired in **reverse polarity**, summed by a differential amplifier. The singer's voice hits the top capsule first and survives; everything arriving equally at both — including the Wall itself, 3 m behind — cancels. This is what let the band sing directly in front of 26 kW without feedback. |
| 8 | Two complete systems leapfrogged between cities | **Half right — now resolved** | There was **one sound system and two identical scaffolding sets.** Anderson describes the mechanism: Crew B had the frame standing before Crew A arrived with the PA, then they swapped and repeated. So it was the *staging* that leapfrogged, not a second Wall — which is also why the band was often paying rent on two venues at once. This settles McNally's "two" against Stanley's "three"; Stanley was probably counting crews. |
| 9 | Total weight ~75 tons | **Correct, with a useful split** | **75 tons** is the complete touring load (sound system + stage + scaffolding). The **sound system alone was about 28 tons.** Transport is reported both as "four semi-trailers" and, more specifically, as one 40-ft semi for the system, two flatbeds for stage and scaffolding, and a 24-ft van for lights. Crew **21**; some accounts give ~30 for the full road crew. Assembly: **~4 hours** for the sound system on top of **~4 hours** for the stage supports. Insured value **$250,000**; build cost **>$350,000** in 1974 dollars. |

---

## 3. System inventory and the reconciliation problem

Two inventories circulate. They nearly agree:

**Published summary (most common):**
> 586 JBL speakers (15″, 12″, 5″) + 54 Electro-Voice tweeters = **640 drivers**, in Hard Truckers-style birch plywood cabinets, powered by 48 McIntosh MC-2300s.

**Itemised breakdown (traceable to the 1974 spec sheet):**
> 89 × 15″ · 178 × 12″ · 320 × 5″ · 54 tweeters = **641 drivers** (587 JBL)

These differ by exactly one 15″ driver. No source resolves it.

**Decision:** the reconstruction builds from the **itemised** breakdown, because it is the only one that can actually be laid out, and states the one-driver discrepancy in the About page. The model's own driver count is computed by summing the arrays and asserted against 641 at build time — if someone edits an array count in the config, the check fails loudly rather than silently drifting.

| Driver class | Count | Confidence |
|---|---|---|
| JBL 15″ | 89 | confirmed (itemised source) |
| JBL 12″ | 178 | confirmed (itemised source) |
| JBL 5″ | 320 | confirmed (itemised source) |
| Electro-Voice tweeters | 54 | confirmed |
| **Total** | **641** | — |

JBL model numbers (K140/D140 for 15″, K120/D120 for 12″, LE5 for 5″) are **not** documented in any source found. They are the period-correct candidates, recorded as `estimated`, and used only to drive cone and dust-cap proportions.

The tweeter is no longer a guess. A surviving unit from the crew's own stock, catalogued as *Wall of Sound 1974 Electro-Voice T350*, settles it — this spec previously said T-35. **Electro-Voice T350, confirmed.**

The small cones are catalogued as **4.5-inch** on surviving enclosures, against the 1974 spec sheet's **5-inch**. Both are consistent with a nominal 5″ driver on a ~4.5″ frame, which is what is modelled.

---

## 4. Signal architecture: six systems, eleven channels

| # | Channel | Carried | Crossover | Driver classes |
|---|---|---|---|---|
| 1 | **Vocals** | all vocal mics, summed | 4-way: high / upper-mid / lower-mid / low | tweeters, 5″, 12″, 15″ |
| 2 | **Lead guitar** (Garcia) | Garcia's guitar, full-range | none | 12″ only |
| 3 | **Rhythm guitar** (Weir) | Weir's guitar, full-range | none | 12″ only |
| 4 | **Piano** (Godchaux) | 5 Countryman pickups, one per frame division, each with its own volume control | 3-way | 5″, 12″, 15″ |
| 5 | **Bass drum** | kick only | none | 15″ only |
| 6–7 | **Drums & cymbals L / R** | snare, toms, cymbals, in stereo | 3-way: high / upper-mid / lower-mid | tweeters, 5″, 12″ |
| 8–11 | **Bass ×4** | Lesh's quadraphonic bass, four channels | none | 15″ only |

**Confirmed from the 1974 spec sheet:** the four-band vocal crossover; the curved centre cluster for vocal highs and mids giving "cylindrical" dispersion of 140–180° horizontal; vocal lows in a column; the piano's three-way split with highs and mids in a cluster of 5″ and 12″ and lows in a column of 15″; the five Countryman pickups; **sixteen 15″ speakers in a column for the bass drum**; the drums' three-way stereo split with identical columns left and right; and **columns of twenty 12″ speakers for each guitar**, with Garcia's extension cabinets placed beside Godchaux and behind Kreutzmann.

**Contradiction noted:** Mix reports "Garcia and Weir: 30 cabinets combined" and "Lesh: 16 cabinets a side." The 1974 spec sheet's "twenty each" (= 40 combined) is preferred as the earlier and more specific source; Mix's "16 a side" for Lesh is adopted because the spec sheet gives no bass count.

---

## 5. Allocation of drivers to arrays

The published totals are firm; the split between arrays is not documented. The allocation below is the reconstruction's own, chosen so that every array count is either sourced or plausible **and the four class totals land exactly on the published inventory.** Each row is flagged.

| Array | Channel | Drivers | Layout | Confidence |
|---|---|---|---|---|
| Vocal centre cluster — high | vocals | 20 × tweeter | 20 cols × 1, curved | estimated |
| Vocal centre cluster — upper-mid | vocals | 120 × 5″ | 20 cols × 6, curved | estimated |
| Vocal centre cluster — lower-mid | vocals | 66 × 12″ | 11 cols × 6, curved | estimated |
| Vocal fill L / R — high | vocals | 14 × tweeter | 7 cols × 1 per side | estimated |
| Vocal fill L / R — upper-mid | vocals | 84 × 5″ | 6 cols × 7 per side | estimated |
| Vocal fill L / R — lower-mid | vocals | 36 × 12″ | 3 cols × 6 per side | estimated (**this is the role of the measured cabinet**) |
| Vocal low L / R | vocals | 32 × 15″ | 2 cols × 8 per side | estimated |
| Bass ch.1–4 | bass | 32 × 15″ | 4 columns of 8, 16 a side | estimated (count from Mix) |
| Bass drum | kick | 16 × 15″ | 4 × 4, at deck level under the cluster | **confirmed (count)** |
| Piano low | piano | 9 × 15″ | 1 col × 9 | estimated |
| Piano mid | piano | 12 × 12″ | 3 cols × 4 | estimated |
| Piano high | piano | 36 × 5″ | 4 cols × 9 | estimated |
| Garcia main | lead gtr | 14 × 12″ | 2 cols × 7 | estimated |
| Garcia extension | lead gtr | 6 × 12″ | 2 cols × 3, set back 1.6 m | estimated (placement confirmed) |
| Weir | rhythm gtr | 20 × 12″ | 2 cols × 10 | **confirmed (count)** |
| Drums L / R — high | drums | 20 × tweeter | 5 cols × 2 per side | estimated |
| Drums L / R — upper-mid | drums | 80 × 5″ | 5 cols × 8 per side | estimated |
| Drums L / R — lower-mid | drums | 24 × 12″ | 2 cols × 6 per side | estimated |

Class totals: **15″ 32+32+16+9 = 89** · **12″ 66+36+24+12+14+6+20 = 178** · **5″ 120+84+80+36 = 320** · **tweeters 20+14+20 = 54**. ✔ Verified by running `inventoryFromArrays()`.

The vocal system splits into a **curved centre cluster** plus **two flanking fill towers** — which is both what the photographs show and what gives Anderson's measured cabinet somewhere to live, since it is described as a vocal *fill*.

Vocals alone account for 372 of 641 drivers — 58% of the system. That matches every account that calls the vocal system the best and biggest part of the Wall.

---

## 6. Overall dimensions and coordinate frame

**Coordinate frame:** right-handed, metres, **+Y up**, **+Z toward the audience**, **+X to the audience's right**. Origin at the centre of the stage deck surface, on the plane of the wall's front face.

**A correction that changed the whole layout.** Earlier drafts of this spec put the wall at 29 m (95 ft) wide, following Mix and Relix's "roughly 98 feet across" and "nearly 100 feet wide." Anderson separates two things every other source conflates:

> the **speaker array** was **sixty feet end to end**, while the **full staging and scaffolding** measured **76 × 30 ft indoors and over 100 × 40 ft outdoors.**

Every "nearly 100 feet" figure in circulation is the outdoor *staging footprint*, not the wall of speakers. The array layout was rebuilt to fit 60 ft, which made the columns taller and much more densely packed — which is, of course, exactly what a line-array designer would do, and what the photographs show.

### The drawings

Four lots of **original scaffolding and stage drawings from Steve Parish's collection** came up at Julien's Auctions in April 2026. Three are duplicate prints of the same sheet — *"Detail: Grateful Dead P.A. Tower, 1973-74 Winter Season, scale 3/8" = 1'"* — an isometric of a three-level tower with the annotations *"floor in back only, 2nd level"* and *"omit floor in 5' bay, 3rd level"*, dimensioned **30'** tall on standard **6' frames, 5' X-braces, 5' bays**.

The fourth, **lot 71, is the one that matters**: two sheets for the **1974 Summer Tour, dated 10 April 1974**, at **¼" = 1'-0"** — a **top view**, a **stage left view**, and written **tower** and **stage requirements**. This is the mature Wall, drawn three weeks after it debuted. It is now the top of the source hierarchy for anything structural.

| Quantity | Value | Confidence | Note |
|---|---|---|---|
| **Scaffold footprint** | **19.51 × 12.19 m (64'-0" × 40'-0")** | **confirmed — drawing** | Dimensioned on the top view. Width chain: 9" + 5'-0" + 7'-0" bays + a 3'-6" closer at the centreline, mirrored. Depth chain: 5, 4, 5, 5, 5, 5, 5, 5, 1 = 40'-0". |
| **Total height** | **11.84 m (38'-10")** | **confirmed — drawing** | Stage left view, as a chain: 7'-0" + 5'-10" + four lifts of 6'-6". This is the real number behind "36 feet" and "over three stories". |
| Speaker array width | 18.29 m (60 ft) documented; **18.96 m (62.2 ft)** as packed | confirmed / packed within 4% | **The check that landed:** the layout was built to Anderson's 60 ft before these drawings surfaced, and 62.2 ft drops inside a 64 ft tower footprint with room for the end frames. Two independent sources, derived separately, agree. |
| Tower above the deck | 8.79 m (28'-10") | derived from the drawing | Model's tallest array tops out at 7.56 m, leaving ~1.2 m of bare scaffolding above — which is what the photographs show. |
| **Stage deck height** | **3.05 m (10 ft)** | **confirmed** | Bolted and tied into the scaffolding, because sound pressure could bounce the rig a foot. Anderson says one-inch plywood; the drawing specifies **1⅛" T&G over 2×10 planks on 4×6 beams**, so the drawing wins. Previously guessed at 5 ft. |
| **Deck size** | **25.0 × 12.5 m (82 × 41 ft)** | **confirmed — drawing** | Stage requirements note 3: the deck overhangs the towers by **9'-0" stage left and right** and **1'-0" downstage**. |
| Staging footprint, indoor | 23.2 × 9.1 m (76 × 30 ft) | confirmed | Anderson. A different venue configuration from the drawing. |
| Staging footprint, outdoor | 31.7 × 12.2 m (104 × 40 ft) | confirmed | Anderson. **The 40 ft depth matches the drawing exactly.** |
| Band standing line | 3.0 m in front of the wall face | estimated | Consistent with the 60 mm differential mic pair working at that distance, and with photographs. |
| Total weight | 75 tons complete / ~28 tons sound system | confirmed | Displayed as text only. |
| Onstage SPL | 120 dB | confirmed | **Contradicts Mix**, which reports onstage levels *lower* than in the hall and normal conversation being possible. Anderson reports meters regularly at 120 dB and lasting hearing damage across the band and crew. Both are shown; they may describe different moments in a show. |

---

## 7. Array placement (audience view, left → right)

Heights are above the stage deck, which is itself 10 ft above the ground.

**Stacks stand on scaffold floors, not on thin air.** The lift chain puts floors at **0, 0.86, 2.85, 4.83 and 6.81 m above the deck** (the deck itself, then 2'-10", 9'-4", 15'-10", 22'-4"). Every array's bottom band snaps to one of those; the crossover bands above it stack on the cabinets below. The winter sheet's annotations — *"floor in back only, 2nd level"*, *"omit floor in 5' bay, 3rd level"* — are the crew thinking in exactly these terms. `scripts/verify.mjs` fails the build if any block starts anywhere else.

| x (m) | Array | Floor | Base → top (m) |
|---|---|---|---|
| −9.42 | Drums stereo **LEFT** — 12″ ×12, then 5″ ×40, then 10 horns | P2 | 2.85 → 8.35 |
| −8.54 / −7.93 | Bass quad **ch.1 / ch.2** (15″ × 8 each) | P1 | 0.86 → 5.74 |
| −7.04 | **Piano** mids (12″ ×12) with highs (5″ ×36) above | P1 | 0.86 → 5.01 |
| −6.15 | **Piano** lows (15″ × 9) | P1 | 0.86 → 6.35 |
| −5.45 | **Weir** rhythm guitar (12″ × 20) | P1 | 0.86 → 6.96 |
| −4.44 | **Vocal low LEFT** (15″ × 16) | deck | 0 → 4.88 |
| −3.04 | **Vocal fill LEFT** — 12″ ×18, 5″ ×42, 7 horns | P1 | 0.86 → 6.01 |
| 0 | **Vocal centre cluster** — curved, 4.50 m wide: 12″ ×66, 5″ ×120, 20 horns | P2 | 2.85 → 7.81 |
| 0 | **Bass drum** (15″ × 16, 4 × 4), at deck level beneath the cluster | deck | 0 → 2.44 |
| +3.04 | **Vocal fill RIGHT** | P1 | 0.86 → 6.01 |
| +4.44 | **Vocal low RIGHT** (15″ × 16) | deck | 0 → 4.88 |
| +5.45 | **Garcia** main (12″ × 14) | P1 | 0.86 → 5.13 |
| +6.24 | **Garcia extension** (12″ × 6), set back 1.6 m | deck | 0 → 1.83 |
| +6.94 / +7.55 | Bass quad **ch.3 / ch.4** (15″ × 8 each) | P1 | 0.86 → 5.74 |
| +8.42 | Drums stereo **RIGHT** | P2 | 2.85 → 8.35 |

The skyline that falls out of this — tall flanks either side of a lower, raised, curved centre cluster — is the silhouette in the 1974 photographs, which is some corroboration for a layout that is otherwise the reconstruction's own.

Blocks butt together with no gap. **The wall is not symmetric about the centreline** — the piano takes two slots on the left, Garcia's main column and his extension take two on the right, and they are not the same width. The real wall was asymmetric for the same reason: it was assembled from what each channel needed, not drawn on a grid.

All array x-positions are **estimated**; the 60 ft envelope they pack into is **confirmed**. No plan drawing of the Wall has been found, and the arrangement varied between venues.

**Vocal centre cluster geometry:** convex arc, radius 5.5 m, opening toward the audience, spanning 4.50 m of arc (≈47°). This is the documented "curved... for cylindrical dispersion, 140–180° horizontal" element and the single most recognisable feature of the Wall. Its underside sits at 2.60 m, clearing the band and the bass-drum column tucked beneath it.

**The vertical split.** Anderson records something none of the other sources state plainly: **the lower half of the Wall fed the musicians onstage and the upper half threw to the crowd.** The PA *was* the monitoring — there were no wedges at all. This drives the "how it worked" overlay in stage 5, which shades each array by height rather than by channel.

---

## 8. Cabinet taxonomy

### The one cabinet anybody has measured

Almost every dimension in this document is inferred. One is not. Brian Anderson bought a cabinet at the 2021 Sotheby's sale of the Dead's Northern California warehouse — the lot with the lowest starting price — and measured it:

| | |
|---|---|
| Size | **31 × 22.5 × 24 in** |
| Weight | 64 lb |
| Construction | **14-ply laminated Finnish birch, painted matte black** |
| Drivers | two 12″ JBLs, plus two small drivers |
| Marking | stamped **JUL 17 1974**, with *G. DEAD* handwritten on the back of the surviving cone |
| Role | vocal fill |

This is the only hard cabinet measurement in the whole record, and everything else in the taxonomy is now proportioned against it.

### Two competing rules, and which wins

Owsley specified cabinet proportions using **the cube root of two** as the multiplier between depth, width and height — depth : width : height = 1 : 2^⅓ : 2^⅔. That is a documented design maxim. But 31 × 22.5 × 24 in does not follow it.

**Measurement beats maxim.** `useCubeRootRule` now defaults to **false** and the explicit sizes below are used. The rule stays switchable, because it may still describe the cabinets nobody has measured.

| Type | Drivers | W × H × D (in) | W × H × D (m) | Confidence |
|---|---|---|---|---|
| `cab12x2` | 2 × 12″ | **31 × 24 × 22.5** | 0.787 × 0.610 × 0.572 | **confirmed — measured** |
| `cab12` | 1 × 12″ | 15.5 × 24 × 22.5 | 0.394 × 0.610 × 0.572 | estimated (half the measured width) |
| `cab15` | 1 × 15″ | 24 × 24 × 22.5 | 0.610 × 0.610 × 0.572 | estimated (measured depth and height, widened for the driver) |
| `panel5` | 5″ grid in a shared baffle | 8.9 pitch, 22.5 deep | 0.225 pitch | estimated |
| `panelHF` | EV horns in a shared baffle | 8.9 pitch, 9.8 deep | 0.225 pitch | estimated |

The measured cabinet's squarer front also settles the caveat in the previous draft: photographs *did* show squarer fronts than the 2^⅓ rule produces, and now there is a measurement saying so.

The 5″ and tweeter sections are modelled as **shared baffle panels with drilled driver arrays**, not as discrete boxes — this is what the close-up photographs show: large black baffle boards with rows of circular cutouts and, above them, rectangular horn mouths.

---

## 9. Materials — what the photographs actually show

This matters, because one common assumption is wrong.

- **No grille cloth over the 12s and 15s.** Those drivers are **exposed**: visible cones, visible surrounds, bright aluminium dust caps, visible mounting screws. Any reconstruction with black grille cloth over them is wrong.
- **Tie-dye: on the structure, not over the wall's drivers.** Surviving Hard Truckers enclosures from the crew's stock are catalogued as *small plywood enclosure with 4.5-inch speaker and tie-dye grille cloth*, and an earlier draft of this spec read that as cloth over the 5-inch sections of the arrays.

  **On reflection that over-reads the catalogue.** The close-up photographs of the Wall itself plainly show the 5-inch sections as a large black baffle board with bare drilled cutouts and visible cones — no cloth. The catalogued enclosures are small standalone boxes and are not dated to the Wall; they may be monitors or later Jerry Garcia Band gear. Where a photograph of the object and an auction description of a different object disagree, the photograph wins.

  So: **the arrays ran bare, and Pollock's tie-dye hangs on the scaffolding** — behind and beside the towers — which is both documented and unmistakable in the wide shots. Modelled that way.
- **Cabinet carcasses: 14-ply laminated Finnish birch.** The finish varied. The one surviving cabinet is **painted matte black all over**; photographs elsewhere on the wall clearly show **bare plywood frames** around black baffles. Both are modelled and mixed across the arrays (`materials.blackFinishRatio`, default 0.55). All of them are road-worn — scuffed edges, adhesive residue, darkened corners and handles, visible plies where the paint has gone.
- **Baffle boards: matte black**, flat. Where the carcass is left bare, the black-face / pale-body contrast is the Wall's signature read at distance.
- **Cones:** paper, mid-grey to grey-blue in colour film, with a **specular aluminium dust cap** that catches stage light — the reason the Wall reads as hundreds of points of light in photographs. This is the single most important material to get right.
- **Scaffolding: galvanised steel tube-and-clamp**, standard period frames, plus a dense web of **diagonal guy wires** crossing in front of and between the arrays. The wires are structurally and visually essential; photographs are full of them.
- **Cabling: arm-thick.** Not a detail — a visual feature. The crew found that nothing lighter would carry the current, and wired the Wall with **military-surplus cable originally made for connecting docked ships to shore power.** Modelled at 50 mm per run, gathered into 140 mm bundles at deck level.
- **McIntosh MC-2300s:** black glass front panels, **glowing blue illuminated power meters**, gold-anodised lettering, chrome-and-black chassis, racked at stage level behind and beneath the arrays. 128 lb each. **The amps were named**, and the names were painted on the road cases — surviving examples include *Budman* (Garcia's), *M-14*, *Ketchup* and *Mustard*. Stencilled onto the cases in the model; it is the kind of detail that tells a visitor this was a working rig, not a product.

---

## 10. Structure

Everything in this section except the last two rows is now transcribed from the 10 April 1974 sheet rather than inferred.

**Tower requirements, as written:**

1. Built with **6'-6" × 5' end frames and 7' X-braces**
2. **50** 10' tubelocks · **50** 13' tubelocks
3. **275 couplers**: 100 1⅝×2" std · 100 1⅝×2" adj · 50 2×2" std · 50 2×2" adj · 25 1⅝×1⅝" adj
4. **6** 22' trusses
5. End frames must be **sprocketed and pinned**
6. **40** 2"×10"×16' planks used as floors

**Stage requirements, as written:**

1. Built with **5'×5' end frames, 5' X-braces, 7' X-braces, screwjacks, base plates**
2. Deck built with **4×6 beams, 2×10 planks, 1⅛" T&G plywood**
3. Deck overhangs scaffolding **stage left and right by 9'** and **downstage by 1'-0"**
4. **"X" areas in the drawing show the location of towers which continue up after the deck is down** — i.e. the plan's X-braced bays are where the speaker towers rise
5. **⅝" plywood facing** across the entire front and **16' back on both stage left and stage right**

| Item | Value | Confidence |
|---|---|---|
| Scaffold end frames | 6'-6" high × 5'-0" wide | **confirmed — drawing** |
| Scaffold bay (X-brace span) | 7'-0", closing on a 3'-6" half bay at the centreline | **confirmed — drawing** |
| Deck construction | 4×6 beams, 2×10 planks, 1⅛" T&G ply, ⅝" ply facing | **confirmed — drawing** |
| Deck overhang | 9'-0" each side, 1'-0" downstage | **confirmed — drawing** |
| Scaffolding sets | 2, leapfrogging ahead of a single sound system | confirmed (Anderson) |
| Scaffold tube diameter | 48.3 mm | estimated (standard) |
| Guy-wire diameter | 6 mm | guessed |

**Two guesses that turned out right:** this config had already set the bay at 7 ft and the lift at 6 ft 6 in from standard period scaffolding practice. The drawing says 6'-6" × 5' frames and 7' X-braces. They stay, now marked confirmed.

The deck was tied into the scaffolding for a reason worth putting in an info panel: at full tilt the sound pressure could **bounce the entire rig by as much as a foot.**

---

## 11. Stage context

Modelled to give the PA a place to stand, deliberately understated so it never competes with the Wall.

- **Stage deck:** plank-over-steel, 12 m deep, with a dark skirt.
- **The instruments are deliberately not modelled.** A first attempt produced generic primitive shapes that cost the reconstruction more credibility than they added — see `docs/qa-findings.md` §5. What is on the stage is the furniture that is both documented and legible at this scale: the paired vocal microphones, and road cases carrying the 1969 stencil. The instruments that *were* there in 1974 are listed below for the record, not because they are in the model.
- **Band gear, 1974-correct, for the record:**
  - **Jerry Garcia** — "Wolf", the Doug Irwin custom (in use from late 1973; the wolf was a sticker in 1974, inlaid later).
  - **Bob Weir** — Gibson ES-335, with an Alembic parametric EQ and an Eventide digital delay in his rack.
  - **Phil Lesh** — Alembic quadraphonic bass. Lesh had two in 1974; the second, "Mission Control" (serial 74 00008, built by Rick Turner), from 16 June 1974. The earlier one is the right choice for a March–May scene, the later for the Winterland scene.
  - **Keith Godchaux** — grand piano with five Countryman pickups, one per frame division.
  - **Bill Kreutzmann** — drum kit, centre, upstage.
- **Band positions**, audience view left → right: **Weir · Lesh · Kreutzmann (upstage centre) · Godchaux · Garcia.** Marked **estimated** and exposed in the config as a single `mirrored` boolean, because the record found does not settle which side Garcia stood on in 1974 and it varied. Flipping it is a one-line change.
- **Logos.** The mark sprayed on the band's gear was the **lightning bolt alone** — a 5½" white circle, red half and blue half, split by a jagged white bolt. **No skull.** Owsley Stanley's own account (`bear`) says Ernie Fischbach cut it as a single half-circle stencil with a jagged edge, sprayed red, turned over and sprayed blue, and that "we put it on to all our gear" in 1969; his page shows a toolbox still carrying it. The bolt outline in the model is traced from Bob Thomas's drawing of it, red above and blue below as Stanley describes. The skull-and-bolt was a later design by Bob Thomas, and no source found puts it on the equipment, so it is not used. Applied only to the road cases, at its true 5½" size. It is **not** placed as a backdrop banner or on the speaker cabinets, for which no evidence was found. The evidence is from 1969; nothing found says the mark had changed by 1974.
- **Arena:** suggested only — a dark bowl of raked seating and a hint of roof structure, unlit, low detail, fading into black. Enough to give scale, not enough to draw the eye.

---

## 12. Open questions, flagged

1. **586 vs 587 JBL drivers.** Unresolved; the model carries 587 and says so.
2. **26,400 W vs 28,800 W.** Both quoted; the model shows both and explains the arithmetic.
3. **Per-string bass channels.** Popular account vs the 1974 spec sheet's selectable quad matrix. Both quoted.
4. **Which side Garcia stood on.** Not settled here; `band.mirrored` flips it.
5. **Array left-to-right order.** The 1974 top view dimensions the tower grid but does not label which channel stood where. The order above is a reconstruction consistent with photographs, not a documented arrangement. **This remains the largest single piece of invention in the model** and the About page will say so plainly. The 64 ft grid it packs into *is* documented, bay by bay.
6. **Allocation of drivers to arrays.** The four class totals are historical and asserted at startup. Which array got which share is mostly the reconstruction's own. Confirmed: 16 × 15″ for the bass drum, 20 × 12″ per guitar, 16 bass cabinets a side.
7. **Cabinet dimensions other than the measured one.** `cab12x2` is measured. `cab12` and `cab15` are proportioned from it.
8. **Onstage SPL.** 120 dB (Anderson) against "quieter than the hall, you could hold a conversation" (Mix). Both are stated; no attempt is made to reconcile them.
9. **Amplifier rack placement.** Photographs show amps at deck level; the exact distribution across the 48 is not documented.
10. **The ramp onto the stage.** Removed along with first-person walk mode. It was on no drawing and existed only so a walker could climb onto the deck.
11. **How far the stacks stand proud of the steel.** Not documented. Set to a little over one cabinet depth, because the photographs plainly show stacks in front of the structure rather than inside it.

**Resolved since the first draft, by Anderson:** the wall's width (60 ft of speakers, not 100 — that was the staging); the stage deck height (10 ft, previously guessed at 5); and the leapfrogging question (one system, two scaffolding sets).

**Resolved since the second draft, by the 1974 drawings:** the scaffold footprint (64 × 40 ft), the overall height (38'-10"), the frame and bay sizes (6'-6" × 5' frames, 7' X-braces), the deck build-up and its 9 ft overhangs, and the full bill of materials. Plus, from surviving hardware: the tweeter is an Electro-Voice **T350**, and the small-cone panels were **covered in tie-dye**.

**What the drawings still do not tell us:** which channel occupied which bay. That is the one thing a plan view could have settled and doesn't — it dimensions the steel, not the speakers.

**A finding from building it (stage 2).** 641 drivers of these sizes **cannot fill a 60 × 29 ft face.** Add up the baffle area — 89 fifteens at 0.37 m², 178 twelves at 0.24 m², 320 fives at 0.043 m², 54 horns — and you get about 92 m² of speaker in a 157 m² opening. **Roughly 58% coverage, and 42% open scaffolding, is not a modelling failure — it is arithmetic.** The photographs agree: the Wall is a set of dense stacks with structure showing between and above them, not a solid plane of cones. Any reconstruction that shows an unbroken wall of speakers has either invented drivers or shrunk the frame.

---

## 13. Sources

| id | Source |
|---|---|
| `blueprints` | **Original Grateful Dead scaffolding and stage drawings**, from the collection of "Big Steve" Parish — Julien's Auctions, *Treasures From The Golden Road*, 22 April 2026. Lots 53 / 57 / 60: *Detail: Grateful Dead P.A. Tower, 1973-74 Winter Season*, 3/8"=1'. Lot 71: **1974 Summer Tour, dated 10 April 1974**, ¼"=1'-0" — top view, stage left view, and written tower and stage requirements. **Primary engineering documents. Top of the hierarchy for anything structural.** https://www.juliensauctions.com/en/items/2208457/grateful-dead-1974-summer-tour-wall-of-sound-scaffolding-blueprints |
| `juliens` | **Surviving hardware** from the same sale: lot 72, *Wall of Sound 1974 Electro-Voice T350 tweeter*; lots 276/277, Hard Truckers small plywood enclosures with 4.5-inch speaker and tie-dye grille cloth; lots 58/62/69/70, McIntosh MC2300s and their named road cases. |
| `anderson` | **Brian Anderson, *Loud and Clear* (2025), ch. 1 "The Artifact"** — supplied by the project owner. The highest-quality dimensional source found: it is the only one that separates the speaker array from the staging, the only one that gives the stage deck height, and the only one describing a surviving cabinet measured in hand. Where it disagrees with a trade-press figure, it wins. |
| `wiki` | Wikipedia, *Wall of Sound (Grateful Dead)* — https://en.wikipedia.org/wiki/Wall_of_Sound_(Grateful_Dead) |
| `mcintosh` | McIntosh Laboratory, *McIntosh and the Grateful Dead's Wall of Sound* — https://www.mcintoshlabs.com/about/news/mcintosh-and-the-grateful-deads-wall-of-sound |
| `deadsources74` | *Grateful Dead Sources*, "1974: Wall of Sound Technical Specs" — the 1974 press spec sheet — http://deadsources.blogspot.com/2012/12/1974-wall-of-sound-technical-specs.html |
| `deadsources22` | *Grateful Dead Sources*, "September 1974: The Wall of Sound" — https://deadsources.blogspot.com/2022/02/september-1974-wall-of-sound.html |
| `mixtest` | Mix, *Testing the Grateful Dead's Wall of Sound* — https://www.mixonline.com/live-sound/grateful-dead-wall-of-sound-test |
| `mixrebuild` | Mix, *Bringing the Grateful Dead's Wall of Sound Back to Life* — https://www.mixonline.com/live-sound/live-gear/bringing-the-grateful-deads-wall-of-sound-back-to-life |
| `owsinski` | Bobby Owsinski, *There's Never Been Anything Like It* — https://bobbyowsinskiblog.com/grateful-dead-wall-of-sound/ |
| `mayberry` | John Mayberry, *The Grateful Dead's Wall of Sound vs. the Line Array* — https://www.linkedin.com/pulse/grateful-deads-wall-sound-vs-line-array-john-mayberry |
| `relix` | Relix, *Loud and Clear: A New Look at the Grateful Dead's Epic Wall of Sound* — https://relix.com/features/detail/loud-and-clear-a-new-look-at-the-grateful-deads-epic-wall-of-sound |
| `upa` | Underground PA, *The Wall of Sound* — https://undergroundpa.substack.com/p/the-wall-of-sound-1970s-sound-system |
| `mc2300` | Wikipedia, *McIntosh MC-2300* — https://en.wikipedia.org/wiki/McIntosh_MC-2300 |
| `syf` | Wikipedia, *Steal Your Face* — https://en.wikipedia.org/wiki/Steal_Your_Face |
| `bear` | Owsley Stanley, *GD Logo* — how the 1969 equipment stencil was designed, cut and sprayed, with a photograph of a stencilled toolbox. http://www.thebear.org/GDLogo.html (archived: https://web.archive.org/web/2012/http://www.thebear.org/GDLogo.html) |
| `photos` | Photographic record: Richard Pechner (rpechner.com); Ken West; the 1974 galleries at vintag.es and designyoutrust.com; dead.net 1974 archive. Used for massing, materials, driver exposure and structure — not for numbers. |

**Explicitly not used as a source for any number:** Grokipedia's entry, which asserts "four towering stacks at 45°" and a "15 ms delay" that no other source supports. Noted here only so the omission is deliberate and on the record.

---

## 14. Build plan (stages 2–7)

| Stage | Deliverable | Gate |
|---|---|---|
| 2 | Grey-box geometry at true scale from the config — every array and cabinet, plus **the scaffold built to the 10 April 1974 drawing**: a 64 × 40 ft grid of 6'-6" × 5' frames on 7 ft bays closing on a 3'-6" half bay, the deck at 10 ft with its 9 ft overhangs, towers rising from the X-braced bays. Untextured. Orbit camera, a 1.75 m figure for scale, and an on-screen driver count that must read 641. | Screenshots |
| 3 | Materials and lighting — PBR, HDRI, worn birch, black baffles, specular dust caps, steel, glowing McIntosh meters. Soft shadows, AO, subtle bloom, all tier-switchable. | Screenshots |
| 4 ✔ | Navigation — orbit and an eight-stop guided tour (first-person walk was built, then removed). Mouse, touch and full keyboard; `prefers-reduced-motion` respected; tour text in a live region and complete without the picture. | Live build |
| 5 ✔ | Hover or pick any array for a panel giving what it carried, its speaker count, its confidence and its sources; a keyboard-reachable list of all 28 arrays; exploded view; channel overlay with isolation; the band's gear at true size; an About page generated from `PROVENANCE` so it cannot drift from the model. | Live build |
| 6 | Performance — instancing audit, LOD, mobile tier, loading screen with progress, budget check (60 fps target, < 5 MB initial). | Numbers |
| 7 | Deploy. | Link |

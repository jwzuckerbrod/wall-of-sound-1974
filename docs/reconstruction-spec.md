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

Specific JBL model numbers (K140/D140 for 15″, K120/D120 for 12″, LE5 for 5″; Electro-Voice T-35 horns) are **not** documented in any source found. They are the period-correct candidates and are recorded in the config as `estimated`, used only to drive cone/dust-cap proportions — nothing in the visual reconstruction depends on the model number being right.

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

| Quantity | Value | Confidence | Note |
|---|---|---|---|
| Speaker array width | 18.29 m (60 ft) documented; **18.96 m (62.2 ft)** as packed | confirmed / packed within 4% | The model's blocks butt together and come to 62.2 ft. |
| Speaker envelope height | 8.0 m (26 ft) above the deck; model tops out at 7.56 m | estimated | |
| **Stage deck height** | **3.05 m (10 ft)** | **confirmed** | One-inch plywood floor, ten feet up, bolted and tied into the scaffolding — because sound pressure could bounce the whole rig by as much as a foot. Previously guessed at 5 ft. |
| Total height above ground | 10.61 m (34.8 ft) | derived | Against "36 feet high" and "over three stories tall". ✔ |
| Staging footprint, indoor | 23.2 × 9.1 m (76 × 30 ft) | confirmed | |
| Staging footprint, outdoor | 31.7 × 12.2 m (104 × 40 ft) | confirmed | The scene builds the outdoor footprint by default. |
| Band standing line | 3.0 m in front of the wall face | estimated | Consistent with the 60 mm differential mic pair working at that distance, and with photographs. |
| Total weight | 75 tons complete / ~28 tons sound system | confirmed | Displayed as text only. |
| Onstage SPL | 120 dB | confirmed | **Contradicts Mix**, which reports onstage levels *lower* than in the hall and normal conversation being possible. Anderson reports meters regularly at 120 dB and lasting hearing damage across the band and crew. Both are shown; they may describe different moments in a show. |

---

## 7. Array placement (audience view, left → right)

Heights are above the stage deck, which is itself 10 ft above the ground.

| x (m) | Array | Base → top (m) |
|---|---|---|
| −9.42 | Drums stereo **LEFT** — 12″ ×12, then 5″ ×40, then 10 horns | 0 → 5.50 |
| −8.54 / −7.93 | Bass quad **ch.1 / ch.2** (15″ × 8 each) | 0 → 4.88 |
| −7.04 | **Piano** mids (12″ ×12) with highs (5″ ×36) above | 0 → 4.15 |
| −6.15 | **Piano** lows (15″ × 9) | 0 → 5.49 |
| −5.45 | **Weir** rhythm guitar (12″ × 20) | 0 → 6.10 |
| −4.44 | **Vocal low LEFT** (15″ × 16) | 0 → 4.88 |
| −3.04 | **Vocal fill LEFT** — 12″ ×18, 5″ ×42, 7 horns | 0 → 5.15 |
| 0 | **Vocal centre cluster** — curved, 4.50 m wide: 12″ ×66, 5″ ×120, 20 horns | 2.60 → 7.56 |
| 0 | **Bass drum** (15″ × 16, 4 × 4), at deck level beneath the cluster | 0 → 2.44 |
| +3.04 | **Vocal fill RIGHT** | 0 → 5.15 |
| +4.44 | **Vocal low RIGHT** (15″ × 16) | 0 → 4.88 |
| +5.45 | **Garcia** main (12″ × 14) | 0 → 4.27 |
| +6.24 | **Garcia extension** (12″ × 6), set back 1.6 m | 0 → 1.83 |
| +6.94 / +7.55 | Bass quad **ch.3 / ch.4** (15″ × 8 each) | 0 → 4.88 |
| +8.42 | Drums stereo **RIGHT** | 0 → 5.50 |

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

- **No grille cloth on the speaker faces.** The drivers are **exposed**: visible cones, visible surrounds, bright aluminium dust caps, visible mounting screws. Any reconstruction with black grille cloth over the drivers is wrong. (Tie-dyed fabric by Courtenay Pollock hung on parts of the *structure* — behind and beside the arrays, and across the back — not over the drivers.)
- **Cabinet carcasses: 14-ply laminated Finnish birch.** The finish varied. The one surviving cabinet is **painted matte black all over**; photographs elsewhere on the wall clearly show **bare plywood frames** around black baffles. Both are modelled and mixed across the arrays (`materials.blackFinishRatio`, default 0.55). All of them are road-worn — scuffed edges, adhesive residue, darkened corners and handles, visible plies where the paint has gone.
- **Baffle boards: matte black**, flat. Where the carcass is left bare, the black-face / pale-body contrast is the Wall's signature read at distance.
- **Cones:** paper, mid-grey to grey-blue in colour film, with a **specular aluminium dust cap** that catches stage light — the reason the Wall reads as hundreds of points of light in photographs. This is the single most important material to get right.
- **Scaffolding: galvanised steel tube-and-clamp**, standard period frames, plus a dense web of **diagonal guy wires** crossing in front of and between the arrays. The wires are structurally and visually essential; photographs are full of them.
- **Cabling: arm-thick.** Not a detail — a visual feature. The crew found that nothing lighter would carry the current, and wired the Wall with **military-surplus cable originally made for connecting docked ships to shore power.** Modelled at 50 mm per run, gathered into 140 mm bundles at deck level.
- **McIntosh MC-2300s:** black glass front panels, **glowing blue illuminated power meters**, gold-anodised lettering, chrome-and-black chassis, racked at stage level behind and beneath the arrays. 128 lb each.

---

## 10. Structure

| Item | Value | Confidence |
|---|---|---|
| Stage deck | 1 in plywood, 10 ft above ground, bolted and tied into the scaffolding | **confirmed** |
| Staging footprint, indoor | 76 × 30 ft | **confirmed** |
| Staging footprint, outdoor | over 100 × 40 ft | **confirmed** |
| Scaffolding sets | 2, leapfrogging ahead of a single sound system | **confirmed** |
| Scaffold bay width | 2.13 m (7 ft) | estimated (standard period frame) |
| Scaffold lift height | 1.98 m (6 ft 6 in) | estimated |
| Scaffold tube diameter | 48.3 mm | estimated (standard) |
| Guy-wire diameter | 6 mm | guessed |
| Towers | between array blocks, plus a rear plane | estimated |

The deck was tied into the scaffolding for a reason worth putting in an info panel: at full tilt the sound pressure could **bounce the entire rig by as much as a foot.**

---

## 11. Stage context

Modelled to give the PA a place to stand, deliberately understated so it never competes with the Wall.

- **Stage deck:** plank-over-steel, 12 m deep, with a dark skirt.
- **Band gear, 1974-correct:**
  - **Jerry Garcia** — "Wolf", the Doug Irwin custom (in use from late 1973; the wolf was a sticker in 1974, inlaid later).
  - **Bob Weir** — Gibson ES-335, with an Alembic parametric EQ and an Eventide digital delay in his rack.
  - **Phil Lesh** — Alembic quadraphonic bass. Lesh had two in 1974; the second, "Mission Control" (serial 74 00008, built by Rick Turner), from 16 June 1974. The earlier one is the right choice for a March–May scene, the later for the Winterland scene.
  - **Keith Godchaux** — grand piano with five Countryman pickups, one per frame division.
  - **Bill Kreutzmann** — drum kit, centre, upstage.
- **Band positions**, audience view left → right: **Weir · Lesh · Kreutzmann (upstage centre) · Godchaux · Garcia.** Marked **estimated** and exposed in the config as a single `mirrored` boolean, because the record found does not settle which side Garcia stood on in 1974 and it varied. Flipping it is a one-line change.
- **Logos.** The **"Steal Your Face" skull and 13-point lightning bolt** was created by Owsley Stanley and Bob Thomas in **1969 specifically as stencil art to mark the band's equipment on tour.** Using it as a stencil on road cases and flight cases is therefore not decoration — it is the historically correct application, and the only one used. It is **not** placed as a backdrop banner or on the speaker cabinets, for which no evidence was found.
- **Arena:** suggested only — a dark bowl of raked seating and a hint of roof structure, unlit, low detail, fading into black. Enough to give scale, not enough to draw the eye.

---

## 12. Open questions, flagged

1. **586 vs 587 JBL drivers.** Unresolved; the model carries 587 and says so.
2. **26,400 W vs 28,800 W.** Both quoted; the model shows both and explains the arithmetic.
3. **Per-string bass channels.** Popular account vs the 1974 spec sheet's selectable quad matrix. Both quoted.
4. **Which side Garcia stood on.** Not settled here; `band.mirrored` flips it.
5. **Array left-to-right order.** No plan drawing found. The order above is a reconstruction consistent with photographs, not a documented arrangement. **This is the largest single piece of invention in the model** and the About page will say so plainly. The 60 ft envelope it packs into *is* documented.
6. **Allocation of drivers to arrays.** The four class totals are historical and asserted at startup. Which array got which share is mostly the reconstruction's own. Confirmed: 16 × 15″ for the bass drum, 20 × 12″ per guitar, 16 bass cabinets a side.
7. **Cabinet dimensions other than the measured one.** `cab12x2` is measured. `cab12` and `cab15` are proportioned from it.
8. **Onstage SPL.** 120 dB (Anderson) against "quieter than the hall, you could hold a conversation" (Mix). Both are stated; no attempt is made to reconcile them.
9. **Amplifier rack placement.** Photographs show amps at deck level; the exact distribution across the 48 is not documented.

**Resolved since the first draft, by Anderson:** the wall's width (60 ft of speakers, not 100 — that was the staging); the stage deck height (10 ft, confirmed, previously guessed at 5); and the leapfrogging question (one system, two scaffolding sets).

---

## 13. Sources

| id | Source |
|---|---|
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
| `photos` | Photographic record: Richard Pechner (rpechner.com); Ken West; the 1974 galleries at vintag.es and designyoutrust.com; dead.net 1974 archive. Used for massing, materials, driver exposure and structure — not for numbers. |

**Explicitly not used as a source for any number:** Grokipedia's entry, which asserts "four towering stacks at 45°" and a "15 ms delay" that no other source supports. Noted here only so the omission is deliberate and on the record.

---

## 14. Build plan (stages 2–7)

| Stage | Deliverable | Gate |
|---|---|---|
| 2 | Grey-box geometry at true scale from the config — every array, cabinet, scaffold bay and the stage deck, untextured. Orbit camera, a 1.75 m human figure for scale, and an on-screen driver-count readout that must equal 641. | Screenshots |
| 3 | Materials and lighting — PBR, HDRI, worn birch, black baffles, specular dust caps, steel, glowing McIntosh meters. Soft shadows, AO, subtle bloom, all tier-switchable. | Screenshots |
| 4 | Navigation — orbit / first-person walk / guided tour, mouse, touch and full keyboard. | Live build |
| 5 | Interaction — hover and tap highlighting, info panels with counts and sources, exploded view, channel colour overlay, About page. | Live build |
| 6 | Performance — instancing audit, LOD, mobile tier, loading screen with progress, budget check (60 fps target, < 5 MB initial). | Numbers |
| 7 | Deploy. | Link |

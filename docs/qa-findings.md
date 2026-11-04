# QA pass — full visual and structural review

**Trigger:** the reviewer reported that stage 5 was a step backwards, naming three fundamental defects.
All three are confirmed. This is the full check that should have been run before shipping stage 5.

---

## 0. Root cause, before anything else

**I was building visual work without being able to see it.**

The browser this project is developed in suspends animation frames when its pane is hidden, so captured
frames came back blank. When it did return an image, it brightened the tones — during stage 3 the stage
deck measured `#19130d` in the framebuffer while every screenshot showed it pale, and several materials
were "corrected" against that distortion.

I kept building anyway across stages 3, 4 and 5, and shipped three stages of visual work I had never
properly looked at. That is the single reason this review has so much in it.

**Fixed.** `vite.config.ts` now serves a dev-only `POST /__shot` endpoint that writes the real
framebuffer to `.shots/*.png`, and `__renderNow()` forces a synchronous frame first so a hidden pane no
longer produces an empty buffer. The render is now inspectable as an ordinary image file. Every finding
below was made by looking at one.

---

## 1. Reported defects

### 1.1 The band's gear does not look right — CONFIRMED, not fixed

The instruments read as generic computer-generated shapes: guitars as brown blobs on sticks, the piano as
a black puddle, the kit as pale cylinders. Calling them "honest silhouettes" in the stage 5 notes was a
rationalisation. They are not good enough to sit in a piece that claims to be museum-grade, and at the
distances the tour actually uses they add nothing that a well-placed empty stage would not.

This needs a decision rather than another pass of the same approach. See §5.

### 1.2 The drums and piano were behind the speakers — CONFIRMED, fixed

Real placement bug, with a numeric cause. The tower band was positioned in the **middle** of the
forty-foot footprint, which left the band eleven feet of stage. A drum kit is about 1.6 m deep and a
6'11" grand is 2.11 m long, so both ran straight into the speaker stacks:

| | was | now |
|---|---|---|
| Tower band | segments 3–6 of the depth chain, mid-footprint | segments 5–8, **upstage** |
| Playing area downstage of the wall | 11 ft | **21 ft** |
| Kreutzmann's kit | z 0.45 → 1.95 m, wall face at 0.62 | clear of every stack |
| Godchaux's piano | overlapping the lead-guitar and bass stacks | clear |

**Fixed**, and `scripts/verify.mjs` now checks every player's gear footprint against every array and amp
blocker, that it sits on the deck, and that it is downstage of the speaker faces. That check did not
exist, which is why this shipped.

### 1.3 The structure is wrong — CONFIRMED, partly fixed

Three separate faults:

**a. Stacks floating.** Array bases snap to scaffold floor levels (0.86 m, 2.85 m and so on), but the
floors themselves were never modelled — only standards and ledgers. Thirteen stacks hung in mid-air.
**Fixed:** `scaffoldFloors()` emits plank decks under every stack that starts on a platform, sized to the
block, which is also what the drawing implies ("40 2x10x16 planks used as floors" is nowhere near enough
to deck out a 64 × 40 ft tower, so the floors were partial and placed where needed). Verified.

**b. Stacks detached from the rig.** The arrays stood 0.62 m — a full cabinet depth — proud of the tower
face, so they read as a separate object parked in front of an empty cage. **Fixed:** reduced to 0.16 m,
enough to keep the steel off the driver faces and no more.

**c. The scaffold was a box, not a structure.** Every standard ran the full 38'-10" across the whole
sixty feet, so the speakers sat in the bottom third of a large empty cage. The photographs show the
opposite: towers stepping up and down with the stacks, only the tallest bays reaching the top.
**Fixed:** each bay now rises one lift above whatever stands in it. Tube count fell from 1,066 to 991 and
the silhouette now follows the wall.

**Superseded by §6.** Pechner's 17 May 1974 photograph shows the opposite: a continuous top rail across the whole
width, with crew working along it. Every bay now runs to the full height again.

---

## 2. Further defects found in the same pass

| | Finding | Status |
|---|---|---|
| 2.1 | Tie-dye panels were four large, bright mandalas hung high in the cage — the loudest thing in frame. They are meant to be fabric glimpsed through structure. | Fixed: smaller, fewer, lower, dimmer |
| 2.2 | The stage deck reads as a vast empty brown plain. It is the right size — 82 × 41 ft is on the drawing — but it is bare, so it looks like a car park. | Open |
| 2.3 | The arrays still occupy well under half the tower height. 641 drivers cannot fill a 60 ft frame (the 58% finding stands), but the current allocation makes short wide blocks where the photographs show tall narrow ones. | Partly fixed in §6: tallest stacks now 32 ft, vocal lows as single columns. Other channels' shapes are still the reconstruction's own |
| 2.4 | The whole composition reads as a small object in a large black void. No sense of scale or occasion. | Fixed in Blender (§12); the browser is unchanged |
| 2.5 | Bare-plywood cabinets are too orange and too uniform; they read as pine crates rather than road-worn birch. | Open |
| 2.6 | The 5-inch panels render as dark circles with no visible cone — the small drivers catch no light at all. | Open |
| 2.7 | The curve of the vocal centre cluster barely reads from the front. | Open |
| 2.8 | The `front` camera now frames the rig too small, because `FitCamera` fits the full tower height including empty steel. | Open |

---

## 3. What was verified rather than assumed

`npm run verify` grew from 33 checks to 60. New in this pass:

- every player's gear is on the deck, downstage of the speakers, and clear of all 40 array and amp blockers
- every stack that starts on a platform has a plank floor beneath it
- players have at least 4 m of stage downstage of the wall

Everything else still passes: 641 drivers matching the 1974 inventory, the scaffold against the 10 April
1974 drawing, block intersections, the walkable world, tour integrity, and provenance completeness.

---

## 4. What this says about the process

Two failures, both mine:

1. **Building blind.** Fixed properly now, and it should have been fixed the first time a screenshot came
   back blank rather than the fifteenth.
2. **No check for the thing that broke.** The gear-versus-stack collision was exactly the class of bug the
   verifier exists to catch, and I did not write the check when I added the gear. The pattern that has
   worked all project — put the constraint in `verify.mjs`, not in my head — was simply not applied to
   stage 5.

---

## 5. Open question for the reviewer: the band's gear

The instruments are the weakest thing in the scene and I do not think another round of primitives fixes
it. Three honest options:

1. **Leave the stage empty of instruments.** Keep the mic stands, the amp racks and the road cases. The
   page is about the PA; an empty stage with the Wall behind it is truthful and looks considerably better
   than bad instruments.
2. **Model them properly.** Several hours each on the guitar, bass, piano and kit, with real reference.
   Achievable, and the right answer if the gear matters to the piece.
3. **Silhouette them deliberately.** Treat them as dark, unlit forms that read as shapes rather than as
   attempts at objects — a museum convention for "this is a stand-in, not the artefact."

My recommendation is **1 for now, 2 later if the gear earns its place** — the Wall is the subject, and
right now the instruments actively cost the piece credibility.

**Decided: option 1.** The instruments are removed. What stays on the stage is the furniture that is both
documented and legible at this scale — the paired vocal microphones sixty millimetres apart, and the road
cases carrying the 1969 equipment stencil, which is the correct and only use of that design in the scene.
`docs/reconstruction-spec.md` §11 now records the absence rather than implying the gear is modelled.

---

## 6. Checked against a 1974 photograph

**Photo:** Richard Pechner, sound check, P.N.E. Coliseum, Vancouver, **17 May 1974** — a straight-on
full-stage view (source `pechner`). Not in the repo; the measurements below are what the verifier uses.

**Method.** The camera was solved from the photo rather than guessed, which is what fSpy would do, but using
dimensions the project already has instead of vanishing lines. Three independent scales agree at
**9.52 px/ft on the tower face**:

- the outer scaffold standards are 609 px apart, and the drawing makes the footprint 64 ft;
- a crew member standing on the top rail measures about 5'-10";
- the 15" cabinets stack at 19.4 px a row, which is the 24" measured cabinet.

The stacks' feet and the musicians' feet share one line in the image, so the lens is level with the deck.
The model was rendered through that camera at the photo's size and laid over it. Its scaffold edges land on the
photo's to within about 10 px, so the camera is right; everything that disagreed was the model.

**Findings**

| | Photo | Model before | Confidence | Now |
|---|---|---|---|---|
| Scaffold top above the deck | **38.8 ft** | 28.9 ft | High | **38'-10"** |
| Tallest stacks above the deck | **~35 ft** | 24.8 ft | High | 32 ft |
| Scaffold profile | Full height across the whole width | Stepped down with the stacks (§1.3c) | High | Full height |
| Centre cluster | 12"s at ~11.6–17.9 ft, a band of 5"s above to ~20.8 ft | 12"s 9.3–21.3 ft, 5"s to 25.1 ft | Medium | 12"s 7–19 ft, 5"s to 22.7 ft |
| Under the cluster | Mostly open: the kit and one small box | A 4 × 4 block of 15"s, 8 ft tall | Medium | Unchanged — see below |

**The cause.** The 10 April 1974 drawing gives the tower as a lift chain — 7'-0" + 5'-10" + four lifts of
6'-6" = 38'-10" — but not where the chain starts. It was read from the ground, with the 10 ft deck inside it,
which left 28'-10" of tower above the stage. The photograph shows the whole 38'-10" standing above the deck.
Read that way, the floors fall at 7'-0", 12'-10", 19'-4", 25'-10" and 32'-4" above the deck.

**What changed**

- The lift chain is measured up from the deck. Ground to top is now 48'-10".
- Every bay runs to the full height again, reversing §1.3c.
- The scaffold floors moved to the new lift levels, and every array's base snapped to them.
- The vocal lows are single columns of sixteen 15"s (32 ft) beside the cluster, where the photo's tallest
  columns stand, instead of 2 × 8 blocks.
- The curved cluster hangs from the 7 ft floor rather than 9'-4", which brings its middle to within
  a foot of the photo's.
- Everything else keeps its shape and moves up to the new floors. No driver count changed: still 641.
- `npm run verify` now checks the scaffold top, the tallest stack and the cluster height against the
  photo's measurements.

**Still open**

- The tallest stacks are 32 ft against the photo's ~35 ft. Sixteen 24" cabinets make 32 ft, and no
  channel has the drivers to go higher without inventing some.
- The photo's cluster is shallower than the model's: its 12" rows pitch at about 15", against the
  24" cabinet rows used here. At this resolution a 12" cone is about 12 px across, so this wants a
  better photo before the cabinet is changed.
- (Closed in §10: the block is gone.) The photo shows little under the cluster besides the kit. The 4 × 4 bass-drum block was still in the model,
  behind the cluster, because the 16 × 15" count is confirmed and nothing yet says where else they went.
- Channel-by-channel placement is still the reconstruction's own. Only the heights are photo-checked.
- The Cow Palace debut (23 March 1974) had a flat centre cluster, not the cylinder. The model shows the
  Wall as it stood from May, and is checked against May.

---

## 7. The band on stage: photographs from May to July 1974

Seven more photographs of the band in front of the Wall, read against the ones already in
`.shots/reference/`. Nothing in the model has changed yet; this records what they show. "Left" and
"right" are as seen from the audience.

**The photographs**

| File in `.shots/reference/` | Date and place | Source | Shows |
|---|---|---|---|
| `schneider-ucsb-1974-05-25-band.webp` | 25 May 1974, Campus Stadium, UC Santa Barbara | Steve Schneider, via [Paul Dorpat, "Seattle Now & Then"](https://pauldorpat.com/2023/08/10/seattle-now-then-grateful-dead-1974/) | Garcia, the kit, Weir, Lesh, close |
| `schneider-ucsb-1974-05-25-wide.webp` | The same show | The same | The whole stage. Only 768 px wide |
| `esrigging-oakland-1974-06-08-wide.webp` | 8 June 1974, Oakland Coliseum Stadium ("Day on the Green") | Posted to the Everything Stage Rigging Facebook group, whose post is titled "Grateful Dead - 'Day On The Green'"; photographer unknown | The whole Wall from the crowd, with the tie-dyes and tarps. The band is small |
| `unsourced-band-1974-06-16-desmoines-probable.webp` | **Probably** 16 June 1974, Iowa State Fairgrounds, Des Moines | Google Images; photographer unknown | Garcia, Weir, the kit, Lesh |
| `kirkwest-1974-06-16-desmoines-probable-wide.webp` | **Probably** the same show as the one above, from farther back | Kirk West (credit on the image), via a [Reddit post](https://www.reddit.com/r/interestingasfuck/comments/wwr9zf/the_grateful_dead_and_their_wall_of_sound_in_1974/) that gives no show | The whole band and the Wall, straight on |
| `unsourced-rigging-1974-undated.webp` | Undated; outdoors, before the show, golden hills behind | Google Images, a photograph of a printed page | Crew climbing the stacks; the space under the cluster |
| Not saved yet | Undated summer 1974, outdoors | Posted to a Facebook group beside a 28 June 1974 Boston Garden memory. The post says the photo is from "another summer 1974" show. Boston Garden is indoors and this photo is in daylight | Garcia, Lesh, Weir, the kit |

**Dating the Des Moines photos.** In both, Garcia wears a red "MARIN ACADEMY" sweatshirt and plays the Wolf,
Weir wears a plaid shirt, and Lesh a pale green shirt. Garcia's and Weir's clothes match
`garcia-1974-06-16-desmoines.jpg` and `weir-1974-06-16-desmoines.jpg`, which are already dated 16 June, and
the Iowa State Fairgrounds show was outdoors. A match of clothes, not a credit.

**Reading positions across the stage.** Weir stands downstage of the kit, so whether he appears left or right
of it depends on where the photographer stood. The close photo from 16 June puts him left of the kit, and
Kirk West's straight-on view of the same show puts him a little right of its centre. So only the straight-on
views (Kirk West, the 25 May and 8 June wide shots, Pechner) are trusted for order across the stage.

**Findings**

| | What the photographs show | The model now | Confidence |
|---|---|---|---|
| Garcia's side | **Far left** in every photograph that shows him: 17 May (`pechner`, a guitarist far left; too small to name), 25 May, 8 June (a guitarist in blue, far left), 16 June (probable, two photographs), and the undated summer photo | Far right, `x = 7.0` | High for May–June. No photo from July to October yet shows him |
| Weir | Just downstage of the kit, a little right of its centre, in the straight-on views (25 May, 16 June) | Far left, `x = -5.6` | Medium-high |
| Lesh | Right of Weir on 25 May, 16 June and 31 July. The undated summer photo, and probably 8 June (a figure in white between Garcia and the kit; no bass visible at this size), have him **left** of the kit, so it varied | Left of the kit, `x = -2.6` | Medium. Right of the kit in 3 of 5 |
| Keith | At a grand to the **right**: 17 May, 25 May (far right, in line with the band; a second grand far left looks parked) 8 June (far right: the grand under a white cover, and a smaller keyboard beyond it, to the audience's right, with someone at it) and 16 June (far right, lid down) | Right, `x = 4.6` | High for May–June. Agrees with the model |
| The kit | 25 May and 16 June (probable): **wine-red shells with chrome lugs**, on a riser draped in red velvet. Undated summer: the same red kit. 31 July: butcher-block concert toms | Butcher block | High. The kit changed between 16 June and 31 July, **inside** the target window. See `blender/instruments/drums/README.md` |
| Under the cluster | **Open** in every photograph: sky and hills (rigging photo), trees (undated summer), a blue backdrop (25 May, 8 June and 16 June), open sky through a scrim (31 July, `bill-kit-anderson-1974-07-31-preshow.jpg`). Only the kit, Garcia's natural-wood 2×12 cabinet, and racks | A 4 × 4 block of sixteen 15"s, 8 ft tall | High. Seven photographs from five or more shows, at least one of them in the target window. The config's own note on `arrays.kickCount`, from `deadsources74`, says the sixteen 15"s were "in a column", not a block |
| Casters | The cluster's cabinets have casters on their undersides, clearest at Hartford. In colour they show as red and green discs | Not modelled | High |
| Which side is heavier | 25 May, 8 June and 16 June wide shots: the tallest, densest stacks on the left, behind Garcia; on the right, a few columns and a raised platform of 12"s, then the piano | Piano's columns left, Garcia's right (comment above `arrays` in the config) | Medium. Consistent with each player's speakers standing behind them |
| Stage width | 25 May: the deck runs well past the Wall on the right, with the piano out in the open | The deck overhangs the scaffold 9 ft each side, from the 10 April drawing | Low. One venue's stage |
| Scaffold colour | 25 May: rusty brown pipe. 17 May and 31 July: pale | Silver | Low. Probably varied with the venue's own scaffolding |
| Amp racks | 25 May: McIntosh racks with blue meters stand on the deck beside the players | Under the scaffold, behind the band | Medium |
| Backdrop | Outdoors: blue tarps on the sides and back of the structure (25 May, 8 June, 16 June), or open sky |
| Tie-dyes | 8 June: four tie-dyed panels hang high on the scaffold, two over each side, below a valance of blue tarp along the top. `materials.tieDye` already says Courtenay Pollock's tie-dyes hung on the structure | Not in the Blender render | High for 8 June | A black void (§2.4) | High for outdoor shows |

**Two cautions**

- The Wall's heights were checked against Vancouver, 17 May, and most of these photographs are from May
  and June. The kit change shows the stage did change during the summer. A wide shot from July to October,
  such as Winterland in October from *The Grateful Dead Movie*, would show whether the layout changed too.
- Moving Garcia is not only moving his mark. Each player's stacks stood behind the player, so moving Garcia and
  his columns to the left means rearranging `arrays` as well as `band.members`.

**Still open, in order**

1. Remove or move the 4 × 4 bass-drum block. The sixteen 15"s are confirmed; where they stood is not.
2. ~~Move the band and rearrange the columns.~~ Done: §9.
3. Model the casters under the cluster.
4. Find a photograph from July to October that shows Garcia and the keyboards.

---

## 8. Cabinet sizes from the surviving cabinets

Sotheby's 2021 sale included six speaker cabinets and the cluster's aluminium 5"
enclosures (`docs/surviving-gear.md`). Their sizes replace the reconstruction's
own, and two of the open items in §6 close with them.

| Cabinet | Before | Now | From |
|---|---|---|---|
| 15" | 24 × 24 × 22.5 in, driver centred | **19.5 × 25.5 × 29.5**, driver 4" low | Lot 46; lot 50 for the driver |
| 12" | 15.5 × 24 × 22.5 a driver | **16 × 13 × 22** a driver, rows paired into 2 × 12" boxes | Lot 47 |
| 5" rows | 0.19 m | **5.5 in** (0.14 m) | Lot 49; Pechner |

**Against Pechner (§6):**

- Tallest stacks: **34.0 ft** against the photo's ~35.2 (was 32). The 15"s now
  stack at 25.5", against the 24.5" pitch measured on the photo.
- The cluster's 12" rows now stack at 13", against about 15" on the photo (was
  24"). The 5" band is 6 rows of 5.5", against about 5.8" on the photo.
- The cluster stands on the 12'-10" floor, since the verifier wants every block
  on a floor. Its middle comes out at 17.7 ft against the photo's 16.2. The photo
  puts its underside at 11.6 ft: it was hung, not stood.
- The overlay (`blender/compare.py`) lines up over the cluster and the tall
  columns.

**Not changed:** the blocks' x positions were packed against 24"-wide 15"s, so
the 15" columns now stand a little apart. The kick block (§6, still open) is
untouched. In the browser, the 12"s are still drawn as single cells; only the
Blender scene pairs them.

---

## 9. The band moved to Pechner's positions

The players' marks are now measured, not estimated. Pechner's 17 May 1974
photograph is the one the scene's camera is solved against (§6), so a figure's
place in it gives its place on the stage. Across = (pixel − 398) × distance /
524.6 px, with the players taken 11.5 m from the camera, 5.3 m in front of the
tower face.

| | On the photo (px, of 796) | Across (m) | Before |
|---|---|---|---|
| Guitarist, far left: **Garcia** | 178 | −4.8 | +7.0 |
| Guitarist: **Weir** | 322 | −1.7 | −5.6 |
| The kit | 382 | −0.35 | +0.2 |
| Figure right of the kit: **Lesh** | 426 | +0.6 | −2.6 |
| The grand, lying across the stage | 442–546 | +1.0 to +3.2 (2.2 m: a Steinway D is 2.74) | — |
| **Keith**, at its keyboard end | 562 | +3.6 | +4.6 |

Garcia and Weir are told apart by the other photographs, which all put Garcia
at the far left (§7). Keith's mark is now the centre of the grand.

**The columns follow the players**, as the Wall was each player's monitor:

- Garcia's main column moves to the left (+5.45 → −6.60), behind him.
- The piano's columns move to the right (−6.15 / −7.04 → +5.00 / +5.95),
  behind Keith.
- Garcia's extension moves behind the kit (+6.24 → +1.60, still 1.6 m back).
  The 1974 spec sheet puts it "beside Godchaux and behind Kreutzmann"
  (`arrays.garciaExtensionPlacement`, confirmed). With the band as measured,
  that's where it goes, and the measured band fits the spec sheet.
- Everything else stays put. Weir's column stays on the left, near him.

`npm run verify` passes, with the grand's footprint widened to a D across the
stage (3.0 × 1.7 m), and no player's gear inside a stack.
`docs/layout-elevation.svg` is regenerated. `blender/stage_review.py` reads the
marks from `scene.json` instead of its own copy. It lays the grand across the
stage with the keyboard at the right, and puts the Rhodes upstage of Keith at
his right hand, beyond the grand as seen from the audience, as at Oakland.

**Still open:** this is the band on 17 May. Weir and Lesh changed places on
other dates, and on 25 May and 16 June a grand stood at the far right instead.
Nothing from July to October shows the whole band.

---

## 10. Hollywood Bowl, 21 July 1974, and the bass-drum block

Two colour photographs of the Hollywood Bowl show, before the show, with no
photographer known (`.shots/reference/unsourced-hollywoodbowl-1974-07-21-a.png`,
`-b.webp`). This is the first full view of the Wall **inside the target window**.

- **Under the cluster: open.** Only the kit, Garcia's natural-wood 2 × 12"
  cabinet and dark backing, the same as 17 May, 25 May, 8 June, 16 June and
  31 July. That settles it.
- **The grand lies across the stage just right of the kit**, under a white
  cover, as on Pechner's photograph (§9). A second keyboard area is at the far
  right under two white umbrellas, with what looks like another grand.
- **MC 2300 racks stand on the deck**, right of centre: silver-framed, blue
  meters.
- **The cluster's 5" band** reads as rows of curved strips with small, closely
  spaced holes, like the aluminium enclosures of Sotheby's lot 49, more than 20
  to a row. If so, the strips were in use by late July. Not applied: the 5"
  allocation would have to change (`docs/surviving-gear.md`, decision 3).
- Tie-dyes hang high on the scaffold, as at Oakland, and wooden crates numbered
  "12" stand at either end of the stage.

**The bass-drum block is gone from under the cluster.** Its sixteen 15"s are
confirmed by the inventory and described as standing "in a column"
(`arrays.kickCount`). They are now a single column of 16 on the deck, in the
one free slot in the run, at x = −7.35, between the bass and Garcia's main
column. That place is a guess (`arrays.kickPosition`). It keeps the count at
641 and fits the heavier left side the wide photographs show, but nothing yet
places it. §6's "4 × 4 block" item is closed.

---

## 11. The cluster's 5" band in aluminium strips

The Hollywood Bowl photographs (§10) show the cluster's 5" band close up enough
to count, at about 8 px a hole.

- **Four rows** of holes, butted together, on top of the 12" section.
- **Hole spacing a third of the 12" cabinets' spacing**: 5.3" against 16", which
  is lot 49's spacing (69 in for 13 holes) against lot 47's width.
- **The band is as wide as the 12" section.** At 5.3", that's 33 to a row
  (33 × 5.3 in = 4.44 m, against the 12"s' 4.47 m).
- The band is light grey metal with dark holes, not a black baffle.

**Now:** the `voc-um` block is a new cabinet type, `strip5` (lot 49:
5.5 × 3.5 in in section, holes 69/13 in apart), **33 × 4 = 132 drivers**, on the
cluster's arc. In Blender each row is three lengths of 11, with end plates only
at the ends of each length, open backs, and a dull aluminium face. In the
browser the cells are coloured aluminium.

**Against the inventory:** the cells were 20 × 6 = 120. The 12 extra come from
the vocal fills (`voc-umL`, `voc-umR`), 7 rows to 6 each: the same channel and
the same band, so the vocals' 5" total and the 641 hold. The split between
cluster and fills was always the reconstruction's own.

**Caveats:**

- Lot 49's strips hold about 13 holes, not 11. Three lengths of 13 would make
  a row 5.25 m long, wider than the 12" section, which the photographs don't
  show.
- Pechner's 17 May photograph shows a taller 5" band (about 2.9 ft, against 1.8
  now). That is probably the first cluster's plywood cells. The model now shows
  the cluster as it was by late July.
- The band now tops out lower; the cluster's mid-height is 17.3 ft against the
  photo's 16.2, within the 3 ft check.

---

## 12. Outdoors: sky, ground and tarps

Most of the summer 1974 photographs are outdoor shows, so the Blender scene has
an outdoor venue (`blender/venue.py`): `--venue outdoor` in `build_scene.py`,
and `stage_review.py`'s default. Pechner's hall stays `build_scene.py`'s
default, since its shot is matched to an indoor photograph.

- **Sky:** Blender's physically based sky, mid-afternoon (sun 38° up, from the
  audience's left), with a sun lamp matched to it. The sky draws no sun disc of
  its own, so the scene isn't lit twice.
- **Ground:** a dry summer field.
- **Tarps:** blue polythene, as at UC Santa Barbara (25 May), Oakland (8 June)
  and Des Moines (16 June). One sheet a scaffold bay over the back of the towers,
  one over each end, tied at every lift and bellying between ties, slightly
  translucent with the sun behind. A strip one lift deep runs along the top of
  the front, as at Oakland. Sizes and places come from the exported scaffold.

- **Tie-dyes:** four panels hang from the top front of the scaffold under the
  tarp strip, two over each side, as at Oakland (8 June) and the Hollywood Bowl
  (21 July). The config confirms Courtenay Pollock's tie-dyes on the structure
  (`materials.tieDye`). About 1.3 × 2.5 m, scaled off the Oakland photograph,
  and placed so each hangs above the stacks below it. The patterns are generic
  spiral and ring dyeing made in the shader, with bled edges and pale crazing,
  not copies of Pollock's designs.

**Not done:** a crowd; the browser app, which keeps its dark arena.

---

## 13. The stacks stand behind the steel; light bars

**The stacks.** The config had every stack 0.16 m in front of the towers'
front plane (`dimensions.arrayStandoff`), with a note that the photographs
"plainly show stacks in front of the steel". They show the opposite. At the
Hollywood Bowl (21 July) and on Pechner's photograph (17 May), the uprights,
ledgers and X-braces cross **in front of** the speaker faces on both sides.
The model was also contradicting itself, since its stacks stand on scaffold
floors inside the towers.

- The flat stacks' faces now stand 6 cm behind the front plane, just behind
  the tubes.
- **The curved centre cluster is the exception.** It projects forward of the
  steel with no tubes across its face, so it keeps its 0.16 m
  (`dimensions.clusterStandoff`).
- The front plane gets its X-braces back. The scaffold generator had left
  them off because they would have cut through cabinets standing in front.
  Front ledgers and braces stop at the cluster's edges.
- Garcia's extension, behind the kit, comes forward from 1.6 m to 1.3 m
  behind the face so it clears the amp racks.
- `verify` checks the side stacks stand behind the front tubes and the
  cluster stands proud.

**Light bars** (`structure.lightBars`). Measured on Pechner's photograph
through its solved camera, each upper outer corner carries:

- a horizontal bar of about 5 black can lamps, 6.9 m above the deck
- a diagonal bar of about 8, rising toward the centre to 8.6 m
- two vertical ladders of about 6

They are clamped to the scaffold in front of the stacks and aimed down at the
band. The right side mirrors the left. The overlay on Pechner's photograph
lines them up.

- **The ladders are indoor-only.** Outdoors (Oakland, the Hollywood Bowl) the
  tie-dyes hang in that space, and only the flat and diagonal bars are seen.
- Blender builds pipes, clamps, yokes and cans, unlit. The browser draws pipes
  and cans.
- **Not modelled:** the horizontal bar along the top front seen on some
  dates; the lamps' make; any light from them.

---

## 14. The story is set at the Hollywood Bowl, 21 July 1974

The story page needs a sense of place, so its renders are set at one show: the
Hollywood Bowl on 21 July 1974. It's inside the target window, has the best
photographic record of the Wall in the window, and is instantly recognisable.
`blender/hollywood_bowl.py`, `--venue hollywood`.

**The photographs:** `unsourced-hollywoodbowl-1974-07-21-a.png` and `-b.webp`
(the user's, dated; no credit); `-probable-band.webp` and `-probable-crowd.png`
(the bandshell matches; undated). Also saved: `unsourced-bw-wall-undated.webp`.

**The Bowl in 1974**, from the photographs and the Bowl's histories:

- The 1929 shell, white, concentric arches, measured on the wide photograph
  against the Wall's 64 ft: about 14.5 m in radius, its crown about 15.5 m
  above the stage. The often-quoted "45 ft" is the same order.
- Frank Gehry's cardboard Sonotubes of the 1970s: in the photographs, two long
  horizontal tubes spanning the shell about 11 m up, and a bank of vertical
  tubes, 5–6.5 m tall, round the sides and back of the Wall. Plus a row of tall
  white panels in the shell's crown.
- No reflecting pool: it was removed in 1972. The semicircle in front of the
  stage was open floor.
- No tarps. Wooded hills behind and beside the shell. The stage faces
  southwest, so the afternoon sun comes from behind the crowd.
- **The show time isn't recorded** in the archives found. The photographs are
  in daylight. The renders use about 5:15 pm (sun 30° up, computed for the
  date and place), since at 6:30 pm the sun is behind the canyon's western
  hills.

**Findings:**

- **The kit at the Bowl is the wine-red one**, on a natural-wood riser, not
  the butcher block of Hartford (31 July). So the change was between 21 and
  31 July. For the Bowl, `stage_review.py` recolours the kit's shells, but its
  drums are still the concert toms modelled from Hartford, which isn't right.
  The red kit needs its own model.
- **A second, smaller curved cluster** stands low on the right of the Wall in
  the wide photograph, under the right-hand stacks. Not in the model, and
  nothing yet says what it carried.
- The band: Garcia far left, Weir, the kit, Lesh right of it, and the grand
  across the stage right of the kit, under a white cover. As modelled (§9).
- Tie-dyes and light bars, as modelled (§12, §13).

**Stylised, not photographed:** the crowd is simple figures, the trees are
simple shapes, and the hills are a heightfield. Depth of field and haze carry
them at a distance; close up they read as models. See `docs/story.md`.

---

## 15. Scenery and crowd for the story renders

**Scenery** (`blender/hollywood_bowl.py`). Poly Haven assets, CC0, downloaded by
hand into `blender/assets/polyhaven/` (ignored, 147 MB): Searsia burchellii and
S. lucida (standing in for the canyon's oaks and chaparral), Shrub 02, the Aerial
Grass Rock ground texture, and the Kiara 7 late-afternoon sky. About 64,000
plants are instanced on the slopes. The sky is turned so its glow agrees with the
sun lamp, and its own sun is capped so the scene isn't lit twice. Without the
folder, the bowl falls back to simple shapes.

**Crowd.** Four poses read off the 1970s crowd photographs
(`docs/crowd-references.md`): sitting on a bench, sitting on the grass, lying on
a blanket, standing. Each faces the stage, with tops, hair and trousers coloured
per person from a 1970s palette (little tie-dye). Mostly seated on the benches,
with blankets in the pool circle.

**Making it photographic** (`blender/crowd_mask.py`). The crowd mask is the
difference between renders with and without the crowd. Only those pixels are
taken from an AI-edited image (Kling), so the Wall, the scaffold, the shell and
the band can't change. Then one grade over the whole frame to match a 1974
colour print.

- First Kling test (1 credit): it replaced the distant crowd with a dozen large
  people at the camera, in modern clothes. Through the mask they came out
  headless. Wrong scale, wrong era.
- Second (1 credit): the posed crowd, with three of the 1970s photographs as
  style references, told to keep every figure's place and size. See `story.md`.

Kling's output is an AI image. It stands for "a crowd at a 1974 show", not
the people who were there, and the story page should say so.

---

## 16. A crowd of real people (MPFB)

The crowd is now real modelled people, not figures. `blender/make_people.py`
generates them with MPFB, the MakeHuman add-on for Blender (GPL; installed in
Blender's user extensions), from the MakeHuman community's asset packs,
downloaded into the ignored `blender/assets/makehuman/zips/` (912 MB):

| Pack | Licence |
|---|---|
| MakeHuman system assets, Skins 01 and 02, Poses 01, Bodyparts 05, Hair 01, Shirts 01, Pants 01, Hats 01 | CC0 |
| Hair 02, Hair 03 | **CC-BY: credit the MakeHuman community and the hair authors wherever the renders are published** |

48 people, saved to the ignored `blender/assets/makehuman/people.blend`:
young adults, mostly white with some Black and Asian (as the photographs of
the crowd show), long hair more often than not on men and women alike, beards
on some men, T-shirts, tank tops, polos and peasant-style tops recoloured from
a 1970s palette, jeans (wool trousers recoloured as denim) and cut-offs, a
hat on some, a few shirts off. Poses: standing with arms down; sitting on a
bench, cross-legged or on the ground (Poses 01); lying back. Each is baked to
one mesh of about 10,000 faces.

`hollywood_bowl.py` instances a random person of the matching pose at each of
the crowd's ~8,000 places, turned to face the stage. Without the library it
falls back to the simple figures.

Assets left out, as wrong for 1974 or wrong-looking: the cargo and harem
trousers (camouflage and floral prints), a hairstyle with two buns, a beard
with a purple texture (beards are recoloured brown).

**Second pass.** 144 people. Everyone faces the stage within 15° (the
"talking" turns and random aisle headings are gone, and sitting poses that
turn the whole figure are straightened before baking). Hair is recoloured to
a natural range (mostly brown, some dark, a little blond and red; one hair
asset's texture is ginger). Fewer tank tops and shirts off. Realistic skin
(MPFB's subsurface-scattering skin) and high-detail eyes; full-detail people
within 25 m of the camera, a third of the faces beyond. No one within 12 m of
the camera. The library is 386 MB.

**The ceiling.** MakeHuman people read as people at a distance, but up close
they look like game characters, not photographs. Past this, the options are a
library of scanned people (paid, such as Renderpeople), or an AI edit of the
nearest rows only, which should now work, since the people it starts from
already look human.

---

## 17. Decisions, 7 October 2026

The project owner settled three open questions.

- **The crowd stays as it is.** No scanned-people pack. The 144 MakeHuman
  people (§16) carry the wide shots with haze and the 1974 grade; detail shots
  are framed without crowd close to the camera.
- **The band at the Hollywood Bowl, 21 July 1974: Garcia, Weir, the kit,
  Lesh, the pianos**, left to right from the audience. This is the order the
  Bowl photographs show (§14) and the order already modelled (§9), so no
  marks move. The Weir/Lesh swaps seen on other dates (§7) no longer matter
  for the story.
- **Rights: photographs, marks and logos stay in the repo and on the public
  site**, including the traced skull-and-bolt, the GRATEFUL DEAD stencil and
  reference photographs. In return, credit generously: every photograph
  shown carries its photographer and source where known ("photographer
  unknown" where not), every borrowed fact links its source, and the site
  has a full credits page (photographers, auction houses, archives, books,
  Poly Haven, the MakeHuman community for Hair 02/03 under CC-BY).

---

## 18. Blender and the explorer, reconciled (7 October 2026)

Blender had become the more detailed model, with most of its detail
hard-coded in the Python, and the explorer had drifted from it. The project
owner ruled on each conflict, with the photographs side by side
(`.shots/conflicts/index.html`, local). Each ruling is now one value in the
config that both renderers read.

| # | Detail | Ruling | Evidence |
|---|---|---|---|
| 1 | Black or bare cabinets | A mix, at `blackFinishRatio`. Blender had every cabinet bare; it now reads the same per-cabinet finish as the explorer, decided once in `src/geometry/arrays.ts` | Pechner 17 May: both finishes in the same columns |
| 2 | 5" and horn panels | Small plywood cells, one driver each (Blender), not one drilled black board. One finish per block | Oakland 8 June: pale framed grids. Small photos: a reading |
| 3 | Cluster strips | Aluminium, face and flanges (the explorer had a black face) | Bowl, Oakland; §11 |
| 4 | Cones | Near-black, `#2A2A2C` (was mid-grey in the explorer) | Every colour photo |
| 5 | Horns | The T350 as it survives: rectangular, 7.25 × 4.5 × 3.5 in, grey cast frame, black throat. Neither renderer had it right | Julien's 2026 lot 72 |
| 6 | Scaffold steel | Bright galvanised, `#A9ADB1` (the explorer had darkened it) | Oakland daylight; Pechner |
| 7 | MC 2300 panel | Brushed gold, black lower strip, 3 knobs and a red rocker (the explorer had black glass and 4 knobs) | Sotheby's 2021 lot 36 |
| 8 | Road cases | Blender's orange and black Anvils and ZERO cases, stencils, names, stickers | Oakland; Sotheby's lots 36–43 |
| 9 | Tie-dyes | Four on the front of the scaffold near the top, outdoors only; none indoors | Bowl 21 July; Oakland 8 June |
| 10 | 12"s | Paired two to a box (Blender) | Sotheby's lot 47 |

**The T350.** Julien's lot 72 is the only surviving tweeter. Its frame is
plain grey metal and its throat black, with vertical vanes (not modelled). It
is 7.25 in by 4.5 in, so it fits the 6.3 in high horn cells only on its side:
modelled landscape. Julien's says these horns sat on the upper part of the
centre array, above the drums. The model also has horn rows at the tops of the
vocal fills and the drum stacks; that placement is unchanged and unconfirmed.

**The road gear, one plan.** Blender used to pick each case's colour and each
label with Python's random generator, which the explorer can't reproduce.
`src/geometry/roadgear.ts` now makes every choice once (seeded,
`structure.roadCases`) and both renderers build from that plan: Blender via
`scene.json`, the explorer in `src/scene/RoadGear.tsx`, which merges the gear
into one mesh per material and draws every label from one texture atlas. Two
inherited bugs fixed on the way: the case names repeated after eight racks
(two "Budman"s; racks past the list now go unnamed), and a case meant to stack
on another floated when the one below became ZERO cases.

**The Bowl and the tie-dyes in the explorer.** The Bowl's dimensions moved
out of `hollywood_bowl.py` into `venues.hollywoodBowl`, laid out by
`src/geometry/bowl.ts` for both renderers: shell, crossbeam tubes, Sonotubes
(their heights now from the shared seeded generator, so they differ a little
from the earlier renders), crown panels, seating, the pool circle and the
canyon's shape. The explorer has a venue switch (`?venue=bowl`): indoors as on
Pechner's photograph, or the Bowl in afternoon sun, with the four tie-dyes
(`structure.tieDyes`, placed by `tieDyePanels()`) and without the light bars'
ladders. Its trees are simple shapes and it has no crowd; Blender keeps its
Poly Haven plants and the MakeHuman crowd. The stage lamps carry Blender's
yoke, clamp, lip and lens in the explorer, and the paired vocal mics, which
only the explorer had, are in Blender now.

**The instruments in the explorer.** `blender/export_instruments.py` stands
the Wolf, the ES-335, Mission Control, the grand, the Rhodes, the kit and the
guitar stands exactly where the renders stand them (`stage_review.py place()`,
now reading `band.instruments`), joins each, bakes its procedural materials
to a colour, roughness and metalness atlas with Cycles, and writes a
Draco-compressed `.glb` to `public/models/` (1.8 MB for all eight). The kit is
written twice, the Bowl's in wine red. The explorer fetches them after the
Wall is up. The grey scale figures are off by default now: they stood on the
same marks and buried the guitars.

**What changes in the renders.** Blender's cabinets are now mixed black and
bare, so the story's renders were re-made (`.shots/story/v2/render.sh`, then
`npm run story:images`).

---

## 19. The Hollywood Bowl photograph, solved (3 November 2026)

The story opens by fading the 21 July 1974 photograph
(`unsourced-hollywoodbowl-1974-07-21-b.webp`, 1020 × 720) into a render
from the same seat. That needs the photographer's camera, so it is now
solved rather than placed by eye: `blender/solve_camera.py`, from points in
`blender/cameras/bowl-1974-07-21.json`.

**Method.** Six points read off the photo whose positions the model knows:
the scaffold's two outer uprights at the top and at the deck (64 ft apart,
38'-10" tall), and the vocal cluster's top and foot. A pinhole camera,
principal point at the frame's centre, is fitted by least squares: 5.4 px
RMS. The checks agree with the model at about 35 px a metre: cluster 128
px wide against 133 expected, 98 px tall against 95, the tower 414 px
against 418.

**The distance problem.** A near-frontal view fixes where the camera looks
and its lens-to-distance ratio, but barely the distance: pinned anywhere
from 20 m to 80 m, the fit only moves from 5.8 to 5.4 px. The photograph
settles it: the photographer stood in the crowd (heads fill the bottom of
the frame), so the camera goes where the fitted height meets a standing eye
(1.6 m) over the Bowl's seating. **Result:** 47 m out from the Wall's face,
5.2 m right of centre, eye 7.2 m above the model's ground, a 24° vertical
field of view (a short telephoto), level within a degree.

**What the overlay shows.** Through that camera the Wall lands on the
photo's Wall. The Bowl does not:

- The 1929 shell is much bigger than modelled: in the photo it spans
  nearly the whole frame, far past both sides of the Wall; the model's
  barely clears the scaffold.
- The crossbeam tubes and the Sonotube banks stand further out to the sides.

The Bowl was measured by eye against an unsolved view (§14), so this was
expected.

**Re-measured through the solved camera.** A point in the photo is a ray
from the camera; where it crosses the plane a part stands in gives its true
size. One photo cannot fix a part's depth, so each keeps the depth the
model had; sizes and heights are measured. In `venues.hollywoodBowl`:

| | Was (§14, by eye) | Now (measured) |
|---|---|---|
| Shell front arch | 14.5 m radius, springing 1 m above the stage, centred on the Wall | 17.8 m radius, centred 2.45 m above the stage and 2.3 m to the audience's right of the Wall's centre (a circle through 14 points on its edge, 0.6 m worst fit) |
| Crown panels | on an arc following the shell | a shallow row across the crown over the Wall, centres 16.5 m above the stage, 1.5 m lower at the ends, from 11.8 m left to 10.4 m right; 2.2 × 0.75 m |
| Crossbeam tubes | 10.6 and 11.35 m up, 0.84 m across | 11.05 m (the front one, 1.3 m across) and 12.2 m (1.1 m across); 30 m long |
| Sonotube banks | 5.0–6.6 m tall, 0.82 m, at the shell's sides | 7.4–8.4 m tall, 1.0 m across, 12 m either side of the Wall's centre |

Rendered through the camera, the shell, tubes, banks and panels now land on
the photograph's. Still not matched: the shell's inner rings (the photo is
too small to read them), and the right-hand bank's short front row of
tubes, about 4 m tall, which the model leaves out.

The shell's offset to the right may be real (the Wall set a little off the
Bowl's centreline) or partly the camera's error; it is kept as measured.

**Also seen:** the Wall appears to stand on the Bowl's own stage, its feet
at the stage floor, with no sign of a 10 ft deck. If so, the venue differs
from the arena configuration the model's deck follows. Not changed yet.

`stage_review.py --camera blender/cameras/bowl-1974-07-21.json` renders
through the solved camera at twice the photo's size; `compare.py --color`
overlays it.

## 20. The story on a phone (4 November 2026)

A QA pass on the story at phone sizes, against screenshots from an iPhone in
Chrome (about 390x664 upright, 717x330 on its side). Cards scrolling over a
pinned picture did not survive long copy, diagrams and players:

- Each card had a slot one screen tall. Taller cards spilled out and collided:
  on its side, 7 of 23 were taller than the screen, the seat diagram 215%.
- At 390x664, no whole card was on screen for 53% of the scroll, and the picture
  was at least half covered for 38% of it.
- A pinned stage sized in `svh` left a black band when the toolbar collapsed.
- Two captions showed at once in a crossfade; tap targets were 18 to 34px.

**Now:** below 900px wide or 600px tall, `Story.tsx` uses a compact layout. The
picture is pinned (above the words upright, left of them on its side), blocks
are as tall as their content, and a crossfade follows the paragraph that
starts it. The page went from 36 to about 22 screens upright, and from about
39 to 33 on its side. Larger windows keep the cards.

**Sound:** one audio element for the page (`src/ui/player.ts`), with the song
rows and a now-playing bar (`src/ui/NowPlaying.tsx`) as remotes, plus lock-screen
controls. In the explorer the same control floats over the scene as a pill, so
the sound plays on while exploring; its name reopens the Listen panel.

**Not yet tried on a real phone:** the lock screen, playback with the screen off,
and notch padding on its side. The bar can sit over the bottom-left of the
signal diagram on its side until the reader scrolls.

---

## 21. The story's last pictures (4 November 2026)

- **Beat 7, evidence.** `bowl-tower` looked only at the crowd, with none of the
  Wall in frame, so a tint could show nothing. The beat now crossfades `bowl` to
  `bowl-evidence` (`stage_review.py --tint evidence`). Colours come from
  `PROVENANCE` through `scene.json`, so the picture can't claim more than the
  config. The stage takes the Bowl's confidence (estimated), not the drawing's
  (confirmed), because §19 sees no 10 ft deck there.
- **Beat 4.** The `garcia` frame showed no instrument. `garcia-mark` shows his
  guitar at his mark with the columns behind. Instruments in hands was dropped:
  it would need a likeness of Garcia close to the lens, which the crowd's
  figures can't carry. The caption says the render has no band.
- **Beat 6.** A rack close up (`amps-close`), so the meters read on a phone. An
  MC 2300's meter lamp is steady and its needle moves, so the planned flicker
  became needles (`Needles.tsx`, placed by `stage_review.py --meters`). What the
  meters read is not recorded; the caption calls the movement illustrative.
- **Beat 2's clip.** Not made. The scroll-driven push in already does the job,
  with no video to download on a phone.
- **Title.** The cluster's cones through a long lens, dimmed behind the words.

Checked at desktop and phone sizes in the browser's device emulation. Still not
tried on a real phone: the new title and needles.

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

---

## 2. Further defects found in the same pass

| | Finding | Status |
|---|---|---|
| 2.1 | Tie-dye panels were four large, bright mandalas hung high in the cage — the loudest thing in frame. They are meant to be fabric glimpsed through structure. | Fixed: smaller, fewer, lower, dimmer |
| 2.2 | The stage deck reads as a vast empty brown plain. It is the right size — 82 × 41 ft is on the drawing — but it is bare, so it looks like a car park. | Open |
| 2.3 | The arrays still occupy well under half the tower height. 641 drivers cannot fill a 60 ft frame (the 58% finding stands), but the current allocation makes short wide blocks where the photographs show tall narrow ones. | Open |
| 2.4 | The whole composition reads as a small object in a large black void. No sense of scale or occasion. | Open |
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

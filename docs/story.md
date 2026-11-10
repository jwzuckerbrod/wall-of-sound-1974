# The story page: outline

The front door to the project. Most people will arrive on a phone from a shared
link and stay a couple of minutes, so the story has to work for them first. It
scrolls, it's built from pre-rendered Cycles images and short clips that load
instantly on any device, and it ends by inviting people into the 3D explorer.

A draft to react to. The copy is working copy; every figure is from the config
and carries its source.

**Built (November 10, 2026): the story is told in steps, over the live 3D model,
on the front page.** `index.html` opens on it; `src/story/steps.tsx` holds the
eighteen steps, `src/story/StoryLayer.tsx` the card, stills and controls, and
`src/App.tsx` applies each step to the explorer's own state. See "Proposed: the
story in three acts" below for the order, and qa-findings §27 for how it got
here. `story.html` now only sends old links to the front page. The sections
"The shape" and "The beats" below describe the scrolling page it replaced
(October 7 to November 9, 2026) and are kept as its record.

**The place: the Hollywood Bowl, Sunday, July 21, 1974.** One real show gives the
story a sense of place: the white shell, the hills, seventeen thousand people.
It's inside the Wall's summer, and it's the show with the best photographs of
the Wall. What we know of the Bowl in 1974 is in `qa-findings` §14.

**Hero renders:** `.shots/story/hollywood/` (not in the repo), made by
`blender/stage_review.py --venue hollywood --shot <name> --sun 30,-50 --exposure 0.3`,
plus `build_scene.py --shot pechner` for the opening.

---

## The shape

Eight beats, one idea each. On a phone, an image holds while its copy scrolls
past in its own space, then the next image takes over. On desktop the same
beats, with the copy on cards over the image.

| # | Beat | Image | Motion |
|---|---|---|---|
| 1 | It was real | A photograph of the Wall at the Bowl, then our render from the same seat | Crossfade, photo to render |
| 2 | The whole thing | `bowl-hero` | Slow push in |
| 3 | Six systems, not one | `bowl`, from the seats, with each channel tinted in turn | The tint moves channel by channel |
| 4 | Each player's own wall | `garcia-mark`, the guitar at his mark, the columns behind | Hold |
| 5 | The singing problem | `cluster-up`, then a diagram of the paired mics | Diagram draws itself |
| 6 | The power | `amps-close`, one rack up close | Hold; the needles swing (`Needles.tsx`) |
| 7 | What we know, and how well | `bowl`, then `bowl-evidence`, the same frame by confidence | Crossfade |
| 8 | Step inside | The live 3D view, already loaded | Tap to explore |

---

## The beats

### 1. It was real

> Sunday, July 21, 1974. The Hollywood Bowl.
>
> The Grateful Dead have brought the largest sound system anyone had built: a
> wall of speakers four stories high, standing in front of the Bowl's shell.
> This is a photograph of it that afternoon. *(crossfade)* This is our
> reconstruction, from the same seat.

The crossfade carries the whole premise. It needs the camera solved from the
Bowl photograph, as Pechner's was (`qa-findings` §6); the `bowl` shot is placed
by eye for now. **Rights:** the Bowl photographs have no credit. Find the
photographer, or open on the render alone. Pechner's matched photograph is the
fallback, set indoors in Vancouver.

### 2. The whole thing

> 641 speakers. 48 McIntosh amplifiers. 38 feet of steel. 75 tons on the road,
> 28 of them the sound system alone. It went up and came down at every show
> from March 23 to October 20, 1974, and then never again.

Image: `bowl-hero`, from high in the seats, the shell and the crowd around it.

### 3. Six systems, not one

> It wasn't one PA. It was six, each carrying one thing: vocals, Garcia's
> guitar, Weir's guitar, the piano, the drums, and Lesh's bass, which ran
> quadraphonic. Nothing was mixed together until it reached the air. That's why
> it sounded clear.

Image: `bowl`, from the seats, straight on, with each channel tinted in turn. The tint is a
render pass per channel (to make). The quadraphonic bass is contested in the
sources; the explorer says so.

### 3¼. One mix, or none, and where the sound comes from

Two figures after Six systems. `src/story/PathDiagram.tsx`: the signal path, a
typical early-1970s PA (a sourced composite) against the Wall. `SeatDiagram.tsx`
and `src/geometry/localize.ts`: pick a seat in the Bowl and see where each sound
seems to come from, by the precedence effect (arrival times only: a rule of
thumb, and labeled so). Sources in PROVENANCE `comparison.signalPath` and
`comparison.localization`.

### 3½. Listen

Real recordings, streamed from the Internet Archive (never copied here), in
`src/data/recordings.ts` and played by `src/ui/Listen.tsx` (also the explorer's
Listen button). Audience tapes only: a soundboard tape is the desk's feed and
never went through the Wall.

- The Wall on its own: Rob Bertrando's tape of the Bowl, July 21, 1974,
  front of the desk, Sony ECM-22Ps on cassette (*Scarlet Begonias*, *U.S. Blues*).
- Before and after: the same songs (*Sugar Magnolia*, *Me and My Uncle*) from
  Bertrando's tape of the Hollywood Palladium, August 6, 1971, same microphones,
  40–50 ft back, on reel-to-reel. One switch flips between them and keeps the
  place. The page says what isn't held steady: indoors v. outdoors, the better
  recorder on the older show, three years of the band.

### 4. Each player's own wall

> There were no monitor speakers. The Wall was the monitor: each player stood
> in front of their own stack, its lower half playing to the band and its upper
> half throwing to the crowd. Jerry Garcia's guitar came out of the column
> behind him.

Image: `garcia-mark`, from the lip of the stage: his guitar on its stand at his
mark, the columns behind it. No renders show the band, so the guitar stands
alone, and the caption says so (qa-findings §21).

### 5. The singing problem

> A microphone in front of 26,000 watts should howl. Theirs didn't. Each singer
> sang into a matched pair of microphones, 60 mm apart, wired in opposite
> polarity. The voice reached one; the Wall reached both, and canceled itself
> out.

Image: `cluster-up`, the curved center cluster from below, then a diagram of the
paired microphones (to draw). This is the beat people remember. **Not in the
Blender scene yet:** the paired microphones themselves. The browser has them.
**No band recordings** without a license; if there's sound here, it's our own
demonstration of the cancellation.

### 6. The power

> Forty-eight McIntosh MC 2300s, 600 watts each, 128 pounds each. The crew
> named them. Garcia's favorite was called Budman.

Image: `amps-close`, one rack with the meters lit and the needles swinging; the caption says the movement is illustrative. The count
(48, or Parish's "over 70") is shown as a range in the explorer.

### 7. What we know, and how well

> Nobody drew a plan of the Wall. This reconstruction is built from scaffolding
> drawings dated April 10, 1974, a press sheet from that year, the cabinets that
> survive, and every photograph we could date. Where we're sure, it's solid.
> Where we've had to estimate, it's marked.

Image: `bowl`, crossfading to `bowl-evidence`, the same frame colored by
confidence from `PROVENANCE` (confirmed, estimated, guessed). Links to the photograph record
and the register of surviving equipment.

### 8. Step inside

> Walk the stage. Stand where the audience stood. Climb the tower.

The live 3D view, loaded in the background while the story played, opening on a
curated viewpoint.

---

## Proposed: the story in three acts (draft, November 10, 2026)

A draft to react to. Nothing on the page has changed. The beats above are the
page as built: a tour of features. This reorders them into a narrative with a
question, a payoff, a cost and an ending. Copy is working copy.

**The spine, in one sentence:** in 1974 the Grateful Dead built the best sound
system anyone had heard, to fix a problem every band had, and it was too big to
keep.

**Three rules for the rewrite**

1. One story: the Wall's. The reconstruction speaks at the start (one line) and
   in the coda, and nowhere between.
2. Claims in the copy, caveats in a note. Each beat keeps its sources line; the
   hedges move behind a "How sure are we?" note on the card, or into the coda.
3. Every beat gets its own picture. No frame is used twice except in a crossfade.

Facts marked **(config)** are in `wall.config.ts` with a source today. Facts
marked **(needs a source)** are not, and can't go on the page until they are.

### Act 1. The problem

| # | Beat | What it says | Picture |
|---|---|---|---|
| 1 | The hook | The photograph, then one sentence of stakes: for 37 shows in 1974 the Grateful Dead carried 75 tons of sound system from city to city. Nothing had sounded like it. By October it was gone. **(config:** `meta.showCount`, `system.weightTonsComplete`, `meta.retired`**)** | The Bowl photograph, crossfading to the render from the same seat (as now) |
| 2 | What a concert sounded like | Every microphone to one desk, one mix out of two stacks, monitors so the band could guess. The 1974 report's line: musicians "don't really know how they sound." The signal-path diagram's first half lives here. **(config:** `comparison.signalPath`**)** | A new still or diagram of a typical early-1970s stage; today's page has none |
| 3 | Bear's answer | Owsley "Bear" Stanley's idea: no mix at all. Give every instrument its own speakers and stand them behind the band. The people who built it. The first try, at Stanford on February 9, 1973: the tweeters failed during the first number. **(config:** `meta.designers`, `meta.prototypeTest`**)** | A portrait or period photograph **(needs finding, and a credit)**; failing that, the `title` cones |

### Act 2. The machine

| # | Beat | What it says | Picture |
|---|---|---|---|
| 4 | The whole Wall | 641 speakers, 48 amplifiers, four stories. Scale lands here: the explorer's size comparisons (the bus, the 737) as a still or live. **(config)** | `bowl-hero`, push in |
| 5 | Six systems, not one | As now, with the color-by-system crossfade visitors liked. The signal-path diagram's second half: no desk. **(config)** | `bowl` to `bowl-systems` |
| 6 | Each player's own wall | The Wall was the monitor. Garcia's guitar came out of the columns behind him. **(config:** `arrays.verticalSplit`**)** | `garcia-mark` |
| 7 | The singing problem | A microphone in front of 26 kilowatts should howl. The paired microphones. **(config:** `channels.vocalMics`**)** | `cluster-up`, the mic diagram |
| 8 | What it did for the crowd | The seat diagram: the band has a width. Clear at 180 meters. **(config:** `system.usableThrowMetres`**)** | The seat diagram over a new high, wide still |
| 9 | Listen | The act's climax, and the page's. The Bowl tape, then 1971 against 1974. Last in the act, so the reader knows what they are hearing. | The Bowl photograph |

### Act 3. The cost, and the end

| # | Beat | What it says | Picture |
|---|---|---|---|
| 10 | What it took | $350,000 to build. Two identical scaffolds leapfrogging from city to city so one was always standing when the speakers arrived. 21 people to load it; four hours for the stage, four for the sound. $100,000 a month to move. 120 decibels on stage. **(config:** `system.buildCostUsd1974`, `stagingSets`, `crew`, `setupHours`, `transportLabourUsdPerMonth`, `onstageSplDb`**)** | `amps-close` with the needles; or the crew on the scaffold (`crew.glb`) as a new render |
| 11 | The last night | Winterland, San Francisco, 16 to October 20, 1974. Seven months after its first show, the Wall came down for the last time. **(config:** `meta.retired`, `meta.debut`**)** Why it ended, and what the band did next: **(needs a source)**. | A new render: the Wall half-struck, or the empty stage at dusk |
| 12 | What's left | Budman, the amplifier that drove Garcia's guitar, sold at Sotheby's in 2021, still in its road case. Six cabinets. A handful of photographs. **(config:** `docs/surviving-gear.md`**)** What it left behind in how concerts sound: **(needs a source)**. | A photograph of a surviving piece **(needs a credit)**, or `amps-close` if beat 10 takes the crew |

### Coda

| # | Beat | What it says | Picture |
|---|---|---|---|
| 13 | How we know | Nobody drew a plan. What is confirmed, estimated and guessed. The caveats pulled out of acts 1 to 3 land here. | `bowl` to `bowl-evidence` |
| 14 | Step inside | As now. | The live model |

### What moves, what's new, what goes

- **Moves:** the typical-PA half of the signal path (up to act 1); Bear's card
  (to its own beat); Listen (to the end of act 2); the amplifiers (into the
  cost); the evidence (to the coda).
- **New copy:** the hook's stakes line, beat 3's failed first try, all of act 3.
- **New pictures:** up to five (beats 2, 3, 8, 11, 12). Renders are about two
  minutes each; photographs need finding and crediting, and each download needs
  your say-so.
- **Goes:** nothing is deleted. Asides shrink into notes.

### Needs a source before it can be written

1. Why the Wall was retired, and the band's break from touring after October 1974.
2. What concert sound took from it afterwards.
3. Anything on what the crew or band said it was like to play through.

### Then: the live model as the story's picture

**Built as proposed, with these changes.** Steps, not scrolling: a scrolling
version was mocked up first and dropped, because the page and the model both
want the same gesture and the reader got trapped between them. No placeholder
pictures: "Before the Wall" is the signal-path diagram's own step, and "The last
night" is the model coming fully apart. Bear has no portrait. The explorer's
three tools each get a step (the buses, the six systems' chips, pull it apart).
"What's left" uses the `amps-close` render with its needles; "How we know" uses
`bowl-evidence`. Renders no step uses any more (`title`, `bowl`, `bowl-systems`,
`bowl-photo`, `bowl-hero`, `garcia-mark`, `cluster-up`) are still in
`public/story/`.

**Still to source and write:** why the Wall was retired and what the band did
next; what concert sound took from it; what it was like to play through.

---

## Open questions for you

1. **Tone.** The copy above is plain and factual. Warmer and more personal, or
   keep it like a museum label?
2. ~~**Sound.**~~ Settled in practice: the Listen players and the now-playing bar.
3. ~~**Photographs.**~~ Decided: photographs stay, credited generously (§17).
4. **The name.** The page uses "the Grateful Dead", a trademark, in a factual
   way. Any plan for the project's own title?

## To make

- The red kit, modeled (the Bowl show had the wine-red kit, not the butcher block).

The story and the explorer are one page (decided November 10, 2026, reversing
November 4): it opens on the story, and the explorer is what's left when the
story is put away.

## The crowd and the hills

They're simple figures and shapes, made in code. At a distance, with haze and
depth of field, they read as a crowd and a canyon. Close up they read as
models. To make them photographic would take outside assets: scanned or
modeled people, real tree models, an HDRI sky. Free libraries such as Poly
Haven (CC0) have trees and skies; people are harder. Each download needs your
say-so. Kling could add motion to finished frames (haze, cloth), but it
shouldn't be asked to invent people or the Wall.

# The story page: outline

The front door to the project. Most people will arrive on a phone from a shared
link and stay a couple of minutes, so the story has to work for them first. It
scrolls, it's built from pre-rendered Cycles images and short clips that load
instantly on any device, and it ends by inviting people into the 3D explorer.

A draft to react to. The copy is working copy; every figure is from the config
and carries its source.

**Built, first version (7 October 2026):** `story.html` (`src/story/`), at
<http://localhost:5174/story.html>. Beats 1–7 scroll over pinned images; beat 8
links to the explorer, which stays at `index.html` for now. Every beat lists
its sources, every image says whether it's a photograph or a render, and the
page ends in full credits (qa-findings §17). Images: `npm run story:images`
copies the graded renders from `.shots/story/v2/` (made by
`.shots/story/v2/render.sh`) and the Bowl photograph into `public/story/`.
On a phone the picture is pinned and the words scroll beside or below it, never
over it (qa-findings §20). Larger windows keep cards over a full-screen picture.

**The place: the Hollywood Bowl, Sunday 21 July 1974.** One real show gives the
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

> Sunday, 21 July 1974. The Hollywood Bowl.
>
> The Grateful Dead have brought the largest sound system anyone had built: a
> wall of speakers four storeys high, standing in front of the Bowl's shell.
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
> from 23 March to 20 October 1974, and then never again.

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
thumb, and labelled so). Sources in PROVENANCE `comparison.signalPath` and
`comparison.localization`.

### 3½. Listen

Real recordings, streamed from the Internet Archive (never copied here), in
`src/data/recordings.ts` and played by `src/ui/Listen.tsx` (also the explorer's
Listen button). Audience tapes only: a soundboard tape is the desk's feed and
never went through the Wall.

- The Wall on its own: Rob Bertrando's tape of the Bowl, 21 July 1974,
  front of the desk, Sony ECM-22Ps on cassette (*Scarlet Begonias*, *U.S. Blues*).
- Before and after: the same songs (*Sugar Magnolia*, *Me and My Uncle*) from
  Bertrando's tape of the Hollywood Palladium, 6 August 1971, same microphones,
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
> polarity. The voice reached one; the Wall reached both, and cancelled itself
> out.

Image: `cluster-up`, the curved centre cluster from below, then a diagram of the
paired microphones (to draw). This is the beat people remember. **Not in the
Blender scene yet:** the paired microphones themselves. The browser has them.
**No band recordings** without a licence; if there's sound here, it's our own
demonstration of the cancellation.

### 6. The power

> Forty-eight McIntosh MC 2300s, 600 watts each, 128 pounds each. The crew
> named them. Garcia's favourite was called Budman.

Image: `amps-close`, one rack with the meters lit and the needles swinging; the caption says the movement is illustrative. The count
(48, or Parish's "over 70") is shown as a range in the explorer.

### 7. What we know, and how well

> Nobody drew a plan of the Wall. This reconstruction is built from scaffolding
> drawings dated 10 April 1974, a press sheet from that year, the cabinets that
> survive, and every photograph we could date. Where we're sure, it's solid.
> Where we've had to estimate, it's marked.

Image: `bowl`, crossfading to `bowl-evidence`, the same frame coloured by
confidence from `PROVENANCE` (confirmed, estimated, guessed). Links to the photograph record
and the register of surviving equipment.

### 8. Step inside

> Walk the stage. Stand where the audience stood. Climb the tower.

The live 3D view, loaded in the background while the story played, opening on a
curated viewpoint.

---

## Open questions for you

1. **Tone.** The copy above is plain and factual. Warmer and more personal, or
   keep it like a museum label?
2. ~~**Sound.**~~ Settled in practice: the Listen players and the now-playing bar.
3. ~~**Photographs.**~~ Decided: photographs stay, credited generously (§17).
4. **The name.** The page uses "the Grateful Dead", a trademark, in a factual
   way. Any plan for the project's own title?

## To make

- The red kit, modelled (the Bowl show had the wine-red kit, not the butcher block).

The story and the explorer are separate products, closely linked (decided 4
November 2026): `story.html` stays the story's own address, and `index.html`
stays the explorer's. Neither is the other's front page.

## The crowd and the hills

They're simple figures and shapes, made in code. At a distance, with haze and
depth of field, they read as a crowd and a canyon. Close up they read as
models. To make them photographic would take outside assets: scanned or
modelled people, real tree models, an HDRI sky. Free libraries such as Poly
Haven (CC0) have trees and skies; people are harder. Each download needs your
say-so. Kling could add motion to finished frames (haze, cloth), but it
shouldn't be asked to invent people or the Wall.

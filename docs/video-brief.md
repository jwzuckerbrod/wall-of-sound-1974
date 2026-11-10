# Video brief: the Wall of Sound, a product demo

A draft to react to. Every figure on screen comes from `src/data/wall.config.ts`
and carries a source in its `PROVENANCE`.

## The idea

Present the Wall of Sound the way a company would launch a flagship speaker
system today: a clean, dark studio, slow precise camera moves, the system
taking itself apart and putting itself back together, crisp spec callouts.
The joke and the point are the same: in 1974 nobody had built anything like
it, and it still looks like the future.

It's about the **whole PA system**, not the band. The band appears only as
the reason the system exists, and the instruments only in the last shot.

- **Length:** 90 seconds. A 30-second cut-down comes out of the same renders.
- **Formats:** 16:9 at 1920 × 1080 (master), and 9:16 at 1080 × 1920 for
  phones, reframed from the same scenes.
- **Sound:** designed to work with the sound off, since most people will see it
  muted on a phone. Text on screen carries everything; no narrator.
- **Where it lives:** the story page and the GitHub README, and shared as a
  link.

## The look

- **A black studio.** The arena's dark hall with the floor turned into a
  glossy black stage, so the Wall sits in a void with a soft reflection under
  it. One warm key light, cool rim lights picking out the scaffold tubes,
  and the 641 aluminum dust caps catching the light like points of light.
- **Motion:** slow, weighted camera moves, nothing handheld. Every move ends
  on a hold long enough to read the text.
- **Type:** one clean sans-serif, white, thin rules and leader lines pointing
  at parts, the way a product page labels a speaker. Numbers big, labels small.
- **Color coding:** each of the six sound systems gets the color it already
  has in the explorer (vocals gold, lead guitar red, rhythm guitar violet,
  piano teal, drums blue, bass green).
- **The ending** steps out of the studio into the Hollywood Bowl on 21 July
  1974, in daylight, with the crowd: the product in the field.

## The shots

| # | Time | Shot | On screen |
|---|---|---|---|
| 1 | 0:00–0:06 | Black. A single dust cap glints. The camera pulls back out of a 15" cone, along a column, to the whole stack | *The Wall of Sound* · *1974* |
| 2 | 0:06–0:16 | The hero: a slow half-orbit of the whole Wall in the studio, low, from the front round to three-quarter | **641 speakers** · **48 McIntosh amplifiers** · **26,400 watts** |
| 2b | 0:16–0:22 | For scale: the camera holds on the whole setup while three objects appear beside it one at a time, about 2 seconds each, each lined up with the dimension it matches (see below) | The Wall's dimensions throughout; each object's height, width and length as it appears |
| 3 | 0:22–0:34 | The Wall takes itself apart: each block slides out along its own direction (the explorer's exploded view), the scaffold fading back | A label on each group as it separates |
| 4 | 0:34–0:48 | It reassembles, then lights up one system at a time in its color, each with its driver count | *Six independent systems* · Vocals 372 drivers · Lead guitar · Rhythm guitar · Piano · Drums · Bass, quadraphonic |
| 5 | 0:48–0:58 | Close on the curved vocal cluster and its aluminum strips; cut to an animated diagram of the paired microphones (as on the story page) | *Two microphones, 60 mm apart, opposite polarity* · *The voice is heard. The Wall cancels.* |
| 6 | 0:58–1:08 | A slow dolly along the amplifier racks under the stacks, the blue meters glowing; ends on Budman's black case | *48 × McIntosh MC 2300* · *600 W each, 128 lb each* |
| 7 | 1:08–1:12 | Two component close-ups, product-page style, each on black with a spec line: a 15" JBL in its cabinet, then the T350 horn | Each with its source: *Surviving cabinet, Sotheby's 2021*; *Surviving tweeter, Julien's 2026* |
| 8 | 1:12–1:20 | The structure: the scaffold builds itself lift by lift, then the stacks drop in | *38 ft of steel above a 10 ft stage* · *From the scaffolding drawings of 10 April 1974* |
| 9 | 1:20–1:30 | The Hollywood Bowl, afternoon: a slow push in from the seats over the crowd to the Wall, the band's instruments on stage. End card | *Hollywood Bowl, 21 July 1974* · *A reconstruction from photographs, drawings and surviving equipment* · the explorer's link |

The 30-second cut: shots 1, 2, 2b, 4, 6 and 9, shortened.

## Shot 2b: the Wall for scale

Three objects, each matching the Wall along one dimension, smallest first.
The Wall's own figures stay on screen: **60 ft of speakers · 64 × 40 ft
scaffold · 82 ft stage · 48 ft 10 in to the top**.

| Order | Object | Its dimensions (L × W × H) | What it matches |
|---|---|---|---|
| 1 | A 1974 Volkswagen bus (Type 2, "Bay Window") | 14 ft 9 in × 5 ft 8 in × about 6 ft 5 in–6 ft 8 in (4,505 × 1,720 × 1,955–2,040 mm; the height still to settle) | Four end to end make the 60 ft run of speakers. The Deadhead's vehicle, and the right year |
| 2 | A blue whale | up to about 90 ft long in the Northern Hemisphere (NOAA; up to about 110 ft in the Antarctic), about 15 ft through the body | One spans the 82 ft stage |
| 3 | A Boeing 737-200, the airliner of 1974 | 100 ft 2 in long, 93 ft span, 36 ft 10 in to the tail (confirmed: Boeing, D6-58325-6 Rev E, §2.2.2 and §2.3.1) | On the same ground, the Wall stands 12 ft taller than its tail (48 ft 10 in against 36 ft 10 in): the punchline |

The figures go into the config with sources before they go on screen. The
737's are confirmed against Boeing's airport-planning manual and the whale's
against NOAA Fisheries. The bus's length and width agree across sources; its
height varies by source and roof (1,955–2,040 mm) and needs a Volkswagen
figure. References are in `.shots/reference/scale/` (local), with
`CREDITS.md` listing each photograph's author and license.

**Staging.** The bus parks in front of the stage, then three more roll in
behind it. The whale doesn't lie on the floor (a whale out of water reads as
a stranding): it hangs in the studio's dark like the life-size model in a
natural-history museum, level with the stage. The 737 sits beside the Wall at
the same depth, side on, its tail nearest the tower, so perspective doesn't
flatter either height (as in the explorer; qa-findings §23).

**Realism.** Photographic, like the Wall: each modeled in Blender from
dimensioned drawings and photographs, scaled exactly, with real paint,
chrome, glass and skin. References needed:

- **The bus:** factory dimensioned drawings (side, front, top), and good
  photographs of a 1974 example: paint, chrome, rubber seals, the interior
  through the windows.
- **The whale:** a scientific side profile and cross-sections (the NOAA and
  museum illustrations), and photographs of the skin, which is mottled
  blue-gray.
- **The 737-200:** Boeing's "737 Airplane Characteristics for Airport
  Planning" (public, with three-view drawings), and photographs of a 1974
  aircraft.

## Being honest on screen

A product demo oversells by habit; this one can't.

- A small "Reconstruction" mark sits in a corner throughout, as on the story
  page.
- Where a number is disputed, the text says so in the fewest words: the amp
  count is the published 48 (Parish remembers "over 70"); the bass is
  "four channels" rather than a claim about how they were split.
- The end card credits the sources and the photographers, as the story page
  does.
- The skull-and-bolt stickers on the cases are an artistic choice, not 1974
  evidence (`materials.stickers`). They'd be switched off for the close-ups
  of the cases, so nothing in a close-up looks like a claim it can't support.

## How we'd make it

All in Blender, from the model as it stands, scripted like the renders
(a new `blender/video.py`), so any fix to the model re-renders the video.

- **The studio** is a new venue setting: the arena hall in black with a
  reflective floor.
- **The exploded view and the system colors** use the same data the
  explorer does (each block's explode direction, each channel's color), so
  they match the explorer exactly.
- **The text** is laid over the frames in Blender's video editor; Blender
  writes the finished MP4 itself.
- **Render engines:** EEVEE (Blender's fast real-time engine) for the studio
  shots, Cycles (the renders' engine) for the Bowl at the end, where the
  light matters most.
- **Time:** roughly 2 to 3 hours of EEVEE plus an overnight Cycles run for
  the Bowl shot, before any revisions. Those are estimates: I'd render one
  test frame of each shot first and give you real numbers.
- **Cost:** none. No paid music, no voice, no AI video. Kling could add
  motion to the crowd in shot 9, but by our rule AI may only touch crowd
  pixels, and it isn't needed.

## Decisions for you

0. **For shot 2b:** the bus's color; whether the 737 carries a real 1974
   airline's livery (a trademark, credited like the band's marks) or plain
   paint (recommended, so it doesn't look like an airline's advert); and
   the hanging whale.

1. **Music.** Silent with on-screen text (recommended for a first version),
   or a licensed instrumental bed. A Grateful Dead recording would need a
   license; a stock-library track would cost money, and I'd ask before
   buying anything.
2. **Length.** 90 seconds plus a 30-second cut (recommended), or only one of
   them.
3. **The band.** Instruments only in the final shot (recommended), or in
   every stage shot, as in the explorer.
4. **Tone of the text.** Spec-sheet terse, as drafted ("641 speakers"), or a
   little warmer.
5. **Where it goes first.** The story page, the README, or a link to share.

## Next step

On your go-ahead: a 15-second test of shots 2 and 3 (the orbit and the
explode) at full quality, so you can judge the look before the rest is made.

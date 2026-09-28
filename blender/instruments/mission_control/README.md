# Mission Control

Phil Lesh's Alembic, serial 74 00008, built by Rick Turner and played from
16 June 1974 to 1 July 1979. Modelled as **version 1**, summer 1974, the stage's
target date (see `../README.md`).

```
Blender -b -P blender/instruments/mission_control/trace.py              # photo -> outline.json
Blender -b -P blender/instruments/mission_control/build.py -- --shot hero   # or detail, match; --save
Blender -b -P blender/compare.py -- --color \
    --render .shots/instruments/mission-control-match.png --photo .shots/reference/mission-control-front.jpg
```

`mission-control-front.jpg` is the left half of `mission-control-front-back.jpg`.

## Reference photographs (not in the repo; in `.shots/reference/`)

| File | Source | Used for |
|---|---|---|
| `mission-control-front-back.jpg` | gdsets.com/philbasses.htm | Straight-on front: body and headstock outlines, board width, every hardware position. ~16 px/in |
| `mc-johnson-front.jpg`, `mc-johnson-body.jpg`, `mc-johnson-back.jpg` | Lisa S. Johnson, via Guitar World | Materials, colours, hardware shapes, and the neck laminate order (from the back) |
| `mc-scheuner-headstock.jpg` | Jason Scheuner (owner), via Guitar World | Headstock face |

## Sources for the facts

- **gdsets.com, Phil's basses**: the dated versions. Version 1 (16 Jun 1974 to
  early 1975) has a U-channel bridge and batwing tailpiece, **no pickup rings
  and no wood trim**. Wooden rings from 20 Oct 1974; a single koa and abalone
  ring after 23 Mar 1975. Before 16 June Lesh played "Big Brown".
- **Guitar World**, on the 2020 restoration: koa top and back, wings of
  mahogany core with maple and walnut veneers; neck-through of seven laminates
  of walnut, maple and Osage orange; ebony board with eleven inlays; red and
  green LED markers; low-impedance neck and bridge pickups plus a thin quad
  pickup by the bridge; walnut and brass batwing tailpiece; era-correct
  U-channel bridge; the ring was Doug Irwin's, added in 1975.

## Confidence

| | Source |
|---|---|
| Body and headstock outlines, button positions | Traced (headstock mirrored; its tuner shafts bit the edge) |
| Knobs, stars, coils, quad pickup, bridge, tailpiece, output plate, board width | Read off the front photograph on a grid |
| Woods, laminates, hardware types | Guitar World; laminate order read off the back |
| **Scale length 32"** | **Estimate**: a forum figure; nothing published. Every size follows from it; a one-line change |
| Body thickness 1.75", headstock pitch 8°, neck depth, string gauges | Estimates |
| Output plate as brass with a koa window | Guitar World says the original was brass and koa; its exact shape isn't shown |

## Outstanding

1. **Scale length.** Needs a measurement (the owner, Jason Scheuner, or Scarlet
   Fire Guitars, whose replica was laser-scanned).
2. **The eleven fingerboard inlays** (mother-of-pearl bolts striking lapis, an
   abalone serpent, moon, stars...) and the **LED markers**: the straight-on
   photo is too small to trace them and the close-ups are at an angle.
3. **Headstock**: the mother-of-pearl dove and the medallion's own inlay; the
   face is a plain rosewood stand-in. The edge is wobbly (16 px/in trace).
4. **Knob and star detail**: the stars are generic five-point shapes where the
   real ones are long, thin sunbursts; knob caps are plain.
5. The decorative purfling around the top in the photographs is left off:
   gdsets dates the wood trim after version 1.

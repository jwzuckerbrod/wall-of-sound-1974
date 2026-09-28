# Gibson ES-335

Bob Weir's Gibson ES-335, a 1958–62 "dot neck" in a faded sunburst, as he
played it in summer 1974, the stage's target date (see `../README.md`).

Weir's own guitar isn't documented closely enough to trace (no serial, no
straight-on photograph). The shape, the headstock face and the wood figure
come from a real guitar of the same model and period, Gibson's Certified
Vintage 1960 ES-335TD (serial A33064). The colour and the 1974 details come
from two photographs of Weir playing it that summer.

```
Blender -b -P blender/instruments/es335/trace.py              # front view -> outline.json
Blender -b -P blender/instruments/es335/textures.py           # body close-up -> registered, cleaned top
Blender -b -P blender/instruments/es335/headstock_texture.py  # headstock close-up -> face, outline, posts
Blender -b -P blender/instruments/es335/build.py -- --shot hero   # or detail, head, match; --save
```

## Reference photographs (not in the repo; in `.shots/reference/`)

| File | Source | Used for |
|---|---|---|
| `es335-gibson-front.webp` | gibson.com, Certified Vintage 1960 ES-335 (A33064) | Straight-on cutout: body outline, pickguard, board widths, fret fit, every hardware position |
| `es335-gibson-side.webp` | the same | Body depth |
| `es335-gibson-body.png` | the same | The top's wood figure and burst shape (registered to the outline, hardware erased) |
| `es335-gibson-headstock.webp` | the same | **The headstock face itself**: straightened into a texture, plus the headstock outline and the six tuner posts |
| `es335-gibson-knobs.webp` | the same | Bell knobs, close up |
| `weir-1974-06-16-desmoines.jpg` | dead.net archive, Des Moines, 16 June 1974 | Weir's guitar that summer: dot neck, covered pickups, black guard, bell knobs |
| `weir-335-anderson-stage.jpg` | Supplied by the project owner: Jim Anderson, Dillon Stadium, Hartford, 31 July 1974 | The same, sharper; the faded amber burst the model is re-toned to |
| `weir-335-later.png` | Supplied by the project owner | A later photograph, for comparison only |

## How the photographs are used

**Scale.** Gibson's catalogue cutouts are not square-pixelled: the front view
is 5.5% taller than it is wide, and the body close-up 4.7% (the headstock
close-up is square). The trace scales the two directions separately:

- **Along the neck**: the 23 frets are fitted to the 24.75" scale, at 47.67 px/in with 0.65 px RMS error. The fit is anchored at the nut, which shows as the white band across the neck. The fret series is self-similar, so without an anchor it fits one fret off just as well, at a scale 6% out; an earlier version of this model did exactly that. The first dot inlay falling between frets 2 and 3 confirms the numbering.
- **Across**: Gibson's 1 11/16" nut, which gives 45.19 px/in.

The body then measures **16.02" × 19.84"** (Gibson publishes 16" wide).

**The top.** `textures.py` registers the body close-up to the traced outline
with an affine fit to the silhouette, by iterated closest points (1.4 px RMS).
It does not use the hardware for this: the pickups, bridge and knobs stand up
to 3/4" proud, and in a close-up they are displaced outward from the middle
of the frame by up to 0.27".

It then erases everything the model has its own version of:

- the pickguard, as traced and as the photo's black
- the pickups, bridge and tailpiece
- a corridor under the strings
- the knobs, toggle, jack and guard bracket
- Gibson's studio glare on the dark outer burst

The gaps are filled with the burst's own profile by distance from the edge,
plus the slow variation around it spread in from the surrounding wood. No
wood figure is invented, so those areas are plain burst. In `build.py` the
photo's light and dark are mapped onto Weir's colours, sampled from
Anderson's photograph.

**The headstock.** `headstock_texture.py` maps the close-up onto the face
plane with an affine fit:

- **Across**: the nut's two ends.
- **Along**: the face's centre line, found from the midpoints of the three mirror pairs of tuner bushings (a circle vote finds the bushings) and of the nut. The posts are symmetric by design, and the pairs agree to within 0.05".

The outline, the post positions and the texture all come from that one
photograph, so they line up by construction. The strings and bushings are
erased, and the lacquer around them is blurred in.

The keystone buttons sit behind the face, so parallax moves them in the
photograph. Averaging the bass and treble sides cancels it, which puts them
1.03" out from each post.

**Match.** `--shot match` renders orthographically, pixel for pixel with the
front view, with non-square pixels to reproduce its aspect. The nut, frets,
pickups, bridge, tailpiece and knobs land within about 0.1" of the photograph.

## Confidence

| | Source |
|---|---|
| Body outline, pickguard, board widths, hardware positions | Traced or read off Gibson's front view |
| Headstock outline and face (logo, crown, truss-rod cover), tuner posts | Gibson's headstock close-up, straightened |
| Top figure and burst shape | Gibson's body close-up, re-toned to Weir's colours |
| Dot neck, covered pickups, black guard, bell knobs, faded amber burst | Weir, 16 June and 31 July 1974 photographs |
| 24.75" scale, 22 frets, 1 11/16" nut, neck joining at fret 19, 17° headstock pitch, Tune-o-matic and stop tailpiece | Gibson |
| **Arch heights** (0.30" top, 0.25" back, rising over 2.5" from the edge, smoothed) | **Estimate**: the side view's 2.30" total over the 1.75" rim, split |
| Neck profile and heel, string gauges, keystone button shape | Estimates |

## Outstanding

1. **Weir's own guitar.** Every Weir-specific detail beyond the 1974 photographs is the 1960 reference guitar's: exact year, figure, wear, and headstock face. The two 1974 photographs are too distant to show wear, finish checking or the headstock.
2. **F-holes** are in the texture only; they aren't cut through the top.
3. **Pickguard bracket.** It shows in Gibson's photograph, where the guard's tip meets the rim. It is erased from the texture but not modelled.
4. **Under the hardware** the top is plain burst, since the photograph can't show what was there. It is hidden by the guard and pickup rings, but visible between the pickups under the strings.
5. **Keystone buttons** are generic rounded paddles, not traced. The tuner housings on the back are never photographed and are kept inside the outline.
6. **Truss-rod cover outline**: a short gap remains where two strings crossed it in the close-up.
7. **Stop tailpiece** shows a shading seam along its top.
8. **Aspect of Gibson's images.** The across scale rests on the 1 11/16" nut spec. If Weir's guitar or A33064 has a different nut, every width shifts with it.

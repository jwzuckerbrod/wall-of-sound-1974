# Grand piano

Keith Godchaux's grand piano as it stood at Winterland, San Francisco, 16–20
October 1974. That run falls inside the stage's summer-1974 target date (see
`../README.md`), and it's the most thoroughly documented of the year: the
shows filmed for *The Grateful Dead Movie*.

The piano was rented, so its make changed from venue to venue. From 1972 to
1974 Keith played 9-ft Steinway or Yamaha grands, fitted with Carl
Countryman's pickup. No photograph of the Winterland run shows the fallboard,
the only place the maker's name appears. It is modelled as a **New York
Steinway Model D**, the likeliest rental, and **the make is unconfirmed**.

```
Blender -b -P blender/instruments/piano/trace.py               # drawing -> outline.json
Blender -b -P blender/instruments/piano/build.py -- --shot hero    # or keys, top; --save
```

## Reference (not in the repo; in `.shots/reference/`)

| File | Source | Used for |
|---|---|---|
| `keith-19741016_1814.jpg` | dead.net, Winterland, 16 Oct 1974 | The piano from above and behind while Keith played: black, **lid closed flat including the front flap** (so no music desk), right of the drum riser, tail toward the audience |
| `keith-19741020_2037.jpg` | dead.net, Winterland, 20 Oct 1974 | The whole stage before the show, the piano under a cover cloth: where it stood |
| `keith-19741020_1102.jpg` | dead.net, Winterland, 20 Oct 1974 | Checked: the figure behind Garcia is Kreutzmann, not Keith; nothing on the keyboards |
| `steinway-d-plan.svg` | dimensions.com, "Steinway Grand Piano – Model D" | Plan, side and front elevations, vector, dimensioned 107.75" × 61.75" |

## How the drawing is used

`trace.py` reads the SVG's strokes with Blender's own importer, draws them into
a raster, and traces:

- **The plan outline**: the rim's outer line. The rim is drawn as two lines, open at the keys, and the gap between them is bridged before filling.
- **The side profile**: the cheeks' S-curve, the keybed, and the rim's underside and top.
- **The front legs' turned profile**, row by row.
- **Where things stand**: the three legs, the lyre posts and the pedals, and the lines across the plan (the keys' back edge, the front of the case, the fold of the lid's front flap).

**Scale.** The length sets the scale for all three views. At that scale the
side view measures 107.99" against the published 107.75". The plan is drawn
about 2.5% narrow for its length, so only its width is scaled to Steinway's
61.75". The front view comes out at 61.5" wide.

**Heights read off the drawing:**
- key tops: 28.1" (dimensions.com lists 28.125")
- rim top: 40.05"
- underside of the rim: 28.1"
- underside of the keybed: 24.8"

## Confidence

| | Source |
|---|---|
| Black, 9-ft grand, lid and front flap closed, no desk | Winterland photographs, 16 and 20 Oct 1974 |
| 107.75" × 61.75" | Steinway, published |
| Case outline, cheek profile, heights, leg profile and positions, lyre and pedal positions | The dimensioned drawing |
| 88 keys (52 white at 0.925"), black sharps, red key felt | The standard keyboard |
| **Make (Steinway)** | **Estimate**: the likeliest rental; the photographs can't show it |
| Lid thickness 0.9", legs round in section, lyre posts, pedals, casters, brace rods, finish (black, satin coat), key materials | Estimates |

## Outstanding

1. **The make.** It needs a Winterland 1974 image that shows the fallboard, such as a frame from *The Grateful Dead Movie*. It is modelled as a Steinway but carries no logo, since the name isn't evidenced.
2. **New York Steinway details.** The legs, lyre, cheek blocks and arms come from the drawing, which is generic; the drawing looks Hamburg-styled. The 13 photos of a 1972 New York D from Kim's Piano would settle them, but the site blocks automated downloads.
3. **The small object on the lid** in the 16 October photograph. It may be part of Countryman's pickup rig, but can't be identified, so it is left out.
4. **The fallboard and key cover** are simplified to a flat front above the keys.
5. **Hinges**: the lid's hinges and the front flap's piano hinge aren't modelled.
6. **Position on the stage**, beside the drum riser, is to be set when the piano goes into the Wall of Sound scene.

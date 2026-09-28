# Instruments

Each instrument is built by a script from traced numbers and cited specs, never
modelled by hand, so a better photograph or a corrected fact means rerunning a
script rather than re-sculpting.

## Wolf (Jerry Garcia, Doug Irwin 1973), as in 1974

```
Blender -b -P blender/instruments/trace_wolf.py            # photo -> wolf_outline.json
Blender -b -P blender/instruments/wolf.py -- --shot hero   # or detail, match; --save
Blender -b -P blender/compare.py -- --color \
    --render .shots/instruments/wolf-match.png --photo .shots/reference/wolf-irwin-body.jpg
```

`Blender` is `/Applications/Blender.app/Contents/MacOS/Blender`. Renders go to
`.shots/instruments/` (ignored).

### Reference photographs (not in the repo; download to `.shots/reference/`)

| File | Source | Used for |
|---|---|---|
| `wolf-irwin-body.jpg` | Herb Greene, irwin-guitars.com/the-guitars/jerry-garcias-guitars/wolf/ | Body outline, fingerboard width, inlays 13-24, centre stripes, plate and control positions. Straight-on; scaled off the frets. |
| `wolf-met-2019.jpg` | Wikimedia Commons, the Met, *Play It Loud*, 2019 (CC BY 2.0) | Headstock outline and tuner posts, scaled off the 25" nut-to-saddle distance. |
| `garcia-1974-06-16-desmoines.jpg` | dead.net 1974 archive, Kirk Drange | 1974 evidence for the top and finish. |

### How the scale is fixed

Irwin gives a 25" scale, so fret *n* lies 25 × (1 − 2^(−n/12)) in from the nut.
`trace_wolf.py` finds the frets in the photograph and fits them to that series
(frets 13–24 identified, 0.56 px RMS), which sets both the pixels per inch
(44.47) and the saddle line. The saddle line it predicts lands on the real
saddles in the photo, which the fit never saw.

`wolf.py --shot match` renders orthographically at the same pixels per inch and
centre as the photograph; `compare.py --color` overlays them.

### Confidence

| | Source |
|---|---|
| Body outline, fingerboard width at the body, inlays 13–24, centre stripes | Traced |
| Headstock outline, tuner posts | Traced (Met photo is slightly off-axis; left and right averaged) |
| 25" scale, 24 frets, woods, laminations, Schaller hardware, three Stratocaster pickups | Irwin, original build |
| Pickup plate, control and jack positions | Traced from the later (1978+) layout; assumed unchanged |
| Body thickness 1.75", headstock pitch 10°, nut width 1.69", string gauges | Estimates |
| 1974 controls: volume, tone, 5-way, one jack | Irwin's feature list, less the 1977 effects loop and the 1978 coil switches |

### Deliberately left off until evidence turns up

- **Peacock headstock inlay.** The Met photo shows the later eagle.
- **The cartoon-wolf sticker.** A 30 Nov 1973 photograph shows the guitar without it.
- **Inlays below fret 13.** Neither photograph shows them cleanly enough yet.

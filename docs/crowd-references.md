# The crowd: reference photographs and what they say

Photographs collected by the project owner as a guide to the crowd in the story
renders (`docs/story.md`). They are in `.shots/reference/crowd/`, which is
ignored: they are other people's photographs, kept for reference, not
redistributed. Sources and dates are mostly unknown.

| File | What it is | Useful for |
|---|---|---|
| `crowd-1970s-bw-field-wall.jpeg` | Black and white, an outdoor field, the Wall in the distance under a hazy sun. Probably 1974 | **The best match.** Density, haze, people walking about, scale against the Wall |
| `crowd-1970s-colour-hillside-seated.jpeg` | Colour snapshot, people sitting on a grassy hillside, a stage far off | Seated on the ground, blankets, faded print colour |
| `crowd-1970s-colour-closeup-jersey.jpg` | Colour, close, standing crowd, warm faded film | Clothes and hair, close up |
| `crowd-1970s-bw-meyerowitz-rockoutbooks.jpeg` | Black and white, credited on the image to Alvan Meyerowitz / Rock Out Books | Clothes: denim, hats, long skirts, sitting on grass |
| `crowd-1970s-colour-lying-on-grass.jpg` | Colour, people lying and sitting on grass | Poses: reclining, headbands, shirts off |
| `crowd-1970s-colour-couple-portrait.webp` | A portrait, not a crowd | Faces, hair and clothes of the period |
| `crowd-colour-faces-smiling.jpg` | Colour, faces in a crowd, undated | Hats and expressions |
| `crowd-1980s-colour-field-tiedye.webp` | Colour, a Dead show in a field, probably late 1980s (stage design, tie-dye T-shirts) | **Wrong era:** shows what to avoid |
| `crowd-modern-stadium-rose.jpeg` | Colour, a modern stadium Dead show | **Wrong era:** shows what to avoid |

## What 1974 looked like, against what Kling produced

- **Density and scale.** At a 1974 show the crowd is a dense, small-scale
  texture: hundreds of heads, nobody larger than a thumbnail unless the camera is
  among them. Kling made a dozen large figures shoulder to shoulder, as if the
  camera stood in the front row.
- **Posture.** Many sit or lie on the ground or the benches, on blankets, some
  stand and wander. Kling made everyone stand still, facing forward.
- **Clothes.** Denim, plain and striped shirts, tank tops, shirts off,
  peasant blouses, long skirts, headbands, cowboy and floppy hats. **No tie-dye
  T-shirts to speak of**: those belong to the 1980s crowds. Kling's crisp plain
  T-shirts and modern straw fedoras read as 2020s.
- **Hair.** Long, centre-parted, on men and women; beards; big curly hair.
- **Colour.** Warm, faded, low contrast: Kodachrome and Ektachrome prints, grain,
  a little haze. Kling's image is clean and modern.

## How to make the crowd right

1. **Get the scale right first, in Blender.** The crowd's size is fixed by
   geometry, not by the edit: render the masked crowd region and ask the edit
   only to change what's already there, at the size it already is. The prompt
   should forbid enlarging or moving people.
2. **Mix the poses in Blender:** seated figures on the benches, some standing,
   some lying in the pool circle, some walking in the aisles, so the shapes Kling
   starts from are already right.
3. **Feed Kling these photographs as style references.** Kling's image editor
   takes up to 10 images. The render as image 1 and two or three of these
   (the field, the hillside, the close crowd) as images 2–4, with a prompt that
   says to match their people, clothes and film colour but keep image 1's
   framing and scale.
4. **Grade the whole frame** like a 1974 colour print (warmer, lower contrast,
   grain) after compositing, so the crowd and the Blender render share one look.
5. **Keep the mask.** Only crowd pixels come from the edit; the Wall stays as
   modelled.

## Not a congregation

The first Kling pass on the `bowl` shot came out like an audience in pews:
everyone seated, evenly spaced, facing forward. The photographs show a crowd
before a show as loose and uneven. The Blender crowd now has, on the benches:

- about a third standing, on the treads or between benches
- people perched on the bench backs, and some sitting on the steps
- a few lying along a bench, and blankets in the pool circle
- clusters and gaps, from a slow noise over the bowl
- about one in six turned to the side, as if talking
- people walking in the aisles

And the Kling prompt asks for the same: an informal crowd, not orderly rows.

## The wide shot (`bowl-hero`)

From high in the seats most people are a few pixels tall, and no image edit
tried so far repaints them: Kling O1, on the whole frame and on 16:9 tiles,
reframed and kept the figures; Nano Banana Pro (20 credits a tile) kept the
framing and made the nearest third of a tile into real 1970s people, but left
the rest as figures. So for this shot the distant crowd is Blender's:

- each figure has a look: short hair, long hair to the shoulders, long hair
  under a hat (cowboy and floppy hats), or long hair and shirt off; and a
  build, slight to broad, short to tall
- haze a little thicker, and a wide aperture to soften the crowd
- the looks come from their own random stream, so the crowd's places stay
  fixed and an edited render can be laid back over a new one

The Nano Banana Pro tile's near rows are laid into the frame
(`crowd_mask.py place ... 1.0 0.5`: alignment accepted, lower half only).

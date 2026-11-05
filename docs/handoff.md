# Handoff: where things stand (4 November 2026)

## Done recently

- **Band and Wall corrected from photographs**: band order Garcia, Weir, kit,
  Lesh, Keith at a grand across the stage (§9); bass-drum block moved out from
  under the cluster (§10); cluster 5"s in aluminium strips (§11); stacks behind
  the front scaffold, light bars (§13); cabinet sizes from surviving cabinets
  (§8, `docs/surviving-gear.md`).
- **Road gear** in Blender: MC 2300s, Anvil and ZERO cases, traced
  skull-and-bolt and GRATEFUL DEAD stencil (`blender/roadgear.py`).
- **Story page outline** (`docs/story.md`), set at the Hollywood Bowl, 21 July
  1974 (`blender/hollywood_bowl.py`, §14): shell, Sonotubes, canyon, Poly Haven
  scenery, haze, 1974 print grade.
- **Crowd**: 144 MakeHuman people (`blender/make_people.py`, §16), facing the
  stage (facing bug fixed in `0b2443a`), jeans, natural hair.

## Decided (7 October 2026, qa-findings §17)

- **Crowd: accepted as it is.** Lean on haze and grade; frame detail shots
  without crowd close to the camera. No scanned-people pack.
- **Band at the Bowl: Garcia, Weir, the kit, Lesh, the pianos**, as modelled.
- **Rights: photos, marks and logos stay** in the repo and on the public site.
  Credit generously: photographer and source on every photo shown, sources
  linked, and a full credits page on the site.

## Decided (4 November 2026)

- **The story and the explorer are separate products, closely linked.** Neither
  is the other's front page: `story.html` and `index.html` keep their addresses.

## Other open items

- **Story:** built, on the phone layout (§20) and with its last pictures (§21).
  Left: the red kit (still the Hartford concert-tom model, recoloured), and two
  questions in `docs/story.md` (tone, the name). Not yet tried on a real phone:
  the new title and the needles.
- A second, smaller curved cluster low right at the Bowl, not modelled, and the
  right-hand bank's short front row of tubes (§19).
- The Bowl photograph shows no sign of a 10 ft deck (§19); the model keeps it.
- Where the bass-drum column really stood (guess, `arrays.kickPosition`).
- Stack heights against Pechner's photograph, the cluster's row pitch (§6).
- No photograph from July to October shows the whole band (§7, §9).
- **Explorer:** two AI-generated crew figures at the scaffold's top corners, labelled so (§23). QA 2.2 and 2.5 to 2.8 are closed (§22). The deck's cables, the
  Bowl's riser and pale floor are in the explorer only, so the story's renders
  don't have them yet. The Bowl has simple trees and, by decision, no crowd. A
  full-screen instrument viewer is scoped (§22) and parked: not now, by decision.
- **Live** at https://jwzuckerbrod.github.io/wall-of-sound-1974/ (GitHub Pages,
  deployed on every push to master).

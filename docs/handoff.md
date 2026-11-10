# Handoff: where things stand (November 10, 2026)

## Done recently

- **Band and Wall corrected from photographs**: band order Garcia, Weir, kit,
  Lesh, Keith at a grand across the stage (§9); bass-drum block moved out from
  under the cluster (§10); cluster 5"s in aluminum strips (§11); stacks behind
  the front scaffold, light bars (§13); cabinet sizes from surviving cabinets
  (§8, `docs/surviving-gear.md`).
- **Road gear** in Blender: MC 2300s, Anvil and ZERO cases, traced
  skull-and-bolt and GRATEFUL DEAD stencil (`blender/roadgear.py`).
- **Story page outline** (`docs/story.md`), set at the Hollywood Bowl, July 21
  1974 (`blender/hollywood_bowl.py`, §14): shell, Sonotubes, canyon, Poly Haven
  scenery, haze, 1974 print grade.
- **Crowd**: 144 MakeHuman people (`blender/make_people.py`, §16), facing the
  stage (facing bug fixed in `0b2443a`), jeans, natural hair.

## Decided (October 7, 2026, qa-findings §17)

- **Crowd: accepted as it is.** Lean on haze and grade; frame detail shots
  without crowd close to the camera. No scanned-people pack.
- **Band at the Bowl: Garcia, Weir, the kit, Lesh, the pianos**, as modeled.
- **Rights: photos, marks and logos stay** in the repo and on the public site.
  Credit generously: photographer and source on every photo shown, sources
  linked, and a full credits page on the site.

## Decided (November 10, 2026, qa-findings §27)

- **The story and the explorer are one page.** `index.html` opens on the story,
  told in eighteen steps over the live model (`src/story/`); putting the story
  away leaves the explorer. This reverses November 4's "separate products".
  `story.html` only redirects.

## Other open items

- **Story:** built as steps over the model (§27). Not yet tried on a real
  phone or the Simulator: touch, the swipe, a phone on its side. Left: the
  ending's why (needs sources), the red kit, tone and the name
  (`docs/story.md`). Not pushed as of this note.
- A second, smaller curved cluster low right at the Bowl, not modeled, and the
  right-hand bank's short front row of tubes (§19).
- The Bowl photograph shows no sign of a 10 ft deck (§19); the model keeps it.
- Where the bass-drum column really stood (guess, `arrays.kickPosition`).
- Stack heights against Pechner's photograph, the cluster's row pitch (§6).
- No photograph from July to October shows the whole band (§7, §9).
- **Explorer:** two AI-generated crew figures at the scaffold's top corners, labeled so (§25). QA 2.2 and 2.5 to 2.8 are closed (§22). The deck's cables, the
  Bowl's riser and pale floor are in the explorer only, so the story's renders
  don't have them yet. The Bowl has simple trees and, by decision, no crowd. A
  full-screen instrument viewer is scoped (§22) and parked: not now, by decision.
- **Scale:** a "Compare size" menu in the explorer shows four VW buses along the
  stage or a 737-200 beside it (§23). The whale is left to the film
  (`docs/video-brief.md`, shot 2b).
- **Crew figures, to improve as the project goes** (§25): a mustache-only sitter
  (`sit2.png` needs its mesh) and the top-right man tightening a clamp (prompt in
  `blender/assets/crew-ai/gen.py`), both waiting on the free Hugging Face quota; warm
  forearms; then, if wanted, a Cycles test for pre-rendered views. Painting the picture
  back onto the mesh was tried and failed.
- **Live** at https://jwzuckerbrod.github.io/wall-of-sound-1974/ (GitHub Pages,
  deployed on every push to master).

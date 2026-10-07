# Handoff: where things stand (7 October 2026)

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

## Open decision: the crowd

The crowd is believable at a distance but **not photographic up close**.
AI edits haven't fixed it (§15, §16, `docs/crowd-references.md`). The user was
choosing between:

1. **Buy a scanned-people pack** (e.g. Renderpeople, ~$200–600) for the near
   rows, MakeHuman in the distance. Recommended for photoreal.
2. **Accept the current crowd**, lean on haze and grade, and use close shots
   without crowd for detail.

## Other open items

- Red kit at the Bowl: recoloured, but still the Hartford concert-tom model.
- A second, smaller curved cluster low right at the Bowl, not modelled.
- Where the bass-drum column really stood (guess, `arrays.kickPosition`).
- Band layout July–October (Weir/Lesh swapped on some dates).
- Browser app: no outdoor venue, bare deck (QA 2.2), no Blender props yet
  (plan: glTF pilot with one MC 2300 rack).
- Story page itself not built; stage 6 (performance on a phone) and stage 7
  (deploy) not started.
- Rights before any public launch: photo permissions (Pechner, Schneider,
  Kirk West, Sotheby's), trademarks (skull, name), the traced logo file in the
  public repo.

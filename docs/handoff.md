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

## Decided (7 October 2026, qa-findings §17)

- **Crowd: accepted as it is.** Lean on haze and grade; frame detail shots
  without crowd close to the camera. No scanned-people pack.
- **Band at the Bowl: Garcia, Weir, the kit, Lesh, the pianos**, as modelled.
- **Rights: photos, marks and logos stay** in the repo and on the public site.
  Credit generously: photographer and source on every photo shown, sources
  linked, and a full credits page on the site.

## Other open items

- **Story page**: first version built (`story.html`, `src/story/`; see
  `docs/story.md` for what's left). Stage 6 (performance on a phone) and
  stage 7 (deploy) not started. Photographs shown on it are copied into
  `public/story/` by `npm run story:images`, credited in `src/story/images.ts`.
- Red kit at the Bowl: recoloured, but still the Hartford concert-tom model.
- A second, smaller curved cluster low right at the Bowl, not modelled.
- Where the bass-drum column really stood (guess, `arrays.kickPosition`).
- Browser app: no outdoor venue, bare deck (QA 2.2), no Blender props yet
  (plan: glTF pilot with one MC 2300 rack).

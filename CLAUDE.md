# Wall of Sound, 1974: working notes for Claude

A historically sourced 3D reconstruction of the Grateful Dead's Wall of Sound
(summer 1974), as a browser app and a Blender scene, plus a story page built
from Cycles renders. Read `docs/handoff.md` first for where things stand.

## Principles

- **Evidence first.** Every number lives in `src/data/wall.config.ts` with a
  `PROVENANCE` entry (confidence + sources). Change the config, not geometry.
  Anything not dated to summer 1974 is labelled (e.g. `materials.stickers`).
- **Check against photographs.** Pechner's 17 May 1974 photo has a solved
  camera (`build_scene.py --shot pechner`, `blender/compare.py`). The story is
  set at the **Hollywood Bowl, 21 July 1974**.
- **Record findings** in `docs/qa-findings.md` (numbered sections; last is
  §22) and gear in `docs/surviving-gear.md`.
- **Run `npm run check` and `npm run verify` before committing.** 641 drivers.

## Running things

- Browser app: `npm run dev` (port 5174; `.claude/launch.json` "wall-of-sound").
  Story page at `/story.html`; its images via `npm run story:images`.
- After config changes: `npm run export:scene` (writes `blender/scene.json`).
- Blender: `/Applications/Blender.app/Contents/MacOS/Blender -b -P <script> -- <args>`
  - `blender/build_scene.py --shot pechner|gear|rack|cluster [--venue arena|outdoor|hollywood]`
  - `blender/stage_review.py --venue hollywood --shot bowl|bowl-hero|garcia|cluster-up|amps|bowl-tower --sun 30,-50 --exposure 0.3 [--samples N --scale % --name X --no-crowd]`
  - `blender/crowd_mask.py mask|composite|tiles|place|grade ...`
  - `blender/make_people.py --count 144` regenerates the crowd library.
  - `blender/export_instruments.py` bakes the instruments to `public/models/*.glb`
    for the explorer (after `npm run export:scene`; about a minute).
- Shared layout code feeds both renderers: `src/geometry/arrays.ts` (each
  cabinet's finish and build), `roadgear.ts` (every case and label), `bowl.ts`
  (the Hollywood Bowl), `scaffold.ts` (`tieDyePanels`, `vocalMics`). Change
  them, not the Python. The explorer has `?venue=bowl`.
- The explorer's interface: tour stops and their dots in `src/scene/tour.ts`
  (each stop's camera, text, dot anchor and system), viewpoints in
  `src/scene/views.ts` (`VIEWPOINTS`), cards in `src/ui/Cards.tsx`, top and
  bottom bars in `src/ui/Controls.tsx`.
- Published at https://jwzuckerbrod.github.io/wall-of-sound-1974/ by
  `.github/workflows/pages.yml` on every push to master: ask before pushing.
- Renders go to `.shots/` (ignored). Reference photos are in `.shots/reference/`
  (ignored: other people's photos).

## Ignored local assets (not in git; needed for full renders)

- `blender/assets/polyhaven/`: Poly Haven CC0 plants, ground, sky (147 MB).
- `blender/assets/makehuman/zips/`: MPFB add-on + MakeHuman packs (912 MB);
  `people.blend` (144 people, 386 MB). MPFB is installed in Blender's user
  extensions. Hair 02/03 are **CC-BY: credit the MakeHuman community** if
  renders are published.

## How the user works

- Explain plainly; recommend one option, don't survey. Ask before downloads,
  purchases, or anything paid.
- **Kling (AI image edits) costs credits: state the exact price before every
  job.** Kling O1 = 1 credit; Nano Banana Pro = 20. Balance was 19 on 2026-10-07.
  AI edits may only touch masked crowd pixels, never the Wall.
- Commit in logical pieces with clear messages; push when asked.

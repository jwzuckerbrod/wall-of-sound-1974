# The Wall of Sound, 1974

An explorable 3D reconstruction of the Grateful Dead's touring PA system, as it
stood between March 23 and October 20, 1974.

Every cabinet, tube, driver and scaffold bay is generated procedurally from a
single configuration file. There are no model files and no downloaded textures:
the whole page is about 450 KB gzipped, and the environment map is baked in the
browser at startup.

## Running it

Needs **Node.js 20+** and **Git**. On a fresh Windows machine:

```
winget install OpenJS.NodeJS.LTS
winget install Git.Git
```

Then:

```
npm install
npm run dev
```

and open <http://localhost:5174>.

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Type-check and produce a production build |
| `npm run check` | TypeScript only |
| `npm run verify` | Headless checks of the geometry against the historical record |
| `npm run elevation` | Regenerate `docs/layout-elevation.svg` from the config |

## How it is put together

`src/data/wall.config.ts` is the single source of truth. Every dimension and
count lives there with a confidence level and source ids in `PROVENANCE`, and the
geometry code reads only that file. Correcting the history should never mean
editing geometry.

`npm run verify` compiles the geometry modules and checks them without a
browser: the driver counts against the 1974 inventory, every scaffold dimension
against the drawing dated April 10, 1974, stage footprints, clearances, and
provenance integrity. Run it before committing. It has caught more real defects
than looking at the screen has.

```
src/data/       the config, and the provenance behind it
src/geometry/   pure functions: arrays, cabinets, scaffold, stage footprints
src/materials/  procedural textures and PBR materials
src/scene/      the React Three Fiber scene
src/ui/         panels, tour, About page
scripts/        verifier and diagram generator
docs/           the spec, the QA findings, the elevation drawing
```

## Read these first

- **`docs/reconstruction-spec.md`** - what is confirmed, what is estimated, what
  is guessed, and the source for every number. Includes a fact-check of the
  common claims about the system, several of which are wrong.
- **`docs/qa-findings.md`** - a full visual and structural review, including the
  defects found and the ones still open.

The About page inside the app is generated from `PROVENANCE`, so it cannot drift
out of step with the model.

## Status

Stages 1 to 5 are done: research and spec, gray-box geometry, materials and
lighting, navigation, and the info panels and tour. Stage 6 is the performance
pass - frame rate has not yet been measured on real hardware - and stage 7 is
deployment.

Known open items are listed in `docs/qa-findings.md`.

## Garcia's guitars

The photo-real guitar work that started here (Wolf, traced and scaled off its
frets) now lives in its own project,
[garcia-guitars](https://github.com/jwzuckerbrod/garcia-guitars). It moved at
`fae5c67`; this repo will pull finished models in for the stage.

/**
 * Emits docs/layout-elevation.svg straight from src/data/wall.config.ts, so the
 * diagram in the spec can never drift from the numbers the model is built on.
 *
 *   npm run elevation
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const tmp = mkdtempSync(join(tmpdir(), 'wos-'));
// Run tsc through node directly: `npx.cmd` can't be spawned without a shell on Windows.
execFileSync(
  process.execPath,
  ['node_modules/typescript/bin/tsc', '--outDir', tmp, '--target', 'ES2022', '--module', 'ESNext', '--moduleResolution', 'bundler', 'src/data/wall.config.ts'],
  { stdio: 'inherit' },
);
copyFileSync(join(tmp, 'wall.config.js'), join(tmp, 'wall.config.mjs'));

const { ARRAYS, CABINETS, CHANNELS, cabinetSize, wall, inventoryFromArrays } = await import(
  pathToFileURL(join(tmp, 'wall.config.mjs')).href
);

// ── measure ──────────────────────────────────────────────────────────────────
const boxes = ARRAYS.map((b) => {
  const s = cabinetSize(b.cabinet);
  const w = s.w * b.cols;
  const h = s.h * b.rows;
  return { ...b, w, h, x0: b.x - w / 2, x1: b.x + w / 2, y0: b.baseY, y1: b.baseY + h };
});
const minX = Math.min(...boxes.map((b) => b.x0));
const maxX = Math.max(...boxes.map((b) => b.x1));
const maxY = Math.max(...boxes.map((b) => b.y1));

const S = 58; // px per metre
const PAD_X = 50;
const GROUND = 700;
const deck = wall.dimensions.stageDeckHeight;
const DECK_Y = GROUND - deck * S;

const W = Math.round((maxX - minX) * S + PAD_X * 2);
const H = 820;
const px = (x) => PAD_X + (x - minX) * S;
const py = (y) => DECK_Y - y * S;

// ── draw ─────────────────────────────────────────────────────────────────────
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const out = [];
const push = (...l) => out.push(...l);

push(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="ui-sans-serif, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif">`,
  `<title>Wall of Sound 1974 — front elevation, audience view</title>`,
  `<desc>${esc(
    `Front elevation of the reconstruction's array layout, generated from src/data/wall.config.ts. ` +
      `${(maxX - minX).toFixed(2)} metres of speakers, ${maxY.toFixed(2)} metres tall, standing on a ${deck.toFixed(2)} metre stage deck. ` +
      `Blocks are coloured by channel. Five band figures stand on the deck for scale.`,
  )}</desc>`,
  `<rect width="${W}" height="${H}" fill="#0d0f12"/>`,
);

// height guides, every 2 m above the deck
push(`<g stroke="#262b31" stroke-width="1">`);
for (let m = 2; m <= Math.ceil(maxY); m += 2) push(`<line x1="${PAD_X - 26}" y1="${py(m)}" x2="${W - PAD_X + 26}" y2="${py(m)}" stroke-dasharray="2 7"/>`);
push(`</g><g fill="#5a636e" font-size="10">`);
for (let m = 2; m <= Math.ceil(maxY); m += 2) push(`<text x="${PAD_X - 26}" y="${py(m) - 4}">${m} m</text>`);
push(`</g>`);

// scaffolding hint
const bay = wall.structure.scaffold.bayWidth;
push(`<g stroke="#343b44" stroke-width="1.2" opacity="0.6">`);
push(`<rect x="${px(minX)}" y="${py(wall.dimensions.arrayHeight)}" width="${(maxX - minX) * S}" height="${wall.dimensions.arrayHeight * S}" fill="none"/>`);
for (let x = minX; x <= maxX + 0.01; x += bay) push(`<line x1="${px(Math.min(x, maxX))}" y1="${py(wall.dimensions.arrayHeight)}" x2="${px(Math.min(x, maxX))}" y2="${py(0)}"/>`);
for (let y = wall.structure.scaffold.liftHeight; y < wall.dimensions.arrayHeight; y += wall.structure.scaffold.liftHeight)
  push(`<line x1="${px(minX)}" y1="${py(y)}" x2="${px(maxX)}" y2="${py(y)}"/>`);
push(`</g>`);

// arrays, back blocks (set-back z) first
push(`<g stroke="#0d0f12" stroke-width="1">`);
for (const b of [...boxes].sort((a, c) => a.z - c.z)) {
  const ch = CHANNELS[b.channel];
  const op = b.band === 'high' ? 0.5 : b.band === 'upperMid' ? 0.75 : 1;
  const dim = b.z < 0 ? 0.55 : 1;
  push(
    `<rect x="${px(b.x0).toFixed(1)}" y="${py(b.y1).toFixed(1)}" width="${(b.w * S).toFixed(1)}" height="${(b.h * S).toFixed(1)}" ` +
      `fill="${ch.color}" opacity="${(op * dim).toFixed(2)}" rx="2"><title>${esc(b.label)}</title></rect>`,
  );
}
push(`</g>`);

// stage deck — one-inch plywood, ten feet up
push(
  `<rect x="0" y="${DECK_Y}" width="${W}" height="${GROUND - DECK_Y}" fill="#16191d"/>`,
  `<rect x="0" y="${DECK_Y}" width="${W}" height="3" fill="#3c434c"/>`,
  `<rect x="0" y="${GROUND}" width="${W}" height="${H - GROUND}" fill="#0a0b0d"/>`,
  `<text x="${W - PAD_X}" y="${DECK_Y + (GROUND - DECK_Y) / 2 + 4}" fill="#4d555f" font-size="11" text-anchor="end">stage deck — 1 in plywood, 10 ft up, tied into the scaffolding</text>`,
);

// band figures, 1.75 m, on the deck
const FIG = 1.75 * S;
push(`<g fill="#e8e6e1" opacity="0.9">`);
for (const m of wall.band.members) {
  const x = px(wall.band.mirrored ? -m.x : m.x);
  const y = DECK_Y - FIG;
  const seated = m.id === 'keith' || m.id === 'kreutz';
  push(
    `<g transform="translate(${x.toFixed(1)},${(y + (seated ? FIG * 0.25 : 0)).toFixed(1)})">` +
      `<circle cx="0" cy="9" r="7"/><rect x="-8" y="18" width="16" height="${seated ? 26 : 34}" rx="6"/>` +
      (seated ? `<rect x="-26" y="44" width="52" height="7" rx="2" opacity="0.5"/>` : `<rect x="-7" y="51" width="6" height="${FIG - 51}"/><rect x="1" y="51" width="6" height="${FIG - 51}"/>`) +
      `</g>`,
  );
}
push(`</g><g fill="#8b939d" font-size="10" text-anchor="middle">`);
for (const m of wall.band.members) push(`<text x="${px(wall.band.mirrored ? -m.x : m.x).toFixed(1)}" y="${GROUND - 14}">${esc(m.name.split(' ').pop())}</text>`);
push(`</g>`);

// legend
const systems = [...new Set(Object.values(CHANNELS).map((c) => c.system))];
push(`<g font-size="11">`);
systems.forEach((sys, i) => {
  const chans = Object.values(CHANNELS).filter((c) => c.system === sys);
  const x = PAD_X + i * ((W - PAD_X * 2) / systems.length);
  chans.forEach((c, j) => push(`<rect x="${x + j * 13}" y="${GROUND + 42}" width="11" height="11" fill="${c.color}" rx="2"/>`));
  push(`<text x="${x}" y="${GROUND + 70}" fill="#8b939d">${esc(sys === 'drums' ? 'drums & kick' : sys.replace(/([A-Z])/g, ' $1').toLowerCase())}</text>`);
});
push(`</g>`);

// scale bar + caption
const barM = 10;
push(
  `<g stroke="#5a636e" stroke-width="2"><line x1="${PAD_X}" y1="${H - 26}" x2="${PAD_X + barM * S}" y2="${H - 26}"/>` +
    `<line x1="${PAD_X}" y1="${H - 32}" x2="${PAD_X}" y2="${H - 20}"/><line x1="${PAD_X + barM * S}" y1="${H - 32}" x2="${PAD_X + barM * S}" y2="${H - 20}"/></g>`,
  `<text x="${PAD_X + (barM * S) / 2}" y="${H - 34}" fill="#8b939d" font-size="11" text-anchor="middle">${barM} metres</text>`,
);
const inv = inventoryFromArrays();
push(
  `<text x="${W - PAD_X}" y="${H - 34}" fill="#5a636e" font-size="11" text-anchor="end">` +
    `${(maxX - minX).toFixed(2)} m (${((maxX - minX) / 0.3048).toFixed(0)} ft) of speakers · ${inv.total} drivers · ` +
    `${((maxY + deck) / 0.3048).toFixed(0)} ft above ground</text>`,
  `<text x="${W - PAD_X}" y="${H - 18}" fill="#454c55" font-size="10" text-anchor="end">` +
    `Generated from src/data/wall.config.ts. Array order is the reconstruction's own — see spec §7 and §12.5.</text>`,
  `</svg>`,
);

writeFileSync('docs/layout-elevation.svg', out.join('\n') + '\n');
console.log(`docs/layout-elevation.svg — ${W}×${H}, ${(maxX - minX).toFixed(2)} m wide, ${inv.total} drivers`);

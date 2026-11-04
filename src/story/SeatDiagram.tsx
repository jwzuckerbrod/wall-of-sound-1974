import { useMemo, useRef, useState } from 'react';
import { CHANNELS } from '../data/wall.config';
import {
  ECHO_MS,
  SEATING,
  STACKS,
  STAGE,
  clampSeat,
  heardFrom,
  paSounds,
  seatAt,
  stageSpanDeg,
  wallSounds,
  type Point,
  type Seat,
} from '../geometry/localize';

/**
 * Where the sound comes from (the story's seat diagram). Above, the stage's
 * width as seen from a seat, with a dot where each sound seems to come from.
 * Below, the Bowl in plan, to the geometry's scale: tap a seat. All the numbers
 * come from src/geometry/localize.ts; see PROVENANCE['comparison.localization'].
 */

const DEG = Math.PI / 180;
const PRESETS: { id: string; label: string; seat: Seat }[] = [
  { id: 'front', label: 'Front, centre', seat: seatAt(16, 0) },
  { id: 'side', label: 'Front, far left', seat: seatAt(18, -55 * DEG) },
  { id: 'mid', label: 'Halfway up, right', seat: seatAt(60, 25 * DEG) },
  { id: 'back', label: 'Back row', seat: seatAt(110, 0) },
];

const KEY: [string, string][] = [
  ['Vocals', CHANNELS.vocals.color],
  ['Garcia', CHANNELS.leadGuitar.color],
  ['Weir', CHANNELS.rhythmGuitar.color],
  ['Piano', CHANNELS.piano.color],
  ['Drums', CHANNELS.drumsL.color],
  ['Bass', CHANNELS.bass2.color],
];

// The drawing: the strip on top, the plan under it, one scale for the plan.
const W = 640;
const RAIL = { left: 70, right: 570, y: 92 };
const PLAN_TOP = 122;
const S = 2.95;
const px = (p: Point) => ({ x: W / 2 + p.x * S, y: PLAN_TOP + (p.z - STAGE.minZ) * S });
const H = PLAN_TOP + (STAGE.front + SEATING.lastRow - STAGE.minZ) * S + 30;

function fanPath() {
  const a = SEATING.halfAngle;
  const at = (r: number, t: number) => px(seatAt(r, t));
  const [o1, o2, i2, i1] = [at(SEATING.lastRow, -a), at(SEATING.lastRow, a), at(SEATING.firstRow, a), at(SEATING.firstRow, -a)];
  const ro = SEATING.lastRow * S;
  const ri = SEATING.firstRow * S;
  return `M${o1.x} ${o1.y} A${ro} ${ro} 0 0 0 ${o2.x} ${o2.y} L${i2.x} ${i2.y} A${ri} ${ri} 0 0 1 ${i1.x} ${i1.y} Z`;
}

/** Spread dots that land on each other upward, so each colour stays visible. */
function stackDots(dots: { id: string; color: string; x: number }[]) {
  const sorted = [...dots].sort((a, b) => a.x - b.x);
  const placed: { id: string; color: string; x: number; y: number }[] = [];
  for (const d of sorted) {
    const under = placed.filter((p) => Math.abs(p.x - d.x) < 14).length;
    placed.push({ ...d, y: RAIL.y - 12 * under });
  }
  return placed;
}

export function SeatDiagram() {
  const [side, setSide] = useState<'pa' | 'wall'>('pa');
  const [seat, setSeat] = useState<Seat>(PRESETS[1].seat);
  const [preset, setPreset] = useState<string | null>('side');
  const svg = useRef<SVGSVGElement>(null);

  const sounds = useMemo(() => (side === 'pa' ? paSounds() : wallSounds()), [side]);
  const heard = sounds.map((s) => ({ sound: s, h: heardFrom(seat, s) }));
  const gap = heardFrom(seat, paSounds()[0]).gapMs;
  const dots = stackDots(
    heard.map(({ sound, h }) => ({ id: sound.id, color: sound.color, x: RAIL.left + h.across * (RAIL.right - RAIL.left) })),
  );

  const pick = (e: React.MouseEvent<SVGSVGElement>) => {
    const m = svg.current?.getScreenCTM();
    if (!m) return;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    if (p.y < PLAN_TOP) return;
    setSeat(clampSeat({ x: (p.x - W / 2) / S, z: (p.y - PLAN_TOP) / S + STAGE.minZ }));
    setPreset(null);
  };

  const you = px(seat);
  const span = `The stage fills ${Math.round(stageSpanDeg(seat))}° of your view.`;
  const note =
    side === 'wall'
      ? 'From this seat the six systems are spread across the stage, each from its own speakers.'
      : gap < 2
        ? 'From this seat both stacks arrive together, so the whole band seems to hang between them, in one place.'
        : `From this seat everything seems to come from the nearer stack. The far one arrives ${Math.round(gap)} milliseconds later${gap >= ECHO_MS ? ', late enough to hear as an echo on the voices' : ''}.`;

  return (
    <>
      <div className="dg-switch" role="group" aria-label="Which system to show">
        <button aria-pressed={side === 'pa'} onClick={() => setSide('pa')}>
          A typical PA, early 1970s
        </button>
        <button aria-pressed={side === 'wall'} onClick={() => setSide('wall')}>
          The Wall, 1974
        </button>
      </div>
      <div className="seat-presets" role="group" aria-label="Choose a seat">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            aria-pressed={preset === p.id}
            onClick={() => {
              setSeat(p.seat);
              setPreset(p.id);
            }}
          >
            {p.label}
          </button>
        ))}
      </div>
      <p className="seat-note" aria-live="polite">{note} {span}</p>
      <svg
        ref={svg}
        className="diagram seat-diagram"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-labelledby="seat-title"
        onClick={pick}
      >
        <title id="seat-title">
          A plan of the Hollywood Bowl with a chosen seat, and above it the width of the stage as seen from that seat,
          with a coloured dot where each sound seems to come from.
        </title>

        {/* What you hear, across the stage's width as you see it. */}
        <text x={W / 2} y={16} className="d-tiny" textAnchor="middle">Where each sound seems to come from, from your seat</text>
        <line x1={RAIL.left} x2={RAIL.right} y1={RAIL.y + 10} y2={RAIL.y + 10} className="seat-rail" />
        <text x={RAIL.left} y={RAIL.y + 28} className="d-tiny d-dim">left end of the stage</text>
        <text x={RAIL.right} y={RAIL.y + 28} className="d-tiny d-dim" textAnchor="end">right end of the stage</text>
        {dots.map((d) => (
          <g key={d.id} className="seat-dot" style={{ transform: `translate(${d.x}px, ${d.y}px)` }}>
            <circle r="6" style={{ fill: d.color }} />
          </g>
        ))}

        {/* The Bowl, in plan. */}
        <path d={fanPath()} className="seat-fan" />
        {(() => {
          const a = px({ x: STAGE.minX, z: STAGE.minZ });
          const b = px({ x: STAGE.maxX, z: STAGE.front });
          return <rect x={a.x} y={a.y} width={b.x - a.x} height={b.y - a.y} className="seat-stage" />;
        })()}
        {side === 'pa'
          ? STACKS.map((p) => {
              const q = px(p);
              return <rect key={p.x} x={q.x - 4} y={q.y - 5} width="8" height="7" className="seat-stack" />;
            })
          : sounds.flatMap((s) =>
              s.emitters.map((p, i) => {
                const q = px(p);
                return <rect key={`${s.id}${i}`} x={q.x - 2} y={q.y - 4} width="4" height="8" style={{ fill: s.color }} />;
              }),
            )}

        {/* From the seat, toward where each sound seems to come from, as far as the stage. */}
        {heard.map(({ sound, h }) => {
          const z = sound.emitters[0].z;
          const end = px({ x: seat.x + Math.tan(h.angle) * (seat.z - z), z });
          return <line key={sound.id} x1={you.x} y1={you.y} x2={end.x} y2={end.y} className="seat-ray" style={{ stroke: sound.color }} />;
        })}
        <circle cx={you.x} cy={you.y} r="7" className="seat-you" />
        <text x={you.x} y={you.y + 24} className="d-tiny" textAnchor="middle">you</text>
      </svg>
      <ul className="seat-key">
        {KEY.map(([label, c]) => (
          <li key={label}>
            <i style={{ background: c }} />
            {label}
          </li>
        ))}
      </ul>
    </>
  );
}

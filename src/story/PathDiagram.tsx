import { CHANNELS } from '../data/wall.config';

/**
 * One mix, or none (the story's signal-path beat). Above, a typical early-1970s
 * PA: every source into one desk out in the crowd, one mix out to stacks at
 * the stage's front corners, a monitor mix back to the stage. Below, the Wall:
 * each source straight to its own speakers behind the player. Draws itself
 * from --draw: the typical PA first, then the Wall.
 *
 * The typical PA is a composite; see PROVENANCE['comparison.signalPath'].
 * Not to scale.
 */

const SOURCES: { label: string; color: string }[] = [
  { label: 'Vocals', color: CHANNELS.vocals.color },
  { label: "Garcia's guitar", color: CHANNELS.leadGuitar.color },
  { label: "Weir's guitar", color: CHANNELS.rhythmGuitar.color },
  { label: 'Piano', color: CHANNELS.piano.color },
  { label: 'Drums', color: CHANNELS.drumsL.color },
  { label: 'Bass', color: CHANNELS.bass2.color },
];

const DOT_X = 170;
const rowY = (top: number, i: number) => top + 46 + i * 28;

function Sources({ top }: { top: number }) {
  return (
    <>
      {SOURCES.map((s, i) => (
        <g key={s.label}>
          <text x={DOT_X - 14} y={rowY(top, i) + 6} className="d-small" textAnchor="end">
            {s.label}
          </text>
          <circle cx={DOT_X} cy={rowY(top, i)} r="5" style={{ fill: s.color }} />
        </g>
      ))}
    </>
  );
}

function Speaker({ x, y, w, h, color }: { x: number; y: number; w: number; h: number; color?: string }) {
  const r = Math.min(w, h) * 0.3;
  return (
    <g style={color ? { color } : undefined}>
      <rect x={x} y={y} width={w} height={h} rx="2" className="d-line" pathLength={1} />
      <circle cx={x + w / 2} cy={y + h / 2} r={r} className="d-line" pathLength={1} />
    </g>
  );
}

export function PathDiagram() {
  const A = 0; // the typical PA
  const B = 300; // the Wall
  const desk = { x: 340, y: rowY(A, 2.5) - 24, w: 104, h: 48 };
  const deskMidY = desk.y + desk.h / 2;
  return (
    <svg className="mic-diagram path-diagram" viewBox="0 0 640 560" role="img" aria-labelledby="path-title path-desc">
      <title id="path-title">One mix, or none</title>
      <desc id="path-desc">
        Above, a typical early-1970s PA: vocals, both guitars, piano, drums and bass all run to one mixing desk out in
        the crowd, come out as one mix to speaker stacks at the front corners of the stage, and a monitor mix goes back
        to the players. Below, the Wall: each of the six runs straight to its own speakers behind the player, with no
        mixing desk.
      </desc>

      {/* ── A typical PA ── */}
      <g className="pd-a">
        <text x="20" y={A + 22} className="d-label">A typical PA, early 1970s</text>
        <Sources top={A} />
        {SOURCES.map((s, i) => {
          const y = rowY(A, i);
          return (
            <path
              key={s.label}
              d={`M${DOT_X + 8} ${y} C ${DOT_X + 90} ${y}, ${desk.x - 70} ${deskMidY}, ${desk.x} ${deskMidY}`}
              className="d-line"
              style={{ color: s.color }}
              pathLength={1}
            />
          );
        })}
        <rect x={desk.x} y={desk.y} width={desk.w} height={desk.h} rx="4" className="d-line" pathLength={1} />
        <text x={desk.x + desk.w / 2} y={deskMidY - 3} className="d-tiny" textAnchor="middle">Mixing desk</text>
        <text x={desk.x + desk.w / 2} y={deskMidY + 15} className="d-tiny d-dim" textAnchor="middle">in the crowd</text>
      </g>
      <g className="pd-b">
        {/* One mix out, the colour gone: everything is now one signal. */}
        <path
          d={`M${desk.x + desk.w} ${deskMidY} h22 M${desk.x + desk.w + 22} ${deskMidY} C 500 ${deskMidY}, 510 ${A + 70}, 550 ${A + 70} M${desk.x + desk.w + 22} ${deskMidY} C 500 ${deskMidY}, 510 ${A + 200}, 550 ${A + 200}`}
          className="d-line d-mix"
          pathLength={1}
        />
        <text x={desk.x + desk.w + 12} y={desk.y - 8} className="d-tiny d-dim">one mix</text>
        <Speaker x={554} y={A + 48} w={48} h={44} />
        <Speaker x={554} y={A + 178} w={48} h={44} />
        <text x={578} y={A + 128} className="d-tiny d-dim" textAnchor="middle">
          <tspan x={578}>stacks at the</tspan>
          <tspan x={578} dy="16">stage's corners</tspan>
        </text>
        {/* The monitor mix, back from the desk to the players. */}
        <path
          d={`M${desk.x + desk.w / 2} ${desk.y + desk.h} V${A + 252} H${DOT_X} V${rowY(A, 5) + 12}`}
          className="d-line d-mix d-dash"
          pathLength={1}
        />
        <text x={(DOT_X + desk.x + desk.w / 2) / 2} y={A + 272} className="d-tiny d-dim" textAnchor="middle">monitor mix, back to the stage</text>
      </g>

      {/* ── The Wall ── */}
      <g className="pd-c">
        <path d={`M20 ${B - 6} H620`} className="d-line d-faint" pathLength={1} />
        <text x="20" y={B + 22} className="d-label">The Wall, 1974</text>
        <Sources top={B} />
        {SOURCES.map((s, i) => {
          const y = rowY(B, i);
          return (
            <g key={s.label}>
              <path d={`M${DOT_X + 8} ${y} H${548}`} className="d-line" style={{ color: s.color }} pathLength={1} />
              <Speaker x={554} y={y - 11} w={48} h={22} color={s.color} />
            </g>
          );
        })}
        <text x={360} y={B + 24} className="d-tiny d-dim" textAnchor="middle">no mixing desk: levels set on stage</text>
        <text x={578} y={B + 228} className="d-tiny d-dim" textAnchor="middle">
          <tspan x={578}>its own speakers,</tspan>
          <tspan x={578} dy="16">behind the player</tspan>
        </text>
      </g>
    </svg>
  );
}

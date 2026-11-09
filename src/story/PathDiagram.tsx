import { useState } from 'react';
import { CHANNELS } from '../data/wall.config';

/**
 * One mix, or none (the story's signal-path beat), one half at a time with a
 * switch between them.
 *
 * Typical PA: six coloured pulses run into one desk out in the crowd and come
 * out as one grey pulse, to stacks at the stage's front corners and back to the
 * stage as the monitor mix. The Wall: each pulse keeps its colour all the way
 * to its own speakers, behind the player.
 *
 * The typical PA is a composite; see PROVENANCE['comparison.signalPath'].
 * Not to scale. Animation and draw-in: .dg in story.css.
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
const rowY = (i: number) => 44 + i * 36;

function Sources() {
  return (
    <>
      {SOURCES.map((s, i) => (
        <g key={s.label}>
          <text x={DOT_X - 14} y={rowY(i) + 6} className="d-small" textAnchor="end">
            {s.label}
          </text>
          <circle cx={DOT_X} cy={rowY(i)} r="5" style={{ fill: s.color }} />
        </g>
      ))}
    </>
  );
}

/** A line, and a pulse that runs along it (`when`: which part of the cycle). */
function Wire({ d, color, when, dashed }: { d: string; color?: string; when: 'first' | 'second' | 'full'; dashed?: boolean }) {
  return (
    <g style={color ? { color } : undefined} className={color ? undefined : 'd-mix'}>
      <path d={d} className={`d-line${dashed ? ' d-dash' : ''}`} pathLength={1} />
      <path d={d} className={`d-pulse p-${when}`} pathLength={1} />
    </g>
  );
}

function Speaker({ x, y, w, h, color, flash }: { x: number; y: number; w: number; h: number; color?: string; flash: 'late' | 'end' }) {
  const r = Math.min(w, h) * 0.3;
  return (
    <g style={color ? { color } : undefined} className={`d-speaker flash-${flash}${color ? '' : ' d-mix'}`}>
      <rect x={x} y={y} width={w} height={h} rx="2" className="d-line" pathLength={1} />
      <circle cx={x + w / 2} cy={y + h / 2} r={r} className="d-line" pathLength={1} />
    </g>
  );
}

function TypicalPA() {
  const desk = { x: 330, y: 106, w: 110, h: 50 };
  const my = desk.y + desk.h / 2;
  const out = desk.x + desk.w;
  return (
    <>
      <Sources />
      {SOURCES.map((s, i) => (
        <Wire
          key={s.label}
          color={s.color}
          when="first"
          d={`M${DOT_X + 8} ${rowY(i)} C ${DOT_X + 90} ${rowY(i)}, ${desk.x - 70} ${my}, ${desk.x} ${my}`}
        />
      ))}
      <g className="d-mix">
        <rect x={desk.x} y={desk.y} width={desk.w} height={desk.h} rx="4" className="d-line" pathLength={1} />
      </g>
      <text x={desk.x + desk.w / 2} y={my - 3} className="d-tiny" textAnchor="middle">Mixing desk</text>
      <text x={desk.x + desk.w / 2} y={my + 15} className="d-tiny d-dim" textAnchor="middle">in the crowd</text>

      {/* One mix out, the colour gone: everything is now one signal. */}
      <Wire when="second" d={`M${out} ${my} C ${out + 60} ${my}, 500 70, 552 70`} />
      <Wire when="second" d={`M${out} ${my} C ${out + 60} ${my}, 500 200, 552 200`} />
      <text x={out + 10} y={desk.y - 8} className="d-tiny d-dim">one mix</text>
      <Speaker x={554} y={48} w={48} h={44} flash="late" />
      <Speaker x={554} y={178} w={48} h={44} flash="late" />
      <text x={578} y={128} className="d-tiny d-dim" textAnchor="middle">
        <tspan x={578}>stacks at the</tspan>
        <tspan x={578} dy="16">stage's corners</tspan>
      </text>

      {/* The monitor mix, back from the desk to the players. */}
      <Wire when="second" dashed d={`M${desk.x + desk.w / 2} ${desk.y + desk.h} V262 H${DOT_X} V${rowY(5) + 12}`} />
      <text x={(DOT_X + desk.x + desk.w / 2) / 2} y={284} className="d-tiny d-dim" textAnchor="middle">
        monitor mix, back to the stage
      </text>
    </>
  );
}

function TheWall() {
  return (
    <>
      <Sources />
      <text x={360} y={18} className="d-tiny d-dim" textAnchor="middle">no mixing desk: levels set on stage</text>
      {SOURCES.map((s, i) => (
        <g key={s.label}>
          <Wire color={s.color} when="full" d={`M${DOT_X + 8} ${rowY(i)} H548`} />
          <Speaker x={554} y={rowY(i) - 13} w={48} h={26} color={s.color} flash="end" />
        </g>
      ))}
      <text x={578} y={264} className="d-tiny d-dim" textAnchor="middle">
        <tspan x={578}>its own speakers,</tspan>
        <tspan x={578} dy="16">behind the player</tspan>
      </text>
    </>
  );
}

export function PathDiagram() {
  const [side, setSide] = useState<'pa' | 'wall'>('pa');
  return (
    <>
<p className="switch-hint" aria-hidden="true"><span className="on-touch">Tap</span><span className="on-mouse">Click</span> to switch</p>
      <div className="dg-switch" role="group" aria-label="Which system to show">
        <button aria-pressed={side === 'pa'} onClick={() => setSide('pa')}>
          A typical PA, early 1970s
        </button>
        <button aria-pressed={side === 'wall'} onClick={() => setSide('wall')}>
          The Wall, 1974
        </button>
      </div>
      <p className="dg-read">
        {side === 'pa'
          ? 'Each coloured pulse is one sound on its way. In the desk they are mixed into one grey pulse, and that is what everyone hears.'
          : 'Each coloured pulse is one sound on its way. Nothing mixes them: each keeps its colour to its own speakers.'}
      </p>
      {/* Keyed, so a switch draws the other half in afresh. */}
      <svg key={side} className="diagram" viewBox="0 0 640 296" role="img" aria-labelledby="path-title path-desc">
        <title id="path-title">{side === 'pa' ? 'A typical early-1970s PA: one mix' : 'The Wall: no mix'}</title>
        <desc id="path-desc">
          {side === 'pa'
            ? 'Vocals, both guitars, piano, drums and bass all run to one mixing desk out in the crowd. They come out as one mix, to speaker stacks at the front corners of the stage, and a monitor mix goes back to the players.'
            : 'Vocals, both guitars, piano, drums and bass each run straight to their own speakers behind the player, with no mixing desk.'}
        </desc>
        {side === 'pa' ? <TypicalPA /> : <TheWall />}
      </svg>
    </>
  );
}

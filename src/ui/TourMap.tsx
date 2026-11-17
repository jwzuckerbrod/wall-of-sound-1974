import { useEffect, useMemo, useRef, useState } from 'react';
import { AMERICA_NEIGHBORS, AMERICA_STATES, EUROPE_LAND } from '../data/mapOutlines';
import { EUROPE_NOTE, SHOWS, type Show } from '../data/shows';
import { VIEWS, milesBetween, viewOf, type ViewId } from '../geometry/tourmap';
import { HeardList, showDates } from './Listen';

/**
 * Where the Wall went: every stop in order on a map, one at a time. The stops
 * and what is known of each are src/data/shows.ts; the outlines are Natural
 * Earth's (src/data/mapOutlines.ts). Loaded only when the map is on screen.
 *
 * The lines join one venue to the next in a straight line. They are not the
 * roads the trucks took, which nobody recorded, and the page says so.
 */

interface Stop {
  show: Show;
  view: ViewId;
  x: number;
  y: number;
}

const STOPS: Stop[] = SHOWS.map((show) => {
  const [lat, lon] = show.at;
  const view = viewOf(lat, lon);
  const [x, y] = VIEWS[view].project(lon, lat);
  return { show, view, x, y };
});

const town = (s: Show) => s.city.split(',')[0];
const DAY = 24 * 3600 * 1000;
const daysBetween = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / DAY);
const round = (miles: number) => (miles < 100 ? Math.round(miles / 5) * 5 : Math.round(miles / 10) * 10).toLocaleString('en-US');

/** How the Wall got to stop `i` from the one before, in a sentence. */
function travel(i: number): string {
  if (i === 0) return 'The first night.';
  const prev = SHOWS[i - 1];
  const here = SHOWS[i];
  const days = daysBetween(prev.to ?? prev.date, here.date);
  const later = days === 1 ? 'the next night' : `${days} days later`;
  if (STOPS[i].view !== STOPS[i - 1].view) return `Across the Atlantic from ${town(prev)}, ${later}.`;
  const miles = milesBetween(prev.at, here.at);
  if (miles < 1) return `The same hall, ${later}.`;
  return `${round(miles)} miles from ${town(prev)}, ${later}.`;
}

/** Straight-line miles between the stops of one view, in order. */
function milesIn(view: ViewId): number {
  let sum = 0;
  for (let i = 1; i < STOPS.length; i++) {
    if (STOPS[i].view === view && STOPS[i - 1].view === view) sum += milesBetween(SHOWS[i - 1].at, SHOWS[i].at);
  }
  return sum;
}
const MILES = { america: milesIn('america'), europe: milesIn('europe') };

const VIEW_NAME: Record<ViewId, string> = { america: 'North America', europe: 'Europe' };
const STEP_MS = 1500;

export default function TourMap({ at, setAt }: { at: number; setAt: (i: number) => void }) {
  const stop = STOPS[at];
  const view = VIEWS[stop.view];
  const [playing, setPlaying] = useState(false);
  const svg = useRef<SVGSVGElement>(null);

  // Playing: one stop at a time to the last, then it rests.
  useEffect(() => {
    if (!playing) return;
    if (at >= STOPS.length - 1) return setPlaying(false);
    const t = setTimeout(() => setAt(at + 1), STEP_MS);
    return () => clearTimeout(t);
  }, [playing, at, setAt]);

  const here = useMemo(() => STOPS.map((s, i) => ({ ...s, i })).filter((s) => s.view === stop.view), [stop.view]);
  // The legs drawn in this view: from each stop to the next, when both are on it.
  const legs = here.filter((s) => s.i > 0 && STOPS[s.i - 1].view === s.view);

  const play = () => {
    if (playing) return setPlaying(false);
    if (at >= STOPS.length - 1) setAt(0);
    setPlaying(true);
  };
  const go = (i: number) => {
    setPlaying(false);
    setAt(Math.min(STOPS.length - 1, Math.max(0, i)));
  };
  /** A tap on the map picks the nearest stop; a tap on the same place again steps through its nights. */
  const tap = (e: React.MouseEvent) => {
    const box = svg.current?.getBoundingClientRect();
    if (!box) return;
    const x = ((e.clientX - box.left) / box.width) * view.width;
    const y = ((e.clientY - box.top) / box.height) * view.height;
    const near = here.map((s) => ({ s, d: Math.hypot(s.x - x, s.y - y) })).sort((a, b) => a.d - b.d);
    if (!near.length || near[0].d > 110) return;
    const same = near.filter((n) => Math.hypot(n.s.x - near[0].s.x, n.s.y - near[0].s.y) < 4).map((n) => n.s.i).sort((a, b) => a - b);
    go(same.find((i) => i > at) ?? same[0]);
  };

  const labelLeft = stop.x > view.width * 0.62;
  return (
    <div className="tm">
      <div className="tm-views" role="group" aria-label="Which part of the tour to show">
        {(['america', 'europe'] as const).map((v) => (
          <button key={v} aria-pressed={stop.view === v} onClick={() => stop.view !== v && go(STOPS.findIndex((s) => s.view === v))}>
            {VIEW_NAME[v]}
          </button>
        ))}
      </div>
      {/* The stops are reached by the buttons below and the list; the picture is a tap target on top of that. */}
      <svg
        ref={svg}
        className="tm-map"
        viewBox={`0 0 ${view.width} ${view.height}`}
        role="img"
        aria-label={`Map of ${VIEW_NAME[stop.view]}: the Wall's stops in order, with ${stop.show.venue}, ${stop.show.city}, marked.`}
        onClick={tap}
      >
        {stop.view === 'america' ? (
          <>
            <path className="tm-far" d={AMERICA_NEIGHBORS} />
            <path className="tm-land" d={AMERICA_STATES} />
          </>
        ) : (
          <path className="tm-land" d={EUROPE_LAND} />
        )}
        {legs.map((s) => {
          const from = STOPS[s.i - 1];
          return <line key={s.i} className={`tm-leg${s.i <= at ? ' done' : ''}`} x1={from.x} y1={from.y} x2={s.x} y2={s.y} />;
        })}
        {here.map((s) => (
          <circle key={s.i} className={`tm-dot${s.i < at ? ' done' : ''}`} cx={s.x} cy={s.y} r={11} />
        ))}
        <g className="tm-here" style={{ transform: `translate(${stop.x}px, ${stop.y}px)` }}>
          <circle className="tm-ring" r={26} />
          <circle className="tm-now" r={13} />
        </g>
        <text className="tm-label" x={stop.x + (labelLeft ? -36 : 36)} y={stop.y + 11} textAnchor={labelLeft ? 'end' : 'start'}>
          {town(stop.show)}
        </text>
      </svg>
      <div className="tm-bar">
        <button className="tm-step" onClick={() => go(at - 1)} disabled={at === 0} aria-label="The stop before">
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3L5 8l5 5" /></svg>
        </button>
        <button className="tm-play" onClick={play} aria-label={playing ? 'Pause the tour' : 'Play the tour, stop by stop'}>
          <svg viewBox="0 0 16 16" aria-hidden="true">
            {playing ? (
              <>
                <rect x="3.5" y="2.5" width="3" height="11" rx="0.6" />
                <rect x="9.5" y="2.5" width="3" height="11" rx="0.6" />
              </>
            ) : (
              <path d="M4.5 2.6v10.8a.6.6 0 0 0 .9.5l8.6-5.4a.6.6 0 0 0 0-1L5.4 2.1a.6.6 0 0 0-.9.5z" />
            )}
          </svg>
        </button>
        <button className="tm-step" onClick={() => go(at + 1)} disabled={at === STOPS.length - 1} aria-label="The next stop">
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3l5 5-5 5" /></svg>
        </button>
        <span className="tm-count">
          Stop {at + 1} of {STOPS.length}
        </span>
      </div>
      <div className="tm-stop" aria-live={playing ? 'off' : 'polite'}>
        <p className="tm-when">
          {showDates(stop.show)} · {stop.show.outdoors ? 'Outdoors' : 'Indoors'}
        </p>
        <p className="tm-where">
          <b>{stop.show.venue}</b> {stop.show.city}
        </p>
        <p className="tm-travel">{travel(at)}</p>
        <HeardList show={stop.show} />
        {stop.view === 'europe' && <p className="tm-note">{EUROPE_NOTE}</p>}
      </div>
      <p className="ls-credit">
        Lines join one venue to the next as the crow flies: about {round(MILES.america)} miles in North America and{' '}
        {round(MILES.europe)} in Europe. The trucks drove farther, and their roads aren't recorded. Outlines: Natural
        Earth, with today's borders.
      </p>
    </div>
  );
}

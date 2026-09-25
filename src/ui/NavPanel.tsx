import type { NavMode } from '../scene/Scene';
import { TOUR } from '../scene/tour';

const MODES: { id: NavMode; label: string; key: string; hint: string }[] = [
  { id: 'orbit', label: 'Orbit', key: 'O', hint: 'Drag to turn it, scroll to zoom.' },
  { id: 'tour', label: 'Tour', key: 'T', hint: 'Arrow keys or the buttons below move between stops.' },
];

/**
 * Navigation and the guided tour.
 *
 * The tour text is inside an aria-live region so a screen reader announces each
 * stop as it arrives, and every stop is reachable by keyboard alone — which is
 * the accessibility requirement in the brief, and also just the fastest way to
 * page through eight stops.
 */
export function NavPanel({
  navMode,
  setNavMode,
  stopIndex,
  goToStop,
}: {
  navMode: NavMode;
  setNavMode: (m: NavMode) => void;
  stopIndex: number;
  goToStop: (i: number) => void;
}) {
  const stop = TOUR[stopIndex];
  const mode = MODES.find((m) => m.id === navMode)!;

  return (
    <>
      {/* Stays visible when the panel is collapsed: how you move around is the
          one control you always need, especially on a narrow screen. */}
      <section className="always">
        <h2>Getting around</h2>
        <div className="modes" role="group" aria-label="Navigation mode">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => (m.id === 'tour' ? goToStop(stopIndex) : setNavMode(m.id))}
              aria-pressed={navMode === m.id}
            >
              {m.label} <kbd>{m.key}</kbd>
            </button>
          ))}
        </div>
        <p className="hint">{mode.hint}</p>
      </section>

      {navMode === 'tour' && (
        <section className="tour always">
          <h2>
            Stop {stopIndex + 1} of {TOUR.length}
          </h2>
          <div aria-live="polite" aria-atomic="true">
            <h3>{stop.title}</h3>
            <p>{stop.body}</p>
          </div>
          <div className="tour-nav">
            <button onClick={() => goToStop(stopIndex - 1)} aria-label="Previous stop">
              ← Back
            </button>
            <button onClick={() => goToStop(stopIndex + 1)} aria-label="Next stop">
              Next →
            </button>
          </div>
          <ol className="tour-list">
            {TOUR.map((s, i) => (
              <li key={s.id}>
                <button onClick={() => goToStop(i)} aria-current={i === stopIndex}>
                  {s.title}
                </button>
              </li>
            ))}
          </ol>
        </section>
      )}
    </>
  );
}

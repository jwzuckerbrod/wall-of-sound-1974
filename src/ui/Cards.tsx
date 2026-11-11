import { CHANNELS, PROVENANCE, wall, type ChannelId } from '../data/wall.config';
import { TOUR } from '../scene/tour';
import { PLACES } from '../scene/views';
import { TOUCH } from './Controls';

/**
 * What the explorer lets you do, on the card it opens with: visitors asked.
 * Short, in the order a first visit needs it, with the words the controls use.
 */
function WhatYouCanDo() {
  const tap = TOUCH ? 'Tap' : 'Click';
  return (
    <ul className="can-do" aria-label="What you can do here">
      <li><strong>{TOUCH ? 'Drag to turn, pinch to zoom.' : 'Drag to turn, scroll to zoom.'}</strong></li>
      <li><strong>View</strong> has {PLACES.length} places to stand, from the crowd to Keith&rsquo;s piano.</li>
      <li><strong>{tap} any speaker</strong> to read about it.</li>
      <li><strong>Take it apart</strong> with the slider below, or {tap.toLowerCase()} <strong>Color</strong> to see its six systems.</li>
      <li><strong>Listen</strong> to it, on tapes from 1974.</li>
    </ul>
  );
}

/**
 * The card the explorer opens with (a sheet from the bottom on a phone): what
 * this is, and what can be done with it. Its text is written to stand on its
 * own, so it is also the accessible description of the overview.
 */
export function OverviewCard({ onClose }: { onClose: () => void }) {
  const s = TOUR[0];
  return (
    <aside className="card" aria-labelledby="card-title" aria-live="polite">
      <div className="card-head">
        <p className="card-step">Overview</p>
        <button className="close" onClick={onClose} aria-label="Close">
          ×
        </button>
      </div>
      <h2 id="card-title">{s.title}</h2>
      <WhatYouCanDo />
      <p className="card-body">{s.body}</p>
    </aside>
  );
}

/** What each instrument is, who played it, and which system it fed. */
export const INSTRUMENTS: Record<string, { title: string; player: string; text: string; channel: ChannelId }> = {
  garcia: {
    title: 'The Wolf',
    player: 'Jerry Garcia',
    text: 'The custom guitar Doug Irwin built for Jerry Garcia, his main instrument in 1974, as it looked that year. Its sound went to the lead-guitar columns behind him.',
    channel: 'leadGuitar',
  },
  weir: {
    title: 'Gibson ES-335',
    player: 'Bob Weir',
    text: "Bob Weir's semi-hollow Gibson, played through the rhythm-guitar column behind him: twenty twelve-inch speakers of its own.",
    channel: 'rhythmGuitar',
  },
  lesh: {
    title: 'Mission Control',
    player: 'Phil Lesh',
    text: "Phil Lesh's Alembic quadraphonic bass, in use from June 16, 1974, which fed the Wall's four independent bass channels.",
    channel: 'bass1',
  },
  piano: {
    title: 'The grand',
    player: 'Keith Godchaux',
    text: 'A grand piano with five Countryman pickups inside it, lying across the stage with its keyboard at the audience\'s right. It fed the piano system: fifteens, twelves and fives in their own columns.',
    channel: 'piano',
  },
  rhodes: {
    title: 'Fender Rhodes',
    player: 'Keith Godchaux',
    text: "Keith's electric piano. Where it stood on stage isn't known: here, upstage of him at his right hand, as at Oakland on June 8, 1974.",
    channel: 'piano',
  },
  drums: {
    title: 'The drum kit',
    player: 'Bill Kreutzmann',
    text: "Bill Kreutzmann's kit. Its bass drum had a column of sixteen fifteen-inch speakers to itself; the rest of the kit ran in stereo through the drum stacks either side. At the Hollywood Bowl on July 21 it was the wine-red kit.",
    channel: 'kick',
  },
};

export function InstrumentCard({
  id,
  onClose,
  isolated,
  onIsolate,
}: {
  id: string;
  onClose: () => void;
  isolated: ChannelId | null;
  onIsolate: (c: ChannelId | null) => void;
}) {
  const i = INSTRUMENTS[id];
  if (!i) return null;
  const p = PROVENANCE['band.instrumentPlacement'];
  const showing = isolated && CHANNELS[isolated].system === CHANNELS[i.channel].system;
  return (
    <aside className="card" aria-labelledby="card-title">
      <div className="card-head">
        <p className="card-step">{i.player}</p>
        <button className="close" onClick={onClose} aria-label="Close">
          ×
        </button>
      </div>
      <h2 id="card-title">{i.title}</h2>
      <p className="card-body">{i.text}</p>
      <button className="card-action" aria-pressed={!!showing} onClick={() => onIsolate(showing ? null : i.channel)}>
        <span className="swatch" style={{ background: CHANNELS[i.channel].color }} aria-hidden="true" />
        {showing ? 'Show the whole Wall' : 'Show its speakers'}
      </button>
      {['garcia', 'weir', 'lesh'].includes(id) && (
        <p className={`confidence ${p.confidence}`}>
          <strong>On a stand here</strong> — in {new Date(wall.meta.debut.date).getFullYear()} it was in the player's hands.
        </p>
      )}
    </aside>
  );
}

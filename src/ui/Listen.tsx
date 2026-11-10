import { useEffect, useRef, useState } from 'react';
import { COMPARISON_CAVEATS, PAIRS, TAPES, WALL_TRACKS, tapeUrl, trackUrl, type Track } from '../data/recordings';
import { NO_PLACE, PLAY_ICON, clock, player, usePlayer, type PlayerItem } from './player';
import './range.css';
import './listen.css';

/**
 * The listening players, shared by the story's Listen beat and the explorer's
 * Listen panel. Every track streams from archive.org (src/data/recordings.ts).
 * The sound itself lives in ./player, so it carries on when a row scrolls away.
 */

export function PlayIcon({ playing }: { playing: boolean }) {
  return playing ? (
    <svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3.5" y="2.5" width="3" height="11" rx="0.6" /><rect x="9.5" y="2.5" width="3" height="11" rx="0.6" /></svg>
  ) : (
    <svg viewBox="0 0 16 16" aria-hidden="true"><path d={PLAY_ICON} /></svg>
  );
}

function Transport({ item, label }: { item: PlayerItem; label: string }) {
  const { item: current, playing: on, loading: busy, places } = usePlayer();
  const active = current?.id === item.id;
  const playing = active && on;
  const loading = active && busy;
  const { time, length } = places[item.id] ?? NO_PLACE;
  const f = Number.isFinite(length) && length > 0 ? time / length : 0;
  return (
    <div className="ls-transport">
      <button className="ls-play" onClick={() => player.toggle(item)} aria-label={`${playing ? 'Pause' : 'Play'} ${label}`} data-loading={loading || undefined}>
        <PlayIcon playing={playing} />
      </button>
      <input
        className="range"
        type="range"
        min={0}
        max={1000}
        value={Math.round(f * 1000)}
        onChange={(e) => player.seek(item.id, Number(e.target.value) / 1000)}
        aria-label={`Position in ${label}`}
        style={{ ['--f' as string]: f }}
      />
      <span className="ls-time">
        {clock(time)} / {clock(length)}
      </span>
    </div>
  );
}

const year = (t: Track) => TAPES[t.tape].date.slice(-4);

function TrackRow({ track }: { track: Track }) {
  const item: PlayerItem = {
    id: track.file,
    src: trackUrl(track),
    title: track.title,
    detail: `${TAPES[track.tape].venue}, ${year(track)}`,
  };
  return (
    <li className="ls-row" data-track={item.id}>
      <span className="ls-title">{track.title}</span>
      <Transport item={item} label={track.title} />
    </li>
  );
}

const SIDE_LABEL = { before: '1971 · before', after: '1974 · the Wall' };

function PairRow({ pair }: { pair: (typeof PAIRS)[number] }) {
  // Whichever recording is loaded wins, so the switch is right after a layout change remounts this row.
  const { item: current } = usePlayer();
  const loaded = current?.id === pair.title ? (current.detail === SIDE_LABEL.before ? 'before' : 'after') : null;
  const [chosen, setChosen] = useState<'before' | 'after'>('after');
  const side = loaded ?? chosen;
  const itemFor = (s: 'before' | 'after'): PlayerItem => ({
    id: pair.title,
    src: trackUrl(pair[s]),
    title: pair.title,
    detail: SIDE_LABEL[s],
  });
  const choose = (s: 'before' | 'after') => {
    setChosen(s);
    player.swap(itemFor(s));
  };
  return (
    <li className="ls-row" data-track={pair.title}>
      <span className="ls-title">{pair.title}</span>
      <p className="switch-hint" aria-hidden="true"><span className="on-touch">Tap</span><span className="on-mouse">Click</span> a year to switch, as it plays</p>
      <div className="ls-switch" role="group" aria-label={`Which recording of ${pair.title}`}>
        <button aria-pressed={side === 'before'} onClick={() => choose('before')}>
          {SIDE_LABEL.before}
        </button>
        <button aria-pressed={side === 'after'} onClick={() => choose('after')}>
          {SIDE_LABEL.after}
        </button>
      </div>
      <Transport item={itemFor(side)} label={`${pair.title}, ${side === 'before' ? '1971' : '1974'}`} />
    </li>
  );
}

const T74 = TAPES.bowl1974;
const T71 = TAPES.palladium1971;

/** The Wall on its own: the Bowl tape. */
export function ListenWall() {
  return (
    <div className="ls">
      <ul className="ls-list">
        {WALL_TRACKS.map((t) => (
          <TrackRow key={t.file} track={t} />
        ))}
      </ul>
      <p className="ls-credit">
        {T74.venue}, {T74.date}. Taped by {T74.taper} from the crowd ({T74.position.toLowerCase()}); transfer by{' '}
        {T74.transfer}. <a href={tapeUrl('bowl1974')}>On the Internet Archive</a>
      </p>
    </div>
  );
}

/** Before and after: the same songs, the same taper and microphones, three years apart. */
export function ListenCompare() {
  return (
    <div className="ls">
      <ul className="ls-list">
        {PAIRS.map((p) => (
          <PairRow key={p.title} pair={p} />
        ))}
      </ul>
      <p className="ls-credit">
        Both taped by Rob Bertrando with Sony ECM-22P microphones. 1971: {T71.venue}, {T71.date},{' '}
        {T71.position.toLowerCase()}; transfer by {T71.transfer}. <a href={tapeUrl('palladium1971')}>1971 tape</a>{' '}
        <a href={tapeUrl('bowl1974')}>1974 tape</a>
      </p>
      <ul className="ls-caveats">
        {COMPARISON_CAVEATS.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>
    </div>
  );
}

/** The explorer's Listen panel: both players in a dialog over the scene. */
export function ListenPanel({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDivElement>(null);
  const { item: current } = usePlayer();
  useEffect(() => {
    dialog.current?.focus();
    // Opened from the now-playing pill: start at the song that's playing.
    const row = Array.from(dialog.current?.querySelectorAll<HTMLElement>('[data-track]') ?? []).find((r) => r.dataset.track === current?.id);
    row?.scrollIntoView({ block: 'center' });
    // Only on opening: the rows below can change what's playing.
  }, []);
  return (
    <div className="about-backdrop" onClick={onClose}>
      <div
        className="about listen-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Listen to the Wall"
        tabIndex={-1}
        ref={dialog}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="close" onClick={onClose} aria-label="Close">
          ×
        </button>
        <h1>Listen</h1>
        <p className="lede">The Wall from the crowd at the Hollywood Bowl, on a cassette recorder, July 21, 1974.</p>
        <ListenWall />
        <h2>The same songs, three years apart</h2>
        <p>
          The same taper recorded the band in Hollywood in 1971, before the Wall, with the same kind of microphone.
          Switch between them as they play.
        </p>
        <ListenCompare />
      </div>
    </div>
  );
}

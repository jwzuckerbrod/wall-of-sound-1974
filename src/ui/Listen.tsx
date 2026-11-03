import { useEffect, useRef, useState } from 'react';
import { COMPARISON_CAVEATS, PAIRS, TAPES, WALL_TRACKS, tapeUrl, trackUrl, type Track } from '../data/recordings';
import './listen.css';

/**
 * The listening players, shared by the story's Listen beat and the explorer's
 * Listen panel. Every track streams from archive.org (src/data/recordings.ts);
 * nothing is fetched until someone presses play, and only one plays at a time.
 */

const ONLY_ONE = 'wos-listen-play';

const clock = (s: number) => (Number.isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}` : '–:––');

function useAudio(src: string) {
  const ref = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [length, setLength] = useState(NaN);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const a = new Audio();
    a.preload = 'none';
    ref.current = a;
    const on = (e: string, f: () => void) => a.addEventListener(e, f);
    on('play', () => {
      setPlaying(true);
      window.dispatchEvent(new CustomEvent(ONLY_ONE, { detail: a }));
    });
    on('pause', () => setPlaying(false));
    on('ended', () => setPlaying(false));
    on('timeupdate', () => setTime(a.currentTime));
    on('durationchange', () => setLength(a.duration));
    on('waiting', () => setLoading(true));
    on('playing', () => setLoading(false));
    on('canplay', () => setLoading(false));
    const others = (e: Event) => {
      if ((e as CustomEvent).detail !== a) a.pause();
    };
    window.addEventListener(ONLY_ONE, others);
    return () => {
      a.pause();
      a.removeAttribute('src');
      window.removeEventListener(ONLY_ONE, others);
    };
  }, []);

  // A new source keeps the place and carries on playing: the A/B switch.
  useEffect(() => {
    const a = ref.current;
    if (!a) return;
    if (!a.src) {
      a.src = src;
      return;
    }
    const at = a.currentTime;
    const resume = !a.paused;
    a.src = src;
    a.addEventListener(
      'loadedmetadata',
      () => {
        a.currentTime = Math.min(at, Math.max(0, a.duration - 1));
        if (resume) void a.play();
      },
      { once: true },
    );
    a.load();
  }, [src]);

  const toggle = () => {
    const a = ref.current;
    if (!a) return;
    if (a.paused) {
      setLoading(true);
      void a.play().catch(() => setLoading(false));
    } else a.pause();
  };
  const seek = (f: number) => {
    const a = ref.current;
    if (a && Number.isFinite(a.duration)) a.currentTime = f * a.duration;
  };
  return { playing, time, length, loading, toggle, seek };
}

function Transport({ audio, label }: { audio: ReturnType<typeof useAudio>; label: string }) {
  const { playing, time, length, loading, toggle, seek } = audio;
  const f = Number.isFinite(length) && length > 0 ? time / length : 0;
  return (
    <div className="ls-transport">
      <button className="ls-play" onClick={toggle} aria-label={`${playing ? 'Pause' : 'Play'} ${label}`} data-loading={loading || undefined}>
        {playing ? (
          <svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3.5" y="2.5" width="3" height="11" rx="0.6" /><rect x="9.5" y="2.5" width="3" height="11" rx="0.6" /></svg>
        ) : (
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4.5 2.6v10.8a.6.6 0 0 0 .9.5l8.6-5.4a.6.6 0 0 0 0-1L5.4 2.1a.6.6 0 0 0-.9.5z" /></svg>
        )}
      </button>
      <input
        className="ls-bar"
        type="range"
        min={0}
        max={1000}
        value={Math.round(f * 1000)}
        onChange={(e) => seek(Number(e.target.value) / 1000)}
        aria-label={`Position in ${label}`}
        style={{ ['--f' as string]: f }}
      />
      <span className="ls-time">
        {clock(time)} / {clock(length)}
      </span>
    </div>
  );
}

function TrackRow({ track }: { track: Track }) {
  const audio = useAudio(trackUrl(track));
  return (
    <li className="ls-row">
      <span className="ls-title">{track.title}</span>
      <Transport audio={audio} label={track.title} />
    </li>
  );
}

function PairRow({ pair }: { pair: (typeof PAIRS)[number] }) {
  const [side, setSide] = useState<'before' | 'after'>('after');
  const audio = useAudio(trackUrl(pair[side]));
  return (
    <li className="ls-row">
      <span className="ls-title">{pair.title}</span>
      <div className="ls-switch" role="group" aria-label={`Which recording of ${pair.title}`}>
        <button aria-pressed={side === 'before'} onClick={() => setSide('before')}>
          1971 · before
        </button>
        <button aria-pressed={side === 'after'} onClick={() => setSide('after')}>
          1974 · the Wall
        </button>
      </div>
      <Transport audio={audio} label={`${pair.title}, ${side === 'before' ? '1971' : '1974'}`} />
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
  useEffect(() => {
    dialog.current?.focus();
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
        <p className="lede">The Wall from the crowd at the Hollywood Bowl, on a cassette recorder, 21 July 1974.</p>
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

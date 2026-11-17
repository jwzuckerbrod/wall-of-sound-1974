import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { FEATURED, RELEASES, SHOWS, SHOW_COUNT, playDeadNights, spotifyAlbumUrl, spotifyTrackEmbed, type Show } from '../data/shows';
import './listen.css';

/**
 * The listening players and the list of shows, shared by the story and the
 * explorer's Listen panel. The players are Spotify's own embedded players
 * (src/data/shows.ts says what they play and why): a visitor signed in to
 * Spotify hears the whole song, anyone else a preview.
 */

/** The band on its own tapes, from the nearest night to the Bowl that was released. The story plays one song. */
export function ListenWall({ count = FEATURED.tracks.length }: { count?: number }) {
  const release = RELEASES[FEATURED.release];
  return (
    <div className="ls">
      <ul className="ls-list">
        {FEATURED.tracks.slice(0, count).map((t) => (
          <li key={t.spotify} className="ls-row">
            <span className="ls-title">{t.title}</span>
            <iframe
              className="ls-embed"
              src={spotifyTrackEmbed(t.spotify)}
              title={`${t.title}, ${FEATURED.venue}, ${FEATURED.dates}: Spotify player`}
              loading="lazy"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            />
          </li>
        ))}
      </ul>
      <p className="ls-credit">
        {FEATURED.venue}, {FEATURED.dates}, from {release.title}. Played by Spotify: signed in, you hear
        {count === 1 ? ' the song ' : ' each song '}whole; if not, a preview. <a href={spotifyAlbumUrl(release.spotify!)}>The album on Spotify</a>
      </p>
    </div>
  );
}

const MONTH = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
/** "March 23", or "August 4–5" for a run of nights. */
export function showDates(s: Show): string {
  const day = (iso: string) => Number(iso.slice(8));
  return `${MONTH[Number(s.date.slice(5, 7)) - 1]} ${day(s.date)}${s.to ? `–${day(s.to)}` : ''}`;
}

/** Where a show can be heard: its albums and their links, the nights Play Dead streams, or that it was never released. */
export function HeardList({ show }: { show: Show }) {
  const nights = playDeadNights(show);
  if (show.heard.length === 0 && nights.length === 0) return <span className="sh-heard sh-none">Never released</span>;
  const run = Boolean(show.to);
  const day = (iso: string) => `${MONTH[Number(iso.slice(5, 7)) - 1]} ${Number(iso.slice(8))}`;
  return (
    <ul className="sh-heard">
      {show.heard.map(({ release, holds }) => {
        const r = RELEASES[release];
        return (
          <li key={release}>
            {r.title}: {holds}.{' '}
            {r.spotify ? (
              <a className="sh-link" href={spotifyAlbumUrl(r.spotify)} aria-label={`${r.title} on Spotify`}>
                Spotify
              </a>
            ) : (
              <span className="sh-none">Not on Spotify</span>
            )}
          </li>
        );
      })}
      {nights.length > 0 && (
        <li>
          {run ? 'On Play Dead: ' : 'The night, on '}
          {nights.map((n) => (
            <a key={n.date} className="sh-link sh-pd" href={n.url} aria-label={`${day(n.date)}, ${show.venue}, on Play Dead`}>
              {run ? day(n.date) : 'Play Dead'}
            </a>
          ))}
        </li>
      )}
    </ul>
  );
}

/** Every show the Wall played, and where each can be heard. A row's date and place put it on the map. */
export function ShowList({ at, pick }: { at: number; pick: (i: number) => void }) {
  return (
    <div className="sh">
      <ol className="sh-list">
        {SHOWS.map((s, i) => (
          <li key={s.date} className="sh-row" data-on={i === at || undefined}>
            {s.leg !== SHOWS[i - 1]?.leg && <h3 className="sh-leg">{s.leg}</h3>}
            <button className="sh-pick" onClick={() => pick(i)} aria-label={`${showDates(s)}, ${s.venue}, ${s.city}: show on the map`}>
              <span className="sh-when">{showDates(s)}</span>
              <span className="sh-where">
                <b>{s.venue}</b> {s.city}
              </span>
            </button>
            <HeardList show={s} />
          </li>
        ))}
      </ol>
      <p className="ls-credit">Checked on Spotify and Play Dead, November 17, 2026. Play Dead is the band's own service, by subscription. Apple Music links are to come.</p>
    </div>
  );
}

const TourMap = lazy(() => import('./TourMap'));

/** The map and the list together: one stop is chosen in both. In the story the list is folded away under the map. */
export function Shows({ fold }: { fold?: boolean }) {
  const [at, setAt] = useState(0);
  const top = useRef<HTMLDivElement>(null);
  const pick = (i: number) => {
    setAt(i);
    top.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  return (
    <div ref={top} className="shows">
      <Suspense fallback={<div className="tm tm-wait" />}>
        <TourMap at={at} setAt={setAt} />
      </Suspense>
      {fold ? (
        <details className="sh-fold">
          <summary>All {SHOW_COUNT} shows as a list</summary>
          <ShowList at={at} pick={pick} />
        </details>
      ) : (
        <ShowList at={at} pick={pick} />
      )}
    </div>
  );
}

/** The explorer's panel of the shows: the map, the list and the players, in a dialog over the scene. */
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
        aria-label="The shows"
        tabIndex={-1}
        ref={dialog}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="close" onClick={onClose} aria-label="Close">
          ×
        </button>
        <h1>{SHOWS_HEAD}</h1>
        <p className="lede">{SHOWS_LEDE}</p>
        <Shows />
        <h2>Listen</h2>
        <p>{LISTEN_LEDE}</p>
        <ListenWall />
      </div>
    </div>
  );
}

/** The words the story's steps and the panel share. */
export const LISTEN_LEDE =
  "This is the band two weeks after the Bowl, in Philadelphia, from its own tapes. A tape like this is fed from the stage, so it holds what went into the Wall, not what came out of it. No recording of the afternoon at the Bowl has been released.";
export const ROAD_LEDE = 'Every night the Wall stood, in order. Step through the stops, or press play.';
export const SHOWS_HEAD = `The ${SHOW_COUNT} shows`;
export const SHOWS_LEDE =
  'Every night the Wall stood, in order, and where to hear it from a licensed source: the albums on Spotify, and the nights that stream on Play Dead. Some nights are on neither, the Hollywood Bowl among them.';

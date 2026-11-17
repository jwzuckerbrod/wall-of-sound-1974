import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { FEATURED, RELEASES, SHOWS, SHOW_COUNT, spotifyAlbumUrl, spotifyTrackEmbed, type Show } from '../data/shows';
import './listen.css';

/**
 * The listening players and the list of shows, shared by the story and the
 * explorer's Listen panel. The players are Spotify's own embedded players
 * (src/data/shows.ts says what they play and why): a visitor signed in to
 * Spotify hears the whole song, anyone else a preview.
 */

/** The Wall, from the nearest night that was released. */
export function ListenWall() {
  const release = RELEASES[FEATURED.release];
  return (
    <div className="ls">
      <ul className="ls-list">
        {FEATURED.tracks.map((t) => (
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
        {FEATURED.venue}, {FEATURED.dates}, from {release.title}. Played by Spotify: signed in, you hear each song
        whole; if not, a preview. <a href={spotifyAlbumUrl(release.spotify!)}>The album on Spotify</a>
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

/** Where a show can be heard: its releases and their links, or that it was never released. */
export function HeardList({ show }: { show: Show }) {
  if (show.heard.length === 0) return <span className="sh-heard sh-none">Never released</span>;
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
      <p className="ls-credit">Checked on Spotify, November 17, 2026. Apple Music and Play Dead links are to come.</p>
    </div>
  );
}

const TourMap = lazy(() => import('./TourMap'));

/** The map and the list together: one stop is chosen in both. */
export function Shows() {
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
      <ShowList at={at} pick={pick} />
    </div>
  );
}

/** The explorer's Listen panel: the players and the shows, in a dialog over the scene. */
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
        <p className="lede">{LISTEN_LEDE}</p>
        <ListenWall />
        <h2>{SHOWS_HEAD}</h2>
        <p>{SHOWS_LEDE}</p>
        <Shows />
      </div>
    </div>
  );
}

/** The words the story's steps and the panel share. */
export const LISTEN_LEDE =
  "No recording of that afternoon at the Bowl has ever been released. This is the Wall two weeks later, in Philadelphia, from the band's own tapes. A tape like this is fed from the stage, so it holds what went into the Wall, not what came out of it.";
export const SHOWS_HEAD = `The ${SHOW_COUNT} shows`;
export const SHOWS_LEDE =
  'Every night the Wall stood, in order, with the official releases that hold its music. Many nights were never released, the Hollywood Bowl among them.';

import { useEffect, useState } from 'react';
import { NO_PLACE, clock, player, usePlayer } from './player';
import { PlayIcon, pairItem, pairOf } from './Listen';

/** The year switch pulses once, the first time anyone sees it on this browser. */
const SEEN = 'wos-np-years-seen';
function firstSight(): boolean {
  try {
    if (localStorage.getItem(SEEN)) return false;
    localStorage.setItem(SEEN, '1');
  } catch {
    /* storage blocked: pulse every time, harmlessly */
  }
  return true;
}

/**
 * The player that stays on screen once someone has pressed play, so the sound
 * can be paused from anywhere on the page. Its name leads back to the song's
 * row; the X stops the sound and hides it. It goes away only when asked.
 *
 * The story scrolls, so its rows are always on the page. The explorer doesn't:
 * there the rows are in the Listen panel, which `onOpen` opens, and this floats
 * over the scene as a pill (`.np-floating`, listen.css).
 */
export function NowPlaying({ onOpen }: { onOpen?: () => void }) {
  const { item, playing, loading, failed, places } = usePlayer();
  const paired = item ? pairOf(item) : null;
  const [pulse, setPulse] = useState(false);
  const hasPair = !!paired;
  useEffect(() => {
    if (hasPair && firstSight()) setPulse(true);
  }, [hasPair]);
  if (!item) return null;
  const { time, length } = places[item.id] ?? NO_PLACE;
  const f = Number.isFinite(length) && length > 0 ? time / length : 0;
  const backToRow = () => {
    if (onOpen) return onOpen();
    const row = Array.from(document.querySelectorAll<HTMLElement>('[data-track]')).find((r) => r.dataset.track === item.id);
    row?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };
  return (
    <>
      {!onOpen && <div className="np-room" />}
      <div className={`np${onOpen ? ' np-floating' : ''}`} role="region" aria-label="Now playing">
        <div className="np-progress" style={{ ['--f' as string]: f }}>
          <i />
        </div>
        <button className="np-toggle" onClick={player.togglePlaying} aria-label={`${playing ? 'Pause' : 'Play'} ${item.title}`} data-loading={loading || undefined}>
          <span>
            <PlayIcon playing={playing} />
          </span>
        </button>
        <button className="np-info" onClick={backToRow} aria-label={onOpen ? `${item.title}: open the Listen panel` : `${item.title}: go to its player`}>
          <b>{item.title}</b>
          <span>
            {failed
              ? "Couldn't load the tape"
              : `${paired ? (paired.side === 'before' ? 'Before the Wall' : 'With the Wall') : item.detail} · ${clock(time)} / ${clock(length)}`}
          </span>
        </button>
        {paired && (
          <div className="np-years" role="group" aria-label={`Which recording of ${paired.pair.title}`} data-pulse={pulse || undefined} onAnimationEnd={() => setPulse(false)}>
            {(['before', 'after'] as const).map((side) => (
              <button
                key={side}
                aria-pressed={paired.side === side}
                aria-label={side === 'before' ? '1971, before the Wall' : '1974, with the Wall'}
                onClick={() => player.switchTo(pairItem(paired.pair, side))}
              >
                {side === 'before' ? '71' : '74'}
              </button>
            ))}
          </div>
        )}
        <button className="np-close" onClick={player.close} aria-label="Stop and close the player">
          <svg viewBox="0 0 14 14" aria-hidden="true">
            <path d="M2 2l10 10M12 2L2 12" />
          </svg>
        </button>
      </div>
    </>
  );
}

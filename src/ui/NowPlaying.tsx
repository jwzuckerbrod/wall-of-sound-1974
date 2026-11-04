import { NO_PLACE, clock, player, usePlayer } from './player';
import { PlayIcon } from './Listen';

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
            {failed ? "Couldn't load the tape" : `${item.detail} · ${clock(time)} / ${clock(length)}`}
          </span>
        </button>
        <button className="np-close" onClick={player.close} aria-label="Stop and close the player">
          <svg viewBox="0 0 14 14" aria-hidden="true">
            <path d="M2 2l10 10M12 2L2 12" />
          </svg>
        </button>
      </div>
    </>
  );
}

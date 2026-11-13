import { useEffect, useRef, useState } from 'react';
import { CHANNELS, SOURCES, type ChannelId, type SourceId } from '../data/wall.config';
import { SYSTEMS } from '../ui/Controls';
import { Credits } from './Credits';
import { Landing } from './Landing';
import { srcOf, useModelReady, type StoryImage } from './images';
import { Needles } from './Needles';
import { shortSource } from './sources';
import { STEPS } from './steps';
import '../ui/range.css';
import './story.css';

/**
 * The story's screen, over the explorer's model (App.tsx): stills, and a card
 * with the words, one control at most, and Back and Next. The page never
 * scrolls, so a drag or the wheel only ever turns the model, at any step.
 * Arrow keys step too, and so does a sideways swipe on the card.
 */

function Caption({ img }: { img: StoryImage }) {
  const credit = img.creditShort ?? img.credit;
  return (
    <figcaption>
      <span className={`tag tag-${img.kind}`}>{img.kind === 'render' ? 'Reconstruction' : 'Photograph'}</span>
      {img.caption} {img.creditUrl ? <a href={img.creditUrl}>{credit}</a> : credit}
    </figcaption>
  );
}

function SourceLine({ ids, onCredits }: { ids: SourceId[]; onCredits: () => void }) {
  return (
    <p className="sources">
      {ids.length > 0 && 'Sources: '}
      {ids.map((id, i) => (
        <span key={id}>
          {i > 0 && ', '}
          {SOURCES[id].url ? <a href={SOURCES[id].url}>{shortSource(id)}</a> : shortSource(id)}
        </span>
      ))}
      {ids.length > 0 && '. '}
      <button type="button" onClick={onCredits}>
        All credits
      </button>
    </p>
  );
}

export function StoryLayer({
  at,
  go,
  onLook,
  onSkip,
  isolated,
  setIsolated,
  explode,
  setExplode,
}: {
  at: number;
  go: (n: number) => void;
  /** Put the story away and hand over the explorer, as the step left it. */
  onLook: () => void;
  /** Straight to the explorer, from the title. */
  onSkip: () => void;
  isolated: ChannelId | null;
  setIsolated: (c: ChannelId | null) => void;
  explode: number;
  setExplode: (v: number) => void;
}) {
  const step = STEPS[at];
  const last = at === STEPS.length - 1;
  const live = !step.still && !step.full;
  const [credits, setCredits] = useState(false);
  // Turning the model shrinks the card to its headline (peek), so the model has the screen; a tap opens it again.
  const [peek, setPeek] = useState(false);
  useEffect(() => setPeek(false), [at]);
  useEffect(() => {
    if (!live) return;
    let from: { x: number; y: number } | null = null;
    const onModel = (e: Event) => e.target instanceof HTMLCanvasElement;
    const down = (e: PointerEvent) => (from = onModel(e) ? { x: e.clientX, y: e.clientY } : null);
    const move = (e: PointerEvent) => {
      if (from && Math.hypot(e.clientX - from.x, e.clientY - from.y) > 10) {
        setPeek(true);
        from = null;
      }
    };
    const up = () => (from = null);
    const wheel = (e: WheelEvent) => onModel(e) && setPeek(true);
    window.addEventListener('pointerdown', down, true);
    window.addEventListener('pointermove', move, true);
    window.addEventListener('pointerup', up, true);
    window.addEventListener('wheel', wheel, { capture: true, passive: true });
    return () => {
      window.removeEventListener('pointerdown', down, true);
      window.removeEventListener('pointermove', move, true);
      window.removeEventListener('pointerup', up, true);
      window.removeEventListener('wheel', wheel, true);
    };
  }, [live]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'Escape' && credits) return setCredits(false);
      // A slider or a switch in a diagram keeps its own arrow keys.
      const el = document.activeElement;
      if (el instanceof HTMLElement && ['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName)) return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown') go(at + 1);
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') go(at - 1);
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [at, go, credits]);

  // A sideways swipe on the card steps; on the model, a drag turns it.
  const touch = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.target as HTMLElement;
    touch.current = t.closest('input, label, .seat-figure, .dg, .ls') ? null : { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const from = touch.current;
    touch.current = null;
    if (!from) return;
    const dx = e.changedTouches[0].clientX - from.x;
    const dy = e.changedTouches[0].clientY - from.y;
    if (Math.abs(dx) > 60 && Math.abs(dx) > 2 * Math.abs(dy)) go(at + (dx < 0 ? 1 : -1));
  };

  // One figure per picture, so a still shared by neighboring steps doesn't blink between them.
  const stills = STEPS.map((s) => s.still).filter((s, i, all): s is StoryImage => !!s && all.indexOf(s) === i);
  // A still downloads when its step is on screen or next to it, and the first screen's neighbor only once
  // the model has drawn, so the stills of the story's last steps don't slow a phone's first load.
  const ready = useModelReady();
  const wanted = useRef(new Set<string>());
  for (let i = at - 1; i <= at + 1; i++) {
    const img = STEPS[i]?.still;
    if (img && (at > 0 || ready)) wanted.current.add(img.id);
  }

  return (
    <div className="sty">
      {stills.map((img) => (
        <figure key={img.id} className="sty-still" data-on={step.still === img || undefined} data-dim={step.full || undefined}>
          <div className="sty-pic">
            {wanted.current.has(img.id) && <img {...srcOf(img)} sizes="100vw" alt={img.alt} style={{ objectPosition: img.focus }} />}
            {img.overlay === 'needles' && step.still === img && <Needles />}
            {at > 0 && <Caption img={img} />}
          </div>
        </figure>
      ))}
      {step.full && !step.still && <div className="sty-dim" />}

      {/* The first screen is its own design (Landing.tsx, under test); the card starts at the next step. */}
      {at === 0 && <Landing onBegin={() => go(1)} onSkip={onSkip} />}
      {at > 0 && (
        <section
        className={`sty-card${step.full ? ' full' : ''}${at === 0 ? ' opening' : ''}${live && peek ? ' sty-peek' : ''}`}
        aria-live="polite"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {live && (
          <button
            type="button"
            className="sty-handle"
            onClick={() => setPeek(!peek)}
            aria-expanded={!peek}
            aria-label={peek ? 'Show the text' : 'Shrink the text'}
          >
            <svg viewBox="0 0 16 16" aria-hidden="true"><path d={peek ? 'M3 10l5-5 5 5' : 'M3 6l5 5 5-5'} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        )}
        <div className="sty-body" key={step.id} onClick={peek ? () => setPeek(false) : undefined}>
          <p className="sty-act">
            {step.act}
            {live && <span>{peek ? 'Tap to read on' : 'Live model · drag to look around'}</span>}
          </p>
          {step.body}
          {step.control === 'systems' && (
            <ul className="sty-chips" aria-label="The six sound systems">
              {SYSTEMS.map((sys) => {
                const on = !!isolated && CHANNELS[isolated].system === CHANNELS[sys.channel].system;
                return (
                  <li key={sys.label}>
                    <button aria-pressed={on} onClick={() => setIsolated(on ? null : sys.channel)}>
                      <i style={{ background: CHANNELS[sys.channel].color }} aria-hidden="true" />
                      {sys.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {step.control === 'explode' && (
            <label className="sty-apart">
              <span>Together</span>
              <input
                className="range"
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={explode}
                style={{ ['--f' as string]: explode }}
                onChange={(e) => setExplode(Number(e.target.value))}
                aria-label="Take the Wall apart"
                aria-valuetext={`${Math.round(explode * 100)}% apart`}
              />
              <span>Apart</span>
            </label>
          )}
          {at > 0 && <SourceLine ids={step.sources} onCredits={() => setCredits(true)} />}
        </div>
        <div className="sty-nav">
          <div className="sty-progress" role="progressbar" aria-valuemin={1} aria-valuemax={STEPS.length} aria-valuenow={at + 1} aria-label="Place in the story">
            <i style={{ width: `${((at + 1) / STEPS.length) * 100}%` }} />
          </div>
          <div className="sty-buttons">
            {at > 0 && (
              <button className="sty-back" onClick={() => go(at - 1)} aria-label="Back">
                <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3 5 8l5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            )}
            {at === 0 && (
              <button className="sty-look" onClick={onSkip}>
                Skip to the 3D explorer
              </button>
            )}
            {at > 0 && !last && (
              <button className="sty-explore" onClick={onLook}>
                <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.5 14 5v6l-6 3.5L2 11V5zM2 5l6 3.5L14 5M8 8.5v6" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" /></svg>
                Explore in 3D
              </button>
            )}
            <span className="sty-count">
              {at + 1} / {STEPS.length}
            </span>
            {last ? (
              <button className="sty-next" onClick={onLook}>
                Explore it yourself
              </button>
            ) : (
              <button className="sty-next" onClick={() => go(at + 1)}>
                {at === 0 ? 'Begin' : 'Next'}
              </button>
            )}
          </div>
        </div>
        </section>
      )}

      {credits && (
        <div className="sty-credits" role="dialog" aria-modal="true" aria-label="Sources and credits">
          <button className="sty-close" onClick={() => setCredits(false)}>
            Close
          </button>
          <Credits />
        </div>
      )}
    </div>
  );
}

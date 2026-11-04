import { Fragment, useEffect, useRef } from 'react';
import { SOURCES, type SourceId } from '../data/wall.config';
import { BEATS, type Beat } from './beats';
import { Credits } from './Credits';
import { DiagramFigure } from './DiagramFigure';
import { IMAGES, srcOf, type StoryImage } from './images';
import { shortSource } from './sources';

/**
 * Sets --p (0 to 1) on each beat as the reader scrolls through it. CSS does
 * the rest: crossfades and the push in (diagrams run themselves: DiagramFigure). One listener,
 * one write per beat per frame.
 */
function useScrollProgress(root: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const beats = Array.from(el.querySelectorAll<HTMLElement>('[data-beat]'));
    let frame = 0;
    const update = () => {
      frame = 0;
      const vh = window.innerHeight;
      for (const b of beats) {
        const r = b.getBoundingClientRect();
        const run = Math.max(1, r.height - vh);
        const p = Math.min(1, Math.max(0, -r.top / run));
        b.style.setProperty('--p', p.toFixed(4));
      }
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(frame);
    };
  }, [root]);
}

function Picture({ img, className, eager, ambient }: { img: StoryImage; className?: string; eager?: boolean; ambient?: boolean }) {
  const { src, srcSet } = srcOf(img);
  return (
    <img
      className={className}
      aria-hidden={ambient || undefined}
      src={src}
      srcSet={srcSet}
      // Portrait: the whole frame across the width. Landscape: a 16:9 frame
      // covering the screen, which on a tall window is wider than the screen.
      sizes={ambient ? "480px" : "(orientation: portrait) 100vw, max(100vw, 178svh)"}
      alt={ambient ? '' : img.alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      style={{ objectPosition: img.focus }}
    />
  );
}

function Caption({ img }: { img: StoryImage }) {
  return (
    <figcaption>
      <span className={`tag tag-${img.kind}`}>{img.kind === 'render' ? 'Reconstruction' : 'Photograph'}</span>
      {img.caption}{' '}
      {img.creditUrl ? <a href={img.creditUrl}>{img.credit}</a> : <span className="credit">{img.credit}</span>}
    </figcaption>
  );
}

function SourceLine({ ids }: { ids: SourceId[] }) {
  return (
    <p className="sources">
      Sources:{' '}
      {ids.map((id, i) => (
        <span key={id}>
          {i > 0 && ', '}
          {SOURCES[id].url ? <a href={SOURCES[id].url}>{shortSource(id)}</a> : shortSource(id)}
        </span>
      ))}
      . <a href="#credits">All credits</a>
    </p>
  );
}

function BeatView({ beat, first }: { beat: Beat; first: boolean }) {
  const [a, b] = beat.images;
  return (
    <section className={`beat motion-${beat.motion}`} data-beat={beat.id} id={beat.id} style={{ ['--cards' as string]: beat.cards.length }}>
      <div className="stage">
        <figure className="layer">
          <Picture img={a} className="ambient" ambient eager={first} />
          <Picture img={a} className="main" eager={first} />
          <Caption img={a} />
        </figure>
        {b && (
          <figure className="layer layer-b">
            <Picture img={b} className="ambient" ambient eager={first} />
            <Picture img={b} className="main" eager={first} />
            <Caption img={b} />
          </figure>
        )}
      </div>
      <div className="cards">
        {beat.cards.map((c, i) => (
          <Fragment key={i}>
            <div className="card-slot">
              <div className="card">
                {c}
                {i === beat.cards.length - 1 && <SourceLine ids={beat.sources} />}
              </div>
            </div>
            {beat.diagram?.after === i && (
              <div className="card-slot slot-figure">
                <figure className="card card-figure">
                  {beat.diagram.animated === false ? (
                    beat.diagram.node
                  ) : (
                    <DiagramFigure label={beat.diagram.label}>{beat.diagram.node}</DiagramFigure>
                  )}
                </figure>
              </div>
            )}
          </Fragment>
        ))}
        <div className="hold" />
      </div>
    </section>
  );
}

export function Story() {
  const root = useRef<HTMLElement>(null);
  useScrollProgress(root);
  const explorer = `${import.meta.env.BASE_URL}`;

  return (
    <main ref={root}>
      <header className="title">
        <p className="eyebrow">A reconstruction</p>
        <h1>The Wall of Sound</h1>
        <p className="dek">The Grateful Dead's sound system, summer 1974</p>
        <p className="scroll-hint" aria-hidden="true">Scroll</p>
      </header>

      {BEATS.map((b, i) => (
        <BeatView key={b.id} beat={b} first={i === 0} />
      ))}

      <section className="inside" id="inside">
        <figure className="inside-image">
          <Picture img={IMAGES.bowlHero} />
        </figure>
        <div className="inside-copy">
          <h2>Step inside</h2>
          <p>Walk the stage. Stand where the audience stood. Climb the tower.</p>
          <p>Every cabinet in the explorer opens to show what it carried, and how sure we are of it.</p>
          <a className="button" href={explorer}>
            Open the 3D explorer
          </a>
          <p className="aside">Works best on a laptop or a recent phone.</p>
        </div>
      </section>

      <Credits />
    </main>
  );
}

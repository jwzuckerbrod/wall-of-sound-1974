import { Fragment, useEffect, useRef, useState } from 'react';
import { SOURCES, type SourceId } from '../data/wall.config';
import { BEATS, type Beat } from './beats';
import { Credits } from './Credits';
import { DiagramFigure } from './DiagramFigure';
import { IMAGES, srcOf, type StoryImage } from './images';
import { shortSource } from './sources';
import { NowPlaying } from '../ui/NowPlaying';

/**
 * Phones, and any window too short for a card to sit over a picture, get the
 * compact layout: the picture pinned, the words scrolling in their own space.
 * Its rotation is handled in story.css; only this switch needs a remount.
 */
const COMPACT = '(max-width: 899px), (max-height: 600px)';

function useCompact() {
  const [compact, setCompact] = useState(() => matchMedia(COMPACT).matches);
  useEffect(() => {
    const q = matchMedia(COMPACT);
    const on = () => setCompact(q.matches);
    on();
    q.addEventListener('change', on);
    return () => q.removeEventListener('change', on);
  }, []);
  return compact;
}

/**
 * Sets --p (0 to 1) on each beat as the reader scrolls through it, and in the
 * compact layout --f (0 to 1) as the block that starts its crossfade comes up.
 * CSS does the rest: crossfades and the push in (diagrams run themselves:
 * DiagramFigure). One listener, one write per beat per frame.
 */
function useScrollProgress(root: React.RefObject<HTMLElement | null>, layout: boolean) {
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
        const fade = b.querySelector<HTMLElement>('[data-fade]');
        if (fade) {
          // The new picture is in by the time its paragraph reaches the reading area.
          const landscape = window.innerWidth > vh;
          const from = (landscape ? 0.95 : 0.9) * vh;
          const to = (landscape ? 0.3 : 0.55) * vh;
          const f = Math.min(1, Math.max(0, (from - fade.getBoundingClientRect().top) / (from - to)));
          b.style.setProperty('--f', f.toFixed(3));
        }
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
  }, [root, layout]);
}

function Picture({ img, className, eager, ambient, sizes }: { img: StoryImage; className?: string; eager?: boolean; ambient?: boolean; sizes?: string }) {
  const { src, srcSet } = srcOf(img);
  return (
    <img
      className={className}
      aria-hidden={ambient || undefined}
      src={src}
      srcSet={srcSet}
      // Portrait: the whole frame across the width. Landscape: a 16:9 frame
      // covering the screen, which on a tall window is wider than the screen.
      sizes={ambient ? '480px' : (sizes ?? '(orientation: portrait) 100vw, max(100vw, 178svh)')}
      alt={ambient ? '' : img.alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      style={{ objectPosition: img.focus }}
    />
  );
}

/** The picture of the compact layout: pinned, with one caption under it. */
function Pin({ images, first }: { images: StoryImage[]; first?: boolean }) {
  const [a, b] = images;
  const sizes = '(orientation: portrait) 100vw, 46vw';
  return (
    <div className="pin">
      <div className="pin-image">
        <Picture img={a} eager={first} sizes={sizes} />
        {b && <Picture img={b} className="pin-b" eager={first} sizes={sizes} />}
      </div>
      <div className="pin-caption">
        <span className="pin-cap-a"><CaptionText img={a} short /></span>
        {b && <span className="pin-cap-b"><CaptionText img={b} short /></span>}
      </div>
    </div>
  );
}

function CaptionText({ img, short }: { img: StoryImage; short?: boolean }) {
  const credit = short && img.creditShort ? img.creditShort : img.credit;
  return (
    <>
      <span className={`tag tag-${img.kind}`}>{img.kind === 'render' ? 'Reconstruction' : 'Photograph'}</span>
      {img.caption}{' '}
      {img.creditUrl ? <a href={img.creditUrl}>{credit}</a> : <span className="credit">{credit}</span>}
    </>
  );
}

function Caption({ img }: { img: StoryImage }) {
  return (
    <figcaption>
      <CaptionText img={img} />
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

function Diagram({ diagram }: { diagram: NonNullable<Beat['diagram']> }) {
  return diagram.animated === false ? <>{diagram.node}</> : <DiagramFigure label={diagram.label}>{diagram.node}</DiagramFigure>;
}

/**
 * One beat in the compact layout. A diagram's beat has no picture on a portrait
 * phone; on its side, the words keep the picture beside them and the diagram
 * takes the width.
 */
function CompactBeat({ beat, first }: { beat: Beat; first: boolean }) {
  const crossfade = beat.motion === 'crossfade';
  const text = (c: React.ReactNode, i: number) => (
    <div className="block" data-fade={(crossfade && i === 1) || undefined}>
      {c}
      {i === beat.cards.length - 1 && <SourceLine ids={beat.sources} />}
    </div>
  );
  if (beat.diagram) {
    const { diagram } = beat;
    return (
      <section className="c-beat c-flow" data-beat={beat.id} id={beat.id}>
        {beat.cards.map((c, i) => (
          <Fragment key={i}>
            <div className="c-seg">
              <Pin images={beat.images} />
              {text(c, i)}
            </div>
            {diagram.after === i && (
              <figure className="c-figure">
                <Diagram diagram={diagram} />
              </figure>
            )}
          </Fragment>
        ))}
      </section>
    );
  }
  return (
    <section className={`c-beat c-pinned motion-${beat.motion}`} data-beat={beat.id} id={beat.id}>
      <Pin images={beat.images} first={first} />
      <div className="c-copy">
        {beat.cards.map((c, i) => (
          <Fragment key={i}>{text(c, i)}</Fragment>
        ))}
      </div>
    </section>
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
                  <Diagram diagram={beat.diagram} />
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
  const compact = useCompact();
  useScrollProgress(root, compact);
  const explorer = `${import.meta.env.BASE_URL}`;

  return (
    <main ref={root} className={compact ? 'compact' : undefined}>
      <header className="title">
        <p className="eyebrow">A reconstruction</p>
        <h1>The Wall of Sound</h1>
        <p className="dek">The Grateful Dead's sound system, summer 1974</p>
        <p className="scroll-hint" aria-hidden="true">Scroll</p>
      </header>

      {BEATS.map((b, i) =>
        compact ? <CompactBeat key={b.id} beat={b} first={i === 0} /> : <BeatView key={b.id} beat={b} first={i === 0} />,
      )}

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
      <NowPlaying />
    </main>
  );
}

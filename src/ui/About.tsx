import { useEffect, useMemo, useRef } from 'react';
import { PROVENANCE, SOURCES, wall, type Confidence, type SourceId } from '../data/wall.config';
import { allCells, driverTally, faceCoverage } from '../geometry/arrays';

const ORDER: Confidence[] = ['guessed', 'estimated', 'confirmed'];
const HEADING: Record<Confidence, string> = {
  confirmed: 'Confirmed',
  estimated: 'Estimated',
  guessed: 'Guessed',
};
const BLURB: Record<Confidence, string> = {
  confirmed: 'Stated in two or more independent sources, or in a primary 1974 document, with no contradiction found.',
  estimated: 'Derived by reasoning from confirmed facts, photographs, or standard period hardware. Plausible, not documented.',
  guessed: 'No evidence either way. Chosen because the model needed a number. Treat as a placeholder.',
};

/**
 * About this reconstruction.
 *
 * Generated from PROVENANCE rather than written by hand, so it cannot drift out
 * of step with the model. If somebody changes a dimension from confirmed to
 * guessed in the config, this page says so without anyone remembering to
 * update it.
 */
export function About({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDivElement>(null);
  const stats = useMemo(() => {
    const cells = allCells();
    return { tally: driverTally(cells), cover: faceCoverage(cells, wall.dimensions.arrayHeight) };
  }, []);

  const byConfidence = useMemo(() => {
    const groups: Record<Confidence, { key: string; note?: string; sources: SourceId[] }[]> = {
      confirmed: [],
      estimated: [],
      guessed: [],
    };
    for (const [key, p] of Object.entries(PROVENANCE))
      groups[p.confidence].push({ key, note: p.note, sources: p.sources });
    return groups;
  }, []);

  // Focus the dialog on open and close it on Escape: it covers the whole page.
  useEffect(() => {
    dialog.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="about-backdrop" onClick={onClose}>
      <div
        className="about"
        role="dialog"
        aria-modal="true"
        aria-label="About this reconstruction"
        tabIndex={-1}
        ref={dialog}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="close" onClick={onClose} aria-label="Close">
          ×
        </button>

        <h1>About this reconstruction</h1>
        <p className="lede">
          A model of the Grateful Dead's Wall of Sound as it stood in the summer of 1974, built entirely from
          numbers rather than from a 3D scan or a hand-sculpted model. Every cabinet, tube and driver here is
          generated from one configuration file, and every figure in that file carries a source and a
          confidence level — which is what this page is for.
        </p>

        <h2>What is in it</h2>
        <dl className="about-stats">
          <dt>Drivers placed</dt>
          <dd>
            {stats.tally.total} — {stats.tally.jbl15} fifteens, {stats.tally.jbl12} twelves, {stats.tally.jbl5}{' '}
            fives, {stats.tally.evHorn} Electro-Voice T350 horns
          </dd>
          <dt>Amplifiers</dt>
          <dd>{wall.system.amplifierCount} McIntosh MC-2300</dd>
          <dt>Speaker face</dt>
          <dd>
            About {Math.round(stats.cover.fraction * 100)}% of the opening. The rest is open structure — 641
            drivers of these sizes cannot fill a sixty-foot frame, and the photographs agree.
          </dd>
        </dl>

        <h2 id="honesty">What is documented and what is not</h2>
        <p>
          The biggest single invention in this model is <strong>which channel stood in which bay</strong>. The
          April 1974 drawings dimension the steel down to the inch but never say what was mounted on it, and no
          plan of the speaker layout has been found. The left-to-right order here is consistent with the
          photographs and it is not documented. The sixty-four-foot grid it packs into <em>is</em> documented,
          bay by bay.
        </p>
        <p>
          Likewise, the class totals — 89 fifteens, 178 twelves, 320 fives, 54 horns — are historical, and the
          model asserts them on every load. How those drivers are shared out between arrays is mostly this
          reconstruction's own.
        </p>

        {ORDER.map((level) => (
          <section key={level}>
            <h2>
              {HEADING[level]} <span className="count">{byConfidence[level].length}</span>
            </h2>
            <p className="level-blurb">{BLURB[level]}</p>
            <ul className="provenance">
              {byConfidence[level].map((p) => (
                <li key={p.key}>
                  <code>{p.key}</code>
                  {p.note && <span className="note">{p.note}</span>}
                </li>
              ))}
            </ul>
          </section>
        ))}

        <h2>Sources</h2>
        <ul className="sources">
          {Object.entries(SOURCES).map(([id, s]) => (
            <li key={id}>
              <code>{id}</code>{' '}
              {s.url ? (
                <a href={s.url} target="_blank" rel="noreferrer noopener">
                  {s.title}
                </a>
              ) : (
                s.title
              )}
            </li>
          ))}
        </ul>

        <h2>Credits</h2>
        <p>
          The Wall of Sound was designed by{' '}
          {wall.meta.designers.map((d, i) => (
            <span key={d.name}>
              {i > 0 && (i === wall.meta.designers.length - 1 ? ' and ' : ', ')}
              {d.name} <span className="role">({d.role})</span>
            </span>
          ))}
          . It debuted at the {wall.meta.debut.venue} on 23 March 1974 and was taken apart after the{' '}
          {wall.meta.retired.run} run at the {wall.meta.retired.venue}.
        </p>
        <p>
          The two crew at the top of the scaffold are generic figures, not portraits, made with MakeHuman and
          MPFB. Their hair is by Elvaerwyn, from the MakeHuman community's assets (CC BY).
        </p>
      </div>
    </div>
  );
}

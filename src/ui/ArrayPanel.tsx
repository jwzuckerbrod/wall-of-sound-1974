import { useMemo } from 'react';
import {
  ARRAYS,
  CHANNELS,
  DRIVERS,
  PROVENANCE,
  SOURCES,
  cabinetSize,
  wall,
  type ChannelId,
} from '../data/wall.config';
import { allCells, blockBounds } from '../geometry/arrays';
import { long, type UnitSystem } from './units';

const BAND_LABEL: Record<string, string> = {
  high: 'Highs',
  upperMid: 'Upper mids',
  lowerMid: 'Lower mids',
  low: 'Lows',
  full: 'Full range, no crossover',
};

/** Which provenance entry actually governs a given array. */
function provenanceFor(blockId: string) {
  if (blockId === 'kick') return { key: 'arrays.kickCount', ...PROVENANCE['arrays.kickCount'] };
  if (blockId === 'weir' || blockId.startsWith('garcia'))
    return { key: 'arrays.guitarCount', ...PROVENANCE['arrays.guitarCount'] };
  if (blockId.startsWith('bass')) return { key: 'arrays.bassCount', ...PROVENANCE['arrays.bassCount'] };
  if (blockId.startsWith('voc')) return { key: 'arrays.vocalCluster', ...PROVENANCE['arrays.vocalCluster'] };
  return { key: 'arrays.positions', ...PROVENANCE['arrays.positions'] };
}

const CONFIDENCE_LABEL = {
  confirmed: 'Confirmed',
  estimated: 'Estimated',
  guessed: 'Guessed',
} as const;

/**
 * What one array carried, how many speakers were in it, and where that claim
 * comes from. Every panel shows its own confidence — a visitor should never
 * have to guess which numbers are documented and which are a reconstruction.
 */
export function ArrayPanel({
  blockId,
  units,
  onClose,
  onIsolate,
  isolated,
}: {
  blockId: string;
  units: UnitSystem;
  onClose: () => void;
  onIsolate: (c: ChannelId | null) => void;
  isolated: ChannelId | null;
}) {
  const block = ARRAYS.find((b) => b.id === blockId);
  const bounds = useMemo(() => blockBounds(blockId, allCells()), [blockId]);
  if (!block || !bounds) return null;

  const channel = CHANNELS[block.channel];
  const driver = DRIVERS[bounds.driver];
  const size = cabinetSize(block.cabinet);
  const prov = provenanceFor(blockId);
  const floorIndex = wall.structure.scaffold.platformsAboveDeck.findIndex(
    (p) => Math.abs(p - block.baseY) < 0.01,
  );

  return (
    <div className="array-panel" role="region" aria-label={`${block.label} detail`}>
      <div className="array-head">
        <span className="swatch" style={{ background: channel.color }} aria-hidden="true" />
        <div>
          <h2>{channel.label}</h2>
          <p className="array-sub">{block.label}</p>
        </div>
        <button className="close" onClick={onClose} aria-label="Close panel">
          ×
        </button>
      </div>

      <p className="array-blurb">{channel.blurb}</p>

      <dl>
        <dt>Carried</dt>
        <dd>{channel.player ?? 'All vocal microphones'}</dd>
        <dt>Crossover band</dt>
        <dd>{BAND_LABEL[block.band]}</dd>
        <dt>Speakers</dt>
        <dd>
          {bounds.count} × {driver.label}
        </dd>
        <dt>Arrangement</dt>
        <dd>
          {block.cols} wide × {block.rows} high{block.curveRadius > 0 ? ', curved' : ''}
        </dd>
        <dt>Cabinet</dt>
        <dd>
          {long(size.w, units)} × {long(size.h, units)} × {long(size.d, units)}
        </dd>
        <dt>Stands on</dt>
        <dd>{floorIndex <= 0 ? 'The stage deck' : `Scaffold floor ${floorIndex}`}</dd>
        <dt>Block size</dt>
        <dd>
          {long(bounds.size[0], units)} × {long(bounds.size[1], units)}
        </dd>
      </dl>

      <div className={`confidence ${prov.confidence}`}>
        <strong>{CONFIDENCE_LABEL[prov.confidence]}</strong>
        {prov.note && <span> — {prov.note}</span>}
      </div>

      <h3>Sources</h3>
      <ul className="sources">
        {prov.sources.map((id) => (
          <li key={id}>
            {SOURCES[id].url ? (
              <a href={SOURCES[id].url} target="_blank" rel="noreferrer noopener">
                {SOURCES[id].title}
              </a>
            ) : (
              SOURCES[id].title
            )}
          </li>
        ))}
      </ul>

      <button
        className="isolate"
        onClick={() => onIsolate(isolated === block.channel ? null : block.channel)}
        aria-pressed={isolated === block.channel}
      >
        {isolated === block.channel ? 'Show every channel' : `Show only ${channel.label.toLowerCase()}`}
      </button>
    </div>
  );
}

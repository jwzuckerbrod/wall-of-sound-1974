import { useEffect, useMemo, useState } from 'react';
import { assertInventory, FT, wall } from '../data/wall.config';
import { allCells, driverTally, envelope, faceCoverage } from '../geometry/arrays';
import { scaffoldTubes } from '../geometry/scaffold';
import type { SceneOptions } from '../scene/Scene';
import { VIEWS, type ViewId } from '../scene/views';
import { area, long, short, UNIT_LABEL, type UnitSystem } from './units';

export function Hud({
  options,
  setOptions,
  fps,
  viewId,
  setViewId,
}: {
  options: SceneOptions;
  setOptions: (o: SceneOptions) => void;
  fps: number;
  viewId: ViewId;
  setViewId: (id: ViewId) => void;
}) {
  // Feet and inches by default: it is what the Wall was drawn and built in.
  const [units, setUnits] = useState<UnitSystem>('imperial');
  // On a narrow window the panel would cover the thing it describes.
  const [open, setOpen] = useState(() => window.innerWidth >= 900);
  const [inventoryError, setInventoryError] = useState<string | null>(null);

  const stats = useMemo(() => {
    const cells = allCells();
    return {
      tally: driverTally(cells),
      env: envelope(cells),
      cover: faceCoverage(cells, wall.dimensions.arrayHeight),
      tubes: scaffoldTubes().length,
    };
  }, []);

  useEffect(() => {
    try {
      assertInventory();
      setInventoryError(null);
    } catch (e) {
      setInventoryError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  const t = stats.tally;
  const ok = t.total === wall.inventory.total;
  const L = (m: number) => long(m, units);
  const toggle = (k: keyof SceneOptions) => () => setOptions({ ...options, [k]: !options[k] });

  return (
    <div className={open ? 'hud' : 'hud hud--closed'}>
      <header>
        <h1>The Wall of Sound</h1>
        <p>Grateful Dead touring PA, 1974 — stage 2: grey-box at true scale</p>
        <div className="header-actions">
          <button className="collapse" onClick={() => setOpen(!open)} aria-expanded={open}>
            {open ? 'Hide panel' : 'Show panel'}
          </button>
          <button
            className="collapse"
            onClick={() => setUnits(units === 'imperial' ? 'metric' : 'imperial')}
            title="Switch units"
          >
            {UNIT_LABEL[units]}
          </button>
        </div>
      </header>

      {!open && (
        <p className="peek">
          {t.total} drivers · {L(stats.env.width)} wide · {L(wall.dimensions.totalHeight)} tall
        </p>
      )}

      <section>
        <h2>Drivers</h2>
        <dl>
          <dt>15-inch</dt><dd>{t.jbl15}</dd>
          <dt>12-inch</dt><dd>{t.jbl12}</dd>
          <dt>5-inch</dt><dd>{t.jbl5}</dd>
          <dt>EV T350 horns</dt><dd>{t.evHorn}</dd>
        </dl>
        <p className={ok ? 'check pass' : 'check fail'}>
          {ok ? `${t.total} placed — matches the 1974 inventory` : `${t.total} placed — inventory says ${wall.inventory.total}`}
        </p>
        {inventoryError && <p className="check fail">{inventoryError}</p>}
      </section>

      <section>
        <h2>Measured in the model</h2>
        <dl>
          <dt>Array width</dt><dd>{L(stats.env.width)}</dd>
          <dt>Array depth</dt><dd>{L(stats.env.depth)}</dd>
          <dt>Top of speakers</dt><dd>{L(stats.env.maxY + wall.dimensions.stageDeckHeight)}</dd>
          <dt>Speaker face</dt><dd>{area(stats.cover.baffle, units)}</dd>
          <dt>Open structure</dt><dd>{Math.round((1 - stats.cover.fraction) * 100)}%</dd>
          <dt>Scaffold tubes</dt><dd>{stats.tubes}</dd>
        </dl>
      </section>

      <section>
        <h2>Drawn, 10 Apr 1974</h2>
        <dl>
          <dt>Tower footprint</dt>
          <dd>{L(wall.dimensions.scaffoldFootprint.width)} × {L(wall.dimensions.scaffoldFootprint.depth)}</dd>
          <dt>Overall height</dt><dd>{L(wall.dimensions.totalHeight)}</dd>
          <dt>Deck</dt><dd>{L(wall.dimensions.stageDeckHeight)} up</dd>
          <dt>Deck overhang</dt><dd>{L(wall.dimensions.deckOverhang.side)} each side</dd>
          <dt>End frames</dt><dd>{L(FT(6.5))} × {L(FT(5))}</dd>
          <dt>Bays</dt><dd>{L(FT(7))}</dd>
          <dt>Cabinet, measured</dt><dd>{short(0.787, units)} × {short(0.61, units)}</dd>
        </dl>
      </section>

      <section>
        <h2>Camera — or press 1–{Object.keys(VIEWS).length}</h2>
        <ul className="views">
          {(Object.keys(VIEWS) as ViewId[]).map((id, i) => (
            <li key={id}>
              <button onClick={() => setViewId(id)} aria-current={id === viewId}>
                <kbd>{i + 1}</kbd> {VIEWS[id].label}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="controls">
        <h2>Show</h2>
        <button onClick={() => setOptions({ ...options, colorMode: options.colorMode === 'grey' ? 'channel' : 'grey' })}>
          {options.colorMode === 'grey' ? 'Colour by channel' : 'Grey-box'}
        </button>
        <button onClick={toggle('showScaffold')} aria-pressed={options.showScaffold}>
          Scaffold {options.showScaffold ? 'on' : 'off'}
        </button>
        <button onClick={toggle('showStage')} aria-pressed={options.showStage}>
          Stage {options.showStage ? 'on' : 'off'}
        </button>
        <button onClick={toggle('showFigures')} aria-pressed={options.showFigures}>
          Figures {options.showFigures ? 'on' : 'off'}
        </button>
      </section>

      <footer>Drag to orbit · scroll to zoom{fps > 0 ? ` · ${fps} fps` : ''}</footer>
    </div>
  );
}

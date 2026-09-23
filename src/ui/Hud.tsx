import { useEffect, useMemo, useState } from 'react';
import { assertInventory, FT, wall } from '../data/wall.config';
import { allCells, driverTally, envelope } from '../geometry/arrays';
import { scaffoldTubes } from '../geometry/scaffold';
import type { SceneOptions } from '../scene/Scene';

const m = (v: number) => `${v.toFixed(2)} m`;
const ft = (v: number) => {
  const total = v / 0.3048;
  const whole = Math.floor(total);
  const inches = Math.round((total - whole) * 12);
  return inches === 12 ? `${whole + 1}'-0"` : `${whole}'-${inches}"`;
};

export function Hud({
  options,
  setOptions,
  fps,
  view,
}: {
  options: SceneOptions;
  setOptions: (o: SceneOptions) => void;
  fps: number;
  view: string;
}) {
  const [inventoryError, setInventoryError] = useState<string | null>(null);
  const stats = useMemo(() => {
    const cells = allCells();
    return { cells, tally: driverTally(cells), env: envelope(cells), tubes: scaffoldTubes().length };
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
  const toggle = (k: keyof SceneOptions) => () => setOptions({ ...options, [k]: !options[k] });

  return (
    <div className="hud">
      <header>
        <h1>The Wall of Sound</h1>
        <p>Grateful Dead touring PA, 1974 — stage 2: grey-box at true scale</p>
      </header>

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
        <h2>Measured</h2>
        <dl>
          <dt>Array width</dt><dd>{m(stats.env.width)} · {ft(stats.env.width)}</dd>
          <dt>Array depth</dt><dd>{m(stats.env.depth)} · {ft(stats.env.depth)}</dd>
          <dt>Top of speakers</dt><dd>{m(stats.env.maxY + wall.dimensions.stageDeckHeight)} above ground</dd>
          <dt>Scaffold tubes</dt><dd>{stats.tubes}</dd>
        </dl>
      </section>

      <section>
        <h2>Drawn, 10 Apr 1974</h2>
        <dl>
          <dt>Tower footprint</dt><dd>{ft(wall.dimensions.scaffoldFootprint.width)} × {ft(wall.dimensions.scaffoldFootprint.depth)}</dd>
          <dt>Overall height</dt><dd>{ft(wall.dimensions.totalHeight)}</dd>
          <dt>Deck</dt><dd>{ft(wall.dimensions.stageDeckHeight)} up, overhangs {ft(wall.dimensions.deckOverhang.side)}</dd>
          <dt>Frames / bays</dt><dd>{ft(FT(6.5))} × {ft(FT(5))} on {ft(FT(7))}</dd>
        </dl>
      </section>

      <section className="controls">
        <h2>View</h2>
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

      <footer>{view} · {fps} fps · drag to orbit, scroll to zoom</footer>
    </div>
  );
}

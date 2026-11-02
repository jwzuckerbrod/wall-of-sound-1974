import { useEffect, useMemo, useState } from 'react';
import { ARRAYS, assertInventory, CHANNELS, FT, wall, type ChannelId } from '../data/wall.config';
import { allCells, driverTally, envelope, faceCoverage } from '../geometry/arrays';
import { scaffoldTubes } from '../geometry/scaffold';
import { TIER_LABEL, TIERS, type Tier } from '../quality';
import type { NavMode, SceneOptions } from '../scene/Scene';
import { VIEWS, type ViewId } from '../scene/views';
import { NavPanel, TOUCH } from './NavPanel';
import { area, long, short, UNIT_LABEL, type UnitSystem } from './units';

export function Hud({
  options,
  setOptions,
  fps,
  viewId,
  setViewId,
  tier,
  setTier,
  navMode,
  setNavMode,
  stopIndex,
  goToStop,
  units,
  setUnits,
  selected,
  setSelected,
  isolated,
  setIsolated,
  explode,
  setExplode,
  openAbout,
}: {
  options: SceneOptions;
  setOptions: (o: SceneOptions) => void;
  fps: number;
  viewId: ViewId;
  setViewId: (id: ViewId) => void;
  tier: Tier;
  setTier: (t: Tier) => void;
  navMode: NavMode;
  setNavMode: (m: NavMode) => void;
  stopIndex: number;
  goToStop: (i: number) => void;
  units: UnitSystem;
  setUnits: (u: UnitSystem) => void;
  selected: string | null;
  setSelected: (id: string | null) => void;
  isolated: ChannelId | null;
  setIsolated: (c: ChannelId | null) => void;
  explode: number;
  setExplode: (v: number) => void;
  openAbout: () => void;
}) {
  // On a narrow window the panel would cover the thing it describes.
  // Closed on arrival, so the first thing anyone sees is the Wall, not a panel over it.
  const [open, setOpen] = useState(false);
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

  /** Arrays grouped by subsystem, so the list reads the way the PA was built. */
  const bySystem = useMemo(() => {
    const groups = new Map<string, typeof ARRAYS>();
    for (const b of ARRAYS) {
      const sys = CHANNELS[b.channel].system;
      groups.set(sys, [...(groups.get(sys) ?? []), b]);
    }
    return [...groups.entries()];
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
        <p>Grateful Dead touring PA, 1974</p>
        <div className="header-actions">
          <button className="collapse" onClick={() => setOpen(!open)} aria-expanded={open}>
            {open ? 'Hide panel' : 'Show panel'}
          </button>
          <button
            className="collapse"
            onClick={() => setUnits(units === 'imperial' ? 'metric' : 'imperial')}
            aria-label={`Units: ${UNIT_LABEL[units]}. Switch to ${UNIT_LABEL[units === 'imperial' ? 'metric' : 'imperial']}`}
          >
            Units: {UNIT_LABEL[units]}
          </button>
          <button className="collapse" onClick={openAbout}>
            About <kbd>I</kbd>
          </button>
        </div>
      </header>

      {!open && (
        <p className="peek">
          {t.total} drivers · {L(stats.env.width)} wide · {L(wall.dimensions.totalHeight)} tall
        </p>
      )}

      <NavPanel navMode={navMode} setNavMode={setNavMode} stopIndex={stopIndex} goToStop={goToStop} />

      <section>
        <h2>Subsystems</h2>
        <p className="hint">
          Point at any array to highlight it, or pick one here. Six independent systems on eleven channels.
        </p>
        {bySystem.map(([system, blocks]) => (
          <div key={system} className="system">
            <h3>{system === 'drums' ? 'drums & kick' : system.replace(/([A-Z])/g, ' $1').toLowerCase()}</h3>
            <ul className="array-list">
              {blocks.map((b) => (
                <li key={b.id}>
                  <button
                    onClick={() => setSelected(selected === b.id ? null : b.id)}
                    aria-current={selected === b.id}
                  >
                    <span className="swatch" style={{ background: CHANNELS[b.channel].color }} aria-hidden="true" />
                    {b.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {isolated && (
          <button className="isolate" onClick={() => setIsolated(null)}>
            Showing only {CHANNELS[isolated].label.toLowerCase()} — show everything
          </button>
        )}
      </section>

      <section>
        <h2>Take it apart</h2>
        <label className="slider">
          <span>Exploded view</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={explode}
            onChange={(e) => setExplode(Number(e.target.value))}
            aria-valuetext={`${Math.round(explode * 100)} per cent apart`}
          />
        </label>
        <p className="hint">
          Pulls each subsystem away from the centreline along its own axis. Press <kbd>X</kbd> to snap between
          assembled and apart.
        </p>
      </section>

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
              <button onClick={() => setViewId(id)} aria-current={id === viewId && navMode === 'orbit'}>
                <kbd>{i + 1}</kbd> {VIEWS[id].label}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Where</h2>
        <ul className="views">
          {(Object.keys(wall.venues) as (keyof typeof wall.venues)[]).map((v) => (
            <li key={v}>
              <button onClick={() => setOptions({ ...options, venue: v })} aria-current={options.venue === v}>
                {wall.venues[v].label}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="controls">
        <h2>Show</h2>
        <button
          onClick={() =>
            setOptions({ ...options, colorMode: options.colorMode === 'material' ? 'channel' : 'material' })
          }
        >
          {options.colorMode === 'material' ? 'Colour by channel' : 'Materials'} <kbd>C</kbd>
        </button>
        <button onClick={toggle('showScaffold')} aria-pressed={options.showScaffold}>
          Scaffold {options.showScaffold ? 'on' : 'off'}
        </button>
        <button onClick={toggle('showAmps')} aria-pressed={options.showAmps}>
          Amps &amp; cases {options.showAmps ? 'on' : 'off'}
        </button>
        <button onClick={toggle('showBand')} aria-pressed={options.showBand}>
          Instruments {options.showBand ? 'on' : 'off'}
        </button>
        <button onClick={toggle('showStage')} aria-pressed={options.showStage}>
          Stage {options.showStage ? 'on' : 'off'}
        </button>
        <button onClick={toggle('showFigures')} aria-pressed={options.showFigures}>
          Figures {options.showFigures ? 'on' : 'off'}
        </button>
      </section>

      <section>
        <h2>Quality</h2>
        <ul className="views">
          {TIERS.map((tv) => (
            <li key={tv}>
              <button onClick={() => setTier(tv)} aria-current={tv === tier}>
                {TIER_LABEL[tv]}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <footer>{TOUCH ? 'Drag to turn · pinch to zoom' : 'Drag to turn · scroll to zoom'}{fps > 0 ? ` · ${fps} fps` : ''}</footer>
    </div>
  );
}

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { CHANNELS, wall, type ChannelId } from '../data/wall.config';
import { TIER_LABEL, TIERS, type Tier } from '../quality';
import type { SceneOptions } from '../scene/Scene';
import { VIEWPOINTS, type ViewpointId } from '../scene/views';
import { UNIT_LABEL, type UnitSystem } from './units';

/** A touch screen with no mouse: hints talk about pinching, not scrolling or keys. */
export const TOUCH = typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches;

/** A button that opens a small menu above or below it, closed by Escape or a click elsewhere. */
function Menu({ label, icon, up, children }: { label: string; icon?: ReactNode; up?: boolean; children: (close: () => void) => ReactNode }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: Event) => box.current && !box.current.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('pointerdown', away);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);
  return (
    <div className={`menu${up ? ' up' : ''}`} ref={box}>
      <button className="pill" aria-expanded={open} aria-haspopup="true" onClick={() => setOpen(!open)}>
        {icon}
        {label}
      </button>
      {open && <div className="menu-pop">{children(() => setOpen(false))}</div>}
    </div>
  );
}

/** The six systems, grouped as the colour view groups them. */
const SYSTEMS: { label: string; channel: ChannelId }[] = [
  { label: 'Vocals', channel: 'vocals' },
  { label: 'Lead guitar', channel: 'leadGuitar' },
  { label: 'Rhythm guitar', channel: 'rhythmGuitar' },
  { label: 'Piano', channel: 'piano' },
  { label: 'Drums', channel: 'drumsL' },
  { label: 'Bass', channel: 'bass2' },
];

/**
 * Along the bottom: take it apart, colour it by system, and where to stand.
 * The three things worth doing to the Wall, always within reach.
 */
export function BottomBar({
  explode,
  setExplode,
  options,
  setOptions,
  isolated,
  setIsolated,
  onViewpoint,
}: {
  explode: number;
  setExplode: (v: number) => void;
  options: SceneOptions;
  setOptions: (o: SceneOptions) => void;
  isolated: ChannelId | null;
  setIsolated: (c: ChannelId | null) => void;
  onViewpoint: (id: ViewpointId) => void;
}) {
  const colour = options.colorMode === 'channel';
  return (
    <div className="bottom">
      {colour && (
        <ul className="legend" aria-label="The six sound systems">
          {SYSTEMS.map((s) => {
            const on = !!isolated && CHANNELS[isolated].system === CHANNELS[s.channel].system;
            return (
              <li key={s.label}>
                <button aria-pressed={on} onClick={() => setIsolated(on ? null : s.channel)}>
                  <span className="swatch" style={{ background: CHANNELS[s.channel].color }} aria-hidden="true" />
                  {s.label}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <div className="bar" role="toolbar" aria-label="The Wall">
        <label className="explode">
          <span>Take it apart</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={explode}
            onChange={(e) => setExplode(Number(e.target.value))}
            aria-valuetext={explode < 0.02 ? 'assembled' : explode > 0.98 ? 'fully apart' : `${Math.round(explode * 100)}% apart`}
          />
        </label>
        <button
          className="pill"
          aria-pressed={colour}
          onClick={() => {
            setOptions({ ...options, colorMode: colour ? 'material' : 'channel' });
            if (colour) setIsolated(null);
          }}
        >
          <span className="swatches" aria-hidden="true">
            {SYSTEMS.slice(0, 4).map((s) => (
              <i key={s.label} style={{ background: CHANNELS[s.channel].color }} />
            ))}
          </span>
          Colour by system
        </button>
        <Menu label="View" up>
          {(close) => (
            <ul className="menu-list" aria-label="Where to stand">
              {(Object.keys(VIEWPOINTS) as ViewpointId[]).map((id, i) => (
                <li key={id}>
                  <button
                    onClick={() => {
                      onViewpoint(id);
                      close();
                    }}
                  >
                    {VIEWPOINTS[id].label}
                    {!TOUCH && <kbd>{i + 1}</kbd>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Menu>
      </div>
    </div>
  );
}

/** Top left: the name, About, and everything else tucked into Settings. */
export function TopBar({
  options,
  setOptions,
  units,
  setUnits,
  tier,
  setTier,
  openAbout,
  openListen,
  onHome,
}: {
  options: SceneOptions;
  setOptions: (o: SceneOptions) => void;
  units: UnitSystem;
  setUnits: (u: UnitSystem) => void;
  tier: Tier;
  setTier: (t: Tier) => void;
  openAbout: () => void;
  openListen: () => void;
  onHome: () => void;
}) {
  const toggle = (k: 'showScaffold' | 'showAmps' | 'showBand' | 'showStage' | 'showFigures', label: string) => (
    <label className="check-row">
      <input type="checkbox" checked={options[k]} onChange={() => setOptions({ ...options, [k]: !options[k] })} />
      {label}
    </label>
  );
  return (
    <header className="top">
      <div className="top-left">
        <button className="brand" onClick={onHome} aria-label="The Wall of Sound: back to the overview">
          <span className="brand-name">The Wall of Sound</span>
          <span className="brand-year">1974</span>
        </button>
        {/* Where: always on screen, so indoors and outdoors are one tap apart. */}
        <div className="venue-switch glass" role="radiogroup" aria-label="Where">
          {(Object.keys(wall.venues) as (keyof typeof wall.venues)[]).map((v) => (
            <button
              key={v}
              role="radio"
              aria-checked={options.venue === v}
              title={wall.venues[v].label}
              onClick={() => setOptions({ ...options, venue: v })}
            >
              {wall.venues[v].short}
            </button>
          ))}
        </div>
      </div>
      <div className="top-actions">
        <a className="pill pill-story" href="./story.html">
          The story
        </a>
        <button className="pill pill-listen" onClick={openListen}>
          Listen
        </button>
        <button className="pill pill-about" onClick={openAbout}>
          About
        </button>
        <Menu label="Settings">
          {(close) => (
            <div className="settings">
              {/* Phones: About lives here, to leave room for The story. */}
              <button
                className="check-row settings-about"
                onClick={() => {
                  close();
                  openAbout();
                }}
              >
                About this reconstruction
              </button>
              <h3>Show</h3>
              {toggle('showScaffold', 'Scaffold and lights')}
              {toggle('showAmps', 'Amplifiers and cases')}
              {toggle('showBand', 'Instruments and microphones')}
              {toggle('showStage', 'Stage deck')}
              {toggle('showFigures', 'Figures for scale')}
              <h3>Units</h3>
              {(['imperial', 'metric'] as UnitSystem[]).map((u) => (
                <label className="check-row" key={u}>
                  <input type="radio" name="units" checked={units === u} onChange={() => setUnits(u)} />
                  {UNIT_LABEL[u]}
                </label>
              ))}
              <h3>Quality</h3>
              {TIERS.map((t) => (
                <label className="check-row" key={t}>
                  <input type="radio" name="tier" checked={tier === t} onChange={() => setTier(t)} />
                  {TIER_LABEL[t]}
                </label>
              ))}
            </div>
          )}
        </Menu>
      </div>
    </header>
  );
}

/** One quiet line on first arrival: how to move. Gone at the first touch of the scene. */
export function Hint() {
  const [show, setShow] = useState(true);
  useEffect(() => {
    const off = () => setShow(false);
    const t = setTimeout(off, 9000);
    window.addEventListener('pointerdown', off, { once: true });
    window.addEventListener('wheel', off, { once: true });
    return () => {
      clearTimeout(t);
      window.removeEventListener('pointerdown', off);
      window.removeEventListener('wheel', off);
    };
  }, []);
  if (!show) return null;
  return <p className="hint-float">{TOUCH ? 'Drag to turn · pinch to zoom · tap a dot' : 'Drag to turn · scroll to zoom · click a dot or any speaker'}</p>;
}

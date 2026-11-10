import { useEffect, useRef, useState, type ReactNode } from 'react';
import { CHANNELS, wall, type ChannelId } from '../data/wall.config';
import { TIER_LABEL, TIERS, type Tier } from '../quality';
import type { SceneOptions } from '../scene/Scene';
import type { CompareId } from '../scene/ScaleObjects';
import { PLANE_POSITIONS, type PlaneAt } from '../geometry/scale';
import { PLANE_VIEWS, VIEWPOINTS, type ViewpointId } from '../scene/views';
import { UNIT_LABEL, type UnitSystem } from './units';
import './range.css';

/** A touch screen with no mouse: hints talk about pinching, not scrolling or keys. */
export const TOUCH = typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches;

/** A button that opens a small menu above or below it, closed by Escape or a click elsewhere. */
function Menu({ label, icon, up, active, children }: { label: ReactNode; icon?: ReactNode; up?: boolean; active?: boolean; children: (close: () => void) => ReactNode }) {
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
      <button className="pill" aria-expanded={open} aria-haspopup="true" aria-pressed={active} onClick={() => setOpen(!open)}>
        {icon}
        {label}
      </button>
      {open && <div className="menu-pop">{children(() => setOpen(false))}</div>}
    </div>
  );
}

const FOOT = 0.3048;

/** What to set beside the Wall: one at a time. */
const COMPARE_ITEMS: { id: CompareId; label: string }[] = [
  { id: 'bus', label: 'Four VW buses' },
  { id: 'b737', label: 'A Boeing 737-200' },
  { id: null, label: 'Nothing' },
];

/** The six systems, grouped as the color view groups them. */
export const SYSTEMS: { label: string; channel: ChannelId }[] = [
  { label: 'Vocals', channel: 'vocals' },
  { label: 'Lead guitar', channel: 'leadGuitar' },
  { label: 'Rhythm guitar', channel: 'rhythmGuitar' },
  { label: 'Piano', channel: 'piano' },
  { label: 'Drums', channel: 'drumsL' },
  { label: 'Bass', channel: 'bass2' },
];

/**
 * Along the bottom: take it apart, color it by system, and where to stand.
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
  onCompare,
}: {
  explode: number;
  setExplode: (v: number) => void;
  options: SceneOptions;
  setOptions: (o: SceneOptions) => void;
  isolated: ChannelId | null;
  setIsolated: (c: ChannelId | null) => void;
  onViewpoint: (id: ViewpointId) => void;
  /** Stand where the comparison shows. */
  onCompare: (id: CompareId, at?: PlaneAt) => void;
}) {
  const colour = options.colorMode === 'channel';
  // The 737 doesn't stand at the Bowl.
  const shown = options.compare === 'b737' && wall.venues[options.venue].outdoor ? null : options.compare;
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
      {shown === 'bus' && (
        <p className="compare-note">
          <strong>Four 1974 VW buses, end to end: {(4 * wall.scale.vwBus.length / FOOT).toFixed(0)} ft.</strong> The speakers
          above them run 60 ft. For scale; they weren&rsquo;t there.
        </p>
      )}
      {shown === 'b737' && (
        <div className="compare-note">
          <p>
            <strong>The Wall stands 12 ft taller than a 737&rsquo;s tail:</strong> 48 ft 10 in to its top, 36 ft 10 in to the
            tail of the airliner of 1974. For scale; it wasn&rsquo;t there.
            {options.planeAt !== 'beside' && ' Perspective distorts this view; the real heights don\u2019t change.'}
          </p>
          <div className="compare-at" role="group" aria-label="Where the 737 stands">
            {PLANE_POSITIONS.map((at) => (
              <button
                key={at}
                aria-pressed={options.planeAt === at}
                onClick={() => {
                  setOptions({ ...options, planeAt: at });
                  onCompare('b737', at);
                }}
              >
                {PLANE_VIEWS[at].wide.label}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="bar" role="toolbar" aria-label="The Wall">
        <label className="explode">
          <span>Take it apart</span>
          <input
            className="range"
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={explode}
            style={{ ['--f' as string]: explode }}
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
          <span>Color<span className="wide-only"> by system</span></span>
        </button>
        <Menu
          label={<span>Compare<span className="wide-only"> size</span></span>}
          up
          active={!!shown}
        >
          {(close) => (
            <ul className="menu-list" aria-label="Compare the Wall's size">
              {COMPARE_ITEMS.map((c) => {
                const off = c.id === 'b737' && wall.venues[options.venue].outdoor;
                return (
                  <li key={c.label}>
                    <button
                      disabled={off}
                      aria-pressed={shown === c.id}
                      onClick={() => {
                        setOptions({ ...options, compare: c.id });
                        if (c.id) onCompare(c.id, options.planeAt);
                        close();
                      }}
                    >
                      {c.label}
                      {off && <kbd>indoors only</kbd>}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Menu>
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
  onStory,
  storyUnfinished,
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
  /** Back to the story, on this same page. */
  onStory: () => void;
  /** The reader put the story away part-way through. */
  storyUnfinished: boolean;
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
        <button className={`pill pill-story${storyUnfinished ? ' pill-resume' : ''}`} onClick={onStory}>
          {storyUnfinished ? 'Back to the story' : 'The story'}
        </button>
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

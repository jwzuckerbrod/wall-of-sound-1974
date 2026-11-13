import { useEffect, useRef, useState, type ReactNode } from 'react';
import { track } from '../analytics';
import { CHANNELS } from '../data/wall.config';
import { TAPES, WALL_TRACKS, trackUrl } from '../data/recordings';
import { player, usePlayer, type PlayerItem } from '../ui/player';
import { SYSTEMS } from '../ui/Controls';
import { BASE, IMAGES, smallSrcOf, srcOf, useModelReady, type StoryImage } from './images';
import { LANDINGS, pickLanding } from './landingTest';
import './landing.css';

/**
 * The story's first screen, in the design this visitor drew (landingTest.ts): it stands in for the
 * loading screen, so it's the first thing anyone sees, while the model loads behind it.
 *   lights  (A): the 641 speakers light up in their systems' colors, then the colored Wall; tap a system.
 *   photo   (1): the July 21, 1974, photograph dissolving into the reconstruction from the same seat.
 *   systems (5): the Wall as it looked, then lit in its six systems, their names in turn.
 * Upright on a phone the words sit under the picture; on its side, and on a wide screen, down the left.
 */

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const COLORS = SYSTEMS.map((s) => CHANNELS[s.channel].color);

/** Where the Bowl renders (960 × 540) lie on this screen: the Wall, x 182 to 740, fitted to the room left by the words. */
type Frame = { s: number; ox: number; oy: number };
function frameOn(W: number, H: number): Frame {
  if (W > H) {
    // The words take the left; the Wall stands in the rest, a little right of its middle.
    const s = Math.min((0.6 * W) / 600, (0.86 * H) / 330);
    return { s, ox: 0.69 * W - s * 461, oy: 0.5 * H - s * 272 };
  }
  const s = W / (558 * 1.08);
  return { s, ox: W / 2 - s * 461, oy: Math.max(0, H * 0.34 - s * 300) };
}
function useFrame(): Frame & { W: number; H: number } {
  const get = () => ({ W: window.innerWidth, H: window.innerHeight });
  const [size, setSize] = useState(get);
  useEffect(() => {
    const on = () => setSize(get());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return { ...frameOn(size.W, size.H), ...size };
}
const placed = (f: Frame) => ({ left: f.ox, top: f.oy, width: 960 * f.s, height: 540 * f.s });

// ── reading the six systems off the renders (lights) ─────────────────────────────────────

interface Systems {
  cls: Int8Array;
  col: HTMLImageElement;
  plain: HTMLImageElement;
  pts: [number, number, number][];
}
let systemsRead: Promise<Systems> | null = null;
/**
 * The colored and plain Bowl renders differ only where speakers are tinted, and the tint's hue says
 * which system (the renders are graded warm, so the colors' own hues all read as yellow). Gives a
 * class (0 to 5, SYSTEMS' order) per pixel, and 641 points spread evenly over the speakers.
 */
function readSystems(): Promise<Systems> {
  if (systemsRead) return systemsRead;
  const load = (src: string) =>
    new Promise<HTMLImageElement>((ok, no) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = no;
      i.src = src;
    });
  systemsRead = Promise.all([load(`${BASE}bowl-systems-960.jpg`), load(`${BASE}bowl-960.jpg`)]).then(([col, plain]) => {
    const read = (im: HTMLImageElement) => {
      const c = document.createElement('canvas');
      c.width = 960;
      c.height = 540;
      const x = c.getContext('2d', { willReadFrequently: true })!;
      x.drawImage(im, 0, 0);
      return x.getImageData(0, 0, 960, 540).data;
    };
    const A = read(col), B = read(plain);
    const CENTERS = [38, 5, 262, 168, 210, 120];
    const cls = new Int8Array(960 * 540).fill(-1);
    for (let y = 100; y < 430; y++)
      for (let X = 160; X < 760; X++) {
        const k = (y * 960 + X) * 4, dr = A[k] - B[k], dg = A[k + 1] - B[k + 1], db = A[k + 2] - B[k + 2];
        if (Math.hypot(dr, dg, db) < 40) continue;
        const h = ((Math.atan2(Math.sqrt(3) * (dg - db), 2 * dr - dg - db) * 180) / Math.PI + 360) % 360;
        let best = 0, bd = 999;
        CENTERS.forEach((c, n) => {
          const d = Math.min(Math.abs(h - c), 360 - Math.abs(h - c));
          if (d < bd) [bd, best] = [d, n];
        });
        cls[y * 960 + X] = best;
      }
    let pts: [number, number, number][] = [];
    for (let g = 14; g >= 2; g--) {
      pts = [];
      for (let y = 100; y < 430; y += g) for (let X = 160; X < 760; X += g) if (cls[y * 960 + X] >= 0) pts.push([X, y, cls[y * 960 + X]]);
      if (pts.length >= 641) break;
    }
    const step = pts.length / 641;
    pts = Array.from({ length: 641 }, (_, i) => pts[Math.floor(i * step)]);
    return { cls, col, plain, pts };
  });
  return systemsRead;
}

/** A: the lights, counted to 641, then the colored Wall; a system's name shows it alone. */
function LightsArt({ done, onDone, only }: { done: boolean; onDone: () => void; only: number | null }) {
  const f = useFrame();
  const dots = useRef<HTMLCanvasElement>(null);
  const wall = useRef<HTMLCanvasElement>(null);
  const num = useRef<HTMLElement>(null);
  const [sys, setSys] = useState<Systems | null>(null);
  useEffect(() => {
    readSystems().then(setSys, onDone);
  }, [onDone]);

  // The count: 641 lights over about four seconds, slow, fast, slow; at once with reduced motion.
  useEffect(() => {
    if (!sys || !dots.current) return;
    const cv = dots.current, d = devicePixelRatio, ctx = cv.getContext('2d')!;
    cv.width = f.W * d;
    cv.height = f.H * d;
    const s = f.s * d, ox = f.ox * d, oy = f.oy * d, r = Math.max(1.3 * d, s * 2);
    const order = sys.pts.map((_, i) => i).sort(() => Math.random() - 0.5);
    const start = performance.now(), span = reduced() ? 0 : 4200;
    let raf = 0;
    const frame = () => {
      const p = span ? Math.min(1, (performance.now() - start) / span) : 1;
      const lit = Math.floor(641 * (p * p * (3 - 2 * p)));
      ctx.clearRect(0, 0, cv.width, cv.height);
      for (let k = 0; k < lit; k++) {
        const [x, y, c] = sys.pts[order[k]], young = lit - k < 10;
        ctx.beginPath();
        ctx.arc(ox + s * x, oy + s * y, r, 0, Math.PI * 2);
        ctx.fillStyle = young ? '#fff6e0' : COLORS[c];
        ctx.shadowColor = COLORS[c];
        ctx.shadowBlur = (young ? 16 : 5) * d;
        ctx.fill();
      }
      if (num.current) num.current.textContent = String(lit);
      if (p < 1) raf = requestAnimationFrame(frame);
      else setTimeout(onDone, span ? 600 : 0);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
    // Once: a resize mid-count shouldn't restart it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sys]);

  // The Wall: all six colors, or one system bright over the plain Wall, dimmed.
  useEffect(() => {
    if (!sys || !wall.current) return;
    const cv = wall.current, d = devicePixelRatio, ctx = cv.getContext('2d')!;
    cv.width = f.W * d;
    cv.height = f.H * d;
    const pic = document.createElement('canvas');
    pic.width = 960;
    pic.height = 540;
    const p = pic.getContext('2d')!;
    if (only === null) p.drawImage(sys.col, 0, 0);
    else {
      p.filter = 'brightness(0.35) saturate(0.3)';
      p.drawImage(sys.plain, 0, 0);
      p.filter = 'none';
      const lit = document.createElement('canvas');
      lit.width = 960;
      lit.height = 540;
      const l = lit.getContext('2d')!;
      l.drawImage(sys.col, 0, 0);
      const im = l.getImageData(0, 0, 960, 540);
      for (let i = 0; i < sys.cls.length; i++) if (sys.cls[i] !== only) im.data[i * 4 + 3] = 0;
      l.putImageData(im, 0, 0);
      p.shadowColor = COLORS[only];
      p.shadowBlur = 10;
      p.drawImage(lit, 0, 0);
    }
    ctx.clearRect(0, 0, cv.width, cv.height);
    const [x, y, w, h] = [f.ox * d, f.oy * d, 960 * f.s * d, 540 * f.s * d];
    ctx.drawImage(pic, x, y, w, h);
    // Fade it into the dark where the words are: under it upright, at its left on a wide screen.
    const g = f.W > f.H ? ctx.createLinearGradient(x, 0, x + w * 0.3, 0) : ctx.createLinearGradient(0, y + h * 0.62, 0, y + h * 0.92);
    g.addColorStop(0, f.W > f.H ? 'rgba(0,0,0,0)' : '#000');
    g.addColorStop(1, f.W > f.H ? '#000' : 'rgba(0,0,0,0)');
    ctx.globalCompositeOperation = 'destination-in';
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.globalCompositeOperation = 'source-over';
  }, [sys, only, f.W, f.H, f.s, f.ox, f.oy]);

  return (
    <>
      <div className="ld-glow" />
      <canvas ref={wall} className="ld-wall" style={{ opacity: done ? 1 : 0 }} />
      <canvas ref={dots} className="ld-dots" style={{ opacity: done ? 0 : 1 }} />
      <p className="ld-count" aria-hidden="true" data-gone={done || undefined}>
        <b ref={num}>0</b>
        <span>speakers, six systems</span>
      </p>
    </>
  );
}

/** A picture's files: the smaller one while the model downloads, both (the browser picks) once it's drawn. */
function usePicture() {
  const ready = useModelReady();
  return (img: StoryImage) => (ready ? srcOf(img) : smallSrcOf(img));
}

/** 1: the photograph, drifting; every twelve seconds the reconstruction from the same seat dissolves in and out. */
function PhotoArt() {
  const pic = usePicture();
  const [recon, setRecon] = useState(false);
  useEffect(() => {
    if (reduced()) return;
    const t0 = performance.now();
    const id = setInterval(() => {
      const p = ((performance.now() - t0) / 12000) % 1;
      setRecon(p > 0.38 && p < 0.76);
    }, 200);
    return () => clearInterval(id);
  }, []);
  return (
    <>
      <div className="ld-pic ld-drift">
        <img {...srcOf(IMAGES.photoBowl)} alt={IMAGES.photoBowl.alt} />
      </div>
      <div className="ld-pic ld-drift ld-recon">
        <img {...pic(IMAGES.bowlPhotoMatch)} sizes="100vw" alt="" />
      </div>
      <p className="ld-chip" aria-live="off">
        <i />
        {recon ? 'Reconstruction · 641 speakers' : 'Photograph · July 21, 1974'}
      </p>
    </>
  );
}

/** 5: the Wall as it looked, and lit in its six systems, back and forth. */
function SystemsArt() {
  const f = useFrame();
  const pic = usePicture();
  return (
    <>
      <div className="ld-glow" />
      <img className="ld-fit" {...pic(IMAGES.bowl)} sizes="100vw" alt={IMAGES.bowl.alt} style={placed(f)} />
      <img className="ld-fit ld-tint" {...pic(IMAGES.bowlSystems)} sizes="100vw" alt="" style={placed(f)} />
    </>
  );
}

// ── the words and buttons, shared ───────────────────────────────────────────────────────

const TUNE = WALL_TRACKS[0];
const TUNE_ITEM: PlayerItem = { id: TUNE.file, src: trackUrl(TUNE), title: TUNE.title, detail: `${TAPES[TUNE.tape].venue}, 1974` };

export function Landing({ onBegin, onSkip }: { onBegin: () => void; onSkip: () => void }) {
  const [{ id, forced }] = useState(pickLanding);
  const info = LANDINGS[id];
  const base = { label: `${info.tag} · ${info.label}`, forced };
  const [done, setDone] = useState(id !== 'lights');
  const [only, setOnly] = useState<number | null>(null);
  const { item, playing } = usePlayer();
  const sounding = item?.src === TUNE_ITEM.src && playing;

  // Shown: once a page load. And it is the first screen, so the loading screen goes.
  useEffect(() => {
    track('landing', id, base);
    const boot = document.getElementById('boot');
    if (boot) {
      boot.classList.add('done');
      setTimeout(() => boot.remove(), 700);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const finish = useRef(() => setDone(true)).current;

  const sound = () => {
    if (!sounding) track('landing-sound', id, base);
    player.toggle(TUNE_ITEM);
  };
  const begin = () => {
    track('landing-begin', id, { ...base, sound: sounding });
    onBegin();
  };
  const skip = (e: React.MouseEvent) => {
    e.preventDefault();
    track('landing-skip', id, base);
    onSkip();
  };

  const kicker = { lights: 'Six systems · nothing mixed', photo: 'Hollywood Bowl · July 21, 1974', systems: 'Six systems · nothing mixed' }[id];
  let middle: ReactNode = null;
  if (id === 'lights')
    middle = (
      <>
        <ul className="ld-pick" aria-label="Show one system">
          {SYSTEMS.map((s, i) => (
            <li key={s.label}>
              <button
                style={{ ['--c' as string]: COLORS[i] }}
                aria-pressed={only === i}
                onClick={() => {
                  if (only !== i) track('landing-tap', id, { ...base, system: s.label });
                  setOnly(only === i ? null : i);
                }}
              >
                <i aria-hidden="true" />
                {s.label}
              </button>
            </li>
          ))}
        </ul>
        <p className="ld-hint">Tap one to see it alone.</p>
      </>
    );
  if (id === 'systems')
    middle = (
      <ul className="ld-names" aria-label="The six systems">
        {SYSTEMS.map((s, i) => (
          <li key={s.label} style={{ ['--c' as string]: COLORS[i], ['--i' as string]: i }}>
            <i aria-hidden="true" />
            {s.label}
          </li>
        ))}
      </ul>
    );

  return (
    <div className={`ld ld-${id}${done ? ' done' : ''}`} role="region" aria-label="The Wall of Sound">
      {id === 'lights' && <LightsArt done={done} onDone={finish} only={only} />}
      {id === 'photo' && <PhotoArt />}
      {id === 'systems' && <SystemsArt />}
      <div className="ld-shade" />
      <div className="ld-copy">
        <p className="ld-kicker">{kicker}</p>
        <h1>
          The Wall <br />
          of Sound
        </h1>
        <p className="ld-dek">The Grateful Dead’s sound system, summer 1974.</p>
        {middle}
        <div className="ld-ctas">
          <button className="ld-begin" onClick={begin}>
            Begin
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M5 3l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button className="ld-sound" aria-pressed={sounding} onClick={sound}>
            <span aria-hidden="true" />
            With sound
          </button>
        </div>
        <a className="ld-skip" href="#explore" onClick={skip}>
          Skip to the 3D explorer
        </a>
        {id === 'photo' && <p className="ld-credit">Photograph: photographer unknown. Reconstruction: rendered in Blender.</p>}
      </div>
    </div>
  );
}

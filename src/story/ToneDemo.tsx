import { useEffect, useRef, useState } from 'react';

/**
 * A demonstration of intermodulation, the reason the Wall gave every
 * instrument its own amplifiers and speakers (src/scene/tour.ts, the bass-drum
 * stop). A prototype: it is not a recording or a simulation of either system.
 *
 * Two pure notes are made in the browser. "One shared channel" adds them and
 * sends the sum through one overdriven amplifier; "A channel each" sends each
 * through its own copy of the same amplifier, driven the same, and adds them
 * afterwards. Only the sharing differs. The two are matched in loudness.
 *
 * What is ours, not the record's: the notes, the amplifier's curve (a tanh soft
 * clip, a textbook stand-in for any overdriven stage) and how hard it is
 * pushed. No measurement of a 1970s PA's distortion is known to us.
 *
 * The bars are measured from the sound as it plays, not drawn from a formula.
 */

/** A and C sharp: a major third, 5 to 4, so every product lands on a multiple of 110 Hz. */
const NOTES = [440, 550] as const;
const STEP = 110;
const BARS = 15; // 110 Hz to 1650 Hz
/** How hard the amplifier is pushed (tanh of DRIVE times the signal). Our choice. */
const DRIVE = 3;
/** Each note's level into the amplifier. */
const LEVEL = 0.5;
const VOLUME = 0.22;
const PLAYS_FOR = 30; // seconds, then it stops itself

const shape = (x: number) => Math.tanh(DRIVE * x);

/** The two routes' loudness (RMS) over one whole cycle of the pair, so they can be matched. */
function loudness(): { shared: number; each: number } {
  const N = 4400; // one cycle of 110 Hz at 484 kHz: whole cycles of both notes
  let shared = 0;
  let each = 0;
  for (let i = 0; i < N; i++) {
    const t = i / (N * STEP);
    const a = LEVEL * Math.sin(2 * Math.PI * NOTES[0] * t);
    const b = LEVEL * Math.sin(2 * Math.PI * NOTES[1] * t);
    shared += shape(a + b) ** 2;
    each += (shape(a) + shape(b)) ** 2;
  }
  return { shared: Math.sqrt(shared / N), each: Math.sqrt(each / N) };
}

type Route = 'shared' | 'each';

interface Rig {
  ctx: AudioContext;
  master: GainNode;
  gains: Record<Route, GainNode>;
  analyser: AnalyserNode;
  oscs: OscillatorNode[];
}

function build(route: Route): Rig {
  const ctx = new AudioContext();
  const curve = new Float32Array(2049);
  // The shaper's input runs -1 to 1; the shared sum reaches 2 x LEVEL = 1.
  for (let i = 0; i < curve.length; i++) curve[i] = shape((i / (curve.length - 1)) * 2 - 1);
  const amp = () => {
    const w = ctx.createWaveShaper();
    w.curve = curve;
    w.oversample = '4x';
    return w;
  };
  const { shared, each } = loudness();
  const gains = { shared: ctx.createGain(), each: ctx.createGain() };
  // Matched to the quieter of the two.
  const match = { shared: Math.min(1, each / shared), each: Math.min(1, shared / each) };
  const master = ctx.createGain();
  master.gain.value = 0;
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 16384;
  analyser.smoothingTimeConstant = 0.6;

  const sharedAmp = amp();
  const sharedLevel = ctx.createGain();
  sharedLevel.gain.value = match.shared;
  sharedAmp.connect(sharedLevel).connect(gains.shared);
  const eachLevel = ctx.createGain();
  eachLevel.gain.value = match.each;
  eachLevel.connect(gains.each);

  const oscs = NOTES.map((f) => {
    const o = ctx.createOscillator();
    o.frequency.value = f;
    const level = ctx.createGain();
    level.gain.value = LEVEL;
    o.connect(level);
    level.connect(sharedAmp); // added, then amplified
    level.connect(amp()).connect(eachLevel); // amplified, then added
    o.start();
    return o;
  });

  gains.shared.gain.value = route === 'shared' ? 1 : 0;
  gains.each.gain.value = route === 'each' ? 1 : 0;
  gains.shared.connect(master);
  gains.each.connect(master);
  master.connect(analyser).connect(ctx.destination);
  master.gain.setTargetAtTime(VOLUME, ctx.currentTime, 0.05);
  return { ctx, master, gains, analyser, oscs };
}

const LABEL: Record<Route, string> = { shared: 'One shared channel', each: 'A channel each' };
const READ: Record<Route, string> = {
  shared: 'Both notes through one overdriven amplifier. It adds notes in between that nobody played.',
  each: 'Each note through its own amplifier, driven just as hard. Only overtones of the two notes are added, higher up.',
};

export function ToneDemo() {
  const [route, setRoute] = useState<Route>('shared');
  const [playing, setPlaying] = useState(false);
  const rig = useRef<Rig | null>(null);
  const bars = useRef<HTMLSpanElement[]>([]);

  const stop = () => {
    const r = rig.current;
    rig.current = null;
    setPlaying(false);
    if (!r) return;
    r.master.gain.setTargetAtTime(0, r.ctx.currentTime, 0.04);
    setTimeout(() => {
      r.oscs.forEach((o) => o.stop());
      void r.ctx.close();
    }, 250);
  };
  // Leaving the step stops the sound.
  useEffect(() => stop, []);

  // While it plays: the bars follow the sound, and it stops itself in the end.
  useEffect(() => {
    if (!playing) {
      bars.current.forEach((b) => b?.style.setProperty('--h', '0'));
      return;
    }
    const r = rig.current;
    if (!r) return;
    const data = new Float32Array(r.analyser.frequencyBinCount);
    const hz = r.ctx.sampleRate / r.analyser.fftSize;
    let frame = 0;
    const draw = () => {
      r.analyser.getFloatFrequencyData(data);
      for (let i = 0; i < BARS; i++) {
        const bin = Math.round(((i + 1) * STEP) / hz);
        const db = Math.max(data[bin - 1], data[bin], data[bin + 1]);
        // -75 dB and below reads as nothing; the two notes themselves reach about -20.
        bars.current[i]?.style.setProperty('--h', String(Math.min(1, Math.max(0, (db + 75) / 55))));
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    const end = setTimeout(stop, PLAYS_FOR * 1000);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(end);
    };
  }, [playing]);

  const toggle = () => {
    if (playing) return stop();
    rig.current = build(route);
    setPlaying(true);
  };
  const choose = (next: Route) => {
    setRoute(next);
    const r = rig.current;
    if (!r) return;
    const now = r.ctx.currentTime;
    (['shared', 'each'] as const).forEach((k) => r.gains[k].gain.setTargetAtTime(k === next ? 1 : 0, now, 0.03));
  };

  return (
    <div className="tone">
      <p className="tone-head">Hear the principle</p>
      <div className="tone-controls">
        <button className="tone-play" onClick={toggle} aria-label={playing ? 'Stop the two notes' : 'Play the two notes'}>
          <svg viewBox="0 0 16 16" aria-hidden="true">
            {playing ? <rect x="3.5" y="3.5" width="9" height="9" rx="1" /> : <path d="M4.5 2.6v10.8a.6.6 0 0 0 .9.5l8.6-5.4a.6.6 0 0 0 0-1L5.4 2.1a.6.6 0 0 0-.9.5z" />}
          </svg>
        </button>
        <div className="dg-switch" role="group" aria-label="How the two notes are amplified">
          {(['shared', 'each'] as const).map((k) => (
            <button key={k} aria-pressed={route === k} onClick={() => choose(k)}>
              {LABEL[k]}
            </button>
          ))}
        </div>
      </div>
      <p className="dg-read" aria-live="polite">{READ[route]}</p>
      <div className="tone-bars" role="img" aria-label="The pitches in the sound as it plays, from 110 to 1650 hertz. The two notes played are marked.">
        {Array.from({ length: BARS }, (_, i) => {
          const played = NOTES.includes(((i + 1) * STEP) as (typeof NOTES)[number]);
          return (
            <span key={i} className={played ? 'played' : undefined} ref={(el) => void (el && (bars.current[i] = el))}>
              {played && <b>{(i + 1) * STEP}</b>}
            </span>
          );
        })}
      </div>
      <p className="tone-key">
        <i className="played" /> the two notes played (440 and 550 Hz) <i /> everything the amplifier added
      </p>
      <p className="aside">
        A demonstration, not a recording of either system: two test tones, the same amplifier model, matched in
        loudness. How hard the amplifier is pushed is our choice.
      </p>
    </div>
  );
}

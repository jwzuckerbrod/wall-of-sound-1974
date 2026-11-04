import { useEffect, useRef } from 'react';
import meters from './meters.json';

/**
 * The MC 2300s' needles, swinging over the still of beat 6. The render leaves
 * its pointers out; stage_review.py --meters says where each lands in the
 * frame, so they sit on the meters at any crop (the SVG's "slice" is the
 * picture's object-fit: cover). The movement is made up, and the caption says
 * so: nothing records what these meters read. It stops off screen, and anyone
 * who has asked for reduced motion gets them at rest.
 */
const REST = -40;
const RANGE = [-42, 34] as const;
const rad = (d: number) => (d * Math.PI) / 180;

export function Needles() {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = ref.current;
    if (!svg) return;
    const lines = Array.from(svg.querySelectorAll('line'));
    const draw = (line: SVGLineElement, i: number, angle: number) => {
      const [px, py, ux, uy, zx, zy] = meters.needles[i];
      const s = Math.sin(rad(angle)) * meters.length;
      const c = Math.cos(rad(angle)) * meters.length;
      line.setAttribute('x2', String(px + s * ux + c * zx));
      line.setAttribute('y2', String(py + s * uy + c * zy));
    };
    lines.forEach((l, i) => draw(l, i, REST));
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // One loudness for the whole rig, each channel its own share of it. Meters
    // rise quickly and fall slowly.
    const angle = lines.map(() => REST);
    const share = lines.map(() => 0.55 + Math.random() * 0.45);
    let loud = 0;
    let target = 0.5;
    let nextHit = 0;
    let last = 0;
    let frame = 0;
    const tick = (t: number) => {
      frame = requestAnimationFrame(tick);
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      if (t > nextHit) {
        target = 0.25 + Math.random() * 0.75;
        nextHit = t + 180 + Math.random() * 320;
      }
      loud += (target - loud) * Math.min(1, dt * 14);
      target *= 1 - dt * 2.2;
      lines.forEach((l, i) => {
        const wanted = RANGE[0] + (RANGE[1] - RANGE[0]) * loud * share[i] * (0.8 + 0.2 * Math.sin(t / (170 + i * 7) + i));
        angle[i] += (wanted - angle[i]) * Math.min(1, dt * (wanted > angle[i] ? 22 : 7));
        draw(l, i, angle[i]);
      });
    };
    const io = new IntersectionObserver(([e]) => {
      cancelAnimationFrame(frame);
      if (e.isIntersecting) {
        last = performance.now();
        frame = requestAnimationFrame(tick);
      }
    });
    io.observe(svg);
    return () => {
      io.disconnect();
      cancelAnimationFrame(frame);
    };
  }, []);

  const [w, h] = meters.frame;
  return (
    <svg ref={ref} className="main needles" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      {meters.needles.map(([x, y], i) => (
        <line key={i} x1={x} y1={y} x2={x} y2={y} />
      ))}
    </svg>
  );
}

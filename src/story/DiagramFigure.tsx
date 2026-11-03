import { useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * A diagram as a figure in the reading flow. It draws itself in once, the
 * first time it comes into view, then loops its animation; the loop stops
 * while it's off screen, and a button pauses it. Anyone who has asked their
 * device for reduced motion gets the finished drawing, still (story.css).
 */
export function DiagramFigure({ children, label }: { children: ReactNode; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [drawn, setDrawn] = useState(false);
  const [visible, setVisible] = useState(false);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        setVisible(e.isIntersecting);
        if (e.isIntersecting) setDrawn(true);
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const still = paused || !visible;
  return (
    <div ref={ref} className={`dg${drawn ? ' drawn' : ''}${still ? ' still' : ''}`}>
      {children}
      <button className="dg-pause" onClick={() => setPaused(!paused)} aria-pressed={paused} aria-label={`${paused ? 'Play' : 'Pause'} the ${label} animation`}>
        {paused ? (
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4.5 2.6v10.8a.6.6 0 0 0 .9.5l8.6-5.4a.6.6 0 0 0 0-1L5.4 2.1a.6.6 0 0 0-.9.5z" /></svg>
        ) : (
          <svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3.5" y="2.5" width="3" height="11" rx="0.6" /><rect x="9.5" y="2.5" width="3" height="11" rx="0.6" /></svg>
        )}
      </button>
    </div>
  );
}

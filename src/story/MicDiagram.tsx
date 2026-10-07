import { CHANNELS } from '../data/wall.config';

/**
 * The paired microphones (beat 5). Its lines draw themselves from the CSS
 * variable --draw (0 to 1), which the story sets from scroll position.
 *
 * Not to scale: the capsules are 60 mm apart and the Wall about three metres
 * behind the singer.
 */
export function MicDiagram() {
  const voice = CHANNELS.vocals.color;
  return (
    <svg className="mic-diagram" viewBox="0 0 640 400" role="img" aria-labelledby="mic-title mic-desc">
      <title id="mic-title">How the paired microphones cancelled the Wall</title>
      <desc id="mic-desc">
        A singer sings into the nearer of two microphones, wired in opposite polarity. The voice reaches the near one
        first and loudest, so it survives. Sound from the Wall behind reaches both equally, so the two cancel.
      </desc>

      {/* The singer, in profile, facing right. */}
      <g className="d-in d1">
        <circle cx="92" cy="170" r="34" className="d-line" pathLength={1} />
        <path d="M120 186 l14 -4" className="d-line" pathLength={1} />
        <text x="92" y="240" className="d-label" textAnchor="middle">Singer</text>
      </g>

      {/* The voice: short arcs from the mouth to the near capsule. */}
      <g style={{ stroke: voice }}>
        {[0, 1, 2].map((i) => (
          <path
            key={i}
            d={`M${148 + i * 20} ${162 - i * 2} q8 20 0 40`}
            className="d-line d-wave"
            pathLength={1}
            style={{ animationDelay: `${i * 0.25}s` }}
          />
        ))}
      </g>

      {/* The two capsules, 60 mm apart, opposite polarity. */}
      <g className="d-in d2">
        <rect x="222" y="168" width="34" height="16" rx="8" className="d-line" pathLength={1} />
        <rect x="292" y="168" width="34" height="16" rx="8" className="d-line" pathLength={1} />
        <text x="239" y="158" className="d-sign" textAnchor="middle">+</text>
        <text x="309" y="158" className="d-sign" textAnchor="middle">−</text>
        <path d="M239 200 v10 M309 200 v10 M239 210 h70" className="d-line d-faint" pathLength={1} />
        <text x="274" y="234" className="d-small" textAnchor="middle">60 mm</text>
      </g>

      {/* The Wall: a column of speakers, its sound arriving as flat wavefronts. */}
      <g className="d-in d3">
        {[0, 1, 2, 3, 4].map((i) => (
          <g key={i}>
            <rect x="540" y={86 + i * 34} width="44" height="30" className="d-line d-faint" pathLength={1} />
            <circle cx="562" cy={101 + i * 34} r="10" className="d-line d-faint" pathLength={1} />
          </g>
        ))}
        <text x="562" y="290" className="d-label" textAnchor="middle">The Wall</text>
      </g>
      <g className="d-wall">
        {[0, 1, 2].map((i) => (
          <path key={i} d={`M${500 - i * 46} 92 v168`} className="d-line d-wave" pathLength={1} style={{ animationDelay: `${i * 0.3}s` }} />
        ))}
      </g>

      {/* The sums. */}
      <g className="d-in d4">
        <text x="24" y="330" className="d-result">
          <tspan style={{ fill: voice }}>Voice</tspan>
          <tspan> reaches + first and loudest </tspan>
          <tspan className="d-ok">→ heard</tspan>
        </text>
        <text x="24" y="370" className="d-result">
          <tspan className="d-wall-text">Wall</tspan>
          <tspan> reaches + and − alike </tspan>
          <tspan className="d-no">→ cancels</tspan>
        </text>
      </g>
    </svg>
  );
}

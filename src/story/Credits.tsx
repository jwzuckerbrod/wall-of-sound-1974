import { SOURCES, wall, type SourceId } from '../data/wall.config';
import { IMAGES, type StoryImage } from './images';

/**
 * Credits, generously. The project's rule (docs/qa-findings.md §17): the
 * photographs and marks stay, and everyone whose work it leans on is named.
 */

const REPO = 'https://github.com/jwzuckerbrod/wall-of-sound-1974';

/** Photographers whose pictures the reconstruction was measured or checked against. */
const PHOTOGRAPHERS: { name: string; what: string; url?: string }[] = [
  { name: 'Richard Pechner', what: 'sound check, P.N.E. Coliseum, Vancouver, 17 May 1974: the straight-on view the model is matched to', url: 'https://www.rpechner.com/Music/Grateful-Dead' },
  { name: 'Steve Schneider', what: 'Campus Stadium, UC Santa Barbara, 25 May 1974, published by Paul Dorpat', url: 'https://pauldorpat.com/2023/08/10/seattle-now-then-grateful-dead-1974/' },
  { name: 'Kirk West', what: 'a wide view of the stage, probably Iowa State Fairgrounds, Des Moines, 16 June 1974' },
  { name: 'Jim Anderson', what: 'Dillon Stadium, Hartford, 31 July 1974: the drum kit before the show, and the band' },
  { name: 'dead.net', what: 'the Grateful Dead archive photographs, Winterland, October 1974', url: 'https://www.dead.net' },
  { name: 'Photographers unknown', what: 'the Hollywood Bowl, 21 July 1974, and other summer 1974 shows found online. If one of these is yours, please tell us.', url: `${REPO}/issues` },
];

const MODELLING: { name: string; what: string; licence: string; url: string }[] = [
  { name: 'Poly Haven', what: 'trees, shrubs, ground and the late-afternoon sky at the Bowl', licence: 'CC0', url: 'https://polyhaven.com' },
  { name: 'The MakeHuman community', what: 'the people in the crowd, built with MPFB from the community asset packs', licence: 'CC0', url: 'http://www.makehumancommunity.org' },
  { name: 'Elvs, CulturaLibre, punkduck, o4saken and other MakeHuman community artists', what: 'hairstyles (Hair packs 02 and 03)', licence: 'CC-BY 4.0', url: 'http://www.makehumancommunity.org' },
  { name: 'Blender', what: 'modelling and Cycles rendering', licence: 'GPL', url: 'https://www.blender.org' },
];

const ORDER: SourceId[] = [
  'blueprints', 'deadsources74', 'deadsources22', 'anderson', 'sothebys', 'juliens', 'bear',
  'pechner', 'schneider', 'photos', 'tapes',
  'mcintosh', 'mc2300', 'mixtest', 'mixrebuild', 'relix', 'owsinski', 'mayberry', 'upa', 'wiki', 'syf', 'duncan1982', 'pell', 'coules2021', 'kennedy2025', 'precedence', 'derived',
];

function PhotoOnPage({ img }: { img: StoryImage }) {
  return (
    <li>
      <strong>{img.caption}</strong> {img.credit}
    </li>
  );
}

export function Credits() {
  const photos = Object.values(IMAGES).filter((i) => i.kind === 'photograph');
  return (
    <footer className="credits" id="credits">
      <h2>Sources and credits</h2>

      <h3>Photographs on this page</h3>
      <ul>
        {photos.map((p) => (
          <PhotoOnPage key={p.id} img={p} />
        ))}
        <li>Every other image is a render of the reconstruction, and labelled as one.</li>
      </ul>

      <h3>Photographers</h3>
      <p>The reconstruction was measured against, and checked against, their pictures.</p>
      <ul>
        {PHOTOGRAPHERS.map((p) => (
          <li key={p.name}>
            <strong>{p.url ? <a href={p.url}>{p.name}</a> : p.name}</strong>: {p.what}
          </li>
        ))}
      </ul>

      <h3>The people who built the Wall</h3>
      <ul>
        {wall.meta.designers.map((d) => (
          <li key={d.name}>
            <strong>{d.name}</strong>: {d.role}
          </li>
        ))}
        <li>And the Grateful Dead's road crew, who put it up and took it down at every show.</li>
      </ul>

      <h3>Written and documentary sources</h3>
      <ol className="source-list">
        {ORDER.map((id) => (
          <li key={id}>{SOURCES[id].url ? <a href={SOURCES[id].url}>{SOURCES[id].title}</a> : SOURCES[id].title}</li>
        ))}
      </ol>

      <h3>Modelling and rendering</h3>
      <ul>
        {MODELLING.map((m) => (
          <li key={m.name}>
            <strong>
              <a href={m.url}>{m.name}</a>
            </strong>
            : {m.what} ({m.licence})
          </li>
        ))}
      </ul>

      <h3>Names and marks</h3>
      <p>
        “Grateful Dead”, the skull-and-lightning-bolt and the band's other marks belong to their owners. The
        lightning-bolt stencil on the road cases is traced from Owsley Stanley's own toolbox. This is an independent,
        non-commercial history project, not affiliated with or endorsed by the band or its estates.
      </p>

      <p className="colophon">
        The reconstruction, its data and its notes are open: <a href={REPO}>github.com/jwzuckerbrod/wall-of-sound-1974</a>.
        Corrections are very welcome.
      </p>
    </footer>
  );
}

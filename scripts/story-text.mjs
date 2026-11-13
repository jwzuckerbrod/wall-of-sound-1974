// Puts a readable copy of the story into the built page (dist/index.html), for search engines and AI
// assistants that read the page without running its JavaScript (most AI crawlers, and often Bing).
// Without it they see 29 words: the title and "Raising 641 speakers…".
//
// Run by `npm run build`, after Vite. It loads the story's steps (src/story/steps.tsx), the explorer's tour
// text (src/scene/tour.ts) and the sources (src/data/wall.config.ts), and writes their words, headings and
// links inside <div id="root">. The app replaces it the moment it starts, and the loading screen covers it
// until then, so visitors never see it; it's the same words the story shows, not hidden extra text.
// Interactive pieces (players, diagrams, sliders) are skipped: only their words, if any, are kept.
import { readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'vite';

const OUT = 'dist/index.html';
const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
let steps, tour, sources, meta;
try {
  ({ STEPS: steps } = await vite.ssrLoadModule('/src/story/steps.tsx'));
  ({ TOUR: tour } = await vite.ssrLoadModule('/src/scene/tour.ts'));
  ({ SOURCES: sources, wall: meta } = await vite.ssrLoadModule('/src/data/wall.config.ts'));
} finally {
  await vite.close();
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// Only plain HTML tags are written out; a component (a diagram, a player) contributes just its children
const KEEP = new Set(['h1', 'h2', 'h3', 'h4', 'p', 'em', 'strong', 'b', 'i', 'a', 'ul', 'ol', 'li', 'blockquote', 'span', 'br', 'sup', 'sub', 'abbr', 'cite', 'q', 'small']);
function html(node) {
  if (node == null || node === false || node === true) return '';
  if (typeof node === 'string' || typeof node === 'number') return esc(node);
  if (Array.isArray(node)) return node.map(html).join('');
  if (typeof node === 'object' && 'props' in node) {
    const { type, props = {} } = node;
    const inner = html(props.children);
    if (typeof type !== 'string') return inner;
    if (!KEEP.has(type)) return inner;
    if (type === 'br') return '<br>';
    if (type === 'span') return inner;
    const href = type === 'a' && typeof props.href === 'string' && /^https?:/.test(props.href) ? ` href="${esc(props.href)}"` : '';
    return `<${type}${href}>${inner}</${type}>`;
  }
  return '';
}

// One step's words; its first <h1>/<h2> stays as its heading, otherwise its dashboard name becomes one
const parts = [];
let act = null;
for (const s of steps) {
  let body = html(s.body).replace(/<p>\s*<\/p>/g, '');
  if (!body.trim()) continue;
  if (s.act && s.act !== act && s.id !== 'title') {
    act = s.act;
    parts.push(`<h2>${esc(act)}</h2>`);
  }
  if (s.id === 'title') {
    parts.push(body);
    continue;
  }
  if (!/^<h[1-3]>/.test(body)) body = `<h3>${esc(s.name)}</h3>${body}`;
  else body = body.replace(/^<h[12]>(.*?)<\/h[12]>/, '<h3>$1</h3>');
  parts.push(`<section id="read-${esc(s.id)}">${body}</section>`);
}

const tourHtml = tour
  .filter((t) => t.title && t.body)
  .map((t) => `<h3>${esc(t.title)}</h3><p>${esc(t.body)}</p>`)
  .join('');
const used = [...new Set(steps.flatMap((s) => s.sources || []))].filter((id) => sources[id]);
const sourcesHtml = used
  .map((id) => (sources[id].url ? `<li><a href="${esc(sources[id].url)}">${esc(sources[id].title)}</a></li>` : `<li>${esc(sources[id].title)}</li>`))
  .join('');

const article = `<article class="read" aria-label="The story in text">
${parts.join('\n')}
<h2>Explore the model</h2>
${tourHtml}
<h2>Sources</h2>
<ul>${sourcesHtml}</ul>
<p>Made by <a href="https://jzuckerbrod.com/">Jonathan Zuckerbrod</a>. ${esc(meta.meta?.name || 'The Wall of Sound')} · <a href="https://jzuckerbrod.com/privacy/">Privacy</a></p>
</article>`;

// Structured data: what this is, who made it, what it's about, and when it was last changed (this build)
const today = new Date().toISOString().slice(0, 10);
const ld = {
  '@context': 'https://schema.org',
  '@type': 'CreativeWork',
  '@id': 'https://jzuckerbrod.com/wall-of-sound/#work',
  name: 'The Wall of Sound, 1974',
  headline: "The Grateful Dead's Wall of Sound, rebuilt in 3D",
  description: "An interactive 3D reconstruction of the Grateful Dead's 1974 Wall of Sound, the 641-speaker sound system, at the Hollywood Bowl on July 21, 1974, rebuilt from photographs, scaffolding drawings and surviving equipment, with every source credited.",
  url: 'https://jzuckerbrod.com/wall-of-sound/',
  image: 'https://jzuckerbrod.com/wall-of-sound/og.jpg',
  inLanguage: 'en-US',
  genre: '3D reconstruction',
  keywords: 'Grateful Dead, Wall of Sound, 1974, Hollywood Bowl, Owsley Stanley, McIntosh, concert sound system, 3D reconstruction, WebGL',
  author: { '@type': 'Person', '@id': 'https://jzuckerbrod.com/#person', name: 'Jonathan Zuckerbrod', url: 'https://jzuckerbrod.com/' },
  about: [
    { '@type': 'MusicGroup', name: 'Grateful Dead', sameAs: 'https://en.wikipedia.org/wiki/Grateful_Dead' },
    { '@type': 'Thing', name: 'Wall of Sound (Grateful Dead)', sameAs: 'https://en.wikipedia.org/wiki/Wall_of_Sound_(Grateful_Dead)' },
  ],
  contentLocation: { '@type': 'Place', name: 'Hollywood Bowl', sameAs: 'https://en.wikipedia.org/wiki/Hollywood_Bowl' },
  temporalCoverage: '1974',
  isBasedOn: used.filter((id) => sources[id].url).slice(0, 12).map((id) => sources[id].url),
  datePublished: '2026-11-02',
  dateModified: today,
};
const jsonLd = `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>`;

const page = readFileSync(OUT, 'utf8');
if (!page.includes('<div id="root"></div>')) throw new Error('dist/index.html has no empty <div id="root"></div> to fill');
const dated = article.replace('</article>', `<p>Last updated <time datetime="${today}">${new Date(`${today}T12:00:00Z`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}</time>.</p></article>`);
writeFileSync(OUT, page.replace('<div id="root"></div>', `<div id="root">${dated}</div>`).replace('</head>', `  ${jsonLd}\n  </head>`));
const words = article.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
console.log(`story-text: ${words} words of the story written into ${OUT} (${parts.length} parts, ${used.length} sources)`);

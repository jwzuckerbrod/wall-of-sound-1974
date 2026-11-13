import react from '@vitejs/plugin-react';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';

/**
 * Dev-only capture endpoint.
 *
 * POST /__shot { name, dataUrl } writes a PNG under .shots/.
 *
 * This exists because the embedded browser this project is developed in will
 * not always return a rendered frame, and when it does it alters the tones — so
 * screenshots were an unreliable way to judge a 3D scene. Writing the real
 * framebuffer to a file makes the render inspectable by anything that can open
 * a PNG, which is the only honest way to check visual work.
 */
function shotPlugin(): Plugin {
  return {
    name: 'wall-of-sound-shot',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__shot', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          return res.end();
        }
        let body = '';
        req.on('data', (c) => (body += c));
        req.on('end', () => {
          try {
            const { name, dataUrl } = JSON.parse(body) as { name: string; dataUrl: string };
            const safe = name.replace(/[^a-z0-9_-]/gi, '_');
            const file = resolve(join(server.config.root, '.shots', `${safe}.png`));
            mkdirSync(dirname(file), { recursive: true });
            writeFileSync(file, Buffer.from(dataUrl.split(',')[1], 'base64'));
            res.setHeader('content-type', 'application/json');
            res.end(JSON.stringify({ ok: true, file }));
          } catch (e) {
            res.statusCode = 500;
            res.end(JSON.stringify({ ok: false, error: String(e) }));
          }
        });
      });
    },
  };
}

export default defineConfig({
  // The day this was built, shown as "Last updated" in the About panel (src/ui/About.tsx)
  define: { __BUILT__: JSON.stringify(new Date().toISOString().slice(0, 10)) },
  base: './',
  plugins: [react(), shotPlugin()],
  build: {
    target: 'es2022',
    // Vite 8 bundles with rolldown, which takes manualChunks only as a function.
    rollupOptions: {
      // The page (the story, told over the 3D model, and the explorer), and story.html, which now only sends old links to it.
      input: { main: resolve(__dirname, 'index.html'), story: resolve(__dirname, 'story.html') },
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three')) return 'three';
          if (/node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return 'react';
          return undefined;
        },
      },
    },
  },
});

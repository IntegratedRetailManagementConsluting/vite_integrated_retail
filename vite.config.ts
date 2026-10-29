import { defineConfig, type Plugin } from 'vite';
import { cpSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('.', import.meta.url));

// Collect every index.html in the tree so `vite build` emits all pages.
function collectHtmlPages(dir: string, entries: Record<string, string> = {}) {
  for (const name of readdirSync(dir)) {
    if (
      name === 'node_modules' ||
      name === 'dist' ||
      name === '.git' ||
      name === 'Claude outputs' ||
      name === '.dyad' ||
      name === 'partials'
    ) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      collectHtmlPages(full, entries);
    } else if (name.endsWith('.html')) {
      const rel = relative(ROOT, full);
      entries[rel.replace(/\.html$/, '')] = join(ROOT, rel);
    }
  }
  return entries;
}

// Copy files that are referenced by URL (not bundled) into dist/ for builds.
function copyStaticAssets(): Plugin {
  return {
    name: 'copy-static-assets',
    apply: 'build',
    closeBundle() {
      if (existsSync(join(ROOT, 'assets'))) {
        cpSync(join(ROOT, 'assets'), join(ROOT, 'dist', 'assets'), { recursive: true });
      }
      if (existsSync(join(ROOT, 'robots.txt'))) {
        cpSync(join(ROOT, 'robots.txt'), join(ROOT, 'dist', 'robots.txt'));
      }
    },
  };
}

// Dev server proxy plugin for Cloudflare Pages Functions
function devApiProxy(): Plugin {
  return {
    name: 'dev-api-proxy',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/posts')) return next();
        try {
          const { onRequestGet } = await import('./functions/api/posts.js');
          const fullUrl = `http://${req.headers.host || 'localhost'}${req.url}`;
          const webReq = new Request(fullUrl, {
            method: req.method || 'GET',
            headers: req.headers as Record<string, string>,
          });
          const response = await onRequestGet({ request: webReq, env: {} });
          res.statusCode = response.status;
          response.headers.forEach((v, k) => {
            res.setHeader(k, v);
          });
          const body = await response.text();
          res.end(body);
        } catch (err) {
          next(err);
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [copyStaticAssets(), devApiProxy()],
  build: {
    assetsDir: 'static',
    rollupOptions: {
      input: collectHtmlPages(ROOT),
    },
  },
});
